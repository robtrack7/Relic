create or replace function public.save_session_evidence(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  source_id uuid,
  evidence_kind public.source_kind,
  evidence_text text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  session_state public.session_status;
  existing public.sources%rowtype;
  result_payload jsonb;
  pipeline_id uuid;
  pasted_ids jsonb;
  summary_ids jsonb;
  pasted_count integer;
  summary_count integer;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if save_session_evidence.source_id is null then
    raise exception 'A stable source id is required' using errcode = '23514';
  end if;
  if save_session_evidence.evidence_kind not in ('pasted_text', 'gm_manual_summary') then
    raise exception 'Unsupported manual evidence kind' using errcode = '23514';
  end if;
  if save_session_evidence.evidence_text is null or length(btrim(save_session_evidence.evidence_text)) = 0 then
    raise exception 'Manual evidence text is required' using errcode = '23514';
  end if;
  if length(save_session_evidence.evidence_text) > (case when save_session_evidence.evidence_kind = 'pasted_text' then 50000 else 10000 end) then
    raise exception 'Manual evidence text is too long' using errcode = '22001';
  end if;

  perform public.assert_saga_access(
    save_session_evidence.workspace_id,
    save_session_evidence.world_id,
    save_session_evidence.saga_id
  );

  select s.status into session_state
  from public.sessions s
  where s.id = save_session_evidence.session_id
    and s.workspace_id = save_session_evidence.workspace_id
    and s.world_id = save_session_evidence.world_id
    and s.saga_id = save_session_evidence.saga_id
  for update;

  if session_state is null then
    raise exception 'Session is not available' using errcode = '42501';
  end if;
  if session_state <> 'ended' then
    raise exception 'manual evidence can only be saved for an ended Session' using errcode = '23514';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('session_evidence:' || caller_id::text || ':' || save_session_evidence.source_id::text, 0)
  );

  select * into existing
  from public.sources src
  where src.id = save_session_evidence.source_id;

  if existing.id is not null then
    if existing.workspace_id <> save_session_evidence.workspace_id
      or existing.world_id <> save_session_evidence.world_id
      or existing.saga_id is distinct from save_session_evidence.saga_id
      or existing.scope <> 'saga'
      or existing.session_id is distinct from save_session_evidence.session_id
      or existing.kind <> save_session_evidence.evidence_kind
      or existing.raw_excerpt <> save_session_evidence.evidence_text then
      raise exception 'source key is already bound to different evidence' using errcode = '23505';
    end if;

    return jsonb_build_object(
      'id', existing.id,
      'kind', existing.kind,
      'session_id', existing.session_id,
      'text', existing.raw_excerpt,
      'created_at', existing.created_at
    );
  end if;

  insert into public.sources as inserted (
    id, workspace_id, world_id, saga_id, scope, kind, session_id, raw_excerpt
  ) values (
    save_session_evidence.source_id,
    save_session_evidence.workspace_id,
    save_session_evidence.world_id,
    save_session_evidence.saga_id,
    'saga',
    save_session_evidence.evidence_kind,
    save_session_evidence.session_id,
    save_session_evidence.evidence_text
  )
  returning jsonb_build_object(
    'id', inserted.id,
    'kind', inserted.kind,
    'session_id', inserted.session_id,
    'text', inserted.raw_excerpt,
    'created_at', inserted.created_at
  ) into result_payload;

  select pr.id into pipeline_id
  from public.pipeline_runs pr
  where pr.workspace_id = save_session_evidence.workspace_id
    and pr.world_id = save_session_evidence.world_id
    and pr.saga_id = save_session_evidence.saga_id
    and pr.session_id = save_session_evidence.session_id
  order by pr.created_at desc
  limit 1
  for update;

  if pipeline_id is null then
    insert into public.pipeline_runs (workspace_id, world_id, saga_id, session_id, state, inputs_summary)
    values (
      save_session_evidence.workspace_id,
      save_session_evidence.world_id,
      save_session_evidence.saga_id,
      save_session_evidence.session_id,
      'queued',
      '{}'::jsonb
    )
    returning id into pipeline_id;
  end if;

  select
    coalesce(jsonb_agg(src.id order by src.created_at, src.id) filter (where src.kind = 'pasted_text'), '[]'::jsonb),
    coalesce(jsonb_agg(src.id order by src.created_at, src.id) filter (where src.kind = 'gm_manual_summary'), '[]'::jsonb),
    count(*) filter (where src.kind = 'pasted_text'),
    count(*) filter (where src.kind = 'gm_manual_summary')
  into pasted_ids, summary_ids, pasted_count, summary_count
  from public.sources src
  where src.workspace_id = save_session_evidence.workspace_id
    and src.world_id = save_session_evidence.world_id
    and src.saga_id = save_session_evidence.saga_id
    and src.session_id = save_session_evidence.session_id
    and src.scope = 'saga'
    and src.kind in ('pasted_text', 'gm_manual_summary');

  update public.pipeline_runs pr
  set inputs_summary = coalesce(pr.inputs_summary, '{}'::jsonb) || jsonb_build_object(
        'pasted_text_source_ids', pasted_ids,
        'gm_manual_summary_source_ids', summary_ids,
        'pasted_text_count', pasted_count,
        'gm_manual_summary_count', summary_count,
        'manual_evidence_count', pasted_count + summary_count,
        'gm_summary_present', summary_count > 0
      ),
      state = case
        when pr.state = 'failed' and pr.failure_reason = 'no_inputs_after_transcription_failure'
          then 'queued'::public.pipeline_state
        else pr.state
      end,
      failure_reason = case
        when pr.state = 'failed' and pr.failure_reason = 'no_inputs_after_transcription_failure'
          then null
        else pr.failure_reason
      end,
      updated_at = now()
  where pr.id = pipeline_id;

  return result_payload;
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
set search_path = ''
as $$
declare
  session_row public.sessions%rowtype;
  transcript_payload jsonb;
  pipeline_payload jsonb;
  job_payload jsonb;
  manual_evidence_payload jsonb;
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

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', src.id,
      'kind', src.kind,
      'text', src.raw_excerpt,
      'created_at', src.created_at
    ) order by src.created_at desc, src.id
  ), '[]'::jsonb)
  into manual_evidence_payload
  from public.sources src
  where src.workspace_id = $1
    and src.world_id = $2
    and src.saga_id = $3
    and src.session_id = session_row.id
    and src.scope = 'saga'
    and src.kind in ('pasted_text', 'gm_manual_summary');

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
    'transcription_job', job_payload,
    'manual_evidence', manual_evidence_payload
  );
end;
$$;

revoke all on function public.save_session_evidence(uuid, uuid, uuid, uuid, uuid, public.source_kind, text) from public, anon;
grant execute on function public.save_session_evidence(uuid, uuid, uuid, uuid, uuid, public.source_kind, text) to authenticated;

revoke all on function public.get_session_review(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.get_session_review(uuid, uuid, uuid, uuid) to authenticated;
