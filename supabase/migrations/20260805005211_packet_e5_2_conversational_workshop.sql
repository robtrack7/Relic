-- Packet E5.2: cost-bounded conversational Saga workshop and complete scaffold contract.

alter table public.sagas
  add column if not exists creation_context jsonb not null default '{}'::jsonb;
alter table public.sagas
  drop constraint if exists sagas_creation_context_object_check;
alter table public.sagas
  add constraint sagas_creation_context_object_check
  check (jsonb_typeof(creation_context) = 'object');

alter table public.workshop_sessions
  add column if not exists creation_input jsonb not null default '{}'::jsonb,
  add column if not exists interview_plan jsonb not null default '{}'::jsonb,
  add column if not exists emerging_outline jsonb not null default '{}'::jsonb,
  add column if not exists workshop_phase text not null default 'planning',
  add column if not exists conversation_step integer not null default 0,
  add column if not exists conversation_version integer not null default 1,
  add column if not exists gm_message_count integer not null default 0,
  add column if not exists total_message_count integer not null default 0,
  add column if not exists gm_input_chars integer not null default 0;

update public.workshop_sessions
set workshop_phase = case
      when state = 'committed' then 'committed'
      when generation_status = 'complete' and draft_payload <> '{}'::jsonb then 'review'
      when generation_status in ('queued', 'running') then 'drafting'
      else 'planning'
    end,
    gm_message_count = coalesce((select count(*) from jsonb_array_elements(conversation) m where m ->> 'role' = 'gm'), 0),
    total_message_count = jsonb_array_length(conversation),
    gm_input_chars = coalesce((select sum(char_length(m ->> 'content')) from jsonb_array_elements(conversation) m where m ->> 'role' = 'gm'), 0)
where creation_input = '{}'::jsonb;

alter table public.workshop_sessions drop constraint if exists workshop_sessions_phase_check;
alter table public.workshop_sessions add constraint workshop_sessions_phase_check
  check (workshop_phase in ('planning','conversation','drafting','review','committed'));
alter table public.workshop_sessions drop constraint if exists workshop_sessions_conversation_bounds_check;
alter table public.workshop_sessions add constraint workshop_sessions_conversation_bounds_check check (
  conversation_step between 0 and 5
  and conversation_version >= 1
  and gm_message_count between 0 and 12
  and total_message_count between 0 and 20
  and gm_input_chars between 0 and 50000
);
alter table public.workshop_sessions drop constraint if exists workshop_sessions_json_shape_check;
alter table public.workshop_sessions add constraint workshop_sessions_json_shape_check check (
  jsonb_typeof(creation_input) = 'object'
  and jsonb_typeof(interview_plan) = 'object'
  and jsonb_typeof(emerging_outline) = 'object'
  and jsonb_typeof(conversation) = 'array'
  and jsonb_typeof(draft_payload) = 'object'
);

drop index if exists internal.ai_task_runs_workshop_idx;
create index if not exists ai_task_runs_workshop_history_idx
  on internal.ai_task_runs(workshop_session_id, created_at desc)
  where workshop_session_id is not null;

alter table internal.workshop_ai_evidence
  drop constraint if exists workshop_ai_evidence_evidence_text_check;
alter table internal.workshop_ai_evidence
  add constraint workshop_ai_evidence_evidence_text_check
  check (char_length(evidence_text) between 1 and 50000);

create table internal.workshop_turn_receipts (
  workshop_session_id uuid not null references public.workshop_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  action text not null check (action in ('answer','draft_now')),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (workshop_session_id, user_id, idempotency_key)
);
create index workshop_turn_receipts_user_created_idx
  on internal.workshop_turn_receipts(user_id, created_at desc);
revoke all on table internal.workshop_turn_receipts from public, anon, authenticated;

