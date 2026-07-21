alter table public.sessions
  add column if not exists planned_start_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists duplicated_from_session_id uuid references public.sessions(id) on delete set null;

update public.sessions
set planned_start_at = planned_date::timestamp at time zone 'UTC'
where planned_start_at is null and planned_date is not null;

alter table public.session_active_threads add column if not exists order_index integer not null default 0;

with ordered as (
  select id, row_number() over (partition by session_id order by created_at, id) - 1 as idx
  from public.session_active_threads
)
update public.session_active_threads sat set order_index=ordered.idx from ordered where ordered.id=sat.id;

create index if not exists sessions_saga_schedule_idx on public.sessions(workspace_id,world_id,saga_id,planned_start_at) where archived_at is null;
create index if not exists session_active_threads_order_idx on public.session_active_threads(session_id,order_index);

create table if not exists internal.session_prep_action_receipts (
  actor_id uuid not null,
  request_key text not null,
  workspace_id uuid not null,
  world_id uuid not null,
  saga_id uuid not null,
  session_id uuid not null,
  operation text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(actor_id,request_key)
);
revoke all on internal.session_prep_action_receipts from public,anon,authenticated;

create or replace function internal.prep_pin_snapshot(p_type public.entity_type,p_id uuid,p_workspace uuid,p_world uuid,p_saga uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if p_type='character' then select jsonb_build_object('name',e.name,'canon_state',e.canon_state) into result from public.characters e where e.id=p_id and e.workspace_id=p_workspace and e.world_id=p_world and e.saga_id=p_saga and e.scope='saga';
  elsif p_type='place' then select jsonb_build_object('name',e.name,'canon_state',e.canon_state) into result from public.places e where e.id=p_id and e.workspace_id=p_workspace and e.world_id=p_world and e.saga_id=p_saga and e.scope='saga';
  elsif p_type='faction' then select jsonb_build_object('name',e.name,'canon_state',e.canon_state) into result from public.factions e where e.id=p_id and e.workspace_id=p_workspace and e.world_id=p_world and e.saga_id=p_saga and e.scope='saga';
  elsif p_type='artifact' then select jsonb_build_object('name',e.name,'canon_state',e.canon_state) into result from public.artifacts e where e.id=p_id and e.workspace_id=p_workspace and e.world_id=p_world and e.saga_id=p_saga and e.scope='saga';
  elsif p_type='thread' then select jsonb_build_object('name',e.name,'canon_state',e.canon_state) into result from public.threads e where e.id=p_id and e.workspace_id=p_workspace and e.world_id=p_world and e.saga_id=p_saga and e.scope='saga';
  elsif p_type='note' then select jsonb_build_object('name',coalesce(e.title,'Untitled Note'),'canon_state',e.canon_state) into result from public.notes e where e.id=p_id and e.workspace_id=p_workspace and e.world_id=p_world and e.saga_id=p_saga and e.scope='saga';
  end if;
  return result;
end $$;

create or replace function public.get_session_prep(workspace_id uuid,world_id uuid,saga_id uuid,session_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.sessions%rowtype; prior public.sessions%rowtype; pins jsonb; threads jsonb; prior_json jsonb;
begin
  perform public.assert_saga_access($1,$2,$3);
  select * into s from public.sessions x where x.id=$4 and x.workspace_id=$1 and x.world_id=$2 and x.saga_id=$3 and x.archived_at is null;
  if s.id is null then raise exception 'Session is not available' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'key',p.entity_type::text||':'||p.entity_id::text,'entity_type',p.entity_type,'entity_id',p.entity_id,
    'name',coalesce(snapshot->>'name','Unavailable '||p.entity_type::text),
    'state',case when snapshot is null then 'missing' when snapshot->>'canon_state'='archived' then 'archived' else 'available' end,
    'order_index',p.order_index) order by p.order_index,p.created_at,p.id),'[]'::jsonb) into pins
  from public.session_pinned_entities p left join lateral (select internal.prep_pin_snapshot(p.entity_type,p.entity_id,$1,$2,$3) snapshot) snap on true where p.session_id=s.id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'key','thread:'||t.thread_id::text,'entity_type','thread','entity_id',t.thread_id,
    'name',coalesce(th.name,'Unavailable Thread'),'state',case when th.id is null then 'missing' when th.canon_state='archived' then 'archived' else 'available' end,
    'order_index',t.order_index) order by t.order_index,t.created_at,t.id),'[]'::jsonb) into threads
  from public.session_active_threads t left join public.threads th on th.id=t.thread_id and th.workspace_id=$1 and th.world_id=$2 and th.saga_id=$3 where t.session_id=s.id;
  select * into prior from public.sessions p where p.workspace_id=$1 and p.world_id=$2 and p.saga_id=$3 and p.status='ended' and p.archived_at is null and (p.session_number<s.session_number or (s.session_number is null and p.ended_at<s.created_at)) order by p.session_number desc nulls last,p.ended_at desc limit 1;
  if prior.id is null then prior_json:=jsonb_build_object('state','none','session_name',null,'text','No prior session.');
  elsif nullif(btrim(prior.summary),'') is not null then prior_json:=jsonb_build_object('state','approved','session_name',prior.name,'text',prior.summary);
  else prior_json:=jsonb_build_object('state','fallback','session_name',prior.name,'text',case when nullif(btrim(prior.objective),'') is not null then 'No approved summary yet. Prior objective: '||prior.objective when nullif(btrim(prior.scene_notes),'') is not null then 'No approved summary yet. Prior notes: '||prior.scene_notes else 'No approved summary is available yet.' end);
  end if;
  return jsonb_build_object('session',to_jsonb(s),'pinned_entities',pins,'active_threads',threads,'prior_summary',prior_json);
