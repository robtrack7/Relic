"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LibrarianMessage, Source } from "@/lib/librarian/model";
import type { CardId, CompositionId, ObjectRef } from "@/lib/world/model";

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
 * Nothing here writes to the world. Sources are the exception that proves it:
 * clicking one brings that object onto the composition, and that is the GM's
 * retrieval gesture — the same one search and relationships already use — not
 * something the Librarian did.
 */

type Streaming = Readonly<{
  ask: string;
  said: string;
  consulting: string | null;
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
  onFollowSource
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
}) {
  const [messages, setMessages] = useState<readonly LibrarianMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(true);
  const [draft, setDraft] = useState("");
  const [turn, setTurn] = useState<Streaming | null>(IDLE);

  const field = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

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
        const response = await fetch(
          `/api/librarian?composition=${encodeURIComponent(compositionId)}`
        );
        if (!live) return;
        if (response.ok) {
          const body = (await response.json()) as {
            ready: boolean;
            messages: readonly LibrarianMessage[];
          };
          setMessages(body.messages);
          setReady(body.ready);
        }
      } finally {
        if (live) setLoaded(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [open, loaded, compositionId]);

  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  // Keep the newest words in view while they arrive.
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, turn]);

  const ask = useCallback(
    async (question: string) => {
      const said = question.trim();
      if (!said || turn) return;

      setDraft("");
      setTurn({ ask: said, said: "", consulting: null, failure: null });

      try {
        const response = await fetch("/api/librarian", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            compositionId,
            focusCardId,
            selectedCardIds,
            ask: said
          })
        });

        if (!response.ok || !response.body) {
          const problem = (await response.json().catch(() => null)) as { error?: string } | null;
          setTurn((was) =>
            was ? { ...was, failure: problem?.error ?? "The Librarian could not answer." } : was
          );
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pending = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });

          // Newline-delimited JSON: everything before the last newline is whole.
          const lines = pending.split("\n");
          pending = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as {
              type: string;
              text?: string;
              note?: string;
              message?: string;
              body?: string;
              sources?: readonly Source[];
            };

            if (event.type === "text") {
              setTurn((was) => (was ? { ...was, said: was.said + (event.text ?? "") } : was));
            } else if (event.type === "consulting") {
              setTurn((was) => (was ? { ...was, consulting: event.note ?? null } : was));
            } else if (event.type === "failed") {
              setTurn((was) =>
                was ? { ...was, failure: event.message ?? "Something went wrong." } : was
              );
            } else if (event.type === "done") {
              // The server has recorded the exchange; adopt its version rather
              // than the streamed text, so what is shown is what was stored.
              setMessages((was) => [
                ...was,
                provisional("gm", said),
                provisional("librarian", event.body ?? "", event.sources ?? [])
              ]);
              setTurn(IDLE);
            }
          }
        }
      } catch {
        setTurn((was) => (was ? { ...was, failure: "The conversation was interrupted." } : was));
      }
    },
    [compositionId, focusCardId, selectedCardIds, turn]
  );

  if (!open) {
    return (
      <button
        type="button"
        className={styles.carriageTab}
        onClick={() => onOpenChange(true)}
        aria-label="Open the Librarian"
      >
        <span aria-hidden="true">✦</span> Librarian
      </button>
    );
  }

  const settled = turn?.failure ?? null;

  return (
    <section
      className={styles.carriage}
      aria-label="Librarian"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onOpenChange(false);
        }
      }}
    >
      <header className={styles.carriageHead}>
        <div>
          <h2 className={styles.carriageTitle}>Librarian</h2>
          {/* What it can see, said plainly. Implicit context that cannot be
              read is indistinguishable from the Librarian guessing. */}
          <p className={styles.carriageVantage}>
            Reading <strong>{compositionName}</strong>
            {focusLabel ? (
              <>
                {" · "}
                focused on <strong>{focusLabel}</strong>
              </>
            ) : null}
            {selectedCardIds.length > 0 ? ` · ${selectedCardIds.length} selected` : null}
          </p>
        </div>
        <button
          type="button"
          className={styles.ghostAction}
          onClick={() => onOpenChange(false)}
        >
          Collapse
        </button>
      </header>

      <div className={styles.carriageBody} ref={scroller}>
        {!loaded ? <p className={styles.carriageNote}>Opening the conversation…</p> : null}

        {loaded && !ready ? (
          <p className={styles.carriageNote}>
            The Librarian is not configured in this environment. Set{" "}
            <code>ANTHROPIC_API_KEY</code> to wake it.
          </p>
        ) : null}

        {loaded && ready && messages.length === 0 && !turn ? (
          <p className={styles.carriageNote}>
            Ask about this world and the Librarian will answer from what Relic actually
            records, citing what it read. It can look things up, and it cannot yet change
            anything.
          </p>
        ) : null}

        {messages.map((message) => (
          <Said key={message.id} message={message} onFollowSource={onFollowSource} />
        ))}

        {turn ? (
          <>
            <article className={styles.saidGm}>
              <p className={styles.saidBody}>{turn.ask}</p>
            </article>
            <article className={styles.saidLibrarian}>
              {turn.consulting && !turn.said ? (
                <p className={styles.consulting}>{turn.consulting}…</p>
              ) : null}
              {turn.said ? (
                <p className={styles.saidBody}>
                  {turn.said}
                  <span className={styles.cursor} aria-hidden="true" />
                </p>
              ) : null}
              {!turn.said && !turn.consulting && !settled ? (
                <p className={styles.consulting}>Reading…</p>
              ) : null}
              {settled ? <p className={styles.carriageProblem}>{settled}</p> : null}
            </article>
          </>
        ) : null}
      </div>

      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          void ask(draft);
        }}
      >
        <textarea
          ref={field}
          className={styles.composerField}
          value={draft}
          rows={2}
          placeholder="Ask about this world"
          aria-label="Ask the Librarian"
          disabled={!ready && loaded}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends, because the carriage is a conversation. A newline is
            // still reachable, which is what keeps a long question possible.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask(draft);
            }
          }}
        />
        <button
          type="submit"
          className={styles.primaryAction}
          disabled={draft.trim() === "" || turn !== null}
        >
          {turn ? "Reading…" : "Ask"}
        </button>
      </form>
    </section>
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
      <article className={styles.saidGm}>
        <p className={styles.saidBody}>{message.body}</p>
      </article>
    );
  }

  return (
    <article className={styles.saidLibrarian}>
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
              title={`Bring ${source.ref.label} here`}
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
        title={`Bring ${source.ref.label} here`}
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
    saidAt: new Date().toISOString()
  };
}
