import { randomUUID } from "node:crypto";

import { beside, clusterAt, DEFAULT_SIZE, middleOf } from "@/lib/desk/arrange";
import type { Point, Rect } from "@/lib/desk/viewport";
import {
  asBeatId,
  asCardId,
  asClaimId,
  asRepresentationId,
  asWorldObjectId,
  cardRef,
  cardTitle,
  type CardId,
  type CompositionId,
  type DeskCard,
  type DeskView,
  type ObjectRef,
  type RepresentationKind,
  type Session,
  type WorldObjectId
} from "@/lib/world/model";
import type { DeskRepository } from "@/lib/world/repository";
import { REPRESENTATION_KINDS } from "@/lib/world/templates";

import type { Catalogue } from "./context";
import type { LibrarianTool, ToolOutcome } from "./model";

/**
 * The Librarian's hands.
 *
 * Everything here changes something. The read that answers questions lives in
 * `context.ts`; the split is deliberate, so that "what can the Librarian
 * actually do to my world" is answered by one file rather than by reading a
 * union of schemas.
 *
 * Three properties hold across every tool below, and they are the whole design:
 *
 * **Nothing is addressed by identifier.** Every subject is a citation number,
 * resolved through the turn's catalogue. Out of range writes nothing and tells
 * the model why. The model has no vocabulary for an object Relic did not put in
 * front of it, so "only act on what you were shown" is not a rule it is asked to
 * keep — it is the shape of the input.
 *
 * **Nothing is addressed by coordinate.** The model says *together* or *beside*;
 * `lib/desk/arrange` says where. `BUILD.md` settled this before the tool surface
 * existed, and it is why a Librarian cannot put a card three screens away.
 *
 * **Nothing reaches Ink.** Every write here goes through a repository method
 * that produces Pencil and cannot do otherwise, and `settleTruth` is not
 * exposed at all. The Soul states the law so the Librarian can explain the
 * boundary it works inside; the boundary itself is that the capability is absent.
 */

/** Everything a tool needs to reach the world, assembled once per turn. */
export type Hands = Readonly<{
  repository: DeskRepository;
  compositionId: CompositionId;
  catalogue: Catalogue;
  /** Where the GM is looking. New material lands here. */
  here: Point | null;
  /**
   * The session this composition prepares for, when it prepares for one.
   *
   * Null on the Desk and on every Board, and the planning tool is then simply
   * absent — the same argument that keeps `settleTruth` out of this file. A
   * capability the Librarian does not have is a stronger boundary than one it
   * is asked not to use, and a tool that would have to answer "there is no
   * session here" is a tool that should not have been offered.
   */
  session: Session | null;
}>;

export function handTools(hands: Hands): readonly LibrarianTool[] {
  return [
    placeTool(hands),
    arrangeTool(hands),
    clearTool(hands),
    attendTool(hands),
    captureTool(hands),
    deepenTool(hands),
    assertTool(hands),
    rewriteTool(hands),
    ...(hands.session ? [planTool(hands, hands.session)] : [])
  ];
}

// Resolving --------------------------------------------------------------

const told = (text: string): ToolOutcome => ({ told: text });

/** The numbers in a tool argument, however sloppily the model expressed them. */
function numbers(value: unknown): readonly number[] {
  if (Array.isArray(value)) return value.filter((n): n is number => typeof n === "number");
  if (typeof value === "number") return [value];
  return [];
}

/**
 * Turn cited numbers into objects, keeping the ones that resolved and naming the
 * ones that did not.
 *
 * Partial resolution is reported rather than silently dropped. A model that
 * cited `[9]` when the catalogue holds eight things has made a mistake it can
 * correct, and the correction is only possible if it is told.
 */
function subjects(
  hands: Hands,
  value: unknown
): { refs: readonly ObjectRef[]; unknown: readonly number[] } {
  const refs: ObjectRef[] = [];
  const missed: number[] = [];
  for (const n of numbers(value)) {
    const ref = hands.catalogue.resolve(n);
    if (ref) refs.push(ref);
    else missed.push(n);
  }
  return { refs, unknown: missed };
}

