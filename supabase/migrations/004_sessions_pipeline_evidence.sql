create table if not exists public.session_pinned_entities (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  entity_type public.entity_type not null,
  entity_id uuid not null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, entity_type, entity_id)
);
create index if not exists session_pinned_entities_scope_idx on public.session_pinned_entities(workspace_id, world_id, saga_id, session_id);

create table if not exists public.session_active_threads (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  thread_id uuid not null references public.threads(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, thread_id)
);
create index if not exists session_active_threads_scope_idx on public.session_active_threads(workspace_id, world_id, saga_id, session_id);

create table if not exists public.transcripts (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  whisper_model text not null,
  language text,
  duration_seconds int,
  state public.transcript_state not null default 'pending',
  failure_reason text,
  segments jsonb not null default '[]'::jsonb,
  original_segments jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists transcripts_scope_idx on public.transcripts(workspace_id, world_id, saga_id, state);

alter table public.sources
  add constraint sources_transcript_id_fkey
  foreign key (transcript_id) references public.transcripts(id) on delete set null;

create table if not exists public.audio_chunks (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  sequence int not null,
  storage_path text not null,
  bytes int,
  duration_seconds numeric,
  client_recorded_at timestamptz not null,
  uploaded_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, sequence)
);
create index if not exists audio_chunks_scope_idx on public.audio_chunks(workspace_id, world_id, saga_id, session_id);

create table if not exists public.session_marked_moments (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  audio_chunk_id uuid references public.audio_chunks(id) on delete set null,
  occurred_at timestamptz not null,
  offset_seconds numeric,
  label text,
  created_at timestamptz not null default now(),
  synced_at timestamptz
);
create index if not exists session_marked_moments_scope_idx on public.session_marked_moments(workspace_id, world_id, saga_id, session_id, occurred_at);

create table if not exists public.pipeline_runs (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  state public.pipeline_state not null default 'queued',
  failure_reason text,
  inputs_summary jsonb not null default '{}'::jsonb,
  summary_note_id uuid references public.notes(id) on delete set null,
  staleness_warned_at timestamptz,
  staleness_nudge_90_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists pipeline_runs_scope_state_idx on public.pipeline_runs(workspace_id, world_id, saga_id, state);

create table if not exists public.dice_rolls (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  expression text not null,
  result_total int not null,
  result_breakdown int[] not null,
  label text,
  created_at timestamptz not null default now()
);
create index if not exists dice_rolls_session_idx on public.dice_rolls(session_id, created_at desc);

create table if not exists public.consent_log (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  granted boolean not null,
  prompted_at timestamptz not null,
  decided_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists consent_log_session_idx on public.consent_log(session_id, created_at desc);

create table if not exists public.workshop_sessions (
  id uuid primary key default public.uuid7(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  world_id uuid references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  path public.workshop_path not null,
  gm_profile_snapshot jsonb not null,
  conversation jsonb not null default '[]'::jsonb,
  draft_payload jsonb not null default '{}'::jsonb,
  state public.workshop_state not null default 'in_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workshop_sessions_user_state_idx on public.workshop_sessions(user_id, state);
create index if not exists workshop_sessions_scope_idx on public.workshop_sessions(workspace_id, world_id, saga_id) where saga_id is not null;
