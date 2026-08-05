-- Packet E6: typed Loom action registry, optimistic intent ledger, and receipts.

create or replace function internal.loom_action_contracts()
returns table (
  action_name text,
  action_version text,
  description text,
  authority_tier text,
  confirmation_policy text,
  execution_kind text,
  provider_arguments jsonb,
  allowed_target_types text[],
  requires_current_evidence boolean,
  downstream_task_name text,
  ai_credits numeric,
  effect_summary text,
  manual_fallback text,
  active boolean
)
language sql
stable
set search_path = public, pg_temp
as $$
  values
    (
      'open_record','1.0.0','Open one current record from the cited evidence.',
      'read_navigation','none','client_navigation',
      '{"type":"object","additionalProperties":false,"required":["source_id"],"properties":{"source_id":{"type":"uuid","source":"turn_evidence"}}}'::jsonb,
      array['character','place','faction','artifact','thread']::text[],true,null::text,0::numeric,
      'Open the current authorized record.','Use scoped search when the record is unavailable.',true
    ),
    (
      'draft_entity','1.0.0','Draft one non-canon Saga entity proposal from current cited evidence.',
      'non_canon_generation','explicit','downstream_ai_task',
      '{"type":"object","additionalProperties":false,"required":["entity_type","intent"],"properties":{"entity_type":{"type":"string","enum":["character","place","faction","artifact","thread"]},"intent":{"type":"string","minLength":1,"maxLength":500}}}'::jsonb,
      array['character','place','faction','artifact','thread']::text[],true,'draft_entity_from_prompt',3::numeric,
      'Create one non-canon pending entity draft for later review.','Open Library and create or draft the record manually.',true
    );
$$;

create or replace function internal.loom_provider_action_manifest()
returns jsonb
language sql
stable
set search_path = internal, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'name',c.action_name,
    'version',c.action_version,
    'description',c.description,
    'arguments',c.provider_arguments,
    'authority_tier',c.authority_tier,
    'confirmation_policy',c.confirmation_policy,
    'ai_credits',c.ai_credits,
    'effect_summary',c.effect_summary
  ) order by c.action_name),'[]'::jsonb)
  from internal.loom_action_contracts() c
  where c.active;
$$;

alter table public.guide_action_intents
  drop constraint if exists guide_action_intents_action_type_check;
alter table public.guide_action_intents
  drop constraint if exists guide_action_intents_state_check;
alter table public.guide_action_intents
  add column if not exists action_version text not null default '1.0.0',
  add column if not exists intent_version integer not null default 1,
  add column if not exists arguments jsonb not null default '{}'::jsonb,
  add column if not exists authority_tier text not null default 'read_navigation',
  add column if not exists confirmation_policy text not null default 'none',
  add column if not exists execution_kind text not null default 'client_navigation',
  add column if not exists target_type text,
  add column if not exists target_id uuid,
  add column if not exists target_version text,
  add column if not exists evidence_versions jsonb not null default '{}'::jsonb,
  add column if not exists cost_snapshot jsonb not null default '{"ai_credits":0}'::jsonb,
  add column if not exists effect_summary text not null default '',
  add column if not exists manual_fallback text not null default '',
  add column if not exists availability_state text not null default 'available',
  add column if not exists failure_category text;

update public.guide_action_intents
set arguments=case action_type
      when 'open_record' then jsonb_build_object('source_id',source_id)
      when 'draft_entity' then jsonb_build_object('entity_type',entity_type,'intent',intent)
      else '{}'::jsonb
    end,
    authority_tier=case when action_type='open_record' then 'read_navigation' else 'non_canon_generation' end,
    confirmation_policy=case when action_type='open_record' then 'none' else 'explicit' end,
    execution_kind=case when action_type='open_record' then 'client_navigation' else 'downstream_ai_task' end,
    cost_snapshot=jsonb_build_object('ai_credits',case when action_type='draft_entity' then 3 else 0 end,'task_name',case when action_type='draft_entity' then 'draft_entity_from_prompt' else null end),
    effect_summary=case when action_type='open_record' then 'Open the current authorized record.' else 'Create one non-canon pending entity draft for later review.' end,
    manual_fallback=case when action_type='open_record' then 'Use scoped search when the record is unavailable.' else 'Open Library and create or draft the record manually.' end
where arguments='{}'::jsonb;

