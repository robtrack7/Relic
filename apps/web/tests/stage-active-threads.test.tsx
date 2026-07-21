import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StageRuntimeDraft } from "@/components/relic-draft/StageRuntimeDraft";
import type { EntitySummary, IdParams } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  )
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/w/workspace-1/world/world-1/saga/saga-1/sessions/session-1/stage",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/lib/env", () => ({ hasSupabaseEnv: () => false }));

vi.mock("@/app/actions", () => ({
  markMomentAction: vi.fn(),
  quickCaptureAction: vi.fn(),
  quickStubAction: vi.fn(),
  recordDicePoolAction: vi.fn(),
  recordSessionConsentAction: vi.fn(),
  setSessionStatusAction: vi.fn()
}));

const params: IdParams = {
  workspaceId: "workspace-1",
  worldId: "world-1",
  sagaId: "saga-1"
};

const activeThreads: EntitySummary[] = [
  {
    id: "thread-1",
    entityType: "thread",
    workspace_id: "workspace-1",
    world_id: "world-1",
    saga_id: "saga-1",
    scope: "saga",
    name: "The Forged Succession",
    summary: "The succession crisis is tightening.",
    canon_state: "canon",
    status: "active",
    objectives_log: [{ text: "Find the forged deed" }, { text: "Confront the heir" }]
  },
  {
    id: "thread-2",
    entityType: "thread",
    workspace_id: "workspace-1",
    world_id: "world-1",
    saga_id: "saga-1",
    scope: "saga",
    name: "A Debt at Moonwell",
    summary: null,
    canon_state: "canon",
    status: "loose",
    objectives_log: []
  }
];

function renderStage(threads: EntitySummary[]) {
  return render(
    <StageRuntimeDraft
      params={params}
      saga={{ name: "The Shattered Crown", game_system: "5e" }}
      session={{ id: "session-1", name: "Session 16", session_number: 16, status: "ready" }}
      pinned={[]}
      activeThreads={threads}
      results={[]}
      query=""
    />
  );
}

describe("Stage active Threads", () => {
  it("presents session-active Threads as compact read-only context", () => {
    renderStage(activeThreads);

    const region = screen.getByRole("region", { name: "Active Threads" });
    expect(within(region).getByText("2 carried into this session")).toBeTruthy();
    expect(within(region).getByText("The Forged Succession")).toBeTruthy();
    expect(within(region).getByText("The succession crisis is tightening.")).toBeTruthy();
    expect(within(region).getByText("2 objectives")).toBeTruthy();
    expect(within(region).getByText("A Debt at Moonwell")).toBeTruthy();
    expect(within(region).getByText("No thread summary recorded.")).toBeTruthy();
    expect(within(region).getByText("0 objectives")).toBeTruthy();
    expect(within(region).queryAllByRole("button")).toHaveLength(0);
    expect(within(region).queryAllByRole("link")).toHaveLength(0);
  });

  it("keeps the five-button rail and an explicit empty state", () => {
    renderStage([]);

    expect(screen.getByRole("region", { name: "Active Threads" }).textContent).toContain(
      "No active Threads were carried into this session."
    );
    expect(screen.getByLabelText("Stage identity").textContent).toBe("The StageSession 16");

    const actions = screen.getByRole("navigation", { name: "Stage actions" });
    expect(within(actions).getAllByRole("button")).toHaveLength(5);
    for (const label of ["Record", "Note", "Dice", "Create", "End Session"]) {
      expect(within(actions).getByRole("button", { name: label })).toBeTruthy();
    }
  });
});
