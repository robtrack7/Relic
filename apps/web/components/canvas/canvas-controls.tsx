"use client";

import { useEffect, useLayoutEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { boundsFor } from "@/lib/desk/manipulation";
import { MAX_SCALE, MIN_SCALE, screenToWorld, type Point, type Rect, type Size, type Viewport } from "@/lib/desk/viewport";

/** What the minimap needs to know about a Placement: where it is, and which one. */
export type CanvasPlacement = Rect & { id: string };

import { Button, IconButton } from "../ui/control";
import { FloatingSurface } from "../ui/floating-surface";
import styles from "./canvas-controls.module.css";

export type CanvasTool = "select" | "hand" | "create" | "compose" | "connect";
export type PersistentCanvasTool = "select" | "hand" | "connect";
export type MinimapMode = "auto" | "always" | "off";

const TOOLS: readonly { id: CanvasTool; label: string; hint: string }[] = [
  { id: "select", label: "Select", hint: "V" },
  { id: "create", label: "Create", hint: "C" },
  { id: "compose", label: "Compose", hint: "B" },
  { id: "connect", label: "Connect", hint: "L" }
];

export function WorkspaceTopbar({
  identity,
  context,
  search,
  actions
}: {
  identity: ReactNode;
  /** Optional current-context control. Keeping it beside search prevents the
   * world selector from competing with the Relic mark at narrow widths. */
  context?: ReactNode;
  search: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className={styles.topFrame}>
      <div className={styles.orientation}>{identity}</div>
      {context ? <div className={styles.contextSlot}>{context}</div> : null}
      <div className={styles.searchSlot}>{search}</div>
      <div className={styles.globalActions}>{actions}</div>
    </div>
  );
}

/**
 * The single account affordance in the global shell. The Librarian remains a
 * separate carriage toggle; this menu stays intentionally small and honest.
 */
export function ProfileControl({
  label = "GM",
  onProfileRequest,
  onHelpRequest,
  onClose
}: {
  label?: string;
  onProfileRequest?: () => void;
  onHelpRequest?: () => void;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [motionPreference, setMotionPreference] = useState<"system" | "reduced" | "full">("system");
  const [readableText, setReadableText] = useState(false);
  const [lightPreference, setLightPreference] = useState<"system" | "daylight" | "lamplit">("system");
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const settingsId = useId();
  const helpId = useId();
  useEffect(() => {
    try {
      const motion = window.localStorage.getItem("relic.motionPreference");
      const readable = window.localStorage.getItem("relic.readableText");
      const light = window.localStorage.getItem("relic.lightPreference");
      if (motion === "system" || motion === "reduced" || motion === "full") setMotionPreference(motion);
      if (light === "daylight" || light === "lamplit") setLightPreference(light);
      setReadableText(readable === "true");
    } catch { /* localStorage can be unavailable in privacy mode */ }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.relicMotion = motionPreference;
    document.documentElement.dataset.relicReadable = readableText ? "true" : "false";
    // "system" removes the attribute so the stylesheet follows prefers-color-scheme.
    if (lightPreference === "system") delete document.documentElement.dataset.relicLight;
    else document.documentElement.dataset.relicLight = lightPreference;
  }, [motionPreference, readableText, lightPreference]);
  const close = (restoreFocus = false) => {
    setOpen(false);
    onClose?.();
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  const closeSecondary = (restoreFocus = false) => {
    setSettingsOpen(false);
    setHelpOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  const updateMotion = (value: "system" | "reduced" | "full") => {
    setMotionPreference(value);
    try { window.localStorage.setItem("relic.motionPreference", value); } catch { /* optional preference */ }
  };
  const updateLight = (value: "system" | "daylight" | "lamplit") => {
    setLightPreference(value);
    try { window.localStorage.setItem("relic.lightPreference", value); } catch { /* optional preference */ }
  };
  const updateReadable = (value: boolean) => {
    setReadableText(value);
    try { window.localStorage.setItem("relic.readableText", String(value)); } catch { /* optional preference */ }
  };
  return <>
    <IconButton
      ref={trigger}
      label={`Open profile ${label}`}
      tooltipPlacement="left"
      className={styles.profileButton}
      aria-label={`Open profile ${label}`}
      aria-expanded={open}
      aria-haspopup="menu"
      aria-controls={menuId}
      title="Open profile"
      onClick={() => {
        const next = !open;
        setOpen(next);
      }}
    >
      {label}
    </IconButton>
    <FloatingSurface id={menuId} open={open} label="Profile menu" triggerRef={trigger} onClose={close} placement="bottom" align="start" width={236}>
      <div className={styles.profileSummary}>
        <span className={styles.profileAvatar} aria-hidden="true">{label.slice(0, 2).toUpperCase()}</span>
        <span><strong>Workspace profile</strong><small>Local workspace</small></span>
      </div>
      <button type="button" role="menuitem" onClick={() => { onProfileRequest?.(); setOpen(false); setSettingsOpen(true); }}><span>Settings</span><small>Preferences</small></button>
      <button type="button" role="menuitem" aria-disabled="true" title="Account and plan are unavailable in this workspace."><span>Account &amp; plan</span><small>Unavailable</small></button>
      <button type="button" role="menuitem" onClick={() => { onHelpRequest?.(); setOpen(false); setHelpOpen(true); }}><span>Help &amp; support</span><small>Keyboard shortcuts</small></button>
    </FloatingSurface>
    <FloatingSurface id={settingsId} open={settingsOpen} label="Settings" role="dialog" triggerRef={trigger} onClose={closeSecondary} placement="bottom" align="start" width={288}>
      <form className={styles.settingsForm} onSubmit={event => event.preventDefault()}>
        <div className={styles.settingsHeading}><strong>Settings</strong><small>Saved on this device</small></div>
        <label>Light<select autoFocus value={lightPreference} onChange={event => updateLight(event.target.value as "system" | "daylight" | "lamplit")}><option value="system">Use system setting</option><option value="daylight">Daylight</option><option value="lamplit">Lamplit · for dim rooms</option></select></label>
        <label>Motion preference<select value={motionPreference} onChange={event => updateMotion(event.target.value as "system" | "reduced" | "full")}><option value="system">Use system setting</option><option value="reduced">Reduced motion</option><option value="full">Full motion</option></select></label>
        <label className={styles.settingsCheck}><input type="checkbox" checked={readableText} onChange={event => updateReadable(event.target.checked)} /><span><strong>Readable text</strong><small>Increase working copy size and spacing</small></span></label>
        <button type="button" className={styles.settingsDone} onClick={() => closeSecondary(true)}>Done</button>
      </form>
    </FloatingSurface>
    <FloatingSurface id={helpId} open={helpOpen} label="Help and support" role="dialog" triggerRef={trigger} onClose={closeSecondary} placement="bottom" align="start" width={288}>
      <div className={styles.helpPanel}>
        <div className={styles.settingsHeading}><strong>Keyboard guide</strong><small>Shortcuts work when the Canvas has focus</small></div>
        <p><kbd>V</kbd> Select · <kbd>H</kbd> Hand · <kbd>C</kbd> Create · <kbd>B</kbd> Compose · <kbd>L</kbd> Connect</p>
        <p><kbd>0</kbd> Fit Board · <kbd>1</kbd> Actual size · <kbd>F</kbd> Open Focus</p>
        <button type="button" className={styles.settingsDone} onClick={() => closeSecondary(true)}>Done</button>
      </div>
    </FloatingSurface>
  </>;
}

export function CanvasToolCluster({
  activeTool,
  openMenu,
  onToolPress,
  menuId,
  connectAvailable = true
}: {
  activeTool: PersistentCanvasTool;
  openMenu: "select" | "create" | "compose" | null;
  onToolPress: (tool: CanvasTool, trigger: HTMLButtonElement) => void;
  menuId?: string;
  connectAvailable?: boolean;
}) {
  return (
    <div className={styles.toolCluster} role="toolbar" aria-label="Canvas tools" aria-orientation="horizontal" onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      event.preventDefault(); buttons[next]?.focus();
    }}>
      {TOOLS.map((tool) => {
        const active = (tool.id === "select" ? activeTool === "select" || activeTool === "hand" : activeTool === tool.id) || openMenu === tool.id;
        const opensMenu = tool.id === "select" || tool.id === "create" || tool.id === "compose";
        const unavailable = tool.id === "connect" && !connectAvailable;
        return (
          <IconButton
            key={tool.id}
            type="button"
            className={styles.toolButton}
            data-tool={tool.id}
            label={tool.label}
            data-active={active || undefined}
            aria-pressed={tool.id === "select" || !opensMenu ? active : undefined}
            aria-haspopup={opensMenu ? "menu" : undefined}
            aria-expanded={opensMenu ? openMenu === tool.id : undefined}
            aria-controls={opensMenu ? menuId : undefined}
            aria-disabled={unavailable || undefined}
            title={unavailable
              ? "Connect is unavailable in this workspace."
              : tool.id === "select"
                ? `Select (V) · Hand (H)${activeTool === "hand" ? " · Hand active" : ""}`
                : `${tool.label} (${tool.hint})`}
            onClick={(event) => {
              if (!unavailable) onToolPress(tool.id, event.currentTarget);
            }}
          >
            <CanvasGlyph name={tool.id === "select" && activeTool === "hand" ? "hand" : tool.id} />
          </IconButton>
        );
      })}
    </div>
  );
}

export function CanvasViewControls({
  scale,
  hasSelection,
  minimapMode,
  onZoomOut,
  onResetZoom,
  onZoomIn,
  onFitBoard,
  onFitSelection,
  gridVisible,
  onGridVisibleChange,
  onMinimapModeChange
}: {
  scale: number;
  hasSelection: boolean;
  minimapMode?: MinimapMode;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onFitBoard: () => void;
  onFitSelection: () => void;
  gridVisible?: boolean;
  onGridVisibleChange?: (visible: boolean) => void;
  onMinimapModeChange?: (mode: MinimapMode) => void;
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const options = useRef<HTMLDivElement>(null);
  const optionsTrigger = useRef<HTMLButtonElement>(null);
  const [compact, setCompact] = useState(false);
  const [compactOpen, setCompactOpen] = useState(false);
  const compactTrigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const currentMinimapMode = minimapMode ?? "auto";

  // The lower-right controls share the same bottom band as the centred tool
  // dock. Measure both surfaces rather than guessing from a viewport breakpoint
  // so a resized carriage/detail panel also participates in the decision.
  useLayoutEffect(() => {
    const root = options.current;
    if (!root) return;
    const measure = () => {
      const view = root.getBoundingClientRect();
      const tool = root.closest<HTMLElement>("[data-canvas-chrome]")?.querySelector<HTMLElement>("[data-tool-area]")?.getBoundingClientRect();
      const expanded = root.querySelector<HTMLElement>("[data-view-measure]")?.getBoundingClientRect();
      if (!view.width || !view.height || !tool?.width || !expanded?.width) { setCompact(false); return; }
      // In compact mode the visible button is only 44px wide. Project the
      // expanded cluster from its right edge so the decision remains stable
      // while the collapsed state is mounted.
      const expandedLeft = view.right - expanded.width;
      const collision = expandedLeft < tool.right + 16 && view.right > tool.left - 16 && Math.abs(view.bottom - tool.bottom) < 96;
      setCompact(collision);
      if (!collision) setCompactOpen(false);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    const tool = root.closest<HTMLElement>("[data-canvas-chrome]")?.querySelector<HTMLElement>("[data-tool-area]");
    const expanded = root.querySelector<HTMLElement>("[data-view-measure]");
    if (tool) observer.observe(tool);
    if (expanded) observer.observe(expanded);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  const closeOptions = (restoreFocus = false) => {
    setOptionsOpen(false);
    if (restoreFocus) optionsTrigger.current?.focus();
  };

  const fullControls = <div className={styles.viewControls} role="toolbar" aria-label="Canvas view controls">
    <IconButton label="Zoom out" disabled={scale <= MIN_SCALE} onClick={onZoomOut}>
      <CanvasGlyph name="zoomOut" />
    </IconButton>
    <Button className={styles.zoomReadout} aria-label={`Reset zoom to 100%; current zoom ${Math.round(scale * 100)}%`} title="Reset zoom to 100%" onClick={onResetZoom}>
      {Math.round(scale * 100)}%
    </Button>
    <IconButton label="Zoom in" disabled={scale >= MAX_SCALE} onClick={onZoomIn}>
      <CanvasGlyph name="zoomIn" />
    </IconButton>
    <span className={styles.controlDivider} aria-hidden="true" />
    <IconButton label="Fit Board" onClick={onFitBoard}>
      <CanvasGlyph name="fit" />
    </IconButton>
    <IconButton label="Fit selection" disabled={!hasSelection} onClick={onFitSelection}>
      <CanvasGlyph name="selection" />
    </IconButton>
    {onMinimapModeChange || onGridVisibleChange ? (
      <IconButton
        label="Canvas view options"
        aria-expanded={optionsOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        title="View options"
        ref={optionsTrigger}
        onClick={() => {
          if (optionsOpen) closeOptions();
          else setOptionsOpen(true);
        }}
      >
        <CanvasGlyph name="more" />
      </IconButton>
    ) : null}
  </div>;

  return (
    <div className={styles.viewControlWrap} data-view-controls-wrap ref={options}>
      {optionsOpen ? (
        <FloatingSurface
          id={menuId}
          label="Canvas view options"
          open={optionsOpen} onClose={closeOptions} triggerRef={optionsTrigger} width={190}
        >
          {onMinimapModeChange ? <span>Minimap</span> : null}
          {onMinimapModeChange
            ? (["auto", "always", "off"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="menuitemradio"
                  aria-checked={currentMinimapMode === mode}
                  onClick={() => {
                    onMinimapModeChange(mode);
                    closeOptions(true);
                  }}
                >
                  {mode[0]?.toUpperCase()}{mode.slice(1)}
                  {currentMinimapMode === mode ? <CanvasGlyph name="check" /> : null}
                </button>
              ))
            : null}
          {onGridVisibleChange ? <><span>Canvas</span><button type="button" role="menuitemcheckbox" aria-checked={gridVisible} onClick={() => onGridVisibleChange(!gridVisible)}>Dot grid{gridVisible ? <CanvasGlyph name="check" /> : null}</button></> : null}
        </FloatingSurface>
      ) : null}
      {compact ? <>
        <IconButton ref={compactTrigger} className={styles.compactViewButton} label="Canvas view controls" aria-expanded={compactOpen} aria-haspopup="dialog" onClick={() => setCompactOpen(current => !current)}>
          <CanvasGlyph name="more" />
        </IconButton>
        <FloatingSurface open={compactOpen} role="dialog" label="Canvas view controls" triggerRef={compactTrigger} onClose={(restore) => { setCompactOpen(false); if (restore) requestAnimationFrame(() => compactTrigger.current?.focus({ preventScroll: true })); }} placement="top" align="start" width={310}>
          {fullControls}
        </FloatingSurface>
      </> : fullControls}
      <div className={styles.viewMeasure} data-view-measure aria-hidden="true">
        <i className={styles.measureButton} /><i className={styles.measureReadout} /><i className={styles.measureButton} /><i className={styles.measureDivider} /><i className={styles.measureButton} /><i className={styles.measureButton} /><i className={styles.measureButton} />
      </div>
    </div>
  );
}

export function ContextualMinimap({
  placements,
  viewport,
  viewportSize,
  selectedIds = [],
  mode = "auto",
  onNavigate
}: {
  placements: readonly CanvasPlacement[];
  viewport: Viewport;
  viewportSize: Size;
  selectedIds?: readonly string[];
  mode?: MinimapMode;
  onNavigate: (point: Point) => void;
}) {
  const dragging = useRef<number | null>(null);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const boardBounds = boundsFor(placements);
  const visible = shouldShowMinimap(mode, placements, viewport, viewportSize);

  if (!visible || !boardBounds || viewportSize.width <= 0 || viewportSize.height <= 0) return null;

  const visibleWorld = viewportWorldBounds(viewport, viewportSize);
  const overview = boundsFor([boardBounds, visibleWorld]);
  if (!overview) return null;
  const padded = {
    x: overview.x - Math.max(overview.width * 0.06, 40),
    y: overview.y - Math.max(overview.height * 0.06, 40),
    width: overview.width + Math.max(overview.width * 0.12, 80),
    height: overview.height + Math.max(overview.height * 0.12, 80)
  };

  const navigate = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    onNavigate({
      x: padded.x + ((event.clientX - rect.left) / rect.width) * padded.width,
      y: padded.y + ((event.clientY - rect.top) / rect.height) * padded.height
    });
  };

  return (
    <button
      type="button"
      className={styles.minimap}
      aria-label="Canvas minimap"
      title="Click or drag to move around the Board"
      onClick={(event) => { if (event.detail === 0) onNavigate({ x: boardBounds.x + boardBounds.width / 2, y: boardBounds.y + boardBounds.height / 2 }); }}
      onPointerDown={(event) => {
        dragging.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        navigate(event);
      }}
      onPointerMove={(event) => {
        if (dragging.current === event.pointerId) navigate(event);
      }}
      onPointerUp={(event) => {
        if (dragging.current !== event.pointerId) return;
        dragging.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        dragging.current = null;
      }}
      onKeyDown={(event) => {
        const stepX = visibleWorld.width * 0.2;
        const stepY = visibleWorld.height * 0.2;
        const center = {
          x: visibleWorld.x + visibleWorld.width / 2,
          y: visibleWorld.y + visibleWorld.height / 2
        };
        if (event.key === "ArrowLeft") center.x -= stepX;
        else if (event.key === "ArrowRight") center.x += stepX;
        else if (event.key === "ArrowUp") center.y -= stepY;
        else if (event.key === "ArrowDown") center.y += stepY;
        else return;
        event.preventDefault();
        onNavigate(center);
      }}
    >
      <span className={styles.minimapLabel}>Canvas minimap</span>
      <span className={styles.minimapField} aria-hidden="true">
        {placements.map((placement) => (
          <i
            key={placement.id}
            className={styles.minimapPlacement}
            data-selected={selected.has(placement.id) || undefined}
            style={overviewStyle(placement, padded)}
          />
        ))}
        <i className={styles.minimapViewport} style={overviewStyle(visibleWorld, padded)} />
      </span>
    </button>
  );
}

export function CanvasChrome({
  activeTool: controlledTool,
  gridVisible,
  onGridVisibleChange,
  contextLabel,
  contextMode,
  profileLabel = "MV",
  showTopFrame = true,
  showCanvasControls = true,
  scale,
  selectionCount,
  placements,
  viewport,
  viewportSize,
  selectedIds,
  minimapMode,
  librarianOpen = false,
  onToggleLibrarian,
  onZoomOut,
  onResetZoom,
  onZoomIn,
  onFitBoard,
  onFitSelection,
  onNavigate,
  onMinimapModeChange,
  onToolChange,
  onToolAction,
  availableToolActions,
  onSearchRequest,
  onRelicMenuRequest,
  onProfileRequest,
  connectAvailable
}: {
  activeTool?: PersistentCanvasTool;
  gridVisible?: boolean;
  onGridVisibleChange?: (visible: boolean) => void;
  contextLabel: string;
  contextMode?: string;
  profileLabel?: string;
  showTopFrame?: boolean;
  showCanvasControls?: boolean;
  scale: number;
  selectionCount: number;
  placements: readonly CanvasPlacement[];
  viewport: Viewport;
  viewportSize: Size;
  selectedIds: readonly string[];
  minimapMode: MinimapMode;
  librarianOpen?: boolean;
  onToggleLibrarian?: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onFitBoard: () => void;
  onFitSelection: () => void;
  onNavigate: (point: Point) => void;
  onMinimapModeChange: (mode: MinimapMode) => void;
  onToolChange?: (tool: PersistentCanvasTool) => void;
  onToolAction?: (tool: "create" | "compose", action: string) => void;
  availableToolActions?: readonly string[];
  onSearchRequest?: () => void;
  onRelicMenuRequest?: () => void;
  onProfileRequest?: () => void;
  connectAvailable?: boolean;
}) {
  const [toolState, setActiveTool] = useState<PersistentCanvasTool>("select");
  const activeTool = controlledTool ?? toolState;
  const [openMenu, setOpenMenu] = useState<"select" | "create" | "compose" | null>(null);
  const toolArea = useRef<HTMLDivElement>(null);
  const chromeRoot = useRef<HTMLDivElement>(null);
  const toolTrigger = useRef<HTMLButtonElement>(null);
  const toolMenuId = useId();

  const closeToolMenu = (restoreFocus = false) => {
    setOpenMenu(null);
    if (restoreFocus) toolTrigger.current?.focus();
  };

  const selectTool = (tool: CanvasTool, trigger?: HTMLButtonElement) => {
    if (tool === "select" && trigger) {
      if (openMenu === "select") closeToolMenu();
      else {
        toolTrigger.current = trigger;
        setOpenMenu("select");
      }
      return;
    }
    if (tool === "create" || tool === "compose") {
      if (openMenu === tool) {
        closeToolMenu();
      } else {
        toolTrigger.current = trigger ?? toolArea.current?.querySelector<HTMLButtonElement>(`[data-tool="${tool}"]`) ?? null;
        setOpenMenu(tool);
      }
      return;
    }
    if ((tool === "connect" || tool === "hand") && !onToolChange) return;
    closeToolMenu();
    setActiveTool(tool);
    onToolChange?.(tool);
  };

  useEffect(() => {
    if (!showCanvasControls) return;
    const keydown = (event: KeyboardEvent) => {
      const workspace = chromeRoot.current?.closest<HTMLElement>("[data-left-mode]") ?? chromeRoot.current?.parentElement;
      if (!workspace) return;
      const targetIsWithin = (target: EventTarget | null) => target instanceof Node && workspace.contains(target);
      if (!targetIsWithin(event.target) && !targetIsWithin(document.activeElement)) return;
      if (isTextEntry(event.target)) return;
      if (event.key === "Escape" && (activeTool === "connect" || activeTool === "hand")) {
        event.preventDefault();
        setActiveTool("select");
        onToolChange?.("select");
        return;
      }
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.repeat) return;
      if (event.target instanceof Element && event.target.closest('[role="menu"]')) return;
      const tool = event.key.toLowerCase() === "v" ? "select" : event.key.toLowerCase() === "h" ? "hand" : event.key.toLowerCase() === "c" ? "create" : event.key.toLowerCase() === "b" ? "compose" : event.key.toLowerCase() === "l" ? "connect" : null;
      if (!tool) return;
      event.preventDefault();
      selectTool(tool);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [activeTool, onToolChange, openMenu, showCanvasControls]);

  useEffect(() => {
    if (!showTopFrame || !onSearchRequest) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.shiftKey || (!event.metaKey && !event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (isTextEntry(event.target)) return;
      event.preventDefault();
      onSearchRequest();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [onSearchRequest, showTopFrame]);

  const menuItems = openMenu === "create"
    ? ["Fragment", "Character", "Place", "Faction", "Artifact", "Event", "Thread", "Note", "Source"]
    : openMenu === "compose"
      ? ["Section", "Stack", "Text note", "Decorative connector", "Board link"]
      : ["Select", "Hand"];

  const actionIsAvailable = (action: string) => openMenu === "select" || (Boolean(onToolAction) && (
    availableToolActions ? availableToolActions.includes(action) : true
  ));

  return (
    <div ref={chromeRoot} className={styles.chromeRoot} data-canvas-chrome data-active-canvas-tool={activeTool}>
      {showTopFrame ? (
        <WorkspaceTopbar
          identity={
            <>
              <Button
                aria-label="Open Relic V2 menu"
                className={styles.relicButton}
                disabled={!onRelicMenuRequest}
                aria-disabled={!onRelicMenuRequest || undefined}
                title={onRelicMenuRequest ? "Open Relic menu" : "Relic menu is unavailable in this view."}
                onClick={onRelicMenuRequest}
              >
                Relic <small aria-hidden="true">V2</small>
              </Button>
            </>
          }
          context={<div
                className={styles.contextControl}
                aria-label={`Current context: ${contextLabel}${contextMode ? ` ${contextMode}` : ""}`}
                title={`${contextLabel}${contextMode ? ` · ${contextMode}` : ""}`}
              >
                <strong>{contextLabel}</strong>{" "}
                {contextMode ? <span>{contextMode}</span> : null}
              </div>}
          search={
            <button
              type="button"
              className={styles.searchControl}
              aria-label="Search Relic"
              disabled={!onSearchRequest}
              aria-disabled={!onSearchRequest || undefined}
              title={onSearchRequest ? "Search Relic (Ctrl/Cmd+K)" : "Search is unavailable in this view."}
              onClick={onSearchRequest}
            >
              <CanvasGlyph name="search" />
              <span>Search Relic</span>
              {onSearchRequest ? <kbd>Ctrl/Cmd K</kbd> : null}
            </button>
          }
          actions={
            <>
              <ProfileControl label={profileLabel} onProfileRequest={onProfileRequest} />
            </>
          }
        />
      ) : null}

      {showCanvasControls ? <div className={styles.toolArea} data-tool-area ref={toolArea}>
        <CanvasToolCluster
          activeTool={activeTool}
          openMenu={openMenu}
          menuId={toolMenuId}
          onToolPress={selectTool}
          connectAvailable={connectAvailable ?? Boolean(onToolChange)}
        />
        {openMenu ? (
          <FloatingSurface
            id={toolMenuId}
            label={`${openMenu === "create" ? "Create" : openMenu === "compose" ? "Compose" : "Select and hand"} menu`}
            open={Boolean(openMenu)} onClose={closeToolMenu} triggerRef={toolTrigger}
          >
            <span>{openMenu === "create" ? "World material" : openMenu === "compose" ? "Board composition" : "Canvas mode"}</span>
            {menuItems.map((item) => (
              <Button
                key={item}
                role="menuitem"
                className={styles.menuItem}
                aria-disabled={!actionIsAvailable(item) || undefined}
                title={actionIsAvailable(item) ? item : `${item} is unavailable in this workspace.`}
                onClick={() => {
                  if (openMenu === "select") {
                    const next = item === "Hand" ? "hand" : "select";
                    closeToolMenu(true);
                    setActiveTool(next);
                    onToolChange?.(next);
                    return;
                  }
                  if (!actionIsAvailable(item)) return;
                  onToolAction?.(openMenu as "create" | "compose", item);
                  closeToolMenu(true);
                  setActiveTool("select");
                  onToolChange?.("select");
                }}
              >
                <span className={styles.menuIdentity}><CanvasGlyph name={item === "Fragment" ? "fragment" : item === "Note" || item === "Text note" ? "compose" : item === "Source" ? "image" : item === "Character" ? "person" : item === "Place" ? "place" : item === "Hand" ? "hand" : item === "Select" ? "select" : item === "Faction" ? "faction" : item === "Thread" ? "thread" : item === "Board link" ? "link" : "selection"} />{item}</span>
                {openMenu === "select" ? <kbd aria-hidden="true">{item === "Hand" ? "H" : "V"}</kbd> : item === "Fragment" ? <kbd aria-hidden="true">N</kbd> : actionIsAvailable(item) ? <CanvasGlyph name="chevron" /> : <span className={styles.unavailable}>Unavailable</span>}
              </Button>
            ))}
          </FloatingSurface>
        ) : null}
      </div> : null}

      {showCanvasControls && activeTool === "connect" ? <div className={styles.modeNotice} role="status">Connect mode · choose two objects · Esc to return</div> : null}

      {showCanvasControls ? <div className={styles.viewArea}>
        <CanvasViewControls
          scale={scale}
          hasSelection={selectionCount > 0}
          minimapMode={minimapMode}
          onZoomOut={onZoomOut}
          onResetZoom={onResetZoom}
          onZoomIn={onZoomIn}
          onFitBoard={onFitBoard}
          onFitSelection={onFitSelection}
          gridVisible={gridVisible}
          onGridVisibleChange={onGridVisibleChange}
          onMinimapModeChange={onMinimapModeChange}
        />
      </div> : null}

      {showCanvasControls ? <div className={styles.minimapArea}>
        <ContextualMinimap
          placements={placements}
          viewport={viewport}
          viewportSize={viewportSize}
          selectedIds={selectedIds}
          mode={minimapMode}
          onNavigate={onNavigate}
        />
      </div> : null}
    </div>
  );
}

export function shouldShowMinimap(
  mode: MinimapMode,
  placements: readonly CanvasPlacement[],
  viewport: Viewport,
  viewportSize: Size
) {
  if (mode === "off") return false;
  if (mode === "always") return placements.length > 0;
  if (viewport.scale > 0.45 || viewportSize.width <= 0 || viewportSize.height <= 0) return false;
  const board = boundsFor(placements);
  if (!board) return false;
  const visible = viewportWorldBounds(viewport, viewportSize);
  const overflowX = board.x < visible.x - visible.width * 0.08 || board.x + board.width > visible.x + visible.width * 1.08;
  const overflowY = board.y < visible.y - visible.height * 0.08 || board.y + board.height > visible.y + visible.height * 1.08;
  return overflowX || overflowY;
}

/** Inset of an attached tray from each side of its card, in world units: deep enough into the 14px corner radius that the curve departs by under a pixel. */
export const TRAY_INSET = 10;

export function CanvasSelectionToolbar({ bounds, viewportSize, children, insets, attach = false, scale = 1 }: {
  bounds: { x: number; y: number; width: number; height: number };
  viewportSize: Size; children: ReactNode; insets?: { top: number; left: number; right: number; bottom: number };
  /** Draw the actions as a tray sliding out beneath one expanded card when it fits; otherwise float. */
  attach?: boolean; scale?: number;
}) {
  const toolbar = useRef<HTMLDivElement>(null);
  const [toolbarSize, setToolbarSize] = useState({ width: 320, height: 44 });
  useLayoutEffect(() => {
    const node = toolbar.current;
    if (!node) return;
    const measure = () => {
      // Intrinsic width, independent of any tray width imposed on the node.
      const style = getComputedStyle(node);
      const items = [...node.children] as HTMLElement[];
      const width = Math.ceil(items.reduce((sum, item) => sum + item.offsetWidth, 0) + Math.max(0, items.length - 1) * (Number.parseFloat(style.columnGap) || 0) + (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0) + 2);
      if (width && node.offsetHeight) setToolbarSize(current => current.width === width && current.height === node.offsetHeight ? current : { width, height: node.offsetHeight });
    };
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const padding = 12;
  const area = insets ?? { top: padding, left: padding, right: padding, bottom: padding };
  const gap = 14;
  const safeWidth = Math.max(0, viewportSize.width);
  const safeHeight = Math.max(0, viewportSize.height);
  const halfWidth = Math.min(toolbarSize.width / 2, Math.max(0, (safeWidth - area.left - area.right) / 2));
  const center = bounds.x + bounds.width / 2;
  const left = Math.max(area.left + halfWidth, Math.min(center, safeWidth - area.right - halfWidth));
  const above = bounds.y - toolbarSize.height - gap;
  const below = bounds.y + bounds.height + gap;
  const canPlaceAbove = above >= area.top;
  const canPlaceBelow = below + toolbarSize.height <= safeHeight - area.bottom;
  const top = canPlaceAbove ? above : canPlaceBelow ? below : Math.max(area.top, Math.min(above, safeHeight - area.bottom - toolbarSize.height));
  // A tray hangs from the card's flat bottom edge, between its rounded corners,
  // so it reads as part of the object rather than a menu hovering near it.
  const trayWidth = bounds.width - 2 * TRAY_INSET * scale;
  const trayBottom = bounds.y + bounds.height + toolbarSize.height;
  const tray = attach && toolbarSize.width <= trayWidth && bounds.x >= area.left && bounds.x + bounds.width <= safeWidth - area.right && bounds.y + bounds.height >= area.top && trayBottom <= safeHeight - area.bottom;
  const placement = tray ? "tray" : canPlaceAbove ? "above" : canPlaceBelow ? "below" : "clamped";
  return <div role="toolbar" aria-label="Selection actions" className={styles.selectionToolbar}
    ref={toolbar} data-placement={placement}
    style={tray ? { left: bounds.x + TRAY_INSET * scale, top: bounds.y + bounds.height, width: trayWidth } : { left, top, maxWidth: Math.max(0, safeWidth - area.left - area.right), transform: "translateX(-50%)" }}
    onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>{children}</div>;
}

function viewportWorldBounds(viewport: Viewport, size: Size) {
  const topLeft = screenToWorld(viewport, { x: 0, y: 0 });
  const bottomRight = screenToWorld(viewport, { x: size.width, y: size.height });
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y
  };
}

function overviewStyle(
  rect: { x: number; y: number; width: number; height: number },
  bounds: { x: number; y: number; width: number; height: number }
) {
  return {
    left: `${((rect.x - bounds.x) / bounds.width) * 100}%`,
    top: `${((rect.y - bounds.y) / bounds.height) * 100}%`,
    width: `${(rect.width / bounds.width) * 100}%`,
    height: `${(rect.height / bounds.height) * 100}%`
  } as CSSProperties;
}

export function CanvasGlyph({
  name
}: {
  name:
    | CanvasTool
    | "fit"
    | "collapse"
    | "selection"
    | "relic"
    | "search"
    | "librarian"
    | "zoomIn"
    | "zoomOut"
    | "more"
    | "check"
    | "chevron"
    | "chevronDown"
    | "chevronLeft"
    | "book"
    | "fragment"
    | "image"
    | "person"
    | "place"
    | "hand"
    | "faction"
    | "thread"
    | "link"
    | "edit"
    | "close"
    | "stack"
    | "canvas"
    | "prepare";
}) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.8 };
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={styles.glyph}>
      {name === "select" ? <path {...common} d="M5 3.5 18.2 15l-5.1.9-2.8 4.6L5 3.5Z" /> : null}
      {name === "stack" ? <><rect {...common} x="4" y="3" width="16" height="4" rx="1" /><rect {...common} x="4" y="10" width="16" height="4" rx="1" /><rect {...common} x="4" y="17" width="16" height="4" rx="1" /></> : null}
      {name === "canvas" ? <><rect {...common} x="3" y="4" width="7" height="6" rx="1" /><rect {...common} x="14" y="3" width="7" height="9" rx="1" /><rect {...common} x="6" y="15" width="11" height="6" rx="1" /></> : null}
      {name === "hand" ? <><path {...common} d="M7 12V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 4-2.5 6-6.5 6H11c-2.5 0-3.5-1.2-4.5-3L4 14a1.5 1.5 0 0 1 3-2Z" /></> : null}
      {name === "create" || name === "zoomIn" ? <path {...common} d="M12 5v14M5 12h14" /> : null}
      {name === "compose" || name === "edit" ? <><path {...common} d="m5 15-1 5 5-1L20 8a2.1 2.1 0 0 0-4-4L5 15Z" /><path {...common} d="m14 6 4 4M5 15l4 4" /></> : null}
      {name === "connect" ? <><path {...common} d="m10 14 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2-1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 1)" /></> : null}
      {name === "fragment" ? <><path {...common} d="M6 3h8l4 4v14H6Z" /><path {...common} d="M14 3v5h4M9 12h6M9 16h4" /></> : null}
      {name === "image" ? <><rect {...common} x="3" y="4" width="18" height="16" rx="2" /><circle {...common} cx="8" cy="9" r="1.5" /><path {...common} d="m4 18 5-5 4 3 4-6 4 8" /></> : null}
      {name === "person" ? <><circle {...common} cx="12" cy="7" r="3.5" /><path {...common} d="M5 21v-3a7 7 0 0 1 14 0v3" /></> : null}
      {name === "place" ? <><path {...common} d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle {...common} cx="12" cy="10" r="2.5" /></> : null}
      {name === "faction" ? <><circle {...common} cx="8" cy="8" r="3" /><circle {...common} cx="16" cy="8" r="3" /><path {...common} d="M3 20a5 5 0 0 1 10 0m-2 0a5 5 0 0 1 10 0" /></> : null}
      {name === "thread" ? <><path {...common} d="M5 7h14M5 12h14M5 17h14" /><circle {...common} cx="8" cy="7" r="1" /><circle {...common} cx="16" cy="12" r="1" /></> : null}
      {name === "link" ? <><path {...common} d="m9 15-2 2a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0m1-3 2-2a3 3 0 0 1 4 4l-3 3a3 3 0 0 1-4 0m-2 2 6-6" /></> : null}
      {name === "close" ? <path {...common} d="m6 6 12 12M18 6 6 18" /> : null}
      {name === "collapse" ? <path {...common} d="M4 14h6v6m10-10h-6V4m-4 10-6 6m10-10 6-6" /> : null}
      {name === "fit" ? <path {...common} d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4" /> : null}
      {name === "selection" ? <><rect {...common} x="4" y="5" width="16" height="14" rx="1" strokeDasharray="2.5 2.5" /><path {...common} d="M8 9h8M8 13h5" /></> : null}
      {name === "search" ? <><circle {...common} cx="10.8" cy="10.8" r="6.5" /><path {...common} d="m16 16 4.5 4.5" /></> : null}
      {name === "relic" ? <><path {...common} d="M7 20V4h6a5 5 0 0 1 0 10H7m5 0 5 6" /><path {...common} d="M4 21h16" /></> : null}
      {name === "librarian" ? <><circle {...common} cx="12" cy="12" r="7" /><circle {...common} cx="12" cy="12" r="2" /><path {...common} d="m12 1 2 9 9 2-9 2-2 9-2-9-9-2 9-2 2-9Z" /></> : null}
      {name === "zoomOut" ? <path {...common} d="M5 12h14" /> : null}
      {name === "more" ? <><circle cx="5" cy="12" r="1.25" fill="currentColor" /><circle cx="12" cy="12" r="1.25" fill="currentColor" /><circle cx="19" cy="12" r="1.25" fill="currentColor" /></> : null}
      {name === "check" ? <path {...common} d="m5 12 4.3 4.3L19 6.8" /> : null}
      {name === "chevron" ? <path {...common} d="m9 5 7 7-7 7" /> : null}
      {name === "chevronDown" ? <path {...common} d="m5 9 7 7 7-7" /> : null}
      {name === "chevronLeft" ? <path {...common} d="m15 5-7 7 7 7" /> : null}
      {name === "book" ? <path {...common} d="M4 5.5c2.7-1.2 5.3-.9 8 1v13c-2.7-1.9-5.3-2.2-8-1v-13Zm16 0c-2.7-1.2-5.3-.9-8 1v13c2.7-1.9 5.3-2.2 8-1v-13Z" /> : null}
      {name === "prepare" ? <><path {...common} d="M5 4h14v16H5z" /><path {...common} d="M8 8h8M8 12h6M8 16h4" /></> : null}
    </svg>
  );
}

export function handleMenuKeyDown(event: React.KeyboardEvent<HTMLElement>, close: (restoreFocus?: boolean) => void) {
  const menu = event.currentTarget;
  const items = Array.from(menu.querySelectorAll<HTMLButtonElement>("[role^=menuitem]"));
  if (!items.length) return;
  const current = items.indexOf(document.activeElement as HTMLButtonElement);
  let next = -1;
  if (event.key === "ArrowDown") next = (current + 1) % items.length;
  else if (event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = items.length - 1;
  else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    close(true);
    return;
  }
  if (next >= 0) {
    event.preventDefault();
    items[next]?.focus();
  }
}

function isTextEntry(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
}
