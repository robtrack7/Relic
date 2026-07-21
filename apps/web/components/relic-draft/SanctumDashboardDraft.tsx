import Link from "next/link";
import { createSessionAction } from "@/app/actions";
import { RelicIcon } from "@/components/RelicIcon";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { SessionPrepEditor } from "@/components/SessionPrepEditor";
import { sagaPath } from "@/lib/routes";
import type { EntitySummary, IdParams, SessionPrepData } from "@/lib/types";

type SagaLike = {
  name: string;
  game_system?: string | null;
  premise?: string | null;
};

type DashboardSession = {
  id: string;
  name: string;
  status: string;
  objective?: string | null;
  opening_scene?: string | null;
  session_number?: number | null;
  planned_start_at?: string | null;
};

type SanctumDashboardDraftProps = {
  params: IdParams;
  saga: SagaLike;
  activeSession: DashboardSession | null;
  prep: SessionPrepData | null;
  futureSessions: DashboardSession[];
  threads: EntitySummary[];
  recentEntities: EntitySummary[];
  reviewCount: number;
};

function entityTypeClass(type: string): string {
  const map: Record<string, string> = {
    character: "e-npc",
    place: "e-location",
    faction: "e-faction",
    artifact: "e-artifact",
    thread: "e-lore",
    note: "e-note",
  };
  return map[type] ?? "e-note";
}

