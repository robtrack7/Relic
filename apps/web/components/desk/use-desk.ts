"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  captureCardAction,
  editCardBodyAction,
  editRepresentationAction,
  moveCardsAction,
  referenceObjectsAction,
  removeCardsAction,
  removeClaimAction,
  representObjectAction,
  searchObjectsAction,
  setClaimAction,
  settleTruthAction,
  type ActionResult
} from "@/app/actions";
import {
  asCardId,
  asWorldObjectId,
  cardRef,
  DEFAULT_CARD_HEIGHT,
  DEFAULT_CARD_WIDTH,
  type CardId,
  type ClaimId,
  type CompositionId,
  type DeskCard,
  type DeskView,
  type FieldValues,
  type Layout,
  type Link,
  type Maturity,
  type ObjectRef,
  type RepresentationKind,
  type TruthState,
  type WorldObjectId
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
  const worldId = initial.worldId;
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
        // Relic declined, and said why. Shown as it was given: a refusal is a
        // statement about the world's rules, not a malfunction to apologise for.
        case "refused":
          setSync({ kind: "problem", message: result.reason });
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
          // Capture produces Pencil and nothing else. Even guessing otherwise
          // here would be wrong: this is the client's picture of a write it has
          // not made yet, and it may not depict established truth.
          maturity: "pencil",
          settled: null,
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
          width: card.layout.width,
          height: card.layout.height
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
      });
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
      });
    },
    [absorb, enqueue]
  );

  const editSheet = useCallback(
    (objectId: WorldObjectId, label: string, fields: FieldValues) => {
      const current = cardsRef.current.find((card) => card.objectId === objectId);
      const representation = current?.representation;
      if (!representation) return;

      enqueue(async () => {
        const result = await editRepresentationAction({
          representationId: representation.id,
          label,
          fields,
          observedVersion: representation.version
        });
        absorb(result, (updated) => {
          setCards((cards) =>
            cards.map((card) =>
              card.objectId === objectId ? { ...card, representation: updated } : card
            )
          );
        });
      });
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
    (objectId: WorldObjectId, claimKind: string, value: string, target?: ObjectRef | null) => {
      enqueue(async () => {
        const result = await setClaimAction({
          subjectId: objectId,
          claimId: crypto.randomUUID(),
          claimKind,
          value,
          objectValue: target?.objectId ?? null
        });
        absorb(result, (claim) => {
          setCards((cards) => {
            const subject = cards.find((card) => card.objectId === objectId);
            if (!subject) return cards;
            const subjectRef = cardRef(subject);

            // The edge this assertion replaces. Held onto so the far end can
            // forget it as well — an in-link nobody points at any more would
            // keep a card lit for a relationship that no longer exists.
            const replaced = subject.links.find(
              (link) => link.direction === "out" && link.claimKind === claimKind
            );

            const stale = (link: Link) =>
              link.direction === "in" &&
              link.claimKind === claimKind &&
              link.other.objectId === objectId;

            return cards.map((card) => {
              if (card.objectId === objectId) {
                return {
                  ...card,
                  // No story position, so this replaced the standing claim of
                  // this kind rather than adding to it. Mirror that here.
                  claims: [
                    ...card.claims.filter(
                      (c) => !(c.claimKind === claim.claimKind && c.story.order === null)
                    ),
                    claim
                  ],
                  links: [
                    ...card.links.filter(
                      (link) => !(link.direction === "out" && link.claimKind === claimKind)
                    ),
                    ...(target
                      ? [
                          {
                            claimId: claim.id,
                            claimKind,
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
      });
    },
    [absorb, enqueue]
  );

  /**
   * Brings an object that is elsewhere in the world onto this composition.
   *
   * Pulling a thread is literal: following a relationship to something not on
   * this Desk places it here rather than navigating away from what you were
   * looking at. It is a reference, so nothing is copied and nothing moves.
   */
  const pullIn = useCallback(
    async (ref: ObjectRef, near: Layout): Promise<CardId | null> => {
      const already = cardsRef.current.find((card) => card.objectId === ref.objectId);
      if (already) return already.cardId;

      const layout: Layout = {
        x: Math.round(near.x + near.width + 48),
        y: Math.round(near.y),
        width: DEFAULT_CARD_WIDTH,
        height: DEFAULT_CARD_HEIGHT
      };

      // Resolved rather than returned early: the caller usually wants to deepen
      // into what it just pulled, and Focus is keyed on a card that has to
      // exist first.
      const landed: { cardId: CardId | null } = { cardId: null };

      await enqueue(async () => {
        const result = await referenceObjectsAction({
          compositionId,
          placements: [
            {
              cardId: crypto.randomUUID(),
              objectId: ref.objectId,
              x: layout.x,
              y: layout.y,
              width: layout.width,
              height: layout.height
            }
          ]
        });
        absorb(result, (placed) => {
          // The server resolves the object's whole state — its representation,
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
          landed.cardId = placed[0]?.cardId ?? null;
        });
      });

      return landed.cardId;
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
        claims?: readonly { claimId: ClaimId; truth: TruthState }[];
      }
    ) => {
      enqueue(async () => {
        const subject = cardsRef.current.find((card) => card.objectId === objectId);
        if (!subject) return;

        const claims = (intent.claims ?? []).flatMap((wanted) => {
          const known = subject.claims.find((claim) => claim.id === wanted.claimId);
          return known
            ? [{ ...wanted, claimId: wanted.claimId as string, observedVersion: known.version }]
            : [];
        });

        if (claims.length === 0 && (intent.maturity ?? null) === null) return;

        const result = await settleTruthAction({
          objectId,
          maturity: intent.maturity ?? null,
          claims
        });

        absorb(result, (settled) => {
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
      });
    },
    [absorb, enqueue]
  );

  const retract = useCallback(
    (objectId: WorldObjectId, claimId: ClaimId) => {
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
      enqueue(async () => {
        const result = await removeClaimAction({ claimId });
        absorb(result, () => {});
      });
    },
    [absorb, enqueue]
  );

  /**
   * Objects of this world that could stand at the other end of a relationship.
   *
   * Reaches past this composition on purpose: a relationship is a fact about
   * the world, and only being able to point at what is already on the Desk
   * would make the Desk the world.
   */
  const findObjects = useCallback(
    async (query: string, excludeId?: WorldObjectId): Promise<readonly ObjectRef[]> => {
      const result = await searchObjectsAction({ worldId, query, excludeId });
      return result.state === "ok" ? result.data : [];
    },
    [worldId]
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
    referenceInto,
    represent,
    editSheet,
    assert,
    settle,
    retract,
    pullIn,
    findObjects,
    dismissProblem
  };
}
