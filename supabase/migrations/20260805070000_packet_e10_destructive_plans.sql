-- Packet E10: protected lifecycle actions, bounded plans, and stop-on-conflict execution.

alter table public.guide_action_intents drop constraint if exists guide_action_intents_action_type_check;
alter table public.guide_action_intents add constraint guide_action_intents_action_type_check check (action_type in (
  'open_record','list_records','show_source','explain_provenance','navigate_surface','draft_entity',
  'propose_record_create','propose_record_update','add_relationship','remove_relationship',
  'set_thread_state','mutate_thread_objective','create_session','open_session_workflow',
  'start_prep_task','retry_session_transcription','archive_record','restore_record','prepare_hard_delete'
));

alter table public.guide_action_intents
  add column if not exists plan_step smallint,
  add column if not exists plan_size smallint,
  add column if not exists plan_depends_on smallint[] not null default '{}'::smallint[];
alter table public.guide_action_intents drop constraint if exists guide_action_intents_plan_shape_check;
alter table public.guide_action_intents add constraint guide_action_intents_plan_shape_check check (
  (plan_step is null and plan_size is null and cardinality(plan_depends_on)=0)
  or (plan_step between 1 and 5 and plan_size between 2 and 5 and plan_step<=plan_size)
);

alter function internal.loom_action_contracts() rename to loom_action_contracts_e9;

create or replace function internal.loom_action_contracts()
returns table (
  action_name text, action_version text, description text, authority_tier text,
  confirmation_policy text, execution_kind text, provider_arguments jsonb,
  allowed_target_types text[], requires_current_evidence boolean,
  downstream_task_name text, ai_credits numeric, effect_summary text,
  manual_fallback text, active boolean
)
language sql stable set search_path=public,internal,pg_temp as $$
  select * from internal.loom_action_contracts_e9()
  union all
  values
    ('archive_record','1.0.0','Archive one current Saga-scoped Library record after explicit review.',
     'archive_restore','explicit','deterministic_handler',
     '{"type":"object","additionalProperties":false,"required":["record_source_id"],"properties":{"record_source_id":{"type":"uuid","source":"turn_evidence"}}}'::jsonb,
     array['character','place','faction','artifact','thread','note']::text[],true,null::text,0::numeric,
     'Archive the current Saga record through the existing reversible lifecycle writer.','Open the record and use Archive record manually.',true),
    ('restore_record','1.0.0','Restore one archived Saga-scoped Library record after explicit review.',
     'archive_restore','explicit','deterministic_handler',
     '{"type":"object","additionalProperties":false,"required":["record_source_id"],"properties":{"record_source_id":{"type":"uuid","source":"turn_evidence"}}}'::jsonb,
     array['character','place','faction','artifact','thread','note']::text[],true,null::text,0::numeric,
     'Restore the archived Saga record through the existing conflict-checked lifecycle writer.','Open Archived Library and restore the record manually.',true),
    ('prepare_hard_delete','1.0.0','Prepare navigation to the existing protected permanent-delete panel for one archived Saga record.',
     'hard_delete','explicit','client_navigation',
     '{"type":"object","additionalProperties":false,"required":["record_source_id"],"properties":{"record_source_id":{"type":"uuid","source":"turn_evidence"}}}'::jsonb,
     array['character','place','faction','artifact','thread','note']::text[],true,null::text,0::numeric,
     'Open the owning archived-record delete panel; no deletion is executed by The Loom.','Open the archived record and use its protected permanent-delete panel manually.',true)
$$;

create or replace function internal.loom_provider_action_manifest()
returns jsonb language sql stable set search_path=internal,pg_temp as $$
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'name',c.action_name,'version',c.action_version,'description',c.description,
    'arguments',c.provider_arguments,'authority_tier',c.authority_tier,
    'confirmation_policy',c.confirmation_policy,
    'ai_credits',case when c.action_name='start_prep_task' then null else c.ai_credits end,
    'task_credit_options',case when c.action_name='start_prep_task' then jsonb_build_object(
      'compose_prep_briefing',3,'generate_session_prep',10,'propose_scene_beats',1,
      'propose_thread_complication',1,'propose_npc_for_scene',1,'propose_quick_stub_fleshing',1) end,
    'effect_summary',c.effect_summary)) order by c.action_name),'[]'::jsonb)
  from internal.loom_action_contracts() c where c.active
$$;

