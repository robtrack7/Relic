import Link from "next/link";
import { createSessionAction } from "@/app/actions";
import { EntityCard } from "@/components/EntityCard";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { sagaPath } from "@/lib/routes";
import type { EntitySummary, IdParams } from "@/lib/types";

type SagaLike = {
  name: string;
  game_system?: string | null;
  premise?: string | null;
};

type DashboardSession = {
  id: string;
  name: string;
  status: string;
  objective?: string | null;
  opening_scene?: string | null;
};

type SanctumDashboardDraftProps = {
  params: IdParams;
  saga: SagaLike;
  activeSession: DashboardSession | null;
  recentEntities: EntitySummary[];
  reviewCount: number;
};

export function SanctumDashboardDraft({
  params,
  saga,
  activeSession,
  recentEntities,
  reviewCount
}: SanctumDashboardDraftProps) {
  const root = sagaPath(params);
  const systemLabel = saga.game_system || "System-agnostic";
  const loopState = activeSession ? activeSession.status : "needs prep";
  const nextActionLabel = activeSession
    ? activeSession.status === "planned"
      ? "Continue prep"
      : "Open Stage"
    : "Plan Session 1";
  const nextActionHref = activeSession
    ? activeSession.status === "planned"
      ? `${root}/sessions/${activeSession.id}/prep`
      : `${root}/sessions/${activeSession.id}/stage`
    : `${root}/sessions/new`;

  return (
    <div className="draft-dashboard">
      <section className="draft-hero" aria-labelledby="saga-dashboard-title">
        <div className="draft-hero-copy">
          <div className="eyebrow">Relic Web Draft import</div>
          <h1 id="saga-dashboard-title" className="draft-display-title">{saga.name}</h1>
          <p className="draft-lede">
            {saga.premise || `${systemLabel} saga cockpit for create, prep, run, review, approve, and continue.`}
          </p>
          <div className="draft-hero-actions">
            <Link className="button" href={nextActionHref}>{nextActionLabel}</Link>
            <Link className="button-ghost" href={`${root}/entities/new`}>New canon record</Link>
          </div>
        </div>
        <aside className="draft-status-panel" aria-label="Current saga state">
          <span className="chip amber">{loopState}</span>
          <dl>
            <div>
              <dt>System</dt>
              <dd>{systemLabel}</dd>
            </div>
            <div>
              <dt>Review</dt>
              <dd>{reviewCount} pending</dd>
            </div>
            <div>
              <dt>Recent canon</dt>
              <dd>{recentEntities.length} records</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="draft-dashboard-grid" aria-label="Dashboard work areas">
        <article className="draft-loop-card">
          <div className="draft-section-head">
            <span className="section-label">Next action</span>
            {activeSession ? <span className="chip amber">{activeSession.status}</span> : <span className="chip sage">Manual ready</span>}
          </div>
          {activeSession ? (
            <>
              <h2 className="section-title">{activeSession.name}</h2>
              <p className="muted">
                {activeSession.objective || activeSession.opening_scene || "Prep is ready for details before Stage."}
              </p>
              <div className="draft-packet">
                <div>
                  <span>Objective</span>
                  <p>{activeSession.objective || "Add the session objective before Stage."}</p>
                </div>
                <div>
                  <span>Opening</span>
                  <p>{activeSession.opening_scene || "No opening scene yet."}</p>
                </div>
              </div>
              <div className="button-row">
                <Link className="button" href={`${root}/sessions/${activeSession.id}/prep`}>Continue prep</Link>
                {activeSession.status !== "planned" ? (
                  <Link className="button-ghost" href={`${root}/sessions/${activeSession.id}/stage`}>Open Stage</Link>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <h2 className="section-title">Plan your first session</h2>
              <p className="muted">Start with a light packet. The Stage opens after you mark the session Ready.</p>
              <form className="draft-inline-form" action={createSessionAction}>
                <HiddenContextFields params={params} />
                <input type="hidden" name="name" value="Session 1" />
                <label className="field">
                  <span>Objective</span>
                  <input className="input" name="objective" placeholder="What should the first session accomplish?" />
                </label>
                <button className="button" type="submit">Plan Session 1</button>
              </form>
            </>
          )}
        </article>

        <aside className="draft-side-stack">
          <article className="card">
            <span className="chip sage">Review</span>
            <h2 className="section-title">{reviewCount} pending items</h2>
            <p className="muted">Drafts become canon only through explicit GM approval.</p>
            <Link className="button-ghost" href={`${root}/review`}>Open Review</Link>
          </article>
          <article className="card">
            <span className="chip amber">Quick create</span>
            <h2 className="section-title">Capture momentum</h2>
            <div className="quick-create-grid">
              <Link className="button-ghost" href={`${root}/threads`}>Thread</Link>
              <Link className="button-ghost" href={`${root}/entities/new?type=character`}>Character</Link>
              <Link className="button-ghost" href={`${root}/entities/new?type=place`}>Place</Link>
              <Link className="button-ghost" href={`${root}/sessions/new`}>Session</Link>
            </div>
          </article>
        </aside>
      </section>

      <section className="draft-recent-section">
        <div className="draft-section-head">
          <div>
            <span className="section-label">Recent canon</span>
            <h2 className="section-title">What changed lately</h2>
          </div>
          <Link className="button-ghost" href={`${root}/entities`}>Open Library</Link>
        </div>
        <div className="entity-list">
          {recentEntities.length ? (
            recentEntities.map((entity) => <EntityCard key={`${entity.entityType}:${entity.id}`} params={params} entity={entity} />)
          ) : (
            <div className="card">Start with a character, place, faction, artifact, or thread.</div>
          )}
        </div>
      </section>
    </div>
  );
}
