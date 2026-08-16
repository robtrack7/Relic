"use client";

import { useEffect, useRef, useState } from "react";

import type { CardId, WorldEntry } from "@/lib/world/model";

import { EntryIdentity } from "./library";
import type { SurfaceControlsRef } from "./surface-controls";
import type { DeskStore } from "./use-desk";
import styles from "./desk.module.css";

/**
 * Global search: the promise that spatial memory is an assist, never a
 * requirement.
 *
 * Anything in the world is two keystrokes away regardless of which composition
 * it sits on, or whether it sits on one at all. Finding something and *having*
 * it are one gesture here — Enter places it in front of you and deepens into it,
 * because a GM who searched for Mara wanted Mara, not a list mentioning her.
 *
 * Retrieval never navigates. The composition stays where it was and the thing
 * comes to you, exactly as following a relationship does.
 */

const RESULTS = 10;

export function Finder({
  store,
  controls,
  onArrive,
  onOpenLibrary
}: {
  store: DeskStore;
  controls: SurfaceControlsRef;
  onArrive: (cardIds: readonly CardId[]) => void;
  onOpenLibrary: () => void;
}) {
  const { search, pullIn } = store;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<readonly WorldEntry[]>([]);
  const [active, setActive] = useState(0);
  const [working, setWorking] = useState(false);

  const wrapper = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  // Only the newest request may write. Keystrokes outrun round trips, and a
  // stale answer landing last is how a search box starts showing the results
  // for a word the GM has already finished deleting.
  const ticket = useRef(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((was) => !was);
        return;
      }
      // "/" is the fast path, but only where it is not a character being typed.
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    field.current?.focus();
    field.current?.select();
    const close = (event: Event) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const mine = ++ticket.current;
    const timer = setTimeout(
      async () => {
        const found = await search({ query, limit: RESULTS });
        if (ticket.current !== mine) return;
        setEntries(found);
        setActive(0);
      },
      query === "" ? 0 : 140
    );
    return () => clearTimeout(timer);
  }, [open, query, search]);

  /**
   * What a result does when it is chosen.
   *
   * Something already on this composition is *revealed* rather than added —
   * referencing it again would be a no-op, and offering to "add" what is already
   * in front of the GM would be Relic misdescribing its own world.
   */
  const take = async (entry: WorldEntry | undefined) => {
    if (!entry || working) return;
    setOpen(false);

    if (entry.cardHere) {
      onArrive([entry.cardHere]);
      return;
    }

    setWorking(true);
    const landed = await pullIn([entry.ref], controls.current?.landing() ?? { x: 0, y: 0 });
    setWorking(false);
    if (landed.length > 0) onArrive(landed);
  };

  return (
    <div className={styles.finder} ref={wrapper}>
      <button
        type="button"
        className={styles.finderTrigger}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((was) => !was)}
      >
        <span aria-hidden="true">⌕</span>
        <span className={styles.finderTriggerLabel}>Search this world</span>
        <kbd className={styles.finderKey}>⌘K</kbd>
      </button>

      {open ? (
        <div className={styles.finderPanel} role="dialog" aria-label="Search this world">
          <input
            ref={field}
            className={styles.finderField}
            value={query}
            placeholder="A name, or something you wrote"
            aria-label="Search this world"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // Stopped here so the canvas underneath never acts on a keystroke
              // meant for the search box.
              event.stopPropagation();
              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((current) => Math.min(current + 1, entries.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((current) => Math.max(current - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                void take(entries[active]);
              }
            }}
          />

          {entries.length === 0 ? (
            <p className={styles.finderNote}>
              {query === ""
                ? "Nothing in this world yet."
                : `Nothing matches “${query}”.`}
            </p>
          ) : (
            <ul className={styles.finderResults}>
              {entries.map((entry, index) => (
                <li key={entry.ref.objectId}>
                  <button
                    type="button"
                    className={styles.finderResult}
                    data-active={index === active || undefined}
                    // Pointer-down would fire before the panel's own blur
                    // handling settles; hovering to aim is what a list like this
                    // is for, so the highlight follows the pointer instead.
                    onMouseEnter={() => setActive(index)}
                    onClick={() => void take(entry)}
                  >
                    <EntryIdentity entry={entry} />
                    <span className={styles.finderVerb}>
                      {entry.cardHere ? "here" : "bring in"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <footer className={styles.finderFoot}>
            <span className={styles.finderHint}>↑↓ move · Enter brings it in · Esc closes</span>
            <button
              type="button"
              className={styles.finderMore}
              onClick={() => {
                setOpen(false);
                onOpenLibrary();
              }}
            >
              Open the Library
            </button>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