create or replace function internal.loom_e10_exact_record(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_target text,p_entity_type text,p_required_state text
)
returns jsonb language plpgsql stable security definer set search_path=public,internal,pg_temp as $$
declare q text:=lower(btrim(trim(both '"' from p_target))); matches integer; row_value record;
begin
  if p_entity_type is not null and p_entity_type not in ('character','place','faction','artifact','thread','note') then return null; end if;
  if p_required_state not in ('canon','archived') then return null; end if;
  select count(*) into matches from internal.library_candidates(p_workspace_id,p_world_id,p_saga_id) c
  where c.scope='saga' and c.saga_id=p_saga_id and lower(c.name)=q
    and c.canon_state::text=p_required_state and (p_entity_type is null or c.entity_type=p_entity_type);
  if matches<>1 then return null; end if;
  select c.* into row_value from internal.library_candidates(p_workspace_id,p_world_id,p_saga_id) c
  where c.scope='saga' and c.saga_id=p_saga_id and lower(c.name)=q
    and c.canon_state::text=p_required_state and (p_entity_type is null or c.entity_type=p_entity_type) limit 1;
  return internal.library_record(p_workspace_id,p_world_id,p_saga_id,row_value.entity_type,row_value.entity_id);
end $$;

create or replace function internal.finish_loom_plan_step(p_action_id uuid,p_result jsonb)
returns void language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare a public.guide_action_intents%rowtype; v_state text:=p_result->>'state';
begin
  select * into a from public.guide_action_intents where id=p_action_id;
  if not found or a.plan_step is null then return; end if;
  if v_state='accepted' then
    update public.guide_action_intents n set availability_state='available',failure_category=null,updated_at=now()
    where n.turn_id=a.turn_id and n.plan_step=a.plan_step+1 and n.state='pending'
      and not exists(select 1 from public.guide_action_intents prior where prior.turn_id=a.turn_id
        and prior.plan_step<n.plan_step and prior.state<>'accepted');
  elsif v_state in ('conflict','dismissed','failed','quota_blocked') then
    update public.guide_action_intents n set availability_state='unavailable',failure_category='plan_stopped',updated_at=now()
    where n.turn_id=a.turn_id and n.plan_step>a.plan_step and n.state='pending';
  end if;
end $$;

alter function public.review_loom_action(uuid,integer,text,uuid) rename to review_loom_action_e9;
alter function public.review_loom_action_e9(uuid,integer,text,uuid) set schema internal;

create or replace function public.review_loom_action(
  p_action_id uuid,p_expected_intent_version integer,p_decision text,p_idempotency_key uuid
)
returns jsonb language plpgsql security definer set search_path=public,internal,extensions,pg_temp as $$
declare a public.guide_action_intents%rowtype; prior internal.loom_action_receipts%rowtype; c record; pair record;
  v_hash text; v_receipt uuid:=public.uuid7(); v_result jsonb; v_current text; record_row jsonb; blockers jsonb;
