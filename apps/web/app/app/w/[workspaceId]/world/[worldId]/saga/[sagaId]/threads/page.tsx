import Link from "next/link";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { ThreadList } from "@/components/ThreadList";
import { getEntityList, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

export default async function ThreadsPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ workspace, world, saga }, allThreads] = await Promise.all([
    requireSagaContext(ids),
    getEntityList(ids, "thread", false),
  ]);
  const root = sagaPath(ids);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="threads">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="threads" size={12} /> Continuity spine</div>
          <div className="page-title">Threads</div>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ink" href={`${root}/entities/new?type=thread`}>
            <RelicIcon name="plus" size={13} /> New thread
          </Link>
        </div>
      </div>

      <div className="threads-layout">
        {/* Left — thread list */}
        <div className="card tl-card">
          <div className="tl-filters"><span className="tf-btn active">All ({allThreads.length})</span><span className="tf-btn">Active + Loose</span><span className="tf-btn">Failed</span><span className="tf-btn">Resolved</span></div>
          <ThreadList params={ids} threads={allThreads} />

          {allThreads.length === 0 && (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <div className="empty-title">No threads yet</div>
              <div className="empty-desc">Threads track story arcs, quests, and ongoing tensions.</div>
            </div>
          )}
        </div>

        {/* Right — read-only timeline note */}
        <div className="card td-card">
          <div className="td-eyebrow"><RelicIcon name="clock" size={11} /> Thread Timeline</div>
          <div className="td-title">Read-only · MVP</div>
          <div className="td-summary">
            Full graph and writable timeline editors ship in V1. Select a thread from the list to view its objectives.
          </div>
          <div className="td-sep" />
          <div className="td-section-label">Overview</div>
          {allThreads.slice(0, 6).map((thread) => (
            <div key={thread.id} className="obj-row">
              <span className="obj-num" style={{ color: "var(--stone-400)" }}>◈</span>
              <Link href={`${root}/threads/${thread.id}`} className="obj-text" style={{ textDecoration: "none" }}>
                {thread.name}
              </Link>
              <span className={`t-chip ${thread.status ?? "dormant"}`} style={{ fontSize: 7 }}>
                {thread.status || "dormant"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SanctumShell>
  );
}
