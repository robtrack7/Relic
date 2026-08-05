-- Packet E9: lifecycle-aware workflow tools and separately metered Prep handoffs.

alter table public.guide_action_intents drop constraint if exists guide_action_intents_action_type_check;
alter table public.guide_action_intents add constraint guide_action_intents_action_type_check check (action_type in (
  'open_record','list_records','show_source','explain_provenance','navigate_surface','draft_entity',
  'propose_record_create','propose_record_update','add_relationship','remove_relationship',
  'set_thread_state','mutate_thread_objective','create_session','open_session_workflow',
  'start_prep_task','retry_session_transcription'
));

alter function internal.loom_action_contracts() rename to loom_action_contracts_e8;

create or replace function internal.loom_action_contracts()
returns table (
  action_name text, action_version text, description text, authority_tier text,
  confirmation_policy text, execution_kind text, provider_arguments jsonb,
  allowed_target_types text[], requires_current_evidence boolean,
  downstream_task_name text, ai_credits numeric, effect_summary text,
  manual_fallback text, active boolean
)
language sql stable set search_path=public,internal,pg_temp as $$
  select * from internal.loom_action_contracts_e8()
  union all
  values
    ('create_session','1.0.0','Create one planned Session in the active Saga and open its Prep workspace.',
     'reversible_working_state','explicit','deterministic_handler',
     '{"type":"object","additionalProperties":false,"required":["name"],"properties":{"name":{"type":"string","minLength":1,"maxLength":200},"planned_date":{"type":"string","format":"date"},"objective":{"type":"string","maxLength":2000},"opening_scene":{"type":"string","maxLength":4000}}}'::jsonb,
     array['session']::text[],false,null::text,0::numeric,
     'Create one planned Session through the existing scoped Session writer.','Create a Session manually from Sessions.',true),
    ('open_session_workflow','1.0.0','Open the owning Prep, Stage, Review, or active Workshop surface with bounded current status.',
     'read_navigation','none','client_navigation',
     '{"type":"object","additionalProperties":false,"oneOf":[{"required":["session_source_id"],"properties":{"session_source_id":{"type":"uuid","source":"turn_evidence"}}},{"required":["destination"],"properties":{"destination":{"const":"active_workshop"}}}]}'::jsonb,
     array['session','workshop']::text[],false,null::text,0::numeric,
     'Open the server-derived current workflow surface without changing product state.','Use Sessions or New Saga navigation manually.',true),
    ('start_prep_task','1.0.0','Start one registered Session Prep task after displaying its exact separate credit cost.',
     'non_canon_generation','explicit','downstream_ai_task',
     '{"type":"object","additionalProperties":false,"required":["session_source_id","task_name"],"properties":{"session_source_id":{"type":"uuid","source":"turn_evidence"},"task_name":{"type":"string","enum":["compose_prep_briefing","generate_session_prep","propose_scene_beats","propose_thread_complication","propose_npc_for_scene","propose_quick_stub_fleshing"]},"regenerate_scope":{"type":"string","enum":["all","objective","opening_scene","scene_notes","pinned_entities","active_threads","prep_checklist"]},"role_description":{"type":"string","minLength":1,"maxLength":500},"thread_source_id":{"type":"uuid","source":"turn_evidence"},"stub_source_id":{"type":"uuid","source":"turn_evidence"}}}'::jsonb,
     array['session','character','place','faction','artifact','thread']::text[],true,null::text,0::numeric,
     'Dispatch one separately metered E4 Prep request; generated output remains pending review.','Open full Prep and use its AI tools manually.',true),
    ('retry_session_transcription','1.0.0','Retry the existing failed transcription job for one ended Session.',
     'reversible_working_state','explicit','deterministic_handler',
     '{"type":"object","additionalProperties":false,"required":["session_source_id"],"properties":{"session_source_id":{"type":"uuid","source":"turn_evidence"}}}'::jsonb,
     array['session']::text[],true,null::text,0::numeric,
     'Reset one eligible failed transcription job to pending without reuploading audio.','Open Session Review and use Retry transcription.',true)
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

create or replace function internal.loom_e9_session_reference(
  p_turn_id uuid,p_source_id uuid default null,p_session_id uuid default null
)
returns jsonb language plpgsql stable security definer set search_path=public,internal,pg_temp as $$
declare t public.guide_turns%rowtype; e internal.guide_evidence_snapshots%rowtype; s public.sessions%rowtype; v_id uuid;
begin
  select * into t from public.guide_turns where id=p_turn_id;
  if not found then return null; end if;
  if p_source_id is not null then
    select * into e from internal.guide_evidence_snapshots where turn_id=t.id and source_id=p_source_id;
    if not found or e.source_entity_type<>'session' then return null; end if;
    v_id:=e.source_entity_id;
  elsif t.retrieval_mode='deterministic_read' then v_id:=p_session_id;
  else return null;
  end if;
  select * into s from public.sessions x where x.id=v_id and x.workspace_id=t.workspace_id and x.world_id=t.world_id
    and x.saga_id=t.saga_id and x.archived_at is null;
  if not found then return null; end if;
  return jsonb_build_object('id',s.id,'name',s.name,'session_number',s.session_number,'status',s.status,
    'updated_at',s.updated_at,'planned_date',s.planned_date);
