"use client";

import { createContext, Fragment, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ClaimId, DeskCard, FieldValues, Link, ObjectRef, RelationshipId, StoryPosition, WorldObjectId } from "@/lib/world/model";
import { cardTitle, type Claim, type ClaimDef, type RepresentationKind } from "@/lib/world/model";
import { builtInTemplate, REPRESENTATION_KINDS } from "@/lib/world/templates";
import { claimKindLabel, objectField, objectFamily, objectMedia, objectProse, safeMediaUrl, FAMILY_LABELS } from "@/lib/world/object-presentation";
import { projectObject, type ProjectedObject, type ResolvedObjectSnapshot } from "@/lib/world/object-projection";
import { mechanicsFields, populatedMechanics } from "@/lib/world/mechanics-presentation";
import { ObjectGlyph, ObjectMedia, ObjectMaturity, Developments } from "./object-parts";
import { ObjectConnections } from "./object-connections";
import { ObjectPicker } from "./object-picker";
import { ProvenanceLine, TruthMark, WrittenLine } from "@/components/desk/truth";
import { CarriageIcon } from "@/components/carriage/carriage";
import { IconButton } from "@/components/ui/control";
import { FloatingSurface } from "@/components/ui/floating-surface";
import { MechanicsReference } from "./mechanics-reference";
import { WritingEditor } from "@/components/ui/text-editor";
import type { FocusNavigation, FocusSection, FocusView } from "./use-focus-history";
import type { DeskStore } from "@/components/desk/use-desk";
import styles from "./object-detail.module.css";

type DetailStore = DeskStore;

type ObjectDetailProps = {
  card: DeskCard;
  store: DetailStore;
  onClose: () => void;
  onFollow: (link: Link) => void;
  active?: boolean;
  navigation?: FocusNavigation;
  visitId?: number;
  initialView?: FocusView;
  onViewChange?: (view: FocusView) => void;
  snapshot?: ResolvedObjectSnapshot;
  onReturnToNow?: () => void;
  /** Compact is the right-docked dossier; full is the editorial Focus workspace. */
  mode?: "compact" | "full";
  onOpenFullFocus?: () => void;
  onModeChange?: (mode: "compact" | "full") => void;
};

const ReadOnlyFocus = createContext(false);
const InsideDisclosure = createContext(false);

function useEditReturn(editing: boolean) {
  const trigger = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(editing);
  useEffect(() => {
    if (wasEditing.current && !editing) trigger.current?.focus({ preventScroll: true });
    wasEditing.current = editing;
  }, [editing]);
  return trigger;
}

type SettlementPreview = Readonly<{
  claimOnly?: string;
  object: boolean;
  claims: readonly { claimId: ClaimId; truth: "ink"; observedVersion: number; value: string; kind: string; contested: boolean }[];
}>;

/**
 * The non-modal Focus projection used by Desk. Every edit is local to its
 * section, while the card remains the one stable identity behind the view.
 */
