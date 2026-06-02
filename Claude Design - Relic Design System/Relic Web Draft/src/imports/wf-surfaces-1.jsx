// wf-surfaces-1.jsx — Home + Threads surfaces

// ═══ HOME ════════════════════════════════════════════════════

function HomeEmpty() {
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
          <button className="btn btn-ink"><I n="threads" size={14} /> New thread</button>
          <button className="btn btn-secondary"><I n="users" size={14} /> Add character</button>
        </div>
      </div>
    </Shell>
  );
}

function HomeNoSession() {
  return (
    <Shell active="home" pill="none" reviewCount={0} loomExpanded={true} loomMode="ask">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><Dot kind="active" /> Eryndal · The Shattered Crown · Session 15 complete</div>
          <div className="page-title">The Shattered Crown</div>
          <div className="page-sub">Fifteen sessions deep. The ambush at the eastern gate changed everything.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary"><I n="sessions" size={13} /> Plan next session</button>
        </div>
      </div>
      <div className="home-grid">
        <div className="home-col-left">
          <div className="card list-card">
            <SecLabel icon="threads" count={4}>Active threads</SecLabel>
            {[
              ["The Forged Succession","loose","◈ 3 unresolved consequences"],
              ["Mira's Debt to House Kael","active","◆ Meeting at the harbor pending"],
              ["The Vanished Artificer","dormant","○ No movement since Session 12"],
              ["Siege of Thornwall","active","◆ Clock ticking — 3 sessions left"],
            ].map(([name,state,sub],i) => (
              <div key={i} className="th-row">
                <div className={"th-ico"}><I n="threads" size={14} /></div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="th-name">{name}</div>
                  <div className={"th-state "+state}><Dot kind={state} />{sub}</div>
                </div>
                <span className={"t-chip "+state}>{state}</span>
              </div>
            ))}
            <div className="list-foot">
              <button className="btn btn-ghost btn-sm">View all threads</button>
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
              <button className="btn btn-ghost btn-sm">View queue</button>
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
              <button className="btn btn-ink" style={{gap:8}}><I n="sessions" size={14} /> Plan session 16</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function HomePlanned() {
  return (
    <Shell active="home" pill="prepping" reviewCount={7} loomExpanded={true} loomMode="prep">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><Dot kind="amber" /> Session 16 · Prepping</div>
          <div className="page-title">The Shattered Crown</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary"><I n="prepare" size={13} /> Open Prepare</button>
        </div>
      </div>
      <div className="home-grid">
        <div className="home-col-left">
          <div className="card list-card">
            <SecLabel icon="threads">Active threads</SecLabel>
            {[["The Forged Succession","loose"],["Mira's Debt","active"],["Siege of Thornwall","active"]].map(([n,s],i)=>(
              <div key={i} className="th-row">
                <div className="th-ico"><I n="threads" size={14} /></div>
                <div style={{flex:1}}><div className="th-name">{n}</div></div>
                <span className={"t-chip "+s}>{s}</span>
              </div>
            ))}
            <div className="list-foot"><button className="btn btn-ghost btn-sm">View all</button></div>
          </div>
          <div className="card list-card">
            <SecLabel icon="pin" count={3}>Pinned entities</SecLabel>
            {[["Castellan Veyra","NPC · Antagonist","e-npc"],["Fenwick Harbor","Location · Port","e-location"],["The Merchant Seal","Artifact","e-artifact"]].map(([n,t,cls],i)=>(
              <div key={i} className="rev-item"><div className={"entity-eyebrow"}>{t}</div><div className="rev-title">{n}</div></div>
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
              <Meter value={6} max={10} cls="" />
              <div className="cl-count">6 / 10</div>
            </div>
            <div className="packet-cta">
              <button className="cta-stage"><Seal size={22} /> Ready for Stage</button>
              <button className="btn-icon btn"><I n="chevRight" size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function HomeReady() {
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
            {[["The Forged Succession","loose"],["Mira's Debt","active"],["Siege of Thornwall","active"]].map(([n,s],i)=>(
              <div key={i} className="th-row"><div className="th-ico"><I n="threads" size={14} /></div><div style={{flex:1}}><div className="th-name">{n}</div></div><span className={"t-chip "+s}>{s}</span></div>
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
              <button className="cta-stage" style={{fontSize:26}}><Seal size={24} /> Open in Stage</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function HomeActive() {
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
        <button className="btn btn-amber" style={{fontSize:13,gap:7}}><I n="bolt" size={14} /> Return to Stage</button>
      </div>
      <div className="home-grid">
        <div className="home-col-left">
          <div className="card list-card">
            <SecLabel icon="threads">Active threads</SecLabel>
            {[["The Forged Succession","loose"],["Mira's Debt","active"]].map(([n,s],i)=>(
              <div key={i} className="th-row"><div className="th-ico"><I n="threads" size={14} /></div><div style={{flex:1}}><div className="th-name">{n}</div></div><span className={"t-chip "+s}>{s}</span></div>
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
            <button className="btn btn-amber" style={{gap:8}}><I n="bolt" size={14} /> Return to Stage</button>
            <button className="btn btn-secondary">View packet (read-only)</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function HomeReviewReady() {
  return (
    <Shell active="home" pill="review" reviewCount={14} loomExpanded={true} loomMode="ask">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><Dot kind="loose" /> Session 16 complete · Review required</div>
          <div className="page-title">The Shattered Crown</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ink"><I n="review" size={13} /> Open review queue</button>
        </div>
      </div>
      <div className="home-grid">
        <div className="home-col-left">
          <div className="card list-card" style={{borderColor:"rgba(138,56,40,0.3)"}}>
            <SecLabel icon="review" count={14}>Pending review</SecLabel>
            {[["Mira Ashborne — status changed","Update · NPC","low"],["The Dockmaster revealed as informant","New NPC reveal","high"],["Fenwick Harbor — new consequence added","Update · Location","med"],["Recap: Session 16","Session summary draft","med"]].map(([title,type,conf],i) => (
              <div key={i} className="rev-item">
                <div className="rev-title">{title}</div>
                <div className="rev-desc" style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.06em",color:"var(--stone-500)",textTransform:"uppercase",marginBottom:4}}>{type}</div>
                <div className="rev-foot"><span className={"conf-badge "+conf}>{conf} confidence</span><span className="rev-time">Session 16</span></div>
              </div>
            ))}
            <div className="list-foot"><button className="btn btn-ink btn-sm" style={{width:"100%"}}><I n="review" size={12} /> Review queue</button></div>
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
            <button className="btn btn-ink" style={{width:"100%",justifyContent:"center",gap:8}}><I n="review" size={14} /> Open review queue</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ═══ THREADS ════════════════════════════════════════════════

const THREADS = [
  { id:1, name:"The Forged Succession", state:"loose", summary:"House Kael moves to legitimise a forged deed of succession before the Crown's audit. Castellan Veyra is orchestrating from the inside.", objs:[{done:true,text:"Discover the deed exists"},{done:true,text:"Identify Veyra as the architect"},{done:false,text:"Recover the deed before the Crown's audit"},{done:false,text:"Decide Veyra's fate"}] },
  { id:2, name:"Mira's Debt to House Kael", state:"active", summary:"Mira owes House Kael a debt she refuses to name. It's becoming dangerous.", objs:[{done:true,text:"Learn the debt exists"},{done:false,text:"Discover what she owes them"},{done:false,text:"Help her resolve or escape it"}] },
  { id:3, name:"Siege of Thornwall", state:"active", summary:"A city to the north is three sessions from falling unless the party intervenes.", objs:[{done:false,text:"Reach Thornwall before the siege collapses"},{done:false,text:"Find Lord Esten's hidden cache"},{done:false,text:"Negotiate a ceasefire or fight"}] },
  { id:4, name:"The Vanished Artificer", state:"dormant", summary:"A Guild artificer disappeared six months ago. Her workshop was ransacked.", objs:[{done:true,text:"Discover the disappearance"},{done:false,text:"Follow the trail to the Pale Court"},{done:false,text:"Find her or confirm her fate"}] },
  { id:5, name:"The Merchant Roads", state:"resolved", summary:"The party disrupted a smuggling ring operating through the toll roads. Resolved in Session 8.", objs:[{done:true,text:"Identify the smuggling ring"},{done:true,text:"Expose the Tollmaster"},{done:true,text:"See justice served"}] },
];

const RELATED_ENTS = [
  {name:"Castellan Veyra",type:"NPC",cls:"e-npc",color:"var(--hue-npc)"},
  {name:"The Forged Deed",type:"Artifact",cls:"e-artifact",color:"#8B6914"},
  {name:"House Kael",type:"Faction",cls:"e-faction",color:"var(--hue-faction)"},
  {name:"Fenwick Harbor",type:"Location",cls:"e-location",color:"var(--hue-location)"},
];

function ThreadsView({ detail=true, selected=1, state="all", emptyState=false }) {
  const thread = THREADS.find(t=>t.id===selected) || THREADS[0];
  const filtered = state === "all" ? THREADS : THREADS.filter(t => t.state === state);
  const groups = [
    { label:"Active ◆", items: THREADS.filter(t=>t.state==="active") },
    { label:"Loose ◈", items: THREADS.filter(t=>t.state==="loose") },
    { label:"Dormant ○", items: THREADS.filter(t=>t.state==="dormant") },
    { label:"Resolved ✓", items: THREADS.filter(t=>t.state==="resolved") },
  ].filter(g=>g.items.length>0);

  return (
    <Shell active="threads" pill="none" reviewCount={7} loomExpanded={true} loomMode="ask">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">The Shattered Crown</div>
          <div className="page-title">Threads</div>
          <div className="page-sub">The continuity spine of your saga.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ink"><I n="plus" size={13} /> New thread</button>
        </div>
      </div>
      <div className="threads-layout">
        <div className="card tl-card">
          <div className="tl-filters">
            {["All","Active","Loose","Dormant","Resolved"].map(f=>(
              <button key={f} className={"tf-btn"+(state===f.toLowerCase()||(f==="All"&&state==="all")?" active":"")}>{f}</button>
            ))}
          </div>
          {emptyState ? (
            <div className="empty-state" style={{padding:"40px 16px"}}>
              <div style={{fontSize:28,fontFamily:"var(--font-display)",color:"var(--stone-300)"}}>○</div>
              <div className="empty-title" style={{fontSize:18}}>No threads yet</div>
              <div className="empty-desc" style={{fontSize:12}}>Threads track the story arcs that run through your saga.</div>
              <button className="btn btn-secondary btn-sm"><I n="plus" size={12} /> New thread</button>
            </div>
          ) : groups.map(group => (
            <div key={group.label}>
              <div className="tl-group-label">{group.label}</div>
              {group.items.map(t=>(
                <div key={t.id} className={"tl-row"+(t.id===selected?" sel":"")}>
                  <span style={{fontFamily:"var(--font-display)",fontSize:11,color:"var(--stone-500)",flexShrink:0}}>{t.state==="active"?"◆":t.state==="loose"?"◈":t.state==="dormant"?"○":"✓"}</span>
                  <span className="t-name">{t.name}</span>
                  <span className={"t-chip "+t.state}>{t.state}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="list-foot">
            <button className="btn btn-ghost btn-sm"><I n="plus" size={12} /> New thread</button>
          </div>
        </div>
        {detail && (
          <div className="card td-card">
            <div className="td-eyebrow"><span className={"t-chip "+thread.state}>{thread.state}</span></div>
            <div className="td-title">{thread.name}</div>
            <div className="td-summary">{thread.summary}</div>
            <div className="td-actions">
              <button className="btn btn-secondary btn-sm"><I n="notes" size={12} /> Edit</button>
              <button className="btn btn-ghost btn-sm"><I n="archive" size={12} /> Archive</button>
              <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto"}}><I n="spark" size={12} style={{color:"var(--amber)"}} /> Propose complication</button>
            </div>
            <div className="td-sep" />
            <div className="td-section-label">Objectives</div>
            {thread.objs.map((o,i)=>(
              <div key={i} className="obj-row">
                <span className="obj-num">{i+1}</span>
                <span className="obj-text">{o.text}</span>
                <span className={o.done?"obj-done":"obj-open"}>{o.done?"✓":"○"}</span>
              </div>
            ))}
            <div className="td-sep" />
            <div className="td-section-label">Read-only timeline</div>
            <div style={{position:"relative",paddingLeft:16,marginBottom:8}}>
              <div style={{position:"absolute",left:3,top:0,bottom:0,width:1,background:"var(--border-1)"}}/>
              {["Session 11 — Thread introduced","Session 13 — Veyra identified as architect","Session 14 — Deed located at the keep","Session 15 — Ambush at the eastern gate"].map((e,i)=>(
                <div key={i} style={{display:"flex",gap:9,padding:"6px 0",position:"relative"}}>
                  <div style={{position:"absolute",left:-13,top:10,width:7,height:7,borderRadius:"50%",background:i===3?"var(--amber)":"var(--stone-300)",border:"1.5px solid var(--bg-2)"}} />
                  <div style={{fontSize:11,color:"var(--fg-2)",lineHeight:1.4}}>{e}</div>
                </div>
              ))}
            </div>
            <div className="td-sep" />
            <div className="td-section-label">Related entities</div>
            {RELATED_ENTS.map((e,i)=>(
              <div key={i} className="ent-link">
                <div className="ent-rule" style={{background:e.color}} />
                <div style={{flex:1}}>
                  <div className="ent-link-name">{e.name}</div>
                  <div className="ent-link-type">{e.type}</div>
                </div>
                <I n="chevRight" size={13} style={{color:"var(--stone-500)"}} />
              </div>
            ))}
            <div className="td-sep" />
            <div className="td-section-label">Relic Guide — draft</div>
            <div className="guide-draft">
              <div className="guide-draft-label"><I n="spark" size={11} /> Proposed complication</div>
              <div className="guide-draft-text">Castellan Veyra sends a forged summons to split the party on the night of the audit. One character receives an urgent message that another is in danger — fabricated, but convincing.</div>
              <div className="guide-draft-actions">
                <button className="btn btn-amber btn-sm">Approve</button>
                <button className="btn btn-secondary btn-sm">Edit</button>
                <button className="btn btn-ghost btn-sm">Discard</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

Object.assign(window, { HomeEmpty, HomeNoSession, HomePlanned, HomeReady, HomeActive, HomeReviewReady, ThreadsView });
