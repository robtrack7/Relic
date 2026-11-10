"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CardId, DeskView, KindFilter, Link, Maturity, WorldEntry, WorldObjectId } from "@/lib/world/model";
import { REPRESENTATION_KINDS } from "@/lib/world/templates";

import type { SurfaceControlsRef } from "./surface-controls";
import type { DeskStore } from "./use-desk";
import { EntityFocusVisit, EntityBuilderVisit } from "@/components/entities/entity-visits";
import { onEntityCommitted } from "@/components/entities/entity-session";
import type { FocusPageId } from "@/lib/world/entity-composition";
import { richPlainText, richText } from "@/lib/world/entity-document";
import { ObjectGlyph } from "@/components/world-objects/object-parts";
import { cardRef, cardTitle } from "@/lib/world/model";
import styles from "./desk.module.css";
import inspectionStyles from "./library-inspection.module.css";

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
export function EntryIdentity({ entry, showName = true, showSnippet = true }: { entry: WorldEntry; showName?: boolean; showSnippet?: boolean }) {
  const kinds = entry.kinds.length > 0 ? entry.kinds : null;

  // An object nobody has named is called by its first line, so a Fragment's
  // prose begins with the name it is already being shown under — and a named
  // thing is often written about starting with its own name. Say the rest of
  // the sentence, or nothing.
  const preview = richPlainText(richText(entry.snippet)).replace(/\s+/g, " ").trim();
  const rest = preview.startsWith(entry.ref.label)
    ? preview.slice(entry.ref.label.length).replace(/^[\s,;:.—–-]+/, "")
    : preview;

  return (
    <span className={styles.entryIdentity}>
      <span className={styles.entryHead}>
        {showName ? <span className={styles.entryName} data-unnamed={entry.ref.label === "Unnamed" || undefined}>
          {entry.ref.label}
        </span> : null}

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
          {entry.maturity === "ink" ? "Ink" : "Pencil"}
        </span>

        {entry.lifecycle === "archived" ? (
          <span className={styles.entryArchived}>archived</span>
        ) : null}
      </span>

      {showSnippet && rest ? <span className={styles.entrySnippet}>{rest}</span> : null}
    </span>
  );
}