alter table public.guide_action_intents
  add constraint guide_action_intents_action_type_check check (action_type in ('open_record','draft_entity')),
  add constraint guide_action_intents_action_version_check check (action_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  add constraint guide_action_intents_intent_version_check check (intent_version >= 1),
  add constraint guide_action_intents_json_shape_check check (
    jsonb_typeof(arguments)='object' and jsonb_typeof(evidence_versions)='object' and jsonb_typeof(cost_snapshot)='object'
  ),
  add constraint guide_action_intents_authority_check check (authority_tier in (
    'read_navigation','non_canon_generation','reversible_working_state','canon_mutation','archive_restore','hard_delete'
  )),
  add constraint guide_action_intents_confirmation_check check (confirmation_policy in ('none','explicit','approval_queue','exact_name_two_step')),
  add constraint guide_action_intents_execution_kind_check check (execution_kind in ('client_navigation','downstream_ai_task','deterministic_handler','approval_queue')),
  add constraint guide_action_intents_availability_check check (availability_state in ('available','stale','denied','unavailable')),
  add constraint guide_action_intents_state_check check (state in ('pending','processing','accepted','dismissed','conflict','failed'));

create table internal.loom_action_receipts (
  id uuid primary key default public.uuid7(),
  action_intent_id uuid not null references public.guide_action_intents(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  gm_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  decision text not null check (decision in ('confirmed','dismissed')),
  status text not null check (status in ('dispatched','dismissed','conflict','quota_blocked','failed')),
  ai_task_run_id uuid references internal.ai_task_runs(id) on delete set null,
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gm_id,idempotency_key)
);
create index loom_action_receipts_intent_idx on internal.loom_action_receipts(action_intent_id,created_at desc);
revoke all on table internal.loom_action_receipts from public,anon,authenticated;

alter table public.guide_action_intents
  add column if not exists execution_receipt_id uuid references internal.loom_action_receipts(id) on delete set null;

create or replace function internal.loom_source_current_version(p_source_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare s public.sources%rowtype; v_updated timestamptz;
begin
  select * into s from public.sources where id=p_source_id;
  if not found or s.kind='imported_text' then return null; end if;
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

create or replace function internal.bind_loom_manifest_to_ai_run()
returns trigger
language plpgsql
security definer
set search_path = internal, public, pg_temp
as $$
begin
  if new.task_name='answer_saga_question' then
    new.input_payload:=coalesce(new.input_payload,'{}'::jsonb)||jsonb_build_object('action_manifest',internal.loom_provider_action_manifest());
  end if;
  return new;
end;
$$;
drop trigger if exists bind_loom_manifest_to_ai_run on internal.ai_task_runs;
create trigger bind_loom_manifest_to_ai_run
before insert on internal.ai_task_runs
for each row execute function internal.bind_loom_manifest_to_ai_run();

create or replace function internal.materialize_loom_action_intent(
  p_turn_id uuid,
  p_block_index integer,
  p_action jsonb,
  p_explanation text
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  t public.guide_turns%rowtype; c record; e internal.guide_evidence_snapshots%rowtype;
  v_name text; v_version text; v_args jsonb; v_source_id uuid; v_entity_type text; v_intent text;
  v_target_type text; v_target_id uuid; v_target_version text; v_versions jsonb:='{}'::jsonb; v_id uuid;
begin
  if p_block_index<0 or jsonb_typeof(p_action)<>'object' or nullif(btrim(p_explanation),'') is null or char_length(p_explanation)>500 then
    raise exception 'Loom action preview is invalid' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_object_keys(p_action) k where k not in ('name','version','arguments')) then
    raise exception 'Loom action contains an unknown field' using errcode='22023';
  end if;
  v_name:=p_action->>'name'; v_version:=p_action->>'version'; v_args:=p_action->'arguments';
  select * into c from internal.loom_action_contracts() x where x.action_name=v_name and x.action_version=v_version and x.active;
  if not found or jsonb_typeof(v_args)<>'object' then raise exception 'Loom action is not registered' using errcode='22023'; end if;
  select * into t from public.guide_turns where id=p_turn_id;
  if not found then raise exception 'Loom turn is unavailable' using errcode='22023'; end if;

  if v_name='open_record' then
    if exists(select 1 from jsonb_object_keys(v_args) k where k<>'source_id') or (select count(*) from jsonb_object_keys(v_args))<>1 then
      raise exception 'open_record arguments are invalid' using errcode='22023';
    end if;
    begin v_source_id:=(v_args->>'source_id')::uuid; exception when invalid_text_representation then raise exception 'open_record source is invalid' using errcode='22023'; end;
    select * into e from internal.guide_evidence_snapshots where turn_id=t.id and source_id=v_source_id;
    if not found or e.source_entity_type is null or not (e.source_entity_type=any(c.allowed_target_types)) then
      raise exception 'open_record source is outside the registered target set' using errcode='22023';
    end if;
    v_target_type:=e.source_entity_type; v_target_id:=e.source_entity_id;
    v_target_version:=internal.loom_source_current_version(v_source_id);
    if v_target_version is null then raise exception 'open_record target is unavailable' using errcode='22023'; end if;
    v_versions:=jsonb_build_object(v_source_id::text,v_target_version);
  elsif v_name='draft_entity' then
    if exists(select 1 from jsonb_object_keys(v_args) k where k not in ('entity_type','intent')) or (select count(*) from jsonb_object_keys(v_args))<>2 then
      raise exception 'draft_entity arguments are invalid' using errcode='22023';
    end if;
    v_entity_type:=v_args->>'entity_type'; v_intent:=normalize(coalesce(v_args->>'intent',''),NFKC);
    if not (v_entity_type=any(c.allowed_target_types)) or char_length(btrim(v_intent)) not between 1 and 500
      or v_intent ~* '(delete[[:space:]]+from|drop[[:space:]]+table|execute[[:space:]]+rpc|bypass[[:space:]]+(approval|confirmation)|publish[[:space:]]+automatically)' then
      raise exception 'draft_entity arguments are invalid' using errcode='22023';
    end if;
    v_target_type:=v_entity_type;
    for e in select * from internal.guide_evidence_snapshots where turn_id=t.id order by ordinal loop
      v_target_version:=internal.loom_source_current_version(e.source_id);
      if v_target_version is null then raise exception 'draft_entity evidence is unavailable' using errcode='22023'; end if;
      v_versions:=v_versions||jsonb_build_object(e.source_id::text,v_target_version);
    end loop;
    if v_versions='{}'::jsonb then raise exception 'draft_entity requires current evidence' using errcode='22023'; end if;
  else
    raise exception 'Loom action is not registered' using errcode='22023';
  end if;

  insert into public.guide_action_intents(
    workspace_id,world_id,saga_id,gm_id,thread_id,turn_id,block_index,action_type,action_version,
    arguments,authority_tier,confirmation_policy,execution_kind,target_type,target_id,target_version,
    evidence_versions,cost_snapshot,effect_summary,manual_fallback,source_id,entity_type,intent,explanation
  ) values (
    t.workspace_id,t.world_id,t.saga_id,t.gm_id,t.thread_id,t.id,p_block_index,v_name,v_version,
    v_args,c.authority_tier,c.confirmation_policy,c.execution_kind,v_target_type,v_target_id,
    case when v_name='open_record' then v_target_version else null end,v_versions,
    jsonb_strip_nulls(jsonb_build_object('ai_credits',c.ai_credits,'task_name',c.downstream_task_name)),
    c.effect_summary,c.manual_fallback,v_source_id,
    case when v_entity_type is null then null else v_entity_type::public.entity_type end,v_intent,p_explanation
  ) on conflict(turn_id,block_index) do update set updated_at=public.guide_action_intents.updated_at
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.complete_guide_turn_for_worker(p_run_id uuid,p_output jsonb)
returns void
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare v_turn public.guide_turns%rowtype; v_block jsonb; v_index integer:=0;
begin
  select t.* into v_turn from public.guide_turns t join internal.ai_task_runs r on r.guide_turn_id=t.id
  where r.id=p_run_id for update of t;
  if not found then return; end if;
  if v_turn.status<>'superseded' then
    for v_block in select value from jsonb_array_elements(coalesce(p_output->'blocks','[]'::jsonb)) loop
      if v_block->>'type'='action_preview' then
        perform internal.materialize_loom_action_intent(v_turn.id,v_index,v_block->'action',v_block->>'explanation');
      end if;
      v_index:=v_index+1;
    end loop;
    update public.guide_turns set status='complete',response_payload=p_output,failure_category=null,
      completed_at=now(),updated_at=now() where id=v_turn.id;
  end if;
end;
$$;

create or replace function public.get_loom_action_availability(p_workspace_id uuid,p_world_id uuid,p_saga_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, internal, pg_temp
as $$
declare v_result jsonb;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  select coalesce(jsonb_agg(jsonb_build_object(
    'name',c.action_name,'version',c.action_version,'available',c.active,
    'authority_tier',c.authority_tier,'confirmation_policy',c.confirmation_policy,
    'ai_credits',c.ai_credits,'effect_summary',c.effect_summary,'manual_fallback',c.manual_fallback
  ) order by c.action_name),'[]'::jsonb) into v_result
  from internal.loom_action_contracts() c;
  return v_result;
end;
$$;

create or replace function public.review_loom_action(
  p_action_id uuid,
  p_expected_intent_version integer,
  p_decision text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  a public.guide_action_intents%rowtype; c record; q record; prior internal.loom_action_receipts%rowtype;
  v_hash text; v_receipt uuid:=public.uuid7(); v_run uuid; pair record; v_current text; v_result jsonb;
begin
  if auth.uid() is null or p_decision not in ('confirmed','dismissed') or p_idempotency_key is null then
    raise exception 'Loom action review is invalid' using errcode='22023';
  end if;
  v_hash:=encode(extensions.digest(convert_to(concat_ws('|',p_action_id::text,p_expected_intent_version::text,p_decision),'UTF8'),'sha256'),'hex');
  select * into prior from internal.loom_action_receipts where gm_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if prior.action_intent_id<>p_action_id or prior.request_hash<>v_hash or prior.decision<>p_decision then
      raise exception 'Loom action idempotency key was reused with different input' using errcode='23505';
    end if;
    return prior.result||jsonb_build_object('receipt_id',prior.id,'run_id',prior.ai_task_run_id,'replayed',true);
  end if;

  select * into a from public.guide_action_intents where id=p_action_id for update;
  if not found or a.gm_id<>auth.uid() then raise exception 'Loom action is unavailable' using errcode='42501'; end if;
  perform public.assert_saga_access(a.workspace_id,a.world_id,a.saga_id);
  if a.intent_version<>p_expected_intent_version then raise exception 'Loom action changed; refresh before reviewing' using errcode='40001'; end if;
  select * into c from internal.loom_action_contracts() x where x.action_name=a.action_type and x.action_version=a.action_version and x.active;
  if not found then raise exception 'Loom action contract is unavailable' using errcode='22023'; end if;

  if p_decision='dismissed' then
    if a.state not in ('pending','conflict','failed') then raise exception 'Loom action can no longer be dismissed' using errcode='23514'; end if;
    v_result:=jsonb_build_object('action_id',a.id,'state','dismissed','allowed',true,'intent_version',a.intent_version+1);
    insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
    values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'dismissed',v_result);
    update public.guide_action_intents set state='dismissed',intent_version=intent_version+1,execution_receipt_id=v_receipt,failure_category=null,updated_at=now() where id=a.id;
    return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
  end if;

  if c.confirmation_policy<>'explicit' or a.action_type<>'draft_entity' or a.state<>'pending' then
    raise exception 'Loom action cannot be confirmed' using errcode='23514';
  end if;
  for pair in select key,value from jsonb_each_text(a.evidence_versions) loop
    v_current:=internal.loom_source_current_version(pair.key::uuid);
    if v_current is null or v_current<>pair.value then
      v_result:=jsonb_build_object('action_id',a.id,'state','conflict','allowed',false,'category','stale_evidence','intent_version',a.intent_version+1);
      insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
      values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'conflict',v_result);
      update public.guide_action_intents set state='conflict',availability_state='stale',failure_category='stale_evidence',intent_version=intent_version+1,execution_receipt_id=v_receipt,updated_at=now() where id=a.id;
      return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
    end if;
  end loop;

  select * into q from public.check_quota_preflight(
    a.workspace_id,a.world_id,a.saga_id,'ai_call',c.ai_credits,
    jsonb_build_object('task_name',c.downstream_task_name,'loom_action_id',a.id)
  );
  if not q.allowed then
    v_result:=jsonb_build_object('action_id',a.id,'state','quota_blocked','allowed',false,'category','quota_blocked','message',q.message,'intent_version',a.intent_version);
    insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
    values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'quota_blocked',v_result);
    update public.guide_action_intents set execution_receipt_id=v_receipt,failure_category='quota_blocked',updated_at=now() where id=a.id;
    return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
  end if;

  v_run:=public.uuid7();
  insert into internal.ai_task_runs(
    id,workspace_id,world_id,saga_id,gm_id,task_name,prompt_version,quota_tier,ai_credits,
    model_tier,retrieval_profile,source_policy,output_mode,input_payload,allowed_source_ids,allowed_source_versions
  ) select v_run,a.workspace_id,a.world_id,a.saga_id,a.gm_id,t.task_name,t.prompt_version,t.quota_tier,t.ai_credits,
    t.model_tier,t.retrieval_profile,t.source_policy,t.output_mode,
    jsonb_build_object('entity_type',a.arguments->>'entity_type','change_kind','create','prompt',a.arguments->>'intent',
      'desired_scope','saga','loom_action_id',a.id,'loom_action_receipt_id',v_receipt),
    coalesce(array_agg(e.source_id order by e.ordinal),'{}'::uuid[]),a.evidence_versions
  from internal.ai_task_contracts() t
  left join internal.guide_evidence_snapshots e on e.turn_id=a.turn_id
  where t.task_name=c.downstream_task_name and t.active
  group by t.task_name,t.prompt_version,t.quota_tier,t.ai_credits,t.model_tier,t.retrieval_profile,t.source_policy,t.output_mode;
  if v_run is null or not exists(select 1 from internal.ai_task_runs where id=v_run) then raise exception 'Loom downstream task is unavailable' using errcode='55000'; end if;
  v_result:=jsonb_build_object('action_id',a.id,'state','processing','allowed',true,'run_id',v_run,'intent_version',a.intent_version+1);
  insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,ai_task_run_id,result)
  values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'dispatched',v_run,v_result);
  update public.guide_action_intents set state='processing',intent_version=intent_version+1,accepted_run_id=v_run,
    execution_receipt_id=v_receipt,failure_category=null,updated_at=now() where id=a.id;
  return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
