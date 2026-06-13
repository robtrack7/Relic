import { notFound, redirect } from "next/navigation";
import { getBootstrapContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";

export default async function WorkspaceSettingsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const ids = await params;
  const context = await getBootstrapContext();
  if (context.workspace?.id !== ids.workspaceId || !context.world || !context.saga) {
    notFound();
  }
  redirect(`${sagaPath({ workspaceId: context.workspace.id, worldId: context.world.id, sagaId: context.saga.id })}/settings#workspace`);
}
