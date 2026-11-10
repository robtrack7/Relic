import { notFound } from "next/navigation";

import { DeskSurface } from "@/components/desk/desk-surface";
import { asCompositionId } from "@/lib/world/model";
import { deskRepository } from "@/lib/world/store";

export const dynamic = "force-dynamic";

/**
 * Any composition of a world other than its Desk — a Board, or the Prep of a
 * session.
 *
 * It renders through exactly the same surface as the Desk, because it *is* the
 * same kind of thing: references plus layout over shared world material. Prep
 * is not an exception to that; it is a composition whose session gives it a
 * running order, and the rail draws that beside the same canvas rather than in
 * place of it. Narrowing Prep into Stage is a further view of this composition,
 * never a copy of it.
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

  // Null for the Desk and for every Board, which is the same answer the surface
  // needs: draw no rail.
  const [workspace, prep] = await Promise.all([
    repository.openWorld(view.worldId),
    view.kind === "prep" ? repository.openPrep(view.compositionId) : Promise.resolve(null)
  ]);

  return (
    <DeskSurface
      key={view.compositionId}
      workspace={workspace}
      initial={view}
      prep={prep}
    />
  );
}
