import { redirect } from "next/navigation";
import { getBootstrapContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";

export default async function BootstrapPage() {
  const context = await getBootstrapContext();
  if (context.needs_new_saga || !context.workspace || !context.world || !context.saga) {
    redirect("/app/new-saga");
  }
  redirect(sagaPath({
    workspaceId: context.workspace.id,
    worldId: context.world.id,
    sagaId: context.saga.id
  }));
}
