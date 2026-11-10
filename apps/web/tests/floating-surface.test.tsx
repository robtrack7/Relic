import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";

import { IconButton } from "@/components/ui/control";
import { FloatingSurface } from "@/components/ui/floating-surface";
import { positionFloatingSurface } from "@/components/ui/floating-position";

afterEach(() => cleanup());

function MenuHarness() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <>
    <button ref={trigger} type="button" onClick={() => setOpen(value => !value)}>Open menu</button>
    <button type="button">Next control</button>
    <FloatingSurface open={open} triggerRef={trigger} label="Actions" onClose={restore => { setOpen(false); if (restore) trigger.current?.focus(); }}>
      <button type="button" role="menuitem" aria-disabled="true">Unavailable</button>
      <button type="button" role="menuitem">Alpha</button>
      <button type="button" role="menuitem">Beta</button>
    </FloatingSurface>
  </>;
}

describe("floating positioning", () => {
  it.each([220, 1000])("keeps a %s-pixel side menu below the top of its rail trigger", height => {
    const position = positionFloatingSurface({
      trigger: { left: 20, right: 68, top: 158, bottom: 206, width: 48, height: 48 },
      panel: { width: 300, height },
      placement: "right", align: "start",
      viewport: { left: 0, top: 0, right: 1440, bottom: 900 }
    });
    expect(position.top).toBe(158);
    expect(position.left).toBe(78);
    expect(position.maxHeight).toBe(730);
    expect(position.top + Math.min(height, position.maxHeight)).toBeLessThanOrEqual(888);
  });

  it("centers on measured trigger and flips when the preferred side is constrained", () => {
    const position = positionFloatingSurface({
      trigger: { left: 900, right: 940, top: 8, bottom: 48, width: 40, height: 40 },
      panel: { width: 190, height: 180 },
      placement: "top",
      viewport: { left: 0, top: 0, right: 1000, bottom: 600 }
    });

    expect(position.side).toBe("bottom");
    expect(position.left).toBe(798);
    expect(position.top).toBe(58);
    expect(position.maxHeight).toBe(530);
  });

  it("clamps to the visual viewport while preserving an available height", () => {
    const position = positionFloatingSurface({
      trigger: { left: 2, right: 42, top: 440, bottom: 480, width: 40, height: 40 },
      panel: { width: 320, height: 400 },
      placement: "bottom",
      viewport: { left: 100, top: 20, right: 500, bottom: 500 }
    });

    expect(position.left).toBe(112);
    expect(position.top).toBe(32);
    expect(position.maxHeight).toBe(398);
  });

  it("centers side menus on the trigger and flips when the rail edge is constrained", () => {
    const position = positionFloatingSurface({
      trigger: { left: 8, right: 48, top: 240, bottom: 280, width: 40, height: 40 },
      panel: { width: 300, height: 220 },
      placement: "right",
      viewport: { left: 0, top: 0, right: 1000, bottom: 600 }
    });

    expect(position.side).toBe("right");
    expect(position.left).toBe(58);
    expect(position.top).toBe(150);

    const flipped = positionFloatingSurface({
      trigger: { left: 8, right: 48, top: 240, bottom: 280, width: 40, height: 40 },
      panel: { width: 300, height: 220 },
      placement: "left",
      viewport: { left: 0, top: 0, right: 320, bottom: 600 }
    });
    expect(flipped.side).toBe("right");
  });
});

describe("FloatingSurface keyboard and dismissal behavior", () => {
  it("dismisses a toolbar popover before an ancestor consumes Escape", () => {
    const bubbled = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      const trigger = useRef<HTMLButtonElement>(null);
      return <div onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); bubbled(); } }}>
        <button ref={trigger} onClick={() => setOpen(true)}>View controls</button>
        <FloatingSurface open={open} role="dialog" triggerRef={trigger} label="View controls" onClose={restore => { setOpen(false); if (restore) trigger.current?.focus(); }}><div role="toolbar"><button>Zoom in</button></div></FloatingSurface>
      </div>;
    }
    render(<Harness/>);
    const trigger = screen.getByRole("button", { name: "View controls" });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("button", { name: "Zoom in" }), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(bubbled).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it("starts on the first enabled item, supports navigation/typeahead, and restores Escape focus", () => {
    render(<MenuHarness />);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(trigger);

    const alpha = screen.getByRole("menuitem", { name: "Alpha" });
    const beta = screen.getByRole("menuitem", { name: "Beta" });
    expect(document.activeElement).toBe(alpha);
    fireEvent.keyDown(alpha, { key: "ArrowDown" });
    expect(document.activeElement).toBe(beta);
    fireEvent.keyDown(beta, { key: "Home" });
    expect(document.activeElement).toBe(alpha);
    fireEvent.keyDown(alpha, { key: "b" });
    expect(document.activeElement).toBe(beta);
    fireEvent.keyDown(beta, { key: "Escape" });
    expect(document.activeElement).toBe(trigger);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("dismisses on outside pointerdown and closes after Tab without trapping", () => {
    vi.useFakeTimers();
    try {
      render(<MenuHarness />);
      const trigger = screen.getByRole("button", { name: "Open menu" });
      fireEvent.click(trigger);
      fireEvent.keyDown(screen.getByRole("menuitem", { name: "Alpha" }), { key: "Tab" });
      vi.runAllTimers();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next control" }));
      expect(screen.queryByRole("menu")).toBeNull();

      fireEvent.click(trigger);
      fireEvent.pointerDown(document.body);
      expect(screen.queryByRole("menu")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("IconButton tooltip", () => {
  it("uses the custom tooltip instead of a duplicate native title", () => {
    render(<IconButton label="Open Librarian" title="Open the Librarian carriage"><span /></IconButton>);
    const button = screen.getByRole("button", { name: "Open Librarian" });
    expect(button.getAttribute("title")).toBeNull();
    fireEvent.focus(button);
    expect(screen.getByRole("tooltip").textContent).toContain("Open the Librarian carriage");
    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
