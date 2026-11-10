"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { CardId, WorldEntry } from "@/lib/world/model";

import { SearchField } from "@/components/ui/search-field";
import styles from "@/components/ui/search-field.module.css";
import { useOverlayDismiss } from "@/components/ui/floating-surface";

import { EntryIdentity } from "./library";
import type { SurfaceControlsRef } from "./surface-controls";
import type { DeskStore } from "./use-desk";

const RESULTS = 10;

/** Global retrieval that keeps the current composition and brings the result to it. */
export function Finder({
  store,
  controls,
  onArrive,
  onOpenLibrary
}: {
  store: DeskStore;
  controls: SurfaceControlsRef;
  onArrive: (cardIds: readonly CardId[]) => void;
  onOpenLibrary: (query?: string) => void;
}) {
  const { search, pullIn } = store;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<readonly WorldEntry[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspected, setInspected] = useState<WorldEntry | null>(null);
  const [searchAttempt, setSearchAttempt] = useState(0);

  const field = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const ticket = useRef(0);
  const panelId = useId();
  const listboxId = useId();

  const openFinder = useCallback(() => {
    if (!open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : trigger.current;
    }
    setOpen(true);
  }, [open]);

  const closeFinder = useCallback((restoreFocus: boolean) => {
    ticket.current += 1;
    setOpen(false);
    setLoading(false);
    setWorking(false);
    if (restoreFocus) (returnFocus.current ?? trigger.current)?.focus();
  }, []);

  useOverlayDismiss({ open, onClose: closeFinder, triggerRef: trigger, contentRef: content });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey) && !typing) {
        event.preventDefault();
        if (open) closeFinder(true);
        else openFinder();
        return;
      }
      if (event.key === "/" && !typing) {
        event.preventDefault();
        openFinder();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeFinder, open, openFinder]);

  useEffect(() => {
    if (!open) return;
    field.current?.focus();
    field.current?.select();
  }, [open]);

  useEffect(() => () => {
    ticket.current += 1;
  }, []);

  useEffect(() => {
    if (!open) return;
    const mine = ++ticket.current;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEntries([]);
    setActive(0);
    const timer = setTimeout(async () => {
      try {
        const found = await search({ query, limit: RESULTS });
        if (cancelled || ticket.current !== mine) return;
        setEntries(found);
        setActive(0);
      } catch {
        if (cancelled || ticket.current !== mine) return;
        setEntries([]);
        setActive(0);
        setError("Search could not load. Try again.");
      } finally {
        if (!cancelled && ticket.current === mine) setLoading(false);
      }
    }, query === "" ? 0 : 140);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      ticket.current += 1;
    };
  }, [open, query, search, searchAttempt]);

  const updateQuery = (next: string) => {
    setQuery(next);
    setEntries([]);
    setActive(0);
    setError(null);
  };

  const clearSearch = () => {
    updateQuery("");
    setError(null);
    field.current?.focus();
  };

  const take = async (entry: WorldEntry | undefined) => {
    if (!entry || loading || working) return;
    setError(null);
    if (entry.cardHere) {
      closeFinder(true);
      onArrive([entry.cardHere]);
      return;
    }

    setWorking(true);
    try {
      const landed = await pullIn([entry.ref], controls.current?.landing() ?? { x: 0, y: 0 });
      if (!landed.length) throw new Error("The object could not be placed.");
      closeFinder(true);
      if (landed.length > 0) onArrive(landed);
    } catch {
      setError("That result could not be brought in. Try again.");
    } finally {
      setWorking(false);
    }
  };

  const inspect = (entry: WorldEntry | undefined) => {
    if (!entry || loading || working) return;
    setError(null);
    if (entry.cardHere) {
      closeFinder(true);
      onArrive([entry.cardHere]);
      return;
    }
    setInspected((current) => (current?.ref.objectId === entry.ref.objectId ? null : entry));
  };

  const activeDescendant = entries[active]
    ? `${listboxId}-option-${entries[active].ref.objectId}`
    : undefined;

  return (
    <SearchField
        ref={field}
        triggerRef={trigger}
        contentRef={content}
        value={query}
        onChange={updateQuery}
        open={open}
        onOpenChange={(next) => (next ? openFinder() : closeFinder(true))}
        onClear={clearSearch}
        onBoundaryBlur={() => { if (open) closeFinder(false); }}
        panelId={panelId}
        listboxId={listboxId}
        activeDescendant={activeDescendant}
        busy={loading || working}
        placeholder="A name, or something you wrote"
        onFieldKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            closeFinder(true);
          } else if (event.key === "ArrowDown" && entries.length > 0) {
            event.preventDefault();
            setActive((current) => Math.min(current + 1, entries.length - 1));
          } else if (event.key === "ArrowUp" && entries.length > 0) {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter" && entries.length > 0) {
            event.preventDefault();
            inspect(entries[active]);
          }
        }}
      >
        {loading ? <p className={styles.status} role="status" aria-live="polite">Searching…</p> : null}
        {!loading && error ? <p className={styles.status} role="alert">
          {error}
          {error === "Search could not load. Try again." ? (
            <button type="button" className={styles.more} onClick={() => setSearchAttempt((attempt) => attempt + 1)}>
              Try again
            </button>
          ) : null}
        </p> : null}
        {!loading && !error && entries.length === 0 ? (
          <p className={styles.status} role="status" aria-live="polite">
            {query === "" ? "Nothing in this world yet." : `Nothing matches “${query}”.`}
          </p>
        ) : null}
        <ul id={listboxId} className={styles.results} role="listbox" aria-label="Search results">
          {entries.map((entry, index) => {
            const activeRow = index === active;
            return (
              <li key={entry.ref.objectId} role="presentation">
                <div className={styles.resultRow}>
                  <button
                    id={`${listboxId}-option-${entry.ref.objectId}`}
                    type="button"
                    role="option"
                    aria-selected={activeRow}
                    disabled={loading || working}
                    className={styles.result}
                    data-active={activeRow || undefined}
                    onMouseEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    onClick={() => inspect(entry)}
                  >
                    <EntryIdentity entry={entry} />
                    <span className={styles.verb}>{entry.cardHere ? "open" : "inspect"}</span>
                  </button>
                  {!entry.cardHere ? (
                    <button
                      type="button"
                      className={styles.resultAction}
                      disabled={loading || working}
                      onClick={() => void take(entry)}
                    >
                      Bring in
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {inspected ? (
          <aside className={styles.preview} aria-label={`Preview ${inspected.ref.label}`}>
            <div className={styles.previewHead}>
              <strong>{inspected.ref.label}</strong>
              <button type="button" className={styles.previewClose} onClick={() => setInspected(null)}>Close</button>
            </div>
            <EntryIdentity entry={inspected} showName={false} showSnippet={false} />
            <p>{inspected.snippet}</p>
            <small>This object is not on the current composition. Use Bring in when you want to arrange it here.</small>
          </aside>
        ) : null}

        <footer className={styles.footer}>
          <span className={styles.hint}>↑↓ move · Enter inspects · Esc closes</span>
          <button
            type="button"
            className={styles.more}
            onClick={() => {
              closeFinder(false);
              onOpenLibrary(query);
            }}
          >
            Open the Library
          </button>
        </footer>
    </SearchField>
  );
}
