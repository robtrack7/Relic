import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addThreadObjectiveAction,
  archiveEntityAction,
  createEntityAction,
  createSessionAction,
  quickCaptureAction,
  quickStubAction,
  recordDicePoolAction,
  recordDiceRollAction,
  recordSessionConsentAction,
  requestSagaExportAction,
  renameSagaAction,
  deleteSagaAction,
  resolveDraftAction,
  resolveDraftSelectionAction,
  refreshDraftBaselineAction,
  retrySessionTranscriptionAction,
  saveSessionEvidenceAction,
  updateTranscriptAction,
  updateEntityAction
} from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  })
}));

function form(entries: Record<string, string>) {
  const formData = new FormData();
  Object.entries(entries).forEach(([key, value]) => {
    formData.set(key, value);
  });
  return formData;
}

function authenticatedSupabase() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-a" } },
        error: null
      })
    },
    rpc: vi.fn().mockResolvedValue({ data: { id: "entity-a" }, error: null }),
    from: vi.fn(() => {
      throw new Error("Direct table access should not be used by security-hardened actions.");
    })
  };
}

describe("security-hardened server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  });

  it("creates entities through a scoped RPC instead of direct table mutation", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await expect(createEntityAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      entityType: "character",
      scope: "saga",
      name: "Mara",
      summary: "Scout",
      narrative: "Knows the old roads.",
      gmNotes: "voice: direct"
    }))).rejects.toThrow("NEXT_REDIRECT:/app/w/workspace-a/world/world-a/saga/saga-a/entities/character/entity-a");

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("create_entity", {
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      entity_type: "character",
      entity_scope: "saga",
      payload: {
        name: "Mara",
        summary: "Scout",
        narrative: "Knows the old roads.",
        gm_notes: "voice: direct",
        canon_state: "canon",
        created_by: "gm"
      }
    });
  });

  it("renames and typed-name deletes a Saga through scoped lifecycle RPCs", async () => {
    const supabase = authenticatedSupabase();
    supabase.rpc
      .mockResolvedValueOnce({ data: { id: "saga-a", name: "Renamed Saga" }, error: null })
      .mockResolvedValueOnce({
        data: { state: "cleanup_pending", next_workspace_id: "workspace-a", next_world_id: "world-a", next_saga_id: "saga-b" },
        error: null
      });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await expect(renameSagaAction(form({
      workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a", sagaName: "Renamed Saga"
    }))).rejects.toThrow("NEXT_REDIRECT:/app/w/workspace-a/world/world-a/saga/saga-a/settings?lifecycleNotice=renamed");

    await expect(deleteSagaAction(form({
      workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a", confirmationName: "Renamed Saga"
    }))).rejects.toThrow("NEXT_REDIRECT:/app/w/workspace-a/world/world-a/saga/saga-b?lifecycleNotice=delete_pending");

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc.mock.calls[0]).toEqual(["rename_saga", {
      workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a", new_name: "Renamed Saga"
    }]);
    expect(supabase.rpc.mock.calls[1]).toEqual(["delete_saga", {
      workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a", confirmation_name: "Renamed Saga"
    }]);
  });

  it("appends a thread objective through an RPC without trusting client JSON", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await addThreadObjectiveAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      threadId: "thread-a",
      objective: "Find the reliquary",
      objectivesLog: "{not valid client json"
    }));

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("append_thread_objective", {
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      thread_id: "thread-a",
      objective_text: "Find the reliquary"
    });
  });

  it("forwards expected versions for manual entity updates", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await updateEntityAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      entityType: "character",
      entityId: "entity-a",
      expectedVersion: "2026-06-01T17:00:00.000Z",
      name: "Mara",
      summary: "Scout updated",
      narrative: "Knows the old roads.",
      gmNotes: "voice: direct"
    }));

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("update_entity", {
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      entity_type: "character",
      entity_id: "entity-a",
      payload: {
        name: "Mara",
        summary: "Scout updated",
        narrative: "Knows the old roads.",
        gm_notes: "voice: direct",
        expected_version: "2026-06-01T17:00:00.000Z"
      }
    });
  });

  it("forwards expected versions for manual archive requests", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await expect(archiveEntityAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      entityType: "character",
      entityId: "entity-a",
      expectedVersion: "2026-06-01T17:00:00.000Z"
    }))).rejects.toThrow("NEXT_REDIRECT:/app/w/workspace-a/world/world-a/saga/saga-a/entities");

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("archive_entity", {
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      entity_type: "character",
      entity_id: "entity-a",
      expected_version: "2026-06-01T17:00:00.000Z"
    });
  });

  it("records session recording consent through the Stage RPC", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await recordSessionConsentAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      sessionId: "session-a",
      granted: "true"
    }));

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("record_session_consent", {
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      session_id: "session-a",
      granted: true
    });
  });

  it("creates a named Stage note through the scoped quick-capture RPC", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await quickCaptureAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      sessionId: "session-a",
      title: "Harbor witness",
      body: "A messenger saw the exchange."
    }));

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("quick_capture", {
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      session_id: "session-a",
      title: "Harbor witness",
      body: "A messenger saw the exchange."
    });
  });

  it("routes every Stage stub type through the scoped quick-stub RPC", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    for (const entityType of ["character", "place", "artifact", "thread", "faction"]) {
      await quickStubAction(form({
        workspaceId: "workspace-a",
        worldId: "world-a",
        sagaId: "saga-a",
        sessionId: "session-a",
        entityType,
        name: `${entityType} name`,
        summary: `${entityType} summary`
      }));
    }

    for (const entityType of ["character", "place", "artifact", "thread", "faction"]) {
      expect(supabase.rpc).toHaveBeenCalledWith("quick_stub", {
        workspace_id: "workspace-a",
        world_id: "world-a",
        saga_id: "saga-a",
        session_id: "session-a",
        entity_type: entityType,
        entity_name: `${entityType} name`,
        summary: `${entityType} summary`
      });
    }
  });

  it("records the selected d20 pool mode through the Stage RPC", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = await recordDicePoolAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      sessionId: "session-a",
      pool: "[20]",
      modifier: "2",
      mode: "advantage",
      label: "Pinned save"
    }));

    expect(result).toMatchObject({ mode: "advantage", expression: "1d20 + 2 (advantage)", label: "Pinned save" });
    expect(supabase.rpc).toHaveBeenCalledWith("record_dice_roll", {
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      session_id: "session-a",
      expression: "1d20 + 2 (advantage)",
      result_total: 13,
      result_breakdown: [11],
      label: "Pinned save"
    });
  });

  it("rolls and records dice through the Stage RPC", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    await recordDiceRollAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      sessionId: "session-a",
      expression: "1d4",
      label: "lockpick"
    }));

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("record_dice_roll", {
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      session_id: "session-a",
      expression: "1d4",
      result_total: 3,
      result_breakdown: [3],
      label: "lockpick"
    });
  });

  it("requests saga exports through the export RPC", async () => {
    const supabase = authenticatedSupabase();
    supabase.rpc.mockResolvedValueOnce({
      data: { allowed: true, export_id: "export-a", state: "pending" },
      error: null
    });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await expect(requestSagaExportAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      format: "json",
      includeAudit: "true"
    }))).rejects.toThrow("NEXT_REDIRECT:/app/w/workspace-a/world/world-a/saga/saga-a/export?exportId=export-a");

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("request_saga_export", {
      p_workspace_id: "workspace-a",
      p_world_id: "world-a",
      p_saga_id: "saga-a",
      p_requested_formats: ["json"],
      p_include_audit: true
    });
  });

  it("creates sessions with optional planned dates through the session RPC", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await expect(createSessionAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      name: "Session 2",
      objective: "Find the gate",
      openingScene: "Rain on the bridge",
      sceneNotes: "Keep the pace tight.",
      plannedDate: "2026-07-02"
    }))).rejects.toThrow("NEXT_REDIRECT:/app/w/workspace-a/world/world-a/saga/saga-a/sessions/entity-a/prep");

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("create_session", {
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      session_name: "Session 2",
      objective: "Find the gate",
      opening_scene: "Rain on the bridge",
      scene_notes: "Keep the pace tight.",
      planned_date: "2026-07-02"
    });
  });

  it("updates transcript text through the scoped immutable-boundary RPC", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    const segments = [{ start: 0, end: 12, text: "Edited evidence", deleted: false }];

    await updateTranscriptAction(form({
      workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a",
      sessionId: "session-a", transcriptId: "transcript-a", segments: JSON.stringify(segments),
    }));

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("update_transcript_segments", {
      workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a",
      transcript_id: "transcript-a", segments,
    });
  });

  it("retries transcription through the scoped recovery RPC", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await retrySessionTranscriptionAction(form({
      workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a", sessionId: "session-a",
    }));

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("retry_session_transcription", {
      workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a", session_id: "session-a",
    });
  });

  it("saves manual Session evidence through the scoped idempotent RPC", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await saveSessionEvidenceAction(form({
      workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a", sessionId: "session-a",
      sourceId: "source-a", kind: "pasted_text", text: "The bridge collapsed.",
    }));

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("save_session_evidence", {
      workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a", session_id: "session-a",
      source_id: "source-a", evidence_kind: "pasted_text", evidence_text: "The bridge collapsed.",
    });
  });

  it("persists a GM edit before attempting edit-and-approve and surfaces recoverable conflicts", async () => {
    const supabase = authenticatedSupabase();
    supabase.rpc
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: { ok: false, conflict: "stale_target" }, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await expect(resolveDraftAction(form({
      workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a", draftId: "draft-a",
      resolutionAction: "edit_and_approve", requestId: "11111111-1111-1111-1111-111111111111",
      committedPayload: JSON.stringify({ summary: "GM wording" }),
    }))).rejects.toThrow("NEXT_REDIRECT:/app/w/workspace-a/world/world-a/saga/saga-a/review?reviewNotice=stale_target#draft-draft-a");

    expect(supabase.rpc.mock.calls[0]).toEqual(["save_draft_edit", {
      workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a", draft_id: "draft-a",
      committed_payload: { summary: "GM wording" },
    }]);
    expect(supabase.rpc.mock.calls[1][0]).toBe("resolve_draft");
  });

  it("approves only explicitly submitted selected draft IDs", async () => {
    const supabase = authenticatedSupabase();
    supabase.rpc.mockResolvedValue({ data: { ok: true }, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    const data = form({ workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a" });
    data.append("draftId", "draft-a");
    data.append("draftId", "draft-b");

    await resolveDraftSelectionAction(data);

    expect(supabase.rpc).toHaveBeenCalledTimes(2);
    expect(supabase.rpc.mock.calls.map((call) => call[1].draft_id)).toEqual(["draft-a", "draft-b"]);
    expect(supabase.rpc.mock.calls.every((call) => call[0] === "resolve_draft" && call[1].action === "approve")).toBe(true);
  });

  it("refreshes a stale baseline without direct canon access", async () => {
    const supabase = authenticatedSupabase();
    supabase.rpc.mockResolvedValue({ data: { ok: true }, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await refreshDraftBaselineAction(form({ workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a", draftId: "draft-a" }));

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("refresh_draft_baseline", {
      workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a", draft_id: "draft-a",
    });
  });
});
