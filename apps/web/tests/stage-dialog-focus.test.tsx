import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
      session={{
        id: "session-1",
        name: "Session 16",
        status: "in_progress",
        started_at: "2026-07-20T18:00:00.000Z",
        objective: "Confront the Dockmaster.",
        opening_scene: "Fog over Fenwick Harbor.",
        scene_notes: "The deed changes hands before midnight."
      }}
      pinned={[]}
      activeThreads={[]}
      results={[]}
      query=""
    />
  );
}

function advanceStageClock() {
  act(() => vi.advanceTimersByTime(2_100));
}

describe("Stage dialog focus lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T18:15:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("preserves the active field and typed value across elapsed-time renders", () => {
    renderLiveStage();

    fireEvent.click(screen.getByRole("button", { name: "Dice" }));
    const diceDialog = screen.getByRole("dialog", { name: "Dice" });
    const modifier = within(diceDialog).getByRole("spinbutton");
    fireEvent.change(modifier, { target: { value: "7" } });
    modifier.focus();
    advanceStageClock();
    expect((modifier as HTMLInputElement).value).toBe("7");
    expect(document.activeElement).toBe(modifier);
    fireEvent.click(within(diceDialog).getByRole("button", { name: "Close Dice" }));

    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    const noteDialog = screen.getByRole("dialog", { name: "Quick Note" });
    const note = within(noteDialog).getByRole("textbox", { name: "Note" });
    fireEvent.change(note, { target: { value: "The deed changed hands." } });
    note.focus();
    advanceStageClock();
    expect((note as HTMLTextAreaElement).value).toBe("The deed changed hands.");
    expect(document.activeElement).toBe(note);
    fireEvent.click(within(noteDialog).getByRole("button", { name: "Close Quick Note" }));

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    const createDialog = screen.getByRole("dialog", { name: "Create" });
    fireEvent.click(within(createDialog).getByRole("button", { name: /NPC/ }));
    const summary = within(createDialog).getByRole("textbox", { name: /Short note/ });
    fireEvent.change(summary, { target: { value: "A witness from the harbor." } });
    summary.focus();
    advanceStageClock();
    expect((summary as HTMLTextAreaElement).value).toBe("A witness from the harbor.");
    expect(document.activeElement).toBe(summary);
  });

  it("keeps the two-step End confirmation and its focused action stable across clock ticks", () => {
    renderLiveStage();
    fireEvent.click(screen.getByRole("button", { name: "End Session" }));
    const dialog = screen.getByRole("dialog", { name: "End Session" });
    fireEvent.click(within(dialog).getByRole("button", { name: /^End Session$/ }));

    const confirm = within(dialog).getByRole("button", { name: "Yes, end session" });
    confirm.focus();
    advanceStageClock();

    expect(within(dialog).getByText(/Are you sure/)).toBeTruthy();
    expect(document.activeElement).toBe(confirm);
  });

  it("retains Escape, backdrop close, focus trapping, and focus return", () => {
    const { container } = renderLiveStage();
    const diceButton = screen.getByRole("button", { name: "Dice" });
    diceButton.focus();
    fireEvent.click(diceButton);

    let dialog = screen.getByRole("dialog", { name: "Dice" });
    const focusable = [...dialog.querySelectorAll<HTMLElement>(
      "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]"
    )];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Dice" })).toBeNull();
    expect(document.activeElement).toBe(diceButton);

    fireEvent.click(diceButton);
    dialog = screen.getByRole("dialog", { name: "Dice" });
    fireEvent.mouseDown(container.querySelector(".stage-v2-backdrop") as HTMLElement);
    expect(dialog.isConnected).toBe(false);
    expect(document.activeElement).toBe(diceButton);
  });
});
