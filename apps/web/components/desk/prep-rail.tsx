"use client";

import { useEffect, useImperativeHandle, useRef, useState, type RefObject } from "react";

import type { Beat, ObjectRef, Prep, SessionState } from "@/lib/world/model";
import { CarriageFooter, CarriageHeader, CarriageIcon, CarriageSection, CarriageShell } from "@/components/carriage/carriage";
import { Button, IconButton } from "@/components/ui/control";
import type { WorkspaceCarriageRenderProps } from "@/components/workspace/workspace-shell";

import { usePrep, type PrepStore } from "./use-prep";
import styles from "./desk.module.css";

/**
 * What the surface needs from the rail when the rail is the only thing that can
 * answer.
 *
 * The same shape as `SurfaceControls`, and for the same reason: the running
 * order is the rail's state, and lifting it into the shell so that one
 * Librarian effect could reach it would re-render the whole surface every time
 * the GM typed a beat.
 */
export type PrepControls = Readonly<{
  /** Take in beats written elsewhere — the Librarian planning, mid-sentence. */
  absorb(beats: readonly Beat[]): void;
}>;

/**
 * The running order for one session, beside the world it is arranged from.
 *
 * This is the only thing Prep has that a Board does not, and it is the whole
 * reason Prep is not a Board: a Board is a place, and an evening is a sequence.
 * Everything else on this surface — pulling material in, arranging it, deepening
 * into it, asking the Librarian about it — is the same Desk, because Prep *is*
 * the same world.
 *
 * A beat is an intention. It carries no truth mark, no provenance line, and no
 * settle control, because none of those mean anything about something that has
 * not happened. The moment a beat becomes a record of what occurred is after
 * the session, deliberately, and that is Review's act rather than this rail's.
 *
 * Attaching a card to a beat says nothing whatsoever about the card. It is
 * composition-shaped work — this evening is meant to involve that — and the
 * object's own truth is untouched by it.
 */
export function PrepRail({
  initial,
  selected,
  controls,
  onReveal,
  onCollapse,
  carriage
}: {
  initial: Prep;
  /** What the GM has selected on the surface, ready to attach to a beat. */
  selected: readonly ObjectRef[];
  controls: RefObject<PrepControls | null>;
  /** Bring an object to the composition if it is not here, and look at it. */
  onReveal: (ref: ObjectRef) => void;
  onCollapse: () => void;
  carriage?: WorkspaceCarriageRenderProps;
}) {
  const prep = usePrep(initial);
  const { session, beats } = prep;
  const [drafting, setDrafting] = useState(false);
  const draft = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(controls, () => ({ absorb: prep.absorb }), [prep.absorb]);

  useEffect(() => {
    if (drafting) draft.current?.focus();
  }, [drafting]);

  return (
    <CarriageShell {...carriage} side="left" id="carriage-prepare" variant="prepare" ariaLabel="Prep"
      header={<CarriageHeader side="left" title="Prepare" variant="prepare" status={stateReads(session.state)} onCollapse={onCollapse} />}
      context={<CarriageSection title="Session brief"><SessionFields prep={prep} /></CarriageSection>}
      actions={<Button variant="secondary" onClick={() => setDrafting(true)} disabled={drafting}>+ Add beat{selected.length > 0 ? ` from ${countReads(selected.length)}` : ""}</Button>}
      footer={<CarriageFooter><span>Session plan · {beats.length} {beats.length === 1 ? "beat" : "beats"}</span></CarriageFooter>}
    >
      <CarriageSection title="Running order" meta="what you mean to do">

        {beats.length === 0 && !drafting ? (
          <p className={styles.prepEmpty}>
            Nothing planned yet. A beat is something you mean to try — it is not a
            record that it happened.
          </p>
        ) : null}

        <ol className={styles.beatList}>
          {beats.map((beat, index) => (
            <BeatRow
              key={beat.id}
              beat={beat}
              index={index}
              last={index === beats.length - 1}
              prep={prep}
              selected={selected}
              onReveal={onReveal}
            />
          ))}
        </ol>

        {drafting ? (
          <form
            className={styles.beatDraft}
            onSubmit={(event) => {
              event.preventDefault();
              const value = draft.current?.value ?? "";
              if (value.trim()) prep.add(value, selected);
              setDrafting(false);
            }}
          >
            <textarea
              ref={draft}
              className={styles.beatDraftField}
              rows={2}
              maxLength={2000}
              placeholder="What happens?"
              aria-label="New beat"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
                if (event.key === "Escape") setDrafting(false);
              }}
              onBlur={(event) => {
                if (event.currentTarget.value.trim()) {
                  prep.add(event.currentTarget.value, selected);
                }
                setDrafting(false);
              }}
            />
            {selected.length > 0 ? (
              <p className={styles.prepNote}>
                {names(selected)} will be attached.
              </p>
            ) : null}
          </form>
        ) : null}
      </CarriageSection>

      {prep.problem ? (
        <button type="button" className={styles.prepProblem} onClick={prep.dismissProblem}>
          <span aria-hidden="true">⚠</span> {prep.problem}
        </button>
      ) : null}
    </CarriageShell>
  );
}

