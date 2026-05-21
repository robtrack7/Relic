import { updateDraftStateAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { SanctumShell } from "@/components/SanctumShell";
import { getPendingDrafts, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

export default async function ReviewPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ workspace, world, saga }, drafts] = await Promise.all([requireSagaContext(ids), getPendingDrafts(ids)]);
  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="review">
      <section>
        <div className="eyebrow">Review and approve</div>
        <h1 className="page-title">Approval Queue</h1>
        <p className="muted">This shell reads draft rows and supports manual disposition. No synthesis job runs from here.</p>
      </section>
      <div className="entity-list">
        {drafts.length ? drafts.map((draft) => (
          <article className="card" key={draft.id}>
            <span className="chip amber">{draft.entity_type} · {draft.change_kind} · {draft.state}</span>
            <pre className="small">{JSON.stringify(draft.proposed_payload, null, 2)}</pre>
            <form className="button-row" action={updateDraftStateAction}>
              <HiddenContextFields params={ids} />
              <input type="hidden" name="draftId" value={draft.id} />
              <button className="button" name="state" value="approved" type="submit">Approve</button>
              <button className="button-ghost" name="state" value="rejected" type="submit">Reject</button>
              <button className="button-ghost" name="state" value="merged" type="submit">Mark merged</button>
            </form>
          </article>
        )) : <div className="card">No proposed changes waiting.</div>}
      </div>
    </SanctumShell>
  );
}
