import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  asCompositionId,
  asWorldId,
  type DeskView,
  type Workspace
} from "@/lib/world/model";

const captureCardAction = vi.fn();
const editCardBodyAction = vi.fn();
const moveCardsAction = vi.fn();
const removeCardsAction = vi.fn();
const referenceObjectsAction = vi.fn();
const createBoardAction = vi.fn();
const push = vi.fn();

vi.mock("@/app/actions", () => ({
  captureCardAction: (input: unknown) => captureCardAction(input),
  editCardBodyAction: (input: unknown) => editCardBodyAction(input),
  moveCardsAction: (input: unknown) => moveCardsAction(input),
  removeCardsAction: (input: unknown) => removeCardsAction(input),
  referenceObjectsAction: (input: unknown) => referenceObjectsAction(input),
  createBoardAction: (input: unknown) => createBoardAction(input)
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() })
}));

const { DeskSurface } = await import("@/components/desk/desk-surface");

const DESK_ID = asCompositionId("00000000-0000-4000-8000-0000000000bb");
const BOARD_ID = asCompositionId("00000000-0000-4000-8000-0000000000cc");

const EMPTY_DESK: DeskView = {
  worldId: asWorldId("00000000-0000-4000-8000-0000000000aa"),
  compositionId: DESK_ID,
  kind: "desk",
  name: "Desk",
  cards: []
};

const SOLO: Workspace = {
  worldId: EMPTY_DESK.worldId,
  name: "Blackwater",
  compositions: [{ compositionId: DESK_ID, kind: "desk", name: "Desk", cardCount: 0 }]
};

const WITH_BOARD: Workspace = {
  ...SOLO,
  compositions: [
    ...SOLO.compositions,
    { compositionId: BOARD_ID, kind: "board", name: "The Drowned Coast", cardCount: 0 }
  ]
};

const renderDesk = (workspace: Workspace = SOLO) =>
  render(<DeskSurface workspace={workspace} initial={EMPTY_DESK} />);

