import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { entityConfigs } from "@/lib/entities";
import { getSupabaseUrl, hasSupabaseEnv, supabaseConfigErrorPath } from "@/lib/env";
import { sagaPath } from "@/lib/routes";
import type { AppContext, EntitySummary, EntityType, HierarchyContext, IdParams, ImportSource, LibraryRecordDetail, SearchResult, SessionPrepData, SessionPrepPin, StageLiteralSearchDocument, ThreadDetail, ThreadObjective, ThreadTimelineEntry } from "@/lib/types";
import type { GuideBlock, GuideThread, GuideTurn } from "@/components/RelicGuideConversation";

type WorkspaceContext = { id: string; name: string; usage_limits?: Record<string, unknown>; hierarchy?: HierarchyContext };
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
export type SessionRow = {
  id: string;
  name: string;
  session_number?: number | null;
  planned_date?: string | null;
  planned_start_at?: string | null;
  archived_at?: string | null;
  summary?: string | null;
  status: string;
  objective?: string | null;
  opening_scene?: string | null;
  scene_notes?: string | null;
  prep_checklist?: Array<{ text: string; done?: boolean }>;
  consent_state?: string;
  started_at?: string | null;
  ended_pending_undo_at?: string | null;
  ended_at?: string | null;
  updated_at?: string;
};
export type TranscriptSegment = { start: number; end: number; text: string; deleted?: boolean };
export type SessionReviewData = {
  session_id: string;
  session_status: string;
  audio: { expected_chunks?: number | null; registered_chunks: number; finalized_at?: string | null };
  pipeline?: { id: string; state: string; failure_reason?: string | null; inputs_summary?: Record<string, unknown>; updated_at?: string } | null;
  transcript?: { id: string; state: string; model: string; language?: string | null; duration_seconds?: number | null; segments: TranscriptSegment[]; edited_at?: string | null; failure_reason?: string | null } | null;
  transcription_job?: { id: string; state: string; attempts: number; max_attempts: number; scheduled_at?: string; failure_reason?: string | null; updated_at?: string } | null;
  manual_evidence: Array<{ id: string; kind: "pasted_text" | "gm_manual_summary"; text: string; created_at: string }>;
};
type PinRow = { entity_type: EntityType; entity_id: string; order_index?: number };
type ActiveThreadRow = { thread_id: string };
export type DraftCitationContext = {
  status: "available" | "unavailable" | "broken" | "permission_denied" | "unsupported";
  source_kind: string;
  label: string;
  frozen_excerpt?: string | null;
  current_text?: string | null;
  start_seconds?: number | null;
  end_seconds?: number | null;
  session_id?: string | null;
  drift_state: "exact" | "edited" | "deleted" | "not_applicable" | "unavailable";
};

export type PrepAiRequest = {
  id: string;
  task_name: string;
  status: "queued" | "running" | "complete" | "quota_blocked" | "provider_unavailable"
    | "retrieval_unavailable" | "validation_failed" | "failed" | "dead_letter";
  review_state: "pending" | "accepted" | "rejected" | "dismissed";
  prep_version_at_submit: string;
  retrieval_mode?: "hybrid" | "lexical_fallback" | null;
  result_payload?: Record<string, unknown> | null;
  edited_payload?: Record<string, unknown> | null;
  failure_category?: string | null;
  quota?: { severity?: string; message?: string; reset_at?: string | null } | null;
  acceptance_destination?: "prep_autosave" | "approval_queue" | null;
  accepted_draft_id?: string | null;
  accepted_prep_version?: string | null;
  parent_request_id?: string | null;
  retry_input: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  sources: Array<{ source_id: string; context: DraftCitationContext }>;
};

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
  citations: DraftCitationContext[];
};

export type ApprovalFieldDiff = {
  field: string;
  label: string;
  old: unknown;
  new: unknown;
  value_type: string;
};

