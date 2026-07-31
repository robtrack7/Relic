import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionPrepAiPanel } from "@/components/SessionPrepAiPanel";
import type { PrepAiRequest } from "@/lib/data";
import type { SessionPrepPin } from "@/lib/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const sourceId = "e4060000-0000-0000-0000-000000000001";
const source = {
  source_id: sourceId,
  context: {
    status: "available" as const,
    source_kind: "existing_entity",
    label: "Mara",
    frozen_excerpt: "Mara protects the harbor watch.",
    current_text: "Mara protects the harbor watch.",
    drift_state: "exact" as const
  }
};
const thread: SessionPrepPin = {
  key: "thread:e4050000-0000-0000-0000-000000000005",
  entity_type: "thread",
  entity_id: "e4050000-0000-0000-0000-000000000005",
  name: "Lantern Pressure",
  state: "available",
  order_index: 0
};
const stub: SessionPrepPin = {
  key: "character:e4050000-0000-0000-0000-000000000003",
  entity_type: "character",
  entity_id: "e4050000-0000-0000-0000-000000000003",
  name: "Dock Witness",
  state: "available",
  order_index: 0,
  is_stub: true
};

function request(task_name: string, result_payload: Record<string, unknown>, overrides: Partial<PrepAiRequest> = {}): PrepAiRequest {
  return {
    id: "e4100000-0000-0000-0000-000000000001",
    task_name,
    status: "complete",
    review_state: "pending",
    prep_version_at_submit: "2026-07-30T18:00:00.000Z",
    result_payload,
    retry_input: {},
    created_at: "2026-07-30T18:00:01.000Z",
    updated_at: "2026-07-30T18:00:02.000Z",
    sources: [source],
    ...overrides
  };
}

function props(requests: PrepAiRequest[]) {
  return {
    requests,
    locked: false,
    activeThreads: [thread],
    quickStubs: [stub],
    onStart: vi.fn().mockResolvedValue(true),
    onReview: vi.fn().mockResolvedValue(true),
    onAcceptPrep: vi.fn().mockResolvedValue(true)
  };
}

