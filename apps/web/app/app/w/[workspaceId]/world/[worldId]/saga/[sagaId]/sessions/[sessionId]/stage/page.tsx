import { notFound } from "next/navigation";
import { StageRuntimeDraft } from "@/components/relic-draft/StageRuntimeDraft";
import { getActiveThreads, getPinnedEntities, getSession, getStagePacket, requireSagaContext, searchForUi } from "@/lib/data";
import type { IdParams } from "@/lib/types";

type StageParams = IdParams & { sessionId: string };

export default async function StagePage({ params, searchParams }: { params: Promise<StageParams>; searchParams: Promise<{ q?: string }> }) {
  const all = await params;
  const ids: IdParams = all;
  const query = await searchParams;
  const [{ saga, user }, session, packet, pinned, activeThreads, results] = await Promise.all([
    requireSagaContext(ids),
    getSession(ids, all.sessionId),
    getStagePacket(ids, all.sessionId),
    getPinnedEntities(ids, all.sessionId),
    getActiveThreads(ids, all.sessionId),
    searchForUi(ids, query.q ?? "", true, "stage")
  ]);
  if (!session) notFound();

  return (
    <StageRuntimeDraft
      params={ids}
      ownerId={user.id}
      saga={saga}
      session={session}
      packet={packet}
      pinned={pinned}
      activeThreads={activeThreads}
      results={results}
      query={query.q ?? ""}
    />
  );
}