end $$;

create or replace function internal.loom_e9_session_workflow_snapshot(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_session_id uuid
)
returns jsonb language plpgsql stable security definer set search_path=public,internal,pg_temp as $$
declare s public.sessions%rowtype; job_state text; pipeline_state text; transcript_state text; v_destination text;
begin
  select * into s from public.sessions x where x.id=p_session_id and x.workspace_id=p_workspace_id
    and x.world_id=p_world_id and x.saga_id=p_saga_id and x.archived_at is null;
  if not found then return null; end if;
  select j.state::text into job_state from internal.transcription_jobs j where j.session_id=s.id order by j.created_at desc limit 1;
  select p.state::text into pipeline_state from public.pipeline_runs p where p.session_id=s.id order by p.created_at desc limit 1;
  select tr.state::text into transcript_state from public.transcripts tr where tr.session_id=s.id and tr.deleted_at is null limit 1;
  v_destination:=case when s.status in ('planned','ready') then 'prep'
    when s.status in ('started','in_progress','ended_pending_undo') then 'stage' else 'review' end;
  return jsonb_strip_nulls(jsonb_build_object(
    'session_id',s.id,'session_name',s.name,'session_number',s.session_number,'session_status',s.status,
    'destination',v_destination,'transcription_state',job_state,'transcript_state',transcript_state,
    'pipeline_state',pipeline_state,'can_retry_transcription',s.status='ended' and job_state='failed'));
end $$;

