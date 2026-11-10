import type { LibrarianMessage, Source } from "@/lib/librarian/model";
import type { Spend, SpendTally } from "@/lib/librarian/spend";
import type {
  AuthorKind,
  Beat,
  BeatId,
  CardTint,
  CardId,
  Claim,
  ClaimId,
  CompositionId,
  CompositionSummary,
  DeskCard,
  DeskView,
  FieldValues,
  KindFilter,
  Layout,
  Lifecycle,
  Maturity,
  Prep,
  Representation,
  RepresentationId,
  RepresentationKind,
  RelationshipId,
  Session,
  SessionId,
  Settlement,
  StoryPosition,
  TruthState,
  Workspace,
  WorldEntry,
  WorldId,
  WorldObjectId
} from "@/lib/world/model";
import type { EntityDocument, EntitySnapshot, MechanicsProfile } from "@/lib/world/entity-document";

/**
 * The port every Desk read and write goes through.
 *
 * Implemented today by Postgres, via the local Supabase stack in development.
 * Callers resolve it through `deskRepository()` in `@/lib/world/store` and see
 * this interface, never a concrete class.
 *
 * Every method here is one *semantic intent* and commits as one operation.
 * That is the change-set invariant in WORLD-MODEL.md made structural: a
 * multi-card move either lands whole or not at all.
 */
export interface DeskRepository {
  moveCollectionCards(input: MoveCardsInput & { observedSpatialVersion: number; command: import("@/lib/desk/collections").CollectionCommand | null; spatial?: import("./model").SpatialState }): Promise<WriteResult<{ cards: readonly DeskCard[]; spatial: import("./model").SpatialState }>>;
  /** Validated Board-only collection operations, serialized with placement writes. */
  changeCollection(input: { compositionId: CompositionId; observedVersion: number; command: import("@/lib/desk/collections").CollectionCommand }): Promise<WriteResult<import("./model").SpatialState>>;
  replaceSpatial(input: { compositionId: CompositionId; observedVersion: number; spatial: import("./model").SpatialState }): Promise<WriteResult<import("./model").SpatialState>>;
  /** Resolves the world's Desk composition, creating it on first visit. */
  openDesk(worldId: WorldId): Promise<DeskView>;

  /** Every composition of the world, for naming and switching. */
  openWorld(worldId: WorldId): Promise<Workspace>;

  /** One composition's cards. `null` when the composition does not exist. */
  openComposition(compositionId: CompositionId): Promise<DeskView | null>;

  /** Read an identity in this world without placing it on the current Board. */
  inspectObject(worldId: WorldId, objectId: WorldObjectId): Promise<DeskView | null>;

  /** Read the persistent entity projection without requiring a placement. */
  loadEntity(worldId: WorldId, objectId: WorldObjectId): Promise<EntitySnapshot | null>;

  /** Create an identity and its authored document without placing a card. */
  createEntity(input: CreateEntityInput): Promise<WriteResult<EntitySnapshot>>;

  /** Save authored blocks with optimistic document-version concurrency. */
  saveEntityDocument(input: SaveEntityDocumentInput): Promise<WriteResult<EntitySnapshot>>;

  /** Save the identity projection (name and legacy-compatible fields). */
  saveEntityIdentity(input: SaveEntityIdentityInput): Promise<WriteResult<EntitySnapshot>>;

  /** Save typed mechanics while preserving unknown legacy field values. */
  saveEntityMechanics(input: SaveEntityMechanicsInput): Promise<WriteResult<EntitySnapshot>>;

  /**
   * Creates an empty Board: another composition of the same world. A Board is
   * not a container — it holds references and layout, exactly as the Desk does.
   */
  createBoard(input: CreateBoardInput): Promise<CompositionSummary>;

  /**
   * Starts a session, and the composition it is prepared on.
   *
   * Both or neither: a session with no Prep has nowhere to be arranged, and a
   * prep composition with no session is a Board that has borrowed a word. One
   * intent, one change set — which is also what makes the pair's invariant
   * ("every prep composition belongs to exactly one session") true by
   * construction rather than by hoping callers keep it.
   */
  createSession(input: CreateSessionInput): Promise<WriteResult<Prep>>;

