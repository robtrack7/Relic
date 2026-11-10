import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CarriageSection, resizedCarriageWidth } from "@/components/carriage/carriage";
import { WorkspaceShell, resolveWorkspaceGeometry, type WorkspaceCarriageDefinition } from "@/components/workspace/workspace-shell";

afterEach(cleanup);
const STAGE: WorkspaceCarriageDefinition = {
  id: "stage", label: "Stage", title: "Stage", defaultWidth: 316, minWidth: 284, maxWidth: 392,
  content: <CarriageSection title="Current scene">Three knocks beneath the quay</CarriageSection>
};
const LIBRARIAN: WorkspaceCarriageDefinition = {
  id: "librarian", label: "Librarian", title: "The Librarian", defaultWidth: 348, minWidth: 300, maxWidth: 440,
  content: <CarriageSection title="Pinned context"><textarea aria-label="Librarian draft" defaultValue="The Drowned Bell" /></CarriageSection>
};

describe("workspace geometry", () => {
  it.each([
    [false, false, "closed", "closed", 1440],
    [true, false, "overlay", "closed", 1124],
    [false, true, "closed", "overlay", 1092],
    [true, true, "overlay", "overlay", 776]
  ] as const)("preserves desktop left=%s right=%s", (leftOpen, rightOpen, left, right, centerWidth) => {
    expect(resolveWorkspaceGeometry({ availableWidth: 1440, minCenterWidth: 620,
      left: { open: leftOpen, width: 316 }, right: { open: rightOpen, width: 348 } })).toEqual({ left, right, centerWidth });
  });
  it("shares a constrained viewport with one carriage", () => {
    expect(resolveWorkspaceGeometry({ availableWidth: 760, minCenterWidth: 620, right: { open: true, width: 348 } }))
      .toEqual({ left: "closed", right: "shared", centerWidth: 412 });
  });
  it.each([760, 1000, 1283])("uses a dual carriage workspace when %s pixels cannot fit all three contexts", availableWidth => {
    expect(resolveWorkspaceGeometry({ availableWidth, minCenterWidth: 620,
      left: { open: true, width: 316 }, right: { open: true, width: 348 } }))
      .toEqual({ left: "split", right: "split", centerWidth: 0 });
  });
  it("never splits the workspace out from under the Builder", () => {
    expect(resolveWorkspaceGeometry({ availableWidth: 1000, minCenterWidth: 620, preferRightOverlay: true,
      left: { open: true, width: 316 }, right: { open: true, width: 348 } }))
      .toEqual({ left: "overlay", right: "overlay", centerWidth: 336 });
  });
});

describe("Builder composition", () => {
  const builderFrame = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-layer]")!.closest<HTMLElement>("[data-left-mode]")!;
  it("folds Stage to its pill when opening the Builder would leave it under its working width", () => {
    const onLeftOpenChange = vi.fn();
    const { rerender, container } = render(<WorkspaceShell leftCarriage={STAGE} rightCarriage={LIBRARIAN} defaultLeftOpen onLeftOpenChange={onLeftOpenChange} layoutWidth={1024}><div>Canvas</div></WorkspaceShell>);
    rerender(<WorkspaceShell leftCarriage={STAGE} rightCarriage={LIBRARIAN} defaultLeftOpen onLeftOpenChange={onLeftOpenChange} builderActive layoutWidth={1024}><div>Builder</div></WorkspaceShell>);
    expect(onLeftOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("complementary", { name: "Stage carriage" })).toBeNull();
    expect(builderFrame(container).dataset.builder).toBe("true");
  });
  it("keeps Stage beside a Builder that still has its working width, and honours reopening it", () => {
    const onLeftOpenChange = vi.fn();
    const { rerender } = render(<WorkspaceShell leftCarriage={STAGE} rightCarriage={LIBRARIAN} defaultLeftOpen onLeftOpenChange={onLeftOpenChange} layoutWidth={1600}><div>Canvas</div></WorkspaceShell>);
    rerender(<WorkspaceShell leftCarriage={STAGE} rightCarriage={LIBRARIAN} defaultLeftOpen onLeftOpenChange={onLeftOpenChange} builderActive layoutWidth={1600}><div>Builder</div></WorkspaceShell>);
    expect(onLeftOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("complementary", { name: "Stage carriage" })).toBeDefined();
  });
});

