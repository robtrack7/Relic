import { createWorkerHandler } from "../_shared/worker.ts";

Deno.serve(createWorkerHandler({
  queueName: "transcription_jobs",
  claimRpc: "claim_transcription_job",
  jobTable: "transcription_jobs",
  workerPurpose: "transcribe_session",
  async handleJob() {
    return {
      state: "retry",
      reason: "transcription provider handler is not configured in Module 8"
    };
  }
}));