  /**
   * The session a composition is the Prep of, with its running order.
   *
   * Keyed by composition rather than by session because that is the question
   * the surface actually asks: the GM is standing on a composition and Relic
   * needs to know whether it is preparing for something. `null` for the Desk,
   * for a Board, and for a composition that does not exist — all three are the
   * same answer to the surface, which is "draw no rail".
   */
  openPrep(compositionId: CompositionId): Promise<Prep | null>;

  /** Renames a session and records what it is for. Never touches its beats. */
  editSession(input: EditSessionInput): Promise<WriteResult<Session>>;

  /**
   * Writes one beat: a new one, or the same one again with different words.
   *
   * The caller supplies the id, as capture and `setClaim` do, so adding a beat
   * can be optimistic and replay-safe. `refs` replaces wholesale rather than
   * merging — what a beat is about is one judgment, and a partial update would
   * make removing the last reference impossible to express.
   *
   * A beat cannot reach truth. There is nothing on it that could: it is an
   * intention, and the whole point of keeping it out of `claims` is that
   * planning to do something is not asserting that it happened.
   */
  setBeat(input: SetBeatInput): Promise<WriteResult<Beat>>;

  /** Retires a beat. Archival, like everything else Relic removes. */
  removeBeat(input: RemoveBeatInput): Promise<WriteResult<BeatId>>;

  /**
   * Puts the running order in the order given.
   *
   * The whole list arrives and every position is rewritten, so there is no
   * partial ordering to reconcile and no way to express half a reorder. Ids
   * that are not this session's beats are refused rather than skipped — a
   * caller sending a stale list should be told, not quietly given an order it
   * did not ask for.
   */
  reorderBeats(input: ReorderBeatsInput): Promise<WriteResult<readonly Beat[]>>;

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
  captureCard(input: CaptureCardInput): Promise<WriteResult<DeskCard>>;

  /** Edits world truth. Touches the Fragment; the composition is untouched. */
  editCardBody(input: EditBodyInput): Promise<WriteResult<DeskCard>>;

  /** Edits the composition. Touches placement only; world truth is untouched. */
  moveCards(input: MoveCardsInput): Promise<WriteResult<readonly DeskCard[]>>;

  /** Board-only visibility of an existing relationship, with placement concurrency. */
  setRelationshipVisibility(input: { compositionId: CompositionId; cardId: CardId; relationshipId: RelationshipId; visible: boolean; observedCardVersion: number }): Promise<WriteResult<DeskCard>>;

  /**
   * Removes cards from the composition and archives the objects they were the
   * only reference to. Not a hard delete — nothing in Relic is destroyed by an
   * ordinary gesture.
   */
  removeCards(input: RemoveCardsInput): Promise<WriteResult<readonly CardId[]>>;

  /**
   * Lifecycle of an identity, independent of any composition referencing it.
   *
   * On the port because "archived, not destroyed" is a promise `removeCards`
   * makes, and this is the only way to observe that it kept it.
   */
  objectLifecycle(objectId: WorldObjectId): Promise<Lifecycle | null>;

  /**
   * Deepens an object into a kind of thing.
   *
   * This is the identity invariant at its most load-bearing: the object keeps
   * the id it was captured with, the Fragment body survives, and every
   * composition already referencing it now shows a Character without anything
   * being moved or recreated. Adding a kind the object already has returns the
   * representation that is already there, so the gesture is idempotent.
   */
  representObject(input: RepresentObjectInput): Promise<WriteResult<Representation>>;

  /** Edits the name and mechanical sheet. Never touches claims. */
  editRepresentation(input: EditRepresentationInput): Promise<WriteResult<Representation>>;

  /**
   * Asserts a narrative attribute.
   *
   * With no story position this replaces the object's current claim of that
   * kind — the ordinary case, where a GM is correcting themselves rather than
   * recording change over time. Given a story position it appends, because two
   * claims about allegiance at different points in the story are both true.
   */
  setClaim(input: SetClaimInput): Promise<WriteResult<Claim>>;

