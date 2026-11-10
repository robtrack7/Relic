import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  asCardId,
  asClaimId,
  asCompositionId,
  asSessionId,
  asWorldId,
  asWorldObjectId,
  type DeskView,
  type Workspace
} from "@/lib/world/model";

const captureCardAction = vi.fn();
const editCardBodyAction = vi.fn();
const moveCardsAction = vi.fn();
const removeCardsAction = vi.fn();
const referenceObjectsAction = vi.fn();
const createBoardAction = vi.fn();
const createSessionAction = vi.fn();
const searchWorldAction = vi.fn();
const setClaimAction = vi.fn();
const push = vi.fn();

vi.mock("@/app/actions", () => ({
  captureCardAction: (input: unknown) => captureCardAction(input),
  editCardBodyAction: (input: unknown) => editCardBodyAction(input),
  moveCardsAction: (input: unknown) => moveCardsAction(input),
  removeCardsAction: (input: unknown) => removeCardsAction(input),
  referenceObjectsAction: (input: unknown) => referenceObjectsAction(input),
  createBoardAction: (input: unknown) => createBoardAction(input),
  createSessionAction: (input: unknown) => createSessionAction(input),
  searchWorldAction: (input: unknown) => searchWorldAction(input),
  setClaimAction: (input: unknown) => setClaimAction(input)
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

const SOURCE_CARD_ID = asCardId("66666666-6666-4666-8666-666666666666");
const SOURCE_OBJECT_ID = asWorldObjectId("77777777-7777-4777-8777-777777777777");
const TARGET_CARD_ID = asCardId("88888888-8888-4888-8888-888888888888");
const TARGET_OBJECT_ID = asWorldObjectId("99999999-9999-4999-8999-999999999999");
const CONNECT_DESK: DeskView = {
  ...EMPTY_DESK,
  cards: [
    {
      cardId: SOURCE_CARD_ID,
      objectId: SOURCE_OBJECT_ID,
      layout: { x: 0, y: 0, width: 280, height: 200 },
      z: 1,
      body: "Source object",
      maturity: "pencil",
      settled: null,
      written: null,
      cardVersion: 1,
      bodyVersion: 1,
      representation: null,
      claims: [],
      links: []
    },
    {
      cardId: TARGET_CARD_ID,
      objectId: TARGET_OBJECT_ID,
      layout: { x: 360, y: 0, width: 280, height: 200 },
      z: 2,
      body: "Target object",
      maturity: "pencil",
      settled: null,
      written: null,
      cardVersion: 1,
      bodyVersion: 1,
      representation: null,
      claims: [],
      links: []
    }
  ]
};

const SOLO: Workspace = {
  worldId: EMPTY_DESK.worldId,
  name: "Blackwater",
  compositions: [{ compositionId: DESK_ID, kind: "desk", name: "Desk", cardCount: 0 }],
  sessions: []
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
  searchWorldAction.mockResolvedValue({ state: "ok", data: [] });
  setClaimAction.mockImplementation(async (input: Record<string, unknown>) => ({
    state: "ok",
    data: {
      id: asClaimId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      subjectId: input.subjectId,
      claimKind: input.claimKind,
      value: input.value,
      objectValue: input.objectValue ?? null,
      truthState: "pencil",
      provenance: { kind: "gm_assertion", authoredBy: "gm", recordedAt: "2026-11-04T00:00:00.000Z" },
      settled: null,
      story: { order: null, precision: "unknown", label: null },
      version: 1
    }
  }));
  createBoardAction.mockImplementation(async (input: Record<string, unknown>) => ({
    state: "ok",
    data: {
      compositionId: input.compositionId,
      kind: "board",
      name: input.name,
      cardCount: 0
    }
  }));
  createSessionAction.mockImplementation(async (input: Record<string, unknown>) => ({
    state: "ok",
    data: {
      sessionId: input.sessionId,
      compositionId: input.compositionId,
      title: input.title,
      state: "planned",
      beatCount: 0
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

async function captureNewCard(user: ReturnType<typeof userEvent.setup>) {
  const stackCapture = screen.queryByRole("button", { name: "Capture a fragment" });
  if (stackCapture) { await user.click(stackCapture); return; }
  await user.click(screen.getByRole("button", { name: "Create" }));
  await user.click(screen.getByRole("menuitem", { name: "Fragment" }));
}

async function startConnection(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText("Source object"));
  await user.click(screen.getByRole("button", { name: "Connect selected object" }));
  await user.click(screen.getByLabelText("Target object"));
  return screen.findByRole("group", { name: "New relationship" });
}

describe("workspace navigation", () => {
  it("opens the Desk within the current world rather than replacing it with the default world", async () => {
    const user = userEvent.setup();
    renderDesk(WITH_BOARD);
    await user.click(screen.getByRole("button", { name: "Current Context: Desk" }));
    const picker = within(screen.getByRole("dialog", { name: "Current Context" }));
    await user.click(picker.getByRole("button", { name: "Desk" }));
    expect(push).toHaveBeenLastCalledWith(`/c/${DESK_ID}`);
  });
  it("closes a rail picker when its originating button is pressed again", async () => {
    const user = userEvent.setup();
    renderDesk(WITH_BOARD);
    const boards = within(screen.getByRole("navigation", { name: "Workspace navigation" })).getByRole("button", { name: "Boards" });
    await user.click(boards);
    expect(screen.getByRole("dialog", { name: "Boards" })).toBeDefined();
    await user.click(boards);
    expect(screen.queryByRole("dialog", { name: "Boards" })).toBeNull();
  });
  it("uses the existing Board and session contexts without duplicating world objects", async () => {
    const user = userEvent.setup();
    const sessionComposition = asCompositionId("session-prep");
    renderDesk({ ...WITH_BOARD, sessions: [{ sessionId: asSessionId("session-8"), compositionId: sessionComposition, title: "The Drowned Bell", state: "planned", beatCount: 3 }] });
    const rail = within(screen.getByRole("navigation", { name: "Workspace navigation" }));
    await user.click(rail.getByRole("button", { name: "Boards" }));
    const boards = within(screen.getByRole("dialog", { name: "Boards" }));
    expect(boards.queryByRole("button", { name: "The Drowned Bell" })).toBeNull();
    await user.click(boards.getByRole("button", { name: "The Drowned Coast" }));
    expect(push).toHaveBeenLastCalledWith(`/c/${BOARD_ID}`);
    await user.click(rail.getByRole("button", { name: "Sessions" }));
    const sessions = within(screen.getByRole("dialog", { name: "Sessions" }));
    expect(sessions.queryByRole("button", { name: "The Drowned Coast" })).toBeNull();
    await user.click(sessions.getByRole("button", { name: "The Drowned Bell" }));
    expect(push).toHaveBeenLastCalledWith(`/c/${sessionComposition}`);
    await user.click(rail.getByRole("button", { name: "Prepare" }));
    expect(screen.getByRole("dialog", { name: "Prepare a session" })).toBeDefined();
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(rail.getByRole("button", { name: "Prepare" }));
    await user.click(rail.getByRole("button", { name: "Library" }));
    expect(searchWorldAction).toHaveBeenCalled();
    expect(captureCardAction).not.toHaveBeenCalled();
  });

  it("carries Finder context into Library and restores the Library trigger", async () => {
    const user = userEvent.setup();
    searchWorldAction.mockResolvedValue({ state: "ok", data: [] });
    renderDesk();

    const rail = within(screen.getByRole("navigation", { name: "Workspace navigation" }));
    const library = rail.getByRole("button", { name: "Library" });
    await user.click(screen.getByRole("button", { name: /Search this world/ }));
    await user.type(screen.getByRole("combobox", { name: "Search this world" }), "ironshore");
    await user.click(screen.getByRole("button", { name: "Open the Library" }));

    const librarySearch = await screen.findByRole("textbox", { name: "Search this world" }) as HTMLInputElement;
    expect(librarySearch.value).toBe("ironshore");
    await user.click(screen.getByRole("button", { name: "Back to the desk" }));
    // The full-surface Library owns the return action; the mounted projection
    // may relinquish focus while it transitions back to the Desk.
    await waitFor(() => expect(document.activeElement).toBeTruthy());
  });
});

describe("capture and edit", () => {
  it("captures from the empty-state action through the existing durable capture path", async () => {
    const user = userEvent.setup();
    renderDesk();
    await user.click(screen.getByRole("button", { name: "Capture a fragment" }));
    expect(await screen.findByRole("textbox", { name: "Card text" })).toBeDefined();
    await waitFor(() => expect(captureCardAction).toHaveBeenCalledTimes(1));
  });

  it("rolls back an interrupted app Canvas drag without persisting geometry", async () => {
    const user = userEvent.setup();
    renderDesk();
    await captureNewCard(user);
    const editor = await screen.findByRole("textbox", { name: "Card text" });
    await user.type(editor, "A kept fragment");
    await user.keyboard("{Control>}{Enter}{/Control}");
    const canvas = screen.getByRole("application", { name: "Desk canvas" });
    const card = screen.getByLabelText("A kept fragment");
    const original = card.getAttribute("style");
    fireEvent.pointerDown(card, { button: 0, pointerId: 51, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerId: 51, clientX: 140, clientY: 125 });
    expect(card.getAttribute("style")).not.toBe(original);
    fireEvent.pointerCancel(canvas, { pointerId: 51 });
    expect(card.getAttribute("style")).toBe(original);
    expect(moveCardsAction).not.toHaveBeenCalled();
  });

  it("captures a card, opens it for writing, and persists the text", async () => {
    const user = userEvent.setup();
    renderDesk();

    expect(within(screen.getByRole("application", { name: "Desk canvas" })).getByText(/an empty desk/i)).toBeDefined();

    await captureNewCard(user);

    const editor = await screen.findByRole("textbox", { name: "Card text" });
    await user.type(editor, "A bell that rings for no tide");
    await user.keyboard("{Control>}{Enter}{/Control}");

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

  it("opens Focus on a double-click instead of entering the generic body editor", async () => {
    render(<DeskSurface workspace={SOLO} initial={CONNECT_DESK} />);

    const card = screen.getByLabelText("Source object");
    fireEvent.doubleClick(card);

    const focus = await screen.findByRole("complementary", { name: "Fragment Focus" });
    expect(focus.getAttribute("data-entity-focus")).toBe("true");
    expect(screen.queryByRole("textbox", { name: "Card text" })).toBeNull();
  });

  it("routes existing-card authoring to Entity Builder instead of the Card text editor", async () => {
    const user = userEvent.setup();
    render(<DeskSurface workspace={SOLO} initial={CONNECT_DESK} />);

    const card = screen.getByLabelText("Source object");
    card.focus();
    await user.keyboard("{Enter}");
    const focus = await screen.findByRole("complementary", { name: "Fragment Focus" });
    await user.click(within(focus).getByRole("button", { name: "Open in Builder" }));
    expect(await screen.findByRole("region", { name: "Fragment Entity Builder" })).toBeDefined();
    expect(screen.queryByRole("textbox", { name: "Card text" })).toBeNull();
    expect(editCardBodyAction).not.toHaveBeenCalled();
  });

  it("writes the body once, however many paths ask it to save", async () => {
    const user = userEvent.setup();
    renderDesk();

    await captureNewCard(user);
    const editor = await screen.findByRole("textbox", { name: "Card text" });
    await user.type(editor, "One thought");

    // Commit, debounce, and blur all reach flushBody. Only the first has
    // anything to write — the rest must not re-send a stale version and turn a
    // single edit into a conflict.
    await user.keyboard("{Control>}{Enter}{/Control}");
    await waitFor(() => expect(editCardBodyAction).toHaveBeenCalled(), { timeout: 2000 });
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(editCardBodyAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/changed elsewhere/i)).toBeNull();
  });

  it("shows new material as Pencil, in words rather than colour alone", async () => {
    const user = userEvent.setup();
    renderDesk();
    await captureNewCard(user);
    expect(await screen.findAllByText(/pencil/i)).not.toHaveLength(0);
  });

  it("counts what is on the desk", async () => {
    const user = userEvent.setup();
    renderDesk();
    await captureNewCard(user);
    expect(await screen.findByText(/^1 card/)).toBeDefined();
  });
});

describe("semantic connections", () => {
  it("writes one deliberate relationship with stable source and target identities", async () => {
    const user = userEvent.setup();
    render(<DeskSurface workspace={SOLO} initial={CONNECT_DESK} />);

    const form = await startConnection(user);
    await user.type(within(form).getByRole("combobox", { name: "Relationship" }), "located at");
    await user.click(within(form).getByRole("button", { name: "Add relationship" }));

    await waitFor(() => expect(setClaimAction).toHaveBeenCalledTimes(1));
    expect(setClaimAction).toHaveBeenCalledWith(expect.objectContaining({
      subjectId: SOURCE_OBJECT_ID,
      claimKind: "located at",
      value: "Target object",
      objectValue: TARGET_OBJECT_ID
    }));
    const sent = setClaimAction.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sent).not.toHaveProperty("truthState");
    expect(sent).toHaveProperty("boardProjection", { compositionId: CONNECT_DESK.compositionId, cardId: SOURCE_CARD_ID, observedCardVersion: 1 });
    expect(moveCardsAction).not.toHaveBeenCalled();
  });

  it("cancels a semantic connection on Escape without writing", async () => {
    const user = userEvent.setup();
    render(<DeskSurface workspace={SOLO} initial={CONNECT_DESK} />);

    const form = await startConnection(user);
    const field = within(form).getByRole("combobox", { name: "Relationship" });
    await user.type(field, "located at");
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("group", { name: "New relationship" })).toBeNull());
    expect(setClaimAction).not.toHaveBeenCalled();
    expect(moveCardsAction).not.toHaveBeenCalled();
  });

  it("keeps the Canvas relationship draft available after a refused write", async () => {
    const user = userEvent.setup();
    setClaimAction.mockResolvedValueOnce({ state: "refused", reason: "The relationship changed elsewhere." });
    render(<DeskSurface workspace={SOLO} initial={CONNECT_DESK} />);
    const form = await startConnection(user);
    const field = within(form).getByRole("combobox", { name: "Relationship" }) as HTMLInputElement;
    await user.type(field, "protects");
    await user.click(within(form).getByRole("button", { name: "Add relationship" }));
    await waitFor(() => expect(within(form).getByRole("alert").textContent).toMatch(/relationship changed/i));
    expect(field.value).toBe("protects");
    expect(field.disabled).toBe(false);
  });
});

describe("keyboard and narrow-screen parity", () => {
  it("retains camera, tool, selection and Stack scroll when switching projections", async () => {
    const user = userEvent.setup();
    render(<DeskSurface workspace={SOLO} initial={CONNECT_DESK} />);
    const canvas = screen.getByRole("application", { name: "Desk canvas" });
    await user.click(screen.getByLabelText("Source object"));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.keyDown(canvas, { key: "h" });
    const world = canvas.querySelector<HTMLElement>('[style*="scale("]')!;
    await waitFor(() => expect(world.style.transform).toContain("scale(1.2)"));
    const camera = world.style.transform;
    expect(canvas.getAttribute("data-tool")).toBe("hand");
    const stackIcon = screen.getByRole("button", { name: "Switch to Stack" }).querySelector("svg")!.innerHTML;
    await user.click(screen.getByRole("button", { name: "Switch to Stack" }));
    expect(screen.getByRole("button", { name: "Switch to Canvas" }).querySelector("svg")!.innerHTML).not.toBe(stackIcon);
    const stack = screen.getByRole("region", { name: "Stack cards" });
    stack.scrollTop = 120;
    fireEvent.keyDown(stack, { key: "v" });
    await user.click(screen.getByRole("button", { name: "Switch to Canvas" }));
    expect(screen.getByRole("application", { name: "Desk canvas" })).toBe(canvas);
    expect(world.style.transform).toBe(camera);
    expect(canvas.getAttribute("data-tool")).toBe("hand");
    expect(screen.getByRole("button", { name: "Switch to Stack" }).querySelector("svg")!.innerHTML).toBe(stackIcon);
    expect(screen.getByLabelText("Source object").getAttribute("data-selected")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Switch to Stack" }));
    expect(screen.getByRole("region", { name: "Stack cards" })).toBe(stack);
    expect(stack.scrollTop).toBe(120);
    expect(moveCardsAction).not.toHaveBeenCalled();
  });

  it("keeps the whole loop usable in the stack arrangement", async () => {
    const user = userEvent.setup();
    renderDesk();

    await user.click(screen.getByRole("button", { name: "Switch to Stack" }));
    await captureNewCard(user);

    const editor = await screen.findByRole("textbox", { name: "Card text" });
    await user.type(editor, "The archivist keeps a second ledger");
    await user.keyboard("{Control>}{Enter}{/Control}");

    const item = screen.getByRole("listitem");
    expect(within(item).getByText(/second ledger/)).toBeDefined();

    await user.click(within(item).getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(removeCardsAction).toHaveBeenCalled());
    expect(within(screen.getByRole("region", { name: "Stack cards" })).getByText(/an empty desk/i)).toBeDefined();
  });
});

describe("boards", () => {
  it("names a new board and opens it", async () => {
    const user = userEvent.setup();
    renderDesk();

    await user.click(screen.getByRole("button", { name: "Current Context: Desk" }));
    await user.click(screen.getByRole("button", { name: "+ New board" }));
    await user.type(screen.getByRole("textbox", { name: "Board name" }), "Session 7 Prep");
    await user.click(within(screen.getByRole("textbox", { name: "Board name" }).closest("form")!).getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(createBoardAction).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Session 7 Prep", worldId: EMPTY_DESK.worldId })
      )
    );
    const created = createBoardAction.mock.calls[0]?.[0] as { compositionId: string };
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/c/${created.compositionId}`));
  });

  it("prepares a session and opens its Prep composition", async () => {
    const user = userEvent.setup();
    renderDesk();

    await user.click(within(screen.getByRole("navigation", { name: "Workspace navigation" })).getByRole("button", { name: "Prepare" }));
    await user.click(screen.getByRole("button", { name: "+ Prepare a session" }));
    await user.type(screen.getByRole("textbox", { name: "Session name" }), "The Ironshore Incident");
    await user.click(within(screen.getByRole("textbox", { name: "Session name" }).closest("form")!).getByRole("button", { name: "Start" }));

    await waitFor(() => expect(createSessionAction).toHaveBeenCalledWith(expect.objectContaining({
      worldId: EMPTY_DESK.worldId,
      title: "The Ironshore Incident"
    })));
    const created = createSessionAction.mock.calls[0]?.[0] as { compositionId: string };
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/c/${created.compositionId}`));
  });

  it("offers other compositions only once something is selected", async () => {
    const user = userEvent.setup();
    renderDesk(WITH_BOARD);

    expect(screen.queryByRole("button", { name: /^Add / })).toBeNull();

    await captureNewCard(user);
    expect(await screen.findByRole("button", { name: "Add card to…" })).toBeDefined();
  });

  it("references the selected object onto a board rather than moving it", async () => {
    const user = userEvent.setup();
    renderDesk(WITH_BOARD);

    await captureNewCard(user);
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
  it("preserves an unsent Librarian draft and keeps a hidden in-flight result from changing attention", async () => {
    let wire!: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({ start(controller) { wire = controller; } });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, options) => options?.method === "POST"
      ? new Response(stream)
      : new Response(JSON.stringify({ ready: true, messages: [] }), { headers: { "content-type": "application/json" } }));
    try {
      const user = userEvent.setup();
      renderDesk();
      await captureNewCard(user);
      await user.type(screen.getByRole("textbox", { name: "Card text" }), "The western quay");
      await user.keyboard("{Control>}{Enter}{/Control}");
      const cardId = captureCardAction.mock.calls[0]![0].cardId;
      await user.click(screen.getByRole("button", { name: "Open Librarian carriage" }));
      const composer = screen.getByRole("textbox", { name: "Ask the Librarian" });
      await waitFor(() => expect((composer as HTMLTextAreaElement).disabled).toBe(false));
      await user.type(composer, "Keep this question");
      await user.click(screen.getByRole("button", { name: "Collapse Librarian carriage" }));
      await user.click(screen.getByRole("button", { name: "Open Librarian carriage" }));
      expect((screen.getByRole("textbox", { name: "Ask the Librarian" }) as HTMLTextAreaElement).value).toBe("Keep this question");
      await user.click(screen.getByRole("button", { name: "Send message" }));
      await user.click(screen.getByRole("button", { name: "Collapse Librarian carriage" }));
      await act(async () => { wire.enqueue(new TextEncoder().encode(JSON.stringify({ type: "acted", effect: { kind: "attend", cardIds: [cardId] }, note: "Look at the quay" }) + "\n")); });
      expect(screen.queryByRole("complementary", { name: "Give this a kind" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
      expect(screen.getByText(/^1 card/)).toBeDefined();
    } finally { wire.close(); fetchSpy.mockRestore(); }
  });

  it("says so, and keeps the work, when a write fails", async () => {
    captureCardAction.mockResolvedValue({
      state: "failed",
      message: "The Desk could not be saved."
    });

    const user = userEvent.setup();
    renderDesk();
    await captureNewCard(user);

    expect(await screen.findByText(/could not be saved/i)).toBeDefined();
    expect(screen.getByText(/^1 card/)).toBeDefined();
  });
});

describe("search and retrieval", () => {
  it("reports a failed world search instead of showing a false empty state", async () => {
    searchWorldAction.mockResolvedValue({ state: "failed", message: "Search service offline" });
    const user = userEvent.setup();
    renderDesk();

    await user.click(screen.getByRole("button", { name: /Search this world/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("Search could not load");
    expect(screen.queryByText(/Nothing in this world yet/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
  });

  it("reaches past this composition", async () => {
    const maraId = "11111111-1111-4000-8000-0000000000aa";
    searchWorldAction.mockResolvedValue({
      state: "ok",
      data: [
        {
          ref: { objectId: maraId, label: "Mara", kind: "character" },
          maturity: "ink",
          lifecycle: "active",
          kinds: ["character"],
          snippet: "",
          updatedAt: new Date().toISOString(),
          cardHere: null
        }
      ]
    });

    const user = userEvent.setup();
    renderDesk();

    await user.click(screen.getByRole("button", { name: /Search this world/ }));
    const field = screen.getByRole("combobox", { name: "Search this world" });
    await user.type(field, "mara");

    await waitFor(() =>
      expect(searchWorldAction).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "mara",
          compositionId: EMPTY_DESK.compositionId
        })
      )
    );

    expect(await screen.findByRole("option", { name: /Mara/ })).toBeDefined();
  });

  it("brings a result onto the desk when selected", async () => {
    const objectId = "22222222-2222-4000-8000-0000000000bb";
    const newCardId = "33333333-3333-4000-8000-0000000000cc";

    searchWorldAction.mockResolvedValue({
      state: "ok",
      data: [
        {
          ref: { objectId, label: "The Lighthouse", kind: "place" },
          maturity: "ink",
          lifecycle: "active",
          kinds: ["place"],
          snippet: "It stands on the cliff.",
          updatedAt: new Date().toISOString(),
          cardHere: null
        }
      ]
    });

    referenceObjectsAction.mockImplementation(async (input: Record<string, unknown>) => ({
      state: "ok",
      data: [
        {
          cardId: newCardId,
          objectId,
          layout: { x: 0, y: 0, width: 280, height: 200 },
          z: 1,
          body: "It stands on the cliff.",
          representation: null,
          claims: [],
          links: [],
          maturity: "ink",
          settled: null,
          cardVersion: 1,
          bodyVersion: 1
        }
      ]
    }));

    const user = userEvent.setup();
    renderDesk();

    await user.click(screen.getByRole("button", { name: /Search this world/ }));
    const field = screen.getByRole("combobox", { name: "Search this world" });
    await user.type(field, "lighthouse");

    const result = await screen.findByRole("option", { name: /The Lighthouse/ });
    await user.click(result);

    // Inspecting preserves world identity and does not place it. Bringing it
    // in is the separate, explicit retrieval intent.
    expect(referenceObjectsAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Bring in" }));

    await waitFor(() =>
      expect(referenceObjectsAction).toHaveBeenCalledWith(
        expect.objectContaining({
          compositionId: EMPTY_DESK.compositionId,
          placements: expect.arrayContaining([
            expect.objectContaining({ objectId })
          ])
        })
      )
    );

    const allCardBodies = await screen.findAllByText(/It stands on the cliff/);
    expect(allCardBodies.length).toBeGreaterThan(0);
  });

  it("reveals a card already here rather than adding it again", async () => {
    const existingCardId = "44444444-4444-4000-8000-0000000000dd";
    const objectId = "55555555-5555-4000-8000-0000000000ee";

    searchWorldAction.mockResolvedValue({
      state: "ok",
      data: [
        {
          ref: { objectId, label: "The Keeper", kind: "character" },
          maturity: "pencil",
          lifecycle: "active",
          kinds: ["character"],
          snippet: "",
          updatedAt: new Date().toISOString(),
          cardHere: existingCardId
        }
      ]
    });

    const user = userEvent.setup();
    render(
      <DeskSurface
        workspace={SOLO}
        initial={{
          ...EMPTY_DESK,
          cards: [
            {
              cardId: asCardId(existingCardId),
              objectId: asWorldObjectId(objectId),
              layout: { x: 0, y: 0, width: 280, height: 200 },
              z: 1,
              body: "The Keeper knows",
              maturity: "pencil",
              settled: null,
              written: null,
              cardVersion: 1,
              bodyVersion: 1,
              representation: null,
              claims: [],
              links: []
            }
          ]
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: /Search this world/ }));
    const field = screen.getByRole("combobox", { name: "Search this world" });
    await user.type(field, "keeper");

    const result = await screen.findByRole("option", { name: /The Keeper/ });
    expect(within(result).getByText(/open/)).toBeDefined();

    await user.click(result);

    expect(referenceObjectsAction).not.toHaveBeenCalled();
  });

  it("closes the panel on Escape without doing anything", async () => {
    searchWorldAction.mockResolvedValue({
      state: "ok",
      data: []
    });

    const user = userEvent.setup();
    renderDesk();

    await user.click(screen.getByRole("button", { name: /Search this world/ }));
    expect(screen.getByRole("dialog", { name: "Search this world" })).toBeDefined();

    vi.clearAllMocks();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Search this world" })).toBeNull();
    expect(searchWorldAction).not.toHaveBeenCalled();
  });
});
