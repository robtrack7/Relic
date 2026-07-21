"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { editableEntityTypes, isEditableEntityType, normalizeScope } from "@/lib/entities";
import { parseDicePool, rollDice, rollDicePool } from "@/lib/dice";
import { hasSupabaseEnv, supabaseConfigErrorPath } from "@/lib/env";
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
    world_name: value(formData, "worldName") || null,
    target_workspace_id: value(formData, "targetWorkspaceId") || null
  });

  const result = data as RpcObject | null;
  if (error || !result?.workspace_id || !result.world_id || !result.saga_id) {
    throw new Error(error?.message ?? "Could not create Saga.");
  }

  redirect(sagaPath({ workspaceId: result.workspace_id, worldId: result.world_id, sagaId: result.saga_id }));
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

async function readLibraryDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: IdParams,
  type: string,
  id: string,
) {
  const { data, error } = await supabase.rpc("get_library_record_detail", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    entity_type: type,
    entity_id: id,
  });
  if (error) throw new Error(error.message);
  return data as unknown as LibraryRecordDetail;
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
    : { name: value(formData, "name"), summary: value(formData, "summary"), narrative: value(formData, "narrative"), gm_notes: value(formData, "gmNotes"), expected_version: expectedVersion };
  const { error } = await supabase.rpc("update_entity", {
    workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId,
    entity_type: type, entity_id: id, payload,
  });
  if (error) return { ok: false as const, conflict: error.code === "40001", error: error.code === "40001" ? "This record changed elsewhere. Refresh before continuing." : error.message };
  const detail = await readLibraryDetail(supabase, params, type, id);
  revalidatePath(`${sagaPath(params)}/entities/${type}/${id}`);
  return { ok: true as const, updatedAt: detail.record.updated_at ?? expectedVersion, detail };
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
