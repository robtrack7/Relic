"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  captureCardAction,
  editCardBodyAction,
  moveCardsAction,
  removeCardsAction,
  type ActionResult
} from "@/app/actions";
import {
  asCardId,
  asWorldObjectId,
  DEFAULT_CARD_HEIGHT,
  DEFAULT_CARD_WIDTH,
  type CardId,
  type CompositionId,
  type DeskCard,
  type DeskView
} from "@/lib/world/model";

/**
 * Desk state and its sync to the server.
 *
 * Capture must be immediate — a thought cannot wait for a round trip — so every
 * gesture applies locally first and is written behind it. Writes go through one
 * serialised queue, because the Desk is a shared composition and interleaved
 * writes would let one gesture land inside another.
 *
 * Versions live in a ref rather than in React state. They are concurrency
 * tokens, not rendered values: reading them from state would mean sending
 * whatever version the last render happened to see, which produces conflicts
 * against writes this client made itself.
 */

export type SyncState =
  | { kind: "settled" }
  | { kind: "saving" }
  | { kind: "problem"; message: string };

const BODY_DEBOUNCE_MS = 400;

type Versions = { cardVersion: number; bodyVersion: number };

export type DeskStore = ReturnType<typeof useDesk>;

export function useDesk(initial: DeskView) {
  const compositionId: CompositionId = initial.compositionId;
  const [cards, setCards] = useState<readonly DeskCard[]>(initial.cards);
  const [sync, setSync] = useState<SyncState>({ kind: "settled" });

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const versions = useRef(new Map<CardId, Versions>());
  /** The body the server last confirmed, so an unchanged card is never rewritten. */
  const savedBodies = useRef(new Map<CardId, string>());
  const seeded = useRef(false);
  if (!seeded.current) {
    seeded.current = true;
    for (const card of initial.cards) {
      versions.current.set(card.cardId, {
        cardVersion: card.cardVersion,
        bodyVersion: card.bodyVersion
      });
      savedBodies.current.set(card.cardId, card.body);
    }
  }

  const queue = useRef<Promise<void>>(Promise.resolve());
  const inFlight = useRef(0);
  const debounces = useRef(new Map<CardId, ReturnType<typeof setTimeout>>());

  const enqueue = useCallback((work: () => Promise<void>) => {
    inFlight.current += 1;
    setSync({ kind: "saving" });
    const run = async () => {
      try {
        await work();
      } catch (error) {
        console.error("[relic] desk write threw", error);
        setSync({
          kind: "problem",
          message: "The Desk could not be saved. Your changes are still here."
        });
      } finally {
        inFlight.current -= 1;
        if (inFlight.current === 0) {
          setSync((current) => (current.kind === "saving" ? { kind: "settled" } : current));
        }
      }
    };
    queue.current = queue.current.then(run, run);
    return queue.current;
  }, []);

  /** Adopts the server's whole composition after a conflict. */
  const reconcile = useCallback((current: readonly DeskCard[]) => {
    versions.current = new Map(
      current.map((card) => [
        card.cardId,
        { cardVersion: card.cardVersion, bodyVersion: card.bodyVersion }
      ])
    );
    savedBodies.current = new Map(current.map((card) => [card.cardId, card.body]));
    setCards(current);
  }, []);

  const absorb = useCallback(
    <T>(result: ActionResult<T>, onOk: (data: T) => void): void => {
      switch (result.state) {
        case "ok":
          onOk(result.data);
          return;
        case "conflict":
          reconcile(result.current);
          setSync({
            kind: "problem",
            message: "This Desk changed elsewhere. Showing the saved version."
          });
          return;
        case "missing":
          setSync({ kind: "problem", message: "That card is no longer on this Desk." });
          return;
        case "invalid":
        case "failed":
          setSync({ kind: "problem", message: result.message });
      }
    },
    [reconcile]
  );

  const patch = useCallback((cardId: CardId, change: Partial<DeskCard>) => {
    setCards((current) =>
      current.map((card) => (card.cardId === cardId ? { ...card, ...change } : card))
    );
  }, []);

  const remember = useCallback((cardId: CardId, next: Partial<Versions>) => {
    const current = versions.current.get(cardId) ?? { cardVersion: 1, bodyVersion: 1 };
    versions.current.set(cardId, { ...current, ...next });
  }, []);

  const topZ = useCallback(
    () => cardsRef.current.reduce((top, card) => Math.max(top, card.z), 0),
    []
  );

  /** Capture: one new World Object, one Fragment, one card placing it. */
  const capture = useCallback(
    (x: number, y: number, body = ""): CardId => {
      const cardId = asCardId(crypto.randomUUID());
      const objectId = asWorldObjectId(crypto.randomUUID());
      const layout = {
        x: Math.round(x - DEFAULT_CARD_WIDTH / 2),
        y: Math.round(y - DEFAULT_CARD_HEIGHT / 2),
        width: DEFAULT_CARD_WIDTH,
        height: DEFAULT_CARD_HEIGHT
      };

      setCards((current) => [
        ...current,
        {
          cardId,
          objectId,
          layout,
          z: topZ() + 1,
          body,
          truthState: "pencil",
          cardVersion: 1,
          bodyVersion: 1
        }
      ]);
      versions.current.set(cardId, { cardVersion: 1, bodyVersion: 1 });
      savedBodies.current.set(cardId, body);

      enqueue(async () => {
        const result = await captureCardAction({
          compositionId,
          cardId,
          objectId,
          body,
          ...layout
        });
        absorb(result, (saved) => {
          remember(cardId, {
            cardVersion: saved.cardVersion,
            bodyVersion: saved.bodyVersion
          });
          // Take the server's stacking, but not its layout: the card may have
          // been dragged while this was in flight, and the server stored
          // exactly the placement we sent it anyway.
          patch(cardId, { z: saved.z, cardVersion: saved.cardVersion });
        });
      });

      return cardId;
    },
    [absorb, compositionId, enqueue, patch, remember, topZ]
  );

  /**
   * Writes the body if it differs from what the server last confirmed.
   *
   * Several paths converge on this — the debounce, leaving the editor, and
   * clicking away — and every one of them must be safe to call. The check that
   * matters happens inside the queue, once earlier writes have settled.
   */
  const flushBody = useCallback(
    (cardId: CardId) => {
      const timer = debounces.current.get(cardId);
      if (timer) {
        clearTimeout(timer);
        debounces.current.delete(cardId);
      }

      const pending = cardsRef.current.find((card) => card.cardId === cardId);
      if (!pending || savedBodies.current.get(cardId) === pending.body) return;

      enqueue(async () => {
        const latest = cardsRef.current.find((card) => card.cardId === cardId);
        if (!latest) return;
        const body = latest.body;
        if (savedBodies.current.get(cardId) === body) return;

        const known = versions.current.get(cardId);
        if (!known) return;

        const result = await editCardBodyAction({
          compositionId,
          cardId,
          body,
          observedBodyVersion: known.bodyVersion
        });
        absorb(result, (saved) => {
          remember(cardId, { bodyVersion: saved.bodyVersion });
          savedBodies.current.set(cardId, body);
          patch(cardId, { bodyVersion: saved.bodyVersion });
        });
      });
    },
    [absorb, compositionId, enqueue, patch, remember]
  );

  /** Edits world truth. The composition is untouched. */
  const setBody = useCallback(
    (cardId: CardId, body: string) => {
      patch(cardId, { body });
      const timer = debounces.current.get(cardId);
      if (timer) clearTimeout(timer);
      debounces.current.set(
        cardId,
        setTimeout(() => flushBody(cardId), BODY_DEBOUNCE_MS)
      );
    },
    [flushBody, patch]
  );

  /** Local, per-frame. Called continuously while dragging; never writes. */
  const nudge = useCallback((ids: readonly CardId[], dx: number, dy: number) => {
    const moving = new Set<string>(ids);
    setCards((current) =>
      current.map((card) =>
        moving.has(card.cardId)
          ? { ...card, layout: { ...card.layout, x: card.layout.x + dx, y: card.layout.y + dy } }
          : card
      )
    );
  }, []);

  /** Edits the composition. One gesture, one change set. */
  const commitMove = useCallback(
    (ids: readonly CardId[]) => {
      if (ids.length === 0) return;

      enqueue(async () => {
        const moving = new Set<string>(ids);
        const moves = cardsRef.current
          .filter((card) => moving.has(card.cardId))
          .map((card) => ({
            cardId: card.cardId as string,
            x: Math.round(card.layout.x),
            y: Math.round(card.layout.y),
            observedCardVersion: versions.current.get(card.cardId)?.cardVersion ?? card.cardVersion
          }));
        if (moves.length === 0) return;

        const result = await moveCardsAction({ compositionId, moves, bringToFront: true });
        absorb(result, (saved) => {
          for (const card of saved) {
            remember(card.cardId, { cardVersion: card.cardVersion });
            patch(card.cardId, { cardVersion: card.cardVersion, z: card.z });
          }
        });
      });
    },
    [absorb, compositionId, enqueue, patch, remember]
  );

  const remove = useCallback(
    (ids: readonly CardId[]) => {
      if (ids.length === 0) return;
      const removing = new Set<string>(ids);
      setCards((current) => current.filter((card) => !removing.has(card.cardId)));
      for (const id of ids) {
        const timer = debounces.current.get(id);
        if (timer) clearTimeout(timer);
        debounces.current.delete(id);
        versions.current.delete(id);
        savedBodies.current.delete(id);
      }

      enqueue(async () => {
        const result = await removeCardsAction({
          compositionId,
          cardIds: ids as readonly string[]
        });
        absorb(result, () => undefined);
      });
    },
    [absorb, compositionId, enqueue]
  );

  const dismissProblem = useCallback(() => setSync({ kind: "settled" }), []);

  const byId = useMemo(() => {
    const map = new Map<string, DeskCard>();
    for (const card of cards) map.set(card.cardId, card);
    return map;
  }, [cards]);

  return {
    compositionId,
    cards,
    byId,
    sync,
    capture,
    setBody,
    flushBody,
    nudge,
    commitMove,
    remove,
    dismissProblem
  };
}
