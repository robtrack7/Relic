"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { editableEntityTypes, isEditableEntityType, normalizeScope } from "@/lib/entities";
import { parseDicePool, rollDice, rollDicePool } from "@/lib/dice";
import { getSupabaseUrl, hasSupabaseEnv, supabaseConfigErrorPath } from "@/lib/env";
import { sagaPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { IdParams, LibraryRecordDetail, ThreadDetail, ThreadTimelineEntry } from "@/lib/types";

type RpcObject = {
  id?: string;
  workspace_id?: string;
  world_id?: string;
  saga_id?: string;
};

async function requireActionUser() {
  if (!hasSupabaseEnv()) {
    redirect(supabaseConfigErrorPath());
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/auth/sign-in");
  }
  return { supabase, user: data.user };
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function rawValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function entityMetadata(formData: FormData) {
  const metadata: { status?: string; tags?: string[] } = {};
  if (formData.has("status")) metadata.status = value(formData, "status") || "active";
  if (formData.has("tags")) {
    metadata.tags = [...new Set(value(formData, "tags").split(",")
      .map((tag) => tag.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
      .filter(Boolean))].slice(0, 12);
  }
  return metadata;
}

function paramsFromForm(formData: FormData): IdParams {
  return {
    workspaceId: value(formData, "workspaceId"),
    worldId: value(formData, "worldId"),
    sagaId: value(formData, "sagaId")
  };
}

export async function submitGuideQuestionAction(formData: FormData) {
  const { user } = await requireActionUser();
  const params = paramsFromForm(formData);
  const question = rawValue(formData, "question").normalize("NFKC").trim();
  const threadId = value(formData, "threadId") || null;
  const turnId = value(formData, "turnId");
  const idempotencyKey = value(formData, "idempotencyKey");
  if (!question || question.length > 2000 || !turnId || !idempotencyKey) {
    return { ok: false, category: "invalid_question" };
  }
  const internalToken = process.env.INTERNAL_TOKEN;
  if (!internalToken) return { ok: false, category: "provider_unavailable" };
  try {
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/guide-submit`, {
      method: "POST",
      headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        gm_user_id: user.id,
        workspace_id: params.workspaceId,
        world_id: params.worldId,
        saga_id: params.sagaId,
        thread_id: threadId,
        turn_id: turnId,
        idempotency_key: idempotencyKey,
        question
      }),
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));
    revalidatePath(`${sagaPath(params)}/guide`);
    return {
      ok: response.ok,
      category: response.status === 429 ? "quota_blocked" : response.ok ? "complete" : "provider_unavailable",
      threadId: payload.thread_id as string | undefined,
      turnId: payload.turn_id as string | undefined
    };
  } catch {
    return { ok: false, category: "network_failure" };
  }
}

export async function reviewLoomActionAction(formData: FormData) {
  const { supabase, user } = await requireActionUser();
  const actionId = value(formData, "actionId");
  const expectedIntentVersion = Number(value(formData, "expectedIntentVersion"));
  const decision = value(formData, "decision");
  const idempotencyKey = value(formData, "idempotencyKey");
  if (!actionId || !Number.isInteger(expectedIntentVersion) || expectedIntentVersion < 1
    || !["confirmed", "dismissed"].includes(decision) || !idempotencyKey) {
    return { ok: false, category: "invalid_action" };
  }
  const { data, error } = await supabase.rpc("review_loom_action", {
    p_action_id: actionId,
    p_expected_intent_version: expectedIntentVersion,
    p_decision: decision,
    p_idempotency_key: idempotencyKey
  });
  if (error) {
    return {
      ok: false,
      category: ["40001", "23505", "23514"].includes(error.code) ? "action_conflict" : "action_unavailable"
    };
  }
  if (data?.allowed === false) {
    return {
      ok: false,
      category: data?.category === "quota_blocked" ? "quota_blocked" : "action_conflict",
      state: data?.state,
      intentVersion: data?.intent_version
    };
  }
  if (decision === "confirmed" && data?.dispatch_kind === "prep_ai") {
    const internalToken = process.env.INTERNAL_TOKEN;
    let outcome: "accepted" | "quota_blocked" | "failed" = "failed";
    let failureCategory = "provider_unavailable";
    let runId: string | null = null;
    if (internalToken) {
      try {
        const response = await fetch(`${getSupabaseUrl()}/functions/v1/prep-ai-submit`, {
          method: "POST",
          headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" },
          body: JSON.stringify({
            gm_user_id: user.id,
            workspace_id: data.workspace_id,
            world_id: data.world_id,
            saga_id: data.saga_id,
            session_id: data.session_id,
            request_id: data.request_id,
            idempotency_key: data.request_id,
            task_name: data.task_name,
            prep_version: data.prep_version,
            input: data.input ?? {}
          }),
          cache: "no-store"
        });
        const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
        runId = typeof payload.run_id === "string" ? payload.run_id : null;
        outcome = response.status === 429 ? "quota_blocked" : response.ok ? "accepted" : "failed";
        failureCategory = response.status === 429 ? "quota_blocked"
          : response.status === 409 ? "prep_version_conflict" : response.ok ? "" : "provider_unavailable";
      } catch {
        outcome = "failed";
      }
    }
    const finalized = await supabase.rpc("complete_loom_workflow_action", {
      p_action_id: actionId,
      p_receipt_id: data.receipt_id,
      p_outcome: outcome,
      p_failure_category: failureCategory || null,
      p_run_id: runId
    });
    revalidatePath("/app", "layout");
    if (finalized.error || outcome !== "accepted") {
      return {
        ok: false,
        category: outcome === "quota_blocked" ? "quota_blocked" : "provider_unavailable",
        state: finalized.data?.state ?? outcome,
        intentVersion: finalized.data?.intent_version ?? data.intent_version
      };
    }
    return {
      ok: true,
      state: finalized.data?.state ?? "accepted",
      intentVersion: finalized.data?.intent_version ?? data.intent_version,
      runId: finalized.data?.run_id ?? runId,
      replayed: data?.replayed === true
    };
  }
  if (decision === "confirmed" && data?.run_id && process.env.INTERNAL_TOKEN) {
    await fetch(`${getSupabaseUrl()}/functions/v1/ai-task-runner`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.INTERNAL_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ run_id: data.run_id }),
      cache: "no-store"
    }).catch(() => undefined);
  }
  revalidatePath("/app", "layout");
  return {
    ok: true,
    state: data?.state,
    intentVersion: data?.intent_version,
    runId: data?.run_id,
    replayed: data?.replayed === true
  };
}

export async function newGuideThreadAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const { data, error } = await supabase.rpc("new_guide_thread", {
    p_workspace_id: params.workspaceId,
    p_world_id: params.worldId,
    p_saga_id: params.sagaId
  });
  if (error) return { ok: false };
  revalidatePath(`${sagaPath(params)}/guide`);
  return { ok: true, threadId: data as string };
}

export async function signInAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect(supabaseConfigErrorPath());
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: value(formData, "email"),
    password: value(formData, "password")
  });
  if (error) {
    redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/app");
}

export async function signUpAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect(supabaseConfigErrorPath("/auth/sign-up"));
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: value(formData, "email"),
    password: value(formData, "password")
  });
  if (error) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/app");
}

export async function signOutAction() {
  if (!hasSupabaseEnv()) {
    redirect(supabaseConfigErrorPath());
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/sign-in");
}

export async function createBlankSagaAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const sagaName = value(formData, "sagaName");
  const gameSystem = value(formData, "gameSystem") || null;
  const experienceLevel = value(formData, "experienceLevel") || "returning";
  const improvComfort = value(formData, "improvComfort") || "mixed";
  const prepStyle = value(formData, "prepStyle") || "mixed";
  const profileMode = value(formData, "profileMode") || "use_default";
  const saveProfileAsDefault = value(formData, "saveProfileAsDefault") === "true";

  if (!sagaName) {
    redirect("/app/new-saga?error=Saga%20name%20is%20required");
  }

  const { data, error } = await supabase.rpc("create_blank_saga", {
    saga_name: sagaName,
    game_system: gameSystem,
    experience_level: experienceLevel,
    improv_comfort: improvComfort,
    prep_style: prepStyle,
    profile_mode: profileMode,
    save_profile_as_default: saveProfileAsDefault,
    world_choice: value(formData, "worldChoice"),
    existing_world_id: value(formData, "existingWorldId") || null,
    world_name: value(formData, "worldName") || null,
    target_workspace_id: value(formData, "targetWorkspaceId") || null
  });

  const result = data as RpcObject | null;
  if (error || !result?.workspace_id || !result.world_id || !result.saga_id) {
    throw new Error(error?.message ?? "Could not create Saga.");
  }

  redirect(sagaPath({ workspaceId: result.workspace_id, worldId: result.world_id, sagaId: result.saga_id }));
}

export async function createSagaWorkshopAction(formData: FormData) {
  const { supabase, user } = await requireActionUser();
  const workshopId = value(formData, "workshopId") || crypto.randomUUID();
  const idempotencyKey = value(formData, "idempotencyKey") || crypto.randomUUID();
  const workspaceId = value(formData, "targetWorkspaceId");
  const sagaName = value(formData, "sagaName");
  const input = rawValue(formData, "ideaOrNotes").normalize("NFKC").trim();
  if (!workspaceId || !sagaName || !input || input.length > 50000) {
    redirect("/app/new-saga?error=Saga%20name%20and%20an%20idea%20or%20notes%20are%20required");
  }
  const path = value(formData, "helpLevel") === "bring_your_notes" ? "bring_your_notes" : "build_with_ai";
  const worldChoice = value(formData, "worldChoice");
  const { data, error } = await supabase.rpc("create_saga_workshop", {
    p_workshop_id: workshopId,
    p_workspace_id: workspaceId,
    p_existing_world_id: worldChoice === "existing" ? value(formData, "existingWorldId") || null : null,
    p_path: path,
    p_saga_name: sagaName,
    p_world_name: value(formData, "worldName") || null,
    p_game_system: value(formData, "gameSystem") || null,
    p_idea_or_notes: input,
    p_profile_mode: value(formData, "profileMode") || "use_default",
    p_gm_profile: {
      experience_level: value(formData, "experienceLevel") || "returning",
      improv_comfort: value(formData, "improvComfort") || "mixed",
      prep_style: value(formData, "prepStyle") || "mixed"
    },
    p_save_profile_as_default: value(formData, "saveProfileAsDefault") === "true",
    p_idempotency_key: idempotencyKey
  });
  if (error) redirect(`/app/new-saga?error=${encodeURIComponent(error.message)}`);
  const result = data as { run_id?: string | null } | null;
  const internalToken = process.env.INTERNAL_TOKEN;
  if (result?.run_id && internalToken) {
    after(async () => {
      await fetch(`${getSupabaseUrl()}/functions/v1/ai-task-runner`, {
        method: "POST",
        headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" },
        body: JSON.stringify({ run_id: result.run_id }),
        cache: "no-store"
      }).catch(() => undefined);
    });
  }
  void user;
  redirect(`/app/new-saga/${workshopId}`);
}

export async function saveSagaWorkshopAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const workshopId = value(formData, "workshopId");
  const expectedVersion = Number(value(formData, "expectedVersion"));
  let draft: Record<string, unknown>;
  try { draft = JSON.parse(rawValue(formData, "draft")); } catch { return { ok: false, category: "invalid_draft" }; }
  const { data, error } = await supabase.rpc("save_saga_workshop_draft", {
    p_workshop_id: workshopId, p_expected_version: expectedVersion, p_draft: draft
  });
  if (error) return { ok: false, category: error.code === "40001" ? "stale" : "save_failed" };
  revalidatePath(`/app/new-saga/${workshopId}`);
  return { ok: true, reviewVersion: Number(data?.review_version ?? expectedVersion + 1) };
}

export async function answerSagaWorkshopAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const workshopId = value(formData, "workshopId");
  const { data, error } = await supabase.rpc("answer_saga_workshop_question", {
    p_workshop_id: workshopId,
    p_expected_conversation_version: Number(value(formData, "conversationVersion")),
    p_answer: rawValue(formData, "answer"),
    p_idempotency_key: value(formData, "idempotencyKey")
  });
  if (error) return { ok: false, category: error.code === "40001" ? "stale" : "answer_failed", message: error.message };
  revalidatePath(`/app/new-saga/${workshopId}`);
  return { ok: true, conversationVersion: Number(data?.conversation_version), replayed: Boolean(data?.replayed) };
}

export async function draftSagaWorkshopAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const workshopId = value(formData, "workshopId");
  const { data, error } = await supabase.rpc("dispatch_saga_workshop_draft", {
    p_workshop_id: workshopId,
    p_expected_conversation_version: Number(value(formData, "conversationVersion")),
    p_idempotency_key: value(formData, "idempotencyKey")
  });
  if (error) return { ok: false, category: error.code === "40001" ? "stale" : "draft_failed", message: error.message };
  const result = data as { run_id?: string | null; allowed?: boolean; message?: string } | null;
  if (result?.run_id && process.env.INTERNAL_TOKEN) {
    after(async () => {
      await fetch(`${getSupabaseUrl()}/functions/v1/ai-task-runner`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.INTERNAL_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ run_id: result.run_id }),
        cache: "no-store"
      }).catch(() => undefined);
    });
  }
  revalidatePath(`/app/new-saga/${workshopId}`);
  return { ok: Boolean(result?.allowed), queued: Boolean(result?.run_id), message: result?.message ?? null };
}

export async function requestSagaWorkshopRegenerationAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const workshopId = value(formData, "workshopId");
  const targetTempId = value(formData, "targetTempId") || null;
  const { data, error } = await supabase.rpc("request_saga_workshop_regeneration", {
    p_workshop_id: workshopId,
    p_expected_version: Number(value(formData, "expectedVersion")),
    p_section_kind: value(formData, "sectionKind"),
    p_target_temp_id: targetTempId,
    p_idempotency_key: value(formData, "idempotencyKey")
  });
  if (error) return { ok: false, category: error.code === "40001" ? "stale" : "request_failed", message: error.message };
  const result = data as { request_id?: string; run_id?: string | null; allowed?: boolean; message?: string } | null;
  if (result?.run_id && process.env.INTERNAL_TOKEN) {
    after(async () => {
      await fetch(`${getSupabaseUrl()}/functions/v1/ai-task-runner`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.INTERNAL_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ run_id: result.run_id }),
        cache: "no-store"
      }).catch(() => undefined);
    });
  }
  revalidatePath(`/app/new-saga/${workshopId}`);
  return { ok: Boolean(result?.allowed), requestId: result?.request_id, queued: Boolean(result?.run_id), message: result?.message ?? null };
}

export async function reviewSagaWorkshopRegenerationAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const workshopId = value(formData, "workshopId");
  const { data, error } = await supabase.rpc("review_saga_workshop_regeneration", {
    p_workshop_id: workshopId,
    p_request_id: value(formData, "requestId"),
    p_expected_version: Number(value(formData, "expectedVersion")),
    p_action: value(formData, "reviewAction"),
    p_review_key: value(formData, "reviewKey")
  });
  if (error) return { ok: false, category: error.code === "40001" ? "stale" : "review_failed", message: error.message };
  revalidatePath(`/app/new-saga/${workshopId}`);
  return { ok: true, reviewVersion: Number(data?.review_version), action: String(data?.action ?? "") };
}

export async function abandonSagaWorkshopAction(workshopId: string) {
  const { supabase } = await requireActionUser();
  const { error } = await supabase.rpc("abandon_saga_workshop", { p_workshop_id: workshopId });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/app/new-saga");
  return { ok: true };
}

export async function commitSagaWorkshopAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const workshopId = value(formData, "workshopId");
  const { data, error } = await supabase.rpc("commit_saga_workshop", {
    p_workshop_id: workshopId,
    p_expected_version: Number(value(formData, "expectedVersion")),
    p_commit_key: value(formData, "commitKey")
  });
  const result = data as RpcObject & { session_id?: string } | null;
  if (error || !result?.workspace_id || !result.world_id || !result.saga_id) {
    redirect(`/app/new-saga/${workshopId}?error=${encodeURIComponent(error?.message ?? "Commit failed")}`);
  }
  redirect(`/app/new-saga/${workshopId}?committed=1`);
}

export async function renameSagaAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const newName = value(formData, "sagaName");
  const { error } = await supabase.rpc("rename_saga", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    new_name: newName
  });
  if (error) {
    redirect(`${sagaPath(params)}/settings?lifecycleError=${encodeURIComponent(error.message)}`);
  }
  redirect(`${sagaPath(params)}/settings?lifecycleNotice=renamed`);
}

function settingsRedirect(params: ReturnType<typeof paramsFromForm>, notice?: string, error?: string) {
  const query = notice ? `settingsNotice=${encodeURIComponent(notice)}` : `settingsError=${encodeURIComponent(error ?? "Settings could not be saved.")}`;
  redirect(`${sagaPath(params)}/settings?${query}`);
}

export async function updateGmProfileSettingsAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const { error } = await supabase.rpc("update_gm_profile_settings", {
    p_workspace_id: params.workspaceId,
    p_profile: {
      experience_level: value(formData, "experienceLevel"),
      improv_comfort: value(formData, "improvComfort"),
      prep_style: value(formData, "prepStyle")
    },
    p_default_game_system: value(formData, "defaultGameSystem") || null,
    p_expected_updated_at: value(formData, "expectedUpdatedAt") || null,
    p_idempotency_key: value(formData, "idempotencyKey")
  });
  if (error) settingsRedirect(params, undefined, error.message);
  settingsRedirect(params, "GM profile saved.");
}

export async function updateSagaOperationalSettingsAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const useOverride = value(formData, "profileMode") === "override";
  const { error } = await supabase.rpc("update_saga_operational_settings", {
    p_workspace_id: params.workspaceId,
    p_world_id: params.worldId,
    p_saga_id: params.sagaId,
    p_game_system: value(formData, "gameSystem") || null,
    p_profile_override: useOverride ? {
      experience_level: value(formData, "experienceLevel"),
      improv_comfort: value(formData, "improvComfort"),
      prep_style: value(formData, "prepStyle")
    } : null,
    p_expected_updated_at: value(formData, "expectedUpdatedAt") || null,
    p_idempotency_key: value(formData, "idempotencyKey")
  });
  if (error) settingsRedirect(params, undefined, error.message);
  settingsRedirect(params, "Saga settings saved.");
}

export async function updateSagaRetentionSettingsAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const { error } = await supabase.rpc("update_saga_retention_settings", {
    p_workspace_id: params.workspaceId,
    p_world_id: params.worldId,
    p_saga_id: params.sagaId,
    p_audio_retention: value(formData, "audioRetention"),
    p_transcript_retention: value(formData, "transcriptRetention"),
    p_confirm_destructive: formData.get("confirmRetention") === "true",
    p_expected_updated_at: value(formData, "expectedUpdatedAt") || null,
    p_idempotency_key: value(formData, "idempotencyKey")
  });
  if (error) settingsRedirect(params, undefined, error.message);
  settingsRedirect(params, "Retention settings saved for future cleanup.");
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const checked = (name: string) => formData.get(name) === "true";
  const { error } = await supabase.rpc("update_notification_preferences", {
    p_preferences: {
      paused: checked("notificationsPaused"),
      email: {
        pipeline_ready: checked("emailPipelineReady"),
        pipeline_failed: checked("emailPipelineFailed"),
        pipeline_stale_30d: checked("emailPipelineStale30"),
        pipeline_stale_90d: checked("emailPipelineStale90"),
        quota_warn_90: checked("emailQuotaWarn90"),
        quota_blocked: checked("emailQuotaBlocked"),
        loom_task_ready: checked("emailLoomReady"),
        loom_task_failed: checked("emailLoomFailed"),
        loom_task_stale: checked("emailLoomStale")
      }
    },
    p_workspace_id: params.workspaceId,
    p_idempotency_key: value(formData, "idempotencyKey")
  });
  if (error) settingsRedirect(params, undefined, error.message);
  settingsRedirect(params, "Notification preferences saved.");
}

export async function deleteSagaAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const { data, error } = await supabase.rpc("delete_saga", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    confirmation_name: value(formData, "confirmationName")
  });
  if (error) {
    redirect(`${sagaPath(params)}/settings?lifecycleError=${encodeURIComponent(error.message)}`);
  }

  const result = data as {
    next_workspace_id?: string | null;
    next_world_id?: string | null;
    next_saga_id?: string | null;
  } | null;
  if (result?.next_workspace_id && result.next_world_id && result.next_saga_id) {
    redirect(`${sagaPath({ workspaceId: result.next_workspace_id, worldId: result.next_world_id, sagaId: result.next_saga_id })}?lifecycleNotice=delete_pending`);
  }
  redirect(`/app/new-saga?workspaceId=${encodeURIComponent(params.workspaceId)}&lifecycleNotice=delete_pending`);
}

export async function createEntityAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const type = value(formData, "entityType");
  if (!isEditableEntityType(type)) {
    throw new Error("Unsupported entity type.");
  }

  const scope = normalizeScope(formData.get("scope"));
  const base = {
    canon_state: "canon",
    created_by: "gm"
  };

  const payload = type === "note"
    ? { ...base, note_type: value(formData, "noteType") || "lore", title: value(formData, "name"), body: value(formData, "narrative") }
    : { ...base, name: value(formData, "name"), summary: value(formData, "summary"), narrative: value(formData, "narrative"), gm_notes: value(formData, "gmNotes") };

  const { data, error } = await supabase.rpc("create_entity", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    entity_type: type,
    entity_scope: scope,
    payload
  });
  const result = data as RpcObject | null;
  if (error || !result?.id) {
    throw new Error(error?.message ?? "Could not create entity.");
  }

  revalidatePath(sagaPath(params));
  redirect(`${sagaPath(params)}/entities/${type}/${result.id}`);
}

export async function updateEntityAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const type = value(formData, "entityType");
  const id = value(formData, "entityId");
  if (!isEditableEntityType(type)) {
    throw new Error("Unsupported entity type.");
  }

  const payload = type === "note"
    ? { title: value(formData, "name"), body: value(formData, "narrative"), expected_version: value(formData, "expectedVersion") }
    : { name: value(formData, "name"), summary: value(formData, "summary"), narrative: value(formData, "narrative"), gm_notes: value(formData, "gmNotes"), ...entityMetadata(formData), expected_version: value(formData, "expectedVersion") };

  if (!payload.expected_version) {
    throw new Error("Missing expected version for this manual edit.");
  }

  const { error } = await supabase.rpc("update_entity", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    entity_type: type,
    entity_id: id,
    payload
  });
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`${sagaPath(params)}/entities/${type}/${id}`);
}

async function readLibraryDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: IdParams,
  type: string,
  id: string,
) {
  const [{ data, error }, { data: media, error: mediaError }] = await Promise.all([
    supabase.rpc("get_library_record_detail", {
      workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId,
      entity_type: type, entity_id: id,
    }),
    supabase.rpc("list_media_attachments", {
      p_workspace_id: params.workspaceId, p_world_id: params.worldId, p_saga_id: params.sagaId,
      p_target_kind: type, p_target_id: id,
    }),
  ]);
  if (error) throw new Error(error.message);
  if (mediaError) throw new Error(mediaError.message);
  return { ...(data as unknown as LibraryRecordDetail), media_attachments: Array.isArray(media) ? media : [] };
}

export async function autosaveEntityAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const type = value(formData, "entityType");
  const id = value(formData, "entityId");
  const expectedVersion = value(formData, "expectedVersion");
  if (!isEditableEntityType(type)) return { ok: false as const, error: "Unsupported record type." };
  if (!expectedVersion) return { ok: false as const, error: "This record needs to be refreshed before saving." };
  const payload = type === "note"
    ? { title: value(formData, "name"), body: value(formData, "narrative"), expected_version: expectedVersion }
    : { name: value(formData, "name"), summary: value(formData, "summary"), narrative: value(formData, "narrative"), gm_notes: value(formData, "gmNotes"), ...entityMetadata(formData), expected_version: expectedVersion };
  const { error } = await supabase.rpc("update_entity", {
    workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId,
    entity_type: type, entity_id: id, payload,
  });
  if (error) return { ok: false as const, conflict: error.code === "40001", error: error.code === "40001" ? "This record changed elsewhere. Refresh before continuing." : error.message };
  const detail = await readLibraryDetail(supabase, params, type, id);
  revalidatePath(`${sagaPath(params)}/entities/${type}/${id}`);
  return { ok: true as const, updatedAt: detail.record.updated_at ?? expectedVersion, detail };
}

export async function prepareMediaAttachmentAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const attachmentId = value(formData, "attachmentId");
  const targetKind = value(formData, "entityType");
  const targetId = value(formData, "entityId");
  const mimeType = value(formData, "mimeType");
  const byteSize = Number(value(formData, "byteSize"));
  if (!isEditableEntityType(targetKind) || !Number.isSafeInteger(byteSize) || byteSize < 16 || byteSize > 5_242_880
    || !["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    return { ok: false as const, error: "Choose a JPEG, PNG, or WebP image up to 5 MiB." };
  }
  const { data, error } = await supabase.rpc("begin_media_attachment", {
    p_workspace_id: params.workspaceId, p_world_id: params.worldId, p_saga_id: params.sagaId,
    p_attachment_id: attachmentId, p_target_kind: targetKind, p_target_id: targetId,
    p_original_filename: rawValue(formData, "filename"), p_declared_mime: mimeType, p_declared_byte_size: byteSize,
    p_title: value(formData, "title") || null, p_alt_text: value(formData, "altText"), p_description: value(formData, "description") || null,
  });
  if (error) return { ok: false as const, error: error.message };
  const claim = data as { id?: string; state?: string; bucket?: string; storage_path?: string; replayed?: boolean } | null;
  const expectedPrefix = `${params.workspaceId}/${params.worldId}/${params.sagaId}/images/${attachmentId}/original.`;
  if (!claim?.id || claim.bucket !== "attachments" || typeof claim.storage_path !== "string" || !claim.storage_path.startsWith(expectedPrefix)) {
    return { ok: false as const, error: "The private image upload target is invalid." };
  }
  return { ok: true as const, attachment: { id: claim.id, state: claim.state ?? "uploading", bucket: "attachments" as const, storage_path: claim.storage_path, replayed: Boolean(claim.replayed) } };
}

async function runMediaAttachmentOperation(formData: FormData, operation: "validate" | "view" | "delete") {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const { data, error } = await supabase.functions.invoke("media-attachment", {
    body: {
      workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId,
      attachment_id: value(formData, "attachmentId"), attempt_id: value(formData, "attemptId") || crypto.randomUUID(), operation,
    },
  });
  if (error) {
    let message = `The private image could not be ${operation === "view" ? "opened" : operation === "delete" ? "deleted" : "validated"}.`;
    const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (context?.json) {
      const body = await context.json().catch(() => null) as { error?: { message?: string } } | null;
      if (body?.error?.message) message = body.error.message;
    }
    return { ok: false as const, error: message };
  }
  revalidatePath(`${sagaPath(params)}/entities`);
  return { ok: true as const, result: data as { id: string; state?: string; deleted?: boolean; signed_url?: string; expires_in?: number; duplicate?: boolean } };
}

export async function validateMediaAttachmentAction(formData: FormData) {
  return runMediaAttachmentOperation(formData, "validate");
}

export async function viewMediaAttachmentAction(formData: FormData) {
  return runMediaAttachmentOperation(formData, "view");
}

export async function deleteMediaAttachmentAction(formData: FormData) {
  return runMediaAttachmentOperation(formData, "delete");
}

export async function updateMediaAttachmentMetadataAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const { data, error } = await supabase.rpc("update_media_attachment_metadata", {
    p_workspace_id: params.workspaceId, p_world_id: params.worldId, p_saga_id: params.sagaId,
    p_attachment_id: value(formData, "attachmentId"), p_title: value(formData, "title") || null,
    p_alt_text: value(formData, "altText"), p_description: value(formData, "description") || null,
    p_expected_version: value(formData, "expectedVersion"),
  });
  if (error) return { ok: false as const, conflict: error.code === "40001", error: error.code === "40001" ? "This attachment changed elsewhere. Refresh before continuing." : error.message };
  revalidatePath(`${sagaPath(params)}/entities`);
  return { ok: true as const, attachment: data };
}

export async function draftMediaAttachmentWithLoomAction(formData: FormData) {
  const { user } = await requireActionUser();
  const params = paramsFromForm(formData);
  const question = rawValue(formData, "question").normalize("NFKC").trim();
  const attachmentId = value(formData, "attachmentId");
  if (!attachmentId || !question || question.length > 2000) return { ok: false as const, error: "Describe what the Loom should propose from this authored image description." };
  const internalToken = process.env.INTERNAL_TOKEN;
  if (!internalToken) return { ok: false as const, error: "The Loom is temporarily unavailable." };
  try {
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/guide-submit`, {
      method: "POST", headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" }, cache: "no-store",
      body: JSON.stringify({
        gm_user_id: user.id, workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId,
        thread_id: null, turn_id: value(formData, "turnId") || crypto.randomUUID(), idempotency_key: value(formData, "idempotencyKey") || crypto.randomUUID(),
        question, selected_media_attachment_ids: [attachmentId],
      }),
    });
    const payload = await response.json().catch(() => ({})) as { thread_id?: string; error?: { message?: string } };
    if (!response.ok || !payload.thread_id) return { ok: false as const, error: payload.error?.message ?? "The Loom could not use this description safely." };
    revalidatePath(`${sagaPath(params)}/guide`);
    return { ok: true as const, href: `${sagaPath(params)}/guide?thread=${payload.thread_id}` };
  } catch {
    return { ok: false as const, error: "The Loom request could not be reached. The attachment remains private and unchanged." };
  }
}

export async function archiveEntityAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const type = value(formData, "entityType");
  const id = value(formData, "entityId");
  const expectedVersion = value(formData, "expectedVersion");
  if (!isEditableEntityType(type)) {
    throw new Error("Unsupported entity type.");
  }
  if (!expectedVersion) {
    throw new Error("Missing expected version for this archive request.");
  }
  const { error } = await supabase.rpc("archive_entity", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    entity_type: type,
    entity_id: id,
    expected_version: expectedVersion
  });
  if (error) {
    throw new Error(error.message);
  }
  redirect(`${sagaPath(params)}/entities`);
}

