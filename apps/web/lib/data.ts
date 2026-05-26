import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { entityConfigs } from "@/lib/entities";
import { hasSupabaseEnv, supabaseConfigErrorPath } from "@/lib/env";
import type { AppContext, EntitySummary, EntityType, IdParams, SearchResult } from "@/lib/types";

type WorkspaceContext = { id: string; name: string; usage_limits?: Record<string, unknown> };
type WorldContext = { id: string; name: string; summary?: string | null; default_game_system?: string | null };
type SagaContext = {
  id: string;
  name: string;
  premise?: string | null;
  game_system?: string | null;
  gm_profile_override?: Record<string, unknown> | null;
  audio_retention?: string;
  transcript_retention?: string;
};
type SessionRow = {
  id: string;
  name: string;
  summary?: string | null;
  status: string;
  objective?: string | null;
  opening_scene?: string | null;
  scene_notes?: string | null;
  prep_checklist?: Array<{ text: string; done?: boolean }>;
  consent_state?: string;
  started_at?: string | null;
  ended_at?: string | null;
  updated_at?: string;
};
type PinRow = { entity_type: EntityType; entity_id: string; order_index?: number };
type ActiveThreadRow = { thread_id: string };
type DraftRow = {
  id: string;
  entity_type: EntityType;
  target_entity_id?: string | null;
  state: string;
  change_kind: string;
  proposed_payload: Record<string, unknown>;
  confidence_band?: string | null;
  created_by?: string;
  created_at?: string;
  rejection_note?: string | null;
};

export async function requireUser() {
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
  const { data, error } = await supabase.rpc("get_saga_context", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId
  });
  if (error) {
    throw new Error(error.message);
  }

  const context = data as { workspace?: WorkspaceContext; world?: WorldContext; saga?: SagaContext } | null;
  const workspace = context?.workspace;
  const world = context?.world;
  const saga = context?.saga;

  if (!workspace || !world || !saga) {
    notFound();
  }

  return { supabase, user, workspace, world, saga };
}

export async function getEntityList(params: IdParams, type: EntityType, includeArchived = false) {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("list_entities", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    entity_type: type,
    include_archived: includeArchived
  });
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
  const { data, error } = await supabase.rpc("get_sessions_for_saga", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as SessionRow[];
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
  const { data, error } = await supabase.rpc("get_session_pinned_entities", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId
  });
  if (error) {
    throw new Error(error.message);
  }
  const all = await getPrepOptions(params);
  const entities = all.entities;
  return ((data ?? []) as PinRow[]).map((pin) => ({
    pin,
    entity: entities.find((entity) => entity.entityType === pin.entity_type && entity.id === pin.entity_id)
  })).filter((item) => item.entity);
}

export async function getActiveThreads(params: IdParams, sessionId: string) {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_session_active_threads", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId
  });
  if (error) {
    throw new Error(error.message);
  }
  const threads = await getEntityList(params, "thread");
  return ((data ?? []) as ActiveThreadRow[]).map((row) => threads.find((thread) => thread.id === row.thread_id)).filter(Boolean);
}

export async function getPendingDrafts(params: IdParams) {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_pending_drafts", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as DraftRow[];
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
