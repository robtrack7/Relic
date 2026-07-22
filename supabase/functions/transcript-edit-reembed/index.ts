import { createEmbeddingWorkerHandler } from "../_shared/embedding-worker.ts";

Deno.serve(createEmbeddingWorkerHandler(
  "claim_transcript_embedding_job_for_worker",
  "transcript_edit_reembed",
));
