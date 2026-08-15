import { notFound } from "next/navigation";

import { DeskSurface } from "@/components/desk/desk-surface";
import { asCompositionId } from "@/lib/world/model";
import { deskRepository } from "@/lib/world/sqlite-store";

export const dynamic = "force-dynamic";

/**
 * Any composition of a world other than its Desk — today, a Board.
 *
 * It renders through exactly the same surface as the Desk, because it *is* the
 * same kind of thing: references plus layout over shared world material.
 */
export default async function CompositionPage({
  params
}: {
  params: Promise<{ compositionId: string }>;
}) {
  const { compositionId } = await params;
  const repository = deskRepository();

  const view = await repository.openComposition(asCompositionId(compositionId));
  if (!view) notFound();

  const workspace = await repository.openWorld(view.worldId);

  return <DeskSurface key={view.compositionId} workspace={workspace} initial={view} />;
}
