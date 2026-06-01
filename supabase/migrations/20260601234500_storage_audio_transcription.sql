alter table internal.cleanup_jobs
  add column if not exists idempotency_key text;

create unique index if not exists cleanup_jobs_idempotency_key_idx
  on internal.cleanup_jobs(idempotency_key)
  where idempotency_key is not null;

create or replace function internal.audio_storage_path(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_session_id uuid,
  p_sequence integer,
  p_extension text
)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select concat_ws(
    '/',
    p_workspace_id::text,
    p_world_id::text,
    p_saga_id::text,
    p_session_id::text,
    p_sequence::text || '.' || lower(trim(leading '.' from p_extension))
  );
$$;

create or replace function internal.enqueue_cleanup_job(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_job_kind text,
  p_payload jsonb,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  job_id uuid;
begin
  insert into internal.cleanup_jobs (workspace_id, world_id, saga_id, job_kind, payload, idempotency_key)
  values (p_workspace_id, p_world_id, p_saga_id, p_job_kind, coalesce(p_payload, '{}'::jsonb), p_idempotency_key)
  on conflict (idempotency_key) where idempotency_key is not null do update
    set payload = internal.cleanup_jobs.payload || excluded.payload
  returning id into job_id;

  return job_id;
end;
$$;

create or replace function public.get_audio_upload_target(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  sequence integer,
  extension text,
  bytes bigint default null
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare
  clean_extension text := lower(trim(leading '.' from coalesce(extension, '')));
  max_bytes bigint := 52428800;
begin
  perform public.assert_saga_access($1, $2, $3);

  if sequence < 0 then
    raise exception 'audio chunk sequence must be non-negative' using errcode = '23514';
  end if;
  if clean_extension not in ('webm', 'm4a', 'mp3', 'wav') then
    raise exception 'unsupported audio extension' using errcode = '23514';
  end if;
  if bytes is not null and (bytes <= 0 or bytes > max_bytes) then
    raise exception 'audio chunk byte size is outside the supported range' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.sessions s
    where s.id = get_audio_upload_target.session_id
      and s.workspace_id = $1
      and s.world_id = $2
      and s.saga_id = $3
  ) then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'bucket', 'audio',
    'storage_path', internal.audio_storage_path($1, $2, $3, get_audio_upload_target.session_id, sequence, clean_extension),
    'sequence', sequence,
    'extension', clean_extension,
    'max_bytes', max_bytes
  );
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

  if existing_id is not null then
    return existing_id;
  end if;

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
  if session_state not in ('started', 'in_progress') then
    raise exception 'audio chunks can only be registered for started or in-progress sessions' using errcode = '23514';
  end if;

  insert into public.audio_chunks (
    workspace_id,
    world_id,
    saga_id,
    session_id,
    sequence,
    storage_path,
    bytes,
    duration_seconds,
    client_recorded_at,
    uploaded_at
  )
  values ($1, $2, $3, register_audio_chunk.session_id, sequence, storage_path, bytes::int, duration_seconds, client_recorded_at, now())
  returning id into inserted_id;

  update public.sessions s
  set status = case when s.status = 'started' then 'in_progress'::public.session_status else s.status end,
      went_live_at = case when s.status = 'started' then coalesce(s.went_live_at, now()) else s.went_live_at end,
      started_at = coalesce(s.started_at, now()),
      updated_at = now()
  where s.id = register_audio_chunk.session_id;

  charge_key := coalesce(nullif(trim(idempotency_key), ''), 'audio_chunk:' || register_audio_chunk.session_id::text || ':' || sequence::text);
  perform public.record_usage_event(
    $1,
    $2,
    $3,
    'storage_upload',
    bytes,
    'byte',
    charge_key,
    jsonb_build_object('storage_bytes', bytes, 'source', 'audio_chunk', 'audio_chunk_id', inserted_id)
  );

  return inserted_id;
exception
  when unique_violation then
    select ac.id into existing_id
    from public.audio_chunks ac
    where ac.session_id = register_audio_chunk.session_id
      and ac.sequence = register_audio_chunk.sequence;

    if existing_id is not null then
      return existing_id;
    end if;

    raise;
end;
$$;

