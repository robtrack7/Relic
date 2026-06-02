import React, { useState, useRef, useEffect } from "react";
import { I, Seal, Avatar, Dot, Chip } from "./Primitives";
import { useApp } from "./AppContext";

// ─── Nav config ───────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "home", icon: "home", label: "Home" },
  { id: "threads", icon: "threads", label: "Threads" },
  { id: "library", icon: "library", label: "Library" },
  { id: "prepare", icon: "prepare", label: "Prepare" },
  { id: "sessions", icon: "sessions", label: "Sessions" },
  { id: "review", icon: "review", label: "Review", count: 7 },
];

const NAV_BOTTOM = [
  { id: "export", icon: "export", label: "Export" },
  { id: "settings", icon: "settings", label: "Settings" },
];

// ─── Helpers ──────────────────────────────────────────────────

function derivePill(sessionState: string): string {
  switch (sessionState) {
    case "prepping": return "prepping";
    case "ready":    return "ready";
    case "active":   return "active";
    case "review":   return "review";
    default:         return "none";
  }
}

function deriveReviewCount(sessionState: string): number {
  if (sessionState === "review") return 14;
  if (sessionState !== "none" && sessionState !== "empty") return 7;
  return 0;
}

function getActiveNav(view: string): string {
  if (view === "stage") return "sessions";
  if (view.startsWith("_threads")) return "threads";
  if (view.startsWith("_library")) return "library";
  if (view.startsWith("_review")) return "review";
  if (view.startsWith("_")) return "";
  return view;
}

// ─── Notifications dropdown ───────────────────────────────────

const NOTIF_ITEMS = [
  { title: "The Dockmaster", type: "New NPC", conf: "high", sess: "Session 16" },
  { title: "Mira Ashborne — status update", type: "NPC update", conf: "med", sess: "Session 16" },
  { title: "Fenwick Harbor — consequence", type: "Location update", conf: "high", sess: "Session 16" },
  { title: "The Forged Succession advance", type: "Thread update", conf: "med", sess: "Session 16" },
  { title: "Recap: Session 16", type: "Session recap", conf: "med", sess: "Session 16" },
  { title: "Aldric Fenmore", type: "New NPC", conf: "low", sess: "Session 15" },
  { title: "Lord Esten — deceased", type: "Status change", conf: "high", sess: "Session 15" },
];

function confColor(c: string) {
  return c === "high" ? "var(--verdigris)" : c === "med" ? "var(--amber)" : "var(--rust)";
}
function confBg(c: string) {
  return c === "high" ? "var(--verdigris-dim)" : c === "med" ? "var(--amber-dim)" : "var(--rust-dim)";
}

function NotificationsDropdown({ reviewCount, onClose }: { reviewCount: number; onClose: () => void }) {
  const app = useApp();
  const items = NOTIF_ITEMS.slice(0, reviewCount);
  const shown = items.slice(0, 5);
  const extra = items.length - shown.length;
  return (
    <div style={{ position: "absolute", top: "calc(100% + 7px)", right: 0, width: 308, background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-elevated)", zIndex: 300, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--border-2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stone-500)" }}>Pending review</div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--rust)" }}>{reviewCount} items</span>
      </div>
      {shown.map((item, i) => (
        <div key={i} style={{ padding: "8px 14px", borderTop: i > 0 ? "1px solid var(--border-2)" : "none", display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: confColor(item.conf), flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--fg-1)", lineHeight: 1.3 }}>{item.title}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.06em", color: "var(--stone-500)", marginTop: 1, textTransform: "uppercase" }}>{item.type} · {item.sess}</div>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, padding: "2px 5px", borderRadius: "var(--r-sm)", flexShrink: 0, background: confBg(item.conf), color: confColor(item.conf) }}>{item.conf}</span>
        </div>
      ))}
      {extra > 0 && (
        <div style={{ padding: "6px 14px", borderTop: "1px solid var(--border-2)", fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--stone-500)", textAlign: "center" }}>+{extra} more items</div>
      )}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border-2)" }}>
        <button className="btn btn-ink btn-sm" style={{ width: "100%", justifyContent: "center", gap: 7 }} onClick={() => { app?.navigate("review"); onClose(); }}>
          <I n="review" size={12} /> Open review queue
        </button>
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────

