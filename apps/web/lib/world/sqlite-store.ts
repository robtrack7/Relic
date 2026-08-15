import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

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
 * Local SQLite implementation of `DeskRepository`, for development.
 *
 * The schema is the world model made literal, and the split is the point:
 * `composition_items` holds placement and nothing else, `fragments` holds body
 * text and nothing else. There is no column on a composition item that could
 * hold world truth, so a Board cannot accidentally start owning one.
 */

const SCHEMA = `
pragma journal_mode = wal;
pragma foreign_keys = on;

create table if not exists worlds (
  id          text primary key,
  name        text,
  created_at  text not null
);

create table if not exists world_objects (
  id                    text primary key,
  world_id              text not null references worlds(id) on delete cascade,
  lifecycle             text not null default 'active',
  version               integer not null default 1,
  created_at            text not null,
  creation_kind         text not null,
  creation_author       text not null,
  creation_recorded_at  text not null
);

create table if not exists fragments (
  id           text primary key,
  object_id    text not null unique references world_objects(id) on delete cascade,
  body         text not null,
  truth_state  text not null default 'pencil',
  version      integer not null default 1,
  updated_at   text not null
);

create table if not exists compositions (
  id          text primary key,
  world_id    text not null references worlds(id) on delete cascade,
  kind        text not null,
  name        text,
  version     integer not null default 1,
  created_at  text not null
);

create table if not exists composition_items (
  id              text primary key,
  composition_id  text not null references compositions(id) on delete cascade,
  object_id       text not null references world_objects(id) on delete cascade,
  x               real not null,
  y               real not null,
  width           real not null,
  height          real not null,
  z               integer not null default 0,
  version         integer not null default 1,
  lifecycle       text not null default 'active'
);

create index if not exists composition_items_by_composition
  on composition_items (composition_id, lifecycle, z);

create index if not exists composition_items_by_object
  on composition_items (object_id, lifecycle);

-- One object appears at most once on any one composition. Across compositions
-- it may appear freely — that is the whole point of a reference. Two cards for
-- the same object on the same Board would only make "which one am I editing"
-- ambiguous, and there is nothing to distinguish them by.
create unique index if not exists composition_items_one_active_reference
  on composition_items (composition_id, object_id) where lifecycle = 'active';
`;

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

