import Link from "next/link";
import { readyForStageAction, updateSessionPrepAction } from "@/app/actions";
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

function checklistCount(session: PrepSession) {
  const items = Array.isArray(session.prep_checklist) ? session.prep_checklist : [];
  const done = items.filter((item) => item.done).length;
  return { done, total: items.length };
}

export function PrepareWorkspaceDraft({
  params,
  session,
  options,
  pinnedKeys,
  activeThreadIds,
  locked = false
}: PrepareWorkspaceDraftProps) {
  const root = sagaPath(params);
  const ready = session.status === "ready";
  const checklist = checklistCount(session);

  return (
    <div className="prep-draft-workspace">
      <section className="prep-draft-head" aria-labelledby="prep-title">
        <div>
          <div className="eyebrow">{locked ? "Read-only packet" : ready ? "Ready packet" : "Prepare workspace"}</div>
          <h1 id="prep-title" className="page-title">{session.name}</h1>
          <p className="muted">The Stage will read this packet exactly as written here.</p>
        </div>
        <div className="prep-draft-actions">
          <span className={ready ? "chip sage" : "chip amber"}>{session.status}</span>
          <Link className="button-ghost" href={`${root}/sessions`}>Session overview</Link>
          {session.status !== "planned" ? <Link className="button-secondary" href={`${root}/sessions/${session.id}/stage`}>Open Stage</Link> : null}
        </div>
      </section>

      {locked ? (
        <div className="prep-draft-banner rust">Prep is locked while this session is live or pending undo. You can still inspect the packet.</div>
      ) : ready ? (
        <div className="prep-draft-banner sage">Prep complete. You can still edit until the session goes live.</div>
      ) : null}

      <form className="prep-draft-grid" action={updateSessionPrepAction}>
        <HiddenContextFields params={params} />
        <input type="hidden" name="sessionId" value={session.id} />

        <aside className="prep-draft-rail" aria-label="Prep readiness">
          <article className="card prep-draft-card">
            <span className="section-label">Readiness</span>
            <div className="prep-draft-meter" aria-label={`${checklist.done} of ${checklist.total} checklist items complete`}>
              <span style={{ width: `${checklist.total ? (checklist.done / checklist.total) * 100 : 0}%` }} />
            </div>
            <p className="small muted">{checklist.done} of {checklist.total} checklist items complete</p>
          </article>
          <article className="card prep-draft-card">
            <span className="section-label">Pinned canon</span>
            <p className="small muted">{pinnedKeys.size} records pinned for the table.</p>
          </article>
          <article className="card prep-draft-card">
            <span className="section-label">Active threads</span>
            <p className="small muted">{activeThreadIds.size} threads carried forward.</p>
          </article>
        </aside>

        <section className="prep-draft-main" aria-label="Session packet editor">
          <article className="card accent form-stack">
            <span className="section-label">Session packet</span>
            <label className="field">
              <span>Name</span>
              <input className="input" name="name" defaultValue={session.name} disabled={locked} />
            </label>
            <label className="field">
              <span>Objective</span>
              <input className="input" name="objective" defaultValue={session.objective ?? ""} disabled={locked} />
            </label>
            <label className="field">
              <span>Opening scene</span>
              <textarea className="textarea" name="openingScene" defaultValue={session.opening_scene ?? ""} disabled={locked} />
            </label>
            <label className="field">
              <span>Scene notes</span>
              <textarea className="textarea" name="sceneNotes" defaultValue={session.scene_notes ?? ""} disabled={locked} />
            </label>
          </article>

          <article className="prep-draft-packet" aria-label="Stage packet preview">
            <div>
              <span>Objective</span>
              <p>{session.objective || "No objective yet."}</p>
            </div>
            <div>
              <span>Opening scene</span>
              <p>{session.opening_scene || "No opening scene yet."}</p>
            </div>
            <div>
              <span>Scene notes</span>
              <p>{session.scene_notes || "No scene notes yet."}</p>
            </div>
          </article>

          <article className="card form-stack">
            <span className="section-label">Prep checklist</span>
            <label className="field">
              <span>Checklist, one item per line</span>
              <textarea className="textarea" name="prepChecklist" defaultValue={checklistText(session)} disabled={locked} />
            </label>
          </article>

          <div className="prep-draft-pickers">
            <article className="card form-stack">
              <span className="section-label">Pinned entities</span>
              {options.entities.length ? options.entities.map((entity) => (
                <label key={`${entity.entityType}:${entity.id}`} className="prep-draft-check">
                  <input
                    type="checkbox"
                    name="pinnedEntity"
                    value={`${entity.entityType}:${entity.id}`}
                    aria-label={entity.name}
                    defaultChecked={pinnedKeys.has(`${entity.entityType}:${entity.id}`)}
                    disabled={locked}
                  />
                  <span>
                    <strong>{entity.name}</strong>
                    <em>{entity.entityType}</em>
                  </span>
                </label>
              )) : <p className="muted">No Library records are available to pin yet.</p>}
            </article>
            <article className="card form-stack">
              <span className="section-label">Thread carry-forward</span>
              {options.threads.length ? options.threads.map((thread) => (
                <label key={thread.id} className="prep-draft-check">
                  <input
                    type="checkbox"
                    name="activeThread"
                    value={thread.id}
                    aria-label={thread.name}
                    defaultChecked={activeThreadIds.has(thread.id)}
                    disabled={locked}
                  />
                  <span>
                    <strong>{thread.name}</strong>
                    <em>{thread.status || "thread"}</em>
                  </span>
                </label>
              )) : <p className="muted">No active threads yet.</p>}
            </article>
          </div>

          {!locked ? <button className="button" type="submit">Save prep</button> : null}
        </section>
      </form>

      <div className="prep-draft-cta">
        <form action={readyForStageAction}>
          <HiddenContextFields params={params} />
          <input type="hidden" name="sessionId" value={session.id} />
          <button className="button" type="submit" disabled={locked}>{ready ? "Open in Stage" : "Ready for Stage"}</button>
        </form>
        <button className="button-ghost" disabled>Draft this session · AI phase</button>
        <button className="button-ghost" disabled>Brainstorm beats · AI phase</button>
      </div>
    </div>
  );
}
