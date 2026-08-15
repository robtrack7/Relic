import postgres from "postgres";

/**
 * The one Postgres connection pool for the running app.
 *
 * Cached on `globalThis` rather than a module-level `let`, because Next's dev
 * server re-evaluates modules on hot reload. A module-level pool would leak a
 * fresh set of connections on every edit until Postgres refused new ones.
 */

const CACHE = Symbol.for("relic.db");

type Cache = { sql: postgres.Sql | null };

const cache: Cache = ((globalThis as Record<symbol, unknown>)[CACHE] as Cache) ?? { sql: null };
(globalThis as Record<symbol, unknown>)[CACHE] = cache;

/**
 * The local Supabase stack's database.
 *
 * Port 54422, not the CLI's default 54322: V1's local stack occupies the whole
 * 543xx block on this machine, so V2 takes 544xx. See `supabase/config.toml`.
 */
const LOCAL_DEFAULT = "postgresql://postgres:postgres@127.0.0.1:54422/postgres";

function connectionString(): string {
  const configured = process.env.DATABASE_URL?.trim();
  if (configured) return configured;

  // Production must be explicit; falling back to a local default there would
  // fail in a way that looks like an empty world rather than a broken config.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is not set. Relic cannot reach its world. See .env.example."
    );
  }
  return LOCAL_DEFAULT;
}

export function db(): postgres.Sql {
  if (cache.sql) return cache.sql;
  // Layout is `double precision` and versions are `integer`, so every value
  // that crosses the port arrives as a JS number. No timestamp is returned by
  // any repository method, so date parsing never comes up.
  cache.sql = postgres(connectionString(), {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10
  });
  return cache.sql;
}

/** Closes the pool. Tests use this; the app never does. */
export async function closeDb(): Promise<void> {
  if (!cache.sql) return;
  const sql = cache.sql;
  cache.sql = null;
  await sql.end({ timeout: 5 });
}