export async function restoreEntityAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const type = value(formData, "entityType");
  const id = value(formData, "entityId");
  if (!isEditableEntityType(type)) throw new Error("Unsupported record type.");
  const { error } = await supabase.rpc("restore_entity", {
    workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId,
    entity_type: type, entity_id: id, expected_version: value(formData, "expectedVersion"),
  });
  if (error) throw new Error(error.message);
  redirect(`${sagaPath(params)}/entities/${type}/${id}?lifecycleNotice=restored`);
}

export async function hardDeleteEntityAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const type = value(formData, "entityType");
  const id = value(formData, "entityId");
  if (!isEditableEntityType(type)) throw new Error("Unsupported record type.");
  if (value(formData, "destructiveConfirmed") !== "true") throw new Error("Permanent deletion requires both confirmations.");
  const { error } = await supabase.rpc("hard_delete_entity", {
    workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId,
    entity_type: type, entity_id: id, expected_version: value(formData, "expectedVersion"),
    confirmation_name: value(formData, "confirmationName"),
  });
  if (error) throw new Error(error.message);
  redirect(`${sagaPath(params)}/entities?lifecycleNotice=deleted`);
}

export async function createLibraryLinkAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sourceType = value(formData, "entityType");
  const sourceId = value(formData, "entityId");
  const targetType = value(formData, "targetType");
  const targetId = value(formData, "targetId");
  if (!isEditableEntityType(sourceType) || !isEditableEntityType(targetType) || sourceId === targetId) return { ok: false as const, error: "Choose a different Library record." };
  const rpc = sourceType === "note" || targetType === "note" ? "create_note_attachment" : "create_relationship";
  const args = rpc === "create_note_attachment"
    ? { workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, note_id: sourceType === "note" ? sourceId : targetId, target_entity_type: sourceType === "note" ? targetType : sourceType, target_entity_id: sourceType === "note" ? targetId : sourceId }
    : { workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, from_entity_type: sourceType, from_entity_id: sourceId, to_entity_type: targetType, to_entity_id: targetId, relationship_kind: value(formData, "relationshipKind") || "related-to", relationship_notes: value(formData, "relationshipNotes") || null };
  const { error } = await supabase.rpc(rpc, args);
  if (error) return { ok: false as const, error: error.message };
  const detail = await readLibraryDetail(supabase, params, sourceType, sourceId);
  revalidatePath(`${sagaPath(params)}/entities/${sourceType}/${sourceId}`);
  return { ok: true as const, detail };
}

