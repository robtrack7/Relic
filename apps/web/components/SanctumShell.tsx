import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

type ShellProps = {
  params: IdParams;
  workspace: { name: string };
  world: { name: string };
  saga: { name: string };
  active?: "home" | "threads" | "entities" | "sessions" | "review" | "search" | "settings";
  children: React.ReactNode;
};

export function SanctumShell({ params, workspace, world, saga, active = "home", children }: ShellProps) {
  const root = sagaPath(params);
  const nav = [
    ["threads", "Threads", `${root}/threads`],
    ["entities", "Entities", `${root}/entities`],
    ["sessions", "Sessions", `${root}/sessions`],
    ["review", "Review", `${root}/review`],
    ["search", "Search", `${root}/search`]
  ] as const;

  return (
    <div className="sanctum-shell">
      <aside className="sanctum-rail">
        <Link className="brand" href={root}>Reli<span>c</span></Link>
        <div className="eyebrow">The Sanctum</div>
        <nav className="nav-list" aria-label="Sanctum">
          {nav.map(([key, label, href]) => (
            <Link key={key} className={`nav-link ${active === key ? "active" : ""}`} href={href}>{label}</Link>
          ))}
          <span className="nav-link" aria-disabled="true">Ask · AI phase</span>
          <Link className={`nav-link ${active === "settings" ? "active" : ""}`} href={`${root}/settings`}>Settings</Link>
        </nav>
        <div className="context-block">
          <span className="label">Workspace</span>
          <strong>{workspace.name}</strong>
          <span className="label">World</span>
          <strong>{world.name}</strong>
          <span className="label">Saga</span>
          <strong>{saga.name}</strong>
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
