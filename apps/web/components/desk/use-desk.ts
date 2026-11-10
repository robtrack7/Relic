"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  captureCardAction,
  changeCollectionAction,
  editCardBodyAction,
  editRepresentationAction,
  moveCardsAction,
  moveCollectionCardsAction,
  referenceObjectsAction,
  removeCardsAction,
  removeCollectionCardsAction,
  restoreCompositionAction,
  removeClaimAction,
  representObjectAction,
  searchWorldAction,
  inspectObjectAction,
  readCompositionObjectsAction,
  setClaimAction,
  setRelationshipVisibilityAction,
  settleTruthAction,
  type ActionResult
} from "@/app/actions";
import {
  asCardId,
  asWorldObjectId,
  cardRef,
  type CardTint,
  DEFAULT_CARD_HEIGHT,
  DEFAULT_CARD_WIDTH,
  type CardId,
  type ClaimId,
  type ClaimObservation,
  type CompositionId,
  type DeskCard,
  type DeskView,
  type FieldValues,
  type KindFilter,
  type Link,
  type Maturity,
  type ObjectRef,
  type RepresentationKind,
  type RelationshipId,
  type StoryPosition,
  type TruthState,
  type WorldEntry,
  type WorldObjectId
} from "@/lib/world/model";
import { relationshipCardinality, relationshipTypeFor } from "@/lib/world/relationship-types";
import { clusterAt, DEFAULT_SIZE } from "@/lib/desk/arrange";
import type { Point } from "@/lib/desk/viewport";
import type { Effect } from "@/lib/librarian/model";
import { EMPTY_SPATIAL, applyCollectionCommand, type CollectionCommand } from "@/lib/desk/collections";

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
export const MIN_CARD_WIDTH = 180;
export const MAX_CARD_WIDTH = 720;
export const MIN_CARD_HEIGHT = 120;
export const MAX_CARD_HEIGHT = 640;

type Versions = { cardVersion: number; bodyVersion: number };

type PlacementHistory = Readonly<{
  cards: readonly PlacementFrame[];
  spatial: import("@/lib/world/model").SpatialState;
}>;

type PlacementFrame = Readonly<Pick<DeskCard, "cardId" | "layout" | "z" | "presentation">>;

export type DeskStore = ReturnType<typeof useDesk>;

