import React from 'react';
import { Shell } from './Shell';
import { I, Dot, SecLabel } from './Primitives';
import { useApp } from './AppContext';

const SESSION_DATA = [
  { n:16, name:"The Harbor Reckoning",   date:"This Saturday",  status:"prepping",  statusLabel:"Prepping",       statusCls:"ss-prep",     action:"prepare" },
  { n:15, name:"The Ambush at the Gate", date:"May 24, 2026",   status:"review",    statusLabel:"Review ready",   statusCls:"ss-pipeline", action:"pipeline" },
  { n:14, name:"Into the Keep",          date:"May 10, 2026",   status:"reviewed",  statusLabel:"Reviewed",       statusCls:"ss-reviewed", action:"detail" },
  { n:13, name:"The Merchant's Letter",  date:"Apr 26, 2026",   status:"reviewed",  statusLabel:"Reviewed",       statusCls:"ss-reviewed", action:"detail" },
  { n:12, name:"Wolves at the Gate",     date:"Apr 12, 2026",   status:"reviewed",  statusLabel:"Reviewed",       statusCls:"ss-reviewed", action:"detail" },
];

export function SessionsIndex() {
  const app = useApp();
  return (
    <Shell active="sessions" pill="none" reviewCount={7} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">The Shattered Crown</div>
          <div className="page-title">Sessions</div>
          <div className="page-sub">The chronicle of your saga's play.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ink" onClick={() => app?.navigate("prepare", { sessionState: "prepping" })}><I n="plus" size={13} /> Plan session</button>
        </div>
      </div>
      <div className="sess-tabs">
        {["All","Planned","In progress","Ended","Reviewed"].map((t,i)=>(
          <button key={t} className={"sess-tab"+(i===0?" active":"")}>{t}</button>
        ))}
      </div>
      <div className="sess-list">
        {SESSION_DATA.map((s,i)=>(
          <div
            key={i}
            className="sess-row"
            onClick={() => {
              if (s.action === "prepare") app?.navigate("prepare");
              else if (s.action === "pipeline") app?.navigate("sessions", { sessionsView: "pipeline", pipelineState: "processing" });
              else app?.navigate("sessions", { sessionsView: "detail" });
            }}
            style={{ cursor: "pointer" }}
          >
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

export function SessionDetail() {
  const app = useApp();
  return (
    <Shell active="sessions" pill="none" reviewCount={7} loomExpanded={false}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => app?.navigate("sessions", { sessionsView: "index" })}>
          <I n="chevLeft" size={12} /> Sessions
        </button>
      </div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><Dot kind="active" /> Session 15 · May 24, 2026 · Reviewed</div>
          <div className="page-title" style={{fontSize:36}}>The Ambush at the Gate</div>
          <div className="page-sub" style={{fontStyle:"italic"}}>The eastern gate ambush changes everything. Three guards dead. Veyra disappears.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary"><I n="notes" size={13} /> Edit recap</button>
          <button className="btn btn-secondary" onClick={() => app?.navigate("prepare", { sessionState: "prepping" })}><I n="sessions" size={13} /> Plan S16</button>
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
            {[[1,"The Forged Succession","loose"],[2,"Mira's Debt","active"]].map(([id,n,s])=>(
              <div key={String(id)} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderTop:Number(id)>1?"1px solid var(--border-2)":"none",cursor:"pointer"}} onClick={() => app?.navigate("threads", { selectedThreadId: Number(id) })}>
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

interface SessionPipelineProps {
  pipelineState?: "processing" | "complete" | "failed";
}

export function SessionPipeline({ pipelineState="processing" }: SessionPipelineProps) {
  const app = useApp();
  const steps = [
    { title:"Session ended",          desc:"End Session confirmed at 11:43pm",                                                                                 state:"done" },
    { title:"Notes captured",         desc:"14 quick captures, 3 marked moments",                                                                             state:"done" },
    { title:"Transcript processing",  desc:pipelineState==="failed"?"Failed — 3 retries. Manual entry available.":"Audio analysed — segmenting…",             state:pipelineState==="failed"?"failed":pipelineState==="complete"?"done":"pending" },
    { title:"AI draft generation",    desc:pipelineState==="complete"?"14 items drafted for review":"Waiting for transcript",                                  state:pipelineState==="complete"?"done":"waiting" },
    { title:"Review queue populated", desc:pipelineState==="complete"?"Ready — 14 items":"Pending",                                                           state:pipelineState==="complete"?"done":"waiting" },
  ];
  return (
    <Shell active="sessions" pill="review" reviewCount={pipelineState==="complete"?14:0} loomExpanded={false}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => app?.navigate("sessions", { sessionsView: "index" })}>
          <I n="chevLeft" size={12} /> Sessions
        </button>
      </div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Session 16 · Post-session</div>
          <div className="page-title" style={{fontSize:36}}>The Harbor Reckoning</div>
        </div>
      </div>
      <div style={{maxWidth:640}}>
        {pipelineState==="failed" && (
          <div style={{background:"var(--rust-dim)",border:"1px solid rgba(138,56,40,0.28)",borderRadius:"var(--r-md)",padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"flex-start"}}>
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
                {s.state==="done"    && <I n="check" size={14} />}
                {s.state==="pending" && <I n="refresh" size={14} />}
                {s.state==="failed"  && <I n="alert" size={14} />}
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
          <button className="btn btn-ink" style={{marginTop:10,width:"100%",justifyContent:"center",gap:8}} onClick={() => app?.navigate("review", { sessionState: "review" })}><I n="review" size={13} /> Open review queue</button>
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