/**
 * The title, and what tonight is for.
 *
 * Both commit on blur rather than per keystroke: renaming a session renames the
 * composition it is prepared on, so the shell re-reads, and doing that on every
 * character would fight the GM's own typing.
 */
function SessionFields({ prep }: { prep: PrepStore }) {
  const { session } = prep;
  const [title, setTitle] = useState(session.title);
  const [intent, setIntent] = useState(session.intent ?? "");

  useEffect(() => setTitle(session.title), [session.title]);
  useEffect(() => setIntent(session.intent ?? ""), [session.intent]);

  return (
    <>
      <input
        className={styles.prepTitle}
        value={title}
        maxLength={120}
        aria-label="Session name"
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => void prep.describe(title, intent)}
      />
      <textarea
        className={styles.prepIntent}
        value={intent}
        rows={2}
        maxLength={500}
        placeholder="What is tonight for?"
        aria-label="What tonight is for"
        onChange={(event) => setIntent(event.target.value)}
        onBlur={() => void prep.describe(title, intent)}
      />
    </>
  );
}

function BeatRow({
  beat,
  index,
  last,
  prep,
  selected,
  onReveal
}: {
  beat: Beat;
  index: number;
  last: boolean;
  prep: PrepStore;
  selected: readonly ObjectRef[];
  onReveal: (ref: ObjectRef) => void;
}) {
  const [body, setBody] = useState(beat.body);

  useEffect(() => setBody(beat.body), [beat.body]);

  const here = new Set(beat.refs.map((ref) => ref.objectId as string));
  const attachable = selected.filter((ref) => !here.has(ref.objectId as string));

  return (
    <li className={styles.beat} data-proposed={beat.author !== "gm" || undefined}>
      <div className={styles.beatOrder}>
        <span className={styles.beatNumber}>{index + 1}</span>
        <div className={styles.beatMoves}>
          <IconButton
            density="compact"
            disabled={index === 0}
            label="Move earlier"
            onClick={() => void prep.shift(beat.id, -1)}
          >
            <CarriageIcon kind="chevron-up" />
          </IconButton>
          <IconButton
            density="compact"
            disabled={last}
            label="Move later"
            onClick={() => void prep.shift(beat.id, 1)}
          >
            <CarriageIcon kind="chevron" />
          </IconButton>
        </div>
      </div>

      <div className={styles.beatBody}>
        <textarea
          className={styles.beatText}
          value={body}
          rows={2}
          maxLength={2000}
          aria-label={`Beat ${index + 1}`}
          onChange={(event) => setBody(event.target.value)}
          onBlur={() => prep.reword(beat.id, body)}
        />

        {/* Who put it in the order, when it was not the GM. The Librarian may
            propose a beat; a GM must be able to tell their own plan from a
            suggestion, and rewording one claims it. */}
        {beat.author !== "gm" ? (
          <p className={styles.beatProposed}>Proposed by the Librarian</p>
        ) : null}

        <BeatRefs beat={beat} prep={prep} onReveal={onReveal} />

        <div className={styles.beatActions}>
          {attachable.length > 0 ? (
            <button
              type="button"
              className={styles.beatAction}
              onClick={() => prep.attach(beat.id, attachable)}
            >
              Attach {countReads(attachable.length)}
            </button>
          ) : null}
          <Button
            density="compact"
            variant="quiet"
            onClick={() => void prep.drop(beat.id)}
          >
            Remove
          </Button>
        </div>
      </div>
    </li>
  );
}

/**
 * What a beat is about.
 *
 * A chip is followed rather than navigated to — the same gesture as following a
 * relationship or retrieving from the Library. If the thing is not on this Prep
 * it is brought here; pulling the thread brings the thing to you.
 */
function BeatRefs({
  beat,
  prep,
  onReveal
}: {
  beat: Beat;
  prep: PrepStore;
  onReveal: (ref: ObjectRef) => void;
}) {
  if (beat.refs.length === 0) return null;

  return (
    <ul className={styles.beatRefs}>
      {beat.refs.map((ref) => (
        <li key={ref.objectId} className={styles.beatRef}>
          <button
            type="button"
            className={styles.beatRefName}
            onClick={() => onReveal(ref)}
            title={ref.kind ? `${ref.label} — ${ref.kind}` : ref.label}
          >
            {ref.label}
          </button>
          <IconButton
            density="compact"
            className={styles.beatRefDrop}
            label={`Detach ${ref.label}`}
            onClick={() => prep.detach(beat.id, ref.objectId)}
          >
            <CarriageIcon kind="close" />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}

const names = (refs: readonly ObjectRef[]): string =>
  refs.map((ref) => ref.label).join(", ");

const countReads = (n: number): string => `${n} ${n === 1 ? "card" : "cards"}`;

/** State in words. Truth and lifecycle cues are never colour alone. */
function stateReads(state: SessionState): string {
  if (state === "in_play") return "in play";
  if (state === "played") return "played";
  return "planned";
}