export function ObjectDetail({ card: current, store, onClose, onFollow, active = true, navigation, visitId, initialView, onViewChange, snapshot, onReturnToNow, mode = "full", onOpenFullFocus, onModeChange }: ObjectDetailProps) {
  const projected = useMemo(() => projectObject(current, snapshot), [current, snapshot]);
  const card = projected.card;
  const family = objectFamily(card);
  const [settledPreview, setSettledPreview] = useState<SettlementPreview | null>(null);
  const readOnly = projected.context.kind === "historical";
  const scroll = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const actionTrigger = useRef<HTMLButtonElement>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [section, setSection] = useState<FocusSection>(initialView?.section ?? "overview");
  const [expanded, setExpanded] = useState<readonly FocusSection[]>(initialView?.expanded ?? []);
  const remember = useRef(onViewChange);
  remember.current = onViewChange;
  const selectId = useId();
  const sectionTitle = family === "place" ? "Inhabitants & connections" : family === "source" ? "Linked material" : "Relationships";
  const allSections: { id: FocusSection; title: string; meta?: string }[] = [
    { id: "overview", title: family === "fragment" ? "Content" : "Overview" },
    ...(family === "thread" ? [{ id: "history" as const, title: "Story progression", meta: `${projected.developments.length} settled · ${projected.pendingDevelopments.length} pending` }] : []),
    ...(family === "source" ? [{ id: "record" as const, title: "Source record" }] : []),
    ...(family !== "fragment" && family !== "source" && claimDefinitions(family).length ? [{ id: "state" as const, title: family === "thread" ? "State & pressure" : "State & provenance", meta: `${projected.settledClaims.filter(claim => !claim.claimKind.startsWith("development")).length} settled · ${projected.pendingClaims.filter(claim => !claim.claimKind.startsWith("development")).length} pending` }] : []),
    { id: "relationships", title: sectionTitle, meta: `${card.links.filter(link => link.other.kind !== "source").length} connected` },
    ...(family === "character" ? [{ id: "mechanics" as const, title: "Mechanics", meta: objectField(card, "ruleset") || `${populatedMechanics(card).length} recorded fields` }] : []),
    ...(family !== "fragment" ? [{ id: "notes" as const, title: "GM notes", meta: "Private" }] : []),
    { id: "sources", title: "Sources & evidence", meta: `${card.links.filter(link => link.other.kind === "source").length} linked` },
    ...(family !== "thread" ? [{ id: "history" as const, title: "History", meta: `${projected.developments.length} settled · ${projected.pendingDevelopments.length} pending` }] : []),
    ...(family === "fragment" ? [{ id: "classify" as const, title: "Classify this thought" }] : [])
  ];
  // The dossier is a page/sheet projection. Keep pages meaningful and family
  // declared instead of exposing every full Focus block in a long accordion.
  const compactMeaningful = (id: FocusSection) => {
    if (id === "overview") return true;
    if (id === "state") return projected.settledClaims.length > 0 || projected.pendingClaims.length > 0;
    if (id === "relationships") return card.links.length > 0;
    if (id === "mechanics") return family === "character" && populatedMechanics(card).length > 0;
    if (id === "sources") return card.links.some(link => link.other.kind === "source") || Boolean(card.written);
    if (id === "history") return projected.developments.length > 0 || projected.pendingDevelopments.length > 0;
    if (id === "record") return family === "source";
    return false;
  };
  const sections = mode === "compact"
    ? allSections.filter((item, index, list) => compactMeaningful(item.id) && list.findIndex(candidate => candidate.id === item.id) === index)
    : allSections;
  useEffect(() => {
    if (!sections.some(item => item.id === section)) setSection("overview");
  }, [mode, section, sections]);
  const captureView = (nextSection = section, nextExpanded = expanded) => remember.current?.({ section: nextSection, expanded: nextExpanded, scrollTop: scroll.current?.scrollTop ?? 0 });
  const jump = (id: FocusSection) => {
    const next = id === "overview" || expanded.includes(id) ? expanded : [...expanded, id];
    setExpanded(next); setSection(id);
    requestAnimationFrame(() => {
      const target = scroll.current?.querySelector<HTMLElement>(`[data-focus-section="${id}"]`);
      if (scroll.current && target) scroll.current.scrollTop += target.getBoundingClientRect().top - scroll.current.getBoundingClientRect().top;
      target?.focus({ preventScroll: true });
      captureView(id, next);
    });
  };
  useLayoutEffect(() => {
    if (!active) return;
    const view = initialView ?? { section: "overview" as const, expanded: mode === "full" ? sections.filter(item => item.id !== "overview").map(item => item.id) : [], scrollTop: 0 };
    setSection(view.section); setExpanded(view.expanded);
    const frame = requestAnimationFrame(() => {
      if (!scroll.current) return;
      scroll.current.scrollTop = view.scrollTop;
      if (view.section !== "overview" && view.scrollTop === 0) {
        const target = scroll.current.querySelector<HTMLElement>(`[data-focus-section="${view.section}"]`);
        if (target) scroll.current.scrollTop += target.getBoundingClientRect().top - scroll.current.getBoundingClientRect().top;
      }
      panel.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
    // A visit is the restoration boundary, not an ordinary domain update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, visitId, mode]);

  const openSettlementPreview = (claimOnly?: ClaimId) => {
    const claims = card.claims
      .filter((claim) => claim.truthState !== "ink" && (!claimOnly || claim.id === claimOnly))
      .map((claim) => ({ claimId: claim.id, truth: "ink" as const, observedVersion: claim.version, value: claim.value, kind: claim.claimKind, contested: claim.truthState === "disputed" }));
    setSettledPreview({ claimOnly: claimOnly ? String(claimOnly) : undefined, object: !claimOnly && card.maturity !== "ink", claims });
  };

  useEffect(() => setSettledPreview(null), [card.objectId, readOnly]);

  return (
    <ReadOnlyFocus value={readOnly}><div hidden={settledPreview !== null && !readOnly}><aside ref={panel} tabIndex={-1} className={styles.panel} data-detail-panel={active && (!settledPreview || readOnly) || undefined} data-focus-mode={mode} data-object-id={card.objectId} data-object-family={family} data-read-only={readOnly || undefined} aria-label={`${mode === "compact" ? "Inspect" : "Focus"} ${FAMILY_LABELS[family]} details`} onKeyDown={(event) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && [",", "."].includes(event.key) && !(event.target as Element).closest("input, textarea, select, [contenteditable]")) {
        event.preventDefault(); event.stopPropagation();
        if (event.key === "," && navigation?.canBack) navigation.back();
        if (event.key === "." && navigation?.canForward) navigation.forward();
      }
      if (event.key === "Escape" && !event.defaultPrevented) { event.stopPropagation(); if (actionsOpen) setActionsOpen(false); else onClose(); }
    }}>
      <header className={styles.header}>
        <div className={styles.historyControls} role="group" aria-label="Focus navigation">
          <IconButton label="Back in Focus" title={navigation?.backLabel ? `Back to ${navigation.backLabel} (Alt+,)` : "Back in Focus (Alt+,)"} aria-keyshortcuts="Alt+," disabled={!navigation?.canBack} onClick={navigation?.back}><NavigationArrow/></IconButton>
          <IconButton label="Forward in Focus" title={navigation?.forwardLabel ? `Forward to ${navigation.forwardLabel} (Alt+.)` : "Forward in Focus (Alt+.)"} aria-keyshortcuts="Alt+." disabled={!navigation?.canForward} onClick={navigation?.forward}><NavigationArrow forward/></IconButton>
        </div>
        <div className={styles.headerIdentity}>
          <span className={styles.family}><ObjectGlyph family={family} />{FAMILY_LABELS[family]}</span>
          <ObjectMaturity card={card}/>
        </div>
        {!readOnly ? <IconButton ref={actionTrigger} label="Object actions" aria-expanded={actionsOpen} onClick={() => setActionsOpen(!actionsOpen)}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></IconButton> : null}
          <IconButton type="button" className={styles.close} onClick={onClose} label="Close" title="Close (Esc)">
            <CarriageIcon kind="close" />
          </IconButton>
      </header>
      {mode === "compact" && (onOpenFullFocus || onModeChange) ? <div className={styles.focusCta}><button type="button" className={styles.strongAction} onClick={() => { onOpenFullFocus?.(); onModeChange?.("full"); }}>Open full Focus <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10"/></svg></button></div> : null}
      {mode === "full" && onModeChange ? <div className={styles.focusCta}><button type="button" className={styles.quietAction} onClick={() => onModeChange("compact")}>Return to dossier</button></div> : null}
      <nav className={styles.sectionNav} aria-label="Focus sections"><label htmlFor={selectId}>Explore</label><select id={selectId} aria-label="Focus section" value={section} onChange={event => jump(event.target.value as FocusSection)}>{sections.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select><span className={styles.temporalLabel}>{readOnly && projected.context.kind === "historical" ? `As of ${projected.context.position.label || "earlier"}` : "Now"}</span></nav>
      {readOnly ? <div className={styles.historicalNotice}>Historical view · read only{onReturnToNow ? <button type="button" className={styles.quietAction} onClick={onReturnToNow}>Return to Now</button> : null}</div> : null}
      <div ref={scroll} className={styles.scroll} data-detail-scroll onScroll={() => {
        if (mode === "compact") { captureView(); return; }
        const top = scroll.current?.getBoundingClientRect().top ?? 0;
        const anchors = [...(scroll.current?.querySelectorAll<HTMLElement>("[data-focus-section]") ?? [])];
        const currentSection = [...anchors].reverse().find(node => node.getBoundingClientRect().top <= top + 56)?.dataset.focusSection as FocusSection || "overview";
        if (currentSection !== section) setSection(currentSection);
        captureView(currentSection);
      }}>
        <div hidden={mode === "compact" && section !== "overview"} data-focus-section="overview" tabIndex={-1} className={styles.overview}>
          <div className={family === "character" ? styles.characterIntro : styles.standardIntro}>
          {family !== "fragment" && objectMedia(card) ? <MediaSection card={card} store={store}/> : null}
          {family !== "fragment" ? <div className={styles.identity}><InlineName card={card} store={store}/>{family === "character" && projected.settledClaims.find(claim => claim.claimKind === "occupation") ? <p className={styles.identityContext}>{projected.settledClaims.find(claim => claim.claimKind === "occupation")!.value}</p> : null}{family === "place" && objectField(card, "category") ? <p className={styles.identityContext}>{objectField(card, "category")}</p> : null}{family === "source" && objectField(card, "sourceType") ? <p className={styles.identityContext}>{objectField(card, "sourceType")}</p> : null}</div> : null}
          {family === "source" ? <SourceOverview card={card}/> : null}
          <BodySection card={card} store={store}/>
          </div>
          {family === "character" && populatedMechanics(card).length ? <section className={styles.glanceMechanics}><MechanicsReference card={card} profile="glance" onFull={() => jump("mechanics")}/></section> : null}
          {family === "fragment" && objectMedia(card) ? <MediaSection card={card} store={store}/> : null}
          {!["fragment", "source"].includes(family) ? <StateSummary card={card} projected={projected} onInspect={() => jump("state")}/> : null}
          {family === "faction" || family === "artifact" || family === "event" ? <FamilyFocusSummary family={family} card={card} projected={projected}/> : null}
          {family === "character" ? <><FieldSection title="At the table" keys={[{ key: "portrayal", label: "Portrayal", kind: "longtext" }, { key: "quote", label: "Quote", kind: "longtext" }]} card={card} store={store}/></> : null}
          {family === "place" ? <FieldSection title="Atmosphere" keys={[{ key: "atmosphere", label: "Atmosphere", kind: "longtext" }, ...builtInTemplate("place").fields]} card={card} store={store}/> : null}
          {family === "source" ? <><p className={styles.evidenceNotice}>Evidence · interpretation remains separate from established story truth.</p><SourceReferenceActions card={card}/></> : null}
          {family === "thread" ? <><FieldSection title="Unresolved questions" keys={[{ key: "concerns", label: "Questions", kind: "longtext" }]} card={card} store={store}/>{projected.developments.length ? <section className={styles.latestDevelopment}><h2 className={styles.sectionTitle}>Latest development</h2><Developments items={projected.developments.slice(-1)}/><button type="button" className={styles.quietAction} onClick={() => jump("history")}>Explore story progression</button></section> : null}</> : null}
          {projected.settledLinks.length ? <RelationshipSummary links={projected.settledLinks} onFollow={onFollow} onInspect={() => jump("relationships")}/> : null}
        </div>
        {allSections.filter(item => item.id !== "overview").map(item => <FocusDisclosure key={item.id} id={item.id} title={item.title} meta={item.meta} hidden={mode === "compact" && (section !== item.id || !compactMeaningful(item.id))} open={mode === "full" || expanded.includes(item.id)} onToggle={open => {
          const next = open ? [...new Set([...expanded, item.id])] : expanded.filter(id => id !== item.id);
          setExpanded(next); captureView(section, next);
        }}>
          {item.id === "state" ? <ClaimsSection family={family} card={card} projected={projected} store={store} onPreviewEstablish={openSettlementPreview}/> : null}
          {item.id === "relationships" ? <ObjectConnections card={card} store={store} onFollow={onFollow} mode="relationships" readOnly={readOnly}/> : null}
          {item.id === "sources" ? <><ObjectConnections card={card} store={store} onFollow={onFollow} mode="sources" readOnly={readOnly}/>{card.written ? <WrittenLine written={card.written} onRestore={readOnly ? undefined : () => restoreWritten(card, store)}/> : null}</> : null}
          {item.id === "mechanics" ? <FieldSection title="Mechanics" keys={mechanicsFields(card)} card={card} store={store} collapsedWhenEmpty/> : null}
          {item.id === "notes" && card.representation ? <FieldSection title="GM notes" keys={[{ key: "gmNotes", label: "GM notes", kind: "longtext" }]} card={card} store={store}/> : null}
          {item.id === "notes" && !card.representation ? <p className={styles.emptyInset}>Keep this thought in its content; classify it when you need a richer record.</p> : null}
          {item.id === "history" ? <DevelopmentsSection card={card} projected={projected} store={store}/> : null}
          {item.id === "record" ? <FieldSection title="Source record" keys={[...builtInTemplate("source").fields, { key: "sourceType", label: "Type", kind: "text" }, { key: "origin", label: "Origin", kind: "text" }, { key: "sourceUrl", label: "Original URL", kind: "text" }, { key: "excerpt", label: "Excerpt", kind: "longtext" }, { key: "notes", label: "Notes", kind: "longtext" }]} card={card} store={store}/> : null}
          {item.id === "classify" ? <FragmentClassify card={card} store={store}/> : null}
        </FocusDisclosure>)}
        {!objectMedia(card) ? <MediaSection card={card} store={store}/> : null}
      </div>
      <FloatingSurface label="Object actions" open={actionsOpen} triggerRef={actionTrigger} onClose={() => setActionsOpen(false)}>
        <div className={styles.objectMenu}><p>Object maturity and story truth are separate choices.</p>
          {card.maturity === "ink" ? <button type="button" className={styles.quietAction} onClick={async () => { if (await store.settle(card.objectId, { maturity: "pencil" })) setActionsOpen(false); }}>Return object to Pencil</button> : null}
          {card.maturity !== "ink" || projected.pendingClaims.length ? <button type="button" className={styles.quietAction} onClick={() => { setActionsOpen(false); openSettlementPreview(); }}>Review & establish…</button> : <p>All recorded assertions are settled.</p>}
        </div>
      </FloatingSurface>
    </aside></div>{settledPreview && !readOnly ? <EstablishPreview card={card} store={store} preview={settledPreview} onDone={() => { setSettledPreview(null); requestAnimationFrame(() => actionTrigger.current?.focus({ preventScroll: true })); }}/> : null}</ReadOnlyFocus>
  );
}

function NavigationArrow({ forward = false }: { forward?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={forward ? "m10 5 7 7-7 7M17 12H4" : "m14 5-7 7 7 7M7 12h13"}/></svg>;
}

function FocusDisclosure({ id, title, meta, open, hidden, onToggle, children }: { id: FocusSection; title: string; meta?: string; open: boolean; hidden?: boolean; onToggle: (open: boolean) => void; children: ReactNode }) {
  return <details hidden={hidden} className={styles.disclosure} data-focus-section={id} tabIndex={-1} open={open} onToggle={event => { if (event.currentTarget.open !== open) onToggle(event.currentTarget.open); }}><summary><h2>{title}</h2>{meta ? <span>{meta}</span> : null}<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg></summary><div className={styles.disclosureBody}><InsideDisclosure value><>{children}</></InsideDisclosure></div></details>;
}

function StateSummary({ card, projected, onInspect }: { card: DeskCard; projected: ProjectedObject; onInspect: () => void }) {
  const family = objectFamily(card);
  const pending = projected.pendingClaims.filter(claim => claimDefinitions(family).some(def => def.key === claim.claimKind));
  const order = family === "character" ? ["status", "allegiance", "location", "disposition"] : family === "place" ? ["region", "status", "climate", "ruler"] : family === "thread" ? ["status", "next", "stakes", "narrative_pull"] : claimDefinitions(family).map(def => def.key);
  const claims = order.flatMap(key => projected.settledClaims.filter(claim => claim.claimKind === key)).slice(0, 4);
  if (!claims.length && !pending.length) return null;
  return <section className={styles.stateSummary} aria-label="At a glance"><dl>{claims.map(claim => <div key={claim.id}><dt>{claimKindLabel(claim.claimKind)}</dt><dd>{claim.value}</dd></div>)}</dl>{pending.length ? <button type="button" className={styles.pendingSummary} onClick={onInspect}>{pending.length} pending {pending.length === 1 ? "assertion" : "assertions"} · review</button> : null}<button type="button" className={styles.summaryAction} onClick={onInspect}>Inspect state & provenance <span aria-hidden="true">→</span></button></section>;
}

function FamilyFocusSummary({ family, card, projected }: { family: "faction" | "artifact" | "event"; card: DeskCard; projected: ProjectedObject }) {
  const claims = projected.settledClaims;
  const value = (key: string) => claims.find(claim => claim.claimKind === key)?.value ?? "";
  const rows = family === "faction"
    ? [["Agenda", value("goal")], ["Leader", value("leader")], ["Seat", value("seat")], ["Status", value("status")], ["Scale", objectField(card, "size")]]
    : family === "artifact"
      ? [["Held by", value("holder")], ["Location", value("location")], ["Origin", value("origin")], ["Rarity", objectField(card, "rarity")], ["Attunement", objectField(card, "attunement")]]
      : [["When", claims.find(claim => claim.story.label)?.story.label ?? "Story position not placed"], ["Where", value("location")], ["Who", value("participants")], ["Consequence", value("consequence")]];
  const present = rows.filter(([, item]) => item);
  if (!present.length) return null;
  const heading = family === "faction" ? "Goals & identity" : family === "artifact" ? "Object details" : "Occurrence";
  return <section className={styles.familySummary} aria-label={heading}><div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{heading}</h2><span className={styles.sectionNote}>{family === "event" ? "Story continuity" : "Current record"}</span></div><dl>{present.map(([label, item]) => <div key={label}><dt>{label}</dt><dd>{item}</dd></div>)}</dl></section>;
}

function RelationshipSummary({ links, onFollow, onInspect }: { links: readonly Link[]; onFollow: (link: Link) => void; onInspect: () => void }) {
  const unique = links.filter((link, index) => links.findIndex(other => other.other.objectId === link.other.objectId) === index);
  return <section className={styles.relationshipSummary} aria-label="Important connections"><div className={styles.sectionHead}><h2 className={styles.sectionTitle}>In this story</h2><button type="button" className={styles.quietAction} onClick={onInspect}>View all {unique.length}</button></div><div>{unique.slice(0, 3).map(link => <button type="button" key={link.other.objectId} onClick={() => onFollow(link)}><ObjectGlyph family={link.other.kind ?? "fragment"}/><span>{link.other.label}<small>{link.direction === "in" ? "Incoming · " : ""}{claimKindLabel(link.claimKind)}</small></span><span aria-hidden="true">→</span></button>)}</div></section>;
}

async function restoreWritten(card: DeskCard, store: DetailStore) {
  if (!card.written || card.written.superseded === null) return;
  await store.saveBody(card.cardId, card.written.superseded, card.bodyVersion);
}

function InlineName({ card, store }: { card: DeskCard; store: DetailStore }) {
  const readOnly = useContext(ReadOnlyFocus);
  const inputId = useId();
  const representation = card.representation;
  const [editing, setEditing] = useState(false);
  const editTrigger = useEditReturn(editing);
  const [draft, setDraft] = useState(representation?.label ?? "");
  const saved = useRef(representation?.label ?? "");
  const editVersion = useRef<number | undefined>(representation?.version);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  useEffect(() => {
    const next = representation?.label ?? "";
    if (!editing) { saved.current = next; setDraft(next); setStatus("idle"); }
  }, [card.objectId, representation?.id, representation?.label, editing]);
  if (!representation) return <h1 className={styles.title}>{cardTitle(card) || "Unwritten thought"}</h1>;
  const cancel = () => { setDraft(saved.current); setEditing(false); };
  const save = async () => {
    if (readOnly) return;
    if (draft === saved.current) { setEditing(false); return; }
    setStatus("saving");
    const ok = await store.editSheet(card.objectId, draft, representation.fields, editVersion.current);
    if (!ok) { setStatus("error"); return; }
    saved.current = draft;
    setEditing(false);
    setStatus("saved");
  };
  return editing ? (
    <div className={styles.nameEdit}>
      <label className={styles.visuallyHidden} htmlFor={inputId}>Name</label>
      <input id={inputId} className={styles.nameInput} value={draft} maxLength={200} disabled={status === "saving" || readOnly} onChange={(event) => setDraft(event.target.value)} autoFocus onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (status !== "saving") cancel(); } if (event.key === "Enter" && status !== "saving" && !readOnly) void save(); }} />
      <div className={styles.localActions}><button type="button" onClick={() => void save()} className={styles.strongAction} disabled={status === "saving" || readOnly}>{status === "saving" ? "Saving…" : "Save"}</button><button type="button" onClick={cancel} className={styles.quietAction} disabled={status === "saving"}>Cancel</button></div>
      {status === "error" ? <p className={styles.error} role="alert">Could not save this name. Your draft is still here.</p> : null}
    </div>
  ) : (
    <div className={styles.titleRow}><h1 className={styles.title}>{draft || representation.kind}</h1>{!readOnly ? <IconButton ref={editTrigger} label="Edit name" className={styles.contextEdit} onClick={() => { editVersion.current = representation.version; setStatus("idle"); setEditing(true); }}><ObjectGlyph family="edit"/></IconButton> : null}{status === "saved" ? <span className={styles.savedMessage} role="status">Saved</span> : null}</div>
  );
}

function BodySection({ card, store }: { card: DeskCard; store: DetailStore }) {
  const readOnly = useContext(ReadOnlyFocus);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(objectProse(card));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const original = useRef(objectProse(card));
  const imagePrefix = useRef("");
  const activeObject = useRef(card.objectId);
  const editBodyVersion = useRef(card.bodyVersion);
  useEffect(() => { activeObject.current = card.objectId; if (!editing) { setDraft(objectProse(card)); original.current = objectProse(card); setError(null); } }, [card.objectId, card.bodyVersion, editing]);
  const beginEdit = () => { editBodyVersion.current = card.bodyVersion; imagePrefix.current = /^!\[[^\]]*\]\([^\s)]+\)\s*/.exec(card.body)?.[0] ?? ""; setError(null); setEditing(true); };
  const save = async (nextDraft = draft) => {
    if (readOnly) return;
    if (nextDraft === original.current) { setEditing(false); return; }
    setError(null); setSaving(true);
    try {
      const ok = await store.saveBody(card.cardId, imagePrefix.current + nextDraft, editBodyVersion.current);
      if (activeObject.current !== card.objectId) return;
      if (!ok) { setError("Could not save this passage. Your draft is still here."); return; }
      if (activeObject.current !== card.objectId) return;
      original.current = nextDraft; setDraft(nextDraft); setEditing(false);
    } catch { if (activeObject.current === card.objectId) setError("Could not save this passage. Your draft is still here."); }
    finally { if (activeObject.current === card.objectId) setSaving(false); }
  };
  return (
    <DetailSection title={objectFamily(card) === "fragment" ? "Captured thought" : "Narrative"} editing={editing} onEdit={beginEdit} onSave={() => save(draft)} onCancel={() => { setDraft(original.current); setEditing(false); }} saving={saving}>
      {editing ? <WritingEditor value={draft} onDraftChange={setDraft} commitOnBlur={false} showCommitActions={false} ariaLabel="Narrative" rows={7} disabled={saving} error={error ?? undefined} helpText="Select text for emphasis, or choose a heading or list. Save when ready." onCommit={value => { setDraft(value); void save(value); }} onCancel={() => { setDraft(original.current); setEditing(false); }} /> : <RichText value={objectProse(card) || "The narrative is still unwritten."} empty={!objectProse(card)} />}
    </DetailSection>
  );
}