const outOfRange = (missed: readonly number[]): string =>
  `${missed.map((n) => `[${n}]`).join(", ")} ${
    missed.length === 1 ? "is not something" : "are not things"
  } you were shown. Only act on numbers from the grounding or from a search.`;

/** The cards currently on the composition, re-read so earlier tools are visible. */
async function look(hands: Hands): Promise<DeskView | null> {
  return await hands.repository.openComposition(hands.compositionId);
}

const layoutsOf = (view: DeskView, except: ReadonlySet<string> = new Set()): readonly Rect[] =>
  view.cards.filter((card) => !except.has(card.cardId)).map((card) => card.layout);

/** Where new material should land: the GM's view, or failing that the middle of the work. */
function landing(hands: Hands, view: DeskView): Point {
  if (hands.here) return hands.here;
  if (view.cards.length === 0) return { x: 0, y: 0 };
  return middleOf(view.cards.map((card) => card.layout));
}

/** The card an object has on this composition, if it has one. */
const cardFor = (view: DeskView, objectId: string): DeskCard | null =>
  view.cards.find((card) => card.objectId === objectId) ?? null;

const names = (refs: readonly ObjectRef[]): string =>
  refs.map((ref) => ref.label || "something unnamed").join(", ");

// Composing --------------------------------------------------------------

/**
 * Bring cited objects onto the composition the GM is looking at.
 *
 * `referenceObjects`, which is the same method the Library and following a
 * relationship both use — so this is a reference and never a copy, it is
 * idempotent, and it restores something archived rather than skipping it. The
 * Librarian gets exactly the retrieval the GM has, which is the same argument
 * that put its search behind `searchWorld`.
 */
function placeTool(hands: Hands): LibrarianTool {
  return {
    name: "place",
    writes: true,
    description:
      "Bring things onto the composition the GM is looking at, so they can be seen and worked with. References them — nothing is copied, and anything already here is left where it is. Use it when the GM asks to see something, or when what you are about to say is easier to follow with the thing in front of them.",
    schema: {
      type: "object",
      properties: {
        subjects: {
          type: "array",
          items: { type: "integer" },
          description: "Citation numbers of the things to bring here."
        }
      },
      required: ["subjects"],
      additionalProperties: false
    },
    note: (input) => {
      const { refs } = subjects(hands, input.subjects);
      return refs.length > 0 ? `Bringing ${names(refs)} here` : "Bringing something here";
    },
    run: async (input) => {
      const { refs, unknown } = subjects(hands, input.subjects);
      if (unknown.length > 0) return told(outOfRange(unknown));
      if (refs.length === 0) return told("Name at least one thing to bring here.");

      const view = await look(hands);
      if (!view) return told("That composition is no longer there.");

      const already = refs.filter((ref) => cardFor(view, ref.objectId));
      const wanted = refs.filter((ref) => !cardFor(view, ref.objectId));
      if (wanted.length === 0) {
        return told(`${names(already)} ${already.length === 1 ? "is" : "are"} already here.`);
      }

      const spots = clusterAt(wanted.length, landing(hands, view), layoutsOf(view));
      const result = await hands.repository.referenceObjects({
        compositionId: hands.compositionId,
        placements: wanted.map((ref, i) => ({
          cardId: asCardId(randomUUID()),
          objectId: ref.objectId,
          layout: spots[i] ?? { x: 0, y: 0, ...DEFAULT_SIZE }
        }))
      });

      if (result.state !== "ok") return told(refusal(result.state, "bring that here"));

      return {
        told: `Brought ${names(wanted)} onto ${here(view)}.`,
        effect: { kind: "cards", cards: result.data }
      };
    }
  };
}

/**
 * Move cards into a shape that means something.
 *
 * The two arrangements are the two the GM actually asks for: put these together,
 * and put this next to that. Both are semantic — the model names the
 * relationship it wants the layout to express, and `arrange.ts` computes it.
 */
