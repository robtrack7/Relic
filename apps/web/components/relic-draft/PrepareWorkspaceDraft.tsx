import Link from "next/link";
import { readyForStageAction, updateSessionPrepAction } from "@/app/actions";
import { RelicIcon } from "@/components/RelicIcon";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { sagaPath } from "@/lib/routes";
import type { EntitySummary, IdParams } from "@/lib/types";

type PrepSession = {
  id: string;
  name: string;
  status: string;
  objective?: string | null;
  opening_scene?: string | null;
  scene_notes?: string | null;
  prep_checklist?: Array<{ text?: string; done?: boolean }> | null;
};

type PrepareWorkspaceDraftProps = {
  params: IdParams;
  session: PrepSession;
  options: {
    entities: EntitySummary[];
    threads: EntitySummary[];
  };
  pinnedKeys: Set<string>;
  activeThreadIds: Set<string>;
  locked?: boolean;
};

function checklistText(session: PrepSession) {
  return Array.isArray(session.prep_checklist)
    ? session.prep_checklist.map((item) => item.text ?? "").filter(Boolean).join("\n")
    : "";
}

function checklistItems(session: PrepSession) {
  return Array.isArray(session.prep_checklist) ? session.prep_checklist : [];
}

export function PrepareWorkspaceDraft({
  params,
  session,
  options,
  pinnedKeys,
  activeThreadIds,
  locked = false,
}: PrepareWorkspaceDraftProps) {
  const root = sagaPath(params);
  const ready = session.status === "ready";
  const items = checklistItems(session);
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const meterPct = total ? (done / total) * 100 : 0;

  return (
    <div>
      {/* Page head */}
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            <span className={`dot${ready ? " amber" : " dormant"}`} />
            {ready ? "Ready for Stage" : "Prepare workspace"}
          </div>
          <h1 className="page-title">{session.name}</h1>
          <div className="page-sub">The Stage will read this packet exactly as written here.</div>
        </div>
        <div className="page-actions">
          <span className={ready ? "chip verdigris" : "chip amber"}>{session.status}</span>
          <Link className="btn btn-ghost btn-sm" href={`${root}/sessions`}>Sessions</Link>
          {session.status !== "planned" && (
            <Link className="btn btn-secondary btn-sm" href={`${root}/sessions/${session.id}/stage`}>
              Open Stage
            </Link>
          )}
        </div>
      </div>

      {/* Status banners */}
      {locked ? (
        <div className="prep-locked-banner">
          <RelicIcon name="alert" size={16} />
          Prep is locked while this session is live or pending undo. You can still inspect the packet.
        </div>
      ) : ready ? (
        <div className="prep-ready-banner">
          <RelicIcon name="check" size={16} />
          <div>
            <div className="prep-ready-banner-label">Prep complete · Ready for Stage</div>
            <div style={{ fontSize: 11, color: "var(--stone-700)", marginTop: 2 }}>
              You can still edit until the session goes live.
            </div>
          </div>
        </div>
      ) : null}

      <div className="prep-grid">
        {/* Left rail */}
        <div className="prep-col-left">
          {/* Readiness meter */}
          <div className="card mini-card">
            <div className="mini-head">
              <span className="sec-label"><RelicIcon name="check" size={11} /> Readiness</span>
            </div>
            <div className="meter" style={{ marginBottom: 8 }}>
              <span style={{ width: `${meterPct}%` }} />
            </div>
            <div className="kv">
              <span className="kv-k">Checklist</span>
              <span className="kv-v">{done} / {total}</span>
            </div>
            <div className="kv">
              <span className="kv-k">Pinned canon</span>
              <span className="kv-v">{pinnedKeys.size}</span>
            </div>
            <div className="kv">
              <span className="kv-k">Active threads</span>
              <span className="kv-v">{activeThreadIds.size}</span>
            </div>
          </div>

          {/* Checklist items */}
          {items.length > 0 && (
            <div className="card mini-card">
              <div className="mini-head">
                <span className="sec-label"><RelicIcon name="review" size={11} /> Checklist</span>
              </div>
              {items.slice(0, 8).map((item, i) => (
                <div key={i} className={`cl-item${item.done ? " done" : " todo"}`}>
                  <span className={`cl-chk${item.done ? " done" : " todo"}`}>
                    {item.done
                      ? <RelicIcon name="check" size={12} />
                      : <RelicIcon name="circle" size={12} />}
                  </span>
                  <span className="cl-text">{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main prep area */}
        <div className="prep-center">
          <form action={updateSessionPrepAction}>
            <HiddenContextFields params={params} />
            <input type="hidden" name="sessionId" value={session.id} />

            {/* Packet editor */}
            <div className="card packet-card" style={{ marginBottom: 12 }}>
              <div className="packet-card-head">
                <span className="sec-label"><RelicIcon name="prepare" size={11} /> Session packet</span>
              </div>

              <div className="detail-tiles">
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Name</span>
                  <input className="settings-field" name="name" defaultValue={session.name} disabled={locked} />
                </label>
                <label className="field">
                  <span>Objective</span>
                  <input className="settings-field" name="objective" defaultValue={session.objective ?? ""} placeholder="What should this session accomplish?" disabled={locked} />
                </label>
                <label className="field">
                  <span>Opening scene</span>
                  <input className="settings-field" name="openingScene" defaultValue={session.opening_scene ?? ""} placeholder="How does the session start?" disabled={locked} />
                </label>
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Scene notes</span>
                  <textarea className="settings-field" name="sceneNotes" defaultValue={session.scene_notes ?? ""} rows={3} disabled={locked} style={{ resize: "vertical" }} />
                </label>
              </div>

              {/* Packet preview tiles */}
              {(session.objective || session.opening_scene) && (
                <div className="packet-tiles" style={{ marginTop: 12 }}>
                  {session.objective && (
                    <div className="tile">
                      <div className="tile-head">
                        <span className="tile-ico"><RelicIcon name="target" size={12} /></span>
                        <span className="tile-label">Objective</span>
                      </div>
                      <div className="tile-body">{session.objective}</div>
                    </div>
                  )}
                  {session.opening_scene && (
                    <div className="tile">
                      <div className="tile-head">
                        <span className="tile-ico"><RelicIcon name="flame" size={12} /></span>
                        <span className="tile-label">Opening scene</span>
                      </div>
                      <div className="tile-body">{session.opening_scene}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Checklist textarea */}
            <div className="card packet-card" style={{ marginBottom: 12 }}>
              <div className="packet-card-head">
                <span className="sec-label"><RelicIcon name="review" size={11} /> Prep checklist</span>
              </div>
              <label className="field">
                <span style={{ fontSize: 11, color: "var(--stone-500)" }}>One item per line</span>
                <textarea
                  className="settings-field"
                  name="prepChecklist"
                  defaultValue={checklistText(session)}
                  rows={5}
                  disabled={locked}
                  style={{ resize: "vertical" }}
                />
              </label>
            </div>

            {/* Entity + Thread pickers */}
            <div className="prep-triple" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 12 }}>
              <div className="card triple-card">
                <div className="sec-label" style={{ marginBottom: 10 }}>
                  <RelicIcon name="library" size={11} /> Pinned entities
                </div>
                {options.entities.length ? options.entities.map((entity) => (
                  <label key={`${entity.entityType}:${entity.id}`} className="asset-row" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      name="pinnedEntity"
                      value={`${entity.entityType}:${entity.id}`}
                      aria-label={entity.name}
                      defaultChecked={pinnedKeys.has(`${entity.entityType}:${entity.id}`)}
                      disabled={locked}
                      style={{ flexShrink: 0 }}
                    />
                    <span className="asset-ico"><RelicIcon name="file" size={12} /></span>
                    <span className="asset-name">{entity.name}</span>
                    <span className="asset-type-txt">{entity.entityType}</span>
                  </label>
                )) : (
                  <div className="empty-state" style={{ padding: "20px 0" }}>
                    <div className="empty-desc">No Library records yet.</div>
                  </div>
                )}
              </div>
              <div className="card triple-card">
                <div className="sec-label" style={{ marginBottom: 10 }}>
                  <RelicIcon name="threads" size={11} /> Thread carry-forward
                </div>
                {options.threads.length ? options.threads.map((thread) => (
                  <label key={thread.id} className="asset-row" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      name="activeThread"
                      value={thread.id}
                      defaultChecked={activeThreadIds.has(thread.id)}
                      disabled={locked}
                      style={{ flexShrink: 0 }}
                    />
                    <span className="asset-ico"><RelicIcon name="threads" size={12} /></span>
                    <span className="asset-name">{thread.name}</span>
                  </label>
                )) : (
                  <div className="empty-state" style={{ padding: "20px 0" }}>
                    <div className="empty-desc">No threads yet.</div>
                  </div>
                )}
              </div>
            </div>

            {!locked && (
              <button className="btn btn-secondary" type="submit" style={{ marginBottom: 12 }}>
                Save prep
              </button>
            )}
          </form>

          {/* Ready for Stage CTA */}
          <div className="prep-cta">
            <form action={readyForStageAction} style={{ flex: 1 }}>
              <HiddenContextFields params={params} />
              <input type="hidden" name="sessionId" value={session.id} />
              <button className="cta-stage" type="submit" disabled={locked} style={{ width: "100%" }}>
                {ready ? "Open in Stage" : "Ready for Stage"}
              </button>
            </form>
            <button className="btn btn-icon" type="button" disabled title="AI phase — not yet available" aria-label="Draft this session (AI phase)">
              <RelicIcon name="spark" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
