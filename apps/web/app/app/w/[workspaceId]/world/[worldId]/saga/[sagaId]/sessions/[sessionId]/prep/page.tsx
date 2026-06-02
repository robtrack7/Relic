import { notFound } from "next/navigation";
import { PrepareWorkspaceDraft } from "@/components/relic-draft/PrepareWorkspaceDraft";
import { SanctumShell } from "@/components/SanctumShell";
import { getActiveThreads, getPinnedEntities, getPrepOptions, getSession, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

type SessionParams = IdParams & { sessionId: string };

export default async function PrepPage({ params }: { params: Promise<SessionParams> }) {
  const all = await params;
  const ids: IdParams = all;
  const [{ workspace, world, saga }, session, options, pinned, activeThreads] = await Promise.all([
    requireSagaContext(ids),
    getSession(ids, all.sessionId),
    getPrepOptions(ids),
    getPinnedEntities(ids, all.sessionId),
    getActiveThreads(ids, all.sessionId)
  ]);
  if (!session) notFound();
  const locked = ["in_progress", "ended_pending_undo"].includes(session.status);
  const pinnedKeys = new Set(pinned.map((item) => `${item.pin.entity_type}:${item.pin.entity_id}`));
  const activeThreadIds = new Set(activeThreads.map((thread) => thread?.id).filter((id): id is string => Boolean(id)));

  return (
    <SanctumShell
      params={ids}
      workspace={workspace}
      world={world}
      saga={saga}
      active="prepare"
      currentSession={{ id: session.id, name: session.name, status: session.status }}
      loomMode="prep"
    >
      <PrepareWorkspaceDraft
        params={ids}
        session={session}
        options={options}
        pinnedKeys={pinnedKeys}
        activeThreadIds={activeThreadIds}
        locked={locked}
      />
    </SanctumShell>
  );
}
