import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { CarriageSection } from "@/components/carriage/carriage";
import type { ProxyPlacement } from "@/components/canvas/canvas-foundation";
import { CanvasWorkspace } from "@/components/workspace/canvas-workspace";
import type { WorkspaceCarriageDefinition } from "@/components/workspace/workspace-shell";

const PLACEMENT: ProxyPlacement = {
  id: "thread-01",
  kind: "thread",
  title: "Three knocks beneath the quay",
  note: "The same rhythm was heard before every missing boat.",
  x: 40,
  y: 40,
  width: 240,
  height: 160,
  tone: "archive"
};

const LEFT: WorkspaceCarriageDefinition = {
  id: "stage",
  label: "Stage",
  title: "Stage",
  defaultWidth: 300,
  content: <CarriageSection title="Current scene">The flooded archive</CarriageSection>
};

const RIGHT: WorkspaceCarriageDefinition = {
  id: "librarian",
  label: "Librarian",
  title: "The Librarian",
  defaultWidth: 340,
  content: <CarriageSection title="Pinned context">The tide ledger</CarriageSection>
};

const OriginalResizeObserver = globalThis.ResizeObserver;

beforeEach(() => {
  globalThis.ResizeObserver = class ImmediateResizeObserver {
    private callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback(
        [
          {
            target,
            contentRect: { width: 1000, height: 700 } as DOMRectReadOnly
          } as ResizeObserverEntry
        ],
        this as unknown as ResizeObserver
      );
    }

    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  globalThis.ResizeObserver = OriginalResizeObserver;
});

function renderCanvas(onPlacementsChange = vi.fn()) {
  render(
    <CanvasWorkspace
      leftCarriage={LEFT}
      rightCarriage={RIGHT}
      layoutWidth={1440}
      minCenterWidth={620}
      initialPlacements={[PLACEMENT]}
      initialView="origin"
      onPlacementsChange={onPlacementsChange}
    />
  );
  return onPlacementsChange;
}

