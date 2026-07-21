import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThreadList } from "@/components/ThreadList";
import type { EntitySummary, IdParams } from "@/lib/types";

vi.mock("next/link", () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));

const params: IdParams = { workspaceId: "w", worldId: "world", sagaId: "saga" };
const base: Omit<EntitySummary, "id" | "name" | "status"> = { entityType: "thread", workspace_id: "w", world_id: "world", saga_id: "saga", scope: "saga", summary: null, canon_state: "canon" };

describe("Thread list grouping", () => {
  it("renders Failed alongside Active, Loose, and Resolved", () => {
    render(<ThreadList params={params} threads={[
      { ...base, id: "a", name: "Active Thread", status: "active" },
      { ...base, id: "l", name: "Loose Thread", status: "loose" },
      { ...base, id: "f", name: "Failed Thread", status: "failed" },
      { ...base, id: "r", name: "Resolved Thread", status: "resolved" },
    ]} />);
    for (const group of ["Active", "Loose", "Failed", "Resolved"]) {
      expect(within(screen.getByRole("region", { name: `${group} Threads` })).getByText(new RegExp(`${group} Thread`))).toBeTruthy();
    }
  });
});
