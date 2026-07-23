import { createServiceClient } from "./service-client.ts";

export const SENSITIVE_FIELD_NAMES = new Set([
  "api_key", "authorization", "body", "content", "cookie", "cookies", "embedding",
  "embedding_vector", "headers", "imported_notes", "input_payload", "jwt", "notes",
  "output_payload", "prompt", "provider_response", "query_text", "raw_prompt", "raw_response",
  "signed_url", "source_excerpt", "token", "transcript", "transcript_text"
]);

const SAFE_METADATA_KEYS = new Set([
  "actual_model", "billable", "cron_job_name", "cron_status", "dimensions",
  "exact_redelivery", "expected_model", "lease_ms", "metered",
  "provider_request_id_present", "replayed", "request_id_present", "result_count",
  "retrieval_mode", "scheduled_for", "source_kind", "trigger",
  "validation_repair_attempts", "worker_id_hash"
]);

export type ProviderPipelineEvent = {
  eventName: string;
  severity?: "debug" | "info" | "warn" | "error";
  environment?: string;
  deploymentId?: string | null;
  workerType: string;
  aiRunId?: string | null;
  pipelineRunId?: string | null;
  jobId?: string | null;
  workspaceId?: string | null;
  worldId?: string | null;
  sagaId?: string | null;
  sessionId?: string | null;
  idempotencyIdentifier?: string | null;
  providerAlias?: string | null;
  resolvedModel?: string | null;
  provider?: string | null;
  attemptCount?: number | null;
  queueDelayMs?: number | null;
  providerLatencyMs?: number | null;
  endToEndLatencyMs?: number | null;
  state: string;
  errorCategory?: string | null;
  inputUnits?: number | null;
  inputUnitType?: string | null;
  outputUnits?: number | null;
  outputUnitType?: string | null;
  usageUnits?: number | null;
  usageUnitType?: string | null;
  retryPath?: string | null;
  fallbackPath?: string | null;
  safeMetadata?: Record<string, unknown>;
};

function normalizedKey(key: string) {
  return key.trim().toLowerCase().replaceAll("-", "_");
}

function scalar(value: unknown): string | number | boolean | null | undefined {
  if (value === null || value === undefined || typeof value === "string"
    || typeof value === "number" || typeof value === "boolean") return value;
  return undefined;
}

export function sanitizeObservabilityFields(fields: Record<string, unknown>) {
  const safe: Record<string, string | number | boolean | null> = {};
  let omittedFieldCount = 0;
  for (const [key, value] of Object.entries(fields)) {
    const normalized = normalizedKey(key);
    if (SENSITIVE_FIELD_NAMES.has(normalized)) {
      omittedFieldCount += 1;
      continue;
    }
    const safeValue = scalar(value);
    if (safeValue === undefined) {
      omittedFieldCount += 1;
      continue;
    }
    safe[key] = typeof safeValue === "string" ? safeValue.slice(0, 200) : safeValue;
  }
  return { safe, omittedFieldCount };
}

function safeMetadata(metadata: Record<string, unknown> | undefined) {
  const safe: Record<string, string | number | boolean | null> = {};
  let omittedFieldCount = 0;
  for (const [key, value] of Object.entries(metadata ?? {})) {
    const normalized = normalizedKey(key);
    const safeValue = scalar(value);
    if (!SAFE_METADATA_KEYS.has(normalized) || SENSITIVE_FIELD_NAMES.has(normalized) || safeValue === undefined) {
      omittedFieldCount += 1;
      continue;
    }
    safe[normalized] = typeof safeValue === "string" ? safeValue.slice(0, 200) : safeValue;
  }
  return { safe, omittedFieldCount };
}

function runtimeEnvironment() {
  return (Deno.env.get("RELIC_ENV") ?? "unknown").toLowerCase();
}

function deploymentId() {
  return Deno.env.get("DENO_DEPLOYMENT_ID") ?? Deno.env.get("RELIC_DEPLOYMENT_ID") ?? null;
}

