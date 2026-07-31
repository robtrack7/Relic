import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionPrepEditor } from "@/components/SessionPrepEditor";
import { autosaveSessionPrepAction, mutateSessionPrepAction, readyForStageAction } from "@/app/actions";
import type { SessionPrepData } from "@/lib/types";
import type { SessionPrepPin } from "@/lib/types";
import { installMemoryLocalStorage } from "./local-storage";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/actions", () => ({
  autosaveSessionPrepAction: vi.fn(), mutateSessionPrepAction: vi.fn(), readyForStageAction: vi.fn(),
  startPrepAiAction: vi.fn(), setPrepAiReviewStateAction: vi.fn(),
}));

const params = { workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a" };
const entity: SessionPrepPin = { key: "character:character-a", entity_type: "character", entity_id: "character-a", name: "Mara Vale", state: "available", order_index: 0 };
const archived: SessionPrepPin = { key: "place:place-a", entity_type: "place", entity_id: "place-a", name: "Old Harbor", state: "archived", order_index: 1 };
const thread: SessionPrepPin = { key: "thread:thread-a", entity_type: "thread", entity_id: "thread-a", name: "Forged Succession", state: "available", order_index: 0 };

function fixture(status = "planned"): SessionPrepData {
  return {
    session: { id: "session-a", name: "Session 4", session_number: 4, status, objective: "Find the witness", opening_scene: "Rain at the harbor", scene_notes: "Mara arrives late.", prep_checklist: [{ text: "Review clues", done: false }], planned_start_at: "2026-07-30T02:30:00.000Z", updated_at: "2026-07-21T20:00:00.000Z" },
    pinned_entities: [entity, archived], active_threads: [thread],
    options: { entities: [entity, archived], threads: [thread] },
    prior_summary: { state: "approved", session_name: "Session 3", text: "The party recovered the forged seal." },
  };
}

function saved(data = fixture(), updatedAt = "2026-07-21T20:00:01.000Z") {
  return { ok: true as const, updatedAt, prep: { ...data, session: { ...data.session, updated_at: updatedAt } } };
}

describe("SessionPrepEditor", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); installMemoryLocalStorage(); Object.defineProperty(navigator, "onLine", { configurable: true, value: true }); });
  afterEach(() => vi.useRealTimers());

  it("debounces autosave, persists once, and exposes saving then saved", async () => {
    let resolve!: (value: ReturnType<typeof saved>) => void;
    vi.mocked(autosaveSessionPrepAction).mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<SessionPrepEditor params={params} initialPrep={fixture()} surface="full" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Objective" }), { target: { value: "Meet the witness" } });
    expect(screen.getByRole("status").textContent).toMatch(/unsaved/i);
    await act(async () => { vi.advanceTimersByTime(799); });
    expect(autosaveSessionPrepAction).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(screen.getByRole("status").textContent).toMatch(/saving/i);
    expect(autosaveSessionPrepAction).toHaveBeenCalledTimes(1);
    await act(async () => resolve(saved()));
    expect(screen.getByRole("status").textContent).toMatch(/saved/i);
    expect(localStorage.length).toBe(0);
  });

  it("keeps continued typing while a save is in flight and follows with one latest save", async () => {
    let firstResolve!: (value: ReturnType<typeof saved>) => void;
    vi.mocked(autosaveSessionPrepAction)
      .mockReturnValueOnce(new Promise((r) => { firstResolve = r; }))
      .mockResolvedValueOnce(saved(fixture(), "2026-07-21T20:00:02.000Z"));
    render(<SessionPrepEditor params={params} initialPrep={fixture()} surface="inline" />);
    const objective = screen.getByRole("textbox", { name: "Objective" });
    fireEvent.change(objective, { target: { value: "Draft one" } });
    await act(async () => { vi.advanceTimersByTime(800); });
    fireEvent.change(objective, { target: { value: "Draft two survives" } });
    await act(async () => firstResolve(saved()));
    await act(async () => { vi.runOnlyPendingTimers(); await Promise.resolve(); });
    expect((objective as HTMLInputElement).value).toBe("Draft two survives");
    expect(autosaveSessionPrepAction).toHaveBeenCalledTimes(2);
    expect(vi.mocked(autosaveSessionPrepAction).mock.calls[1][0].get("objective")).toBe("Draft two survives");
  });

  it("recovers a refresh/app-restart draft from local storage", () => {
    const first = render(<SessionPrepEditor params={params} initialPrep={fixture()} surface="full" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Scene notes" }), { target: { value: "Unsaved local scene" } });
    expect(localStorage.length).toBe(1);
    first.unmount();
    render(<SessionPrepEditor params={params} initialPrep={fixture()} surface="inline" />);
    expect((screen.getByRole("textbox", { name: "Scene notes" }) as HTMLTextAreaElement).value).toBe("Unsaved local scene");
    expect(screen.getByRole("status").textContent).toMatch(/recovered/i);
  });

  it("preserves input across network failure and retries exactly once", async () => {
    vi.mocked(autosaveSessionPrepAction).mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(saved());
    render(<SessionPrepEditor params={params} initialPrep={fixture()} surface="full" />);
    const notes = screen.getByRole("textbox", { name: "Scene notes" });
    fireEvent.change(notes, { target: { value: "Network-safe notes" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(screen.getByRole("status").textContent).toMatch(/failed/i);
    expect((notes as HTMLTextAreaElement).value).toBe("Network-safe notes");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /retry save/i })); await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByRole("status").textContent).toMatch(/saved/i);
    expect(autosaveSessionPrepAction).toHaveBeenCalledTimes(2);
  });

  it("reports offline and stale-write conflict without overwriting the local draft", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const { unmount } = render(<SessionPrepEditor params={params} initialPrep={fixture()} surface="full" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Objective" }), { target: { value: "Offline objective" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(screen.getByRole("status").textContent).toMatch(/offline/i);
    expect(autosaveSessionPrepAction).not.toHaveBeenCalled();
    unmount();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    vi.mocked(autosaveSessionPrepAction).mockResolvedValue({ ok: false, conflict: true, error: "Prep changed elsewhere." });
    render(<SessionPrepEditor params={params} initialPrep={fixture()} surface="full" />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /retry save/i })); await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByRole("status").textContent).toMatch(/conflict/i);
    expect((screen.getByRole("textbox", { name: "Objective" }) as HTMLInputElement).value).toBe("Offline objective");
    expect(localStorage.length).toBe(1);
  });

  it("keeps inline and full surfaces at shared-field and action parity", () => {
    const { unmount } = render(<SessionPrepEditor params={params} initialPrep={fixture()} surface="inline" />);
    for (const name of ["Session title", "Objective", "Opening scene", "Scene notes", "Prep checklist"]) expect(screen.getByRole("textbox", { name })).toBeTruthy();
    expect(screen.getByLabelText("Scheduled date and time")).toBeTruthy();
    expect(screen.getByRole("button", { name: /prep actions/i })).toBeTruthy();
    unmount();
    render(<SessionPrepEditor params={params} initialPrep={fixture()} surface="full" />);
    for (const name of ["Session title", "Objective", "Opening scene", "Scene notes", "Prep checklist"]) expect(screen.getByRole("textbox", { name })).toBeTruthy();
    expect(screen.getByLabelText("Scheduled date and time")).toBeTruthy();
    expect(screen.getByRole("button", { name: /prep actions/i })).toBeTruthy();
  });

  it("shows approved prior summary and safe fallback states", () => {
    const { rerender } = render(<SessionPrepEditor params={params} initialPrep={fixture()} surface="full" />);
    expect(screen.getByText("The party recovered the forged seal.")).toBeTruthy();
    rerender(<SessionPrepEditor params={params} initialPrep={{ ...fixture(), prior_summary: { state: "fallback", session_name: "Session 3", text: "No approved summary yet. Prior objective: Escape the vault." } }} surface="full" />);
    expect(screen.getByText(/No approved summary yet/)).toBeTruthy();
    rerender(<SessionPrepEditor params={params} initialPrep={{ ...fixture(), prior_summary: { state: "none", session_name: null, text: "No prior session." } }} surface="full" />);
    expect(screen.getByText("No prior session.")).toBeTruthy();
  });

  it("adds, removes, and reorders entity and Thread pins while retaining archived pins intentionally", () => {
    render(<SessionPrepEditor params={params} initialPrep={fixture()} surface="full" />);
    expect(screen.getByText(/Old Harbor.*archived/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /move Old Harbor up/i }));
    fireEvent.click(screen.getByRole("button", { name: /remove Mara Vale/i }));
    expect(screen.queryByText("Mara Vale")).toBeNull();
    expect(screen.getByText(/Old Harbor.*archived/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /remove Forged Succession/i }));
    expect(within(screen.getByRole("region", { name: "Thread carry-forward" })).queryByText("Forged Succession")).toBeNull();
  });

  it.each(["started", "in_progress", "ended_pending_undo", "ended", "archived"])("keeps %s Prep read-only and hides invalid actions", (status) => {
    render(<SessionPrepEditor params={params} initialPrep={fixture(status)} surface="full" />);
    expect((screen.getByRole("textbox", { name: "Objective" }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: /prep actions/i })).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/read.only/i);
  });

  it.each(["planned", "ready"])("keeps %s Prep editable with state-valid actions", (status) => {
    render(<SessionPrepEditor params={params} initialPrep={fixture(status)} surface="full" />);
    expect((screen.getByRole("textbox", { name: "Objective" }) as HTMLInputElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /prep actions/i }));
    expect(screen.getByRole("menuitem", { name: /reset prep/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /duplicate as new planned/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /archive session/i })).toBeTruthy();
  });

  it("waits for the latest successful save before Ready and calls no canon or provider action", async () => {
    vi.mocked(autosaveSessionPrepAction).mockResolvedValue(saved());
    vi.mocked(readyForStageAction).mockResolvedValue({ ok: true, stagePath: "/stage" });
    render(<SessionPrepEditor params={params} initialPrep={fixture()} surface="full" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Objective" }), { target: { value: "Latest packet objective" } });
    fireEvent.click(screen.getByRole("button", { name: "Ready for Stage" }));
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(readyForStageAction).toHaveBeenCalledTimes(1);
    expect(autosaveSessionPrepAction).toHaveBeenCalledTimes(1);
    expect(vi.mocked(autosaveSessionPrepAction).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(readyForStageAction).mock.invocationCallOrder[0]);
    expect(mutateSessionPrepAction).not.toHaveBeenCalled();
  });
});
