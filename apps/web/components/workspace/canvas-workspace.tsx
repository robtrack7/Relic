"use client";

import { useCallback, useRef, useState } from "react";

import {
  CanvasFoundation,
  type CanvasFoundationHandle,
  type CanvasFoundationProps,
  type ProxyPlacement
} from "@/components/canvas/canvas-foundation";
import {
  CanvasChrome,
  type MinimapMode,
  type PersistentCanvasTool
} from "@/components/canvas/canvas-controls";
import type { Point, Size, Viewport } from "@/lib/desk/viewport";

import { WorkspaceShell, type WorkspaceChromeControls, type WorkspaceShellProps } from "./workspace-shell";

export type CanvasWorkspaceProps = Omit<WorkspaceShellProps, "children" | "chrome" | "canvasChrome"> &
  Omit<CanvasFoundationProps, "height" | "showViewControls"> & {
    contextLabel?: string;
    contextMode?: string;
    profileLabel?: string;
    initialMinimapMode?: MinimapMode;
    onToolChange?: (tool: PersistentCanvasTool) => void;
    onToolAction?: (tool: "create" | "compose", action: string) => void;
    availableToolActions?: readonly string[];
    onSearchRequest?: () => void;
    onRelicMenuRequest?: () => void;
    onProfileRequest?: () => void;
  };

/**
 * The integrated spatial workspace. Dock geometry changes the window around
 * CanvasFoundation; camera and Placement state remain owned by the Canvas.
 */
export function CanvasWorkspace({
  initialPlacements = [],
  initialView,
  diagnostics,
  showGrid = true,
  onPlacementsChange,
  onViewportChange,
  onViewportSizeChange,
  onSelectionChange,
  contextLabel = "Blackwater Board",
  contextMode,
  profileLabel,
  initialMinimapMode = "auto",
  onToolChange,
  onToolAction,
  availableToolActions,
  onSearchRequest,
  onRelicMenuRequest,
  onProfileRequest,
  ...shellProps
}: CanvasWorkspaceProps) {
  const canvas = useRef<CanvasFoundationHandle>(null);
  const [placements, setPlacements] = useState<readonly ProxyPlacement[]>(initialPlacements);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [viewportSize, setViewportSize] = useState<Size>({ width: 0, height: 0 });
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [minimapMode, setMinimapMode] = useState<MinimapMode>(initialMinimapMode);
  const [gridVisible, setGridVisible] = useState(showGrid);
  const [activeTool, setActiveTool] = useState<PersistentCanvasTool>("select");

  const placementsChanged = useCallback(
    (next: readonly ProxyPlacement[]) => {
      setPlacements(next);
      onPlacementsChange?.(next);
    },
    [onPlacementsChange]
  );

  const viewportChanged = useCallback(
    (next: Viewport) => {
      setViewport(next);
      onViewportChange?.(next);
    },
    [onViewportChange]
  );

  const viewportSizeChanged = useCallback(
    (next: Size) => {
      setViewportSize(next);
      onViewportSizeChange?.(next);
    },
    [onViewportSizeChange]
  );

  const selectionChanged = useCallback(
    (next: readonly string[]) => {
      setSelectedIds(next);
      onSelectionChange?.(next);
    },
    [onSelectionChange]
  );

  const navigate = useCallback((point: Point) => canvas.current?.centerOn(point), []);

  const renderChrome = useCallback((dock: WorkspaceChromeControls, showTopFrame: boolean, showCanvasControls: boolean) => (
    <CanvasChrome
      activeTool={activeTool}
      showTopFrame={showTopFrame}
      showCanvasControls={showCanvasControls}
      contextLabel={contextLabel}
      contextMode={contextMode}
      profileLabel={profileLabel}
      scale={viewport.scale}
      selectionCount={selectedIds.length}
      placements={placements}
      viewport={viewport}
      viewportSize={viewportSize}
      selectedIds={selectedIds}
      minimapMode={minimapMode}
      gridVisible={gridVisible}
      onGridVisibleChange={setGridVisible}
      librarianOpen={dock.rightOpen}
      onToggleLibrarian={shellProps.rightCarriage ? dock.toggleRight : undefined}
      onZoomOut={() => canvas.current?.zoomOut()}
      onResetZoom={() => canvas.current?.resetZoom()}
      onZoomIn={() => canvas.current?.zoomIn()}
      onFitBoard={() => canvas.current?.fitBoard()}
      onFitSelection={() => canvas.current?.fitSelection()}
      onNavigate={navigate}
      onMinimapModeChange={setMinimapMode}
      onToolChange={(next) => { setActiveTool(next); onToolChange?.(next); }}
      connectAvailable={Boolean(onToolChange)}
      onToolAction={onToolAction}
      availableToolActions={availableToolActions}
      onSearchRequest={showTopFrame ? onSearchRequest : undefined}
      onRelicMenuRequest={onRelicMenuRequest}
      onProfileRequest={onProfileRequest}
    />
  ), [activeTool, availableToolActions, contextLabel, contextMode, gridVisible, minimapMode, navigate, onProfileRequest, onRelicMenuRequest, onSearchRequest, onToolAction, onToolChange, placements, profileLabel, selectedIds, shellProps.rightCarriage, viewport, viewportSize]);

  return (
    <WorkspaceShell
      {...shellProps}
      minCenterWidth={shellProps.minCenterWidth ?? 720}
      rightToggleInChrome={false}
      chrome={(dock) => renderChrome(dock, true, false)}
      canvasChrome={(dock) => renderChrome(dock, false, true)}
    >
      <CanvasFoundation
        ref={canvas}
        initialPlacements={initialPlacements}
        initialView={initialView}
        diagnostics={diagnostics}
        height="100%"
        showViewControls={false}
        showGrid={gridVisible}
        activeTool={activeTool}
        onPlacementsChange={placementsChanged}
        onViewportChange={viewportChanged}
        onViewportSizeChange={viewportSizeChanged}
        onSelectionChange={selectionChanged}
      />
    </WorkspaceShell>
  );
}
