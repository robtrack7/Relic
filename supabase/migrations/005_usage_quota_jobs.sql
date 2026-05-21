create table if not exists public.usage_events (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid references public.worlds(id) on delete set null,
  saga_id uuid references public.sagas(id) on delete set null,
  actor_gm_id uuid references auth.users(id) on delete set null,
  event_kind text not null,
  task_name text,
  provider text,
  model text,
  units numeric not null default 0,
  unit_type text not null,
  tokens_in int,
  tokens_out int,
  audio_seconds int,
  storage_bytes bigint,
  ai_credits int,
  cost_estimate_usd numeric(10,6),
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_workspace_created_idx on public.usage_events(workspace_id, created_at desc);
create index if not exists usage_events_workspace_kind_idx on public.usage_events(workspace_id, event_kind, created_at desc);
create index if not exists usage_events_saga_kind_idx on public.usage_events(saga_id, event_kind, created_at desc);

create table if not exists public.usage_monthly_rollups (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  ai_credits_used int not null default 0,
  ai_calls int not null default 0,
  heavy_ai_jobs int not null default 0,
  transcription_seconds_used int not null default 0,
  storage_bytes_current bigint not null default 0,
  imports_used int not null default 0,
  exports_used int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, period_start)
);

create table if not exists public.quota_overrides (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  limit_key text not null,
  override_value numeric not null,
  reason text not null,
  expires_at timestamptz,
  created_by_admin_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists quota_overrides_workspace_key_idx on public.quota_overrides(workspace_id, limit_key, expires_at);

create table if not exists internal.embedding_jobs (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null,
  world_id uuid not null,
  saga_id uuid,
  gm_id uuid not null,
  source_kind text not null,
  source_entity_type public.entity_type,
  source_entity_id uuid not null,
  source_id uuid,
  model text not null default 'text-embedding-3-small',
  model_version text not null default 'mvp',
  state text not null default 'pending' check (state in ('pending', 'running', 'complete', 'failed')),
  attempts int not null default 0,
  failure_reason text,
  debounce_until timestamptz not null default now(),
  fanout_root_id uuid,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (source_kind, source_entity_id, model, model_version)
);
create index if not exists embedding_jobs_pending_idx on internal.embedding_jobs(state, debounce_until) where state = 'pending';
create index if not exists embedding_jobs_saga_idx on internal.embedding_jobs(saga_id);

create table if not exists internal.transcription_jobs (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null,
  world_id uuid not null,
  saga_id uuid not null,
  session_id uuid not null,
  gm_id uuid not null,
  state text not null default 'pending' check (state in ('pending', 'running', 'complete', 'failed')),
  attempts int not null default 0,
  failure_reason text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists internal.cleanup_jobs (
  id uuid primary key default public.uuid7(),
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  job_kind text not null check (job_kind in ('audio', 'saga', 'exports')),
  payload jsonb not null default '{}'::jsonb,
  state text not null default 'pending' check (state in ('pending', 'running', 'complete', 'failed')),
  attempts int not null default 0,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists internal.export_jobs (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null,
  world_id uuid not null,
  saga_id uuid not null,
  gm_id uuid not null,
  requested_formats text[] not null default array['json', 'markdown'],
  include_audit boolean not null default false,
  storage_path text,
  state text not null default 'pending' check (state in ('pending', 'running', 'complete', 'failed', 'expired')),
  attempts int not null default 0,
  failure_reason text,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists internal.stale_pipeline_warning_jobs (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null,
  world_id uuid not null,
  saga_id uuid not null,
  pipeline_run_id uuid not null,
  warning_kind text not null check (warning_kind in ('pipeline_stale_30d', 'pipeline_stale_90d')),
  state text not null default 'pending' check (state in ('pending', 'running', 'complete', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists internal.notification_queue (
  id uuid primary key default public.uuid7(),
  gm_id uuid not null,
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  kind public.notification_kind not null,
  payload jsonb not null default '{}'::jsonb,
  channels public.notification_channel[] not null,
  state text not null default 'pending' check (state in ('pending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  failure_reason text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notification_queue_pending_idx on internal.notification_queue(state, scheduled_at) where state = 'pending';

create table if not exists internal.dead_letter_jobs (
  id uuid primary key default public.uuid7(),
  job_table text not null,
  job_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  failure_reason text not null,
  created_at timestamptz not null default now()
);
