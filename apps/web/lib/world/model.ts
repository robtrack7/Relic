/**
 * The Relic world model, kept as small as WORLD-MODEL.md asks for.
 *
 * Two things are deliberately separate here and must stay separate:
 *
 *   - A **World Object** is an identity. It is the thing that persists.
 *   - A **Card** is a *composition item*: a reference to a World Object plus
 *     where it sits in one composition. Cards never carry world truth.
 *
 * Moving, restacking, or deleting a Card changes a composition. It does not
 * touch the object it points at.
 */

declare const brand: unique symbol;
type Branded<T extends string> = string & { readonly [brand]: T };

export type WorldId = Branded<"world">;
export type WorldObjectId = Branded<"world-object">;
export type FragmentId = Branded<"fragment">;
export type CompositionId = Branded<"composition">;
export type CardId = Branded<"card">;
export type RepresentationId = Branded<"representation">;
export type ClaimId = Branded<"claim">;
export type TemplateId = Branded<"template">;

/** Only at a trust boundary — a store row, a server action input, or a test. */
export const asWorldId = (v: string) => v as WorldId;
export const asWorldObjectId = (v: string) => v as WorldObjectId;
export const asFragmentId = (v: string) => v as FragmentId;
export const asCompositionId = (v: string) => v as CompositionId;
export const asCardId = (v: string) => v as CardId;
export const asRepresentationId = (v: string) => v as RepresentationId;
export const asClaimId = (v: string) => v as ClaimId;
export const asTemplateId = (v: string) => v as TemplateId;

export type Lifecycle = "active" | "archived" | "deleted";

/**
 * Whether Relic believes an assertion.
 *
 * Ink is deliberately established. Pencil is provisional, inferred, or simply
 * not yet resolved. Disputed is explicitly contested. Captured thought starts
 * as Pencil — capture is not an act of establishment, and only `settleTruth`
 * may promote it.
 *
 * This belongs to a **claim**, never to an object.
 */
export type TruthState = "ink" | "pencil" | "disputed";

/**
 * How settled a World Object is. **Not** truth, and the difference is load
 * bearing: a Pencil Character may hold an established claim about their
 * occupation, and an Ink Character may hold a disputed one about what they did
 * at the cathedral. Neither state implies the other and neither may be rendered
 * as the other.
 */
export type Maturity = "pencil" | "ink";

export type AuthorKind = "gm" | "player" | "librarian" | "system";

export type ProvenanceKind =
  | "gm_capture"
  | "gm_assertion"
  | "import"
  | "librarian"
  | "session";

export type Provenance = Readonly<{
  kind: ProvenanceKind;
  authoredBy: AuthorKind;
  recordedAt: string;
}>;

/**
 * The last deliberate ruling on a state: who, and when.
 *
 * Covers establishing, disputing, and withdrawing alike — all three are acts,
 * and a GM returning to a world asks about the third as often as the first.
 * Read it alongside the state it belongs to: the same record means "established
 * by you in August" on an Ink claim and "disputed by you in August" on a
 * contested one.
 *
 * Separate from `Provenance`, which says how the material arrived. "The
 * Librarian inferred this from Session 4; the GM established it in August" is
 * two facts, and only both together answer why Relic believes something.
 *
 * Null while nobody has ruled, which is the ordinary state of captured thought.
 */
export type Settlement = Readonly<{
  by: AuthorKind;
  at: string;
}>;

/**
 * The lightest state of a World Object: captured thought before classification.
 * A Fragment can later be joined by richer representations without the object
 * changing identity.
 *
 * The Fragment carries no truth of its own. Its prose is unclassified creative
 * material, and how settled that is belongs to the object's maturity.
 */
export type Fragment = Readonly<{
  id: FragmentId;
  objectId: WorldObjectId;
  body: string;
  version: number;
  updatedAt: string;
}>;

