import Link from "next/link";
import { markMomentAction, quickCaptureAction, quickStubAction, setSessionStatusAction } from "@/app/actions";
import { RelicIcon } from "@/components/RelicIcon";
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

function entityPortraitColor(type: string): string {
  const map: Record<string, string> = {
    character: "var(--hue-npc)",
    place: "var(--hue-location)",
    faction: "var(--hue-faction)",
    artifact: "#8b6914",
    thread: "var(--hue-thread)",
  };
  return map[type] ?? "var(--stone-700)";
}

export function StageRuntimeDraft({
  params,
  saga,
  session,
  pinned,
  activeThreads,
  results,
  query,
}: StageRuntimeDraftProps) {
  const root = sagaPath(params);
  const live = ["started", "in_progress"].includes(session.status);
  const visiblePinned = pinned.filter(
    (item): item is { pin: { entity_type: string; entity_id: string }; entity: EntitySummary } =>
      Boolean(item.entity)
  );
  const selectedEntity = visiblePinned[0]?.entity;
  const selectedTags = selectedEntity ? parseGmNotesTags(selectedEntity.gm_notes) : null;
  const threads = activeThreads.filter((t): t is EntitySummary => Boolean(t));

  return (
    <div className="stage-shell" style={{ height: "100dvh" }}>
      {/* Stage top bar */}
      <header className="stage-topbar">
        <div className="stage-session-label">
          <span className="stage-session-num">Stage · {saga.name}</span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--stage-fg-1)", fontWeight: 400, margin: 0, letterSpacing: "-0.01em" }}>{session.name}</h1>
        </div>

        <div className="stage-chips">
          {live ? (
            <span className="stage-chip-live">
              <span className="dot live pulse" />
              {statusLabel(session.status)}
            </span>
          ) : (
            <span className="stage-chip-live">{statusLabel(session.status)}</span>
          )}
          {live && <span className="stage-chip-rec"><span className="dot" />Recording ready</span>}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <form action={setSessionStatusAction}>
            <HiddenContextFields params={params} />
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="status" value={nextLiveStatus(session.status)} />
            <button className="btn btn-amber btn-sm" type="submit">
              {session.status === "ready" ? "Start Session" : live ? "Live" : "Go live"}
            </button>
          </form>
          <Link className="stage-sanctum-btn" href={root}>
            <RelicIcon name="home" size={13} />
            Sanctum
          </Link>
        </div>
      </header>

      <div className="stage-body">
        {/* Main stage area */}
        <div className="stage-main-wrap">
          <div className="stage-main">
            <div className="stage-main-top">
              {/* Search bar */}
              <form action="" style={{ marginBottom: 4 }}>
                <label className="sr-only" htmlFor="stage-search">Search saga during play</label>
                <div className="stage-search">
                  <RelicIcon name="search" size={14} />
                  <input
                    id="stage-search"
                    name="q"
                    defaultValue={query}
                    placeholder="Search saga…"
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, color: "var(--stage-fg-2)", fontFamily: "var(--font-ui)" }}
                  />
                </div>
              </form>

              {/* Search results */}
              {results.length > 0 && (
                <div className="stage-card" aria-label="Search results">
                  <div className="stage-sec-label">Results</div>
                  {results.slice(0, 4).map((r) => (
                    <div key={`${r.source_kind}:${r.source_entity_id}`} className="agenda-item">
                      <span className="agenda-txt">{r.snippet}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Agenda */}
              <div className="stage-card" role="region" aria-label="Agenda">
                <div className="stage-sec-label">
                  <span>Agenda</span>
                  <span className="stage-text-btn">From packet</span>
                </div>
                {session.objective && (
                  <div className="agenda-item">
                    <span className="agenda-num">1</span>
                    <span className="agenda-txt">{session.objective}</span>
                  </div>
                )}
                {session.opening_scene && (
                  <div className="agenda-item">
                    <span className="agenda-num">2</span>
                    <span className="agenda-txt">{session.opening_scene}</span>
                  </div>
                )}
                {session.scene_notes && (
                  <div className="agenda-item">
                    <span className="agenda-num">3</span>
                    <span className="agenda-txt">{session.scene_notes}</span>
                  </div>
                )}
                {!session.objective && !session.opening_scene && (
                  <div className="agenda-item">
                    <span className="agenda-txt" style={{ fontStyle: "italic", opacity: 0.5 }}>
                      No packet set. Return to Prepare to add the agenda.
                    </span>
                  </div>
                )}
              </div>

              {/* Pinned entities strip */}
              <div>
                <div className="stage-sec-label">
                  <span>Pinned</span>
                  <span className="stage-text-btn">{visiblePinned.length} records</span>
                </div>
                <div className="pinned-strip" aria-label="Pinned entities">
                  {visiblePinned.length ? visiblePinned.map(({ entity }) => (
                    <div key={`${entity.entityType}:${entity.id}`} className="pinned-card">
                      <div
                        className="pinned-portrait"
                        style={{ background: entityPortraitColor(entity.entityType), opacity: 0.18, borderRadius: "var(--radius-sm)" }}
                      />
                      <div className="pinned-name">{entity.name}</div>
                      <div className="pinned-type-txt">{entity.entityType}</div>
                    </div>
                  )) : (
                    <div style={{ fontSize: 11, color: "var(--stage-fg-3)", fontStyle: "italic" }}>
                      No pinned entities. Add them in Prepare.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selected entity expanded */}
            <div className="stage-pinned-entity">
              {selectedEntity ? (
                <div className="entity-expanded">
                  {/* Left column — portrait */}
                  <div className="ent-col-left">
                    <div className="ent-portrait">
                      <div className="ent-portrait-watermark" style={{ fontSize: 80, fontFamily: "var(--font-display)" }}>
                        {selectedEntity.name[0]}
                      </div>
                      <div className="ent-portrait-gradient" />
                      <div className="ent-portrait-foot">
                        <span className="entity-name">{selectedEntity.name}</span>
                        <span className="entity-meta">{selectedEntity.entityType}</span>
                      </div>
                    </div>
                    {selectedTags && (selectedTags.voice || selectedTags.wants) && (
                      <div className="ent-meta-block">
                        {selectedTags.voice && (
                          <div className="entity-gm-note"><strong>Voice</strong> {selectedTags.voice}</div>
                        )}
                        {selectedTags.wants && (
                          <div className="entity-gm-note"><strong>Wants</strong> {selectedTags.wants}</div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Middle column — description */}
                  <div className="ent-col-mid">
                    {selectedEntity.summary && (
                      <div className="ent-section">
                        <span className="ent-section-label">Summary</span>
                        <p className="ent-section-text">{selectedEntity.summary}</p>
                      </div>
                    )}
                    {selectedEntity.narrative && (
                      <div className="ent-section">
                        <span className="ent-section-label">Narrative</span>
                        <p className="ent-section-text ent-section-flavor">{selectedEntity.narrative}</p>
                      </div>
                    )}
                    {selectedTags?.body && (
                      <div className="ent-section">
                        <span className="ent-section-label">GM notes</span>
                        <p className="ent-section-text">{selectedTags.body}</p>
                      </div>
                    )}
                  </div>
                  {/* Right column — threads */}
                  <div className="ent-col-right">
                    {threads.length > 0 && (
                      <div className="ent-right-section">
                        <div className="ent-section-label">Active threads</div>
                        {threads.map((thread) => (
                          <div key={thread.id} className="ent-link-item">
                            <RelicIcon name="threads" size={11} />
                            {thread.name}
                          </div>
                        ))}
                      </div>
                    )}
                    <Link
                      className="ent-open-btn"
                      href={`${root}/entities/${selectedEntity.entityType}/${selectedEntity.id}`}
                    >
                      Open in Library <RelicIcon name="arrowRight" size={10} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="stage-card" style={{ textAlign: "center", padding: "32px 16px" }}>
                  <div style={{ fontSize: 13, color: "var(--stage-fg-3)", fontStyle: "italic" }}>
                    Pin entities in Prepare to see them here during play.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Float action bar */}
          <div className="stage-float-actions" aria-label="Stage actions">
            <form action={setSessionStatusAction}>
              <HiddenContextFields params={params} />
              <input type="hidden" name="sessionId" value={session.id} />
              <input type="hidden" name="status" value="in_progress" />
              <button className="float-btn float-btn-record" type="submit">
                <span className="dot recording pulse" />
                Record
              </button>
            </form>
            <form action={markMomentAction}>
              <HiddenContextFields params={params} />
              <input type="hidden" name="sessionId" value={session.id} />
              <button className="float-btn float-btn-moment" type="submit">
                <RelicIcon name="target" size={14} />
                Mark Moment
              </button>
            </form>
            <button className="float-btn" type="button">
              <RelicIcon name="clock" size={14} />
              Dice
            </button>
          </div>
        </div>

        {/* Stage Loom sidecar */}
        <aside className="stage-loom" aria-label="The Loom">
          <div className="stage-loom-head">
            <span className="stage-loom-title">
              <RelicIcon name="spark" size={12} /> The Loom
            </span>
            <div className="stage-loom-tabs">
              <button type="button" className="stage-loom-tab active">Notes</button>
              <button type="button" className="stage-loom-tab">Ask</button>
            </div>
          </div>

          <div className="stage-loom-body">
            <div className="sloom-section">
              <span className="sloom-label">Context</span>
              <span className="sloom-text">
                {threads.length} active threads · {visiblePinned.length} pinned records
              </span>
            </div>

            {/* Quick capture */}
            <form action={quickCaptureAction}>
              <HiddenContextFields params={params} />
              <input type="hidden" name="sessionId" value={session.id} />
              <div className="sloom-section">
                <span className="sloom-label">Quick capture</span>
                <div className="stage-loom-composer">
                  <textarea name="body" placeholder="Capture a table note…" rows={2} />
                  <button type="submit" className="sloom-send" aria-label="Capture">
                    <RelicIcon name="send" size={12} />
                  </button>
                </div>
              </div>
            </form>

            {/* Quick stub */}
            <form action={quickStubAction}>
              <HiddenContextFields params={params} />
              <input type="hidden" name="sessionId" value={session.id} />
              <div className="sloom-section">
                <span className="sloom-label">Quick stub</span>
                <input
                  name="name"
                  placeholder="NPC or place name…"
                  style={{ width: "100%", padding: "6px 9px", border: "1px solid var(--stage-border)", borderRadius: "var(--radius-md)", background: "var(--stage-card-2)", color: "var(--stage-fg-2)", fontSize: 12, fontFamily: "var(--font-ui)", outline: "none", marginBottom: 5 }}
                />
                <select
                  name="entityType"
                  defaultValue="character"
                  style={{ width: "100%", padding: "5px 9px", border: "1px solid var(--stage-border)", borderRadius: "var(--radius-md)", background: "var(--stage-card-2)", color: "var(--stage-fg-2)", fontSize: 12, fontFamily: "var(--font-ui)", outline: "none", marginBottom: 5 }}
                >
                  <option value="character">Character</option>
                  <option value="place">Place</option>
                  <option value="faction">Faction</option>
                  <option value="artifact">Artifact</option>
                  <option value="thread">Thread</option>
                </select>
                <input
                  name="summary"
                  placeholder="Short note…"
                  style={{ width: "100%", padding: "6px 9px", border: "1px solid var(--stage-border)", borderRadius: "var(--radius-md)", background: "var(--stage-card-2)", color: "var(--stage-fg-2)", fontSize: 12, fontFamily: "var(--font-ui)", outline: "none", marginBottom: 5 }}
                />
                <div className="sloom-quick-btns">
                  <button type="submit" className="sloom-quick-btn">Create stub</button>
                </div>
              </div>
            </form>

            {/* Active threads */}
            {threads.length > 0 && (
              <div className="sloom-section">
                <span className="sloom-label">Threads</span>
                {threads.map((thread) => (
                  <div key={thread.id} className="sloom-flag ok">
                    <RelicIcon name="threads" size={11} />
                    {thread.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="stage-loom-foot">
            <form action={setSessionStatusAction}>
              <HiddenContextFields params={params} />
              <input type="hidden" name="sessionId" value={session.id} />
              <input type="hidden" name="status" value="ended_pending_undo" />
              <button type="submit" className="stage-end-btn">End Session</button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
