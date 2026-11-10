"use client";

import {
  forwardRef,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefObject
} from "react";

import { CanvasGlyph } from "@/components/canvas/canvas-controls";

import styles from "./search-field.module.css";

export type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear?: () => void;
  onFieldKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onBoundaryBlur?: () => void;
  triggerLabel?: string;
  shortcut?: string;
  panelLabel?: string;
  panelId?: string;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  contentRef?: RefObject<HTMLDivElement | null>;
  listboxId?: string;
  activeDescendant?: string;
  busy?: boolean;
  children?: ReactNode;
};

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  {
    value,
    onChange,
    open,
    onOpenChange,
    onClear,
    onFieldKeyDown,
    onBoundaryBlur,
    triggerLabel = "Search this world",
    shortcut = "⌘K",
    panelLabel = triggerLabel,
    panelId,
    triggerRef,
    contentRef,
    listboxId,
    activeDescendant,
    busy = false,
    className,
    children,
    ...inputProps
  },
  ref
) {
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBoundaryBlur?.();
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")} onBlur={handleBlur}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={`${triggerLabel} ${shortcut}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onClick={() => onOpenChange(!open)}
      >
        <CanvasGlyph name="search" />
        <span className={styles.triggerLabel}>{triggerLabel}</span>
        <kbd className={styles.shortcut}>{shortcut}</kbd>
      </button>

      {open ? (
        <div ref={contentRef} id={panelId} className={styles.panel} role="dialog" aria-label={panelLabel}>
          <div className={styles.inputWrap}>
            <CanvasGlyph name="search" />
            <input
              {...inputProps}
              role="combobox"
              ref={ref}
              className={styles.input}
              value={value}
              aria-haspopup="listbox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeDescendant || undefined}
              aria-busy={busy || undefined}
              aria-label={triggerLabel}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={onFieldKeyDown}
            />
            {value && onClear ? (
              <button type="button" className={styles.clear} aria-label="Clear search" onClick={onClear}>
                Clear
              </button>
            ) : null}
          </div>
          {children}
        </div>
      ) : null}
    </div>
  );
});

