"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { editableEntityTypes, isEditableEntityType, normalizeScope, scopedPayload, tableForEntity } from "@/lib/entities";
import { sagaPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { EntityScope, IdParams } from "@/lib/types";

async function requireActionUser() {
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
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/sign-in");
}

export async function createBlankSagaAction(formData: FormData) {
  const { supabase, user } = await requireActionUser();
  const sagaName = value(formData, "sagaName");
  const gameSystem = value(formData, "gameSystem") || null;
  const experienceLevel = value(formData, "experienceLevel") || "returning";
  const improvComfort = value(formData, "improvComfort") || "mixed";
  const prepStyle = value(formData, "prepStyle") || "mixed";

  if (!sagaName) {
    redirect("/app/new-saga?error=Saga%20name%20is%20required");
  }

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_default_workspace");
  if (workspaceError || !workspaceId) {
    throw new Error(workspaceError?.message ?? "Could not create Workspace.");
  }

  await supabase.from("gm_profiles").upsert({
    user_id: user.id,
    experience_level: experienceLevel,
    improv_comfort: improvComfort,
    prep_style: prepStyle,
    default_game_system: gameSystem
  }, { onConflict: "user_id" });

  const worldChoice = value(formData, "worldChoice");
  let worldId = value(formData, "existingWorldId");

  if (worldChoice !== "existing" || !worldId) {
    const worldName = value(formData, "worldName") || `${sagaName} World`;
    const { data: world, error } = await supabase
      .from("worlds")
      .insert({
        workspace_id: workspaceId,
        owner_gm_id: user.id,
        name: worldName,
        default_game_system: gameSystem
      })
      .select("id")
      .single();
    if (error || !world) {
      throw new Error(error?.message ?? "Could not create World.");
    }
    worldId = world.id;
  }

  const { data: eraRows } = await supabase
    .from("world_eras")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("world_id", worldId)
    .order("sort_order")
    .limit(1);

  let eraId = eraRows?.[0]?.id ?? null;
  if (!eraId) {
    const { data: era, error } = await supabase
      .from("world_eras")
      .insert({
        workspace_id: workspaceId,
        world_id: worldId,
        name: "Default Era",
        summary: "Default timeframe for this world.",
        sort_order: 0
      })
      .select("id")
      .single();
    if (error || !era) {
      throw new Error(error?.message ?? "Could not create default timeframe.");
    }
    eraId = era.id;
  }

  const { data: saga, error: sagaError } = await supabase
    .from("sagas")
    .insert({
      workspace_id: workspaceId,
      world_id: worldId,
      owner_gm_id: user.id,
      name: sagaName,
      game_system: gameSystem,
      primary_era_id: eraId
    })
    .select("id")
    .single();

  if (sagaError || !saga) {
    throw new Error(sagaError?.message ?? "Could not create Saga.");
  }

  redirect(sagaPath({ workspaceId, worldId, sagaId: saga.id }));
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
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    ...scopedPayload(scope, params.sagaId),
    canon_state: "canon",
    created_by: "gm"
  };

  const payload = type === "note"
    ? { ...base, note_type: value(formData, "noteType") || "lore", title: value(formData, "name"), body: value(formData, "narrative") }
    : { ...base, name: value(formData, "name"), summary: value(formData, "summary"), narrative: value(formData, "narrative"), gm_notes: value(formData, "gmNotes") };

  const { data, error } = await supabase.from(tableForEntity(type)).insert(payload as never).select("id").single();
  if (error || !data) {
    throw new Error(error?.message ?? "Could not create entity.");
  }

  revalidatePath(sagaPath(params));
  redirect(`${sagaPath(params)}/entities/${type}/${data.id}`);
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
    ? { title: value(formData, "name"), body: value(formData, "narrative") }
    : { name: value(formData, "name"), summary: value(formData, "summary"), narrative: value(formData, "narrative"), gm_notes: value(formData, "gmNotes") };

  const { error } = await supabase.from(tableForEntity(type)).update(payload as never).eq("id", id);
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
  if (!isEditableEntityType(type)) {
    throw new Error("Unsupported entity type.");
  }
  const { error } = await supabase.from(tableForEntity(type)).update({ canon_state: "archived", status: "archived" } as never).eq("id", id);
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
  const rawLog = value(formData, "objectivesLog");
  const objectivesLog = rawLog ? JSON.parse(rawLog) as unknown[] : [];
  objectivesLog.push({ text: objective, state: "open", created_at: new Date().toISOString() });
  const { error } = await supabase.from("threads").update({ objectives_log: objectivesLog }).eq("id", threadId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/threads/${threadId}`);
}

export async function createSessionAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const name = value(formData, "name") || "Next session";
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      workspace_id: params.workspaceId,
      world_id: params.worldId,
      saga_id: params.sagaId,
      scope: "saga",
      name,
      objective: value(formData, "objective"),
      opening_scene: value(formData, "openingScene"),
      scene_notes: value(formData, "sceneNotes"),
      prep_checklist: []
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Could not create session.");
  }
  redirect(`${sagaPath(params)}/sessions/${data.id}/prep`);
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

  const { error } = await supabase.from("sessions").update({
    name: value(formData, "name"),
    objective: value(formData, "objective"),
    opening_scene: value(formData, "openingScene"),
    scene_notes: value(formData, "sceneNotes"),
    prep_checklist: checklist
  }).eq("id", sessionId);
  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("session_pinned_entities").delete().eq("session_id", sessionId);
  const pinned = formData.getAll("pinnedEntity").map(String);
  if (pinned.length) {
    await supabase.from("session_pinned_entities").insert(pinned.map((item, index) => {
      const [entityType, entityId] = item.split(":");
      return { workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, session_id: sessionId, entity_type: entityType, entity_id: entityId, order_index: index };
    }));
  }

  await supabase.from("session_active_threads").delete().eq("session_id", sessionId);
  const threads = formData.getAll("activeThread").map(String);
  if (threads.length) {
    await supabase.from("session_active_threads").insert(threads.map((threadId) => ({
      workspace_id: params.workspaceId,
      world_id: params.worldId,
      saga_id: params.sagaId,
      session_id: sessionId,
      thread_id: threadId
    })));
  }

  revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/prep`);
}

