import Link from "next/link";
import { markMomentAction, quickCaptureAction, quickStubAction, setSessionStatusAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { parseGmNotesTags } from "@/lib/stage";
import { sagaPath } from "@/lib/routes";
import type { EntitySummary, IdParams, SearchResult } from "@/lib/types";

type StageSession = {
  id: string;
  name: string;
  status: string;
  objective?: string | null;
  opening_scene?: string | null;
  scene_notes?: string | null;
};

type StageRuntimeDraftProps = {
  params: IdParams;
  saga: { name: string };
  session: StageSession;
  pinned: Array<{ pin: { entity_type: string; entity_id: string }; entity?: EntitySummary | null }>;
  activeThreads: Array<EntitySummary | undefined>;
  results: SearchResult[];
  query: string;
};

function statusLabel(status: string) {
  if (status === "ready") return "Ready";
  if (status === "started") return "Started";
  if (status === "in_progress") return "Live";
  if (status === "ended_pending_undo") return "Undo window";
  return status;
}

function nextLiveStatus(status: string) {
  return status === "ready" ? "started" : "in_progress";
}

export function StageRuntimeDraft({
  params,
  saga,
  session,
  pinned,
  activeThreads,
  results,
  query
}: StageRuntimeDraftProps) {
  const root = sagaPath(params);
  const live = ["started", "in_progress"].includes(session.status);
  const visiblePinned = pinned.filter((item): item is { pin: { entity_type: string; entity_id: string }; entity: EntitySummary } => Boolean(item.entity));
  const selectedEntity = visiblePinned[0]?.entity;
  const selectedTags = selectedEntity ? parseGmNotesTags(selectedEntity.gm_notes) : null;

  return (
    <main className="stage-draft-shell">
      <header className="stage-draft-topbar">
        <div>
          <span className="stage-draft-kicker">The Stage · {saga.name}</span>
          <h1>{session.name}</h1>
        </div>
        <div className="stage-draft-state">
          <span className={live ? "stage-draft-chip live" : "stage-draft-chip"}>{statusLabel(session.status)}</span>
          {live ? <span className="stage-draft-chip recording">Recording ready</span> : null}
          <form action={setSessionStatusAction}>
            <HiddenContextFields params={params} />
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="status" value={nextLiveStatus(session.status)} />
            <button className="button" type="submit">{session.status === "ready" ? "Start Session" : live ? "Live" : "Go live"}</button>
          </form>
          <Link className="stage-draft-sanctum" href={root}>Sanctum</Link>
        </div>
      </header>

      <div className="stage-draft-body">
        <section className="stage-draft-main">
          <form className="stage-draft-search" action="">
            <label className="sr-only" htmlFor="stage-search">Search saga during play</label>
            <input id="stage-search" name="q" defaultValue={query} placeholder="Search saga..." />
            <button type="submit">Search</button>
          </form>

          {results.length ? (
            <section className="stage-draft-results" aria-label="Search results">
              {results.map((result) => (
                <p key={`${result.source_kind}:${result.source_entity_id}`}>{result.snippet}</p>
              ))}
            </section>
          ) : null}

          <section className="stage-draft-agenda" aria-label="Agenda">
            <div className="stage-draft-section-head">
              <span>Agenda</span>
              <em>Packet from Prepare</em>
            </div>
            <div className="stage-draft-agenda-grid">
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

          <section className="stage-draft-pinned" aria-label="Pinned entities">
            <div className="stage-draft-section-head">
              <span>Pinned</span>
              <em>{visiblePinned.length} records</em>
            </div>
            <div className="stage-draft-pinned-strip">
              {visiblePinned.length ? visiblePinned.map(({ entity }) => (
                <article key={`${entity.entityType}:${entity.id}`} className="stage-draft-pin">
                  <span>{entity.entityType}</span>
                  <strong>{entity.name}</strong>
                  <em>{entity.is_stub ? "Stub" : "Canon"}</em>
                </article>
              )) : <p>No pinned entities yet. Return to Prepare to pin the table packet.</p>}
            </div>
          </section>

          <section className="stage-draft-detail" aria-label="Selected pinned detail">
            {selectedEntity ? (
              <>
                <article className="stage-draft-entity-card">
                  <span className="stage-draft-card-label">{selectedEntity.entityType}</span>
                  <h2>{selectedEntity.name}</h2>
                  <p>{selectedEntity.summary || "No summary yet."}</p>
                  {selectedTags?.voice ? <div><span>Voice</span><p>{selectedTags.voice}</p></div> : null}
                  {selectedTags?.wants ? <div><span>Wants</span><p>{selectedTags.wants}</p></div> : null}
                  {selectedTags?.body ? <div><span>GM notes</span><p>{selectedTags.body}</p></div> : null}
                </article>
                <aside className="stage-draft-thread-stack">
                  <span className="stage-draft-card-label">Threads</span>
                  {activeThreads.filter(Boolean).map((thread) => thread ? (
                    <article key={thread.id}>
                      <strong>{thread.name}</strong>
                      <p>{thread.summary || "No thread summary yet."}</p>
                    </article>
                  ) : null)}
                </aside>
              </>
            ) : (
              <article className="stage-draft-entity-card">
                <span className="stage-draft-card-label">Packet</span>
                <h2>No pinned card selected</h2>
                <p>Stage remains usable. Pin entities in Prepare when the session packet is ready.</p>
              </article>
            )}
          </section>
        </section>

        <aside className="stage-draft-loom" aria-label="The Loom">
          <div>
            <span className="stage-draft-card-label">Live context</span>
            <p>{activeThreads.filter(Boolean).length} active threads and {visiblePinned.length} pinned records are available for cited questions.</p>
          </div>
          <form className="stage-draft-form" action={quickCaptureAction}>
            <HiddenContextFields params={params} />
            <input type="hidden" name="sessionId" value={session.id} />
            <label className="field">
              <span>Quick capture</span>
              <textarea className="textarea" name="body" placeholder="Capture a table note..." />
            </label>
            <button className="button" type="submit">Capture</button>
          </form>
          <form className="stage-draft-form" action={quickStubAction}>
            <HiddenContextFields params={params} />
            <input type="hidden" name="sessionId" value={session.id} />
            <label className="field">
              <span>Quick stub</span>
              <input className="input" name="name" placeholder="Name" />
            </label>
            <select className="select" name="entityType" defaultValue="character">
              <option value="character">Character</option>
              <option value="place">Place</option>
              <option value="faction">Faction</option>
              <option value="artifact">Artifact</option>
              <option value="thread">Thread</option>
            </select>
            <input className="input" name="summary" placeholder="Short note" />
            <button className="button-ghost" type="submit">Create stub</button>
          </form>
          <form className="stage-draft-end" action={setSessionStatusAction}>
            <HiddenContextFields params={params} />
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="status" value="ended_pending_undo" />
            <button type="submit">End Session</button>
          </form>
        </aside>
      </div>

      <nav className="stage-draft-actions" aria-label="Stage actions">
        <form action={setSessionStatusAction}>
          <HiddenContextFields params={params} />
          <input type="hidden" name="sessionId" value={session.id} />
          <input type="hidden" name="status" value="in_progress" />
          <button className="stage-draft-action record" type="submit">Record</button>
        </form>
        <form action={markMomentAction}>
          <HiddenContextFields params={params} />
          <input type="hidden" name="sessionId" value={session.id} />
          <button className="stage-draft-action moment" type="submit">Mark Moment</button>
        </form>
        <button className="stage-draft-action" type="button">Dice</button>
      </nav>
    </main>
  );
}