function arrangeTool(hands: Hands): LibrarianTool {
  return {
    name: "arrange",
    writes: true,
    description:
      "Move things on this composition into a group, or beside another thing. Changes only where cards sit — never what anything is or what is true about it. Use it when the GM asks you to gather, group, tidy, or put things next to each other.",
    schema: {
      type: "object",
      properties: {
        subjects: {
          type: "array",
          items: { type: "integer" },
          description: "Citation numbers of the things to move. They must already be here."
        },
        beside: {
          type: "integer",
          description:
            "Optional. A citation number to arrange the subjects next to. Omit to gather them into a group of their own."
        }
      },
      required: ["subjects"],
      additionalProperties: false
    },
    note: (input) => {
      const { refs } = subjects(hands, input.subjects);
      return refs.length > 0 ? `Arranging ${names(refs)}` : "Arranging the Desk";
    },
    run: async (input) => {
      const { refs, unknown } = subjects(hands, input.subjects);
      if (unknown.length > 0) return told(outOfRange(unknown));
      if (refs.length === 0) return told("Name at least one thing to move.");

      const view = await look(hands);
      if (!view) return told("That composition is no longer there.");

      const moving = refs.map((ref) => cardFor(view, ref.objectId)).filter((c): c is DeskCard => c !== null);
      const absent = refs.filter((ref) => !cardFor(view, ref.objectId));
      if (moving.length === 0) {
        return told(
          `${names(absent)} ${absent.length === 1 ? "is" : "are"} not on this composition. Place ${
            absent.length === 1 ? "it" : "them"
          } first.`
        );
      }

      // A card cannot be an obstacle to itself: the things being moved are
      // excluded from what counts as occupied, or the second pass of a tidy
      // would step around where the first pass had just put them.
      const held = new Set<string>(moving.map((card) => card.cardId));
      const obstacles = layoutsOf(view, held);

      let spots: readonly Rect[];
      let where: string;

      const anchorRef = input.beside === undefined ? null : hands.catalogue.resolve(input.beside);
      if (input.beside !== undefined && !anchorRef) {
        return told(outOfRange([input.beside as number]));
      }

      if (anchorRef) {
        const anchor = cardFor(view, anchorRef.objectId);
        if (!anchor) {
          return told(`${anchorRef.label} is not on this composition to arrange beside.`);
        }
        // Each one steps past the last, so a group placed beside something
        // stacks down the side rather than landing on one square.
        const taken = [...obstacles, anchor.layout];
        const chosen: Rect[] = [];
        for (let i = 0; i < moving.length; i += 1) {
          const spot = beside(anchor.layout, [...taken, ...chosen]);
          chosen.push(spot);
        }
        spots = chosen;
        where = `beside ${anchorRef.label}`;
      } else {
        spots = clusterAt(moving.length, middleOf(moving.map((c) => c.layout)), obstacles);
        where = "together";
      }

      const result = await hands.repository.moveCards({
        compositionId: hands.compositionId,
        bringToFront: true,
        moves: moving.map((card, i) => ({
          cardId: card.cardId,
          x: spots[i]?.x ?? card.layout.x,
          y: spots[i]?.y ?? card.layout.y,
          observedCardVersion: card.cardVersion
        }))
      });

      if (result.state !== "ok") return told(refusal(result.state, "move those"));

      return {
        told: `Put ${names(moving.map(cardRef))} ${where}.`,
        effect: { kind: "cards", cards: result.data }
      };
    }
  };
}

/**
 * Take cards off the composition.
 *
 * Archival, never destruction: `removeCards` archives an object only when it
 * loses its last reference anywhere, and the Library is the way back. That is
 * what makes this a compose-tier act rather than a destructive one — "tidy this
 * board" is a real request, and refusing it would leave the Librarian able to
 * make a mess it could not clean up.
 */
