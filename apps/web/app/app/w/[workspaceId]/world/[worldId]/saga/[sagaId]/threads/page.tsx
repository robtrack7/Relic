import Link from "next/link";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { getEntityList, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

function threadChipClass(status?: string) {
  if (status === "active") return "t-chip active";
  if (status === "loose") return "t-chip loose";
  if (status === "resolved") return "t-chip resolved";
  return "t-chip dormant";
}

export default async function ThreadsPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ workspace, world, saga }, allThreads] = await Promise.all([
    requireSagaContext(ids),
    getEntityList(ids, "thread", false),
  ]);
  const root = sagaPath(ids);

  const active = allThreads.filter((t) => t.status === "active");
  const loose = allThreads.filter((t) => t.status === "loose");
  const dormant = allThreads.filter((t) => !t.status || (t.status !== "active" && t.status !== "loose" && t.status !== "resolved"));
  const resolved = allThreads.filter((t) => t.status === "resolved");

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
          <div className="tl-filters">
            <span className="tf-btn active">All ({allThreads.length})</span>
            <span className="tf-btn">Active ({active.length})</span>
            <span className="tf-btn">Loose ({loose.length})</span>
            <span className="tf-btn">Dormant ({dormant.length})</span>
            <span className="tf-btn">Resolved ({resolved.length})</span>
          </div>

          {active.length > 0 && (
            <>
              <div className="tl-group-label">Active</div>
              {active.map((thread) => (
                <Link key={thread.id} href={`${root}/threads/${thread.id}`} className="tl-row" style={{ textDecoration: "none" }}>
                  <span className={threadChipClass(thread.status)}>{thread.status || "active"}</span>
                  <span className="t-name">{thread.name}</span>
                </Link>
              ))}
            </>
          )}

          {loose.length > 0 && (
            <>
              <div className="tl-group-label">Loose</div>
              {loose.map((thread) => (
                <Link key={thread.id} href={`${root}/threads/${thread.id}`} className="tl-row" style={{ textDecoration: "none" }}>
                  <span className={threadChipClass(thread.status)}>{thread.status}</span>
                  <span className="t-name">{thread.name}</span>
                </Link>
              ))}
            </>
          )}

          {dormant.length > 0 && (
            <>
              <div className="tl-group-label">Dormant</div>
              {dormant.map((thread) => (
                <Link key={thread.id} href={`${root}/threads/${thread.id}`} className="tl-row" style={{ textDecoration: "none" }}>
                  <span className={threadChipClass(thread.status)}>dormant</span>
                  <span className="t-name">{thread.name}</span>
                </Link>
              ))}
            </>
          )}

          {resolved.length > 0 && (
            <>
              <div className="tl-group-label">Resolved</div>
              {resolved.map((thread) => (
                <Link key={thread.id} href={`${root}/threads/${thread.id}`} className="tl-row" style={{ textDecoration: "none" }}>
                  <span className={threadChipClass(thread.status)}>resolved</span>
                  <span className="t-name">{thread.name}</span>
                </Link>
              ))}
            </>
          )}

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
              <span className={threadChipClass(thread.status)} style={{ fontSize: 7 }}>
                {thread.status || "dormant"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SanctumShell>
  );
}
