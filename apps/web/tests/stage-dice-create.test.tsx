import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordDicePoolAction } from "@/app/actions";
import { StageRuntimeDraft } from "@/components/relic-draft/StageRuntimeDraft";
import type { EntitySummary, IdParams } from "@/lib/types";

const writeQueueMocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  flushSession: vi.fn()
}));

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

vi.mock("@/lib/stage-write-queue", () => ({
  stageWriteSessionKey: (scope: Record<string, string>) => Object.values(scope).join(":"),
  getStageWriteQueue: () => ({
    enqueue: writeQueueMocks.enqueue,
    flushSession: writeQueueMocks.flushSession,
    subscribe: () => () => undefined,
    prepareSession: vi.fn()
  })
}));

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

function renderLiveStage(pinned: Array<{ pin: { entity_type: string; entity_id: string }; entity?: EntitySummary | null }> = []) {
  return render(
    <StageRuntimeDraft
      params={params}
      saga={{ name: "The Shattered Crown", game_system: "5e" }}
      session={{ id: "session-1", name: "Session 16", status: "in_progress" }}
      pinned={pinned}
      activeThreads={[]}
      results={[]}
      query=""
    />
  );
}

function formValues(call: unknown[]) {
  const data = call[0] as FormData;
  return Object.fromEntries(data.entries());
}

