import { notFound, redirect } from "next/navigation";
import { getBootstrapContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";

export default async function WorldSettingsPage({ params }: { params: Promise<{ workspaceId: string; worldId: string }> }) {
  const ids = await params;
  const context = await getBootstrapContext();
  if (context.workspace?.id !== ids.workspaceId || context.world?.id !== ids.worldId || !context.saga) {
    notFound();
  }
  redirect(`${sagaPath({ workspaceId: context.workspace.id, worldId: context.world.id, sagaId: context.saga.id })}/settings#world`);
}