begin
  if auth.uid() is null or p_decision not in ('confirmed','dismissed') or p_idempotency_key is null then
    raise exception 'Loom action review is invalid' using errcode='22023'; end if;
  select * into a from public.guide_action_intents where id=p_action_id;
  if not found or a.gm_id<>auth.uid() then raise exception 'Loom action is unavailable' using errcode='42501'; end if;
  if a.plan_step is not null and a.availability_state<>'available' then
    raise exception 'Loom plan step is not available' using errcode='23514'; end if;
  if a.action_type not in ('archive_record','restore_record','prepare_hard_delete') then
    v_result:=internal.review_loom_action_e9(p_action_id,p_expected_intent_version,p_decision,p_idempotency_key);
    perform internal.finish_loom_plan_step(p_action_id,v_result);
    return v_result;
  end if;
  v_hash:=encode(extensions.digest(convert_to(concat_ws('|',p_action_id::text,p_expected_intent_version::text,p_decision),'UTF8'),'sha256'),'hex');
  select * into prior from internal.loom_action_receipts where gm_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if prior.action_intent_id<>p_action_id or prior.request_hash<>v_hash or prior.decision<>p_decision then
      raise exception 'Loom action idempotency key was reused with different input' using errcode='23505'; end if;
    return prior.result||jsonb_build_object('receipt_id',prior.id,'replayed',true);
  end if;
  select * into a from public.guide_action_intents where id=p_action_id for update;
  perform public.assert_saga_access(a.workspace_id,a.world_id,a.saga_id);
  if a.intent_version<>p_expected_intent_version then raise exception 'Loom action changed; refresh before reviewing' using errcode='40001'; end if;
  select * into c from internal.loom_action_contracts() x where x.action_name=a.action_type and x.action_version=a.action_version and x.active;
  if not found then raise exception 'Loom action contract is unavailable' using errcode='22023'; end if;
  if p_decision='dismissed' then
    if a.state not in ('pending','conflict','failed') then raise exception 'Loom action can no longer be dismissed' using errcode='23514'; end if;
    v_result:=jsonb_build_object('action_id',a.id,'state','dismissed','allowed',true,'intent_version',a.intent_version+1);
    insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
    values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'dismissed',v_result);
    update public.guide_action_intents set state='dismissed',intent_version=intent_version+1,execution_receipt_id=v_receipt,
      failure_category=null,updated_at=now() where id=a.id;
    perform internal.finish_loom_plan_step(a.id,v_result);
    return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
  end if;
  if c.confirmation_policy<>'explicit' or a.state<>'pending' then raise exception 'Loom action cannot be confirmed' using errcode='23514'; end if;
  for pair in select key,value from jsonb_each_text(a.evidence_versions) loop
    v_current:=internal.loom_source_current_version(pair.key::uuid);
    if v_current is null or v_current<>pair.value then
      v_result:=jsonb_build_object('action_id',a.id,'state','conflict','allowed',false,'category','stale_evidence','intent_version',a.intent_version+1);
      insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
      values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'conflict',v_result);
      update public.guide_action_intents set state='conflict',availability_state='stale',failure_category='stale_evidence',
        intent_version=intent_version+1,execution_receipt_id=v_receipt,updated_at=now() where id=a.id;
      perform internal.finish_loom_plan_step(a.id,v_result);
      return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
    end if;
  end loop;
  record_row:=internal.library_record(a.workspace_id,a.world_id,a.saga_id,a.target_type,a.target_id);
  if record_row is null or record_row->>'scope'<>'saga' or record_row->>'saga_id'<>a.saga_id::text
    or record_row->>'updated_at'<>a.target_version
    or (a.action_type='archive_record' and record_row->>'canon_state'<>'canon')
    or (a.action_type in ('restore_record','prepare_hard_delete') and record_row->>'canon_state'<>'archived') then
    v_result:=jsonb_build_object('action_id',a.id,'state','conflict','allowed',false,'category','lifecycle_changed','intent_version',a.intent_version+1);
    insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
    values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'conflict',v_result);
    update public.guide_action_intents set state='conflict',availability_state='stale',failure_category='lifecycle_changed',
      intent_version=intent_version+1,execution_receipt_id=v_receipt,updated_at=now() where id=a.id;
    perform internal.finish_loom_plan_step(a.id,v_result);
    return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
  end if;
  if a.action_type='archive_record' then
    perform public.archive_entity(a.workspace_id,a.world_id,a.saga_id,a.target_type,a.target_id,a.target_version::timestamptz);
    v_result:=jsonb_build_object('action_id',a.id,'state','accepted','allowed',true,'intent_version',a.intent_version+1,
      'record_type',a.target_type,'record_id',a.target_id,'record_name',record_row->>'name','from_state','canon','to_state','archived',
      'consequence','The Saga record was archived through the existing reversible lifecycle writer.');
  elsif a.action_type='restore_record' then
    perform public.restore_entity(a.workspace_id,a.world_id,a.saga_id,a.target_type,a.target_id,a.target_version::timestamptz);
    v_result:=jsonb_build_object('action_id',a.id,'state','accepted','allowed',true,'intent_version',a.intent_version+1,
      'record_type',a.target_type,'record_id',a.target_id,'record_name',record_row->>'name','from_state','archived','to_state','canon',
      'consequence','The Saga record was restored through the existing conflict-checked lifecycle writer.');
  else
    blockers:=internal.library_dependency_summary(a.workspace_id,a.world_id,a.saga_id,a.target_type,a.target_id);
    v_result:=jsonb_build_object('action_id',a.id,'state','accepted','allowed',true,'intent_version',a.intent_version+1,
      'record_type',a.target_type,'record_id',a.target_id,'record_name',record_row->>'name','from_state','archived','to_state','archived',
      'prepared',true,'blockers',blockers,'delete_execution','owning_record_ui_only',
      'consequence','The protected record panel is ready. The Loom did not delete anything.');
  end if;
  insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
  values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'applied',v_result);
  update public.guide_action_intents set state='accepted',intent_version=intent_version+1,execution_receipt_id=v_receipt,
    result_snapshot=result_snapshot||v_result,failure_category=null,updated_at=now() where id=a.id;
  perform internal.finish_loom_plan_step(a.id,v_result);
  return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
