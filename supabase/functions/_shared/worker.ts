import { jsonResponse } from "./http.ts";
import { requireInternalAuth } from "./internal-auth.ts";
import { createServiceClient } from "./service-client.ts";
import { recordProviderPipelineEvent, sanitizeObservabilityFields } from "./observability.ts";

type HandlerResult =
  | { state: "complete"; result?: Record<string, unknown> }
  | { state: "retry"; reason: string; result?: Record<string, unknown> }
  | { state: "failed"; reason: string; result?: Record<string, unknown> }
  | { state: "managed"; result?: Record<string, unknown> };

type WorkerOptions = {
  queueName: string;
  claimRpc: string;
  jobTable: string;
  workerPurpose: string;
  handleJob: (job: Record<string, unknown>) => Promise<HandlerResult>;
};

export function logRuntimeEvent(event: string, fields: Record<string, unknown> = {}) {
  const { safe } = sanitizeObservabilityFields({ event_name: event, ...fields });
  console.log(JSON.stringify(safe));
}

function elapsedSince(value: unknown) {
  const timestamp = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? Math.max(0, Date.now() - timestamp) : null;
}

export function createWorkerHandler(options: WorkerOptions) {
  return async (req: Request): Promise<Response> => {
    const authFailure = requireInternalAuth(req);
    if (authFailure) return authFailure;

    const service = createServiceClient();
    const workerId = req.headers.get("x-worker-id") ?? `${options.queueName}-${crypto.randomUUID()}`;

    const { data: job, error: claimError } = await service.rpc(options.claimRpc, { worker_id: workerId });
    if (claimError) {
      await recordProviderPipelineEvent({
        eventName: "worker_retry_scheduled", severity: "error", workerType: options.queueName,
        state: "retryable_failure", errorCategory: "claim_failed", retryPath: "bounded_queue_retry"
      }).catch(() => undefined);
      return jsonResponse({ claimed: false, error: "claim_failed" }, { status: 500 });
    }
    if (!job?.id) {
      await recordProviderPipelineEvent({
        eventName: "worker_idle", severity: "debug", workerType: options.queueName, state: "idle"
      }).catch(() => undefined);
      return jsonResponse({ claimed: false });
    }

    const commonEvent = {
      workerType: options.queueName,
      jobId: job.id as string,
      workspaceId: job.workspace_id as string | undefined,
      worldId: job.world_id as string | undefined,
      sagaId: job.saga_id as string | undefined,
      sessionId: job.session_id as string | undefined,
      idempotencyIdentifier: job.idempotency_key as string | undefined,
      attemptCount: Number(job.attempts ?? 0),
      queueDelayMs: elapsedSince(job.created_at)
    };
    await recordProviderPipelineEvent({
      eventName: "worker_claimed", severity: "info", ...commonEvent, state: "running"
    }).catch(() => undefined);

    try {
      const startedAt = performance.now();
      const result = await options.handleJob(job);
      if (result.state === "complete") {
        await service.rpc("complete_job_for_worker", {
          p_job_table: options.jobTable,
          p_job_id: job.id,
          p_result: result.result ?? {}
        });
      } else if (result.state !== "managed") {
        await service.rpc("fail_job_for_worker", {
          p_job_table: options.jobTable,
          p_job_id: job.id,
          p_failure_reason: result.reason,
          p_retryable: result.state === "retry",
          p_payload: result.result ?? {}
        });
      }

      const managedOutcome = typeof result.result?.outcome === "string" ? result.result.outcome : "";
      const retryable = result.state === "retry" || managedOutcome === "retryable";
      const terminal = result.state === "failed" || managedOutcome === "terminal" || managedOutcome === "dead_letter";
      const quotaBlocked = managedOutcome === "quota_blocked";
      const eventName = retryable ? "worker_retry_scheduled"
        : terminal ? "worker_terminal_failure" : quotaBlocked ? "quota_blocked" : "worker_completed";
      const state = retryable ? "retryable_failure"
        : terminal ? "terminal_failure" : quotaBlocked ? "quota_blocked" : "success";
      await recordProviderPipelineEvent({
        eventName, severity: state === "success" ? "info" : "warn", ...commonEvent,
        state, errorCategory: state === "success" ? null : "worker_result_failure",
        endToEndLatencyMs: Math.round(performance.now() - startedAt),
        retryPath: retryable ? "bounded_queue_retry" : null
      }).catch(() => undefined);
      return jsonResponse({ claimed: true, job_id: job.id, state: result.state });
    } catch (error) {
      await service.rpc("fail_job_for_worker", {
        p_job_table: options.jobTable,
        p_job_id: job.id,
        p_failure_reason: "worker_handler_exception",
        p_retryable: true,
        p_payload: { worker_purpose: options.workerPurpose }
      });
      await recordProviderPipelineEvent({
        eventName: "worker_retry_scheduled", severity: "error", ...commonEvent,
        state: "retryable_failure", errorCategory: "worker_handler_exception",
        retryPath: "bounded_queue_retry"
      }).catch(() => undefined);
      return jsonResponse({ claimed: true, job_id: job.id, state: "retry" }, { status: 500 });
    }
  };
}