alter table internal.ai_task_runs drop constraint if exists ai_task_runs_output_mode_check;
alter table internal.ai_task_runs add constraint ai_task_runs_output_mode_check check (
  output_mode in (
    'workshop_interview_plan','workshop_draft_payload','workshop_section_draft',
    'draft','prep_suggestions','prep_briefing','draft_batch','ephemeral'
  )
);

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
  ('answer_saga_question','answer_saga_question@1.1.0','light',1::numeric,'relic-balanced','sanctum_qa_grounding','canon_only','ephemeral',true),
  ('propose_quick_stub_fleshing','propose_quick_stub_fleshing@1.0.0','light',1::numeric,'relic-balanced','post_session_synthesis','canon_plus_untrusted_input','ephemeral',true)
$$;

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
  v_creation_input jsonb;
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
  if nullif(btrim(p_saga_name),'') is null or char_length(btrim(p_saga_name))>120 then raise exception 'Saga name is invalid' using errcode='23514'; end if;
  if nullif(btrim(p_idea_or_notes),'') is null or char_length(p_idea_or_notes)>50000 then raise exception 'Workshop input must contain 1 to 50000 characters' using errcode='23514'; end if;
  if p_existing_world_id is not null and not exists(select 1 from public.worlds w where w.id=p_existing_world_id and w.workspace_id=p_workspace_id and w.deleted_at is null) then raise exception 'World access denied' using errcode='42501'; end if;

  v_effective_profile := internal.resolve_gm_creation_profile(p_profile_mode, p_gm_profile);
  v_creation_input := jsonb_build_object(
    'saga_name', btrim(p_saga_name),
    'world_name', nullif(btrim(coalesce(p_world_name,'')),''),
    'game_system', nullif(btrim(coalesce(p_game_system,'')),''),
    'path', p_path,
    'gm_profile', v_effective_profile
  );
  v_hash := encode(extensions.digest(convert_to((v_creation_input || jsonb_build_object(
    'input',p_idea_or_notes,'world_id',p_existing_world_id,'profile_mode',p_profile_mode,
    'save_profile_as_default',coalesce(p_save_profile_as_default,false)
  ))::text,'UTF8'),'sha256'),'hex');

  select * into v_existing from public.workshop_sessions w where w.user_id=auth.uid() and w.idempotency_key=p_idempotency_key;
  if found then
    if v_existing.id<>p_workshop_id or v_existing.input_hash<>v_hash then raise exception 'Workshop idempotency key was reused with different input' using errcode='23505'; end if;
    return jsonb_build_object('workshop_id',v_existing.id,'run_id',v_existing.ai_task_run_id,'status',v_existing.generation_status,'phase',v_existing.workshop_phase,'replayed',true,'allowed',v_existing.generation_status<>'quota_blocked');
  end if;

  select * into v_contract from internal.ai_task_contracts() where task_name='plan_saga_workshop' and active;
  select * into v_quota from public.check_quota_preflight(p_workspace_id,p_existing_world_id,null,'ai_call',v_contract.ai_credits,jsonb_build_object('task_name','plan_saga_workshop'));
  insert into public.workshop_sessions(
    id,user_id,workspace_id,world_id,path,gm_profile_snapshot,profile_mode,save_profile_as_default,
    creation_input,conversation,state,idempotency_key,input_hash,generation_status,quota_snapshot,
    workshop_phase,conversation_step,conversation_version,gm_message_count,total_message_count,gm_input_chars
  ) values (
    p_workshop_id,auth.uid(),p_workspace_id,p_existing_world_id,p_path,v_effective_profile,p_profile_mode,
    coalesce(p_save_profile_as_default,false),v_creation_input,
    jsonb_build_array(jsonb_build_object('role','gm','content',p_idea_or_notes,'timestamp',now())),
    'in_progress',p_idempotency_key,v_hash,case when v_quota.allowed then 'queued' else 'quota_blocked' end,to_jsonb(v_quota),
    'planning',0,1,1,1,char_length(p_idea_or_notes)
  );
  insert into internal.workshop_ai_evidence values(
    p_workshop_id,v_ord,v_input_source,null,'workshop_input','GM workshop input',p_idea_or_notes,
    encode(extensions.digest(convert_to(p_idea_or_notes,'UTF8'),'sha256'),'hex'),now()
  );
  if p_existing_world_id is not null then
    for s in select * from public.sources x where x.workspace_id=p_workspace_id and x.world_id=p_existing_world_id and x.scope='world' and x.kind='existing_entity' and nullif(btrim(x.raw_excerpt),'') is not null order by x.created_at desc limit 10 loop
      v_ord:=v_ord+1;
      insert into internal.workshop_ai_evidence values(p_workshop_id,v_ord,s.id,s.id,'existing_entity','Eligible World canon',left(s.raw_excerpt,12000),encode(extensions.digest(convert_to(left(s.raw_excerpt,12000),'UTF8'),'sha256'),'hex'),now());
    end loop;
  end if;
  if not v_quota.allowed then
    return jsonb_build_object('workshop_id',p_workshop_id,'run_id',null,'status','quota_blocked','phase','planning','allowed',false,'severity',v_quota.severity,'message',v_quota.message,'replayed',false);
  end if;
  insert into internal.ai_task_runs(id,workspace_id,world_id,saga_id,gm_id,task_name,prompt_version,quota_tier,ai_credits,model_tier,retrieval_profile,source_policy,output_mode,input_payload,allowed_source_ids,workshop_session_id)
  select v_run_id,p_workspace_id,p_existing_world_id,null,auth.uid(),v_contract.task_name,v_contract.prompt_version,v_contract.quota_tier,v_contract.ai_credits,v_contract.model_tier,v_contract.retrieval_profile,v_contract.source_policy,v_contract.output_mode,
    v_creation_input || jsonb_build_object('workshop_session_id',p_workshop_id),array_agg(e.source_id order by e.ordinal),p_workshop_id
  from internal.workshop_ai_evidence e where e.workshop_session_id=p_workshop_id;
  update public.workshop_sessions set ai_task_run_id=v_run_id where id=p_workshop_id;
  return jsonb_build_object('workshop_id',p_workshop_id,'run_id',v_run_id,'status','queued','phase','planning','allowed',true,'replayed',false);