end $$;

create or replace function public.get_guide_thread(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_thread_id uuid default null
)
returns jsonb language plpgsql stable security definer set search_path=public,internal,pg_temp as $$
declare v_thread public.guide_threads%rowtype; v_turns jsonb;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  select * into v_thread from public.guide_threads t where t.gm_id=auth.uid() and t.workspace_id=p_workspace_id
    and t.world_id=p_world_id and t.saga_id=p_saga_id and (p_thread_id is null or t.id=p_thread_id)
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
      'result',a.result_snapshot,'explanation',a.explanation,'failure_category',a.failure_category,
      'plan_step',a.plan_step,'plan_size',a.plan_size,'plan_depends_on',a.plan_depends_on,
      'receipt_id',a.execution_receipt_id,'draft_id',a.created_draft_id,'state',case
        when a.failure_category='plan_stopped' then 'blocked'
        when a.failure_category='quota_blocked' then 'quota_blocked'
        when a.state='processing' and r.status='complete' then 'accepted'
        when a.state='processing' and r.status in ('failed','terminal','dead_letter') then 'failed'
        else a.state end
    )) order by a.block_index) from public.guide_action_intents a
      left join internal.ai_task_runs r on r.id=a.accepted_run_id where a.turn_id=t.id),'[]'::jsonb)
  ) order by t.ordinal),'[]'::jsonb) into v_turns from public.guide_turns t where t.thread_id=v_thread.id;
  return jsonb_build_object('id',v_thread.id,'state',v_thread.state,'title','The Loom','turns',v_turns);
end $$;

alter function internal.ai_task_contracts() rename to ai_task_contracts_e9;
create or replace function internal.ai_task_contracts()
returns table(task_name text,prompt_version text,quota_tier text,ai_credits numeric,model_tier text,retrieval_profile text,source_policy text,output_mode text,active boolean)
language sql stable set search_path=public,internal,pg_temp as $$
  select x.task_name,case when x.task_name='answer_saga_question' then 'answer_saga_question@1.6.0' else x.prompt_version end,
    x.quota_tier,x.ai_credits,x.model_tier,x.retrieval_profile,x.source_policy,x.output_mode,x.active
  from internal.ai_task_contracts_e9() x
$$;

alter function internal.materialize_loom_action_intent(uuid,integer,jsonb,text)
  rename to materialize_loom_action_intent_e9;

create or replace function internal.materialize_loom_action_intent(
  p_turn_id uuid,p_block_index integer,p_action jsonb,p_explanation text
)
returns uuid language plpgsql security definer set search_path=public,internal,extensions,pg_temp as $$
declare t public.guide_turns%rowtype; c record; v_name text; v_version text; a jsonb; ref jsonb; record_row jsonb;
  v_source uuid; v_type text; v_id uuid; v_target uuid; v_version_text text; v_required_state text;
  v_versions jsonb:='{}'::jsonb; v_result jsonb:='{}'::jsonb; blockers jsonb;
