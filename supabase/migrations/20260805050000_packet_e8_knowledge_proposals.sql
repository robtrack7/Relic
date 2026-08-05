-- Packet E8: reversible knowledge proposals and explicitly reviewed canon actions.

alter table public.guide_action_intents
  add column if not exists created_draft_id uuid references public.drafts(id) on delete set null;

alter table public.guide_action_intents drop constraint if exists guide_action_intents_action_type_check;
alter table public.guide_action_intents add constraint guide_action_intents_action_type_check check (action_type in (
  'open_record','list_records','show_source','explain_provenance','navigate_surface','draft_entity',
  'propose_record_create','propose_record_update','add_relationship','remove_relationship',
  'set_thread_state','mutate_thread_objective'
));

alter table internal.loom_action_receipts drop constraint if exists loom_action_receipts_status_check;
alter table internal.loom_action_receipts add constraint loom_action_receipts_status_check
  check (status in ('dispatched','proposed','applied','dismissed','conflict','quota_blocked','failed'));

create or replace function internal.loom_action_contracts()
returns table (
  action_name text, action_version text, description text, authority_tier text,
  confirmation_policy text, execution_kind text, provider_arguments jsonb,
  allowed_target_types text[], requires_current_evidence boolean,
  downstream_task_name text, ai_credits numeric, effect_summary text,
  manual_fallback text, active boolean
)
language sql stable set search_path=public,pg_temp as $$ values
  ('open_record','1.0.0','Open one current Library record, Thread, or Session from authorized evidence.',
   'read_navigation','none','client_navigation',
   '{"type":"object","additionalProperties":false,"required":["source_id"],"properties":{"source_id":{"type":"uuid","source":"turn_evidence"}}}'::jsonb,
   array['character','place','faction','artifact','thread','session']::text[],true,null::text,0::numeric,
   'Open the current authorized record and show its bounded read snapshot.','Use scoped search when the record is unavailable.',true),
  ('list_records','1.0.0','List current records of one registered type in the active Saga and World.',
   'read_navigation','none','deterministic_handler',
   '{"type":"object","additionalProperties":false,"required":["record_type"],"properties":{"record_type":{"type":"string","enum":["character","place","faction","artifact","thread","session"]},"status":{"type":"string","maxLength":40},"limit":{"type":"integer","minimum":1,"maximum":20}}}'::jsonb,
   array['character','place','faction','artifact','thread','session']::text[],false,null::text,0::numeric,
   'Show a bounded current record list.','Open the matching Sanctum list manually.',true),
  ('show_source','1.0.0','Show one authorized source used by the current turn.',
   'read_navigation','none','deterministic_handler',
   '{"type":"object","additionalProperties":false,"required":["source_id"],"properties":{"source_id":{"type":"uuid","source":"turn_evidence"}}}'::jsonb,
   array['character','place','faction','artifact','thread','session']::text[],true,null::text,0::numeric,
   'Show the frozen authorized source context.','Open the record source inspector manually.',true),
  ('explain_provenance','1.0.0','Explain the bounded audit and source chain behind one authorized source.',
   'read_navigation','none','deterministic_handler',
   '{"type":"object","additionalProperties":false,"required":["source_id"],"properties":{"source_id":{"type":"uuid","source":"turn_evidence"}}}'::jsonb,
   array['character','place','faction','artifact','thread','session']::text[],true,null::text,0::numeric,
   'Show a bounded provenance chain without changing canon.','Open the record provenance inspector manually.',true),
  ('navigate_surface','1.0.0','Navigate inside the active Saga to a registered Sanctum surface.',
   'read_navigation','none','client_navigation',
   '{"type":"object","additionalProperties":false,"required":["destination"],"properties":{"destination":{"type":"string","enum":["home","library","threads","sessions","review","search"]},"query":{"type":"string","maxLength":200}}}'::jsonb,
   array[]::text[],false,null::text,0::numeric,
   'Open the selected active-Saga surface.','Use the Sanctum navigation rail.',true),
  ('draft_entity','1.0.0','Draft one substantial non-canon Saga entity proposal from current cited evidence.',
   'non_canon_generation','explicit','downstream_ai_task',
   '{"type":"object","additionalProperties":false,"required":["entity_type","intent"],"properties":{"entity_type":{"type":"string","enum":["character","place","faction","artifact","thread"]},"intent":{"type":"string","minLength":1,"maxLength":500}}}'::jsonb,
   array['character','place','faction','artifact','thread']::text[],true,'draft_entity_from_prompt',3::numeric,
   'Run one separately metered deep task and create a non-canon pending entity draft.','Open Library and create or draft the record manually.',true),
  ('propose_record_create','1.0.0','Prepare one bounded Saga record payload for ordinary Approval Queue review.',
   'non_canon_generation','explicit','approval_queue',
   '{"type":"object","additionalProperties":false,"required":["entity_type","payload","source_ids"],"properties":{"entity_type":{"type":"string","enum":["character","place","faction","artifact","thread","note"]},"payload":{"type":"object","maxProperties":7},"source_ids":{"type":"array","maxItems":8,"items":{"type":"uuid","source":"turn_evidence"}}}}'::jsonb,
   array['character','place','faction','artifact','thread','note']::text[],false,null::text,0::numeric,
   'Create one pending Saga record proposal; canon is unchanged until Approval Queue approval.','Create the record manually from Library.',true),
  ('propose_record_update','1.0.0','Prepare allowlisted field changes for one current Saga record.',
   'canon_mutation','explicit','approval_queue',
   '{"type":"object","additionalProperties":false,"required":["source_id","changes"],"properties":{"source_id":{"type":"uuid","source":"turn_evidence"},"changes":{"type":"object","minProperties":1,"maxProperties":7},"source_ids":{"type":"array","maxItems":8,"items":{"type":"uuid","source":"turn_evidence"}}}}'::jsonb,
   array['character','place','faction','artifact','thread','note']::text[],true,null::text,0::numeric,
   'Create one field-level pending update proposal; canon is unchanged until Approval Queue approval.','Edit the record manually from its Library detail.',true),
  ('add_relationship','1.0.0','Add one current-Saga relationship between two source-bound records.',
   'canon_mutation','explicit','deterministic_handler',
   '{"type":"object","additionalProperties":false,"required":["from_source_id","to_source_id","kind"],"properties":{"from_source_id":{"type":"uuid","source":"turn_evidence"},"to_source_id":{"type":"uuid","source":"turn_evidence"},"kind":{"type":"string","enum":["member-of","located-at","owns","allied-with","opposed-to","related-to"]},"notes":{"type":"string","maxLength":1000}}}'::jsonb,
   array['character','place','faction','artifact','thread']::text[],true,null::text,0::numeric,
   'Add one reviewed relationship edge in the active Saga.','Add the relationship from either record detail.',true),
  ('remove_relationship','1.0.0','Remove one exact current-Saga relationship between two source-bound records.',
   'canon_mutation','explicit','deterministic_handler',
   '{"type":"object","additionalProperties":false,"required":["from_source_id","to_source_id","kind"],"properties":{"from_source_id":{"type":"uuid","source":"turn_evidence"},"to_source_id":{"type":"uuid","source":"turn_evidence"},"kind":{"type":"string","enum":["member-of","located-at","owns","allied-with","opposed-to","related-to"]}}}'::jsonb,
   array['character','place','faction','artifact','thread']::text[],true,null::text,0::numeric,
   'Remove one reviewed relationship edge from the active Saga.','Remove the relationship from the record detail.',true),
  ('set_thread_state','1.0.0','Set one current Saga Thread state with any required resolution explanation.',
   'canon_mutation','explicit','deterministic_handler',
   '{"type":"object","additionalProperties":false,"required":["source_id","state"],"properties":{"source_id":{"type":"uuid","source":"turn_evidence"},"state":{"type":"string","enum":["active","loose","dormant","resolved","failed"]},"resolution_details":{"type":"string","maxLength":4000}}}'::jsonb,
   array['thread']::text[],true,null::text,0::numeric,
   'Apply one reviewed Thread state change with the existing optimistic audit path.','Update the Thread state from Thread detail.',true),
  ('mutate_thread_objective','1.0.0','Create, edit, complete, reopen, or move one objective on a current Saga Thread.',
   'canon_mutation','explicit','deterministic_handler',
   '{"type":"object","additionalProperties":false,"required":["source_id","operation"],"properties":{"source_id":{"type":"uuid","source":"turn_evidence"},"operation":{"type":"string","enum":["create","edit","complete","reopen","move"]},"objective_text":{"type":"string","maxLength":1000},"new_text":{"type":"string","maxLength":1000},"target_index":{"type":"integer","minimum":0,"maximum":100}}}'::jsonb,
   array['thread']::text[],true,null::text,0::numeric,
   'Apply one reviewed objective operation with the existing optimistic audit path.','Edit objectives from Thread detail.',true)