end;
$$;

create or replace function public.answer_saga_workshop_question(
  p_workshop_id uuid,
  p_expected_conversation_version integer,
  p_answer text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  w public.workshop_sessions%rowtype;
  v_answer text := btrim(normalize(p_answer, NFKC));
  v_hash text;
  v_receipt internal.workshop_turn_receipts%rowtype;
  v_question jsonb;
  v_next_question jsonb;
  v_field text;
  v_assistant_text text;
  v_result jsonb;
  v_added_messages integer := 1;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if nullif(v_answer,'') is null or char_length(v_answer)>5000 then raise exception 'Workshop answer must contain 1 to 5000 characters' using errcode='23514'; end if;
  v_hash:=encode(extensions.digest(convert_to(jsonb_build_object('action','answer','version',p_expected_conversation_version,'answer',v_answer)::text,'UTF8'),'sha256'),'hex');
  select * into v_receipt from internal.workshop_turn_receipts where workshop_session_id=p_workshop_id and user_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.input_hash<>v_hash or v_receipt.action<>'answer' then raise exception 'Workshop turn key was reused with different input' using errcode='23505'; end if;
    return v_receipt.result || jsonb_build_object('replayed',true);
  end if;
  select * into w from public.workshop_sessions where id=p_workshop_id and user_id=auth.uid() for update;
  if not found or not public.user_is_workspace_member(w.workspace_id) then raise exception 'Workshop is unavailable' using errcode='42501'; end if;
  if w.state<>'in_progress' or w.workshop_phase<>'conversation' or w.conversation_version<>p_expected_conversation_version then raise exception 'Workshop conversation changed; refresh before answering' using errcode='40001'; end if;
  if w.gm_message_count>=12 or w.total_message_count>=20 then raise exception 'Workshop conversation reached its message limit' using errcode='23514'; end if;
  if w.gm_input_chars+char_length(v_answer)>50000 then raise exception 'Workshop input exceeds 50000 characters' using errcode='23514'; end if;
  v_question:=w.interview_plan->'questions'->w.conversation_step;
  if v_question is null then raise exception 'Workshop has no unanswered question' using errcode='23514'; end if;
  v_field:=v_question->>'outline_field';
  if v_field not in ('premise','tone','central_conflict','starting_place','first_session_hook','characters','factions','threads','gm_secrets') then raise exception 'Workshop question target is invalid' using errcode='23514'; end if;
  v_next_question:=w.interview_plan->'questions'->(w.conversation_step+1);
  if v_next_question is not null and w.total_message_count+2<=20 then
    v_assistant_text:=v_next_question->>'prompt';
    v_added_messages:=2;
  else
    v_assistant_text:='I have enough to build a first playable scaffold. You can draft it now or save and return later.';
    v_added_messages:=2;
  end if;
  update public.workshop_sessions set
    conversation=conversation || jsonb_build_array(
      jsonb_build_object('role','gm','content',v_answer,'timestamp',now()),
      jsonb_build_object('role','assistant','content',v_assistant_text,'timestamp',now())
    ),
    emerging_outline=jsonb_set(emerging_outline,array[v_field],to_jsonb(v_answer),true),
    conversation_step=conversation_step+1,
    conversation_version=conversation_version+1,
    gm_message_count=gm_message_count+1,
    total_message_count=total_message_count+v_added_messages,
    gm_input_chars=gm_input_chars+char_length(v_answer),
    generation_status='complete',failure_category=null,updated_at=now()
  where id=w.id;
  v_result:=jsonb_build_object(
    'workshop_id',w.id,'conversation_version',w.conversation_version+1,
    'conversation_step',w.conversation_step+1,'has_next_question',v_next_question is not null,
    'can_draft',true,'replayed',false
  );
  insert into internal.workshop_turn_receipts values(w.id,auth.uid(),p_idempotency_key,'answer',v_hash,v_result,now());
  return v_result;
end;
$$;

create or replace function public.dispatch_saga_workshop_draft(
  p_workshop_id uuid,
  p_expected_conversation_version integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  w public.workshop_sessions%rowtype;
  v_hash text;
  v_receipt internal.workshop_turn_receipts%rowtype;
  v_contract record;
  v_quota record;
  v_run_id uuid:=public.uuid7();
  v_gm_input text;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  v_hash:=encode(extensions.digest(convert_to(jsonb_build_object('action','draft_now','version',p_expected_conversation_version)::text,'UTF8'),'sha256'),'hex');
  select * into v_receipt from internal.workshop_turn_receipts where workshop_session_id=p_workshop_id and user_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.input_hash<>v_hash or v_receipt.action<>'draft_now' then raise exception 'Workshop turn key was reused with different input' using errcode='23505'; end if;
    return v_receipt.result || jsonb_build_object('replayed',true);
  end if;
  select * into w from public.workshop_sessions where id=p_workshop_id and user_id=auth.uid() for update;
  if not found or not public.user_is_workspace_member(w.workspace_id) then raise exception 'Workshop is unavailable' using errcode='42501'; end if;
  if w.state<>'in_progress' or w.workshop_phase<>'conversation' or w.conversation_version<>p_expected_conversation_version then raise exception 'Workshop conversation changed; refresh before drafting' using errcode='40001'; end if;
  if w.gm_message_count<1 then raise exception 'Answer at least one workshop prompt before drafting' using errcode='23514'; end if;
  select string_agg(m.value->>'content',E'\n\n' order by m.ordinality) into v_gm_input
  from jsonb_array_elements(w.conversation) with ordinality m(value,ordinality)
  where m.value->>'role'='gm';
  if nullif(v_gm_input,'') is null or char_length(v_gm_input)>50000 then raise exception 'Workshop input exceeds the draft boundary' using errcode='23514'; end if;
  select * into v_contract from internal.ai_task_contracts() where task_name='scaffold_saga' and active;
  select * into v_quota from public.check_quota_preflight(w.workspace_id,w.world_id,null,'ai_call',v_contract.ai_credits,jsonb_build_object('task_name','scaffold_saga'));
  if not v_quota.allowed then
    v_result:=jsonb_build_object('workshop_id',w.id,'run_id',null,'status','quota_blocked','phase','conversation','allowed',false,'severity',v_quota.severity,'message',v_quota.message,'replayed',false);
    update public.workshop_sessions set generation_status='quota_blocked',quota_snapshot=to_jsonb(v_quota),updated_at=now() where id=w.id;
    insert into internal.workshop_turn_receipts values(w.id,auth.uid(),p_idempotency_key,'draft_now',v_hash,v_result,now());
    return v_result;
  end if;
  update internal.workshop_ai_evidence set
    evidence_text=v_gm_input,
    evidence_hash=encode(extensions.digest(convert_to(v_gm_input,'UTF8'),'sha256'),'hex')
  where workshop_session_id=w.id and source_kind='workshop_input';
  insert into internal.ai_task_runs(id,workspace_id,world_id,saga_id,gm_id,task_name,prompt_version,quota_tier,ai_credits,model_tier,retrieval_profile,source_policy,output_mode,input_payload,allowed_source_ids,workshop_session_id)
  select v_run_id,w.workspace_id,w.world_id,null,auth.uid(),v_contract.task_name,v_contract.prompt_version,v_contract.quota_tier,v_contract.ai_credits,v_contract.model_tier,v_contract.retrieval_profile,v_contract.source_policy,v_contract.output_mode,
    w.creation_input || jsonb_build_object('workshop_session_id',w.id,'conversation',w.conversation,'emerging_outline',w.emerging_outline),array_agg(e.source_id order by e.ordinal),w.id
  from internal.workshop_ai_evidence e where e.workshop_session_id=w.id;
  update public.workshop_sessions set ai_task_run_id=v_run_id,workshop_phase='drafting',generation_status='queued',failure_category=null,quota_snapshot=to_jsonb(v_quota),updated_at=now() where id=w.id;
  v_result:=jsonb_build_object('workshop_id',w.id,'run_id',v_run_id,'status','queued','phase','drafting','allowed',true,'replayed',false);
  insert into internal.workshop_turn_receipts values(w.id,auth.uid(),p_idempotency_key,'draft_now',v_hash,v_result,now());
  return v_result;
end;
$$;

create or replace function public.get_saga_workshop(p_workshop_id uuid)
returns jsonb language sql security definer set search_path=public,internal,pg_temp as $$
 select jsonb_build_object(
   'id',w.id,'workspace_id',w.workspace_id,'world_id',w.world_id,'path',w.path,'state',w.state,
   'phase',w.workshop_phase,'generation_status',w.generation_status,'failure_category',w.failure_category,
   'quota',w.quota_snapshot,'review_version',w.review_version,'conversation_version',w.conversation_version,
   'draft_payload',w.draft_payload,'conversation',w.conversation,'interview_plan',w.interview_plan,
   'emerging_outline',w.emerging_outline,'conversation_step',w.conversation_step,
   'gm_message_count',w.gm_message_count,'total_message_count',w.total_message_count,'gm_input_chars',w.gm_input_chars,
   'current_question',case when w.workshop_phase='conversation' then w.interview_plan->'questions'->w.conversation_step else null end,
   'can_draft',w.workshop_phase='conversation' and w.gm_message_count>=1,
   'saga_name',w.creation_input->>'saga_name','world_name',w.creation_input->>'world_name','game_system',w.creation_input->>'game_system',
   'gm_profile',w.gm_profile_snapshot,'profile_mode',w.profile_mode,'save_profile_as_default',w.save_profile_as_default,
   'updated_at',w.updated_at,'committed_at',w.committed_at,'saga_id',w.saga_id,'committed_session_id',w.committed_session_id,
   'sources',coalesce((select jsonb_agg(jsonb_build_object('source_id',e.source_id,'kind',e.source_kind,'title',e.title,'excerpt',left(e.evidence_text,600)) order by e.ordinal) from internal.workshop_ai_evidence e where e.workshop_session_id=w.id),'[]'::jsonb)
 )
 from public.workshop_sessions w where w.id=p_workshop_id and w.user_id=auth.uid() and public.user_is_workspace_member(w.workspace_id)
$$;

create or replace function public.set_workshop_state_for_worker(p_run_id uuid,p_status text,p_failure_category text default null)
returns void language plpgsql security definer set search_path=public,internal,pg_temp as $$
begin
  update public.workshop_sessions w set generation_status=p_status,failure_category=p_failure_category,updated_at=now()
  from internal.ai_task_runs r
  where r.id=p_run_id and w.id=r.workshop_session_id and w.ai_task_run_id=r.id;
end;
$$;

create or replace function public.complete_workshop_for_worker(p_run_id uuid,p_output jsonb)
returns void language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare
  v_task text;
  v_summary text;
  v_flags text;
  v_question text;
  v_message text;
begin
  select task_name into v_task from internal.ai_task_runs where id=p_run_id;
  if v_task='plan_saga_workshop' then
    v_summary:=p_output->>'summary';
    select string_agg(x->>'description','; ') into v_flags from jsonb_array_elements(coalesce(p_output->'contradiction_flags','[]'::jsonb)) x;
    v_question:=p_output->'questions'->0->>'prompt';
    v_message:=v_summary || case when nullif(v_flags,'') is null then '' else E'\n\nI found one or more points to clarify: '||v_flags end || E'\n\n' || v_question;
    update public.workshop_sessions w set
      interview_plan=p_output,
      emerging_outline=coalesce(p_output->'detected_elements','{}'::jsonb),
      conversation=conversation || jsonb_build_array(jsonb_build_object('role','assistant','content',v_message,'timestamp',now())),
      workshop_phase='conversation',generation_status='complete',failure_category=null,
      conversation_step=0,total_message_count=total_message_count+1,updated_at=now()
    from internal.ai_task_runs r
    where r.id=p_run_id and w.id=r.workshop_session_id and w.ai_task_run_id=r.id and w.state='in_progress' and w.workshop_phase='planning';
  elsif v_task='scaffold_saga' then
    update public.workshop_sessions w set
      draft_payload=p_output,workshop_phase='review',generation_status='complete',failure_category=null,
      review_version=review_version+1,updated_at=now()
    from internal.ai_task_runs r
    where r.id=p_run_id and w.id=r.workshop_session_id and w.ai_task_run_id=r.id and w.state='in_progress' and w.workshop_phase='drafting';
  end if;
end;
$$;

revoke all on function public.answer_saga_workshop_question(uuid,integer,text,uuid) from public,anon;
revoke all on function public.dispatch_saga_workshop_draft(uuid,integer,uuid) from public,anon;
revoke all on function public.get_saga_workshop(uuid) from public,anon;
grant execute on function public.answer_saga_workshop_question(uuid,integer,text,uuid) to authenticated;
grant execute on function public.dispatch_saga_workshop_draft(uuid,integer,uuid) to authenticated;
grant execute on function public.get_saga_workshop(uuid) to authenticated;
revoke all on function public.set_workshop_state_for_worker(uuid,text,text) from public,anon,authenticated;
revoke all on function public.complete_workshop_for_worker(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.set_workshop_state_for_worker(uuid,text,text) to service_role;
grant execute on function public.complete_workshop_for_worker(uuid,jsonb) to service_role;