export type ApprovalDraft = {
  id: string;
  entity_type: EntityType;
  target_entity_id?: string | null;
  state: string;
  change_kind: string;
  title: string;
  confidence_band?: string | null;
  confidence_reason?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  batch_id?: string | null;
  editable_payload: Record<string, unknown>;
  field_diffs: readonly ApprovalFieldDiff[];
  target?: Record<string, unknown> | null;
  source_health: "healthy" | "drifted" | "broken";
  conflict: {
    kind: string;
    blocking: boolean;
    concurrent_count: number;
    expected_version?: string | null;
    live_version?: string | null;
  };
  provenance: {
    ai_task_name?: string | null;
    prompt_version?: string | null;
    model?: string | null;
    provider?: string | null;
    ai_task_run_id?: string | null;
    pipeline_run_id?: string | null;
    session_id?: string | null;
  };
  audit?: {
    id: string;
    action: string;
    source_ids: string[];
    change_summary: Record<string, unknown>;
    created_at: string;
  } | null;
  citations: readonly DraftCitationContext[];
};
export type StagePacket = {
  session?: SessionRow;
  pinned_entities?: unknown[];
  active_threads?: unknown[];
  quick_captures?: unknown[];
  marked_moments?: unknown[];
  dice_rolls?: Array<{ id: string; expression: string; result_total: number; result_breakdown: number[]; label?: string | null; created_at?: string }>;
  consent_state?: string;
  start_warning?: Record<string, unknown>;
  literal_search_index?: StageLiteralSearchDocument[];
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

  const context = data as { workspace?: WorkspaceContext; world?: WorldContext; saga?: SagaContext; hierarchy?: HierarchyContext } | null;
  const workspace = context?.workspace;
  const world = context?.world;
  const saga = context?.saga;

  if (!workspace || !world || !saga) {
    notFound();
  }

  workspace.hierarchy = context?.hierarchy;

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

export async function getThreadDetail(params: IdParams, threadId: string): Promise<ThreadDetail | null> {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_thread_detail", {
    workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, thread_id: threadId,
  });
  if (error) {
    if (error.code === "42501") return null;
    throw new Error(error.message);
  }
  if (!data || typeof data !== "object" || !("record" in data)) return null;
  const raw = data as unknown as ThreadDetail & { record: Record<string, unknown> };
  const record = normalizeEntityRow(raw.record, "thread") as ThreadDetail["record"];
  record.resolution_state = ["dormant", "resolved", "failed"].includes(String(raw.record.resolution_state))
    ? raw.record.resolution_state as ThreadDetail["record"]["resolution_state"] : "active";
  record.resolution_details = typeof raw.record.resolution_details === "string" ? raw.record.resolution_details : null;
  record.objectives_log = normalizeObjectives(raw.record.objectives_log);
  return { ...raw, record };
}

export async function getThreadTimeline(params: IdParams, threadId: string): Promise<ThreadTimelineEntry[]> {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_thread_timeline", {
    workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, thread_id: threadId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ThreadTimelineEntry[];
}

export async function getLibraryRecordDetail(params: IdParams, type: EntityType, id: string): Promise<LibraryRecordDetail | null> {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_library_record_detail", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    entity_type: type,
    entity_id: id,
  });
  if (error) {
    if (error.code === "42501") return null;
    throw new Error(error.message);
  }
  if (!data || typeof data !== "object" || !("record" in data)) return null;
  const detail = data as unknown as LibraryRecordDetail & { record: Record<string, unknown> };
  return { ...detail, record: normalizeEntityRow(detail.record, type) } as LibraryRecordDetail;
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

export async function getImportInbox(params: IdParams, includeArchived = true): Promise<ImportSource[]> {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_import_inbox", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    include_archived: includeArchived,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as ImportSource[];
}

export async function getSession(params: IdParams, sessionId: string) {
  const sessions = await getSessions(params);
  return sessions.find((session) => session.id === sessionId) ?? null;
}