const CARD_SELECT = `
select
  ci.id       as card_id,
  ci.object_id as object_id,
  ci.x, ci.y, ci.width, ci.height, ci.z,
  ci.version  as card_version,
  f.body      as body,
  f.truth_state as truth_state,
  f.version   as body_version
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

export class SqliteDeskRepository implements DeskRepository {
  readonly #db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.#db = db;
    db.exec(SCHEMA);
  }

  static open(filePath: string): SqliteDeskRepository {
    return new SqliteDeskRepository(new DatabaseSync(filePath));
  }

  close(): void {
    this.#db.close();
  }

  #transaction<T>(work: () => T): T {
    this.#db.exec("begin immediate");
    try {
      const result = work();
      this.#db.exec("commit");
      return result;
    } catch (error) {
      this.#db.exec("rollback");
      throw error;
    }
  }

  #cardsOf(compositionId: CompositionId): DeskCard[] {
    const rows = this.#db
      .prepare(`${CARD_SELECT} and ci.composition_id = ? order by ci.z asc, ci.rowid asc`)
      .all(compositionId) as unknown as CardRow[];
    return rows.map(toDeskCard);
  }

  #cardById(compositionId: CompositionId, cardId: CardId): CardRow | null {
    const row = this.#db
      .prepare(`${CARD_SELECT} and ci.composition_id = ? and ci.id = ?`)
      .get(compositionId, cardId) as unknown as CardRow | undefined;
    return row ?? null;
  }

  /**
   * Lifecycle of an identity, independent of any composition that references
   * it. Removing every card is an archival, not a destruction — this is how you
   * see that the object is still there.
   */
  objectLifecycle(objectId: WorldObjectId): Lifecycle | null {
    const row = this.#db
      .prepare("select lifecycle from world_objects where id = ?")
      .get(objectId) as unknown as { lifecycle: string } | undefined;
    return (row?.lifecycle as Lifecycle) ?? null;
  }

  #maxZ(compositionId: CompositionId): number {
    const row = this.#db
      .prepare(
        "select coalesce(max(z), 0) as top from composition_items where composition_id = ? and lifecycle = 'active'"
      )
      .get(compositionId) as unknown as { top: number } | undefined;
    return row?.top ?? 0;
  }

  /** Creates the world and its Desk on first visit. Idempotent. */
  #ensureDesk(worldId: WorldId): CompositionId {
    return this.#transaction(() => {
      this.#db
        .prepare("insert or ignore into worlds (id, name, created_at) values (?, ?, ?)")
        .run(worldId, "Untitled world", now());

      const existing = this.#db
        .prepare(
          "select id from compositions where world_id = ? and kind = 'desk' order by rowid asc limit 1"
        )
        .get(worldId) as unknown as { id: string } | undefined;

      if (existing) return asCompositionId(existing.id);

      const id = randomUUID();
      this.#db
        .prepare(
          "insert into compositions (id, world_id, kind, name, version, created_at) values (?, ?, 'desk', ?, 1, ?)"
        )
        .run(id, worldId, "Desk", now());
      return asCompositionId(id);
    });
  }

  async openDesk(worldId: WorldId): Promise<DeskView> {
    const compositionId = this.#ensureDesk(worldId);
    return {
      worldId,
      compositionId,
      kind: "desk",
      name: "Desk",
      cards: this.#cardsOf(compositionId)
    };
  }

  async openWorld(worldId: WorldId): Promise<Workspace> {
    this.#ensureDesk(worldId);

    const world = this.#db
      .prepare("select name from worlds where id = ?")
      .get(worldId) as unknown as { name: string | null } | undefined;

    const rows = this.#db
      .prepare(
        `select c.id, c.kind, c.name,
                (select count(*) from composition_items ci
                   join world_objects wo on wo.id = ci.object_id
                  where ci.composition_id = c.id
                    and ci.lifecycle = 'active'
                    and wo.lifecycle = 'active') as card_count
           from compositions c
          where c.world_id = ?
          order by case c.kind when 'desk' then 0 else 1 end, c.rowid asc`
      )
      .all(worldId) as unknown as {
      id: string;
      kind: string;
      name: string | null;
      card_count: number;
    }[];

    return {
      worldId,
      name: world?.name ?? null,
      compositions: rows.map((row) => ({
        compositionId: asCompositionId(row.id),
        kind: row.kind as CompositionKind,
        name: row.name ?? "Untitled",
        cardCount: row.card_count
      }))
    };
  }

  async openComposition(compositionId: CompositionId): Promise<DeskView | null> {
    const row = this.#db
      .prepare("select world_id, kind, name from compositions where id = ?")
      .get(compositionId) as unknown as
      | { world_id: string; kind: string; name: string | null }
      | undefined;
    if (!row) return null;

    return {
      worldId: asWorldId(row.world_id),
      compositionId,
      kind: row.kind as CompositionKind,
      name: row.name,
      cards: this.#cardsOf(compositionId)
    };
  }

  async createBoard(input: CreateBoardInput): Promise<CompositionSummary> {
    return this.#transaction(() => {
      const world = this.#db
        .prepare("select id from worlds where id = ?")
        .get(input.worldId) as unknown as { id: string } | undefined;
      if (!world) throw new Error("createBoard: world does not exist");

      this.#db
        .prepare(
          "insert into compositions (id, world_id, kind, name, version, created_at) values (?, ?, 'board', ?, 1, ?)"
        )
        .run(input.compositionId, input.worldId, input.name, now());

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

    return this.#transaction(() => {
      const target = this.#db
        .prepare("select world_id from compositions where id = ?")
        .get(input.compositionId) as unknown as { world_id: string } | undefined;
      if (!target) return missing<readonly DeskCard[]>();

      let z = this.#maxZ(input.compositionId);
      const placed: DeskCard[] = [];

      for (const placement of input.placements) {
        // An object may only be referenced by compositions of its own world.
        // This is the tenancy seam: it is checked here, in the store, not in
        // the caller that happens to know both ids.
        const object = this.#db
          .prepare("select world_id, lifecycle from world_objects where id = ?")
          .get(placement.objectId) as unknown as
          | { world_id: string; lifecycle: string }
          | undefined;
        if (!object || object.world_id !== target.world_id) {
          return missing<readonly DeskCard[]>();
        }
        if (object.lifecycle !== "active") continue;

        // Already on this composition: referencing it again is a no-op that
        // returns what is already there, so a repeated gesture is harmless.
        const existing = this.#db
          .prepare(
            `${CARD_SELECT} and ci.composition_id = ? and ci.object_id = ?`
          )
          .get(input.compositionId, placement.objectId) as unknown as CardRow | undefined;
        if (existing) {
          placed.push(toDeskCard(existing));
          continue;
        }

        this.#db
          .prepare(
            `insert into composition_items
               (id, composition_id, object_id, x, y, width, height, z, version, lifecycle)
             values (?, ?, ?, ?, ?, ?, ?, ?, 1, 'active')`
          )
          .run(
            placement.cardId,
            input.compositionId,
            placement.objectId,
            placement.layout.x,
            placement.layout.y,
            placement.layout.width,
            placement.layout.height,
            ++z
          );

        const row = this.#cardById(input.compositionId, placement.cardId);
        if (!row) throw new Error("referenceObjects: card vanished inside its own transaction");
        placed.push(toDeskCard(row));
      }

      return ok<readonly DeskCard[]>(placed);
    });
  }

  async captureCard(input: CaptureCardInput): Promise<DeskCard> {
    const timestamp = now();
    return this.#transaction(() => {
      const world = this.#db
        .prepare("select world_id from compositions where id = ?")
        .get(input.compositionId) as unknown as { world_id: string } | undefined;
      if (!world) {
        throw new Error("captureCard: composition does not exist");
      }

      this.#db
        .prepare(
          `insert into world_objects
             (id, world_id, lifecycle, version, created_at, creation_kind, creation_author, creation_recorded_at)
           values (?, ?, 'active', 1, ?, 'gm_capture', 'gm', ?)`
        )
        .run(input.objectId, world.world_id, timestamp, timestamp);

      // Captured thought is unresolved, so it is Pencil. Nothing on this path
      // may write 'ink' — establishing Ink is a separate deliberate action.
      this.#db
        .prepare(
          `insert into fragments (id, object_id, body, truth_state, version, updated_at)
           values (?, ?, ?, 'pencil', 1, ?)`
        )
        .run(randomUUID(), input.objectId, input.body, timestamp);

      const z = this.#maxZ(input.compositionId) + 1;
      this.#db
        .prepare(
          `insert into composition_items
             (id, composition_id, object_id, x, y, width, height, z, version, lifecycle)
           values (?, ?, ?, ?, ?, ?, ?, ?, 1, 'active')`
        )
        .run(
          input.cardId,
          input.compositionId,
          input.objectId,
          input.layout.x,
          input.layout.y,
          input.layout.width,
          input.layout.height,
          z
        );

      const row = this.#cardById(input.compositionId, input.cardId);
      if (!row) throw new Error("captureCard: card vanished inside its own transaction");
      return toDeskCard(row);
    });
  }

  async editCardBody(input: EditBodyInput): Promise<WriteResult<DeskCard>> {
    return this.#transaction(() => {
      const row = this.#cardById(input.compositionId, input.cardId);
      if (!row) return missing<DeskCard>();

      if (row.body_version !== input.observedBodyVersion) {
        return conflict<DeskCard>(this.#cardsOf(input.compositionId));
      }

      this.#db
        .prepare(
          "update fragments set body = ?, version = version + 1, updated_at = ? where object_id = ?"
        )
        .run(input.body, now(), row.object_id);

      const updated = this.#cardById(input.compositionId, input.cardId);
      if (!updated) return missing<DeskCard>();
      return ok(toDeskCard(updated));
    });
  }

  async moveCards(input: MoveCardsInput): Promise<WriteResult<readonly DeskCard[]>> {
    if (input.moves.length === 0) return ok([]);

    return this.#transaction(() => {
      const stale: DeskCard[] = [];
      const rows = new Map<string, CardRow>();

      for (const move of input.moves) {
        const row = this.#cardById(input.compositionId, move.cardId);
        if (!row) return missing<readonly DeskCard[]>();
        if (row.card_version !== move.observedCardVersion) stale.push(toDeskCard(row));
        rows.set(move.cardId, row);
      }

      // One intent, one change set: if any card in the gesture is stale the
      // whole move is refused rather than half-applied.
      if (stale.length > 0) {
        return conflict<readonly DeskCard[]>(this.#cardsOf(input.compositionId));
      }

      let z = input.bringToFront ? this.#maxZ(input.compositionId) : 0;
      const update = this.#db.prepare(
        "update composition_items set x = ?, y = ?, version = version + 1 where id = ?"
      );
      const raise = this.#db.prepare("update composition_items set z = ? where id = ?");

      for (const move of input.moves) {
        update.run(move.x, move.y, move.cardId);
        if (input.bringToFront) raise.run(++z, move.cardId);
      }

      const moved = input.moves
        .map((move) => this.#cardById(input.compositionId, move.cardId))
        .filter((row): row is CardRow => row !== null)
        .map(toDeskCard);

      return ok<readonly DeskCard[]>(moved);
    });
  }

  async removeCards(input: RemoveCardsInput): Promise<WriteResult<readonly CardId[]>> {
    if (input.cardIds.length === 0) return ok([]);

    return this.#transaction(() => {
      const removed: CardId[] = [];

      for (const cardId of input.cardIds) {
        const row = this.#cardById(input.compositionId, cardId);
        if (!row) continue;

        this.#db
          .prepare(
            "update composition_items set lifecycle = 'deleted', version = version + 1 where id = ?"
          )
          .run(cardId);

        // The object outlives the card unless this was its last reference.
        const remaining = this.#db
          .prepare(
            "select count(*) as n from composition_items where object_id = ? and lifecycle = 'active'"
          )
          .get(row.object_id) as unknown as { n: number };

        if (remaining.n === 0) {
          this.#db
            .prepare(
              "update world_objects set lifecycle = 'archived', version = version + 1 where id = ?"
            )
            .run(row.object_id);
        }

        removed.push(asCardId(cardId));
      }

      return ok<readonly CardId[]>(removed);
    });
  }
}

let shared: SqliteDeskRepository | null = null;

/** Process-wide repository for the running app. Tests construct their own. */
export function deskRepository(): SqliteDeskRepository {
  if (shared) return shared;
  const dir = process.env.RELIC_DATA_DIR ?? join(process.cwd(), ".relic-data");
  mkdirSync(dir, { recursive: true });
  shared = SqliteDeskRepository.open(join(dir, "relic.db"));
  return shared;
}
