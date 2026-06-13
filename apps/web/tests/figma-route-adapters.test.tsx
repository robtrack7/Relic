import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrepareWorkspaceDraft } from "@/components/relic-draft/PrepareWorkspaceDraft";
import { StageRuntimeDraft } from "@/components/relic-draft/StageRuntimeDraft";
import type { EntitySummary, IdParams } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/app/actions", () => ({
  markMomentAction: vi.fn(),
  quickCaptureAction: vi.fn(),
  quickStubAction: vi.fn(),
  recordDiceRollAction: vi.fn(),
  recordSessionConsentAction: vi.fn(),
  readyForStageAction: vi.fn(),
  setSessionStatusAction: vi.fn(),
  updateSessionPrepAction: vi.fn()
}));

const params: IdParams = { workspaceId: "workspace-1", worldId: "world-1", sagaId: "saga-1" };

const character: EntitySummary = {
  id: "character-1",
  entityType: "character",
  workspace_id: "workspace-1",
  world_id: "world-1",
  saga_id: "saga-1",
  scope: "saga",
  name: "Mira Ashborne",
  summary: "A wary ally at the harbor.",
  narrative: "Mira carries news of the forged deed.",
  gm_notes: "voice: clipped whisper\nwants: proof\nKeep her nervous.",
  canon_state: "canon",
  is_stub: false
};

const thread: EntitySummary = {
  id: "thread-1",
  entityType: "thread",
  workspace_id: "workspace-1",
  world_id: "world-1",
  saga_id: "saga-1",
  scope: "saga",
  name: "The Forged Succession",
  summary: "The succession crisis is tightening.",
  narrative: null,
  gm_notes: null,
  canon_state: "canon",
  is_stub: false
};

const session = {
  id: "session-1",
  name: "Session 16",
  status: "planned",
  objective: "Confront the Dockmaster.",
  opening_scene: "Fog over Fenwick Harbor.",
  scene_notes: "The deed changes hands before midnight.",
  prep_checklist: [{ text: "Write objective", done: true }, { text: "Pin Mira", done: false }]
};

describe("Figma route adapters", () => {
  it("renders the backend-wired Prepare route as a packet workspace", () => {
    render(
      <PrepareWorkspaceDraft
        params={params}
        session={session}
        options={{ entities: [character], threads: [thread] }}
        pinnedKeys={new Set(["character:character-1"])}
        activeThreadIds={new Set(["thread-1"])}
      />
    );

    expect(screen.getByRole("heading", { name: "Session 16" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ready for Stage" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Objective" })).toHaveProperty("defaultValue", "Confront the Dockmaster.");
    expect(screen.getByText("The Stage will read this packet exactly as written here.")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Mira Ashborne" })).toHaveProperty("checked", true);
  });

  it("renders the backend-wired Stage route as a focused live table surface", () => {
    render(
      <StageRuntimeDraft
        params={params}
        saga={{ name: "The Shattered Crown" }}
        session={{ ...session, status: "ready" }}
        pinned={[{ pin: { entity_type: "character", entity_id: "character-1" }, entity: character }]}
        activeThreads={[thread]}
        results={[{ source_kind: "entity", source_entity_type: "character", source_entity_id: "character-1", snippet: "Mira knows about the forged deed.", rrf_score: 1, canon_state: "canon", is_stub: false }]}
        query="Mira"
      />
    );

    expect(screen.getByRole("heading", { name: "Session 16" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start Session" })).toBeTruthy();
    const agenda = screen.getByRole("region", { name: "Agenda" });
    expect(within(agenda).getByText("Confront the Dockmaster.")).toBeTruthy();
    expect(screen.getAllByText("Mira Ashborne").length).toBeGreaterThan(0);
    expect(screen.getByText("Voice")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark Moment" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "End Session" })).toBeTruthy();
  });
});
