import Link from "next/link";
import { createSessionAction } from "@/app/actions";
import { EntityCard } from "@/components/EntityCard";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { SanctumShell } from "@/components/SanctumShell";
import { getPendingDrafts, getRecentEntities, getSessions, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

export default async function SagaHomePage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ workspace, world, saga }, sessions, recentEntities, drafts] = await Promise.all([
    requireSagaContext(ids),
    getSessions(ids),
    getRecentEntities(ids),
    getPendingDrafts(ids)
  ]);
  const activeSession = sessions.find((session) => ["planned", "ready", "started", "in_progress", "ended_pending_undo"].includes(session.status));
  const root = sagaPath(ids);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="home">
      <section className="topbar">
        <div>
          <div className="eyebrow">Saga home</div>
          <h1 className="page-title">{saga.name}</h1>
          <p className="muted">{saga.game_system || "System-agnostic"} · Create - Organize - Prep - Run - Review - Approve - Continue</p>
        </div>
        <Link className="button" href={`${root}/entities/new`}>Create canon</Link>
      </section>

      <section className="content-grid">
        {activeSession ? (
          <article className="card accent">
            <span className="chip amber">{activeSession.status}</span>
            <h2 className="section-title">{activeSession.name}</h2>
            <p className="muted">{activeSession.objective || activeSession.opening_scene || "Prep is ready for details."}</p>
            <div className="button-row">
              <Link className="button" href={`${root}/sessions/${activeSession.id}/prep`}>Open prep</Link>
              {activeSession.status !== "planned" ? <Link className="button-ghost" href={`${root}/sessions/${activeSession.id}/stage`}>Open Stage</Link> : null}
            </div>
          </article>
        ) : (
          <article className="card accent">
            <span className="chip amber">Next action</span>
            <h2 className="section-title">Plan your first session</h2>
            <p className="muted">Create a light packet from what matters now. The Stage can open it after you mark it Ready.</p>
            <form className="form-stack" action={createSessionAction}>
              <HiddenContextFields params={ids} />
              <input type="hidden" name="name" value="Session 1" />
              <label className="field">
                <span>Objective</span>
                <input className="input" name="objective" placeholder="What should tonight's session accomplish?" />
              </label>
              <button className="button" type="submit">Plan Session 1</button>
            </form>
          </article>
        )}
        <article className="card">
          <span className="chip sage">Review</span>
          <h2 className="section-title">{drafts.filter((draft) => draft.state === "pending").length} pending items</h2>
          <p className="muted">Approval is manual. AI synthesis is not wired in this phase.</p>
          <Link className="button-ghost" href={`${root}/review`}>Open Review</Link>
        </article>
      </section>

      <section>
        <div className="topbar">
          <h2 className="section-title">Recent canon</h2>
          <Link className="button-ghost" href={`${root}/entities`}>Entity library</Link>
        </div>
        <div className="entity-list">
          {recentEntities.length ? recentEntities.map((entity) => <EntityCard key={`${entity.entityType}:${entity.id}`} params={ids} entity={entity} />) : (
            <div className="card">Start with a character, place, faction, artifact, or thread.</div>
          )}
        </div>
      </section>
    </SanctumShell>
  );
}