export async function removeLibraryLinkAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const type = value(formData, "entityType");
  const id = value(formData, "entityId");
  if (!isEditableEntityType(type)) return { ok: false as const, error: "Unsupported record type." };
  const rpc = value(formData, "linkType") === "note_attachment" ? "delete_note_attachment" : "delete_relationship";
  const args = rpc === "delete_note_attachment"
    ? { workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, attachment_id: value(formData, "linkId") }
    : { workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, relationship_id: value(formData, "linkId") };
  const { error } = await supabase.rpc(rpc, args);
  if (error) return { ok: false as const, error: error.message };
  const detail = await readLibraryDetail(supabase, params, type, id);
  revalidatePath(`${sagaPath(params)}/entities/${type}/${id}`);
  return { ok: true as const, detail };
}

export async function resolveMentionAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const type = value(formData, "entityType");
  const id = value(formData, "entityId");
  const resolution = value(formData, "resolution");
  if (!isEditableEntityType(type) || !["accepted", "dismissed"].includes(resolution)) return { ok: false as const, error: "Unsupported mention decision." };
  const { error } = await supabase.rpc("resolve_mention", {
    workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId,
    mention_id: value(formData, "mentionId"), resolution,
  });
  if (error) return { ok: false as const, error: error.message };
  const detail = await readLibraryDetail(supabase, params, type, id);
  revalidatePath(`${sagaPath(params)}/entities/${type}/${id}`);
  return { ok: true as const, detail };
}

