import React, { useState, useRef, useEffect } from 'react';
import { Shell } from './Shell';
import { I, Dot } from './Primitives';
import { useApp } from './AppContext';

interface StageViewProps {
  variant?: "active" | "ready" | "endConfirm";
  endConfirm?: boolean;
  showUndo?: boolean;
}

const BEATS = [
  { n: 1, text: "The body at Quay 4 — discovery and investigation", done: true },
  { n: 2, text: "Confront the Dockmaster at his office", done: true },
  { n: 3, text: "The midnight signal — Kael agent arrives", done: false },
  { n: 4, text: "The quay chase", done: false },
  { n: 5, text: "Resolution at the harbor", done: false },
];

const PINNED = [
  { name: "Castellan Veyra",  type: "NPC",      icon: "users" },
  { name: "The Dockmaster",   type: "NPC",      icon: "users" },
  { name: "Mira Ashborne",    type: "NPC",      icon: "users" },
  { name: "Fenwick Harbor",   type: "Location", icon: "map"   },
  { name: "The Forged Deed",  type: "Artifact", icon: "star"  },
];

const TYPE_COLOR: Record<string, string> = {
  NPC:      "rgba(184,112,42,0.18)",
  Location: "rgba(107,143,163,0.18)",
  Artifact: "rgba(47,107,110,0.18)",
  Faction:  "rgba(123,94,167,0.18)",
};
const TYPE_FG: Record<string, string> = {
  NPC:      "var(--amber)",
  Location: "var(--hue-location)",
  Artifact: "var(--verdigris)",
  Faction:  "var(--hue-faction)",
};

const ENTITY = {
  name: "The Dockmaster",
  realName: "Erlen Holt",
  type: "NPC",
  relationship: "uncertain" as const,
  stats: [
    { label: "Cunning",   val: 72 },
    { label: "Craft",     val: 28 },
    { label: "Influence", val: 45 },
  ],
  wants: "To keep his family safe. Wants House Kael gone from Fenwick and his debts cleared.",
  needs: "Someone trustworthy enough to act as intermediary — without getting them killed.",
  summary: "Revealed as an informant for the Crown. Allegiance unclear. Speaks with a slight lisp and will not meet anyone's eyes. Has operated the Fenwick docks for eleven years.",
  gmNote: "He is terrified. House Kael has his family. Play him as desperate, not duplicitous.",
  links: [
    { label: "Crown's Keep",         icon: "anchor"   },
    { label: "House Kael",           icon: "flame"    },
    { label: "The Harbor Reckoning", icon: "sessions" },
  ],
  places: [
    { label: "Fenwick Harbor",            icon: "map" },
    { label: "The Harbormaster's Office", icon: "map" },
  ],
  sessions: [
    { label: "Session 14", icon: "clock" },
    { label: "Session 15", icon: "clock" },
    { label: "Session 16", icon: "clock" },
  ],
};

const REL: Record<string, { label: string; bg: string; color: string }> = {
  ally:      { label: "Ally",      bg: "rgba(47,107,110,0.18)",  color: "var(--verdigris)"  },
  hostile:   { label: "Hostile",   bg: "rgba(138,56,40,0.18)",   color: "var(--rust)"       },
  uncertain: { label: "Uncertain", bg: "rgba(184,112,42,0.14)",  color: "var(--amber)"      },
  neutral:   { label: "Neutral",   bg: "rgba(198,190,179,0.12)", color: "var(--stage-fg-3)" },
};

