import React from 'react';
import { Shell } from './Shell';
import { I, Dot, SecLabel } from './Primitives';

// ═══ EXPORT ══════════════════════════════════════════════════

interface ExportViewProps {
  exportState?: "form" | "processing" | "ready" | "expired" | "failed";
}

export function ExportView({ exportState="form" }: ExportViewProps) {
  const states: Record<string, {ico:string;title:string;desc:string;icos:string}|null> = {
    form:       null,
    processing: { ico:"processing", title:"Preparing export…",        desc:"Compiling entities, threads, and session logs. This may take a minute.",  icos:"refresh" },
    ready:      { ico:"ready",      title:"Export ready",             desc:"Your export is ready. The link expires in 24 hours.",                      icos:"checkCircle" },
    expired:    { ico:"expired",    title:"Export expired",           desc:"This export link has expired. Generate a new one below.",                  icos:"clock" },
    failed:     { ico:"failed",     title:"Export failed",            desc:"Something went wrong generating the export. Try again or contact support.", icos:"alert" },
  };
  const st = states[exportState];

  return (
    <Shell active="export" pill="none" reviewCount={7} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">The Shattered Crown</div>
          <div className="page-title">Export</div>
          <div className="page-sub">Take your saga with you. All exports are point-in-time snapshots.</div>
        </div>
      </div>
      <div className="export-layout">
        <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"var(--stone-500)",marginBottom:10}}>Export format</div>
        <div className="export-types">
          {[
            { id:"md",   label:"Markdown", title:"Markdown", desc:"Plain-text files for notes apps, Obsidian, Notion, and version control. One file per entity, threaded by type." },
            { id:"json", label:"JSON",     title:"JSON",     desc:"Structured data export for custom tools, scripts, and future import into another system." },
          ].map(f=>(
            <div key={f.id} className={"export-type"+(f.id==="md"?" selected":"")}>
              <div className="et-label"><I n={f.id==="md"?"notes":"file"} size={11} />{f.label}</div>
              <div className="et-title">{f.title}</div>
              <div className="et-desc">{f.desc}</div>
            </div>
          ))}
        </div>

        <div className="export-scope-label">Include in export</div>
        {[
          {label:"All entities (Characters, Places, Factions, Artifacts, Lore)",checked:true},
          {label:"Threads and objectives",checked:true},
          {label:"Session recaps and notes",checked:true},
          {label:"Approved review history",checked:true},
          {label:"Draft / unreviewed items",checked:false},
          {label:"GM-only notes",checked:false},
        ].map((opt,i)=>(
          <div key={i} className="scope-opt">
            <div className={"scope-chk"+(opt.checked?" checked":"")}>
              {opt.checked && <I n="check" size={10} />}
            </div>
            <span>{opt.label}</span>
          </div>
        ))}

        {exportState==="form" && (
          <div style={{marginTop:18,display:"flex",gap:8}}>
            <button className="btn btn-ink"><I n="download" size={13} /> Generate export</button>
            <button className="btn btn-ghost">Export preferences</button>
          </div>
        )}

        {st && (
          <div className="export-status">
            <div className={"es-ico "+st.ico}>
              <I n={st.icos} size={20} />
            </div>
            <div>
              <div className="es-title">{st.title}</div>
              <div className="es-desc">{st.desc}</div>
            </div>
          </div>
        )}

        {exportState==="processing" && (
          <div style={{display:"flex",alignItems:"center",gap:9,fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.1em",color:"var(--stone-500)",textTransform:"uppercase"}}>
            <div className="loading-spinner" />Compiling — 64 entities, 16 sessions
          </div>
        )}

        {exportState==="ready" && (
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <button className="btn btn-ink"><I n="download" size={13} /> Download (2.4 MB)</button>
            <button className="btn btn-secondary"><I n="refresh" size={12} /> Regenerate</button>
          </div>
        )}

        {(exportState==="expired"||exportState==="failed") && (
          <button className="btn btn-ink" style={{marginTop:6}}><I n="download" size={13} /> Generate new export</button>
        )}
      </div>
    </Shell>
  );
}

