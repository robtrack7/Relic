import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  quickCaptureAction,
  quickStubAction,
  recordDicePoolAction
} from "@/app/actions";
import { StageRuntimeDraft } from "@/components/relic-draft/StageRuntimeDraft";
import type { IdParams } from "@/lib/types";

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

function renderLiveStage() {
  return render(
    <StageRuntimeDraft
      params={params}
      saga={{ name: "The Shattered Crown", game_system: "5e" }}
      session={{ id: "session-1", name: "Session 16", status: "in_progress" }}
      pinned={[]}
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
    vi.mocked(quickStubAction).mockResolvedValue(undefined);
    vi.mocked(quickCaptureAction).mockResolvedValue(undefined);
  });

  it("submits normal and disadvantage d20 rolls and preserves advantage when pinned", async () => {
    renderLiveStage();
    fireEvent.click(screen.getByRole("button", { name: "Dice" }));
    let dialog = screen.getByRole("dialog", { name: "Dice" });
    fireEvent.click(within(dialog).getAllByRole("button", { name: /d20/ })[0]);
    expect(within(dialog).getByRole("group", { name: "d20 roll mode" })).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: /^Roll$/ }));
    await waitFor(() => expect(recordDicePoolAction).toHaveBeenCalledTimes(1));
    expect(formValues(vi.mocked(recordDicePoolAction).mock.calls[0])).toMatchObject({ mode: "normal", pool: "[20]" });

    fireEvent.click(within(dialog).getByRole("button", { name: /Disadvantage/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^Roll$/ }));
    await waitFor(() => expect(recordDicePoolAction).toHaveBeenCalledTimes(2));
    expect(formValues(vi.mocked(recordDicePoolAction).mock.calls[1])).toMatchObject({ mode: "disadvantage", pool: "[20]" });

    fireEvent.click(within(dialog).getByRole("button", { name: /Advantage/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Pin to board" }));
    expect(screen.queryByRole("dialog", { name: "Dice" })).toBeNull();
    const pinned = screen.getByRole("complementary", { name: "Pinned dice widget" });
    fireEvent.click(within(pinned).getByRole("button", { name: "Roll" }));
    await waitFor(() => expect(recordDicePoolAction).toHaveBeenCalledTimes(3));
    expect(formValues(vi.mocked(recordDicePoolAction).mock.calls[2])).toMatchObject({ mode: "advantage", pool: "[20]", label: "Pinned roll" });

    fireEvent.click(screen.getByRole("button", { name: "Dice" }));
    dialog = screen.getByRole("dialog", { name: "Dice" });
    fireEvent.click(within(dialog).getAllByRole("button", { name: /d20/ })[0]);
    expect(within(dialog).getByRole("button", { name: /Normal/ }).className).toBe("active");
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

    expect(quickStubAction).toHaveBeenCalledTimes(5);
    for (const [index, item] of cases.entries()) {
      expect(formValues(vi.mocked(quickStubAction).mock.calls[index])).toMatchObject({
        entityType: item.key,
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
    await waitFor(() => expect(quickCaptureAction).toHaveBeenCalledTimes(1));
    expect(formValues(vi.mocked(quickCaptureAction).mock.calls[0])).toMatchObject({
      title: "Harbor witness",
      body: "A messenger saw the exchange."
    });
    expect((await screen.findByRole("status")).textContent).toContain("Note saved to Library.");
  });

  it("keeps invalid and permission-denied Create input recoverable", async () => {
    vi.mocked(quickStubAction).mockRejectedValueOnce(new Error("Stage write is not permitted."));
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
    vi.mocked(quickStubAction).mockReturnValueOnce(new Promise<undefined>((resolve) => {
      resolveWrite = () => resolve(undefined);
    }));
    renderLiveStage();
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    const dialog = screen.getByRole("dialog", { name: "Create" });
    fireEvent.click(within(dialog).getByRole("button", { name: /NPC/ }));
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), { target: { value: "Mira Fen" } });
    const submit = within(dialog).getByRole("button", { name: "Create NPC" });

    fireEvent.click(submit);
    await waitFor(() => expect(quickStubAction).toHaveBeenCalledTimes(1));
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(submit);
    expect(quickStubAction).toHaveBeenCalledTimes(1);

    resolveWrite();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Create" })).toBeNull());
  });
});