export function StageView({ variant = "active", endConfirm = false, showUndo = false }: StageViewProps) {
  const app = useApp();
  const [loomMode, setLoomMode] = useState("live");
  const [selectedPinned, setSelectedPinned] = useState(1);

  const pinnedRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pinnedSectionRef = useRef<HTMLDivElement>(null);
  const [connectorX, setConnectorX] = useState<number | null>(null);

  useEffect(() => {
    const el = pinnedRefs.current[selectedPinned];
    const section = pinnedSectionRef.current;
    if (el && section) {
      const eR = el.getBoundingClientRect();
      const sR = section.getBoundingClientRect();
      setConnectorX(eR.left - sR.left + eR.width / 2);
    }
  }, [selectedPinned]);

  function handleEndSession() { app?.update({ stageEndConfirm: true }); }
  function handleConfirmEnd() {
    app?.navigate("sessions", {
      sessionsView: "pipeline", pipelineState: "processing",
      sessionState: "review", stageEndConfirm: false, prepLocked: false,
    });
  }
  function handleCancelEnd() { app?.update({ stageEndConfirm: false }); }

  const rel = REL[ENTITY.relationship] || REL.neutral;

  return (
    <Shell active="sessions" stageMode>
      <div className="stage-shell">

        {/* Top bar */}
        <div className="stage-topbar">
          <div className="stage-session-label">
            <span className="stage-session-num">Session 16</span>
            The Harbor Reckoning
          </div>
          <div className="stage-chips">
            {variant === "ready" && (
              <span className="stage-chip-live"><Dot kind="amber" />Ready</span>
            )}
            {(variant === "active" || endConfirm) && (
              <>
                <span className="stage-chip-live"><Dot kind="live pulse" />Live</span>
                <span className="stage-chip-rec"><Dot kind="recording pulse" />Recording</span>
              </>
            )}
          </div>
          {variant !== "ready" && <div className="stage-timer">1:23:07</div>}
          <div style={{ marginLeft: "auto" }}>
            <button className="stage-sanctum-btn" onClick={() => app?.navigate("home")}>
              <I n="bolt" size={12} /> Sanctum
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="stage-body">

          <div className="stage-main-wrap">
            <div className="stage-main">

              {/* Fixed top: search + agenda */}
              <div className="stage-main-top">
                <div className="stage-search">
                  <I n="search" size={13} style={{ color: "var(--stage-fg-3)", flexShrink: 0 }} />
                  <span style={{ flex: 1, color: "var(--stage-fg-3)" }}>Search saga...</span>
                  <span className="stage-kbd">K</span>
                </div>
                <div className="stage-card">
                  <div className="stage-sec-label" style={{ marginBottom: 6 }}>
                    <span>Agenda</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--stage-fg-3)" }}>
                      {BEATS.filter(b => b.done).length}/{BEATS.length} beats
                    </span>
                  </div>
                  {BEATS.map((a, i) => (
                    <div key={i} className={"agenda-item" + (a.done ? " agenda-item-done" : "")}>
                      <span className="agenda-num">{a.n}</span>
                      <span className="agenda-txt">{a.text}</span>
                      {a.done && <I n="check" size={11} style={{ color: "var(--verdigris)", flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pinned strip + expanded entity — fills remaining vertical space */}
              <div className="stage-pinned-entity" ref={pinnedSectionRef}>

                <div className="stage-sec-label" style={{ marginBottom: 8, flexShrink: 0 }}>
                  <span>Pinned</span>
                  <button className="stage-text-btn">+ Pin entity</button>
                </div>

                <div className="pinned-strip" style={{ flexShrink: 0 }}>
                  {PINNED.map((e, i) => (
                    <div
                      key={i}
                      ref={el => { pinnedRefs.current[i] = el; }}
                      className={"pinned-card" + (i === selectedPinned ? " pinned-card-sel" : "")}
                      onClick={() => setSelectedPinned(i)}
                    >
                      <div className="pinned-portrait" style={{
                        background: TYPE_COLOR[e.type] || "rgba(255,255,255,0.04)",
                        color: TYPE_FG[e.type] || "var(--stage-fg-3)",
                      }}>
                        <I n={e.icon} size={20} />
                      </div>
                      <div className="pinned-name">{e.name}</div>
                      <div className="pinned-type-txt">{e.type}</div>
                    </div>
                  ))}
                </div>

                {/* Amber connector line from selected pinned card to entity card */}
                <div style={{ position: "relative", height: 10, flexShrink: 0 }}>
                  {connectorX !== null && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: Math.round(connectorX) - 1,
                      width: 2,
                      background: "rgba(184,112,42,0.5)",
                      borderRadius: 1,
                    }} />
                  )}
                </div>

                {/* 3-column expanded entity */}
                <div className="entity-expanded">

                  {/* Col 1 — Portrait + badges + stats */}
                  <div className="ent-col-left">
                    <div className="ent-portrait">
                      <div className="ent-portrait-watermark">
                        <I n="users" size={90} />
                      </div>
                      <div className="ent-portrait-gradient" />
                      <div className="ent-portrait-foot">
                        <span className="entity-name">{ENTITY.name}</span>
                        <span className="entity-meta">{ENTITY.realName}</span>
                      </div>
                    </div>
                    <div className="ent-meta-block">
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <span className="ent-type-badge" style={{
                          background: TYPE_COLOR[ENTITY.type],
                          color: TYPE_FG[ENTITY.type],
                        }}>
                          {ENTITY.type}
                        </span>
                        <span className="ent-rel-badge" style={{
                          background: rel.bg,
                          color: rel.color,
                          borderColor: rel.color,
                        }}>
                          {rel.label}
                        </span>
                      </div>
                      <div className="ent-stats">
                        <div className="ent-stat-section-label">Attributes</div>
                        {ENTITY.stats.map(s => (
                          <div key={s.label} className="ent-stat-row">
                            <span className="ent-stat-name">{s.label}</span>
                            <div className="ent-stat-track">
                              <div className="ent-stat-fill" style={{ width: `${s.val}%` }} />
                            </div>
                            <span className="ent-stat-val">{s.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Col 2 — Wants / Needs / Summary / GM note */}
                  <div className="ent-col-mid" style={{ flexDirection: "row", padding: 0, gap: 0, overflowY: "hidden" }}>

                    {/* Left sub-column — Wants / Needs */}
                    <div style={{ flex: 1, padding: "18px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                      <div className="ent-section">
                        <div className="ent-section-label">Wants</div>
                        <p className="ent-section-text">{ENTITY.wants}</p>
                      </div>
                      <div className="ent-section">
                        <div className="ent-section-label">Needs</div>
                        <p className="ent-section-text">{ENTITY.needs}</p>
                      </div>
                      {endConfirm && (
                        <div className="end-confirm-card">
                          <div className="end-confirm-title">End Session 16?</div>
                          <div className="end-confirm-desc">
                            This will stop recording, preserve all captures, and send the session to the review pipeline. You cannot undo this after 60 seconds.
                          </div>
                          <div className="end-confirm-actions">
                            <button className="stage-btn-rust" onClick={handleConfirmEnd}>End session</button>
                            <button className="stage-btn-ghost" onClick={handleCancelEnd}>Cancel</button>
                          </div>
                        </div>
                      )}
                      {showUndo && (
                        <div className="undo-banner">
                          <div className="undo-count">47</div>
                          <div className="undo-text">Session ended. Undo available for 47 seconds.</div>
                          <button style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", padding: "5px 10px", border: "1px solid rgba(184,112,42,0.4)", borderRadius: "var(--r-sm)", color: "var(--amber)", background: "rgba(184,112,42,0.08)", cursor: "pointer" }}>Undo</button>
                        </div>
                      )}
                    </div>

                    {/* Column rule */}
                    <div style={{ width: 1, flexShrink: 0, background: "var(--stage-border)", margin: "18px 0" }} />

                    {/* Right sub-column — Summary / GM note */}
                    <div style={{ flex: 1, padding: "18px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                      <div className="ent-section">
                        <div className="ent-section-label">Summary</div>
                        <p className="ent-section-text ent-section-flavor">{ENTITY.summary}</p>
                      </div>
                      <div className="entity-gm-note">
                        <I n="spark" size={10} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
                        {ENTITY.gmNote}
                      </div>
                    </div>

                  </div>

                  {/* Col 3 — Links / Places / Sessions */}
                  <div className="ent-col-right">
                    <div className="ent-right-section">
                      <div className="ent-section-label">Links</div>
                      {ENTITY.links.map(l => (
                        <div key={l.label} className="ent-link-item">
                          <I n={l.icon} size={10} style={{ flexShrink: 0, color: "var(--stage-fg-3)" }} />
                          <span>{l.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="ent-right-section">
                      <div className="ent-section-label">Places</div>
                      {ENTITY.places.map(p => (
                        <div key={p.label} className="ent-link-item">
                          <I n={p.icon} size={10} style={{ flexShrink: 0, color: "var(--hue-location)" }} />
                          <span>{p.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="ent-right-section">
                      <div className="ent-section-label">Sessions</div>
                      {ENTITY.sessions.map(s => (
                        <div key={s.label} className="ent-link-item">
                          <I n={s.icon} size={10} style={{ flexShrink: 0, color: "var(--stage-fg-3)" }} />
                          <span>{s.label}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="ent-open-btn"
                      onClick={() => app?.navigate("library", { libraryView: "detail" })}
                    >
                      <I n="arrowRight" size={11} />
                      Open in Library
                    </button>
                  </div>

                </div>
              </div>

            </div>

            {/* Floating action buttons */}
            <div className="stage-float-actions">
              <button className="float-btn float-btn-record">
                <Dot kind="recording pulse" />
                <span>Record</span>
              </button>
              <button className="float-btn float-btn-moment">
                <I n="flag" size={15} />
                <span>Mark Moment</span>
              </button>
              <button className="float-btn">
                <I n="dice" size={15} />
                <span>Dice</span>
              </button>
              <button className="float-btn">
                <I n="notes" size={15} />
                <span>Quick Capture</span>
              </button>
              <button className="float-btn">
                <I n="plus" size={15} />
                <span>Quick Create</span>
              </button>
            </div>

          </div>

          {/* Loom panel */}
          <div className="stage-loom">
            <div className="stage-loom-head">
              <I n="spark" size={13} style={{ color: "var(--amber)" }} />
              <span className="stage-loom-title">The Loom</span>
              <div className="stage-loom-tabs">
                {["Ask", "Live", "Prep"].map(m => (
                  <button key={m}
                    className={"stage-loom-tab" + (m.toLowerCase() === loomMode ? " active" : "")}
                    onClick={() => setLoomMode(m.toLowerCase())}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="stage-loom-body">
              {loomMode === "live" && (
                <>
                  <div className="sloom-section">
                    <div className="sloom-label">Live context</div>
                    <div className="sloom-text">
                      The Dockmaster&apos;s allegiance is uncertain. His relationship with House Kael is a canon risk.
                    </div>
                  </div>
                  <div className="sloom-section">
                    <div className="sloom-label">Canon flags</div>
                    <div className="sloom-flag">
                      <I n="alert" size={10} style={{ flexShrink: 0, marginTop: 1 }} />
                      Contradicts Veyra&apos;s testimony from Session 14
                    </div>
                    <div className="sloom-flag ok">
                      <I n="check" size={10} style={{ flexShrink: 0, marginTop: 1 }} />
                      Fenwick Harbor geography consistent
                    </div>
                  </div>
                  <div className="sloom-section">
                    <div className="sloom-label">Suggested beats</div>
                    <div className="sloom-suggestion">The agent&apos;s arrival should force the Dockmaster to choose — silence the players or betray Kael.</div>
                  </div>
                </>
              )}
              {loomMode === "ask" && (
                <div className="sloom-section">
                  <div className="sloom-label">Recent</div>
                  <div className="sloom-text">Ask The Loom anything about the saga — canon checks, NPC motivations, scene suggestions.</div>
                </div>
              )}
              {loomMode === "prep" && (
                <div className="sloom-section">
                  <div className="sloom-label">Session prep</div>
                  <div className="sloom-text">3 beats remaining. The quay chase requires a Kael agent stat block.</div>
                </div>
              )}
              <div className="sloom-quick-btns">
                {["Stub NPC", "Capture note", "Suggest beat", "Canon check"].map(s => (
                  <button key={s} className="sloom-quick-btn">{s}</button>
                ))}
              </div>
            </div>
            <div className="stage-loom-foot">
              <div className="stage-loom-composer">
                <textarea placeholder="Ask The Loom..." rows={2} />
                <button className="sloom-send"><I n="send" size={14} /></button>
              </div>
              {!endConfirm && !showUndo && (
                <button className="stage-end-btn" onClick={handleEndSession}>End Session 16</button>
              )}
            </div>
          </div>

        </div>
      </div>
    </Shell>
  );
}
