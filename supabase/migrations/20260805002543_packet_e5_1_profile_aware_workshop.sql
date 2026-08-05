-- Packet E5.1: server-owned GM profile resolution for every Saga creation path.

alter table public.workshop_sessions
  add column if not exists profile_mode text not null default 'use_default',
  add column if not exists save_profile_as_default boolean not null default false;

alter table public.workshop_sessions
  drop constraint if exists workshop_sessions_profile_mode_check;
alter table public.workshop_sessions
  add constraint workshop_sessions_profile_mode_check
  check (profile_mode in ('use_default', 'customize_for_saga'));

create or replace function internal.validate_gm_creation_profile(p_profile jsonb)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog, pg_temp
as $$
declare
  v_extra_key text;
  v_experience text;
  v_improv text;
  v_prep text;
begin
  if jsonb_typeof(p_profile) <> 'object' then
    raise exception 'GM profile must be an object' using errcode = '22023';
  end if;

  select key into v_extra_key
  from jsonb_object_keys(p_profile) key
  where key not in ('experience_level', 'improv_comfort', 'prep_style')
  limit 1;
  if v_extra_key is not null then
    raise exception 'GM profile contains unsupported fields' using errcode = '22023';
  end if;

  v_experience := p_profile ->> 'experience_level';
  v_improv := p_profile ->> 'improv_comfort';
  v_prep := p_profile ->> 'prep_style';
  if v_experience is null or v_experience not in ('new', 'returning', 'experienced', 'veteran')
    or v_improv is null or v_improv not in ('planner', 'mixed', 'improv_first')
    or v_prep is null or v_prep not in ('heavy', 'mixed', 'light') then
    raise exception 'GM profile values are invalid' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'experience_level', v_experience,
    'improv_comfort', v_improv,
    'prep_style', v_prep
  );
end;
$$;

create or replace function internal.resolve_gm_creation_profile(p_mode text, p_profile jsonb)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_catalog, pg_temp
as $$
declare
  v_saved public.gm_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_mode not in ('use_default', 'customize_for_saga') then
    raise exception 'GM profile mode is invalid' using errcode = '22023';
  end if;

  select * into v_saved from public.gm_profiles where user_id = auth.uid();
  if p_mode = 'use_default' then
    return jsonb_build_object(
      'experience_level', coalesce(v_saved.experience_level, 'returning'),
      'improv_comfort', coalesce(v_saved.improv_comfort, 'mixed'),
      'prep_style', coalesce(v_saved.prep_style, 'mixed')
    );
  end if;
  return internal.validate_gm_creation_profile(p_profile);
end;
$$;