function clearTool(hands: Hands): LibrarianTool {
  return {
    name: "clear",
    writes: true,
    description:
      "Take things off the composition the GM is looking at. They are not destroyed — they stay in the world and the Library finds them again. Use it when the GM asks you to clear, tidy away, or remove things from what is in front of them.",
    schema: {
      type: "object",
      properties: {
        subjects: {
          type: "array",
          items: { type: "integer" },
          description: "Citation numbers of the things to take off this composition."
        }
      },
      required: ["subjects"],
      additionalProperties: false
    },
    note: (input) => {
      const { refs } = subjects(hands, input.subjects);
      return refs.length > 0 ? `Clearing ${names(refs)}` : "Clearing the Desk";
    },
    run: async (input) => {
      const { refs, unknown } = subjects(hands, input.subjects);
      if (unknown.length > 0) return told(outOfRange(unknown));
      if (refs.length === 0) return told("Name at least one thing to take off.");

      const view = await look(hands);
      if (!view) return told("That composition is no longer there.");

      const going = refs.map((ref) => cardFor(view, ref.objectId)).filter((c): c is DeskCard => c !== null);
      if (going.length === 0) return told("None of those are on this composition.");

      const result = await hands.repository.removeCards({
        compositionId: hands.compositionId,
        cardIds: going.map((card) => card.cardId)
      });

      if (result.state !== "ok") return told(refusal(result.state, "take those off"));

      return {
        told: `Took ${names(going.map(cardRef))} off ${here(view)}. Still in the world; the Library finds them.`,
        effect: { kind: "gone", cardIds: result.data }
      };
    }
  };
}

/**
 * Point at something — the one hand that touches nothing.
 *
 * It moves the GM's attention rather than their world, which is why it writes
 * nothing and reuses the arrival the Library and the relationship picker already
 * go through. Selecting, focusing, and revealing are one gesture in Relic, and
 * a second one here would drift from it.
 */
function attendTool(hands: Hands): LibrarianTool {
  return {
    name: "attend",
    writes: true,
    description:
      "Draw the GM's attention to things already on this composition — select them, and open the single one if there is only one. Changes nothing about the world. Use it when what you are saying is about a particular thing and the GM should be looking at it.",
    schema: {
      type: "object",
      properties: {
        subjects: {
          type: "array",
          items: { type: "integer" },
          description: "Citation numbers of what the GM should be looking at."
        }
      },
      required: ["subjects"],
      additionalProperties: false
    },
    note: (input) => {
      const { refs } = subjects(hands, input.subjects);
      return refs.length > 0 ? `Pointing at ${names(refs)}` : "Pointing something out";
    },
    run: async (input) => {
      const { refs, unknown } = subjects(hands, input.subjects);
      if (unknown.length > 0) return told(outOfRange(unknown));
      if (refs.length === 0) return told("Name at least one thing to point at.");

      const view = await look(hands);
      if (!view) return told("That composition is no longer there.");

      const found = refs.map((ref) => cardFor(view, ref.objectId)).filter((c): c is DeskCard => c !== null);
      if (found.length === 0) {
        return told("None of those are on this composition. Place them first.");
      }

      return {
        told: `The GM is now looking at ${names(found.map(cardRef))}.`,
        effect: { kind: "attend", cardIds: found.map((card) => card.cardId) }
      };
    }
  };
}

// Making Pencil ----------------------------------------------------------

/**
 * Write something new into the world.
 *
 * Capture and deepening happen together because "make me a note about the
 * harbourmaster" is one intent, and making the model spend three calls on it
 * would put latency where the GM feels it. If the representation fails, what
 * survives is a Fragment — which is not a broken state but the ordinary state of
 * a captured thought, and exactly what a GM typing the same note would get.
 *
 * Whatever it makes is Pencil and carries the Librarian's name, and neither is
 * negotiable from here: `captureCard` writes no settling author, so the database
 * refuses Ink on this path whatever anyone asks for.
 */