  /** Retires a claim. Archival, not deletion — provenance survives. */
  removeClaim(input: RemoveClaimInput): Promise<WriteResult<ClaimId>>;

  /**
   * Settles truth deliberately. **The only path in Relic that writes Ink.**
   *
   * Every other write — capture, edit, assertion, and whatever the Librarian
   * grows into — produces Pencil and cannot do otherwise. Concentrating
   * establishment in one method is what makes "Ink is deliberate" checkable
   * rather than a rule every future write path has to remember.
   *
   * Three things are enforced here rather than asked of callers:
   *
   *   only the GM may establish. Ink requested by the Librarian, a player, or a
   *   system process is `refused` — the Librarian may propose, and proposing is
   *   `setClaim`;
   *
   *   the claims must belong to the subject, so a caller cannot establish
   *   somebody else's assertions by sending their ids;
   *
   *   the whole settlement commits as one change set. Establishing an object
   *   and the six claims previewed alongside it is one intent, and either all
   *   of it happens or none of it does.
   *
   * Unsettling — back to Pencil, or into dispute — goes through the same method
   * and the same transaction, because it is the same kind of act.
   */
  settleTruth(input: SettleTruthInput): Promise<WriteResult<Settled>>;

  /**
   * The world's index: every identity in it, found by name or by prose.
   *
   * The one read that is not scoped to a composition, and that is what makes it
   * a Library rather than a view. Search must retrieve any object regardless of
   * where it sits, so this reaches past the Desk deliberately — spatial memory
   * is an assist here, never a requirement.
   *
   * Serves both the relationship picker and the Library because they are the
   * same question asked with different filters. Two methods would drift, and the
   * one that drifted would be the one that could not find something.
   */
  searchWorld(input: SearchWorldInput): Promise<readonly WorldEntry[]>;

  /**
   * What the GM and the Librarian have said to each other in this world.
   *
   * On this port rather than a second one because it is the same world, the same
   * store, and the same scoping question — and because the conversation must be
   * read on the server, from a world id, for the same reason every other read
   * here is. A transcript that came back from the browser would be the browser
   * telling the Librarian what it had previously said.
   *
   * Oldest first, most recent `limit` exchanges.
   */
  librarianHistory(worldId: WorldId, limit?: number): Promise<readonly LibrarianMessage[]>;

  /**
   * Records one exchange: the question and the answer, together.
   *
   * One intent, one change set. A half-written exchange is a conversation with a
   * question nobody answered, which would then be replayed into every later turn
   * as though the Librarian had ignored it.
   */
  recordExchange(input: RecordExchangeInput): Promise<readonly LibrarianMessage[]>;

  /**
   * What this world has spent on its Librarian, in tokens, over its whole life.
   *
   * Tokens rather than money, because tokens are measured and money is
   * estimated — `lib/librarian/spend.ts` holds the rates and does the pricing,
   * and nothing about a rate belongs in the world's record. Grouped by model,
   * because that is what the rates are keyed by.
   *
   * A floor rather than an exact bill: a turn that fails after the model has
   * spoken records no exchange and so is not counted. That gap is bounded and
   * documented; the provider's own dashboard is the authority on the total.
   * What this answers instead is which *conversations* are expensive, which no
   * dashboard can.
   */
  librarianSpend(worldId: WorldId): Promise<SpendTally>;
}

export type RecordExchangeInput = Readonly<{
  worldId: WorldId;
  /** Where the GM was standing. Recorded, never used to scope the conversation. */
  compositionId: CompositionId | null;
  ask: string;
  answer: string;
  /** The World Objects the answer actually cited. */
  sources: readonly Source[];
  /** What running the model cost. Absent when the provider reported no usage. */
  spend?: Spend | null;
}>;