create or replace function internal.loom_e9_active_workshop_snapshot(p_workspace_id uuid,p_gm_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,internal,pg_temp as $$
declare w public.workshop_sessions%rowtype;
begin
  select * into w from public.workshop_sessions x where x.workspace_id=p_workspace_id and x.user_id=p_gm_id
    and x.state='in_progress' order by x.updated_at desc,x.id desc limit 1;
  if not found then return null; end if;
  return jsonb_build_object('destination','active_workshop','workshop_id',w.id,'phase',w.workshop_phase,
    'path',w.path,'saga_name',w.creation_input->>'saga_name','updated_at',w.updated_at);
end $$;

create or replace function internal.loom_e9_exact_session(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_target text
)
returns jsonb language plpgsql stable security definer set search_path=public,internal,pg_temp as $$
declare q text:=lower(btrim(p_target)); s public.sessions%rowtype; n integer; matches integer;
begin
  q:=regexp_replace(q,'^(the[[:space:]]+)?session[[:space:]]+','','');
  if q~'^[0-9]+$' then
    n:=q::integer;
    select * into s from public.sessions x where x.workspace_id=p_workspace_id and x.world_id=p_world_id
      and x.saga_id=p_saga_id and x.session_number=n and x.archived_at is null order by x.created_at desc limit 1;
  else
    q:=trim(both '"' from q);
    select count(*) into matches from public.sessions x where x.workspace_id=p_workspace_id and x.world_id=p_world_id
      and x.saga_id=p_saga_id and lower(x.name)=q and x.archived_at is null;
    if matches<>1 then return null; end if;
    select * into s from public.sessions x where x.workspace_id=p_workspace_id and x.world_id=p_world_id
      and x.saga_id=p_saga_id and lower(x.name)=q and x.archived_at is null limit 1;
  end if;
  if s.id is null then return null; end if;
  return jsonb_build_object('id',s.id,'name',s.name,'session_number',s.session_number,'status',s.status,'updated_at',s.updated_at);
end $$;

alter function internal.plan_loom_retrieval(uuid,uuid,uuid,uuid,text) rename to plan_loom_retrieval_e7;

create or replace function internal.plan_loom_retrieval(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_gm_id uuid,p_question text
)
returns jsonb language plpgsql stable security definer set search_path=public,internal,pg_temp as $$
declare q text:=lower(internal.normalize_guide_question(p_question)); target text; session_ref jsonb; action jsonb;
  task text; role_text text; session_pattern text;
begin
  if not exists(select 1 from public.sagas s join public.workspaces w on w.id=s.workspace_id
    where s.id=p_saga_id and s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and w.owner_gm_id=p_gm_id and s.deleted_at is null) then
    raise exception 'Loom Saga is not available' using errcode='42501';
  end if;
  if q~'^(resume|continue|open)( the)?( active)? (saga )?workshop$' then
    if internal.loom_e9_active_workshop_snapshot(p_workspace_id,p_gm_id) is null then
      return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','workshop_unavailable',
        'source_ids','[]'::jsonb,'guidance','No in-progress Saga Workshop is available in this Workspace.');
    end if;
    action:=jsonb_build_object('name','open_session_workflow','version','1.0.0','arguments',jsonb_build_object('destination','active_workshop'));
    return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','active_workshop_resume','source_ids','[]'::jsonb,'action',action);
  end if;
  if q~'^(create|schedule)( a)?( new)? session( called| named)? .+' then
    target:=btrim(regexp_replace(internal.normalize_guide_question(p_question),'^(create|schedule)( a)?( new)? session( called| named)?[[:space:]]+','','i'));
    if char_length(target) between 1 and 200 then
      action:=jsonb_build_object('name','create_session','version','1.0.0','arguments',jsonb_build_object('name',target));
      return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','session_create','source_ids','[]'::jsonb,'action',action);
    end if;
  end if;
  if q~'^retry( the)? transcription (for|of) (the )?session .+' then
    target:=btrim(regexp_replace(q,'^retry( the)? transcription (for|of)[[:space:]]+','',''));
    session_ref:=internal.loom_e9_exact_session(p_workspace_id,p_world_id,p_saga_id,target);
    if session_ref is not null then
      action:=jsonb_build_object('name','retry_session_transcription','version','1.0.0','arguments',jsonb_build_object('session_id',session_ref->>'id'));
      return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','transcription_retry','source_ids','[]'::jsonb,'action',action);
    end if;
  end if;
  if q~'^(open|show)( the)? (prep|stage|review|status|workflow)( for| of)? (the )?session .+' or q~'^what is( the)? status of (the )?session .+' then
    target:=case when q~'^what is' then btrim(regexp_replace(q,'^what is( the)? status of[[:space:]]+','',''))
      else btrim(regexp_replace(q,'^(open|show)( the)? (prep|stage|review|status|workflow)( for| of)?[[:space:]]+','','')) end;
    session_ref:=internal.loom_e9_exact_session(p_workspace_id,p_world_id,p_saga_id,target);
    if session_ref is not null then
      action:=jsonb_build_object('name','open_session_workflow','version','1.0.0','arguments',jsonb_build_object('session_id',session_ref->>'id'));
      return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','session_workflow','source_ids','[]'::jsonb,'action',action);
    end if;
  end if;
  if q~'^(generate( full)? prep|compose( a)? prep briefing|propose scene beats)( for)? (the )?session .+' then
    task:=case when q~'^generate' then 'generate_session_prep' when q~'^compose' then 'compose_prep_briefing' else 'propose_scene_beats' end;
    target:=btrim(regexp_replace(q,'^(generate( full)? prep|compose( a)? prep briefing|propose scene beats)( for)?[[:space:]]+','',''));
    session_ref:=internal.loom_e9_exact_session(p_workspace_id,p_world_id,p_saga_id,target);
    if session_ref is not null then
      action:=jsonb_build_object('name','start_prep_task','version','1.0.0','arguments',jsonb_build_object('session_id',session_ref->>'id','task_name',task));
      return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','prep_task','source_ids','[]'::jsonb,'action',action);
    end if;
  end if;
  if q~'^propose( an?| one)? npc( candidate)? (for )?(the )?session [^:]+:[[:space:]]*.+' then
    session_pattern:=split_part(q,':',1);
    target:=btrim(regexp_replace(session_pattern,'^propose( an?| one)? npc( candidate)? (for )?','',''));
    role_text:=btrim(substr(internal.normalize_guide_question(p_question),strpos(internal.normalize_guide_question(p_question),':')+1));
    session_ref:=internal.loom_e9_exact_session(p_workspace_id,p_world_id,p_saga_id,target);
    if session_ref is not null and char_length(role_text) between 1 and 500 then
      action:=jsonb_build_object('name','start_prep_task','version','1.0.0','arguments',
        jsonb_build_object('session_id',session_ref->>'id','task_name','propose_npc_for_scene','role_description',role_text));
      return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','prep_task','source_ids','[]'::jsonb,'action',action);
    end if;
  end if;
  return internal.plan_loom_retrieval_e7(p_workspace_id,p_world_id,p_saga_id,p_gm_id,p_question);
end $$;

alter function public.create_loom_deterministic_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text)
  rename to create_loom_deterministic_turn_for_worker_e7;
alter function public.create_loom_deterministic_turn_for_worker_e7(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text)
  set schema internal;

create or replace function public.create_loom_deterministic_turn_for_worker(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_gm_id uuid,p_thread_id uuid,
  p_turn_id uuid,p_idempotency_key uuid,p_question text
)
returns jsonb language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare v_result jsonb;
begin
  v_result:=internal.create_loom_deterministic_turn_for_worker_e7(p_workspace_id,p_world_id,p_saga_id,p_gm_id,
    p_thread_id,p_turn_id,p_idempotency_key,p_question);
  update public.guide_action_intents a set
    state=case when a.confirmation_policy='explicit' then 'pending' else a.state end,
    explanation=case a.action_type
      when 'create_session' then 'Review one planned Session before creating it.'
      when 'open_session_workflow' then 'Open the current owning workflow and bounded status.'
      when 'start_prep_task' then 'Review the separately metered Prep task before dispatch.'
      when 'retry_session_transcription' then 'Review the eligible failed transcription retry.'
      else a.explanation end,
    updated_at=now()
  where a.turn_id=p_turn_id and a.action_type in ('create_session','open_session_workflow','start_prep_task','retry_session_transcription')
    and a.execution_receipt_id is null;
  return v_result;