begin
  if jsonb_typeof(p_action)<>'object' or exists(select 1 from jsonb_object_keys(p_action) k where k not in ('name','version','arguments')) then
    raise exception 'Loom action preview is invalid' using errcode='22023'; end if;
  v_name:=p_action->>'name'; v_version:=p_action->>'version'; a:=p_action->'arguments';
  if v_name not in ('archive_record','restore_record','prepare_hard_delete') then
    return internal.materialize_loom_action_intent_e9(p_turn_id,p_block_index,p_action,p_explanation);
  end if;
  if p_block_index<0 or nullif(btrim(p_explanation),'') is null or char_length(p_explanation)>500 or jsonb_typeof(a)<>'object' then
    raise exception 'Loom action preview is invalid' using errcode='22023'; end if;
  select * into c from internal.loom_action_contracts() x where x.action_name=v_name and x.action_version=v_version and x.active;
  if not found then raise exception 'Loom action is not registered' using errcode='22023'; end if;
  select * into t from public.guide_turns where id=p_turn_id;
  if not found then raise exception 'Loom turn is unavailable' using errcode='22023'; end if;
  v_required_state:=case when v_name='archive_record' then 'canon' else 'archived' end;
  if a?'record_source_id' then
    if exists(select 1 from jsonb_object_keys(a) k where k<>'record_source_id') then raise exception 'Lifecycle arguments are invalid' using errcode='22023'; end if;
    begin v_source:=(a->>'record_source_id')::uuid; exception when others then raise exception 'Lifecycle source is invalid' using errcode='22023'; end;
    ref:=internal.loom_action_record_reference(t.id,v_source);
    if ref is null then raise exception 'Lifecycle source is unavailable' using errcode='40001'; end if;
    v_type:=ref->>'record_type'; v_target:=(ref->>'record_id')::uuid;
    if internal.loom_source_current_version(v_source) is null then raise exception 'Lifecycle evidence is unavailable' using errcode='40001'; end if;
    v_versions:=jsonb_build_object(v_source::text,internal.loom_source_current_version(v_source));
  elsif t.retrieval_mode='deterministic_read' and a?'record_type' and a?'record_id' then
    if exists(select 1 from jsonb_object_keys(a) k where k not in ('record_type','record_id')) then raise exception 'Lifecycle arguments are invalid' using errcode='22023'; end if;
    v_type:=a->>'record_type'; begin v_target:=(a->>'record_id')::uuid; exception when others then raise exception 'Lifecycle target is invalid' using errcode='22023'; end;
  else raise exception 'Lifecycle target is invalid' using errcode='22023'; end if;
  if v_type not in ('character','place','faction','artifact','thread','note') then raise exception 'Lifecycle target is invalid' using errcode='22023'; end if;
  record_row:=internal.library_record(t.workspace_id,t.world_id,t.saga_id,v_type,v_target);
  if record_row is null or record_row->>'scope'<>'saga' or record_row->>'saga_id'<>t.saga_id::text
    or record_row->>'canon_state'<>v_required_state then
    raise exception 'Lifecycle target is unavailable' using errcode='40001'; end if;
  v_version_text:=record_row->>'updated_at';
  blockers:=case when v_name='prepare_hard_delete' then
    internal.library_dependency_summary(t.workspace_id,t.world_id,t.saga_id,v_type,v_target) else null end;
  v_result:=jsonb_strip_nulls(jsonb_build_object('record_type',v_type,'record_id',v_target,'record_name',record_row->>'name',
    'from_state',record_row->>'canon_state','to_state',case when v_name='archive_record' then 'archived'
      when v_name='restore_record' then 'canon' else 'archived' end,'blockers',blockers,
    'delete_execution','owning_record_ui_only'));
  insert into public.guide_action_intents(workspace_id,world_id,saga_id,gm_id,thread_id,turn_id,block_index,
    action_type,action_version,arguments,authority_tier,confirmation_policy,execution_kind,target_type,target_id,target_version,
    evidence_versions,cost_snapshot,effect_summary,manual_fallback,explanation,result_snapshot,state)
  values(t.workspace_id,t.world_id,t.saga_id,t.gm_id,t.thread_id,t.id,p_block_index,v_name,v_version,a,c.authority_tier,
    c.confirmation_policy,c.execution_kind,v_type,v_target,v_version_text,v_versions,jsonb_build_object('ai_credits',0),
    c.effect_summary,c.manual_fallback,p_explanation,v_result,'pending')
  on conflict(turn_id,block_index) do update set updated_at=public.guide_action_intents.updated_at returning id into v_id;
  return v_id;
end $$;

