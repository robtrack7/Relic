import { SanctumDashboardDraft } from "@/components/relic-draft/SanctumDashboardDraft";
import { SanctumShell } from "@/components/SanctumShell";
import { getEntityList, getPendingDrafts, getRecentEntities, getSessions, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

export default async function SagaHomePage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ workspace, world, saga }, sessions, recentEntities, threads, drafts] = await Promise.all([
    requireSagaContext(ids),
    getSessions(ids),
    getRecentEntities(ids),
    getEntityList(ids, "thread"),
    getPendingDrafts(ids)
  ]);
  const activeSession = sessions.find((session) => ["planned", "ready", "started", "in_progress", "ended_pending_undo"].includes(session.status));
  const reviewCount = drafts.filter((draft) => draft.state === "pending").length;

  return (
    <SanctumShell
      params={ids}
      workspace={workspace}
      world={world}
      saga={saga}
      active="home"
      currentSession={activeSession ? { id: activeSession.id, name: activeSession.name, status: activeSession.status } : null}
      reviewCount={reviewCount}
    >
      <SanctumDashboardDraft
        params={ids}
        saga={saga}
        activeSession={activeSession ?? null}
        threads={threads}
        recentEntities={recentEntities}
        reviewCount={reviewCount}
      />
    </SanctumShell>
  );
}
