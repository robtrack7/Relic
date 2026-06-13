import { notFound } from "next/navigation";
import { archiveEntityAction, updateEntityAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { entityConfigs, isEditableEntityType } from "@/lib/entities";
import { getEntity, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

type PageParams = IdParams & { entityType: string; entityId: string };

function entityCardClass(type: string) {
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

export default async function EntityDetailPage({ params }: { params: Promise<PageParams> }) {
  const all = await params;
  const ids: IdParams = all;
  if (!isEditableEntityType(all.entityType)) notFound();
  const [{ workspace, world, saga }, entity] = await Promise.all([
    requireSagaContext(ids),
    getEntity(ids, all.entityType, all.entityId),
  ]);
  if (!entity) notFound();

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="entities">
      {entity.canon_state === "archived" && (
        <div className="archived-banner">
          <RelicIcon name="alert" size={16} />
          This record is archived and no longer appears in active canon.
        </div>
      )}

      <div className="lib-detail-layout">
        {/* Left sidebar */}
        <div className={`card entity-sidebar ${entityCardClass(entity.entityType)}`}>
          <div>
            <div className="es-key">Type</div>
            <div className="es-val">{entityConfigs[all.entityType].label}</div>
          </div>
          <div className="es-sep" />
          <div>
            <div className="es-key">Scope</div>
            <div className="es-val">{entity.scope} canon</div>
          </div>
          <div className="es-sep" />
          <div>
            <div className="es-key">Status</div>
            <div className="es-val">
              <span className={entity.canon_state === "archived" ? "chip rust" : "chip verdigris"}>
                {entity.canon_state}
              </span>
            </div>
          </div>
          {entity.is_stub && (
            <>
              <div className="es-sep" />
              <div>
                <div className="es-key">Stub</div>
                <div className="es-val"><span className="chip amber">stub</span></div>
              </div>
            </>
          )}
          <div className="es-sep" />
          <div>
            <div className="es-key">Provenance</div>
            <div className="es-val" style={{ fontSize: 11, color: "var(--stone-500)", lineHeight: 1.4 }}>
              Manual GM edit. Source panels arrive in the AI runtime phase.
            </div>
          </div>
          <div className="es-sep" />
          <form action={archiveEntityAction} style={{ marginTop: 4 }}>
            <HiddenContextFields params={ids} />
            <input type="hidden" name="entityType" value={all.entityType} />
            <input type="hidden" name="entityId" value={all.entityId} />
            <input type="hidden" name="expectedVersion" value={entity.updated_at ?? ""} />
            <button className="btn btn-rust btn-sm" type="submit" style={{ width: "100%", justifyContent: "center" }}>
              Archive
            </button>
          </form>
        </div>

        {/* Main detail */}
        <div className="card entity-main">
          <div className="em-eyebrow">
            <RelicIcon name="library" size={11} /> {entityConfigs[all.entityType].label}
          </div>
          <h1 className="em-name">{entity.name}</h1>
          {entity.summary && <div className="em-desc-line">{entity.summary}</div>}

          <form action={updateEntityAction}>
            <HiddenContextFields params={ids} />
            <input type="hidden" name="entityType" value={all.entityType} />
            <input type="hidden" name="entityId" value={all.entityId} />
            <input type="hidden" name="expectedVersion" value={entity.updated_at ?? ""} />

            <div className="em-actions">
              <button className="btn btn-secondary btn-sm" type="submit">Save manual edit</button>
            </div>

            <div className="em-sep" />

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label className="field">
                <span>Name / title</span>
                <input className="settings-field" name="name" defaultValue={entity.name} required />
              </label>
              <label className="field">
                <span>Summary</span>
                <input className="settings-field" name="summary" defaultValue={entity.summary ?? ""} />
              </label>
              <label className="field">
                <span>Narrative / body</span>
                <textarea className="settings-field" name="narrative" defaultValue={entity.narrative ?? entity.summary ?? ""} rows={5} style={{ resize: "vertical" }} />
              </label>

              {entity.gm_notes && (
                <>
                  <div className="em-sep" />
                  <div className="em-section-label"><RelicIcon name="file" size={11} /> GM notes</div>
                  <div className="em-gm-notes">{entity.gm_notes}</div>
                </>
              )}

              <label className="field">
                <span>GM notes (edit)</span>
                <textarea className="settings-field" name="gmNotes" defaultValue={entity.gm_notes ?? ""} rows={3} style={{ resize: "vertical" }} />
              </label>
            </div>
          </form>
        </div>
      </div>
    </SanctumShell>
  );
}