function optionPin(entity: EntitySummary, order_index: number): SessionPrepPin {
  return {
    key: `${entity.entityType}:${entity.id}`,
    entity_type: entity.entityType,
    entity_id: entity.id,
    name: entity.name,
    state: entity.canon_state === "archived" ? "archived" : "available",
    order_index,
    summary: entity.summary,
    objectives_log: entity.objectives_log,
    resolution_state: entity.resolution_state,
    is_stub: entity.is_stub
  };
}

export async function getSessionPrep(params: IdParams, sessionId: string): Promise<SessionPrepData> {
  const { supabase } = await requireSagaContext(params);
  const [{ data, error }, options] = await Promise.all([
    supabase.rpc("get_session_prep", { workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, session_id: sessionId }),
    getPrepOptions(params),
  ]);
  if (error) throw new Error(error.message);
  const raw = data as Omit<SessionPrepData, "options">;
  return { ...raw, options: { entities: options.entities.map(optionPin), threads: options.threads.map(optionPin) } };
}

export async function getSessionPrepAi(params: IdParams, sessionId: string): Promise<PrepAiRequest[]> {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_session_prep_ai", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId
  });
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []) as PrepAiRequest[];
}

export async function getStagePacket(params: IdParams, sessionId: string): Promise<StagePacket> {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_stage_packet", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? {}) as StagePacket;
}

export async function getSessionReview(params: IdParams, sessionId: string): Promise<SessionReviewData> {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_session_review", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    session_id: sessionId,
  });
  if (error) throw new Error(error.message);
  return data as SessionReviewData;
}

export async function getPrepOptions(params: IdParams) {
  const [characters, places, factions, artifacts, notes, threads] = await Promise.all([
    getEntityList(params, "character", true),
    getEntityList(params, "place", true),
    getEntityList(params, "faction", true),
    getEntityList(params, "artifact", true),
    getEntityList(params, "note", true),
    getEntityList(params, "thread", true)
  ]);

  return {
    entities: [...characters, ...places, ...factions, ...artifacts, ...notes],
    threads
  };
}

export async function getPinnedEntities(params: IdParams, sessionId: string) {
  const prep = await getSessionPrep(params, sessionId);
  return prep.pinned_entities.map((pin) => ({
    pin: { entity_type: pin.entity_type, entity_id: pin.entity_id, order_index: pin.order_index } as PinRow,
    entity: prep.options.entities.find((entity) => entity.key === pin.key)
      ? (() => { const found = prep.options.entities.find((entity) => entity.key === pin.key)!; return { id: found.entity_id, entityType: found.entity_type, workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, scope: "saga" as const, name: found.name, summary: found.summary ?? null, canon_state: found.state === "archived" ? "archived" as const : "canon" as const }; })()
      : { id: pin.entity_id, entityType: pin.entity_type, workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, scope: "saga" as const, name: pin.name, summary: `${pin.state} pinned record`, canon_state: pin.state === "archived" ? "archived" as const : "canon" as const }
  }));
}

export async function getActiveThreads(params: IdParams, sessionId: string) {
  const prep = await getSessionPrep(params, sessionId);
  return prep.active_threads.map((pin) => {
    const found = prep.options.threads.find((thread) => thread.key === pin.key);
    return { id: pin.entity_id, entityType: "thread" as const, workspace_id: params.workspaceId, world_id: params.worldId, saga_id: params.sagaId, scope: "saga" as const, name: found?.name ?? pin.name, summary: found?.summary ?? (pin.state === "available" ? null : `${pin.state} pinned Thread`), objectives_log: found?.objectives_log ?? [], resolution_state: found?.resolution_state, canon_state: (found?.state ?? pin.state) === "archived" ? "archived" as const : "canon" as const };
  });
}