export async function addThreadObjectiveAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const threadId = value(formData, "threadId");
  const objective = value(formData, "objective");
  const { error } = await supabase.rpc("append_thread_objective", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    thread_id: threadId,
    objective_text: objective
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/threads/${threadId}`);
}

async function readThreadState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: IdParams,
  threadId: string,
) {
  const args = { workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, thread_id: threadId };
  const [detailResult, timelineResult] = await Promise.all([
    supabase.rpc("get_thread_detail", args), supabase.rpc("get_thread_timeline", args),
  ]);
  if (detailResult.error) throw new Error(detailResult.error.message);
  if (timelineResult.error) throw new Error(timelineResult.error.message);
  return { detail: detailResult.data as unknown as ThreadDetail, timeline: (timelineResult.data ?? []) as unknown as ThreadTimelineEntry[] };
}

export async function updateThreadDetailsAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const threadId = value(formData, "threadId");
  const { error } = await supabase.rpc("update_thread_details", {
    workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, thread_id: threadId,
    expected_version: value(formData, "expectedVersion"), thread_title: value(formData, "threadTitle"),
    thread_summary: value(formData, "threadSummary"), thread_state: value(formData, "threadState"),
    resolution_details: value(formData, "resolutionDetails"), session_id: value(formData, "sessionId") || null,
  });
  if (error) return { ok: false as const, conflict: error.code === "40001", error: error.code === "40001" ? "This Thread changed elsewhere. Refresh before continuing." : error.message };
  const state = await readThreadState(supabase, params, threadId);
  revalidatePath(`${sagaPath(params)}/threads/${threadId}`); revalidatePath(`${sagaPath(params)}/threads`);
  return { ok: true as const, ...state };
}

export async function mutateThreadObjectiveAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const threadId = value(formData, "threadId");
  const { error } = await supabase.rpc("mutate_thread_objective", {
    workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, thread_id: threadId,
    expected_version: value(formData, "expectedVersion"), operation: value(formData, "operation"),
    objective_id: value(formData, "objectiveId") || null, objective_text: value(formData, "objectiveText") || null,
    target_index: value(formData, "targetIndex") ? Number(value(formData, "targetIndex")) : null,
    session_id: value(formData, "sessionId") || null,
  });
  if (error) return { ok: false as const, conflict: error.code === "40001", error: error.code === "40001" ? "This Thread changed elsewhere. Refresh before continuing." : error.message };
  const state = await readThreadState(supabase, params, threadId);
  revalidatePath(`${sagaPath(params)}/threads/${threadId}`); revalidatePath(`${sagaPath(params)}/threads`);
  return { ok: true as const, ...state };
}

export async function createSessionAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const name = value(formData, "name") || "Next session";
  const plannedStartAt = value(formData, "plannedStartAt");
  const plannedDate = value(formData, "plannedDate") || (plannedStartAt ? plannedStartAt.slice(0, 10) : null);
  const { data, error } = await supabase.rpc("create_session", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_name: name,
    objective: value(formData, "objective"),
    opening_scene: value(formData, "openingScene"),
    scene_notes: value(formData, "sceneNotes"),
    planned_date: plannedDate
  });
  const result = data as RpcObject | null;
  if (error || !result?.id) {
    throw new Error(error?.message ?? "Could not create session.");
  }
  if (plannedStartAt) {
    const { data: prep } = await supabase.rpc("get_session_prep", { workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, session_id: result.id });
    const session = (prep as { session?: { updated_at?: string } } | null)?.session;
    if (session?.updated_at) {
      const { error: scheduleError } = await supabase.rpc("autosave_session_prep", { workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, session_id: result.id, expected_version: session.updated_at, session_name: name, planned_start_at: new Date(plannedStartAt).toISOString(), objective: value(formData, "objective"), opening_scene: value(formData, "openingScene"), scene_notes: value(formData, "sceneNotes"), prep_checklist: [], pinned_entities: [], active_threads: [] });
      if (scheduleError) throw new Error(scheduleError.message);
    }
  }
  redirect(`${sagaPath(params)}/sessions/${result.id}/prep`);
}

export async function updateSessionPrepAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const checklist = value(formData, "prepChecklist")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((text) => ({ text, done: false }));

  const pinned = formData.getAll("pinnedEntity").map(String);
  const threads = formData.getAll("activeThread").map(String);

  const { error } = await supabase.rpc("update_session_prep", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId,
    session_name: value(formData, "name"),
    objective: value(formData, "objective"),
    opening_scene: value(formData, "openingScene"),
    scene_notes: value(formData, "sceneNotes"),
    prep_checklist: checklist,
    pinned_entities: pinned,
    active_threads: threads
  });
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/prep`);
}

