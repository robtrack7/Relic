export type AiTaskRun = {
  id: string;
  workspace_id: string;
  world_id: string;
  saga_id: string | null;
  session_id: string | null;
  gm_id: string | null;
  task_name: string;
  prompt_version: string;
  quota_tier: string;
  ai_credits: number;
  model_tier: "relic-fast" | "relic-balanced" | "relic-deep";
  resolved_model: string | null;
  resolved_provider: string | null;
  retrieval_profile: string;
  source_policy: string;
  output_mode: string;
  input_payload: Record<string, unknown>;
  allowed_source_ids: string[];
};

export type AiProviderRequest = {
  taskRun: AiTaskRun;
  retrievalContext: unknown[];
  repair?: {
    invalidOutput: unknown;
    validationErrors: string[];
    allowedSourceIds: string[];
  };
};

export type AiProviderResult = {
  output: unknown;
  resolvedModel: string;
  provider: string;
  tokensIn?: number;
  tokensOut?: number;
  costEstimateUsd?: number;
};