$$;

create or replace function internal.loom_record_payload_is_valid(
  p_entity_type public.entity_type,p_change_kind public.change_kind,p_payload jsonb
)
returns boolean language plpgsql immutable set search_path=public,internal,pg_temp as $$
declare k text; v jsonb; required_label text;
begin
  if p_entity_type not in ('character','place','faction','artifact','thread','note')
    or p_change_kind not in ('create','update')
    or jsonb_typeof(p_payload)<>'object' or p_payload='{}'::jsonb
    or length(p_payload::text)>30000
    or not internal.approval_payload_is_allowed(p_entity_type,p_change_kind,p_payload) then return false; end if;
  required_label:=case when p_entity_type='note' then 'title' else 'name' end;
  if p_change_kind='create' and (not(p_payload?required_label) or jsonb_typeof(p_payload->required_label)<>'string'
    or char_length(btrim(p_payload->>required_label)) not between 1 and 200) then return false; end if;
  for k,v in select key,value from jsonb_each(p_payload) loop
    if k='is_loose_thread' then
      if jsonb_typeof(v)<>'boolean' then return false; end if;
    elsif jsonb_typeof(v)<>'string' then return false;
    elsif k in ('name','title') and char_length(v#>>'{}')>200 then return false;
    elsif k='summary' and char_length(v#>>'{}')>2000 then return false;
    elsif char_length(v#>>'{}')>12000 then return false;
    end if;
  end loop;
  if p_entity_type='thread' and p_payload?'resolution_state'
    and p_payload->>'resolution_state' not in ('active','dormant','resolved','failed') then return false; end if;
  if p_entity_type='note' and p_payload?'note_type'
    and p_payload->>'note_type' not in ('lore','quick_capture','summary') then return false; end if;
  return true;
end $$;

create or replace function internal.loom_action_record_reference(p_turn_id uuid,p_source_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,internal,pg_temp as $$
declare e internal.guide_evidence_snapshots%rowtype; s public.sources%rowtype; v_type text; v_id uuid; r jsonb;
begin
  select * into e from internal.guide_evidence_snapshots where turn_id=p_turn_id and source_id=p_source_id;
  if not found then return null; end if;
  select * into s from public.sources where id=e.source_id;
  if not found then return null; end if;
  v_type:=coalesce(e.source_entity_type,case when s.note_id is not null then 'note' end,s.source_entity_type::text);
  v_id:=coalesce(e.source_entity_id,s.note_id,s.source_entity_id);
  if v_type not in ('character','place','faction','artifact','thread','note') or v_id is null then return null; end if;
  r:=internal.library_record(e.workspace_id,e.world_id,e.saga_id,v_type,v_id);
  if r is null or r->>'canon_state'<>'canon' then return null; end if;
  return jsonb_build_object('source_id',p_source_id,'record_type',v_type,'record_id',v_id,'name',r->>'name',
    'scope',r->>'scope','saga_id',r->>'saga_id','updated_at',r->>'updated_at','payload',r);
end $$;

create or replace function internal.guide_source_text(p_source public.sources)
returns text language plpgsql stable set search_path=public,pg_temp as $$
declare v text; raw text:=nullif(btrim(p_source.raw_excerpt),'');
begin
  if p_source.kind::text='imported_text' then return null; end if;
  case p_source.source_entity_type::text
    when 'character' then select concat_ws(E'\n\n',name,summary,narrative) into v from public.characters where id=p_source.source_entity_id and canon_state<>'archived';
    when 'place' then select concat_ws(E'\n\n',name,summary,narrative) into v from public.places where id=p_source.source_entity_id and canon_state<>'archived';
    when 'faction' then select concat_ws(E'\n\n',name,summary,narrative) into v from public.factions where id=p_source.source_entity_id and canon_state<>'archived';
    when 'artifact' then select concat_ws(E'\n\n',name,summary,narrative) into v from public.artifacts where id=p_source.source_entity_id and canon_state<>'archived';
    when 'thread' then select concat_ws(E'\n\n',name,summary,narrative,objective,
      (select string_agg(concat(coalesce(x->>'state','open'),': ',x->>'text'),E'\n' order by n)
       from jsonb_array_elements(coalesce(objectives_log,'[]'::jsonb)) with ordinality items(x,n)))
      into v from public.threads where id=p_source.source_entity_id and canon_state<>'archived';
    when 'session' then select concat_ws(E'\n\n',name,summary,narrative,objective,opening_scene) into v from public.sessions where id=p_source.source_entity_id;
    when 'note' then select concat_ws(E'\n\n',title,body) into v from public.notes where id=coalesce(p_source.note_id,p_source.source_entity_id) and note_type<>'gm_note' and canon_state<>'archived';
    else
      if p_source.note_id is not null then select concat_ws(E'\n\n',title,body) into v from public.notes
        where id=p_source.note_id and note_type<>'gm_note' and canon_state<>'archived'; end if;
  end case;
  return left(nullif(btrim(concat_ws(E'\n\n',raw,v)),''),6000);
end $$;

create or replace function public.get_guide_evidence_for_worker(p_run_id uuid)
returns jsonb language sql stable security definer set search_path=public,internal,pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'source_id',e.source_id,'source_version',e.source_version,'source_kind',e.source_kind,
    'source_entity_type',coalesce(e.source_entity_type,case when s.note_id is not null then 'note' end),
    'source_entity_id',coalesce(e.source_entity_id,s.note_id),
    'title',e.title,'context_anchor',e.context_anchor,'text',e.evidence_text
  ) order by e.ordinal),'[]'::jsonb)
  from internal.ai_task_runs r
  left join public.guide_action_intents a on a.id=nullif(r.input_payload->>'loom_action_id','')::uuid
    and a.accepted_run_id=r.id and a.workspace_id=r.workspace_id and a.world_id is not distinct from r.world_id
    and a.saga_id is not distinct from r.saga_id and a.gm_id is not distinct from r.gm_id
  join internal.guide_evidence_snapshots e on e.turn_id=coalesce(r.guide_turn_id,a.turn_id)
  join public.sources s on s.id=e.source_id
  where r.id=p_run_id
$$;

-- Saga drafts may cite current World canon; the draft is the browser authorization root.
create or replace function public.get_draft_source_context(workspace_id uuid,world_id uuid,saga_id uuid,draft_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public,internal,pg_temp as $$
declare source_row public.sources%rowtype; result jsonb:='[]'::jsonb; excerpt text;
begin
  if auth.uid() is null or not public.user_can_access_saga(workspace_id,world_id,saga_id) then
    return jsonb_build_array(jsonb_build_object('status','permission_denied','source_kind','unknown','label','Source unavailable','drift_state','unavailable'));
  end if;
  if not exists(select 1 from public.drafts d where d.id=get_draft_source_context.draft_id
    and d.workspace_id=get_draft_source_context.workspace_id and d.world_id=get_draft_source_context.world_id
    and d.saga_id=get_draft_source_context.saga_id and d.scope='saga') then
    return jsonb_build_array(jsonb_build_object('status','unavailable','source_kind','unknown','label','Source unavailable','drift_state','unavailable'));
  end if;
  for source_row in select s.* from public.draft_sources ds join public.sources s on s.id=ds.source_id
    and s.workspace_id=ds.workspace_id and s.world_id=ds.world_id
    where ds.draft_id=get_draft_source_context.draft_id and ds.workspace_id=get_draft_source_context.workspace_id
      and ds.world_id=get_draft_source_context.world_id and ds.saga_id=get_draft_source_context.saga_id and ds.scope='saga'
      and ((s.scope='saga' and s.saga_id=get_draft_source_context.saga_id) or (s.scope='world' and s.saga_id is null))
    order by ds.created_at,ds.id
  loop
    if source_row.kind='transcript_segment' then result:=result||jsonb_build_array(public.get_transcript_source_context(source_row.id));
    else
      excerpt:=coalesce(nullif(source_row.raw_excerpt,''),internal.guide_source_text(source_row));
      result:=result||jsonb_build_array(jsonb_build_object(
        'status',case when excerpt is null then 'unavailable' else 'available' end,
        'source_kind',source_row.kind,
        'label',case source_row.kind when 'pasted_text' then 'Pasted session notes'
          when 'gm_manual_summary' then 'GM manual summary' when 'gm_instruction' then 'GM instruction'
          when 'existing_entity' then 'Current canon record' when 'workshop_input' then 'Saga workshop input'
          when 'note' then 'Note' else 'Source' end,
        'frozen_excerpt',excerpt,'drift_state','not_applicable','scope',source_row.scope));
    end if;
  end loop;
  if jsonb_array_length(result)=0 then return jsonb_build_array(jsonb_build_object('status','broken','source_kind','unknown','label','Source unavailable','drift_state','unavailable')); end if;
  return result;
end $$;

create or replace function internal.approval_source_health(p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_draft_id uuid)
returns text language plpgsql security definer stable set search_path=public,internal,pg_temp as $$
declare contexts jsonb; item jsonb; drifted boolean:=false;
begin
  if not exists(select 1 from public.draft_sources ds join public.sources s on s.id=ds.source_id
    where ds.draft_id=p_draft_id and ds.workspace_id=p_workspace_id and ds.world_id=p_world_id and ds.saga_id=p_saga_id
      and ((s.scope='saga' and s.saga_id=p_saga_id) or (s.scope='world' and s.saga_id is null))) then return 'broken'; end if;
  contexts:=public.get_draft_source_context(p_workspace_id,p_world_id,p_saga_id,p_draft_id);
  for item in select value from jsonb_array_elements(contexts) loop
    if item->>'status' in ('broken','unavailable','permission_denied') or item->>'drift_state' in ('deleted','unavailable') then return 'broken'; end if;
    if item->>'drift_state'='edited' then drifted:=true; end if;
  end loop;
  return case when drifted then 'drifted' else 'healthy' end;
end $$;

alter function internal.materialize_loom_action_intent(uuid,integer,jsonb,text)
  rename to materialize_loom_action_intent_e7;

alter function public.review_loom_action(uuid,integer,text,uuid)
  rename to review_loom_action_e6;

alter function public.review_loom_action_e6(uuid,integer,text,uuid)
  set schema internal;

create or replace function internal.materialize_loom_action_intent(
  p_turn_id uuid,p_block_index integer,p_action jsonb,p_explanation text
)
returns uuid language plpgsql security definer set search_path=public,internal,extensions,pg_temp as $$
declare
  t public.guide_turns%rowtype; c record;
  v_name text; v_version text; v_args jsonb; v_payload jsonb; v_source_id uuid; v_source_ids jsonb;
  v_ref jsonb; v_other jsonb; v_snapshot jsonb; v_diffs jsonb; v_versions jsonb:='{}'::jsonb;
  v_target_type text; v_target_id uuid; v_target_version text; v_entity_type text; v_result jsonb:='{}'::jsonb;
  v_id uuid; item jsonb; v_kind text; v_notes text; rel public.relationships%rowtype; rel_count integer;
  v_state text; v_operation text; v_objective_text text; v_new_text text; v_target_index integer;
  objective jsonb; objective_count integer:=0; source_version text;
begin
  if p_block_index<0 or jsonb_typeof(p_action)<>'object' or nullif(btrim(p_explanation),'') is null or char_length(p_explanation)>500 then
    raise exception 'Loom action preview is invalid' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_object_keys(p_action) k where k not in ('name','version','arguments')) then
    raise exception 'Loom action contains an unknown field' using errcode='22023';
  end if;
  v_name:=p_action->>'name'; v_version:=p_action->>'version'; v_args:=p_action->'arguments';
  if v_name in ('open_record','list_records','show_source','explain_provenance','navigate_surface','draft_entity') then
    return internal.materialize_loom_action_intent_e7(p_turn_id,p_block_index,p_action,p_explanation);
  end if;
  select * into c from internal.loom_action_contracts() x where x.action_name=v_name and x.action_version=v_version and x.active;
  if not found or jsonb_typeof(v_args)<>'object' then raise exception 'Loom action is not registered' using errcode='22023'; end if;
  select * into t from public.guide_turns where id=p_turn_id;
  if not found then raise exception 'Loom turn is unavailable' using errcode='22023'; end if;

  if v_name='propose_record_create' then
    if exists(select 1 from jsonb_object_keys(v_args) k where k not in ('entity_type','payload','source_ids'))
      or not(v_args?'entity_type' and v_args?'payload' and v_args?'source_ids')
      or jsonb_typeof(v_args->'source_ids')<>'array' or jsonb_array_length(v_args->'source_ids')>8 then
      raise exception 'Record creation proposal arguments are invalid' using errcode='22023'; end if;
    v_entity_type:=v_args->>'entity_type'; v_payload:=v_args->'payload'; v_source_ids:=v_args->'source_ids';
    if not(v_entity_type=any(c.allowed_target_types))
      or not internal.loom_record_payload_is_valid(v_entity_type::public.entity_type,'create',v_payload) then
      raise exception 'Record creation proposal payload is invalid' using errcode='22023'; end if;
    for item in select value from jsonb_array_elements(v_source_ids) loop
      if jsonb_typeof(item)<>'string' then raise exception 'Record proposal source is invalid' using errcode='22023'; end if;
      begin v_source_id:=(item#>>'{}')::uuid; exception when invalid_text_representation then raise exception 'Record proposal source is invalid' using errcode='22023'; end;
      perform 1 from internal.guide_evidence_snapshots where turn_id=t.id and source_id=v_source_id;
      if not found then raise exception 'Record proposal source is outside the turn evidence' using errcode='22023'; end if;
      source_version:=internal.loom_source_current_version(v_source_id);
      if source_version is null then raise exception 'Record proposal source is unavailable' using errcode='22023'; end if;
      v_versions:=v_versions||jsonb_build_object(v_source_id::text,source_version);
    end loop;
    v_target_type:=v_entity_type;
    v_diffs:=internal.approval_field_diffs('{}'::jsonb,v_payload,'create');
    v_result:=jsonb_build_object('change_kind','create','record_type',v_entity_type,'fields',v_diffs,'destination','approval_queue');

  elsif v_name='propose_record_update' then
    if exists(select 1 from jsonb_object_keys(v_args) k where k not in ('source_id','changes','source_ids'))
      or not(v_args?'source_id' and v_args?'changes')
      or (v_args?'source_ids' and (jsonb_typeof(v_args->'source_ids')<>'array' or jsonb_array_length(v_args->'source_ids')>8)) then
      raise exception 'Record update proposal arguments are invalid' using errcode='22023'; end if;
    begin v_source_id:=(v_args->>'source_id')::uuid; exception when invalid_text_representation then raise exception 'Record update source is invalid' using errcode='22023'; end;
    v_ref:=internal.loom_action_record_reference(t.id,v_source_id); v_payload:=v_args->'changes';
    if v_ref is null or v_ref->>'scope'<>'saga' or v_ref->>'saga_id'<>t.saga_id::text
      or not((v_ref->>'record_type')=any(c.allowed_target_types))
      or not internal.loom_record_payload_is_valid((v_ref->>'record_type')::public.entity_type,'update',v_payload) then
      raise exception 'Record update target or payload is invalid' using errcode='22023'; end if;
    v_target_type:=v_ref->>'record_type'; v_target_id:=(v_ref->>'record_id')::uuid; v_target_version:=v_ref->>'updated_at';
    v_snapshot:=internal.approval_target_snapshot(t.workspace_id,t.world_id,t.saga_id,'saga',v_target_type::public.entity_type,v_target_id);
    v_diffs:=internal.approval_field_diffs(v_snapshot->'payload',v_payload,'update');
    if jsonb_array_length(v_diffs)=0 then raise exception 'Record update proposal contains no changes' using errcode='22023'; end if;
    v_source_ids:=coalesce(v_args->'source_ids','[]'::jsonb)||jsonb_build_array(v_source_id);
    for item in select distinct value from jsonb_array_elements(v_source_ids) loop
      if jsonb_typeof(item)<>'string' then raise exception 'Record proposal source is invalid' using errcode='22023'; end if;
      begin v_source_id:=(item#>>'{}')::uuid; exception when invalid_text_representation then raise exception 'Record proposal source is invalid' using errcode='22023'; end;
      perform 1 from internal.guide_evidence_snapshots where turn_id=t.id and source_id=v_source_id;
      if not found then raise exception 'Record proposal source is outside the turn evidence' using errcode='22023'; end if;
      source_version:=internal.loom_source_current_version(v_source_id);
      if source_version is null then raise exception 'Record proposal source is unavailable' using errcode='22023'; end if;
      v_versions:=v_versions||jsonb_build_object(v_source_id::text,source_version);
    end loop;
    v_result:=jsonb_build_object('change_kind','update','record_type',v_target_type,'record_id',v_target_id,
      'record_name',v_ref->>'name','fields',v_diffs,'destination','approval_queue');

  elsif v_name in ('add_relationship','remove_relationship') then
    if exists(select 1 from jsonb_object_keys(v_args) k where k not in ('from_source_id','to_source_id','kind','notes'))
      or not(v_args?'from_source_id' and v_args?'to_source_id' and v_args?'kind')
      or (v_name='remove_relationship' and v_args?'notes') then
      raise exception 'Relationship action arguments are invalid' using errcode='22023'; end if;
    begin
      v_source_id:=(v_args->>'from_source_id')::uuid;
      v_ref:=internal.loom_action_record_reference(t.id,v_source_id);
      v_other:=internal.loom_action_record_reference(t.id,(v_args->>'to_source_id')::uuid);
    exception when invalid_text_representation then raise exception 'Relationship source is invalid' using errcode='22023'; end;
    v_kind:=v_args->>'kind'; v_notes:=nullif(btrim(v_args->>'notes'),'');
    if v_ref is null or v_other is null or v_ref->>'record_id'=v_other->>'record_id'
      or not((v_ref->>'record_type')=any(c.allowed_target_types)) or not((v_other->>'record_type')=any(c.allowed_target_types))
      or (v_ref->>'scope'<>'saga' and v_other->>'scope'<>'saga')
      or v_kind not in ('member-of','located-at','owns','allied-with','opposed-to','related-to')
      or char_length(coalesce(v_notes,''))>1000 then raise exception 'Relationship action target is invalid' using errcode='22023'; end if;
    for v_source_id in select unnest(array[(v_args->>'from_source_id')::uuid,(v_args->>'to_source_id')::uuid]) loop
      source_version:=internal.loom_source_current_version(v_source_id);
      if source_version is null then raise exception 'Relationship source is unavailable' using errcode='22023'; end if;
      v_versions:=v_versions||jsonb_build_object(v_source_id::text,source_version);
    end loop;
    select count(*),(min(r.id::text))::uuid,min(r.updated_at) into rel_count,v_target_id,rel.updated_at from public.relationships r
    where r.workspace_id=t.workspace_id and r.world_id=t.world_id and r.scope='saga' and r.saga_id=t.saga_id and r.kind::text=v_kind and (
      (r.from_entity_type::text=v_ref->>'record_type' and r.from_entity_id=(v_ref->>'record_id')::uuid
        and r.to_entity_type::text=v_other->>'record_type' and r.to_entity_id=(v_other->>'record_id')::uuid)
      or (v_kind in ('allied-with','opposed-to','related-to') and r.from_entity_type::text=v_other->>'record_type'
        and r.from_entity_id=(v_other->>'record_id')::uuid and r.to_entity_type::text=v_ref->>'record_type'
        and r.to_entity_id=(v_ref->>'record_id')::uuid));
    if v_name='remove_relationship' and rel_count<>1 then raise exception 'Relationship removal requires one exact current edge' using errcode='22023'; end if;
    if rel_count>1 then raise exception 'Relationship action is ambiguous' using errcode='22023'; end if;
    v_target_type:='relationship'; v_target_version:=case when v_target_id is null then null else rel.updated_at::text end;
    v_result:=jsonb_strip_nulls(jsonb_build_object('operation',case when v_name='add_relationship' then 'add' else 'remove' end,
      'relationship_id',v_target_id,'kind',v_kind,'notes',v_notes,
      'from',jsonb_build_object('record_type',v_ref->>'record_type','record_id',v_ref->>'record_id','name',v_ref->>'name'),
      'to',jsonb_build_object('record_type',v_other->>'record_type','record_id',v_other->>'record_id','name',v_other->>'name'),
      'already_present',v_name='add_relationship' and v_target_id is not null));

  elsif v_name='set_thread_state' then
    if exists(select 1 from jsonb_object_keys(v_args) k where k not in ('source_id','state','resolution_details'))
      or not(v_args?'source_id' and v_args?'state') then raise exception 'Thread state arguments are invalid' using errcode='22023'; end if;
    begin v_source_id:=(v_args->>'source_id')::uuid; exception when invalid_text_representation then raise exception 'Thread source is invalid' using errcode='22023'; end;
    v_ref:=internal.loom_action_record_reference(t.id,v_source_id); v_state:=v_args->>'state';
    if v_ref is null or v_ref->>'record_type'<>'thread' or v_ref->>'scope'<>'saga' or v_ref->>'saga_id'<>t.saga_id::text
      or v_state not in ('active','loose','dormant','resolved','failed')
      or (v_state in ('resolved','failed') and nullif(btrim(v_args->>'resolution_details'),'') is null)
      or char_length(coalesce(v_args->>'resolution_details',''))>4000 then raise exception 'Thread state target is invalid' using errcode='22023'; end if;
    source_version:=internal.loom_source_current_version(v_source_id); v_versions:=jsonb_build_object(v_source_id::text,source_version);
    v_target_type:='thread'; v_target_id:=(v_ref->>'record_id')::uuid; v_target_version:=v_ref->>'updated_at';
    v_result:=jsonb_strip_nulls(jsonb_build_object('operation','set_state','record_type','thread','record_id',v_target_id,
      'record_name',v_ref->>'name','from_state',case when (v_ref->'payload'->>'is_loose_thread')::boolean then 'loose' else v_ref->'payload'->>'resolution_state' end,
      'to_state',v_state,'resolution_details',nullif(btrim(v_args->>'resolution_details'),'')));

  elsif v_name='mutate_thread_objective' then
    if exists(select 1 from jsonb_object_keys(v_args) k where k not in ('source_id','operation','objective_text','new_text','target_index'))
      or not(v_args?'source_id' and v_args?'operation') then raise exception 'Thread objective arguments are invalid' using errcode='22023'; end if;
    begin v_source_id:=(v_args->>'source_id')::uuid; exception when invalid_text_representation then raise exception 'Thread source is invalid' using errcode='22023'; end;
    v_ref:=internal.loom_action_record_reference(t.id,v_source_id); v_operation:=v_args->>'operation';
    v_objective_text:=nullif(btrim(v_args->>'objective_text'),''); v_new_text:=nullif(btrim(v_args->>'new_text'),'');
    begin v_target_index:=case when v_args?'target_index' then (v_args->>'target_index')::integer end;
      exception when others then raise exception 'Objective target index is invalid' using errcode='22023'; end;
    if v_ref is null or v_ref->>'record_type'<>'thread' or v_ref->>'scope'<>'saga' or v_ref->>'saga_id'<>t.saga_id::text
      or v_operation not in ('create','edit','complete','reopen','move')
      or char_length(coalesce(v_objective_text,''))>1000 or char_length(coalesce(v_new_text,''))>1000
      or (v_operation='create' and v_new_text is null)
      or (v_operation<>'create' and v_objective_text is null)
      or (v_operation='edit' and v_new_text is null)
      or (v_operation='move' and (v_target_index is null or v_target_index not between 0 and 100)) then
      raise exception 'Thread objective target is invalid' using errcode='22023'; end if;
    if v_operation<>'create' then
      select count(*),min(value::text)::jsonb into objective_count,objective
      from jsonb_array_elements(coalesce(v_ref->'payload'->'objectives_log','[]'::jsonb))
      where lower(normalize(btrim(value->>'text'),NFKC))=lower(normalize(v_objective_text,NFKC));
      if objective_count<>1 then raise exception 'Objective action requires one exact current objective' using errcode='22023'; end if;
    end if;
    source_version:=internal.loom_source_current_version(v_source_id); v_versions:=jsonb_build_object(v_source_id::text,source_version);
    v_target_type:='thread'; v_target_id:=(v_ref->>'record_id')::uuid; v_target_version:=v_ref->>'updated_at';
    v_result:=jsonb_strip_nulls(jsonb_build_object('operation',v_operation,'record_type','thread','record_id',v_target_id,
      'record_name',v_ref->>'name','objective_id',objective->>'id','objective_text',coalesce(v_objective_text,v_new_text),
      'new_text',v_new_text,'target_index',v_target_index));
  else raise exception 'Loom action is not registered' using errcode='22023'; end if;

  insert into public.guide_action_intents(workspace_id,world_id,saga_id,gm_id,thread_id,turn_id,block_index,
    action_type,action_version,arguments,authority_tier,confirmation_policy,execution_kind,target_type,target_id,
    target_version,evidence_versions,cost_snapshot,effect_summary,manual_fallback,source_id,entity_type,intent,
    explanation,result_snapshot,state)
  values(t.workspace_id,t.world_id,t.saga_id,t.gm_id,t.thread_id,t.id,p_block_index,v_name,v_version,v_args,
    c.authority_tier,c.confirmation_policy,c.execution_kind,v_target_type,v_target_id,v_target_version,v_versions,
    jsonb_build_object('ai_credits',0),c.effect_summary,c.manual_fallback,
    case when v_args?'source_id' then (v_args->>'source_id')::uuid else null end,
    case when v_entity_type is null then null else v_entity_type::public.entity_type end,null,p_explanation,v_result,'pending')
  on conflict(turn_id,block_index) do update set updated_at=public.guide_action_intents.updated_at returning id into v_id;
  return v_id;
end $$;

create or replace function public.complete_guide_turn_for_worker(p_run_id uuid,p_output jsonb)
returns void language plpgsql security definer set search_path=public,internal,pg_temp as $$
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
end $$;

create or replace function public.delete_relationship(workspace_id uuid,world_id uuid,saga_id uuid,relationship_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare relation public.relationships%rowtype; source_id uuid;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  select * into relation from public.relationships r where r.id=relationship_id and r.workspace_id=workspace_id
    and r.world_id=world_id and (r.saga_id=saga_id or (r.scope='world' and r.saga_id is null)) for update;
  if relation.id is null then raise exception 'Relationship is not available' using errcode='42501'; end if;
  source_id:=public.write_manual_canon_source(workspace_id,world_id,
    case when relation.scope='world' then null else saga_id end,relation.scope,relation.from_entity_type::text,
    relation.from_entity_id,'relationship_removed',jsonb_build_object('to_type',relation.to_entity_type,
      'to_id',relation.to_entity_id,'kind',relation.kind,'notes',relation.notes));
  delete from public.relationships where id=relation.id;
  return jsonb_build_object('deleted',true,'id',relation.id,'source_id',source_id);
end $$;

create or replace function public.review_loom_action(
  p_action_id uuid,p_expected_intent_version integer,p_decision text,p_idempotency_key uuid
)
returns jsonb language plpgsql security definer set search_path=public,internal,extensions,pg_temp as $$
declare
  a public.guide_action_intents%rowtype; c record; prior internal.loom_action_receipts%rowtype;
  v_hash text; v_receipt uuid:=public.uuid7(); v_result jsonb; pair record; v_current text;
  v_instruction uuid; v_draft uuid; v_run internal.ai_task_runs%rowtype; v_ref jsonb; v_other jsonb;
  relation_result jsonb; thread_result jsonb; thread_row public.threads%rowtype; relationship_row public.relationships%rowtype;
  v_objective_id uuid; v_operation text; v_objective_text text;
begin
  if auth.uid() is null or p_decision not in ('confirmed','dismissed') or p_idempotency_key is null then
    raise exception 'Loom action review is invalid' using errcode='22023'; end if;
  select * into a from public.guide_action_intents where id=p_action_id;
  if found and a.action_type='draft_entity' then
    return internal.review_loom_action_e6(p_action_id,p_expected_intent_version,p_decision,p_idempotency_key);
  end if;
  v_hash:=encode(extensions.digest(convert_to(concat_ws('|',p_action_id::text,p_expected_intent_version::text,p_decision),'UTF8'),'sha256'),'hex');
  select * into prior from internal.loom_action_receipts where gm_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if prior.action_intent_id<>p_action_id or prior.request_hash<>v_hash or prior.decision<>p_decision then
      raise exception 'Loom action idempotency key was reused with different input' using errcode='23505'; end if;
    return prior.result||jsonb_build_object('receipt_id',prior.id,'run_id',prior.ai_task_run_id,'replayed',true);
  end if;
  select * into a from public.guide_action_intents where id=p_action_id for update;
  if not found or a.gm_id<>auth.uid() then raise exception 'Loom action is unavailable' using errcode='42501'; end if;
  perform public.assert_saga_access(a.workspace_id,a.world_id,a.saga_id);
  if a.intent_version<>p_expected_intent_version then raise exception 'Loom action changed; refresh before reviewing' using errcode='40001'; end if;
  select * into c from internal.loom_action_contracts() x where x.action_name=a.action_type and x.action_version=a.action_version and x.active;
  if not found or a.action_type not in ('propose_record_create','propose_record_update','add_relationship','remove_relationship','set_thread_state','mutate_thread_objective') then
    raise exception 'Loom action contract is unavailable' using errcode='22023'; end if;

  if p_decision='dismissed' then
    if a.state not in ('pending','conflict','failed') then raise exception 'Loom action can no longer be dismissed' using errcode='23514'; end if;
    v_result:=jsonb_build_object('action_id',a.id,'state','dismissed','allowed',true,'intent_version',a.intent_version+1);
    insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
    values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'dismissed',v_result);
    update public.guide_action_intents set state='dismissed',intent_version=intent_version+1,execution_receipt_id=v_receipt,
      failure_category=null,updated_at=now() where id=a.id;
    return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
  end if;
  if a.state='accepted' then
    return jsonb_strip_nulls(jsonb_build_object('action_id',a.id,'state','accepted','allowed',true,
      'intent_version',a.intent_version,'draft_id',a.created_draft_id,'receipt_id',a.execution_receipt_id,'replayed',true));
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
      return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
    end if;
  end loop;

  if a.action_type in ('propose_record_create','propose_record_update') then
    select r.* into v_run from internal.ai_task_runs r where r.guide_turn_id=a.turn_id order by r.created_at desc limit 1;
    insert into public.sources(workspace_id,world_id,saga_id,scope,kind,raw_excerpt)
    select a.workspace_id,a.world_id,a.saga_id,'saga','gm_instruction',
      left(concat('Loom GM request: ',t.question),1000) from public.guide_turns t where t.id=a.turn_id
    returning id into v_instruction;
    insert into public.drafts(workspace_id,world_id,saga_id,scope,entity_type,target_entity_id,state,change_kind,
      proposed_payload,expected_version,confidence_band,confidence_reason,created_by,ai_task_run_id,ai_task_name,
      ai_prompt_version,ai_model,ai_provider)
    values(a.workspace_id,a.world_id,a.saga_id,'saga',a.target_type::public.entity_type,
      case when a.action_type='propose_record_update' then a.target_id end,'pending',
      (case when a.action_type='propose_record_create' then 'create' else 'update' end)::public.change_kind,
      case when a.action_type='propose_record_create' then a.arguments->'payload' else a.arguments->'changes' end,
      case when a.action_type='propose_record_update' then a.target_version::timestamptz end,
      'medium','direct_gm_input','gm_via_ai_approval',v_run.id,v_run.task_name,v_run.prompt_version,
      v_run.resolved_model,v_run.resolved_provider) returning id into v_draft;
    insert into public.draft_sources(workspace_id,world_id,saga_id,scope,draft_id,source_id)
    values(a.workspace_id,a.world_id,a.saga_id,'saga',v_draft,v_instruction);
    insert into public.draft_sources(workspace_id,world_id,saga_id,scope,draft_id,source_id)
    select a.workspace_id,a.world_id,a.saga_id,'saga',v_draft,s.id from public.sources s
    where s.id in (select key::uuid from jsonb_each(a.evidence_versions)) and s.workspace_id=a.workspace_id and s.world_id=a.world_id
      and ((s.scope='saga' and s.saga_id=a.saga_id) or (s.scope='world' and s.saga_id is null))
    on conflict(draft_id,source_id) do nothing;
    v_result:=jsonb_build_object('action_id',a.id,'state','accepted','allowed',true,'draft_id',v_draft,
      'destination','approval_queue','intent_version',a.intent_version+1,'consequence','Pending proposal created; canon is unchanged.');
    insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
    values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'proposed',v_result);
    update public.guide_action_intents set state='accepted',intent_version=intent_version+1,created_draft_id=v_draft,
      execution_receipt_id=v_receipt,result_snapshot=result_snapshot||jsonb_build_object('draft_id',v_draft,'destination','approval_queue'),
      failure_category=null,updated_at=now() where id=a.id;
    return v_result||jsonb_build_object('receipt_id',v_receipt,'replayed',false);
  end if;

  if a.action_type in ('add_relationship','remove_relationship') then
    v_ref:=internal.loom_action_record_reference(a.turn_id,(a.arguments->>'from_source_id')::uuid);
    v_other:=internal.loom_action_record_reference(a.turn_id,(a.arguments->>'to_source_id')::uuid);
    if v_ref is null or v_other is null then raise exception 'Relationship endpoints are unavailable' using errcode='40001'; end if;
    if a.action_type='add_relationship' then
      relation_result:=public.create_relationship(a.workspace_id,a.world_id,a.saga_id,v_ref->>'record_type',(v_ref->>'record_id')::uuid,
        v_other->>'record_type',(v_other->>'record_id')::uuid,(a.arguments->>'kind')::public.relationship_kind,a.arguments->>'notes');
    else
      select * into relationship_row from public.relationships r where r.id=a.target_id and r.workspace_id=a.workspace_id
        and r.world_id=a.world_id and r.saga_id=a.saga_id and r.scope='saga' for update;
      if not found or relationship_row.updated_at::text<>a.target_version then raise exception 'Relationship changed; refresh before reviewing' using errcode='40001'; end if;
      relation_result:=public.delete_relationship(a.workspace_id,a.world_id,a.saga_id,a.target_id);
    end if;
    v_result:=jsonb_build_object('action_id',a.id,'state','accepted','allowed',true,'intent_version',a.intent_version+1,
      'effect',relation_result,'consequence',case when a.action_type='add_relationship' then 'Relationship reviewed and present.' else 'Relationship reviewed and removed.' end);
  elsif a.action_type='set_thread_state' then
    select * into thread_row from public.threads t where t.id=a.target_id and t.workspace_id=a.workspace_id
      and t.world_id=a.world_id and t.saga_id=a.saga_id and t.scope='saga' and t.canon_state='canon';
    if not found then raise exception 'Thread is unavailable' using errcode='40001'; end if;
    thread_result:=public.update_thread_details(a.workspace_id,a.world_id,a.saga_id,a.target_id,a.target_version::timestamptz,
      thread_row.name,coalesce(thread_row.summary,''),a.arguments->>'state',a.arguments->>'resolution_details',null);
    v_result:=jsonb_build_object('action_id',a.id,'state','accepted','allowed',true,'intent_version',a.intent_version+1,
      'effect',thread_result,'consequence','Thread state reviewed and applied with source and audit provenance.');
  else
    v_operation:=a.arguments->>'operation';
    v_objective_id:=nullif(a.result_snapshot->>'objective_id','')::uuid;
    v_objective_text:=case when v_operation in ('create','edit') then a.arguments->>'new_text' else null end;
    thread_result:=public.mutate_thread_objective(a.workspace_id,a.world_id,a.saga_id,a.target_id,a.target_version::timestamptz,
      v_operation,v_objective_id,v_objective_text,case when a.arguments?'target_index' then (a.arguments->>'target_index')::integer end,null);
    v_result:=jsonb_build_object('action_id',a.id,'state','accepted','allowed',true,'intent_version',a.intent_version+1,
      'effect',thread_result,'consequence','Thread objective reviewed and applied with source and audit provenance.');
  end if;
  insert into internal.loom_action_receipts(id,action_intent_id,workspace_id,world_id,saga_id,gm_id,idempotency_key,request_hash,decision,status,result)
  values(v_receipt,a.id,a.workspace_id,a.world_id,a.saga_id,a.gm_id,p_idempotency_key,v_hash,p_decision,'applied',v_result);
  update public.guide_action_intents set state='accepted',intent_version=intent_version+1,execution_receipt_id=v_receipt,
    result_snapshot=result_snapshot||jsonb_build_object('execution',v_result->'effect'),failure_category=null,updated_at=now() where id=a.id;
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
      'receipt_id',a.execution_receipt_id,'draft_id',a.created_draft_id,'state',case
        when a.failure_category='quota_blocked' then 'quota_blocked'
        when a.state='processing' and r.status='complete' then 'accepted'
        when a.state='processing' and r.status in ('failed','terminal','dead_letter') then 'failed'
        else a.state end
    )) order by a.block_index) from public.guide_action_intents a
      left join internal.ai_task_runs r on r.id=a.accepted_run_id where a.turn_id=t.id),'[]'::jsonb)
  ) order by t.ordinal),'[]'::jsonb) into v_turns from public.guide_turns t where t.thread_id=v_thread.id;
  return jsonb_build_object('id',v_thread.id,'state',v_thread.state,'title','The Loom','turns',v_turns);
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
  ('answer_saga_question','answer_saga_question@1.4.0','light',1::numeric,'relic-balanced','sanctum_qa_grounding','canon_only','ephemeral',true),
  ('propose_quick_stub_fleshing','propose_quick_stub_fleshing@1.0.0','light',1::numeric,'relic-balanced','post_session_synthesis','canon_plus_untrusted_input','ephemeral',true)
$$;

revoke all on function internal.loom_record_payload_is_valid(public.entity_type,public.change_kind,jsonb) from public,anon,authenticated;
revoke all on function internal.loom_action_record_reference(uuid,uuid) from public,anon,authenticated;
revoke all on function internal.materialize_loom_action_intent_e7(uuid,integer,jsonb,text) from public,anon,authenticated;
revoke all on function internal.materialize_loom_action_intent(uuid,integer,jsonb,text) from public,anon,authenticated;
revoke all on function internal.review_loom_action_e6(uuid,integer,text,uuid) from public,anon,authenticated;
revoke all on function public.review_loom_action(uuid,integer,text,uuid) from public,anon;
grant execute on function public.review_loom_action(uuid,integer,text,uuid) to authenticated;
revoke all on function public.complete_guide_turn_for_worker(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_guide_turn_for_worker(uuid,jsonb) to service_role;
revoke all on function public.get_guide_evidence_for_worker(uuid) from public,anon,authenticated;
grant execute on function public.get_guide_evidence_for_worker(uuid) to service_role;
