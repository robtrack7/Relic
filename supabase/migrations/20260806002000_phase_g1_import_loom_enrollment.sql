-- Phase G1: explicit imported-source enrollment into the existing Saga Loom.

create or replace function internal.loom_source_current_version(p_source_id uuid)
returns text
language plpgsql stable security definer
set search_path = public, extensions, pg_temp
as $$
declare s public.sources%rowtype; v_updated timestamptz;
begin
  select * into s from public.sources where id=p_source_id;
  if not found then return null; end if;
  if s.kind='imported_text' then
    if s.import_state not in ('ready_for_review','archived') or s.content_sha256 is null then return null; end if;
    return s.content_sha256;
  end if;
  if s.source_entity_type='character' then select updated_at into v_updated from public.characters where id=s.source_entity_id and canon_state<>'archived';
  elsif s.source_entity_type='place' then select updated_at into v_updated from public.places where id=s.source_entity_id and canon_state<>'archived';
  elsif s.source_entity_type='faction' then select updated_at into v_updated from public.factions where id=s.source_entity_id and canon_state<>'archived';
  elsif s.source_entity_type='artifact' then select updated_at into v_updated from public.artifacts where id=s.source_entity_id and canon_state<>'archived';
  elsif s.source_entity_type='thread' then select updated_at into v_updated from public.threads where id=s.source_entity_id and canon_state<>'archived';
  elsif s.source_entity_type='session' then select updated_at into v_updated from public.sessions where id=s.source_entity_id;
  elsif s.note_id is not null then select updated_at into v_updated from public.notes where id=s.note_id and note_type<>'gm_note' and canon_state<>'archived';
  else v_updated:=s.created_at;
  end if;
  if v_updated is null then return null; end if;
  return encode(extensions.digest(convert_to(concat_ws('|',s.id::text,s.created_at::text,v_updated::text),'UTF8'),'sha256'),'hex');
end;
$$;

create or replace function public.create_import_loom_turn_for_worker(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_gm_id uuid,p_thread_id uuid,
  p_turn_id uuid,p_idempotency_key uuid,p_question text,p_source_ids uuid[]
)
returns jsonb
language plpgsql security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  v_ids uuid[];
  v_result jsonb;
  v_run_id uuid;
  v_source public.sources%rowtype;
  v_ordinal integer:=0;
  v_versions jsonb:='{}'::jsonb;
  v_existing_ids jsonb;
begin
  select array_agg(x order by x) into v_ids from unnest(coalesce(p_source_ids,'{}'::uuid[])) x;
  if cardinality(v_ids) not between 1 and 8 or cardinality(v_ids)<>(select count(distinct x) from unnest(v_ids) x) then
    raise exception 'Import enrollment requires 1 to 8 distinct sources' using errcode='22023';
  end if;
  if (select count(*) from public.sources s where s.id=any(v_ids) and s.workspace_id=p_workspace_id
    and s.world_id=p_world_id and s.saga_id=p_saga_id and s.scope='saga' and s.kind='imported_text'
    and s.import_state='ready_for_review' and nullif(btrim(s.raw_excerpt),'') is not null
    and s.content_sha256~'^[0-9a-f]{64}$')<>cardinality(v_ids) then
    raise exception 'Selected imports are unavailable for Loom enrollment' using errcode='42501';
  end if;

  v_result:=public.create_loom_provider_turn_for_worker(
    p_workspace_id,p_world_id,p_saga_id,p_gm_id,p_thread_id,p_turn_id,p_idempotency_key,
    p_question,'exact','{}'::uuid[]
  );
  v_run_id:=(v_result->>'run_id')::uuid;
  if coalesce((v_result->>'replayed')::boolean,false) then
    select r.input_payload->'import_enrollment_source_ids' into v_existing_ids from internal.ai_task_runs r where r.id=v_run_id;
    if v_existing_ids<>to_jsonb(v_ids) then raise exception 'Loom retry does not match selected imports' using errcode='23505'; end if;
    return v_result||jsonb_build_object('import_source_ids',v_existing_ids);
  end if;

  for v_source in select * from public.sources s where s.id=any(v_ids) order by s.id loop
    v_ordinal:=v_ordinal+1;
    v_versions:=v_versions||jsonb_build_object(v_source.id::text,v_source.content_sha256);
    insert into internal.guide_evidence_snapshots(
      turn_id,ordinal,workspace_id,world_id,saga_id,source_id,source_version,source_kind,
      source_entity_type,source_entity_id,title,context_anchor,evidence_text,evidence_hash
    ) values (
      p_turn_id,v_ordinal,p_workspace_id,p_world_id,p_saga_id,v_source.id,v_source.content_sha256,
      'imported_text',null,null,coalesce(v_source.original_filename,'Imported source'),
      jsonb_strip_nulls(jsonb_build_object('ingestion_method',v_source.ingestion_method,'page_count',v_source.page_count,
        'extraction_version',v_source.extraction_version)),left(v_source.raw_excerpt,6000),
      encode(extensions.digest(convert_to(left(v_source.raw_excerpt,6000),'UTF8'),'sha256'),'hex')
    );
  end loop;
  update internal.ai_task_runs set allowed_source_ids=v_ids,allowed_source_versions=v_versions,
    input_payload=input_payload||jsonb_build_object('import_enrollment_source_ids',v_ids,'import_enrollment',true)
  where id=v_run_id and guide_turn_id=p_turn_id;
  return v_result||jsonb_build_object('source_count',cardinality(v_ids),'import_source_ids',v_ids);
end;
$$;

create or replace function public.get_guide_turn_replay_for_worker(
  p_gm_id uuid,p_saga_id uuid,p_idempotency_key uuid
)
returns jsonb language sql stable security definer set search_path=public,internal,pg_temp as $$
  select jsonb_build_object(
    'id',t.id,'thread_id',t.thread_id,'ai_task_run_id',t.ai_task_run_id,'status',t.status,
    'question',t.question,'workspace_id',t.workspace_id,'world_id',t.world_id,
    'import_source_ids',coalesce(r.input_payload->'import_enrollment_source_ids','[]'::jsonb)
  )
  from public.guide_turns t left join internal.ai_task_runs r on r.id=t.ai_task_run_id
  where t.gm_id=p_gm_id and t.saga_id=p_saga_id and t.idempotency_key=p_idempotency_key
$$;

revoke all on function internal.loom_source_current_version(uuid) from public,anon,authenticated;
revoke all on function public.create_import_loom_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function public.create_import_loom_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,uuid[]) to service_role;
revoke all on function public.get_guide_turn_replay_for_worker(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_guide_turn_replay_for_worker(uuid,uuid,uuid) to service_role;

notify pgrst, 'reload schema';