export type SearchWorldInput = Readonly<{
  worldId: WorldId;
  /** Empty means "everything", which is what an opened index wants. */
  query: string;
  /** Empty means every kind, including the objects that have none. */
  kinds?: readonly KindFilter[];
  maturity?: Maturity | null;
  /**
   * Archived material is reachable, but only deliberately.
   *
   * `removeCards` archives an object that loses its last reference, so the
   * Library is the only way back to it. Defaulting to `active` keeps ordinary
   * retrieval clean; asking for `archived` is how a GM finds what they cleared
   * off the Desk last week.
   */
  include?: "active" | "archived" | "all";
  /** Nothing is its own allegiance; the subject is never offered. */
  excludeId?: WorldObjectId;
  /** Resolves `cardHere`: is this already on the composition I am looking at? */
  compositionId?: CompositionId;
  limit?: number;
  offset?: number;
}>;

export type RepresentObjectInput = Readonly<{
  objectId: WorldObjectId;
  representationId: RepresentationId;
  kind: RepresentationKind;
  label: string | null;
}>;

export type EditRepresentationInput = Readonly<{
  representationId: RepresentationId;
  label: string | null;
  fields: FieldValues;
  /** The version the editor last saw. A mismatch is reported, never overwritten. */
  observedVersion: number;
}>;

export type SetClaimInput = Readonly<{
  subjectId: WorldObjectId;
  claimId: ClaimId;
  claimKind: string;
  value: string;
  /**
   * Makes this a relationship: the claim's value is another World Object.
   *
   * Refused as `missing` if that object is gone, archived, or belongs to another
   * world — the same seam `referenceObjects` holds, for the same reason.
   */
  objectValue?: WorldObjectId | null;
  /** Omitted means "no story position", which replaces rather than appends. */
  story?: StoryPosition;
  /**
   * Who is asserting, and therefore how the claim is recorded as having arrived.
   *
   * It cannot reach Ink. Every claim written here is Pencil with no settling
   * author, and `claims_ink_is_deliberate` refuses the row if it were ever
   * otherwise — so this says who believes it, never whether Relic does.
   */
  author: AuthorKind;
  expectedClaim?: Readonly<{ claimId: ClaimId; version: number; relationshipId?: RelationshipId | null }>;
  /** Canvas Connect commits its semantic intent and Board visibility together. */
  boardProjection?: Readonly<{ compositionId: CompositionId; cardId: CardId; observedCardVersion: number }>;
}>;

export type RemoveClaimInput = Readonly<{
  claimId: ClaimId;
  observedVersion?: number;
}>;

export type ClaimSettlement = Readonly<{
  claimId: ClaimId;
  truth: TruthState;
  /**
   * The version the GM was shown when they decided.
   *
   * Ink is established by a *previewed* action, so establishing a claim whose
   * wording changed underneath would establish something nobody looked at. A
   * mismatch is reported, never resolved by guessing.
   */
  observedVersion: number;
}>;

export type SettleTruthInput = Readonly<{
  objectId: WorldObjectId;
  /**
   * The object's maturity, or null to leave it alone.
   *
   * Deliberately carries no observed version. Maturity is a two-state judgment
   * about a whole thing — "this is settled enough to rely on" — and it does not
   * become stale because a claim moved underneath it. Claim truth does, and
   * that is where the check lives.
   */
  maturity: Maturity | null;
  /** Claims of `objectId`. Any that are not are refused, not skipped. */
  claims: readonly ClaimSettlement[];
  /**
   * Who is settling. Refused if anyone but the GM asks for Ink — the Librarian
   * may never establish, and this is where that is decided.
   */
  author: AuthorKind;
}>;

/** What the settlement left behind, for the caller to render without refetching. */
export type Settled = Readonly<{
  objectId: WorldObjectId;
  maturity: Maturity;
  settled: Settlement | null;
  /** Every claim that was touched, as it now stands. */
  claims: readonly Claim[];
}>;

export type CaptureCardInput = Readonly<{
  compositionId: CompositionId;
  cardId: CardId;
  objectId: WorldObjectId;
  body: string;
  layout: Layout;
  /** Optional first representation, inserted in the same change set as capture. */
  initialRepresentation?: Readonly<{
    representationId: RepresentationId;
    kind: RepresentationKind;
    label: string | null;
  }>;
  /**
   * Whose thought this is. Recorded on the object and, when it is not the GM's,
   * on the prose as well — the Librarian may capture, and material it
   * contributed must stay distinguishable from material the GM wrote.
   *
   * It cannot affect maturity. Capture produces Pencil whoever asks, and the
   * database refuses anything else on this path.
   */
  author: AuthorKind;
}>;