export type WorldObject = Readonly<{
  id: WorldObjectId;
  worldId: WorldId;
  lifecycle: Lifecycle;
  maturity: Maturity;
  /** Why Relic believes this thing is settled. Null while it is not. */
  settled: Settlement | null;
  version: number;
  createdAt: string;
  creation: Provenance;
  fragment: Fragment | null;
}>;

/**
 * A way of understanding a World Object — never a separate record.
 *
 * Deepening a Fragment into a Character adds one of these to the object that
 * was already there. The identity does not change and the Fragment survives
 * underneath.
 */
export type RepresentationKind =
  | "character"
  | "place"
  | "faction"
  | "artifact"
  | "event"
  | "thread"
  | "source"
  | "note";

export type FieldKind = "text" | "longtext" | "number";

/** One row of a mechanical sheet: rules data, not an assertion about the world. */
export type FieldDef = Readonly<{
  key: string;
  label: string;
  kind: FieldKind;
  group?: string;
}>;

/**
 * One narrative attribute a template suggests asserting.
 *
 * `relational` marks the ones whose answer is usually another thing in the
 * world rather than a word — a location, an allegiance, a holder. It is a
 * suggestion, never a requirement: typing a name nobody has captured yet is
 * still a perfectly good claim, and a template must not stop a thought.
 */
export type ClaimDef = Readonly<{
  key: string;
  label: string;
  relational?: boolean;
}>;

export type Template = Readonly<{
  kind: RepresentationKind;
  name: string;
  /** Asked when the representation is first added and has no name yet. */
  labelPrompt: string;
  fields: readonly FieldDef[];
  claims: readonly ClaimDef[];
}>;

/** Sheet values, keyed by `FieldDef.key`. Absent means unset, never zero. */
export type FieldValues = Readonly<Record<string, string | number>>;

export type Representation = Readonly<{
  id: RepresentationId;
  objectId: WorldObjectId;
  kind: RepresentationKind;
  label: string | null;
  templateId: TemplateId | null;
  fields: FieldValues;
  version: number;
}>;

/**
 * How precisely a claim is placed in story time.
 *
 * `unknown` is a real answer and the default. Relic preserves
 * "sometime that winter" rather than inventing a date for it.
 */
export type StoryPrecision =
  | "exact"
  | "day"
  | "month"
  | "year"
  | "relative"
  | "unknown";

export type StoryPosition = Readonly<{
  /** Stable chronological ordering. Null while nothing has placed it. */
  order: number | null;
  precision: StoryPrecision;
  /** What to show a human: "before Session 4", "the night of the fire". */
  label: string | null;
}>;

/**
 * A narrative assertion about a World Object.
 *
 * Truth lives here, not on the object: a Pencil Character may hold an
 * established claim, and an Ink Character may hold a disputed one.
 */
export type Claim = Readonly<{
  id: ClaimId;
  subjectId: WorldObjectId;
  /** The attribute asserted, or `assertion` for a free sentence. */
  claimKind: string;
  value: string;
  /**
   * The other end, when this claim asserts a relationship.
   *
   * A relationship is a claim whose value is another World Object — not a
   * separate kind of record. `value` still holds the reading in words, and is
   * what remains legible if the other end is ever archived.
   */
  objectValue: WorldObjectId | null;
  truthState: TruthState;
  /** How this assertion arrived. */
  provenance: Provenance;
  /**
   * Who last set its truth, and when. Null while nobody has — a claim asserted
   * by hand is Pencil, and being asserted is not being established.
   */
  settled: Settlement | null;
  story: StoryPosition;
  version: number;
}>;

export const FREE_ASSERTION = "assertion";

/** Claims of this object that are explicitly contested. */
export function disputedClaims(card: DeskCard): readonly Claim[] {
  return card.claims.filter((claim) => claim.truthState === "disputed");
}

/** Just enough of a World Object to name it and point at it. */
export type ObjectRef = Readonly<{
  objectId: WorldObjectId;
  /** Its name, or the first line of what was captured. Never empty. */
  label: string;
  kind: RepresentationKind | null;
}>;

