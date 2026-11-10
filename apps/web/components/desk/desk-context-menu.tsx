"use client";

import { useRef } from "react";
import { FloatingSurface } from "@/components/ui/floating-surface";
import styles from "./desk-context-menu.module.css";

export type DeskMenuAction = { label: string; shortcut?: string; onSelect: () => void; disabled?: boolean; destructive?: boolean; keepOpen?: boolean; swatch?: string; checked?: boolean };
export type DeskMenuGroup = { label?: string; actions: readonly DeskMenuAction[] };

/** Uses the same overlay, focus, typeahead and collision rules as Canvas tools. */
export function DeskContextMenu({ point, label, groups, onClose, open = true }: {
  point: { x: number; y: number }; label: string; groups: readonly DeskMenuGroup[];
  onClose: (restoreFocus: boolean) => void; open?: boolean;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  return <><span ref={anchor} aria-hidden="true" className={styles.anchor} style={{ left: point.x, top: point.y }}/>
    <FloatingSurface open={open} label={label} triggerRef={anchor} placement="bottom" align="start" width={252} onClose={onClose}>
      <div className={styles.menu}>
        {groups.filter(group => group.actions.length).map((group, index) => <div key={index} role="group" aria-label={group.label} className={styles.group}>
          {group.label ? <span className={styles.groupLabel}>{group.label}</span> : null}
          {group.actions.map(action => <button type="button" key={action.label} aria-label={action.label} role={action.checked === undefined ? "menuitem" : "menuitemradio"} aria-checked={action.checked} disabled={action.disabled}
            data-destructive={action.destructive || undefined} onClick={() => { if (!action.keepOpen) onClose(false); action.onSelect(); }}>
            <span>{action.swatch ? <i aria-hidden="true" className={styles.swatch} style={{ backgroundColor: action.swatch }}/> : null}{action.label}</span>{action.checked ? <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 8 3 3 7-7"/></svg> : action.shortcut ? <kbd aria-hidden="true">{action.shortcut}</kbd> : null}
          </button>)}
        </div>)}
      </div>
    </FloatingSurface>
  </>;
}
