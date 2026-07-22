import { createEmbeddingWorkerHandler } from "../_shared/embedding-worker.ts";

Deno.serve(createEmbeddingWorkerHandler("claim_embedding_job_for_worker", "embed_row"));