async function readSessionPrepState(supabase: Awaited<ReturnType<typeof createClient>>, params: IdParams, sessionId: string) {
  const [{ data, error }, optionLists] = await Promise.all([
    supabase.rpc("get_session_prep", { workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, session_id: sessionId }),
    Promise.all(["character", "place", "faction", "artifact", "note", "thread"].map((entityType) => supabase.rpc("list_entities", { workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, entity_type: entityType, include_archived: true })))
  ]);
  if (error) throw new Error(error.message);
  const prep = data as Record<string, unknown> & { session: { updated_at?: string } };
  const optionPins = optionLists.flatMap((result, typeIndex) => {
    if (result.error) return [];
    const entityType = ["character", "place", "faction", "artifact", "note", "thread"][typeIndex];
    return ((result.data ?? []) as Array<Record<string, unknown>>).map((row, order_index) => ({ key: `${entityType}:${row.id}`, entity_type: entityType, entity_id: String(row.id), name: String(row.name ?? row.title ?? "Untitled"), state: row.canon_state === "archived" ? "archived" : "available", order_index }));
  });
  return { ...prep, options: { entities: optionPins.filter((pin) => pin.entity_type !== "thread"), threads: optionPins.filter((pin) => pin.entity_type === "thread") } };
}

export async function autosaveSessionPrepAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const checklist = value(formData, "prepChecklist").split(/\r?\n/).map((text) => text.trim()).filter(Boolean).map((text) => ({ text, done: false }));
  const { data, error } = await supabase.rpc("autosave_session_prep", {
    workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, session_id: sessionId,
    expected_version: value(formData, "expectedVersion"), session_name: value(formData, "name"),
    planned_start_at: value(formData, "plannedStartAt") || null, objective: value(formData, "objective"),
    opening_scene: value(formData, "openingScene"), scene_notes: value(formData, "sceneNotes"), prep_checklist: checklist,
    pinned_entities: formData.getAll("pinnedEntity").map(String), active_threads: formData.getAll("activeThread").map(String),
  });
  if (error) return { ok: false as const, conflict: error.code === "40001", error: error.code === "40001" ? "Prep changed elsewhere. Your local draft is safe; refresh to compare before retrying." : error.message };
  const result = data as { updated_at?: string } | null;
  const prep = await readSessionPrepState(supabase, params, sessionId);
  revalidatePath(sagaPath(params)); revalidatePath(`${sagaPath(params)}/sessions`); revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/prep`);
  return { ok: true as const, updatedAt: result?.updated_at ?? String(prep.session.updated_at ?? ""), prep };
}

const PREP_AI_TASKS = new Set([
  "compose_prep_briefing",
  "generate_session_prep",
  "propose_scene_beats",
  "propose_thread_complication",
  "propose_npc_for_scene",
  "propose_quick_stub_fleshing",
  "draft_entity_from_prompt"
]);

export async function startPrepAiAction(formData: FormData) {
  const { user } = await requireActionUser();
  const params = paramsFromForm(formData);
  const taskName = value(formData, "taskName");
  const sessionId = value(formData, "sessionId");
  const requestId = value(formData, "requestId");
  const prepVersion = value(formData, "prepVersion");
  const parentRequestId = value(formData, "parentRequestId") || null;
  if (!PREP_AI_TASKS.has(taskName) || !sessionId || !requestId || !prepVersion) {
    return { ok: false as const, category: "invalid_request", error: "The Prep AI request is invalid." };
  }
  let input: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawValue(formData, "input") || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    input = parsed;
  } catch {
    return { ok: false as const, category: "invalid_request", error: "The Prep AI input is invalid." };
  }
  const internalToken = process.env.INTERNAL_TOKEN;
  if (!internalToken) {
    return { ok: false as const, category: "provider_unavailable", error: "Prep AI is unavailable. Manual Prep remains fully editable." };
  }
  try {
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/prep-ai-submit`, {
      method: "POST",
      headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        gm_user_id: user.id,
        workspace_id: params.workspaceId,
        world_id: params.worldId,
        saga_id: params.sagaId,
        session_id: sessionId,
        request_id: requestId,
        idempotency_key: requestId,
        task_name: taskName,
        prep_version: prepVersion,
        parent_request_id: parentRequestId,
        input
      }),
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/prep`);
    return {
      ok: response.ok,
      category: response.status === 429 ? "quota_blocked"
        : response.status === 409 ? "prep_version_conflict"
        : response.ok ? String(payload.status ?? "complete") : "provider_unavailable",
      error: typeof payload.message === "string"
        ? payload.message
        : response.ok ? "" : "Prep AI could not finish. Manual Prep remains available."
    };
  } catch {
    return { ok: false as const, category: "provider_unavailable", error: "Prep AI could not connect. Manual Prep remains available." };
  }
}

export async function setPrepAiReviewStateAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const requestId = value(formData, "requestId");
  const reviewState = value(formData, "reviewState");
  if (!new Set(["accepted", "rejected", "dismissed"]).has(reviewState)) {
    return { ok: false as const, conflict: false, error: "Unsupported review state." };
  }
  let editedPayload: Record<string, unknown> | null = null;
  try {
    const raw = rawValue(formData, "editedPayload");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      editedPayload = parsed;
    }
  } catch {
    return { ok: false as const, conflict: false, error: "The reviewed result is invalid." };
  }
  const { data, error } = await supabase.rpc("set_prep_ai_review_state", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId,
    request_id: requestId,
    review_state: reviewState,
    edited_payload: editedPayload,
    accepted_prep_version: value(formData, "acceptedPrepVersion") || null
  });
  if (error) {
    return {
      ok: false as const,
      conflict: error.code === "40001",
      error: error.code === "40001"
        ? "Prep or proposal changed. The result remains pending for review."
        : error.message
    };
  }
  revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/prep`);
  revalidatePath(`${sagaPath(params)}/approval`);
  return { ok: true as const, result: data as Record<string, unknown> };
}

