import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { CanvasChrome, CanvasSelectionToolbar, type CanvasPlacement, CanvasViewControls, TRAY_INSET, ProfileControl, shouldShowMinimap } from "@/components/canvas/canvas-controls";



const OriginalResizeObserver = globalThis.ResizeObserver;

beforeEach(() => {
  globalThis.ResizeObserver = class ImmediateResizeObserver {
    private callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback(
        [{ target, contentRect: { width: 1000, height: 700 } as DOMRectReadOnly } as ResizeObserverEntry],
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

/** Two placements far apart: enough world to exceed one view when zoomed out. */
const PLACEMENTS: readonly CanvasPlacement[] = [
  { id: "mara", x: 40, y: 40, width: 240, height: 160 },
  { id: "bell", x: 1800, y: 900, width: 300, height: 210 }
];

describe("contextual minimap rule", () => {
  const size = { width: 1000, height: 700 };

  it("stays out of ordinary close-up work in Auto", () => {
    expect(shouldShowMinimap("auto", PLACEMENTS, { x: 0, y: 0, scale: 1 }, size)).toBe(false);
  });

  it("appears for a sufficiently zoomed-out Board that exceeds the visible world", () => {
    expect(shouldShowMinimap("auto", PLACEMENTS, { x: 500, y: 350, scale: 0.4 }, size)).toBe(true);
  });

  it("honours explicit Always and Off choices", () => {
    expect(shouldShowMinimap("always", PLACEMENTS, { x: 0, y: 0, scale: 1 }, size)).toBe(true);
    expect(shouldShowMinimap("off", PLACEMENTS, { x: 0, y: 0, scale: 0.2 }, size)).toBe(false);
  });
});

describe("profile control", () => {
  it("opens a compact account menu and restores focus on Escape", () => {
    const onSettings = vi.fn();
    render(<ProfileControl label="MV" onProfileRequest={onSettings} />);
    const trigger = screen.getByRole("button", { name: "Open profile MV" });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu", { name: "Profile menu" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: /Settings/ })).toBeDefined();
    fireEvent.keyDown(screen.getByRole("menu", { name: "Profile menu" }), { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Profile menu" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: /Settings/ }));
    expect(onSettings).toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeDefined();
    const select = screen.getByLabelText("Motion preference");
    fireEvent.change(select, { target: { value: "reduced" } });
    expect(document.documentElement.dataset.relicMotion).toBe("reduced");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: /Help/ }));
    expect(screen.getByRole("dialog", { name: "Help and support" }).textContent).toContain("Keyboard guide");
  });
});

describe("responsive view controls", () => {
  it("collapses from measured dock collision, stays stable, and can be dismissed", () => {
    const { container } = render(<div data-canvas-chrome>
      <div data-tool-area />
      <CanvasViewControls scale={1} hasSelection={false} onZoomOut={vi.fn()} onResetZoom={vi.fn()} onZoomIn={vi.fn()} onFitBoard={vi.fn()} onFitSelection={vi.fn()} onMinimapModeChange={vi.fn()} />
    </div>);
    const root = container.querySelector<HTMLElement>("[data-view-controls-wrap]") ?? container.querySelector<HTMLElement>("[class*='viewControlWrap']")!;
    const tool = container.querySelector<HTMLElement>("[data-tool-area]")!;
    const measure = container.querySelector<HTMLElement>("[data-view-measure]")!;
    Object.defineProperty(root, "getBoundingClientRect", { configurable: true, value: () => ({ left: 650, right: 694, top: 650, bottom: 700, width: 44, height: 50 }) });
    Object.defineProperty(tool, "getBoundingClientRect", { configurable: true, value: () => ({ left: 350, right: 650, top: 650, bottom: 700, width: 300, height: 50 }) });
    Object.defineProperty(measure, "getBoundingClientRect", { configurable: true, value: () => ({ left: 415, right: 694, top: 650, bottom: 700, width: 279, height: 50 }) });
    fireEvent(window, new Event("resize"));
    expect(screen.getByRole("button", { name: "Canvas view controls" })).toBeDefined();
    const compact = screen.getByRole("button", { name: "Canvas view controls" });
    fireEvent.click(compact);
    expect(screen.getByRole("toolbar", { name: "Canvas view controls" })).toBeDefined();
    fireEvent.click(compact);
    expect(screen.queryByRole("toolbar", { name: "Canvas view controls" })).toBeNull();
    Object.defineProperty(tool, "getBoundingClientRect", { configurable: true, value: () => ({ left: 0, right: 390, top: 650, bottom: 700, width: 390, height: 50 }) });
    fireEvent(window, new Event("resize"));
    expect(screen.queryByRole("button", { name: "Canvas view controls" })).toBeNull();
    expect(screen.getByRole("toolbar", { name: "Canvas view controls" })).toBeDefined();
  });
});

describe("selection toolbar placement", () => {
  it("keeps the action surface inside a narrow viewport and leaves a deliberate gap", () => {
    render(
      <CanvasSelectionToolbar bounds={{ x: 4, y: 8, width: 72, height: 40 }} viewportSize={{ width: 320, height: 180 }}>
        <button type="button">Open details</button>
      </CanvasSelectionToolbar>
    );
    const toolbar = screen.getByRole("toolbar", { name: "Selection actions" });
    expect(Number.parseFloat(toolbar.style.left)).toBeGreaterThanOrEqual(12);
    expect(Number.parseFloat(toolbar.style.top)).toBeGreaterThanOrEqual(12);
    expect(toolbar.dataset.placement).toBe("below");
  });

  it("hangs as a tray from an expanded card's bottom edge, inside its rounded corners", () => {
    render(
      <CanvasSelectionToolbar attach scale={1} bounds={{ x: 200, y: 200, width: 400, height: 168 }} viewportSize={{ width: 1440, height: 900 }}>
        <button type="button">Open Focus</button>
      </CanvasSelectionToolbar>
    );
    const toolbar = screen.getByRole("toolbar", { name: "Selection actions" });
    expect(toolbar.dataset.placement).toBe("tray");
    expect(toolbar.style.top).toBe("368px");
    expect(toolbar.style.left).toBe(`${200 + TRAY_INSET}px`);
    expect(toolbar.style.width).toBe(`${400 - 2 * TRAY_INSET}px`);
  });

  it("floats instead of attaching when the card is too narrow or the tray would leave the viewport", () => {
    const { rerender } = render(
      <CanvasSelectionToolbar attach bounds={{ x: 200, y: 200, width: 300, height: 168 }} viewportSize={{ width: 1440, height: 900 }}>
        <button type="button">Open Focus</button>
      </CanvasSelectionToolbar>
    );
    const toolbar = screen.getByRole("toolbar", { name: "Selection actions" });
    expect(toolbar.dataset.placement).toBe("above");
    rerender(
      <CanvasSelectionToolbar attach bounds={{ x: 200, y: 600, width: 400, height: 280 }} viewportSize={{ width: 1440, height: 900 }}>
        <button type="button">Open Focus</button>
      </CanvasSelectionToolbar>
    );
    expect(toolbar.dataset.placement).not.toBe("tray");
  });
});

function Chrome(props: Partial<Parameters<typeof CanvasChrome>[0]>) {
  const noop = () => {};
  return <CanvasChrome contextLabel="Desk" showTopFrame={false} showCanvasControls scale={1} selectionCount={0} placements={[]}
    viewport={{ x: 0, y: 0, scale: 1 }} viewportSize={{ width: 1440, height: 900 }} selectedIds={[]} minimapMode="auto"
    onZoomOut={noop} onResetZoom={noop} onZoomIn={noop} onFitBoard={noop} onFitSelection={noop} onNavigate={noop} onMinimapModeChange={noop} {...props}/>;
}

describe("Canvas chrome", () => {
  it("explains unavailable actions without activating tools or acting", () => {
    const onToolAction = vi.fn();
    render(<Chrome onToolAction={onToolAction} availableToolActions={["Fragment"]}/>);
    const connect = screen.getByRole("button", { name: "Connect" });
    expect(connect.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(connect);
    expect(connect.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Compose" }));
    const boardLink = screen.getByRole("menuitem", { name: /Board link/ });
    expect(boardLink.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(boardLink);
    expect(onToolAction).not.toHaveBeenCalled();
  });

  it("supports keyboard menus, restores trigger focus, and leaves copy shortcuts alone", () => {
    render(<Chrome onToolAction={vi.fn()}/>);
    const create = screen.getByRole("button", { name: "Create" });
    create.focus();
    fireEvent.keyDown(create, { key: "c", ctrlKey: true });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(create);
    const first = screen.getByRole("menuitem", { name: "Fragment" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: /^Source/ }));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(document.activeElement).toBe(create);
    expect(screen.queryByRole("menu")).toBeNull();

    const options = screen.getByRole("button", { name: "Canvas view options" });
    fireEvent.click(options);
    const auto = screen.getByRole("menuitemradio", { name: "Auto" });
    expect(document.activeElement).toBe(auto);
    fireEvent.keyDown(auto, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Always" }));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(document.activeElement).toBe(options);
  });

  it("reports a chosen creation without touching world material", () => {
    const onToolAction = vi.fn();
    render(<Chrome onToolAction={onToolAction}/>);
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByRole("menu", { name: "Create menu" })).toBeDefined();
    fireEvent.click(screen.getByRole("menuitem", { name: "Fragment" }));
    expect(onToolAction).toHaveBeenCalledWith("create", "Fragment");
  });
});