describe("SessionPrepAiPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
  });

  it("shows a cited briefing through the shared keyboard-operable source context", () => {
    render(<SessionPrepAiPanel {...props([request("compose_prep_briefing", {
      no_answer: false,
      body: "Keep the harbor pressure unresolved.",
      bullets: ["Open in rain.", "Show the signal.", "Pause for choice."],
      sources: [sourceId],
      confidence_reason: "single_clear_segment"
    })])} />);
    expect(screen.getByText("Keep the harbor pressure unresolved.")).toBeTruthy();
    const citation = screen.getByRole("button", { name: /source 1: mara/i });
    citation.focus();
    fireEvent.keyDown(citation, { key: "Enter" });
    expect(screen.getByText("Mara protects the harbor watch.")).toBeTruthy();
    expect(document.activeElement).toBe(citation);
  });

  it("renders explicit insufficiency with no fabricated sources", () => {
    render(<SessionPrepAiPanel {...props([request("propose_scene_beats", {
      no_answer: true,
      insufficiency_reason: "no_relevant_evidence",
      beats: [],
      confidence_reason: "ambiguous_source"
    }, { sources: [] })])} />);
    expect(screen.getByText(/did not find enough eligible canon/i)).toBeTruthy();
    expect(screen.queryByText("Sources used")).toBeNull();
  });

  it("edits a suggestion before accepting it through the Prep callback", () => {
    const componentProps = props([request("generate_session_prep", {
      no_answer: false,
      summary: "One grounded suggestion.",
      suggestions: [{
        id: "suggestion",
        scope: "scene_notes",
        value: "Original generated beat.",
        rationale: "Uses the current pressure.",
        sources: [sourceId],
        confidence_reason: "single_clear_segment"
      }],
      confidence_reason: "single_clear_segment"
    })]);
    render(<SessionPrepAiPanel {...componentProps} />);
    const editor = screen.getByRole("textbox", { name: /edit session suggestions/i });
    fireEvent.change(editor, { target: { value: "GM-edited beat." } });
    fireEvent.click(screen.getByRole("button", { name: /apply through prep autosave/i }));
    expect(componentProps.onAcceptPrep).toHaveBeenCalledWith(
      expect.objectContaining({ task_name: "generate_session_prep" }),
      "scene_notes",
      "GM-edited beat.",
      expect.objectContaining({ accepted_item: expect.objectContaining({ value: "GM-edited beat." }) })
    );
  });

  it("rejects and dismisses without invoking Prep acceptance", () => {
    const componentProps = props([request("compose_prep_briefing", {
      no_answer: false,
      body: "Briefing.",
      bullets: ["One", "Two", "Three"],
      sources: [sourceId],
      confidence_reason: "single_clear_segment"
    })]);
    render(<SessionPrepAiPanel {...componentProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(componentProps.onReview).toHaveBeenNthCalledWith(1, expect.anything(), "rejected");
    expect(componentProps.onReview).toHaveBeenNthCalledWith(2, expect.anything(), "dismissed");
    expect(componentProps.onAcceptPrep).not.toHaveBeenCalled();
  });

  it("retries provider failure with the same logical identity and frozen Prep version", () => {
    const failed = request("propose_npc_for_scene", {}, {
      status: "provider_unavailable",
      retry_input: { role_description: "harbor informant" }
    });
    const componentProps = props([failed]);
    render(<SessionPrepAiPanel {...componentProps} />);
    fireEvent.click(screen.getByRole("button", { name: /retry exact request/i }));
    expect(componentProps.onStart).toHaveBeenCalledWith(
      "propose_npc_for_scene",
      { role_description: "harbor informant" },
      {
        requestId: failed.id,
        prepVersion: failed.prep_version_at_submit,
        parentRequestId: undefined
      }
    );
  });

  it("routes an edited Quick Stub proposal to explicit review", () => {
    const quick = request("propose_quick_stub_fleshing", {
      no_answer: false,
      proposal: {
        summary: "Witness expansion",
        narrative: "The witness saw the signal.",
        relationships: [],
        proposed_scope: "saga",
        sources: [sourceId]
      },
      confidence_reason: "single_clear_segment"
    });
    const componentProps = props([quick]);
    render(<SessionPrepAiPanel {...componentProps} />);
    fireEvent.change(screen.getByRole("textbox", { name: /proposal narrative/i }), {
      target: { value: "The GM-edited witness saw the signal." }
    });
    fireEvent.click(screen.getByRole("button", { name: /send to approval queue/i }));
    expect(componentProps.onReview).toHaveBeenCalledWith(
      quick,
      "accepted",
      expect.objectContaining({
        proposal: expect.objectContaining({ narrative: "The GM-edited witness saw the signal." })
      })
    );
  });

  it("requires a separate NPC candidate confirmation before the drafting task", () => {
    const npc = request("propose_npc_for_scene", {
      no_answer: false,
      candidates: [{
        id: "npc",
        name: "Mara Venn",
        summary: "A cautious intermediary.",
        role_in_scene: "Harbor informant",
        relationship_hooks: [],
        sources: [sourceId]
      }],
      confidence_reason: "single_clear_segment"
    });
    const componentProps = props([npc]);
    render(<SessionPrepAiPanel {...componentProps} />);
    expect(componentProps.onStart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /create pending review draft/i }));
    expect(componentProps.onStart).toHaveBeenCalledWith(
      "draft_entity_from_prompt",
      { candidate: { name: "Mara Venn", summary: "A cautious intermediary.", role_in_scene: "Harbor informant" } },
      { parentRequestId: npc.id }
    );
  });

  it("keeps all manual controls enabled across quota failure and restores persisted review state", () => {
    const blocked = request("generate_session_prep", {}, {
      status: "quota_blocked",
      quota: { severity: "blocked", message: "Monthly AI limit reached." }
    });
    const { rerender } = render(<SessionPrepAiPanel {...props([blocked])} />);
    expect(screen.getByText("Monthly AI limit reached.")).toBeTruthy();
    expect((screen.getByRole("button", { name: /generate briefing/i }) as HTMLButtonElement).disabled).toBe(false);
    rerender(<SessionPrepAiPanel {...props([{
      ...blocked,
      status: "complete",
      review_state: "dismissed",
      result_payload: {
        no_answer: true,
        insufficiency_reason: "no_relevant_evidence",
        suggestions: [],
        confidence_reason: "ambiguous_source"
      }
    }])} />);
    expect(screen.getByText(/marked dismissed/i)).toBeTruthy();
  });
});
