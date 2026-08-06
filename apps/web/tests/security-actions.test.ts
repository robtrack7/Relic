import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addThreadObjectiveAction,
  archiveEntityAction,
  autosaveEntityAction,
  createLibraryLinkAction,
  createEntityAction,
  createSessionAction,
  quickCaptureAction,
  quickStubAction,
  recordDicePoolAction,
  recordDiceRollAction,
  recordSessionConsentAction,
  requestSagaExportAction,
  submitGuideQuestionAction,
  reviewLoomActionAction,
  newGuideThreadAction,
  renameSagaAction,
  deleteSagaAction,
  hardDeleteEntityAction,
  resolveDraftAction,
  resolveDraftSelectionAction,
  refreshDraftBaselineAction,
  retrySessionTranscriptionAction,
  restoreEntityAction,
  saveImportInboxAction,
  saveSessionEvidenceAction,
  setImportSourceStateAction,
  updateTranscriptAction,
  updateEntityAction,
  updateNotificationPreferencesAction,
  updateSagaRetentionSettingsAction
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
    vi.unstubAllGlobals();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  });

  it("submits Guide questions through the server-only boundary without trusting browser retrieval or model fields", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    process.env.INTERNAL_TOKEN = "local-internal-test";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ thread_id: "thread-a", turn_id: "turn-a" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitGuideQuestionAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      threadId: "thread-a",
      turnId: "turn-a",
      idempotencyKey: "idem-a",
      question: "  Who guards the gate?  ",
      sourceIds: "[\"forged-source\"]",
      providerAlias: "forged-provider",
      model: "forged-model"
    }));

    expect(result.ok).toBe(true);
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body).toEqual({
      gm_user_id: "user-a",
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      thread_id: "thread-a",
      turn_id: "turn-a",
      idempotency_key: "idem-a",
      question: "Who guards the gate?"
    });
    expect(JSON.stringify(body)).not.toMatch(/forged-source|forged-provider|forged-model/);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("routes Loom thread creation and derives reviewed-action scope on the server", async () => {
    const supabase = authenticatedSupabase();
    supabase.rpc
      .mockResolvedValueOnce({ data: "thread-b", error: null })
      .mockResolvedValueOnce({ data: { state: "dismissed" }, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const created = await newGuideThreadAction(form({
      workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a"
    }));
    const dismissed = await reviewLoomActionAction(form({
      workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a",
      actionId: "action-a", expectedIntentVersion: "4", decision: "dismissed",
      idempotencyKey: "receipt-key-a", targetId: "forged-target"
    }));

    expect(created).toEqual({ ok: true, threadId: "thread-b" });
    expect(dismissed).toMatchObject({ ok: true, state: "dismissed" });
    expect(supabase.rpc.mock.calls[0]).toEqual(["new_guide_thread", {
      p_workspace_id: "workspace-a", p_world_id: "world-a", p_saga_id: "saga-a"
    }]);
    expect(supabase.rpc.mock.calls[1]).toEqual(["review_loom_action", {
      p_action_id: "action-a",
      p_expected_intent_version: 4,
      p_decision: "dismissed",
      p_idempotency_key: "receipt-key-a"
    }]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("dispatches a confirmed Loom Prep handoff only from the server-derived receipt payload", async () => {
    const supabase = authenticatedSupabase();
    supabase.rpc
      .mockResolvedValueOnce({
        data: {
          allowed: true,
          state: "processing",
          intent_version: 2,
          receipt_id: "receipt-a",
          dispatch_kind: "prep_ai",
          request_id: "request-a",
          workspace_id: "workspace-a",
          world_id: "world-a",
          saga_id: "saga-a",
          session_id: "session-a",
          prep_version: "2026-08-04T10:00:00.000Z",
          task_name: "generate_session_prep",
          input: { regenerate_scope: "all" }
        },
        error: null
      })
      .mockResolvedValueOnce({ data: { state: "accepted", intent_version: 2, run_id: "run-a" }, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    process.env.INTERNAL_TOKEN = "local-internal-test";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ run_id: "run-a", request_id: "request-a" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await reviewLoomActionAction(form({
      actionId: "action-a", expectedIntentVersion: "1", decision: "confirmed", idempotencyKey: "confirm-a",
      workspaceId: "forged-workspace", sessionId: "forged-session", taskName: "forged-task", prepVersion: "forged-version"
    }));

    expect(result).toMatchObject({ ok: true, state: "accepted", runId: "run-a" });
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      gm_user_id: "user-a",
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      session_id: "session-a",
      request_id: "request-a",
      idempotency_key: "request-a",
      task_name: "generate_session_prep",
      prep_version: "2026-08-04T10:00:00.000Z",
      input: { regenerate_scope: "all" }
    });
    expect(supabase.rpc.mock.calls[1]).toEqual(["complete_loom_workflow_action", {
      p_action_id: "action-a",
      p_receipt_id: "receipt-a",
      p_outcome: "accepted",
      p_failure_category: null,
      p_run_id: "run-a"
    }]);
    expect(JSON.stringify(fetchMock.mock.calls[0])).not.toMatch(/forged-workspace|forged-session|forged-task|forged-version/);
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

  it("saves retention and notification controls through scoped, idempotent RPCs", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await expect(updateSagaRetentionSettingsAction(form({
      workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a",
      audioRetention: "delete_after_transcription", transcriptRetention: "retain",
      confirmRetention: "true", expectedUpdatedAt: "2026-08-05T12:00:00Z", idempotencyKey: "settings-retention-1"
    }))).rejects.toThrow(/settingsNotice=Retention%20settings%20saved%20for%20future%20cleanup/);

    await expect(updateNotificationPreferencesAction(form({
      workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a",
      notificationsPaused: "false", emailPipelineReady: "true", emailPipelineFailed: "true",
      emailPipelineStale30: "true", emailPipelineStale90: "false", idempotencyKey: "settings-notifications-1"
    }))).rejects.toThrow(/settingsNotice=Notification%20preferences%20saved/);

    expect(supabase.rpc.mock.calls[0]).toEqual(["update_saga_retention_settings", {
      p_workspace_id: "workspace-a", p_world_id: "world-a", p_saga_id: "saga-a",
      p_audio_retention: "delete_after_transcription", p_transcript_retention: "retain",
      p_confirm_destructive: true, p_expected_updated_at: "2026-08-05T12:00:00Z", p_idempotency_key: "settings-retention-1"
    }]);
    expect(supabase.rpc.mock.calls[1]).toEqual(["update_notification_preferences", {
      p_preferences: { paused: false, email: {
        pipeline_ready: true, pipeline_failed: true, pipeline_stale_30d: true, pipeline_stale_90d: false,
        quota_warn_90: false, quota_blocked: false, loom_task_ready: false, loom_task_failed: false, loom_task_stale: false
      } },
      p_workspace_id: "workspace-a", p_idempotency_key: "settings-notifications-1"
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

  it("uses scoped D2 RPCs for autosave, links, restore, and guarded hard delete", async () => {
    const supabase = authenticatedSupabase();
    supabase.rpc
      .mockResolvedValueOnce({ data: "entity-a", error: null })
      .mockResolvedValueOnce({ data: { record: { id: "entity-a", updated_at: "2026-07-21T18:01:00Z" }, relationships: [] }, error: null })
      .mockResolvedValueOnce({ data: { id: "relationship-a" }, error: null })
      .mockResolvedValueOnce({ data: { record: { id: "entity-a" }, relationships: [{ id: "relationship-a" }] }, error: null })
      .mockResolvedValueOnce({ data: "entity-a", error: null })
      .mockResolvedValueOnce({ data: { deleted: true }, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const autosave = await autosaveEntityAction(form({ workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a", entityType: "character", entityId: "entity-a", expectedVersion: "2026-07-21T18:00:00Z", name: "Mara", summary: "Scout", narrative: "Glass Bridge", gmNotes: "Private", status: "missing", tags: "Hidden Path, politics, hidden path" }));
    expect(autosave.ok).toBe(true);
    expect(supabase.rpc.mock.calls[0][0]).toBe("update_entity");
    expect(supabase.rpc.mock.calls[0][1]).toMatchObject({ payload: { status: "missing", tags: ["hidden-path", "politics"] } });
    expect(supabase.rpc.mock.calls[1][0]).toBe("get_library_record_detail");

    const linked = await createLibraryLinkAction(form({ workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a", entityType: "character", entityId: "entity-a", targetType: "place", targetId: "place-a", relationshipKind: "located-at", relationshipNotes: "Watches the bridge" }));
    expect(linked.ok).toBe(true);
    expect(supabase.rpc.mock.calls[2]).toEqual(["create_relationship", { workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a", from_entity_type: "character", from_entity_id: "entity-a", to_entity_type: "place", to_entity_id: "place-a", relationship_kind: "located-at", relationship_notes: "Watches the bridge" }]);

    await expect(restoreEntityAction(form({ workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a", entityType: "character", entityId: "entity-a", expectedVersion: "2026-07-21T18:01:00Z" }))).rejects.toThrow("NEXT_REDIRECT:/app/w/workspace-a/world/world-a/saga/saga-a/entities/character/entity-a?lifecycleNotice=restored");
    await expect(hardDeleteEntityAction(form({ workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a", entityType: "character", entityId: "entity-a", expectedVersion: "2026-07-21T18:02:00Z", destructiveConfirmed: "true", confirmationName: "Mara" }))).rejects.toThrow("NEXT_REDIRECT:/app/w/workspace-a/world/world-a/saga/saga-a/entities?lifecycleNotice=deleted");
    expect(supabase.rpc.mock.calls[5][0]).toBe("hard_delete_entity");
    expect(supabase.from).not.toHaveBeenCalled();
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

  it("saves raw imports only through the scoped idempotent RPC", async () => {
    const supabase = authenticatedSupabase();
    supabase.rpc.mockResolvedValueOnce({ data: { id: "source-a", state: "ready_for_review", duplicate: false }, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    const result = await saveImportInboxAction(form({
      workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a", sourceId: "source-a",
      ingestionMethod: "markdown_file", filename: "lore.md", mimeType: "text/markdown", byteSize: "13", contentBase64: Buffer.from("# Lore\n\nExact").toString("base64"),
    }));
    expect(result.ok).toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("save_import_inbox_source", {
      workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a", source_id: "source-a",
      ingestion_method: "markdown_file", original_filename: "lore.md", mime_type: "text/markdown", byte_size: 13, content: "# Lore\n\nExact",
    });
  });

  it("archives imports through a scope-bound state RPC", async () => {
    const supabase = authenticatedSupabase();
    supabase.rpc.mockResolvedValueOnce({ data: { id: "source-a", state: "archived" }, error: null });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    await setImportSourceStateAction(form({ workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a", sourceId: "source-a", nextState: "archived" }));
    expect(supabase.rpc).toHaveBeenCalledWith("set_import_source_state", {
      workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a", source_id: "source-a", next_state: "archived",
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
