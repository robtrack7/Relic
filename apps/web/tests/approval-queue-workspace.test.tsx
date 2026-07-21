import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApprovalQueueWorkspace } from "@/components/relic-draft/ApprovalQueueWorkspace";

vi.mock("@/app/actions", () => ({
  resolveDraftAction: vi.fn(),
  resolveDraftSelectionAction: vi.fn(),
  refreshDraftBaselineAction: vi.fn(),
}));

const params = { workspaceId: "workspace", worldId: "world", sagaId: "saga" };
const baseDraft = {
  id: "draft-update",
  entity_type: "character",
  target_entity_id: "character-1",
  state: "pending",
  change_kind: "update",
  title: "Mara Vale",
  confidence_band: "medium",
  confidence_reason: "single_clear_segment",
  created_by: "gm_via_ai_approval",
  created_at: "2026-07-21T00:00:00Z",
  batch_id: "batch-c3",
  provenance: {
    ai_task_name: "synthesize_session",
    prompt_version: "session-synthesis-v1",
    model: "deterministic-c5",
    provider: "deterministic-test",
    pipeline_run_id: "pipeline-c3",
    session_id: "session-c3",
  },
  editable_payload: { summary: "New summary" },
  field_diffs: [{ field: "summary", label: "Summary", old: "Old summary", new: "New summary", value_type: "string" }],
  conflict: { kind: "none", blocking: false, concurrent_count: 0 },
  source_health: "healthy",
  citations: [{ status: "available", source_kind: "gm_manual_summary", label: "GM manual summary", frozen_excerpt: "Mara opened the gate.", drift_state: "not_applicable" }],
} as const;

describe("ApprovalQueueWorkspace", () => {
  it("renders field-level old/new diffs, trust context, consequences, and C4 citations", () => {
    render(<ApprovalQueueWorkspace params={params} sagaRoot="/app/w/workspace/world/world/saga/saga" drafts={[baseDraft]} />);

    const draft = screen.getByRole("article", { name: "Mara Vale update proposal" });
    expect(within(draft).getByText("Old summary")).toBeTruthy();
    expect(within(draft).getByDisplayValue("New summary")).toBeTruthy();
    expect(within(draft).queryByText(/\{"summary"/)).toBeNull();
    expect(within(draft).getByText(/session-synthesis-v1/)).toBeTruthy();
    expect(within(draft).getByText(/writes the reviewed fields to Mara Vale and records one canon audit entry/i)).toBeTruthy();
    fireEvent.click(within(draft).getByText("GM manual summary"));
    expect(within(draft).getByText("Mara opened the gate.")).toBeTruthy();
  });

  it("offers explicit one-by-one, selected, and prominent approve-all workflows", () => {
    render(<ApprovalQueueWorkspace params={params} sagaRoot="/app/w/workspace/world/world/saga/saga" drafts={[
      baseDraft,
      { ...baseDraft, id: "draft-create", title: "Glass Bridge", target_entity_id: null, change_kind: "create", editable_payload: { name: "Glass Bridge" }, field_diffs: [{ field: "name", label: "Name", old: null, new: "Glass Bridge", value_type: "string" }] },
    ]} />);

    expect(screen.getByRole("button", { name: "Approve all 2 compatible proposals" })).toBeTruthy();
    const selectedButton = screen.getByRole("button", { name: "Approve selected" });
    expect(selectedButton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Mara Vale" }));
    expect(selectedButton.hasAttribute("disabled")).toBe(false);
    expect(screen.getAllByRole("button", { name: "Approve proposal" })).toHaveLength(2);
  });

  it("filters by search, status, draft type, batch, confidence, and conflicts", () => {
    render(<ApprovalQueueWorkspace params={params} sagaRoot="/app/w/workspace/world/world/saga/saga" drafts={[
      baseDraft,
      { ...baseDraft, id: "draft-conflict", title: "Glass Bridge", entity_type: "place", confidence_band: "low", batch_id: "batch-other", conflict: { kind: "stale_target", blocking: true, concurrent_count: 0 } },
    ]} />);

    expect(screen.getAllByRole("article")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Search proposals"), { target: { value: "glass" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Search proposals"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Conflict filter"), { target: { value: "conflict" } });
    expect(screen.getByRole("article", { name: "Glass Bridge update proposal" })).toBeTruthy();
    expect(screen.queryByRole("article", { name: "Mara Vale update proposal" })).toBeNull();
    expect(screen.getByLabelText("Status filter")).toBeTruthy();
    expect(screen.getByLabelText("Draft type filter")).toBeTruthy();
    expect(screen.getByLabelText("Batch filter")).toBeTruthy();
    expect(screen.getByLabelText("Confidence filter")).toBeTruthy();
  });

  it("explains archive versus deletion and exposes safe stale and broken-source choices", () => {
    render(<ApprovalQueueWorkspace params={params} sagaRoot="/app/w/workspace/world/world/saga/saga" drafts={[
      { ...baseDraft, id: "draft-archive", title: "Old Archive", change_kind: "archive_request", editable_payload: {}, field_diffs: [{ field: "canon_state", label: "Canon state", old: "canon", new: "archived", value_type: "string" }] },
      { ...baseDraft, id: "draft-stale", title: "Stale Mara", conflict: { kind: "stale_target", blocking: true, concurrent_count: 0 } },
      { ...baseDraft, id: "draft-broken", title: "Broken Source", source_health: "broken", conflict: { kind: "broken_source", blocking: true, concurrent_count: 0 }, citations: [{ status: "broken", source_kind: "transcript_segment", label: "Source unavailable", drift_state: "unavailable" }] },
    ]} />);

    const archive = screen.getByRole("article", { name: "Old Archive archive_request proposal" });
    expect(within(archive).getByText(/Archive keeps the record and backlinks intact; it does not delete data/i)).toBeTruthy();
    const approveArchive = within(archive).getByRole("button", { name: "Approve proposal" });
    expect(approveArchive.hasAttribute("disabled")).toBe(true);
    fireEvent.click(within(archive).getByRole("checkbox", { name: "Archive this record without deleting it." }));
    expect(approveArchive.hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Refresh against current canon" })).toBeTruthy();
    const broken = screen.getByRole("article", { name: "Broken Source update proposal" });
    expect(within(broken).getByText(/approval is blocked until evidence is restored/i)).toBeTruthy();
    expect(within(broken).getByRole("button", { name: "Approve proposal" }).hasAttribute("disabled")).toBe(true);
    expect(within(broken).getByRole("button", { name: "Reject proposal" })).toBeTruthy();
  });
});