export async function mutateSessionPrepAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData); const sessionId = value(formData, "sessionId");
  const { data, error } = await supabase.rpc("mutate_session_prep", { workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, session_id: sessionId, expected_version: value(formData, "expectedVersion"), operation: value(formData, "operation"), request_key: value(formData, "requestKey") });
  if (error) return { ok: false as const, conflict: error.code === "40001", error: error.message };
  revalidatePath(sagaPath(params)); revalidatePath(`${sagaPath(params)}/sessions`);
  return { ok: true as const, result: data as Record<string, unknown> };
}

export async function readyForStageAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const { error } = await supabase.rpc("set_session_status", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId,
    status: "ready"
  });
  if (error) return { ok: false as const, error: error.message };
  const stagePath = `${sagaPath(params)}/sessions/${sessionId}/stage`;
  revalidatePath(stagePath); revalidatePath(sagaPath(params));
  return { ok: true as const, stagePath };
}

export async function setSessionStatusAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const status = value(formData, "status");
  const allowed = ["started", "in_progress", "ended_pending_undo", "ended", "ready"];
  if (!allowed.includes(status)) {
    throw new Error("Unsupported session status.");
  }
  const { error } = await supabase.rpc("set_session_status", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId,
    status
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/stage`);
}

export async function quickCaptureAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const body = value(formData, "body");
  if (!body) {
    return;
  }
  const { error } = await supabase.rpc("quick_capture", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: value(formData, "sessionId"),
    body,
    title: value(formData, "title") || null
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/sessions/${value(formData, "sessionId")}/stage`);
  revalidatePath(`${sagaPath(params)}/entities`);
}

