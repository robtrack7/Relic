import { DeskSurface } from "@/components/desk/desk-surface";
import { asWorldId } from "@/lib/world/model";
import { deskRepository } from "@/lib/world/sqlite-store";

/**
 * Relic has one world until it has accounts. When multi-tenancy arrives this
 * becomes a route parameter resolved against the authenticated actor — the
 * repository already takes the world as an argument for exactly that reason.
 */
const SOLE_WORLD = asWorldId("00000000-0000-4000-8000-000000000001");

export const dynamic = "force-dynamic";

export default async function DeskPage() {
  const desk = await deskRepository().openDesk(SOLE_WORLD);
  return <DeskSurface initial={desk} />;
}
