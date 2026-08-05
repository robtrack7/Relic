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

  it("renders accepted deterministic reads as free read-only cards with canonical links", () => {
    render(<RelicGuideConversation
      sagaRoot={root}
      thread={{ id: "thread", state: "active", turns: [{
        id: "turn",
        question: "Show me what is current.",
        status: "complete",
        noAnswer: false,
        blocks: [
          {
            type: "action_preview", actionId: "open", intentVersion: 1,
            action: { name: "open_record", version: "1.0.0", href: `${root}/threads/t1`, result: {
              record: { recordType: "thread", recordId: "t1", name: "Broken Seal", status: "active", href: `${root}/threads/t1` },
              relationships: [{ recordType: "place", recordId: "p1", name: "Iron Gate", href: `${root}/entities/place/p1`, kind: "located-at", direction: "outbound" }],
              objectives: [{ id: "o1", text: "Find the opener", state: "open" }]
            } }, explanation: "Open the Thread.", authorityTier: "read_navigation", confirmationPolicy: "none", costCredits: 0,
            effectSummary: "Show the current record.", manualFallback: "Open Threads manually.", state: "accepted"
          },
          {
            type: "action_preview", actionId: "list", intentVersion: 1,
            action: { name: "list_records", version: "1.0.0", records: [{ recordType: "session", recordId: "s1", name: "First Watch", status: "ready", href: `${root}/sessions/s1/prep` }] },
            explanation: "List Sessions.", authorityTier: "read_navigation", confirmationPolicy: "none", costCredits: 0,
            effectSummary: "Show the bounded list.", manualFallback: "Open Sessions manually.", state: "accepted"
          },
          {
            type: "action_preview", actionId: "source", intentVersion: 1,
            action: { name: "show_source", version: "1.0.0", result: { source: { kind: "existing_entity", excerpt: "The seal was opened from within." } } },
            explanation: "Show the source.", authorityTier: "read_navigation", confirmationPolicy: "none", costCredits: 0,
            effectSummary: "Show authorized evidence.", manualFallback: "Inspect the record manually.", state: "accepted"
          },
          {
            type: "action_preview", actionId: "provenance", intentVersion: 1,
            action: { name: "explain_provenance", version: "1.0.0", result: { source: { kind: "existing_entity" }, provenance: [{ operation: "approved", actorKind: "gm" }] } },
            explanation: "Explain provenance.", authorityTier: "read_navigation", confirmationPolicy: "none", costCredits: 0,
            effectSummary: "Show the evidence trail.", manualFallback: "Inspect provenance manually.", state: "accepted"
          },
          {
            type: "action_preview", actionId: "navigate", intentVersion: 1,
            action: { name: "navigate_surface", version: "1.0.0", destination: "search", href: `${root}/search?mode=literal&q=seal` },
            explanation: "Open literal search.", authorityTier: "read_navigation", confirmationPolicy: "none", costCredits: 0,
            effectSummary: "Open the active-Saga search surface.", manualFallback: "Use navigation.", state: "accepted"
          }
        ]
      }] }}
      onSubmit={vi.fn()}
    />);

    expect(screen.getAllByText(/free · read only/i)).toHaveLength(5);
    expect(screen.getByRole("link", { name: "Open record" }).getAttribute("href")).toBe(`${root}/threads/t1`);
    expect(screen.getByRole("link", { name: "Iron Gate" }).getAttribute("href")).toBe(`${root}/entities/place/p1`);
    expect(screen.getByRole("link", { name: "First Watch" }).getAttribute("href")).toBe(`${root}/sessions/s1/prep`);
    expect(screen.getByText("Find the opener · open")).toBeTruthy();
    expect(screen.getByText("The seal was opened from within.")).toBeTruthy();
    expect(screen.getByText("approved · gm")).toBeTruthy();
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

  it("keeps record proposals non-canon and sends them to Review at zero additional credits", () => {
    const onConfirmAction = vi.fn();
    render(<RelicGuideConversation
      sagaRoot={root}
      thread={{ id: "thread", state: "active", turns: [{
        id: "turn", question: "Update Mara.", status: "complete", noAnswer: false,
        blocks: [{
          type: "action_preview", actionId: "proposal", intentVersion: 2,
          action: {
            name: "propose_record_update", version: "1.0.0", recordType: "character", recordName: "Mara",
            fields: [{ field: "summary", label: "Summary", oldValue: "Gate scout", newValue: "Eastern road warden" }],
            reviewHref: `${root}/review`
          },
          explanation: "Prepare a pending character update.", authorityTier: "non_canon_generation",
          confirmationPolicy: "explicit", costCredits: 0,
          effectSummary: "Create one pending Review item.", manualFallback: "Open Mara and edit manually."
        }]
      }] }}
      onSubmit={vi.fn()}
      onConfirmAction={onConfirmAction}
    />);

    expect(screen.getByText(/0 additional credits · not canon/i)).toBeTruthy();
    expect(screen.getByText("Current: Gate scout")).toBeTruthy();
    expect(screen.getByText("Proposed: Eastern road warden")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /review proposal action/i }));
    expect(screen.getByText(/does not approve or publish/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /send to review/i }));
    expect(onConfirmAction).toHaveBeenCalledWith("proposal", 2);
  });

  it("requires explicit confirmation before applying a zero-credit scoped canon mutation", () => {
    const onConfirmAction = vi.fn();
    render(<RelicGuideConversation
      sagaRoot={root}
      thread={{ id: "thread", state: "active", turns: [{
        id: "turn", question: "Resolve the Broken Seal.", status: "complete", noAnswer: false,
        blocks: [{
          type: "action_preview", actionId: "thread-state", intentVersion: 1,
          action: {
            name: "set_thread_state", version: "1.0.0", recordName: "Broken Seal",
            fromState: "active", toState: "resolved", resolutionDetails: "The gate was resealed.",
            href: `${root}/threads/thread-1`
          },
          explanation: "Resolve the current Thread.", authorityTier: "canon_mutation",
          confirmationPolicy: "explicit", costCredits: 0,
          effectSummary: "Set Broken Seal to resolved.", manualFallback: "Open the Thread manually."
        }]
      }] }}
      onSubmit={vi.fn()}
      onConfirmAction={onConfirmAction}
    />);

    expect(screen.getByText(/0 additional credits · canon change/i)).toBeTruthy();
    expect(screen.getByText("active → resolved")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /review canon change/i }));
    expect(screen.getByText(/version-checked canon path/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /confirm canon change/i }));
    expect(onConfirmAction).toHaveBeenCalledWith("thread-state", 1);
  });
});