export async function getPendingDrafts(params: IdParams, sessionId?: string) {
  const { supabase } = await requireSagaContext(params);
  const rpc = sessionId ? "get_pending_drafts_for_session" : "get_pending_drafts";
  const args = {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    ...(sessionId ? { session_id: sessionId } : {})
  };
  const { data, error } = await supabase.rpc(rpc, args);
  if (error) {
    throw new Error(error.message);
  }
  const drafts = (data ?? []) as Omit<DraftRow, "citations">[];
  return Promise.all(drafts.map(async (draft): Promise<DraftRow> => {
    const citationResult = await supabase.rpc("get_draft_source_context", {
      workspace_id: params.workspaceId,
      world_id: params.worldId,
      saga_id: params.sagaId,
      draft_id: draft.id,
    });
    const fallback: DraftCitationContext[] = [{
      status: "unavailable",
      source_kind: "unknown",
      label: "Source unavailable",
      drift_state: "unavailable",
    }];
    return {
      ...draft,
      citations: citationResult.error || !Array.isArray(citationResult.data)
        ? fallback
        : citationResult.data as DraftCitationContext[],
    };
  }));
}

export async function getApprovalQueue(params: IdParams): Promise<ApprovalDraft[]> {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_approval_queue", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
  });
  if (error) throw new Error(error.message);
  const drafts = (Array.isArray(data) ? data : []) as Omit<ApprovalDraft, "citations">[];
  return Promise.all(drafts.map(async (draft) => {
    const citationResult = await supabase.rpc("get_draft_source_context", {
      workspace_id: params.workspaceId,
      world_id: params.worldId,
      saga_id: params.sagaId,
      draft_id: draft.id,
    });
    const fallback: DraftCitationContext[] = [{ status: "unavailable", source_kind: "unknown", label: "Source unavailable", drift_state: "unavailable" }];
    return { ...draft, citations: citationResult.error || !Array.isArray(citationResult.data) ? fallback : citationResult.data as DraftCitationContext[] };
  }));
}

