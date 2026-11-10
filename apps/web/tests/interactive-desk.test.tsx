import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OBJECT_DESK, OBJECT_WORKSPACE } from "@/components/world-objects/object-fixtures";

const actions = vi.hoisted(() => ({
  captureCardAction: vi.fn(), changeCollectionAction: vi.fn(), editCardBodyAction: vi.fn(), editRepresentationAction: vi.fn(),
  moveCardsAction: vi.fn(), moveCollectionCardsAction: vi.fn(), referenceObjectsAction: vi.fn(), removeCardsAction: vi.fn(),
  removeCollectionCardsAction: vi.fn(), restoreCompositionAction: vi.fn(), removeClaimAction: vi.fn(), representObjectAction: vi.fn(),
  searchWorldAction: vi.fn(), setClaimAction: vi.fn(), settleTruthAction: vi.fn()
}));
vi.mock("@/app/actions", () => actions);
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/c/desk"
}));

const { DeskSurface } = await import("@/components/desk/desk-surface");
window.PointerEvent = MouseEvent as typeof PointerEvent;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })
});

beforeEach(() => {
  vi.clearAllMocks();
  actions.changeCollectionAction.mockImplementation(async (input: { command: unknown }) => ({ state: "ok", data: { version: 2, collections: [] } }));
  actions.moveCardsAction.mockImplementation(async (input: { moves: readonly unknown[] }) => ({ state: "ok", data: input.moves }));
  actions.moveCollectionCardsAction.mockResolvedValue({ state: "ok", data: { cards: [], spatial: { version: 1, collections: [] } } });
  actions.editCardBodyAction.mockResolvedValue({ state: "ok", data: { bodyVersion: 2 } });
  actions.searchWorldAction.mockResolvedValue({ state: "ok", data: [] });
  actions.referenceObjectsAction.mockResolvedValue({ state: "ok", data: [] });
  actions.removeCardsAction.mockResolvedValue({ state: "ok", data: [] });
  actions.removeCollectionCardsAction.mockResolvedValue({ state: "ok", data: { removed: [], spatial: { version: 1, collections: [] } } });
  actions.representObjectAction.mockResolvedValue({ state: "missing" });
  actions.setClaimAction.mockResolvedValue({ state: "missing" });
  actions.settleTruthAction.mockResolvedValue({ state: "missing" });
});

function renderDesk(initial = OBJECT_DESK) {
  return render(<DeskSurface initial={initial} workspace={OBJECT_WORKSPACE} />);
}

describe("Goal 06.1 interactive Desk", () => {
  it("moves only the member dragged after the collection itself was selected", async () => {
    const initial = {
      ...OBJECT_DESK,
      spatial: { version: 1, collections: [{ id: "research", title: "Research collection", cardIds: OBJECT_DESK.cards.slice(0, 3).map(card => card.cardId), collapsed: false }] }
    };
    renderDesk(initial);
    const canvas = screen.getByRole("application", { name: "Desk canvas" });
    fireEvent.click(screen.getByRole("button", { name: "Research collection" }));
    const member = screen.getByRole("article", { name: "character: Mara Veyra" });
    fireEvent.pointerDown(member, { button: 0, pointerId: 1, clientX: 120, clientY: 120 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 180, clientY: 160 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 180, clientY: 160 });
    await waitFor(() => expect(actions.moveCollectionCardsAction).toHaveBeenCalled());
    const last = actions.moveCollectionCardsAction.mock.calls.at(-1)?.[0] as { moves?: readonly { cardId: string }[] };
    expect(last.moves).toHaveLength(1);
    expect(last.moves?.[0]?.cardId).toBe(OBJECT_DESK.cards[0]!.cardId);
  });

  it("opens a canvas context menu, dismisses it on blank click, and supports Shift+F10", async () => {
    renderDesk();
    const canvas = screen.getByRole("application", { name: "Desk canvas" });
    fireEvent.contextMenu(canvas, { clientX: 320, clientY: 240 });
    expect(screen.getByRole("menu", { name: "Canvas actions" })).toBeTruthy();
    fireEvent.pointerDown(canvas, { button: 0, clientX: 20, clientY: 20 });
    fireEvent.pointerUp(canvas, { button: 0, clientX: 20, clientY: 20 });
    expect(screen.queryByRole("menu", { name: "Canvas actions" })).toBeNull();

    const card = screen.getByRole("article", { name: "character: Mara Veyra" });
    fireEvent.pointerDown(card, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    fireEvent.keyDown(card, { key: "F10", shiftKey: true });
    expect(screen.getByRole("menu", { name: "Card actions" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Card actions" })).toBeNull();
  });

  it("commits an intentional resize through the Board presentation path", async () => {
    renderDesk();
    const card = screen.getByRole("article", { name: "character: Mara Veyra" });
    fireEvent.pointerDown(card, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(screen.getByRole("application", { name: "Desk canvas" }), { pointerId: 1 });
    const handle = screen.getByRole("button", { name: "Resize card" });
    fireEvent.pointerDown(handle, { button: 0, pointerId: 2, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(screen.getByRole("application", { name: "Desk canvas" }), { pointerId: 2, clientX: 260, clientY: 250 });
    fireEvent.pointerUp(screen.getByRole("application", { name: "Desk canvas" }), { pointerId: 2, clientX: 260, clientY: 250 });
    await waitFor(() => expect(actions.moveCardsAction).toHaveBeenCalled());
    const move = actions.moveCardsAction.mock.calls.at(-1)?.[0] as { moves?: readonly { width?: number; height?: number }[] };
    expect(move.moves?.[0]?.width).toBeGreaterThan(340);
    expect(move.moves?.[0]?.height).toBeGreaterThan(300);
  });

  it("keeps the Canvas camera transform stable while Focus opens and closes", async () => {
    const user = userEvent.setup();
    renderDesk();
    const canvas = screen.getByRole("application", { name: "Desk canvas" });
    const world = [...canvas.querySelectorAll<HTMLElement>("[style]")].find(node => node.style.transform.includes("scale("));
    expect(world).toBeTruthy();
    const before = world?.style.transform;
    await user.click(within(screen.getByRole("article", { name: "character: Mara Veyra" })).getByRole("button", { name: "Open Focus" }));
    const focus = screen.getByRole("complementary", { name: /Character Focus/i });
    expect(focus.getAttribute("data-entity-focus")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Close Focus" }));
    expect(world?.style.transform).toBe(before);
  });
});
