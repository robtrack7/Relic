import React, { useState } from 'react';
import { AppProvider, useApp, RelicState } from './components/relic/AppContext';

// Shell demos
import { ShellStateDemo } from './components/relic/Shell';

// Home screens
import { HomeEmpty, HomeNoSession, HomePlanned, HomeReady, HomeActive, HomeReviewReady } from './components/relic/Home';

// Threads
import { ThreadsView } from './components/relic/Threads';

// Library
import { LibraryOverview, EntityDetail, LibraryNewEntity } from './components/relic/Library';

// Prepare
import { PrepareView } from './components/relic/Prepare';

// Sessions
import { SessionsIndex, SessionDetail, SessionPipeline } from './components/relic/Sessions';

// Stage
import { StageView } from './components/relic/Stage';

// Review
import { ReviewView } from './components/relic/Review';

// Export + Settings + System States
import { ExportView, SettingsView, SystemStatesView } from './components/relic/ExportSettings';

// Overview
import { SitemapView, FlowMapView } from './components/relic/Overview';

// ─── Admin screen registry ────────────────────────────────────

interface AdminScreen {
  group: string;
  id: string;
  label: string;
  patch: Partial<RelicState>;
}

const ADMIN_SCREENS: AdminScreen[] = [
  // ── Overview ─────────────────────────────────────────────────
  { group:"Overview", id:"sitemap",     label:"Screen inventory",           patch:{ view:"_sitemap" } },
  { group:"Overview", id:"flow",        label:"User flow map",              patch:{ view:"_flow" } },

  // ── Shell states ─────────────────────────────────────────────
  { group:"Shell",    id:"sh-default",  label:"Default shell",              patch:{ view:"_sh-default",  sessionState:"none"     } },
  { group:"Shell",    id:"sh-rail",     label:"Collapsed rail nav",         patch:{ view:"_sh-rail",     sessionState:"prepping" } },
  { group:"Shell",    id:"sh-loomcol",  label:"Loom collapsed",             patch:{ view:"_sh-loomcol",  sessionState:"active"   } },
  { group:"Shell",    id:"sh-usage",    label:"Usage warning",              patch:{ view:"_sh-usage",    sessionState:"active"   } },
  { group:"Shell",    id:"sh-search",   label:"Search palette open",        patch:{ view:"_sh-search"                            } },
  { group:"Shell",    id:"sh-create",   label:"Create menu open",           patch:{ view:"_sh-create"                            } },
  { group:"Shell",    id:"sh-switcher", label:"Switcher open",              patch:{ view:"_sh-switcher"                          } },

  // ── Home ─────────────────────────────────────────────────────
  { group:"Home",     id:"h-empty",     label:"Empty saga",                 patch:{ view:"home", sessionState:"empty"    } },
  { group:"Home",     id:"h-nosess",    label:"No session planned",         patch:{ view:"home", sessionState:"none"     } },
  { group:"Home",     id:"h-planned",   label:"Session planned · Prepping", patch:{ view:"home", sessionState:"prepping" } },
  { group:"Home",     id:"h-ready",     label:"Ready for Stage",            patch:{ view:"home", sessionState:"ready",   prepReady:true  } },
  { group:"Home",     id:"h-active",    label:"Session active",             patch:{ view:"home", sessionState:"active",  prepLocked:true } },
  { group:"Home",     id:"h-review",    label:"Review ready",               patch:{ view:"home", sessionState:"review"   } },

  // ── Threads ──────────────────────────────────────────────────
  { group:"Threads",  id:"t-list",      label:"Thread list + detail",       patch:{ view:"threads", selectedThreadId:1 } },
  { group:"Threads",  id:"t-loose",     label:"Loose thread selected",      patch:{ view:"threads", selectedThreadId:2 } },
  { group:"Threads",  id:"t-resolved",  label:"Resolved thread selected",   patch:{ view:"threads", selectedThreadId:5 } },
  { group:"Threads",  id:"t-empty",     label:"Empty threads",              patch:{ view:"_threads-empty" } },

  // ── Library ──────────────────────────────────────────────────
  { group:"Library",  id:"l-all",       label:"Library overview — all",     patch:{ view:"library", libraryFilter:"all",      libraryView:"grid"           } },
  { group:"Library",  id:"l-npc",       label:"Filtered: Characters",       patch:{ view:"library", libraryFilter:"npc",      libraryView:"grid"           } },
  { group:"Library",  id:"l-archived",  label:"Archived entities",          patch:{ view:"library", libraryFilter:"archived", libraryView:"grid"           } },
  { group:"Library",  id:"l-empty",     label:"Empty library",              patch:{ view:"_library-empty" } },
  { group:"Library",  id:"l-detail",    label:"Entity detail — view",       patch:{ view:"library", libraryView:"detail", libraryEntityEdit:false } },
  { group:"Library",  id:"l-edit",      label:"Entity detail — edit",       patch:{ view:"library", libraryView:"detail", libraryEntityEdit:true  } },
  { group:"Library",  id:"l-dup",       label:"Duplicate warning",          patch:{ view:"_library-dup" } },
  { group:"Library",  id:"l-arch-det",  label:"Archived entity detail",     patch:{ view:"_library-archived" } },
  { group:"Library",  id:"l-new",       label:"New entity flow",            patch:{ view:"library", libraryView:"new"         } },
  { group:"Library",  id:"l-prompt",    label:"Draft from prompt",          patch:{ view:"library", libraryView:"newFromPrompt" } },

  // ── Prepare ──────────────────────────────────────────────────
  { group:"Prepare",  id:"p-prep",      label:"Prep workspace",             patch:{ view:"prepare", sessionState:"prepping", prepReady:false, prepLocked:false } },
  { group:"Prepare",  id:"p-ready",     label:"Prep ready state",           patch:{ view:"prepare", sessionState:"ready",    prepReady:true,  prepLocked:false } },
  { group:"Prepare",  id:"p-locked",    label:"Prep locked — live",         patch:{ view:"prepare", sessionState:"active",   prepLocked:true  } },

  // ── Sessions ─────────────────────────────────────────────────
  { group:"Sessions", id:"s-index",     label:"Session index",              patch:{ view:"sessions", sessionsView:"index"    } },
  { group:"Sessions", id:"s-detail",    label:"Session detail — reviewed",  patch:{ view:"sessions", sessionsView:"detail"   } },
  { group:"Sessions", id:"s-pipeline",  label:"Pipeline — processing",      patch:{ view:"sessions", sessionsView:"pipeline", pipelineState:"processing", sessionState:"review" } },
  { group:"Sessions", id:"s-complete",  label:"Pipeline — complete",        patch:{ view:"sessions", sessionsView:"pipeline", pipelineState:"complete",   sessionState:"review" } },
  { group:"Sessions", id:"s-failed",    label:"Pipeline — failed",          patch:{ view:"sessions", sessionsView:"pipeline", pipelineState:"failed",     sessionState:"review" } },

  // ── Stage ────────────────────────────────────────────────────
  { group:"Stage",    id:"stg-ready",   label:"Stage — ready",              patch:{ view:"stage", stageVariant:"ready",  sessionState:"ready",  stageEndConfirm:false } },
  { group:"Stage",    id:"stg-active",  label:"Stage — active",             patch:{ view:"stage", stageVariant:"active", sessionState:"active", stageEndConfirm:false } },
  { group:"Stage",    id:"stg-end",     label:"End session confirm",        patch:{ view:"stage", stageVariant:"active", sessionState:"active", stageEndConfirm:true  } },
  { group:"Stage",    id:"stg-undo",    label:"60-second undo",             patch:{ view:"stage", stageVariant:"active", sessionState:"review", stageShowUndo:true    } },

  // ── Review ───────────────────────────────────────────────────
  { group:"Review",   id:"rv-queue",    label:"Review queue",               patch:{ view:"review", selectedReviewIdx:0 } },
  { group:"Review",   id:"rv-conflict", label:"With conflict panel",        patch:{ view:"review", selectedReviewIdx:1 } },
  { group:"Review",   id:"rv-lowconf",  label:"Low confidence draft",       patch:{ view:"review", selectedReviewIdx:5 } },
  { group:"Review",   id:"rv-empty",    label:"Empty queue",                patch:{ view:"_review-empty" } },

  // ── Export ───────────────────────────────────────────────────
  { group:"Export",   id:"ex-form",     label:"Export form",                patch:{ view:"export", exportState:"form"       } },
  { group:"Export",   id:"ex-proc",     label:"Processing",                 patch:{ view:"export", exportState:"processing" } },
  { group:"Export",   id:"ex-ready",    label:"Ready to download",          patch:{ view:"export", exportState:"ready"      } },
  { group:"Export",   id:"ex-expired",  label:"Expired",                    patch:{ view:"export", exportState:"expired"    } },
  { group:"Export",   id:"ex-failed",   label:"Failed",                     patch:{ view:"export", exportState:"failed"     } },

  // ── Settings ─────────────────────────────────────────────────
  { group:"Settings", id:"set-saga",    label:"Saga settings",              patch:{ view:"settings", settingsSection:"Saga settings"      } },
  { group:"Settings", id:"set-world",   label:"World settings",             patch:{ view:"settings", settingsSection:"World settings"     } },
  { group:"Settings", id:"set-ws",      label:"Workspace settings",         patch:{ view:"settings", settingsSection:"Workspace settings" } },
  { group:"Settings", id:"set-usage",   label:"Usage",                      patch:{ view:"settings", settingsSection:"Usage"              } },
  { group:"Settings", id:"set-ret",     label:"Retention",                  patch:{ view:"settings", settingsSection:"Retention"          } },
  { group:"Settings", id:"set-notif",   label:"Notifications",              patch:{ view:"settings", settingsSection:"Notifications"      } },
  { group:"Settings", id:"set-exp",     label:"Export preferences",         patch:{ view:"settings", settingsSection:"Export preferences" } },
  { group:"Settings", id:"set-acct",    label:"Account",                    patch:{ view:"settings", settingsSection:"Account"            } },

  // ── System states ────────────────────────────────────────────
  { group:"States",   id:"st-load",     label:"Loading",                    patch:{ view:"_st-load"    } },
  { group:"States",   id:"st-offline",  label:"Offline / network failed",   patch:{ view:"_st-offline" } },
  { group:"States",   id:"st-quota",    label:"Quota blocked",              patch:{ view:"_st-quota"   } },
  { group:"States",   id:"st-saving",   label:"Autosave — Saving",          patch:{ view:"_st-saving"  } },
  { group:"States",   id:"st-saved",    label:"Autosave — Saved",           patch:{ view:"_st-saved"   } },
  { group:"States",   id:"st-queued",   label:"Autosave — Offline queued",  patch:{ view:"_st-queued"  } },
  { group:"States",   id:"st-emp-th",   label:"Empty — Threads",            patch:{ view:"_st-emp-th"  } },
  { group:"States",   id:"st-emp-lib",  label:"Empty — Library",            patch:{ view:"_st-emp-lib" } },
  { group:"States",   id:"st-emp-rv",   label:"Empty — Review queue",       patch:{ view:"_st-emp-rv"  } },
  { group:"States",   id:"st-danger",   label:"Destructive warning",        patch:{ view:"_st-danger"  } },
];