describe("carriage workspace", () => {
  it("pairs Focus beside Librarian while preserving Builder geometry on a wide workspace", () => {
    render(<WorkspaceShell rightCarriage={LIBRARIAN} rightOpen focusOpen builderActive layoutWidth={1440}
      focusPanel={<aside aria-label="Focus panel">Mara Veyra</aside>}><div>Builder</div></WorkspaceShell>);
    const workspace = screen.getByLabelText("Relic workspace");
    expect(workspace.getAttribute("data-focus-mode")).toBe("paired");
    expect(workspace.querySelector('[data-focus-panel-region][data-focus-visible="true"]')).toBeTruthy();
    expect(workspace.style.getPropertyValue("--workspace-builder-right-inset")).toBe("772px");
    expect(workspace.style.getPropertyValue("--workspace-builder-left-inset")).toBe("64px");
  });
  it("keeps one 12px gutter between every paired surface", () => {
    render(<WorkspaceShell rightCarriage={LIBRARIAN} rightOpen focusOpen builderActive layoutWidth={1600}
      focusPanel={<aside aria-label="Focus panel">Mara Veyra</aside>}><div>Builder</div></WorkspaceShell>);
    const workspace = screen.getByLabelText("Relic workspace");
    const dock = workspace.querySelector<HTMLElement>('[data-carriage-region="right"]')!;
    const focus = workspace.querySelector<HTMLElement>("[data-focus-panel-region]")!;
    const edge = 20, gap = 12, focusWidth = 420;
    const librarianShell = parseFloat(dock.style.getPropertyValue("--dock-width")) - edge;
    // Focus sits one gutter inside the Librarian's visible shell, not its padded dock.
    expect(focus.style.getPropertyValue("--focus-right-offset")).toBe(`${librarianShell + gap}px`);
    // The Builder ends one gutter before Focus.
    expect(workspace.style.getPropertyValue("--workspace-builder-right-inset")).toBe(`${focusWidth + gap + librarianShell + gap}px`);
  });
  it("uses the lane marks as a preview toggle that never covers the lane", () => {
    render(<WorkspaceShell focusOpen builderActive layoutWidth={1024}
      focusPanel={<aside aria-label="Focus panel">Mara Veyra</aside>}><div>Builder</div></WorkspaceShell>);
    const workspace = screen.getByLabelText("Relic workspace");
    const mark = screen.getByRole("button", { name: "Focus preview" });
    const focus = workspace.querySelector<HTMLElement>("[data-focus-panel-region]")!;
    expect(mark.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(mark);
    expect(mark.getAttribute("aria-pressed")).toBe("true");
    expect(focus.getAttribute("data-focus-visible")).toBe("true");
    expect(focus.style.getPropertyValue("--focus-right-offset")).toBe("64px");
    expect(screen.queryByRole("group", { name: "Right workspace panel" })?.contains(mark)).toBe(true);
    fireEvent.click(mark);
    expect(mark.getAttribute("aria-pressed")).toBe("false");
    expect(focus.hasAttribute("data-focus-suppressed")).toBe(true);
  });
  it("folds a closed Librarian to a lane mark beside the Builder instead of a floating pill", () => {
    render(<WorkspaceShell rightCarriage={LIBRARIAN} builderActive layoutWidth={1600}><div>Builder</div></WorkspaceShell>);
    const workspace = screen.getByLabelText("Relic workspace");
    const lane = screen.getByRole("group", { name: "Right workspace panel" });
    expect(lane.querySelector('[data-carriage-toggle="right"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Librarian carriage" })).toBeTruthy();
    expect(workspace.style.getPropertyValue("--workspace-builder-right-inset")).toBe("64px");
  });
  it("keeps both right-panel trees mounted and exposes an explicit switch when pairing cannot fit", () => {
    render(<WorkspaceShell rightCarriage={LIBRARIAN} rightOpen focusOpen builderActive layoutWidth={1024}
      focusPanel={<aside aria-label="Focus panel">Mara Veyra</aside>}><div>Builder</div></WorkspaceShell>);
    const workspace = screen.getByLabelText("Relic workspace");
    expect(workspace.getAttribute("data-focus-mode")).toBe("shared");
    expect(screen.getByRole("group", { name: "Right workspace panel" })).toBeTruthy();
    expect(workspace.querySelector('[data-focus-panel-region]')).toBeTruthy();
    expect(workspace.querySelector('[data-carriage-region="right"]')).toBeTruthy();
  });
  it.each([768, 1024])("prioritizes Builder's usable width and opens Focus on demand at %ipx", width => {
    render(<WorkspaceShell focusOpen builderActive layoutWidth={width}
      focusPanel={<aside aria-label="Focus panel">Mara Veyra</aside>}><div>Builder</div></WorkspaceShell>);
    const workspace = screen.getByLabelText("Relic workspace");
    expect(workspace.getAttribute("data-focus-mode")).toBe("shared");
    expect(workspace.style.getPropertyValue("--workspace-builder-right-inset")).toBe("64px");
    expect(screen.getByRole("button", { name: "Focus preview" })).toBeTruthy();
    expect(workspace.querySelector('[data-focus-panel-region][data-focus-suppressed]')).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Focus preview" }));
    expect(workspace.querySelector('[data-focus-panel-region][data-focus-visible="true"]')).toBeTruthy();
    expect(workspace.style.getPropertyValue("--workspace-builder-right-inset")).toBe("64px");
  });
  it("reopens an already-retained Focus preview on an explicit entity request", () => {
    const props = { focusOpen: true, builderActive: true, layoutWidth: 768,
      focusPanel: <aside aria-label="Focus panel">Mara Veyra</aside> };
    const { rerender } = render(<WorkspaceShell {...props} focusRequest={0}><div>Builder</div></WorkspaceShell>);
    expect(screen.getByRole("button", { name: "Focus preview" })).toBeTruthy();
    rerender(<WorkspaceShell {...props} focusRequest={1}><div>Builder</div></WorkspaceShell>);
    expect(screen.getByLabelText("Relic workspace").querySelector('[data-focus-panel-region][data-focus-visible="true"]')).toBeTruthy();
  });
  it("keeps the Builder full-width when Librarian is also requested below its minimum", () => {
    render(<WorkspaceShell rightCarriage={LIBRARIAN} rightOpen focusOpen builderActive layoutWidth={768}
      focusPanel={<aside aria-label="Focus panel">Mara Veyra</aside>}><div>Builder</div></WorkspaceShell>);
    const workspace = screen.getByLabelText("Relic workspace");
    expect(workspace.getAttribute("data-right-mode")).toBe("overlay");
    expect(workspace.style.getPropertyValue("--workspace-builder-right-inset")).toBe("64px");
    expect(screen.getByRole("button", { name: "Focus preview" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Librarian" })).toBeTruthy();
  });
  it("keeps the Canvas interactive beside one carriage without dimming or dismissal", () => {
    const interact = vi.fn();
    render(<WorkspaceShell rightCarriage={LIBRARIAN} defaultRightOpen layoutWidth={760}><button onClick={interact}>Canvas object</button></WorkspaceShell>);
    const workspace = screen.getByLabelText("Relic workspace");
    expect(workspace.getAttribute("data-right-mode")).toBe("shared");
    expect(screen.getByRole("main").hasAttribute("inert")).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("global-overlay-host").getAttribute("data-active")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Canvas object" }));
    expect(interact).toHaveBeenCalledOnce();
    expect(workspace.getAttribute("data-right-mode")).toBe("shared");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(workspace.getAttribute("data-right-mode")).toBe("shared");
  });
  it("opens both carriages and preserves content through split, single and desktop layouts", () => {
    const carriage = { ...STAGE, content: <CarriageSection title="Scene notes" collapsible><textarea aria-label="Scene draft" defaultValue="The bell" /></CarriageSection> };
    const props = { leftCarriage: carriage, rightCarriage: LIBRARIAN, defaultLeftOpen: true, defaultRightOpen: true };
    const { rerender } = render(<WorkspaceShell {...props} layoutWidth={1440}><input aria-label="Canvas state" defaultValue="Mara selected" /></WorkspaceShell>);
    const draft = screen.getByRole("textbox", { name: "Librarian draft" });
    const canvasState = screen.getByRole("textbox", { name: "Canvas state" });
    fireEvent.change(draft, { target: { value: "Ask about low tide" } });
    fireEvent.click(screen.getByRole("button", { name: "Scene notes" }));
    rerender(<WorkspaceShell {...props} layoutWidth={760}><input aria-label="Canvas state" defaultValue="Mara selected" /></WorkspaceShell>);
    expect(screen.getByLabelText("Relic workspace").getAttribute("data-right-mode")).toBe("split");
    expect(screen.getByRole("textbox", { name: "Librarian draft" })).toBe(draft);
    expect(screen.getByRole("button", { name: "Scene notes" }).getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Collapse The Librarian carriage" }));
    expect(screen.getByRole("textbox", { name: "Canvas state" })).toBe(canvasState);
    fireEvent.click(screen.getByRole("button", { name: "Open Librarian carriage" }));
    expect(screen.getByRole("textbox", { name: "Librarian draft" })).toBe(draft);
    expect((draft as HTMLTextAreaElement).value).toBe("Ask about low tide");
    rerender(<WorkspaceShell {...props} layoutWidth={1440}><input aria-label="Canvas state" defaultValue="Mara selected" /></WorkspaceShell>);
    expect(screen.getByLabelText("Relic workspace").getAttribute("data-right-mode")).toBe("overlay");
    expect(screen.getByRole("complementary", { name: "Stage carriage" }).style.getPropertyValue("--carriage-width")).toBe("316px");
  });
  it("resizes the split by keyboard and pointer within both content minimums", () => {
    render(<WorkspaceShell leftCarriage={STAGE} rightCarriage={LIBRARIAN} defaultLeftOpen defaultRightOpen layoutWidth={1000}><div>Canvas</div></WorkspaceShell>);
    const divider = screen.getByRole("separator", { name: "Resize carriage workspace" });
    const width = () => Number.parseInt(screen.getByRole("complementary", { name: "Stage carriage" }).style.getPropertyValue("--carriage-width"));
    const initial = width();
    fireEvent.keyDown(divider, { key: "ArrowRight" });
    expect(width()).toBe(initial + 16);
    fireEvent.keyDown(divider, { key: "Home" }); expect(width()).toBe(284);
    fireEvent.keyDown(divider, { key: "End" }); expect(width()).toBe(648);
    fireEvent.pointerDown(divider, { button: 0, pointerId: 7, clientX: 680 });
    fireEvent.pointerMove(divider, { pointerId: 7, clientX: 590 });
    fireEvent.pointerUp(divider, { pointerId: 7, clientX: 590 });
    expect(width()).toBe(558);
  });
  it("collapses deliberately and restores its launcher focus", async () => {
    render(<WorkspaceShell rightCarriage={LIBRARIAN} defaultRightOpen layoutWidth={760}><div>Canvas</div></WorkspaceShell>);
    fireEvent.click(screen.getByRole("button", { name: "Collapse The Librarian carriage" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open Librarian carriage" })));
  });
  it("preserves standard desktop resize directions and bounds", () => {
    expect(resizedCarriageWidth(316, 80, "left", 284, 392)).toBe(392);
    expect(resizedCarriageWidth(348, -40, "right", 300, 440)).toBe(388);
    render(<WorkspaceShell leftCarriage={STAGE} defaultLeftOpen layoutWidth={1440}><div>Canvas</div></WorkspaceShell>);
    const handle = screen.getByRole("button", { name: "Resize Stage carriage" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(screen.getByRole("complementary", { name: "Stage carriage" }).style.getPropertyValue("--carriage-width")).toBe("332px");
  });
});

it("preserves the inspection editor through the constrained two-carriage workspace", () => {
  const props = { leftCarriage: STAGE, rightCarriage: LIBRARIAN, defaultRightOpen: true, layoutWidth: 800,
    overlayChildren: <aside aria-label="Focus inspection"><textarea aria-label="Focus draft" defaultValue="An unfinished passage" /></aside> };
  const { container } = render(<WorkspaceShell {...props}><p>Canvas</p></WorkspaceShell>);
  const draft = screen.getByRole("textbox", { name: "Focus draft" });
  fireEvent.change(draft, { target: { value: "Keep the letter secret" } });
  fireEvent.click(screen.getByRole("button", { name: "Open Stage carriage" }));
  expect(container.querySelector("[data-contextual-overlay]")?.hasAttribute("hidden")).toBe(true);
  expect(screen.queryByRole("complementary", { name: "Focus inspection" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Collapse Stage carriage" }));
  expect(screen.getByRole("textbox", { name: "Focus draft" })).toBe(draft);
  expect((draft as HTMLTextAreaElement).value).toBe("Keep the letter secret");
});
