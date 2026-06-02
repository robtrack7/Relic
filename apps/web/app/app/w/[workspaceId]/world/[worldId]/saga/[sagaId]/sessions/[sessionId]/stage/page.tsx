import { notFound } from "next/navigation";
import { markMomentAction, quickCaptureAction, quickStubAction, setSessionStatusAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { getActiveThreads, getPinnedEntities, getSession, requireSagaContext, searchForUi } from "@/lib/data";
import { parseGmNotesTags } from "@/lib/stage";
import type { IdParams } from "@/lib/types";

type StageParams = IdParams & { sessionId: string };

export default async function StagePage({ params, searchParams }: { params: Promise<StageParams>; searchParams: Promise<{ q?: string }> }) {
  const all = await params;
  const ids: IdParams = all;
  const query = await searchParams;
  const [{ saga }, session, pinned, activeThreads, results] = await Promise.all([
    requireSagaContext(ids),
    getSession(ids, all.sessionId),
    getPinnedEntities(ids, all.sessionId),
    getActiveThreads(ids, all.sessionId),
    searchForUi(ids, query.q ?? "", true)
  ]);
  if (!session) notFound();
  const isLive = ["started", "in_progress"].includes(session.status);

  return (
    <main className="stage-shell stage-app">
      <nav className="stage-rail" aria-label="Stage">
        <span className="stage-mark">R</span>
        <span>Home</span>
        <span>Threads</span>
        <span>Library</span>
        <span>Prep</span>
        <span>Review</span>
      </nav>
      <div className="stage-wrap stage-layout">
        <section className="stage-main">
        <header className="stage-hero">
          <div>
            <div className="eyebrow">The Stage</div>
            <h1 className="page-title">{session.name}</h1>
            <p className="muted">{saga.name}</p>
          </div>
          <div className="stage-status-row">
            <span className="stage-chip live">Live</span>
            <span className="stage-chip recording">Recording</span>
            <span className="stage-chip synced">Synced</span>
            <span className="stage-timer">01:42:45</span>
          </div>
          <form action={setSessionStatusAction}>
            <HiddenContextFields params={ids} />
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="status" value={session.status === "ready" ? "started" : "in_progress"} />
            <button className="button" type="submit">{session.status === "ready" ? "Start Session" : isLive ? "Live" : "Go live"}</button>
          </form>
        </header>

        <section className="stage-card stage-agenda">
          <div className="stage-agenda-head">
            <span className="section-label">Agenda</span>
            <span className="muted">Packet from Prepare</span>
          </div>
          <div className="stage-agenda-grid">
            <article>
              <span>Objective</span>
              <p>{session.objective || "No objective set."}</p>
            </article>
            <article>
              <span>Opening scene</span>
              <p>{session.opening_scene || "No opening scene set."}</p>
            </article>
            <article>
              <span>Scene notes</span>
              <p>{session.scene_notes || "No scene notes set."}</p>
            </article>
          </div>
        </section>

        <form className="stage-card field stage-search" action="">
          <label className="field">
            <span>Search saga</span>
            <input className="input" name="q" defaultValue={query.q ?? ""} placeholder="Literal quick match..." />
          </label>
          {results.length ? <div>{results.map((result) => <p key={result.source_entity_id}>{result.snippet}</p>)}</div> : null}
        </form>
        <section className="stage-card stage-pinned">
          <div className="stage-agenda-head">
            <span className="section-label">Pinned entities</span>
            <span className="muted">{pinned.length} pinned</span>
          </div>
          <div className="stage-pinned-strip">
            {pinned.map((item) => {
              const entity = item.entity!;
              return (
                <article className="stage-pinned-card" key={`${entity.entityType}:${entity.id}`}>
                  <span>{entity.entityType}</span>
                  <strong>{entity.name}</strong>
                  <em>Active</em>
                </article>
              );
            })}
          </div>
        </section>

        <section className="stage-detail-grid">
          {pinned.map((item) => {
            const entity = item.entity!;
            const tags = parseGmNotesTags(entity.gm_notes);
            return (
              <article className="stage-card" key={`${entity.entityType}:${entity.id}`}>
                <span className="chip amber">{entity.entityType}</span>
                <h2 className="section-title">{entity.name}</h2>
                <p>{entity.summary}</p>
                {tags.voice ? <p><strong>Voice:</strong> {tags.voice}</p> : null}
                {tags.wants ? <p><strong>Wants:</strong> {tags.wants}</p> : null}
                {tags.body ? <p className="muted">{tags.body}</p> : null}
              </article>
            );
          })}
          {activeThreads.map((thread) => thread ? <article className="stage-card" key={thread.id}><span className="chip sage">Thread</span><h2 className="section-title">{thread.name}</h2><p>{thread.summary}</p></article> : null)}
        </section>
        <section className="content-grid">
          <form className="stage-card form-stack" action={quickCaptureAction}>
            <HiddenContextFields params={ids} />
            <input type="hidden" name="sessionId" value={session.id} />
            <label className="field"><span>Quick capture</span><textarea className="textarea" name="body" /></label>
            <button className="button" type="submit">Capture</button>
          </form>
          <form className="stage-card form-stack" action={quickStubAction}>
            <HiddenContextFields params={ids} />
            <input type="hidden" name="sessionId" value={session.id} />
            <label className="field"><span>Quick stub</span><input className="input" name="name" /></label>
            <select className="select" name="entityType" defaultValue="character"><option value="character">Character</option><option value="place">Place</option><option value="thread">Thread</option></select>
            <input className="input" name="summary" placeholder="Short note" />
            <button className="button" type="submit">Create stub</button>
          </form>
        </section>
        <div className="stage-actions">
          <form action={setSessionStatusAction}>
            <HiddenContextFields params={ids} /><input type="hidden" name="sessionId" value={session.id} /><input type="hidden" name="status" value="in_progress" />
            <button className="button-rust" type="submit">Record state</button>
          </form>
          <form action={markMomentAction}>
            <HiddenContextFields params={ids} /><input type="hidden" name="sessionId" value={session.id} />
            <button className="button-ghost" type="submit">Mark Moment</button>
          </form>
          <form action={setSessionStatusAction}>
            <HiddenContextFields params={ids} /><input type="hidden" name="sessionId" value={session.id} /><input type="hidden" name="status" value="ended_pending_undo" />
            <button className="button-rust" type="submit">End Session</button>
          </form>
        </div>
        </section>
        <aside className="stage-loom" aria-label="The Loom">
          <form className="stage-end-session" action={setSessionStatusAction}>
            <HiddenContextFields params={ids} />
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="status" value="ended_pending_undo" />
            <button type="submit">End Session</button>
          </form>
          <div className="loom-header">
            <span className="loom-spark">+</span>
            <div>
              <h2>The Loom</h2>
              <p>Your AI partner for live story support.</p>
            </div>
          </div>
          <div className="stage-card">
            <span className="section-label">Recent context</span>
            <p>Active Threads: {activeThreads.filter(Boolean).length}</p>
            <p>Pinned entities: {pinned.length}</p>
          </div>
          <div className="loom-prompts">
            <button type="button">What is the current risk?</button>
            <button type="button">Who is connected to this scene?</button>
            <button type="button">Are there unresolved threads?</button>
          </div>
          <form className="loom-composer">
            <label className="sr-only" htmlFor="stage-loom-prompt">Ask The Loom</label>
            <input id="stage-loom-prompt" placeholder="Ask about this session..." />
            <button type="button">Send</button>
          </form>
        </aside>
      </div>
    </main>
  );
}
