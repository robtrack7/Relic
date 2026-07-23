import { createWorkerHandler } from "../_shared/worker.ts";
import { createScopedClient } from "../_shared/scoped-client.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import { callTranscriptionProvider, TranscriptionProviderError } from "../_shared/transcription-provider.ts";
import { recordProviderPipelineEvent } from "../_shared/observability.ts";

type TranscriptionJob = {
  id: string;
  workspace_id: string;
  world_id: string;
  saga_id: string;
  session_id: string;
  gm_id: string;
  attempts?: number;
  idempotency_key?: string;
};

function extensionFor(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension && ["webm", "m4a", "mp3", "wav"].includes(extension) ? extension : "webm";
}

function mimeFor(extension: string) {
  if (extension === "m4a") return "audio/mp4";
  if (extension === "mp3") return "audio/mpeg";
  if (extension === "wav") return "audio/wav";
  return "audio/webm";
}

Deno.serve(createWorkerHandler({
  queueName: "transcription_jobs",
  claimRpc: "claim_transcription_job_for_worker",
  jobTable: "transcription_jobs",
  workerPurpose: "transcribe_session",
  async handleJob(rawJob) {
    const job = rawJob as TranscriptionJob;
    const scoped = await createScopedClient(job.gm_id, "transcribe_session", job.saga_id);
    const service = createServiceClient();

    const { data: session, error: sessionError } = await scoped
      .from("sessions")
      .select("audio_chunk_count_expected, recording_finalized_at")
      .eq("id", job.session_id)
      .eq("workspace_id", job.workspace_id)
      .eq("world_id", job.world_id)
      .eq("saga_id", job.saga_id)
      .maybeSingle();
    if (sessionError) return { state: "retry", reason: "Session evidence could not be read." };

    const { data: chunks, error: chunkError } = await scoped
      .from("audio_chunks")
      .select("sequence, storage_path")
      .eq("workspace_id", job.workspace_id)
      .eq("world_id", job.world_id)
      .eq("saga_id", job.saga_id)
      .eq("session_id", job.session_id)
      .is("deleted_at", null)
      .order("sequence", { ascending: true });
    if (chunkError) return { state: "retry", reason: "Audio evidence could not be read." };

    const orderedChunks = chunks ?? [];
    const expected = Number(session?.audio_chunk_count_expected ?? 0);
    if (!session) return { state: "retry", reason: "Recording session is not visible to the scoped worker." };
    if (!session.recording_finalized_at) return { state: "retry", reason: "Recording is not finalized." };
    if (expected <= 0) return { state: "retry", reason: "Recording expected chunk count is missing." };
    if (orderedChunks.length < expected) return { state: "retry", reason: "Recording chunk count is incomplete." };

    const parts: Blob[] = [];
    for (const chunk of orderedChunks) {
      const { data, error } = await scoped.storage.from("audio").download(chunk.storage_path);
      if (error || !data) return { state: "retry", reason: `Audio chunk ${chunk.sequence} could not be downloaded.` };
      parts.push(data);
    }

    const extension = extensionFor(orderedChunks[0].storage_path);
    const audio = new File(parts, `session-${job.session_id}.${extension}`, { type: mimeFor(extension) });

    try {
      const providerStartedAt = performance.now();
      await recordProviderPipelineEvent({
        eventName: "provider_call_started", workerType: "transcription", jobId: job.id,
        workspaceId: job.workspace_id, worldId: job.world_id, sagaId: job.saga_id,
        sessionId: job.session_id, idempotencyIdentifier: job.idempotency_key,
        attemptCount: Number(job.attempts ?? 0), state: "running",
        providerAlias: "relic-transcribe", inputUnits: audio.size, inputUnitType: "byte"
      }).catch(() => undefined);
      const result = await callTranscriptionProvider(audio);
      const providerLatencyMs = Math.round(performance.now() - providerStartedAt);
      const durationSeconds = Math.max(0, Math.ceil(result.durationSeconds));
      const { error: completionError } = await service.rpc("complete_transcription_job_for_worker", {
        p_job_id: job.id,
        p_segments: result.segments,
        p_whisper_model: result.resolvedModel,
        p_language: result.language,
        p_duration_seconds: durationSeconds,
      });
      if (completionError) return { state: "retry", reason: "Transcription result could not be saved." };

      const { error: usageError } = await scoped.rpc("record_usage_event", {
        p_workspace_id: job.workspace_id,
        p_world_id: job.world_id,
        p_saga_id: job.saga_id,
        p_event_kind: "transcription_job",
        p_units: durationSeconds,
        p_unit_type: "second",
        p_idempotency_key: `transcription-job:${job.id}`,
        p_metadata: {
          audio_seconds: durationSeconds,
          model: result.resolvedModel,
          provider: result.provider,
          provider_alias: result.alias,
          user_charge: true,
        },
      });

      await recordProviderPipelineEvent({
        eventName: usageError ? "metering_conflict" : "transcription_completed",
        severity: usageError ? "error" : "info", workerType: "transcription", jobId: job.id,
        workspaceId: job.workspace_id, worldId: job.world_id, sagaId: job.saga_id,
        sessionId: job.session_id, idempotencyIdentifier: job.idempotency_key,
        attemptCount: Number(job.attempts ?? 0), state: usageError ? "retryable_failure" : "success",
        providerAlias: result.alias, resolvedModel: result.resolvedModel, provider: result.provider,
        providerLatencyMs, inputUnits: audio.size, inputUnitType: "byte",
        outputUnits: result.segments.length, outputUnitType: "segment",
        usageUnits: durationSeconds, usageUnitType: "second",
        errorCategory: usageError ? "metering_persistence_failed" : null,
        safeMetadata: {
          provider_request_id_present: Boolean(result.requestId),
          billable: result.billable,
          metered: !usageError
        }
      }).catch(() => undefined);

      return {
        state: "complete",
        result: usageError ? { metering_warning: true } : { duration_seconds: durationSeconds },
      };
    } catch (error) {
      if (error instanceof TranscriptionProviderError) {
        await recordProviderPipelineEvent({
          eventName: error.category === "configuration" ? "configuration_rejected" : "provider_call_failed",
          severity: "error", workerType: "transcription", jobId: job.id,
          workspaceId: job.workspace_id, worldId: job.world_id, sagaId: job.saga_id,
          sessionId: job.session_id, idempotencyIdentifier: job.idempotency_key,
          attemptCount: Number(job.attempts ?? 0),
          state: error.retryable ? "retryable_failure" : "terminal_failure",
          providerAlias: "relic-transcribe", errorCategory: error.category,
          retryPath: error.retryable ? "bounded_queue_retry" : null
        }).catch(() => undefined);
        return { state: error.retryable ? "retry" : "failed", reason: error.category };
      }
      return { state: "retry", reason: "transcription_internal_failure" };
    }
  }
}));