interface TopBarProps {
  active?: string;
  collapsed?: boolean;
  onToggleNav?: () => void;
  pill?: string;
  reviewCount?: number;
  showUsage?: boolean;
  usageWarn?: boolean;
  onSearch?: () => void;
  onSwitcher?: (which: string, anchor: DOMRect) => void;
  onPillClick?: () => void;
}

const PILL_LABELS: Record<string, { label: string; cls: string; dot?: boolean; pulse?: boolean }> = {
  none:      { label: "No active session",         cls: "none" },
  prepping:  { label: "Session 16 · Prepping",     cls: "prepping", dot: true },
  ready:     { label: "Session 16 · Ready",        cls: "ready",    dot: true },
  active:    { label: "Session 16 · Active",       cls: "active",   dot: true, pulse: true },
  review:    { label: "Session 15 · Review ready", cls: "review",   dot: true },
};

function TopBar({ active = "home", collapsed, onToggleNav, pill = "none", reviewCount = 0, showUsage = false, usageWarn = false, onSearch, onSwitcher, onPillClick }: TopBarProps) {
  const p = PILL_LABELS[pill] || PILL_LABELS.none;
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span className="brand brand-full">Reli<span className="mark">c</span></span>
        <span className="brand-r">c</span>
        <button className="nav-toggle" onClick={onToggleNav}>
          <I n={collapsed ? "chevRight" : "chevLeft"} size={14} />
        </button>
      </div>

      <div className="switchers">
        <div className="switcher">
          <div className="switcher-label">Workspace</div>
          <button className="switcher-btn" onClick={e => onSwitcher?.("workspace", (e.currentTarget as HTMLButtonElement).getBoundingClientRect())}>
            <span className="sw-ico"><I n="grid" size={12} /></span>
            <span className="switcher-name">Westmarch Guild</span>
            <span className="sw-chev"><I n="chevDown" size={11} /></span>
          </button>
        </div>
        <span className="sw-sep">/</span>
        <div className="switcher">
          <div className="switcher-label">World</div>
          <button className="switcher-btn" onClick={e => onSwitcher?.("world", (e.currentTarget as HTMLButtonElement).getBoundingClientRect())}>
            <span className="sw-ico wld"><I n="map" size={12} /></span>
            <span className="switcher-name">Eryndal</span>
            <span className="sw-chev"><I n="chevDown" size={11} /></span>
          </button>
        </div>
        <span className="sw-sep">/</span>
        <div className="switcher">
          <div className="switcher-label">Saga</div>
          <button className="switcher-btn" onClick={e => onSwitcher?.("saga", (e.currentTarget as HTMLButtonElement).getBoundingClientRect())}>
            <span className="sw-ico"><I n="feather" size={12} /></span>
            <span className="switcher-name">The Shattered Crown</span>
            <span className="sw-chev"><I n="chevDown" size={11} /></span>
          </button>
        </div>
      </div>

      <div className="topbar-right">
        <button className="search-btn" onClick={onSearch} style={{ justifyContent: "flex-start", alignItems: "center", padding: "5px 10px" }}>
          <I n="search" size={14} />
          Search everything
          <span className="kbd-hint">⌘K</span>
        </button>

        {pill !== "none" && (
          <button className={"sess-pill " + p.cls} onClick={onPillClick} style={{ cursor: "pointer" }}>
            {p.dot && <Dot kind={p.pulse ? "live pulse" : p.cls === "review" ? "loose" : "amber"} />}
            {p.label}
          </button>
        )}

        <div style={{ position: "relative" }} ref={notifRef}>
          <button className="icon-btn" onClick={() => setNotifOpen(o => !o)} style={notifOpen ? { background: "var(--bg-3)", color: "var(--ink)" } : {}}>
            <I n="bell" size={16} />
            {reviewCount > 0 && <span className="bdg">{reviewCount}</span>}
          </button>
          {notifOpen && reviewCount > 0 && <NotificationsDropdown reviewCount={reviewCount} onClose={() => setNotifOpen(false)} />}
        </div>

        {showUsage && (
          <div className={"usage-chip" + (usageWarn ? " warn" : "")}>
            <I n={usageWarn ? "alert" : "spark"} size={11} />
            {usageWarn ? "84% used" : "AI credits"}
          </div>
        )}

        <button className="topbar-profile">
          <Avatar name="GM" size={26} />
          <span style={{ fontSize: 12, color: "var(--fg-2)" }}>GM</span>
          <I n="chevDown" size={11} style={{ color: "var(--stone-500)" }} />
        </button>
      </div>
    </div>
  );
}