// ═══ SETTINGS ════════════════════════════════════════════════

const SETTINGS_NAV = [
  { group:"Saga",    items:["Saga settings","World settings","Retention"] },
  { group:"Account", items:["Workspace settings","Account","Usage","Notifications","Export preferences"] },
];

interface SettingsViewProps {
  section?: string;
}

export function SettingsView({ section="Saga settings" }: SettingsViewProps) {
  return (
    <Shell active="settings" pill="none" reviewCount={7} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Configuration</div>
          <div className="page-title">Settings</div>
        </div>
      </div>
      <div className="settings-layout">
        <div className="card settings-nav-card">
          {SETTINGS_NAV.map(group=>(
            <div key={group.group}>
              <div style={{fontFamily:"var(--font-mono)",fontSize:7,letterSpacing:"0.18em",textTransform:"uppercase",color:"var(--stone-500)",padding:"7px 11px 3px"}}>{group.group}</div>
              {group.items.map(item=>(
                <div key={item} className={"settings-nav-item"+(item===section?" active":"")}>{item}</div>
              ))}
              <div className="settings-nav-sep" />
            </div>
          ))}
        </div>

        <div className="card settings-content-card">
          {section==="Saga settings" && <SagaSettings />}
          {section==="World settings" && <WorldSettings />}
          {section==="Usage" && <UsageSettings />}
          {section==="Retention" && <RetentionSettings />}
          {section==="Account" && <AccountSettings />}
          {section==="Notifications" && <NotifSettings />}
          {section==="Export preferences" && <ExportPrefsSettings />}
          {section==="Workspace settings" && <WorkspaceSettings />}
        </div>
      </div>
    </Shell>
  );
}

function SagaSettings() {
  return (
    <>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--ink)",marginBottom:4}}>The Shattered Crown</div>
      <div style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--stone-500)",marginBottom:18}}>Saga settings</div>
      {[
        { label:"Saga name", desc:"The name of this saga.", input:<input className="settings-field" defaultValue="The Shattered Crown" /> },
        { label:"Status", desc:"Active sagas appear in the Loom and session tools.", input:<select className="settings-select"><option>Active</option><option>Dormant</option><option>Complete</option></select> },
        { label:"Session numbering", desc:"How sessions are numbered in this saga.", input:<select className="settings-select"><option>Sequential (1, 2, 3…)</option><option>Custom prefix</option></select> },
        { label:"AI features", desc:"Allow the Loom to suggest, draft, and propose changes for this saga.", input:<button className="toggle-knob on" /> },
      ].map(row=>(
        <div key={row.label} className="setting-row">
          <div className="setting-label-col"><div className="setting-label">{row.label}</div><div className="setting-desc">{row.desc}</div></div>
          <div>{row.input}</div>
        </div>
      ))}
      <div className="danger-zone">
        <div className="dz-title">Danger zone</div>
        {[{label:"Archive saga",desc:"Hides from active views. Recoverable.",btn:"Archive",cls:"btn-secondary"},{label:"Delete saga",desc:"Permanently deletes all sessions, entities, and threads. Cannot be undone.",btn:"Delete",cls:"btn-rust"}].map(row=>(
          <div key={row.label} className="setting-row" style={{borderTop:"1px solid rgba(138,56,40,0.15)",paddingTop:12,marginTop:0}}>
            <div className="setting-label-col"><div className="setting-label">{row.label}</div><div className="setting-desc">{row.desc}</div></div>
            <button className={"btn btn-sm "+row.cls}>{row.btn}</button>
          </div>
        ))}
      </div>
    </>
  );
}

