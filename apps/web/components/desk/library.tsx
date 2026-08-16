"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CardId, KindFilter, Maturity, WorldEntry } from "@/lib/world/model";
import { REPRESENTATION_KINDS } from "@/lib/world/templates";

import type { SurfaceControlsRef } from "./surface-controls";
import type { DeskStore } from "./use-desk";
import styles from "./desk.module.css";

/**
 * The Library: the world's systematic index.
 *
 * The Desk is where the world is *thought about*; this is where it is *looked
 * up*. It is deliberately not a second canvas and not a file browser — it is a
 * list of identities with the filters that make a large world navigable, and one
 * gesture that puts any of them in front of you.
 *
 * Two things it must never do. It must never be the only way to reach something
 * (search is), and it must never look like the world's home — the material lives
 * on compositions, and this is an index into them.
 */

const PAGE = 40;

type Scope = "active" | "archived" | "all";

const SCOPES: readonly { value: Scope; label: string }[] = [
  { value: "active", label: "In the world" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "Everything" }
];

const MATURITIES: readonly { value: Maturity | null; label: string }[] = [
  { value: null, label: "Any" },
  { value: "pencil", label: "Pencil" },
  { value: "ink", label: "Ink" }
];

/**
 * How an entry names itself.
 *
 * Shared with the Finder on purpose: a thing must read the same way wherever
 * Relic offers it, or the GM has to learn two vocabularies for one world.
 */
export function EntryIdentity({ entry }: { entry: WorldEntry }) {
  const kinds = entry.kinds.length > 0 ? entry.kinds : null;

  // An object nobody has named is called by its first line, so a Fragment's
  // prose begins with the name it is already being shown under — and a named
  // thing is often written about starting with its own name. Say the rest of
  // the sentence, or nothing.
  const rest = entry.snippet.startsWith(entry.ref.label)
    ? entry.snippet.slice(entry.ref.label.length).replace(/^[\s,;:.—–-]+/, "")
    : entry.snippet;

  return (
    <span className={styles.entryIdentity}>
      <span className={styles.entryHead}>
        <span className={styles.entryName} data-unnamed={entry.ref.label === "Unnamed" || undefined}>
          {entry.ref.label}
        </span>

        {/* Every way it is understood, not only the first — an object that is a
            Place and a Faction is one thing seen twice, and hiding half of that
            here would make the index disagree with the object. */}
        {kinds ? (
          <span className={styles.entryKinds}>
            {kinds.map((kind) => (
              <span key={kind} className={styles.entryKind}>
                {kind}
              </span>
            ))}
          </span>
        ) : (
          <span className={styles.entryKind} data-loose="true">
            fragment
          </span>
        )}

        {/* Maturity reads through a word and a mark, never colour alone. */}
        <span className={styles.entryMaturity} data-maturity={entry.maturity}>
          <span aria-hidden="true">{entry.maturity === "ink" ? "◆" : "✎"}</span>{" "}
          {entry.maturity === "ink" ? "Ink" : "Pencil"}
        </span>

        {entry.lifecycle === "archived" ? (
          <span className={styles.entryArchived}>archived</span>
        ) : null}
      </span>

      {rest ? <span className={styles.entrySnippet}>{rest}</span> : null}
    </span>
  );
}

