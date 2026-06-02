import React from 'react';
import { Shell } from './Shell';
import { I, Seal, Dot, Chip, Meter, SecLabel } from './Primitives';
import { useApp } from './AppContext';

export function HomeEmpty() {
  const app = useApp();
  return (
    <Shell active="home" pill="none" reviewCount={0} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><Dot kind="dormant" /> Eryndal / The Shattered Crown</div>
          <div className="page-title">The Shattered Crown</div>
          <div className="page-sub">A new saga. Begin by creating your first thread or entity.</div>
        </div>
      </div>
      <div className="empty-state">
        <div className="empty-ornament" style={{fontSize:40,fontFamily:"var(--font-display)"}}>✦</div>
        <div className="empty-title">Your saga begins here</div>
        <div className="empty-desc">Create a thread to track a story arc, or add your first character to the library. The Loom will help you weave the rest.</div>
        <div style={{display:"flex",gap:9,marginTop:8}}>
          <button className="btn btn-ink" onClick={() => app?.navigate("threads")}><I n="threads" size={14} /> New thread</button>
          <button className="btn btn-secondary" onClick={() => app?.navigate("library", { libraryView: "new" })}><I n="users" size={14} /> Add character</button>
        </div>
      </div>
    </Shell>
  );
}

export function HomeNoSession() {
  const app = useApp();
  return (
    <Shell active="home" pill="none" reviewCount={0} loomExpanded={true} loomMode="ask">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><Dot kind="active" /> Eryndal · The Shattered Crown · Session 15 complete</div>
          <div className="page-title">The Shattered Crown</div>
          <div className="page-sub">Fifteen sessions deep. The ambush at the eastern gate changed everything.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => app?.navigate("prepare", { sessionState: "prepping" })}><I n="sessions" size={13} /> Plan next session</button>
        </div>
      </div>
      <div className="home-grid">
        <div className="home-col-left">
          <div className="card list-card">
            <SecLabel icon="threads" count={4}>Active threads</SecLabel>
            {[
              [1,"The Forged Succession","loose","◈ 3 unresolved consequences"],
              [2,"Mira's Debt to House Kael","active","◆ Meeting at the harbor pending"],
              [4,"The Vanished Artificer","dormant","○ No movement since Session 12"],
              [3,"Siege of Thornwall","active","◆ Clock ticking — 3 sessions left"],
            ].map(([id,name,state,sub]) => (
              <div key={String(id)} className="th-row" onClick={() => app?.navigate("threads", { selectedThreadId: Number(id) })} style={{ cursor: "pointer" }}>
                <div className="th-ico"><I n="threads" size={14} /></div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="th-name">{name}</div>
                  <div className={"th-state "+state}><Dot kind={String(state)} />{sub}</div>
                </div>
                <span className={"t-chip "+state}>{state}</span>
              </div>
            ))}
            <div className="list-foot">
              <button className="btn btn-ghost btn-sm" onClick={() => app?.navigate("threads")}>View all threads</button>
            </div>
          </div>
          <div className="card list-card">
            <SecLabel icon="review" count={7}>Pending review</SecLabel>
            {[
              ["Aldric Fenmore","New NPC","high"],
              ["Status change: Mira Ashborne","Update","med"],
              ["The Tallow Gate","New location","high"],
              ["Recap: Session 15","Session note","med"],
            ].map(([title,type,conf],i) => (
              <div key={i} className="rev-item">
                <div className="rev-title">{title}</div>
                <div className="rev-desc" style={{color:"var(--stone-500)",fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.08em",textTransform:"uppercase"}}>{type}</div>
                <div className="rev-foot">
                  <span className={"conf-badge "+conf}>{conf} confidence</span>
                  <span className="rev-time">2h ago</span>
                </div>
              </div>
            ))}
            <div className="list-foot between">
              <button className="btn btn-ghost btn-sm" onClick={() => app?.navigate("review")}>View queue</button>
              <span className="meta-row">3 more</span>
            </div>
          </div>
        </div>
        <div>
          <div className="card packet" style={{borderLeft:"4px solid var(--stone-300)"}}>
            <div className="packet-top">
              <div className="packet-eyebrow"><I n="sessions" size={12} /> No session planned</div>
            </div>
            <div style={{padding:"24px 0",textAlign:"center"}}>
              <div style={{fontFamily:"var(--font-display)",fontStyle:"italic",fontSize:18,color:"var(--stone-500)",marginBottom:14}}>Session 15 is complete. The saga rests.</div>
              <button className="btn btn-ink" style={{gap:8}} onClick={() => app?.navigate("prepare", { sessionState: "prepping" })}><I n="sessions" size={14} /> Plan session 16</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function HomePlanned() {
  const app = useApp();
  return (
    <Shell active="home" pill="prepping" reviewCount={7} loomExpanded={true} loomMode="prep">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><Dot kind="amber" /> Session 16 · Prepping</div>
          <div className="page-title">The Shattered Crown</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => app?.navigate("prepare")}><I n="prepare" size={13} /> Open Prepare</button>
        </div>
      </div>
      <div className="home-grid">
        <div className="home-col-left">
          <div className="card list-card">
            <SecLabel icon="threads">Active threads</SecLabel>
            {[[1,"The Forged Succession","loose"],[2,"Mira's Debt","active"],[3,"Siege of Thornwall","active"]].map(([id,n,s])=>(
              <div key={String(id)} className="th-row" onClick={() => app?.navigate("threads", { selectedThreadId: Number(id) })} style={{ cursor: "pointer" }}>
                <div className="th-ico"><I n="threads" size={14} /></div>
                <div style={{flex:1}}><div className="th-name">{n}</div></div>
                <span className={"t-chip "+s}>{s}</span>
              </div>
            ))}
            <div className="list-foot"><button className="btn btn-ghost btn-sm" onClick={() => app?.navigate("threads")}>View all</button></div>
          </div>
          <div className="card list-card">
            <SecLabel icon="pin" count={3}>Pinned entities</SecLabel>
            {[["Castellan Veyra","NPC · Antagonist"],["Fenwick Harbor","Location · Port"],["The Merchant Seal","Artifact"]].map(([n,t],i)=>(
              <div key={i} className="rev-item" onClick={() => app?.navigate("library", { libraryView: "detail" })} style={{ cursor: "pointer" }}>
                <div className="entity-eyebrow">{t}</div>
                <div className="rev-title">{n}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="card packet" style={{borderLeft:"4px solid var(--amber)"}}>
            <div className="packet-top">
              <div className="packet-eyebrow"><Dot kind="amber" /> Session 16 · Prepping</div>
              <div className="packet-when">Planned · Next Saturday</div>
            </div>
            <div className="packet-title">The Harbor Reckoning</div>
            <div className="packet-metarow">
              <div className="packet-date"><I n="clock" size={12} />3h 20min prep so far</div>
              <Chip tone="amber" dot>Prepping</Chip>
            </div>
            <div className="packet-tiles">
              {[
                {icon:"target",label:"Objective",body:"Mira must confront the Dockmaster before House Kael's agent arrives at midnight."},
                {icon:"flame",label:"Opening scene",body:"Dawn at Fenwick Harbor. The fog hasn't lifted. A body in the water."},
                {icon:"threads",label:"Active threads",body:"3 threads feeding into this session. 1 consequence unresolved from S15."},
                {icon:"notes",label:"Agenda",body:"5 beats planned. Scene planner 60% complete."},
              ].map((t,i)=>(
                <div key={i} className="tile">
                  <div className="tile-head"><span className="tile-ico"><I n={t.icon} size={13} /></span><span className="tile-label">{t.label}</span></div>
                  <div className="tile-body">{t.body}</div>
                </div>
              ))}
            </div>
            <div className="packet-checklist">
              <div className="cl-label"><I n="checklist" size={12} />Prep checklist</div>
              <Meter value={6} max={10} />
              <div className="cl-count">6 / 10</div>
            </div>
            <div className="packet-cta">
              <button className="cta-stage" onClick={() => app?.navigate("prepare", { prepReady: true, sessionState: "ready" })}><Seal size={22} /> Ready for Stage</button>
              <button className="btn-icon btn" onClick={() => app?.navigate("prepare")}><I n="chevRight" size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function HomeReady() {
  const app = useApp();
  return (
    <Shell active="home" pill="ready" reviewCount={7} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><Dot kind="amber" /> Session 16 · Ready for Stage</div>
          <div className="page-title">The Shattered Crown</div>
        </div>
      </div>
      <div className="home-grid">
        <div className="home-col-left">
          <div className="card list-card">
            <SecLabel icon="threads">Active threads</SecLabel>
            {[[1,"The Forged Succession","loose"],[2,"Mira's Debt","active"],[3,"Siege of Thornwall","active"]].map(([id,n,s])=>(
              <div key={String(id)} className="th-row" onClick={() => app?.navigate("threads", { selectedThreadId: Number(id) })} style={{ cursor: "pointer" }}>
                <div className="th-ico"><I n="threads" size={14} /></div>
                <div style={{flex:1}}><div className="th-name">{n}</div></div>
                <span className={"t-chip "+s}>{s}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="prep-ready-banner">
            <I n="checkCircle" size={18} style={{color:"var(--verdigris)",flexShrink:0}} />
            <div>
              <div className="prep-ready-banner-label">Prep complete · Stage packet ready</div>
              <div style={{fontSize:11,color:"var(--stone-700)",marginTop:2}}>Session 16 · 10 of 10 checks done · Briefing, objective, 5 scenes locked</div>
            </div>
          </div>
          <div className="card packet">
            <div className="packet-top">
              <div className="packet-eyebrow"><Dot kind="active" /> Session 16 · The Harbor Reckoning</div>
            </div>
            <div className="packet-tiles">
              {[{icon:"target",label:"Objective",body:"Mira must confront the Dockmaster before midnight."},{icon:"flame",label:"Opening",body:"Dawn at Fenwick Harbor. Fog. A body in the water."},{icon:"sessions",label:"Scenes",body:"5 scenes locked. Contingencies ready."}].map((t,i)=>(
                <div key={i} className="tile"><div className="tile-head"><span className="tile-ico"><I n={t.icon} size={13} /></span><span className="tile-label">{t.label}</span></div><div className="tile-body">{t.body}</div></div>
              ))}
            </div>
            <div className="packet-cta">
              <button className="cta-stage" style={{fontSize:26}} onClick={() => app?.navigate("stage", { sessionState: "active", stageVariant: "active", prepLocked: true })}><Seal size={24} /> Open in Stage</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function HomeActive() {
  const app = useApp();
  return (
    <Shell active="home" pill="active" reviewCount={0} loomExpanded={false}>
      <div className="live-banner">
        <div className="live-banner-left">
          <Dot kind="live pulse" />
          <div>
            <div className="live-label">Session in progress</div>
            <div className="live-name">Session 16 · The Harbor Reckoning</div>
          </div>
        </div>
        <div className="live-timer">1:23:07</div>
        <button className="btn btn-amber" style={{fontSize:13,gap:7}} onClick={() => app?.navigate("stage")}><I n="bolt" size={14} /> Return to Stage</button>
      </div>
      <div className="home-grid">
        <div className="home-col-left">
          <div className="card list-card">
            <SecLabel icon="threads">Active threads</SecLabel>
            {[[1,"The Forged Succession","loose"],[2,"Mira's Debt","active"]].map(([id,n,s])=>(
              <div key={String(id)} className="th-row" onClick={() => app?.navigate("threads", { selectedThreadId: Number(id) })} style={{ cursor: "pointer" }}>
                <div className="th-ico"><I n="threads" size={14} /></div>
                <div style={{flex:1}}><div className="th-name">{n}</div></div>
                <span className={"t-chip "+s}>{s}</span>
              </div>
            ))}
          </div>
          <div className="card list-card">
            <SecLabel icon="notes" count={3}>Quick captures</SecLabel>
            {["Mira confronted Dockmaster — refused to cooperate","A hooded figure watching from the crow's nest","Mira's letter mentioned a third party"].map((c,i)=>(
              <div key={i} className="rev-item"><div className="rev-title" style={{fontSize:12}}>{c}</div><div className="rev-time" style={{marginTop:3}}>Captured 2m ago</div></div>
            ))}
          </div>
        </div>
        <div className="card packet">
          <div className="packet-top"><div className="packet-eyebrow"><Dot kind="live pulse" /> Live — Sanctum read-only during session</div></div>
          <div style={{padding:"20px 0",textAlign:"center",color:"var(--stone-500)",fontFamily:"var(--font-display)",fontStyle:"italic",fontSize:16}}>The Stage is active. Prep is locked. Notes are capturing.</div>
          <div style={{display:"flex",gap:9,justifyContent:"center",marginTop:8}}>
            <button className="btn btn-amber" style={{gap:8}} onClick={() => app?.navigate("stage")}><I n="bolt" size={14} /> Return to Stage</button>
            <button className="btn btn-secondary" onClick={() => app?.navigate("prepare", { prepLocked: true })}>View packet (read-only)</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function HomeReviewReady() {
  const app = useApp();
  return (
    <Shell active="home" pill="review" reviewCount={14} loomExpanded={true} loomMode="ask">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><Dot kind="loose" /> Session 16 complete · Review required</div>
          <div className="page-title">The Shattered Crown</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ink" onClick={() => app?.navigate("review")}><I n="review" size={13} /> Open review queue</button>
        </div>
      </div>
      <div className="home-grid">
        <div className="home-col-left">
          <div className="card list-card" style={{borderColor:"rgba(138,56,40,0.3)"}}>
            <SecLabel icon="review" count={14}>Pending review</SecLabel>
            {[["Mira Ashborne — status changed","Update · NPC","low"],["The Dockmaster revealed as informant","New NPC reveal","high"],["Fenwick Harbor — new consequence added","Update · Location","med"],["Recap: Session 16","Session summary draft","med"]].map(([title,type,conf],i) => (
              <div key={i} className="rev-item" onClick={() => app?.navigate("review", { selectedReviewIdx: i })} style={{ cursor: "pointer" }}>
                <div className="rev-title">{title}</div>
                <div className="rev-desc" style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.06em",color:"var(--stone-500)",textTransform:"uppercase",marginBottom:4}}>{type}</div>
                <div className="rev-foot"><span className={"conf-badge "+conf}>{conf} confidence</span><span className="rev-time">Session 16</span></div>
              </div>
            ))}
            <div className="list-foot"><button className="btn btn-ink btn-sm" style={{width:"100%"}} onClick={() => app?.navigate("review")}><I n="review" size={12} /> Review queue</button></div>
          </div>
        </div>
        <div className="card packet" style={{borderColor:"rgba(138,56,40,0.25)"}}>
          <div className="packet-top">
            <div className="packet-eyebrow"><Dot kind="loose" /> Session 16 · Review ready</div>
          </div>
          <div className="packet-title">14 items awaiting your review</div>
          <div style={{fontFamily:"var(--font-display)",fontStyle:"italic",fontSize:14,color:"var(--stone-700)",margin:"8px 0 16px"}}>Relic captured notes, NPCs, and consequences during the session. Nothing enters canon until you approve it.</div>
          <div className="packet-tiles">
            {[{icon:"users",label:"New NPCs",body:"3 drafted. Dockmaster revealed as informant; Sailor stubbed unnamed."},
              {icon:"threads",label:"Thread updates",body:"2 threads advanced. 1 new consequence for The Forged Succession."},
              {icon:"notes",label:"Recap draft",body:"Relic drafted a session recap. Review and publish when ready."},
              {icon:"map",label:"Locations",body:"Fenwick Harbor updated with 2 new notes and a consequence."}].map((t,i)=>(
              <div key={i} className="tile"><div className="tile-head"><span className="tile-ico"><I n={t.icon} size={13} /></span><span className="tile-label">{t.label}</span></div><div className="tile-body">{t.body}</div></div>
            ))}
          </div>
          <div style={{marginTop:12}}>
            <button className="btn btn-ink" style={{width:"100%",justifyContent:"center",gap:8}} onClick={() => app?.navigate("review")}><I n="review" size={14} /> Open review queue</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
