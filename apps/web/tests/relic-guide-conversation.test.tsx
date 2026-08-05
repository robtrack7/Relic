import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RelicGuideConversation } from "@/components/RelicGuideConversation";

const root = "/app/w/workspace/world/world/saga/saga";

describe("RelicGuideConversation", () => {
  it("renders grounded paragraphs only with keyboard-operable citations", () => {
    render(<RelicGuideConversation
      sagaRoot={root}
      thread={{ id: "thread", state: "active", turns: [{
        id: "turn",
        question: "What protects the eastern road?",
        status: "complete",
        noAnswer: false,
        blocks: [{
          type: "grounded_answer",
          text: "The Iron Gate protects the eastern road.",
          citations: [{
            sourceId: "source",
            context: {
              status: "available",
              source_kind: "existing_entity",
              label: "The Iron Gate",
              frozen_excerpt: "The Iron Gate is sealed.",
              drift_state: "not_applicable"
            }
          }]
        }]
      }] }}
      onSubmit={vi.fn()}
    />);

    expect(screen.getByText("The Iron Gate protects the eastern road.")).toBeTruthy();
    const citation = screen.getByRole("button", { name: /source 1: the iron gate/i });
    citation.focus();
    fireEvent.keyDown(citation, { key: "Enter" });
    expect(screen.getByText("The Iron Gate is sealed.")).toBeTruthy();
  });

  it("distinguishes insufficiency and preserves the editable question", () => {
    render(<RelicGuideConversation
      sagaRoot={root}
      thread={{ id: "thread", state: "active", turns: [{
        id: "turn",
        question: "Who rules the moon?",
        status: "complete",
        noAnswer: true,
        insufficiencyReason: "no_relevant_evidence",
        blocks: [{ type: "guidance", text: "Try Search or add approved evidence." }]
      }] }}
      onSubmit={vi.fn()}
    />);

    expect(screen.getByText(/does not have enough reliable saga evidence/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /edit question/i }));
    expect((screen.getByLabelText("Ask The Loom") as HTMLTextAreaElement).value).toBe("Who rules the moon?");
    expect(screen.getByRole("link", { name: /search manually/i }).getAttribute("href")).toContain("/search");
  });

  it("announces queued work and exposes quota/provider fallback without technical details", () => {
    const { rerender } = render(<RelicGuideConversation
      sagaRoot={root}
      thread={{ id: "thread", state: "active", turns: [{
        id: "turn", question: "What happened?", status: "queued", blocks: []
      }] }}
      onSubmit={vi.fn()}
    />);
    expect(screen.getByRole("status").textContent).toMatch(/queued/i);

    rerender(<RelicGuideConversation
      sagaRoot={root}
      thread={{ id: "thread", state: "active", turns: [{
        id: "turn", question: "What happened?", status: "quota_blocked", blocks: []
      }] }}
      onSubmit={vi.fn()}
    />);
    expect(screen.getByText(/usage limit/i)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/litellm|postgres|stack trace|uuid/i);
  });

  it("keeps creative proposals visibly non-canon", () => {
    render(<RelicGuideConversation
      sagaRoot={root}
      thread={{ id: "thread", state: "active", turns: [{
        id: "turn",
        question: "Draft a gate captain.",
        status: "complete",
        noAnswer: false,
        blocks: [{ type: "creative_proposal", text: "Captain Elian keeps a brass tally of travelers." }]
      }] }}
      onSubmit={vi.fn()}
    />);
    expect(screen.getByText("New proposal · Not canon")).toBeTruthy();
  });

  it("requires confirmation for entity drafts while dismissal is side-effect free", () => {
    const onConfirmAction = vi.fn();
    const onDismissAction = vi.fn();
    render(<RelicGuideConversation
      sagaRoot={root}
      thread={{ id: "thread", state: "active", turns: [{
        id: "turn",
        question: "Draft the captain.",
        status: "complete",
        noAnswer: false,
        blocks: [{
          type: "action_preview",
          actionId: "action",
          intentVersion: 1,
          action: { name: "draft_entity", version: "1.0.0", entityType: "character", intent: "Draft the gate captain." },
          explanation: "Creates a pending character draft for review.",
          authorityTier: "non_canon_generation",
          confirmationPolicy: "explicit",
          costCredits: 3,
          effectSummary: "Create one non-canon pending entity draft for later review.",
          manualFallback: "Create the record manually."
        }]
      }] }}
      onSubmit={vi.fn()}
      onConfirmAction={onConfirmAction}
      onDismissAction={onDismissAction}
    />);

    fireEvent.click(screen.getByRole("button", { name: /review draft action/i }));
    expect(screen.getByText(/spend exactly 3 AI credits/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /confirm and draft/i }));
    expect(onConfirmAction).toHaveBeenCalledWith("action", 1);

    fireEvent.click(screen.getByRole("button", { name: /dismiss action/i }));
    expect(onDismissAction).toHaveBeenCalledWith("action", 1);
  });
});