end $$;

create or replace function public.autosave_session_prep(
  workspace_id uuid,world_id uuid,saga_id uuid,session_id uuid,expected_version timestamptz,
  session_name text,planned_start_at timestamptz,objective text,opening_scene text,scene_notes text,
  prep_checklist jsonb,pinned_entities jsonb default '[]',active_threads jsonb default '[]')
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.sessions%rowtype; pin text; pin_type public.entity_type; pin_id uuid; idx integer:=0; active_thread_id uuid;
begin
  perform public.assert_saga_access($1,$2,$3);
  select * into s from public.sessions x where x.id=$4 and x.workspace_id=$1 and x.world_id=$2 and x.saga_id=$3 and x.archived_at is null for update;
  if s.id is null then raise exception 'Session is not available' using errcode='42501'; end if;
  if s.status not in ('planned','ready') then raise exception 'Prep is read-only for this Session state' using errcode='23514'; end if;
  if s.updated_at is distinct from expected_version then raise exception 'Prep changed elsewhere. Your local draft was preserved.' using errcode='40001'; end if;
  if nullif(btrim(session_name),'') is null then raise exception 'Session title is required' using errcode='22023'; end if;
  for pin in select jsonb_array_elements_text(coalesce(pinned_entities,'[]')) loop
    begin pin_type:=split_part(pin,':',1)::public.entity_type; pin_id:=split_part(pin,':',2)::uuid; exception when others then raise exception 'Pinned entity reference is invalid' using errcode='22023'; end;
    if internal.prep_pin_snapshot(pin_type,pin_id,$1,$2,$3) is null and not exists(select 1 from public.session_pinned_entities old where old.session_id=s.id and old.entity_type=pin_type and old.entity_id=pin_id) then raise exception 'Pinned entity is outside the Saga' using errcode='23514'; end if;
  end loop;
  for active_thread_id in select jsonb_array_elements_text(coalesce(active_threads,'[]'))::uuid loop
    if not exists(select 1 from public.threads t where t.id=active_thread_id and t.workspace_id=$1 and t.world_id=$2 and t.saga_id=$3 and t.scope='saga') and not exists(select 1 from public.session_active_threads old where old.session_id=s.id and old.thread_id=active_thread_id) then raise exception 'Pinned Thread is outside the Saga' using errcode='23514'; end if;
  end loop;
  update public.sessions x set name=btrim(session_name),planned_start_at=$7,planned_date=($7 at time zone 'UTC')::date,objective=$8,opening_scene=$9,scene_notes=$10,prep_checklist=coalesce($11,'[]'),updated_at=clock_timestamp() where x.id=s.id;
  idx:=0; for pin in select jsonb_array_elements_text(coalesce(pinned_entities,'[]')) loop pin_type:=split_part(pin,':',1)::public.entity_type;pin_id:=split_part(pin,':',2)::uuid;update public.session_pinned_entities p set order_index=idx where p.session_id=s.id and p.entity_type=pin_type and p.entity_id=pin_id;if not found then insert into public.session_pinned_entities(workspace_id,world_id,saga_id,session_id,entity_type,entity_id,order_index) values($1,$2,$3,s.id,pin_type,pin_id,idx);end if;idx:=idx+1;end loop;
  delete from public.session_pinned_entities p where p.session_id=s.id and not exists(select 1 from jsonb_array_elements_text(coalesce(pinned_entities,'[]')) requested(value) where requested.value=p.entity_type::text||':'||p.entity_id::text);
  idx:=0; for active_thread_id in select jsonb_array_elements_text(coalesce(active_threads,'[]'))::uuid loop update public.session_active_threads t set order_index=idx where t.session_id=s.id and t.thread_id=active_thread_id;if not found then insert into public.session_active_threads(workspace_id,world_id,saga_id,session_id,thread_id,order_index) values($1,$2,$3,s.id,active_thread_id,idx);end if;idx:=idx+1;end loop;
  delete from public.session_active_threads t where t.session_id=s.id and not exists(select 1 from jsonb_array_elements_text(coalesce(active_threads,'[]')) requested(value) where requested.value::uuid=t.thread_id);
  return jsonb_build_object('status','saved','updated_at',(select updated_at from public.sessions where id=s.id));