const ADMIN_GROUPS = [...new Set(ADMIN_SCREENS.map(s => s.group))];
const STORAGE_KEY = "relic-wf-screen";

// ─── View renderer ────────────────────────────────────────────

function renderView(s: RelicState): React.ReactNode {
  switch (s.view) {
    case "home":
      if (s.sessionState === "empty")    return <HomeEmpty />;
      if (s.sessionState === "prepping") return <HomePlanned />;
      if (s.sessionState === "ready")    return <HomeReady />;
      if (s.sessionState === "active")   return <HomeActive />;
      if (s.sessionState === "review")   return <HomeReviewReady />;
      return <HomeNoSession />;

    case "threads":
      return <ThreadsView detail={true} selected={s.selectedThreadId} />;
    case "_threads-empty":
      return <ThreadsView detail={false} emptyState={true} />;

    case "library":
      if (s.libraryView === "detail")       return <EntityDetail edit={s.libraryEntityEdit} />;
      if (s.libraryView === "new")          return <LibraryNewEntity />;
      if (s.libraryView === "newFromPrompt") return <LibraryNewEntity fromPrompt={true} />;
      return <LibraryOverview filter={s.libraryFilter} />;
    case "_library-empty":    return <LibraryOverview filter="all" empty={true} />;
    case "_library-dup":      return <EntityDetail dup={true} />;
    case "_library-archived": return <EntityDetail archived={true} />;

    case "prepare":
      return <PrepareView ready={s.prepReady} locked={s.prepLocked} />;

    case "sessions":
      if (s.sessionsView === "pipeline") return <SessionPipeline pipelineState={s.pipelineState} />;
      if (s.sessionsView === "detail")   return <SessionDetail />;
      return <SessionsIndex />;

    case "stage":
      return <StageView variant={s.stageVariant} endConfirm={s.stageEndConfirm} showUndo={s.stageShowUndo} />;

    case "review":
      return <ReviewView selected={s.selectedReviewIdx} />;
    case "_review-empty":
      return <ReviewView emptyState={true} />;

    case "export":
      return <ExportView exportState={s.exportState} />;

    case "settings":
      return <SettingsView section={s.settingsSection} />;

    // Shell demos
    case "_sh-default":  return <ShellStateDemo variant="shell-default" />;
    case "_sh-rail":     return <ShellStateDemo variant="shell-rail" />;
    case "_sh-loomcol":  return <ShellStateDemo variant="shell-loom-closed" />;
    case "_sh-usage":    return <ShellStateDemo variant="shell-usage-warn" />;
    case "_sh-search":   return <ShellStateDemo variant="shell-search" />;
    case "_sh-create":   return <ShellStateDemo variant="shell-create" />;
    case "_sh-switcher": return <ShellStateDemo variant="shell-switcher" />;

    // System states
    case "_st-load":    return <SystemStatesView variant="loading" />;
    case "_st-offline": return <SystemStatesView variant="offline" />;
    case "_st-quota":   return <SystemStatesView variant="quota-blocked" />;
    case "_st-saving":  return <SystemStatesView variant="autosave-saving" />;
    case "_st-saved":   return <SystemStatesView variant="autosave-saved" />;
    case "_st-queued":  return <SystemStatesView variant="autosave-queued" />;
    case "_st-emp-th":  return <SystemStatesView variant="empty-threads" />;
    case "_st-emp-lib": return <SystemStatesView variant="empty-library" />;
    case "_st-emp-rv":  return <SystemStatesView variant="empty-review" />;
    case "_st-danger":  return <SystemStatesView variant="destructive-warning" />;

    // Overview
    case "_sitemap": return <SitemapView />;
    case "_flow":    return <FlowMapView />;

    default:
      return <HomeNoSession />;
  }
}