export function logSafeProviderEvent(event: ProviderPipelineEvent) {
  const metadata = safeMetadata(event.safeMetadata);
  if (metadata.omittedFieldCount > 0) {
    console.warn(JSON.stringify({
      event_name: "observability_event_rejected",
      worker_type: event.workerType,
      state: "terminal_failure",
      error_category: "sensitive_field_omitted",
      omitted_field_count: metadata.omittedFieldCount
    }));
  }
  const { safe } = sanitizeObservabilityFields({
    event_name: event.eventName,
    severity: event.severity ?? "info",
    environment: event.environment ?? runtimeEnvironment(),
    deployment_id: event.deploymentId ?? deploymentId(),
    worker_type: event.workerType,
    ai_run_id: event.aiRunId,
    pipeline_run_id: event.pipelineRunId,
    job_id: event.jobId,
    workspace_id: event.workspaceId,
    world_id: event.worldId,
    saga_id: event.sagaId,
    session_id: event.sessionId,
    idempotency_identifier: event.idempotencyIdentifier,
    provider_alias: event.providerAlias,
    resolved_model: event.resolvedModel,
    provider: event.provider,
    attempt_count: event.attemptCount,
    queue_delay_ms: event.queueDelayMs,
    provider_latency_ms: event.providerLatencyMs,
    end_to_end_latency_ms: event.endToEndLatencyMs,
    state: event.state,
    error_category: event.errorCategory,
    input_units: event.inputUnits,
    input_unit_type: event.inputUnitType,
    output_units: event.outputUnits,
    output_unit_type: event.outputUnitType,
    usage_units: event.usageUnits,
    usage_unit_type: event.usageUnitType,
    retry_path: event.retryPath,
    fallback_path: event.fallbackPath,
    ...metadata.safe
  });
  console.log(JSON.stringify(safe));
  return { metadata: metadata.safe, omittedFieldCount: metadata.omittedFieldCount };
}

export async function recordProviderPipelineEvent(event: ProviderPipelineEvent) {
  const logged = logSafeProviderEvent(event);
  const service = createServiceClient();
  const { error } = await service.rpc("record_provider_pipeline_event_for_worker", {
    p_event_name: event.eventName,
    p_severity: event.severity ?? "info",
    p_environment: event.environment ?? runtimeEnvironment(),
    p_deployment_id: event.deploymentId ?? deploymentId(),
    p_worker_type: event.workerType,
    p_ai_run_id: event.aiRunId ?? null,
    p_pipeline_run_id: event.pipelineRunId ?? null,
    p_job_id: event.jobId ?? null,
    p_workspace_id: event.workspaceId ?? null,
    p_world_id: event.worldId ?? null,
    p_saga_id: event.sagaId ?? null,
    p_session_id: event.sessionId ?? null,
    p_idempotency_identifier: event.idempotencyIdentifier ?? null,
    p_provider_alias: event.providerAlias ?? null,
    p_resolved_model: event.resolvedModel ?? null,
    p_provider: event.provider ?? null,
    p_attempt_count: event.attemptCount ?? null,
    p_queue_delay_ms: event.queueDelayMs ?? null,
    p_provider_latency_ms: event.providerLatencyMs ?? null,
    p_e2e_latency_ms: event.endToEndLatencyMs ?? null,
    p_state: event.state,
    p_error_category: event.errorCategory ?? null,
    p_input_units: event.inputUnits ?? null,
    p_input_unit_type: event.inputUnitType ?? null,
    p_output_units: event.outputUnits ?? null,
    p_output_unit_type: event.outputUnitType ?? null,
    p_usage_units: event.usageUnits ?? null,
    p_usage_unit_type: event.usageUnitType ?? null,
    p_retry_path: event.retryPath ?? null,
    p_fallback_path: event.fallbackPath ?? null,
    p_safe_metadata: logged.metadata
  });
  return { persisted: !error, omittedFieldCount: logged.omittedFieldCount };
}
