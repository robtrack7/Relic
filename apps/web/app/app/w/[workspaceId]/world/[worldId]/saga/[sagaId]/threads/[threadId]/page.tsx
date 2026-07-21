import { notFound } from "next/navigation";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { ThreadWorkspace } from "@/components/ThreadWorkspace";
import { getSessions, getThreadDetail, getThreadTimeline, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

type ThreadParams = IdParams & { threadId: string };

export default async function ThreadDetailPage({ params }: { params: Promise<ThreadParams> }) {
  const all = await params;
  const ids: IdParams = all;
  const [{ workspace, world, saga }, detail, timeline, sessions] = await Promise.all([
    requireSagaContext(ids), getThreadDetail(ids, all.threadId), getThreadTimeline(ids, all.threadId), getSessions(ids),
  ]);
  if (!detail) notFound();
  return <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="threads">
    <div className="page-head">
      <div><div className="page-eyebrow"><RelicIcon name="threads" size={12} /> Thread continuity</div><h1 className="page-title">{detail.record.name}</h1><div className="page-sub">Edit the canonical Thread; its timeline remains derived and read-only.</div></div>
      <div className="page-actions"><span className={`t-chip ${detail.record.status}`}>{detail.record.status}</span></div>
    </div>
    <ThreadWorkspace params={ids} initialDetail={detail} initialTimeline={timeline} sessions={sessions} />
  </SanctumShell>;
}
