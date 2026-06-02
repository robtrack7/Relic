import { jsonResponse } from "./http.ts";
import { requireInternalAuth } from "./internal-auth.ts";
import { createServiceClient } from "./service-client.ts";

type HandlerResult =
  | { state: "complete"; result?: Record<string, unknown> }
  | { state: "retry"; reason: string; result?: Record<string, unknown> }
  | { state: "failed"; reason: string; result?: Record<string, unknown> };

type WorkerOptions = {
  queueName: string;
  claimRpc: string;
  jobTable: string;
  workerPurpose: string;
  handleJob: (job: Record<string, unknown>) => Promise<HandlerResult>;
};

function sanitizeLogFields(fields: Record<string, unknown>): Record<string, unknown> {
  const redactedKeys = new Set(["authorization", "token", "secret", "key", "prompt", "content", "body"]);
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      redactedKeys.has(key.toLowerCase()) ? "[redacted]" : value
    ])
  );
}

export function logRuntimeEvent(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...sanitizeLogFields(fields) }));
}

export function createWorkerHandler(options: WorkerOptions) {
  return async (req: Request): Promise<Response> => {
    const authFailure = requireInternalAuth(req);
    if (authFailure) return authFailure;

    const service = createServiceClient();
    const workerId = req.headers.get("x-worker-id") ?? `${options.queueName}-${crypto.randomUUID()}`;

    const { data: job, error: claimError } = await service.rpc(options.claimRpc, { worker_id: workerId });
    if (claimError) {
      logRuntimeEvent("job_claim_failed", { queue: options.queueName, reason: claimError.message });
      return jsonResponse({ claimed: false, error: "claim_failed" }, { status: 500 });
    }
    if (!job?.id) {
      return jsonResponse({ claimed: false });
    }

    try {
      const result = await options.handleJob(job);
      if (result.state === "complete") {
        await service.rpc("complete_job", {
          p_job_table: options.jobTable,
          p_job_id: job.id,
          p_result: result.result ?? {}
        });
      } else {
        await service.rpc("fail_job", {
          p_job_table: options.jobTable,
          p_job_id: job.id,
          p_failure_reason: result.reason,
          p_retryable: result.state === "retry",
          p_payload: result.result ?? {}
        });
      }

      logRuntimeEvent("job_handled", { queue: options.queueName, job_id: job.id, state: result.state });
      return jsonResponse({ claimed: true, job_id: job.id, state: result.state });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "worker handler failed";
      await service.rpc("fail_job", {
        p_job_table: options.jobTable,
        p_job_id: job.id,
        p_failure_reason: reason,
        p_retryable: true,
        p_payload: { worker_purpose: options.workerPurpose }
      });
      logRuntimeEvent("job_handler_exception", { queue: options.queueName, job_id: job.id, reason });
      return jsonResponse({ claimed: true, job_id: job.id, state: "retry" }, { status: 500 });
    }
  };
}
