"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Point } from "@/lib/desk/viewport";
import type { Effect, LibrarianMessage, Source, WireEvent } from "@/lib/librarian/model";
import { sayMoney, saySize, type Reckoning } from "@/lib/librarian/spend";
import type { CardId, CompositionId, ObjectRef } from "@/lib/world/model";
import { CarriageFooter, CarriageHeader, CarriageLauncher, CarriageSection, CarriageShell } from "@/components/carriage/carriage";
import { Button } from "@/components/ui/control";
import { LibrarianComposer } from "@/components/librarian/librarian-composer";
import type { WorkspaceCarriageRenderProps } from "@/components/workspace/workspace-shell";

import styles from "./desk.module.css";

/**
 * The Librarian's carriage.
 *
 * A persistent, collapsible column beside the world — not a chat destination.
 * That distinction is the whole reason it lives here rather than at a route:
 * the canvas stays visible and keeps working while a long exchange sits open
 * next to it, and what the GM is looking at *is* the subject of the
 * conversation.
 *
 * Which makes the context line under the header load-bearing rather than
 * decorative. The current composition, focus, and selection reach the Librarian
 * implicitly, and implicit context that cannot be seen is indistinguishable from
 * a Librarian guessing. The line says what it can see, in the same words the
 * canvas uses.
 *
 * The Librarian now works as well as answers, and the carriage shows that as it
 * happens: an `acted` event carries a change that has *already* committed, so
 * the note goes into the transcript and the effect goes straight to the Desk.
 * Nothing here asks permission, because permission was not the design — what
 * makes an immediate write tolerable is that it is Pencil, attributed, and
 * visible, not that a dialog stood in front of it.
 *
 * Sources remain the one thing that is not the Librarian acting: clicking one
 * brings that object onto the composition, and that is the GM's own retrieval
 * gesture — the same one search and relationships already use.
 */

type Streaming = Readonly<{
  ask: string;
  scope: string;
  said: string;
  consulting: string | null;
  /** What has been done so far this turn, in the order it was done. */
  did: readonly string[];
  failure: string | null;
}>;

const IDLE: Streaming | null = null;