end $$;

alter function internal.materialize_loom_action_intent(uuid,integer,jsonb,text)
  rename to materialize_loom_action_intent_e8;

create or replace function internal.materialize_loom_action_intent(
  p_turn_id uuid,p_block_index integer,p_action jsonb,p_explanation text
)
returns uuid language plpgsql security definer set search_path=public,internal,extensions,pg_temp as $$
declare t public.guide_turns%rowtype; c record; v_name text; v_version text; a jsonb; ref jsonb; target_ref jsonb;
  v_source uuid; v_session uuid; v_task text; v_target_type text; v_target uuid; v_target_version text;
  v_versions jsonb:='{}'::jsonb; v_result jsonb:='{}'::jsonb; v_input jsonb:='{}'::jsonb; v_cost numeric:=0;
  v_task_version text; v_id uuid; v_request uuid:=public.uuid7(); v_state text; allowed_keys text[];
begin
  if jsonb_typeof(p_action)<>'object' or exists(select 1 from jsonb_object_keys(p_action) k where k not in ('name','version','arguments')) then
    raise exception 'Loom action preview is invalid' using errcode='22023'; end if;
  v_name:=p_action->>'name'; v_version:=p_action->>'version'; a:=p_action->'arguments';
  if v_name not in ('create_session','open_session_workflow','start_prep_task','retry_session_transcription') then
    return internal.materialize_loom_action_intent_e8(p_turn_id,p_block_index,p_action,p_explanation);
  end if;
  if p_block_index<0 or nullif(btrim(p_explanation),'') is null or char_length(p_explanation)>500 or jsonb_typeof(a)<>'object' then
    raise exception 'Loom action preview is invalid' using errcode='22023'; end if;
  select * into c from internal.loom_action_contracts() x where x.action_name=v_name and x.action_version=v_version and x.active;
  if not found then raise exception 'Loom action is not registered' using errcode='22023'; end if;
  select * into t from public.guide_turns where id=p_turn_id;
  if not found then raise exception 'Loom turn is unavailable' using errcode='22023'; end if;

  if v_name='create_session' then
    if exists(select 1 from jsonb_object_keys(a) k where k not in ('name','planned_date','objective','opening_scene'))
      or jsonb_typeof(a->'name')<>'string' or char_length(btrim(a->>'name')) not between 1 and 200
      or (a?'planned_date' and (jsonb_typeof(a->'planned_date')<>'string' or (a->>'planned_date')!~'^\d{4}-\d{2}-\d{2}$'))
      or (a?'objective' and (jsonb_typeof(a->'objective')<>'string' or char_length(a->>'objective')>2000))
      or (a?'opening_scene' and (jsonb_typeof(a->'opening_scene')<>'string' or char_length(a->>'opening_scene')>4000)) then
      raise exception 'Session creation arguments are invalid' using errcode='22023'; end if;
    v_target_type:='session';
    v_result:=jsonb_strip_nulls(jsonb_build_object('session_name',btrim(a->>'name'),'planned_date',nullif(a->>'planned_date',''),
      'objective',nullif(a->>'objective',''),'opening_scene',nullif(a->>'opening_scene',''),'destination','prep'));
  elsif v_name='open_session_workflow' and a->>'destination'='active_workshop' then
    if (select count(*) from jsonb_object_keys(a))<>1 then raise exception 'Workshop resume arguments are invalid' using errcode='22023'; end if;
    v_result:=internal.loom_e9_active_workshop_snapshot(t.workspace_id,t.gm_id);
    if v_result is null then raise exception 'Workshop is unavailable' using errcode='40001'; end if;
    v_target_type:='workshop'; v_target:=(v_result->>'workshop_id')::uuid;
  else
    if a?'session_source_id' then begin v_source:=(a->>'session_source_id')::uuid; exception when others then raise exception 'Session source is invalid' using errcode='22023'; end;
    elsif t.retrieval_mode='deterministic_read' and a?'session_id' then begin v_session:=(a->>'session_id')::uuid; exception when others then raise exception 'Session target is invalid' using errcode='22023'; end;
    else raise exception 'Session target is invalid' using errcode='22023'; end if;
    ref:=internal.loom_e9_session_reference(t.id,v_source,v_session);
    if ref is null then raise exception 'Session is unavailable' using errcode='40001'; end if;
    v_session:=(ref->>'id')::uuid; v_target:=v_session; v_target_type:='session'; v_target_version:=ref->>'updated_at';
    if v_source is not null then
      if internal.loom_source_current_version(v_source) is null then raise exception 'Session evidence is unavailable' using errcode='40001'; end if;
      v_versions:=jsonb_build_object(v_source::text,internal.loom_source_current_version(v_source));
    end if;
    if v_name='open_session_workflow' then
      if exists(select 1 from jsonb_object_keys(a) k where k not in ('session_source_id','session_id')) then raise exception 'Session workflow arguments are invalid' using errcode='22023'; end if;
      v_result:=internal.loom_e9_session_workflow_snapshot(t.workspace_id,t.world_id,t.saga_id,v_session);
    elsif v_name='retry_session_transcription' then
      if exists(select 1 from jsonb_object_keys(a) k where k not in ('session_source_id','session_id')) then raise exception 'Transcription retry arguments are invalid' using errcode='22023'; end if;
      v_result:=internal.loom_e9_session_workflow_snapshot(t.workspace_id,t.world_id,t.saga_id,v_session);
      if coalesce((v_result->>'can_retry_transcription')::boolean,false)=false then raise exception 'Transcription retry is unavailable' using errcode='23514'; end if;
    else
      if ref->>'status' not in ('planned','ready') then raise exception 'Prep is no longer editable' using errcode='23514'; end if;
      v_task:=a->>'task_name';
      if v_task not in ('compose_prep_briefing','generate_session_prep','propose_scene_beats','propose_thread_complication','propose_npc_for_scene','propose_quick_stub_fleshing') then
        raise exception 'Prep task is invalid' using errcode='22023'; end if;
      select x.ai_credits,x.prompt_version into v_cost,v_task_version from internal.ai_task_contracts() x where x.task_name=v_task and x.active;
      if v_task_version is null then raise exception 'Prep task is unavailable' using errcode='22023'; end if;
      allowed_keys:=array['session_source_id','session_id','task_name'];
      if v_task='generate_session_prep' then
        allowed_keys:=array_append(allowed_keys,'regenerate_scope');
        if a?'regenerate_scope' and a->>'regenerate_scope' not in ('all','objective','opening_scene','scene_notes','pinned_entities','active_threads','prep_checklist') then raise exception 'Prep regeneration scope is invalid' using errcode='22023'; end if;
        v_input:=jsonb_strip_nulls(jsonb_build_object('regenerate_scope',nullif(a->>'regenerate_scope','')));
      elsif v_task='propose_npc_for_scene' then
        allowed_keys:=array_append(allowed_keys,'role_description');
        if jsonb_typeof(a->'role_description')<>'string' or char_length(btrim(a->>'role_description')) not between 1 and 500 then raise exception 'NPC role is invalid' using errcode='22023'; end if;
        v_input:=jsonb_build_object('role_description',btrim(a->>'role_description'));
      elsif v_task='propose_thread_complication' then
        allowed_keys:=allowed_keys||array['thread_source_id','thread_id'];
        if a?'thread_source_id' then begin v_source:=(a->>'thread_source_id')::uuid; exception when others then raise exception 'Thread source is invalid' using errcode='22023'; end;
          target_ref:=internal.loom_action_record_reference(t.id,v_source);
          if target_ref is null or target_ref->>'record_type'<>'thread' then raise exception 'Thread source is unavailable' using errcode='40001'; end if;
          v_versions:=v_versions||jsonb_build_object(v_source::text,internal.loom_source_current_version(v_source)); v_target:=(target_ref->>'record_id')::uuid;
        elsif t.retrieval_mode='deterministic_read' and a?'thread_id' then v_target:=(a->>'thread_id')::uuid;
        else raise exception 'Thread target is required' using errcode='22023'; end if;
        if not exists(select 1 from public.session_active_threads x where x.session_id=v_session and x.thread_id=v_target) then raise exception 'Choose a Thread carried into this Prep' using errcode='23514'; end if;
        v_input:=jsonb_build_object('thread_id',v_target);
      elsif v_task='propose_quick_stub_fleshing' then
        allowed_keys:=allowed_keys||array['stub_source_id','stub_id'];
        if a?'stub_source_id' then begin v_source:=(a->>'stub_source_id')::uuid; exception when others then raise exception 'Quick Stub source is invalid' using errcode='22023'; end;
          target_ref:=internal.loom_action_record_reference(t.id,v_source);
          if target_ref is null or target_ref->>'record_type' not in ('character','place','faction','artifact','thread') then raise exception 'Quick Stub source is unavailable' using errcode='40001'; end if;
          v_versions:=v_versions||jsonb_build_object(v_source::text,internal.loom_source_current_version(v_source)); v_target:=(target_ref->>'record_id')::uuid;
        elsif t.retrieval_mode='deterministic_read' and a?'stub_id' then v_target:=(a->>'stub_id')::uuid;
        else raise exception 'Quick Stub target is required' using errcode='22023'; end if;
        if not exists(select 1 from public.session_pinned_entities x where x.session_id=v_session and x.entity_id=v_target) then raise exception 'Choose a Quick Stub pinned to this Session' using errcode='23514'; end if;
        if target_ref is null or target_ref->>'scope'<>'saga'
          or coalesce((target_ref->'payload'->>'is_stub')::boolean,false)=false then raise exception 'Quick Stub target is unavailable' using errcode='40001'; end if;
        v_input:=jsonb_build_object('entity_type',target_ref->>'record_type','entity_id',v_target);
      else v_input:='{}'::jsonb;
      end if;
      if exists(select 1 from jsonb_object_keys(a) k where not(k=any(allowed_keys))) then raise exception 'Prep task arguments are invalid' using errcode='22023'; end if;
      v_target:=v_session; v_target_type:='session';
      v_result:=jsonb_build_object('session_id',v_session,'session_name',ref->>'name','session_number',ref->'session_number',
        'session_status',ref->>'status','task_name',v_task,'task_version',v_task_version,'dispatch_input',v_input,
        'request_id',v_request,'destination','prep','review_state','pending');
    end if;
  end if;
  v_state:=case when c.confirmation_policy='none' then 'accepted' else 'pending' end;
  insert into public.guide_action_intents(workspace_id,world_id,saga_id,gm_id,thread_id,turn_id,block_index,
    action_type,action_version,arguments,authority_tier,confirmation_policy,execution_kind,target_type,target_id,target_version,
    evidence_versions,cost_snapshot,effect_summary,manual_fallback,explanation,result_snapshot,state)
  values(t.workspace_id,t.world_id,t.saga_id,t.gm_id,t.thread_id,t.id,p_block_index,v_name,v_version,a,c.authority_tier,
    c.confirmation_policy,c.execution_kind,v_target_type,v_target,v_target_version,v_versions,
    jsonb_strip_nulls(jsonb_build_object('ai_credits',v_cost,'task_name',v_task,'task_version',v_task_version)),
    c.effect_summary,c.manual_fallback,p_explanation,v_result,v_state)
  on conflict(turn_id,block_index) do update set updated_at=public.guide_action_intents.updated_at returning id into v_id;
  return v_id;