create or replace function internal.materialize_loom_action_intent(
  p_turn_id uuid,p_block_index integer,p_action jsonb,p_explanation text,p_plan jsonb
)
returns uuid language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare v_id uuid; v_step integer; v_size integer; v_depends smallint[]:='{}'::smallint[]; item jsonb;
begin
  v_id:=internal.materialize_loom_action_intent(p_turn_id,p_block_index,p_action,p_explanation);
  if p_plan is null then return v_id; end if;
  v_step:=(p_plan->>'step')::integer; v_size:=(p_plan->>'size')::integer;
  for item in select value from jsonb_array_elements(p_plan->'depends_on') loop v_depends:=array_append(v_depends,(item#>>'{}')::smallint); end loop;
  update public.guide_action_intents set plan_step=v_step,plan_size=v_size,plan_depends_on=v_depends,
    availability_state=case when v_step=1 then 'available' else 'unavailable' end,
    failure_category=case when v_step=1 then null else 'plan_waiting' end,updated_at=now() where id=v_id;
  return v_id;
end $$;

create or replace function public.complete_guide_turn_for_worker(p_run_id uuid,p_output jsonb)
returns void language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare v_turn public.guide_turns%rowtype; v_block jsonb; v_index integer:=0; v_action_count integer:=0;
  v_action_ordinal integer:=0; v_plan jsonb; v_dep jsonb; v_seen integer[]:='{}'::integer[];
  v_eligible constant text[]:=array['propose_record_create','propose_record_update','add_relationship','remove_relationship',
    'set_thread_state','mutate_thread_objective','create_session','retry_session_transcription','archive_record','restore_record'];
begin
  select t.* into v_turn from public.guide_turns t join internal.ai_task_runs r on r.guide_turn_id=t.id
  where r.id=p_run_id for update of t;
  if not found then return; end if;
  select count(*) into v_action_count from jsonb_array_elements(coalesce(p_output->'blocks','[]'::jsonb)) b where b->>'type'='action_preview';
  if v_action_count>5 then raise exception 'Loom plan exceeds five actions' using errcode='22023'; end if;
  if v_turn.status<>'superseded' then
    for v_block in select value from jsonb_array_elements(coalesce(p_output->'blocks','[]'::jsonb)) loop
      if v_block->>'type'='action_preview' then
        v_action_ordinal:=v_action_ordinal+1; v_plan:=v_block->'plan';
        if v_action_count=1 then
          if v_plan is not null then raise exception 'Single Loom actions cannot carry plan metadata' using errcode='22023'; end if;
          perform internal.materialize_loom_action_intent(v_turn.id,v_index,v_block->'action',v_block->>'explanation');
        else
          if v_action_count<2 or jsonb_typeof(v_plan)<>'object'
            or exists(select 1 from jsonb_object_keys(v_plan) k where k not in ('step','depends_on'))
            or jsonb_typeof(v_plan->'step')<>'number' or (v_plan->>'step')::integer<>v_action_ordinal
            or jsonb_typeof(v_plan->'depends_on')<>'array'
            or v_block->'action'->>'name'<>all(v_eligible) then
            raise exception 'Loom plan metadata is invalid' using errcode='22023'; end if;
          v_seen:='{}'::integer[];
          for v_dep in select value from jsonb_array_elements(v_plan->'depends_on') loop
            if jsonb_typeof(v_dep)<>'number' or (v_dep#>>'{}')::integer<1 or (v_dep#>>'{}')::integer>=v_action_ordinal
              or (v_dep#>>'{}')::integer=any(v_seen) then raise exception 'Loom plan dependency is invalid' using errcode='22023'; end if;
            v_seen:=array_append(v_seen,(v_dep#>>'{}')::integer);
          end loop;
          perform internal.materialize_loom_action_intent(v_turn.id,v_index,v_block->'action',v_block->>'explanation',
            v_plan||jsonb_build_object('size',v_action_count));
        end if;
      elsif v_block?'plan' then raise exception 'Only action previews may carry plan metadata' using errcode='22023'; end if;
      v_index:=v_index+1;
    end loop;
    update public.guide_turns set status='complete',response_payload=p_output,failure_category=null,
      completed_at=now(),updated_at=now() where id=v_turn.id;
  end if;
end $$;

alter function internal.plan_loom_retrieval(uuid,uuid,uuid,uuid,text) rename to plan_loom_retrieval_e9;

create or replace function internal.plan_loom_retrieval(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_gm_id uuid,p_question text
)
returns jsonb language plpgsql stable security definer set search_path=public,internal,pg_temp as $$
declare q text:=lower(internal.normalize_guide_question(p_question)); target text; record_type text; required_state text;
  action_name text; record_ref jsonb; prefix text; candidate text;
begin
  if not exists(select 1 from public.sagas s join public.workspaces w on w.id=s.workspace_id
    where s.id=p_saga_id and s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and w.owner_gm_id=p_gm_id and s.deleted_at is null) then
    raise exception 'Loom Saga is not available' using errcode='42501';
  end if;
  if q~'^archive (the )?.+' then
    action_name:='archive_record'; required_state:='canon'; prefix:='^archive (the )?';
  elsif q~'^restore (the )?.+' then
    action_name:='restore_record'; required_state:='archived'; prefix:='^restore (the )?';
  elsif q~'^(prepare( to)?|open)( the)?( permanent)? delete( panel)? (for )?(the )?.+' then
    action_name:='prepare_hard_delete'; required_state:='archived';
    prefix:='^(prepare( to)?|open)( the)?( permanent)? delete( panel)? (for )?(the )?';
  else
    return internal.plan_loom_retrieval_e9(p_workspace_id,p_world_id,p_saga_id,p_gm_id,p_question);
  end if;
  target:=btrim(regexp_replace(q,prefix,''));
  foreach candidate in array array['character','place','faction','artifact','thread','note','record'] loop
    if target like candidate||' %' then
      record_type:=case when candidate='record' then null else candidate end;
      target:=btrim(substr(target,char_length(candidate)+1));
      exit;
    end if;
  end loop;
  record_ref:=internal.loom_e10_exact_record(p_workspace_id,p_world_id,p_saga_id,target,record_type,required_state);
  if record_ref is null then
    return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','lifecycle_target_unavailable',
      'source_ids','[]'::jsonb,'guidance','No single matching Saga record is available in the required lifecycle state.');
  end if;
  return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason',action_name,
    'source_ids','[]'::jsonb,'action',jsonb_build_object('name',action_name,'version','1.0.0','arguments',
      jsonb_build_object('record_type',record_ref->>'entityType','record_id',record_ref->>'id')));
end $$;

alter function public.create_loom_deterministic_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text)
  rename to create_loom_deterministic_turn_for_worker_e9;
alter function public.create_loom_deterministic_turn_for_worker_e9(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text)
  set schema internal;

create or replace function public.create_loom_deterministic_turn_for_worker(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_gm_id uuid,p_thread_id uuid,
  p_turn_id uuid,p_idempotency_key uuid,p_question text
)
returns jsonb language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare v_result jsonb;
begin
  v_result:=internal.create_loom_deterministic_turn_for_worker_e9(p_workspace_id,p_world_id,p_saga_id,p_gm_id,
    p_thread_id,p_turn_id,p_idempotency_key,p_question);
  update public.guide_action_intents a set state='pending',
    explanation=case a.action_type when 'archive_record' then 'Review this reversible archive before applying it.'
      when 'restore_record' then 'Review this restore before returning the record to canon.'
      else 'Review this protected-delete handoff; The Loom will not delete the record.' end,
    updated_at=now()
  where a.turn_id=p_turn_id and a.action_type in ('archive_record','restore_record','prepare_hard_delete')
    and a.execution_receipt_id is null;
  return v_result;
end $$;

revoke all on function internal.loom_action_contracts_e9() from public,anon,authenticated;
revoke all on function internal.loom_action_contracts() from public,anon,authenticated;
revoke all on function internal.loom_provider_action_manifest() from public,anon,authenticated;
revoke all on function internal.loom_e10_exact_record(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function internal.plan_loom_retrieval_e9(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function internal.plan_loom_retrieval(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function internal.create_loom_deterministic_turn_for_worker_e9(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.create_loom_deterministic_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.create_loom_deterministic_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text) to service_role;
revoke all on function internal.materialize_loom_action_intent_e9(uuid,integer,jsonb,text) from public,anon,authenticated;
revoke all on function internal.materialize_loom_action_intent(uuid,integer,jsonb,text) from public,anon,authenticated;
revoke all on function internal.materialize_loom_action_intent(uuid,integer,jsonb,text,jsonb) from public,anon,authenticated;
revoke all on function internal.finish_loom_plan_step(uuid,jsonb) from public,anon,authenticated;
revoke all on function internal.review_loom_action_e9(uuid,integer,text,uuid) from public,anon,authenticated;
revoke all on function public.review_loom_action(uuid,integer,text,uuid) from public,anon;
grant execute on function public.review_loom_action(uuid,integer,text,uuid) to authenticated;
revoke all on function public.complete_guide_turn_for_worker(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_guide_turn_for_worker(uuid,jsonb) to service_role;
revoke all on function public.get_guide_thread(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.get_guide_thread(uuid,uuid,uuid,uuid) to authenticated;
revoke all on function internal.ai_task_contracts_e9() from public,anon,authenticated;
revoke all on function internal.ai_task_contracts() from public,anon,authenticated;