export async function searchForUi(params: IdParams, query: string, literalOnly = true, surface = "sanctum"): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }
  const { supabase, user } = await requireSagaContext(params);
  const internalToken = process.env.INTERNAL_TOKEN;
  if (!literalOnly && surface === "sanctum" && internalToken) {
    try {
      const response = await fetch(`${getSupabaseUrl()}/functions/v1/hybrid-search`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${internalToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          gm_user_id: user.id,
          workspace_id: params.workspaceId,
          world_id: params.worldId,
          saga_id: params.sagaId,
          query_text: query,
          top_k: 12,
          include_world_canon: true,
        }),
        cache: "no-store",
      });
      if (response.ok) {
        const payload = await response.json() as { results?: SearchResult[] };
        if (Array.isArray(payload.results)) return payload.results;
      }
    } catch {
      // Search remains usable through the scoped lexical RPC below.
    }
  }
  const { data, error } = await supabase.rpc("search_for_ui", {
    workspace_id: params.workspaceId,
    world_id: params.worldId,
    saga_id: params.sagaId,
    query_text: query,
    surface,
    top_k: 12,
    include_archived: false,
    literal_only: true,
    include_world_canon: true
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as SearchResult[];
}

export async function getGuideThread(params: IdParams, threadId?: string | null): Promise<GuideThread> {
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_guide_thread", {
    p_workspace_id: params.workspaceId,
    p_world_id: params.worldId,
    p_saga_id: params.sagaId,
    p_thread_id: threadId ?? null
  });
  if (error) throw new Error(error.message);
  if (!data) return { id: "", state: "active", turns: [] };

  const raw = data as {
    id: string;
    state: "active" | "archived";
    turns?: Array<{
      id: string;
      question: string;
      status: GuideTurn["status"];
      retrieval_mode?: string;
      response?: { no_answer?: boolean; insufficiency_reason?: string; blocks?: Array<Record<string, unknown>> } | null;
      actions?: Array<Record<string, unknown>>;
    }>;
  };
  const turns = await Promise.all((raw.turns ?? []).map(async (turn): Promise<GuideTurn> => {
    const contextResult = await supabase.rpc("get_guide_source_context", {
      p_workspace_id: params.workspaceId,
      p_world_id: params.worldId,
      p_saga_id: params.sagaId,
      p_turn_id: turn.id
    });
    const contexts = Array.isArray(contextResult.data)
      ? contextResult.data as Array<DraftCitationContext & { source_id?: string; source_entity_type?: string; source_entity_id?: string }>
      : [];
    const contextBySource = new Map(contexts.map((context) => [context.source_id, context]));
    const actions = new Map((turn.actions ?? []).map((action) => [Number(action.block_index), action]));
    const blocks: GuideBlock[] = (turn.response?.blocks ?? []).flatMap((block, blockIndex) => {
      if (block.type === "grounded_answer" || block.type === "grounded_proposal") {
        const citations = Array.isArray(block.citations) ? block.citations : [];
        return [{
          type: block.type,
          text: String(block.text ?? ""),
          citations: citations.flatMap((citation) => {
            const sourceId = typeof citation === "object" && citation !== null
              ? String((citation as Record<string, unknown>).source_id ?? "") : "";
            const context = contextBySource.get(sourceId);
            return context ? [{ sourceId, context }] : [];
          })
        } as GuideBlock];
      }
      if (block.type === "guidance" || block.type === "creative_proposal") {
        return [{ type: block.type, text: String(block.text ?? "") } as GuideBlock];
      }
      if (block.type === "action_preview") {
        const stored = actions.get(blockIndex);
        if (!stored) return [];
        const argumentsValue = typeof stored.arguments === "object" && stored.arguments !== null
          ? stored.arguments as Record<string, unknown> : {};
        const cost = typeof stored.cost === "object" && stored.cost !== null
          ? stored.cost as Record<string, unknown> : {};
        const common = {
          actionId: String(stored.id),
          intentVersion: Number(stored.intent_version ?? 1),
          explanation: String(stored.explanation ?? block.explanation ?? ""),
          authorityTier: String(stored.authority_tier ?? "read_navigation") as "read_navigation" | "non_canon_generation",
          confirmationPolicy: String(stored.confirmation_policy ?? "none") as "none" | "explicit",
          costCredits: Number(cost.ai_credits ?? 0),
          effectSummary: String(stored.effect_summary ?? ""),
          manualFallback: String(stored.manual_fallback ?? ""),
          availabilityState: String(stored.availability_state ?? "available"),
          state: String(stored.state ?? "pending") as Extract<GuideBlock, { type: "action_preview" }>["state"]
        };
        if (stored.name === "open_record") {
          const href = stored.target_type && stored.target_id
            ? `${sagaPath(params)}/entities/${stored.target_type}/${stored.target_id}`
            : `${sagaPath(params)}/search?q=${encodeURIComponent(turn.question)}`;
          return [{
            type: "action_preview",
            ...common,
            action: { name: "open_record", version: "1.0.0", href }
          }];
        }
        if (stored.name !== "draft_entity") return [];
        return [{
          type: "action_preview",
          ...common,
          action: {
            name: "draft_entity",
            version: "1.0.0",
            entityType: String(argumentsValue.entity_type) as "character",
            intent: String(argumentsValue.intent ?? "")
          }
        }];
      }
      return [];
    });
    return {
      id: turn.id,
      question: turn.question,
      status: turn.status,
      noAnswer: turn.response?.no_answer,
      insufficiencyReason: turn.response?.insufficiency_reason,
      blocks
    };
  }));
  return { id: raw.id, state: raw.state, turns };
}

export async function getUsageSummary(workspaceId: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("get_workspace_usage_summary", { workspace_id: workspaceId });
  return data;
}

export type SagaWorkshop = {
  id: string; workspace_id: string; world_id?: string | null; saga_id?: string | null; committed_session_id?: string | null;
  state: "in_progress" | "committed" | "abandoned";
  phase: "planning" | "conversation" | "drafting" | "review" | "committed";
  generation_status: string; failure_category?: string | null; review_version: number;
  conversation_version: number; conversation_step: number;
  gm_message_count: number; total_message_count: number; gm_input_chars: number;
  draft_payload: Record<string, unknown>; conversation: Array<Record<string, unknown>>;
  interview_plan: Record<string, unknown>; emerging_outline: Record<string, unknown>;
  current_question?: Record<string, unknown> | null; can_draft: boolean;
  saga_name?: string | null; world_name?: string | null; game_system?: string | null;
  quota?: Record<string, unknown>; updated_at: string;
  sources: Array<{ source_id: string; kind: string; title: string; excerpt: string }>;
  regeneration_requests: Array<{
    id: string; section_kind: string; target_temp_id?: string | null; base_review_version: number;
    status: string; output_payload?: Record<string, unknown> | null; failure_category?: string | null; created_at: string;
  }>;
};