drop function if exists public.create_saga_workshop(uuid,uuid,uuid,public.workshop_path,text,text,text,text,jsonb,uuid);
create or replace function public.create_saga_workshop(
  p_workshop_id uuid,
  p_workspace_id uuid,
  p_existing_world_id uuid,
  p_path public.workshop_path,
  p_saga_name text,
  p_world_name text,
  p_game_system text,
  p_idea_or_notes text,
  p_profile_mode text,
  p_gm_profile jsonb,
  p_save_profile_as_default boolean,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  v_existing public.workshop_sessions%rowtype;
  v_effective_profile jsonb;
  v_hash text;
  v_contract record;
  v_quota record;
  v_run_id uuid := public.uuid7();
  v_input_source uuid := public.uuid7();
  v_ord integer := 1;
  s public.sources%rowtype;
begin
  if auth.uid() is null or not public.user_owns_workspace(p_workspace_id) then raise exception 'Workspace access denied' using errcode='42501'; end if;
  if p_path not in ('build_with_ai','bring_your_notes') then raise exception 'Workshop path is unsupported' using errcode='22023'; end if;
  if nullif(btrim(p_saga_name),'') is null or char_length(p_saga_name)>120 then raise exception 'Saga name is invalid' using errcode='23514'; end if;
  if nullif(btrim(p_idea_or_notes),'') is null or char_length(p_idea_or_notes)>50000 then raise exception 'Workshop input must contain 1 to 50000 characters' using errcode='23514'; end if;
  if p_existing_world_id is not null and not exists(select 1 from public.worlds w where w.id=p_existing_world_id and w.workspace_id=p_workspace_id and w.deleted_at is null) then raise exception 'World access denied' using errcode='42501'; end if;

  v_effective_profile := internal.resolve_gm_creation_profile(p_profile_mode, p_gm_profile);
  v_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'path',p_path,'saga_name',btrim(p_saga_name),'world_name',btrim(coalesce(p_world_name,'')),
    'game_system',btrim(coalesce(p_game_system,'')),'input',p_idea_or_notes,'world_id',p_existing_world_id,
    'profile_mode',p_profile_mode,'gm_profile',v_effective_profile,
    'save_profile_as_default',coalesce(p_save_profile_as_default,false)
  )::text,'UTF8'),'sha256'),'hex');

  select * into v_existing from public.workshop_sessions w where w.user_id=auth.uid() and w.idempotency_key=p_idempotency_key;
  if found then
    if v_existing.id<>p_workshop_id or v_existing.input_hash<>v_hash then raise exception 'Workshop idempotency key was reused with different input' using errcode='23505'; end if;
    return jsonb_build_object('workshop_id',v_existing.id,'run_id',v_existing.ai_task_run_id,'status',v_existing.generation_status,'replayed',true,'allowed',v_existing.generation_status<>'quota_blocked');
  end if;

  select * into v_contract from internal.ai_task_contracts() where task_name='scaffold_saga' and active;
  select * into v_quota from public.check_quota_preflight(p_workspace_id,p_existing_world_id,null,'ai_call',v_contract.ai_credits,jsonb_build_object('task_name','scaffold_saga'));
  insert into public.workshop_sessions(
    id,user_id,workspace_id,world_id,path,gm_profile_snapshot,profile_mode,save_profile_as_default,
    conversation,state,idempotency_key,input_hash,generation_status,quota_snapshot
  ) values (
    p_workshop_id,auth.uid(),p_workspace_id,p_existing_world_id,p_path,v_effective_profile,p_profile_mode,
    coalesce(p_save_profile_as_default,false),jsonb_build_array(jsonb_build_object('role','gm','content',p_idea_or_notes)),
    'in_progress',p_idempotency_key,v_hash,case when v_quota.allowed then 'queued' else 'quota_blocked' end,to_jsonb(v_quota)
  );
  insert into internal.workshop_ai_evidence values(p_workshop_id,v_ord,v_input_source,null,'workshop_input','GM workshop input',p_idea_or_notes,encode(extensions.digest(convert_to(p_idea_or_notes,'UTF8'),'sha256'),'hex'),now());
  if p_existing_world_id is not null then
    for s in select * from public.sources x where x.workspace_id=p_workspace_id and x.world_id=p_existing_world_id and x.scope='world' and x.kind='existing_entity' and nullif(btrim(x.raw_excerpt),'') is not null order by x.created_at desc limit 10 loop
      v_ord:=v_ord+1;
      insert into internal.workshop_ai_evidence values(p_workshop_id,v_ord,s.id,s.id,'existing_entity','Eligible World canon',left(s.raw_excerpt,12000),encode(extensions.digest(convert_to(left(s.raw_excerpt,12000),'UTF8'),'sha256'),'hex'),now());
    end loop;
  end if;
  if not v_quota.allowed then return jsonb_build_object('workshop_id',p_workshop_id,'run_id',null,'status','quota_blocked','allowed',false,'severity',v_quota.severity,'message',v_quota.message,'replayed',false); end if;
  insert into internal.ai_task_runs(id,workspace_id,world_id,saga_id,gm_id,task_name,prompt_version,quota_tier,ai_credits,model_tier,retrieval_profile,source_policy,output_mode,input_payload,allowed_source_ids,workshop_session_id)
  select v_run_id,p_workspace_id,p_existing_world_id,null,auth.uid(),v_contract.task_name,v_contract.prompt_version,v_contract.quota_tier,v_contract.ai_credits,v_contract.model_tier,v_contract.retrieval_profile,v_contract.source_policy,v_contract.output_mode,
    jsonb_build_object('workshop_session_id',p_workshop_id,'saga_name',btrim(p_saga_name),'world_name',nullif(btrim(p_world_name),''),'game_system',nullif(btrim(p_game_system),''),'path',p_path,'gm_profile',v_effective_profile),array_agg(e.source_id order by e.ordinal),p_workshop_id
  from internal.workshop_ai_evidence e where e.workshop_session_id=p_workshop_id;
  update public.workshop_sessions set ai_task_run_id=v_run_id where id=p_workshop_id;
  return jsonb_build_object('workshop_id',p_workshop_id,'run_id',v_run_id,'status','queued','allowed',true,'replayed',false);