end $$;

alter function public.review_loom_action(uuid,integer,text,uuid) rename to review_loom_action_e8;
alter function public.review_loom_action_e8(uuid,integer,text,uuid) set schema internal;

create or replace function public.review_loom_action(
  p_action_id uuid,p_expected_intent_version integer,p_decision text,p_idempotency_key uuid
)
returns jsonb language plpgsql security definer set search_path=public,internal,extensions,pg_temp as $$
declare a public.guide_action_intents%rowtype; prior internal.loom_action_receipts%rowtype; c record; pair record;
  v_hash text; v_receipt uuid:=public.uuid7(); v_result jsonb; v_session jsonb; v_created jsonb; v_job uuid;
  v_current text;
begin
  if auth.uid() is null or p_decision not in ('confirmed','dismissed') or p_idempotency_key is null then raise exception 'Loom action review is invalid' using errcode='22023'; end if;
  select * into a from public.guide_action_intents where id=p_action_id;
  if found and a.action_type not in ('create_session','start_prep_task','retry_session_transcription') then
    return internal.review_loom_action_e8(p_action_id,p_expected_intent_version,p_decision,p_idempotency_key);
  end if;
  v_hash:=encode(extensions.digest(convert_to(concat_ws('|',p_action_id::text,p_expected_intent_version::text,p_decision),'UTF8'),'sha256'),'hex');
  select * into prior from internal.loom_action_receipts where gm_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if prior.action_intent_id<>p_action_id or prior.request_hash<>v_hash or prior.decision<>p_decision then raise exception 'Loom action idempotency key was reused with different input' using errcode='23505'; end if;
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
  if c.confirmation_policy<>'explicit' or a.state not in ('pending','failed') then raise exception 'Loom action cannot be confirmed' using errcode='23514'; end if;
  for pair in select key,value from jsonb_each_text(a.evidence_versions) loop
    v_current:=internal.loom_source_current_version(pair.key::uuid);
    if v_current is null or v_current<>pair.value then
      v_result:=jsonb_build_object('action_id',a.id,'state','conflict','allowed',false,'category','stale_evidence','intent_version',a.intent_version+1);
      insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
      values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'conflict',v_result);
      update public.guide_action_intents set state='conflict',availability_state='stale',failure_category='stale_evidence',
        intent_version=intent_version+1,execution_receipt_id=v_receipt,updated_at=now() where id=a.id;
      return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
    end if;
  end loop;
  if a.action_type='create_session' then
    v_created:=public.create_session(a.workspace_id,a.world_id,a.saga_id,a.arguments->>'name',a.arguments->>'objective',a.arguments->>'opening_scene',null,
      case when nullif(a.arguments->>'planned_date','') is null then null else (a.arguments->>'planned_date')::date end);
    v_result:=jsonb_build_object('action_id',a.id,'state','accepted','allowed',true,'intent_version',a.intent_version+1,
      'session_id',v_created->>'id','session_number',v_created->'session_number','destination','prep','consequence','One planned Session was created.');
  elsif a.action_type='retry_session_transcription' then
    v_session:=internal.loom_e9_session_workflow_snapshot(a.workspace_id,a.world_id,a.saga_id,a.target_id);
    if v_session is null or coalesce((v_session->>'can_retry_transcription')::boolean,false)=false then
      v_result:=jsonb_build_object('action_id',a.id,'state','conflict','allowed',false,'category','workflow_changed','intent_version',a.intent_version+1);
      insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
      values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'conflict',v_result);
      update public.guide_action_intents set state='conflict',availability_state='stale',failure_category='workflow_changed',intent_version=intent_version+1,execution_receipt_id=v_receipt,updated_at=now() where id=a.id;
      return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
    end if;
    v_job:=public.retry_session_transcription(a.workspace_id,a.world_id,a.saga_id,a.target_id);
    v_result:=jsonb_build_object('action_id',a.id,'state','accepted','allowed',true,'intent_version',a.intent_version+1,
      'session_id',a.target_id,'job_id',v_job,'destination','review','consequence','The existing failed transcription job was reset to pending.');
  else
    select jsonb_build_object('id',s.id,'updated_at',s.updated_at,'status',s.status) into v_session from public.sessions s
      where s.id=a.target_id and s.workspace_id=a.workspace_id and s.world_id=a.world_id and s.saga_id=a.saga_id and s.archived_at is null;
    if v_session is null or v_session->>'status' not in ('planned','ready') or v_session->>'updated_at'<>a.target_version then
      v_result:=jsonb_build_object('action_id',a.id,'state','conflict','allowed',false,'category','prep_version_conflict','intent_version',a.intent_version+1);
      insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
      values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'conflict',v_result);
      update public.guide_action_intents set state='conflict',availability_state='stale',failure_category='prep_version_conflict',intent_version=intent_version+1,execution_receipt_id=v_receipt,updated_at=now() where id=a.id;
      return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
    end if;
    v_result:=jsonb_build_object('action_id',a.id,'state','processing','allowed',true,'intent_version',a.intent_version+1,
      'dispatch_kind','prep_ai','request_id',a.result_snapshot->>'request_id','workspace_id',a.workspace_id,'world_id',a.world_id,
      'saga_id',a.saga_id,'session_id',a.target_id,'prep_version',a.target_version,'task_name',a.result_snapshot->>'task_name',
      'input',coalesce(a.result_snapshot->'dispatch_input','{}'::jsonb),'destination','prep',
      'consequence','One E4 Prep request will be dispatched; generated output remains pending review.');
    insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
    values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'dispatched',v_result);
    update public.guide_action_intents set state='processing',intent_version=intent_version+1,execution_receipt_id=v_receipt,
      result_snapshot=result_snapshot||jsonb_build_object('dispatch_state','processing'),failure_category=null,updated_at=now() where id=a.id;
    return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
  end if;
  insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
  values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'applied',v_result);
  update public.guide_action_intents set state='accepted',intent_version=intent_version+1,execution_receipt_id=v_receipt,
    result_snapshot=result_snapshot||v_result,failure_category=null,updated_at=now() where id=a.id;
  return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
