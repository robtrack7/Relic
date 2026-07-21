create or replace function public.claim_transcription_job_for_worker(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  claimed jsonb;
  claimed_session_id uuid;
begin
  claimed := internal.claim_transcription_job(worker_id);
  if claimed is null then
    return null;
  end if;

  claimed_session_id := (claimed ->> 'session_id')::uuid;
  update public.transcripts t
  set state = 'transcribing',
      failure_reason = null,
      updated_at = now()
  where t.session_id = claimed_session_id;

  update public.pipeline_runs pr
  set state = 'transcribing',
      failure_reason = null,
      updated_at = now()
  where pr.session_id = claimed_session_id
    and pr.state in ('queued', 'transcribing', 'failed');

  return claimed;
end;
$$;

create or replace function public.complete_transcription_job_for_worker(
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
  transcript_id uuid;
  v_session_id uuid;
begin
  select tj.session_id into v_session_id
  from internal.transcription_jobs tj
  where tj.id = p_job_id;

  transcript_id := internal.complete_transcription_job(
    p_job_id,
    p_segments,
    p_whisper_model,
    p_language,
    p_duration_seconds
  );

  update public.pipeline_runs pr
  set state = 'synthesizing',
      failure_reason = null,
      updated_at = now()
  where pr.session_id = v_session_id
    and pr.state in ('queued', 'transcribing', 'synthesizing', 'failed');

  return transcript_id;
end;
$$;

create or replace function public.complete_job_for_worker(
  p_job_table text,
  p_job_id uuid,
  p_result jsonb default '{}'::jsonb
)
returns uuid
language sql
security definer
set search_path = public, internal, pg_temp
as $$
  select internal.complete_job(p_job_table, p_job_id, p_result);
$$;

create or replace function public.fail_job_for_worker(
  p_job_table text,
  p_job_id uuid,
  p_failure_reason text,
  p_retryable boolean default true,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  result_id uuid;
  clean_reason text := internal.sanitize_failure_reason(p_failure_reason);
begin
  result_id := internal.fail_job(p_job_table, p_job_id, clean_reason, p_retryable, p_payload);

  if p_job_table = 'transcription_jobs'
    and exists (
      select 1 from internal.transcription_jobs tj
      where tj.id = p_job_id and tj.state = 'failed'
    ) then
    perform internal.fail_transcription_job(p_job_id, clean_reason);

    update public.pipeline_runs pr
    set state = case
          when exists (
            select 1 from public.sources src
            where src.session_id = pr.session_id
              and src.kind in ('note', 'pasted_text', 'gm_manual_summary')
          ) then 'synthesizing'::public.pipeline_state
          else 'failed'::public.pipeline_state
        end,
        failure_reason = case
          when exists (
            select 1 from public.sources src
            where src.session_id = pr.session_id
              and src.kind in ('note', 'pasted_text', 'gm_manual_summary')
          ) then null
          else 'no_inputs_after_transcription_failure'
        end,
        updated_at = now()
    from internal.transcription_jobs tj
    where tj.id = p_job_id
      and pr.session_id = tj.session_id
      and pr.workspace_id = tj.workspace_id
      and pr.world_id = tj.world_id
      and pr.saga_id = tj.saga_id;
  end if;

  return result_id;
end;
$$;

create or replace function public.get_session_review(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare
  session_row public.sessions%rowtype;
  transcript_payload jsonb;
  pipeline_payload jsonb;
  job_payload jsonb;
  registered_chunks integer;
begin
  perform public.assert_saga_access($1, $2, $3);

  select * into session_row
  from public.sessions s
  where s.id = get_session_review.session_id
    and s.workspace_id = $1
    and s.world_id = $2
    and s.saga_id = $3;

  if session_row.id is null then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', t.id,
    'state', t.state,
    'model', t.whisper_model,
    'language', t.language,
    'duration_seconds', t.duration_seconds,
    'segments', t.segments,
    'edited_at', t.edited_at,
    'failure_reason', t.failure_reason
  ) into transcript_payload
  from public.transcripts t
  where t.session_id = session_row.id
    and t.deleted_at is null;

  select jsonb_build_object(
    'id', pr.id,
    'state', pr.state,
    'failure_reason', pr.failure_reason,
    'inputs_summary', pr.inputs_summary,
    'updated_at', pr.updated_at
  ) into pipeline_payload
  from public.pipeline_runs pr
  where pr.session_id = session_row.id
  order by pr.created_at desc
  limit 1;

  select jsonb_build_object(
    'id', tj.id,
    'state', tj.state,
    'attempts', tj.attempts,
    'max_attempts', tj.max_attempts,
    'scheduled_at', tj.scheduled_at,
    'failure_reason', tj.failure_reason,
    'updated_at', tj.updated_at
  ) into job_payload
  from internal.transcription_jobs tj
  where tj.session_id = session_row.id
  order by tj.created_at desc
  limit 1;

  select count(*) into registered_chunks
  from public.audio_chunks ac
  where ac.session_id = session_row.id
    and ac.deleted_at is null;

  return jsonb_build_object(
    'session_id', session_row.id,
    'session_status', session_row.status,
    'audio', jsonb_build_object(
      'expected_chunks', session_row.audio_chunk_count_expected,
      'registered_chunks', registered_chunks,
      'finalized_at', session_row.recording_finalized_at
    ),
    'pipeline', pipeline_payload,
    'transcript', transcript_payload,
    'transcription_job', job_payload
  );
end;
$$;

create or replace function public.retry_session_transcription(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  session_row public.sessions%rowtype;
  registered_chunks integer;
  job_id uuid;
  job_state text;
begin
  perform public.assert_saga_access($1, $2, $3);

  select * into session_row
  from public.sessions s
  where s.id = retry_session_transcription.session_id
    and s.workspace_id = $1
    and s.world_id = $2
    and s.saga_id = $3
  for update;

  if session_row.id is null then
    raise exception 'Session is not available' using errcode = '42501';
  end if;
  if session_row.status <> 'ended' then
    raise exception 'transcription retry requires an ended Session' using errcode = '23514';
  end if;
  if session_row.recording_finalized_at is null
    or coalesce(session_row.audio_chunk_count_expected, 0) <= 0 then
    raise exception 'recording evidence is not finalized' using errcode = '23514';
  end if;

  select count(*) into registered_chunks
  from public.audio_chunks ac
  where ac.session_id = session_row.id
    and ac.deleted_at is null;

  if registered_chunks < session_row.audio_chunk_count_expected then
    raise exception 'recording evidence is incomplete' using errcode = '23514';
  end if;

  select tj.id, tj.state::text into job_id, job_state
  from internal.transcription_jobs tj
  where tj.session_id = session_row.id
    and tj.workspace_id = $1
    and tj.world_id = $2
    and tj.saga_id = $3
  order by tj.created_at desc
  limit 1
  for update;

  if job_id is null or job_state <> 'failed' then
    raise exception 'only a failed transcription can be retried' using errcode = '23514';
  end if;

  update internal.transcription_jobs tj
  set state = 'pending',
      attempts = 0,
      scheduled_at = now(),
      locked_by = null,
      locked_at = null,
      completed_at = null,
      failure_reason = null,
      updated_at = now()
  where tj.id = job_id;

  update public.transcripts t
  set state = 'pending',
      failure_reason = null,
      updated_at = now()
  where t.session_id = session_row.id;

  update public.pipeline_runs pr
  set state = 'queued',
      failure_reason = null,
      inputs_summary = (coalesce(pr.inputs_summary, '{}'::jsonb)
        - 'transcript_failed' - 'transcript_failure_reason'),
      updated_at = now()
  where pr.session_id = session_row.id;

  return job_id;
end;
$$;

revoke all on function public.claim_transcription_job_for_worker(text) from public, anon, authenticated;
revoke all on function public.complete_transcription_job_for_worker(uuid, jsonb, text, text, integer) from public, anon, authenticated;
revoke all on function public.complete_job_for_worker(text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.fail_job_for_worker(text, uuid, text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.claim_transcription_job_for_worker(text) to service_role;
grant execute on function public.complete_transcription_job_for_worker(uuid, jsonb, text, text, integer) to service_role;
grant execute on function public.complete_job_for_worker(text, uuid, jsonb) to service_role;
grant execute on function public.fail_job_for_worker(text, uuid, text, boolean, jsonb) to service_role;

revoke all on function public.get_session_review(uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.retry_session_transcription(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.get_session_review(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.retry_session_transcription(uuid, uuid, uuid, uuid) to authenticated;