export async function quickStubAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const name = value(formData, "name");
  const type = value(formData, "entityType");
  if (!name || !["character", "place", "faction", "artifact", "thread"].includes(type)) {
    return;
  }
  const { error } = await supabase.rpc("quick_stub", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: value(formData, "sessionId"),
    entity_type: type,
    entity_name: name,
    summary: value(formData, "summary")
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/sessions/${value(formData, "sessionId")}/stage`);
  revalidatePath(`${sagaPath(params)}/entities`);
}

export async function markMomentAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const { error } = await supabase.rpc("mark_moment", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId,
    label: value(formData, "label") || "Marked moment"
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/stage`);
}

export async function recordSessionConsentAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const { error } = await supabase.rpc("record_session_consent", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId,
    granted: value(formData, "granted") === "true"
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/stage`);
}

export async function recordDiceRollAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const roll = rollDice(value(formData, "expression") || "1d20");
  const { error } = await supabase.rpc("record_dice_roll", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId,
    expression: roll.expression,
    result_total: roll.total,
    result_breakdown: roll.rolls,
    label: value(formData, "label") || null
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/stage`);
}

export async function recordDicePoolAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const config = parseDicePool(
    value(formData, "pool"),
    value(formData, "modifier"),
    value(formData, "mode"),
  );
  const roll = rollDicePool(config.pool, config.modifier, config.mode);
  const label = value(formData, "label") || null;
  const { error } = await supabase.rpc("record_dice_roll", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId,
    expression: roll.expression,
    result_total: roll.total,
    result_breakdown: roll.rolls,
    label,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/stage`);
  return { ...roll, label, createdAt: new Date().toISOString() };
}

export async function updateTranscriptAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const transcriptId = value(formData, "transcriptId");
  let segments: unknown;
  try {
    segments = JSON.parse(value(formData, "segments"));
  } catch {
    throw new Error("Transcript changes could not be read.");
  }
  if (!Array.isArray(segments)) throw new Error("Transcript changes must be a segment list.");

  const { error } = await supabase.rpc("update_transcript_segments", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    transcript_id: transcriptId,
    segments,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/review`);
  return { ok: true };
}

export async function retrySessionTranscriptionAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const { error } = await supabase.rpc("retry_session_transcription", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/review`);
  return { ok: true };
}

export async function saveSessionEvidenceAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const sourceId = value(formData, "sourceId");
  const kind = value(formData, "kind");
  const text = value(formData, "text");
  if (kind !== "pasted_text" && kind !== "gm_manual_summary") throw new Error("Unsupported manual evidence kind.");

  const { data, error } = await supabase.rpc("save_session_evidence", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId,
    source_id: sourceId,
    evidence_kind: kind,
    evidence_text: text,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/review`);
  return { ok: true, source: data };
}

export async function saveImportInboxAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const method = value(formData, "ingestionMethod");
  const filename = rawValue(formData, "filename") || null;
  const mimeType = value(formData, "mimeType");
  const byteSize = Number(value(formData, "byteSize"));
  const encodedContent = rawValue(formData, "contentBase64");
  if (!Number.isSafeInteger(byteSize) || byteSize < 1) return { ok: false as const, error: "Import size is invalid." };
  let content: string;
  try {
    const bytes = Buffer.from(encodedContent, "base64");
    if (!encodedContent || bytes.toString("base64") !== encodedContent.replace(/\s/g, "")) throw new Error("invalid base64");
    content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    if (bytes.byteLength !== byteSize) throw new Error("size mismatch");
  } catch {
    return { ok: false as const, error: "Import encoding is invalid or changed in transit." };
  }
  const { data, error } = await supabase.rpc("save_import_inbox_source", {
    workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId,
    source_id: value(formData, "sourceId"), ingestion_method: method, original_filename: filename,
    mime_type: mimeType, byte_size: byteSize, content,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`${sagaPath(params)}/imports`);
  return { ok: true as const, source: data as { id: string; state: string; duplicate?: boolean } };
}

export async function preparePdfImportAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const byteSize = Number(value(formData, "byteSize"));
  if (!Number.isSafeInteger(byteSize) || byteSize < 8 || byteSize > 10_485_760) {
    return { ok: false as const, error: "PDF size is invalid or exceeds the 10 MB limit." };
  }
  const { data, error } = await supabase.rpc("begin_pdf_import", {
    p_workspace_id: params.workspaceId,
    p_world_id: params.worldId,
    p_saga_id: params.sagaId,
    p_source_id: value(formData, "sourceId"),
    p_original_filename: value(formData, "filename"),
    p_mime_type: value(formData, "mimeType"),
    p_byte_size: byteSize,
  });
  if (error) return { ok: false as const, error: error.message };
  const source = data as { id?: string; state?: string; bucket?: string; storage_path?: string; replayed?: boolean } | null;
  const expectedPrefix = `${params.workspaceId}/${params.worldId}/${params.sagaId}/imports/${value(formData, "sourceId")}/`;
  if (!source?.id || source.bucket !== "attachments" || typeof source.storage_path !== "string"
    || !source.storage_path.startsWith(expectedPrefix) || !source.storage_path.endsWith("/original.pdf")) {
    return { ok: false as const, error: "The private PDF upload target is invalid." };
  }
  return { ok: true as const, source: {
    id: source.id,
    state: source.state ?? "uploading",
    bucket: source.bucket,
    storage_path: source.storage_path,
    replayed: Boolean(source.replayed),
  } };
}

