import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SpatialCollection } from "@/components/canvas/spatial-collection";

const collection = {
  id: "research",
  title: "Research collection",
  cardIds: [],
  collapsed: false
} as const;

const renderCollection = (overrides: Partial<React.ComponentProps<typeof SpatialCollection>> = {}) => render(
  <SpatialCollection
    collection={collection}
    bounds={{ x: 40, y: 40, width: 360, height: 260 }}
    cards={[]}
    selected={false}
    onMoveStart={vi.fn()}
    onNudge={vi.fn()}
    onSelect={vi.fn()}
    onToggle={vi.fn()}
    onRename={vi.fn()}
    onBrowse={vi.fn()}
    onDissolve={vi.fn()}
    {...overrides}
  />
);

describe("SpatialCollection", () => {
  it("exposes an explicit perimeter move surface without making the whole boundary draggable", () => {
    const onMoveStart = vi.fn();
    renderCollection({ onMoveStart });
    const handles = screen.getAllByRole("button", { name: "Move Research collection" });
    expect(handles).toHaveLength(4);
    fireEvent.pointerDown(handles[0]!, { button: 0, pointerId: 1 });
    expect(onMoveStart).toHaveBeenCalledTimes(1);
  });

  it("uses the shared menu dismissal contract and restores focus on Escape", () => {
    renderCollection({ onArrange: vi.fn() });
    const browse = screen.getByRole("button", { name: "Browse Research collection" });
    fireEvent.click(browse);
    expect(screen.getByRole("menu", { name: "Browse Research collection" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Browse Research collection" })).toBeNull();
    expect(document.activeElement).toBe(browse);
  });

  it("cancels an external rename request without committing on Escape blur", () => {
    const onRename = vi.fn();
    const { rerender } = renderCollection({ onRename, renameRequested: 1 });
    const input = screen.getByRole("textbox", { name: "Collection title" });
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect(onRename).not.toHaveBeenCalled();
    rerender(<SpatialCollection collection={{ ...collection, title: "Changed" }} bounds={{ x: 40, y: 40, width: 360, height: 260 }} cards={[]} selected={false} onMoveStart={vi.fn()} onNudge={vi.fn()} onSelect={vi.fn()} onToggle={vi.fn()} onRename={onRename} onBrowse={vi.fn()} onDissolve={vi.fn()} renameRequested={2} />);
    expect(screen.getByDisplayValue("Changed")).toBeTruthy();
  });
});
