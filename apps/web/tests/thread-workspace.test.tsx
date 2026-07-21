import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThreadWorkspace } from "@/components/ThreadWorkspace";
import type { IdParams, ThreadDetail, ThreadTimelineEntry } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/actions", () => ({
  createLibraryLinkAction: vi.fn(), mutateThreadObjectiveAction: vi.fn(),
  removeLibraryLinkAction: vi.fn(), updateThreadDetailsAction: vi.fn(),
}));

const params: IdParams = { workspaceId: "workspace-1", worldId: "world-1", sagaId: "saga-1" };
const detail: ThreadDetail = {
  record: {
    id: "thread-1", entityType: "thread", workspace_id: "workspace-1", world_id: "world-1", saga_id: "saga-1",
    scope: "saga", name: "The Glass Crown", summary: "The crown remains missing.", narrative: "", gm_notes: "",
    canon_state: "canon", status: "active", resolution_state: "active", resolution_details: null,
    objectives_log: [
      { id: "objective-1", text: "Find the map", state: "completed", completed_at: "2026-07-21T10:00:00Z", order_index: 0 },
      { id: "objective-2", text: "Cross the bridge", state: "open", completed_at: null, order_index: 1 },
    ], updated_at: "2026-07-21T10:00:00Z",
  },
  relationships: [{ link_type: "relationship", id: "relationship-1", kind: "related-to", notes: null, direction: "outbound", related_type: "place", related_id: "place-1", related_name: "Glass Bridge", created_at: "2026-07-21T09:00:00Z" }],
  candidates: [{ entityType: "character", id: "character-1", name: "Mara Vale", scope: "saga" }],
};
const timeline: ThreadTimelineEntry[] = [
  { event_id: "event-1", thread_id: "thread-1", objective_id: null, session_id: "session-1", session_number: 1, session_name: "Session 1", event_type: "thread_created", title: "Thread created as Loose", detail: "The Glass Crown", occurred_at: "2026-07-21T09:00:00Z", source_type: "canon_audit", source_id: "audit-1" },
  { event_id: "event-2", thread_id: "thread-1", objective_id: "objective-1", session_id: "session-3", session_number: 3, session_name: "Session 3", event_type: "objective_completed", title: "Objective completed", detail: "Find the map", occurred_at: "2026-07-21T10:00:00Z", source_type: "canon_audit", source_id: "audit-2" },
];

describe("Thread workspace", () => {
  it("exposes scoped Thread, resolution, objective, ordering, and relationship controls", () => {
    render(<ThreadWorkspace params={params} initialDetail={detail} initialTimeline={timeline} />);
    expect((screen.getByLabelText("Thread title") as HTMLInputElement).value).toBe("The Glass Crown");
    expect((screen.getByLabelText("Thread summary") as HTMLTextAreaElement).value).toBe("The crown remains missing.");
    expect((screen.getByLabelText("Thread state") as HTMLSelectElement).value).toBe("active");
    expect(screen.getByLabelText("Resolution details")).toBeTruthy();

    const objectives = screen.getByRole("region", { name: "Thread objectives" });
    expect(within(objectives).getByDisplayValue("Find the map")).toBeTruthy();
    expect(within(objectives).getByRole("button", { name: "Reopen Find the map" })).toBeTruthy();
    expect(within(objectives).getByRole("button", { name: "Complete Cross the bridge" })).toBeTruthy();
    expect(within(objectives).getByRole("button", { name: "Move Cross the bridge up" })).toBeTruthy();
    expect(within(objectives).getByRole("button", { name: "Add objective" })).toBeTruthy();

    const related = screen.getByRole("region", { name: "Related entities" });
    expect(within(related).getByRole("link", { name: "Glass Bridge" })).toBeTruthy();
    expect(within(related).getByRole("button", { name: "Remove Glass Bridge" })).toBeTruthy();
    expect(within(related).getByRole("button", { name: "Add related entity" })).toBeTruthy();
  });

  it("renders source-aware history chronologically and has no timeline editing controls", () => {
    render(<ThreadWorkspace params={params} initialDetail={detail} initialTimeline={timeline} />);
    const history = screen.getByRole("region", { name: "Thread timeline" });
    expect(within(history).getAllByRole("article").map((entry) => entry.textContent)).toEqual([
      expect.stringContaining("Session 1"),
      expect.stringContaining("Session 3"),
    ]);
    expect(within(history).getByText("canon audit · audit-1")).toBeTruthy();
    expect(within(history).queryByRole("button")).toBeNull();
    expect(within(history).queryByRole("textbox")).toBeNull();
  });

  it("keeps missing and archived related records legible", () => {
    render(<ThreadWorkspace params={params} initialDetail={{ ...detail, relationships: [
      { ...detail.relationships[0], related_name: "", related_id: "deleted-place" },
      { ...detail.relationships[0], id: "relationship-2", related_id: "archived-place", related_name: "Old Keep", related_archived: true },
    ] }} initialTimeline={timeline} />);
    expect(screen.getByText("Unavailable record")).toBeTruthy();
    expect(screen.getByText("Archived", { exact: true })).toBeTruthy();
  });

  it("shows Failed as a distinct state and only asks for resolution context when applicable", () => {
    render(<ThreadWorkspace params={params} initialDetail={detail} initialTimeline={timeline} />);
    fireEvent.change(screen.getByLabelText("Thread state"), { target: { value: "failed" } });
    expect(screen.getByText("Explain why this Thread failed or resolved.")).toBeTruthy();
  });
});
