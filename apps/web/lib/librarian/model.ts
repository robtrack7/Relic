import type { CompositionId, ObjectRef, WorldId } from "@/lib/world/model";

/**
 * The Librarian: what it is told, what it says back, and what it may do.
 *
 * `AI.md` describes a working context assembled from a stable Soul, world
 * grounding, the current authorized view, recent conversation, retrieved facts,
 * and the task. That list is the shape of this file — `Turn` is that context
 * with a name, and everything else here exists to build one or read one.
 *
 * The model is deliberately absent from these types. A provider is a replaceable
 * worker behind a stable product intelligence, so the Soul, the grounding, and
 * the citation contract belong to Relic and live here; only `LibrarianProvider`
 * knows there is a model at all.
 */

declare const brand: unique symbol;
type Branded<T extends string> = string & { readonly [brand]: T };

export type LibrarianMessageId = Branded<"librarian-message">;
export const asLibrarianMessageId = (v: string) => v as LibrarianMessageId;

export type Speaker = "gm" | "librarian";

/**
 * One World Object an answer pointed at.
 *
 * `n` is the number the answer cites it by, and the reference is what Relic
 * follows. The label is kept because a conversation must stay readable if the
 * thing is later archived — but what a source *displays* is resolved from the
 * world, so renaming the Harbour Guild renames it in every answer that ever
 * cited it. The same rule relationships already follow, for the same reason.
 */
export type Source = Readonly<{
  n: number;
  ref: ObjectRef;
}>;

export type LibrarianMessage = Readonly<{
  id: LibrarianMessageId;
  speaker: Speaker;
  body: string;
  sources: readonly Source[];
  /** Where the GM was standing when this was said. Null once that view is gone. */
  compositionId: CompositionId | null;
  saidAt: string;
}>;

/**
 * Where the GM is, expressed only as identifiers.
 *
 * The client sends this and nothing else. Every word of world content in the
 * prompt is re-read on the server from these ids, which is the seam that
 * becomes tenancy enforcement the day Relic grows accounts — and, before then,
 * the reason nothing that can write to the page can write to the Librarian's
 * context. A browser that lies here can only lie about *which* composition it
 * is looking at, never about what is on one.
 */
export type Vantage = Readonly<{
  compositionId: CompositionId;
  /** The card the entity surface is open on, if any. */
  focusCardId: string | null;
  selectedCardIds: readonly string[];
}>;

export type Turn = Readonly<{
  worldId: WorldId;
  soul: string;
  /**
   * The assembled grounding: world, current composition, selection, and focus,
   * with every object it names numbered for citation.
   *
   * Numbering rather than identifiers is not decoration — it is what makes
   * citation checkable. A model asked to quote a uuid will eventually invent one
   * that resolves to nothing; a model asked for `[3]` can only be right or out
   * of range, and out of range is something Relic can see and drop.
   */
  brief: string;
  /** Recent conversation, oldest first. Read from the world, never from the client. */
  history: readonly LibrarianMessage[];
  ask: string;
}>;

/**
 * What a provider streams back.
 *
 * `consulting` exists because a Librarian that goes quiet for four seconds while
 * it searches reads as broken. It says what is being looked up, not that
 * something is happening.
 */
export type LibrarianEvent =
  | Readonly<{ type: "text"; text: string }>
  | Readonly<{ type: "consulting"; note: string }>
  | Readonly<{ type: "done"; body: string }>
  | Readonly<{ type: "failed"; message: string }>;

/**
 * A capability offered to the Librarian for one turn.
 *
 * Typed and semantic, never a UI instruction: the model supplies meaning and
 * Relic's own code resolves ids, checks scope, and performs the work. At this
 * step every tool is a **read** — the Librarian may look things up and must not
 * yet change anything, which is the authority tier that needs no confirmation
 * and no undo.
 */
export type LibrarianTool = Readonly<{
  name: string;
  description: string;
  schema: Record<string, unknown>;
  /** A short human line for the `consulting` event, from the model's own input. */
  note: (input: Record<string, unknown>) => string;
  run: (input: Record<string, unknown>) => Promise<string>;
}>;