export function Library({
  store,
  controls,
  compositionName,
  onArrive,
  onClose
}: {
  store: DeskStore;
  controls: SurfaceControlsRef;
  /** What retrieving something will put it on. Named, so the act is not a guess. */
  compositionName: string;
  onArrive: (cardIds: readonly CardId[]) => void;
  onClose: () => void;
}) {
  const { search, pullIn } = store;

  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<readonly KindFilter[]>([]);
  const [maturity, setMaturity] = useState<Maturity | null>(null);
  const [scope, setScope] = useState<Scope>("active");

  const [entries, setEntries] = useState<readonly WorldEntry[]>([]);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const field = useRef<HTMLInputElement>(null);
  // Every request carries a ticket; only the newest may write. Filters change
  // faster than round trips finish, and a stale answer overwriting a fresh one
  // is the classic way a search box starts lying.
  const ticket = useRef(0);

  useEffect(() => {
    field.current?.focus();
  }, []);

  const load = useCallback(
    async (offset: number) => {
      const mine = ++ticket.current;
      if (offset === 0) setLoading(true);
      const found = await search({
        query,
        kinds,
        maturity,
        include: scope,
        limit: PAGE,
        offset
      });
      if (ticket.current !== mine) return;
      setEntries((current) => (offset === 0 ? found : [...current, ...found]));
      setMore(found.length === PAGE);
      setLoading(false);
    },
    [kinds, maturity, query, scope, search]
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(0), query === "" ? 0 : 140);
    return () => clearTimeout(timer);
  }, [load, query]);

  const toggleKind = (kind: KindFilter) => {
    setKinds((current) =>
      current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind]
    );
  };

  const toggleChosen = (entry: WorldEntry) => {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(entry.ref.objectId)) next.delete(entry.ref.objectId);
      else next.add(entry.ref.objectId);
      return next;
    });
  };

  /**
   * Retrieval. One intent, one change set, whether it is one thing or nine.
   *
   * Archived material is restored by this and the button says so — pulling
   * something back onto a composition is the deliberate act that returns it to
   * the world, and the GM should read that before they do it, not afterwards.
   */
  const bringIn = async (refs: readonly WorldEntry[]) => {
    if (refs.length === 0 || working) return;
    setWorking(true);
    const landed = await pullIn(
      refs.map((entry) => entry.ref),
      controls.current?.landing() ?? { x: 0, y: 0 }
    );
    setWorking(false);
    setChosen(new Set());
    if (landed.length > 0) onArrive(landed);
    onClose();
  };

  const reveal = (entry: WorldEntry) => {
    if (!entry.cardHere) return;
    onArrive([entry.cardHere]);
    onClose();
  };

  return (
    <section
      className={styles.library}
      aria-label="Library"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className={styles.libraryHead}>
        <div className={styles.libraryTitles}>
          <h1 className={styles.libraryTitle}>Library</h1>
          <p className={styles.librarySub}>
            Everything in this world, wherever it sits. What you bring in is placed on{" "}
            <strong>{compositionName}</strong> as a reference — nothing is copied or moved.
          </p>
        </div>
        <button type="button" className={styles.ghostAction} onClick={onClose}>
          Back to the desk
        </button>
      </header>

      <div className={styles.libraryControls}>
        <input
          ref={field}
          className={styles.libraryField}
          value={query}
          placeholder="Search names and prose"
          aria-label="Search this world"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className={styles.filterRow} role="group" aria-label="Kinds">
          {[...REPRESENTATION_KINDS, "unclassified" as const].map((kind) => (
            <button
              key={kind}
              type="button"
              className={styles.filterChip}
              aria-pressed={kinds.includes(kind)}
              onClick={() => toggleKind(kind)}
            >
              {kind === "unclassified" ? "fragments" : kind}
            </button>
          ))}
        </div>

        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Maturity</span>
          {MATURITIES.map((option) => (
            <button
              key={option.label}
              type="button"
              className={styles.filterChip}
              aria-pressed={maturity === option.value}
              onClick={() => setMaturity(option.value)}
            >
              {option.label}
            </button>
          ))}

          <span className={styles.filterLabel}>Scope</span>
          {SCOPES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={styles.filterChip}
              aria-pressed={scope === option.value}
              onClick={() => setScope(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.libraryBody}>
        {loading ? <p className={styles.libraryNote}>Looking…</p> : null}

        {!loading && entries.length === 0 ? (
          <p className={styles.libraryNote}>
            {query === ""
              ? "Nothing in this world answers to those filters yet."
              : `Nothing in this world matches “${query}”.`}
          </p>
        ) : null}

        <ul className={styles.entryList}>
          {entries.map((entry) => {
            const here = entry.cardHere !== null;
            return (
              <li
                key={entry.ref.objectId}
                className={styles.entryRow}
                data-chosen={chosen.has(entry.ref.objectId) || undefined}
                data-here={here || undefined}
              >
                <button
                  type="button"
                  className={styles.entryChoose}
                  aria-pressed={here ? undefined : chosen.has(entry.ref.objectId)}
                  onClick={() => (here ? reveal(entry) : toggleChosen(entry))}
                >
                  <EntryIdentity entry={entry} />
                </button>

                {here ? (
                  <span className={styles.entryHere}>
                    <span className={styles.entryHereMark}>on {compositionName}</span>
                    <button
                      type="button"
                      className={styles.ghostAction}
                      onClick={() => reveal(entry)}
                    >
                      Reveal
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.ghostAction}
                    disabled={working}
                    onClick={() => void bringIn([entry])}
                  >
                    {entry.lifecycle === "archived" ? "Restore" : "Bring in"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {more ? (
          <button
            type="button"
            className={styles.ghostAction}
            onClick={() => void load(entries.length)}
          >
            More
          </button>
        ) : null}
      </div>

      {/* Contextual, like every other batch action in Relic: it appears when
          there is something to do and goes away again afterwards. */}
      {chosen.size > 0 ? (
        <footer className={styles.libraryFoot}>
          <span className={styles.tally}>
            {chosen.size} {chosen.size === 1 ? "thing" : "things"} chosen
          </span>
          <button
            type="button"
            className={styles.ghostAction}
            onClick={() => setChosen(new Set())}
          >
            Clear
          </button>
          <button
            type="button"
            className={styles.primaryAction}
            disabled={working}
            onClick={() =>
              void bringIn(entries.filter((entry) => chosen.has(entry.ref.objectId)))
            }
          >
            Bring in {chosen.size === 1 ? "it" : `all ${chosen.size}`}
          </button>
        </footer>
      ) : null}
    </section>
  );
}
