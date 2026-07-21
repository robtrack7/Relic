"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { editableEntityTypes, isEditableEntityType, normalizeScope } from "@/lib/entities";
import { parseDicePool, rollDice, rollDicePool } from "@/lib/dice";
import { hasSupabaseEnv, supabaseConfigErrorPath } from "@/lib/env";
import { sagaPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { IdParams } from "@/lib/types";

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

function paramsFromForm(formData: FormData): IdParams {
  return {
    workspaceId: value(formData, "workspaceId"),
    worldId: value(formData, "worldId"),
    sagaId: value(formData, "sagaId")
  };
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

  if (!sagaName) {
    redirect("/app/new-saga?error=Saga%20name%20is%20required");
  }

  const { data, error } = await supabase.rpc("create_blank_saga", {
    saga_name: sagaName,
    game_system: gameSystem,
    experience_level: experienceLevel,
    improv_comfort: improvComfort,
    prep_style: prepStyle,
    world_choice: value(formData, "worldChoice"),
    existing_world_id: value(formData, "existingWorldId") || null,
    world_name: value(formData, "worldName") || null
  });

  const result = data as RpcObject | null;
  if (error || !result?.workspace_id || !result.world_id || !result.saga_id) {
    throw new Error(error?.message ?? "Could not create Saga.");
  }

  redirect(sagaPath({ workspaceId: result.workspace_id, worldId: result.world_id, sagaId: result.saga_id }));
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
    : { name: value(formData, "name"), summary: value(formData, "summary"), narrative: value(formData, "narrative"), gm_notes: value(formData, "gmNotes"), expected_version: value(formData, "expectedVersion") };

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

export async function createSessionAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const name = value(formData, "name") || "Next session";
  const { data, error } = await supabase.rpc("create_session", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_name: name,
    objective: value(formData, "objective"),
    opening_scene: value(formData, "openingScene"),
    scene_notes: value(formData, "sceneNotes"),
    planned_date: value(formData, "plannedDate") || null
  });
  const result = data as RpcObject | null;
  if (error || !result?.id) {
    throw new Error(error?.message ?? "Could not create session.");
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
  if (error) {
    throw new Error(error.message);
  }
  redirect(`${sagaPath(params)}/sessions/${sessionId}/stage`);
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

export async function updateDraftStateAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const draftId = value(formData, "draftId");
  const state = value(formData, "state");
  if (!["approved", "rejected", "merged", "superseded"].includes(state)) {
    throw new Error("Unsupported draft state.");
  }
  const { error } = await supabase.rpc("update_draft_state", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    draft_id: draftId,
    state,
    rejection_note: value(formData, "rejectionNote") || null
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/review`);
}
