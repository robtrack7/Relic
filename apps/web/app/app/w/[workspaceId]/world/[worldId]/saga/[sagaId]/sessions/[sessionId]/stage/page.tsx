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

  return (
    <main className="stage-shell">
      <div className="stage-wrap">
        <header className="stage-card topbar">
          <div>
            <div className="eyebrow">The Stage · Browser fallback</div>
            <h1 className="page-title">{session.name}</h1>
            <p className="muted">{saga.name} · {session.status}</p>
          </div>
          <form action={setSessionStatusAction}>
            <HiddenContextFields params={ids} />
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="status" value={session.status === "ready" ? "started" : "in_progress"} />
            <button className="button" type="submit">{session.status === "ready" ? "Start Session" : "Go live"}</button>
          </form>
        </header>
        <form className="stage-card field" action="">
          <span>Search saga</span>
          <input className="input" name="q" defaultValue={query.q ?? ""} placeholder="Literal quick match..." />
          {results.length ? <div>{results.map((result) => <p key={result.source_entity_id}>{result.snippet}</p>)}</div> : null}
        </form>
        <section className="stage-card">
          <h2 className="section-title">Agenda</h2>
          <p><strong>Objective:</strong> {session.objective || "No objective set."}</p>
          <p><strong>Opening:</strong> {session.opening_scene || "No opening scene set."}</p>
          <p><strong>Notes:</strong> {session.scene_notes || "No scene notes set."}</p>
        </section>
        <section className="content-grid">
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
      </div>
    </main>
  );
}
