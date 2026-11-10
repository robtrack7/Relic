"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cardRef, cardTitle } from "@/lib/world/model";
import { add, EMPTY_SELECTION, only, type Selection } from "@/lib/desk/selection";
import type { Effect } from "@/lib/librarian/model";
import type {
  CardId,
  WorldObjectId,
  DeskView,
  Link,
  ObjectRef,
  Prep,
  Workspace
} from "@/lib/world/model";

import { DeskCanvas } from "./desk-canvas";
import { DeskStack } from "./desk-stack";
import { Finder } from "./finder";
import { Librarian } from "./librarian";
import { Library } from "./library";
import { EntityFocusVisit, EntityBuilderVisit } from "@/components/entities/entity-visits";
import { EntityCreation } from "@/components/entities/entity-creation";
import { entitySession, onEntityCommitted } from "@/components/entities/entity-session";
import type { FocusPageId } from "@/lib/world/entity-composition";
import { PrepRail, type PrepControls } from "./prep-rail";
import type { SurfaceControls } from "./surface-controls";
import { useDesk, type DeskStore } from "./use-desk";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { CanvasGlyph, ProfileControl, WorkspaceTopbar } from "@/components/canvas/canvas-controls";
import { CarriageEmpty, CarriageIcon, CarriageSection } from "@/components/carriage/carriage";
import { IconButton } from "@/components/ui/control";
import { FloatingSurface } from "@/components/ui/floating-surface";
import { WorldBar, type WorldNavigationRequest } from "./world-bar";
import { WorkspaceNavigation } from "@/components/workspace/workspace-navigation";
import type { CanvasObjectProposal, ObjectProposalExecutor } from "@/lib/world/object-proposal";
import styles from "./desk.module.css";

type Arrangement = "canvas" | "stack";