beforeEach(() => {
  vi.clearAllMocks();
  captureCardAction.mockImplementation(async (input: Record<string, unknown>) => ({
    state: "ok",
    data: {
      cardId: input.cardId,
      objectId: input.objectId,
      layout: { x: input.x, y: input.y, width: input.width, height: input.height },
      z: 1,
      body: input.body,
      maturity: "pencil",
      settled: null,
      cardVersion: 1,
      bodyVersion: 1
    }
  }));
  editCardBodyAction.mockResolvedValue({ state: "ok", data: { bodyVersion: 2 } });
  moveCardsAction.mockResolvedValue({ state: "ok", data: [] });
  removeCardsAction.mockResolvedValue({ state: "ok", data: [] });
  referenceObjectsAction.mockResolvedValue({ state: "ok", data: [] });
  createBoardAction.mockImplementation(async (input: Record<string, unknown>) => ({
    state: "ok",
    data: {
      compositionId: input.compositionId,
      kind: "board",
      name: input.name,
      cardCount: 0
    }
  }));

  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {}
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

describe("capture and edit", () => {
  it("captures a card, opens it for writing, and persists the text", async () => {
    const user = userEvent.setup();
    renderDesk();

    expect(screen.getByText(/an empty desk/i)).toBeDefined();

    await user.click(screen.getByRole("button", { name: "New card" }));

    const editor = await screen.findByRole("textbox", { name: "Card text" });
    await user.type(editor, "A bell that rings for no tide");

    await waitFor(() =>
      expect(captureCardAction).toHaveBeenCalledWith(
        expect.objectContaining({ compositionId: EMPTY_DESK.compositionId, body: "" })
      )
    );

    await waitFor(
      () =>
        expect(editCardBodyAction).toHaveBeenCalledWith(
          expect.objectContaining({ body: "A bell that rings for no tide" })
        ),
      { timeout: 2000 }
    );
  });

  it("writes the body once, however many paths ask it to save", async () => {
    const user = userEvent.setup();
    renderDesk();

    await user.click(screen.getByRole("button", { name: "New card" }));
    const editor = await screen.findByRole("textbox", { name: "Card text" });
    await user.type(editor, "One thought");

    // The debounce, blur, and Escape all reach flushBody. Only the first has
    // anything to write — the rest must not re-send a stale version and turn a
    // single edit into a conflict.
    await user.keyboard("{Escape}");
    await waitFor(() => expect(editCardBodyAction).toHaveBeenCalled(), { timeout: 2000 });
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(editCardBodyAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/changed elsewhere/i)).toBeNull();
  });

  it("shows new material as Pencil, in words rather than colour alone", async () => {
    const user = userEvent.setup();
    renderDesk();
    await user.click(screen.getByRole("button", { name: "New card" }));
    expect(await screen.findAllByText(/pencil/i)).not.toHaveLength(0);
  });

  it("counts what is on the desk", async () => {
    const user = userEvent.setup();
    renderDesk();
    await user.click(screen.getByRole("button", { name: "New card" }));
    expect(await screen.findByText(/^1 card/)).toBeDefined();
  });
});

describe("keyboard and narrow-screen parity", () => {
  it("keeps the whole loop usable in the stack arrangement", async () => {
    const user = userEvent.setup();
    renderDesk();

    await user.click(screen.getByRole("button", { name: "Stack" }));
    await user.click(screen.getByRole("button", { name: "New card" }));

    const editor = await screen.findByRole("textbox", { name: "Card text" });
    await user.type(editor, "The archivist keeps a second ledger");
    await user.keyboard("{Escape}");

    const item = screen.getByRole("listitem");
    expect(within(item).getByText(/second ledger/)).toBeDefined();

    await user.click(within(item).getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(removeCardsAction).toHaveBeenCalled());
    expect(screen.getByText(/an empty desk/i)).toBeDefined();
  });
});

describe("boards", () => {
  it("names a new board and opens it", async () => {
    const user = userEvent.setup();
    renderDesk();

    await user.click(screen.getByRole("button", { name: /Desk/ }));
    await user.click(screen.getByRole("button", { name: "+ New board" }));
    await user.type(screen.getByRole("textbox", { name: "Board name" }), "Session 7 Prep");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(createBoardAction).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Session 7 Prep", worldId: EMPTY_DESK.worldId })
      )
    );
    const created = createBoardAction.mock.calls[0]?.[0] as { compositionId: string };
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/c/${created.compositionId}`));
  });

  it("offers other compositions only once something is selected", async () => {
    const user = userEvent.setup();
    renderDesk(WITH_BOARD);

    expect(screen.queryByRole("button", { name: /^Add / })).toBeNull();

    await user.click(screen.getByRole("button", { name: "New card" }));
    expect(await screen.findByRole("button", { name: "Add card to…" })).toBeDefined();
  });

  it("references the selected object onto a board rather than moving it", async () => {
    const user = userEvent.setup();
    renderDesk(WITH_BOARD);

    await user.click(screen.getByRole("button", { name: "New card" }));
    await user.keyboard("{Escape}");
    await user.click(await screen.findByRole("button", { name: "Add card to…" }));
    await user.click(screen.getByRole("menuitem", { name: "The Drowned Coast" }));

    await waitFor(() => expect(referenceObjectsAction).toHaveBeenCalled());
    const sent = referenceObjectsAction.mock.calls[0]?.[0] as {
      compositionId: string;
      placements: { cardId: string; objectId: string }[];
    };
    const captured = captureCardAction.mock.calls[0]?.[0] as {
      cardId: string;
      objectId: string;
    };

    expect(sent.compositionId).toBe(BOARD_ID);
    // Same identity, a new card. The Board references the object; it does not
    // take it, and the Desk still holds its own card for it.
    expect(sent.placements[0]?.objectId).toBe(captured.objectId);
    expect(sent.placements[0]?.cardId).not.toBe(captured.cardId);
    expect(screen.getByText(/^1 card/)).toBeDefined();
  });
});

describe("reporting failure", () => {
  it("says so, and keeps the work, when a write fails", async () => {
    captureCardAction.mockResolvedValue({
      state: "failed",
      message: "The Desk could not be saved."
    });

    const user = userEvent.setup();
    renderDesk();
    await user.click(screen.getByRole("button", { name: "New card" }));

    expect(await screen.findByText(/could not be saved/i)).toBeDefined();
    expect(screen.getByText(/^1 card/)).toBeDefined();
  });
});
