import { updateDraftStateAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { getPendingDrafts, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

function dotClass(state: string, changeKind: string) {
  if (state === "pending" && changeKind === "create") return "rq-dot new";
  if (state === "pending" && changeKind === "update") return "rq-dot update";
  if (state === "conflict") return "rq-dot danger";
  return "rq-dot update";
}

function confClass(band?: string | null) {
  if (band === "high") return "rq-conf high";
  if (band === "low") return "rq-conf low";
  return "rq-conf med";
}

export default async function ReviewPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ workspace, world, saga }, drafts] = await Promise.all([
    requireSagaContext(ids),
    getPendingDrafts(ids),
  ]);
  const pending = drafts.filter((d) => d.state === "pending");

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="review" reviewCount={pending.length}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="review" size={12} /> Review and approve</div>
          <div className="page-title">Approval Queue</div>
          <div className="page-sub">Nothing enters canon until you approve it.</div>
        </div>
        {pending.length > 0 && (
          <div className="page-actions">
            <span className="review-bdg">
              <RelicIcon name="review" size={12} />
              {pending.length} pending
            </span>
          </div>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="empty-state">
          <div className="empty-ornament" style={{ fontSize: 36, fontFamily: "var(--font-display)" }}>✦</div>
          <div className="empty-title">Queue is clear</div>
          <div className="empty-desc">No proposed changes are waiting. Run a session and capture notes to start populating the queue.</div>
        </div>
      ) : (
        <div className="review-layout">
          {/* Left — queue list */}
          <div className="card rq-card">
            <div className="rq-head">
              <span className="rq-title-txt">Pending</span>
              <span className="rq-count">{pending.length}</span>
            </div>
            {pending.map((draft) => (
              <div key={draft.id} className="rq-item">
                <span className={dotClass(draft.state, draft.change_kind)} />
                <div className="rq-item-body">
                  <div className="rq-item-title">
                    {String((draft.proposed_payload as Record<string, unknown>).name ?? draft.entity_type)}
                  </div>
                  <div className="rq-item-type">{draft.entity_type} · {draft.change_kind}</div>
                </div>
                <span className={confClass(draft.confidence_band)}>
                  {draft.confidence_band ?? "med"}
                </span>
              </div>
            ))}
          </div>

          {/* Right — detail for each draft */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {pending.map((draft) => (
              <div key={draft.id} className="card dd-card">
                <div className="dd-eyebrow">
                  {draft.entity_type} · {draft.change_kind}
                </div>
                <div className="dd-title">
                  {String((draft.proposed_payload as Record<string, unknown>).name ?? `Draft ${draft.id.slice(0, 8)}`)}
                </div>

                <div className="diff-block">
                  <div className="diff-label">Proposed changes</div>
                  {Object.entries(draft.proposed_payload).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="diff-row">
                      <span className="diff-key">{key}</span>
                      <span className="diff-new">{String(value)}</span>
                    </div>
                  ))}
                </div>

                {draft.confidence_band && (
                  <div className="source-dock">
                    <div className="source-dock-label">Confidence</div>
                    <span className={`conf-badge ${draft.confidence_band}`}>
                      {draft.confidence_band} confidence
                    </span>
                  </div>
                )}

                <div className="dd-actions">
                  <form action={updateDraftStateAction} style={{ display: "inline" }}>
                    <HiddenContextFields params={ids} />
                    <input type="hidden" name="draftId" value={draft.id} />
                    <button className="btn btn-verdigris btn-sm" name="state" value="approved" type="submit">
                      <RelicIcon name="check" size={12} /> Approve
                    </button>
                  </form>
                  <form action={updateDraftStateAction} style={{ display: "inline" }}>
                    <HiddenContextFields params={ids} />
                    <input type="hidden" name="draftId" value={draft.id} />
                    <button className="btn btn-secondary btn-sm" name="state" value="merged" type="submit">Mark merged</button>
                  </form>
                  <form action={updateDraftStateAction} style={{ display: "inline" }}>
                    <HiddenContextFields params={ids} />
                    <input type="hidden" name="draftId" value={draft.id} />
                    <button className="btn btn-rust btn-sm" name="state" value="rejected" type="submit">
                      <RelicIcon name="x" size={12} /> Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SanctumShell>
  );
}
