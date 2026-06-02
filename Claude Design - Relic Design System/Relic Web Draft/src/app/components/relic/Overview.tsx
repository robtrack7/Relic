import React from 'react';
import { Shell } from './Shell';
import { I } from './Primitives';

export function SitemapView() {
  const sections = [
    { label:"App shell", color:"var(--stone-700)", items:[
      {name:"Default desktop shell",sub:"Top bar, left nav, main, Loom"},
      {name:"Collapsed rail nav",sub:"76px icon rail"},
      {name:"Loom expanded / collapsed",sub:"384px panel ↔ 48px rail"},
      {name:"Switcher open",sub:"Workspace / World / Saga"},
      {name:"Create menu",sub:"10 entity + session types"},
      {name:"Global search / command palette",sub:"⌘K"},
      {name:"Session pill states",sub:"None / Prepping / Ready / Active / Review"},
    ]},
    { label:"Home", color:"var(--amber)", items:[
      {name:"Empty saga",sub:"First-run, no data"},
      {name:"No session planned",sub:"Post-review resting state"},
      {name:"Session planned — prepping",sub:"Packet with progress"},
      {name:"Ready for Stage",sub:"Full packet, Open in Stage CTA"},
      {name:"Session active — return banner",sub:"Live, Sanctum read-only"},
      {name:"Review ready",sub:"14 items pending"},
    ]},
    { label:"Threads", color:"var(--verdigris)", items:[
      {name:"Thread list — all states",sub:"Active / Loose / Dormant / Resolved"},
      {name:"Thread detail",sub:"Objectives, timeline, entities, draft"},
      {name:"Empty threads",sub:"First-run state"},
    ]},
    { label:"Library", color:"var(--hue-npc)", items:[
      {name:"Entity overview",sub:"All / filtered by type"},
      {name:"Entity detail — view",sub:"Full canonical record"},
      {name:"Entity detail — edit",sub:"Rich text, links, structured fields"},
      {name:"New entity flow",sub:"Blank form"},
      {name:"Draft from prompt",sub:"Loom-generated draft in editor"},
      {name:"Duplicate warning",sub:"Merge / keep / discard"},
      {name:"Archived entity",sub:"Read-only, restore available"},
    ]},
    { label:"Prepare", color:"var(--amber)", items:[
      {name:"Session prep workspace",sub:"Full prep — checklist, scenes, tiles"},
      {name:"Prep ready state",sub:"10/10 checks, Open in Stage CTA"},
      {name:"Prep locked",sub:"Read-only during live session"},
    ]},
    { label:"Sessions", color:"var(--hue-location)", items:[
      {name:"Session index",sub:"All sessions listed"},
      {name:"Session detail",sub:"Reviewed session — recap, canon, threads"},
      {name:"Post-session pipeline",sub:"Processing / complete / failed"},
    ]},
    { label:"Stage", color:"var(--stone-900)", items:[
      {name:"Stage ready",sub:"Pre-session confirmation"},
      {name:"Stage active",sub:"Live cockpit"},
      {name:"End session confirm",sub:"Two-step"},
      {name:"60-second undo",sub:"Countdown banner"},
    ]},
    { label:"Review", color:"var(--rust)", items:[
      {name:"Review queue",sub:"Grouped by session / type"},
      {name:"Draft detail",sub:"Diff, source dock, conflict panel"},
      {name:"Empty queue",sub:"All clear state"},
    ]},
    { label:"Export", color:"var(--stone-500)", items:[
      {name:"Export form",sub:"Format + scope selection"},
      {name:"Processing",sub:"Spinner, progress"},
      {name:"Ready",sub:"Download link"},
      {name:"Expired / Failed",sub:"Error recovery"},
    ]},
    { label:"Settings", color:"var(--stone-500)", items:[
      {name:"Saga settings",sub:"Name, status, AI, danger zone"},
      {name:"World settings",sub:"Name, system, description"},
      {name:"Workspace settings",sub:"Name, slug"},
      {name:"Usage",sub:"Credits, entities, storage bars"},
      {name:"Retention",sub:"Transcript, draft, export TTLs"},
      {name:"Notifications",sub:"Toggle per event type"},
      {name:"Export preferences",sub:"Defaults"},
      {name:"Account",sub:"Name, email, plan"},
    ]},
    { label:"System states", color:"var(--stone-300)", items:[
      {name:"Empty states",sub:"Threads / Library / Review"},
      {name:"Loading",sub:"Spinner + literary copy"},
      {name:"Offline / network failed",sub:"Banner, sync queue"},
      {name:"Quota blocked",sub:"AI limit, manual fallback"},
      {name:"Autosave states",sub:"Saving / Saved / Saved Ns ago / Queued"},
      {name:"Destructive warning",sub:"Delete confirmation"},
    ]},
  ];

  return (
    <Shell active="home" pill="none" reviewCount={0} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Relic Web · v0.4 · MVP</div>
          <div className="page-title">Screen inventory</div>
          <div className="page-sub">Complete map of all surfaces and states in this wireframe set.</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {sections.map((sec,si)=>(
          <div key={si} className="card" style={{padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingBottom:8,borderBottom:"1px solid var(--border-2)"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:sec.color,flexShrink:0}} />
              <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--stone-700)"}}>{sec.label}</div>
            </div>
            {sec.items.map((item,ii)=>(
              <div key={ii} style={{padding:"5px 0",borderTop:ii>0?"1px solid var(--border-2)":"none"}}>
                <div style={{fontSize:12,color:"var(--fg-1)",lineHeight:1.3}}>{item.name}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.06em",color:"var(--stone-500)",marginTop:1}}>{item.sub}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function FlowMapView() {
  const FLOW_STEPS = [
    { id:"create",  label:"Create",   color:"var(--amber)",        desc:"New entity, thread, or session created — manually or via Loom draft",    actions:["New entity","Draft from prompt","New thread","Plan session"] },
    { id:"org",     label:"Organise", color:"var(--hue-npc)",       desc:"Library grows. Entities linked to threads. Canon established.",          actions:["Entity detail","Link entities","Edit canon","Attach sources"] },
    { id:"prep",    label:"Prepare",  color:"var(--amber)",        desc:"Session packet built. Scenes planned. Continuity checked. Ready.",        actions:["Prep workspace","Scene planner","Pin entities","Ready for Stage"] },
    { id:"run",     label:"Run",      color:"var(--stone-900)",    desc:"Live play at the Stage. Captures, stubs, moments recorded.",              actions:["Stage cockpit","Quick Capture","Quick Stub","Mark Moment","Dice","Record"] },
    { id:"review",  label:"Review",   color:"var(--rust)",         desc:"Session ends. Pipeline runs. Drafts generated for GM review.",            actions:["Review queue","Diff view","Approve / Edit / Reject"] },
    { id:"approve", label:"Approve",  color:"var(--verdigris)",    desc:"GM commits approved items to canon. Nothing lands without explicit action.", actions:["Commit to canon","Edit & approve","Reject / archive"] },
    { id:"cont",    label:"Continue", color:"var(--hue-location)", desc:"Saga continues. Threads advance. New session planned. Loop repeats.",     actions:["Plan next session","Thread advances","Library grows"] },
  ];

  return (
    <Shell active="home" pill="none" reviewCount={0} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Relic — product loop</div>
          <div className="page-title">User flow map</div>
          <div className="page-sub">Create → Organise → Prepare → Run → Review → Approve → Continue</div>
        </div>
      </div>
      <div style={{display:"flex",gap:0,alignItems:"stretch",overflowX:"auto",paddingBottom:8}}>
        {FLOW_STEPS.map((step,i)=>(
          <React.Fragment key={step.id}>
            <div style={{flex:1,minWidth:140,border:"1px solid var(--border-1)",borderRadius:"var(--r-lg)",background:"var(--bg-2)",padding:"16px 14px",display:"flex",flexDirection:"column",gap:8}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:step.color,display:"grid",placeItems:"center",flexShrink:0}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:9,color:"var(--cream)",letterSpacing:"0.04em"}}>{String(i+1).padStart(2,"0")}</span>
              </div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:step.color}}>{step.label}</div>
              <div style={{fontFamily:"var(--font-display)",fontStyle:"italic",fontSize:12,color:"var(--stone-700)",lineHeight:1.5,flex:1}}>{step.desc}</div>
              <div style={{display:"flex",flexDirection:"column",gap:3,marginTop:4}}>
                {step.actions.map((a,ai)=>(
                  <div key={ai} style={{fontSize:10,color:"var(--fg-2)",padding:"3px 7px",background:"var(--bg-1)",borderRadius:"var(--r-sm)",border:"1px solid var(--border-2)"}}>{a}</div>
                ))}
              </div>
            </div>
            {i < FLOW_STEPS.length-1 && (
              <div style={{display:"flex",alignItems:"center",padding:"0 4px",flexShrink:0}}>
                <I n="arrowRight" size={16} style={{color:"var(--stone-300)"}} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div style={{marginTop:24,padding:"18px 20px",border:"1px solid var(--border-1)",borderRadius:"var(--r-lg)",background:"var(--bg-2)"}}>
        <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"var(--stone-500)",marginBottom:12}}>Reusable component map</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
          {[
            {name:"Shell",          where:"All surfaces",         note:"TopBar + SideNav + Loom + overlays"},
            {name:"Session pill",   where:"TopBar",               note:"5 states: none / prepping / ready / active / review"},
            {name:"Review badge",   where:"TopBar + SideNav",     note:"Rust count badge on pending items"},
            {name:"Loom carriage",  where:"All Sanctum surfaces", note:"Expanded (384px) or collapsed rail (48px)"},
            {name:"Entity card",    where:"Library, Home, Prep",  note:"8px category rule, status chip, meta footer"},
            {name:"Thread row",     where:"Threads, Home",        note:"State chip: active/loose/dormant/resolved"},
            {name:"Draft card",     where:"Loom, Review",         note:"Amber-edged · Approve / Edit / Discard"},
            {name:"Packet tile",    where:"Home, Prepare",        note:"Icon + label + body, auto-grid"},
            {name:"Scene card",     where:"Prepare",              note:"Numbered, status: locked / needs-detail"},
            {name:"Diff block",     where:"Review",               note:"Field · old → new, source dock, conf badge"},
            {name:"Autosave pill",  where:"All edit surfaces",    note:"Fixed bottom-right: Saving / Saved / Offline queued"},
            {name:"Conf badge",     where:"Review, Library",      note:"High / Med / Low · verdigris / amber / rust"},
            {name:"Empty state",    where:"All surfaces",         note:"Ornament + Cormorant italic + CTA"},
            {name:"Meter",          where:"Home, Prepare, Usage", note:"5px track, verdigris fill, amber/rust warn"},
            {name:"Cta-stage",      where:"Home, Prepare",        note:"Full-width amber Cormorant CTA, wax seal ornament"},
          ].map((c,i)=>(
            <div key={i} style={{padding:"9px 10px",background:"var(--bg-1)",borderRadius:"var(--r-md)",border:"1px solid var(--border-2)"}}>
              <div style={{fontSize:12,fontWeight:500,color:"var(--fg-1)",marginBottom:2}}>{c.name}</div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.08em",color:"var(--amber)",marginBottom:3}}>{c.where}</div>
              <div style={{fontSize:10,color:"var(--stone-500)",lineHeight:1.4}}>{c.note}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:16,padding:"18px 20px",border:"1px solid rgba(184,112,42,0.25)",borderRadius:"var(--r-lg)",background:"rgba(184,112,42,0.03)"}}>
        <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"var(--amber)",marginBottom:10}}>Open design questions</div>
        {[
          {q:"Session pill overflow",    a:"How does the pill behave when the session name is very long? Truncate with ellipsis, or shorten to 'S16 · Active'?"},
          {q:"Loom in Stage dark mode",  a:"The Loom panel uses light tokens. Stage re-themes via .stage-app scope — confirm token remapping doesn't break embedded Loom copy."},
          {q:"Stale draft threshold",    a:"Spec says warn on stale drafts — what is the threshold? 7 days? 14 days? Tied to retention setting?"},
          {q:"Quick Stub vs Draft",      a:"Stage has Quick Stub (inline, unreviewed). Library has Draft from prompt (Loom, amber-edged). Confirm these are the same review path."},
          {q:"Tablet / narrow layout",  a:"Below 1040px the nav collapses to rail. At ~768px does the Loom become an overlay or disappear? Spec says overlay — confirm trigger width."},
          {q:"Approval Queue 'Reject'", a:"What happens to a rejected draft — silently discarded, or archived with a note for audit purposes?"},
        ].map((item,i)=>(
          <div key={i} style={{padding:"9px 0",borderTop:i>0?"1px solid var(--border-2)":"none",display:"flex",gap:14}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.04em",color:"var(--amber)",flexShrink:0,width:180,paddingTop:1}}>{item.q}</div>
            <div style={{fontSize:12,color:"var(--stone-700)",lineHeight:1.5}}>{item.a}</div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
