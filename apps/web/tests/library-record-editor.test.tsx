import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LibraryRecordEditor } from "@/components/LibraryRecordEditor";
import type { LibraryRecordDetail } from "@/lib/types";
import {
  autosaveEntityAction,
  createLibraryLinkAction,
  hardDeleteEntityAction,
  resolveMentionAction,
} from "@/app/actions";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions", () => ({
  archiveEntityAction: vi.fn(), autosaveEntityAction: vi.fn(), createLibraryLinkAction: vi.fn(),
  deleteMediaAttachmentAction: vi.fn(), draftMediaAttachmentWithLoomAction: vi.fn(), hardDeleteEntityAction: vi.fn(),
  prepareMediaAttachmentAction: vi.fn(), removeLibraryLinkAction: vi.fn(), resolveMentionAction: vi.fn(), restoreEntityAction: vi.fn(),
  updateMediaAttachmentMetadataAction: vi.fn(), validateMediaAttachmentAction: vi.fn(), viewMediaAttachmentAction: vi.fn(),
}));

const params = { workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a" };

function fixture(overrides: Partial<LibraryRecordDetail> = {}): LibraryRecordDetail {
  return {
    record: { id: "character-a", entityType: "character", workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a", scope: "saga", name: "Mara Vale", summary: "Scout", narrative: "Old text", gm_notes: "Private", status: "active", tags: ["scout"], canon_state: "canon", updated_at: "2026-07-21T18:00:00.000Z" },
    provenance: [{ id: "audit-a", operation: "create", actor_kind: "gm", from_state: null, to_state: "canon", created_at: "2026-07-21T18:00:00.000Z", sources: [{ id: "source-a", kind: "gm_instruction", excerpt: "Manual GM create: Mara Vale", created_at: "2026-07-21T18:00:00.000Z" }] }],
    relationships: [],
    mentions: [{ id: "mention-a", state: "suggested", mention_text: "Glass Bridge", related_type: "place", related_id: "place-a", related_name: "Glass Bridge", updated_at: "2026-07-21T18:00:00.000Z" }],
    backlinks: [],
    candidates: [{ entityType: "place", id: "place-a", name: "Glass Bridge", scope: "saga" }],
    media_attachments: [],
    delete_blockers: { total: 0, relationships: 0, mentions: 0, note_attachments: 0, session_pins: 0, thread_activations: 0, pending_drafts: 0 },
    can_hard_delete: false,
    ...overrides,
  };
}

describe("LibraryRecordEditor", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
  afterEach(() => vi.useRealTimers());

  it("autosaves after 800ms, exposes save state, and sends the optimistic version", async () => {
    const next = fixture(); next.record = { ...next.record, narrative: "New text", updated_at: "2026-07-21T18:00:01.000Z" };
    vi.mocked(autosaveEntityAction).mockResolvedValue({ ok: true, updatedAt: next.record.updated_at!, detail: next });
    render(<LibraryRecordEditor params={params} initialDetail={fixture()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Narrative / body" }), { target: { value: "New text" } });
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(799); });
    expect(autosaveEntityAction).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); await Promise.resolve(); });

    expect(autosaveEntityAction).toHaveBeenCalledTimes(1);
    const sent = vi.mocked(autosaveEntityAction).mock.calls[0][0];
    expect(sent.get("narrative")).toBe("New text");
    expect(sent.get("status")).toBe("active");
    expect(sent.get("tags")).toBe("scout");
    expect(sent.get("expectedVersion")).toBe("2026-07-21T18:00:00.000Z");
    expect(screen.getByText(/^Saved/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Save manual edit/i })).toBeNull();
  });

  it("autosaves descriptive status and tags through the same optimistic edit", async () => {
    const next = fixture(); next.record = { ...next.record, status: "missing", tags: ["hidden-path", "politics"], updated_at: "2026-07-21T18:00:01.000Z" };
    vi.mocked(autosaveEntityAction).mockResolvedValue({ ok: true, updatedAt: next.record.updated_at!, detail: next });
    render(<LibraryRecordEditor params={params} initialDetail={fixture()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Status" }), { target: { value: "missing" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Tags" }), { target: { value: "Hidden Path, politics" } });
    await act(async () => { vi.advanceTimersByTime(800); await Promise.resolve(); });

    const sent = vi.mocked(autosaveEntityAction).mock.calls[0][0];
    expect(sent.get("status")).toBe("missing");
    expect(sent.get("tags")).toBe("Hidden Path, politics");
    expect(sent.get("expectedVersion")).toBe("2026-07-21T18:00:00.000Z");
  });

  it("keeps mention acceptance and relationship creation explicit", async () => {
    const accepted = fixture({ mentions: [], backlinks: [{ id: "mention-a", state: "accepted", mention_text: "Glass Bridge", source_type: "character", source_id: "character-a", source_name: "Mara Vale", updated_at: "2026-07-21T18:00:01.000Z" }] });
    vi.mocked(resolveMentionAction).mockResolvedValue({ ok: true, detail: accepted });
    vi.mocked(createLibraryLinkAction).mockResolvedValue({ ok: true, detail: fixture() });
    render(<LibraryRecordEditor params={params} initialDetail={fixture()} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept link" }));
    await act(async () => { await Promise.resolve(); });
    expect(resolveMentionAction).toHaveBeenCalledTimes(1);
    expect(vi.mocked(resolveMentionAction).mock.calls[0][0].get("resolution")).toBe("accepted");

    fireEvent.change(screen.getByRole("combobox", { name: "Related record" }), { target: { value: "place:place-a" } });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    await act(async () => { await Promise.resolve(); });
    expect(createLibraryLinkAction).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createLibraryLinkAction).mock.calls[0][0].get("target")).toBe("place:place-a");
  });

  it("requires both destructive confirmations and explains reference blockers", () => {
    const archived = fixture({
      record: { ...fixture().record, canon_state: "archived" },
      delete_blockers: { total: 1, relationships: 1, mentions: 0, note_attachments: 0, session_pins: 0, thread_activations: 0, pending_drafts: 0 },
      can_hard_delete: false,
    });
    render(<LibraryRecordEditor params={params} initialDetail={archived} />);
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete…" }));
    expect(screen.getByText("References must be removed first.")).toBeTruthy();
    expect(screen.getByText("1 relationships")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Delete permanently" })).toBeNull();
    expect(hardDeleteEntityAction).not.toHaveBeenCalled();
  });

  it("opens the existing protected delete panel from a reviewed Loom handoff", () => {
    const archived = fixture({
      record: { ...fixture().record, canon_state: "archived" },
      can_hard_delete: true,
    });
    render(<LibraryRecordEditor params={params} initialDetail={archived} initialDeleteOpen />);

    expect(screen.getByText(/I understand this cannot be undone/i)).toBeTruthy();
    expect(screen.getByText(/Type “Mara Vale”/i)).toBeTruthy();
    const deleteButton = screen.getByRole("button", { name: "Delete permanently" });
    expect(deleteButton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByRole("textbox", { name: /Type “Mara Vale”/i }), { target: { value: "Wrong" } });
    expect(deleteButton.hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: /Type “Mara Vale”/i }), { target: { value: "Mara Vale" } });
    expect(deleteButton.hasAttribute("disabled")).toBe(false);
    expect(hardDeleteEntityAction).not.toHaveBeenCalled();
  });
});