function RichText({ value, empty = false }: { value: string; empty?: boolean }) {
  const lines = value.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (/^\s*(?:[-*]|•)\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^\s*(?:[-*]|•)\s+/.test(lines[index] ?? "")) {
        items.push(<li key={`bullet-${index}`}>{inlineMarkup((lines[index] ?? "").replace(/^\s*(?:[-*]|•)\s+/, ""))}</li>);
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`}>{items}</ul>);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? "")) {
        items.push(<li key={`number-${index}`}>{inlineMarkup((lines[index] ?? "").replace(/^\s*\d+\.\s+/, ""))}</li>);
        index += 1;
      }
      blocks.push(<ol key={`numbered-${index}`}>{items}</ol>);
      continue;
    }
    const heading = line.match(/^\s*(#{1,3})\s+(.+)$/);
    if (heading) {
      const marker = heading[1] ?? "##";
      const content = heading[2] ?? "";
      const Tag = marker.length === 1 ? "h2" : marker.length === 2 ? "h3" : "h4";
      blocks.push(<Tag key={`heading-${index}`}>{inlineMarkup(content)}</Tag>);
    } else if (line.trim()) {
      blocks.push(<p key={`paragraph-${index}`}>{inlineMarkup(line)}</p>);
    } else {
      blocks.push(<span key={`break-${index}`} aria-hidden="true" className={styles.proseBreak}/>);
    }
    index += 1;
  }
  return <div className={[styles.richText, empty && styles.emptyProse].filter(Boolean).join(" ")}>{blocks}</div>;
}

function inlineMarkup(value: string): ReactNode[] {
  const parts = value.split(/(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if ((part.startsWith("_") && part.endsWith("_")) || (part.startsWith("*") && part.endsWith("*"))) return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function FieldSection({ title, note, keys, card, store, collapsedWhenEmpty = false }: { title: string; note?: string; keys: readonly { key: string; label: string; kind?: "text" | "longtext" | "number" }[]; card: DeskCard; store: DetailStore; collapsedWhenEmpty?: boolean }) {
  const readOnly = useContext(ReadOnlyFocus);
  const representation = card.representation!;
  const seed = useMemo(() => ({ ...representation.fields }), [representation.id, representation.version]);
  const [editing, setEditing] = useState(false);
  const editTrigger = useEditReturn(editing);
  const [draft, setDraft] = useState<FieldValues>(seed);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const editVersion = useRef<number | undefined>(representation.version);
  useEffect(() => { if (!editing) setDraft(seed); }, [seed, editing]);
  const visible = editing ? keys : keys.filter((field) => String(seed[field.key] ?? "").trim() !== "");
  const beginEdit = () => { editVersion.current = representation.version; setStatus("idle"); setEditing(true); };
  const save = async () => { if (readOnly) return; setStatus("saving"); const ok = await store.editSheet(card.objectId, representation.label ?? "", draft, editVersion.current); if (!ok) { setStatus("error"); return; } setStatus("saved"); setEditing(false); };
  if (!editing && visible.length === 0) return <section className={styles.compactSection} aria-label={title}><div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{title}</h2>{!readOnly ? <button ref={editTrigger} type="button" className={styles.editAction} onClick={beginEdit}>Add {title === "GM notes" ? "notes" : title === "Mechanics" ? "mechanics" : "detail"}</button> : null}</div>{collapsedWhenEmpty ? <p className={styles.empty}>No mechanics recorded.</p> : null}</section>;
  return <DetailSection title={title} note={note} editing={editing} onEdit={beginEdit} onSave={() => void save()} onCancel={() => { setDraft(seed); setEditing(false); setStatus("idle"); }} saving={status === "saving"} error={status === "error" ? "Could not save this section. Your draft is still here." : null}>
    {title === "Mechanics" && !editing ? <MechanicsReference card={card}/> : <div className={styles.fieldList}>{visible.map((field) => <label className={styles.fieldRow} key={field.key} data-long={field.kind === "longtext" || field.key === "quote" || undefined}><span>{field.label}</span>{editing ? (field.kind === "longtext" ? <textarea rows={3} value={String(draft[field.key] ?? "")} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}/> : <input type={field.kind === "number" ? "number" : "text"} step={field.kind === "number" ? "any" : undefined} value={String(draft[field.key] ?? "")} onChange={(event) => setDraft({ ...draft, [field.key]: field.kind === "number" && event.target.value !== "" ? Number(event.target.value) : event.target.value })}/>) : <strong>{String(draft[field.key] ?? "") || <em>Not added</em>}</strong>}</label>)}</div>}{status === "saved" ? <p className={styles.savedMessage} role="status">Saved</p> : null}
  </DetailSection>;
}

function MediaSection({ card, store }: { card: DeskCard; store: DetailStore }) {
  const readOnly = useContext(ReadOnlyFocus);
  const representation = card.representation;
  const media = objectMedia(card);
  const [editing, setEditing] = useState(false);
  const editTrigger = useEditReturn(editing);
  const [draft, setDraft] = useState<FieldValues>({ image: objectField(card, "image"), imageAlt: objectField(card, "imageAlt"), imagePosition: objectField(card, "imagePosition") });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const editVersion = useRef<number | undefined>(representation?.version);
  useEffect(() => { if (!editing) setDraft({ image: objectField(card, "image"), imageAlt: objectField(card, "imageAlt"), imagePosition: objectField(card, "imagePosition") }); }, [card.objectId, representation?.version, editing]);
  const save = async () => {
    if (readOnly) return;
    if (!representation) return;
    if (String(draft.image ?? "").trim() && !safeMediaUrl(String(draft.image))) { setStatus("error"); return; }
    setStatus("saving");
    const ok = await store.editSheet(card.objectId, representation.label ?? "", { ...representation.fields, ...draft }, editVersion.current);
    if (!ok) { setStatus("error"); return; }
    setStatus("saved"); setEditing(false);
  };
  if (!representation) return <FragmentMedia card={card} store={store}/>;
  const beginEdit = () => { editVersion.current = representation?.version; setStatus("idle"); setEditing(true); };
  if (!media && !editing) return readOnly ? null : <section className={styles.compactSection}><button ref={editTrigger} type="button" className={styles.editAction} onClick={beginEdit}>Add image</button></section>;
  return <section className={styles.mediaHero}>
    {media ? <ObjectMedia card={card} className={styles.media} /> : null}
    {!readOnly && !editing ? <IconButton ref={editTrigger} className={styles.imageEdit} label={media ? "Edit image" : "Add image"} onClick={beginEdit}><ObjectGlyph family="edit"/></IconButton> : null}
    {editing ? <fieldset className={styles.mediaEditor} disabled={status === "saving"} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (status !== "saving") { setEditing(false); setStatus("idle"); } } }}><label>URL<input value={String(draft.image ?? "")} onChange={(event) => setDraft({ ...draft, image: event.target.value })} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setEditing(false); setStatus("idle"); } }} /></label><label>Alt text<input value={String(draft.imageAlt ?? "")} onChange={(event) => setDraft({ ...draft, imageAlt: event.target.value })} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setEditing(false); setStatus("idle"); } }} /></label><label>Position<input value={String(draft.imagePosition ?? "50% 35%")} onChange={(event) => setDraft({ ...draft, imagePosition: event.target.value })} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setEditing(false); setStatus("idle"); } }} /></label><div className={styles.localActions}><button type="button" className={styles.strongAction} disabled={status === "saving"} onClick={() => void save()}>{status === "saving" ? "Saving…" : "Save"}</button><button type="button" className={styles.quietAction} disabled={status === "saving"} onClick={() => { setEditing(false); setStatus("idle"); }}>Cancel</button></div>{status === "error" ? <p className={styles.error} role="alert">Could not save this image. Your draft is still here.</p> : null}</fieldset> : null}
    {!editing && status === "saved" ? <p className={styles.savedMessage}>Saved</p> : null}
  </section>;
}

function FragmentMedia({ card, store }: { card: DeskCard; store: DetailStore }) {
  const readOnly = useContext(ReadOnlyFocus);
  const media = objectMedia(card);
  const [editing, setEditing] = useState(false);
  const editTrigger = useEditReturn(editing);
  const [url, setUrl] = useState(media?.src ?? "");
  const [alt, setAlt] = useState(media?.alt ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const observed = useRef(card.bodyVersion);
  const begin = () => { setUrl(media?.src ?? ""); setAlt(media?.alt ?? ""); observed.current = card.bodyVersion; setError(""); setEditing(true); };
  const save = async () => {
    if (readOnly) return;
    const safe = url.trim() ? safeMediaUrl(url) : undefined;
    if (url.trim() && !safe) { setError("Use an http or https image URL, or a path beginning with /."); return; }
    setSaving(true);
    const prose = objectProse(card);
    const body = safe ? `![${alt.replace(/[\[\]\r\n]/g, " ")}](${safe.replace(/\s/g, encodeURIComponent)})\n${prose}` : prose;
    const ok = await store.saveBody(card.cardId, body, observed.current);
    setSaving(false);
    if (ok) setEditing(false); else setError("Could not save the image. Your choices are still here.");
  };
  return <section className={media ? styles.mediaHero : styles.compactSection}>
    {media ? <ObjectMedia card={card} className={styles.media}/> : null}
    <div className={styles.mediaCaption}>{!editing && !readOnly ? <button ref={editTrigger} type="button" className={styles.editAction} onClick={begin}>{media ? "Edit image" : "Add image"}</button> : null}</div>
    {editing ? <fieldset className={styles.mediaEditor} disabled={saving} onKeyDown={event => { if (event.key === "Escape" && !saving) { event.preventDefault(); event.stopPropagation(); setEditing(false); } }}>
      <legend className={styles.visuallyHidden}>Fragment image</legend>
      <label>Image URL<input value={url} onChange={event => setUrl(event.target.value)} autoFocus/></label>
      <label>Image description<input value={alt} onChange={event => setAlt(event.target.value)}/></label>
      <div className={styles.localActions}><button type="button" className={styles.strongAction} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</button><button type="button" className={styles.quietAction} onClick={() => setEditing(false)}>Cancel</button></div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </fieldset> : null}
  </section>;
}

function SourceReferenceActions({ card }: { card: DeskCard }) {
  const [message, setMessage] = useState("");
  const citation = objectField(card, "citation");
  const url = safeMediaUrl(objectField(card, "sourceUrl"));
  if (!citation && !url) return null;
  return <div className={styles.referenceActions}>
    {url ? <a href={url} target="_blank" rel="noopener noreferrer">Open original source</a> : null}
    {citation ? <button type="button" className={styles.quietAction} onClick={async () => { try { await navigator.clipboard.writeText(citation); setMessage("Citation copied"); } catch { setMessage("Select the citation below to copy it."); } }}>Copy citation</button> : null}
    {message ? <span role="status">{message}</span> : null}
  </div>;
}

function SourceOverview({ card }: { card: DeskCard }) {
  return <section className={styles.sourceOverview} aria-label="Evidence and citation">
    {objectField(card, "citation") ? <p className={styles.citation}>{objectField(card, "citation")}</p> : null}
    <dl>{["origin", "page"].filter(key => objectField(card, key)).map(key => <div key={key}><dt>{key === "origin" ? "Provenance" : "Reference"}</dt><dd>{objectField(card, key)}</dd></div>)}</dl>
    {objectField(card, "excerpt") ? <blockquote>{objectField(card, "excerpt")}</blockquote> : null}
  </section>;
}

function ClaimsSection({ family, card, projected, store, onPreviewEstablish }: { family: string; card: DeskCard; projected: ProjectedObject; store: DetailStore; onPreviewEstablish: (claimId: Claim["id"]) => void }) {
  const readOnly = useContext(ReadOnlyFocus);
  const defs = claimDefinitions(family);
  if (defs.length === 0) return null;
  const settled = projected.settledClaims;
  const pending = projected.pendingClaims.filter(claim => defs.some(def => def.key === claim.claimKind));
  const present = defs.filter(def => settled.some(claim => claim.claimKind === def.key));
  const missing = defs.filter(def => !settled.some(claim => claim.claimKind === def.key) && !pending.some(claim => claim.claimKind === def.key));
  return <DetailSection title={family === "thread" ? "State & pressure" : "Current state"}>
    {present.length ? <div className={styles.claimList}><span className={styles.claimGroupLabel}>Settled now</span>{present.map(def => <ClaimEditor key={`settled-${def.key}`} card={card} store={store} def={def} claim={settled.find(item => item.claimKind === def.key)} onPreviewEstablish={onPreviewEstablish}/>)}</div> : <p className={styles.empty}>No settled state recorded yet.</p>}
    {pending.length ? <div className={styles.pendingClaims}><span className={styles.claimGroupLabel}>Pending interpretation</span><div className={styles.claimList}>{pending.map(claim => <ClaimEditor key={claim.id} card={card} store={store} def={defs.find(def => def.key === claim.claimKind)!} claim={claim} onPreviewEstablish={onPreviewEstablish}/>)}</div></div> : null}
    {missing.length && !readOnly ? <details className={styles.optionalDetails}><summary>Add an attribute</summary><div className={styles.claimList}>{missing.map(def => <ClaimEditor key={def.key} card={card} store={store} def={def} onPreviewEstablish={onPreviewEstablish}/>)}</div></details> : null}
  </DetailSection>;
}

function claimDefinitions(family: string): readonly ClaimDef[] {
  const base = family === "fragment" ? [] : builtInTemplate(family as RepresentationKind).claims;
  const seen = new Set<string>();
  return base.filter((def) => !seen.has(def.key) && Boolean(seen.add(def.key)));
}

function ClaimEditor({ card, store, def, claim, onPreviewEstablish }: { card: DeskCard; store: DetailStore; def: ClaimDef; claim?: Claim; onPreviewEstablish: (claimId: Claim["id"]) => void }) {
  const readOnly = useContext(ReadOnlyFocus);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(claim?.value ?? "");
  const saved = useRef(claim?.value ?? "");
  const editClaim = useRef<{ claimId: Claim["id"]; version: number; relationshipId?: RelationshipId | null } | undefined>(undefined);
  const [revising, setRevising] = useState(false);
  const editTrigger = useEditReturn(editing || revising);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [validation, setValidation] = useState("");
  useEffect(() => { const next = claim?.value ?? ""; if (!editing && !revising) setDraft(next); saved.current = next; }, [claim?.id, claim?.value, editing, revising]);
  const commit = async (value = draft, target?: ObjectRef) => {
    if (readOnly) return;
    const next = value.trim();
    setValidation("");
    if (next === saved.current && (!target || target.objectId === claim?.objectValue)) {
      setStatus("idle"); setEditing(false); setRevising(false); return;
    }
    if (!next && revising) {
      setValidation("Use Withdraw under Provenance & decisions to withdraw a settled assertion.");
      setStatus("error"); return;
    }
    setStatus("saving");
    if (!next) {
      if (!claim) { setStatus("idle"); setEditing(false); return; }
      if (!(await store.retract(card.objectId, claim.id, editClaim.current?.version ?? claim.version))) { setStatus("error"); return; }
      saved.current = ""; setStatus("idle"); setEditing(false); return;
    }
    if (!(await store.assert(card.objectId, def.key, next, target ?? null, undefined, editClaim.current))) { setStatus("error"); return; }
    saved.current = next; setStatus("idle"); setEditing(false); setRevising(false);
  };
  const cancel = () => { setDraft(saved.current); setEditing(false); setRevising(false); setStatus("idle"); };
  return <div className={styles.claimRow} data-claim-kind={def.key}>
    <div className={styles.claimLabel}><span>{def.label}</span>{claim && claim.truthState !== "ink" ? <TruthMark state={claim.truthState}/> : null}</div>
    {editing || revising ? <div className={styles.claimEdit}>
      {revising ? <p className={styles.sectionNote}>This replaces the assertion with a pending revision. Review it before establishing.</p> : null}
      <textarea rows={def.key === "open_question" || def.key === "narrative_pull" ? 2 : 1} value={draft} onChange={event => setDraft(event.target.value)} disabled={status === "saving"} aria-label={def.label} autoFocus onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (status !== "saving") cancel(); }
        if (event.key === "Enter" && !event.shiftKey && status !== "saving" && def.key !== "open_question" && def.key !== "narrative_pull") { event.preventDefault(); void commit(); }
      }}/>
      {def.relational ? <Suggestions query={draft} subject={card.objectId} store={store} onPick={ref => { setDraft(ref.label); void commit(ref.label, ref); }}/> : null}
      <div className={styles.localActions}><button type="button" className={styles.quietAction} disabled={status === "saving"} onClick={cancel}>Cancel</button><button type="button" className={styles.strongAction} onClick={() => void commit()} disabled={status === "saving"}>{status === "saving" ? "Saving…" : revising ? "Save revision" : "Save"}</button></div>
      {status === "error" ? <p className={styles.error} role="alert">{validation || "Could not save this assertion. Your draft is still here."}</p> : null}
    </div> : <div className={styles.claimRead}><span>{claim?.value || <em>Not added</em>}</span>{!readOnly ? <button ref={editTrigger} type="button" className={styles.editAction} aria-label={`${claim?.truthState === "ink" ? "Revise" : "Edit"} ${def.label.toLowerCase()}`} onClick={() => {
      editClaim.current = claim ? { claimId: claim.id, version: claim.version, relationshipId: claim.relationshipId ?? null } : undefined;
      if (claim?.truthState === "ink") setRevising(true); else setEditing(true);
    }}>{claim?.truthState === "ink" ? "Revise" : claim ? "Edit" : "Add"}</button> : null}</div>}
    {claim ? <details className={styles.claimProvenance}><summary>Provenance & decisions</summary><div className={styles.claimMeta}>
      <ProvenanceLine provenance={claim.provenance} settled={claim.settled} truth={claim.truthState}/>
      {!readOnly ? claim.truthState === "ink" ? <button type="button" className={styles.quietAction} onClick={() => void store.settle(card.objectId, { claims: [{ claimId: claim.id, truth: "pencil", observedVersion: claim.version }] })}>Withdraw</button> : <><button type="button" className={styles.strongAction} onClick={() => onPreviewEstablish(claim.id)}>Establish</button><button type="button" className={styles.quietAction} onClick={() => void store.settle(card.objectId, { claims: [{ claimId: claim.id, truth: claim.truthState === "disputed" ? "pencil" : "disputed", observedVersion: claim.version }] })}>{claim.truthState === "disputed" ? "Undispute" : "Dispute"}</button></> : null}
    </div></details> : null}
  </div>;
}

function Suggestions({ query, subject, store, onPick }: { query: string; subject: WorldObjectId; store: DetailStore; onPick: (ref: ObjectRef) => void }) {
  const [matches, setMatches] = useState<readonly ObjectRef[]>([]);
  useEffect(() => { const text = query.trim(); if (text.length < 2) { setMatches([]); return; } let live = true; const timer = setTimeout(async () => { try { const found = await store.findObjects(text, subject); if (live) setMatches(found); } catch { if (live) setMatches([]); } }, 180); return () => { live = false; clearTimeout(timer); }; }, [query, store.findObjects, subject]);
  if (!matches.length) return null;
  return <div className={styles.suggestions} role="listbox" aria-label="Related world objects">{matches.slice(0, 4).map((ref) => <button type="button" role="option" aria-selected="false" key={ref.objectId} onMouseDown={(event) => event.preventDefault()} onClick={() => onPick(ref)}>{ref.label}{ref.kind ? <small>{FAMILY_LABELS[ref.kind]}</small> : null}</button>)}</div>;
}

function DevelopmentsSection({ card, projected, store }: { card: DeskCard; projected: ProjectedObject; store: DetailStore }) {
  const readOnly = useContext(ReadOnlyFocus);
  const [adding, setAdding] = useState(false);
  const [summary, setSummary] = useState("");
  const [label, setLabel] = useState("");
  const [event, setEvent] = useState<ObjectRef | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const add = async () => {
    if (readOnly) return;
    const text = summary.trim(); if (!text) return;
    const story: StoryPosition = { order: null, precision: label.trim() ? "relative" : "unknown", label: label.trim() || null };
    setStatus("saving");
    if (!(await store.assert(card.objectId, `development:${crypto.randomUUID()}`, text, event, story))) { setStatus("error"); return; }
    setSummary(""); setLabel(""); setEvent(null); setAdding(false); setStatus("idle");
  };
  return <DetailSection title="Developments" note="Meaningful turns in the story">
    <Developments items={projected.developments}/>
    {projected.pendingDevelopments.length ? <div className={styles.pendingBlock}><span className={styles.pendingLabel}>Pending interpretation</span><Developments items={projected.pendingDevelopments}/></div> : null}
    {adding ? <fieldset className={styles.addForm} disabled={status === "saving"} onKeyDown={key => { if (key.key === "Escape" && !key.defaultPrevented && status !== "saving") { key.preventDefault(); key.stopPropagation(); setAdding(false); } }}>
      <legend className={styles.visuallyHidden}>New development</legend>
      <label>What changed?<textarea rows={3} value={summary} onChange={event => setSummary(event.target.value)} autoFocus/></label>
      <label>Story position<input value={label} placeholder="e.g. after the winter siege" onChange={event => setLabel(event.target.value)}/></label>
      <ObjectPicker store={store} subject={card.objectId} label="Connected Event (optional)" kinds={["event"]} value={event} onChange={setEvent}/>
      <p className={styles.empty}>Uncertain timing can stay uncertain. This development remains pending until established.</p>
      <div className={styles.localActions}><button type="button" className={styles.strongAction} onClick={() => void add()} disabled={!summary.trim()}>{status === "saving" ? "Saving…" : "Add development"}</button><button type="button" className={styles.quietAction} onClick={() => setAdding(false)}>Cancel</button></div>
      {status === "error" ? <p className={styles.error} role="alert">Could not add this development. Your draft is still here.</p> : null}
    </fieldset> : !readOnly ? <button type="button" className={styles.addAction} onClick={() => { setStatus("idle"); setAdding(true); }}>Add development</button> : null}
  </DetailSection>;
}

function FragmentClassify({ card, store }: { card: DeskCard; store: DetailStore }) {
  const readOnly = useContext(ReadOnlyFocus);
  if (readOnly) return null;
  return <DetailSection title="Classify" note="keeps this identity"><p className={styles.empty}>A Fragment does not need a title or classification before it is useful.</p><div className={styles.kindGrid}>{REPRESENTATION_KINDS.map((kind) => <button type="button" key={kind} className={styles.kindButton} onClick={() => store.represent(card.objectId, kind, cardTitle(card).slice(0, 200))}>{builtInTemplate(kind).name}</button>)}</div></DetailSection>;
}

function DetailSection({ title, note, children, editing, onEdit, onSave, onCancel, saving, error }: { title: string; note?: string; children: ReactNode; editing?: boolean; onEdit?: () => void; onSave?: () => void | Promise<void>; onCancel?: () => void; saving?: boolean; error?: string | null }) {
  const readOnly = useContext(ReadOnlyFocus);
  const editTrigger = useEditReturn(Boolean(editing));
  const insideDisclosure = useContext(InsideDisclosure);
  return <section className={styles.section} aria-label={title} aria-busy={saving || undefined} onKeyDown={event => {
    if (event.key === "Escape" && editing) { event.preventDefault(); event.stopPropagation(); if (!saving) onCancel?.(); }
    if (editing && (event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); if (!saving) void onSave?.(); }
  }}>
    <div className={styles.sectionHead} data-inside-disclosure={insideDisclosure || undefined}><div><h2 className={insideDisclosure ? styles.visuallyHidden : styles.sectionTitle}>{title}</h2>{note ? <p className={styles.sectionNote}>{note}</p> : null}</div>
      {onEdit && !editing && !readOnly ? <IconButton ref={editTrigger} label={`Edit ${title.toLowerCase()}`} className={styles.contextEdit} onClick={onEdit}><ObjectGlyph family="edit"/></IconButton> : null}
    </div>
    {editing ? <fieldset className={styles.sectionFields} disabled={saving || readOnly} aria-label={`${title} editing`}>{children}</fieldset> : children}
    {editing && !readOnly ? <div className={styles.localActions}><button type="button" className={styles.quietAction} onClick={onCancel} disabled={saving}>Cancel</button><button type="button" className={styles.strongAction} onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button><span className={styles.commitHint}>Ctrl/⌘ + Enter to save</span></div> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </section>;
}

function EstablishPreview({ card, store, preview, onDone }: { card: DeskCard; store: DetailStore; preview: SettlementPreview; onDone: () => void }) {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => { root.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }); }, []);
  const [object, setObject] = useState(preview.object);
  const [chosen, setChosen] = useState(() => new Set(preview.claims.filter(claim => !claim.contested).map((claim) => claim.claimId)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = (object ? 1 : 0) + chosen.size;
  const visiblePending = preview.claims;
  const confirm = async () => {
    setSaving(true); setError(null);
    const missing = preview.claims.some((claim) => chosen.has(claim.claimId) && !card.claims.some((current) => current.id === claim.claimId));
    if (missing) { setSaving(false); setError("A previewed assertion changed or was removed. Review it again before establishing."); return; }
    if (!(await store.settle(card.objectId, { maturity: object ? "ink" : null, claims: preview.claims.filter((claim) => chosen.has(claim.claimId)).map(({ claimId, truth, observedVersion }) => ({ claimId, truth, observedVersion })) }))) { setSaving(false); setError("Could not establish this change. Nothing was changed."); return; }
    onDone();
  };
  return <aside ref={root} className={styles.panel} data-detail-panel aria-label="Preview establishing" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!saving) onDone(); }
  }}>
    <header className={styles.header}>
      <div className={styles.headerTop}><span className={styles.family}>Establish</span><IconButton type="button" className={styles.close} onClick={onDone} disabled={saving} label="Close"><CarriageIcon kind="close"/></IconButton></div>
      <h1 className={styles.title}>{cardTitle(card) || "this object"}</h1>
      <p className={styles.previewNote}>Review the assertions you want to establish. Object maturity is a separate choice.</p>
    </header>
    <div className={styles.scroll}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Establishing <span className={styles.sectionNote}>{count} selected</span></h2>
        {!preview.claimOnly ? <label className={styles.checkRow}><input type="checkbox" checked={object} disabled={saving} onChange={event => setObject(event.target.checked)}/> Object maturity: Ink</label> : null}
        {visiblePending.map(claim => <label key={claim.claimId} className={styles.checkRow}>
          <input type="checkbox" checked={chosen.has(claim.claimId)} disabled={saving} onChange={() => setChosen(current => {
            const next = new Set(current);
            if (next.has(claim.claimId)) next.delete(claim.claimId); else next.add(claim.claimId);
            return next;
          })}/>
          <span>{claimKindLabel(claim.kind)}: {claim.value}</span>
          {claim.contested ? <small>Contested — establishing settles the dispute.</small> : null}
        </label>)}
      </section>
    </div>
    <footer className={styles.footer}>
      <button type="button" className={styles.quietAction} onClick={onDone} disabled={saving}>Cancel</button>
      <button type="button" className={styles.strongAction} disabled={!count || saving} onClick={() => void confirm()}>{saving ? "Establishing…" : `Establish ${count} ${count === 1 ? "thing" : "things"}`}</button>
    </footer>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </aside>;
}

export default ObjectDetail;
