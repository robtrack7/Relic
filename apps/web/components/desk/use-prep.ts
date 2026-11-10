"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  editSessionAction,
  removeBeatAction,
  reorderBeatsAction,
  setBeatAction
} from "@/app/actions";
import {
  asBeatId,
  type Beat,
  type BeatId,
  type ObjectRef,
  type Prep,
  type Session,
  type WorldObjectId
} from "@/lib/world/model";

/**
 * The running order, held in the browser.
 *
 * Small on purpose. The Desk's store is large because a canvas is a live
 * optimistic picture of the world that has to reconcile moves, bodies, claims,
 * and writes it did not make. A rail is a short list of sentences: it paints
 * first and writes behind, exactly as everything else in Relic does, and when a
 * write comes back refused it puts the last confirmed order back rather than
 * leaving the GM reading a plan the world does not hold.
 *
 * Nothing here can reach world truth. A beat is an intention — `setBeat` writes
 * to `session_beats`, which has no truth column and no route into `claims`.
 */
export type PrepStore = ReturnType<typeof usePrep>;

export function usePrep(initial: Prep) {
  const [session, setSession] = useState<Session>(initial.session);
  const [beats, setBeats] = useState<readonly Beat[]>(initial.beats);
  const [problem, setProblem] = useState<string | null>(null);

  /** The last state the server confirmed. Where a refused write reverts to. */
  const confirmed = useRef<Prep>(initial);
  const sessionSaves = useRef<Promise<void>>(Promise.resolve());
  const sessionRevision = useRef(0);

  // A fresh server render — after a rename, or a navigation back — is the
  // truth. The prop is a new object only when the server has re-read the
  // session, so this does not fight an optimistic edit in progress.
  useEffect(() => {
    confirmed.current = initial;
    setSession(initial.session);
    setBeats(initial.beats);
  }, [initial]);

  const revert = useCallback((message: string) => {
    setSession(confirmed.current.session);
    setBeats(confirmed.current.beats);
    setProblem(message);
  }, []);

  const settle = useCallback((next: readonly Beat[]) => {
    setBeats(next);
    confirmed.current = { ...confirmed.current, beats: next };
  }, []);

  /**
   * A beat that arrived from somewhere this rail did not write — today, the
   * Librarian planning one mid-sentence.
   *
   * The inverse of every other write here: it has *already* committed, so there
   * is nothing to reconcile and nothing that could conflict. The same shape as
   * the Desk's `absorbExternal`, and separate from `write` for the same reason —
   * `write` interprets an answer to a request this client made.
   */
  const absorb = useCallback(
    (arriving: readonly Beat[]) => {
      if (arriving.length === 0) return;
      const replaced = new Set(arriving.map((beat) => beat.id as string));
      const next = [
        ...confirmed.current.beats.filter((beat) => !replaced.has(beat.id)),
        ...arriving
      ].sort((a, b) => a.position - b.position);
      settle(next);
    },
    [settle]
  );

  /**
   * What the session is called and what it is for.
   *
   * Committed on blur rather than per keystroke, because it revalidates the
   * shell: the prep composition carries the session's name, so renaming the
   * evening renames what the switcher shows.
   */
  const describe = useCallback(
    async (title: string, intent: string) => {
      const optimistic: Session = {
        ...session,
        title: title.trim() || session.title,
        intent: intent.trim() || null
      };
      if (optimistic.title === session.title && optimistic.intent === session.intent) return;
      const revision = ++sessionRevision.current;
      setSession(optimistic);
      // Both fields save on blur. Serialize them against the last confirmed
      // version, while letting the GM continue editing the next field.
      const save = async () => {
        try {
          const result = await editSessionAction({
            sessionId: session.id,
            title,
            intent,
            observedVersion: confirmed.current.session.version
          });
          if (result.state === "ok") {
            confirmed.current = { ...confirmed.current, session: result.data };
            if (revision === sessionRevision.current) setSession(result.data);
            setProblem(null);
          } else if (revision === sessionRevision.current) {
            revert(result.state === "refused" ? "This session was changed somewhere else." : "Relic could not save that.");
          }
        } catch {
          if (revision === sessionRevision.current) revert("Relic could not save that.");
        }
      };
      const queued = sessionSaves.current.then(save);
      sessionSaves.current = queued;
      await queued;
    },
    [revert, session]
  );

  /** Writes a beat: a new one when the id is new, the same one revised when not. */
  const write = useCallback(
    async (beat: Beat) => {
      const before = beats;
      setBeats((was) =>
        was.some((b) => b.id === beat.id)
          ? was.map((b) => (b.id === beat.id ? beat : b))
          : [...was, beat]
      );

      const result = await setBeatAction({
        sessionId: session.id,
        beatId: beat.id,
        body: beat.body,
        refs: beat.refs.map((ref) => ref.objectId as string)
      });

      if (result.state !== "ok") {
        setBeats(before);
        setProblem("Relic could not save that beat.");
        return;
      }

      const saved = result.data;
      settle(
        (before.some((b) => b.id === saved.id)
          ? before.map((b) => (b.id === saved.id ? saved : b))
          : [...before, saved]
        ).slice()
      );
      setProblem(null);
    },
    [beats, session.id, settle]
  );

  const add = useCallback(
    (body: string, refs: readonly ObjectRef[] = []): BeatId => {
      const beatId = asBeatId(crypto.randomUUID());
      const position = beats.reduce((top, beat) => Math.max(top, beat.position), 0) + 1;
      void write({
        id: beatId,
        sessionId: session.id,
        body,
        position,
        refs,
        author: "gm",
        version: 1
      });
      return beatId;
    },
    [beats, session.id, write]
  );

  const reword = useCallback(
    (beatId: BeatId, body: string) => {
      const beat = beats.find((b) => b.id === beatId);
      if (!beat || beat.body === body.trim() || body.trim() === "") return;
      void write({ ...beat, body: body.trim() });
    },
    [beats, write]
  );

  /**
   * Attach world material to a beat, or take it off again.
   *
   * `setBeat` replaces the whole set, so both are expressed as the list the beat
   * should now be about. Attaching says nothing about the object itself — the
   * beat records that tonight is meant to involve it, which is a fact about the
   * evening and not about the world.
   */
  const attach = useCallback(
    (beatId: BeatId, refs: readonly ObjectRef[]) => {
      const beat = beats.find((b) => b.id === beatId);
      if (!beat) return;
      const here = new Set(beat.refs.map((ref) => ref.objectId as string));
      const added = refs.filter((ref) => !here.has(ref.objectId as string));
      if (added.length === 0) return;
      void write({ ...beat, refs: [...beat.refs, ...added] });
    },
    [beats, write]
  );

  const detach = useCallback(
    (beatId: BeatId, objectId: WorldObjectId) => {
      const beat = beats.find((b) => b.id === beatId);
      if (!beat) return;
      void write({ ...beat, refs: beat.refs.filter((ref) => ref.objectId !== objectId) });
    },
    [beats, write]
  );

  const drop = useCallback(
    async (beatId: BeatId) => {
      const before = beats;
      setBeats((was) => was.filter((beat) => beat.id !== beatId));

      const result = await removeBeatAction({ beatId });
      if (result.state !== "ok") {
        setBeats(before);
        setProblem("Relic could not remove that beat.");
        return;
      }
      settle(before.filter((beat) => beat.id !== beatId));
      setProblem(null);
    },
    [beats, settle]
  );

  /**
   * Moves one beat up or down the order.
   *
   * The whole list is sent, because that is what `reorderBeats` takes: a partial
   * order would be a caller asking Relic to decide where the rest went.
   */
  const shift = useCallback(
    async (beatId: BeatId, direction: -1 | 1) => {
      const before = beats;
      const at = before.findIndex((beat) => beat.id === beatId);
      const to = at + direction;
      if (at < 0 || to < 0 || to >= before.length) return;

      const next = [...before];
      const [moved] = next.splice(at, 1);
      if (!moved) return;
      next.splice(to, 0, moved);
      setBeats(next.map((beat, index) => ({ ...beat, position: index + 1 })));

      const result = await reorderBeatsAction({
        sessionId: session.id,
        beatIds: next.map((beat) => beat.id)
      });
      if (result.state !== "ok") {
        setBeats(before);
        setProblem("Relic could not reorder those.");
        return;
      }
      settle(result.data);
      setProblem(null);
    },
    [beats, session.id, settle]
  );

  return {
    session,
    beats,
    problem,
    dismissProblem: useCallback(() => setProblem(null), []),
    absorb,
    describe,
    add,
    reword,
    attach,
    detach,
    drop,
    shift
  };
}
