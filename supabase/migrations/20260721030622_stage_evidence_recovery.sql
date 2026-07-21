create extension if not exists pg_cron with schema pg_catalog;

alter table public.sessions
  add column if not exists audio_chunk_count_expected integer,
  add column if not exists recording_finalized_at timestamptz;

create or replace function internal.maybe_enqueue_session_transcription(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  session_row public.sessions%rowtype;
  owner_id uuid;
  registered_count integer;
  transcript_id uuid;
  job_id uuid;
begin
  select * into session_row
  from public.sessions s
  where s.id = p_session_id
  for update;

  if session_row.id is null
    or session_row.status <> 'ended'
    or session_row.recording_finalized_at is null
    or coalesce(session_row.audio_chunk_count_expected, 0) <= 0 then
    return null;
  end if;

  select count(*) into registered_count
  from public.audio_chunks ac
  where ac.session_id = session_row.id;

  if registered_count < session_row.audio_chunk_count_expected then
    return null;
  end if;

  select s.owner_gm_id into owner_id
  from public.sagas s
  where s.id = session_row.saga_id;

  insert into public.transcripts (workspace_id, world_id, saga_id, session_id, whisper_model, state)
  values (session_row.workspace_id, session_row.world_id, session_row.saga_id, session_row.id, 'pending', 'pending')
  on conflict on constraint transcripts_session_id_key do update
    set state = case when public.transcripts.state = 'failed' then 'pending'::public.transcript_state else public.transcripts.state end,
        failure_reason = case when public.transcripts.state = 'failed' then null else public.transcripts.failure_reason end,
        updated_at = now()
  returning id into transcript_id;

  insert into internal.transcription_jobs (workspace_id, world_id, saga_id, session_id, gm_id, state, idempotency_key)
  values (session_row.workspace_id, session_row.world_id, session_row.saga_id, session_row.id, owner_id, 'pending', 'transcription:' || session_row.id::text)
  on conflict on constraint transcription_jobs_idempotency_key_key do update
    set state = case when internal.transcription_jobs.state = 'failed' then 'pending' else internal.transcription_jobs.state end,
        failure_reason = null,
        updated_at = now()
  returning id into job_id;

  update public.pipeline_runs pr
  set inputs_summary = coalesce(pr.inputs_summary, '{}'::jsonb) || jsonb_build_object(
        'audio_chunk_count', registered_count,
        'audio_upload_complete', true,
        'transcript_id', transcript_id
      ),
      updated_at = now()
  where pr.session_id = session_row.id;

  return job_id;
end;
$$;

create or replace function public.finalize_audio_upload(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  expected_chunks integer
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  session_state public.session_status;
begin
  perform public.assert_saga_access($1, $2, $3);

  if expected_chunks < 0 then
    raise exception 'expected audio chunk count must be non-negative' using errcode = '23514';
  end if;

  select s.status into session_state
  from public.sessions s
  where s.id = finalize_audio_upload.session_id
    and s.workspace_id = $1
    and s.world_id = $2
    and s.saga_id = $3
  for update;

  if session_state is null then
    raise exception 'Session is not available' using errcode = '42501';
  end if;
  if session_state not in ('started', 'in_progress', 'ended_pending_undo', 'ended') then
    raise exception 'audio upload can only finalize for a started or completed Stage session' using errcode = '23514';
  end if;

  update public.sessions s
  set audio_chunk_count_expected = greatest(coalesce(s.audio_chunk_count_expected, 0), expected_chunks),
      recording_finalized_at = coalesce(s.recording_finalized_at, now()),
      updated_at = now()
  where s.id = finalize_audio_upload.session_id;

  perform internal.maybe_enqueue_session_transcription(finalize_audio_upload.session_id);
  return finalize_audio_upload.session_id;
end;
$$;

create or replace function public.register_audio_chunk(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  sequence integer,
  storage_path text,
  bytes bigint,
  duration_seconds numeric,
  client_recorded_at timestamptz,
  idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  existing_id uuid;
  inserted_id uuid;
  session_state public.session_status;
  clean_extension text;
  expected_path text;
  charge_key text;
begin
  perform public.assert_saga_access($1, $2, $3);

  select ac.id into existing_id
  from public.audio_chunks ac
  where ac.session_id = register_audio_chunk.session_id
    and ac.sequence = register_audio_chunk.sequence;
  if existing_id is not null then return existing_id; end if;

  if sequence < 0 then
    raise exception 'audio chunk sequence must be non-negative' using errcode = '23514';
  end if;
  if bytes is null or bytes <= 0 or bytes > 52428800 then
    raise exception 'audio chunk byte size is outside the supported range' using errcode = '23514';
  end if;
  if duration_seconds is not null and duration_seconds < 0 then
    raise exception 'audio chunk duration must be non-negative' using errcode = '23514';
  end if;

  clean_extension := lower(regexp_replace(storage_path, '^.*\.([^.]+)$', '\1'));
  if clean_extension not in ('webm', 'm4a', 'mp3', 'wav') then
    raise exception 'unsupported audio extension' using errcode = '23514';
  end if;
  expected_path := internal.audio_storage_path($1, $2, $3, register_audio_chunk.session_id, sequence, clean_extension);
  if storage_path <> expected_path then
    raise exception 'storage path does not match the requested scope/session/sequence' using errcode = '23514';
  end if;

  select s.status into session_state
  from public.sessions s
  where s.id = register_audio_chunk.session_id
    and s.workspace_id = $1
    and s.world_id = $2
    and s.saga_id = $3
  for update;

  if session_state is null then
    raise exception 'Session is not available' using errcode = '42501';
  end if;
  if session_state not in ('started', 'in_progress', 'ended_pending_undo', 'ended') then
    raise exception 'audio chunks can only be registered for a started or completed Stage session' using errcode = '23514';
  end if;

  insert into public.audio_chunks (
    workspace_id, world_id, saga_id, session_id, sequence, storage_path,
    bytes, duration_seconds, client_recorded_at, uploaded_at
  ) values (
    $1, $2, $3, register_audio_chunk.session_id, sequence, storage_path,
    bytes::int, duration_seconds, client_recorded_at, now()
  ) returning id into inserted_id;

  update public.sessions s
  set status = case when s.status = 'started' then 'in_progress'::public.session_status else s.status end,
      went_live_at = case when s.status = 'started' then coalesce(s.went_live_at, now()) else s.went_live_at end,
      started_at = coalesce(s.started_at, now()),
      updated_at = now()
  where s.id = register_audio_chunk.session_id;

  charge_key := coalesce(nullif(trim(idempotency_key), ''), 'audio_chunk:' || register_audio_chunk.session_id::text || ':' || sequence::text);
  perform public.record_usage_event(
    $1, $2, $3, 'storage_upload', bytes, 'byte', charge_key,
    jsonb_build_object('storage_bytes', bytes, 'source', 'audio_chunk', 'audio_chunk_id', inserted_id)
  );
  perform internal.maybe_enqueue_session_transcription(register_audio_chunk.session_id);
  return inserted_id;
exception
  when unique_violation then
    select ac.id into existing_id
    from public.audio_chunks ac
    where ac.session_id = register_audio_chunk.session_id
      and ac.sequence = register_audio_chunk.sequence;
    if existing_id is not null then return existing_id; end if;
    raise;
end;
$$;

create or replace function internal.maybe_enqueue_stage_transcription_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
begin
  if new.status = 'ended' and old.status is distinct from new.status then
    perform internal.maybe_enqueue_session_transcription(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists maybe_enqueue_stage_transcription on public.sessions;
create trigger maybe_enqueue_stage_transcription
after update of status on public.sessions
for each row execute function internal.maybe_enqueue_stage_transcription_trigger();

create or replace function internal.finalize_expired_stage_sessions(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  session_row public.sessions%rowtype;
  capture_count integer;
  moment_count integer;
  finalized_count integer := 0;
begin
  for session_row in
    select * from public.sessions s
    where s.status = 'ended_pending_undo'
      and s.ended_pending_undo_at <= p_now - interval '60 seconds'
    for update skip locked
  loop
    update public.sessions s
    set status = 'ended',
        ended_at = coalesce(s.ended_at, p_now),
        updated_at = p_now
    where s.id = session_row.id;

    select count(*) into capture_count from public.sources src where src.session_id = session_row.id and src.kind = 'note';
    select count(*) into moment_count from public.session_marked_moments m where m.session_id = session_row.id;
    insert into public.pipeline_runs (workspace_id, world_id, saga_id, session_id, state, inputs_summary)
    select session_row.workspace_id, session_row.world_id, session_row.saga_id, session_row.id, 'queued',
      jsonb_build_object('capture_count', capture_count, 'marked_moment_count', moment_count)
    where not exists (select 1 from public.pipeline_runs pr where pr.session_id = session_row.id);

    perform internal.maybe_enqueue_session_transcription(session_row.id);
    finalized_count := finalized_count + 1;
  end loop;
  return finalized_count;
end;
$$;

select cron.schedule(
  'relic-finalize-stage-sessions',
  '* * * * *',
  'select internal.finalize_expired_stage_sessions();'
);

revoke all on function public.finalize_audio_upload(uuid, uuid, uuid, uuid, integer) from public, anon;
grant execute on function public.finalize_audio_upload(uuid, uuid, uuid, uuid, integer) to authenticated;
revoke all on function internal.maybe_enqueue_session_transcription(uuid) from public, anon, authenticated;
revoke all on function internal.finalize_expired_stage_sessions(timestamptz) from public, anon, authenticated;
