import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { asCompositionId, asWorldId, type DeskView } from "@/lib/world/model";

const captureCardAction = vi.fn();
const editCardBodyAction = vi.fn();
const moveCardsAction = vi.fn();
const removeCardsAction = vi.fn();

vi.mock("@/app/actions", () => ({
  captureCardAction: (input: unknown) => captureCardAction(input),
  editCardBodyAction: (input: unknown) => editCardBodyAction(input),
  moveCardsAction: (input: unknown) => moveCardsAction(input),
  removeCardsAction: (input: unknown) => removeCardsAction(input)
}));

const { DeskSurface } = await import("@/components/desk/desk-surface");

const EMPTY_DESK: DeskView = {
  worldId: asWorldId("00000000-0000-4000-8000-0000000000aa"),
  compositionId: asCompositionId("00000000-0000-4000-8000-0000000000bb"),
  name: "Desk",
  cards: []
};

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
      truthState: "pencil",
      cardVersion: 1,
      bodyVersion: 1
    }
  }));
  editCardBodyAction.mockResolvedValue({ state: "ok", data: { bodyVersion: 2 } });
  moveCardsAction.mockResolvedValue({ state: "ok", data: [] });
  removeCardsAction.mockResolvedValue({ state: "ok", data: [] });

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
    render(<DeskSurface initial={EMPTY_DESK} />);

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
    render(<DeskSurface initial={EMPTY_DESK} />);

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
    render(<DeskSurface initial={EMPTY_DESK} />);
    await user.click(screen.getByRole("button", { name: "New card" }));
    expect(await screen.findAllByText(/pencil/i)).not.toHaveLength(0);
  });

  it("counts what is on the desk", async () => {
    const user = userEvent.setup();
    render(<DeskSurface initial={EMPTY_DESK} />);
    await user.click(screen.getByRole("button", { name: "New card" }));
    expect(await screen.findByText(/^1 card/)).toBeDefined();
  });
});

describe("keyboard and narrow-screen parity", () => {
  it("keeps the whole loop usable in the stack arrangement", async () => {
    const user = userEvent.setup();
    render(<DeskSurface initial={EMPTY_DESK} />);

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

describe("reporting failure", () => {
  it("says so, and keeps the work, when a write fails", async () => {
    captureCardAction.mockResolvedValue({
      state: "failed",
      message: "The Desk could not be saved."
    });

    const user = userEvent.setup();
    render(<DeskSurface initial={EMPTY_DESK} />);
    await user.click(screen.getByRole("button", { name: "New card" }));

    expect(await screen.findByText(/could not be saved/i)).toBeDefined();
    expect(screen.getByText(/^1 card/)).toBeDefined();
  });
});
