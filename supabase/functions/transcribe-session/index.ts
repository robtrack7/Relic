import { createWorkerHandler } from "../_shared/worker.ts";
import { createScopedClient } from "../_shared/scoped-client.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import { callTranscriptionProvider, TranscriptionProviderError } from "../_shared/transcription-provider.ts";

type TranscriptionJob = {
  id: string;
  workspace_id: string;
  world_id: string;
  saga_id: string;
  session_id: string;
  gm_id: string;
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
    const scoped = await createScopedClient(job.gm_id, "transcribe_session");
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
    if (!session?.recording_finalized_at || expected <= 0 || orderedChunks.length < expected) {
      return { state: "retry", reason: "Recording evidence is not complete yet." };
    }

    const parts: Blob[] = [];
    for (const chunk of orderedChunks) {
      const { data, error } = await scoped.storage.from("audio").download(chunk.storage_path);
      if (error || !data) return { state: "retry", reason: `Audio chunk ${chunk.sequence} could not be downloaded.` };
      parts.push(data);
    }

    const extension = extensionFor(orderedChunks[0].storage_path);
    const audio = new File(parts, `session-${job.session_id}.${extension}`, { type: mimeFor(extension) });

    try {
      const result = await callTranscriptionProvider(audio);
      const durationSeconds = Math.max(0, Math.ceil(result.durationSeconds));
      const { error: completionError } = await service.rpc("complete_transcription_job_for_worker", {
        p_job_id: job.id,
        p_segments: result.segments,
        p_whisper_model: result.model,
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
          model: result.model,
          provider: "configured-transcription-provider",
          user_charge: true,
        },
      });

      return {
        state: "complete",
        result: usageError ? { metering_warning: true } : { duration_seconds: durationSeconds },
      };
    } catch (error) {
      if (error instanceof TranscriptionProviderError) {
        return { state: error.retryable ? "retry" : "failed", reason: error.message };
      }
      return { state: "retry", reason: error instanceof Error ? error.message : "Transcription failed." };
    }
  }
}));
