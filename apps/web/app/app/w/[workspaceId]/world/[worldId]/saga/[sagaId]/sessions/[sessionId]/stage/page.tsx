import { notFound } from "next/navigation";
import { StageRuntimeDraft } from "@/components/relic-draft/StageRuntimeDraft";
import { getActiveThreads, getPinnedEntities, getSession, requireSagaContext, searchForUi } from "@/lib/data";
import type { IdParams } from "@/lib/types";

type StageParams = IdParams & { sessionId: string };

export default async function StagePage({ params, searchParams }: { params: Promise<StageParams>; searchParams: Promise<{ q?: string }> }) {
  const all = await params;
  const ids: IdParams = all;
  const query = await searchParams;
  const [{ saga }, session, pinned, activeThreads, results] = await Promise.all([
    requireSagaContext(ids),
    getSession(ids, all.sessionId),
    getPinnedEntities(ids, all.sessionId),
    getActiveThreads(ids, all.sessionId),
    searchForUi(ids, query.q ?? "", true)
  ]);
  if (!session) notFound();

  return (
    <StageRuntimeDraft
      params={ids}
      saga={saga}
      session={session}
      pinned={pinned}
      activeThreads={activeThreads}
      results={results}
      query={query.q ?? ""}
    />
  );
}