end;
$$;

create or replace function public.get_guide_evidence_for_worker(p_run_id uuid)
returns jsonb
language sql stable security definer
set search_path = public, internal, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'source_id',e.source_id,'source_version',e.source_version,'source_kind',e.source_kind,
    'source_entity_type',e.source_entity_type,'source_entity_id',e.source_entity_id,
    'title',e.title,'context_anchor',e.context_anchor,'text',e.evidence_text
  ) order by e.ordinal),'[]'::jsonb)
  from internal.ai_task_runs r
  left join public.guide_action_intents a
    on a.id=nullif(r.input_payload->>'loom_action_id','')::uuid
   and a.accepted_run_id=r.id
   and a.workspace_id=r.workspace_id
   and a.world_id is not distinct from r.world_id
   and a.saga_id is not distinct from r.saga_id
   and a.gm_id is not distinct from r.gm_id
  join internal.guide_evidence_snapshots e
    on e.turn_id=coalesce(r.guide_turn_id,a.turn_id)
  where r.id=p_run_id;
$$;

create or replace function public.get_guide_thread(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_thread_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, internal, pg_temp
as $$
declare v_thread public.guide_threads%rowtype; v_turns jsonb;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  select * into v_thread from public.guide_threads t
  where t.gm_id=auth.uid() and t.workspace_id=p_workspace_id and t.world_id=p_world_id and t.saga_id=p_saga_id
    and (p_thread_id is null or t.id=p_thread_id)
  order by (t.state='active') desc,t.updated_at desc limit 1;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',t.id,'question',t.question,'status',t.status,'retrieval_mode',t.retrieval_mode,
    'response',t.response_payload,'failure_category',t.failure_category,'created_at',t.created_at,
    'actions',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id',a.id,'block_index',a.block_index,'name',a.action_type,'version',a.action_version,
      'intent_version',a.intent_version,'arguments',a.arguments,'authority_tier',a.authority_tier,
      'confirmation_policy',a.confirmation_policy,'target_type',a.target_type,'target_id',a.target_id,
      'target_version',a.target_version,'cost',a.cost_snapshot,'effect_summary',a.effect_summary,
      'manual_fallback',a.manual_fallback,'availability_state',a.availability_state,
      'explanation',a.explanation,'failure_category',a.failure_category,'receipt_id',a.execution_receipt_id,
      'state',case
        when a.failure_category='quota_blocked' then 'quota_blocked'
        when a.state='processing' and r.status='complete' then 'accepted'
        when a.state='processing' and r.status in ('failed','terminal','dead_letter') then 'failed'
        else a.state
      end
    )) order by a.block_index)
      from public.guide_action_intents a left join internal.ai_task_runs r on r.id=a.accepted_run_id
      where a.turn_id=t.id),'[]'::jsonb)
  ) order by t.ordinal),'[]'::jsonb) into v_turns
  from public.guide_turns t where t.thread_id=v_thread.id;
  return jsonb_build_object('id',v_thread.id,'state',v_thread.state,'title','The Loom','turns',v_turns);