describe("Canvas inside workspace geometry", () => {
  it("switches to Hand with H and pans from a card without selecting it", () => {
    renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    const world = screen.getByTestId("canvas-world");
    const placement = screen.getByRole("button", { name: /^thread: Three knocks beneath the quay\./ });
    const before = world.getAttribute("data-viewport-x");

    fireEvent.keyDown(viewport, { key: "h" });
    expect(viewport.getAttribute("data-tool")).toBe("hand");

    fireEvent.pointerDown(placement, { button: 0, pointerId: 51, clientX: 560, clientY: 430 });
    fireEvent.pointerMove(viewport, { pointerId: 51, clientX: 620, clientY: 430 });
    fireEvent.pointerUp(viewport, { button: 0, pointerId: 51, clientX: 620, clientY: 430 });

    expect(world.getAttribute("data-viewport-x")).not.toBe(before);
    expect(placement.getAttribute("aria-pressed")).toBe("false");
    fireEvent.keyDown(viewport, { key: "v" });
    expect(viewport.getAttribute("data-tool")).toBe("select");
  });

  it("keeps an existing selection when Escape leaves Hand mode", () => {
    renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    const placement = screen.getByRole("button", { name: /^thread: Three knocks beneath the quay\./ });
    fireEvent.pointerDown(placement, { button: 0, pointerId: 52, clientX: 560, clientY: 430 });
    fireEvent.pointerUp(viewport, { button: 0, pointerId: 52, clientX: 560, clientY: 430 });
    expect(placement.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(viewport, { key: "h" });
    fireEvent.keyDown(viewport, { key: "Escape" });
    expect(viewport.getAttribute("data-tool")).toBe("select");
    expect(placement.getAttribute("aria-pressed")).toBe("true");
  });

  it("zooms a mouse wheel and a trackpad pinch around the cursor", () => {
    renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    const world = screen.getByTestId("canvas-world");
    const anchor = { x: 720, y: 410 };

    const before = worldPointUnderCursor(world, anchor);
    fireEvent.wheel(viewport, { clientX: anchor.x, clientY: anchor.y, deltaY: -120, deltaMode: 0 });
    const afterWheel = worldPointUnderCursor(world, anchor);

    expect(Number(world.getAttribute("data-viewport-scale"))).toBeGreaterThan(1);
    expect(afterWheel.x).toBeCloseTo(before.x, 7);
    expect(afterWheel.y).toBeCloseTo(before.y, 7);

    const scaleAfterWheel = Number(world.getAttribute("data-viewport-scale"));
    fireEvent.wheel(viewport, {
      clientX: anchor.x,
      clientY: anchor.y,
      deltaY: -8,
      deltaMode: 0,
      ctrlKey: true
    });
    const afterPinch = worldPointUnderCursor(world, anchor);

    expect(Number(world.getAttribute("data-viewport-scale"))).toBeGreaterThan(scaleAfterWheel);
    expect(afterPinch.x).toBeCloseTo(before.x, 7);
    expect(afterPinch.y).toBeCloseTo(before.y, 7);
  });

  it("keeps precision trackpad scroll as pan", () => {
    renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    const world = screen.getByTestId("canvas-world");

    fireEvent.wheel(viewport, { deltaX: 12, deltaY: 18, deltaMode: 0 });

    expect(world.getAttribute("data-viewport-scale")).toBe("1");
    expect(world.getAttribute("data-viewport-x")).toBe("488");
    expect(world.getAttribute("data-viewport-y")).toBe("332");
  });

  it("pans from a Placement with Ctrl-drag or temporary Space-drag", () => {
    renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    const world = screen.getByTestId("canvas-world");
    const placement = screen.getByRole("button", { name: /^thread: Three knocks beneath the quay\./ });

    fireEvent.pointerDown(placement, {
      button: 0,
      pointerId: 21,
      clientX: 560,
      clientY: 430,
      ctrlKey: true
    });
    fireEvent.pointerMove(viewport, { pointerId: 21, clientX: 600, clientY: 455 });
    fireEvent.pointerUp(viewport, { button: 0, pointerId: 21, clientX: 600, clientY: 455 });
    expect(world.getAttribute("data-viewport-x")).toBe("540");
    expect(world.getAttribute("data-viewport-y")).toBe("375");
    expect(placement.getAttribute("style")).toContain("left: 40px");

    fireEvent.keyDown(window, { code: "Space" });
    fireEvent.pointerDown(placement, { button: 0, pointerId: 22, clientX: 600, clientY: 455 });
    fireEvent.pointerMove(viewport, { pointerId: 22, clientX: 620, clientY: 445 });
    fireEvent.pointerUp(viewport, { button: 0, pointerId: 22, clientX: 620, clientY: 445 });
    fireEvent.keyUp(window, { code: "Space" });

    expect(world.getAttribute("data-viewport-x")).toBe("560");
    expect(world.getAttribute("data-viewport-y")).toBe("365");
    expect(placement.getAttribute("style")).toContain("left: 40px");
  });

  it("preserves additive Ctrl-click selection when the pointer does not become a pan", () => {
    renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    const placement = screen.getByRole("button", { name: /^thread: Three knocks beneath the quay\./ });

    fireEvent.pointerDown(placement, {
      button: 0,
      pointerId: 23,
      clientX: 560,
      clientY: 430,
      ctrlKey: true
    });
    fireEvent.pointerUp(viewport, { button: 0, pointerId: 23, clientX: 560, clientY: 430 });

    expect(placement.getAttribute("aria-pressed")).toBe("true");
  });

  it("uses a stationary double middle click for Zoom Extents without disturbing middle-drag pan", () => {
    renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    const world = screen.getByTestId("canvas-world");

    fireEvent.pointerDown(viewport, { button: 1, pointerId: 31, clientX: 300, clientY: 240 });
    fireEvent.pointerMove(viewport, { pointerId: 31, clientX: 336, clientY: 260 });
    fireEvent.pointerUp(viewport, { button: 1, pointerId: 31, clientX: 336, clientY: 260 });
    expect(world.getAttribute("data-viewport-x")).toBe("536");
    expect(world.getAttribute("data-viewport-y")).toBe("370");

    fireEvent.pointerDown(viewport, { button: 1, pointerId: 32, clientX: 300, clientY: 240 });
    fireEvent.pointerUp(viewport, { button: 1, pointerId: 32, clientX: 300, clientY: 240 });
    fireEvent.pointerDown(viewport, { button: 1, pointerId: 33, clientX: 302, clientY: 242 });
    fireEvent.pointerUp(viewport, { button: 1, pointerId: 33, clientX: 302, clientY: 242 });

    expect(world.getAttribute("data-viewport-scale")).toBe("1");
    expect(world.getAttribute("data-viewport-x")).toBe("340");
    expect(world.getAttribute("data-viewport-y")).toBe("230");
  });

  it("opens a restrained Canvas menu at right click and closes it with Escape", () => {
    renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");

    expect(fireEvent.contextMenu(viewport, { clientX: 420, clientY: 280 })).toBe(false);
    const menu = screen.getByRole("menu", { name: "Canvas context menu" });
    expect(screen.getByRole("menuitem", { name: "Zoom Extents" })).toBeDefined();
    expect(menu.getAttribute("data-world-x")).toBe("-80");
    expect(menu.getAttribute("data-world-y")).toBe("-70");

    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Canvas context menu" })).toBeNull();
  });

  it("snaps placement coordinates to the same adaptive step rendered by the dot grid", () => {
    const onPlacementsChange = renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    const placement = screen.getByRole("button", { name: /^thread: Three knocks beneath the quay\./ });

    expect(viewport.getAttribute("data-grid-step")).toBe("32");
    expect(viewport.getAttribute("style")).toContain("background-size: 32px 32px");
    expect(viewport.getAttribute("style")).toContain("background-position: 484px 334px");

    fireEvent.pointerDown(placement, { button: 0, pointerId: 41, clientX: 560, clientY: 430 });
    fireEvent.pointerMove(viewport, { pointerId: 41, clientX: 610, clientY: 430 });
    fireEvent.pointerUp(viewport, { button: 0, pointerId: 41, clientX: 610, clientY: 430 });

    const latest = onPlacementsChange.mock.calls.at(-1)?.[0] as readonly ProxyPlacement[];
    expect(latest[0]?.x).toBe(96);
    expect(latest[0]?.y).toBe(32);
    expect((latest[0]?.x ?? 1) % 32).toBe(0);
    expect((latest[0]?.y ?? 1) % 32).toBe(0);
  });

  it("keeps camera, selection, and Placement coordinates stable when docks open", () => {
    const onPlacementsChange = renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    const world = screen.getByTestId("canvas-world");
    const placement = screen.getByRole("button", { name: /^thread: Three knocks beneath the quay\./ });

    fireEvent.wheel(viewport, { deltaX: 18, deltaY: 24 });
    const cameraBeforeDock = world.getAttribute("style");
    const placementBeforeDock = placement.getAttribute("style");

    fireEvent.pointerDown(placement, { button: 0, pointerId: 1, clientX: 560, clientY: 430 });
    fireEvent.pointerUp(viewport, { pointerId: 1, clientX: 560, clientY: 430 });
    expect(placement.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Open Stage carriage" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Librarian carriage" }));

    expect(screen.getByLabelText("Relic workspace").getAttribute("data-left-mode")).toBe("overlay");
    expect(screen.getByLabelText("Relic workspace").getAttribute("data-right-mode")).toBe("overlay");
    expect(world.getAttribute("style")).toBe(cameraBeforeDock);
    expect(placement.getAttribute("style")).toBe(placementBeforeDock);
    expect(placement.getAttribute("aria-pressed")).toBe("true");
    expect(onPlacementsChange).not.toHaveBeenCalled();
  });

  it("keeps marquee selection working inside the resized central viewport", () => {
    renderCanvas();
    fireEvent.click(screen.getByRole("button", { name: "Open Stage carriage" }));
    const viewport = screen.getByTestId("canvas-viewport");
    const placement = screen.getByRole("button", { name: /^thread: Three knocks beneath the quay\./ });

    fireEvent.pointerDown(viewport, { button: 0, pointerId: 2, clientX: 510, clientY: 360 });
    fireEvent.pointerMove(viewport, { pointerId: 2, clientX: 800, clientY: 600 });
    fireEvent.pointerUp(viewport, { pointerId: 2, clientX: 800, clientY: 600 });

    expect(placement.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("1 selected")).toBeDefined();
  });

  it("keeps drag and resize results unchanged by a later docking change", () => {
    const onPlacementsChange = renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    const placement = screen.getByRole("button", { name: /^thread: Three knocks beneath the quay\./ });

    fireEvent.pointerDown(placement, { button: 0, pointerId: 3, clientX: 560, clientY: 430 });
    fireEvent.pointerMove(viewport, { pointerId: 3, clientX: 608, clientY: 478 });
    fireEvent.pointerUp(viewport, { pointerId: 3, clientX: 608, clientY: 478 });
    const positionAfterDrag = placement.getAttribute("style");
    expect(positionAfterDrag).not.toContain("left: 40px");

    const resize = screen.getByRole("button", { name: "Resize se" });
    fireEvent.pointerDown(resize, { button: 0, pointerId: 4, clientX: 780, clientY: 590 });
    fireEvent.pointerMove(viewport, { pointerId: 4, clientX: 828, clientY: 638 });
    fireEvent.pointerUp(viewport, { pointerId: 4, clientX: 828, clientY: 638 });
    const sizeAfterResize = placement.getAttribute("style");
    const writesBeforeDock = onPlacementsChange.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Open Librarian carriage" }));

    expect(placement.getAttribute("style")).toBe(sizeAfterResize);
    expect(onPlacementsChange).toHaveBeenCalled();
    expect(onPlacementsChange).toHaveBeenCalledTimes(writesBeforeDock);
  });
});