describe("Stage Dice and Quick Create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(recordDicePoolAction).mockImplementation(async (data) => {
      const mode = String(data.get("mode")) as "normal" | "advantage" | "disadvantage";
      return {
        expression: `1d20 (${mode})`,
        total: 12,
        rolls: [12],
        modifier: 0,
        mode,
        label: data.get("label")?.toString() || null,
        createdAt: "2026-07-20T12:00:00.000Z"
      };
    });
    writeQueueMocks.enqueue.mockResolvedValue({ id: "stage-write-1" });
    writeQueueMocks.flushSession.mockResolvedValue({ status: "idle", queued: 0, uploading: 0, failed: 0, lastError: null });
  });

  it("keeps dice as a system-neutral convenience roller", async () => {
    renderLiveStage();
    fireEvent.click(screen.getByRole("button", { name: "Dice" }));
    const dialog = screen.getByRole("dialog", { name: "Dice" });
    expect(within(dialog).getByText(/Convenience roller only/)).toBeTruthy();
    fireEvent.click(within(dialog).getAllByRole("button", { name: /d20/ })[0]);
    expect(within(dialog).queryByText(/Advantage|Disadvantage/)).toBeNull();

    fireEvent.click(within(dialog).getByRole("button", { name: /^Roll$/ }));
    await waitFor(() => expect(recordDicePoolAction).toHaveBeenCalledTimes(1));
    expect(formValues(vi.mocked(recordDicePoolAction).mock.calls[0])).toMatchObject({ mode: "normal", pool: "[20]" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Pin to board" }));
    expect(screen.queryByRole("dialog", { name: "Dice" })).toBeNull();
    const pinned = screen.getByRole("complementary", { name: "Pinned dice widget" });
    fireEvent.click(within(pinned).getByRole("button", { name: "Roll" }));
    await waitFor(() => expect(recordDicePoolAction).toHaveBeenCalledTimes(2));
    expect(formValues(vi.mocked(recordDicePoolAction).mock.calls[1])).toMatchObject({ mode: "normal", pool: "[20]", label: "Pinned roll" });
  });

  it("loads the GM Screen from pinned GM-authored Notes instead of built-in rules", () => {
    const note: EntitySummary = {
      id: "note-reference", entityType: "note", workspace_id: "workspace-1", world_id: "world-1", saga_id: "saga-1",
      scope: "saga", name: "Storm chase procedure", summary: "Escalate the clock after each failed obstacle.",
      narrative: "Advance the storm clock, describe the worsening weather, then ask what the crew risks next.", canon_state: "canon",
    };
    const character: EntitySummary = {
      id: "character-1", entityType: "character", workspace_id: "workspace-1", world_id: "world-1", saga_id: "saga-1",
      scope: "saga", name: "Keeper Sable", summary: "Observatory keeper", canon_state: "canon",
    };
    renderLiveStage([
      { pin: { entity_type: "note", entity_id: note.id }, entity: note },
      { pin: { entity_type: "character", entity_id: character.id }, entity: character },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "GM Screen" }));
    const screenPanel = screen.getByRole("complementary", { name: "GM Screen" });
    expect(within(screenPanel).getByText("Your GM-authored references for this Session.")).toBeTruthy();
    expect(within(screenPanel).getByPlaceholderText("Search your references…")).toBeTruthy();
    expect(within(screenPanel).queryByText("Keeper Sable")).toBeNull();
    expect(within(screenPanel).queryByText(/Difficulty classes|Death saves|Advantage/)).toBeNull();
    fireEvent.click(within(screenPanel).getByRole("button", { name: /Storm chase procedure/ }));
    expect(within(screenPanel).getByText(/Advance the storm clock/)).toBeTruthy();
  });

  it("directs an empty GM Screen back to Session Prep", () => {
    renderLiveStage();
    fireEvent.click(screen.getByRole("button", { name: "GM Screen" }));
    expect(screen.getByText(/Pin a GM-authored Note during Session Prep/)).toBeTruthy();
  });

  it("routes every Create type with the correct persistence semantics", async () => {
    renderLiveStage();
    const cases = [
      { label: "NPC", key: "character", name: "Mira Fen" },
      { label: "Location", key: "place", name: "Moon Gate" },
      { label: "Item", key: "artifact", name: "Glass Seal" },
      { label: "Thread", key: "thread", name: "The Lost Courier" },
      { label: "Faction", key: "faction", name: "Brass Assembly" }
    ];

    for (const item of cases) {
      fireEvent.click(screen.getByRole("button", { name: "Create" }));
      const dialog = screen.getByRole("dialog", { name: "Create" });
      fireEvent.click(within(dialog).getByRole("button", { name: new RegExp(item.label) }));
      fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), { target: { value: item.name } });
      fireEvent.change(within(dialog).getByRole("textbox", { name: /Short note/ }), { target: { value: `${item.label} summary` } });
      fireEvent.click(within(dialog).getByRole("button", { name: `Create ${item.label}` }));
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Create" })).toBeNull());
    }

    expect(writeQueueMocks.enqueue).toHaveBeenCalledTimes(5);
    for (const [index, item] of cases.entries()) {
      expect(writeQueueMocks.enqueue.mock.calls[index][1]).toBe("quick_stub");
      expect(writeQueueMocks.enqueue.mock.calls[index][2]).toMatchObject({
        entity_type: item.key,
        name: item.name,
        summary: `${item.label} summary`
      });
    }

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    const noteDialog = screen.getByRole("dialog", { name: "Create" });
    fireEvent.click(within(noteDialog).getByRole("button", { name: /Note/ }));
    fireEvent.change(within(noteDialog).getByRole("textbox", { name: "Name" }), { target: { value: "Harbor witness" } });
    fireEvent.change(within(noteDialog).getByRole("textbox", { name: /Short note/ }), { target: { value: "A messenger saw the exchange." } });
    fireEvent.click(within(noteDialog).getByRole("button", { name: "Create Note" }));
    await waitFor(() => expect(writeQueueMocks.enqueue).toHaveBeenCalledTimes(6));
    expect(writeQueueMocks.enqueue.mock.calls[5][1]).toBe("quick_capture");
    expect(writeQueueMocks.enqueue.mock.calls[5][2]).toMatchObject({
      title: "Harbor witness",
      body: "A messenger saw the exchange."
    });
    expect((await screen.findByRole("status")).textContent).toContain("Note saved locally");
  });

  it("keeps invalid and permission-denied Create input recoverable", async () => {
    writeQueueMocks.enqueue.mockRejectedValueOnce(new Error("Stage write is not permitted."));
    renderLiveStage();
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    const dialog = screen.getByRole("dialog", { name: "Create" });
    fireEvent.click(within(dialog).getByRole("button", { name: /NPC/ }));
    const submit = within(dialog).getByRole("button", { name: "Create NPC" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), { target: { value: "Mira Fen" } });
    fireEvent.click(submit);
    expect((await screen.findByRole("alert")).textContent).toContain("Stage write is not permitted.");
    expect(screen.getByRole("dialog", { name: "Create" })).toBeTruthy();
    expect((within(dialog).getByRole("textbox", { name: "Name" }) as HTMLInputElement).value).toBe("Mira Fen");
  });

  it("blocks duplicate Create submission while the first write is pending", async () => {
    let resolveWrite!: () => void;
    writeQueueMocks.enqueue.mockReturnValueOnce(new Promise((resolve) => {
      resolveWrite = () => resolve({ id: "stage-write-pending" });
    }));
    renderLiveStage();
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    const dialog = screen.getByRole("dialog", { name: "Create" });
    fireEvent.click(within(dialog).getByRole("button", { name: /NPC/ }));
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), { target: { value: "Mira Fen" } });
    const submit = within(dialog).getByRole("button", { name: "Create NPC" });

    fireEvent.click(submit);
    await waitFor(() => expect(writeQueueMocks.enqueue).toHaveBeenCalledTimes(1));
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(submit);
    expect(writeQueueMocks.enqueue).toHaveBeenCalledTimes(1);

    resolveWrite();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Create" })).toBeNull());
  });
});
