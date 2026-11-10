"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  CarriageFooter, CarriageHeader, CarriageIcon, CarriageLauncher, CarriageShell, clampCarriageWidth,
  type CarriageShellProps, type CarriageSide, type CarriageVariant
} from "@/components/carriage/carriage";
import styles from "./workspace-shell.module.css";
import { useSurfaceTransition } from "@/components/ui/use-surface-transition";

export type WorkspaceCarriageRenderProps = Pick<CarriageShellProps, "side" | "mode" | "width" | "minWidth" | "maxWidth" | "resizable" | "onWidthChange"> & { open: boolean; onCollapse: () => void };
export type WorkspaceCarriageDefinition = {
  id: string;
  label: string;
  title: string;
  eyebrow?: string;
  status?: ReactNode;
  statusTone?: "draft" | "ready" | "quiet";
  icon?: ReactNode;
  variant?: CarriageVariant;
  context?: ReactNode;
  content?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  render?: (props: WorkspaceCarriageRenderProps) => ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
};
export type WorkspaceCarriageMode = "closed" | "overlay" | "shared" | "split";
export type WorkspaceGeometry = { left: WorkspaceCarriageMode; right: WorkspaceCarriageMode; centerWidth: number };
export type WorkspaceChromeControls = WorkspaceGeometry & { leftOpen: boolean; rightOpen: boolean; toggleLeft: () => void; toggleRight: () => void };
/** Mirrors `--workspace-edge`. */
const WORKSPACE_EDGE = 20;
/** The space the rail keeps from surfaces beside it. */
const LANE_GAP = 16;
/** A 48px mark plus its gap to the Builder. */
const BUILDER_LANE = 48 + LANE_GAP;
/** The narrowest Builder worth writing in. Opening it folds the left carriage rather than go below. */
export const BUILDER_MIN_WIDTH = 720;
type GeometryInput ={ availableWidth: number; minCenterWidth: number; left?: { open: boolean; width: number }; right?: { open: boolean; width: number }; preferRightOverlay?: boolean };

export function resolveWorkspaceGeometry({ availableWidth, minCenterWidth, left, right, preferRightOverlay = false }: GeometryInput): WorkspaceGeometry {
  const available = Math.max(0, availableWidth);
  const occupied = (left?.open ? left.width : 0) + (right?.open ? right.width : 0);
  // The Builder is the work itself: carriages never split the workspace out from
  // under it. They float beside it, and the right one folds to its lane mark.
  if (preferRightOverlay && left?.open && right?.open && available - occupied < minCenterWidth) {
    return { left: "overlay", right: "overlay", centerWidth: Math.max(0, available - occupied) };
  }
  if (left?.open && right?.open && available - occupied < minCenterWidth) {
    return { left: "split", right: "split", centerWidth: 0 };
  }
  const constrained = available - occupied < minCenterWidth;
  if (preferRightOverlay && right?.open && !left?.open && constrained) {
    return { left: "closed", right: "overlay", centerWidth: available };
  }
  // A single carriage shares space with a useful, fully interactive Canvas.
  const singleWidth = Math.min(occupied, Math.max(0, available - Math.min(280, available * .4)));
  return {
    left: left?.open ? constrained ? "shared" : "overlay" : "closed",
    right: right?.open ? constrained ? "shared" : "overlay" : "closed",
    centerWidth: Math.max(0, available - (constrained ? singleWidth : occupied))
  };
}

export type WorkspaceShellProps = {
  children: ReactNode;
  chrome?: ReactNode | ((controls: WorkspaceChromeControls) => ReactNode);
  canvasChrome?: ReactNode | ((controls: WorkspaceChromeControls) => ReactNode);
  navigation?: ReactNode | ((controls: WorkspaceChromeControls) => ReactNode);
  overlayChildren?: ReactNode;
  leftCarriage?: WorkspaceCarriageDefinition;
  rightCarriage?: WorkspaceCarriageDefinition;
  /** Right-side editorial Focus projection. The panel owns its own header/footer. */
  focusPanel?: ReactNode;
  focusOpen?: boolean;
  focusRequest?: number;
  builderActive?: boolean;
  onFocusOpenChange?: (open: boolean) => void;
  defaultLeftOpen?: boolean;
  defaultRightOpen?: boolean;
  leftOpen?: boolean;
  rightOpen?: boolean;
  onLeftOpenChange?: (open: boolean) => void;
  onRightOpenChange?: (open: boolean) => void;
  rightToggleInChrome?: boolean;
  minCenterWidth?: number;
  layoutWidth?: number;
  height?: number | string;
  ariaLabel?: string;
};