end;
$$;

create or replace function internal.ai_task_contracts()
returns table (task_name text,prompt_version text,quota_tier text,ai_credits numeric,model_tier text,retrieval_profile text,source_policy text,output_mode text,active boolean)
language sql stable set search_path=public,pg_temp as $$ values
  ('plan_saga_workshop','plan_saga_workshop@1.0.0','light',1::numeric,'relic-fast','workshop_grounding','canon_plus_untrusted_input','workshop_interview_plan',true),
  ('scaffold_saga','scaffold_saga@1.2.0','heavy',10::numeric,'relic-deep','workshop_grounding','canon_plus_untrusted_input','workshop_draft_payload',true),
  ('regenerate_saga_scaffold_section','regenerate_saga_scaffold_section@1.0.0','standard',3::numeric,'relic-balanced','workshop_grounding','canon_plus_untrusted_input','workshop_section_draft',true),
  ('draft_entity_from_prompt','draft_entity_from_prompt@1.1.0','standard',3::numeric,'relic-balanced','session_prep_grounding','canon_plus_untrusted_input','draft',true),
  ('generate_session_prep','generate_session_prep@1.0.0','heavy',10::numeric,'relic-deep','session_prep_grounding','canon_only','ephemeral',true),
  ('compose_prep_briefing','compose_prep_briefing@1.0.0','standard',3::numeric,'relic-balanced','session_prep_grounding','canon_only','ephemeral',true),
  ('synthesize_session','synthesize_session@1.0.0','pipeline_synthesis',15::numeric,'relic-deep','post_session_synthesis','canon_plus_untrusted_input','draft_batch',true),
  ('propose_scene_beats','propose_scene_beats@1.0.0','light',1::numeric,'relic-balanced','session_prep_grounding','canon_only','ephemeral',true),
  ('propose_thread_complication','propose_thread_complication@1.0.0','light',1::numeric,'relic-balanced','sanctum_grounding','canon_only','ephemeral',true),
  ('propose_npc_for_scene','propose_npc_for_scene@1.0.0','light',1::numeric,'relic-balanced','session_prep_grounding','canon_only','ephemeral',true),
  ('answer_saga_question','answer_saga_question@1.2.0','light',1::numeric,'relic-balanced','sanctum_qa_grounding','canon_only','ephemeral',true),
  ('propose_quick_stub_fleshing','propose_quick_stub_fleshing@1.0.0','light',1::numeric,'relic-balanced','post_session_synthesis','canon_plus_untrusted_input','ephemeral',true)
$$;

drop function if exists public.set_guide_action_state(uuid,uuid,uuid,uuid,text);

revoke all on function internal.loom_action_contracts() from public,anon,authenticated;
revoke all on function internal.loom_provider_action_manifest() from public,anon,authenticated;
revoke all on function internal.loom_source_current_version(uuid) from public,anon,authenticated;
revoke all on function internal.materialize_loom_action_intent(uuid,integer,jsonb,text) from public,anon,authenticated;
revoke all on function public.get_loom_action_availability(uuid,uuid,uuid) from public,anon;
revoke all on function public.review_loom_action(uuid,integer,text,uuid) from public,anon;
revoke all on function public.complete_guide_turn_for_worker(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.get_guide_evidence_for_worker(uuid) from public,anon,authenticated;
grant execute on function public.get_loom_action_availability(uuid,uuid,uuid) to authenticated;
grant execute on function public.review_loom_action(uuid,integer,text,uuid) to authenticated;
grant execute on function public.complete_guide_turn_for_worker(uuid,jsonb) to service_role;
grant execute on function public.get_guide_evidence_for_worker(uuid) to service_role;