function captureTool(hands: Hands): LibrarianTool {
  return {
    name: "capture",
    writes: true,
    description:
      "Write something new into the world and put it on the composition the GM is looking at. Always unsettled — Pencil — and recorded as yours. Use it when the GM asks you to make, note, draft, or invent something. Give it a kind only when you are confident what it is; a plain note is a real and ordinary thing to leave.",
    schema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The prose. What this thing is, in the GM's own register."
        },
        name: {
          type: "string",
          description: "Optional. What it is called."
        },
        kind: {
          type: "string",
          enum: [...REPRESENTATION_KINDS],
          description: "Optional. What sort of thing it is, if you are confident."
        }
      },
      required: ["text"],
      additionalProperties: false
    },
    note: (input) => {
      const name = typeof input.name === "string" ? input.name.trim() : "";
      return name ? `Writing ${name}` : "Writing something new";
    },
    run: async (input) => {
      const text = typeof input.text === "string" ? input.text.trim() : "";
      if (!text) return told("Nothing to write. Give it some prose.");

      const name = typeof input.name === "string" ? input.name.trim() : "";
      const kind = asKind(input.kind);
      if (input.kind !== undefined && !kind) {
        return told(`“${String(input.kind)}” is not a kind of thing in Relic.`);
      }

      const view = await look(hands);
      if (!view) return told("That composition is no longer there.");

      const [spot] = clusterAt(1, landing(hands, view), layoutsOf(view));
      const objectId = asWorldObjectId(randomUUID());

      const captured = await hands.repository.captureCard({
        compositionId: hands.compositionId,
        cardId: asCardId(randomUUID()),
        objectId,
        body: text,
        layout: spot ?? { x: 0, y: 0, ...DEFAULT_SIZE },
        author: "librarian"
      });
      if (captured.state !== "ok") return told(refusal(captured.state, "write that"));

      let card = captured.data;
      if (kind) {
        const deepened = await hands.repository.representObject({
          objectId,
          representationId: asRepresentationId(randomUUID()),
          kind,
          label: name || null
        });
        // A failure here leaves a Fragment, which is a real thing and not a
        // broken one. Say so rather than reporting the capture as failed.
        if (deepened.state === "ok") {
          const after = await look(hands);
          card = (after && cardFor(after, objectId)) ?? card;
        }
      }

      const n = hands.catalogue.cite(cardRef(card));
      return {
        told: `Written and placed as [${n}] ${cardTitle(card) || "an unnamed note"}${
          kind ? ` — ${kind}` : ""
        }, Pencil, recorded as yours. Cite it as [${n}].`,
        effect: { kind: "cards", cards: [card] }
      };
    }
  };
}

/**
 * Say what an existing thing is.
 *
 * The identity invariant at its most load-bearing, reached by a model: the
 * object keeps the id it was captured with, the prose survives underneath, and
 * every composition already referencing it shows a Character without anything
 * being recreated. `representObject` is idempotent, so asking twice is not an
 * error and does not need guarding here.
 */
function deepenTool(hands: Hands): LibrarianTool {
  return {
    name: "deepen",
    writes: true,
    description:
      "Say what an existing thing is — a character, a place, a faction. Keeps its identity and everything already written about it; it becomes a way of seeing the same thing, never a new thing. Use it when a note has clearly become a person or a place and the GM wants it treated as one.",
    schema: {
      type: "object",
      properties: {
        subject: { type: "integer", description: "Citation number of the thing." },
        kind: {
          type: "string",
          enum: [...REPRESENTATION_KINDS],
          description: "What sort of thing it is."
        },
        name: { type: "string", description: "Optional. What it is called." }
      },
      required: ["subject", "kind"],
      additionalProperties: false
    },
    note: (input) => {
      const ref = hands.catalogue.resolve(input.subject);
      return ref ? `Making ${ref.label} a ${String(input.kind)}` : "Deepening something";
    },
    run: async (input) => {
      const ref = hands.catalogue.resolve(input.subject);
      if (!ref) return told(outOfRange([input.subject as number]));

      const kind = asKind(input.kind);
      if (!kind) return told(`“${String(input.kind)}” is not a kind of thing in Relic.`);

      const name = typeof input.name === "string" ? input.name.trim() : "";
      const result = await hands.repository.representObject({
        objectId: ref.objectId,
        representationId: asRepresentationId(randomUUID()),
        kind,
        label: name || ref.label || null
      });
      if (result.state !== "ok") return told(refusal(result.state, "deepen that"));

      const after = await look(hands);
      const card = after && cardFor(after, ref.objectId);

      return {
        told: `${ref.label} is now a ${kind}. Same identity, same writing.`,
        ...(card ? { effect: { kind: "cards" as const, cards: [card] } } : {})
      };
    }
  };
}