// ─── App content (inside provider) ───────────────────────────

function AppContent() {
  const app = useApp()!;
  const [adminOpen, setAdminOpen] = useState(true);
  const [search, setSearch] = useState("");

  const activeScreen = ADMIN_SCREENS.find(s => {
    const p = s.patch;
    if (p.view !== app.state.view) return false;
    if (p.sessionsView && p.sessionsView !== app.state.sessionsView) return false;
    if (p.libraryView && p.libraryView !== app.state.libraryView) return false;
    return true;
  });

  const filtered = search.trim()
    ? ADMIN_SCREENS.filter(s =>
        s.label.toLowerCase().includes(search.toLowerCase()) ||
        s.group.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  function viewLabel(): string {
    if (activeScreen) return activeScreen.label;
    if (app.state.view === "home") {
      const map: Record<string, string> = { empty:"Empty saga", none:"No session planned", prepping:"Session planned", ready:"Ready for Stage", active:"Session active", review:"Review ready" };
      return map[app.state.sessionState] ?? "Home";
    }
    return app.state.view;
  }

  function viewGroup(): string {
    if (activeScreen) return activeScreen.group;
    if (app.state.view === "home") return "Home";
    return app.state.view.replace(/^_/, "").replace(/-/g, " ");
  }

  return (
    <div className="wf-root">
      {/* Admin picker sidebar */}
      <div
        className="wf-picker"
        style={{ width: adminOpen ? 216 : 0, overflow: "hidden", transition: "width 0.15s ease", flexShrink: 0 }}
      >
        <div className="wf-picker-head" style={{ minWidth: 216 }}>
          <span className="wf-logo">✦</span>
          <div style={{ flex: 1 }}>
            <div style={{color:"#ffffff8c",fontSize:12,fontFamily:"var(--font-ui)",fontWeight:500,lineHeight:1}}>Relic</div>
            <div className="wf-picker-title">Admin · v0.4</div>
          </div>
          <button
            onClick={() => setAdminOpen(false)}
            style={{color:"#ffffff40",fontSize:16,lineHeight:1,background:"none",border:"none",cursor:"pointer",padding:"0 4px",flexShrink:0}}
            title="Close admin bar"
          >×</button>
        </div>

        {/* Search */}
        <div style={{padding:"8px 10px",borderBottom:"1px solid #ffffff0f",minWidth:216}}>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 9px",background:"#ffffff0d",borderRadius:"6px",border:"1px solid #ffffff12"}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff4d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.4-3.4"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter screens…"
              style={{border:"none",background:"transparent",outline:"none",fontSize:11,color:"#ffffff80",fontFamily:"var(--font-ui)",flex:1}}
            />
            {search && <button onClick={()=>setSearch("")} style={{color:"#ffffff40",fontSize:14,lineHeight:1,background:"none",border:"none",cursor:"pointer",padding:0}}>×</button>}
          </div>
        </div>

        {/* Screen list */}
        <div style={{flex:1,overflowY:"auto",minWidth:216}}>
          {filtered ? (
            <div>
              <div className="wf-group-label">Results ({filtered.length})</div>
              {filtered.map(s=>(
                <div key={s.id} className={"wf-item"+(activeScreen?.id===s.id?" active":"")} onClick={()=>app.applyAdminState(s.patch)}>
                  <span style={{color:"#ffffff38",fontSize:10,marginRight:3}}>{s.group} ·</span>{s.label}
                </div>
              ))}
            </div>
          ) : (
            ADMIN_GROUPS.map(group=>(
              <div key={group} className="wf-group">
                <div className="wf-group-label">{group}</div>
                {ADMIN_SCREENS.filter(s=>s.group===group).map(s=>(
                  <div key={s.id} className={"wf-item"+(activeScreen?.id===s.id?" active":"")} onClick={()=>app.applyAdminState(s.patch)}>
                    {s.label}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="wf-footer" style={{minWidth:216}}>{ADMIN_SCREENS.length} screens · MVP scope</div>
      </div>

      {/* App render area */}
      <div className="wf-app-area" style={{background:"var(--bg-1)"}}>
        {/* Breadcrumb bar */}
        <div style={{height:32,flexShrink:0,background:"#1a1916e6",display:"flex",alignItems:"center",gap:9,padding:"0 16px",borderBottom:"1px solid #ffffff0f"}}>
          {!adminOpen && (
            <button
              onClick={() => setAdminOpen(true)}
              style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.12em",textTransform:"uppercase",color:"#ffffff4d",background:"#ffffff0d",border:"1px solid #ffffff12",borderRadius:4,padding:"3px 8px",cursor:"pointer",marginRight:4,whiteSpace:"nowrap"}}
            >
              ✦ Admin
            </button>
          )}
          <span style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.14em",textTransform:"uppercase",color:"#ffffff38"}}>Relic</span>
          <span style={{color:"#ffffff1a"}}>→</span>
          <span style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.12em",textTransform:"uppercase",color:"#ffffff59"}}>{viewGroup()}</span>
          <span style={{color:"#ffffff1a"}}>→</span>
          <span style={{fontFamily:"var(--font-mono)",fontSize:8,letterSpacing:"0.12em",textTransform:"uppercase",color:"#ffffff8c"}}>{viewLabel()}</span>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontFamily:"var(--font-mono)",fontSize:7,letterSpacing:"0.1em",color:"#ffffff2e",textTransform:"uppercase"}}>Click nav items · CTAs · thread/entity rows to navigate</span>
          </div>
        </div>

        {/* Active screen */}
        <div style={{flex:1,overflow:"hidden",position:"relative"}}>
          {renderView(app.state)}
        </div>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
