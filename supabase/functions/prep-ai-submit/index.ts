import { errorResponse, jsonResponse } from "../_shared/http.ts";
import { requireInternalAuth } from "../_shared/internal-auth.ts";
import { createScopedClient } from "../_shared/scoped-client.ts";
import { createServiceClient } from "../_shared/service-client.ts";

type SubmitRequest = {
  gm_user_id?: string;
  workspace_id?: string;
  world_id?: string;
  saga_id?: string;
  session_id?: string;
  request_id?: string;
  idempotency_key?: string;
  task_name?: string;
  prep_version?: string;
  parent_request_id?: string | null;
  input?: Record<string, unknown>;
};

const TASKS = new Set([
  "compose_prep_briefing",
  "generate_session_prep",
  "propose_scene_beats",
  "propose_thread_complication",
  "propose_npc_for_scene",
  "propose_quick_stub_fleshing",
  "draft_entity_from_prompt"
]);
const ENTITY_TYPES = new Set(["character", "place", "faction", "artifact", "thread"]);
const REGENERATE_SCOPES = new Set([
  "all", "objective", "opening_scene", "scene_notes",
  "pinned_entities", "active_threads", "prep_checklist"
]);

function onlyKeys(input: Record<string, unknown>, allowed: string[]) {
  return Object.keys(input).every((key) => allowed.includes(key));
}

function boundedString(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").replace(/\r\n?/g, "\n").trim().slice(0, max);
}

function taskTopK(taskName: string) {
  return taskName === "generate_session_prep" ? 20
    : taskName === "propose_thread_complication" ? 12 : 15;
}

function taskInputIsValid(taskName: string, input: Record<string, unknown>) {
  if (taskName === "compose_prep_briefing" || taskName === "propose_scene_beats") {
    return onlyKeys(input, []);
  }
  if (taskName === "generate_session_prep") {
    return onlyKeys(input, ["regenerate_scope"])
      && (input.regenerate_scope === undefined || REGENERATE_SCOPES.has(String(input.regenerate_scope)));
  }
  if (taskName === "propose_thread_complication") {
    return onlyKeys(input, ["thread_id"]) && typeof input.thread_id === "string";
  }
  if (taskName === "propose_npc_for_scene") {
    return onlyKeys(input, ["role_description"])
      && boundedString(input.role_description, 500).length > 0;
  }
  if (taskName === "propose_quick_stub_fleshing") {
    return onlyKeys(input, ["entity_type", "entity_id"])
      && ENTITY_TYPES.has(String(input.entity_type)) && typeof input.entity_id === "string";
  }
  return onlyKeys(input, ["candidate"])
    && typeof input.candidate === "object" && input.candidate !== null && !Array.isArray(input.candidate);
}

