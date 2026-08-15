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

/** Only at a trust boundary — a store row, a server action input, or a test. */
export const asWorldId = (v: string) => v as WorldId;
export const asWorldObjectId = (v: string) => v as WorldObjectId;
export const asFragmentId = (v: string) => v as FragmentId;
export const asCompositionId = (v: string) => v as CompositionId;
export const asCardId = (v: string) => v as CardId;

export type Lifecycle = "active" | "archived" | "deleted";

/**
 * Ink is deliberately established. Pencil is provisional, inferred, or simply
 * not yet resolved. Captured thought starts as Pencil — capture is not an act
 * of establishment, and nothing here may promote it.
 */
export type TruthState = "ink" | "pencil" | "disputed";

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
 * The lightest state of a World Object: captured thought before classification.
 * A Fragment can later be joined by richer representations without the object
 * changing identity.
 */
export type Fragment = Readonly<{
  id: FragmentId;
  objectId: WorldObjectId;
  body: string;
  truthState: TruthState;
  version: number;
  updatedAt: string;
}>;

export type WorldObject = Readonly<{
  id: WorldObjectId;
  worldId: WorldId;
  lifecycle: Lifecycle;
  version: number;
  createdAt: string;
  creation: Provenance;
  fragment: Fragment | null;
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
  truthState: TruthState;
  /** Version of the composition item — bumped by move/resize. */
  cardVersion: number;
  /** Version of the fragment — bumped by edits to the body. */
  bodyVersion: number;
}>;

export type DeskView = Readonly<{
  worldId: WorldId;
  compositionId: CompositionId;
  name: string | null;
  cards: readonly DeskCard[];
}>;

export const DEFAULT_CARD_WIDTH = 260;
export const DEFAULT_CARD_HEIGHT = 160;

export const emptyLayoutAt = (x: number, y: number): Layout => ({
  x,
  y,
  width: DEFAULT_CARD_WIDTH,
  height: DEFAULT_CARD_HEIGHT
});