/**
 * One relationship claim, seen from one end of it.
 *
 * Both directions matter and they are not the same statement. Mara asserting an
 * allegiance to the Harbour Guild is something Mara says about herself; from the
 * Guild's side it is something the world says about the Guild. Pulling the
 * thread has to work either way, so a Link records which way it was asserted.
 */
export type Link = Readonly<{
  claimId: ClaimId;
  claimKind: string;
  direction: "out" | "in";
  other: ObjectRef;
  truthState: TruthState;
}>;

export type CompositionKind = "desk" | "board" | "prep" | "session";

/** Screen-independent placement, in world coordinates. */
export type Layout = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type Card = Readonly<{
  id: CardId;
  compositionId: CompositionId;
  objectId: WorldObjectId;
  layout: Layout;
  /** Stacking within the composition. Higher draws later. */
  z: number;
  version: number;
}>;

export type Composition = Readonly<{
  id: CompositionId;
  worldId: WorldId;
  kind: CompositionKind;
  name: string | null;
  version: number;
}>;

/**
 * What the Desk actually renders: one composition's cards, each resolved
 * against the object it references. The join happens on read; nothing here is
 * stored twice.
 */
export type DeskCard = Readonly<{
  cardId: CardId;
  objectId: WorldObjectId;
  layout: Layout;
  z: number;
  body: string;
  /**
   * How settled the object is — not whether anything about it is true. What is
   * true is on the claims, each carrying its own truth.
   */
  maturity: Maturity;
  /** Who settled it, and when. Null while it is still Pencil. */
  settled: Settlement | null;
  /** Version of the composition item — bumped by move/resize. */
  cardVersion: number;
  /** Version of the fragment — bumped by edits to the body. */
  bodyVersion: number;
  /**
   * How this object is currently understood, if it has been deepened at all.
   * Null is the ordinary state of a captured thought and not a lesser one.
   */
  representation: Representation | null;
  /** Narrative assertions about the object, at the current story position. */
  claims: readonly Claim[];
  /**
   * What this object is connected to, in both directions and world-wide — not
   * only to what happens to be on this composition. A neighbourhood is a
   * property of the world, and a Board showing half of one would be lying.
   */
  links: readonly Link[];
}>;

/** What a card shows as its name, falling back through what it actually has. */
export function cardTitle(card: DeskCard): string {
  const label = card.representation?.label?.trim();
  if (label) return label;
  const firstLine = card.body.trim().split("\n")[0]?.trim() ?? "";
  return firstLine;
}

/**
 * How this card's object appears at the other end of a relationship.
 *
 * The same fallback the store applies to objects with no card here, so a link
 * and the card it points at can never end up calling the thing two names.
 */
export function cardRef(card: DeskCard): ObjectRef {
  const title = cardTitle(card);
  return {
    objectId: card.objectId,
    label: title === "" ? "Unnamed" : title,
    kind: card.representation?.kind ?? null
  };
}

export type DeskView = Readonly<{
  worldId: WorldId;
  compositionId: CompositionId;
  kind: CompositionKind;
  name: string | null;
  cards: readonly DeskCard[];
}>;

/**
 * Enough of a composition to name it and switch to it, without loading what it
 * holds. The count is of references, not of world content — two compositions
 * counting the same object are both telling the truth.
 */
export type CompositionSummary = Readonly<{
  compositionId: CompositionId;
  kind: CompositionKind;
  name: string;
  cardCount: number;
}>;

/** Every composition of one world, for the switcher. */
export type Workspace = Readonly<{
  worldId: WorldId;
  name: string | null;
  compositions: readonly CompositionSummary[];
}>;

export const DEFAULT_CARD_WIDTH = 260;
export const DEFAULT_CARD_HEIGHT = 160;

export const emptyLayoutAt = (x: number, y: number): Layout => ({
  x,
  y,
  width: DEFAULT_CARD_WIDTH,
  height: DEFAULT_CARD_HEIGHT
});
