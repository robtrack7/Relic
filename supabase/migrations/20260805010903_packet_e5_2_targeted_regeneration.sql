-- Packet E5.2: separately metered targeted scaffold regeneration with stale-version protection.

create table internal.workshop_regeneration_requests (
  id uuid primary key default public.uuid7(),
  workshop_session_id uuid not null references public.workshop_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  section_kind text not null check (section_kind in ('saga','world_updates','entity','relationships','gm_secrets','session_1_prep')),
  target_temp_id text,
  base_review_version integer not null check (base_review_version>=1),
  idempotency_key uuid not null,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  ai_task_run_id uuid unique references internal.ai_task_runs(id) on delete set null,
  status text not null check (status in ('queued','running','complete','quota_blocked','provider_unavailable','retrieval_unavailable','validation_failed','failed','dead_letter','accepted','rejected')),
  quota_snapshot jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  failure_category text,
  review_key uuid,
  review_result jsonb,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,idempotency_key),
  check ((section_kind='entity' and target_temp_id is not null) or (section_kind<>'entity' and target_temp_id is null))
);
create index workshop_regeneration_requests_workshop_created_idx
  on internal.workshop_regeneration_requests(workshop_session_id,created_at desc);
revoke all on table internal.workshop_regeneration_requests from public,anon,authenticated;

