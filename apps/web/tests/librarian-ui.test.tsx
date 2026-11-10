import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";

import { Librarian } from "@/components/desk/librarian";
import type { Effect, LibrarianMessage, WireEvent } from "@/lib/librarian/model";
import { asCardId, asCompositionId, asWorldObjectId } from "@/lib/world/model";

const COMPOSITION_ID = asCompositionId("composition-blackwater");
const FOCUS_ID = asCardId("card-mara");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function streamResponse(events: readonly WireEvent[], close = true) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      if (close) controller.close();
    }
  });
  return new Response(body, { status: 200, headers: { "content-type": "application/x-ndjson" } });
}

function getResponse(ready = true, messages: readonly LibrarianMessage[] = []) {
  return new Response(JSON.stringify({ ready, messages, spent: { turns: 0, tokens: 0, usd: null } }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function sourceMessage(): LibrarianMessage {
  return {
    id: "message-1" as LibrarianMessage["id"],
    speaker: "librarian",
    body: "Mara [1] and [9] matter.",
    sources: [{ n: 1, ref: { objectId: asWorldObjectId("mara"), label: "Mara Venn", kind: null } }],
    compositionId: COMPOSITION_ID,
    spend: null,
    saidAt: "2026-11-05T00:00:00.000Z"
  };
}

function baseProps(request: typeof fetch) {
  return {
    open: true,
    onOpenChange: vi.fn(),
    compositionId: COMPOSITION_ID,
    compositionName: "Blackwater Board",
    focusCardId: FOCUS_ID,
    focusLabel: "Mara Venn",
    selectedCardIds: [asCardId("card-crew")],
    onFollowSource: vi.fn(),
    onActed: vi.fn(),
    here: vi.fn(() => ({ x: 12, y: 24 })),
    request
  };
}

async function waitUntilReady(request: ReturnType<typeof vi.fn>) {
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  await screen.findByPlaceholderText("Ask about this world…");
}

describe("Librarian carriage UI boundary", () => {
  it("does not POST when opening or when ambient context changes", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(getResponse());
    const props = baseProps(request);
    const { rerender } = render(<Librarian {...props} />);
    await waitUntilReady(request);
    rerender(<Librarian {...props} compositionName="The Western Quay" focusLabel="No object" selectedCardIds={[]} />);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("freezes the sent vantage and ignores a duplicate synchronous submit", async () => {
    const post = deferred<Response>();
    const request = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => init?.method === "POST" ? post.promise : getResponse());
    const props = baseProps(request);
    const { rerender } = render(<Librarian {...props} />);
    await waitUntilReady(request);
    const input = screen.getByRole("textbox", { name: "Ask the Librarian" });
    await userEvent.type(input, "Where did the crews go?");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    const postCalls = request.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(postCalls).toHaveLength(1);
    const body = JSON.parse(String(postCalls[0]![1]?.body));
    expect(body).toMatchObject({ compositionId: COMPOSITION_ID, focusCardId: FOCUS_ID, selectedCardIds: ["card-crew"], here: { x: 12, y: 24 }, ask: "Where did the crews go?" });
    rerender(<Librarian {...props} focusCardId={asCardId("card-new")} selectedCardIds={[]} here={() => ({ x: 900, y: 901 })} />);
    post.resolve(streamResponse([{ type: "done", body: "The western quay.", sources: [], spent: { turns: 1, tokens: 1, usd: null } }]));
    await screen.findByText("The western quay.");
  });

  it("keeps a next draft when a streamed response ends without done", async () => {
    const post = deferred<Response>();
    const request = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => init?.method === "POST" ? post.promise : getResponse());
    const props = baseProps(request);
    render(<Librarian {...props} />);
    await waitUntilReady(request);
    const input = screen.getByRole("textbox", { name: "Ask the Librarian" });
    await userEvent.type(input, "What is beneath the bell?");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await userEvent.type(input, "Keep this next question");
    post.resolve(streamResponse([{ type: "text", text: "Only a flooded stair." }]));
    await screen.findByRole("alert");
    expect((input as HTMLTextAreaElement).value).toBe("Keep this next question");
    expect(screen.getByRole("alert").textContent).toContain("ended before the answer was complete");
  });

  it("recovers after an explicit failed event and allows another send", async () => {
    const second = deferred<Response>();
    let posts = 0;
    const request = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      if (init?.method !== "POST") return getResponse();
      posts += 1;
      return posts === 1 ? streamResponse([{ type: "failed", message: "The source is unavailable." }]) : second.promise;
    });
    const props = baseProps(request);
    render(<Librarian {...props} />);
    await waitUntilReady(request);
    const input = screen.getByRole("textbox", { name: "Ask the Librarian" });
    await userEvent.type(input, "Find the tide ledger.");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("alert");
    expect((input as HTMLTextAreaElement).value).toBe("Find the tide ledger.");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(posts).toBe(2);
    second.resolve(streamResponse([{ type: "done", body: "The ledger is in folio nine.", sources: [], spent: { turns: 1, tokens: 1, usd: null } }]));
    await screen.findByText("The ledger is in folio nine.");
  });

  it("does not POST while the Librarian is unavailable", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(getResponse(false));
    const props = baseProps(request);
    render(<Librarian {...props} />);
    await screen.findByText(/unavailable in this workspace/);
    const input = screen.getByRole("textbox", { name: "Ask the Librarian" });
    await userEvent.type(input, "Try a grounded search");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(request.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    request.mockResolvedValueOnce(getResponse(true));
    fireEvent.click(screen.getByRole("button", { name: "Retry connection" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Send message" }) as HTMLButtonElement).disabled).toBe(false));
    expect((input as HTMLTextAreaElement).value).toBe("Try a grounded search");
    expect(request.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("keeps Shift+Enter and IME Enter from sending, while plain Enter sends", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(getResponse()).mockResolvedValue(
      streamResponse([{ type: "done", body: "Ready.", sources: [], spent: { turns: 1, tokens: 1, usd: null } }])
    );
    const props = baseProps(request);
    render(<Librarian {...props} />);
    await waitUntilReady(request);
    const input = screen.getByRole("textbox", { name: "Ask the Librarian" });
    await userEvent.type(input, "First line");
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect((input as HTMLTextAreaElement).value).toBe("First line");
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true, keyCode: 229 });
    fireEvent.compositionEnd(input);
    expect(request.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
    fireEvent.keyDown(input, { key: "Enter" });
    await screen.findByText("Ready.");
    expect(request.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("follows resolved citations and leaves unresolved citation markers as text", async () => {
    const onFollowSource = vi.fn();
    const request = vi.fn<typeof fetch>().mockResolvedValue(getResponse(true, [sourceMessage()]));
    render(<Librarian {...baseProps(request)} onFollowSource={onFollowSource} />);
    await screen.findByRole("button", { name: "Open citation 1: Mara Venn" });
    fireEvent.click(screen.getByRole("button", { name: "Open citation 1: Mara Venn" }));
    expect(onFollowSource).toHaveBeenCalledWith(sourceMessage().sources[0]!.ref);
    expect(screen.getByRole("article", { name: "Librarian" }).textContent).toContain("[9]");
  });

  it("preserves draft through collapse and uses the latest action callback", async () => {
    const post = deferred<Response>();
    const request = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => init?.method === "POST" ? post.promise : getResponse());
    const firstActed = vi.fn();
    const secondActed = vi.fn();
    function Harness({ acted }: { acted: (effect: Effect) => void }) {
      const [open, setOpen] = useState(true);
      return <Librarian {...baseProps(request)} open={open} onOpenChange={setOpen} onActed={acted} />;
    }
    const { rerender } = render(<Harness acted={firstActed} />);
    await waitUntilReady(request);
    const input = screen.getByRole("textbox", { name: "Ask the Librarian" });
    await userEvent.type(input, "Keep this question");
    fireEvent.click(screen.getByRole("button", { name: "Collapse Librarian carriage" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Librarian carriage" }));
    expect((screen.getByRole("textbox", { name: "Ask the Librarian" }) as HTMLTextAreaElement).value).toBe("Keep this question");

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    rerender(<Harness acted={secondActed} />);
    const effect: Effect = { kind: "attend", cardIds: [FOCUS_ID] };
    post.resolve(streamResponse([{ type: "acted", note: "Brought Mara into view.", effect }, { type: "done", body: "Done.", sources: [], spent: { turns: 1, tokens: 1, usd: null } }]));
    await screen.findByText("Done.");
    expect(secondActed).toHaveBeenCalledWith(effect);
    expect(firstActed).not.toHaveBeenCalled();
  });
});
