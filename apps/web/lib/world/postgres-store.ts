import { randomUUID } from "node:crypto";

import type postgres from "postgres";

import { db } from "@/lib/world/db";
import {
  asCardId,
  asCompositionId,
  asWorldId,
  asWorldObjectId,
  type CardId,
  type CompositionId,
  type CompositionKind,
  type CompositionSummary,
  type DeskCard,
  type DeskView,
  type Lifecycle,
  type TruthState,
  type Workspace,
  type WorldId,
  type WorldObjectId
} from "@/lib/world/model";
import {
  conflict,
  missing,
  ok,
  type CaptureCardInput,
  type CreateBoardInput,
  type DeskRepository,
  type EditBodyInput,
  type MoveCardsInput,
  type ReferenceObjectsInput,
  type RemoveCardsInput,
  type WriteResult
} from "@/lib/world/repository";

/**
 * Postgres implementation of `DeskRepository`, against the local Supabase stack
 * in development. The schema lives in `supabase/migrations/`; this file assumes
 * it and never creates it.
 *
 * ## Locking
 *
 * One part of this is deliberately *not* a translation of the SQLite original.
 * SQLite took a whole-database write lock, which made read-verify-then-write
 * atomic against other writers for free. Postgres does not: under READ
 * COMMITTED two transactions can both read version 3, both pass their optimistic
 * check, and both write — the second landing on top of the first. The port's
 * promise that "a mismatch is reported, never overwritten" would become false.
 *
 * So every verify phase takes explicit row locks. `for no key update` rather
 * than `for update`, because it does not block the `for key share` that foreign
 * key checks take. Under READ COMMITTED a blocked lock waiter re-evaluates its
 * row once the blocker commits, so it sees the *new* version and correctly
 * reports `conflict` — or sees the row no longer matches `lifecycle = 'active'`
 * and correctly reports `missing`.
 *
 * **Lock order, globally:** `compositions` → `composition_items` →
 * `world_objects` → `fragments`, ids ascending within a table. Nothing here
 * violates it, and nothing new should.
 *
 * `editCardBody` locks the fragment; `moveCards` locks the composition item.
 * They never contend — the composition does not own world truth, and now the
 * locks say so too.
 *
 * ## Returning commits
 *
 * Returning normally from inside a transaction **commits**, including when the
 * value is a `conflict` or `missing`. Every method therefore verifies before it
 * writes. No write may precede its verification.
 */

type Sql = postgres.Sql | postgres.TransactionSql;
type Tx = postgres.TransactionSql;

type CardRow = {
  card_id: string;
  object_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  card_version: number;
  body: string;
  truth_state: string;
  body_version: number;
};

/**
 * The card projection, as a composable fragment rather than a string constant.
 * Interpolating a plain string into a tagged template would send the whole
 * SELECT as a bind parameter.
 */
const cardSelect = (sql: Sql) => sql`
  select
    ci.id         as card_id,
    ci.object_id  as object_id,
    ci.x, ci.y, ci.width, ci.height, ci.z,
    ci.version    as card_version,
    f.body        as body,
    f.truth_state as truth_state,
    f.version     as body_version
  from composition_items ci
  join world_objects wo on wo.id = ci.object_id
  join fragments f on f.object_id = ci.object_id
  where ci.lifecycle = 'active' and wo.lifecycle = 'active'
`;

function toDeskCard(row: CardRow): DeskCard {
  return {
    cardId: asCardId(row.card_id),
    objectId: asWorldObjectId(row.object_id),
    layout: { x: row.x, y: row.y, width: row.width, height: row.height },
    z: row.z,
    body: row.body,
    truthState: row.truth_state as TruthState,
    cardVersion: row.card_version,
    bodyVersion: row.body_version
  };
}

const now = () => new Date().toISOString();

export class PostgresDeskRepository implements DeskRepository {
  readonly #sql: postgres.Sql;

  constructor(sql: postgres.Sql) {
    this.#sql = sql;
  }