Deno.serve(async (req) => {
  const authFailure = requireInternalAuth(req);
  if (authFailure) return authFailure;
  if (req.method !== "POST") return errorResponse(405, "method_not_allowed", "Method not allowed.");

  const body = await req.json().catch(() => null) as SubmitRequest | null;
  const input = body?.input && typeof body.input === "object" && !Array.isArray(body.input) ? body.input : {};
  if (!body?.gm_user_id || !body.workspace_id || !body.world_id || !body.saga_id
    || !body.session_id || !body.request_id || !body.idempotency_key || !body.task_name
    || !body.prep_version || !TASKS.has(body.task_name) || !taskInputIsValid(body.task_name, input)) {
    return errorResponse(400, "invalid_request", "The Prep AI request is invalid.");
  }
  if (body.task_name === "draft_entity_from_prompt" && !body.parent_request_id) {
    return errorResponse(400, "invalid_request", "An NPC candidate review is required.");
  }

  const scoped = await createScopedClient(body.gm_user_id, "prep_ai_submit", body.saga_id);
  const [{ data: prep, error: prepError }, { data: preflight, error: preflightError }] = await Promise.all([
    scoped.rpc("get_session_prep", {
      workspace_id: body.workspace_id,
      world_id: body.world_id,
      saga_id: body.saga_id,
      session_id: body.session_id
    }),
    scoped.rpc("preflight_ai_task", {
      p_workspace_id: body.workspace_id,
      p_world_id: body.world_id,
      p_saga_id: body.saga_id,
      p_session_id: body.session_id,
      p_task_name: body.task_name,
      p_input_payload: { input_keys: Object.keys(input).sort() }
    })
  ]);
  if (prepError || !prep?.session || preflightError) {
    return errorResponse(403, "permission_denied", "Prep AI is unavailable in this Session.");
  }
  if (prep.session.updated_at !== body.prep_version) {
    return errorResponse(409, "prep_version_conflict", "Prep changed before this request could start.");
  }

  const pinnedEntityIds = (prep.pinned_entities ?? []).map((pin: Record<string, unknown>) => pin.entity_id);
  const activeThreadIds = (prep.active_threads ?? []).map((pin: Record<string, unknown>) => pin.entity_id);
  const currentSession = {
    name: prep.session.name,
    objective: prep.session.objective ?? "",
    opening_scene: prep.session.opening_scene ?? "",
    scene_notes: prep.session.scene_notes ?? "",
    prep_checklist: prep.session.prep_checklist ?? [],
    pinned_entity_ids: pinnedEntityIds,
    active_thread_ids: activeThreadIds
  };
  let taskPayload: Record<string, unknown> = { current_session: currentSession };
  let queryParts = [
    prep.session.name, prep.session.objective, prep.session.opening_scene,
    prep.session.scene_notes, prep.prior_summary?.text
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  const service = createServiceClient();
  if (body.task_name === "compose_prep_briefing") {
    taskPayload = {
      active_thread_ids: activeThreadIds,
      pinned_entity_ids: pinnedEntityIds,
      prior_session_summary: prep.prior_summary?.state === "approved" ? prep.prior_summary.text : null
    };
  } else if (body.task_name === "generate_session_prep") {
    taskPayload.regenerate_scope = String(input.regenerate_scope ?? "all");
  } else if (body.task_name === "propose_scene_beats") {
    taskPayload = {
      objective: currentSession.objective,
      opening_scene: currentSession.opening_scene,
      scene_notes: currentSession.scene_notes,
      active_thread_ids: activeThreadIds,
      pinned_entity_ids: pinnedEntityIds
    };
  } else if (body.task_name === "propose_thread_complication") {
    const threadId = String(input.thread_id);
    if (!activeThreadIds.includes(threadId)) {
      return errorResponse(400, "invalid_thread", "Choose a Thread already carried into this Prep.");
    }
    const { data: thread } = await service.from("threads")
      .select("id,name,objective,summary,resolution_state,objectives_log")
      .eq("id", threadId).eq("workspace_id", body.workspace_id).eq("world_id", body.world_id)
      .eq("saga_id", body.saga_id).eq("scope", "saga").neq("canon_state", "archived").maybeSingle();
    if (!thread) return errorResponse(400, "invalid_thread", "The selected Thread is unavailable.");
    taskPayload = {
      thread_id: thread.id,
      thread_name: thread.name,
      thread_objective: thread.objective ?? thread.summary ?? "",
      thread_kind: "session_carry_forward",
      objectives_log: thread.objectives_log ?? [],
      resolution_state: thread.resolution_state,
      recent_session_ids: []
    };
    queryParts = [thread.name, thread.objective, thread.summary, ...queryParts]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  } else if (body.task_name === "propose_npc_for_scene") {
    const role = boundedString(input.role_description, 500);
    taskPayload = {
      role_description: role,
      objective: currentSession.objective,
      opening_scene: currentSession.opening_scene,
      active_thread_ids: activeThreadIds,
      pinned_entity_ids: pinnedEntityIds
    };
    queryParts.unshift(role);
  } else if (body.task_name === "propose_quick_stub_fleshing") {
    const entityType = String(input.entity_type);
    const entityId = String(input.entity_id);
    const table = entityType === "thread" ? "threads" : `${entityType}s`;
    const { data: entity } = await service.from(table)
      .select("id,name,summary,is_stub")
      .eq("id", entityId).eq("workspace_id", body.workspace_id).eq("world_id", body.world_id)
      .eq("saga_id", body.saga_id).eq("scope", "saga").eq("is_stub", true)
      .neq("canon_state", "archived").maybeSingle();
    if (!entity || !pinnedEntityIds.includes(entityId)) {
      return errorResponse(400, "invalid_stub", "Choose a current-Saga Quick Stub pinned to this Session.");
    }
    taskPayload = {
      entity_type: entityType,
      entity_id: entity.id,
      entity_name: entity.name,
      entity_summary: entity.summary ?? "",
      is_stub: true,
      session_ids_with_mentions: [body.session_id]
    };
    queryParts = [entity.name, entity.summary, ...queryParts]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  } else {
    const candidate = input.candidate as Record<string, unknown>;
    const name = boundedString(candidate.name, 200);
    const summary = boundedString(candidate.summary, 500);
    const role = boundedString(candidate.role_in_scene, 200);
    if (!name || !summary) return errorResponse(400, "invalid_candidate", "The NPC candidate is incomplete.");
    taskPayload = {
      entity_type: "character",
      change_kind: "create",
      prompt: `Create a Quick Stub from this reviewed NPC candidate: ${name}. ${summary}`,
      rough_notes: role,
      candidate_from_task: "propose_npc_for_scene",
      session_id: body.session_id,
      desired_scope: "saga",
      parent_request_id: body.parent_request_id,
      candidate: { name, summary, role_in_scene: role }
    };
    queryParts = [name, summary, role, ...queryParts]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  }
  taskPayload.query_text = queryParts.join("\n").slice(0, 3000) || body.task_name.replaceAll("_", " ");

  const { data: submission, error: createError } = await service.rpc("create_prep_ai_request_for_worker", {
    p_request_id: body.request_id,
    p_workspace_id: body.workspace_id,
    p_world_id: body.world_id,
    p_saga_id: body.saga_id,
    p_session_id: body.session_id,
    p_gm_id: body.gm_user_id,
    p_idempotency_key: body.idempotency_key,
    p_task_name: body.task_name,
    p_input_payload: taskPayload,
    p_prep_version: body.prep_version,
    p_parent_request_id: body.parent_request_id ?? null
  });
  if (createError) {
    const status = createError.code === "23505" ? 409 : 400;
    return errorResponse(status, "prep_ai_submit_failed", "Relic could not preserve this Prep AI request.");
  }
  if (!preflight?.allowed) {
    await service.rpc("block_prep_ai_request_for_worker", {
      p_run_id: submission.run_id,
      p_quota: {
        severity: preflight.severity,
        message: preflight.message,
        reset_at: preflight.reset_at
      }
    });
    return jsonResponse({
      ...submission,
      status: "quota_blocked",
      quota: { severity: preflight.severity, message: preflight.message, reset_at: preflight.reset_at }
    }, { status: 429 });
  }
  if (submission.replayed && submission.status === "complete") {
    return jsonResponse({ ...submission, quota: { severity: preflight.severity } });
  }

  const internalToken = Deno.env.get("INTERNAL_TOKEN");
  const baseUrl = Deno.env.get("SUPABASE_URL");
  if (!internalToken || !baseUrl) {
    return errorResponse(500, "configuration", "Prep AI is temporarily unavailable.");
  }
  const runner = await fetch(`${baseUrl}/functions/v1/ai-task-runner`, {
    method: "POST",
    headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" },
    body: JSON.stringify({ run_id: submission.run_id })
  }).catch(() => null);
  return jsonResponse({
    ...submission,
    dispatch_status: runner?.status ?? 503,
    quota: { severity: preflight.severity },
    top_k: taskTopK(body.task_name)
  }, { status: runner?.ok ? 200 : 202 });
});
