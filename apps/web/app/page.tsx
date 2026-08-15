import { DeskSurface } from "@/components/desk/desk-surface";
import { asWorldId } from "@/lib/world/model";
import { deskRepository } from "@/lib/world/store";

/**
 * One world, until Relic grows accounts. The Desk is the world's home
 * composition; Boards are siblings of it under /c/[compositionId].
 */
export const SOLE_WORLD = asWorldId("00000000-0000-4000-8000-000000000001");

export const dynamic = "force-dynamic";

export default async function DeskPage() {
  const repository = deskRepository();
  const desk = await repository.openDesk(SOLE_WORLD);
  const workspace = await repository.openWorld(SOLE_WORLD);

  return <DeskSurface workspace={workspace} initial={desk} />;
}