function WorldSettings() {
  return (
    <>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--ink)",marginBottom:4}}>Eryndal</div>
      <div style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--stone-500)",marginBottom:18}}>World settings</div>
      {[
        { label:"World name", input:<input className="settings-field" defaultValue="Eryndal" /> },
        { label:"Game system", input:<select className="settings-select"><option>D&amp;D 5th Edition</option><option>Pathfinder 2e</option><option>Other / custom</option></select> },
        { label:"World description", input:<textarea className="settings-field" rows={3} defaultValue="A land of fractured kingdoms. The old empire collapsed two generations ago; what remains are competing city-states, guilds, and noble houses." /> },
      ].map(row=>(
        <div key={row.label} className="setting-row">
          <div className="setting-label-col"><div className="setting-label">{row.label}</div></div>
          <div style={{flex:1}}>{row.input}</div>
        </div>
      ))}
    </>
  );
}

function UsageSettings() {
  const bars = [
    { label:"AI credits (monthly)", used:84, max:100, val:"8,400 / 10,000", warn:true  },
    { label:"Entities",             used:64, max:500, val:"64 / 500",        warn:false },
    { label:"Sessions",             used:16, max:100, val:"16 / 100",        warn:false },
    { label:"Storage",              used:23, max:100, val:"230 MB / 1 GB",   warn:false },
    { label:"Transcript hours",     used:48, max:100, val:"4.8 / 10 hr",     warn:false },
  ];
  return (
    <>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--ink)",marginBottom:4}}>Usage</div>
      <div style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--stone-500)",marginBottom:4}}>Westmarch Guild workspace · Resets June 30, 2026</div>
      {bars.map((b,i)=>(
        <div key={i} className="usage-bar-row">
          <div className="usage-bar-label">{b.label}</div>
          <div className="usage-bar">
            <div className={"usage-bar-fill"+(b.warn?" warn":"")} style={{width:b.used+"%"}} />
          </div>
          <div className="usage-bar-val" style={{color:b.warn?"var(--rust)":"var(--stone-500)"}}>{b.val}</div>
        </div>
      ))}
      <div style={{marginTop:14,padding:"12px 14px",background:"var(--amber-dim)",border:"1px solid rgba(184,112,42,0.3)",borderRadius:"var(--r-md)"}}>
        <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--amber)",marginBottom:4}}>AI credits running low</div>
        <div style={{fontSize:12,color:"var(--stone-700)",lineHeight:1.5}}>You have used 84% of your monthly AI credits. The Loom will continue to work; drafting will be rate-limited above 90%. All features remain available manually.</div>
      </div>
    </>
  );
}

function RetentionSettings() {
  return (
    <>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--ink)",marginBottom:18}}>Retention</div>
      {[
        { label:"Session transcript retention", desc:"How long raw audio and transcripts are kept before deletion.", input:<select className="settings-select"><option>30 days</option><option>90 days</option><option>1 year</option><option>Forever</option></select> },
        { label:"Draft retention", desc:"How long unreviewed Loom drafts are kept before expiring.", input:<select className="settings-select"><option>7 days</option><option>14 days</option><option>30 days</option></select> },
        { label:"Export retention", desc:"How long generated export files are available for download.", input:<select className="settings-select"><option>24 hours</option><option>7 days</option><option>30 days</option></select> },
        { label:"Delete transcripts after review", desc:"Automatically delete raw audio once a session is fully reviewed.", input:<button className="toggle-knob on" /> },
      ].map(row=>(
        <div key={row.label} className="setting-row">
          <div className="setting-label-col"><div className="setting-label">{row.label}</div>{row.desc && <div className="setting-desc">{row.desc}</div>}</div>
          <div>{row.input}</div>
        </div>
      ))}
    </>
  );
}

function AccountSettings() {
  return (
    <>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--ink)",marginBottom:18}}>Account</div>
      {[
        { label:"Display name", input:<input className="settings-field" defaultValue="GM" /> },
        { label:"Email", input:<input className="settings-field" defaultValue="gm@westmarch.example" type="email" /> },
        { label:"Password", input:<button className="btn btn-secondary btn-sm">Change password</button> },
      ].map(row=>(
        <div key={row.label} className="setting-row">
          <div className="setting-label-col"><div className="setting-label">{row.label}</div></div>
          <div>{row.input}</div>
        </div>
      ))}
      <div style={{marginTop:14,padding:"12px 14px",border:"1px solid var(--border-1)",borderRadius:"var(--r-md)",background:"var(--bg-1)"}}>
        <div style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--stone-500)",marginBottom:7}}>Plan &amp; billing</div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:"var(--fg-1)"}}>Westmarch Guild · Pro</div>
            <div style={{fontSize:11,color:"var(--stone-500)",marginTop:2}}>Billed monthly · Manages 3 worlds, unlimited sessions</div>
          </div>
          <button className="btn btn-secondary btn-sm">Manage plan</button>
        </div>
      </div>
    </>
  );
}

