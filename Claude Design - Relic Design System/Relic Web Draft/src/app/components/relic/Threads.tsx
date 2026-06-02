import React from 'react';
import { Shell } from './Shell';
import { I, Dot, SecLabel } from './Primitives';
import { useApp } from './AppContext';

const THREADS = [
  { id:1, name:"The Forged Succession",    state:"loose",   summary:"House Kael moves to legitimise a forged deed of succession before the Crown's audit. Castellan Veyra is orchestrating from the inside.", objs:[{done:true,text:"Discover the deed exists"},{done:true,text:"Identify Veyra as the architect"},{done:false,text:"Recover the deed before the Crown's audit"},{done:false,text:"Decide Veyra's fate"}] },
  { id:2, name:"Mira's Debt to House Kael",state:"active",  summary:"Mira owes House Kael a debt she refuses to name. It's becoming dangerous.", objs:[{done:true,text:"Learn the debt exists"},{done:false,text:"Discover what she owes them"},{done:false,text:"Help her resolve or escape it"}] },
  { id:3, name:"Siege of Thornwall",       state:"active",  summary:"A city to the north is three sessions from falling unless the party intervenes.", objs:[{done:false,text:"Reach Thornwall before the siege collapses"},{done:false,text:"Find Lord Esten's hidden cache"},{done:false,text:"Negotiate a ceasefire or fight"}] },
  { id:4, name:"The Vanished Artificer",   state:"dormant", summary:"A Guild artificer disappeared six months ago. Her workshop was ransacked.", objs:[{done:true,text:"Discover the disappearance"},{done:false,text:"Follow the trail to the Pale Court"},{done:false,text:"Find her or confirm her fate"}] },
  { id:5, name:"The Merchant Roads",       state:"resolved",summary:"The party disrupted a smuggling ring operating through the toll roads. Resolved in Session 8.", objs:[{done:true,text:"Identify the smuggling ring"},{done:true,text:"Expose the Tollmaster"},{done:true,text:"See justice served"}] },
];

const RELATED_ENTS = [
  {name:"Castellan Veyra", type:"NPC",      color:"var(--hue-npc)"},
  {name:"The Forged Deed", type:"Artifact", color:"#8B6914"},
  {name:"House Kael",      type:"Faction",  color:"var(--hue-faction)"},
  {name:"Fenwick Harbor",  type:"Location", color:"var(--hue-location)"},
];

interface ThreadsViewProps {
  detail?: boolean;
  selected?: number;
  state?: string;
  emptyState?: boolean;
}

export function ThreadsView({ detail=true, selected=1, state="all", emptyState=false }: ThreadsViewProps) {
  const app = useApp();
  const selectedId = app?.state.selectedThreadId ?? selected;
  const thread = THREADS.find(t=>t.id===selectedId) || THREADS[0];
  const groups = [
    { label:"Active ◆", items: THREADS.filter(t=>t.state==="active") },
    { label:"Loose ◈",  items: THREADS.filter(t=>t.state==="loose") },
    { label:"Dormant ○",items: THREADS.filter(t=>t.state==="dormant") },
    { label:"Resolved ✓",items: THREADS.filter(t=>t.state==="resolved") },
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
                <div
                  key={t.id}
                  className={"tl-row"+(t.id===selectedId?" sel":"")}
                  onClick={() => app?.update({ selectedThreadId: t.id })}
                  style={{ cursor: "pointer" }}
                >
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
              <div key={i} className="ent-link" onClick={() => app?.navigate("library", { libraryView: "detail" })} style={{ cursor: "pointer" }}>
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