export function useDesk(initial: DeskView) {
  const compositionId: CompositionId = initial.compositionId;
  const worldId = initial.worldId;
  const [cards, setCards] = useState<readonly DeskCard[]>(initial.cards);
  const [spatial, setSpatial] = useState(initial.spatial ?? EMPTY_SPATIAL);
  const spatialRef = useRef(spatial);
  spatialRef.current = spatial;
  const savedSpatial = useRef(initial.spatial ?? EMPTY_SPATIAL);
  const pendingCollections = useRef<{ key: number; command: CollectionCommand }[]>([]);
  const collectionSequence = useRef(0);
  const [sync, setSyncState] = useState<SyncState>({ kind: "settled" });

  // Composition history contains placement and Board grouping only. World
  // Object identity, claims, and relationships never enter this snapshot.
  const past = useRef<PlacementHistory[]>([]);
  const future = useRef<PlacementHistory[]>([]);
  const [historyRevision, setHistoryRevision] = useState(0);
  const historyReady = useRef(true);
  const historyBusy = useRef(false);
  const pushHistory = useCallback(() => {
    past.current = [...past.current.slice(-49), { cards: cardsRef.current.map(snapshotPlacement), spatial: spatialRef.current }];
    future.current = [];
    setHistoryRevision(value => value + 1);
  }, []);
  const restoreHistory = useCallback((entry: PlacementHistory) => {
    const frames = new Map(entry.cards.map(frame => [frame.cardId, frame]));
    const merged = cardsRef.current.map(card => {
      const frame = frames.get(card.cardId);
      return frame ? { ...card, layout: frame.layout, z: frame.z, presentation: { ...(card.presentation ?? { tint: null }), tint: frame.presentation?.tint ?? null } } : card;
    });
    cardsRef.current = merged;
    spatialRef.current = entry.spatial;
    setCards(merged);
    setSpatial(entry.spatial);
    setHistoryRevision(value => value + 1);
  }, []);

  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const rebaseSpatial = useCallback(() => {
    let projected = savedSpatial.current;
    for (const pending of pendingCollections.current) {
      try { projected = applyCollectionCommand(projected, pending.command, cardsRef.current); } catch { /* Queued validation reports failed dependent operations. */ }
    }
    spatialRef.current = projected;
    setSpatial(projected);
  }, []);

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
  const failures = useRef(new Map<string, { message: string; retry?: () => Promise<void> }>());
  const activeFailure = useRef<string | null>(null);
  const retryAllowed = useRef(true);
  const operationId = useRef(0);
  const setSync = useCallback((next: SyncState) => {
    if (next.kind === "problem") activeFailure.current = next.message;
    setSyncState(next);
  }, []);

  const enqueue = useCallback((work: () => Promise<void>, key = `write:${++operationId.current}`, retryable = false) => {
    inFlight.current += 1;
    // A later gesture cannot make an earlier unsuccessful write look saved.
    setSyncState(current => current.kind === "problem" ? current : { kind: "saving" });
    const run = async () => {
      activeFailure.current = null;
      retryAllowed.current = true;
      try { await work(); }
      catch (error) {
        console.error("[relic] desk write threw", error);
        activeFailure.current = "The Desk could not be saved. Your changes are still here.";
      } finally {
        if (activeFailure.current) failures.current.set(key, { message: activeFailure.current, retry: retryable && retryAllowed.current ? work : undefined });
        else failures.current.delete(key);
        inFlight.current -= 1;
        const problem = failures.current.values().next().value;
        setSyncState(problem ? { kind: "problem", message: problem.message } : inFlight.current > 0 ? { kind: "saving" } : { kind: "settled" });
      }
    };
    queue.current = queue.current.then(run, run);
    return queue.current;
  }, []);

  const retryFailed = useCallback(() => {
    for (const [key, failure] of failures.current) if (failure.retry) void enqueue(failure.retry, key, true);
  }, [enqueue]);

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
          retryAllowed.current = false;
          /*
           * A conflict carries the whole composition, so replacing what we hold
           * is the reconciliation — except when it carries nothing.
           *
           * Object-scoped writes conflict too, and a stale sheet or a stale
           * claim is not a composition-shaped fact: `editRepresentation` and
           * `settleTruth` have no composition to report and return an empty
           * list. Feeding that through here would read as "the Desk now contains
           * nothing" and wipe every card on screen. An empty list means *this
           * conflict was not about placement*, so the cards are left alone and
           * the GM is told what actually happened.
           */
          if (result.current.length > 0) reconcile(result.current);
          setSync({
            kind: "problem",
            message:
              result.current.length > 0
                ? "This Desk changed elsewhere. Showing the saved version."
                : "That changed while you were editing it. Open it again to see where it stands."
          });
          return;
        case "missing":
          retryAllowed.current = false;
          setSync({ kind: "problem", message: "That card is no longer on this Desk." });
          return;
        // Relic declined, and said why. Shown as it was given: a refusal is a
        // statement about the world's rules, not a malfunction to apologise for.
        case "refused":
          retryAllowed.current = false;
          setSync({ kind: "problem", message: result.reason });
          return;
        case "invalid":
          retryAllowed.current = false;
          setSync({ kind: "problem", message: result.message });
          return;
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
    (x: number, y: number, body = "", kind?: RepresentationKind): CardId => {
      const cardId = asCardId(crypto.randomUUID());
      const objectId = asWorldObjectId(crypto.randomUUID());
      // Every new placement starts from the same calm editorial footprint.
      // Family projections may still express hierarchy after deliberate
      // disclosure or a Board-specific resize.
      const width = DEFAULT_CARD_WIDTH;
      const height = DEFAULT_CARD_HEIGHT;
      const layout = {
        x: Math.round(x - width / 2),
        y: Math.round(y - height / 2),
        width,
        height
      };

      setCards((current) => [
        ...current,
        {
          cardId,
          objectId,
          layout,
          z: topZ() + 1,
          body,
          // Capture produces Pencil and nothing else. Even guessing otherwise
          // here would be wrong: this is the client's picture of a write it has
          // not made yet, and it may not depict established truth.
          maturity: "pencil",
          settled: null,
          // The GM is the one typing. Their own prose is the unmarked case, so
          // there is no authorship to show and nothing yet to restore.
          written: null,
          cardVersion: 1,
          bodyVersion: 1,
          // A captured thought has not been deepened into anything yet, and
          // asserts nothing. All of these arrive later, if at all.
          representation: null,
          claims: [],
          links: []
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
          ...layout,
          initialRepresentation: kind
            ? { representationId: crypto.randomUUID(), kind, label: "" }
            : undefined
        });
        absorb(result, (saved) => {
          remember(cardId, {
            cardVersion: saved.cardVersion,
            bodyVersion: saved.bodyVersion
          });
          // Take the server's stacking, but not its layout: the card may have
          // been dragged while this was in flight, and the server stored
          // exactly the placement we sent it anyway.
          patch(cardId, {
            z: saved.z,
            cardVersion: saved.cardVersion,
            representation: saved.representation
          });
        });
      }, `capture:${cardId}`, true);

      return cardId;
    },
    [absorb, compositionId, enqueue, patch, remember, topZ, pushHistory]
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
          // Authorship comes back from the server rather than being assumed: an
          // edit here is the GM's, so it clears whatever mark the Librarian had
          // left, and a restore is exactly that edit.
          patch(cardId, { bodyVersion: saved.bodyVersion, written: saved.written });
        });
      }, `body:${cardId}`, true);
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

  /** Explicit section save: same validated operation, with acknowledgement for local drafts. */
  const saveBody = useCallback((cardId: CardId, body: string, observedBodyVersion?: number): Promise<boolean> => {
    const timer = debounces.current.get(cardId);
    if (timer) { clearTimeout(timer); debounces.current.delete(cardId); }
    const observed = observedBodyVersion ?? versions.current.get(cardId)?.bodyVersion;
    if (observed === undefined) return Promise.resolve(false);
    let saved = false;
    return enqueue(async () => {
      const known = versions.current.get(cardId);
      if (!known || !cardsRef.current.some(card => card.cardId === cardId)) return;
      const result = await editCardBodyAction({ compositionId, cardId, body, observedBodyVersion: observed });
      absorb(result, updated => {
        saved = true;
        remember(cardId, { bodyVersion: updated.bodyVersion });
        savedBodies.current.set(cardId, body);
        setCards(current => current.map(card => card.objectId === updated.objectId ? { ...card, body, bodyVersion: updated.bodyVersion, written: updated.written } : card));
      });
    }, `body:${cardId}`).then(() => saved);
  }, [absorb, compositionId, enqueue, remember]);

  /** Local, per-frame. Called continuously while dragging; never writes. */
  const nudge = useCallback((ids: readonly CardId[], dx: number, dy: number) => {
    if (historyReady.current) {
      pushHistory();
      historyReady.current = false;
    }
    const moving = new Set<string>(ids);
    // Keep the imperative snapshot in step with the optimistic projection.
    // Pointer moves are continuous events and React may defer their render;
    // pointer-up can therefore commit before `cardsRef.current = cards` runs
    // again. The next commit must still see the final local position.
    const next = cardsRef.current.map((card) =>
      moving.has(card.cardId)
        ? { ...card, layout: { ...card.layout, x: card.layout.x + dx, y: card.layout.y + dy } }
        : card
    );
    cardsRef.current = next;
    setCards(next);
    if (dx || dy) {
      const collections = spatialRef.current.collections.map(group => group.anchor && group.cardIds.every(id => moving.has(id)) ? { ...group, anchor: { x: group.anchor.x + dx, y: group.anchor.y + dy } } : group);
      spatialRef.current = { ...spatialRef.current, collections };
      setSpatial(spatialRef.current);
    }
  }, [pushHistory]);

  const cancelMove = useCallback(() => {
    if (!historyReady.current) {
      past.current = past.current.slice(0, -1);
      setHistoryRevision(value => value + 1);
    }
    historyReady.current = true;
  }, []);

  /** Board presentation resize. The object and its relationships are untouched. */
  const resizeCard = useCallback((cardId: CardId, width: number, height: number) => {
    const current = cardsRef.current.find(card => card.cardId === cardId);
    if (!current || !Number.isFinite(width) || !Number.isFinite(height)) return false;
    const nextWidth = Math.round(Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, width)));
    const nextHeight = Math.round(Math.max(MIN_CARD_HEIGHT, Math.min(MAX_CARD_HEIGHT, height)));
    if (nextWidth === current.layout.width && nextHeight === current.layout.height) return true;
    pushHistory();
    const nextCards = cardsRef.current.map(card => card.cardId === cardId
      ? { ...card, layout: { ...card.layout, width: nextWidth, height: nextHeight } }
      : card);
    cardsRef.current = nextCards;
    setCards(nextCards);
    void enqueue(async () => {
      const latest = cardsRef.current.find(card => card.cardId === cardId);
      if (!latest) return;
      const result = await moveCardsAction({ compositionId, bringToFront: false, moves: [{ cardId: cardId as string, x: latest.layout.x, y: latest.layout.y, width: nextWidth, height: nextHeight, observedCardVersion: versions.current.get(cardId)?.cardVersion ?? current.cardVersion }] });
      absorb(result, saved => {
        const savedCard = saved.find(card => card.cardId === cardId);
        if (savedCard) { remember(cardId, { cardVersion: savedCard.cardVersion }); patch(cardId, { cardVersion: savedCard.cardVersion }); }
      });
    }, `resize:${cardId}`, true);
    return true;
  }, [absorb, compositionId, enqueue, patch, pushHistory, remember]);

  const setCardTint = useCallback((ids: readonly CardId[], tint: CardTint | null) => {
    const wanted = new Set(ids);
    if (!wanted.size) return false;
    const selected = cardsRef.current.filter(card => wanted.has(card.cardId));
    if (!selected.length) return false;
    pushHistory();
    const nextCards = cardsRef.current.map(card => wanted.has(card.cardId)
      ? { ...card, presentation: { ...(card.presentation ?? { tint: null }), tint } }
      : card);
    cardsRef.current = nextCards;
    setCards(nextCards);
    void enqueue(async () => {
      const moves = cardsRef.current.filter(card => wanted.has(card.cardId)).map(card => ({
        cardId: card.cardId as string,
        x: card.layout.x,
        y: card.layout.y,
        tint,
        observedCardVersion: versions.current.get(card.cardId)?.cardVersion ?? card.cardVersion
      }));
      const result = await moveCardsAction({ compositionId, bringToFront: false, moves });
      absorb(result, saved => saved.forEach(card => { remember(card.cardId, { cardVersion: card.cardVersion }); patch(card.cardId, { cardVersion: card.cardVersion, presentation: card.presentation }); }));
    }, `tint:${[...wanted].sort().join(",")}`, true);
    return true;
  }, [absorb, compositionId, enqueue, patch, pushHistory, remember]);

  /** Arrange selected placements while preserving each card's presentation size. */
  const arrangeCards = useCallback((ids: readonly CardId[], measured?: ReadonlyMap<CardId, { width: number; height: number }> | readonly { cardId: CardId; width: number; height: number }[]) => {
    const wanted = new Set(ids);
    const selected = cardsRef.current.filter(card => wanted.has(card.cardId));
    if (!selected.length) return false;
    pushHistory();
    const left = Math.min(...selected.map(card => card.layout.x));
    const top = Math.min(...selected.map(card => card.layout.y));
    const gap = 32;
    let x = left;
    let y = top;
    let rowHeight = 0;
    const arranged = selected.map((card, index) => {
      const size = Array.isArray(measured) ? measured.find(item => item.cardId === card.cardId) : (measured as ReadonlyMap<CardId, { width: number; height: number }> | undefined)?.get(card.cardId);
      const width = card.layout.width;
      const height = card.layout.height;
      const footprintWidth = Math.max(width, Math.round(size?.width ?? width));
      const footprintHeight = Math.max(height, Math.round(size?.height ?? height));
      if (index > 0 && index % 3 === 0) { x = left; y += rowHeight + gap; rowHeight = 0; }
      const result = { ...card, layout: { x, y, width, height } };
      x += footprintWidth + gap;
      rowHeight = Math.max(rowHeight, footprintHeight);
      return result;
    });
    const byId = new Map(arranged.map(card => [card.cardId, card]));
    const nextCards = cardsRef.current.map(card => byId.get(card.cardId) ?? card);
    cardsRef.current = nextCards;
    setCards(nextCards);
    const arrangedSpatial = { ...spatialRef.current, collections: spatialRef.current.collections.map(group => group.cardIds.every(id => wanted.has(id)) ? { ...group, collapsed: false } : group) };
    spatialRef.current = arrangedSpatial;
    setSpatial(arrangedSpatial);
    void enqueue(async () => {
      const moves = arranged.map(card => ({ cardId: card.cardId as string, x: card.layout.x, y: card.layout.y, width: card.layout.width, height: card.layout.height, observedCardVersion: versions.current.get(card.cardId)?.cardVersion ?? card.cardVersion }));
      const result = await restoreCompositionAction({ compositionId, observedSpatialVersion: savedSpatial.current.version, moves, spatial: arrangedSpatial });
      absorb(result, saved => {
        savedSpatial.current = saved.spatial;
        rebaseSpatial();
        saved.cards.forEach(card => { remember(card.cardId, { cardVersion: card.cardVersion }); patch(card.cardId, { cardVersion: card.cardVersion, z: card.z }); });
      });
    }, `arrange:${[...wanted].sort().join(",")}`, true);
    return true;
  }, [absorb, compositionId, enqueue, patch, pushHistory, rebaseSpatial, remember]);

  /** Edits the composition. One gesture, one change set. */
  const commitMove = useCallback(
    (ids: readonly CardId[]) => {
      if (ids.length === 0) return;

      enqueue(async () => {
        // Read the current optimistic projection only when this serialised
        // gesture reaches the front of the queue. Earlier local writes may
        // have advanced the placement version, and using the version captured
        // at pointer-up would manufacture a conflict for this same client.
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

        const accept = (saved: readonly DeskCard[]) => {
          for (const card of saved) {
            remember(card.cardId, { cardVersion: card.cardVersion });
            patch(card.cardId, { cardVersion: card.cardVersion, z: card.z });
          }
        };
        if (spatialRef.current.collections.some(group => group.cardIds.every(id => moving.has(id)))) {
          const result = await moveCollectionCardsAction({ compositionId, moves, observedSpatialVersion: savedSpatial.current.version, preserveMembership: true, destinationId: null });
          absorb(result, saved => { savedSpatial.current = saved.spatial; rebaseSpatial(); accept(saved.cards); });
        } else absorb(await moveCardsAction({ compositionId, moves, bringToFront: true }), accept);
      }, `move:${[...ids].sort().join(",")}`, true);
      historyReady.current = true;
    },
    [absorb, compositionId, enqueue, patch, rebaseSpatial, remember]
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
        if (savedSpatial.current.collections.length) {
          const result = await removeCollectionCardsAction({ compositionId, cardIds: ids });
          absorb(result, saved => { savedSpatial.current = saved.spatial; rebaseSpatial(); });
          return;
        }
        const result = await removeCardsAction({
          compositionId,
          cardIds: ids as readonly string[]
        });
        absorb(result, () => undefined);
      }, `remove:${[...ids].sort().join(",")}`);
    },
    [absorb, compositionId, enqueue, rebaseSpatial]
  );

  /**
   * References the selected objects from another composition.
   *
   * Nothing leaves this composition and nothing is copied: the target gets its
   * own cards pointing at the same World Objects, keeping the arrangement they
   * had here so a cluster arrives as a cluster.
   */
  const referenceInto = useCallback(
    (target: CompositionId, ids: readonly CardId[]) => {
      if (ids.length === 0 || target === compositionId) return;
      const wanted = new Set<string>(ids);
      const placements = cardsRef.current
        .filter((card) => wanted.has(card.cardId))
        .map((card) => ({
          cardId: crypto.randomUUID(),
          objectId: card.objectId as string,
          x: Math.round(card.layout.x),
          y: Math.round(card.layout.y),
          width: DEFAULT_CARD_WIDTH,
          height: DEFAULT_CARD_HEIGHT
        }));
      if (placements.length === 0) return;

      enqueue(async () => {
        const result = await referenceObjectsAction({ compositionId: target, placements });
        // A conflict here concerns the *target* composition, which this store
        // does not hold, so reconciling against it would replace this Desk with
        // another one's cards. Only report the outcome.
        if (result.state === "ok") return;
        setSync({
          kind: "problem",
          message:
            result.state === "missing"
              ? "That board is no longer part of this world."
              : "Those cards could not be added to the board."
        });
      }, `reference:${target}`);
    },
    [compositionId, enqueue]
  );

  /**
   * Deepens an object into a kind of thing.
   *
   * Patched by `objectId`, not by card: the same identity may sit on this
   * composition more than once only across Boards, but the principle is the
   * point — deepening happens to the thing, not to the card you were looking
   * at when you asked.
   */
  const represent = useCallback(
    (objectId: WorldObjectId, kind: RepresentationKind, label: string) => {
      enqueue(async () => {
        const result = await representObjectAction({
          objectId,
          representationId: crypto.randomUUID(),
          kind,
          label
        });
        absorb(result, (representation) => {
          setCards((current) =>
            current.map((card) =>
              card.objectId === objectId ? { ...card, representation } : card
            )
          );
        });
      }, `representation:${objectId}`);
    },
    [absorb, enqueue]
  );

  const editSheet = useCallback(
    (objectId: WorldObjectId, label: string, fields: FieldValues, observedVersion?: number): Promise<boolean> => {
      const current = cardsRef.current.find((card) => card.objectId === objectId);
      const representation = current?.representation;
      if (!representation) return Promise.resolve(false);
      const observed = observedVersion ?? representation.version;

      let saved = false;
      return enqueue(async () => {
        const result = await editRepresentationAction({
          representationId: representation.id,
          label,
          fields,
          observedVersion: observed
        });
        absorb(result, (updated) => {
          saved = true;
          setCards((cards) =>
            cards.map((card) =>
              card.objectId === objectId ? { ...card, representation: updated } : card
            )
          );
        });
      }, `representation:${objectId}`).then(() => saved);
    },
    [absorb, enqueue]
  );

  /**
   * Asserts a narrative attribute, optionally pointing it at another object.
   *
   * A relationship has two ends and both are on screen, so both are updated
   * here: the subject gains an outbound link and the target — if it happens to
   * be on this composition — gains the inbound one. Waiting for a refetch would
   * mean the neighbourhood lit up a beat after the assertion that made it.
   */
  const assert = useCallback(
    (objectId: WorldObjectId, claimKind: string, value: string, target?: ObjectRef | null, story?: StoryPosition, expectedClaim?: ClaimObservation, showOnBoard = false): Promise<boolean> => {
      let saved = false;
      return enqueue(async () => {
        const placement = showOnBoard ? cardsRef.current.find(card => card.objectId === objectId) : undefined;
        const placementVersion = placement ? versions.current.get(placement.cardId)?.cardVersion : undefined;
        if (showOnBoard && (!placement || placementVersion === undefined)) return;
        const result = await setClaimAction({
          subjectId: objectId,
          claimId: crypto.randomUUID(),
          claimKind,
          value,
          objectValue: target?.objectId ?? null,
          ...(story ? { story } : {}),
          ...(expectedClaim ? { expectedClaim } : {}),
          ...(placement && placementVersion !== undefined ? { boardProjection: { compositionId, cardId: placement.cardId, observedCardVersion: placementVersion } } : {})
        });
        absorb(result, (claim) => {
          saved = true;
          if (placement && placementVersion !== undefined) remember(placement.cardId, { cardVersion: placementVersion + 1 });
          setCards((cards) => {
            const subject = cards.find((card) => card.objectId === objectId);
            const subjectRef = subject ? cardRef(subject) : cards.flatMap(card => card.links).find(link => link.other.objectId === objectId)?.other;
            if (!subjectRef) return cards;

            // The edge this assertion replaces. Held onto so the far end can
            // forget it as well — an in-link nobody points at any more would
            // keep a card lit for a relationship that no longer exists.
            const replacesByKind = claim.story.order === null &&
              (target === null || relationshipCardinality(claim.claimKind) === "one");
            const replacesObserved = (link: Pick<Link, "claimId" | "relationshipId">) =>
              link.claimId === expectedClaim?.claimId ||
              Boolean(expectedClaim?.relationshipId && link.relationshipId === expectedClaim.relationshipId);
            const replaced = subject?.links.find(
              (link) => link.direction === "out" && (replacesObserved(link) || (replacesByKind && (relationshipTypeFor(link.claimKind)?.key ?? link.claimKind) === claim.claimKind))
            );

            const stale = (link: Link) =>
              link.direction === "in" &&
              (replacesObserved(link) || (replacesByKind && (relationshipTypeFor(link.claimKind)?.key ?? link.claimKind) === claim.claimKind)) &&
              link.other.objectId === objectId;

            return cards.map((card) => {
              if (card.objectId === objectId) {
                return {
                  ...card,
                  ...(placement && card.cardId === placement.cardId && placementVersion !== undefined ? {
                    cardVersion: placementVersion + 1,
                    presentation: { ...(card.presentation ?? { tint: null }), semanticEdges: [...new Set([...(card.presentation?.semanticEdges ?? []), claim.relationshipId ?? claim.id as unknown as RelationshipId])] }
                  } : {}),
                  // No story position, so this replaced the standing claim of
                  // this kind rather than adding to it. Mirror that here.
                  claims: [
                    ...card.claims.filter(
                      (c) => !replacesObserved({ claimId: c.id, relationshipId: c.relationshipId }) && !(replacesByKind && (relationshipTypeFor(c.claimKind)?.key ?? c.claimKind) === claim.claimKind && c.story.order === null)
                    ),
                    claim
                  ],
                  links: [
                    ...card.links.filter(
                      (link) => !(link.direction === "out" && (replacesObserved(link) || (replacesByKind && (relationshipTypeFor(link.claimKind)?.key ?? link.claimKind) === claim.claimKind)))
                    ),
                    ...(target
                      ? [
                          {
                            claimId: claim.id,
                            relationshipId: claim.relationshipId ?? null,
                            provenance: claim.provenance, story: claim.story, settled: claim.settled,
                            claimKind: claim.claimKind,
                            direction: "out" as const,
                            other: target,
                            truthState: claim.truthState
                          }
                        ]
                      : [])
                  ]
                };
              }

              const wasOther = replaced?.other.objectId === card.objectId;
              const isOther = target?.objectId === card.objectId;
              if (!wasOther && !isOther) return card;

              return {
                ...card,
                links: [
                  ...card.links.filter((link) => !stale(link)),
                  ...(isOther
                    ? [
                        {
                          claimId: claim.id,
                          relationshipId: claim.relationshipId ?? null,
                          provenance: claim.provenance, story: claim.story, settled: claim.settled,
                          claimKind,
                          direction: "in" as const,
                          other: subjectRef,
                          truthState: claim.truthState
                        }
                      ]
                    : [])
                ]
              };
            });
          });
        });
      }, `assert:${objectId}:${claimKind}`).then(() => saved);
    },
    [absorb, compositionId, enqueue, remember]
  );

  const setRelationshipVisible = useCallback((cardId: CardId, relationshipId: RelationshipId, visible: boolean) => enqueue(async () => {
    const observedCardVersion = versions.current.get(cardId)?.cardVersion;
    if (observedCardVersion === undefined) return;
    const result = await setRelationshipVisibilityAction({ compositionId, cardId, relationshipId, visible, observedCardVersion });
    absorb(result, card => {
      remember(cardId, { cardVersion: card.cardVersion });
      patch(cardId, { cardVersion: card.cardVersion, presentation: card.presentation });
    });
  }), [absorb, compositionId, enqueue, patch, remember]);

  /**
   * Brings material that is elsewhere in the world onto this composition.
   *
   * Two gestures land here and they are the same act. Following a relationship
   * to something not on this Desk places it here rather than navigating away
   * from what you were looking at; retrieving something from the Library does
   * the same thing from the other direction. Both are references, so nothing is
   * copied and nothing moves.
   *
   * A batch commits as one change set — adding six things from the Library is
   * one intent, not six — and anything already here is returned rather than
   * placed twice, so the gesture stays idempotent whichever route reached it.
   */
  const pullIn = useCallback(
    async (refs: readonly ObjectRef[], centre: Point): Promise<readonly CardId[]> => {
      if (refs.length === 0) return [];

      const here = new Map(cardsRef.current.map((card) => [card.objectId as string, card.cardId]));
      const wanted = refs.filter((ref) => !here.has(ref.objectId));
      const existing = refs.flatMap((ref) => here.get(ref.objectId) ?? []);
      if (wanted.length === 0) return existing;

      // Deterministic layout, not a guess, and the same algorithm the Librarian
      // places through — `lib/desk/arrange` is shared precisely so a card the GM
      // retrieves and a card the Librarian brings arrive the same way.
      const spots = clusterAt(
        wanted.length,
        centre,
        cardsRef.current.map((card) => card.layout)
      );

      const placements = wanted.map((ref, index) => ({
        cardId: crypto.randomUUID(),
        objectId: ref.objectId as string,
        ...(spots[index] ?? { x: 0, y: 0, ...DEFAULT_SIZE })
      }));

      // Resolved rather than returned early: the caller usually wants to select
      // or deepen into what it just pulled, and both are keyed on cards that
      // have to exist first.
      const landed: { cardIds: readonly CardId[] } = { cardIds: [] };

      await enqueue(async () => {
        const result = await referenceObjectsAction({ compositionId, placements });
        absorb(result, (placed) => {
          // The server resolves each object's whole state — its representation,
          // its claims, and both ends of every relationship it holds. Nothing
          // here is in a position to invent that.
          setCards((current) => [
            ...current.filter((card) => !placed.some((p) => p.cardId === card.cardId)),
            ...placed
          ]);
          for (const card of placed) {
            versions.current.set(card.cardId, {
              cardVersion: card.cardVersion,
              bodyVersion: card.bodyVersion
            });
            savedBodies.current.set(card.cardId, card.body);
          }
          landed.cardIds = placed.map((card) => card.cardId);
        });
      }, `reference:${wanted.map(ref => ref.objectId).join(",")}`);

      return [...existing, ...landed.cardIds];
    },
    [absorb, compositionId, enqueue]
  );

  /**
   * Settles truth: establishes, disputes, or withdraws.
   *
   * The one gesture in the Desk that is **not** optimistic, and deliberately
   * so. Everything else here paints first and writes behind, because a thought
   * cannot wait for a round trip. Truth can: it arrives through a previewed,
   * confirmed act, and a card that showed Ink for two hundred milliseconds
   * before the server refused would be the interface lying about the world.
   * Nothing reads as established until it is.
   *
   * Versions come from what this client holds, not from the caller. They are
   * concurrency tokens — the whole point is that they describe what the GM was
   * actually looking at when they decided.
   */
  const settle = useCallback(
    (
      objectId: WorldObjectId,
      intent: {
        maturity?: Maturity | null;
        claims?: readonly { claimId: ClaimId; truth: TruthState; observedVersion?: number }[];
      }
    ): Promise<boolean> => {
      // Freeze exactly the state the GM confirmed before entering the write queue.
      const subject = cardsRef.current.find(card => card.objectId === objectId);
      if (!subject) return Promise.resolve(false);
      const selectedClaims = intent.claims ?? [];
      if (selectedClaims.some(wanted => !subject.claims.some(claim => claim.id === wanted.claimId))) {
        setSync({ kind: "problem", message: "A previewed assertion changed or was removed. Review it again before establishing." });
        return Promise.resolve(false);
      }
      const claims = selectedClaims.map((wanted) => {
          const known = subject.claims.find((claim) => claim.id === wanted.claimId);
          return { ...wanted, claimId: wanted.claimId as string, observedVersion: wanted.observedVersion ?? known!.version };
      });
      let saved = false;
      return enqueue(async () => {

        if (claims.length === 0 && (intent.maturity ?? null) === null) return;

        const result = await settleTruthAction({
          objectId,
          maturity: intent.maturity ?? null,
          claims
        });

        absorb(result, (settled) => {
          saved = true;
          const ruled = new Map(settled.claims.map((claim) => [claim.id as string, claim]));
          setCards((cards) =>
            cards.map((card) => {
              // Maturity belongs to the object, so every card referencing it
              // changes — one identity, not one placement.
              const isSubject = card.objectId === objectId;
              const next = isSubject
                ? {
                    ...card,
                    maturity: settled.maturity,
                    settled: settled.settled,
                    claims: card.claims.map((claim) => ruled.get(claim.id) ?? claim)
                  }
                : card;

              // A relationship's truth is visible from the far end too, and a
              // link nobody updated would go on calling an established edge
              // provisional.
              return {
                ...next,
                links: next.links.map((link) => {
                  const claim = ruled.get(link.claimId);
                  return claim ? { ...link, truthState: claim.truthState } : link;
                })
              };
            })
          );
        });
      }, `settle:${objectId}`).then(() => saved);
    },
    [absorb, enqueue]
  );

  const retract = useCallback(
    (objectId: WorldObjectId, claimId: ClaimId, observedVersion?: number): Promise<boolean> => {
      let saved = false;
      return enqueue(async () => {
        const result = await removeClaimAction({ claimId, ...(observedVersion !== undefined ? { observedVersion } : {}) });
        absorb(result, () => {
          saved = true;
          setCards((cards) =>
        cards.map((card) => ({
          ...card,
          claims:
            card.objectId === objectId
              ? card.claims.filter((c) => c.id !== claimId)
              : card.claims,
          // Retracting a relationship unlights both ends, wherever they are.
          links: card.links.filter((link) => link.claimId !== claimId)
        }))
          );
        });
      }, `retract:${claimId}`).then(() => saved);
    },
    [absorb, enqueue]
  );

  /**
   * The world's index.
   *
   * Reaches past this composition on purpose: what a world contains is not what
   * one Desk is showing, and an index that could only offer what is already in
   * front of you would make the Desk the world. `compositionId` is passed so
   * every entry can say whether it is already here — the difference between
   * retrieving something and revealing it.
   */
  const search = useCallback(
    async (input: {
      query: string;
      kinds?: readonly KindFilter[];
      maturity?: Maturity | null;
      include?: "active" | "archived" | "all";
      excludeId?: WorldObjectId;
      limit?: number;
      offset?: number;
    }): Promise<readonly WorldEntry[]> => {
      const result = await searchWorldAction({ worldId, compositionId, ...input });
      if (result.state === "ok") return result.data;
      // A failed read is not an empty world. Throw so Finder and Library can
      // distinguish an unavailable index from a truthful no-match result and
      // offer recovery without hiding the failure behind a blank list.
      throw new Error(result.state === "failed" ? result.message : "Search could not load.");
    },
    [compositionId, worldId]
  );

  /** The relationship picker's narrower question: what could the other end be? */
  const findObjects = useCallback(
    async (query: string, excludeId?: WorldObjectId): Promise<readonly ObjectRef[]> => {
      const found = await search({ query, excludeId, limit: 8 });
      return found.map((entry) => entry.ref);
    },
    [search]
  );

  const inspectObject = useCallback(async (objectId: WorldObjectId): Promise<DeskView> => {
    const result = await inspectObjectAction({ worldId, objectId });
    if (result.state !== "ok") throw new Error(result.state === "failed" ? result.message : "This object could not load.");
    return result.data;
  }, [worldId]);

  /** Synchronize world content across projections without importing placements. */
  const absorbObjects = useCallback((objects: readonly DeskCard[]) => {
    const incoming = new Map(objects.map(card => [card.objectId, card]));
    setCards(current => {
      let changed = false;
      const next = current.map(card => {
        const source = incoming.get(card.objectId);
        if (!source || (source.bodyVersion === card.bodyVersion && source.representation === card.representation && source.claims === card.claims && source.links === card.links && source.maturity === card.maturity)) return card;
        changed = true;
        const bodySource = source.bodyVersion >= card.bodyVersion ? source : card;
        const { body, bodyVersion, written } = bodySource;
        const representation = (source.representation?.version ?? 0) >= (card.representation?.version ?? 0) ? source.representation : card.representation;
        const { claims, links, maturity, settled } = source;
        versions.current.set(card.cardId, { cardVersion: card.cardVersion, bodyVersion });
        savedBodies.current.set(card.cardId, body);
        return { ...card, body, bodyVersion, representation, claims, links, written, maturity, settled };
      });
      return changed ? next : current;
    });
  }, []);

  const refreshObjects = useCallback(() => enqueue(async () => {
    const result = await readCompositionObjectsAction({ worldId, compositionId });
    if (result?.state === "ok") absorbObjects(result.data);
  }), [absorbObjects, compositionId, enqueue, worldId]);

  /**
   * Takes in a change this client did not make.
   *
   * Every other write here is optimistic: paint first, write behind, and the
   * server's answer only confirms what is already on screen. A Librarian write
   * is the reverse — it has *already* committed, and this is the first the
   * browser hears of it. So there is nothing to reconcile and nothing that could
   * conflict: the cards arriving are the truth, fully hydrated by the server,
   * and the local versions and saved bodies are re-primed from them so the GM's
   * next edit is not immediately stale.
   *
   * Deliberately not routed through `absorb`. That function's whole job is
   * interpreting a `WriteResult` this client asked for, and a write it did not
   * ask for has no result to interpret.
   */
  const absorbExternal = useCallback((effect: Effect) => {
    // Neither touches a card. `attend` moves attention; `beats` changes the
    // running order, which belongs to the session rather than the composition
    // and is absorbed by the Prep rail.
    if (effect.kind === "attend" || effect.kind === "beats") return;

    if (effect.kind === "gone") {
      const going = new Set<string>(effect.cardIds);
      for (const cardId of effect.cardIds) {
        versions.current.delete(cardId);
        savedBodies.current.delete(cardId);
      }
      setCards((current) => current.filter((card) => !going.has(card.cardId)));
      return;
    }

    const arriving = effect.cards;
    if (arriving.length === 0) return;

    for (const card of arriving) {
      versions.current.set(card.cardId, {
        cardVersion: card.cardVersion,
        bodyVersion: card.bodyVersion
      });
      savedBodies.current.set(card.cardId, card.body);
    }

    setCards((current) => {
      const replaced = new Set<string>(arriving.map((card) => card.cardId));
      return [...current.filter((card) => !replaced.has(card.cardId)), ...arriving];
    });
  }, []);

  const dismissProblem = useCallback(() => {
    const problem = failures.current.values().next().value;
    setSyncState(problem ? { kind: "problem", message: problem.message } : { kind: "settled" });
  }, []);

  const persistHistoryEntry = useCallback(async (entry: PlacementHistory): Promise<PlacementHistory | null> => {
    const current = cardsRef.current;
    const targetById = new Map(entry.cards.map(card => [card.cardId, card]));
    const moves = current.flatMap(card => {
      const target = targetById.get(card.cardId);
      if (!target) return [];
      const tint = target.presentation?.tint ?? null;
      if (card.layout.x === target.layout.x && card.layout.y === target.layout.y && card.layout.width === target.layout.width && card.layout.height === target.layout.height && card.z === target.z && (card.presentation?.tint ?? null) === tint) return [];
      return [{ cardId: card.cardId as string, x: target.layout.x, y: target.layout.y, width: target.layout.width, height: target.layout.height, tint, z: target.z, observedCardVersion: versions.current.get(card.cardId)?.cardVersion ?? card.cardVersion }];
    });
    const result = await restoreCompositionAction({ compositionId, observedSpatialVersion: savedSpatial.current.version, moves, spatial: entry.spatial });
    if (result.state !== "ok") { absorb(result, () => undefined); return null; }
    savedSpatial.current = result.data.spatial;
    spatialRef.current = result.data.spatial;
    setSpatial(result.data.spatial);
    for (const card of result.data.cards) { remember(card.cardId, { cardVersion: card.cardVersion }); }
    return { cards: entry.cards, spatial: spatialRef.current };
  }, [absorb, compositionId, remember]);

  const undo = useCallback(async () => {
    if (historyBusy.current) return false;
    historyBusy.current = true;
    try {
    await queue.current;
    const previous = past.current[past.current.length - 1];
    if (!previous) return false;
    const current = { cards: cardsRef.current.map(snapshotPlacement), spatial: spatialRef.current };
    const persisted = await persistHistoryEntry(previous);
    if (!persisted) return false;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, current];
    restoreHistory(persisted);
    historyReady.current = true;
    return true;
    } finally { historyBusy.current = false; }
  }, [persistHistoryEntry, restoreHistory]);

  const redo = useCallback(async () => {
    if (historyBusy.current) return false;
    historyBusy.current = true;
    try {
    await queue.current;
    const next = future.current[future.current.length - 1];
    if (!next) return false;
    const current = { cards: cardsRef.current.map(snapshotPlacement), spatial: spatialRef.current };
    const persisted = await persistHistoryEntry(next);
    if (!persisted) return false;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, current];
    restoreHistory(persisted);
    historyReady.current = true;
    return true;
    } finally { historyBusy.current = false; }
  }, [persistHistoryEntry, restoreHistory]);

  const changeCollection = useCallback((command: CollectionCommand): Promise<boolean> => {
    let optimistic;
    try { optimistic = applyCollectionCommand(spatialRef.current, command, cardsRef.current); }
    catch { return Promise.resolve(false); }
    pushHistory();
    spatialRef.current = optimistic;
    setSpatial(optimistic);
    const key = ++collectionSequence.current;
    pendingCollections.current.push({ key, command });
    return new Promise(resolve => { void enqueue(async () => {
      try {
        // Revalidate after earlier queued operations (including card removal).
        applyCollectionCommand(savedSpatial.current, command, cardsRef.current);
        const result = await changeCollectionAction({ compositionId, observedVersion: savedSpatial.current.version, command });
        if (result.state === "ok") { savedSpatial.current = result.data; resolve(true); }
        else { absorb(result, () => {}); resolve(false); }
      } catch (error) { resolve(false); throw error; }
      finally {
        pendingCollections.current = pendingCollections.current.filter(item => item.key !== key);
        rebaseSpatial();
      }
    }); });
  }, [absorb, compositionId, enqueue, rebaseSpatial, pushHistory]);

  const commitCollectionMove = useCallback((ids: readonly CardId[], destinationId: string | null | undefined, before: readonly DeskCard[]): Promise<boolean> => new Promise(resolve => { void enqueue(async () => {
    historyReady.current = true;
    const moving = new Set(ids);
    const moves = cardsRef.current.filter(card => moving.has(card.cardId)).map(card => ({ cardId: card.cardId, x: Math.round(card.layout.x), y: Math.round(card.layout.y), observedCardVersion: versions.current.get(card.cardId)?.cardVersion ?? card.cardVersion }));
    const rollback = () => {
      setCards(current => current.map(card => {
        const sent = moves.find(move => move.cardId === card.cardId);
        const original = before.find(item => item.cardId === card.cardId);
        return sent && original && Math.abs(card.layout.x - sent.x) <= 1 && Math.abs(card.layout.y - sent.y) <= 1 ? { ...card, layout: original.layout, z: original.z } : card;
      }));
    };
    try {
      const result = await moveCollectionCardsAction({ compositionId, observedSpatialVersion: savedSpatial.current.version, preserveMembership: destinationId === undefined, destinationId: destinationId ?? null, moves });
      if (result.state === "ok") {
        savedSpatial.current = result.data.spatial;
        rebaseSpatial();
        for (const card of result.data.cards) { remember(card.cardId, { cardVersion: card.cardVersion }); patch(card.cardId, { cardVersion: card.cardVersion, z: card.z }); }
        resolve(true);
      } else { if (result.state !== "conflict") rollback(); absorb(result, () => {}); resolve(false); }
    } catch (error) { rollback(); resolve(false); throw error; }
  }); }), [absorb, compositionId, enqueue, patch, rebaseSpatial, remember]);

  const byId = useMemo(() => {
    const map = new Map<string, DeskCard>();
    for (const card of cards) map.set(card.cardId, card);
    return map;
  }, [cards]);

  return {
    compositionId,
    spatial,
    changeCollection,
    commitCollectionMove,
    cards,
    byId,
    sync,
    capture,
    setBody,
    saveBody,
    flushBody,
    nudge,
    cancelMove,
    resizeCard,
    setCardTint,
    arrangeCards,
    commitMove,
    remove,
    referenceInto,
    represent,
    editSheet,
    assert,
    setRelationshipVisible,
    settle,
    retract,
    pullIn,
    search,
    findObjects,
    inspectObject,
    absorbObjects,
    refreshObjects,
    absorbExternal,
    dismissProblem,
    retryFailed,
    undo,
    redo,
    canUndo: historyRevision >= 0 && past.current.length > 0,
    canRedo: historyRevision >= 0 && future.current.length > 0,
    canRetry: [...failures.current.values()].some(failure => Boolean(failure.retry))
  };
}

function snapshotPlacement(card: DeskCard): PlacementFrame {
  return { cardId: card.cardId, layout: card.layout, z: card.z, presentation: card.presentation };
}