function NotifSettings() {
  return (
    <>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--ink)",marginBottom:18}}>Notifications</div>
      {[
        { label:"Session review ready", desc:"When a session's pipeline completes and items are ready to review." },
        { label:"Draft expiry warning", desc:"48 hours before unreviewed drafts expire." },
        { label:"Stale thread reminder", desc:"When an active thread has had no movement in 3 sessions." },
        { label:"Export ready", desc:"When a requested export is ready to download." },
        { label:"Continuity conflict", desc:"When a new draft conflicts with existing canon." },
      ].map((row,i)=>(
        <div key={i} className="setting-row">
          <div className="setting-label-col"><div className="setting-label">{row.label}</div><div className="setting-desc">{row.desc}</div></div>
          <button className={"toggle-knob"+(i!==2?" on":"")} />
        </div>
      ))}
    </>
  );
}

function ExportPrefsSettings() {
  return (
    <>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--ink)",marginBottom:18}}>Export preferences</div>
      {[
        { label:"Default format", input:<select className="settings-select"><option>Markdown</option><option>JSON</option></select> },
        { label:"Include GM notes by default", desc:"GM-private notes are included in exports unless toggled off.", input:<button className="toggle-knob" /> },
        { label:"Include draft items by default", desc:"Unreviewed drafts are excluded by default.", input:<button className="toggle-knob" /> },
        { label:"Export file naming", input:<select className="settings-select"><option>Saga name + date</option><option>Custom prefix</option></select> },
      ].map(row=>(
        <div key={row.label} className="setting-row">
          <div className="setting-label-col"><div className="setting-label">{row.label}</div>{row.desc&&<div className="setting-desc">{row.desc}</div>}</div>
          <div>{row.input}</div>
        </div>
      ))}
    </>
  );
}

function WorkspaceSettings() {
  return (
    <>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--ink)",marginBottom:18}}>Westmarch Guild</div>
      {[
        { label:"Workspace name", input:<input className="settings-field" defaultValue="Westmarch Guild" /> },
        { label:"Slug / URL", input:<input className="settings-field" defaultValue="westmarch-guild" /> },
      ].map(row=>(
        <div key={row.label} className="setting-row">
          <div className="setting-label-col"><div className="setting-label">{row.label}</div></div>
          <div style={{flex:1}}>{row.input}</div>
        </div>
      ))}
    </>
  );
}

// ═══ SYSTEM STATES ════════════════════════════════════════════

interface SystemStatesViewProps {
  variant?: string;
}

