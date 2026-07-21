alter table public.drafts
  add column if not exists action public.approval_action,
  add column if not exists resolved_by_gm_id uuid references auth.users(id) on delete set null;

create table if not exists public.approval_action_receipts (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  draft_id uuid not null,
  request_id uuid not null,
  action public.approval_action not null,
  input_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, world_id, saga_id, request_id)
);

alter table public.approval_action_receipts enable row level security;
revoke all on table public.approval_action_receipts from public, anon, authenticated;
grant all on table public.approval_action_receipts to service_role;

create index if not exists approval_action_receipts_draft_idx
  on public.approval_action_receipts (workspace_id, world_id, saga_id, draft_id, created_at desc);

create or replace function internal.approval_target_snapshot(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_scope public.content_scope,
  p_entity_type public.entity_type,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare
  result jsonb;
begin
  if p_target_id is null then return null; end if;

  if p_entity_type = 'character' then
    select jsonb_build_object('updated_at', e.updated_at, 'canon_state', e.canon_state, 'payload', jsonb_build_object('name', e.name, 'summary', e.summary, 'narrative', e.narrative, 'gm_notes', e.gm_notes, 'canon_state', e.canon_state)) into result
    from public.characters e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.scope=p_scope and ((p_scope='saga' and e.saga_id=p_saga_id) or (p_scope='world' and e.saga_id is null));
  elsif p_entity_type = 'place' then
    select jsonb_build_object('updated_at', e.updated_at, 'canon_state', e.canon_state, 'payload', jsonb_build_object('name', e.name, 'summary', e.summary, 'narrative', e.narrative, 'gm_notes', e.gm_notes, 'canon_state', e.canon_state)) into result
    from public.places e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.scope=p_scope and ((p_scope='saga' and e.saga_id=p_saga_id) or (p_scope='world' and e.saga_id is null));
  elsif p_entity_type = 'faction' then
    select jsonb_build_object('updated_at', e.updated_at, 'canon_state', e.canon_state, 'payload', jsonb_build_object('name', e.name, 'summary', e.summary, 'narrative', e.narrative, 'gm_notes', e.gm_notes, 'canon_state', e.canon_state)) into result
    from public.factions e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.scope=p_scope and ((p_scope='saga' and e.saga_id=p_saga_id) or (p_scope='world' and e.saga_id is null));
  elsif p_entity_type = 'artifact' then
    select jsonb_build_object('updated_at', e.updated_at, 'canon_state', e.canon_state, 'payload', jsonb_build_object('name', e.name, 'summary', e.summary, 'narrative', e.narrative, 'gm_notes', e.gm_notes, 'canon_state', e.canon_state)) into result
    from public.artifacts e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.scope=p_scope and ((p_scope='saga' and e.saga_id=p_saga_id) or (p_scope='world' and e.saga_id is null));
  elsif p_entity_type = 'thread' then
    select jsonb_build_object('updated_at', e.updated_at, 'canon_state', e.canon_state, 'payload', jsonb_build_object('name', e.name, 'summary', e.summary, 'narrative', e.narrative, 'gm_notes', e.gm_notes, 'objective', e.objective, 'resolution_state', e.resolution_state, 'is_loose_thread', e.is_loose_thread, 'canon_state', e.canon_state)) into result
    from public.threads e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.scope=p_scope and ((p_scope='saga' and e.saga_id=p_saga_id) or (p_scope='world' and e.saga_id is null));
  elsif p_entity_type = 'note' then
    select jsonb_build_object('updated_at', e.updated_at, 'canon_state', e.canon_state, 'payload', jsonb_build_object('title', e.title, 'body', e.body, 'note_type', e.note_type, 'canon_state', e.canon_state)) into result
    from public.notes e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.scope=p_scope and ((p_scope='saga' and e.saga_id=p_saga_id) or (p_scope='world' and e.saga_id is null));
  elsif p_entity_type = 'session' then
    select jsonb_build_object('updated_at', e.updated_at, 'canon_state', 'canon', 'status', e.status, 'payload', jsonb_build_object('name', e.name, 'status', e.status, 'objective', e.objective, 'opening_scene', e.opening_scene, 'scene_notes', e.scene_notes, 'prep_checklist', e.prep_checklist, 'pending_prep_suggestions', e.pending_prep_suggestions)) into result
    from public.sessions e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.saga_id=p_saga_id and e.scope='saga';
  end if;
  return result;
end;
$$;

create or replace function internal.approval_payload_is_allowed(
  p_entity_type public.entity_type,
  p_change_kind public.change_kind,
  p_payload jsonb
)
returns boolean
language plpgsql
immutable
set search_path = public, internal, pg_temp
as $$
declare
  allowed text[];
  key text;
begin
  if jsonb_typeof(p_payload) <> 'object' then return false; end if;
  if p_change_kind = 'archive_request' then return p_payload = '{}'::jsonb; end if;
  if p_entity_type in ('character','place','faction','artifact') then allowed := array['name','summary','narrative','gm_notes'];
  elsif p_entity_type = 'thread' then allowed := array['name','summary','narrative','gm_notes','objective','resolution_state','is_loose_thread'];
  elsif p_entity_type = 'note' then allowed := array['title','body','note_type'];
  elsif p_entity_type = 'session' then allowed := array['next_prep_implication','related_thread_id','related_entity_ids','source_session_id'];
  else return false;
  end if;
  for key in select jsonb_object_keys(p_payload) loop
    if not (key = any(allowed)) then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function internal.lock_approval_target(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_scope public.content_scope,
  p_entity_type public.entity_type,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
begin
  if p_entity_type='character' then perform 1 from public.characters e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.scope=p_scope and ((p_scope='saga' and e.saga_id=p_saga_id) or (p_scope='world' and e.saga_id is null)) for update;
  elsif p_entity_type='place' then perform 1 from public.places e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.scope=p_scope and ((p_scope='saga' and e.saga_id=p_saga_id) or (p_scope='world' and e.saga_id is null)) for update;
  elsif p_entity_type='faction' then perform 1 from public.factions e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.scope=p_scope and ((p_scope='saga' and e.saga_id=p_saga_id) or (p_scope='world' and e.saga_id is null)) for update;
  elsif p_entity_type='artifact' then perform 1 from public.artifacts e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.scope=p_scope and ((p_scope='saga' and e.saga_id=p_saga_id) or (p_scope='world' and e.saga_id is null)) for update;
  elsif p_entity_type='thread' then perform 1 from public.threads e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.scope=p_scope and ((p_scope='saga' and e.saga_id=p_saga_id) or (p_scope='world' and e.saga_id is null)) for update;
  elsif p_entity_type='note' then perform 1 from public.notes e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.scope=p_scope and ((p_scope='saga' and e.saga_id=p_saga_id) or (p_scope='world' and e.saga_id is null)) for update;
  elsif p_entity_type='session' then perform 1 from public.sessions e where e.id=p_target_id and e.workspace_id=p_workspace_id and e.world_id=p_world_id and e.saga_id=p_saga_id and e.scope='saga' for update;
  end if;
  return internal.approval_target_snapshot(p_workspace_id,p_world_id,p_saga_id,p_scope,p_entity_type,p_target_id);
end;
$$;

create or replace function internal.approval_field_diffs(
  p_old_payload jsonb,
  p_new_payload jsonb,
  p_change_kind public.change_kind
)
returns jsonb
language plpgsql
immutable
set search_path = public, internal, pg_temp
as $$
declare
  result jsonb := '[]'::jsonb;
  key text;
  old_value jsonb;
  new_value jsonb;
begin
  if p_change_kind = 'archive_request' then
    return jsonb_build_array(jsonb_build_object('field','canon_state','label','Canon state','old',coalesce(p_old_payload->'canon_state','null'::jsonb),'new','archived','value_type','string'));
  end if;
  for key in select jsonb_object_keys(coalesce(p_new_payload, '{}'::jsonb)) order by 1 loop
    old_value := case when p_change_kind='create' then 'null'::jsonb else coalesce(p_old_payload->key, 'null'::jsonb) end;
    new_value := coalesce(p_new_payload->key, 'null'::jsonb);
    if p_change_kind='create' or old_value is distinct from new_value then
      result := result || jsonb_build_array(jsonb_build_object(
        'field', key,
        'label', initcap(replace(key, '_', ' ')),
        'old', old_value,
        'new', new_value,
        'value_type', coalesce(jsonb_typeof(new_value), 'null')
      ));
    end if;
  end loop;
  return result;
end;
$$;

create or replace function internal.approval_diff_object(
  p_old_payload jsonb,
  p_new_payload jsonb,
  p_change_kind public.change_kind
)
returns jsonb
language sql
immutable
set search_path = public, internal, pg_temp
as $$
  select coalesce(jsonb_object_agg(item->>'field', jsonb_build_object('old', item->'old', 'new', item->'new')), '{}'::jsonb)
  from jsonb_array_elements(internal.approval_field_diffs(p_old_payload, p_new_payload, p_change_kind)) item;
$$;

create or replace function internal.approval_source_health(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_draft_id uuid
)
returns text
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare
  contexts jsonb;
  item jsonb;
  drifted boolean := false;
begin
  if not exists (
    select 1 from public.draft_sources ds join public.sources s on s.id=ds.source_id
    where ds.draft_id=p_draft_id and ds.workspace_id=p_workspace_id and ds.world_id=p_world_id and ds.saga_id=p_saga_id
      and s.workspace_id=ds.workspace_id and s.world_id=ds.world_id and s.saga_id=ds.saga_id and s.scope=ds.scope
  ) then return 'broken'; end if;
  contexts := public.get_draft_source_context(p_workspace_id, p_world_id, p_saga_id, p_draft_id);
  for item in select value from jsonb_array_elements(contexts) loop
    if item->>'status' in ('broken','unavailable','permission_denied') or item->>'drift_state' in ('deleted','unavailable') then return 'broken'; end if;
    if item->>'drift_state' = 'edited' then drifted := true; end if;
  end loop;
  return case when drifted then 'drifted' else 'healthy' end;
end;
$$;

create or replace function internal.approval_conflict(
  p_draft public.drafts,
  p_snapshot jsonb,
  p_source_health text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare
  kind text := 'none';
  blocking boolean := false;
  concurrent_count int := 0;
begin
  if p_draft.change_kind <> 'create' and p_draft.change_kind <> 'merge' then
    if p_snapshot is null then kind := 'missing_target'; blocking := true;
    elsif p_snapshot->>'canon_state' = 'archived' then kind := 'archived_target'; blocking := true;
    elsif p_draft.expected_version is null or (p_snapshot->>'updated_at')::timestamptz is distinct from p_draft.expected_version then kind := 'stale_target'; blocking := true;
    end if;
  end if;
  if not blocking and p_source_health='broken' then kind := 'broken_source'; blocking := true;
  elsif not blocking and p_source_health='drifted' then kind := 'source_drift'; blocking := true;
  end if;
  if p_draft.target_entity_id is not null then
    select count(*) into concurrent_count from public.drafts other
    where other.workspace_id=p_draft.workspace_id and other.world_id=p_draft.world_id and other.saga_id=p_draft.saga_id
      and other.scope=p_draft.scope and other.target_entity_id=p_draft.target_entity_id and other.state='pending'
      and other.id<>p_draft.id and other.proposed_payload ?| array(select jsonb_object_keys(p_draft.proposed_payload));
  end if;
  return jsonb_build_object('kind',kind,'blocking',blocking,'concurrent_count',concurrent_count,'expected_version',p_draft.expected_version,'live_version',p_snapshot->>'updated_at');
end;
$$;

create or replace function public.get_approval_queue(workspace_id uuid, world_id uuid, saga_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare
  d public.drafts%rowtype;
  snapshot jsonb;
  payload jsonb;
  source_health text;
  result jsonb := '[]'::jsonb;
begin
  perform public.assert_saga_access($1,$2,$3);
  for d in select * from public.drafts where drafts.workspace_id=$1 and drafts.world_id=$2 and drafts.saga_id=$3 and drafts.scope='saga' order by created_at desc, id loop
    snapshot := internal.approval_target_snapshot($1,$2,$3,d.scope,d.entity_type,d.target_entity_id);
    payload := case when d.committed_payload is not null then d.committed_payload else d.proposed_payload end;
    source_health := internal.approval_source_health($1,$2,$3,d.id);
    result := result || jsonb_build_array(jsonb_build_object(
      'id',d.id,'entity_type',d.entity_type,'target_entity_id',d.target_entity_id,'state',d.state,'change_kind',d.change_kind,
      'title',coalesce(payload->>'name',payload->>'title',snapshot->'payload'->>'name',snapshot->'payload'->>'title',initcap(d.entity_type::text)||' proposal'),
      'confidence_band',d.confidence_band,'confidence_reason',d.confidence_reason,'created_by',d.created_by,'created_at',d.created_at,
      'batch_id',d.draft_batch_id,'editable_payload',payload,
      'field_diffs',internal.approval_field_diffs(coalesce(snapshot->'payload','{}'::jsonb),payload,d.change_kind),
      'target',snapshot,'source_health',source_health,'conflict',internal.approval_conflict(d,snapshot,source_health),
      'provenance',jsonb_build_object('ai_task_name',d.ai_task_name,'prompt_version',d.ai_prompt_version,'model',d.ai_model,'provider',d.ai_provider,'ai_task_run_id',d.ai_task_run_id,'pipeline_run_id',d.pipeline_run_id,'session_id',d.session_id),
      'audit',(select jsonb_build_object('id',a.id,'action',a.action,'source_ids',a.source_ids,'change_summary',a.change_summary,'created_at',a.created_at) from public.canon_audit a where a.draft_id=d.id order by a.created_at desc limit 1)
    ));
  end loop;
  return result;
end;
$$;

create or replace function public.save_draft_edit(
  workspace_id uuid, world_id uuid, saga_id uuid, draft_id uuid, committed_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  d public.drafts%rowtype;
begin
  perform public.assert_saga_access($1,$2,$3);
  select * into d from public.drafts where id=$4 and drafts.workspace_id=$1 and drafts.world_id=$2 and drafts.saga_id=$3 and scope='saga' for update;
  if not found then return jsonb_build_object('ok',false,'conflict','draft_unavailable'); end if;
  if d.state<>'pending' then return jsonb_build_object('ok',false,'conflict','already_resolved'); end if;
  if not internal.approval_payload_is_allowed(d.entity_type,d.change_kind,$5) then return jsonb_build_object('ok',false,'conflict','invalid_edit'); end if;
  update public.drafts set committed_payload=$5, gm_edit_diff=internal.approval_diff_object(d.proposed_payload,$5,d.change_kind), updated_at=now() where id=d.id;
  return jsonb_build_object('ok',true,'draft_id',d.id,'committed_payload',$5);
end;
$$;

create or replace function public.refresh_draft_baseline(
  workspace_id uuid, world_id uuid, saga_id uuid, draft_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  d public.drafts%rowtype;
  snapshot jsonb;
begin
  perform public.assert_saga_access($1,$2,$3);
  select * into d from public.drafts where id=$4 and drafts.workspace_id=$1 and drafts.world_id=$2 and drafts.saga_id=$3 and scope='saga' for update;
  if not found then return jsonb_build_object('ok',false,'conflict','draft_unavailable'); end if;
  if d.state<>'pending' then return jsonb_build_object('ok',false,'conflict','already_resolved'); end if;
  snapshot := internal.approval_target_snapshot($1,$2,$3,d.scope,d.entity_type,d.target_entity_id);
  if snapshot is null then return jsonb_build_object('ok',false,'conflict','missing_target'); end if;
  if snapshot->>'canon_state'='archived' then return jsonb_build_object('ok',false,'conflict','archived_target'); end if;
  update public.drafts set expected_version=(snapshot->>'updated_at')::timestamptz, updated_at=now() where id=d.id;
  return jsonb_build_object('ok',true,'draft_id',d.id,'expected_version',snapshot->>'updated_at');
end;
$$;

create or replace function internal.record_approval_receipt(
  p_workspace_id uuid, p_world_id uuid, p_saga_id uuid, p_draft_id uuid,
  p_request_id uuid, p_action public.approval_action, p_input_hash text, p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  existing public.approval_action_receipts%rowtype;
begin
  insert into public.approval_action_receipts(workspace_id,world_id,saga_id,draft_id,request_id,action,input_hash,result)
  values(p_workspace_id,p_world_id,p_saga_id,p_draft_id,p_request_id,p_action,p_input_hash,p_result)
  on conflict (workspace_id,world_id,saga_id,request_id) do nothing;
  select * into existing from public.approval_action_receipts where workspace_id=p_workspace_id and world_id=p_world_id and saga_id=p_saga_id and request_id=p_request_id;
  if existing.input_hash<>p_input_hash then return jsonb_build_object('ok',false,'conflict','idempotency_mismatch'); end if;
  return existing.result;
end;
$$;

create or replace function internal.any_scoped_entity_exists(
  p_workspace_id uuid, p_world_id uuid, p_saga_id uuid, p_entity_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, internal, pg_temp
as $$
  select exists(select 1 from public.characters where id=p_entity_id and workspace_id=p_workspace_id and world_id=p_world_id and saga_id=p_saga_id and scope='saga' and canon_state='canon')
    or exists(select 1 from public.places where id=p_entity_id and workspace_id=p_workspace_id and world_id=p_world_id and saga_id=p_saga_id and scope='saga' and canon_state='canon')
    or exists(select 1 from public.factions where id=p_entity_id and workspace_id=p_workspace_id and world_id=p_world_id and saga_id=p_saga_id and scope='saga' and canon_state='canon')
    or exists(select 1 from public.artifacts where id=p_entity_id and workspace_id=p_workspace_id and world_id=p_world_id and saga_id=p_saga_id and scope='saga' and canon_state='canon')
    or exists(select 1 from public.threads where id=p_entity_id and workspace_id=p_workspace_id and world_id=p_world_id and saga_id=p_saga_id and scope='saga' and canon_state='canon');
$$;

create or replace function public.resolve_draft(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  draft_id uuid,
  action public.approval_action,
  request_id uuid,
  rejection_tags public.rejection_reason_tag[] default '{}',
  rejection_note text default null,
  merge_target_id uuid default null,
  acknowledge_source_drift boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  d public.drafts%rowtype;
  existing public.approval_action_receipts%rowtype;
  snapshot jsonb;
  payload jsonb;
  source_health text;
  source_ids uuid[] := '{}'::uuid[];
  inserted_id uuid;
  followup_id uuid;
  merge_snapshot jsonb;
  input_hash text;
  result jsonb;
  fields jsonb;
  provenance jsonb;
  related_id jsonb;
  suggestion jsonb;
begin
  perform public.assert_saga_access($1,$2,$3);
  input_hash := encode(extensions.digest(convert_to(jsonb_build_object('draft_id',$4,'action',$5,'rejection_tags',$7,'rejection_note',$8,'merge_target_id',$9,'acknowledge_source_drift',$10)::text,'UTF8'),'sha256'),'hex');
  select * into existing from public.approval_action_receipts where approval_action_receipts.workspace_id=$1 and approval_action_receipts.world_id=$2 and approval_action_receipts.saga_id=$3 and approval_action_receipts.request_id=$6;
  if found then
    if existing.input_hash<>input_hash then return jsonb_build_object('ok',false,'conflict','idempotency_mismatch'); end if;
    return existing.result || jsonb_build_object('replayed',true);
  end if;

  select * into d from public.drafts where id=$4 and drafts.workspace_id=$1 and drafts.world_id=$2 and drafts.saga_id=$3 and scope='saga' for update;
  if not found then
    result := jsonb_build_object('ok',false,'conflict','draft_unavailable');
    return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result);
  end if;
  if d.state<>'pending' then
    result := jsonb_build_object('ok',false,'conflict','already_resolved','state',d.state);
    return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result);
  end if;

  if $5='reject' then
    update public.drafts set state='rejected',action='reject',rejection_reason_tags=coalesce($7,'{}'),rejection_note=nullif(trim($8),''),resolved_at=now(),resolved_by_gm_id=auth.uid(),updated_at=now() where id=d.id;
    result := jsonb_build_object('ok',true,'draft_id',d.id,'action','reject','consequence','Proposal rejected; canon was not changed.');
    return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result);
  end if;

  if $5='merge' then
    if d.change_kind<>'merge' or d.entity_type='session' then
      result := jsonb_build_object('ok',false,'conflict','merge_not_applicable');
      return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result);
    end if;
    if $9 is null then
      result := jsonb_build_object('ok',false,'conflict','merge_target_required');
      return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result);
    end if;
    merge_snapshot := internal.lock_approval_target($1,$2,$3,d.scope,d.entity_type,$9);
    if merge_snapshot is null or merge_snapshot->>'canon_state'='archived' then
      result := jsonb_build_object('ok',false,'conflict',case when merge_snapshot is null then 'merge_target_unavailable' else 'merge_target_archived' end);
      return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result);
    end if;
    payload := coalesce(d.committed_payload,d.proposed_payload) - 'name' - 'title' - 'merge_target_id' - 'fields_to_carry_over';
    insert into public.drafts(workspace_id,world_id,saga_id,scope,entity_type,target_entity_id,state,change_kind,proposed_payload,expected_version,confidence_band,confidence_reason,created_by,draft_batch_id,ai_task_run_id,pipeline_run_id,session_id,ai_task_name,ai_prompt_version,ai_model,ai_provider)
    values($1,$2,$3,d.scope,d.entity_type,$9,'pending','update',payload,(merge_snapshot->>'updated_at')::timestamptz,d.confidence_band,d.confidence_reason,d.created_by,d.draft_batch_id,d.ai_task_run_id,d.pipeline_run_id,d.session_id,d.ai_task_name,d.ai_prompt_version,d.ai_model,d.ai_provider)
    returning id into followup_id;
    insert into public.draft_sources(workspace_id,world_id,saga_id,scope,draft_id,source_id)
    select ds.workspace_id,ds.world_id,ds.saga_id,ds.scope,followup_id,ds.source_id from public.draft_sources ds where ds.draft_id=d.id;
    update public.drafts set state='merged',action='merge',merge_target_id=$9,resolved_at=now(),resolved_by_gm_id=auth.uid(),updated_at=now() where id=d.id;
    result := jsonb_build_object('ok',true,'draft_id',d.id,'action','merge','followup_draft_id',followup_id,'consequence','Identity merged; canon is unchanged until the follow-up update is approved.');
    return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result);
  end if;

  if $5 not in ('approve','edit_and_approve') then
    result := jsonb_build_object('ok',false,'conflict','unsupported_action');
    return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result);
  end if;

  payload := case when $5='edit_and_approve' then d.committed_payload else d.proposed_payload end;
  if payload is null or not internal.approval_payload_is_allowed(d.entity_type,d.change_kind,payload) then
    result := jsonb_build_object('ok',false,'conflict','invalid_payload');
    return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result);
  end if;
  source_health := internal.approval_source_health($1,$2,$3,d.id);
  snapshot := internal.lock_approval_target($1,$2,$3,d.scope,d.entity_type,d.target_entity_id);
  if d.change_kind not in ('create','merge') then
    if snapshot is null then result:=jsonb_build_object('ok',false,'conflict','missing_target'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result); end if;
    if snapshot->>'canon_state'='archived' then result:=jsonb_build_object('ok',false,'conflict','archived_target'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result); end if;
    if d.expected_version is null or (snapshot->>'updated_at')::timestamptz is distinct from d.expected_version then result:=jsonb_build_object('ok',false,'conflict','stale_target','live_version',snapshot->>'updated_at'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result); end if;
  end if;
  if source_health='broken' then result:=jsonb_build_object('ok',false,'conflict','broken_source'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result); end if;
  if source_health='drifted' and not $10 then result:=jsonb_build_object('ok',false,'conflict','source_drift'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result); end if;
  select coalesce(array_agg(ds.source_id order by ds.created_at,ds.id),'{}') into source_ids from public.draft_sources ds where ds.draft_id=d.id;

  if d.change_kind='create' then
    if d.entity_type='character' then insert into public.characters(workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,canon_state,created_by) values($1,$2,$3,d.scope,payload->>'name',payload->>'summary',payload->>'narrative',payload->>'gm_notes','canon','gm_via_ai_approval') returning id into inserted_id;
    elsif d.entity_type='place' then insert into public.places(workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,canon_state,created_by) values($1,$2,$3,d.scope,payload->>'name',payload->>'summary',payload->>'narrative',payload->>'gm_notes','canon','gm_via_ai_approval') returning id into inserted_id;
    elsif d.entity_type='faction' then insert into public.factions(workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,canon_state,created_by) values($1,$2,$3,d.scope,payload->>'name',payload->>'summary',payload->>'narrative',payload->>'gm_notes','canon','gm_via_ai_approval') returning id into inserted_id;
    elsif d.entity_type='artifact' then insert into public.artifacts(workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,canon_state,created_by) values($1,$2,$3,d.scope,payload->>'name',payload->>'summary',payload->>'narrative',payload->>'gm_notes','canon','gm_via_ai_approval') returning id into inserted_id;
    elsif d.entity_type='thread' then insert into public.threads(workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,objective,resolution_state,is_loose_thread,canon_state,created_by) values($1,$2,$3,d.scope,payload->>'name',payload->>'summary',payload->>'narrative',payload->>'gm_notes',payload->>'objective',coalesce(nullif(payload->>'resolution_state',''),'active'),coalesce((payload->>'is_loose_thread')::boolean,false),'canon','gm_via_ai_approval') returning id into inserted_id;
    elsif d.entity_type='note' then insert into public.notes(workspace_id,world_id,saga_id,scope,note_type,title,body,canon_state,created_by) values($1,$2,$3,d.scope,coalesce(nullif(payload->>'note_type',''),'lore')::public.note_type,payload->>'title',coalesce(payload->>'body',''),'canon','gm_via_ai_approval') returning id into inserted_id;
    else result:=jsonb_build_object('ok',false,'conflict','unsupported_create'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result); end if;
  elsif d.change_kind='archive_request' then
    if d.entity_type='character' then update public.characters set canon_state='archived',status='archived',updated_at=now() where id=d.target_entity_id returning id into inserted_id;
    elsif d.entity_type='place' then update public.places set canon_state='archived',status='archived',updated_at=now() where id=d.target_entity_id returning id into inserted_id;
    elsif d.entity_type='faction' then update public.factions set canon_state='archived',status='archived',updated_at=now() where id=d.target_entity_id returning id into inserted_id;
    elsif d.entity_type='artifact' then update public.artifacts set canon_state='archived',status='archived',updated_at=now() where id=d.target_entity_id returning id into inserted_id;
    elsif d.entity_type='thread' then update public.threads set canon_state='archived',status='archived',updated_at=now() where id=d.target_entity_id returning id into inserted_id;
    elsif d.entity_type='note' then update public.notes set canon_state='archived',updated_at=now() where id=d.target_entity_id returning id into inserted_id;
    else result:=jsonb_build_object('ok',false,'conflict','unsupported_archive'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result); end if;
  elsif d.change_kind='update' then
    if d.entity_type='character' then update public.characters e set name=case when payload?'name' then payload->>'name' else e.name end,summary=case when payload?'summary' then payload->>'summary' else e.summary end,narrative=case when payload?'narrative' then payload->>'narrative' else e.narrative end,gm_notes=case when payload?'gm_notes' then payload->>'gm_notes' else e.gm_notes end,updated_at=now() where e.id=d.target_entity_id returning id into inserted_id;
    elsif d.entity_type='place' then update public.places e set name=case when payload?'name' then payload->>'name' else e.name end,summary=case when payload?'summary' then payload->>'summary' else e.summary end,narrative=case when payload?'narrative' then payload->>'narrative' else e.narrative end,gm_notes=case when payload?'gm_notes' then payload->>'gm_notes' else e.gm_notes end,updated_at=now() where e.id=d.target_entity_id returning id into inserted_id;
    elsif d.entity_type='faction' then update public.factions e set name=case when payload?'name' then payload->>'name' else e.name end,summary=case when payload?'summary' then payload->>'summary' else e.summary end,narrative=case when payload?'narrative' then payload->>'narrative' else e.narrative end,gm_notes=case when payload?'gm_notes' then payload->>'gm_notes' else e.gm_notes end,updated_at=now() where e.id=d.target_entity_id returning id into inserted_id;
    elsif d.entity_type='artifact' then update public.artifacts e set name=case when payload?'name' then payload->>'name' else e.name end,summary=case when payload?'summary' then payload->>'summary' else e.summary end,narrative=case when payload?'narrative' then payload->>'narrative' else e.narrative end,gm_notes=case when payload?'gm_notes' then payload->>'gm_notes' else e.gm_notes end,updated_at=now() where e.id=d.target_entity_id returning id into inserted_id;
    elsif d.entity_type='thread' then update public.threads e set name=case when payload?'name' then payload->>'name' else e.name end,summary=case when payload?'summary' then payload->>'summary' else e.summary end,narrative=case when payload?'narrative' then payload->>'narrative' else e.narrative end,gm_notes=case when payload?'gm_notes' then payload->>'gm_notes' else e.gm_notes end,objective=case when payload?'objective' then payload->>'objective' else e.objective end,resolution_state=case when payload?'resolution_state' then payload->>'resolution_state' else e.resolution_state end,is_loose_thread=case when payload?'is_loose_thread' then (payload->>'is_loose_thread')::boolean when payload?'resolution_state' and payload->>'resolution_state'<>'active' then false else e.is_loose_thread end,updated_at=now() where e.id=d.target_entity_id returning id into inserted_id;
    elsif d.entity_type='note' then update public.notes e set title=case when payload?'title' then payload->>'title' else e.title end,body=case when payload?'body' then coalesce(payload->>'body','') else e.body end,note_type=case when payload?'note_type' then (payload->>'note_type')::public.note_type else e.note_type end,updated_at=now() where e.id=d.target_entity_id returning id into inserted_id;
    elsif d.entity_type='session' then
      if snapshot->>'status'<>'planned' then result:=jsonb_build_object('ok',false,'conflict','session_state','status',snapshot->>'status'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result); end if;
      if nullif(trim(payload->>'next_prep_implication'),'') is null then result:=jsonb_build_object('ok',false,'conflict','invalid_payload'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result); end if;
      if nullif(payload->>'related_thread_id','') is not null and not exists(select 1 from public.threads t where t.id=(payload->>'related_thread_id')::uuid and t.workspace_id=$1 and t.world_id=$2 and t.saga_id=$3 and t.scope='saga' and t.canon_state='canon') then result:=jsonb_build_object('ok',false,'conflict','cross_scope_reference'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result); end if;
      for related_id in select value from jsonb_array_elements(coalesce(payload->'related_entity_ids','[]'::jsonb)) loop
        if jsonb_typeof(related_id)<>'string' or not internal.any_scoped_entity_exists($1,$2,$3,(related_id#>>'{}')::uuid) then result:=jsonb_build_object('ok',false,'conflict','cross_scope_reference'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result); end if;
      end loop;
      suggestion:=jsonb_build_object('id',d.id,'scope','scene_notes','payload',jsonb_build_object('text',payload->>'next_prep_implication','related_thread_id',payload->>'related_thread_id','related_entity_ids',coalesce(payload->'related_entity_ids','[]'::jsonb),'sources',to_jsonb(source_ids)),'status','pending','generated_at',now(),'ai_prompt_version',d.ai_prompt_version,'draft_id',d.id);
      update public.sessions e set pending_prep_suggestions=case when exists(select 1 from jsonb_array_elements(e.pending_prep_suggestions) x where x->>'draft_id'=d.id::text) then e.pending_prep_suggestions else e.pending_prep_suggestions||jsonb_build_array(suggestion) end,updated_at=now() where e.id=d.target_entity_id returning id into inserted_id;
    else result:=jsonb_build_object('ok',false,'conflict','unsupported_update'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result); end if;
  else result:=jsonb_build_object('ok',false,'conflict','unsupported_change_kind'); return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result);
  end if;

  fields:=internal.approval_diff_object(coalesce(snapshot->'payload','{}'::jsonb),case when d.change_kind='archive_request' then jsonb_build_object('canon_state','archived') else payload end,d.change_kind);
  provenance:=jsonb_build_object('draft_batch_id',d.draft_batch_id,'ai_task_run_id',d.ai_task_run_id,'pipeline_run_id',d.pipeline_run_id,'session_id',d.session_id,'ai_task_name',d.ai_task_name,'ai_prompt_version',d.ai_prompt_version,'ai_model',d.ai_model,'ai_provider',d.ai_provider,'source_drift_acknowledged',source_health='drifted' and $10);
  insert into public.canon_audit(workspace_id,world_id,saga_id,scope,entity_type,entity_id,draft_id,from_state,to_state,action,actor_kind,source_ids,change_summary)
  values($1,$2,$3,d.scope,d.entity_type,coalesce(d.target_entity_id,inserted_id),d.id,case when d.change_kind='create' then null else 'canon'::public.entity_canon_state end,case when d.change_kind='archive_request' then 'archived'::public.entity_canon_state else 'canon'::public.entity_canon_state end,$5,'gm_via_ai_approval',source_ids,jsonb_build_object('fields',fields,'provenance',provenance));
  update public.drafts set state='approved',action=$5,target_entity_id=coalesce(d.target_entity_id,inserted_id),committed_payload=payload,gm_edit_diff=case when $5='edit_and_approve' then internal.approval_diff_object(d.proposed_payload,payload,d.change_kind) else gm_edit_diff end,resolved_at=now(),resolved_by_gm_id=auth.uid(),updated_at=now() where id=d.id;
  result:=jsonb_build_object('ok',true,'draft_id',d.id,'action',$5,'entity_id',coalesce(d.target_entity_id,inserted_id),'consequence',case when d.change_kind='archive_request' then 'Record archived; it was not deleted.' else 'Reviewed proposal committed to canon with one audit entry.' end);
  return internal.record_approval_receipt($1,$2,$3,$4,$6,$5,input_hash,result);
end;
$$;

create or replace function public.update_draft_state(
  workspace_id uuid, world_id uuid, saga_id uuid, draft_id uuid,
  state public.draft_state, rejection_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  result jsonb;
  requested_action public.approval_action;
  merge_id uuid;
begin
  if $5='approved' then requested_action:='approve';
  elsif $5='rejected' then requested_action:='reject';
  elsif $5='merged' then requested_action:='merge';
  elsif $5='superseded' then
    perform public.assert_saga_access($1,$2,$3);
    update public.drafts set state='superseded',resolved_at=now(),resolved_by_gm_id=auth.uid(),updated_at=now() where id=$4 and drafts.workspace_id=$1 and drafts.world_id=$2 and drafts.saga_id=$3 and drafts.state='pending';
    if not found then raise exception 'Draft is not available' using errcode='42501'; end if;
    return $4;
  else raise exception 'Unsupported draft state' using errcode='23514';
  end if;
  if requested_action='merge' then select coalesce(d.merge_target_id,nullif(d.proposed_payload->>'merge_target_id','')::uuid) into merge_id from public.drafts d where d.id=$4; end if;
  result:=public.resolve_draft($1,$2,$3,$4,requested_action,public.uuid7(),'{}',rejection_note,merge_id,false);
  if not coalesce((result->>'ok')::boolean,false) then raise exception 'conflict: %', coalesce(result->>'conflict','Draft resolution failed') using errcode=case when result->>'conflict'='stale_target' then '40001' else '23514' end; end if;
  return $4;
end;
$$;

revoke all on function public.get_approval_queue(uuid,uuid,uuid) from public,anon;
revoke all on function public.save_draft_edit(uuid,uuid,uuid,uuid,jsonb) from public,anon;
revoke all on function public.refresh_draft_baseline(uuid,uuid,uuid,uuid) from public,anon;
revoke all on function public.resolve_draft(uuid,uuid,uuid,uuid,public.approval_action,uuid,public.rejection_reason_tag[],text,uuid,boolean) from public,anon;
revoke all on function public.update_draft_state(uuid,uuid,uuid,uuid,public.draft_state,text) from public,anon;
grant execute on function public.get_approval_queue(uuid,uuid,uuid) to authenticated;
grant execute on function public.save_draft_edit(uuid,uuid,uuid,uuid,jsonb) to authenticated;
grant execute on function public.refresh_draft_baseline(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.resolve_draft(uuid,uuid,uuid,uuid,public.approval_action,uuid,public.rejection_reason_tag[],text,uuid,boolean) to authenticated;
grant execute on function public.update_draft_state(uuid,uuid,uuid,uuid,public.draft_state,text) to authenticated;
