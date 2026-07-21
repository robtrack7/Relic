import Link from "next/link";
import { notFound } from "next/navigation";
import { RelicIcon } from "@/components/RelicIcon";
import { DraftCitationList } from "@/components/relic-draft/DraftCitationList";
import { SessionReviewWorkspace } from "@/components/relic-draft/SessionReviewWorkspace";
import { SanctumShell } from "@/components/SanctumShell";
import { getPendingDrafts, getSession, getSessionReview, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

type ReviewParams = IdParams & { sessionId: string };

export default async function SessionReviewPage({ params }: { params: Promise<ReviewParams> }) {
  const all = await params;
  const ids: IdParams = all;
  const [{ user, workspace, world, saga }, session, drafts, review] = await Promise.all([
    requireSagaContext(ids),
    getSession(ids, all.sessionId),
    getPendingDrafts(ids, all.sessionId),
    getSessionReview(ids, all.sessionId),
  ]);
  if (!session) notFound();
  const root = sagaPath(ids);
  const pending = drafts.filter((draft) => draft.state === "pending");

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="sessions">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="review" size={12} /> Session review</div>
          <div className="page-title">{session.name}</div>
          <div className="page-sub">Review session output before anything becomes canon. Proposed changes remain draft-backed until GM approval.</div>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ink" href={`${root}/review`}>
            Open Approval Queue <RelicIcon name="arrowRight" size={12} />
          </Link>
        </div>
      </div>

      <div className="settings-layout">
        <div className="card settings-nav-card">
          <div className="settings-nav-item active">Summary</div>
          <div className="settings-nav-item">Pipeline</div>
          <div className="settings-nav-item">Drafts</div>
          <div className="settings-nav-sep" />
          <Link className="settings-nav-item" href={`${root}/sessions/${session.id}/prep`} style={{ textDecoration: "none" }}>
            Prep
          </Link>
        </div>

        <div>
          <div className="card settings-content-card" style={{ marginBottom: 12 }}>
            <div className="sec-label" style={{ marginBottom: 14 }}>
              <RelicIcon name="sessions" size={11} /> Session state
            </div>
            <div className="setting-row">
              <div className="setting-label-col"><div className="setting-label">Status</div></div>
              <div className="kv-v"><span className="chip amber">{session.status}</span></div>
            </div>
            <div className="setting-row">
              <div className="setting-label-col"><div className="setting-label">Objective</div></div>
              <div className="kv-v">{session.objective || "No objective recorded."}</div>
            </div>
            <div className="setting-row">
              <div className="setting-label-col"><div className="setting-label">Opening</div></div>
              <div className="kv-v">{session.opening_scene || "No opening scene recorded."}</div>
            </div>
          </div>

          <SessionReviewWorkspace ownerId={user.id} params={ids} sessionId={session.id} review={review} />

          <div className="card settings-content-card">
            <div className="sec-label" style={{ marginBottom: 14 }}>
              <RelicIcon name="review" size={11} /> Pending drafts
            </div>
            {pending.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pending.slice(0, 8).map((draft) => (
                  <div className="session-draft-citation-card" key={draft.id}>
                    <div className="rq-item">
                      <span className="dot amber" />
                      <div style={{ flex: 1 }}>
                        <div className="rq-item-title">{String(draft.proposed_payload.name ?? draft.proposed_payload.title ?? draft.entity_type)}</div>
                        <div className="rq-item-type">{draft.entity_type} · {draft.change_kind}</div>
                      </div>
                      <span className="chip stone">{draft.confidence_band ?? "med"}</span>
                    </div>
                    <DraftCitationList sagaRoot={root} citations={draft.citations} />
                  </div>
                ))}
                <Link className="btn btn-secondary btn-sm" href={`${root}/review`} style={{ alignSelf: "flex-start" }}>
                  Review drafts
                </Link>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--stone-500)", lineHeight: 1.5, margin: 0 }}>
                No proposed changes are waiting for approval.
              </p>
            )}
          </div>
        </div>
      </div>
    </SanctumShell>
  );
}