export async function extractPdfImportAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const attemptId = value(formData, "attemptId") || crypto.randomUUID();
  const { data, error } = await supabase.functions.invoke("extract-import-pdf", {
    body: {
      workspace_id: params.workspaceId,
      world_id: params.worldId,
      saga_id: params.sagaId,
      source_id: value(formData, "sourceId"),
      attempt_id: attemptId,
    },
  });
  if (error) {
    let message = "PDF extraction failed. Retry or replace the file.";
    const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (context?.json) {
      const body = await context.json().catch(() => null) as { error?: { message?: string } } | null;
      if (body?.error?.message) message = body.error.message;
    }
    return { ok: false as const, error: message };
  }
  revalidatePath(`${sagaPath(params)}/imports`);
  return { ok: true as const, source: data as { id: string; state: string; duplicate?: boolean; failure_code?: string } };
}

export async function draftImportsWithLoomAction(formData: FormData) {
  const { user } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sourceIds = [...new Set(formData.getAll("sourceId").map(String).map((id) => id.trim()).filter(Boolean))].sort();
  const question = rawValue(formData, "question").normalize("NFKC").trim();
  if (sourceIds.length < 1 || sourceIds.length > 8 || !question || question.length > 2000) {
    return { ok: false as const, error: "Choose 1 to 8 ready sources and tell the Loom what you want to build." };
  }
  const internalToken = process.env.INTERNAL_TOKEN;
  if (!internalToken) return { ok: false as const, error: "The Loom is temporarily unavailable." };
  const turnId = value(formData, "turnId") || crypto.randomUUID();
  const idempotencyKey = value(formData, "idempotencyKey") || crypto.randomUUID();
  try {
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/guide-submit`, {
      method: "POST",
      headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        gm_user_id: user.id,
        workspace_id: params.workspaceId,
        world_id: params.worldId,
        saga_id: params.sagaId,
        thread_id: null,
        turn_id: turnId,
        idempotency_key: idempotencyKey,
        question,
        selected_import_source_ids: sourceIds,
      }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as { thread_id?: string; error?: { message?: string } };
    if (!response.ok || !payload.thread_id) {
      return { ok: false as const, error: payload.error?.message ?? "The Loom could not enroll these sources safely." };
    }
    revalidatePath(`${sagaPath(params)}/guide`);
    return { ok: true as const, href: `${sagaPath(params)}/guide?thread=${payload.thread_id}` };
  } catch {
    return { ok: false as const, error: "The Loom request could not be reached. Your sources remain ready for review." };
  }
}

export async function setImportSourceStateAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const { data, error } = await supabase.rpc("set_import_source_state", {
    workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId,
    source_id: value(formData, "sourceId"), next_state: value(formData, "nextState"),
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`${sagaPath(params)}/imports`);
  return { ok: true as const, source: data };
}

export async function requestSagaExportAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const formats = formData.getAll("format").map(String).filter(Boolean);
  const requestedFormats = formats.length ? formats : ["json", "markdown"];
  const { data, error } = await supabase.rpc("request_saga_export", {
    p_workspace_id: params.workspaceId,
    p_world_id: params.worldId,
    p_saga_id: params.sagaId,
    p_requested_formats: requestedFormats,
    p_include_audit: value(formData, "includeAudit") === "true"
  });
  if (error) {
    throw new Error(error.message);
  }

  const result = data as { allowed?: boolean; export_id?: string; message?: string } | null;
  if (!result?.allowed) {
    const message = encodeURIComponent(result?.message ?? "Export is not available right now.");
    redirect(`${sagaPath(params)}/export?error=${message}`);
  }
  redirect(`${sagaPath(params)}/export?exportId=${result.export_id}`);
}

function jsonObjectValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Draft edits must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export async function resolveDraftAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const draftId = value(formData, "draftId");
  const resolutionAction = value(formData, "resolutionAction");
  if (!["approve", "edit_and_approve", "reject", "merge"].includes(resolutionAction)) {
    throw new Error("Unsupported approval action.");
  }

  if (resolutionAction === "edit_and_approve") {
    const { data: saved, error: saveError } = await supabase.rpc("save_draft_edit", {
      workspace_id: params.workspaceId,
      world_id: params.worldId,
      saga_id: params.sagaId,
      draft_id: draftId,
      committed_payload: jsonObjectValue(formData, "committedPayload"),
    });
    if (saveError) throw new Error(saveError.message);
    if (!(saved as { ok?: boolean } | null)?.ok) throw new Error("The edited proposal could not be saved.");
  }

  const { data, error } = await supabase.rpc("resolve_draft", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    draft_id: draftId,
    action: resolutionAction,
    request_id: value(formData, "requestId") || crypto.randomUUID(),
    rejection_tags: formData.getAll("rejectionTag").map(String).filter(Boolean),
    rejection_note: value(formData, "rejectionNote") || null,
    merge_target_id: value(formData, "mergeTargetId") || null,
    acknowledge_source_drift: value(formData, "acknowledgeSourceDrift") === "true",
  });
  if (error) throw new Error(error.message);
  const result = data as { ok?: boolean; conflict?: string } | null;
  revalidatePath(`${sagaPath(params)}/review`);
  if (!result?.ok) {
    redirect(`${sagaPath(params)}/review?reviewNotice=${encodeURIComponent(result?.conflict ?? "approval_failed")}#draft-${draftId}`);
  }
}

export async function resolveDraftSelectionAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const draftIds = [...new Set(formData.getAll("draftId").map(String).filter(Boolean))];
  let firstConflict = "";
  for (const draftId of draftIds) {
    const { data, error } = await supabase.rpc("resolve_draft", {
      workspace_id: params.workspaceId,
      world_id: params.worldId,
      saga_id: params.sagaId,
      draft_id: draftId,
      action: "approve",
      request_id: crypto.randomUUID(),
      rejection_tags: [],
      rejection_note: null,
      merge_target_id: null,
      acknowledge_source_drift: false,
    });
    if (error) throw new Error(error.message);
    const result = data as { ok?: boolean; conflict?: string } | null;
    if (!result?.ok && !firstConflict) firstConflict = result?.conflict ?? "approval_failed";
  }
  revalidatePath(`${sagaPath(params)}/review`);
  if (firstConflict) redirect(`${sagaPath(params)}/review?reviewNotice=${encodeURIComponent(firstConflict)}`);
}

export async function refreshDraftBaselineAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const { data, error } = await supabase.rpc("refresh_draft_baseline", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    draft_id: value(formData, "draftId"),
  });
  if (error) throw new Error(error.message);
  if (!(data as { ok?: boolean } | null)?.ok) throw new Error("The draft baseline could not be refreshed.");
  revalidatePath(`${sagaPath(params)}/review`);
}
