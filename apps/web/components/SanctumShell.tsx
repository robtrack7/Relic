import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { RelicIcon } from "@/components/RelicIcon";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

type ShellProps = {
  params: IdParams;
  workspace: { name: string };
  world: { name: string };
  saga: { name: string };
  active?: "home" | "threads" | "library" | "entities" | "prepare" | "sessions" | "review" | "search" | "guide" | "settings" | "export";
  currentSession?: { id: string; name: string; status: string } | null;
  reviewCount?: number;
  loomMode?: "ask" | "prep";
  children: React.ReactNode;
};

function sessionPillClass(status: string | undefined): string {
  if (!status) return "sess-pill none";
  if (status === "planned") return "sess-pill prepping";
  if (status === "ready") return "sess-pill ready";
  if (status === "started" || status === "in_progress") return "sess-pill active";
  if (status === "ended_pending_undo" || status === "ended") return "sess-pill review";
  return "sess-pill none";
}

export function SanctumShell({
  params,
  workspace,
  world,
  saga,
  active = "home",
  currentSession,
  reviewCount = 0,
  loomMode = "ask",
  children,
}: ShellProps) {
  const root = sagaPath(params);
  const prepareHref = currentSession
    ? `${root}/sessions/${currentSession.id}/prep`
    : `${root}/sessions`;

  const sessionHref = currentSession
    ? ["ready", "started", "in_progress", "ended_pending_undo"].includes(currentSession.status)
      ? `${root}/sessions/${currentSession.id}/stage`
      : `${root}/sessions/${currentSession.id}/prep`
    : `${root}/sessions`;

  const sessionLabel = currentSession
    ? `${currentSession.name} · ${currentSession.status}`
    : "No session";

  const normalizedActive = active === "entities" ? "library" : active;

  const mainNav = [
    { key: "home", label: "Home", href: root, icon: "home" as const },
    { key: "threads", label: "Threads", href: `${root}/threads`, icon: "threads" as const },
    { key: "library", label: "Library", href: `${root}/entities`, icon: "library" as const },
    { key: "prepare", label: "Prepare", href: prepareHref, icon: "prepare" as const },
    { key: "sessions", label: "Sessions", href: `${root}/sessions`, icon: "sessions" as const },
    { key: "review", label: "Review", href: `${root}/review`, icon: "review" as const },
  ] as const;

  const lowerNav = [
    { key: "export", label: "Export", href: `${root}/export`, icon: "export" as const },
    { key: "settings", label: "Settings", href: `${root}/settings`, icon: "settings" as const },
  ] as const;

  return (
    <div className="relic" style={{ height: "100dvh" }}>
      {/* Top bar */}
      <header className="topbar">
        <div className="topbar-brand">
          <Link href={root} aria-label="Relic home">
            <img src="/brand/wordmark.svg" alt="Relic" height={22} style={{ display: "block" }} />
          </Link>
        </div>

        <div className="switchers" aria-label="Workspace, World, and Saga context">
          <div className="switcher">
            <span className="switcher-label">Workspace</span>
            <button className="switcher-btn" type="button">
              <span className="sw-ico"><RelicIcon name="crown" size={12} /></span>
              <span className="switcher-name">{workspace.name}</span>
              <span className="sw-chev"><RelicIcon name="chevronDown" size={11} /></span>
            </button>
          </div>
          <span className="sw-sep">/</span>
          <div className="switcher">
            <span className="switcher-label">World</span>
            <button className="switcher-btn" type="button">
              <span className="sw-ico wld"><RelicIcon name="flame" size={12} /></span>
              <span className="switcher-name">{world.name}</span>
              <span className="sw-chev"><RelicIcon name="chevronDown" size={11} /></span>
            </button>
          </div>
          <span className="sw-sep">/</span>
          <div className="switcher">
            <span className="switcher-label">Saga</span>
            <button className="switcher-btn" type="button">
              <span className="sw-ico"><RelicIcon name="sessions" size={12} /></span>
              <span className="switcher-name">{saga.name}</span>
              <span className="sw-chev"><RelicIcon name="chevronDown" size={11} /></span>
            </button>
          </div>
        </div>

        <div className="topbar-right">
          <form action={`${root}/search`} role="search" className="search-btn" style={{ cursor: "text" }}>
            <RelicIcon name="search" size={13} />
            <input
              name="q"
              type="search"
              placeholder="Search saga canon…"
              aria-label="Search saga canon"
              style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: "var(--stone-500)", width: 140 }}
            />
            <span className="kbd-hint">⌘K</span>
          </form>

          <Link className="icon-btn" href={`${root}/guide`} aria-label="Relic Guide">
            <RelicIcon name="spark" size={16} />
          </Link>

          <Link href={sessionHref} className={sessionPillClass(currentSession?.status)}>
            <span className="dot amber" />
            {sessionLabel}
          </Link>

          {reviewCount > 0 && (
            <Link href={`${root}/review`} className="review-bdg">
              <RelicIcon name="review" size={12} />
              {reviewCount} pending
            </Link>
          )}

          <Link className="create-btn" href={`${root}/entities/new`}>
            <RelicIcon name="plus" size={13} />
            Create
          </Link>

          <form action={signOutAction}>
            <button className="icon-btn" type="submit" aria-label="Sign out" title="Sign out">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600 }}>GM</span>
            </button>
          </form>
        </div>
      </header>

      <div className="body-row">
        {/* Side nav */}
        <nav className="sidenav" aria-label="Sanctum">
          <span className="sidenav-label">The Sanctum</span>

          {mainNav.map(({ key, label, href, icon }) => (
            <Link
              key={key}
              href={href}
              className={`nav-item${normalizedActive === key ? " is-active" : ""}`}
            >
              <span className="nav-ico"><RelicIcon name={icon} size={15} /></span>
              <span className="nav-text">{label}</span>
              {key === "review" && reviewCount > 0 ? (
                <span className="nav-count">{reviewCount}</span>
              ) : null}
            </Link>
          ))}

          <span className="nav-spacer" />
          <div className="nav-sep" />

          {lowerNav.map(({ key, label, href, icon }) => (
            <Link
              key={key}
              href={href}
              className={`nav-item${normalizedActive === key ? " is-active" : ""}`}
            >
              <span className="nav-ico"><RelicIcon name={icon} size={15} /></span>
              <span className="nav-text">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Main content */}
        <main className="main">
          <div className="main-inner">{children}</div>
        </main>

        {/* Relic Guide sidecar */}
        <aside className="loom-carriage exp" aria-label="Relic Guide">
          <div className="loom-head">
            <span className="loom-title">
              <RelicIcon name="spark" size={12} /> Relic Guide
            </span>
            <div className="loom-mode-tabs">
              <button type="button" className={`loom-tab${loomMode === "ask" ? " active" : ""}`}>Ask</button>
              <button type="button" className={`loom-tab${loomMode === "prep" ? " active" : ""}`}>Prep</button>
            </div>
          </div>
          <div className="loom-body">
            <div className="loom-draft-card">
              <div className="loom-draft-label">Relic Guide</div>
              <div className="loom-draft-text">
                {loomMode === "prep"
                  ? "Review continuity, draft scenes, and prepare changes. Canon still waits for GM approval."
                  : "Ask current canon and inspect cited sources before acting."}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <Link className="btn btn-ghost btn-sm" href={`${root}/threads`} style={{ justifyContent: "flex-start", fontSize: 11 }}>Show unresolved threads</Link>
              <Link className="btn btn-ghost btn-sm" href={`${root}/guide?q=${encodeURIComponent("What should I remember before prep?")}`} style={{ justifyContent: "flex-start", fontSize: 11 }}>Prep memory check</Link>
              <Link className="btn btn-ghost btn-sm" href={`${root}/search`} style={{ justifyContent: "flex-start", fontSize: 11 }}>Search canon</Link>
            </div>
          </div>
          <div className="loom-foot">
            <form className="loom-composer" action={`${root}/guide`}>
              <label className="sr-only" htmlFor="loom-prompt">Ask Relic Guide</label>
              <textarea
                id="loom-prompt"
                name="q"
                rows={1}
                placeholder={loomMode === "prep" ? "Ask about this prep…" : "Ask anything about this saga…"}
                style={{ fontFamily: "var(--font-ui)" }}
              />
              <button type="submit" className="loom-send" aria-label="Send">
                <RelicIcon name="send" size={13} />
              </button>
            </form>
            <p className="loom-disclaimer">AI output is never canon without GM approval.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