// ─── Create dropdown ──────────────────────────────────────────

const CREATE_ITEMS: Array<{ icon: string; label: string; accent?: boolean } | null> = [
  { icon: "users", label: "Character (NPC)" },
  { icon: "map", label: "Place or location" },
  { icon: "anchor", label: "Faction" },
  { icon: "star", label: "Artifact" },
  { icon: "notes", label: "Lore note" },
  null,
  { icon: "threads", label: "New thread" },
  { icon: "sessions", label: "Plan session" },
  null,
  { icon: "spark", label: "Draft from prompt…", accent: true },
];

function CreateDropdown({ onClose, collapsed, anchor }: { onClose: () => void; collapsed?: boolean; anchor?: DOMRect | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const app = useApp();
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function handleItemClick(item: { icon: string; label: string; accent?: boolean }) {
    if (item.label === "Plan session") { app?.navigate("prepare", { sessionState: "prepping" }); }
    else if (item.label === "New thread") { app?.navigate("threads"); }
    else if (item.label === "Draft from prompt…") { app?.navigate("library", { libraryView: "newFromPrompt" }); }
    else if (item.icon === "users" || item.icon === "map" || item.icon === "anchor" || item.icon === "star" || item.icon === "notes") {
      app?.navigate("library", { libraryView: "new" });
    }
    onClose();
  }

  return (
    <div ref={ref} className="create-menu" style={collapsed
      ? { position: "fixed", top: anchor ? anchor.bottom + 4 : 64, left: anchor ? anchor.right + 4 : 60, zIndex: 300, margin: 0 }
      : { position: "fixed", top: anchor ? anchor.bottom - 3 : 64, left: anchor ? anchor.left : 8, zIndex: 300, margin: 0, width: anchor ? anchor.width : undefined, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: "none" }
    } onClick={e => e.stopPropagation()}>
      {CREATE_ITEMS.map((item, i) =>
        item ? (
          <div key={i} className="cm-item" onClick={() => handleItemClick(item)}>
            <span className="cm-ico" style={item.accent ? { color: "var(--amber)" } : {}}>
              <I n={item.icon} size={14} />
            </span>
            <span style={item.accent ? { color: "var(--amber)", fontWeight: 500 } : {}}>{item.label}</span>
          </div>
        ) : (
          <div key={i} className="cm-sep" />
        )
      )}
    </div>
  );
}

// ─── SideNav ──────────────────────────────────────────────────

interface SideNavProps {
  active?: string;
  collapsed?: boolean;
  initialCreateOpen?: boolean;
}

function SideNav({ active = "home", collapsed, initialCreateOpen = false }: SideNavProps) {
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [createAnchor, setCreateAnchor] = useState<DOMRect | null>(null);
  const createBtnRef = useRef<HTMLElement>(null);
  const app = useApp();

  function openCreate() {
    if (createBtnRef.current) setCreateAnchor(createBtnRef.current.getBoundingClientRect());
    setCreateOpen(o => !o);
  }

  return (
    <nav className="sidenav">
      {!collapsed && <div className="sidenav-label">Navigation</div>}
      {NAV_ITEMS.map(item => (
        <div
          key={item.id}
          className={"nav-item" + (active === item.id ? " is-active" : "")}
          onClick={() => app?.navigate(item.id)}
          style={{ cursor: "pointer" }}
        >
          <span className="nav-ico"><I n={item.icon} size={16} /></span>
          {!collapsed && <span className="nav-text">{item.label}</span>}
          {!collapsed && item.count && item.count > 0 && <span className="nav-count">{item.count}</span>}
        </div>
      ))}
      {!collapsed ? (
        <div style={{ margin: "10px 8px 4px" }}>
          <button ref={createBtnRef as React.RefObject<HTMLButtonElement>} className="btn btn-ink" style={{ fontSize: 12, gap: 7, justifyContent: "flex-start", padding: "8px 12px", width: "100%" }} onClick={openCreate}>
            <I n="plus" size={14} /> Create
          </button>
          {createOpen && createAnchor && <CreateDropdown onClose={() => setCreateOpen(false)} anchor={createAnchor} />}
        </div>
      ) : (
        <div>
          <div ref={createBtnRef as React.RefObject<HTMLDivElement>} className="nav-item" style={{ justifyContent: "center", backgroundColor: "rgb(56,52,46)", color: "rgb(228,221,212)" }} onClick={openCreate}>
            <I n="plus" size={16} />
          </div>
          {createOpen && createAnchor && <CreateDropdown onClose={() => setCreateOpen(false)} anchor={createAnchor} collapsed />}
        </div>
      )}
      <div className="nav-sep" />
      {NAV_BOTTOM.map((item, i) => (
        <div
          key={item.id}
          className={"nav-item" + (active === item.id ? " is-active" : "")}
          onClick={() => app?.navigate(item.id)}
          style={{ cursor: "pointer", ...(i === 0 ? { marginTop: "auto" } : {}) }}
        >
          <span className="nav-ico"><I n={item.icon} size={16} /></span>
          {!collapsed && <span className="nav-text">{item.label}</span>}
        </div>
      ))}
    </nav>
  );
}

// ─── Loom carriage ────────────────────────────────────────────

function LoomAskContent() {
  return (
    <>
      <div>
        <div className="loom-msg-role">Loom</div>
        <div className="loom-msg-text">The Shattered Crown has 3 active threads and 7 items pending your review. Session 16 has no prep yet.</div>
      </div>
      <div>
        <div className="loom-msg-role">Loom · Suggestion</div>
        <div className="loom-msg-text">Castellan Veyra was last seen in Session 14. Her thread — <em>The Forged Succession</em> — has been loose since the ambush. Worth revisiting before Session 16.</div>
        <div className="loom-citation"><I n="anchor" size={9} /> Session 14 · transcript</div>
      </div>
      <div className="loom-draft-card">
        <div className="loom-draft-label"><I n="spark" size={10} /> Draft · NPC</div>
        <div className="loom-draft-text" style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 13 }}>Aldric Fenmore, Keeper of the Exchequer. Knows about the forged deed. Speaks in careful half-truths and carries a ledger he won't let anyone read.</div>
        <div className="loom-draft-actions">
          <button className="btn btn-amber btn-sm">Approve</button>
          <button className="btn btn-secondary btn-sm">Edit</button>
          <button className="btn btn-ghost btn-sm">Discard</button>
        </div>
      </div>
    </>
  );
}