export function DeskSurface({
  workspace,
  initial,
  prep,
  proposals,
  onApplyProposal,
  onDismissProposal
}: {
  workspace: Workspace;
  initial: DeskView;
  /**
   * The session this composition prepares for, when it prepares for one.
   *
   * Null for the Desk and every Board. Prep is not a different surface — it is
   * this surface with a running order beside it, because Prep is the same world.
   */
  prep?: Prep | null;
  /** Supplied only by an authorized proposal runtime; selection never starts model work. */
  proposals?: readonly CanvasObjectProposal[];
  onApplyProposal?: ObjectProposalExecutor;
  onDismissProposal?: (proposalId: string) => void;
}) {
  const store = useDesk(initial);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [editing, setEditing] = useState<CardId | null>(null);
  const [entityFocusId, setEntityFocusId] = useState<string | null>(null);
  const [entityFocusRequest, setEntityFocusRequest] = useState(0);
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [entityVisits, setEntityVisits] = useState<readonly string[]>([]);
  const [entityPages, setEntityPages] = useState<Readonly<Record<string, FocusPageId>>>({});
  const [entityTrail, setEntityTrail] = useState<{ ids: readonly string[]; index: number }>({ ids: [], index: -1 });
  const focusOrigin = useRef<{ cardId: CardId | null; selection: Selection } | null>(null);
  const builderOrigin = useRef<{ focusId: string | null; page: FocusPageId } | null>(null);
  const lastFocus = useRef<string | null>(null);
  const [pendingFocusCard, setPendingFocusCard] = useState<CardId | null>(null);
  const focused = store.cards.find(card => card.objectId === entityFocusId) ?? null;
  const focusId = focused?.cardId ?? null;
  const openEntity = (objectId: string, page: FocusPageId = "overview", append = true, requestPreview = true) => {
    if (!entityFocusId) focusOrigin.current = { cardId: store.cards.find(card => card.objectId === objectId)?.cardId ?? null, selection: new Set(selection) };
    setEntityVisits(current => current.includes(objectId) ? current : [...current, objectId]);
    setEntityPages(current => ({ ...current, [objectId]: page }));
    setEntityFocusId(objectId); lastFocus.current = objectId;
    if (requestPreview) setEntityFocusRequest(current => current + 1);
    if (append) setEntityTrail(current => { const ids = [...current.ids.slice(0, current.index + 1), objectId]; return { ids, index: ids.length - 1 }; });
  };
  const openBuilder = (objectId: string) => {
    if (!builderId) builderOrigin.current = { focusId: entityFocusId, page: entityFocusId ? entityPages[entityFocusId] ?? "overview" : "overview" };
    setEntityVisits(current => current.includes(objectId) ? current : [...current, objectId]);
    setBuilderId(objectId); openEntity(objectId, entityPages[objectId] ?? "overview", true, false);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-entity-builder]')?.focus({ preventScroll: true }));
  };
  const setFocusId = (cardId: CardId | null, section?: import("@/components/world-objects/use-focus-history").FocusSection) => {
    if (!cardId) { setEntityFocusId(null); return; }
    const card = store.byId.get(cardId);
    if (!card) { setPendingFocusCard(cardId); return; }
    const page: FocusPageId = section === "state" ? "overview" : section === "record" ? "sources" : section === "classify" ? "overview" : section ?? "overview";
    openEntity(card.objectId, page);
  };
  const closeBuilder = () => {
    if (builderId) void entitySession(initial.worldId, builderId).flush();
    setBuilderId(null); setCreating(false);
    const origin = builderOrigin.current;
    if (origin?.focusId) openEntity(origin.focusId, origin.page, false); else setEntityFocusId(null);
    builderOrigin.current = null;
  };
  useEffect(() => onEntityCommitted(entity => {
    if (entity.worldId !== initial.worldId) return;
    const cards = store.cards.filter(card => card.objectId === entity.objectId).map(card => ({ ...card, body: entity.body, bodyVersion: entity.bodyVersion, representation: entity.representation, claims: entity.claims, links: entity.links, maturity: entity.maturity, settled: entity.settled, written: entity.written }));
    if (cards.length) store.absorbObjects(cards);
    void store.refreshObjects();
  }), [initial.worldId, store.cards, store.absorbObjects, store.refreshObjects]);
  useEffect(() => {
    if (pendingFocusCard && store.byId.has(pendingFocusCard)) { setPendingFocusCard(null); setFocusId(pendingFocusCard); }
  }, [pendingFocusCard, store.byId]);
  const [narrow, setNarrow] = useState(false);
  const [override, setOverride] = useState<Arrangement | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  // Library is a full-surface view rather than a FloatingSurface, so it owns
  // the return path explicitly. This keeps Escape and in-panel actions from
  // dropping keyboard users back at an arbitrary point in the Canvas.
  const libraryTrigger = useRef<HTMLButtonElement | null>(null);
  const libraryWasOpen = useRef(false);
  const [librarianOpen, setLibrarianOpen] = useState(false);
  // Open by default on a Prep: the running order is what the GM came here for.
  const [prepOpen, setPrepOpen] = useState(Boolean(prep));
  const [worldNavigation, setWorldNavigation] = useState<WorldNavigationRequest | null>(null);
  const canvasControls = useRef<SurfaceControls | null>(null);
  const stackControls = useRef<SurfaceControls | null>(null);
  const activeArrangement = useRef<Arrangement>("canvas");
  // Retrieval always addresses the visible projection while each view keeps its state.
  const controls = useRef<SurfaceControls>({
    landing: () => (activeArrangement.current === "canvas" ? canvasControls : stackControls).current?.landing() ?? { x: 0, y: 0 },
    reveal: cardId => (activeArrangement.current === "canvas" ? canvasControls : stackControls).current?.reveal(cardId)
  });
  const prepControls = useRef<PrepControls | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 600px)");
    const apply = () => setNarrow(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (libraryOpen) {
      libraryWasOpen.current = true;
      return;
    }
    if (!libraryWasOpen.current) return;
    libraryWasOpen.current = false;
    const trigger = libraryTrigger.current;
    trigger?.focus({ preventScroll: true });
  }, [libraryOpen]);

  const arrangement: Arrangement = override ?? (narrow ? "stack" : "canvas");
  activeArrangement.current = arrangement;
  const surfaceName = initial.kind === "desk" ? "desk" : initial.kind;

  /*
   * Focus is one piece of state, not two.
   *
   * Selection is not focus: clicking a card reveals what can be done with it,
   * and a further deliberate act — double-click, or the control that appears —
   * deepens into it. That second stage is what opens the entity surface *and*
   * what makes the rest of the world recede, because they are the same idea
   * seen from the panel and from the canvas.
   */
  const closeDetails = () => {
    if (entityFocusId) void entitySession(initial.worldId, entityFocusId).flush();
    const origin = focusOrigin.current;
    if (origin) setSelection(new Set([...origin.selection].filter(id => store.byId.has(id))));
    setEntityFocusId(null);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-card-id="${origin?.cardId ?? focusId}"]`)?.focus({ preventScroll: true }));
  };
  const applyProposal = onApplyProposal ? async (proposal: Parameters<ObjectProposalExecutor>[0]) => {
    if (proposal.context.kind !== "now" || proposal.scope.worldId !== initial.worldId || proposal.scope.compositionId !== initial.compositionId) return false;
    const committed = await onApplyProposal(proposal);
    if (!committed) return false;
    store.absorbExternal({ kind: "cards", cards: committed.cards });
    onDismissProposal?.(proposal.id);
    return true;
  } : undefined;

  // A focused card that is removed, or a composition that changes underneath,
  // must not leave the surface open on nothing.
  useEffect(() => {
    if (focusId !== null && !store.byId.has(focusId)) setFocusId(null);
    if (editing !== null && !store.byId.has(editing)) setEditing(null);
    setSelection(current => {
      const remaining = new Set([...current].filter(id => store.byId.has(id)));
      return remaining.size === current.size ? current : remaining;
    });
  }, [editing, focusId, store.byId]);

  /*
   * The neighbourhood: what the focused object is connected to.
   *
   * Focus suppresses everything unrelated, but "unrelated" is a claim Relic can
   * now actually make. A card the focused object points at, or that points at
   * it, keeps its weight — so deepening into Mara shows her footprint rather
   * than dimming the world uniformly around her.
   */
  const neighbours = useMemo(() => {
    if (!focused) return new Set<string>();
    const objectIds = new Set(focused.links.map((link) => link.other.objectId as string));
    return new Set(
      store.cards
        .filter((card) => objectIds.has(card.objectId))
        .map((card) => card.cardId as string)
    );
  }, [focused, store.cards]);

  /**
   * Follows a relationship to its other end.
   *
   * Off-Board identities use the same read/edit projection as Library. Following
   * knowledge never changes this Board's placement or camera.
   */
  const follow = (link: Link) => openEntity(link.other.objectId);
  const backInEntityFocus = () => {
    const index = entityTrail.index - 1;
    const id = entityTrail.ids[index];
    if (!id) return;
    setEntityTrail(current => ({ ...current, index }));
    openEntity(id, entityPages[id] ?? "overview", false);
  };
  const forwardInEntityFocus = () => {
    const index = entityTrail.index + 1;
    const id = entityTrail.ids[index];
    if (!id) return;
    setEntityTrail(current => ({ ...current, index }));
    openEntity(id, entityPages[id] ?? "overview", false);
  };


  /**
   * What happens when something is retrieved from search or the Library.
   *
   * Selection because it is what the GM asked for; Focus, for a single thing,
   * because searching for one object is already the deliberate act that Focus
   * asks for — the second stage happened at the keyboard. A batch is only
   * selected: nine things arriving at once is an arrangement, not a reading, and
   * opening a panel on one of them would be Relic choosing which.
   */
  const arrive = (cardIds: readonly CardId[]) => {
    if (cardIds.length === 0) return;
    setSelection(add(EMPTY_SELECTION, cardIds));
    setFocusId(cardIds.length === 1 ? cardIds[0]! : null);
    const first = cardIds[0];
    if (first) requestAnimationFrame(() => controls.current?.reveal(first));
  };

  /**
   * Following a source the Librarian cited.
   *
   * The same gesture as following a relationship or retrieving from the Library:
   * the thing is referenced onto the composition the GM is already on, rather
   * than the conversation navigating them somewhere else. It is worth being
   * exact about who acted — the Librarian named a source, and the GM chose to
   * bring it here. Nothing the Librarian said wrote to the world.
   */
  const followSource = async (ref: ObjectRef) => { openEntity(ref.objectId); };

  /**
   * Something the Librarian did, arriving already committed.
   *
   * The world half goes to the store, which is the only thing that knows how to
   * hold cards. The attention half is `arrive` — the same select-focus-reveal
   * the Library and the relationship picker go through, because "look at this"
   * is one gesture in Relic and a second implementation of it would drift.
   */
  const librarianActed = (effect: Effect) => {
    if (effect.kind === "attend") {
      if (librarianOpen) arrive(effect.cardIds);
      return;
    }
    // The running order is the session's, not the composition's, so it goes to
    // the rail rather than to the store that holds cards.
    if (effect.kind === "beats") {
      prepControls.current?.absorb(effect.beats);
      return;
    }
    store.absorbExternal(effect);
    if (effect.kind === "cards" && librarianOpen) arrive(effect.cards.map((card) => card.cardId));
  };

  /**
   * What the selection is, as the world names it.
   *
   * The rail attaches identities to a beat, never cards: a beat is about a
   * thing, and whether that thing happens to have a card on tonight's Prep is a
   * fact about the composition rather than about the evening.
   */
  const selectedRefs = useMemo(
    () =>
      [...selection]
        .map((cardId) => store.byId.get(cardId))
        .filter((card): card is NonNullable<typeof card> => card !== undefined)
        .map(cardRef),
    [selection, store.byId]
  );

  /**
   * Following a beat's reference.
   *
   * The same gesture as following a relationship or a cited source: if the thing
   * is not on this Prep it is brought here and looked at, rather than the rail
   * navigating away from the evening being planned.
   */
  const revealRef = async (ref: ObjectRef) => {
    const here = store.cards.find((card) => card.objectId === ref.objectId);
    if (here) {
      arrive([here.cardId]);
      return;
    }
    const [cardId] = await store.pullIn([ref], controls.current?.landing() ?? { x: 0, y: 0 });
    if (cardId) arrive([cardId]);
  };

  const captureFromChrome = () => {
    // Placed just below the newest card so the stack view stays readable and
    // the canvas does not pile every card on one spot.
    const cardId = store.capture(0, store.cards.length * 190);
    setSelection(only(cardId));
    setEditing(cardId);
  };

  return (
    <div className={styles.liveShell}>
      <WorkspaceShell
        ariaLabel="Relic workspace"
        minCenterWidth={720}
        leftOpen={prepOpen}
        rightOpen={librarianOpen}
        onLeftOpenChange={setPrepOpen}
        onRightOpenChange={setLibrarianOpen}
        builderActive={Boolean(builderId || creating)}
        focusOpen={Boolean(entityFocusId)}
        focusRequest={entityFocusRequest}
        onFocusOpenChange={open => { if (!open) closeDetails(); else if (lastFocus.current) openEntity(lastFocus.current, entityPages[lastFocus.current] ?? "overview", false); }}
        focusPanel={<>{entityVisits.map(objectId => <EntityFocusVisit key={objectId} worldId={initial.worldId} objectId={objectId} seed={store.cards.find(card => card.objectId === objectId)} active={(entityFocusId ?? lastFocus.current) === objectId} page={entityPages[objectId] ?? "overview"} onPageChange={page => setEntityPages(current => ({ ...current, [objectId]: page }))} onClose={closeDetails} onBuilder={() => openBuilder(objectId)} onFollow={id => openEntity(id)} onBack={backInEntityFocus} canBack={entityTrail.index > 0} onForward={forwardInEntityFocus} canForward={entityTrail.index < entityTrail.ids.length - 1} builderEntityId={builderId}/>)}</>}
        overlayChildren={<>{entityVisits.map(objectId => <EntityBuilderVisit key={objectId} worldId={initial.worldId} objectId={objectId} seed={store.cards.find(card => card.objectId === objectId)} active={builderId === objectId} onClose={closeBuilder} onFollow={id => openEntity(id)}/>)}{creating ? <EntityCreation worldId={initial.worldId} onClose={() => setCreating(false)} onCreated={id => { setCreating(false); openBuilder(id); }}/>:null}</>}

        navigation={dock => <WorkspaceNavigation active={libraryOpen ? "library" : prep && dock.leftOpen ? "prepare" : worldNavigation?.destination} expanded={worldNavigation?.destination}
          onNavigate={(destination, trigger) => {
            if (destination === "library") {
              libraryTrigger.current = trigger;
              setWorldNavigation(null);
              setLibraryOpen(current => !current);
            }
            else if (destination === "prepare" && prep) dock.toggleLeft();
            else setWorldNavigation(current => current?.destination === destination ? null : { destination, trigger });
          }} />}
        leftCarriage={prep ? {
          id: "prepare", label: "Prepare", title: "Prepare", variant: "prepare", defaultWidth: 336,
          render: (carriage) => <PrepRail initial={prep} selected={selectedRefs} controls={prepControls} onReveal={revealRef} onCollapse={carriage.onCollapse} carriage={carriage} />
        } : {
          id: "stage", label: "Stage", title: "Stage", variant: "stage", defaultWidth: 312,
          status: "No active session", statusTone: "quiet",
          content: workspace.sessions.length > 0 ? <CarriageSection title="Your sessions">
            <p className={styles.carriageVantage}>Open a session to work with its running order.</p>
            {workspace.sessions.map(session => <a className={styles.sessionDockLink} key={session.sessionId} href={`/c/${session.compositionId}`}>{session.title}<CarriageIcon kind="collapse-right" /></a>)}
          </CarriageSection> : <CarriageEmpty title="Room for your next session" detail="Prepare a session from the Board menu. Keep its running order beside the world as you work." />,
          footer: <span>Your world stays in view</span>
        }}
        rightCarriage={{
          id: "librarian", label: "Librarian", title: "Librarian", variant: "librarian", defaultWidth: 352,
          render: (carriage) => <Librarian open={carriage.open} onOpenChange={setLibrarianOpen}
            compositionId={initial.compositionId} compositionName={initial.name ?? "this composition"}
            focusCardId={focusId} focusLabel={focused ? cardTitle(focused) || "Unnamed" : null}
            selectedCardIds={[...selection]} onFollowSource={followSource} onActed={librarianActed}
            here={() => controls.current?.landing() ?? null} carriage={carriage} />
        }}
        chrome={(dock) => <WorkspaceTopbar
          identity={<div className={styles.identity}><span className={styles.wordmark}>Relic <small>V2</small></span></div>}
          context={<WorldBar workspace={workspace} active={initial.compositionId} navigationRequest={worldNavigation} onNavigationClose={() => setWorldNavigation(null)} />}
          search={<Finder store={store} controls={controls} onArrive={arrive} onOpenLibrary={(query) => {
            // Finder opens Library from inside its own dialog, so its trigger
            // is about to unmount. Keep the stable rail button as the return
            // target instead of leaving focus on a detached node.
            libraryTrigger.current ??= document.querySelector<HTMLButtonElement>('[aria-label="Library"]');
            setLibraryQuery(query ?? "");
            setLibraryOpen(true);
          }} />}
          actions={<>
            <IconButton tooltipPlacement="left" label={arrangement === "canvas" ? "Switch to Stack" : "Switch to Canvas"} aria-pressed={arrangement === "stack"} onClick={() => setOverride(arrangement === "canvas" ? "stack" : "canvas")}><CanvasGlyph name={arrangement === "canvas" ? "stack" : "canvas"} /></IconButton>
            <ProfileControl label="GM" />
          </>}
        />}
      >
        <div className={styles.liveSurface} data-detail-open={Boolean(focused) || undefined}>
          <div className={styles.surfaceProjection} hidden={arrangement !== "canvas"} data-view="canvas">
            <DeskCanvas store={store} surfaceName={surfaceName} selection={selection} onSelectionChange={setSelection}
              onInspect={cardId => setFocusId(cardId)} onFollow={follow}
              editing={arrangement === "canvas" ? editing : null} onEditingChange={cardId => { const card = cardId ? store.byId.get(cardId) : null; if (card) openBuilder(card.objectId); else setEditing(cardId); }} focusId={focusId} onFocusChange={setFocusId}
              proposals={proposals} onApplyProposal={applyProposal} onDismissProposal={onDismissProposal}
              neighbours={neighbours} controls={canvasControls} active={arrangement === "canvas"} />
          </div>
          <div className={styles.surfaceProjection} hidden={arrangement !== "stack"} data-view="stack">
            <DeskStack store={store} surfaceName={surfaceName} selection={selection} onSelectionChange={setSelection}
              onFollow={follow}
              editing={arrangement === "stack" ? editing : null} onEditingChange={cardId => { const card = cardId ? store.byId.get(cardId) : null; if (card) openBuilder(card.objectId); else setEditing(cardId); }} focusId={focusId} onFocusChange={setFocusId}
              neighbours={neighbours} controls={stackControls} onCapture={captureFromChrome} />
          </div>
          <div hidden={!libraryOpen} inert={!libraryOpen}><Library worldId={initial.worldId} activeEntityId={entityFocusId} onInspectEntity={id => openEntity(id)} onBuildEntity={openBuilder} onCreateEntity={() => { builderOrigin.current = { focusId: entityFocusId, page: "overview" }; setCreating(true); }} onCloseInspection={closeDetails} store={store} controls={controls} active={libraryOpen && !builderId && !creating} compositionName={initial.name ?? "this composition"} initialQuery={libraryQuery} onArrive={arrive} onClose={() => setLibraryOpen(false)} /></div>
          <footer className={styles.workspaceStatus}>
            <span className={styles.tally}>{store.cards.length} {store.cards.length === 1 ? "card" : "cards"}{selection.size > 0 ? " · " + selection.size + " selected" : ""}</span>
            {selection.size > 0 ? <SendToComposition workspace={workspace} store={store} selection={selection} here={initial.compositionId} /> : null}
            <SyncBadge store={store} />
          </footer>
        </div>
      </WorkspaceShell>
    </div>
  );
}

/**
 * Places the selected objects on another composition of the same world.
 *
 * The wording is deliberate: the cards are *referenced*, not moved or copied.
 * The same world material ends up visible in two places at once, which is the
 * point of a Board.
 */
function SendToComposition({
  workspace,
  store,
  selection,
  here
}: {
  workspace: Workspace;
  store: DeskStore;
  selection: Selection;
  here: DeskView["compositionId"];
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const elsewhere = workspace.compositions.filter((c) => c.compositionId !== here);

  if (elsewhere.length === 0) return null;

  return (
    <div className={styles.sendTo} ref={wrapper}>
      <button
        ref={trigger}
        type="button"
        className={styles.sendToButton}
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        Add {selection.size === 1 ? "card" : `${selection.size} cards`} to…
      </button>

      {open ? (
        <FloatingSurface label="Add to Board" open={open} triggerRef={trigger} onClose={restore => { setOpen(false); if (restore) trigger.current?.focus(); }}>
          {elsewhere.map((composition) => (
            <button
              key={composition.compositionId}
              type="button"
              role="menuitem"
              className={styles.switcherItem}
              aria-label={composition.name}
              onClick={() => {
                store.referenceInto(composition.compositionId, [...selection]);
                setOpen(false);
              }}
            >
              <span className={styles.switcherName}>{composition.name}</span>
            </button>
          ))}
        </FloatingSurface>
      ) : null}
    </div>
  );
}

function SyncBadge({ store }: { store: DeskStore }) {
  const { sync } = store;

  if (sync.kind === "problem") {
    return <div className={styles.problem} role="alert"><span>{sync.message}</span>{store.canRetry ? <button type="button" onClick={store.retryFailed}>Retry save</button> : null}</div>;
  }

  return (
    <span className={styles.syncBadge} data-state={sync.kind} role="status">
      {sync.kind === "saving" ? "Saving…" : "Saved"}
    </span>
  );
}