end $$;

create or replace function public.complete_loom_workflow_action(
  p_action_id uuid,p_receipt_id uuid,p_outcome text,p_failure_category text default null,p_run_id uuid default null
)
returns jsonb language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare a public.guide_action_intents%rowtype; r internal.loom_action_receipts%rowtype; v_request uuid; v_state text; v_category text;
begin
  if auth.uid() is null or p_outcome not in ('accepted','quota_blocked','failed') then raise exception 'Workflow completion is invalid' using errcode='22023'; end if;
  select * into a from public.guide_action_intents where id=p_action_id for update;
  select * into r from internal.loom_action_receipts where id=p_receipt_id and action_intent_id=p_action_id;
  if a.id is null or r.id is null or a.gm_id<>auth.uid() or r.gm_id<>auth.uid() or a.action_type<>'start_prep_task' then raise exception 'Workflow action is unavailable' using errcode='42501'; end if;
  perform public.assert_saga_access(a.workspace_id,a.world_id,a.saga_id);
  v_request:=(a.result_snapshot->>'request_id')::uuid;
  if p_outcome in ('accepted','quota_blocked') and p_run_id is null then
    raise exception 'A preserved Prep run is required for this workflow outcome' using errcode='22023'; end if;
  if p_run_id is not null and not exists(select 1 from internal.ai_task_runs x where x.id=p_run_id and x.prep_ai_request_id=v_request
    and x.workspace_id=a.workspace_id and x.world_id=a.world_id and x.saga_id=a.saga_id and x.gm_id=a.gm_id) then raise exception 'Workflow run is unavailable' using errcode='42501'; end if;
  v_state:=case when p_outcome='accepted' then 'accepted' else 'failed' end;
  v_category:=case when p_outcome='quota_blocked' then 'quota_blocked' when p_outcome='failed' then coalesce(nullif(p_failure_category,''),'provider_unavailable') end;
  update internal.loom_action_receipts set status=case when p_outcome='accepted' then 'dispatched' when p_outcome='quota_blocked' then 'quota_blocked' else 'failed' end,
    ai_task_run_id=coalesce(p_run_id,ai_task_run_id),result=result||jsonb_build_object('dispatch_outcome',p_outcome),updated_at=now() where id=r.id;
  update public.guide_action_intents set state=v_state,failure_category=v_category,accepted_run_id=coalesce(p_run_id,accepted_run_id),
    result_snapshot=result_snapshot||jsonb_strip_nulls(jsonb_build_object('dispatch_state',p_outcome,'run_id',p_run_id)),updated_at=now() where id=a.id;
  return jsonb_strip_nulls(jsonb_build_object('action_id',a.id,'state',case when p_outcome='quota_blocked' then 'quota_blocked' else v_state end,
    'intent_version',a.intent_version,'run_id',p_run_id,'category',v_category));