function LoomPrepContent() {
  return (
    <>
      <div>
        <div className="loom-msg-role">Loom · Prep mode</div>
        <div className="loom-msg-text">2 continuity risks for Session 16: Mira's thread predicts a confrontation at the docks, but the Dockmaster NPC has no notes on current allegiance.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {["Add Dockmaster allegiance note", "Draft opening scene at the harbor", "Suggest NPCs to pin"].map((s, i) => (
          <button key={i} className="btn btn-secondary btn-sm" style={{ justifyContent: "flex-start", gap: 8 }}>
            <I n="spark" size={11} style={{ color: "var(--amber)" }} />{s}
          </button>
        ))}
      </div>
    </>
  );
}

function LoomLiveContent() {
  return (
    <>
      <div>
        <div className="loom-msg-role">Loom · Live mode</div>
        <div className="loom-msg-text">Session 16 active · 1h 23m elapsed. Last marked moment: "Mira confronts the Dockmaster." Quick capture available.</div>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {["Stub NPC", "Capture note", "Search canon", "Suggest beat"].map((s, i) => (
          <button key={i} style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", padding: "4px 8px", border: "1px solid var(--stage-border)", borderRadius: "var(--r-sm)", color: "var(--stage-fg-2)", background: "var(--stage-card)" }}>{s}</button>
        ))}
      </div>
    </>
  );
}