export function SanctumDashboardDraft({
  params,
  saga,
  activeSession,
  prep,
  futureSessions,
  threads,
  recentEntities,
  reviewCount,
}: SanctumDashboardDraftProps) {
  const root = sagaPath(params);
  const status = activeSession?.status;
  const isLive = status === "started" || status === "in_progress";
  const isReady = status === "ready";
  const isPlanned = status === "planned";
  const isReview = status === "ended_pending_undo" || status === "ended";
  const systemLabel = saga.game_system || "System-agnostic";
  const carryForwardThreads = threads.filter((thread) => ["active", "loose"].includes(thread.status ?? "")).slice(0, 5);
  const emptySaga = !activeSession && recentEntities.length === 0 && threads.length === 0 && reviewCount === 0;

  return (
    <div>
      {/* Page head */}
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            <span className={`dot${isLive ? " live pulse" : isReady ? " amber" : isPlanned ? " amber" : ""}`} />
            {systemLabel} · {saga.name}
          </div>
          <h1 className="page-title">{saga.name}</h1>
          {saga.premise && <div className="page-sub">{saga.premise}</div>}
        </div>
        <div className="page-actions">
          {isLive && activeSession ? (
            <Link className="btn btn-amber" href={`${root}/sessions/${activeSession.id}/stage`}>
              Return to Stage
            </Link>
          ) : isPlanned && activeSession ? (
            <Link className="btn btn-secondary" href={`${root}/sessions/${activeSession.id}/prep`}>
              <RelicIcon name="prepare" size={13} /> Open Prepare
            </Link>
          ) : isReview ? (
            <Link className="btn btn-ink" href={`${root}/review`}>
              <RelicIcon name="review" size={13} /> Open review queue
            </Link>
          ) : !activeSession ? (
            <Link className="btn btn-secondary" href={`${root}/sessions/new`}>
              <RelicIcon name="sessions" size={13} /> Plan next session
            </Link>
          ) : null}
        </div>
      </div>

      {/* Live banner */}
      {isLive && activeSession && (
        <div className="live-banner">
          <div className="live-banner-left">
            <span className="dot live pulse" />
            <div>
              <div className="live-label">Session in progress</div>
              <div className="live-name">{activeSession.name}</div>
            </div>
          </div>
          <Link className="btn btn-amber" href={`${root}/sessions/${activeSession.id}/stage`}>
            Return to Stage
          </Link>
        </div>
      )}

      <div className="home-grid">
        {/* Left column */}
        <div className="home-col-left">
          {/* Thread carry-forward */}
          <div className="card list-card">
            <div className="sec-label">
              <RelicIcon name="threads" size={12} />
              Threads carry-forward
              <span className="count">{carryForwardThreads.length}</span>
            </div>
            {carryForwardThreads.length ? (
              carryForwardThreads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`${root}/threads/${thread.id}`}
                  className="th-row"
                  style={{ textDecoration: "none" }}
                >
                  <span className={`t-chip ${thread.status === "loose" ? "loose" : "active"}`}>
                    {thread.status}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="th-name">{thread.name}</div>
                    <div className="th-state" style={{ color: "var(--stone-500)" }}>
                      {thread.summary || "No summary yet."}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rev-item">
                <div className="rev-title">No active threads yet</div>
                <div className="rev-desc">Threads track unresolved continuity, quests, and dramatic pressure.</div>
              </div>
            )}
            <div className="list-foot">
              <Link className="btn btn-ghost btn-sm" href={`${root}/entities/new?type=thread`}>New Thread</Link>
              <Link className="btn btn-ghost btn-sm" href={`${root}/threads`}>Open Threads</Link>
            </div>
          </div>

          {/* Recent canon */}
          <div className="card list-card">
            <div className="sec-label">
              <RelicIcon name="library" size={12} />
              Recent canon
              <span className="count">{recentEntities.length}</span>
            </div>
            {recentEntities.length ? (
              recentEntities.slice(0, 5).map((entity) => (
                <Link
                  key={`${entity.entityType}:${entity.id}`}
                  href={`${root}/entities/${entity.entityType}/${entity.id}`}
                  className="th-row"
                  style={{ textDecoration: "none" }}
                >
                  <div className={`th-ico ${entityTypeClass(entity.entityType)}`} style={{ background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "var(--radius-md)", width: 34, height: 34, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <RelicIcon name="file" size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="th-name">{entity.name}</div>
                    <div className="th-state" style={{ color: "var(--stone-500)" }}>
                      {entity.entityType}
                      {entity.is_stub ? " · stub" : ""}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rev-item">
                <div className="rev-title">No canon records yet</div>
                <div className="rev-desc">Start with a character, place, thread, or note.</div>
              </div>
            )}
            <div className="list-foot">
              <Link className="btn btn-ghost btn-sm" href={`${root}/entities`}>Open Library</Link>
            </div>
          </div>

          {/* Review queue */}
          {reviewCount > 0 && (
            <div className="card list-card">
              <div className="sec-label">
                <RelicIcon name="review" size={12} />
                Pending review
                <span className="count" style={{ color: "var(--rust)" }}>{reviewCount}</span>
              </div>
              <div className="rev-item">
                <div className="rev-title">{reviewCount} item{reviewCount !== 1 ? "s" : ""} awaiting review</div>
                <div className="rev-desc">Nothing enters canon until you approve it.</div>
              </div>
              <div className="list-foot">
                <Link className="btn btn-ghost btn-sm" href={`${root}/review`}>Open Review</Link>
              </div>
            </div>
          )}

          {/* Quick create */}
          <div className="card list-card">
            <div className="sec-label">
              <RelicIcon name="plus" size={12} />
              Quick create
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, paddingTop: 10 }}>
              <Link className="btn btn-secondary btn-sm" href={`${root}/entities/new?type=thread`}>Thread</Link>
              <Link className="btn btn-secondary btn-sm" href={`${root}/entities/new?type=character`}>Character</Link>
              <Link className="btn btn-secondary btn-sm" href={`${root}/entities/new?type=place`}>Place</Link>
              <Link className="btn btn-secondary btn-sm" href={`${root}/sessions/new`}>Session</Link>
            </div>
          </div>
        </div>

        {/* Main column — session packet */}
        <div>
          {futureSessions.length > 1 && (
            <nav className="future-session-switcher" aria-label="Future Sessions">
              <span className="sec-label">Upcoming Sessions</span>
              {futureSessions.map((session) => (
                <Link key={session.id} className={session.id === activeSession?.id ? "chip amber" : "chip stone"} href={`${root}/sessions/${session.id}/prep`}>
                  S{session.session_number ?? "—"} · {session.name}{session.planned_start_at ? ` · ${new Date(session.planned_start_at).toLocaleString()}` : " · Unscheduled"}
                </Link>
              ))}
            </nav>
          )}
          {/* Ready banner */}
          {isReady && (
            <div className="prep-ready-banner" style={{ marginBottom: 12 }}>
              <RelicIcon name="check" size={18} />
              <div>
                <div className="prep-ready-banner-label">Prep complete · Stage packet ready</div>
                <div style={{ fontSize: 11, color: "var(--stone-700)", marginTop: 2 }}>
                  {activeSession?.name} · Briefing and objective locked
                </div>
              </div>
            </div>
          )}

          {/* Review notice */}
          {isReview && (
            <div className="prep-locked-banner" style={{ marginBottom: 12 }}>
              <RelicIcon name="review" size={18} />
              <div>
                <strong>Session complete · Review required</strong>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  {reviewCount} item{reviewCount !== 1 ? "s" : ""} awaiting your approval before entering canon.
                </div>
              </div>
            </div>
          )}

          {prep && (isPlanned || isReady) ? (
            <SessionPrepEditor key={prep.session.updated_at} params={params} initialPrep={prep} surface="inline" />
          ) : activeSession ? (
            <div className="card packet">
              <div className="packet-top">
                <div className="packet-eyebrow">
                  <span className={`dot${isLive ? " live pulse" : isReady ? " amber" : ""}`} />
                  {activeSession.name} · {activeSession.status}
                </div>
              </div>
              <div className="packet-title">{activeSession.name}</div>

              {(activeSession.objective || activeSession.opening_scene) && (
                <div className="packet-tiles">
                  {activeSession.objective && (
                    <div className="tile">
                      <div className="tile-head">
                        <span className="tile-ico"><RelicIcon name="target" size={13} /></span>
                        <span className="tile-label">Objective</span>
                      </div>
                      <div className="tile-body">{activeSession.objective}</div>
                    </div>
                  )}
                  {activeSession.opening_scene && (
                    <div className="tile">
                      <div className="tile-head">
                        <span className="tile-ico"><RelicIcon name="flame" size={13} /></span>
                        <span className="tile-label">Opening scene</span>
                      </div>
                      <div className="tile-body">{activeSession.opening_scene}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="packet-cta">
                {isReady ? (
                  <Link className="cta-stage" href={`${root}/sessions/${activeSession.id}/stage`}>
                    Open in Stage
                  </Link>
                ) : isLive ? (
                  <Link className="cta-stage" href={`${root}/sessions/${activeSession.id}/stage`}>
                    Return to Stage
                  </Link>
                ) : isReview ? (
                  <Link className="cta-stage" href={`${root}/review`} style={{ background: "var(--rust)" }}>
                    Review session
                  </Link>
                ) : (
                  <Link className="cta-stage" href={`${root}/sessions/${activeSession.id}/prep`}>
                    Continue prep
                  </Link>
                )}
                {!isLive && !isReview && (
                  <Link className="btn btn-icon btn" href={`${root}/sessions/${activeSession.id}/prep`} aria-label="Open prepare">
                    <RelicIcon name="chevronRight" size={16} />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            /* No session — create first */
            <div className="card packet" style={{ borderLeft: "4px solid var(--stone-300)" }}>
              <div className="packet-top">
                <div className="packet-eyebrow">
                  <span className="dot" /> No session planned
                </div>
              </div>
              <div style={{ padding: "20px 0 8px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 18, color: "var(--stone-500)", marginBottom: 16 }}>
                  {emptySaga ? "Start with canon or plan your first session." : "Your saga is ready. Plan the next session from what matters now."}
                </div>
                {emptySaga && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                    <Link className="btn btn-ghost btn-sm" href={`${root}/entities/new?type=character`}>New Character</Link>
                    <Link className="btn btn-ghost btn-sm" href={`${root}/entities/new?type=place`}>New Place</Link>
                    <Link className="btn btn-ghost btn-sm" href={`${root}/entities/new?type=thread`}>New Thread</Link>
                  </div>
                )}
                <form action={createSessionAction}>
                  <HiddenContextFields params={params} />
                  <input type="hidden" name="name" value="Session 1" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, maxWidth: 340, margin: "0 auto" }}>
                    <label className="field">
                      <span>Session objective</span>
                      <input className="input" name="objective" placeholder="What should the first session accomplish?" />
                    </label>
                    <button className="btn btn-ink" type="submit" style={{ justifyContent: "center", gap: 8 }}>
                      <RelicIcon name="sessions" size={14} /> Plan Session 1
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
