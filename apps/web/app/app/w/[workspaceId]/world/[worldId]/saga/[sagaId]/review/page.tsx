import { ApprovalQueueWorkspace } from "@/components/relic-draft/ApprovalQueueWorkspace";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { getApprovalQueue, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

const noticeCopy: Record<string, string> = {
  stale_target: "Canon changed before commit. Your proposal and edits are still saved; refresh its baseline and review the new diff.",
  source_drift: "A cited transcript changed. Inspect both versions and explicitly acknowledge the drift before approval.",
  broken_source: "Required source evidence is unavailable. The proposal remains pending and editable; canon was not changed.",
  missing_target: "The affected canon target is missing. Reject or merge this proposal into a valid same-Saga target.",
  archived_target: "The affected target is archived. This proposal cannot overwrite or silently revive it.",
  already_resolved: "This proposal was already resolved. No duplicate canon write occurred.",
};

export default async function ReviewPage({ params, searchParams }: { params: Promise<IdParams>; searchParams: Promise<{ reviewNotice?: string }> }) {
  const ids = await params;
  const query = await searchParams;
  const [{ workspace, world, saga }, drafts] = await Promise.all([requireSagaContext(ids), getApprovalQueue(ids)]);
  const pending = drafts.filter((draft) => draft.state === "pending");
  const notice = query.reviewNotice ? noticeCopy[query.reviewNotice] ?? "The approval did not commit. The proposal remains available for review." : null;

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="review" reviewCount={pending.length}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="review" size={12} /> Review and approve</div>
          <div className="page-title">Approval Queue</div>
          <div className="page-sub">Review field-level changes and their evidence. Only an explicit approval writes canon and canon audit.</div>
        </div>
        {pending.length > 0 && <div className="page-actions"><span className="review-bdg"><RelicIcon name="review" size={12} />{pending.length} pending</span></div>}
      </div>

      {notice && <div className="conflict-panel approval-page-notice" role="status"><div className="conflict-title"><RelicIcon name="alert" size={11} /> Approval needs attention</div><div className="conflict-desc">{notice}</div></div>}
      {drafts.length === 0 ? (
        <div className="empty-state"><div className="empty-ornament" style={{ fontSize: 36, fontFamily: "var(--font-display)" }}>✦</div><div className="empty-title">Queue is clear</div><div className="empty-desc">No proposals are waiting. Completed Session synthesis batches will appear here for explicit review.</div></div>
      ) : <ApprovalQueueWorkspace params={ids} sagaRoot={sagaPath(ids)} drafts={drafts} />}
    </SanctumShell>
  );
}