export function SystemStatesView({ variant="empty-threads" }: SystemStatesViewProps) {
  const activeNav = variant.includes("home")?"home":variant.includes("thread")?"threads":variant.includes("library")?"library":variant.includes("review")?"review":"home";
  return (
    <Shell active={activeNav} pill="none" reviewCount={0} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">System states</div>
          <div className="page-title" style={{fontSize:32}}>{variant.replace(/-/g," ").replace(/\b\w/g,(c:string)=>c.toUpperCase())}</div>
        </div>
      </div>
      {variant==="offline" && (
        <div className="offline-banner">
          <I n="wifiOff" size={16} style={{color:"var(--stone-500)",flexShrink:0}} />
          <div className="offline-desc">You're offline. Changes will sync when your connection returns. The library is available to read.</div>
          <button className="btn btn-ghost btn-sm" style={{flexShrink:0}}><I n="refresh" size={11} /> Retry</button>
        </div>
      )}
      {variant==="quota-blocked" && (
        <div className="quota-banner">
          <I n="spark" size={16} style={{color:"var(--rust)",flexShrink:0,marginTop:2}} />
          <div>
            <div className="quota-title">AI credit limit reached</div>
            <div className="quota-desc">You've used all AI credits for this billing period. The Loom cannot generate new drafts until credits reset on June 30.</div>
            <div className="quota-fallback">You can still write and edit entities, threads, and sessions manually. All other features remain available.</div>
            <div style={{display:"flex",gap:7,marginTop:9}}>
              <button className="btn btn-secondary btn-sm">View usage</button>
              <button className="btn btn-ghost btn-sm">Manage plan</button>
            </div>
          </div>
        </div>
      )}
      {variant.startsWith("autosave") && (
        <div style={{position:"relative",minHeight:200}}>
          {variant==="autosave-saving" && <div className="autosave-indicator saving"><div className="loading-spinner" style={{width:12,height:12,borderWidth:1.5}} />Saving…</div>}
          {variant==="autosave-saved" && <div className="autosave-indicator saved"><I n="check" size={11} />Saved</div>}
          {variant==="autosave-ago" && <div className="autosave-indicator"><I n="check" size={11} />Saved 2s ago</div>}
          {variant==="autosave-queued" && <div className="autosave-indicator queued"><I n="wifiOff" size={11} />Offline — queued</div>}
          <div style={{fontFamily:"var(--font-display)",fontStyle:"italic",fontSize:16,color:"var(--stone-500)",padding:"60px 0",textAlign:"center"}}>Content area — autosave indicator appears bottom-right</div>
        </div>
      )}
      {variant==="loading" && (
        <div className="loading-state">
          <div className="loading-spinner" />
          <div className="loading-label">Loading entities…</div>
          <div style={{fontFamily:"var(--font-display)",fontStyle:"italic",fontSize:13,color:"var(--stone-500)",marginTop:4}}>Pulling the threads together.</div>
        </div>
      )}
      {variant==="empty-threads" && (
        <div className="empty-state">
          <div style={{fontSize:40,fontFamily:"var(--font-display)",color:"var(--stone-300)"}}>○</div>
          <div className="empty-title">No threads yet</div>
          <div className="empty-desc">Threads track the story arcs that run through your saga — active plots, loose consequences, dormant mysteries.</div>
          <button className="btn btn-ink"><I n="plus" size={13} /> New thread</button>
        </div>
      )}
      {variant==="empty-library" && (
        <div className="empty-state">
          <div style={{fontSize:40,fontFamily:"var(--font-display)",color:"var(--stone-300)"}}>✦</div>
          <div className="empty-title">The library is empty</div>
          <div className="empty-desc">Add your first character, place, or faction. The Loom can draft entities from a description.</div>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <button className="btn btn-ink"><I n="users" size={13} /> Add character</button>
            <button className="btn btn-secondary"><I n="spark" size={13} style={{color:"var(--amber)"}} /> Draft from prompt</button>
          </div>
        </div>
      )}
      {variant==="empty-review" && (
        <div className="empty-state">
          <div style={{fontSize:40,fontFamily:"var(--font-display)",color:"var(--stone-300)"}}>✓</div>
          <div className="empty-title">Queue is clear</div>
          <div className="empty-desc">All items have been reviewed. Your canon is up to date.</div>
        </div>
      )}
      {variant==="destructive-warning" && (
        <div style={{maxWidth:500}}>
          <div style={{padding:"20px 22px",background:"var(--rust-dim)",border:"1px solid rgba(138,56,40,0.28)",borderRadius:"var(--r-lg)"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--rust)",marginBottom:9,display:"flex",alignItems:"center",gap:7}}>
              <I n="alert" size={13} />Destructive action
            </div>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,color:"var(--ink)",marginBottom:8}}>Delete The Shattered Crown?</div>
            <div style={{fontSize:13,color:"var(--stone-700)",lineHeight:1.6,marginBottom:14}}>This will permanently delete all 16 sessions, 64 entities, 5 threads, and all related data. This cannot be undone.</div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-rust">Delete saga</button>
              <button className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