export async function getSagaWorkshop(workshopId: string): Promise<SagaWorkshop | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("get_saga_workshop", { p_workshop_id: workshopId });
  if (error) throw new Error(error.message);
  return data ? data as SagaWorkshop : null;
}

export async function getExportStatus(params: IdParams, exportId?: string | null) {
  if (!exportId) {
    return null;
  }
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_saga_export_status", {
    p_workspace_id: params.workspaceId,
    p_world_id: params.worldId,
    p_saga_id: params.sagaId,
    p_export_id: exportId
  });
  if (error) {
    throw new Error(error.message);
  }
  return data as Record<string, unknown> | null;
}

export async function getExportDownload(params: IdParams, exportId?: string | null) {
  if (!exportId) {
    return null;
  }
  const { supabase } = await requireSagaContext(params);
  const { data, error } = await supabase.rpc("get_saga_export_download", {
    p_workspace_id: params.workspaceId,
    p_world_id: params.worldId,
    p_saga_id: params.sagaId,
    p_export_id: exportId
  });
  if (error) {
    throw new Error(error.message);
  }
  return data as Record<string, unknown> | null;
}

export function normalizeEntityRow(row: Record<string, unknown>, type: EntityType): EntitySummary {
  const name = type === "note" ? String(row.title ?? row.name ?? "Untitled note") : String(row.name ?? entityConfigs[type].label);
  const noteBody = String(row.body ?? row.narrative ?? "");
  return {
    id: String(row.id),
    entityType: type,
    workspace_id: String(row.workspace_id),
    world_id: String(row.world_id),
    saga_id: row.saga_id ? String(row.saga_id) : null,
    scope: row.scope === "world" ? "world" : "saga",
    name,
    summary: type === "note" ? String(row.summary ?? noteBody.slice(0, 180)) : (row.summary as string | null),
    narrative: type === "note" ? noteBody : row.narrative as string | null,
    gm_notes: row.gm_notes as string | null,
    canon_state: row.canon_state === "archived" ? "archived" : "canon",
    is_stub: Boolean(row.is_stub),
    status: type === "thread" ? threadStatus(row) : row.status as string | undefined,
    objectives_log: Array.isArray(row.objectives_log) ? row.objectives_log : undefined,
    resolution_state: type === "thread" && ["active", "dormant", "resolved", "failed"].includes(String(row.resolution_state)) ? row.resolution_state as EntitySummary["resolution_state"] : undefined,
    resolution_details: type === "thread" && typeof row.resolution_details === "string" ? row.resolution_details : null,
    updated_at: row.updated_at as string | undefined
  };
}

function threadStatus(row: Record<string, unknown>) {
  if (row.resolution_state === "resolved") return "resolved";
  if (row.resolution_state === "failed") return "failed";
  if (row.is_loose_thread === true) return "loose";
  if (row.resolution_state === "active") return "active";
  if (typeof row.status === "string") return row.status;
  return "dormant";
}

function normalizeObjectives(value: unknown): ThreadObjective[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index): ThreadObjective => {
    if (typeof item === "string") return { id: `legacy-${index}`, text: item, state: "open", completed_at: null, order_index: index };
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      id: String(row.id ?? `legacy-${index}`), text: String(row.text ?? ""),
      state: row.state === "completed" ? "completed" : "open",
      completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
      order_index: typeof row.order_index === "number" ? row.order_index : index,
      created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    };
  }).sort((a, b) => a.order_index - b.order_index);
}