/**
 * The port every Librarian turn goes through.
 *
 * Same shape of decision as `DeskRepository`: the app above this line knows only
 * that something can hold a conversation, and `AI.md` asks for exactly that —
 * identity, world grounding, truth rules, and action authority belong to Relic,
 * and models are workers behind them.
 */
export interface LibrarianProvider {
  /** Whether this provider can actually run. False when unconfigured. */
  readonly ready: boolean;
  converse(turn: Turn, tools: readonly LibrarianTool[]): AsyncIterable<LibrarianEvent>;
}

/**
 * The Soul: identity, voice, and the laws that are not the model's to revise.
 *
 * Deliberately small and deliberately first in the prompt. Two properties follow
 * from that position — it is the stable prefix a cache can be built on, and it
 * is the part no amount of world content or conversation can push out.
 *
 * The truth laws here restate `WORLD-MODEL.md` rather than inventing anything,
 * because the Librarian must not be the one place in Relic where Ink means
 * something slightly different.
 */
export const SOUL = `You are the Librarian: the intelligence that lives inside Relic, a workspace
where a game master builds and runs a fictional world.

You are a researcher, a continuity keeper, and a collaborator. You are perceptive,
curious, restrained, and comfortable with uncertainty. You may be wry. You are
never falsely confident: charm comes from attention and judgment, and personality
must never blur how certain something actually is.

## What is true, and how you talk about it

Relic separates two things and you must keep them separate.

- **Maturity** belongs to a thing. Pencil means unsettled; Ink means the GM has
  deliberately settled it. It says how finished something is.
- **Truth** belongs to an assertion. Ink, Pencil, or disputed. It says whether
  Relic believes the assertion.

Neither implies the other. A Pencil character may hold an established claim about
their occupation; an Ink character may hold a disputed one about where they were.
Never describe one as the other.

**You may never establish Ink.** Settling truth is a deliberate act of the GM's,
taken through Relic's own controls. You may notice that something looks settled
and say so. You may not decide it. Anything you contribute to the world is Pencil.

Say plainly when something is inferred rather than recorded, when evidence is
thin, and when you do not know. "Nothing in this world says" is a good answer.
Do not fill a gap with something plausible.

## Sources

The grounding below numbers the things you can see. Cite them inline as [1], [3]
— the number alone, in square brackets, next to the statement it supports. Cite
only numbers you were given. Never invent a number, and never write out an
identifier. If nothing in the grounding supports what you are saying, say so
instead of citing.

## How you answer

Answer in the shortest form that is actually useful, and lead with it. This is a
conversation beside a working canvas, not a report: two or three sentences is
usually right, prose rather than headings, and no restating of the question.
Reach for a short list only when the answer genuinely is several things.

Use the search tool when the answer depends on material you cannot see in the
grounding — the GM's world is much larger than whatever composition is currently
open. Do not search for something already in front of you.

You cannot yet change anything: no creating, moving, arranging, or editing. If
the GM asks for one of those, say briefly that you cannot do it yet, and answer
whatever part of the request is a question.`;

const CITATION = /\[(\d{1,3})\]/g;

/**
 * The sources an answer actually used, in the order it used them.
 *
 * Citations outside the offered range are dropped rather than repaired. A number
 * with nothing behind it is the one failure this design can still produce, and
 * silently rendering it as a chip pointing at the wrong thing would be worse
 * than the answer simply carrying one fewer source than it claims.
 */
export function citedSources(body: string, offered: readonly ObjectRef[]): readonly Source[] {
  const seen = new Map<number, Source>();
  for (const match of body.matchAll(CITATION)) {
    const n = Number(match[1]);
    if (seen.has(n)) continue;
    const ref = offered[n - 1];
    if (ref) seen.set(n, { n, ref });
  }
  return [...seen.values()].sort((a, b) => a.n - b.n);
}