interface LoomProps {
  expanded?: boolean;
  mode?: string;
  onExpand?: () => void;
  onCollapse?: () => void;
}

function LoomCarriage({ expanded = true, mode = "ask", onExpand, onCollapse }: LoomProps) {
  const modes = ["Ask", "Prep", "Live"];
  if (!expanded) return (
    <div className="loom-carriage col" onClick={onExpand} style={{ cursor: "pointer" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--stone-100)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}
    >
      <div style={{ marginTop: 16, color: "var(--amber)", width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: "var(--r-md)", border: "1px solid rgba(184,112,42,0.3)", background: "rgba(184,112,42,0.06)" }}>
        <I n="spark" size={16} />
      </div>
      <div className="loom-rail-label">The Loom</div>
    </div>
  );

  return (
    <div className="loom-carriage exp">
      <div className="loom-head">
        <I n="spark" size={14} style={{ color: "var(--amber)" }} />
        <span className="loom-title">The Loom</span>
        <div className="loom-mode-tabs">
          {modes.map(m => (
            <button key={m} className={"loom-tab" + (m.toLowerCase() === mode ? " active" : "")}>{m}</button>
          ))}
        </div>
        <button className="loom-close-btn" onClick={onCollapse}><I n="chevRight" size={13} /></button>
      </div>
      <div className="loom-body">
        {mode === "ask" && <LoomAskContent />}
        {mode === "prep" && <LoomPrepContent />}
        {mode === "live" && <LoomLiveContent />}
      </div>
      <div className="loom-foot">
        <div className="loom-composer">
          <textarea placeholder="Ask about the saga, draft an NPC, suggest a scene…" rows={2} />
          <button className="loom-send"><I n="send" size={15} /></button>
        </div>
        <div className="loom-disclaimer">Relic can make mistakes. Verify important details.</div>
      </div>
    </div>
  );
}

// ─── Overlays ─────────────────────────────────────────────────

export function SearchPalette({ onClose }: { onClose: () => void }) {
  const app = useApp();
  return (
    <div className="scrim" onClick={onClose}>
      <div className="search-palette" onClick={e => e.stopPropagation()}>
        <div className="sp-input-row">
          <I n="search" size={16} />
          <input className="sp-input" placeholder="Search entities, threads, sessions…" autoFocus />
          <span className="sp-kbd">Esc</span>
        </div>
        <div className="sp-group-label">Characters</div>
        {[["Castellan Veyra", "NPC · Antagonist", "npc"], ["Mira Ashborne", "NPC · Ally", "npc"], ["Aldric Fenmore", "NPC · Uncertain", "npc"]].map(([name, meta, cls], i) => (
          <div key={i} className={"sp-row " + cls} onClick={() => { app?.navigate("library", { libraryView: "detail" }); onClose(); }} style={{ cursor: "pointer" }}>
            <span className="sp-title">{name}</span>
            <span className="sp-meta">{meta}</span>
          </div>
        ))}
        <div className="sp-group-label">Threads</div>
        {[["The Forged Succession", "Thread · Loose", "thread"], ["Mira's Debt", "Thread · Active", "thread"]].map(([name, meta, cls], i) => (
          <div key={i} className={"sp-row " + cls} onClick={() => { app?.navigate("threads", { selectedThreadId: i + 1 }); onClose(); }} style={{ cursor: "pointer" }}>
            <span className="sp-title">{name}</span>
            <span className="sp-meta">{meta}</span>
          </div>
        ))}
        <div className="sp-group-label">Places</div>
        {[["The Tallow Gate", "Location · Tavern", "loc"], ["Fenwick Harbor", "Location · District", "loc"]].map(([name, meta, cls], i) => (
          <div key={i} className={"sp-row " + cls} onClick={() => { app?.navigate("library", { libraryFilter: "location", libraryView: "grid" }); onClose(); }} style={{ cursor: "pointer" }}>
            <span className="sp-title">{name}</span>
            <span className="sp-meta">{meta}</span>
          </div>
        ))}
        <div className="sp-footer">
          <span><span className="sp-kbd">↑↓</span> navigate</span>
          <span><span className="sp-kbd">⏎</span> open</span>
          <span><span className="sp-kbd">⌘⏎</span> open in new tab</span>
          <span><span className="sp-kbd">Esc</span> close</span>
        </div>
      </div>
    </div>
  );
}

