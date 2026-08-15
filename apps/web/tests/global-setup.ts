import postgres from "postgres";

/**
 * The store suite runs against a real Postgres now, not an in-process SQLite
 * file, so `pnpm test` is no longer hermetic. That is the price of testing the
 * engine the app actually uses — but an unreachable database should say so,
 * rather than surfacing as a connection stack trace in eighteen tests at once.
 */

const LOCAL_DEFAULT = "postgresql://postgres:postgres@127.0.0.1:54422/postgres";

const TABLES = [
  "worlds",
  "world_objects",
  "fragments",
  "compositions",
  "composition_items"
];

export default async function setup(): Promise<void> {
  const url = process.env.DATABASE_URL?.trim() || LOCAL_DEFAULT;
  const sql = postgres(url, { max: 1, connect_timeout: 5, onnotice: () => {} });

  try {
    const rows = (await sql`
      select table_name from information_schema.tables
       where table_schema = 'public' and table_name = any(${TABLES})
    `) as unknown as { table_name: string }[];

    const found = new Set(rows.map((r) => r.table_name));
    const absent = TABLES.filter((t) => !found.has(t));

    if (absent.length > 0) {
      throw new Error(
        `Relic's schema is not applied (missing: ${absent.join(", ")}).\n` +
          `Run:  npx supabase db reset`
      );
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const unreachable =
      reason.includes("ECONNREFUSED") ||
      reason.includes("connect_timeout") ||
      reason.includes("CONNECT_TIMEOUT");

    throw new Error(
      unreachable
        ? `Cannot reach Relic's database at ${url}.\n` +
          `The local Supabase stack is not running. Start it with:\n` +
          `  npx supabase start`
        : reason
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}