export async function readyForStageAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const { error } = await supabase.from("sessions").update({ status: "ready" }).eq("id", sessionId);
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
  const { error } = await supabase.from("sessions").update({ status }).eq("id", sessionId);
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
  const { error } = await supabase.from("notes").insert({
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    scope: "saga",
    note_type: "quick_capture",
    title: `Capture ${new Date().toLocaleTimeString()}`,
    body,
    canon_state: "canon",
    created_by: "gm"
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/sessions/${value(formData, "sessionId")}/stage`);
}

export async function quickStubAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const name = value(formData, "name");
  const type = value(formData, "entityType");
  if (!name || !["character", "place", "faction", "artifact", "thread"].includes(type)) {
    return;
  }
  const scope: EntityScope = "saga";
  const payload = {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    ...scopedPayload(scope, params.sagaId),
    name,
    summary: value(formData, "summary"),
    canon_state: "canon",
    created_by: "gm",
    is_stub: true
  };
  const { error } = await supabase.from(tableForEntity(type as (typeof editableEntityTypes)[number])).insert(payload as never);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/sessions/${value(formData, "sessionId")}/stage`);
}

export async function markMomentAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const sessionId = value(formData, "sessionId");
  const { error } = await supabase.from("session_marked_moments").insert({
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId,
    occurred_at: new Date().toISOString(),
    label: value(formData, "label") || "Marked moment"
  });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/sessions/${sessionId}/stage`);
}

export async function updateDraftStateAction(formData: FormData) {
  const { supabase } = await requireActionUser();
  const params = paramsFromForm(formData);
  const draftId = value(formData, "draftId");
  const state = value(formData, "state");
  if (!["approved", "rejected", "merged", "superseded"].includes(state)) {
    throw new Error("Unsupported draft state.");
  }
  const { error } = await supabase.from("drafts").update({
    state,
    rejection_note: value(formData, "rejectionNote") || null,
    resolved_at: new Date().toISOString()
  }).eq("id", draftId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(`${sagaPath(params)}/review`);
}
