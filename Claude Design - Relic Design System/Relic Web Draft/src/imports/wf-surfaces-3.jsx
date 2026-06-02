// wf-surfaces-3.jsx — Sessions, Stage, Review

// ═══ SESSIONS ════════════════════════════════════════════════

const SESSION_DATA = [
  { n:16, name:"The Harbor Reckoning",   date:"This Saturday",  status:"prepping",  statusLabel:"Prepping",       statusCls:"ss-prep"     },
  { n:15, name:"The Ambush at the Gate", date:"May 24, 2026",   status:"review",    statusLabel:"Review ready",   statusCls:"ss-pipeline" },
  { n:14, name:"Into the Keep",          date:"May 10, 2026",   status:"reviewed",  statusLabel:"Reviewed",       statusCls:"ss-reviewed" },
  { n:13, name:"The Merchant's Letter",  date:"Apr 26, 2026",   status:"reviewed",  statusLabel:"Reviewed",       statusCls:"ss-reviewed" },
  { n:12, name:"Wolves at the Gate",     date:"Apr 12, 2026",   status:"reviewed",  statusLabel:"Reviewed",       statusCls:"ss-reviewed" },
];

function SessionsIndex() {
  return (
    <Shell active="sessions" pill="none" reviewCount={7} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">The Shattered Crown</div>
          <div className="page-title">Sessions</div>
          <div className="page-sub">The chronicle of your saga's play.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ink"><I n="plus" size={13} /> Plan session</button>
        </div>
      </div>
      <div className="sess-tabs">
        {["All","Planned","In progress","Ended","Reviewed"].map((t,i)=>(
          <button key={t} className={"sess-tab"+(i===0?" active":"")}>{t}</button>
        ))}
      </div>
      <div className="sess-list">
        {SESSION_DATA.map((s,i)=>(
          <div key={i} className="sess-row">
            <div className="sess-num">S{s.n}</div>
            <div>
              <div className="sess-name">{s.name}</div>
              <div className="sess-meta">{s.date}</div>
            </div>
            <div className={"sess-status "+s.statusCls}>
              <Dot kind={s.status==="prepping"?"amber":s.status==="review"?"loose":s.status==="reviewed"?"active":"dormant"} />
              {s.statusLabel}
            </div>
            <I n="chevRight" size={14} style={{color:"var(--stone-500)"}} />
          </div>
        ))}
      </div>
    </Shell>
  );
}