create or replace function public.request_saga_workshop_regeneration(
  p_workshop_id uuid,
  p_expected_version integer,
  p_section_kind text,
  p_target_temp_id text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,internal,extensions,pg_temp
as $$
declare
  w public.workshop_sessions%rowtype;
  q internal.workshop_regeneration_requests%rowtype;
  v_hash text;
  v_contract record;
  v_quota record;
  v_request_id uuid:=public.uuid7();
  v_run_id uuid:=public.uuid7();
  v_section jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_section_kind not in ('saga','world_updates','entity','relationships','gm_secrets','session_1_prep')
    or (p_section_kind='entity' and nullif(p_target_temp_id,'') is null)
    or (p_section_kind<>'entity' and p_target_temp_id is not null)
  then raise exception 'Workshop regeneration target is invalid' using errcode='22023'; end if;
  v_hash:=encode(extensions.digest(convert_to(jsonb_build_object('workshop_id',p_workshop_id,'version',p_expected_version,'section_kind',p_section_kind,'target_temp_id',p_target_temp_id)::text,'UTF8'),'sha256'),'hex');
  select * into q from internal.workshop_regeneration_requests where user_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if q.input_hash<>v_hash or q.workshop_session_id<>p_workshop_id then raise exception 'Regeneration key was reused with different input' using errcode='23505'; end if;
    return jsonb_build_object('request_id',q.id,'run_id',q.ai_task_run_id,'status',q.status,'allowed',q.status<>'quota_blocked','replayed',true);
  end if;
  select * into w from public.workshop_sessions where id=p_workshop_id and user_id=auth.uid() for update;
  if not found or not public.user_is_workspace_member(w.workspace_id) then raise exception 'Workshop is unavailable' using errcode='42501'; end if;
  if w.state<>'in_progress' or w.workshop_phase<>'review' or w.generation_status<>'complete' or w.review_version<>p_expected_version then raise exception 'Workshop draft changed; refresh before regenerating' using errcode='40001'; end if;
  if p_section_kind='entity' then
    select value into v_section from jsonb_array_elements(w.draft_payload->'entities') where value->>'temp_id'=p_target_temp_id;
    if v_section is null then raise exception 'Workshop entity regeneration target is unavailable' using errcode='23514'; end if;
  else
    v_section:=w.draft_payload->p_section_kind;
  end if;
  if v_section is null then raise exception 'Workshop regeneration section is unavailable' using errcode='23514'; end if;
  select * into v_contract from internal.ai_task_contracts() where task_name='regenerate_saga_scaffold_section' and active;
  select * into v_quota from public.check_quota_preflight(w.workspace_id,w.world_id,null,'ai_call',v_contract.ai_credits,jsonb_build_object('task_name','regenerate_saga_scaffold_section'));
  if not v_quota.allowed then
    insert into internal.workshop_regeneration_requests(id,workshop_session_id,user_id,section_kind,target_temp_id,base_review_version,idempotency_key,input_hash,status,quota_snapshot)
    values(v_request_id,w.id,auth.uid(),p_section_kind,p_target_temp_id,w.review_version,p_idempotency_key,v_hash,'quota_blocked',to_jsonb(v_quota));
    return jsonb_build_object('request_id',v_request_id,'run_id',null,'status','quota_blocked','allowed',false,'message',v_quota.message,'replayed',false);
  end if;
  insert into internal.ai_task_runs(id,workspace_id,world_id,saga_id,gm_id,task_name,prompt_version,quota_tier,ai_credits,model_tier,retrieval_profile,source_policy,output_mode,input_payload,allowed_source_ids,workshop_session_id)
  select v_run_id,w.workspace_id,w.world_id,null,auth.uid(),v_contract.task_name,v_contract.prompt_version,v_contract.quota_tier,v_contract.ai_credits,v_contract.model_tier,v_contract.retrieval_profile,v_contract.source_policy,v_contract.output_mode,
    jsonb_build_object('workshop_session_id',w.id,'section_kind',p_section_kind,'target_temp_id',p_target_temp_id,'base_review_version',w.review_version,'current_section',v_section,'gm_profile',w.gm_profile_snapshot),
    array_agg(e.source_id order by e.ordinal),w.id
  from internal.workshop_ai_evidence e where e.workshop_session_id=w.id;
  insert into internal.workshop_regeneration_requests(id,workshop_session_id,user_id,section_kind,target_temp_id,base_review_version,idempotency_key,input_hash,ai_task_run_id,status,quota_snapshot)
  values(v_request_id,w.id,auth.uid(),p_section_kind,p_target_temp_id,w.review_version,p_idempotency_key,v_hash,v_run_id,'queued',to_jsonb(v_quota));
  return jsonb_build_object('request_id',v_request_id,'run_id',v_run_id,'status','queued','allowed',true,'replayed',false);
end;
$$;

create or replace function public.review_saga_workshop_regeneration(
  p_workshop_id uuid,
  p_request_id uuid,
  p_expected_version integer,
  p_action text,
  p_review_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,internal,pg_temp
as $$
declare
  w public.workshop_sessions%rowtype;
  q internal.workshop_regeneration_requests%rowtype;
  v_draft jsonb;
  v_entities jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_action not in ('accept','reject') then raise exception 'Regeneration review action is invalid' using errcode='22023'; end if;
  select * into w from public.workshop_sessions where id=p_workshop_id and user_id=auth.uid() for update;
  if not found or not public.user_is_workspace_member(w.workspace_id) then raise exception 'Workshop is unavailable' using errcode='42501'; end if;
  select * into q from internal.workshop_regeneration_requests where id=p_request_id and workshop_session_id=w.id and user_id=auth.uid() for update;
  if not found then raise exception 'Regeneration proposal is unavailable' using errcode='42501'; end if;
  if q.status in ('accepted','rejected') then
    if q.review_key=p_review_key then return q.review_result || jsonb_build_object('replayed',true); end if;
    raise exception 'Regeneration proposal was already reviewed' using errcode='23505';
  end if;
  if q.status<>'complete' or q.output_payload is null then raise exception 'Regeneration proposal is not ready' using errcode='40001'; end if;
  if p_action='reject' then
    v_result:=jsonb_build_object('request_id',q.id,'action','reject','review_version',w.review_version,'replayed',false);
    update internal.workshop_regeneration_requests set status='rejected',review_key=p_review_key,review_result=v_result,reviewed_at=now(),updated_at=now() where id=q.id;
    return v_result;
  end if;
  if w.state<>'in_progress' or w.workshop_phase<>'review' or w.review_version<>p_expected_version or q.base_review_version<>w.review_version then raise exception 'Workshop changed after this proposal was requested' using errcode='40001'; end if;
  v_draft:=w.draft_payload;
  if q.section_kind='entity' then
    select jsonb_agg(case when x.value->>'temp_id'=q.target_temp_id then q.output_payload->'replacement' else x.value end order by x.ordinality)
    into v_entities from jsonb_array_elements(v_draft->'entities') with ordinality x(value,ordinality);
    v_draft:=jsonb_set(v_draft,'{entities}',v_entities,false);
  else
    v_draft:=jsonb_set(v_draft,array[q.section_kind],q.output_payload->'replacement',false);
  end if;
  perform internal.assert_valid_saga_workshop_draft(w.id,v_draft);
  update public.workshop_sessions set draft_payload=v_draft,review_version=review_version+1,updated_at=now() where id=w.id;
  v_result:=jsonb_build_object('request_id',q.id,'action','accept','review_version',w.review_version+1,'replayed',false);
  update internal.workshop_regeneration_requests set status='accepted',review_key=p_review_key,review_result=v_result,reviewed_at=now(),updated_at=now() where id=q.id;
  return v_result;
end;
$$;

create or replace function public.set_workshop_state_for_worker(p_run_id uuid,p_status text,p_failure_category text default null)
returns void language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare v_task text;
begin
  select task_name into v_task from internal.ai_task_runs where id=p_run_id;
  if v_task='regenerate_saga_scaffold_section' then
    update internal.workshop_regeneration_requests set status=p_status,failure_category=p_failure_category,updated_at=now() where ai_task_run_id=p_run_id and status not in ('accepted','rejected');
  else
    update public.workshop_sessions w set generation_status=p_status,failure_category=p_failure_category,updated_at=now()
    from internal.ai_task_runs r where r.id=p_run_id and w.id=r.workshop_session_id and w.ai_task_run_id=r.id;
  end if;
end;
$$;

create or replace function public.complete_workshop_for_worker(p_run_id uuid,p_output jsonb)
returns void language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare
  v_task text; v_summary text; v_flags text; v_question text; v_message text;
begin
  select task_name into v_task from internal.ai_task_runs where id=p_run_id;
  if v_task='plan_saga_workshop' then
    v_summary:=p_output->>'summary';
    select string_agg(x->>'description','; ') into v_flags from jsonb_array_elements(coalesce(p_output->'contradiction_flags','[]'::jsonb)) x;
    v_question:=p_output->'questions'->0->>'prompt';
    v_message:=v_summary || case when nullif(v_flags,'') is null then '' else E'\n\nI found one or more points to clarify: '||v_flags end || E'\n\n' || v_question;
    update public.workshop_sessions w set interview_plan=p_output,emerging_outline=coalesce(p_output->'detected_elements','{}'::jsonb),conversation=conversation||jsonb_build_array(jsonb_build_object('role','assistant','content',v_message,'timestamp',now())),workshop_phase='conversation',generation_status='complete',failure_category=null,conversation_step=0,total_message_count=total_message_count+1,updated_at=now()
    from internal.ai_task_runs r where r.id=p_run_id and w.id=r.workshop_session_id and w.ai_task_run_id=r.id and w.state='in_progress' and w.workshop_phase='planning';
  elsif v_task='scaffold_saga' then
    update public.workshop_sessions w set draft_payload=p_output,workshop_phase='review',generation_status='complete',failure_category=null,review_version=review_version+1,updated_at=now()
    from internal.ai_task_runs r where r.id=p_run_id and w.id=r.workshop_session_id and w.ai_task_run_id=r.id and w.state='in_progress' and w.workshop_phase='drafting';
  elsif v_task='regenerate_saga_scaffold_section' then
    update internal.workshop_regeneration_requests q set output_payload=p_output,status='complete',failure_category=null,updated_at=now()
    where q.ai_task_run_id=p_run_id and q.status in ('queued','running') and q.section_kind=p_output->>'section_kind' and coalesce(q.target_temp_id,'')=coalesce(p_output->>'target_temp_id','');
  end if;
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
   'sources',coalesce((select jsonb_agg(jsonb_build_object('source_id',e.source_id,'kind',e.source_kind,'title',e.title,'excerpt',left(e.evidence_text,600)) order by e.ordinal) from internal.workshop_ai_evidence e where e.workshop_session_id=w.id),'[]'::jsonb),
   'regeneration_requests',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'section_kind',q.section_kind,'target_temp_id',q.target_temp_id,'base_review_version',q.base_review_version,'status',q.status,'output_payload',q.output_payload,'failure_category',q.failure_category,'created_at',q.created_at) order by q.created_at desc) from internal.workshop_regeneration_requests q where q.workshop_session_id=w.id and q.status not in ('accepted','rejected')),'[]'::jsonb)
 )
 from public.workshop_sessions w where w.id=p_workshop_id and w.user_id=auth.uid() and public.user_is_workspace_member(w.workspace_id)
$$;

revoke all on function public.request_saga_workshop_regeneration(uuid,integer,text,text,uuid) from public,anon;
revoke all on function public.review_saga_workshop_regeneration(uuid,uuid,integer,text,uuid) from public,anon;
grant execute on function public.request_saga_workshop_regeneration(uuid,integer,text,text,uuid) to authenticated;
grant execute on function public.review_saga_workshop_regeneration(uuid,uuid,integer,text,uuid) to authenticated;
revoke all on function public.set_workshop_state_for_worker(uuid,text,text) from public,anon,authenticated;
revoke all on function public.complete_workshop_for_worker(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.set_workshop_state_for_worker(uuid,text,text) to service_role;
grant execute on function public.complete_workshop_for_worker(uuid,jsonb) to service_role;
