import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { entityConfigs, tableForEntity } from "@/lib/entities";
import type { AppContext, EntitySummary, EntityType, IdParams, SearchResult } from "@/lib/types";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/auth/sign-in");
  }
  return { supabase, user: data.user };
}

export async function getBootstrapContext(): Promise<AppContext> {
  const { supabase } = await requireUser();
  await supabase.rpc("ensure_default_workspace");
  const { data, error } = await supabase.rpc("get_bootstrap_context");
  if (error) {
    throw new Error(error.message);
  }
  return data as AppContext;
}

export async function requireSagaContext(params: IdParams) {
  const { supabase, user } = await requireUser();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id,name,usage_limits")
    .eq("id", params.workspaceId)
    .single();
  const { data: world } = await supabase
    .from("worlds")
    .select("id,name,summary,default_game_system")
    .eq("workspace_id", params.workspaceId)
    .eq("id", params.worldId)
    .single();
  const { data: saga } = await supabase
    .from("sagas")
    .select("id,name,premise,game_system,gm_profile_override,audio_retention,transcript_retention")
    .eq("workspace_id", params.workspaceId)
    .eq("world_id", params.worldId)
    .eq("id", params.sagaId)
    .single();

  if (!workspace || !world || !saga) {
    notFound();
  }

  return { supabase, user, workspace, world, saga };
}

export async function getEntityList(params: IdParams, type: EntityType, includeArchived = false) {
  const { supabase } = await requireSagaContext(params);
  const table = tableForEntity(type);
  const select = type === "note"
    ? "id,workspace_id,world_id,saga_id,scope,title,body,canon_state,updated_at,note_type"
    : "id,workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,canon_state,is_stub,status,updated_at";

  let query = supabase
    .from(table)
    .select(select)
    .eq("workspace_id", params.workspaceId)
    .eq("world_id", params.worldId)
    .or(`saga_id.eq.${params.sagaId},and(scope.eq.world,saga_id.is.null)`)
    .order("updated_at", { ascending: false });

  if (!includeArchived && type !== "session") {
    query = query.neq("canon_state", "archived");
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => normalizeEntityRow(row, type));
}

export async function getEntity(params: IdParams, type: EntityType, id: string) {
  const rows = await getEntityList(params, type, true);
  return rows.find((row) => row.id === id) ?? null;
}

export async function getRecentEntities(params: IdParams) {
  const lists = await Promise.all([
    getEntityList(params, "character"),
    getEntityList(params, "place"),
    getEntityList(params, "faction"),
    getEntityList(params, "artifact"),
    getEntityList(params, "thread")
  ]);
  return lists.flat().sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""))).slice(0, 8);
}

export async function getSessions(params: IdParams) {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase
    .from("sessions")
    .select("id,name,summary,status,objective,opening_scene,scene_notes,prep_checklist,consent_state,started_at,ended_at,updated_at")
    .eq("workspace_id", params.workspaceId)
    .eq("world_id", params.worldId)
    .eq("saga_id", params.sagaId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getSession(params: IdParams, sessionId: string) {
  const sessions = await getSessions(params);
  return sessions.find((session) => session.id === sessionId) ?? null;
}

export async function getPrepOptions(params: IdParams) {
  const [characters, places, factions, artifacts, threads] = await Promise.all([
    getEntityList(params, "character"),
    getEntityList(params, "place"),
    getEntityList(params, "faction"),
    getEntityList(params, "artifact"),
    getEntityList(params, "thread")
  ]);

  return {
    entities: [...characters, ...places, ...factions, ...artifacts],
    threads
  };
}

export async function getPinnedEntities(params: IdParams, sessionId: string) {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase
    .from("session_pinned_entities")
    .select("entity_type,entity_id,order_index")
    .eq("session_id", sessionId)
    .order("order_index");
  if (error) {
    throw new Error(error.message);
  }
  const all = await getPrepOptions(params);
  const entities = all.entities;
  return (data ?? []).map((pin) => ({
    pin,
    entity: entities.find((entity) => entity.entityType === pin.entity_type && entity.id === pin.entity_id)
  })).filter((item) => item.entity);
}

export async function getActiveThreads(params: IdParams, sessionId: string) {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase
    .from("session_active_threads")
    .select("thread_id")
    .eq("session_id", sessionId);
  if (error) {
    throw new Error(error.message);
  }
  const threads = await getEntityList(params, "thread");
  return (data ?? []).map((row) => threads.find((thread) => thread.id === row.thread_id)).filter(Boolean);
}

export async function getPendingDrafts(params: IdParams) {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase
    .from("drafts")
    .select("id,entity_type,target_entity_id,state,change_kind,proposed_payload,confidence_band,created_by,created_at,rejection_note")
    .eq("workspace_id", params.workspaceId)
    .eq("world_id", params.worldId)
    .eq("saga_id", params.sagaId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function searchForUi(params: IdParams, query: string, literalOnly = true): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("search_for_ui", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    query_text: query,
    surface: "sanctum",
    top_k: 12,
    include_archived: false,
    literal_only: literalOnly,
    include_world_canon: true
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as SearchResult[];
}

export async function getUsageSummary(workspaceId: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("get_workspace_usage_summary", { workspace_id: workspaceId });
  return data;
}

function normalizeEntityRow(row: Record<string, unknown>, type: EntityType): EntitySummary {
  const name = type === "note" ? String(row.title ?? "Untitled note") : String(row.name ?? entityConfigs[type].label);
  return {
    id: String(row.id),
    entityType: type,
    workspace_id: String(row.workspace_id),
    world_id: String(row.world_id),
    saga_id: row.saga_id ? String(row.saga_id) : null,
    scope: row.scope === "world" ? "world" : "saga",
    name,
    summary: type === "note" ? String(row.body ?? "").slice(0, 180) : (row.summary as string | null),
    narrative: row.narrative as string | null,
    gm_notes: row.gm_notes as string | null,
    canon_state: row.canon_state === "archived" ? "archived" : "canon",
    is_stub: Boolean(row.is_stub),
    status: row.status as string | undefined,
    updated_at: row.updated_at as string | undefined
  };
}
