import React from 'react';
import { Shell } from './Shell';
import { I, Seal, Dot, Meter, SecLabel } from './Primitives';
import { useApp } from './AppContext';

interface PrepareViewProps {
  locked?: boolean;
  ready?: boolean;
}

export function PrepareView({ locked = false, ready = false }: PrepareViewProps) {
  const app = useApp();
  return (
    <Shell active="prepare" pill={locked ? "active" : ready ? "ready" : "prepping"} reviewCount={7} loomExpanded={true} loomMode="prep">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><Dot kind={ready ? "active" : locked ? "live pulse" : "amber"} /> Session 16 · {locked ? "Locked — session in progress" : ready ? "Ready for Stage" : "Prepping"}</div>
          <div className="page-title" style={{ fontSize: 36 }}>The Harbor Reckoning</div>
        </div>
        <div className="page-actions">
          {!locked && !ready && <button className="btn btn-secondary" onClick={() => app?.navigate("sessions")}><I n="sessions" size={13} /> Session overview</button>}
          {locked && <button className="btn btn-amber" style={{ gap: 8 }} onClick={() => app?.navigate("stage")}><I n="bolt" size={13} /> Return to Stage</button>}
        </div>
      </div>

      {locked &&
        <div className="prep-locked-banner">
          <I n="lock" size={15} style={{ flexShrink: 0 }} />
          <span>Prep is locked while a session is in progress. You can read the packet but cannot edit it.</span>
        </div>
      }
      {ready &&
        <div className="prep-ready-banner">
          <I n="checkCircle" size={16} style={{ color: "var(--verdigris)", flexShrink: 0 }} />
          <div><div className="prep-ready-banner-label">Prep complete · Stage packet ready</div><div style={{ fontSize: 11, color: "var(--stone-700)", marginTop: 2 }}>10 of 10 checks · 5 scenes locked · Continuity verified</div></div>
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto", flexShrink: 0 }} onClick={() => app?.update({ prepReady: false, sessionState: "prepping" })}>Edit prep</button>
        </div>
      }

      <div className="prep-grid">
        <div className="prep-col-left">
          <div className="card mini-card">
            <div className="mini-head">
              <SecLabel icon="sessions">Session overview</SecLabel>
              {!locked && <button className="btn btn-ghost btn-sm"><I n="notes" size={11} /></button>}
            </div>
            {[["Date", "Saturday · 7pm"], ["System", "D&D 5e"], ["Expected", "4 players"], ["Expected length", "3–4 hours"]].map(([k, v]) =>
              <div key={k} className="kv"><span className="kv-k">{k}</span><span className="kv-v">{v}</span></div>
            )}
          </div>
          <div className="card mini-card">
            <div className="mini-head"><SecLabel icon="checklist">Prep checklist</SecLabel></div>
            {[
              { done: true,            text: "Write objective" },
              { done: true,            text: "Write opening scene" },
              { done: true,            text: "Plan key beats" },
              { done: true,            text: "Scene planner complete" },
              { done: true,            text: "Pin key entities" },
              { done: true,            text: "Review active threads" },
              { done: ready || locked, text: "Check continuity risks" },
              { done: ready || locked, text: "Prepare contingencies" },
              { done: ready || locked, text: "Final read-through" },
              { done: ready || locked, text: "Mark as ready" }
            ].map((item, i) =>
              <div key={i} className={"cl-item " + (item.done ? "done" : "todo")}>
                <div className={"cl-chk " + (item.done ? "done" : "todo")}>
                  {item.done ? <I n="check" size={11} /> : <I n="x" size={9} sw={1.5} style={{ opacity: 0.25 }} />}
                </div>
                <span className="cl-text">{item.text}</span>
              </div>
            )}
            <div style={{ padding: "8px 2px 2px", display: "flex", alignItems: "center", gap: 9 }}>
              <Meter value={ready || locked ? 10 : 6} max={10} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--stone-500)", whiteSpace: "nowrap" }}>{ready || locked ? 10 : 6} / 10</span>
            </div>
          </div>
          <div className="card mini-card">
            <div className="mini-head"><SecLabel icon="alert">Continuity watch</SecLabel></div>
            {[
              { warn: true,  text: "Dockmaster allegiance not established in canon" },
              { warn: false, text: "Mira's debt — 2 session carry-over resolved" },
              { warn: false, text: "Veyra last confirmed at the capital" }
            ].map((item, i) =>
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderTop: i > 0 ? "1px solid var(--border-2)" : "none" }}>
                <I n={item.warn ? "alert" : "checkCircle"} size={13} style={{ color: item.warn ? "var(--rust)" : "var(--verdigris)", flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: item.warn ? "var(--fg-1)" : "var(--stone-500)", lineHeight: 1.4 }}>{item.text}</span>
              </div>
            )}
          </div>
        </div>

        <div className="prep-center">
          <div className="card packet-card">
            <div className="packet-card-head">
              <SecLabel icon="notes">Session packet</SecLabel>
              {!locked && <button className="btn btn-ghost btn-sm"><I n="notes" size={11} /> Edit all</button>}
            </div>
            <div className="detail-tiles">
              {[
                { icon: "target", label: "Objective",    body: "Mira must confront the Dockmaster before House Kael's agent arrives at midnight. Success means the deed is recoverable." },
                { icon: "flame",  label: "Opening scene", body: "Dawn at Fenwick Harbor. The fog hasn't lifted. Dockworkers move crates. A body floats face-down in the slip between quays three and four." },
                { icon: "notes",  label: "Briefing",      body: "Session 15 ended with the ambush at the eastern gate. Mira survived. Veyra is en route to the capital. The clock is ticking." },
                { icon: "feather",label: "Continuity",    body: "3 active threads feeding in. The Forged Succession enters its final phase. The siege clock ticks down — 3 sessions remain." }
              ].map((t, i) =>
                <div key={i} className="detail-tile">
                  <div className="tile-head"><span className="tile-ico"><I n={t.icon} size={13} /></span><span className="tile-label">{t.label}</span></div>
                  <div className="tile-body">{t.body}</div>
                </div>
              )}
            </div>
          </div>

          <div className="scene-planner">
            <div className="planner-label">Scene planner</div>
            <div className="planner-track">
              {[
                { n: 1, name: "The Body",               desc: "Discovery. Fog. Tension.",       status: "locked", cls: "s-lock" },
                { n: 2, name: "The Dockmaster's Office", desc: "Confrontation. He's scared.",    status: "locked", cls: "s-lock" },
                { n: 3, name: "The Midnight Signal",     desc: "House Kael's agent arrives.",    status: "locked", cls: "s-lock" },
                { n: 4, name: "The Quay Chase",          desc: "Needs detail.",                  status: "needs",  cls: "s-needs" },
                { n: 5, name: "Resolution",              desc: "Open.",                          status: "needs",  cls: "s-needs" }
              ].map((s, i) =>
                <div key={i} className={"scene-card " + s.cls}>
                  <div className="scene-num">{s.n}</div>
                  <div className="scene-name-txt">{s.name}</div>
                  <div className="scene-desc-txt">{s.desc}</div>
                  <div className={"scene-status-txt " + (s.status === "locked" ? "lock" : "needs")}>
                    {s.status === "locked" ? <><I n="check" size={9} />Locked</> : <><I n="alert" size={9} />Needs detail</>}
                  </div>
                </div>
              )}
              {!locked && <button className="scene-add"><I n="plus" size={13} /><span>Scene</span></button>}
            </div>
          </div>

          <div className="prep-triple">
            {[
              { label: "Pinned entities",       icon: "pin",  items: [{ n: "Castellan Veyra", t: "NPC", cls: "e-npc" }, { n: "The Dockmaster", t: "NPC", cls: "e-npc" }, { n: "Mira Ashborne", t: "NPC", cls: "e-npc" }, { n: "Fenwick Harbor", t: "Location", cls: "e-location" }] },
              { label: "Locations & handouts",  icon: "map",  items: [{ n: "Harbor map", t: "Handout", cls: "e-location" }, { n: "The Tallow Gate", t: "Location", cls: "e-location" }, { n: "Quay 4", t: "Location detail", cls: "e-location" }] },
              { label: "Contingencies",         icon: "bolt", items: [{ n: "If Mira refuses", t: "Consequence", cls: "e-lore" }, { n: "If Kael agent arrives early", t: "Beat variant", cls: "e-lore" }, { n: "If Dockmaster dies", t: "Thread impact", cls: "e-lore" }] }
            ].map((col, i) =>
              <div key={i} className="card triple-card">
                <SecLabel icon={col.icon}>{col.label}</SecLabel>
                {col.items.map((item, j) =>
                  <div key={j} className="asset-row">
                    <span className="asset-ico"><I n={col.icon} size={12} /></span>
                    <span className="asset-name">{item.n}</span>
                    <span className="asset-type-txt">{item.t}</span>
                  </div>
                )}
                {!locked && <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, width: "100%", justifyContent: "flex-start" }}><I n="plus" size={11} />Add</button>}
              </div>
            )}
          </div>

          {!locked &&
            <div className="prep-cta">
              {ready ?
                <button className="cta-stage" style={{ fontSize: 26 }} onClick={() => app?.navigate("stage", { sessionState: "active", stageVariant: "active", prepLocked: true })}><Seal size={24} /> Open in Stage</button> :
                <button className="cta-stage" style={{ gap: "10px" }} onClick={() => app?.update({ prepReady: true, sessionState: "ready" })}><Seal size={22} /> Ready for Stage</button>}
              <button className="btn-icon btn"><I n="more" size={16} /></button>
            </div>
          }
        </div>
      </div>
    </Shell>
  );
}