/**
 * Assert something about a thing.
 *
 * The Librarian's most consequential hand, and the one the truth system was
 * built to make safe. What comes out is Pencil with `librarian` provenance —
 * "inferred by the Librarian" — which is a claim the GM can read, dispute,
 * retract, or establish. It is never Ink, and not because the tool declines:
 * `setClaim` writes no settling author, and the database refuses the row.
 *
 * `about` makes it a relationship, and is a citation number for the same reason
 * everything else here is.
 */
function assertTool(hands: Hands): LibrarianTool {
  return {
    name: "assert",
    writes: true,
    description:
      "Record something about a thing — an occupation, an allegiance, a location, a status. Recorded as Pencil and attributed to you, so the GM can see it was your reading and can dispute or establish it themselves. You may never establish it as Ink. Setting an attribute that already has a value replaces it.",
    schema: {
      type: "object",
      properties: {
        subject: { type: "integer", description: "Citation number of what this is about." },
        attribute: {
          type: "string",
          description: "What is being said: occupation, allegiance, location, status."
        },
        value: { type: "string", description: "What it is, in words." },
        about: {
          type: "integer",
          description:
            "Optional. A citation number, when the value is another thing in the world — this makes it a relationship the GM can follow from either end."
        }
      },
      required: ["subject", "attribute", "value"],
      additionalProperties: false
    },
    note: (input) => {
      const ref = hands.catalogue.resolve(input.subject);
      const attribute = typeof input.attribute === "string" ? input.attribute : "something";
      return ref ? `Noting ${ref.label}’s ${attribute}` : "Noting something";
    },
    run: async (input) => {
      const ref = hands.catalogue.resolve(input.subject);
      if (!ref) return told(outOfRange([input.subject as number]));

      const attribute = typeof input.attribute === "string" ? input.attribute.trim() : "";
      const value = typeof input.value === "string" ? input.value.trim() : "";
      if (!attribute) return told("Say what is being asserted.");
      if (!value) return told("Say what it is.");

      let other: WorldObjectId | null = null;
      if (input.about !== undefined) {
        const far = hands.catalogue.resolve(input.about);
        if (!far) return told(outOfRange([input.about as number]));
        if (far.objectId === ref.objectId) {
          return told("Nothing is its own allegiance. A thing cannot be related to itself.");
        }
        other = far.objectId;
      }

      const result = await hands.repository.setClaim({
        subjectId: ref.objectId,
        claimId: asClaimId(randomUUID()),
        claimKind: attribute,
        value,
        objectValue: other,
        author: "librarian"
      });
      if (result.state !== "ok") return told(refusal(result.state, "record that"));

      const after = await look(hands);
      // Both ends of a relationship change, so both are sent back. A card
      // showing only one side of an edge would be showing a half-truth.
      const touched = after
        ? after.cards.filter(
            (card) => card.objectId === ref.objectId || (other !== null && card.objectId === other)
          )
        : [];

      return {
        told: `Recorded: ${ref.label}, ${attribute} — ${value}. Pencil, attributed to you.`,
        ...(touched.length > 0 ? { effect: { kind: "cards" as const, cards: touched } } : {})
      };
    }
  };
}

/**
 * Replace what a thing says.
 *
 * The only hand here that destroys rather than adds or archives, which is why
 * it is the only one carrying its own reversal: the write records who rewrote
 * it, when, and the text it replaced, and the entity surface offers to put it
 * back. Relic has no undo, so this act does not get to rely on one.
 */
function rewriteTool(hands: Hands): LibrarianTool {
  return {
    name: "rewrite",
    writes: true,
    description:
      "Replace the prose of something. The GM is shown that you rewrote it and can restore what was there, so do this when asked to rewrite, tighten, expand, or correct — not to record a new fact, which is what assert is for.",
    schema: {
      type: "object",
      properties: {
        subject: { type: "integer", description: "Citation number of the thing to rewrite." },
        text: { type: "string", description: "What it should say now, in full." }
      },
      required: ["subject", "text"],
      additionalProperties: false
    },
    note: (input) => {
      const ref = hands.catalogue.resolve(input.subject);
      return ref ? `Rewriting ${ref.label}` : "Rewriting something";
    },
    run: async (input) => {
      const ref = hands.catalogue.resolve(input.subject);
      if (!ref) return told(outOfRange([input.subject as number]));

      const text = typeof input.text === "string" ? input.text.trim() : "";
      if (!text) return told("Rewriting to nothing would delete the writing. Say what it should say.");

      const view = await look(hands);
      if (!view) return told("That composition is no longer there.");

      const card = cardFor(view, ref.objectId);
      if (!card) {
        return told(`${ref.label} is not on this composition. Place it first.`);
      }

      const result = await hands.repository.editCardBody({
        compositionId: hands.compositionId,
        cardId: card.cardId,
        body: text,
        observedBodyVersion: card.bodyVersion,
        author: "librarian"
      });
      if (result.state !== "ok") return told(refusal(result.state, "rewrite that"));

      return {
        told: `Rewritten: ${ref.label}. The GM can see it was you, and can restore what was there.`,
        effect: { kind: "cards", cards: [result.data] }
      };
    }
  };
}