  static open(sql: postgres.Sql = db()): PostgresDeskRepository {
    return new PostgresDeskRepository(sql);
  }

  /**
   * One semantic intent, one transaction.
   *
   * `lock_timeout` turns a pathological lock wait into a fast, legible error
   * rather than a server action that hangs. The cast is because postgres.js
   * types `begin` as returning `T | T[]` — a callback is allowed to return an
   * array of queries. Ours never does.
   */
  async #tx<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return (await this.#sql.begin(async (tx) => {
      await tx`set local lock_timeout = '5s'`;
      return await work(tx as Tx);
    })) as T;
  }

  async #cardsOf(sql: Sql, compositionId: CompositionId): Promise<DeskCard[]> {
    const rows = (await sql`
      ${cardSelect(sql)}
        and ci.composition_id = ${compositionId}
      order by ci.z asc, ci.seq asc
    `) as unknown as CardRow[];
    return rows.map(toDeskCard);
  }

  async #cardById(
    sql: Sql,
    compositionId: CompositionId,
    cardId: CardId
  ): Promise<CardRow | null> {
    const rows = (await sql`
      ${cardSelect(sql)}
        and ci.composition_id = ${compositionId}
        and ci.id = ${cardId}
    `) as unknown as CardRow[];
    return rows[0] ?? null;
  }

  /**
   * Locks a composition for the rest of the transaction, and returns the world
   * it belongs to.
   *
   * Every method that allocates a `z` needs this. `max(z)` is an aggregate and
   * cannot be row-locked, so two concurrent captures would both read `max = 3`
   * and both insert `z = 4`. Serialising writers per composition is the
   * faithful analogue of SQLite's whole-database lock, scoped so that
   * concurrency across compositions and worlds survives.
   */
  async #lockComposition(tx: Tx, compositionId: CompositionId): Promise<string | null> {
    const rows = (await tx`
      select world_id from compositions where id = ${compositionId}
      for no key update
    `) as unknown as { world_id: string }[];
    return rows[0]?.world_id ?? null;
  }

  /**
   * Lifecycle of an identity, independent of any composition that references
   * it. Removing every card is an archival, not a destruction — this is how you
   * see that the object is still there.
   */
  async objectLifecycle(objectId: WorldObjectId): Promise<Lifecycle | null> {
    const rows = (await this.#sql`
      select lifecycle from world_objects where id = ${objectId}
    `) as unknown as { lifecycle: string }[];
    return (rows[0]?.lifecycle as Lifecycle) ?? null;
  }

  async #maxZ(sql: Sql, compositionId: CompositionId): Promise<number> {
    const rows = (await sql`
      select coalesce(max(z), 0)::int as top
        from composition_items
       where composition_id = ${compositionId} and lifecycle = 'active'
    `) as unknown as { top: number }[];
    return rows[0]?.top ?? 0;
  }

  async #findDesk(sql: Sql, worldId: WorldId): Promise<CompositionId | null> {
    const rows = (await sql`
      select id from compositions
       where world_id = ${worldId} and kind = 'desk'
    `) as unknown as { id: string }[];
    const id = rows[0]?.id;
    return id ? asCompositionId(id) : null;
  }

  /**
   * Creates the world and its Desk on first visit. Idempotent, and safe against
   * two first visits racing: there is no row to lock for a world that does not
   * exist yet, so the unique index on one desk per world arbitrates instead and
   * the loser's insert becomes a no-op.
   */
  async #ensureDesk(worldId: WorldId): Promise<CompositionId> {
    // Fast path first. The desk exists on every visit but the first, and this
    // read should not open a write transaction to discover that.
    const found = await this.#findDesk(this.#sql, worldId);
    if (found) return found;

    return await this.#tx(async (tx) => {
      await tx`
        insert into worlds (id, name, created_at)
        values (${worldId}, ${"Untitled world"}, ${now()})
        on conflict (id) do nothing
      `;
      await tx`
        insert into compositions (id, world_id, kind, name, version, created_at)
        values (${randomUUID()}, ${worldId}, 'desk', ${"Desk"}, 1, ${now()})
        on conflict do nothing
      `;
      const desk = await this.#findDesk(tx, worldId);
      if (!desk) throw new Error("ensureDesk: the world has no Desk after creating one");
      return desk;
    });
  }

  async openDesk(worldId: WorldId): Promise<DeskView> {
    const compositionId = await this.#ensureDesk(worldId);
    return {
      worldId,
      compositionId,
      kind: "desk",
      name: "Desk",
      cards: await this.#cardsOf(this.#sql, compositionId)
    };
  }

  async openWorld(worldId: WorldId): Promise<Workspace> {
    await this.#ensureDesk(worldId);

    const worlds = (await this.#sql`
      select name from worlds where id = ${worldId}
    `) as unknown as { name: string | null }[];

    const rows = (await this.#sql`
      select c.id, c.kind, c.name,
             (select count(*) from composition_items ci
                join world_objects wo on wo.id = ci.object_id
               where ci.composition_id = c.id
                 and ci.lifecycle = 'active'
                 and wo.lifecycle = 'active')::int as card_count
        from compositions c
       where c.world_id = ${worldId}
       order by case c.kind when 'desk' then 0 else 1 end, c.seq asc
    `) as unknown as {
      id: string;
      kind: string;
      name: string | null;
      card_count: number;
    }[];

    return {
      worldId,
      name: worlds[0]?.name ?? null,
      compositions: rows.map((row) => ({
        compositionId: asCompositionId(row.id),
        kind: row.kind as CompositionKind,
        name: row.name ?? "Untitled",
        cardCount: row.card_count
      }))
    };
  }

  async openComposition(compositionId: CompositionId): Promise<DeskView | null> {
    const rows = (await this.#sql`
      select world_id, kind, name from compositions where id = ${compositionId}
    `) as unknown as { world_id: string; kind: string; name: string | null }[];

    const row = rows[0];
    if (!row) return null;

    return {
      worldId: asWorldId(row.world_id),
      compositionId,
      kind: row.kind as CompositionKind,
      name: row.name,
      cards: await this.#cardsOf(this.#sql, compositionId)
    };
  }

  async createBoard(input: CreateBoardInput): Promise<CompositionSummary> {
    return await this.#tx(async (tx) => {
      const worlds = (await tx`
        select id from worlds where id = ${input.worldId}
      `) as unknown as { id: string }[];
      if (!worlds[0]) throw new Error("createBoard: world does not exist");

      await tx`
        insert into compositions (id, world_id, kind, name, version, created_at)
        values (${input.compositionId}, ${input.worldId}, 'board', ${input.name}, 1, ${now()})
      `;

      return {
        compositionId: input.compositionId,
        kind: "board" as const,
        name: input.name,
        cardCount: 0
      };
    });
  }

  async referenceObjects(
    input: ReferenceObjectsInput
  ): Promise<WriteResult<readonly DeskCard[]>> {
    if (input.placements.length === 0) return ok([]);

    return await this.#tx(async (tx) => {
      const worldId = await this.#lockComposition(tx, input.compositionId);
      if (!worldId) return missing<readonly DeskCard[]>();

      // Validate the whole batch before writing any of it. The SQLite original
      // checked each placement as it inserted, so a mixed batch could refuse
      // halfway and still commit what it had already placed — a partial
      // application of one gesture, which is what the change-set invariant
      // exists to forbid.
      const objectIds = input.placements.map((p) => p.objectId);
      const objects = (await tx`
        select id, world_id, lifecycle
          from world_objects
         where id = any(${objectIds}::uuid[])
      `) as unknown as { id: string; world_id: string; lifecycle: string }[];

      const byId = new Map(objects.map((o) => [o.id, o]));
      for (const placement of input.placements) {
        const object = byId.get(placement.objectId);
        // An object may only be referenced by compositions of its own world.
        // This is the tenancy seam: it is checked here, in the store, not in
        // the caller that happens to know both ids.
        if (!object || object.world_id !== worldId) {
          return missing<readonly DeskCard[]>();
        }
      }

      let z = await this.#maxZ(tx, input.compositionId);
      const placed: DeskCard[] = [];

      for (const placement of input.placements) {
        if (byId.get(placement.objectId)?.lifecycle !== "active") continue;

        // Already on this composition: referencing it again is a no-op that
        // returns what is already there, so a repeated gesture is harmless.
        // The composition lock above is what stops this racing into a unique
        // violation on `composition_items_one_active_reference`.
        const existing = (await tx`
          ${cardSelect(tx)}
            and ci.composition_id = ${input.compositionId}
            and ci.object_id = ${placement.objectId}
        `) as unknown as CardRow[];
        if (existing[0]) {
          placed.push(toDeskCard(existing[0]));
          continue;
        }

        await tx`
          insert into composition_items
            (id, composition_id, object_id, x, y, width, height, z, version, lifecycle)
          values (
            ${placement.cardId}, ${input.compositionId}, ${placement.objectId},
            ${placement.layout.x}, ${placement.layout.y},
            ${placement.layout.width}, ${placement.layout.height},
            ${++z}, 1, 'active'
          )
        `;

        const row = await this.#cardById(tx, input.compositionId, placement.cardId);
        if (!row) throw new Error("referenceObjects: card vanished inside its own transaction");
        placed.push(toDeskCard(row));
      }

      return ok<readonly DeskCard[]>(placed);
    });
  }

  async captureCard(input: CaptureCardInput): Promise<DeskCard> {
    const timestamp = now();

    return await this.#tx(async (tx) => {
      const worldId = await this.#lockComposition(tx, input.compositionId);
      if (!worldId) throw new Error("captureCard: composition does not exist");

      await tx`
        insert into world_objects
          (id, world_id, lifecycle, version, created_at,
           creation_kind, creation_author, creation_recorded_at)
        values (${input.objectId}, ${worldId}, 'active', 1, ${timestamp},
                'gm_capture', 'gm', ${timestamp})
      `;

      // Captured thought is unresolved, so it is Pencil. Nothing on this path
      // may write 'ink'.
      await tx`
        insert into fragments (id, object_id, body, truth_state, version, updated_at)
        values (${randomUUID()}, ${input.objectId}, ${input.body}, 'pencil', 1, ${timestamp})
      `;

      const z = (await this.#maxZ(tx, input.compositionId)) + 1;

      await tx`
        insert into composition_items
          (id, composition_id, object_id, x, y, width, height, z, version, lifecycle)
        values (
          ${input.cardId}, ${input.compositionId}, ${input.objectId},
          ${input.layout.x}, ${input.layout.y},
          ${input.layout.width}, ${input.layout.height},
          ${z}, 1, 'active'
        )
      `;

      const row = await this.#cardById(tx, input.compositionId, input.cardId);
      if (!row) throw new Error("captureCard: card vanished inside its own transaction");
      return toDeskCard(row);
    });
  }

  async editCardBody(input: EditBodyInput): Promise<WriteResult<DeskCard>> {
    return await this.#tx(async (tx) => {
      // The Fragment is world truth, reachable from every composition that
      // references the object, so the lock belongs on `f` — not on the card
      // that happens to be the way in.
      const locked = (await tx`
        ${cardSelect(tx)}
          and ci.composition_id = ${input.compositionId}
          and ci.id = ${input.cardId}
        for no key update of f
      `) as unknown as CardRow[];

      const row = locked[0];
      if (!row) return missing<DeskCard>();
      if (row.body_version !== input.observedBodyVersion) {
        return conflict<DeskCard>(await this.#cardsOf(tx, input.compositionId));
      }

      // Keyed on the object, not the card. This is what makes an edit through
      // any composition an edit of the one Fragment.
      await tx`
        update fragments
           set body = ${input.body}, version = version + 1, updated_at = ${now()}
         where object_id = ${row.object_id}
      `;

      const after = await this.#cardById(tx, input.compositionId, input.cardId);
      if (!after) throw new Error("editCardBody: card vanished inside its own transaction");
      return ok(toDeskCard(after));
    });
  }

  async moveCards(input: MoveCardsInput): Promise<WriteResult<readonly DeskCard[]>> {
    if (input.moves.length === 0) return ok([]);

    const ids = [...new Set(input.moves.map((m) => m.cardId))].sort();

    return await this.#tx(async (tx) => {
      // Take the locks in one dedicated single-table statement, in primary-key
      // order, before reading anything. `order by` in the same query as
      // `for ... update` does not guarantee acquisition order — where the
      // LockRows node sits relative to the sort is a planner decision. On this
      // shape the plan is unambiguously an index scan in id order, so two
      // overlapping gestures queue rather than deadlock.
      await tx`
        select id from composition_items
         where id = any(${ids}::uuid[])
         order by id
         for no key update
      `;

      const locked = (await tx`
        ${cardSelect(tx)}
          and ci.composition_id = ${input.compositionId}
          and ci.id = any(${ids}::uuid[])
      `) as unknown as CardRow[];

      const rows = new Map(locked.map((row) => [row.card_id, row]));

      let stale = false;
      for (const move of input.moves) {
        const row = rows.get(move.cardId);
        if (!row) return missing<readonly DeskCard[]>();
        if (row.card_version !== move.observedCardVersion) stale = true;
      }

      // One intent, one change set: if any card in the gesture is stale the
      // whole move is refused rather than half-applied.
      if (stale) {
        return conflict<readonly DeskCard[]>(await this.#cardsOf(tx, input.compositionId));
      }

      let z = input.bringToFront ? await this.#maxZ(tx, input.compositionId) : 0;

      for (const move of input.moves) {
        await tx`
          update composition_items
             set x = ${move.x}, y = ${move.y}, version = version + 1
           where id = ${move.cardId}
        `;
        if (input.bringToFront) {
          // A separate statement that deliberately does not bump `version`:
          // raising a card is part of the same gesture as moving it, so it is
          // one version bump per card, not two.
          await tx`
            update composition_items set z = ${++z} where id = ${move.cardId}
          `;
        }
      }

      const moved: DeskCard[] = [];
      for (const move of input.moves) {
        const row = await this.#cardById(tx, input.compositionId, move.cardId);
        if (row) moved.push(toDeskCard(row));
      }
      return ok<readonly DeskCard[]>(moved);
    });
  }

  async removeCards(input: RemoveCardsInput): Promise<WriteResult<readonly CardId[]>> {
    if (input.cardIds.length === 0) return ok([]);

    // Sorted so two concurrent removals cannot take the same locks in
    // opposite orders.
    const ids = [...new Set(input.cardIds)].sort();

    return await this.#tx(async (tx) => {
      const removed: CardId[] = [];

      for (const cardId of ids) {
        const row = await this.#cardById(tx, input.compositionId, cardId);
        if (!row) continue;

        await tx`
          update composition_items
             set lifecycle = 'deleted', version = version + 1
           where id = ${cardId}
        `;
        removed.push(asCardId(cardId));

        // Lock the object *before* counting. The archival decision spans every
        // composition, so a per-composition lock cannot cover it: two removals
        // of the last two references, on different Boards, would each see one
        // reference remaining and neither would archive. Holding the object row
        // makes the count trustworthy — a blocked writer re-reads on a fresh
        // snapshot once it acquires, and sees the other's committed delete.
        await tx`
          select id from world_objects where id = ${row.object_id} for no key update
        `;

        // The object outlives the card unless this was its last reference —
        // anywhere, not merely on this composition.
        const remaining = (await tx`
          select count(*)::int as n
            from composition_items
           where object_id = ${row.object_id} and lifecycle = 'active'
        `) as unknown as { n: number }[];

        if ((remaining[0]?.n ?? 0) === 0) {
          await tx`
            update world_objects
               set lifecycle = 'archived', version = version + 1
             where id = ${row.object_id}
          `;
        }
      }

      return ok<readonly CardId[]>(removed);
    });
  }
}
