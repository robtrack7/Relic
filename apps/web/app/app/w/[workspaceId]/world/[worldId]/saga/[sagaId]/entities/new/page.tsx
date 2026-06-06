import { createEntityAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { editableEntityTypes, entityConfigs } from "@/lib/entities";
import { requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

export default async function NewEntityPage({
  params,
  searchParams,
}: {
  params: Promise<IdParams>;
  searchParams: Promise<{ type?: string }>;
}) {
  const ids = await params;
  const query = await searchParams;
  const selected = editableEntityTypes.includes(query.type as never)
    ? (query.type as (typeof editableEntityTypes)[number])
    : "character";
  const { workspace, world, saga } = await requireSagaContext(ids);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="entities">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="library" size={12} /> Manual canon</div>
          <div className="page-title">New {entityConfigs[selected].label}</div>
        </div>
      </div>

      <div className="lib-detail-layout">
        <div className="card entity-sidebar">
          <div className="sec-label" style={{ marginBottom: 12 }}>Type</div>
          {editableEntityTypes.map((type) => (
            <a
              key={type}
              href={`?type=${type}`}
              className={`settings-nav-item${type === selected ? " active" : ""}`}
              style={{ display: "block", textDecoration: "none" }}
            >
              {entityConfigs[type].label}
            </a>
          ))}
          <div className="es-sep" style={{ margin: "12px 0" }} />
          <div className="es-key">Scope</div>
          <div className="es-val" style={{ fontSize: 11, color: "var(--stone-500)", marginTop: 4 }}>
            Saga canon by default. Change to World canon if this record is shared across sagas.
          </div>
        </div>

        <div className="card entity-main">
          <div className="em-eyebrow">
            <RelicIcon name="plus" size={11} /> New {entityConfigs[selected].label}
          </div>
          <form action={createEntityAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <HiddenContextFields params={ids} />
            <input type="hidden" name="entityType" value={selected} />
            <label className="field">
              <span>Scope</span>
              <select className="settings-select" name="scope" defaultValue="saga">
                <option value="saga">Saga canon</option>
                <option value="world">World canon</option>
              </select>
            </label>
            <label className="field">
              <span>Name / title</span>
              <input className="settings-field" name="name" required placeholder={`${entityConfigs[selected].label} name`} autoFocus />
            </label>
            <label className="field">
              <span>Summary</span>
              <input className="settings-field" name="summary" placeholder="One-line summary" />
            </label>
            <label className="field">
              <span>Narrative / body</span>
              <textarea className="settings-field" name="narrative" rows={4} style={{ resize: "vertical" }} />
            </label>
            <label className="field">
              <span>GM notes</span>
              <textarea className="settings-field" name="gmNotes" rows={3} placeholder="Private notes for the GM. Visible only to you." style={{ resize: "vertical" }} />
            </label>
            <div>
              <button className="btn btn-ink" type="submit">
                <RelicIcon name="plus" size={13} /> Create {entityConfigs[selected].label}
              </button>
            </div>
          </form>

          <div className="em-sep" style={{ marginTop: 20 }} />
          <div className="card" style={{ padding: "14px 16px", background: "var(--bg-1)" }}>
            <span className="chip stone">Draft from prompt</span>
            <p style={{ fontSize: 12, color: "var(--stone-500)", marginTop: 8, lineHeight: 1.5 }}>
              AI drafting is disabled until the AI runtime phase. Create manually here instead.
            </p>
          </div>
        </div>
      </div>
    </SanctumShell>
  );
}