export type CreateBoardInput = Readonly<{
  worldId: WorldId;
  compositionId: CompositionId;
  name: string;
}>;

export type CreateSessionInput = Readonly<{
  worldId: WorldId;
  sessionId: SessionId;
  /** The prep composition created alongside it. Supplied so the caller can route. */
  compositionId: CompositionId;
  title: string;
}>;

export type EditSessionInput = Readonly<{
  sessionId: SessionId;
  title: string;
  /** What tonight is for. Empty clears it back to nothing having been said. */
  intent: string | null;
  /** The version the rail last saw. A mismatch is reported, never overwritten. */
  observedVersion: number;
}>;

export type SetBeatInput = Readonly<{
  sessionId: SessionId;
  beatId: BeatId;
  body: string;
  /**
   * What this beat is about, replacing whatever it was about before.
   *
   * Objects, not cards: a beat may name something that is not on the Prep at
   * all, and refusing that would make the running order a property of the
   * composition rather than of the evening. Anything gone or belonging to
   * another world is refused — the same seam `referenceObjects` holds.
   */
  refs: readonly WorldObjectId[];
  /**
   * Who wrote it. The Librarian may add a beat, and Prep marks the ones it
   * proposed — a GM must be able to tell their own plan from a suggestion.
   */
  author: AuthorKind;
}>;

export type RemoveBeatInput = Readonly<{
  beatId: BeatId;
}>;

export type ReorderBeatsInput = Readonly<{
  sessionId: SessionId;
  /** Every active beat of the session, in the order it should now read. */
  beatIds: readonly BeatId[];
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
  /**
   * Who is rewriting.
   *
   * A GM editing their own prose is unmarked. Anyone else replaces words the GM
   * may not have chosen to lose, so the write records who, when, and the text it
   * superseded — which is the whole reversal for the one Librarian act that
   * destroys rather than adds or archives.
   */
  author: AuthorKind;
}>;

export type CreateEntityInput = Readonly<{
  worldId: WorldId;
  objectId: WorldObjectId;
  kind?: RepresentationKind;
  label?: string | null;
}>;

export type SaveEntityDocumentInput = Readonly<{
  worldId: WorldId;
  objectId: WorldObjectId;
  observedVersion: number;
  document: EntityDocument;
  author?: AuthorKind;
}>;

export type SaveEntityIdentityInput = Readonly<{
  worldId: WorldId;
  objectId: WorldObjectId;
  observedVersion: number;
  label: string | null;
  fields: FieldValues;
}>;

export type SaveEntityMechanicsInput = Readonly<{
  worldId: WorldId;
  objectId: WorldObjectId;
  observedVersion: number;
  profile: MechanicsProfile;
}>;

export type CardMove = Readonly<{
  cardId: CardId;
  x: number;
  y: number;
  width?: number;
  height?: number;
  tint?: CardTint | null;
  z?: number;
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
 *
 * `refused` is not `missing` and not `invalid`. The request was well formed and
 * everything it named exists — Relic declined to do it. The truth system needs
 * this: "the Librarian may not establish Ink" is a rule of the world, and
 * reporting it as a malformed request would hide a decision behind a error.
 */
export type WriteResult<T> =
  | Readonly<{ state: "ok"; data: T }>
  | Readonly<{ state: "missing" }>
  | Readonly<{ state: "refused"; reason: string }>
  | Readonly<{ state: "conflict"; current: readonly DeskCard[] }>;

export const ok = <T>(data: T): WriteResult<T> => ({ state: "ok", data });
export const missing = <T>(): WriteResult<T> => ({ state: "missing" });
export const refused = <T>(reason: string): WriteResult<T> => ({
  state: "refused",
  reason
});
export const conflict = <T>(current: readonly DeskCard[]): WriteResult<T> => ({
  state: "conflict",
  current
});
