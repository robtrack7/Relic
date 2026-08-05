export type AiTaskRun = {
  id: string;
  workspace_id: string;
  world_id: string | null;
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
  provider_alias?: string | null;
  retrieval_profile: string;
  source_policy: string;
  output_mode: string;
  status?: "pending" | "running" | "retryable" | "complete" | "failed" | "terminal" | "dead_letter";
  claim_state?: "claimed" | "busy" | "not_due" | "complete" | "terminal";
  attempts?: number;
  max_attempts?: number;
  repair_attempts?: number;
  input_payload: Record<string, unknown>;
  allowed_source_ids: string[];
  guide_thread_id?: string | null;
  guide_turn_id?: string | null;
  prep_ai_request_id?: string | null;
  workshop_session_id?: string | null;
  retrieval_context?: Array<{
    source_id: string;
    text: string;
    source_version?: string | null;
    source_kind?: string | null;
    source_entity_type?: string | null;
    source_entity_id?: string | null;
    title?: string | null;
  }>;
  output_payload?: Record<string, unknown> | null;
  scheduled_at?: string;
  provider_completed_at?: string | null;
  provider_tokens_in?: number | null;
  provider_tokens_out?: number | null;
  provider_cost_estimate_usd?: number | null;
  provider_cost_estimate_complete?: boolean;
  provider_completions?: number;
  provider_billable?: boolean | null;
  provider_request_id_present?: boolean;
  usage_event_id?: string | null;
  created_at?: string;
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
  alias: string;
  resolvedModel: string;
  provider: string;
  requestId?: string | null;
  tokensIn?: number;
  tokensOut?: number;
  costEstimateUsd?: number;
  costEstimateComplete: boolean;
  costEstimateSource: "proxy_or_local_upper_bound" | "deterministic_test" | "unavailable";
  billable: boolean;
};