create or replace function public.enqueue_transcription_job(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  transcript_id uuid;
  job_id uuid;
  job_key text := coalesce(nullif(trim(idempotency_key), ''), 'transcription:' || session_id::text);
begin
  perform public.assert_saga_access($1, $2, $3);

  if not exists (
    select 1 from public.sessions s
    where s.id = enqueue_transcription_job.session_id
      and s.workspace_id = $1
      and s.world_id = $2
      and s.saga_id = $3
  ) then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  insert into public.transcripts (workspace_id, world_id, saga_id, session_id, whisper_model, state)
  values ($1, $2, $3, enqueue_transcription_job.session_id, 'pending', 'pending')
  on conflict on constraint transcripts_session_id_key do update
    set state = case when public.transcripts.state = 'failed' then 'pending'::public.transcript_state else public.transcripts.state end,
        failure_reason = case when public.transcripts.state = 'failed' then null else public.transcripts.failure_reason end,
        updated_at = now()
  returning id into transcript_id;

  insert into internal.transcription_jobs (workspace_id, world_id, saga_id, session_id, gm_id, state, idempotency_key)
  values ($1, $2, $3, enqueue_transcription_job.session_id, auth.uid(), 'pending', job_key)
  on conflict on constraint transcription_jobs_idempotency_key_key do update
    set state = case when internal.transcription_jobs.state = 'failed' then 'pending' else internal.transcription_jobs.state end,
        failure_reason = null,
        updated_at = now()
  returning id into job_id;

  return job_id;
end;
$$;

create or replace function internal.complete_transcription_job(
  p_job_id uuid,
  p_segments jsonb,
  p_whisper_model text,
  p_language text,
  p_duration_seconds integer
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  job_row internal.transcription_jobs%rowtype;
  transcript_id uuid;
  cleanup_payload jsonb;
begin
  select * into job_row
  from internal.transcription_jobs tj
  where tj.id = p_job_id
  for update;

  if job_row.id is null then
    raise exception 'Transcription job is not available';
  end if;

  update public.transcripts t
  set whisper_model = coalesce(nullif(p_whisper_model, ''), 'unknown'),
      language = p_language,
      duration_seconds = p_duration_seconds,
      state = 'complete',
      failure_reason = null,
      segments = coalesce(p_segments, '[]'::jsonb),
      updated_at = now()
  where t.workspace_id = job_row.workspace_id
    and t.world_id = job_row.world_id
    and t.saga_id = job_row.saga_id
    and t.session_id = job_row.session_id
  returning t.id into transcript_id;

  if transcript_id is null then
    raise exception 'Transcript is not available for job';
  end if;

  update internal.transcription_jobs tj
  set state = 'complete',
      failure_reason = null,
      completed_at = now(),
      updated_at = now()
  where tj.id = p_job_id;

  update public.pipeline_runs pr
  set inputs_summary = coalesce(pr.inputs_summary, '{}'::jsonb) || jsonb_build_object('transcript_id', transcript_id, 'transcript_failed', false),
      updated_at = now()
  where pr.session_id = job_row.session_id
    and pr.workspace_id = job_row.workspace_id
    and pr.world_id = job_row.world_id
    and pr.saga_id = job_row.saga_id;

  if exists (
    select 1
    from public.sagas s
    where s.id = job_row.saga_id
      and s.audio_retention = 'delete_after_transcription'
  ) then
    select jsonb_build_object(
      'transcript_id', transcript_id,
      'session_id', job_row.session_id,
      'bucket', 'audio',
      'storage_paths', coalesce(jsonb_agg(ac.storage_path order by ac.sequence), '[]'::jsonb)
    )
    into cleanup_payload
    from public.audio_chunks ac
    where ac.session_id = job_row.session_id
      and ac.deleted_at is null;

    perform internal.enqueue_cleanup_job(
      job_row.workspace_id,
      job_row.world_id,
      job_row.saga_id,
      'audio',
      cleanup_payload,
      'cleanup:audio:' || transcript_id::text
    );
  end if;

  return transcript_id;
end;
$$;

create or replace function internal.fail_transcription_job(
  p_job_id uuid,
  p_failure_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  job_row internal.transcription_jobs%rowtype;
  transcript_id uuid;
begin
  select * into job_row
  from internal.transcription_jobs tj
  where tj.id = p_job_id
  for update;

  if job_row.id is null then
    raise exception 'Transcription job is not available';
  end if;

  update public.transcripts t
  set state = 'failed',
      failure_reason = coalesce(nullif(p_failure_reason, ''), 'transcription failed'),
      updated_at = now()
  where t.workspace_id = job_row.workspace_id
    and t.world_id = job_row.world_id
    and t.saga_id = job_row.saga_id
    and t.session_id = job_row.session_id
  returning t.id into transcript_id;

  update internal.transcription_jobs tj
  set state = 'failed',
      failure_reason = coalesce(nullif(p_failure_reason, ''), 'transcription failed'),
      updated_at = now()
  where tj.id = p_job_id;

  update public.pipeline_runs pr
  set inputs_summary = coalesce(pr.inputs_summary, '{}'::jsonb) || jsonb_build_object('transcript_failed', true, 'transcript_failure_reason', coalesce(nullif(p_failure_reason, ''), 'transcription failed')),
      updated_at = now()
  where pr.session_id = job_row.session_id
    and pr.workspace_id = job_row.workspace_id
    and pr.world_id = job_row.world_id
    and pr.saga_id = job_row.saga_id;

  return transcript_id;
end;
$$;

create or replace function public.update_transcript_segments(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  transcript_id uuid,
  segments jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_transcript public.transcripts%rowtype;
  old_segment jsonb;
  new_segment jsonb;
  segment_count int;
  idx int;
  segment_key text;
begin
  perform public.assert_saga_access($1, $2, $3);

  select * into current_transcript
  from public.transcripts t
  where t.id = update_transcript_segments.transcript_id
    and t.workspace_id = $1
    and t.world_id = $2
    and t.saga_id = $3
  for update;

  if current_transcript.id is null then
    raise exception 'Transcript is not available' using errcode = '42501';
  end if;
  if jsonb_typeof(segments) <> 'array' then
    raise exception 'segments must be an array' using errcode = '23514';
  end if;

  segment_count := jsonb_array_length(current_transcript.segments);
  if jsonb_array_length(segments) <> segment_count then
    raise exception 'transcript segment count is immutable' using errcode = '23514';
  end if;

  for idx in 0..greatest(segment_count - 1, 0) loop
    old_segment := current_transcript.segments -> idx;
    new_segment := segments -> idx;

    for segment_key in select jsonb_object_keys(new_segment) loop
      if segment_key not in ('start', 'end', 'text', 'deleted') then
        raise exception 'only transcript segment text and deleted state may change' using errcode = '23514';
      end if;
    end loop;

    if (old_segment ->> 'start')::numeric <> (new_segment ->> 'start')::numeric
      or (old_segment ->> 'end')::numeric <> (new_segment ->> 'end')::numeric then
      raise exception 'segment boundaries are immutable' using errcode = '23514';
    end if;
  end loop;

  update public.transcripts t
  set original_segments = coalesce(t.original_segments, t.segments),
      segments = update_transcript_segments.segments,
      edited_at = now(),
      updated_at = now()
  where t.id = update_transcript_segments.transcript_id
  returning t.id into transcript_id;

  -- Module 8 workers use this marker to batch transcript re-embedding without doing provider work in the edit transaction.
  update public.pipeline_runs pr
  set inputs_summary = coalesce(pr.inputs_summary, '{}'::jsonb) || jsonb_build_object('transcript_edited', true, 'transcript_edit_reembed_pending', true),
      updated_at = now()
  where pr.workspace_id = $1
    and pr.world_id = $2
    and pr.saga_id = $3
    and pr.session_id = current_transcript.session_id;

  return transcript_id;
end;
$$;

create or replace function public.get_transcript_source_context(source_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  source_row public.sources%rowtype;
  transcript_row public.transcripts%rowtype;
  current_segment jsonb;
  current_text text;
  current_deleted boolean := false;
  normalized_raw text;
  normalized_current text;
begin
  select * into source_row
  from public.sources s
  where s.id = get_transcript_source_context.source_id
    and s.kind = 'transcript_segment';

  if source_row.id is null then
    raise exception 'Transcript source is not available' using errcode = '42501';
  end if;
  if source_row.saga_id is null then
    raise exception 'Transcript source must be Saga scoped' using errcode = '23514';
  end if;

  perform public.assert_saga_access(source_row.workspace_id, source_row.world_id, source_row.saga_id);

  select * into transcript_row
  from public.transcripts t
  where t.id = source_row.transcript_id;

  select segment
  into current_segment
  from jsonb_array_elements(coalesce(transcript_row.segments, '[]'::jsonb)) segment
  where (segment ->> 'start')::numeric = source_row.start_seconds
    and (segment ->> 'end')::numeric = source_row.end_seconds
  limit 1;

  current_text := current_segment ->> 'text';
  current_deleted := coalesce((current_segment ->> 'deleted')::boolean, false);
  normalized_raw := regexp_replace(trim(coalesce(source_row.raw_excerpt, '')), '\s+', ' ', 'g');
  normalized_current := regexp_replace(trim(coalesce(current_text, '')), '\s+', ' ', 'g');

  return jsonb_build_object(
    'source_id', source_row.id,
    'transcript_id', source_row.transcript_id,
    'raw_excerpt', source_row.raw_excerpt,
    'current_text', current_text,
    'current_text_deleted', current_deleted,
    'drift_detected', normalized_raw is distinct from normalized_current
  );
end;
$$;

create or replace function internal.enqueue_expired_export_cleanup_jobs()
returns integer
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  enqueued_count int := 0;
  export_row internal.export_jobs%rowtype;
begin
  for export_row in
    select *
    from internal.export_jobs ej
    where ej.storage_path is not null
      and ej.expires_at <= now()
      and ej.state in ('complete', 'expired')
      and not exists (
        select 1
        from internal.cleanup_jobs cj
        where cj.idempotency_key = 'cleanup:export:' || ej.id::text
      )
  loop
    perform internal.enqueue_cleanup_job(
      export_row.workspace_id,
      export_row.world_id,
      export_row.saga_id,
      'exports',
      jsonb_build_object('export_id', export_row.id, 'bucket', 'exports', 'storage_path', export_row.storage_path),
      'cleanup:export:' || export_row.id::text
    );
    enqueued_count := enqueued_count + 1;

    update internal.export_jobs
    set state = 'expired'
    where id = export_row.id
      and state = 'complete';
  end loop;

  return enqueued_count;
end;
$$;

create or replace function internal.enqueue_saga_cleanup_job()
returns trigger
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    if exists (
      select 1
      from public.sessions s
      where s.saga_id = new.id
        and s.status in ('in_progress', 'ended_pending_undo')
    ) then
      raise exception 'cannot delete a Saga while a session is live or ending' using errcode = '23514';
    end if;

    perform internal.enqueue_cleanup_job(
      new.workspace_id,
      new.world_id,
      new.id,
      'saga',
      jsonb_build_object(
        'saga_id', new.id,
        'storage_prefixes', jsonb_build_array(
          new.workspace_id::text || '/' || new.world_id::text || '/' || new.id::text
        )
      ),
      'cleanup:saga:' || new.id::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists enqueue_saga_cleanup_job on public.sagas;
create trigger enqueue_saga_cleanup_job
before update of deleted_at on public.sagas
for each row
execute function internal.enqueue_saga_cleanup_job();

revoke all on function public.get_audio_upload_target(uuid, uuid, uuid, uuid, integer, text, bigint) from public, anon;
revoke all on function public.register_audio_chunk(uuid, uuid, uuid, uuid, integer, text, bigint, numeric, timestamptz, text) from public, anon;
revoke all on function public.enqueue_transcription_job(uuid, uuid, uuid, uuid, text) from public, anon;
revoke all on function public.update_transcript_segments(uuid, uuid, uuid, uuid, jsonb) from public, anon;
revoke all on function public.get_transcript_source_context(uuid) from public, anon;

grant execute on function public.get_audio_upload_target(uuid, uuid, uuid, uuid, integer, text, bigint) to authenticated;
grant execute on function public.register_audio_chunk(uuid, uuid, uuid, uuid, integer, text, bigint, numeric, timestamptz, text) to authenticated;
grant execute on function public.enqueue_transcription_job(uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.update_transcript_segments(uuid, uuid, uuid, uuid, jsonb) to authenticated;
grant execute on function public.get_transcript_source_context(uuid) to authenticated;