export function Library({
  store,
  controls,
  compositionName,
  initialQuery,
  active = true,
  worldId, onInspectEntity, onBuildEntity, onCreateEntity, activeEntityId, onCloseInspection,
  onArrive,
  onClose
}: {
  store: DeskStore;
  worldId?: string;
  onInspectEntity?: (objectId: string) => void;
  onBuildEntity?: (objectId: string) => void;
  onCreateEntity?: () => void;
  onCloseInspection?: () => void;
  activeEntityId?: string | null;
  controls: SurfaceControlsRef;
  /** What retrieving something will put it on. Named, so the act is not a guess. */
  compositionName: string;
  /** Query carried over from the compact Finder, preserving the GM's trail. */
  initialQuery?: string;
  active?: boolean;
  onArrive: (cardIds: readonly CardId[]) => void;
  onClose: () => void;
}) {
  const { search, pullIn } = store;

  const [query, setQuery] = useState(initialQuery ?? "");
  const [kinds, setKinds] = useState<readonly KindFilter[]>([]);
  const [maturity, setMaturity] = useState<Maturity | null>(null);
  const [scope, setScope] = useState<Scope>("active");

  const [entries, setEntries] = useState<readonly WorldEntry[]>([]);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspected, setInspected] = useState<WorldEntry | null>(null);
  const [visits, setVisits] = useState<readonly string[]>([]);
  const [mode, setMode] = useState<"focus" | "builder">("focus");
  const [page, setPage] = useState<FocusPageId>("overview");
  const inspectionTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => { if (onInspectEntity && !activeEntityId) setInspected(null); }, [activeEntityId, onInspectEntity]);
  useEffect(() => onEntityCommitted(entity => {
    if (worldId && entity.worldId !== worldId) return;
    setEntries(current => {
      const label = entity.representation?.label || entity.body.split("\n")[0] || "Untitled fragment";
      const snippet = entity.body.replace(/\s+/g, " ").slice(0, 220);
      if (current.some(entry => entry.ref.objectId === entity.objectId)) return current.map(entry => entry.ref.objectId === entity.objectId ? { ...entry, ref: { ...entry.ref, label }, maturity: entity.maturity, snippet } : entry);
      const matches = (!query.trim() || `${label} ${entity.body}`.toLowerCase().includes(query.toLowerCase())) && (!kinds.length || kinds.includes(entity.representation?.kind ?? "unclassified")) && (!maturity || entity.maturity === maturity) && scope !== "archived" && entity.lifecycle === "active";
      return matches ? [{ ref: { objectId: entity.objectId, kind: entity.representation?.kind ?? null, label }, kinds: entity.representation ? [entity.representation.kind] : [], maturity: entity.maturity, snippet, lifecycle: entity.lifecycle, updatedAt: new Date().toISOString(), cardHere: null }, ...current] : current;
    });
  }), [worldId, query, kinds, maturity, scope]);

  const field = useRef<HTMLInputElement>(null);
  // Every request carries a ticket; only the newest may write. Filters change
  // faster than round trips finish, and a stale answer overwriting a fresh one
  // is the classic way a search box starts lying.
  const ticket = useRef(0);

  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => field.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [active]);

  // Finder can hand the Library a new query while the surface stays mounted
  // (for example after a responsive chrome transition). Keep that hand-off
  // authoritative without resetting ordinary typing on unrelated renders.
  useEffect(() => {
    setQuery(initialQuery ?? "");
  }, [initialQuery]);

  const load = useCallback(
    async (offset: number) => {
      const mine = ++ticket.current;
      if (offset === 0) setLoading(true);
      if (offset === 0) setError(null);
      try {
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
      } catch {
        if (ticket.current !== mine) return;
        if (offset === 0) setEntries([]);
        setMore(false);
        setError("The Library could not load. Try again.");
      } finally {
        if (ticket.current === mine) setLoading(false);
      }
    },
    [kinds, maturity, query, scope, search]
  );

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => void load(0), query === "" ? 0 : 140);
    return () => clearTimeout(timer);
  }, [active, load, query]);

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
    setError(null);
    try {
      const landed = await pullIn(
        refs.map((entry) => entry.ref),
        controls.current?.landing() ?? { x: 0, y: 0 }
      );
      if (!landed.length) throw new Error("No object could be placed.");
      setChosen(new Set());
      if (landed.length > 0) onArrive(landed);
      onClose();
    } catch {
      setError("That material could not be brought in. Try again.");
    } finally {
      setWorking(false);
    }
  };

  const reveal = (entry: WorldEntry) => {
    if (!entry.cardHere) return;
    onArrive([entry.cardHere]);
    onClose();
  };

  const closeInspection = () => {
    setInspected(null); onCloseInspection?.();
    requestAnimationFrame(() => inspectionTrigger.current?.focus({ preventScroll: true }));
  };
  const inspect = (entry: WorldEntry, depth: "focus" | "builder" = "focus") => {
    if (!inspected) inspectionTrigger.current = document.activeElement as HTMLElement;
    setInspected(entry); setMode(depth); setPage("overview");
    setVisits(current => current.includes(entry.ref.objectId) ? current : [...current, entry.ref.objectId]);
    if (depth === "builder") onBuildEntity?.(entry.ref.objectId); else onInspectEntity?.(entry.ref.objectId);
  };
  const follow = (id: string) => inspect({ ref: { objectId: id as WorldObjectId, label: "World entity", kind: null }, kinds: [], snippet: "", maturity: "pencil", lifecycle: "active", updatedAt: "", cardHere: null });

  return (
    <section
      className={`${styles.library} ${inspectionStyles.library}`}
      data-inspecting={inspected ? mode : undefined}
      aria-label="Library"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          if (inspected) closeInspection(); else onClose();
        }
      }}
    >
      <header className={styles.libraryHead} inert={Boolean(inspected && mode === "builder" && !onBuildEntity)}>
        <div className={styles.libraryTitles}>
          <h1 className={styles.libraryTitle}>Library</h1>
          <p className={styles.librarySub}>
            Everything in this world, wherever it sits. What you bring in is placed on{" "}
            <strong>{compositionName}</strong> as a reference — nothing is copied or moved.
          </p>
        </div>
        <div className={styles.entryActions}>{onCreateEntity ? <button type="button" className={styles.primaryAction} onClick={onCreateEntity}>Create entity</button> : null}<button type="button" className={styles.ghostAction} onClick={onClose}>Back to the desk</button></div>
      </header>

      <div className={styles.libraryControls} inert={Boolean(inspected && mode === "builder" && !onBuildEntity)}>
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

      <div className={styles.libraryBody} inert={Boolean(inspected && mode === "builder" && !onBuildEntity)}>
        <p className={inspectionStyles.indexSummary} role="status">{loading ? "Searching the world…" : `${entries.length}${more ? "+" : ""} ${entries.length === 1 ? "record" : "records"}`}<span>Inspect a page · open Builder to develop it</span></p>
        {loading ? <p className={styles.libraryNote}>Looking…</p> : null}

        {!loading && error ? <p className={styles.libraryNote} role="alert">{error}</p> : null}

        {!loading && !error && entries.length === 0 ? (
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
                  onClick={() => void inspect(entry, "builder")}
                >
                  <span className={inspectionStyles.indexIdentity}><ObjectGlyph family={entry.ref.kind ?? "fragment"}/><EntryIdentity entry={entry} /></span>
                </button>
                <span className={styles.entryActions}>
                    <button type="button" className={styles.ghostAction} aria-expanded={inspected?.ref.objectId === entry.ref.objectId} onClick={() => inspected?.ref.objectId === entry.ref.objectId ? closeInspection() : void inspect(entry)}>Inspect</button>
                    <button type="button" className={styles.ghostAction} onClick={() => void inspect(entry, "builder")}>Open in Builder</button>
                {here ? <>
                    <button
                      type="button"
                      className={styles.ghostAction}
                      onClick={() => reveal(entry)}
                    >
                      Reveal
                    </button>
                  </> : <>
                    <button type="button" className={inspectionStyles.chooseButton} aria-label={`Choose ${entry.ref.label} for placement`} aria-pressed={chosen.has(entry.ref.objectId)} onClick={() => toggleChosen(entry)}><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="3"/>{chosen.has(entry.ref.objectId) ? <path d="m6 10 3 3 5-6"/> : null}</svg></button>
                    <button
                      type="button"
                      className={styles.ghostAction}
                      disabled={working}
                      onClick={() => void bringIn([entry])}
                    >
                      {entry.lifecycle === "archived" ? "Restore" : "Bring in"}
                    </button>
                  </>}
                </span>
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

      {!onInspectEntity && worldId ? <div className={inspectionStyles.host}>
        {visits.map(objectId => <div key={objectId}>
          <div className={inspectionStyles.localFocus} hidden={!active || inspected?.ref.objectId !== objectId}><EntityFocusVisit worldId={worldId} objectId={objectId} active={active && inspected?.ref.objectId === objectId} page={page} onPageChange={setPage} onClose={closeInspection} onBuilder={() => setMode("builder")} onFollow={follow}/></div>
          <EntityBuilderVisit worldId={worldId} objectId={objectId} active={active && inspected?.ref.objectId === objectId && mode === "builder"} onClose={() => setMode("focus")} onFollow={follow}/>
        </div>)}
      </div> : null}

      {/* Contextual, like every other batch action in Relic: it appears when
          there is something to do and goes away again afterwards. */}
      {chosen.size > 0 ? (
        <footer className={styles.libraryFoot} inert={Boolean(inspected && mode === "builder" && !onBuildEntity)}>
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
