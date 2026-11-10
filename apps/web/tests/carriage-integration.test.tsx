import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { asCompositionId, asSessionId, asWorldId, type Prep } from "@/lib/world/model";
import { PrepRail } from "@/components/desk/prep-rail";

const editSessionAction = vi.fn();
vi.mock("@/app/actions", () => ({
  editSessionAction: (input: unknown) => editSessionAction(input),
  setBeatAction: vi.fn(), removeBeatAction: vi.fn(), reorderBeatsAction: vi.fn()
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const PREP: Prep = {
  session: { id: asSessionId("session-8"), worldId: asWorldId("blackwater"), compositionId: asCompositionId("prep-8"), title: "The Drowned Bell", intent: null, state: "planned", version: 1, createdAt: "2026-11-04T18:00:00Z" },
  beats: []
};

describe("shared Prepare carriage integration", () => {
  it("keeps later field edits while overlapping blur saves use successive confirmed versions", async () => {
    let finishTitle!: (value: unknown) => void;
    editSessionAction.mockImplementationOnce(() => new Promise(resolve => { finishTitle = resolve; }));
    editSessionAction.mockResolvedValueOnce({ state: "ok", data: { ...PREP.session, title: "The Western Quay", intent: "Find the missing crews", version: 3 } });
    render(<PrepRail initial={PREP} selected={[]} controls={{ current: null }} onReveal={vi.fn()} onCollapse={vi.fn()} />);
    const title = screen.getByRole("textbox", { name: "Session name" });
    const intent = screen.getByRole("textbox", { name: "What tonight is for" });
    fireEvent.change(title, { target: { value: "The Western Quay" } });
    fireEvent.blur(title);
    await waitFor(() => expect(editSessionAction).toHaveBeenCalledTimes(1));
    fireEvent.change(intent, { target: { value: "Find the missing crews" } });
    fireEvent.blur(intent);
    expect(editSessionAction).toHaveBeenCalledTimes(1);
    finishTitle({ state: "ok", data: { ...PREP.session, title: "The Western Quay", version: 2 } });
    await waitFor(() => expect(editSessionAction).toHaveBeenCalledTimes(2));
    expect(editSessionAction.mock.calls[1]![0]).toMatchObject({ title: "The Western Quay", intent: "Find the missing crews", observedVersion: 2 });
    await waitFor(() => expect((intent as HTMLTextAreaElement).value).toBe("Find the missing crews"));
    expect((title as HTMLInputElement).value).toBe("The Western Quay");
  });
});
