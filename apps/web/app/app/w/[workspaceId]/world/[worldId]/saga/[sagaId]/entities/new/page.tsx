import { createEntityAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { SanctumShell } from "@/components/SanctumShell";
import { editableEntityTypes, entityConfigs } from "@/lib/entities";
import { requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

export default async function NewEntityPage({ params, searchParams }: { params: Promise<IdParams>; searchParams: Promise<{ type?: string }> }) {
  const ids = await params;
  const query = await searchParams;
  const selected = editableEntityTypes.includes(query.type as never) ? query.type as (typeof editableEntityTypes)[number] : "character";
  const { workspace, world, saga } = await requireSagaContext(ids);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="entities">
      <section>
        <div className="eyebrow">Manual canon</div>
        <h1 className="page-title">New {entityConfigs[selected].label}</h1>
      </section>
      <form className="form-stack card" action={createEntityAction}>
        <HiddenContextFields params={ids} />
        <label className="field">
          <span>Type</span>
          <select className="select" name="entityType" defaultValue={selected}>
            {editableEntityTypes.map((type) => <option key={type} value={type}>{entityConfigs[type].label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Scope</span>
          <select className="select" name="scope" defaultValue="saga">
            <option value="saga">Saga canon</option>
            <option value="world">World canon</option>
          </select>
        </label>
        <label className="field">
          <span>Name / title</span>
          <input className="input" name="name" required />
        </label>
        <label className="field">
          <span>Summary</span>
          <input className="input" name="summary" />
        </label>
        <label className="field">
          <span>Narrative / body</span>
          <textarea className="textarea" name="narrative" />
        </label>
        <label className="field">
          <span>GM notes</span>
          <textarea className="textarea" name="gmNotes" />
        </label>
        <button className="button" type="submit">Create</button>
      </form>
      <div className="card">
        <span className="chip">Draft from prompt</span>
        <p className="muted">AI drafting is disabled until the AI runtime phase. Create manually here instead.</p>
      </div>
    </SanctumShell>
  );
}
