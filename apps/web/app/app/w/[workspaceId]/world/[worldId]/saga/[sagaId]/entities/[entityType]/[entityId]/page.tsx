import { notFound } from "next/navigation";
import { archiveEntityAction, updateEntityAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { SanctumShell } from "@/components/SanctumShell";
import { entityConfigs, isEditableEntityType } from "@/lib/entities";
import { getEntity, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

type PageParams = IdParams & { entityType: string; entityId: string };

export default async function EntityDetailPage({ params }: { params: Promise<PageParams> }) {
  const all = await params;
  const ids: IdParams = all;
  if (!isEditableEntityType(all.entityType)) notFound();
  const [{ workspace, world, saga }, entity] = await Promise.all([
    requireSagaContext(ids),
    getEntity(ids, all.entityType, all.entityId)
  ]);
  if (!entity) notFound();

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="entities">
      <section className="topbar">
        <div>
          <div className="eyebrow">{entityConfigs[all.entityType].label} · {entity.scope}</div>
          <h1 className="page-title">{entity.name}</h1>
        </div>
        <span className={entity.canon_state === "archived" ? "chip rust" : "chip sage"}>{entity.canon_state}</span>
      </section>
      <div className="split">
        <form className="form-stack card" action={updateEntityAction}>
          <HiddenContextFields params={ids} />
          <input type="hidden" name="entityType" value={all.entityType} />
          <input type="hidden" name="entityId" value={all.entityId} />
          <input type="hidden" name="expectedVersion" value={entity.updated_at ?? ""} />
          <label className="field"><span>Name / title</span><input className="input" name="name" defaultValue={entity.name} required /></label>
          <label className="field"><span>Summary</span><input className="input" name="summary" defaultValue={entity.summary ?? ""} /></label>
          <label className="field"><span>Narrative / body</span><textarea className="textarea" name="narrative" defaultValue={entity.narrative ?? entity.summary ?? ""} /></label>
          <label className="field"><span>GM notes</span><textarea className="textarea" name="gmNotes" defaultValue={entity.gm_notes ?? ""} /></label>
          <div className="button-row">
            <button className="button" type="submit">Save manual edit</button>
          </div>
        </form>
        <aside className="card">
          <h2 className="section-title">Provenance</h2>
          <p className="muted">Source and mention panels are scaffolded for the approval/runtime phases. Manual edits write directly as GM action.</p>
          <form action={archiveEntityAction}>
            <HiddenContextFields params={ids} />
            <input type="hidden" name="entityType" value={all.entityType} />
            <input type="hidden" name="entityId" value={all.entityId} />
            <input type="hidden" name="expectedVersion" value={entity.updated_at ?? ""} />
            <button className="button-rust" type="submit">Archive</button>
          </form>
        </aside>
      </div>
    </SanctumShell>
  );
}
