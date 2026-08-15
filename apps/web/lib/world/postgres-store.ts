import { randomUUID } from "node:crypto";

import type postgres from "postgres";

import { db } from "@/lib/world/db";
import {
  asCardId,
  asClaimId,
  asCompositionId,
  asRepresentationId,
  asTemplateId,
  asWorldId,
  asWorldObjectId,
  type AuthorKind,
  type CardId,
  type Claim,
  type ClaimId,
  type CompositionId,
  type CompositionKind,
  type CompositionSummary,
  type DeskCard,
  type DeskView,
  type Lifecycle,
  type Link,
  type ObjectRef,
  type ProvenanceKind,
  type Representation,
  type RepresentationKind,
  type StoryPosition,
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
  type EditRepresentationInput,
  type MoveCardsInput,
  type ReferenceObjectsInput,
  type RemoveCardsInput,
  type RemoveClaimInput,
  type RepresentObjectInput,
  type SearchObjectsInput,
  type SetClaimInput,
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

type RepresentationRow = {
  id: string;
  object_id: string;
  kind: string;
  label: string | null;
  template_id: string | null;
  fields: Record<string, string | number>;
  version: number;
};

type ClaimRow = {
  id: string;
  subject_id: string;
  claim_kind: string;
  value: string;
  object_value: string | null;
  truth_state: string;
  authored_by: string;
  provenance: string;
  recorded_at: string | Date;
  story_order: string | number | null;
  story_precision: string;
  story_label: string | null;
  version: number;
};

const claimColumns = (sql: Sql) => sql`
  id, subject_id, claim_kind, value, object_value, truth_state, authored_by,
  provenance, recorded_at, story_order, story_precision, story_label, version
`;

type ObjectRefRow = {
  id: string;
  kind: string | null;
  label: string | null;
  body: string | null;
};

/**
 * What an object is *called*, which is not stored anywhere as such.
 *
 * A name lives on a representation, and an object that has not been deepened
 * into anything has no name — only the thought it was captured as. The fallback
 * is the same one the card uses, stated here so an object with no card on this
 * composition still reads as something.
 */
const objectRefSelect = (sql: Sql) => sql`
  select wo.id as id, r.kind as kind, r.label as label, f.body as body
    from world_objects wo
    left join fragments f on f.object_id = wo.id
    left join lateral (
      select kind, label
        from representations
       where object_id = wo.id and lifecycle = 'active'
       order by seq asc
       limit 1
    ) r on true
   where wo.lifecycle = 'active'
`;

function toObjectRef(row: ObjectRefRow): ObjectRef {
  const named = row.label?.trim() ?? "";
  const firstLine = (row.body ?? "").trim().split("\n")[0]?.trim() ?? "";
  return {
    objectId: asWorldObjectId(row.id),
    label: named !== "" ? named : firstLine !== "" ? firstLine : "Unnamed",
    kind: (row.kind as RepresentationKind | null) ?? null
  };
}

function toRepresentation(row: RepresentationRow): Representation {
  return {
    id: asRepresentationId(row.id),
    objectId: asWorldObjectId(row.object_id),
    kind: row.kind as RepresentationKind,
    label: row.label,
    templateId: row.template_id ? asTemplateId(row.template_id) : null,
    fields: row.fields ?? {},
    version: row.version
  };
}

function toClaim(row: ClaimRow): Claim {
  return {
    id: asClaimId(row.id),
    subjectId: asWorldObjectId(row.subject_id),
    claimKind: row.claim_kind,
    value: row.value,
    objectValue: row.object_value === null ? null : asWorldObjectId(row.object_value),
    truthState: row.truth_state as TruthState,
    provenance: {
      kind: row.provenance as ProvenanceKind,
      authoredBy: row.authored_by as AuthorKind,
      recordedAt:
        row.recorded_at instanceof Date
          ? row.recorded_at.toISOString()
          : String(row.recorded_at)
    },
    story: {
      // bigint arrives as a string from postgres.js; the ordering axis is a
      // number to everything above the store.
      order: row.story_order === null ? null : Number(row.story_order),
      precision: row.story_precision as StoryPosition["precision"],
      label: row.story_label
    },
    version: row.version
  };
}

function toDeskCard(
  row: CardRow,
  representation: Representation | null,
  claims: readonly Claim[],
  links: readonly Link[]
): DeskCard {
  return {
    cardId: asCardId(row.card_id),
    objectId: asWorldObjectId(row.object_id),
    layout: { x: row.x, y: row.y, width: row.width, height: row.height },
    z: row.z,
    body: row.body,
    truthState: row.truth_state as TruthState,
    cardVersion: row.card_version,
    bodyVersion: row.body_version,
    representation,
    claims,
    links
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

  /**
   * Attaches each object's representation, claims, and neighbourhood.
   *
   * A fixed number of queries for the whole composition rather than a few per
   * card. The same object referenced from several cards is fetched once and
   * shared, which is the read-side shape of "one identity, many placements".
   */
  async #hydrate(sql: Sql, rows: readonly CardRow[]): Promise<DeskCard[]> {
    if (rows.length === 0) return [];

    const objectIds = [...new Set(rows.map((row) => row.object_id))];

    const representationRows = (await sql`
      select id, object_id, kind, label, template_id, fields, version
        from representations
       where object_id = any(${objectIds}::uuid[]) and lifecycle = 'active'
       order by object_id, seq asc
    `) as unknown as RepresentationRow[];

    const claimRows = (await sql`
      select ${claimColumns(sql)}
        from claims
       where subject_id = any(${objectIds}::uuid[]) and lifecycle = 'active'
       order by subject_id, claim_kind, story_order asc nulls first, seq asc
    `) as unknown as ClaimRow[];

    // The inbound half. Asked separately because it is a different question:
    // not "what does this object assert" but "what does the world assert about
    // it", and the answer is not scoped to this composition.
    const inboundRows = (await sql`
      select ${claimColumns(sql)}
        from claims
       where object_value = any(${objectIds}::uuid[]) and lifecycle = 'active'
       order by object_value, claim_kind, seq asc
    `) as unknown as ClaimRow[];

    // An object may hold several kinds at once. The one a card shows is the
    // earliest — the way it was first understood — until something explicitly
    // says otherwise, which is a Focus concern rather than a card one.
    const representations = new Map<string, Representation>();
    for (const row of representationRows) {
      if (!representations.has(row.object_id)) {
        representations.set(row.object_id, toRepresentation(row));
      }
    }

    const claims = new Map<string, Claim[]>();
    for (const row of claimRows) {
      const list = claims.get(row.subject_id) ?? [];
      list.push(toClaim(row));
      claims.set(row.subject_id, list);
    }

    const links = await this.#linksFor(sql, objectIds, claimRows, inboundRows);

    return rows.map((row) =>
      toDeskCard(
        row,
        representations.get(row.object_id) ?? null,
        claims.get(row.object_id) ?? [],
        links.get(row.object_id) ?? []
      )
    );
  }

  /**
   * Resolves both halves of each object's neighbourhood into named ends.
   *
   * The name comes from the object *now*, never from the text stored on the
   * claim: identity is stable and names are not, so renaming Mara renames her
   * everywhere she is referred to. An end that no longer resolves — archived, or
   * cleared by `on delete set null` — drops out rather than dangling; the claim
   * itself survives and still reads as words.
   */
  async #linksFor(
    sql: Sql,
    objectIds: readonly string[],
    outbound: readonly ClaimRow[],
    inbound: readonly ClaimRow[]
  ): Promise<Map<string, Link[]>> {
    const links = new Map<string, Link[]>();

    const relational = outbound.filter((row) => row.object_value !== null);
    if (relational.length === 0 && inbound.length === 0) return links;

    const otherIds = [
      ...new Set([
        ...relational.map((row) => row.object_value as string),
        ...inbound.map((row) => row.subject_id)
      ])
    ].filter((id) => !objectIds.includes(id));

    const known = new Map<string, ObjectRef>();
    if (otherIds.length > 0) {
      const refRows = (await sql`
        ${objectRefSelect(sql)}
          and wo.id = any(${otherIds}::uuid[])
      `) as unknown as ObjectRefRow[];
      for (const row of refRows) known.set(row.id, toObjectRef(row));
    }

    // Ends that are already on this composition are named from what was fetched
    // for them, so a card and the link pointing at it can never disagree.
    const localRefs = (await sql`
      ${objectRefSelect(sql)}
        and wo.id = any(${objectIds}::uuid[])
    `) as unknown as ObjectRefRow[];
    for (const row of localRefs) known.set(row.id, toObjectRef(row));

    const add = (owner: string, link: Link) => {
      const list = links.get(owner) ?? [];
      list.push(link);
      links.set(owner, list);
    };

    for (const row of relational) {
      const other = known.get(row.object_value as string);
      if (!other) continue;
      add(row.subject_id, {
        claimId: asClaimId(row.id),
        claimKind: row.claim_kind,
        direction: "out",
        other,
        truthState: row.truth_state as TruthState
      });
    }

    for (const row of inbound) {
      const other = known.get(row.subject_id);
      if (!other) continue;
      add(row.object_value as string, {
        claimId: asClaimId(row.id),
        claimKind: row.claim_kind,
        direction: "in",
        other,
        truthState: row.truth_state as TruthState
      });
    }

    return links;
  }

  async #hydrateOne(sql: Sql, row: CardRow): Promise<DeskCard> {
    const [card] = await this.#hydrate(sql, [row]);
    if (!card) throw new Error("hydrate: a card resolved to nothing");
    return card;
  }

  async #cardsOf(sql: Sql, compositionId: CompositionId): Promise<DeskCard[]> {
    const rows = (await sql`
      ${cardSelect(sql)}
        and ci.composition_id = ${compositionId}
      order by ci.z asc, ci.seq asc
    `) as unknown as CardRow[];
    return await this.#hydrate(sql, rows);
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
          placed.push(await this.#hydrateOne(tx, existing[0]));
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
        placed.push(await this.#hydrateOne(tx, row));
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
      return await this.#hydrateOne(tx, row);
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
      return ok(await this.#hydrateOne(tx, after));
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
        if (row) moved.push(await this.#hydrateOne(tx, row));
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

  // Representations and claims ---------------------------------------------

  async representObject(
    input: RepresentObjectInput
  ): Promise<WriteResult<Representation>> {
    return await this.#tx(async (tx) => {
      // Lock the identity, not a card. Deepening is an act on the object, and
      // every composition referencing it sees the result.
      const objects = (await tx`
        select id from world_objects
         where id = ${input.objectId} and lifecycle = 'active'
         for no key update
      `) as unknown as { id: string }[];
      if (!objects[0]) return missing<Representation>();

      // Idempotent: asking for a kind the object already has returns what is
      // there, so a repeated gesture is harmless.
      const existing = (await tx`
        select id, object_id, kind, label, template_id, fields, version
          from representations
         where object_id = ${input.objectId}
           and kind = ${input.kind}
           and lifecycle = 'active'
      `) as unknown as RepresentationRow[];
      if (existing[0]) return ok(toRepresentation(existing[0]));

      const inserted = (await tx`
        insert into representations (id, object_id, kind, label, fields, version, lifecycle, created_at)
        values (${input.representationId}, ${input.objectId}, ${input.kind},
                ${input.label}, '{}'::jsonb, 1, 'active', ${now()})
        returning id, object_id, kind, label, template_id, fields, version
      `) as unknown as RepresentationRow[];

      const row = inserted[0];
      if (!row) throw new Error("representObject: representation vanished inside its own transaction");
      return ok(toRepresentation(row));
    });
  }

  async editRepresentation(
    input: EditRepresentationInput
  ): Promise<WriteResult<Representation>> {
    return await this.#tx(async (tx) => {
      const locked = (await tx`
        select id, object_id, kind, label, template_id, fields, version
          from representations
         where id = ${input.representationId} and lifecycle = 'active'
         for no key update
      `) as unknown as RepresentationRow[];

      const row = locked[0];
      if (!row) return missing<Representation>();
      if (row.version !== input.observedVersion) {
        return conflict<Representation>([]);
      }

      const updated = (await tx`
        update representations
           set label = ${input.label},
               -- Cast through text deliberately: handed a bare string,
               -- postgres.js encodes it as a jsonb string rather than parsing
               -- it, and the object check would reject that.
               fields = ${JSON.stringify(input.fields)}::text::jsonb,
               version = version + 1
         where id = ${input.representationId}
        returning id, object_id, kind, label, template_id, fields, version
      `) as unknown as RepresentationRow[];

      const after = updated[0];
      if (!after) throw new Error("editRepresentation: representation vanished inside its own transaction");
      return ok(toRepresentation(after));
    });
  }

  async setClaim(input: SetClaimInput): Promise<WriteResult<Claim>> {
    return await this.#tx(async (tx) => {
      const target = input.objectValue ?? null;

      /*
       * Both ends are locked, in ascending id order — the global rule for
       * `world_objects`, and the only thing standing between two overlapping
       * relationship assertions and a deadlock.
       *
       * The foreign key would catch an id that never existed. It would not
       * catch one that has been archived, nor one belonging to another world,
       * so both are checked here. A relationship crossing worlds is refused for
       * exactly the reason `referenceObjects` refuses a cross-world placement:
       * the seam belongs in the store, not in whichever caller happened to hold
       * both ids.
       */
      // Deduplicated before it is counted. A self-edge would otherwise lock one
      // row, count two, and be reported as `missing` — which would be a lie
      // about an object that is plainly there. It is refused by the database
      // constraint instead, because a caller sending one has a bug rather than
      // an outcome.
      const ids = [
        ...new Set(target === null ? [input.subjectId as string] : [input.subjectId as string, target as string])
      ].sort();

      const objects = (await tx`
        select id, world_id from world_objects
         where id = any(${ids}::uuid[]) and lifecycle = 'active'
         order by id
         for no key update
      `) as unknown as { id: string; world_id: string }[];

      if (objects.length !== ids.length) return missing<Claim>();
      if (new Set(objects.map((row) => row.world_id)).size > 1) return missing<Claim>();

      const story = input.story;

      // With no story position, this is a correction: the GM is fixing what
      // they said, not recording that the world changed. Retire the current
      // claim of this kind rather than accumulating contradictions at the same
      // point in time. Provenance survives — the old row is archived, never
      // deleted.
      //
      // With a story position, append. Mara's allegiance before the cathedral
      // and after it are two claims, both true.
      //
      // A relationship follows the same rule, which makes every relational
      // attribute single-valued: setting Mara's location to the Cathedral
      // retires her location at the Quay, exactly as a text correction would.
      // Multi-valued relationships — an Event's participants, a Faction's
      // members — need a different unit of replacement and are not this slice.
      if (!story) {
        await tx`
          update claims
             set lifecycle = 'archived', version = version + 1
           where subject_id = ${input.subjectId}
             and claim_kind = ${input.claimKind}
             and lifecycle = 'active'
             and story_order is null
        `;
      }

      const inserted = (await tx`
        insert into claims (
          id, subject_id, claim_kind, value, object_value, truth_state,
          authored_by, provenance, recorded_at,
          story_order, story_precision, story_label,
          version, lifecycle
        )
        values (
          ${input.claimId}, ${input.subjectId}, ${input.claimKind}, ${input.value},
          -- A relationship is this column and nothing else. Everything a claim
          -- already carries — truth, provenance, story position — applies to it
          -- unchanged, which is the reason it is not its own table.
          ${target}::uuid,
          -- A claim asserted by hand is not thereby established. Ink is step 10
          -- and needs its own deliberate, previewed action.
          'pencil',
          'gm', 'gm_assertion', ${now()},
          ${story?.order ?? null}, ${story?.precision ?? "unknown"}, ${story?.label ?? null},
          1, 'active'
        )
        returning ${claimColumns(tx)}
      `) as unknown as ClaimRow[];

      const row = inserted[0];
      if (!row) throw new Error("setClaim: claim vanished inside its own transaction");
      return ok(toClaim(row));
    });
  }

  async removeClaim(input: RemoveClaimInput): Promise<WriteResult<ClaimId>> {
    return await this.#tx(async (tx) => {
      const updated = (await tx`
        update claims
           set lifecycle = 'archived', version = version + 1
         where id = ${input.claimId} and lifecycle = 'active'
        returning id
      `) as unknown as { id: string }[];

      const row = updated[0];
      if (!row) return missing<ClaimId>();
      return ok(asClaimId(row.id));
    });
  }

  /**
   * Objects of a world, for choosing the other end of a relationship.
   *
   * Matches on the name and on the captured text, because an object that has
   * not been deepened into anything has no name — and "that thing I wrote about
   * the harbour" has to be findable, or relationships would only ever reach
   * material that had already been classified.
   */
  async searchObjects(input: SearchObjectsInput): Promise<readonly ObjectRef[]> {
    const sql = this.#sql;
    const limit = Math.min(Math.max(Math.trunc(input.limit ?? 8), 1), 50);
    const query = input.query.trim();
    const like = `%${query.replace(/[\\%_]/g, "\\$&")}%`;

    const rows = (await sql`
      ${objectRefSelect(sql)}
        and wo.world_id = ${input.worldId}
        ${input.excludeId ? sql`and wo.id <> ${input.excludeId}` : sql``}
        ${
          query === ""
            ? sql``
            : sql`and (coalesce(r.label, '') ilike ${like} or coalesce(f.body, '') ilike ${like})`
        }
      order by r.label asc nulls last, wo.created_at desc
      limit ${limit}
    `) as unknown as ObjectRefRow[];

    return rows.map(toObjectRef);
  }
}
