import type {
  CardId,
  CompositionId,
  CompositionSummary,
  DeskCard,
  DeskView,
  Layout,
  Workspace,
  WorldId,
  WorldObjectId
} from "@/lib/world/model";

/**
 * The port every Desk read and write goes through.
 *
 * There is exactly one implementation today (local SQLite, for development).
 * When Relic grows accounts and hosting, a Postgres implementation lands
 * behind this same interface and nothing above it changes.
 *
 * Every method here is one *semantic intent* and commits as one operation.
 * That is the change-set invariant in WORLD-MODEL.md made structural: a
 * multi-card move either lands whole or not at all.
 */
export interface DeskRepository {
  /** Resolves the world's Desk composition, creating it on first visit. */
  openDesk(worldId: WorldId): Promise<DeskView>;

  /** Every composition of the world, for naming and switching. */
  openWorld(worldId: WorldId): Promise<Workspace>;

  /** One composition's cards. `null` when the composition does not exist. */
  openComposition(compositionId: CompositionId): Promise<DeskView | null>;

  /**
   * Creates an empty Board: another composition of the same world. A Board is
   * not a container — it holds references and layout, exactly as the Desk does.
   */
  createBoard(input: CreateBoardInput): Promise<CompositionSummary>;

  /**
   * References existing World Objects from another composition.
   *
   * This is where stable identity is visible: the object is not copied, and the
   * new card carries no body of its own. Editing the text through either card
   * edits the one Fragment; moving either card moves only that composition.
   */
  referenceObjects(input: ReferenceObjectsInput): Promise<WriteResult<readonly DeskCard[]>>;

  /**
   * Captures a new thought: one World Object with a Fragment body, plus one
   * Card placing it on the composition. `cardId` and `objectId` are supplied by
   * the caller so capture can be optimistic and replay-safe.
   */
  captureCard(input: CaptureCardInput): Promise<DeskCard>;

  /** Edits world truth. Touches the Fragment; the composition is untouched. */
  editCardBody(input: EditBodyInput): Promise<WriteResult<DeskCard>>;

  /** Edits the composition. Touches placement only; world truth is untouched. */
  moveCards(input: MoveCardsInput): Promise<WriteResult<readonly DeskCard[]>>;

  /**
   * Removes cards from the composition and archives the objects they were the
   * only reference to. Not a hard delete — nothing in Relic is destroyed by an
   * ordinary gesture.
   */
  removeCards(input: RemoveCardsInput): Promise<WriteResult<readonly CardId[]>>;
}

export type CaptureCardInput = Readonly<{
  compositionId: CompositionId;
  cardId: CardId;
  objectId: WorldObjectId;
  body: string;
  layout: Layout;
}>;

export type CreateBoardInput = Readonly<{
  worldId: WorldId;
  compositionId: CompositionId;
  name: string;
}>;

export type ObjectPlacement = Readonly<{
  cardId: CardId;
  objectId: WorldObjectId;
  layout: Layout;
}>;

export type ReferenceObjectsInput = Readonly<{
  compositionId: CompositionId;
  placements: readonly ObjectPlacement[];
}>;

export type EditBodyInput = Readonly<{
  compositionId: CompositionId;
  cardId: CardId;
  body: string;
  /** The version the editor last saw. A mismatch is reported, never overwritten. */
  observedBodyVersion: number;
}>;

export type CardMove = Readonly<{
  cardId: CardId;
  x: number;
  y: number;
  observedCardVersion: number;
}>;

export type MoveCardsInput = Readonly<{
  compositionId: CompositionId;
  moves: readonly CardMove[];
  /** Raises the moved cards above the rest of the composition. */
  bringToFront: boolean;
}>;

export type RemoveCardsInput = Readonly<{
  compositionId: CompositionId;
  cardIds: readonly CardId[];
}>;

/**
 * Writes report failure as data rather than throwing.
 *
 * `conflict.current` is always the **whole** composition, never just the cards
 * that clashed. A caller reconciles by replacing what it holds, so a partial
 * list here would read as "the Desk now contains only these" and quietly drop
 * everything else.
 */
export type WriteResult<T> =
  | Readonly<{ state: "ok"; data: T }>
  | Readonly<{ state: "missing" }>
  | Readonly<{ state: "conflict"; current: readonly DeskCard[] }>;

export const ok = <T>(data: T): WriteResult<T> => ({ state: "ok", data });
export const missing = <T>(): WriteResult<T> => ({ state: "missing" });
export const conflict = <T>(current: readonly DeskCard[]): WriteResult<T> => ({
  state: "conflict",
  current
});
