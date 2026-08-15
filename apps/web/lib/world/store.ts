import { db } from "@/lib/world/db";
import { PostgresDeskRepository } from "@/lib/world/postgres-store";
import type { DeskRepository } from "@/lib/world/repository";

/**
 * How the app gets at the world.
 *
 * The return type is the port, not the implementation. Everything above this
 * line knows only `DeskRepository`, which is what lets the storage underneath
 * change without the app noticing — as it just did.
 *
 * Never call this at module scope. `next build` imports route modules, and a
 * connection opened during the build is a connection opened on a machine that
 * has no database.
 */
export function deskRepository(): DeskRepository {
  return PostgresDeskRepository.open(db());
}