end $$;

create or replace function public.mutate_session_prep(workspace_id uuid,world_id uuid,saga_id uuid,session_id uuid,expected_version timestamptz,operation text,request_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.sessions%rowtype; result jsonb; new_id uuid; next_number integer;
begin
  perform public.assert_saga_access($1,$2,$3);
  if nullif(btrim(request_key),'') is null then raise exception 'Request key is required' using errcode='22023'; end if;
  select r.result into result from internal.session_prep_action_receipts r where r.actor_id=auth.uid() and r.request_key=$7;
  if result is not null then return result; end if;
  perform pg_advisory_xact_lock(hashtextextended($3::text,0));
  select * into s from public.sessions x where x.id=$4 and x.workspace_id=$1 and x.world_id=$2 and x.saga_id=$3 and x.archived_at is null for update;
  if s.id is null then raise exception 'Session is not available' using errcode='42501'; end if;
  if s.status not in ('planned','ready') then raise exception 'Prep action is not available for this Session state' using errcode='23514'; end if;
  if s.updated_at is distinct from expected_version then raise exception 'Prep changed elsewhere. Refresh before using this action.' using errcode='40001'; end if;
  if operation='reset' then
    update public.sessions x set objective=null,opening_scene=null,scene_notes=null,prep_checklist='[]',pending_prep_suggestions='[]',updated_at=clock_timestamp() where x.id=s.id;
    delete from public.session_pinned_entities p where p.session_id=s.id; delete from public.session_active_threads t where t.session_id=s.id;
    result:=jsonb_build_object('status','reset','session_id',s.id,'updated_at',(select x.updated_at from public.sessions x where x.id=s.id));
  elsif operation='archive' then
    update public.sessions x set archived_at=clock_timestamp(),updated_at=clock_timestamp() where x.id=s.id;
    result:=jsonb_build_object('status','archived','session_id',s.id);
  elsif operation='duplicate' then
    select coalesce(max(x.session_number),0)+1 into next_number from public.sessions x where x.workspace_id=$1 and x.world_id=$2 and x.saga_id=$3;
    insert into public.sessions(workspace_id,world_id,saga_id,scope,name,session_number,status,objective,opening_scene,scene_notes,prep_checklist,duplicated_from_session_id)
    values($1,$2,$3,'saga','Copy of '||s.name,next_number,'planned',s.objective,s.opening_scene,s.scene_notes,s.prep_checklist,s.id) returning id into new_id;
    insert into public.session_pinned_entities(workspace_id,world_id,saga_id,session_id,entity_type,entity_id,order_index) select $1,$2,$3,new_id,p.entity_type,p.entity_id,p.order_index from public.session_pinned_entities p where p.session_id=s.id and internal.prep_pin_snapshot(p.entity_type,p.entity_id,$1,$2,$3) is not null order by p.order_index;
    insert into public.session_active_threads(workspace_id,world_id,saga_id,session_id,thread_id,order_index) select $1,$2,$3,new_id,t.thread_id,t.order_index from public.session_active_threads t where t.session_id=s.id order by t.order_index;
    result:=jsonb_build_object('status','duplicated','session_id',new_id);
  else raise exception 'Unsupported Prep action' using errcode='22023'; end if;
  insert into internal.session_prep_action_receipts(actor_id,request_key,workspace_id,world_id,saga_id,session_id,operation,result) values(auth.uid(),$7,$1,$2,$3,s.id,operation,result);
  return result;
end $$;

create or replace function public.get_sessions_for_saga(workspace_id uuid,world_id uuid,saga_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
  perform public.assert_saga_access($1,$2,$3);
  return (select coalesce(jsonb_agg(to_jsonb(s) order by case when s.status in ('started','in_progress') then 0 when s.status in ('planned','ready') then 1 else 2 end,s.planned_start_at nulls last,s.session_number desc,s.created_at desc),'[]') from public.sessions s where s.workspace_id=$1 and s.world_id=$2 and s.saga_id=$3 and s.archived_at is null);
end $$;

-- D4 tightens Ready to the editable Prep states. Started/live/ended Sessions remain read-only.
create or replace function public.set_session_status(workspace_id uuid,world_id uuid,saga_id uuid,session_id uuid,status public.session_status)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_status public.session_status; updated_id uuid; capture_count int; moment_count int;
begin
  perform public.assert_saga_access($1,$2,$3); perform pg_advisory_xact_lock(hashtextextended($3::text,0));
  select s.status into current_status from public.sessions s where s.id=$4 and s.workspace_id=$1 and s.world_id=$2 and s.saga_id=$3 and s.archived_at is null for update;
  if current_status is null then raise exception 'Session is not available' using errcode='42501'; end if;
  if $5='ready' then
    if current_status not in ('planned','ready') then raise exception 'invalid status transition: % to %',current_status,$5 using errcode='23514'; end if;
    if not internal.session_ready_for_stage($1,$2,$3,$4) then raise exception 'ready for stage requires a title and at least one packet item' using errcode='23514'; end if;
  elsif not ((current_status='ready' and $5='started') or (current_status='started' and $5='in_progress') or (current_status='in_progress' and $5='ended_pending_undo') or (current_status='ended_pending_undo' and $5 in ('in_progress','ended')) or current_status=$5) then raise exception 'invalid status transition: % to %',current_status,$5 using errcode='23514'; end if;
  if $5 in ('started','in_progress') and current_status not in ('started','in_progress') and exists(select 1 from public.sessions live where live.workspace_id=$1 and live.world_id=$2 and live.saga_id=$3 and live.id<>$4 and live.status in ('started','in_progress') and live.archived_at is null) then raise exception 'live session already exists for this Saga' using errcode='23514'; end if;
  update public.sessions s set status=$5,packet_locked_at=case when $5='ready' then coalesce(s.packet_locked_at,now()) else s.packet_locked_at end,pending_prep_suggestions=case when $5='ready' then '[]' else s.pending_prep_suggestions end,started_at=case when $5 in ('started','in_progress') then coalesce(s.started_at,now()) else s.started_at end,went_live_at=case when $5='in_progress' then coalesce(s.went_live_at,now()) else s.went_live_at end,ended_pending_undo_at=case when $5='ended_pending_undo' then now() when $5='in_progress' then null else s.ended_pending_undo_at end,ended_at=case when $5='ended' then coalesce(s.ended_at,now()) else s.ended_at end,updated_at=clock_timestamp() where s.id=$4 returning s.id into updated_id;
  if $5='ended' and current_status='ended_pending_undo' then
    select count(*) into capture_count from public.sources src where src.session_id=$4 and src.kind='note'; select count(*) into moment_count from public.session_marked_moments m where m.session_id=$4;
    insert into public.pipeline_runs(workspace_id,world_id,saga_id,session_id,state,inputs_summary) select $1,$2,$3,$4,'queued',jsonb_build_object('capture_count',capture_count,'marked_moment_count',moment_count) where not exists(select 1 from public.pipeline_runs p where p.session_id=$4 and p.workspace_id=$1 and p.world_id=$2 and p.saga_id=$3);
  end if;
  return updated_id;
end $$;

revoke all on function public.get_session_prep(uuid,uuid,uuid,uuid) from public,anon;
revoke all on function public.autosave_session_prep(uuid,uuid,uuid,uuid,timestamptz,text,timestamptz,text,text,text,jsonb,jsonb,jsonb) from public,anon;
revoke all on function public.mutate_session_prep(uuid,uuid,uuid,uuid,timestamptz,text,text) from public,anon;
grant execute on function public.get_session_prep(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.autosave_session_prep(uuid,uuid,uuid,uuid,timestamptz,text,timestamptz,text,text,text,jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.mutate_session_prep(uuid,uuid,uuid,uuid,timestamptz,text,text) to authenticated;
