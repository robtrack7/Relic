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
  normalized_frozen text;
  normalized_current text;
  drift_state text;
begin
  select * into source_row
  from public.sources s
  where s.id = get_transcript_source_context.source_id
    and s.kind = 'transcript_segment';

  if source_row.id is null then
    return jsonb_build_object(
      'status', 'unavailable',
      'source_kind', 'unknown',
      'label', 'Source unavailable',
      'drift_state', 'unavailable'
    );
  end if;

  if source_row.saga_id is null
     or auth.uid() is null
     or not public.user_can_access_saga(source_row.workspace_id, source_row.world_id, source_row.saga_id) then
    return jsonb_build_object(
      'status', 'permission_denied',
      'source_kind', 'unknown',
      'label', 'Source unavailable',
      'drift_state', 'unavailable'
    );
  end if;

  if source_row.transcript_id is null
     or source_row.session_id is null
     or source_row.start_seconds is null
     or source_row.end_seconds is null then
    return jsonb_build_object(
      'status', 'broken',
      'source_kind', 'transcript_segment',
      'label', 'Source unavailable',
      'frozen_excerpt', nullif(source_row.raw_excerpt, ''),
      'drift_state', 'unavailable'
    );
  end if;

  select * into transcript_row
  from public.transcripts t
  where t.id = source_row.transcript_id
    and t.workspace_id = source_row.workspace_id
    and t.world_id = source_row.world_id
    and t.saga_id = source_row.saga_id
    and t.session_id = source_row.session_id;

  if transcript_row.id is null then
    return jsonb_build_object(
      'status', 'broken',
      'source_kind', 'transcript_segment',
      'label', 'Source unavailable',
      'frozen_excerpt', nullif(source_row.raw_excerpt, ''),
      'drift_state', 'unavailable'
    );
  end if;

  if transcript_row.deleted_at is not null then
    return jsonb_build_object(
      'status', 'available',
      'source_kind', 'transcript_segment',
      'label', 'Transcript evidence',
      'frozen_excerpt', source_row.raw_excerpt,
      'current_text', null,
      'start_seconds', source_row.start_seconds,
      'end_seconds', source_row.end_seconds,
      'session_id', source_row.session_id,
      'drift_state', 'deleted'
    );
  end if;

  select segment into current_segment
  from jsonb_array_elements(coalesce(transcript_row.segments, '[]'::jsonb)) segment
  where (segment ->> 'start')::numeric = source_row.start_seconds
    and (segment ->> 'end')::numeric = source_row.end_seconds
  limit 1;

  if current_segment is null then
    return jsonb_build_object(
      'status', 'broken',
      'source_kind', 'transcript_segment',
      'label', 'Source unavailable',
      'frozen_excerpt', nullif(source_row.raw_excerpt, ''),
      'drift_state', 'unavailable'
    );
  end if;

  current_text := current_segment ->> 'text';
  normalized_frozen := regexp_replace(trim(coalesce(source_row.raw_excerpt, '')), '\s+', ' ', 'g');
  normalized_current := regexp_replace(trim(coalesce(current_text, '')), '\s+', ' ', 'g');
  drift_state := case
    when coalesce((current_segment ->> 'deleted')::boolean, false) then 'deleted'
    when normalized_frozen is distinct from normalized_current then 'edited'
    else 'exact'
  end;

  return jsonb_build_object(
    'status', 'available',
    'source_kind', 'transcript_segment',
    'label', 'Transcript evidence',
    'frozen_excerpt', source_row.raw_excerpt,
    'current_text', current_text,
    'start_seconds', source_row.start_seconds,
    'end_seconds', source_row.end_seconds,
    'session_id', source_row.session_id,
    'drift_state', drift_state
  );
end;
$$;

create or replace function public.get_draft_source_context(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  draft_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  source_row public.sources%rowtype;
  result jsonb := '[]'::jsonb;
begin
  if auth.uid() is null
     or not public.user_can_access_saga(workspace_id, world_id, saga_id) then
    return jsonb_build_array(jsonb_build_object(
      'status', 'permission_denied',
      'source_kind', 'unknown',
      'label', 'Source unavailable',
      'drift_state', 'unavailable'
    ));
  end if;

  if not exists (
    select 1
    from public.drafts d
    where d.id = get_draft_source_context.draft_id
      and d.workspace_id = get_draft_source_context.workspace_id
      and d.world_id = get_draft_source_context.world_id
      and d.saga_id = get_draft_source_context.saga_id
      and d.scope = 'saga'
  ) then
    return jsonb_build_array(jsonb_build_object(
      'status', 'unavailable',
      'source_kind', 'unknown',
      'label', 'Source unavailable',
      'drift_state', 'unavailable'
    ));
  end if;

  for source_row in
    select s.*
    from public.draft_sources ds
    join public.sources s
      on s.id = ds.source_id
     and s.workspace_id = ds.workspace_id
     and s.world_id = ds.world_id
     and s.saga_id = ds.saga_id
     and s.scope = ds.scope
    where ds.draft_id = get_draft_source_context.draft_id
      and ds.workspace_id = get_draft_source_context.workspace_id
      and ds.world_id = get_draft_source_context.world_id
      and ds.saga_id = get_draft_source_context.saga_id
      and ds.scope = 'saga'
    order by ds.created_at, ds.id
  loop
    if source_row.kind = 'transcript_segment' then
      result := result || jsonb_build_array(public.get_transcript_source_context(source_row.id));
    elsif source_row.kind in ('pasted_text', 'gm_manual_summary') then
      result := result || jsonb_build_array(jsonb_build_object(
        'status', case when nullif(trim(source_row.raw_excerpt), '') is null then 'unavailable' else 'available' end,
        'source_kind', source_row.kind,
        'label', case source_row.kind when 'pasted_text' then 'Pasted session notes' else 'GM manual summary' end,
        'frozen_excerpt', nullif(source_row.raw_excerpt, ''),
        'drift_state', 'not_applicable'
      ));
    else
      result := result || jsonb_build_array(jsonb_build_object(
        'status', 'unsupported',
        'source_kind', source_row.kind,
        'label', 'Unsupported source',
        'drift_state', 'not_applicable'
      ));
    end if;
  end loop;

  if jsonb_array_length(result) = 0 then
    return jsonb_build_array(jsonb_build_object(
      'status', 'broken',
      'source_kind', 'unknown',
      'label', 'Source unavailable',
      'drift_state', 'unavailable'
    ));
  end if;

  return result;
end;
$$;

revoke all on function public.get_transcript_source_context(uuid) from public, anon, authenticated;
revoke all on function public.get_draft_source_context(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.get_draft_source_context(uuid, uuid, uuid, uuid) to authenticated;