// Planning ---------------------------------------------------------------

/**
 * Add a beat to tonight's running order.
 *
 * Offered only on a Prep, and only ever *additive*. The Librarian may propose
 * what could happen; reordering the evening and taking something out of it are
 * the GM's judgment about their own table, and neither is reachable from here.
 * That asymmetry is the same one everywhere else in this file — the Librarian
 * writes freely and destroys nothing.
 *
 * A beat is an intention. It reaches no truth system at all: `session_beats`
 * has no truth column and no route into `claims`, so this cannot assert that
 * anything is so about the world, only that tonight is meant to involve it.
 * Turning a beat into something the world records is Review's act, after the
 * session, taken by the GM.
 */
function planTool(hands: Hands, session: Session): LibrarianTool {
  return {
    name: "plan",
    writes: true,
    description:
      "Add something to the running order for the session being prepared. A beat is an intention — what you mean to happen tonight — never a record that it did, and never a claim about the world. Attach the things it involves so the GM can reach them from it. Use it when the GM asks you to plan, prepare, or work out what happens. You can only add; the order and what stays in it are the GM's.",
    schema: {
      type: "object",
      properties: {
        beat: {
          type: "string",
          description: "What happens, in one or two sentences, in the GM's register."
        },
        about: {
          type: "array",
          items: { type: "integer" },
          description:
            "Optional. Citation numbers of the people, places, and things this beat involves."
        }
      },
      required: ["beat"],
      additionalProperties: false
    },
    note: () => `Planning a beat for ${session.title}`,
    run: async (input) => {
      const body = typeof input.beat === "string" ? input.beat.trim() : "";
      if (!body) return told("Say what happens.");

      const { refs, unknown } = subjects(hands, input.about);
      if (unknown.length > 0) return told(outOfRange(unknown));

      const result = await hands.repository.setBeat({
        sessionId: session.id,
        beatId: asBeatId(randomUUID()),
        body,
        refs: refs.map((ref) => ref.objectId),
        author: "librarian"
      });
      if (result.state !== "ok") return told(refusal(result.state, "plan that"));

      return {
        told: `Added to ${session.title}: “${body}”${
          refs.length > 0 ? ` — about ${names(refs)}` : ""
        }. Marked as yours, and the GM can reorder or remove it.`,
        effect: { kind: "beats", beats: [result.data] }
      };
    }
  };
}

// Saying no --------------------------------------------------------------

/**
 * A refusal in words the model can act on.
 *
 * `refused` is not a failure and must not read as one — it is Relic declining
 * something well-formed, and the model should be able to say what happened
 * rather than trying again identically.
 */
function refusal(state: "missing" | "refused" | "conflict", attempt: string): string {
  if (state === "missing") return `Could not ${attempt} — something it named is gone.`;
  if (state === "conflict") {
    return `Could not ${attempt} — the GM changed it while you were working. Look again before retrying.`;
  }
  return `Relic declined to ${attempt}.`;
}

const asKind = (value: unknown): RepresentationKind | null =>
  typeof value === "string" && (REPRESENTATION_KINDS as readonly string[]).includes(value)
    ? (value as RepresentationKind)
    : null;

const here = (view: DeskView): string =>
  view.name ?? (view.kind === "desk" ? "the Desk" : "this composition");

export type { CardId };
