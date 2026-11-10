"use client";

import { IconButton } from "@/components/ui/control";
import styles from "./workspace-navigation.module.css";

export type WorkspaceDestination = "prepare" | "boards" | "library" | "sessions";
const destinations: readonly { id: WorkspaceDestination; label: string }[] = [
  { id: "prepare", label: "Prepare" }, { id: "boards", label: "Boards" },
  { id: "library", label: "Library" }, { id: "sessions", label: "Sessions" }
];

/** Working contexts belong here; spatial editing remains in the Canvas toolbar. */
export function WorkspaceNavigation({ active, expanded, onNavigate }: {
  active?: WorkspaceDestination;
  expanded?: WorkspaceDestination;
  onNavigate: (destination: WorkspaceDestination, trigger: HTMLButtonElement) => void;
}) {
  return <nav className={styles.rail} aria-label="Workspace navigation" onKeyDown={event => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const index = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault(); buttons[index]?.focus();
  }}>
    {destinations.map(({ id, label }) => <IconButton key={id} label={label} title={label}
      className={styles.destination} aria-current={active === id ? "true" : undefined}
      aria-haspopup={id === "boards" || id === "sessions" ? "dialog" : undefined}
      aria-expanded={id === "boards" || id === "sessions" ? expanded === id : undefined}
      onClick={event => onNavigate(id, event.currentTarget)}>
      <WorkspaceDestinationIcon destination={id} />
    </IconButton>)}
  </nav>;
}

export function WorkspaceDestinationIcon({ destination }: { destination: WorkspaceDestination }) {
  const paths = {
    prepare: <><path d="M12 5C9 3 6 3 3 4v14c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1ZM12 5v14" /></>,
    boards: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    library: <><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l3-1 4 15-4 1zM4 8h4M10 8h4M4 16h4M10 16h4" /></>,
    sessions: <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4M16 3v4M4 10h16m-12 4h3v3H8z" /></>
  };
  return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[destination]}</svg>;
}