end $$;

create or replace function internal.ai_task_contracts()
returns table(task_name text,prompt_version text,quota_tier text,ai_credits numeric,model_tier text,retrieval_profile text,source_policy text,output_mode text,active boolean)
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
  ('answer_saga_question','answer_saga_question@1.5.0','light',1::numeric,'relic-balanced','sanctum_qa_grounding','canon_only','ephemeral',true),
  ('propose_quick_stub_fleshing','propose_quick_stub_fleshing@1.0.0','light',1::numeric,'relic-balanced','post_session_synthesis','canon_plus_untrusted_input','ephemeral',true)
$$;

create or replace function public.get_guide_turn_replay_for_worker(
  p_gm_id uuid,p_saga_id uuid,p_idempotency_key uuid
)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'id',t.id,'thread_id',t.thread_id,'ai_task_run_id',t.ai_task_run_id,'status',t.status,
    'question',t.question,'workspace_id',t.workspace_id,'world_id',t.world_id
  )
  from public.guide_turns t
  where t.gm_id=p_gm_id and t.saga_id=p_saga_id and t.idempotency_key=p_idempotency_key
$$;

create or replace function public.resolve_guide_source_ids_for_worker(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_results jsonb
)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
  v_item jsonb;
  v_source_id uuid;
  v_entity_id uuid;
  v_entity_type text;
  v_result jsonb:='[]'::jsonb;
