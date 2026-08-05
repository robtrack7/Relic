import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SagaWorkshopConversation } from "@/components/SagaWorkshopConversation";
import { ResumeSagaWorkshopCard } from "@/components/ResumeSagaWorkshopCard";
import type { SagaWorkshop } from "@/lib/data";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  answer: vi.fn(),
  draft: vi.fn(),
  abandon: vi.fn()
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/app/actions", () => ({
  answerSagaWorkshopAction: mocks.answer,
  draftSagaWorkshopAction: mocks.draft,
  abandonSagaWorkshopAction: mocks.abandon
}));

function workshop(overrides: Partial<SagaWorkshop> = {}): SagaWorkshop {
  return {
    id: "e5200000-0000-4000-8000-000000000001",
    workspace_id: "e5200000-0000-4000-8000-000000000002",
    world_id: null,
    saga_id: null,
    committed_session_id: null,
    state: "in_progress",
    phase: "conversation",
    generation_status: "complete",
    review_version: 1,
    conversation_version: 2,
    conversation_step: 1,
    gm_message_count: 2,
    total_message_count: 4,
    gm_input_chars: 86,
    draft_payload: {},
    conversation: [
      { role: "gm", content: "A drowned observatory feeds a glass orchard.", timestamp: "2026-08-04T12:00:00Z" },
      { role: "assistant", content: "What central conflict should drive play?", timestamp: "2026-08-04T12:00:01Z" }
    ],
    interview_plan: { questions: [] },
    emerging_outline: { premise: "A glass orchard grows above a drowned observatory.", tone: "Luminous mystery" },
    current_question: { id: "central-conflict", prompt: "What central conflict should drive play?", outline_field: "central_conflict" },
    can_draft: true,
    saga_name: "The Glass Orchard",
    quota: {},
    updated_at: "2026-08-04T12:00:01Z",
    sources: [],
    regeneration_requests: [],
    ...overrides
  };
}

describe("E5.2 Saga workshop conversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.answer.mockResolvedValue({ ok: true, conversationVersion: 3 });
    mocks.draft.mockResolvedValue({ ok: true, queued: true });
    mocks.abandon.mockResolvedValue({ ok: true });
  });

  it("shows the adaptive conversation, emerging outline, and disclosed two-step cost", () => {
    render(<SagaWorkshopConversation workshop={workshop()} />);
    expect(screen.getByRole("heading", { name: /Shape The Glass Orchard through conversation/i })).toBeTruthy();
    expect(screen.getByText("What central conflict should drive play?")).toBeTruthy();
    expect(screen.getByText("Luminous mystery")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Draft it now · 10 credits" })).toBeTruthy();
    expect(screen.getByText(/interview plan cost 1 credit/i)).toBeTruthy();
  });

  it("autosaves an answer through the deterministic turn action", async () => {
    render(<SagaWorkshopConversation workshop={workshop()} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Your answer" }), { target: { value: "The orchard's restoration would erase the memories in its roots." } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(mocks.answer).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/No AI credit was used for this turn/i)).toBeTruthy();
  });

  it("dispatches the heavy scaffold only from the explicit Draft it now action", async () => {
    render(<SagaWorkshopConversation workshop={workshop()} />);
    fireEvent.click(screen.getByRole("button", { name: "Draft it now · 10 credits" }));
    await waitFor(() => expect(mocks.draft).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Full scaffold queued/i)).toBeTruthy();
  });
});

describe("E5.2 workshop recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.abandon.mockResolvedValue({ ok: true });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("offers explicit resume and confirmed discard actions", async () => {
    render(<ResumeSagaWorkshopCard workshop={{ id: "e5200000-0000-4000-8000-000000000010", saga_name: "Saved Saga", world_name: "Saved World", path: "bring_your_notes", phase: "conversation" }} />);
    expect(screen.getByRole("link", { name: "Resume" }).getAttribute("href")).toContain("e5200000-0000-4000-8000-000000000010");
    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
    await waitFor(() => expect(mocks.abandon).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText("Resume saga creation")).toBeNull();
  });
});