function worldPointUnderCursor(world: HTMLElement, point: { x: number; y: number }) {
  const x = Number(world.getAttribute("data-viewport-x"));
  const y = Number(world.getAttribute("data-viewport-y"));
  const scale = Number(world.getAttribute("data-viewport-scale"));
  return { x: (point.x - x) / scale, y: (point.y - y) / scale };
}

describe("Canvas keyboard and interrupted input", () => {
  it("selects an individual object with the keyboard and moves it without opening Focus", () => {
    const changed = renderCanvas();
    const placement = screen.getByRole("button", { name: /^thread: Three knocks beneath the quay\./ });
    expect(placement.tabIndex).toBe(0);
    fireEvent.keyDown(placement, { key: "Enter" });
    expect(placement.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(placement, { key: "ArrowRight" });
    expect(changed).toHaveBeenCalled();
    expect(placement.style.left).not.toBe("40px");
    fireEvent.keyDown(screen.getByRole("button", { name: "Resize se" }), { key: "ArrowRight" });
    expect(parseFloat(placement.style.width)).toBeGreaterThan(PLACEMENT.width);
    fireEvent.keyDown(placement, { key: "Escape" });
    expect(placement.getAttribute("aria-pressed")).toBe("false");
  });

  it("does not reserve Space when a native control has focus", () => {
    renderCanvas();
    const zoom = screen.getByRole("button", { name: "Zoom in" });
    expect(fireEvent.keyDown(zoom, { key: " ", code: "Space" })).toBe(true);
    expect(screen.getByTestId("canvas-viewport").hasAttribute("data-space-held")).toBe(false);
  });

  it("ignores a different pointer while dragging", () => {
    const changed = renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    const placement = screen.getByRole("button", { name: /^thread: Three knocks beneath the quay\./ });
    fireEvent.pointerDown(placement, { button: 0, pointerId: 10, clientX: 560, clientY: 430 });
    fireEvent.pointerMove(viewport, { pointerId: 11, clientX: 900, clientY: 600 });
    fireEvent.pointerUp(viewport, { pointerId: 10, clientX: 560, clientY: 430 });
    expect(changed).not.toHaveBeenCalled();
    expect(placement.style.left).toBe("40px");
  });

  it.each(["lostpointercapture", "pointercancel", "blur"])("rolls back a moved placement on %s", async (interruption) => {
    renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    const placement = screen.getByRole("button", { name: /^thread: Three knocks beneath the quay\./ });
    const original = placement.getAttribute("style");
    fireEvent.pointerDown(placement, { button: 0, pointerId: 12, clientX: 560, clientY: 430 });
    fireEvent.pointerMove(viewport, { pointerId: 12, clientX: 656, clientY: 478 });
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    expect(placement.getAttribute("style")).not.toBe(original);
    if (interruption === "blur") fireEvent.blur(window);
    else fireEvent(viewport, new PointerEvent(interruption, { pointerId: 12, bubbles: true }));
    expect(placement.getAttribute("style")).toBe(original);
    expect(viewport.hasAttribute("data-manipulating")).toBe(false);
  });

  it("navigates the context menu and restores Canvas focus", () => {
    renderCanvas();
    const viewport = screen.getByTestId("canvas-viewport");
    fireEvent.contextMenu(viewport, { clientX: 400, clientY: 200 });
    const fit = screen.getByRole("menuitem", { name: "Zoom Extents" });
    const actual = screen.getByRole("menuitem", { name: "Actual Size" });
    expect(document.activeElement).toBe(fit);
    fireEvent.keyDown(fit, { key: "ArrowDown" });
    expect(document.activeElement).toBe(actual);
    fireEvent.keyDown(actual, { key: "Escape" });
    expect(document.activeElement).toBe(viewport);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
