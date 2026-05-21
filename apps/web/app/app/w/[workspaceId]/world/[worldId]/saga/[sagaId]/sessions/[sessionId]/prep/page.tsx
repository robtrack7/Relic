import { notFound } from "next/navigation";
import Link from "next/link";
import { readyForStageAction, updateSessionPrepAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { SanctumShell } from "@/components/SanctumShell";
import { getActiveThreads, getPinnedEntities, getPrepOptions, getSession, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

type SessionParams = IdParams & { sessionId: string };

export default async function PrepPage({ params }: { params: Promise<SessionParams> }) {
  const all = await params;
  const ids: IdParams = all;
  const [{ workspace, world, saga }, session, options, pinned, activeThreads] = await Promise.all([
    requireSagaContext(ids),
    getSession(ids, all.sessionId),
    getPrepOptions(ids),
    getPinnedEntities(ids, all.sessionId),
    getActiveThreads(ids, all.sessionId)
  ]);
  if (!session) notFound();
  const locked = ["in_progress", "ended_pending_undo"].includes(session.status);
  const checklist = Array.isArray(session.prep_checklist) ? session.prep_checklist.map((item: { text?: string } | string) => typeof item === "string" ? item : item.text ?? "").join("\n") : "";
  const pinnedKeys = new Set(pinned.map((item) => `${item.pin.entity_type}:${item.pin.entity_id}`));
  const activeThreadIds = new Set(activeThreads.map((thread) => thread?.id));

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="sessions">
      <section className="topbar">
        <div><div className="eyebrow">Session prep</div><h1 className="page-title">{session.name}</h1><span className="chip amber">{session.status}</span></div>
        {session.status !== "planned" ? <Link className="button-ghost" href={`${sagaPath(ids)}/sessions/${session.id}/stage`}>Open Stage</Link> : null}
      </section>
      {locked ? <p className="danger-note">This session is live or pending undo. Prep is read-only.</p> : null}
      <form className="form-stack" action={updateSessionPrepAction}>
        <HiddenContextFields params={ids} />
        <input type="hidden" name="sessionId" value={session.id} />
        <section className="card accent form-stack">
          <h2 className="section-title">Agenda</h2>
          <label className="field"><span>Name</span><input className="input" name="name" defaultValue={session.name} disabled={locked} /></label>
          <label className="field"><span>Objective</span><input className="input" name="objective" defaultValue={session.objective ?? ""} disabled={locked} /></label>
          <label className="field"><span>Opening scene</span><textarea className="textarea" name="openingScene" defaultValue={session.opening_scene ?? ""} disabled={locked} /></label>
          <label className="field"><span>Scene notes</span><textarea className="textarea" name="sceneNotes" defaultValue={session.scene_notes ?? ""} disabled={locked} /></label>
          <label className="field"><span>Checklist, one item per line</span><textarea className="textarea" name="prepChecklist" defaultValue={checklist} disabled={locked} /></label>
        </section>
        <section className="content-grid">
          <div className="card">
            <h2 className="section-title">Pinned entities</h2>
            {options.entities.map((entity) => (
              <label key={`${entity.entityType}:${entity.id}`} className="field">
                <span><input type="checkbox" name="pinnedEntity" value={`${entity.entityType}:${entity.id}`} defaultChecked={pinnedKeys.has(`${entity.entityType}:${entity.id}`)} disabled={locked} /> {entity.name}</span>
              </label>
            ))}
          </div>
          <div className="card">
            <h2 className="section-title">Active threads</h2>
            {options.threads.map((thread) => (
              <label key={thread.id} className="field">
                <span><input type="checkbox" name="activeThread" value={thread.id} defaultChecked={activeThreadIds.has(thread.id)} disabled={locked} /> {thread.name}</span>
              </label>
            ))}
          </div>
        </section>
        {!locked ? <button className="button" type="submit">Save prep</button> : null}
      </form>
      <div className="button-row">
        <form action={readyForStageAction}>
          <HiddenContextFields params={ids} />
          <input type="hidden" name="sessionId" value={session.id} />
          <button className="button" type="submit" disabled={locked}>Ready for Stage</button>
        </form>
        <button className="button-ghost" disabled>Draft this session · AI phase</button>
      </div>
    </SanctumShell>
  );
}