/** Wide carriages overlay a stable Canvas; constrained workspaces share or split. */
export function WorkspaceShell({ children, chrome, canvasChrome, navigation, overlayChildren, leftCarriage, rightCarriage,
  focusPanel, focusOpen = false, focusRequest = 0, builderActive = false, onFocusOpenChange,
  defaultLeftOpen = false, defaultRightOpen = false, leftOpen: controlledLeft, rightOpen: controlledRight,
  onLeftOpenChange, onRightOpenChange, rightToggleInChrome = false, minCenterWidth = 620,
  layoutWidth, height = "100dvh", ariaLabel = "Relic workspace" }: WorkspaceShellProps) {
  const root = useRef<HTMLDivElement>(null);
  const focusAfterDismiss = useRef<CarriageSide | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState(layoutWidth ?? 1440);
  const [internalLeft, setInternalLeft] = useState(Boolean(leftCarriage && defaultLeftOpen));
  const [internalRight, setInternalRight] = useState(Boolean(rightCarriage && defaultRightOpen));
  const [leftWidth, setLeftWidth] = useState(() => initialWidth(leftCarriage));
  const [rightWidth, setRightWidth] = useState(() => initialWidth(rightCarriage));
  const focusWidth = 420;
  const [activeRightPanel, setActiveRightPanel] = useState<"focus" | "librarian">("focus");
  const [focusPreviewRequested, setFocusPreviewRequested] = useState(false);
  const [librarianPreviewRequested, setLibrarianPreviewRequested] = useState(false);
  const previousBuilderActive = useRef(builderActive);
  const lastRequestedPanels = useRef({ focus: Boolean(focusOpen), librarian: false });
  useLayoutEffect(() => {
    if (!focusRequest) return;
    setActiveRightPanel("focus"); setFocusPreviewRequested(true); setLibrarianPreviewRequested(false);
  }, [focusRequest]);
  const [splitRatio, setSplitRatio] = useState(.5);
  const [resizing, setResizing] = useState(false);
  const splitGesture = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);
  const leftOpen = Boolean(leftCarriage && (controlledLeft ?? internalLeft));
  const rightOpen = Boolean(rightCarriage && (controlledRight ?? internalRight));
  const leftNode = useRef<HTMLDivElement>(null);
  const rightNode = useRef<HTMLDivElement>(null);
  const focusNode = useRef<HTMLDivElement>(null);
  // Keep the previous presentation mode while a carriage is withdrawing. The
  // controlled open flag changes geometry immediately, but flipping a dock to
  // `closed` during its opacity/translation frame makes it snap behind the
  // Canvas before the animation has finished.
  const leftMode = useRef<WorkspaceCarriageMode>("closed");
  const rightMode = useRef<WorkspaceCarriageMode>("closed");
  const leftPresent = useSurfaceTransition(leftOpen, leftNode, "left");
  const rightPresent = useSurfaceTransition(rightOpen, rightNode, "right");
  const focusPresent = useSurfaceTransition(Boolean(focusOpen), focusNode, "right");
  const setLeftOpen = (open: boolean) => { setInternalLeft(open); onLeftOpenChange?.(open); };
  const setRightOpen = (open: boolean) => { setInternalRight(open); onRightOpenChange?.(open); };
  useEffect(() => {
    if (Boolean(focusOpen) && !lastRequestedPanels.current.focus) setActiveRightPanel("focus");
    if (rightOpen && !lastRequestedPanels.current.librarian) setActiveRightPanel("librarian");
    lastRequestedPanels.current = { focus: Boolean(focusOpen), librarian: rightOpen };
  }, [focusOpen, rightOpen]);
  useEffect(() => {
    if (!focusOpen || (builderActive && !previousBuilderActive.current)) setFocusPreviewRequested(false);
    previousBuilderActive.current = builderActive;
  }, [builderActive, focusOpen]);

  useLayoutEffect(() => {
    if (layoutWidth !== undefined) { setMeasuredWidth(layoutWidth); return; }
    if (!root.current) return;
    // Resolve dock geometry before the Canvas measures its first fit. A stale
    // default width otherwise fits into a briefly squeezed centre, then leaves
    // the world unnecessarily tiny after a carriage becomes an overlay.
    const initialWidth = root.current.getBoundingClientRect().width;
    if (initialWidth > 0) setMeasuredWidth(initialWidth);
    const observer = new ResizeObserver(([entry]) => { if (entry?.contentRect.width) setMeasuredWidth(entry.contentRect.width); });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [layoutWidth]);

  const geometry = useMemo(() => resolveWorkspaceGeometry({ availableWidth: measuredWidth, minCenterWidth,
    left: leftCarriage ? { open: leftOpen || leftPresent, width: leftWidth } : undefined,
    right: rightCarriage ? { open: rightOpen || rightPresent, width: rightWidth } : undefined,
    preferRightOverlay: builderActive
  }), [builderActive, leftCarriage, leftOpen, leftPresent, leftWidth, measuredWidth, minCenterWidth, rightCarriage, rightOpen, rightPresent, rightWidth]);
  const split = geometry.left === "split";
  const splitInset = navigation ? 84 : 20;
  const splitAvailable = Math.max(0, measuredWidth - splitInset - 20 - 12);
  const splitMinimum = Math.min(Math.max(leftCarriage?.minWidth ?? 280, 280), splitAvailable / 2);
  const splitMaximum = splitAvailable - Math.min(Math.max(rightCarriage?.minWidth ?? 280, 280), splitAvailable / 2);
  const splitLeft = Math.min(splitMaximum, Math.max(splitMinimum, Math.round(splitAvailable * splitRatio)));
  const sharedWidth = Math.max(0, measuredWidth - geometry.centerWidth);
  const actualLeft = split ? splitLeft : geometry.left === "shared" ? sharedWidth : leftWidth;
  const actualRight = split ? splitAvailable - splitLeft : geometry.right === "shared" ? sharedWidth : rightWidth;
  const visibleLeft = leftOpen || leftPresent;
  const visibleLibrarian = rightOpen || rightPresent;
  const baseCenterWidth = geometry.centerWidth;
  const rightGap = 12;
  // Focus is a second right-side carriage. Pairing is decided from measured
  // geometry, not a viewport breakpoint, so Builder always keeps its usable
  // minimum when a preview is requested.
  const workingLeft = visibleLeft ? actualLeft : 64;
  const workingWidth = measuredWidth - workingLeft - 40 - (visibleLibrarian ? actualRight + rightGap : 0);
  const canPairFocus = Boolean(focusPanel) && !split && workingWidth - focusWidth - rightGap >= (builderActive ? 540 : 360);
  const builderBlocksPairing = builderActive && !canPairFocus;
  const focusVisible = Boolean(focusPanel && focusOpen && (builderBlocksPairing
    ? focusPreviewRequested
    : canPairFocus || !visibleLibrarian || activeRightPanel === "focus"));
  const overlayInsets = (geometry.left === "overlay" && visibleLeft ? actualLeft : 0) + (geometry.right === "overlay" && visibleLibrarian ? actualRight : 0);
  const builderCannotFitLibrarian = Boolean(builderActive && visibleLibrarian && baseCenterWidth - overlayInsets < 540);
  const librarianSuppressed = Boolean(rightOpen && ((focusOpen && !canPairFocus && activeRightPanel === "focus") || (builderCannotFitLibrarian && !librarianPreviewRequested)));
  const librarianVisible = Boolean(rightCarriage && visibleLibrarian && !librarianSuppressed);
  const focusMode = focusPanel && (focusOpen || focusPresent) ? canPairFocus ? "paired" : "shared" : "closed";
  if (geometry.left !== "closed") leftMode.current = geometry.left;
  if (geometry.right !== "closed") rightMode.current = geometry.right;
  const visualLeftMode = geometry.left === "closed" && leftPresent ? leftMode.current : geometry.left;
  const visualRightMode = geometry.right === "closed" && rightPresent ? rightMode.current : geometry.right;
  const updateSplit = (width: number) => setSplitRatio(Math.min(splitMaximum, Math.max(splitMinimum, width)) / (splitAvailable || 1));
  const collapse = (side: CarriageSide) => {
    focusAfterDismiss.current = side;
    if (side === "left") setLeftOpen(false); else setRightOpen(false);
  };
  const open = (side: CarriageSide) => {
    if (side === "left") setLeftOpen(true);
    else { setLibrarianPreviewRequested(true); setActiveRightPanel("librarian"); setRightOpen(true); }
  };
  const requestFocus = (openFocus: boolean) => { setActiveRightPanel("focus"); setFocusPreviewRequested(true); onFocusOpenChange?.(openFocus); };
  useEffect(() => {
    const side = focusAfterDismiss.current;
    const stillPresent = side === "left" ? leftPresent : rightPresent;
    if (!side || geometry[side] !== "closed" || stillPresent) return;
    root.current?.querySelector<HTMLButtonElement>(`[data-carriage-toggle="${side}"]`)?.focus();
    focusAfterDismiss.current = null;
  }, [geometry.left, geometry.right, leftPresent, rightPresent]);
  useEffect(() => {
    if (split && (root.current?.querySelector('[data-layer="central-workspace"]')?.contains(document.activeElement) || root.current?.querySelector('[data-contextual-overlay]')?.contains(document.activeElement))) {
      root.current.querySelector<HTMLButtonElement>('[data-carriage-region="left"] button')?.focus();
    }
  }, [split]);
  const dockControls: WorkspaceChromeControls = { ...geometry, leftOpen, rightOpen,
    toggleLeft: () => leftOpen ? collapse("left") : open("left"),
    toggleRight: () => builderCannotFitLibrarian && rightOpen ? setLibrarianPreviewRequested(current => !current) : rightOpen ? collapse("right") : open("right")
  };
  const renderLayer = (layer: WorkspaceShellProps["chrome"]) => typeof layer === "function" ? layer(dockControls) : layer;
  const renderDock = (side: CarriageSide, carriage: WorkspaceCarriageDefinition | undefined, width: number, onWidthChange: (width: number) => void) => {
    if (!carriage) return null;
    const mode = side === "left" ? visualLeftMode : visualRightMode;
    const props: WorkspaceCarriageRenderProps = { side, mode: mode === "overlay" ? "overlay" : "docked", width,
      minWidth: carriage.minWidth, maxWidth: carriage.maxWidth, resizable: mode === "overlay", onWidthChange,
      open: mode !== "closed", onCollapse: () => collapse(side) };
    const isVisible = side === "left" ? leftPresent : rightPresent;
    const isLogicalOpen = side === "left" ? leftOpen : rightOpen;
    const isFocusSuppressed = side === "right" && !librarianVisible;
    return <div ref={side === "left" ? leftNode : rightNode} className={styles.dock} hidden={!isVisible} inert={!isLogicalOpen || isFocusSuppressed} aria-hidden={isFocusSuppressed || undefined} data-carriage-region={side} data-mode={mode} data-panel-suppressed={isFocusSuppressed || undefined} data-layer={`${side}-dock`} style={{ "--dock-width": `${width}px`, ...(side === "right" && librarianLaneShift && mode === "overlay" ? { right: librarianLaneShift } : null) } as CSSProperties}>
      {carriage.render ? carriage.render(props) : <CarriageShell {...props} id={`carriage-${carriage.id}`} variant={carriage.variant} ariaLabel={`${carriage.label} carriage`}
        header={<CarriageHeader side={side} title={carriage.title} eyebrow={carriage.eyebrow} status={carriage.status} statusTone={carriage.statusTone} icon={carriage.icon} variant={carriage.variant} onCollapse={props.onCollapse} />}
        context={carriage.context} actions={carriage.actions}
        footer={<CarriageFooter>{carriage.footer ?? <span>{carriage.label === "Stage" ? "Session workspace" : "Context stays with your work"}</span>}</CarriageFooter>}>
        {carriage.content}
      </CarriageShell>}
    </div>;
  };

  // A dock's width includes its own outer workspace edge; the visible shell is
  // narrower by that edge. Every gutter between neighbouring surfaces is rightGap.
  const librarianSpan = Math.max(0, actualRight - WORKSPACE_EDGE);
  const focusInGeometry = (focusVisible && canPairFocus) || (focusPresent && !focusOpen && canPairFocus);
  const librarianInGeometry = librarianVisible && (!builderActive || canPairFocus);
  const rightLauncherVisible = Boolean(rightCarriage && geometry.right === "closed" && !rightPresent && !rightToggleInChrome);
  // While the Builder is open, the right-hand panels it cannot sit beside fold
  // to 48px marks in a lane of their own, mirroring the navigation rail. The
  // marks are the switch: pressed shows that panel as a preview, pressed again
  // hides it. Nothing floats over the Builder's header.
  const laneFocus = Boolean(focusPanel && focusOpen && builderBlocksPairing);
  const laneLibrarian: "open" | "toggle" | null = !builderActive || !rightCarriage ? null
    : rightLauncherVisible ? "open"
    : rightOpen && (laneFocus || builderCannotFitLibrarian) ? "toggle" : null;
  const builderLane = builderActive && (laneFocus || laneLibrarian !== null);
  // Paired surfaces stack from the right edge; the Builder, or the lane, sits beside them.
  const pairedStack = (focusInGeometry ? focusWidth : 0) + (librarianInGeometry ? librarianSpan : 0) + (focusInGeometry && librarianInGeometry ? rightGap : 0);
  const builderLaneRight = WORKSPACE_EDGE + (pairedStack ? pairedStack + LANE_GAP : 0);
  // Previews open just inside the lane, never over it.
  const librarianLaneShift = builderLane && !librarianInGeometry ? BUILDER_LANE : 0;
  const focusRightOffset = (librarianVisible ? librarianSpan + rightGap : 0) + (builderLane && !focusInGeometry ? BUILDER_LANE : 0);
  const toggleFocusPreview = () => {
    if (focusVisible) { setFocusPreviewRequested(false); return; }
    setLibrarianPreviewRequested(false); requestFocus(true);
  };
  const toggleLibrarianPreview = () => {
    if (librarianVisible) { setLibrarianPreviewRequested(false); setActiveRightPanel("focus"); return; }
    setActiveRightPanel("librarian"); setFocusPreviewRequested(false); setLibrarianPreviewRequested(true);
  };
  // The lane keeps LANE_GAP on both sides, like the rail; without it neighbours keep one rightGap.
  const builderRightInset = builderLane ? (pairedStack ? pairedStack + LANE_GAP : 0) + BUILDER_LANE
    : pairedStack ? pairedStack + rightGap : 0;
  // The navigation rail always owns a column: at the workspace edge, or LANE_GAP
  // beside an open left carriage. The Builder starts LANE_GAP after it.
  const railLeft = !split && leftOpen ? actualLeft + LANE_GAP : WORKSPACE_EDGE;
  const builderLeftInset = (visibleLeft ? Math.max(railLeft, actualLeft + LANE_GAP) : railLeft) + 48 + LANE_GAP - WORKSPACE_EDGE;
  const builderWidth = measuredWidth - builderLeftInset - builderRightInset - 2 * WORKSPACE_EDGE;
  // Composition rule: opening the Builder folds Stage or Prepare to its pill when
  // the Builder would otherwise fall below its working width. Reopening the
  // carriage afterwards is the GM's explicit choice and is honoured.
  const builderWasActive = useRef(builderActive);
  const builderSqueezed = builderActive && leftOpen && builderWidth < BUILDER_MIN_WIDTH;
  useEffect(() => {
    const opened = builderActive && !builderWasActive.current;
    builderWasActive.current = builderActive;
    if (opened && builderSqueezed) setLeftOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the Builder opening decides
  }, [builderActive]);

  return <div ref={root} className={styles.workspace} aria-label={ariaLabel} role={split ? "main" : "group"}
    data-left-mode={geometry.left} data-right-mode={geometry.right} data-focus-mode={focusMode} data-center-width={geometry.centerWidth} data-split={split || undefined} data-builder={builderActive || undefined} data-resizing={resizing || undefined}
    style={{ height, gridTemplateColumns: `${geometry.left === "shared" ? actualLeft : 0}px minmax(0, 1fr) ${geometry.right === "shared" ? actualRight : 0}px`,
      "--split-inset": `${splitInset}px`, "--split-left": `${splitLeft}px`,
      "--workspace-left-inset": `${geometry.left === "overlay" ? actualLeft : 0}px`,
      "--workspace-right-inset": `${geometry.right === "overlay" ? actualRight : 0}px`,
      "--workspace-focus-left-inset": `${leftOpen || leftPresent ? actualLeft : 64}px`,
      "--workspace-focus-right-inset": `${rightOpen || rightPresent ? actualRight : 0}px`,
      "--workspace-builder-left-inset": `${builderLeftInset}px`,
      "--workspace-builder-right-inset": `${builderRightInset}px`,
      "--workspace-focus-panel-width": `${focusWidth}px`,
      "--workspace-focus-right-offset": `${focusRightOffset}px`,
      "--workspace-focus-switch-right": `${librarianVisible ? actualRight + 32 : focusWidth + 32}px`,
      "--navigation-left": `${railLeft}px` } as CSSProperties}>
    {renderDock("left", leftCarriage, actualLeft, setLeftWidth)}
    <main className={styles.center} data-layer="central-workspace" inert={split} aria-hidden={split || undefined}>
      <h1 className={styles.screenReaderOnly}>{ariaLabel}</h1>
      <div className={styles.content}>{children}</div>
      {canvasChrome ? <div className={styles.chrome}>{renderLayer(canvasChrome)}</div> : null}
    </main>
    {renderDock("right", rightCarriage, actualRight, setRightWidth)}
    {focusPanel ? <div ref={focusNode} className={styles.focusDock} hidden={!focusPresent} inert={!focusOpen || !focusVisible} aria-hidden={focusOpen && !focusVisible || undefined} data-focus-panel-region data-focus-visible={focusVisible || undefined} data-focus-suppressed={focusOpen && !focusVisible || undefined} data-focus-mode={focusMode} style={{ "--focus-right-offset": `${focusRightOffset}px` } as CSSProperties}>
      {focusPanel}
    </div> : null}
    {split ? <><h1 className={styles.screenReaderOnly}>Carriage workspace</h1><p className={styles.splitHint}>Collapse either carriage to return to the Canvas</p></> : null}
    {chrome ? <div className={styles.globalChrome}>{renderLayer(chrome)}</div> : null}
    {navigation ? <div className={styles.navigation}>{renderLayer(navigation)}</div> : null}
    <div className={styles.launchers} role="group" aria-label="Workspace carriages" data-focus-visible={focusVisible || focusPresent || undefined}>
        {leftCarriage && geometry.left === "closed" && !leftPresent ? <CarriageLauncher label={leftCarriage.label} side="left" variant={leftCarriage.variant ?? "prepare"} controls={`carriage-${leftCarriage.id}`} compact={builderActive} onOpen={() => open("left")} /> : null}
        {rightCarriage && rightLauncherVisible && !builderActive ? <CarriageLauncher label={rightCarriage.label} side="right" variant={rightCarriage.variant ?? "librarian"} controls={`carriage-${rightCarriage.id}`} onOpen={() => { setActiveRightPanel("librarian"); open("right"); }} /> : null}
    </div>
    {builderLane ? <div className={styles.builderLane} role="group" aria-label="Right workspace panel" style={{ "--builder-lane-right": `${builderLaneRight}px` } as CSSProperties}>
      {laneLibrarian === "open" && rightCarriage ? <button type="button" className={styles.laneMark} data-carriage-toggle="right" aria-label={`Open ${rightCarriage.label} carriage`} aria-expanded={false} aria-controls={`carriage-${rightCarriage.id}`} title={rightCarriage.label}
        onClick={() => { setActiveRightPanel("librarian"); open("right"); }}><CarriageIcon kind={rightCarriage.variant ?? "librarian"} /></button> : null}
      {laneLibrarian === "toggle" && rightCarriage ? <button type="button" className={styles.laneMark} aria-label={rightCarriage.label} aria-pressed={librarianVisible} title={librarianVisible ? `Hide ${rightCarriage.label}` : `Show ${rightCarriage.label}`}
        onClick={toggleLibrarianPreview}><CarriageIcon kind={rightCarriage.variant ?? "librarian"} /></button> : null}
      {laneFocus ? <button type="button" className={styles.laneMark} aria-label="Focus preview" aria-pressed={focusVisible} title={focusVisible ? "Hide Focus preview" : "Show Focus preview"}
        onClick={toggleFocusPreview}><CarriageIcon kind="neutral" /></button> : null}
    </div> : null}
    {!builderActive && focusPanel && focusOpen && visibleLibrarian && !canPairFocus ? <div className={styles.panelSwitch} style={{ "--switch-right": `${librarianVisible ? actualRight + 32 : focusWidth + 32}px` } as CSSProperties} role="group" aria-label="Right workspace panel">
      <button type="button" aria-pressed={focusVisible} onClick={() => requestFocus(true)}>Focus</button>
      <button type="button" aria-pressed={!focusVisible} onClick={() => { setActiveRightPanel("librarian"); setFocusPreviewRequested(false); setLibrarianPreviewRequested(true); }}>Librarian</button>
    </div> : null}
    {split ? <div className={styles.splitDivider} role="separator" tabIndex={0} aria-label="Resize carriage workspace" aria-orientation="vertical"
      aria-valuemin={Math.round(splitMinimum / (splitAvailable || 1) * 100)} aria-valuemax={Math.round(splitMaximum / (splitAvailable || 1) * 100)} aria-valuenow={Math.round(splitLeft / (splitAvailable || 1) * 100)}
      aria-valuetext={`${Math.round(splitLeft)} pixels for ${leftCarriage?.label}, ${Math.round(actualRight)} pixels for ${rightCarriage?.label}`}
      onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); splitGesture.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: splitLeft }; setResizing(true); }}
      onPointerMove={event => { const gesture = splitGesture.current; if (gesture?.pointerId === event.pointerId) updateSplit(gesture.startWidth + event.clientX - gesture.startX); }}
      onPointerUp={event => { if (splitGesture.current?.pointerId !== event.pointerId) return; splitGesture.current = null; setResizing(false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { splitGesture.current = null; setResizing(false); }} onLostPointerCapture={() => { splitGesture.current = null; setResizing(false); }}
      onDoubleClick={() => setSplitRatio(.5)}
      onKeyDown={event => { if (event.key === "Home") updateSplit(splitMinimum); else if (event.key === "End") updateSplit(splitMaximum); else if (event.key === "ArrowLeft" || event.key === "ArrowRight") updateSplit(splitLeft + (event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? 48 : 16)); else return; event.preventDefault(); }} /> : null}
    <GlobalOverlayHost active={Boolean(overlayChildren)} />
    {overlayChildren ? <div className={styles.externalOverlay} data-contextual-overlay hidden={split} inert={split} aria-hidden={split || undefined}>{overlayChildren}</div> : null}
  </div>;
}

export function GlobalOverlayHost({ active, children, onDismiss }: { active: boolean; children?: ReactNode; onDismiss?: () => void }) {
  useEffect(() => {
    if (!active || !onDismiss) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key !== "Escape" || event.defaultPrevented) return; event.preventDefault(); onDismiss(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onDismiss]);
  return <div className={styles.overlayHost} data-layer="global-overlay" data-active={active || undefined} data-testid="global-overlay-host">
    {active && onDismiss ? <div className={styles.overlayScrim} aria-hidden="true" onPointerDown={onDismiss} /> : null}
    <div className={styles.overlayContent}>{children}</div>
  </div>;
}
function initialWidth(carriage: WorkspaceCarriageDefinition | undefined) {
  return carriage ? clampCarriageWidth(carriage.defaultWidth ?? 336, carriage.minWidth ?? 280, carriage.maxWidth ?? 440) : 0;
}