begin
  if jsonb_typeof(coalesce(p_results,'[]'::jsonb))<>'array' then
    raise exception 'Guide results must be an array' using errcode='22023';
  end if;
  for v_item in select value from jsonb_array_elements(coalesce(p_results,'[]'::jsonb)) limit 100 loop
    v_source_id:=null;
    begin v_source_id:=nullif(v_item->>'source_id','')::uuid; exception when invalid_text_representation then v_source_id:=null; end;
    if v_source_id is not null then
      select s.id into v_source_id from public.sources s
      where s.id=v_source_id and s.workspace_id=p_workspace_id and s.world_id=p_world_id
        and ((s.scope='saga' and s.saga_id=p_saga_id) or (s.scope='world' and s.saga_id is null));
    else
      v_entity_type:=nullif(v_item->>'source_entity_type','');
      begin v_entity_id:=nullif(v_item->>'source_entity_id','')::uuid; exception when invalid_text_representation then v_entity_id:=null; end;
      if v_entity_type is not null and v_entity_id is not null then
        select s.id into v_source_id from public.sources s
        where s.workspace_id=p_workspace_id and s.world_id=p_world_id
          and s.source_entity_type::text=v_entity_type and s.source_entity_id=v_entity_id and s.kind<>'imported_text'
          and ((s.scope='saga' and s.saga_id=p_saga_id) or (s.scope='world' and s.saga_id is null))
        order by s.created_at desc limit 1;
      end if;
    end if;
    if v_source_id is not null and not (v_result @> jsonb_build_array(v_source_id::text)) then
      v_result:=v_result||jsonb_build_array(v_source_id::text);
      if jsonb_array_length(v_result)>=20 then exit; end if;
    end if;
  end loop;
  return v_result;
end $$;

revoke all on function internal.loom_action_contracts_e8() from public,anon,authenticated;
revoke all on function internal.loom_e9_session_reference(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function internal.loom_e9_session_workflow_snapshot(uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function internal.loom_e9_active_workshop_snapshot(uuid,uuid) from public,anon,authenticated;
revoke all on function internal.loom_e9_exact_session(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function internal.plan_loom_retrieval_e7(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function internal.create_loom_deterministic_turn_for_worker_e7(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.create_loom_deterministic_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.create_loom_deterministic_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text) to service_role;
revoke all on function public.get_guide_turn_replay_for_worker(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_guide_turn_replay_for_worker(uuid,uuid,uuid) to service_role;
revoke all on function public.resolve_guide_source_ids_for_worker(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.resolve_guide_source_ids_for_worker(uuid,uuid,uuid,jsonb) to service_role;
revoke all on function internal.materialize_loom_action_intent_e8(uuid,integer,jsonb,text) from public,anon,authenticated;
revoke all on function internal.materialize_loom_action_intent(uuid,integer,jsonb,text) from public,anon,authenticated;
revoke all on function internal.review_loom_action_e8(uuid,integer,text,uuid) from public,anon,authenticated;
revoke all on function public.review_loom_action(uuid,integer,text,uuid) from public,anon;
grant execute on function public.review_loom_action(uuid,integer,text,uuid) to authenticated;
revoke all on function public.complete_loom_workflow_action(uuid,uuid,text,text,uuid) from public,anon;
grant execute on function public.complete_loom_workflow_action(uuid,uuid,text,text,uuid) to authenticated;
