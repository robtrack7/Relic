alter table public.threads
  add column if not exists resolution_details text;

create or replace function internal.assert_thread_session_scope(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_session_id uuid
)
returns void
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if p_session_id is not null and not exists (
    select 1 from public.sessions s
    where s.id=p_session_id and s.workspace_id=p_workspace_id and s.world_id=p_world_id and s.saga_id=p_saga_id
  ) then
    raise exception 'Session is not available' using errcode='42501';
  end if;
end;
$$;

create or replace function internal.write_thread_evidence(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_thread_id uuid,
  p_operation text,
  p_payload jsonb,
  p_session_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_id uuid;
  audit_id uuid;
begin
  source_id:=public.write_manual_canon_source(p_workspace_id,p_world_id,p_saga_id,'saga','thread',p_thread_id,p_operation,p_payload);
  if p_session_id is not null then
    update public.sources s set session_id=p_session_id where s.id=source_id;
  end if;
  audit_id:=public.write_manual_canon_audit(
    p_workspace_id,p_world_id,p_saga_id,'saga','thread',p_thread_id,'canon','canon',p_operation,source_id,
    p_payload || case when p_session_id is null then '{}'::jsonb else jsonb_build_object('session_id',p_session_id) end
  );
  return audit_id;
end;
$$;

create or replace function public.update_thread_details(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  thread_id uuid,
  expected_version timestamptz,
  thread_title text,
  thread_summary text,
  thread_state text,
  resolution_details text,
  session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  current_row public.threads%rowtype;
  updated_row public.threads%rowtype;
  old_state text;
  new_resolution text;
  new_loose boolean;
  operation text;
  payload jsonb;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  perform internal.assert_thread_session_scope(workspace_id,world_id,saga_id,session_id);
  if nullif(trim(coalesce(thread_title,'')),'') is null then raise exception 'Thread title is required' using errcode='23514'; end if;
  if thread_state not in ('active','loose','dormant','resolved','failed') then raise exception 'Unsupported Thread state' using errcode='23514'; end if;
  if thread_state in ('resolved','failed') and nullif(trim(coalesce(resolution_details,'')),'') is null then raise exception 'Resolution details are required for this Thread state' using errcode='23514'; end if;

  select * into current_row from public.threads t
  where t.id=thread_id and t.workspace_id=workspace_id and t.world_id=world_id and t.saga_id=saga_id and t.canon_state='canon'
  for update;
  if current_row.id is null then raise exception 'Thread is not available' using errcode='42501'; end if;
  if expected_version is null or current_row.updated_at<>expected_version then raise exception 'conflict: expected_version does not match live Thread version' using errcode='40001'; end if;

  old_state:=case when current_row.is_loose_thread then 'loose' else current_row.resolution_state end;
  new_resolution:=case when thread_state='loose' then 'active' else thread_state end;
  new_loose:=thread_state='loose';
  operation:=case
    when old_state<>thread_state then 'thread_'||thread_state
    when coalesce(current_row.resolution_details,'')<>coalesce(resolution_details,'') then 'resolution_edited'
    else 'thread_updated'
  end;
  payload:=jsonb_build_object(
    'title',trim(thread_title),'summary',coalesce(thread_summary,''),'state',thread_state,
    'from_state',old_state,'resolution_details',case when thread_state in ('resolved','failed') then trim(resolution_details) else null end
  );
  update public.threads t set
    name=trim(thread_title), summary=nullif(trim(coalesce(thread_summary,'')),''),
    resolution_state=new_resolution, is_loose_thread=new_loose,
    resolution_details=case when thread_state in ('resolved','failed') then trim(resolution_details) else null end,
    updated_at=clock_timestamp()
  where t.id=current_row.id returning * into updated_row;
  perform internal.write_thread_evidence(workspace_id,world_id,saga_id,thread_id,operation,payload,session_id);
  return to_jsonb(updated_row) || jsonb_build_object('status',thread_state);
end;
$$;

create or replace function public.mutate_thread_objective(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  thread_id uuid,
  expected_version timestamptz,
  operation text,
  objective_id uuid,
  objective_text text,
  target_index integer,
  session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  thread_row public.threads%rowtype;
  item jsonb;
  normalized jsonb:='[]'::jsonb;
  changed jsonb;
  rebuilt jsonb:='[]'::jsonb;
  target jsonb;
  found_target boolean:=false;
  idx integer:=0;
  insert_at integer;
  audit_operation text;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  perform internal.assert_thread_session_scope(workspace_id,world_id,saga_id,session_id);
  if operation not in ('create','edit','complete','reopen','move') then raise exception 'Unsupported objective operation' using errcode='23514'; end if;
  select * into thread_row from public.threads t
  where t.id=thread_id and t.workspace_id=workspace_id and t.world_id=world_id and t.saga_id=saga_id and t.canon_state='canon'
  for update;
  if thread_row.id is null then raise exception 'Thread is not available' using errcode='42501'; end if;
  if expected_version is null or thread_row.updated_at<>expected_version then raise exception 'conflict: expected_version does not match live Thread version' using errcode='40001'; end if;

  for item in select value from jsonb_array_elements(coalesce(thread_row.objectives_log,'[]'::jsonb)) loop
    if jsonb_typeof(item)='string' then item:=jsonb_build_object('id',public.uuid7(),'text',item#>>'{}','state','open','completed_at',null); end if;
    if nullif(item->>'id','') is null then item:=item||jsonb_build_object('id',public.uuid7()); end if;
    item:=item||jsonb_build_object('order_index',idx,'state',coalesce(nullif(item->>'state',''),'open'));
    normalized:=normalized||jsonb_build_array(item);
    idx:=idx+1;
  end loop;

  if operation='create' then
    if nullif(trim(coalesce(objective_text,'')),'') is null then raise exception 'Objective text is required' using errcode='23514'; end if;
    changed:=jsonb_build_object('id',public.uuid7(),'text',trim(objective_text),'state','open','completed_at',null,'created_at',clock_timestamp(),'order_index',jsonb_array_length(normalized));
    normalized:=normalized||jsonb_build_array(changed);
    audit_operation:='objective_created';
  else
    if objective_id is null then raise exception 'Objective ID is required' using errcode='23514'; end if;
    if operation='move' then
      for item in select value from jsonb_array_elements(normalized) loop
        if item->>'id'=objective_id::text then target:=item; found_target:=true; else rebuilt:=rebuilt||jsonb_build_array(item); end if;
      end loop;
      if not found_target then raise exception 'Objective is not available' using errcode='42501'; end if;
      insert_at:=greatest(0,least(coalesce(target_index,0),jsonb_array_length(rebuilt)));
      normalized:='[]'::jsonb; idx:=0;
      for item in select value from jsonb_array_elements(rebuilt) loop
        if idx=insert_at then normalized:=normalized||jsonb_build_array(target); end if;
        normalized:=normalized||jsonb_build_array(item); idx:=idx+1;
      end loop;
      if insert_at=jsonb_array_length(rebuilt) then normalized:=normalized||jsonb_build_array(target); end if;
      changed:=target; audit_operation:='objective_reordered';
    else
      rebuilt:='[]'::jsonb;
      for item in select value from jsonb_array_elements(normalized) loop
        if item->>'id'=objective_id::text then
          found_target:=true;
          if operation='edit' then
            if nullif(trim(coalesce(objective_text,'')),'') is null then raise exception 'Objective text is required' using errcode='23514'; end if;
            item:=jsonb_set(item,'{text}',to_jsonb(trim(objective_text))); audit_operation:='objective_advanced';
          elsif operation='complete' then
            item:=item||jsonb_build_object('state','completed','completed_at',clock_timestamp()); audit_operation:='objective_completed';
          else
            item:=item||jsonb_build_object('state','open','completed_at',null); audit_operation:='objective_reopened';
          end if;
          changed:=item;
        end if;
        rebuilt:=rebuilt||jsonb_build_array(item);
      end loop;
      if not found_target then raise exception 'Objective is not available' using errcode='42501'; end if;
      normalized:=rebuilt;
    end if;
  end if;

  rebuilt:='[]'::jsonb; idx:=0;
  for item in select value from jsonb_array_elements(normalized) loop
    item:=jsonb_set(item,'{order_index}',to_jsonb(idx));
    if item->>'id'=changed->>'id' then changed:=item; end if;
    rebuilt:=rebuilt||jsonb_build_array(item); idx:=idx+1;
  end loop;
  update public.threads t set objectives_log=rebuilt,updated_at=clock_timestamp() where t.id=thread_id;
  perform internal.write_thread_evidence(workspace_id,world_id,saga_id,thread_id,audit_operation,
    jsonb_build_object('objective_id',changed->>'id','text',changed->>'text','state',changed->>'state','completed_at',changed->'completed_at','target_index',target_index),session_id);
  return changed;
end;
$$;

create or replace function public.get_thread_detail(workspace_id uuid,world_id uuid,saga_id uuid,thread_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
#variable_conflict use_variable
declare
  detail jsonb;
  links jsonb;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  detail:=public.get_library_record_detail(workspace_id,world_id,saga_id,'thread',thread_id);
  if detail is null then raise exception 'Thread is not available' using errcode='42501'; end if;
  select coalesce(jsonb_agg(
    relation || jsonb_build_object('related_archived',coalesce(internal.library_record(workspace_id,world_id,saga_id,relation->>'related_type',(relation->>'related_id')::uuid)->>'canon_state'='archived',false))
    order by relation->>'created_at'
  ),'[]'::jsonb) into links from jsonb_array_elements(detail->'relationships') relation;
  return jsonb_build_object('record',detail->'record','relationships',links,'candidates',detail->'candidates');
end;
$$;

create or replace function public.get_thread_timeline(workspace_id uuid,world_id uuid,saga_id uuid,thread_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
#variable_conflict use_variable
declare result jsonb;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  if not exists(select 1 from public.threads t where t.id=thread_id and t.workspace_id=workspace_id and t.world_id=world_id and t.saga_id=saga_id) then
    raise exception 'Thread is not available' using errcode='42501';
  end if;
  with audit_rows as (
    select a.id::text event_id,a.entity_id thread_id,nullif(a.change_summary#>>'{payload,objective_id}','')::uuid objective_id,
      coalesce(nullif(a.change_summary#>>'{payload,session_id}','')::uuid,(select s.session_id from unnest(a.source_ids) sid join public.sources s on s.id=sid where s.session_id is not null limit 1)) session_id,
      coalesce(a.change_summary->>'operation',a.action::text,'canon_change') operation,a.change_summary->'payload' payload,a.created_at
    from public.canon_audit a
    where a.workspace_id=workspace_id and a.world_id=world_id and a.saga_id=saga_id and a.entity_type='thread' and a.entity_id=thread_id
  ), evidence as (
    select ar.event_id,ar.thread_id,ar.objective_id,ar.session_id,
      case ar.operation
        when 'thread_active' then 'thread_activated' when 'thread_loose' then 'thread_loose'
        when 'thread_dormant' then 'thread_dormant' when 'thread_resolved' then 'thread_resolved'
        when 'thread_failed' then 'thread_failed' else ar.operation end event_type,
      case ar.operation
        when 'objective_created' then 'Objective added' when 'objective_advanced' then 'Objective advanced'
        when 'objective_completed' then 'Objective completed' when 'objective_reopened' then 'Objective reopened'
        when 'objective_reordered' then 'Objectives reordered' when 'thread_active' then 'Thread became Active'
        when 'thread_loose' then 'Thread marked Loose' when 'thread_dormant' then 'Thread became Dormant'
        when 'thread_resolved' then 'Thread resolved' when 'thread_failed' then 'Thread failed'
        when 'resolution_edited' then 'Resolution explanation edited' when 'create' then 'Thread created'
        else 'Thread updated' end title,
      coalesce(ar.payload->>'text',ar.payload->>'resolution_details',ar.payload->>'summary','') detail,
      ar.created_at occurred_at,'canon_audit'::text source_type,ar.event_id source_id
    from audit_rows ar
    union all
    select sat.id::text,sat.thread_id,null::uuid,sat.session_id,'session_pinned','Thread carried into Session','Active Thread pin',sat.created_at,'session_active_threads',sat.id::text
    from public.session_active_threads sat where sat.workspace_id=workspace_id and sat.world_id=world_id and sat.saga_id=saga_id and sat.thread_id=thread_id
    union all
    select spe.id::text,spe.entity_id,null::uuid,spe.session_id,'session_pinned','Thread pinned in Session','Pinned reference',spe.created_at,'session_pinned_entities',spe.id::text
    from public.session_pinned_entities spe where spe.workspace_id=workspace_id and spe.world_id=world_id and spe.saga_id=saga_id and spe.entity_type='thread' and spe.entity_id=thread_id
    union all
    select src.id::text,thread_id,null::uuid,src.session_id,'session_referenced','Thread referenced by Session',coalesce(nullif(src.raw_excerpt,''),src.kind::text),src.created_at,'source',src.id::text
    from public.sources src where src.workspace_id=workspace_id and src.world_id=world_id and src.saga_id=saga_id and src.source_entity_type='thread' and src.source_entity_id=thread_id and src.session_id is not null
      and not exists(select 1 from public.canon_audit a where src.id=any(a.source_ids))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'event_id',e.event_id,'thread_id',e.thread_id,'objective_id',e.objective_id,'session_id',e.session_id,
    'session_number',s.session_number,'session_name',s.name,'event_type',e.event_type,'title',e.title,'detail',e.detail,
    'occurred_at',e.occurred_at,'source_type',e.source_type,'source_id',e.source_id
  ) order by coalesce(s.session_number,case when e.occurred_at <= (select min(first_session.created_at) from public.sessions first_session where first_session.workspace_id=workspace_id and first_session.world_id=world_id and first_session.saga_id=saga_id) then 0 else 2147483647 end),e.occurred_at,e.event_id),'[]'::jsonb) into result
  from evidence e left join public.sessions s on s.id=e.session_id and s.workspace_id=workspace_id and s.world_id=world_id and s.saga_id=saga_id;
  return result;
end;
$$;

revoke all on function internal.assert_thread_session_scope(uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function internal.write_thread_evidence(uuid,uuid,uuid,uuid,text,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.update_thread_details(uuid,uuid,uuid,uuid,timestamptz,text,text,text,text,uuid) from public,anon;
revoke all on function public.mutate_thread_objective(uuid,uuid,uuid,uuid,timestamptz,text,uuid,text,integer,uuid) from public,anon;
revoke all on function public.get_thread_detail(uuid,uuid,uuid,uuid) from public,anon;
revoke all on function public.get_thread_timeline(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.update_thread_details(uuid,uuid,uuid,uuid,timestamptz,text,text,text,text,uuid) to authenticated;
grant execute on function public.mutate_thread_objective(uuid,uuid,uuid,uuid,timestamptz,text,uuid,text,integer,uuid) to authenticated;
grant execute on function public.get_thread_detail(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.get_thread_timeline(uuid,uuid,uuid,uuid) to authenticated;
