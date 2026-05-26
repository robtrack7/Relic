import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

type ShellProps = {
  params: IdParams;
  workspace: { name: string };
  world: { name: string };
  saga: { name: string };
  active?: "home" | "threads" | "entities" | "sessions" | "review" | "ask" | "search" | "settings";
  children: React.ReactNode;
};

export function SanctumShell({ params, workspace, world, saga, active = "home", children }: ShellProps) {
  const root = sagaPath(params);
  const nav = [
    ["threads", "Threads", `${root}/threads`],
    ["entities", "Entities", `${root}/entities`],
    ["sessions", "Sessions", `${root}/sessions`],
    ["review", "Review", `${root}/review`],
    ["ask", "Ask", `${root}/ask`]
  ] as const;

  return (
    <div className="sanctum-shell">
      <aside className="sanctum-rail">
        <Link className="brand" href={root} aria-label="Relic">
          <img className="brand-wordmark" src="/brand/wordmark.svg" alt="Relic" />
        </Link>
        <div className="eyebrow">The Sanctum</div>
        <nav className="nav-list" aria-label="Sanctum">
          {nav.map(([key, label, href]) => (
            <Link
              key={key}
              className={`nav-link ${active === key ? "active" : ""} ${key === "ask" ? "is-gated" : ""}`}
              href={href}
              aria-disabled={key === "ask" ? true : undefined}
            >
              {label}
            </Link>
          ))}
          <Link className={`nav-link ${active === "settings" ? "active" : ""}`} href={`${root}/settings`}>Settings</Link>
        </nav>
        <Link className="command-entry" href={`${root}/search`}>
          <span className="command-label">Command</span>
          <span className="command-row">
            <span className="command-title">Search saga canon</span>
            <span className="command-kbd">Cmd K</span>
          </span>
        </Link>
        <div className="context-block">
          <span className="label">Workspace</span>
          <strong className="context-value">{workspace.name}</strong>
          <span className="label">World</span>
          <strong className="context-value">{world.name}</strong>
          <span className="label">Saga</span>
          <strong className="context-value">{saga.name}</strong>
        </div>
        <div className="context-block">
          <span className="chip amber">Usage ready</span>
          <span className="small muted">Manual viewing, editing, and approval stay available even when metered work is blocked.</span>
        </div>
        <form action={signOutAction}>
          <button className="button-ghost" type="submit">Sign out</button>
        </form>
      </aside>
      <main className="sanctum-main">{children}</main>
    </div>
  );
}