function SessionDetail() {
  return (
    <Shell active="sessions" pill="none" reviewCount={7} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><Dot kind="active" /> Session 15 · May 24, 2026 · Reviewed</div>
          <div className="page-title" style={{fontSize:36}}>The Ambush at the Gate</div>
          <div className="page-sub" style={{fontStyle:"italic"}}>The eastern gate ambush changes everything. Three guards dead. Veyra disappears.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary"><I n="notes" size={13} /> Edit recap</button>
          <button className="btn btn-secondary"><I n="sessions" size={13} /> Plan S16</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        {[{k:"Date",v:"May 24, 2026"},{k:"Duration",v:"3h 42min"},{k:"Players",v:"4 of 4"},{k:"Status",v:"Reviewed"}].map(({k,v})=>(
          <div key={k} className="statline-item"><div className="statline-k">{k}</div><div className="statline-v">{v}</div></div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:14,alignItems:"start"}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="card mini-card">
            <SecLabel icon="sessions">Session recap</SecLabel>
            <div style={{fontFamily:"var(--font-display)",fontStyle:"italic",fontSize:13,lineHeight:1.65,color:"var(--fg-2)",marginTop:10}}>The party moved on the eastern gate as planned, but someone had tipped off House Kael. An ambush was waiting. Three city guards were killed; Mira survived by hiding in the culvert. Veyra was spotted escaping on a riverboat headed toward the capital. The forged deed is still at large.</div>
          </div>
          <div className="card mini-card">
            <SecLabel icon="threads">Threads advanced</SecLabel>
            {[["The Forged Succession","loose"],["Mira's Debt","active"]].map(([n,s],i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderTop:i>0?"1px solid var(--border-2)":"none"}}>
                <span className={"t-chip "+s}>{s}</span>
                <span style={{fontFamily:"var(--font-display)",fontSize:14,color:"var(--ink)"}}>{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="card mini-card">
            <SecLabel icon="review">Canon entries from this session</SecLabel>
            {[
              {title:"Veyra escaped by riverboat",type:"Thread update",conf:"high"},
              {title:"Three city guards killed",type:"Consequence",conf:"high"},
              {title:"Mira's hiding spot revealed",type:"NPC update",conf:"med"},
            ].map((e,i)=>(
              <div key={i} className="rev-item">
                <div className="rev-title">{e.title}</div>
                <div className="rev-foot"><span className={"conf-badge "+e.conf}>{e.conf} confidence</span><span className="rev-time">{e.type}</span></div>
              </div>
            ))}
          </div>
          <div className="card mini-card">
            <SecLabel icon="notes">Transcript summary</SecLabel>
            <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.04em",lineHeight:1.8,color:"var(--stone-700)"}}>
              <div>00:12:33 → Party approaches the eastern gate</div>
              <div>00:44:01 → Ambush begins — three guards fall</div>
              <div>01:12:45 → "She doesn't make it out of the alley" (overruled)</div>
              <div>01:23:07 → Veyra spotted — <em>"Mark moment"</em></div>
              <div>03:42:00 → Session ends</div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function SessionPipeline({ pipelineState="processing" }) {
  const steps = [
    { title:"Session ended",              desc:"End Session confirmed at 11:43pm",            state:"done" },
    { title:"Notes captured",             desc:"14 quick captures, 3 marked moments",         state:"done" },
    { title:"Transcript processing",      desc:pipelineState==="failed"?"Failed — 3 retries. Manual entry available.":"Audio analysed — segmenting…",        state:pipelineState==="failed"?"failed":pipelineState==="complete"?"done":"pending" },
    { title:"AI draft generation",        desc:pipelineState==="complete"?"14 items drafted for review":"Waiting for transcript",        state:pipelineState==="complete"?"done":"waiting" },
    { title:"Review queue populated",     desc:pipelineState==="complete"?"Ready — 14 items":"Pending",        state:pipelineState==="complete"?"done":"waiting" },
  ];
  return (
    <Shell active="sessions" pill="review" reviewCount={pipelineState==="complete"?14:0} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Session 16 · Post-session</div>
          <div className="page-title" style={{fontSize:36}}>The Harbor Reckoning</div>
        </div>
      </div>
      <div style={{maxWidth:640}}>
        {pipelineState==="failed" && (
          <div style={{background:"var(--rust-dim)",border:"1px solid rgba(138,56,40,0.28)",borderRadius:"var(--radius-md)",padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"flex-start"}}>
            <I n="alert" size={15} style={{color:"var(--rust)",flexShrink:0}} />
            <div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--rust)",marginBottom:3}}>Transcript processing failed</div>
              <div style={{fontSize:12,color:"var(--stone-700)",lineHeight:1.5}}>The audio could not be processed after 3 attempts. You can enter a summary manually or retry.</div>
              <div style={{display:"flex",gap:7,marginTop:9}}>
                <button className="btn btn-secondary btn-sm">Enter summary manually</button>
                <button className="btn btn-ghost btn-sm"><I n="refresh" size={11} /> Retry</button>
              </div>
            </div>
          </div>
        )}
        <div className="card pipeline-card">
          <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--stone-500)",marginBottom:14}}>Post-session pipeline</div>
          {steps.map((s,i)=>(
            <div key={i} className="pipeline-step">
              <div className={"pipeline-ico "+s.state}>
                {s.state==="done" && <I n="check" size={14} />}
                {s.state==="pending" && <I n="refresh" size={14} />}
                {s.state==="failed" && <I n="alert" size={14} />}
                {s.state==="waiting" && <I n="clock" size={14} />}
              </div>
              <div>
                <div className="pipeline-title">{s.title}</div>
                <div className="pipeline-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        {pipelineState==="complete" && (
          <button className="btn btn-ink" style={{marginTop:10,width:"100%",justifyContent:"center",gap:8}}><I n="review" size={13} /> Open review queue</button>
        )}
        {pipelineState==="processing" && (
          <div style={{display:"flex",alignItems:"center",gap:9,padding:"12px 0",fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.1em",color:"var(--stone-500)",textTransform:"uppercase"}}>
            <div className="loading-spinner" />Processing transcript — this may take a few minutes
          </div>
        )}
        <div style={{marginTop:14}}>
          <div className="em-section-label">Manual summary (optional)</div>
          <textarea className="settings-field" style={{width:"100%",marginTop:6,minHeight:80,resize:"vertical"}} placeholder="Add your own session notes, key moments, or corrections here. These will be included in the review queue." />
        </div>
      </div>
    </Shell>
  );
}

// ═══ STAGE ════════════════════════════════════════════════════

function StageView({ variant="active", endConfirm=false, showUndo=false }) {
  return (
    <Shell active="sessions" stageMode>
      <div className="stage-shell">
        <div className="stage-topbar">
          <div className="stage-session-label">
            <span style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--stage-fg-3)",marginRight:8}}>Session 16</span>
            The Harbor Reckoning
          </div>
          <div className="stage-chips">
            {variant==="ready" && <span className="stage-chip-live"><Dot kind="amber" />Ready</span>}
            {(variant==="active"||variant==="endConfirm") && <>
              <span className="stage-chip-live"><Dot kind="live pulse" />Live</span>
              <span className="stage-chip-rec"><Dot kind="recording pulse" />Recording</span>
            </>}
          </div>
          {variant!=="ready" && <div className="stage-timer">1:23:07</div>}
          <div style={{marginLeft:"auto",display:"flex",gap:7}}>
            <button style={{padding:"5px 10px",border:"1px solid var(--stage-border)",borderRadius:"var(--radius-md)",color:"var(--stage-fg-2)",fontSize:11,fontFamily:"var(--font-ui)",background:"transparent"}}>
              <I n="bolt" size={13} /> Sanctum
            </button>
          </div>
        </div>

        <div className="stage-body">
          <div className="stage-main">
            {/* Search */}
            <div className="stage-search">
              <I n="search" size={14} />
              <span style={{flex:1}}>Search saga…</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.1em",color:"var(--stage-fg-3)"}}>⌘K</span>
            </div>

            {/* Agenda */}
            <div className="stage-card">
              <div className="stage-sec-label">
                <span>Agenda</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:8,color:"var(--stage-fg-3)"}}>5 beats</span>
              </div>
              {[
                {n:1,text:"The body at Quay 4 — discovery and investigation",done:true},
                {n:2,text:"Confront the Dockmaster at his office",done:true},
                {n:3,text:"The midnight signal — Kael agent arrives",done:false},
                {n:4,text:"The quay chase",done:false},
                {n:5,text:"Resolution at the harbor",done:false},
              ].map((a,i)=>(
                <div key={i} className="agenda-item">
                  <span className="agenda-num">{a.n}</span>
                  <span className="agenda-txt" style={{textDecoration:a.done?"line-through":"none",opacity:a.done?0.45:1}}>{a.text}</span>
                  {a.done && <I n="check" size={12} className="agenda-done" style={{color:"var(--verdigris)"}} />}
                </div>
              ))}
            </div>

            {/* Pinned entities */}
            <div>
              <div className="stage-sec-label" style={{marginBottom:8}}><span>Pinned</span></div>
              <div className="pinned-strip">
                {[
                  {name:"Castellan Veyra",type:"NPC"},
                  {name:"The Dockmaster",type:"NPC"},
                  {name:"Mira Ashborne",type:"NPC"},
                  {name:"Fenwick Harbor",type:"Location"},
                  {name:"The Forged Deed",type:"Artifact"},
                ].map((e,i)=>(
                  <div key={i} className="pinned-card">
                    <div className="pinned-portrait"><I n="users" size={20} /></div>
                    <div className="pinned-name">{e.name}</div>
                    <div className="pinned-type-txt">{e.type}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Entity detail */}
            <div className="stage-card">
              <div className="stage-sec-label" style={{marginBottom:10}}>
                <span style={{fontFamily:"var(--font-display)",fontSize:16,color:"var(--stage-fg-1)",letterSpacing:"-0.01em"}}>The Dockmaster</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--stage-fg-3)"}}>NPC · Uncertain</span>
              </div>
              <div style={{fontFamily:"var(--font-display)",fontStyle:"italic",fontSize:12,color:"var(--stage-fg-2)",lineHeight:1.6,marginBottom:10}}>Revealed as an informant for the Crown. Allegiance unclear. Speaks with a slight lisp and won't meet anyone's eyes.</div>
              <div style={{fontFamily:"var(--font-display)",fontStyle:"italic",fontSize:11,color:"rgba(184,112,42,0.7)",padding:"8px 10px",background:"rgba(184,112,42,0.06)",borderRadius:"var(--radius-sm)",borderLeft:"2px solid rgba(184,112,42,0.3)",marginBottom:10}}>GM: He is terrified. House Kael has his family. Play him as desperate, not duplicitous.</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {["Crown's Keep","Fenwick Harbor","House Kael"].map((l,i)=>(
                  <span key={i} style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.08em",padding:"2px 7px",borderRadius:"var(--radius-sm)",border:"1px solid var(--stage-border)",color:"var(--stage-fg-3)"}}>{l}</span>
                ))}
              </div>
            </div>

            {endConfirm && (
              <div className="end-confirm-card">
                <div className="end-confirm-title">End Session 16?</div>
                <div className="end-confirm-desc">This will stop recording, preserve all captures, and send the session to the review pipeline. You cannot undo this after 60 seconds.</div>
                <div className="end-confirm-actions">
                  <button className="stage-btn-rust">End session</button>
                  <button className="stage-btn-ghost">Cancel</button>
                </div>
              </div>
            )}

            {showUndo && (
              <div className="undo-banner">
                <div className="undo-count">47</div>
                <div className="undo-text">Session ended. Undo available for 47 seconds.</div>
                <button style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",padding:"5px 10px",border:"1px solid rgba(184,112,42,0.4)",borderRadius:"var(--radius-sm)",color:"var(--amber)",background:"rgba(184,112,42,0.08)"}}>Undo</button>
              </div>
            )}
          </div>

          <div className="stage-right">
            <div className="stage-loom-label"><I n="spark" size={13} style={{color:"rgba(184,112,42,0.6)"}} />The Loom · Live</div>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,fontSize:12,color:"var(--stage-fg-2)"}}>
              <div style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--stage-fg-3)",marginBottom:2}}>Recent context</div>
              <div style={{lineHeight:1.6,fontSize:12,color:"var(--stage-fg-2)"}}>The Dockmaster's allegiance is uncertain. His relationship with House Kael is a canon risk — watch for contradiction.</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
                {["Stub NPC","Capture note","Search","Suggest beat"].map((s,i)=>(
                  <button key={i} style={{fontSize:9,fontFamily:"var(--font-mono)",letterSpacing:"0.08em",padding:"4px 8px",border:"1px solid var(--stage-border)",borderRadius:"var(--radius-sm)",color:"var(--stage-fg-2)",background:"var(--stage-card)"}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {!endConfirm && !showUndo && (
              <button className="stage-end-btn">End Session 16</button>
            )}
          </div>
        </div>

        <div className="stage-action-rail">
          <button className="action-btn record"><Dot kind="recording pulse" /><span>Record</span></button>
          <button className="action-btn mark"><I n="flag" size={14} /><span>Moment</span></button>
          <button className="action-btn"><I n="dice" size={14} /><span>Dice</span></button>
          <button className="action-btn"><I n="notes" size={14} /><span>Capture</span></button>
          <button className="action-btn"><I n="plus" size={14} /><span>Stub</span></button>
          <div style={{flex:1}} />
          <button style={{fontSize:9,fontFamily:"var(--font-mono)",letterSpacing:"0.08em",textTransform:"uppercase",padding:"5px 9px",border:"1px solid var(--stage-border)",borderRadius:"var(--radius-sm)",color:"var(--stage-fg-3)",background:"transparent"}}>⌘K Search</button>
        </div>
      </div>
    </Shell>
  );
}

// ═══ REVIEW ══════════════════════════════════════════════════

const REVIEW_ITEMS = [
  { title:"The Dockmaster",               type:"New NPC",           conf:"high", dot:"new",    sess:"Session 16", has_conflict:false },
  { title:"Mira Ashborne — status update",type:"NPC update",        conf:"med",  dot:"update", sess:"Session 16", has_conflict:true  },
  { title:"Fenwick Harbor — consequence", type:"Location update",   conf:"high", dot:"update", sess:"Session 16", has_conflict:false },
  { title:"The Forged Succession advance",type:"Thread update",     conf:"med",  dot:"update", sess:"Session 16", has_conflict:false },
  { title:"Recap: Session 16",            type:"Session recap",     conf:"med",  dot:"new",    sess:"Session 16", has_conflict:false },
  { title:"Aldric Fenmore",               type:"New NPC",           conf:"low",  dot:"danger", sess:"Session 15", has_conflict:false },
  { title:"Lord Esten — deceased",        type:"Status change",     conf:"high", dot:"danger", sess:"Session 15", has_conflict:false },
];

function ReviewView({ emptyState=false, selected=0 }) {
  const item = REVIEW_ITEMS[selected];
  const groups = [
    { label:"Session 16", items: REVIEW_ITEMS.filter(i=>i.sess==="Session 16") },
    { label:"Session 15", items: REVIEW_ITEMS.filter(i=>i.sess==="Session 15") },
  ];
  return (
    <Shell active="review" pill="none" reviewCount={emptyState?0:7} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">The Shattered Crown</div>
          <div className="page-title">Review</div>
          <div className="page-sub">Nothing enters canon until you approve it.</div>
        </div>
      </div>

      {emptyState ? (
        <div className="empty-state">
          <div style={{fontSize:36,fontFamily:"var(--font-display)",color:"var(--stone-300)"}}>✓</div>
          <div className="empty-title">Queue is clear</div>
          <div className="empty-desc">All items have been reviewed. Your saga is in good shape.</div>
        </div>
      ) : (
        <div className="review-layout">
          <div className="card rq-card">
            <div className="rq-head">
              <div className="rq-title-txt">Approval queue</div>
              <div className="rq-count"><Dot kind="loose" style={{marginRight:4}} />{REVIEW_ITEMS.length} pending</div>
            </div>
            {groups.map(group=>(
              <div key={group.label}>
                <div className="rq-group-label">{group.label}</div>
                {group.items.map((item,i)=>(
                  <div key={i} className={"rq-item"+(i===selected&&group.label==="Session 16"?" sel":"")}>
                    <div className={"rq-dot "+item.dot} />
                    <div className="rq-item-body">
                      <div className="rq-item-title">{item.title}</div>
                      <div className="rq-item-type">{item.type}</div>
                    </div>
                    <div className={"rq-conf "+item.conf}>{item.conf}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="card dd-card">
            <div className="dd-eyebrow">
              <span className="chip stone">{item.type}</span>
              <span className={"conf-badge "+item.conf}>{item.conf} confidence</span>
              <span style={{marginLeft:"auto",fontFamily:"var(--font-mono)",fontSize:8,color:"var(--stone-500)"}}>{item.sess}</span>
            </div>
            <div className="dd-title">{item.title}</div>
            <div className="dd-actions">
              <button className="btn btn-amber btn-sm"><I n="check" size={12} /> Approve</button>
              <button className="btn btn-secondary btn-sm"><I n="notes" size={12} /> Edit &amp; Approve</button>
              <button className="btn btn-rust btn-sm"><I n="x" size={12} /> Reject</button>
              <button className="btn btn-ghost btn-sm"><I n="archive" size={12} /> Archive</button>
            </div>

            {item.has_conflict && (
              <div className="conflict-panel">
                <div className="conflict-title"><I n="alert" size={11} />Continuity conflict</div>
                <div className="conflict-desc">This update conflicts with an existing canon entry. Mira's status was "Endangered" in Session 15 canon. Review both before approving.</div>
                <button className="btn btn-ghost btn-sm" style={{marginTop:7}}>View conflicting entry</button>
              </div>
            )}

            {item.conf==="low" && (
              <div className="stale-warning">
                <I n="alert" size={14} style={{color:"var(--amber)",flexShrink:0}} />
                <span>Low confidence — source is incomplete or ambiguous. Verify before committing to canon.</span>
              </div>
            )}

            <div className="diff-block">
              <div className="diff-label">Proposed changes</div>
              {selected===0 ? (
                <>
                  <div className="diff-row">
                    <span className="diff-key">New entity</span>
                    <span className="diff-new" style={{fontFamily:"var(--font-display)",fontSize:14}}>The Dockmaster</span>
                  </div>
                  <div className="diff-row">
                    <span className="diff-key">Type</span>
                    <span className="diff-ctx">NPC · Uncertain</span>
                  </div>
                  <div className="diff-row">
                    <span className="diff-key">Description</span>
                    <span className="diff-ctx">Revealed as an informant for the Crown. Controls eastern quay licences.</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="diff-row">
                    <span className="diff-key">Status</span>
                    <span className="diff-old">Endangered</span>
                    <span className="diff-arr">→</span>
                    <span className="diff-new">At large</span>
                  </div>
                  <div className="diff-row">
                    <span className="diff-key">Note</span>
                    <span className="diff-ctx">Escaped the harbor confrontation. Location unknown.</span>
                  </div>
                </>
              )}
            </div>

            <div className="source-dock">
              <div className="source-dock-label">Source &amp; provenance</div>
              <div className="source-ref"><em>Transcript</em> · Session 16 · 01:23:45</div>
              <div className="source-ref" style={{marginTop:4,color:"var(--stone-500)"}}>{"\"He works for the Crown. Has done for three years. He didn't want to, but they have his family.\""}</div>
              <div style={{marginTop:7,display:"flex",gap:6,flexWrap:"wrap"}}>
                <span className="source-chip"><I n="anchor" size={8} />Session 16 transcript</span>
                <span className="source-chip"><I n="notes" size={8} />Quick capture</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

Object.assign(window, { SessionsIndex, SessionDetail, SessionPipeline, StageView, ReviewView });