export function Librarian({
  open,
  onOpenChange,
  compositionId,
  compositionName,
  focusCardId,
  focusLabel,
  selectedCardIds,
  onFollowSource,
  onActed,
  here,
  carriage,
  request = fetch
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compositionId: CompositionId;
  compositionName: string;
  focusCardId: CardId | null;
  /** What the focused thing is called, so the carriage says it the same way. */
  focusLabel: string | null;
  selectedCardIds: readonly CardId[];
  onFollowSource: (ref: ObjectRef) => void;
  /** Something the Librarian changed, already committed, for the Desk to adopt. */
  onActed: (effect: Effect) => void;
  /** Where the GM is looking. Asked for at send time, never held as state. */
  here: () => Point | null;
  carriage?: WorkspaceCarriageRenderProps;
  /** Injectable HTTP boundary for isolated stories; production uses the real route. */
  request?: typeof fetch;
}) {
  const [messages, setMessages] = useState<readonly LibrarianMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(true);
  const [draft, setDraft] = useState("");
  const [turn, setTurn] = useState<Streaming | null>(IDLE);
  /*
   * What this world's conversation has cost, over its whole life — priced on
   * the server, because the rates live there. Held as state and advanced by
   * each `done` rather than refetched, so the meter moves the moment a turn
   * lands instead of at the next time the carriage happens to open.
   */
  const [spent, setSpent] = useState<Reckoning>(NOTHING_YET);

  const field = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const requestPending = useRef(false);
  const followLatest = useRef(true);
  const scope = [compositionName, focusLabel ? `Focus: ${focusLabel}` : null, selectedCardIds.length ? `${selectedCardIds.length} selected` : null].filter(Boolean).join(" · ");
  // A running stream must use current workspace visibility, even after collapse.
  const acted = useRef(onActed);
  acted.current = onActed;

  /*
   * The conversation is fetched when the carriage first opens, not when the page
   * loads. It is world state the GM has not asked to see, and a collapsed
   * carriage should cost nothing.
   */
  useEffect(() => {
    if (!open || loaded) return;
    let live = true;
    void (async () => {
      try {
        const response = await request(
          `/api/librarian?composition=${encodeURIComponent(compositionId)}`
        );
        if (response.ok) {
          const body = (await response.json()) as {
            ready: boolean;
            messages: readonly LibrarianMessage[];
            spent?: Reckoning;
          };
          if (!live) return;
          setMessages(body.messages);
          setReady(body.ready);
          // Optional, and defaulted rather than trusted. A meter is the least
          // important thing in this panel and must never be the reason a
          // conversation fails to open — which is exactly what reading
          // `spent.turns` off an absent field would do.
          setSpent(body.spent ?? NOTHING_YET);
        } else {
          if (live) setReady(false);
        }
      } catch {
        if (live) setReady(false);
      } finally {
        if (live) setLoaded(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [open, loaded, compositionId, request]);

  useEffect(() => {
    if (open) field.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const track = () => { followLatest.current = node.scrollHeight - node.clientHeight - node.scrollTop < 48; };
    node.addEventListener("scroll", track, { passive: true });
    return () => node.removeEventListener("scroll", track);
  }, [open]);

  // Follow new words unless the GM has scrolled back to read an earlier answer.
  useEffect(() => {
    const node = scroller.current;
    if (node && followLatest.current && open) node.scrollTop = node.scrollHeight;
  }, [messages, turn, open]);

  const ask = useCallback(
    async (question: string) => {
      const said = question.trim();
      if (!said || said.length > 4000 || !loaded || !ready || requestPending.current) return;

      requestPending.current = true;
      followLatest.current = true;
      setDraft("");
      setTurn({ ask: said, scope, said: "", consulting: null, did: [], failure: null });
      let completed = false;
      let failed = false;
      const fail = (message: string) => {
        failed = true;
        setTurn(was => was ? { ...was, failure: message } : was);
        // Never overwrite a next question the GM began while this turn ran.
        setDraft(was => was || said);
      };

      try {
        const response = await request("/api/librarian", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            compositionId,
            focusCardId,
            selectedCardIds,
            // Where the GM is looking, so what the Librarian brings arrives in
            // front of them rather than wherever the world happens to be empty.
            here: here(),
            ask: said
          })
        });

        if (!response.ok || !response.body) {
          const problem = (await response.json().catch(() => null)) as { error?: string } | null;
          fail(problem?.error ?? "The Librarian could not answer. Your question is kept below.");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pending = "";

        const readLine = (line: string) => {
            if (completed) return;
            if (!line.trim()) return;
            // One declaration, shared with the route. The wire used to be agreed
            // by hand at both ends, which held until an event kind was added.
            const event = JSON.parse(line) as WireEvent;

            if (event.type === "text") {
              setTurn((was) => (was ? { ...was, said: was.said + event.text } : was));
            } else if (event.type === "consulting") {
              setTurn((was) => (was ? { ...was, consulting: event.note } : was));
            } else if (event.type === "acted") {
              /*
               * The world has already changed — this is the browser catching up,
               * not being asked permission. Applying it here rather than at the
               * end of the turn is the point: the Desk moves while the Librarian
               * is still talking, so its work is something the GM watches happen
               * rather than something a panel claims afterwards.
               */
              acted.current(event.effect);
              setTurn((was) =>
                was ? { ...was, consulting: null, did: [...was.did, event.note] } : was
              );
            } else if (event.type === "failed") {
              fail(event.message);
            } else if (event.type === "done") {
              // The server has recorded the exchange; adopt its version rather
              // than the streamed text, so what is shown is what was stored.
              completed = true;
              setMessages((was) => [
                ...was,
                provisional("gm", said),
                provisional("librarian", event.body, event.sources)
              ]);
              setSpent((was) => spentAlso(was, event.spent));
              setTurn(IDLE);
            }
        };
        try {
          for (;;) {
            const { done, value } = await reader.read();
            pending += decoder.decode(value, { stream: !done });
            const lines = pending.split("\n");
            pending = lines.pop() ?? "";
            for (const line of lines) readLine(line);
            if (done) { readLine(pending); break; }
          }
        } finally {
          reader.releaseLock();
        }
      } catch {
        if (!completed && !failed) fail("The conversation was interrupted. Your question is kept below.");
      } finally {
        if (!completed && !failed) fail("The conversation ended before the answer was complete. Your question is kept below.");
        requestPending.current = false;
      }
    },
    [compositionId, focusCardId, here, loaded, ready, request, scope, selectedCardIds]
  );

  if (!open && !carriage) {
    return <CarriageLauncher side="right" label="Librarian" variant="librarian" controls="carriage-librarian" onOpen={() => onOpenChange(true)} />;
  }

  const settled = turn?.failure ?? null;

  return (
    <CarriageShell {...carriage} side="right" id="carriage-librarian" variant="librarian" ariaLabel="Librarian"
      header={<CarriageHeader side="right" title="Librarian" variant="librarian" status={turn && !turn.failure ? "Working" : !loaded ? "Opening" : ready ? "Ready" : "Offline"} statusTone={!loaded || !ready || (turn && !turn.failure) ? "quiet" : "ready"} onCollapse={carriage?.onCollapse ?? (() => onOpenChange(false))} />}
      context={<CarriageSection density="compact">
          {/* What it can see, said plainly. Implicit context that cannot be
              read is indistinguishable from the Librarian guessing. */}
          <details className={styles.librarianContext}>
            <summary>Reading <strong>{compositionName}</strong>{focusLabel ? ` · ${focusLabel}` : null}{selectedCardIds.length ? ` · ${selectedCardIds.length} selected` : null}</summary>
            <dl><div><dt>Workspace</dt><dd>{compositionName}</dd></div><div><dt>Focus</dt><dd>{focusLabel ?? "No object in Focus"}</dd></div><div><dt>Selection</dt><dd>{selectedCardIds.length ? `${selectedCardIds.length} objects` : "No selected objects"}</dd></div></dl>
            <p>Each request keeps the context it was sent with.</p>
          </details>
      </CarriageSection>}
      scrollRef={scroller}
      footer={<CarriageFooter>
        <LibrarianComposer value={draft} onChange={setDraft} onSubmit={() => { void ask(draft); }} inputRef={field}
          status={!loaded ? "opening" : !ready ? "unavailable" : turn && !turn.failure ? "submitting" : "idle"}
          scope={focusLabel ? `Focus · ${focusLabel}` : `${compositionName}${selectedCardIds.length ? ` · ${selectedCardIds.length} selected` : ""}`} />
        <Meter spent={spent} />
      </CarriageFooter>}
    >
      <div className={styles.librarianStream} role="log" aria-label="Librarian conversation" aria-live="polite" aria-relevant="additions" aria-busy={Boolean(turn && !turn.failure)}>
        {!loaded ? <p className={styles.carriageNote}>Opening the conversation…</p> : null}

        {loaded && ready && messages.length === 0 && !turn ? (
          <p className={styles.carriageNote}>
            Ask about this world and the Librarian answers from what Relic actually
            records, citing what it read. It can also work: bring things here, arrange
            them, write new material. Everything it makes is Pencil and carries its name,
            and only you can establish Ink.
          </p>
        ) : null}

        {messages.map((message) => (
          <Said key={message.id} message={message} onFollowSource={onFollowSource} />
        ))}

        {turn ? (
          <>
            <article className={styles.saidGm} aria-label="You">
              <p className={styles.saidBody}>{turn.ask}</p>
            </article>
            <article className={styles.saidLibrarian} aria-label="Librarian">
              <p className={styles.requestScope}>Sent from {turn.scope}</p>
              {/* What was done, kept visible above whatever is being said about
                  it. The Desk has already changed; this is the account of why,
                  and it must not disappear behind the answer. */}
              {turn.did.map((act, i) => (
                <p key={i} className={styles.acted}>
                  {act}
                </p>
              ))}
              {turn.consulting && !turn.said ? (
                <p className={styles.consulting}>{turn.consulting}…</p>
              ) : null}
              {turn.said ? (
                <p className={styles.saidBody}>
                  {turn.said}
                  {!settled ? <span className={styles.cursor} aria-hidden="true" /> : null}
                </p>
              ) : null}
              {!turn.said && !turn.consulting && turn.did.length === 0 && !settled ? (
                <p className={styles.consulting}>Reading…</p>
              ) : null}
              {settled ? <p className={styles.carriageProblem} role="alert">{settled} Review any changes above before sending again.</p> : null}
            </article>
          </>
        ) : null}
        {/* The one place that explains the outage, where the answer would have appeared. */}
        {loaded && !ready ? <div className={styles.librarianRecovery}>
          <span>The Librarian is unavailable in this workspace. Your draft and manual tools remain available.</span>
          <Button variant="quiet" onClick={() => { setLoaded(false); setReady(true); }}>Retry connection</Button>
        </div> : null}
      </div>

    </CarriageShell>
  );
}

/** A world that has never spoken to its Librarian. */
const NOTHING_YET: Reckoning = { turns: 0, tokens: 0, usd: null };

/**
 * The running total, after one more turn.
 *
 * `usd` goes null and stays null the moment any turn cannot be priced, which is
 * the same rule `reckon` applies on the server and for the same reason: a
 * figure that quietly omits the turns it did not recognise would read as a
 * small bill rather than an incomplete one.
 */
function spentAlso(was: Reckoning, turn: Reckoning | undefined): Reckoning {
  if (!turn) return was;
  return {
    turns: was.turns + turn.turns,
    tokens: was.tokens + turn.tokens,
    usd: was.usd === null || turn.usd === null ? null : was.usd + turn.usd
  };
}

/**
 * What this conversation has cost.
 *
 * Two facts of different kinds, and the wording keeps them apart. Tokens are
 * **measured** — the provider counted them and Relic stored them. Money is
 * **estimated** from a published rate that Relic cannot verify against the
 * account being billed, so it is prefixed and dimmed rather than stated. When
 * no rate is known the money simply is not shown: `AI.md` forbids the Librarian
 * from filling a gap with something plausible, and a meter beside it has no
 * business doing what the Librarian may not.
 *
 * Absent entirely before the first turn. An empty conversation showing "0
 * tokens · $0.00" would be drawing attention to a cost nobody has incurred.
 */
function Meter({ spent }: { spent: Reckoning }) {
  if (spent.turns === 0) return null;

  return (
    <p
      className={styles.meter}
      title={`${spent.tokens.toLocaleString()} tokens over ${spent.turns} turn${
        spent.turns === 1 ? "" : "s"
      }. ${
        spent.usd === null
          ? "Relic has no rate for this model — set LIBRARIAN_RATES to estimate cost."
          : // Deliberately not "published rates": the figure may have come from
            // the operator's own LIBRARIAN_RATES, and naming a source Relic
            // cannot be sure of would be the meter overstating what it knows.
            "Cost is an estimate, not a bill."
      }`}
    >
      <span>{saySize(spent.tokens)} tokens</span>
      {spent.usd !== null ? (
        <span className={styles.meterEstimate}>· ≈{sayMoney(spent.usd)}</span>
      ) : null}
    </p>
  );
}

/**
 * A recorded message. The server has already stored it; this only draws it.
 *
 * The GM's own words are rendered as written, and the Librarian's are rendered
 * with their citations resolved — which is why the two are not one component.
 */
function Said({
  message,
  onFollowSource
}: {
  message: LibrarianMessage;
  onFollowSource: (ref: ObjectRef) => void;
}) {
  if (message.speaker === "gm") {
    return (
      <article className={styles.saidGm} aria-label="You">
        <p className={styles.saidBody}>{message.body}</p>
      </article>
    );
  }

  return (
    <article className={styles.saidLibrarian} aria-label="Librarian">
      <p className={styles.saidBody}>
        <Cited body={message.body} sources={message.sources} onFollowSource={onFollowSource} />
      </p>
      {message.sources.length > 0 ? (
        <p className={styles.sourceList}>
          {message.sources.map((source) => (
            <button
              key={source.n}
              type="button"
              className={styles.sourceChip}
              onClick={() => onFollowSource(source.ref)}
              title={`Open ${source.ref.label}`}
            >
              <span className={styles.sourceMark}>{source.n}</span> {source.ref.label}
            </button>
          ))}
        </p>
      ) : null}
    </article>
  );
}

const CITATION = /\[(\d{1,3})\]/g;

/**
 * Turns `[3]` into something that can be followed.
 *
 * A number Relic cannot resolve is left as plain text rather than drawn as a
 * source. A chip that points at nothing would be the interface claiming an
 * answer was grounded when it was not.
 */
function Cited({
  body,
  sources,
  onFollowSource
}: {
  body: string;
  sources: readonly Source[];
  onFollowSource: (ref: ObjectRef) => void;
}) {
  const byNumber = new Map(sources.map((source) => [source.n, source]));
  const parts: React.ReactNode[] = [];
  let at = 0;

  for (const match of body.matchAll(CITATION)) {
    const source = byNumber.get(Number(match[1]));
    const start = match.index ?? 0;
    if (!source) continue;

    if (start > at) parts.push(body.slice(at, start));
    parts.push(
      <button
        key={`${start}`}
        type="button"
        className={styles.citation}
        onClick={() => onFollowSource(source.ref)}
        title={`Open ${source.ref.label}`}
        aria-label={`Open citation ${source.n}: ${source.ref.label}`}
      >
        {source.n}
      </button>
    );
    at = start + match[0].length;
  }

  if (at < body.length) parts.push(body.slice(at));
  return <>{parts}</>;
}

/**
 * A message drawn before the page has re-read the conversation.
 *
 * The exchange is already committed — the server wrote it before sending
 * `done` — so this is a local rendering of a stored fact, not an optimistic
 * guess about one. The id is only a React key.
 */
let provisionalCount = 0;
function provisional(
  speaker: LibrarianMessage["speaker"],
  body: string,
  sources: readonly Source[] = []
): LibrarianMessage {
  provisionalCount += 1;
  return {
    id: `said-${provisionalCount}` as LibrarianMessage["id"],
    speaker,
    body,
    sources,
    compositionId: null,
    // The turn's cost is shown by the meter, which is fed from the `done`
    // event. Repeating it on the drawn message would be the same fact twice.
    spend: null,
    saidAt: new Date().toISOString()
  };
}
