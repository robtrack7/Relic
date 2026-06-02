import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

type ShellProps = {
  params: IdParams;
  workspace: { name: string };
  world: { name: string };
  saga: { name: string };
  active?: "home" | "threads" | "library" | "entities" | "prepare" | "sessions" | "review" | "search" | "settings" | "export";
  currentSession?: { id: string; name: string; status: string } | null;
  reviewCount?: number;
  loomMode?: "ask" | "prep";
  children: React.ReactNode;
};

export function SanctumShell({
  params,
  workspace,
  world,
  saga,
  active = "home",
  currentSession,
  reviewCount = 0,
  loomMode = "ask",
  children
}: ShellProps) {
  const root = sagaPath(params);
  const prepareHref = currentSession ? `${root}/sessions/${currentSession.id}/prep` : `${root}/sessions`;
  const nav = [
    ["home", "Home", root],
    ["threads", "Threads", `${root}/threads`],
    ["library", "Library", `${root}/entities`],
    ["prepare", "Prepare", prepareHref],
    ["sessions", "Sessions", `${root}/sessions`],
    ["review", "Review", `${root}/review`]
  ] as const;
  const lowerNav = [
    ["export", "Export", `${root}/export`],
    ["settings", "Settings", `${root}/settings`]
  ] as const;
  const normalizedActive = active === "entities" ? "library" : active;
  const sessionLabel = currentSession ? `${currentSession.name} · ${currentSession.status}` : "No session planned";
  const sessionHref = currentSession
    ? ["ready", "started", "in_progress", "ended_pending_undo"].includes(currentSession.status)
      ? `${root}/sessions/${currentSession.id}/stage`
      : `${root}/sessions/${currentSession.id}/prep`
    : `${root}/sessions`;

  return (
    <div className="sanctum-app-shell">
      <header className="sanctum-topbar">
        <Link className="brand" href={root} aria-label="Relic">
          <img className="brand-wordmark" src="/brand/wordmark.svg" alt="Relic" />
        </Link>
        <div className="context-switchers" aria-label="Workspace, World, and Saga context">
          <button className="context-switcher" type="button">
            <span>Workspace</span>
            <strong>{workspace.name}</strong>
          </button>
          <button className="context-switcher" type="button">
            <span>World</span>
            <strong>{world.name}</strong>
          </button>
          <button className="context-switcher" type="button">
            <span>Saga</span>
            <strong>{saga.name}</strong>
          </button>
        </div>
        <form className="topbar-search" action={`${root}/search`} role="search">
          <label className="sr-only" htmlFor="global-saga-search">Search saga canon</label>
          <input id="global-saga-search" name="q" type="search" placeholder="Search saga canon..." aria-label="Search saga canon" />
        </form>
        <button className="topbar-button" type="button">Guide</button>
        <button className="topbar-button is-primary" type="button">Create</button>
        <Link className="session-pill" href={sessionHref}>{sessionLabel}</Link>
        <Link className="review-pill" href={`${root}/review`}>Review {reviewCount}</Link>
        <form action={signOutAction}>
          <button className="account-button" type="submit" aria-label="Sign out">GM</button>
        </form>
      </header>
      <aside className="sanctum-rail">
        <div className="eyebrow">The Sanctum</div>
        <nav className="nav-list" aria-label="Sanctum">
          {nav.map(([key, label, href]) => (
            <Link
              key={key}
              className={`nav-link ${normalizedActive === key ? "active" : ""}`}
              href={href}
            >
              {label}
              {key === "review" && reviewCount ? <span className="nav-count">{reviewCount}</span> : null}
            </Link>
          ))}
          <span className="nav-spacer" aria-hidden="true" />
          {lowerNav.map(([key, label, href]) => (
            <Link key={key} className={`nav-link ${normalizedActive === key ? "active" : ""}`} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="context-block">
          <span className="chip amber">Usage ready</span>
          <span className="small muted">Manual viewing, editing, and approval stay available even when metered work is blocked.</span>
        </div>
      </aside>
      <main className="sanctum-main">{children}</main>
      <aside className={`loom-sidecar loom-${loomMode}`} aria-label="The Loom">
        <div className="loom-header">
          <span className="loom-spark">+</span>
          <div>
            <h2>The Loom</h2>
            <p>{loomMode === "prep" ? "Your AI partner for sharper prep." : "Search, brainstorm, and weave new canon."}</p>
          </div>
        </div>
        <div className="loom-card">
          <span className="section-label">{loomMode === "prep" ? "Prep suggestion" : "The Loom"}</span>
          <p>{loomMode === "prep"
            ? "Review continuity, draft scenes, and prepare changes. Canon still waits for GM approval."
            : "Ask a sourced question or draft an idea. The Loom will not touch canon until you commit it."}</p>
        </div>
        <div className="loom-prompts">
          <button type="button">Show unresolved threads</button>
          <button type="button">Draft the next scene</button>
          <button type="button">Find canon risks</button>
        </div>
        <form className="loom-composer">
          <label className="sr-only" htmlFor="loom-prompt">Ask The Loom</label>
          <input id="loom-prompt" placeholder={loomMode === "prep" ? "Ask about this prep..." : "Ask anything about this saga..."} />
          <button type="button">Send</button>
        </form>
      </aside>
    </div>
  );
}
