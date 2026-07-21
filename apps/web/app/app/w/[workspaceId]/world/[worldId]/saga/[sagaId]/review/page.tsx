import { updateDraftStateAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { RelicIcon } from "@/components/RelicIcon";
import { DraftCitationList } from "@/components/relic-draft/DraftCitationList";
import { SanctumShell } from "@/components/SanctumShell";
import { getPendingDrafts, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
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

function draftTitle(draft: { id: string; entity_type: string; proposed_payload: Record<string, unknown> }) {
  return String(draft.proposed_payload.name ?? draft.proposed_payload.title ?? `${draft.entity_type} draft ${draft.id.slice(0, 8)}`);
}

function draftGroupKey(draft: { entity_type: string; target_entity_id?: string | null; proposed_payload: Record<string, unknown> }) {
  return draft.target_entity_id ?? `${draft.entity_type}:${String(draft.proposed_payload.name ?? draft.proposed_payload.title ?? "new")}`;
}

export default async function ReviewPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ workspace, world, saga }, drafts] = await Promise.all([
    requireSagaContext(ids),
    getPendingDrafts(ids),
  ]);
  const pending = drafts.filter((d) => d.state === "pending");
  const root = sagaPath(ids);
  const groups = Array.from(
    pending.reduce((map, draft) => {
      const key = draftGroupKey(draft);
      const existing = map.get(key) ?? [];
      existing.push(draft);
      map.set(key, existing);
      return map;
    }, new Map<string, typeof pending>())
  ).map(([key, items]) => ({ key, items, primary: items[0] }));

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
            {groups.map((group) => (
              <div key={group.key} className="rq-item">
                <span className={dotClass(group.primary.state, group.primary.change_kind)} />
                <div className="rq-item-body">
                  <div className="rq-item-title">
                    {draftTitle(group.primary)}
                  </div>
                  <div className="rq-item-type">{group.primary.entity_type} · {group.items.length} proposal{group.items.length === 1 ? "" : "s"}</div>
                </div>
                <span className={confClass(group.primary.confidence_band)}>
                  {group.primary.confidence_band ?? "med"}
                </span>
              </div>
            ))}
          </div>

          {/* Right — grouped draft details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {groups.map((group) => (
              <section key={group.key} className="card dd-card">
                <div className="dd-eyebrow">
                  <RelicIcon name="review" size={11} /> {group.primary.entity_type} · grouped by affected record
                </div>
                <div className="dd-title">{draftTitle(group.primary)}</div>

                {group.items.some((draft) => draft.confidence_band === "low") && (
                  <div className="conflict-panel">
                    <div className="conflict-title">
                      <RelicIcon name="alert" size={11} /> Low confidence
                    </div>
                    <div className="conflict-desc">
                      Check source/provenance before approving. Manual editing or rejection remains safe.
                    </div>
                  </div>
                )}

                {group.items.map((draft) => (
                  <div key={draft.id} style={{ marginTop: 14 }}>
                    <div className="diff-block">
                      <div className="diff-label">{draft.change_kind} proposal · {draft.id.slice(0, 8)}</div>
                      {Object.entries(draft.proposed_payload).slice(0, 8).map(([key, value]) => (
                        <div key={key} className="diff-row">
                          <span className="diff-key">{key}</span>
                          <span className="diff-new">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="source-dock">
                      <div className="source-dock-label">Trust context</div>
                      <div className="source-ref">
                        <em>State:</em> {draft.state} · <em>Kind:</em> {draft.change_kind} · <em>Created by:</em> {draft.created_by ?? "pipeline"}
                      </div>
                      <span className={`conf-badge ${draft.confidence_band ?? "med"}`}>
                        {draft.confidence_band ?? "medium"} confidence
                      </span>
                      <DraftCitationList sagaRoot={root} citations={draft.citations} />
                    </div>

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
                      <form action={updateDraftStateAction} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <HiddenContextFields params={ids} />
                        <input type="hidden" name="draftId" value={draft.id} />
                        <input className="settings-field" name="rejectionNote" placeholder="Reason" style={{ width: 160, height: 30, padding: "5px 8px", fontSize: 11 }} />
                        <button className="btn btn-rust btn-sm" name="state" value="rejected" type="submit">
                          <RelicIcon name="x" size={12} /> Reject
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      )}
    </SanctumShell>
  );
}
