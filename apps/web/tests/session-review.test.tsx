import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { retrySessionTranscriptionAction, saveSessionEvidenceAction, updateTranscriptAction } from "@/app/actions";
import { SessionReviewWorkspace } from "@/components/relic-draft/SessionReviewWorkspace";
import type { SessionReviewData } from "@/lib/data";
import { readSessionEvidenceDraft, writeSessionEvidenceDraft } from "@/lib/session-evidence-draft";
import { installMemoryLocalStorage } from "./local-storage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/actions", () => ({
  retrySessionTranscriptionAction: vi.fn(async () => ({ ok: true })),
  saveSessionEvidenceAction: vi.fn(async () => ({ ok: true })),
  updateTranscriptAction: vi.fn(async () => ({ ok: true })),
}));

const params = { workspaceId: "workspace", worldId: "world", sagaId: "saga" };

function review(overrides: Partial<SessionReviewData> = {}): SessionReviewData {
  return {
    session_id: "session",
    session_status: "ended",
    audio: { expected_chunks: 2, registered_chunks: 2, finalized_at: "2026-07-20T00:00:00Z" },
    pipeline: { id: "pipeline", state: "synthesizing" },
    transcript: {
      id: "transcript",
      state: "complete",
      model: "relic-transcribe",
      language: "en",
      duration_seconds: 18,
      segments: [{ start: 0, end: 18, text: "The old gate opened.", deleted: false }],
    },
    transcription_job: { id: "job", state: "complete", attempts: 0, max_attempts: 3 },
    manual_evidence: [],
    ...overrides,
  };
}

describe("Session transcript review", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    vi.clearAllMocks();
  });

  it("shows preserved-audio recovery and explicitly requeues failed transcription", async () => {
    render(<SessionReviewWorkspace ownerId="owner" params={params} sessionId="session" review={review({
      pipeline: { id: "pipeline", state: "failed", failure_reason: "no_inputs_after_transcription_failure" },
      transcript: { id: "transcript", state: "failed", model: "pending", segments: [], failure_reason: "Provider unavailable." },
      transcription_job: { id: "job", state: "failed", attempts: 3, max_attempts: 3, failure_reason: "Provider unavailable." },
    })} />);

    expect(screen.getByText(/Audio remains preserved/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry transcription" }));
    await waitFor(() => expect(retrySessionTranscriptionAction).toHaveBeenCalledOnce());
    expect(screen.getByText("Transcription queued with a fresh retry budget.")).toBeTruthy();
  });

  it("edits segment text and soft-hides evidence without changing timestamps", async () => {
    render(<SessionReviewWorkspace ownerId="owner" params={params} sessionId="session" review={review()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Transcript segment 1" }), { target: { value: "The sealed gate opened." } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Hide segment" }));
    fireEvent.click(screen.getByRole("button", { name: "Save transcript" }));

    await waitFor(() => expect(updateTranscriptAction).toHaveBeenCalledOnce());
    const submitted = vi.mocked(updateTranscriptAction).mock.calls[0][0];
    expect(JSON.parse(String(submitted.get("segments")))).toEqual([
      { start: 0, end: 18, text: "The sealed gate opened.", deleted: true },
    ]);
    expect(screen.getByText(/Citations retain the original evidence excerpt/i)).toBeTruthy();
  });

  it("restores a local pasted-note draft and clears it only after a confirmed save", async () => {
    const scope = { ...params, sessionId: "session" };
    const local = writeSessionEvidenceDraft("owner", scope, "pasted_text", "The bridge collapsed after Mara crossed.");
    render(<SessionReviewWorkspace ownerId="owner" params={params} sessionId="session" review={review()} />);

    const input = await screen.findByRole("textbox", { name: "Pasted session notes" });
    expect((input as HTMLTextAreaElement).value).toBe(local.text);
    fireEvent.click(screen.getByRole("button", { name: "Save pasted notes" }));

    await waitFor(() => expect(saveSessionEvidenceAction).toHaveBeenCalledOnce());
    const submitted = vi.mocked(saveSessionEvidenceAction).mock.calls[0][0];
    expect(submitted.get("sourceId")).toBe(local.sourceId);
    expect(submitted.get("kind")).toBe("pasted_text");
    expect(submitted.get("text")).toBe(local.text);
    await waitFor(() => expect(readSessionEvidenceDraft("owner", scope, "pasted_text")).toBeNull());
    expect((input as HTMLTextAreaElement).value).toBe("");
  });

  it("preserves the GM summary locally when the scoped save fails", async () => {
    vi.mocked(saveSessionEvidenceAction).mockRejectedValueOnce(new Error("offline"));
    const scope = { ...params, sessionId: "session" };
    render(<SessionReviewWorkspace ownerId="owner" params={params} sessionId="session" review={review()} />);

    const input = screen.getByRole("textbox", { name: "GM manual summary" });
    fireEvent.change(input, { target: { value: "Mara chose the town over the relic." } });
    fireEvent.click(screen.getByRole("button", { name: "Save manual summary" }));

    await screen.findByText(/could not be saved/i);
    expect((input as HTMLTextAreaElement).value).toBe("Mara chose the town over the relic.");
    expect(readSessionEvidenceDraft("owner", scope, "gm_manual_summary")?.text).toBe("Mara chose the town over the relic.");
  });
});