end;
$$;

drop function if exists public.create_blank_saga(text,text,text,text,text,text,uuid,text,uuid);
create or replace function public.create_blank_saga(
  saga_name text,
  game_system text default null,
  experience_level text default 'returning',
  improv_comfort text default 'mixed',
  prep_style text default 'mixed',
  profile_mode text default 'use_default',
  save_profile_as_default boolean default false,
  world_choice text default 'new',
  existing_world_id uuid default null,
  world_name text default null,
  target_workspace_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_world_id uuid;
  v_era_id uuid;
  v_saga_id uuid;
  v_profile jsonb;
  v_has_saved_profile boolean;
  v_game_system text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if nullif(btrim(saga_name),'') is null then raise exception 'Saga name is required' using errcode='23514'; end if;
  if target_workspace_id is null then v_workspace_id:=public.ensure_default_workspace();
  elsif public.user_owns_workspace(target_workspace_id) then v_workspace_id:=target_workspace_id;
  else raise exception 'Workspace access denied' using errcode='42501'; end if;

  select exists(select 1 from public.gm_profiles where user_id=auth.uid()) into v_has_saved_profile;
  v_profile:=internal.resolve_gm_creation_profile(profile_mode,jsonb_build_object('experience_level',experience_level,'improv_comfort',improv_comfort,'prep_style',prep_style));
  select coalesce(nullif(btrim(game_system),''),default_game_system) into v_game_system from public.gm_profiles where user_id=auth.uid();
  v_game_system:=coalesce(v_game_system,nullif(btrim(game_system),''));

  if not v_has_saved_profile or (profile_mode='customize_for_saga' and coalesce(save_profile_as_default,false)) then
    insert into public.gm_profiles(user_id,experience_level,improv_comfort,prep_style,default_game_system)
    values(auth.uid(),v_profile->>'experience_level',v_profile->>'improv_comfort',v_profile->>'prep_style',v_game_system)
    on conflict(user_id) do update set experience_level=excluded.experience_level,improv_comfort=excluded.improv_comfort,prep_style=excluded.prep_style,default_game_system=excluded.default_game_system,updated_at=now();
  end if;

  if world_choice='existing' and existing_world_id is not null then
    select id into v_world_id from public.worlds where id=existing_world_id and workspace_id=v_workspace_id and deleted_at is null;
  end if;
  if world_choice='existing' and existing_world_id is not null and v_world_id is null then raise exception 'World access denied' using errcode='42501'; end if;
  if v_world_id is null then
    insert into public.worlds(workspace_id,owner_gm_id,name,default_game_system) values(v_workspace_id,auth.uid(),coalesce(nullif(btrim(world_name),''),btrim(saga_name)||' World'),v_game_system) returning id into v_world_id;
  end if;
  select id into v_era_id from public.world_eras where workspace_id=v_workspace_id and world_id=v_world_id order by sort_order limit 1;
  if v_era_id is null then insert into public.world_eras(workspace_id,world_id,name,summary,sort_order) values(v_workspace_id,v_world_id,'Default Era','Default timeframe for this world.',0) returning id into v_era_id; end if;
  insert into public.sagas(workspace_id,world_id,owner_gm_id,name,game_system,primary_era_id,gm_profile_override)
  values(v_workspace_id,v_world_id,auth.uid(),btrim(saga_name),v_game_system,v_era_id,
    case when profile_mode='customize_for_saga' and not coalesce(save_profile_as_default,false) then v_profile else null end)
  returning id into v_saga_id;
  return jsonb_build_object('workspace_id',v_workspace_id,'world_id',v_world_id,'saga_id',v_saga_id);
end;
$$;

create or replace function internal.apply_workshop_profile_on_commit()
returns trigger
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  v_profile jsonb;
  v_has_saved_profile boolean;
  v_game_system text;
begin
  if new.state <> 'committed' or old.state = 'committed' or new.saga_id is null then return new; end if;
  v_profile:=internal.validate_gm_creation_profile(new.gm_profile_snapshot);
  select exists(select 1 from public.gm_profiles where user_id=new.user_id) into v_has_saved_profile;
  select game_system into v_game_system from public.sagas where id=new.saga_id;
  if not v_has_saved_profile or (new.profile_mode='customize_for_saga' and new.save_profile_as_default) then
    insert into public.gm_profiles(user_id,experience_level,improv_comfort,prep_style,default_game_system)
    values(new.user_id,v_profile->>'experience_level',v_profile->>'improv_comfort',v_profile->>'prep_style',v_game_system)
    on conflict(user_id) do update set experience_level=excluded.experience_level,improv_comfort=excluded.improv_comfort,prep_style=excluded.prep_style,default_game_system=excluded.default_game_system,updated_at=now();
  end if;
  update public.sagas set gm_profile_override=case when new.profile_mode='customize_for_saga' and not new.save_profile_as_default then v_profile else null end where id=new.saga_id;
  return new;
end;
$$;

drop trigger if exists workshop_profile_on_commit on public.workshop_sessions;
create trigger workshop_profile_on_commit
after update of state on public.workshop_sessions
for each row execute function internal.apply_workshop_profile_on_commit();

create or replace function public.get_saga_workshop(p_workshop_id uuid)
returns jsonb language sql security definer set search_path=public,internal,pg_temp as $$
 select jsonb_build_object('id',w.id,'workspace_id',w.workspace_id,'world_id',w.world_id,'path',w.path,'state',w.state,'generation_status',w.generation_status,'failure_category',w.failure_category,'quota',w.quota_snapshot,'review_version',w.review_version,'draft_payload',w.draft_payload,'conversation',w.conversation,'gm_profile',w.gm_profile_snapshot,'profile_mode',w.profile_mode,'save_profile_as_default',w.save_profile_as_default,'updated_at',w.updated_at,'committed_at',w.committed_at,'saga_id',w.saga_id,'committed_session_id',w.committed_session_id,'sources',coalesce((select jsonb_agg(jsonb_build_object('source_id',e.source_id,'kind',e.source_kind,'title',e.title,'excerpt',left(e.evidence_text,600)) order by e.ordinal) from internal.workshop_ai_evidence e where e.workshop_session_id=w.id),'[]'::jsonb))
 from public.workshop_sessions w where w.id=p_workshop_id and w.user_id=auth.uid() and public.user_is_workspace_member(w.workspace_id)
$$;

revoke all on function internal.validate_gm_creation_profile(jsonb) from public,anon,authenticated;
revoke all on function internal.resolve_gm_creation_profile(text,jsonb) from public,anon,authenticated;
revoke all on function internal.apply_workshop_profile_on_commit() from public,anon,authenticated;
revoke all on function public.create_saga_workshop(uuid,uuid,uuid,public.workshop_path,text,text,text,text,text,jsonb,boolean,uuid) from public,anon;
revoke all on function public.create_blank_saga(text,text,text,text,text,text,boolean,text,uuid,text,uuid) from public,anon;
grant execute on function public.create_saga_workshop(uuid,uuid,uuid,public.workshop_path,text,text,text,text,text,jsonb,boolean,uuid) to authenticated;
grant execute on function public.create_blank_saga(text,text,text,text,text,text,boolean,text,uuid,text,uuid) to authenticated;