export function SwitcherDropdown({ which = "saga", anchor, onClose }: { which?: string; anchor?: DOMRect; onClose: () => void }) {
  const options: Record<string, { label: string; items: Array<{ name: string; meta: string; cur?: boolean }> }> = {
    workspace: { label: "Workspace", items: [{ name: "Westmarch Guild", meta: "3 worlds · 12 sessions", cur: true }, { name: "Solo Campaign", meta: "1 world · 4 sessions" }, { name: "One-shots", meta: "1 world · 7 sessions" }] },
    world:     { label: "World — Westmarch Guild", items: [{ name: "Eryndal", meta: "The Shattered Crown · active", cur: true }, { name: "Keth (dormant)", meta: "No active saga" }, { name: "The Pale Court", meta: "Archived" }] },
    saga:      { label: "Saga — Eryndal", items: [{ name: "The Shattered Crown", meta: "16 sessions · active", cur: true }, { name: "Prologue: The Merchant Roads", meta: "4 sessions · complete" }] },
  };
  const data = options[which] || options.saga;
  const top = anchor ? anchor.bottom + 4 : 64;
  const left = anchor ? anchor.left : 216;
  return (
    <div className="scrim" style={{ background: "transparent" }} onClick={onClose}>
      <div className="switcher-dd" onClick={e => e.stopPropagation()} style={{ position: "fixed", top, left, margin: 0 }}>
        <div style={{ padding: "8px 14px 5px", fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--stone-500)" }}>{data.label}</div>
        {data.items.map((item, i) => (
          <div key={i} className={"sd-item" + (item.cur ? " current" : "")}>
            {item.cur ? (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Dot kind="active" />
                <span className="sd-name">{item.name}</span>
              </div>
            ) : (
              <div className="sd-name">{item.name}</div>
            )}
            <div className="sd-meta">{item.meta}</div>
          </div>
        ))}
        <div className="sd-sep" />
        <div className="sd-action"><I n="plus" size={12} /> New {which}</div>
        <div className="sd-action"><I n="settings" size={12} /> Manage {which}s</div>
      </div>
    </div>
  );
}

// ─── Shell wrapper ────────────────────────────────────────────

export interface ShellProps {
  active?: string;
  navCollapsed?: boolean;
  loomExpanded?: boolean;
  loomMode?: string;
  pill?: string;
  reviewCount?: number;
  showUsage?: boolean;
  usageWarn?: boolean;
  overlay?: string | null;
  children?: React.ReactNode;
  stageMode?: boolean;
}

export function Shell({
  active: activeProp = "home",
  navCollapsed = false,
  loomExpanded = true,
  loomMode = "ask",
  pill: pillProp = "none",
  reviewCount: rcProp = 0,
  showUsage = false,
  usageWarn = false,
  overlay = null,
  children,
  stageMode = false,
}: ShellProps) {
  const app = useApp();
  const [navCol, setNavCol] = useState(navCollapsed);
  const [loomExp, setLoomExp] = useState(loomExpanded);
  const [ov, setOv] = useState(overlay);
  const [swAnchor, setSwAnchor] = useState<DOMRect | undefined>();

  useEffect(() => { setNavCol(navCollapsed); }, [navCollapsed]);
  useEffect(() => { setLoomExp(loomExpanded); }, [loomExpanded]);
  useEffect(() => { setOv(overlay); }, [overlay]);

  // Derive from context when available
  const active = app ? getActiveNav(app.state.view) : activeProp;
  const pill = app ? derivePill(app.state.sessionState) : pillProp;
  const reviewCount = app ? deriveReviewCount(app.state.sessionState) : rcProp;

  function handlePillClick() {
    const ss = app?.state.sessionState;
    if (ss === "active") app?.navigate("stage");
    else if (ss === "prepping") app?.navigate("prepare");
    else if (ss === "ready") app?.navigate("prepare", { prepReady: true });
    else if (ss === "review") app?.navigate("review");
  }

  if (stageMode) {
    return (
      <div className="relic" style={{ height: "100%", overflow: "hidden" }}>
        {children}
        {ov === "search" && <SearchPalette onClose={() => setOv(null)} />}
      </div>
    );
  }

  return (
    <div className="relic" data-nav={navCol ? "rail" : "full"} style={{ height: "100%", overflow: "hidden" }}>
      <TopBar
        active={active}
        collapsed={navCol}
        onToggleNav={() => setNavCol(c => !c)}
        pill={pill}
        reviewCount={reviewCount}
        showUsage={showUsage}
        usageWarn={usageWarn}
        onSearch={() => setOv("search")}
        onSwitcher={(w, rect) => { setOv("sw-" + w); setSwAnchor(rect); }}
        onPillClick={handlePillClick}
      />
      <div className="body-row">
        <SideNav active={active} collapsed={navCol} initialCreateOpen={overlay === "create"} />
        <div className="main">
          <div className="main-inner">
            {children}
          </div>
        </div>
        <LoomCarriage expanded={loomExp} mode={loomMode} onExpand={() => setLoomExp(true)} onCollapse={() => setLoomExp(false)} />
      </div>
      {ov === "search" && <SearchPalette onClose={() => setOv(null)} />}
      {(ov === "sw-workspace" || ov === "sw-world" || ov === "sw-saga") && (
        <SwitcherDropdown which={ov.replace("sw-", "")} anchor={swAnchor} onClose={() => setOv(null)} />
      )}
    </div>
  );
}

// ─── Shell state demo ─────────────────────────────────────────

const SHELL_CONFIGS: Record<string, ShellProps> = {
  "shell-default":     { pill: "none",      reviewCount: 7,  showUsage: false, navCollapsed: false, loomExpanded: true  },
  "shell-rail":        { pill: "prepping",  reviewCount: 7,  showUsage: false, navCollapsed: true,  loomExpanded: true  },
  "shell-loom-closed": { pill: "active",    reviewCount: 7,  showUsage: true,  navCollapsed: false, loomExpanded: false },
  "shell-usage-warn":  { pill: "active",    reviewCount: 12, showUsage: true,  usageWarn: true, navCollapsed: false, loomExpanded: false },
  "shell-search":      { pill: "none",      reviewCount: 0,  showUsage: false, navCollapsed: false, loomExpanded: false, overlay: "search"  },
  "shell-create":      { pill: "none",      reviewCount: 0,  showUsage: false, navCollapsed: false, loomExpanded: false, overlay: "create"  },
  "shell-switcher":    { pill: "none",      reviewCount: 0,  showUsage: false, navCollapsed: false, loomExpanded: false, overlay: "sw-saga" },
};

export function ShellStateDemo({ variant }: { variant: string }) {
  const cfg = SHELL_CONFIGS[variant] || SHELL_CONFIGS["shell-default"];
  return (
    <Shell active="home" {...cfg}>
      <div style={{ padding: "40px 0", textAlign: "center", color: "var(--stone-500)", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        {variant.replace("shell-", "").replace(/-/g, " ")} state — shell chrome shown above
      </div>
    </Shell>
  );
}
