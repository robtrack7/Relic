create table if not exists public.gm_profiles (
  id uuid primary key default public.uuid7(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  experience_level text not null default 'new' check (experience_level in ('new', 'returning', 'experienced', 'veteran')),
  improv_comfort text not null default 'mixed' check (improv_comfort in ('planner', 'mixed', 'improv_first')),
  prep_style text not null default 'mixed' check (prep_style in ('heavy', 'mixed', 'light')),
  default_game_system text,
  notification_preferences jsonb not null default '{
    "email": {"pipeline_ready": true, "pipeline_failed": true, "pipeline_stale_30d": true, "pipeline_stale_90d": true},
    "push": {"pipeline_ready": true, "pipeline_failed": true, "transcription_complete": false, "synthesis_in_progress": false},
    "paused": false
  }'::jsonb,
  session_prep_intro_dismissed_at timestamptz,
  synthesize_nudge_dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default public.uuid7(),
  owner_gm_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Workspace',
  billing_customer_id text,
  usage_limits jsonb not null default '{
    "plan": "alpha_invite",
    "ai_credits_monthly": 1000,
    "transcription_seconds_monthly": 54000,
    "storage_bytes": 10737418240,
    "worlds_active": 3,
    "sagas_active": 10,
    "entities_per_saga": 1000,
    "imports_monthly": 100,
    "exports_monthly": 50,
    "alpha_soft_limit": true
  }'::jsonb,
  ai_provider_defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists workspaces_owner_gm_id_idx on public.workspaces(owner_gm_id);

create table if not exists public.worlds (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_gm_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  summary text,
  default_game_system text,
  world_ai_context text,
  source_import_defaults jsonb not null default '{}'::jsonb,
  schema_version int not null default 1,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists worlds_workspace_id_idx on public.worlds(workspace_id);
create index if not exists worlds_owner_gm_id_idx on public.worlds(owner_gm_id);

create table if not exists public.world_eras (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  name text not null,
  summary text,
  sort_order int not null default 0,
  starts_at_index bigint,
  ends_at_index bigint,
  display_date_range text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_eras_range_check check (starts_at_index is null or ends_at_index is null or starts_at_index <= ends_at_index)
);
create index if not exists world_eras_workspace_world_idx on public.world_eras(workspace_id, world_id);

create table if not exists public.sagas (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  owner_gm_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  premise text,
  game_system text,
  game_system_id uuid,
  primary_era_id uuid references public.world_eras(id) on delete set null,
  starts_at_index bigint,
  display_start_date text,
  gm_profile_override jsonb,
  audio_retention text not null default 'delete_after_transcription' check (audio_retention in ('delete_after_transcription', 'retain')),
  transcript_retention text not null default 'retain' check (transcript_retention in ('retain', 'delete_after_synthesis')),
  entity_count_cache int not null default 0,
  schema_version int not null default 1,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists sagas_workspace_world_idx on public.sagas(workspace_id, world_id);
create index if not exists sagas_owner_gm_id_idx on public.sagas(owner_gm_id);

create table if not exists public.push_devices (
  id uuid primary key default public.uuid7(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform public.push_platform not null,
  device_name text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);
create index if not exists push_devices_user_id_idx on public.push_devices(user_id);
