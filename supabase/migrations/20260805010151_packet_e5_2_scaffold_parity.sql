-- Packet E5.2 scaffold parity: commit the active typed payload without silent World mutation.

create or replace function internal.assert_valid_saga_workshop_draft(p_workshop_id uuid,p_draft jsonb)
returns void
language plpgsql
stable
set search_path=public,internal,pg_catalog,pg_temp
as $$
declare
  ent jsonb;
  rel jsonb;
  item jsonb;
  v_type text;
  v_temp text;
  v_count integer;
begin
  if jsonb_typeof(p_draft)<>'object' or pg_column_size(p_draft)>300000 then raise exception 'Workshop draft is invalid' using errcode='23514'; end if;
  if jsonb_typeof(p_draft->'saga')<>'object'
    or nullif(btrim(p_draft->'saga'->>'name'),'') is null or char_length(p_draft->'saga'->>'name')>120
    or nullif(btrim(p_draft->'saga'->>'premise'),'') is null or char_length(p_draft->'saga'->>'premise')>3000
    or nullif(btrim(p_draft->'saga'->>'tone'),'') is null or char_length(p_draft->'saga'->>'tone')>500
    or nullif(btrim(p_draft->'saga'->>'central_conflict'),'') is null or char_length(p_draft->'saga'->>'central_conflict')>1500
    or nullif(btrim(p_draft->'saga'->>'first_session_hook'),'') is null or char_length(p_draft->'saga'->>'first_session_hook')>1500
  then raise exception 'Workshop Saga fields are invalid' using errcode='23514'; end if;
  if p_draft?'world_updates' and jsonb_typeof(p_draft->'world_updates')<>'object' then raise exception 'World update proposal is invalid' using errcode='23514'; end if;
  if jsonb_typeof(p_draft->'gm_secrets')<>'array' or jsonb_array_length(p_draft->'gm_secrets') not between 1 and 5 then raise exception 'Workshop requires one to five GM secrets' using errcode='23514'; end if;
  if jsonb_typeof(p_draft->'entities')<>'array' or jsonb_array_length(p_draft->'entities') not between 1 and 14 then raise exception 'Workshop must retain one to fourteen entities' using errcode='23514'; end if;
  if (select count(*)<>count(distinct x->>'temp_id') from jsonb_array_elements(p_draft->'entities') x) then raise exception 'Workshop entity IDs must be unique' using errcode='23514'; end if;

  for ent in select value from jsonb_array_elements(p_draft->'entities') loop
    v_type:=ent->>'entity_type';
    if v_type not in ('character','place','faction','artifact','thread') or ent->>'proposed_scope'<>'saga' then raise exception 'Workshop entity type or scope is invalid' using errcode='23514'; end if;
    if (ent->>'temp_id') !~ '^[a-z][a-z0-9-]{1,48}$'
      or nullif(btrim(ent->>'name'),'') is null or char_length(ent->>'name')>200
      or nullif(btrim(ent->>'summary'),'') is null or char_length(ent->>'summary')>500
      or nullif(btrim(ent->>'narrative'),'') is null or char_length(ent->>'narrative')>5000
      or char_length(coalesce(ent->>'gm_notes',''))>2000
      or char_length(coalesce(ent->>'status','active'))>80
      or jsonb_typeof(ent->'tags')<>'array'
      or jsonb_array_length(ent->'tags')>12
      or exists(select 1 from jsonb_array_elements_text(ent->'tags') tag where char_length(tag)>50 or tag !~ '^[a-z0-9]+(-[a-z0-9]+)*$')
    then raise exception 'Workshop entity fields are invalid' using errcode='23514'; end if;
    if jsonb_typeof(ent->'sources')<>'array' or jsonb_array_length(ent->'sources')<1
      or exists(select 1 from jsonb_array_elements_text(ent->'sources') sid where not exists(select 1 from internal.workshop_ai_evidence e where e.workshop_session_id=p_workshop_id and e.source_id=sid::uuid))
    then raise exception 'Workshop entity source is outside frozen evidence' using errcode='23514'; end if;
  end loop;

  if jsonb_typeof(coalesce(p_draft->'relationships','[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_draft->'relationships','[]'::jsonb))>20 then raise exception 'Workshop relationships are invalid' using errcode='23514'; end if;
  for rel in select value from jsonb_array_elements(coalesce(p_draft->'relationships','[]'::jsonb)) loop
    if not exists(select 1 from jsonb_array_elements(p_draft->'entities') x where x->>'temp_id'=rel->>'source_temp_id')
      or not exists(select 1 from jsonb_array_elements(p_draft->'entities') x where x->>'temp_id'=rel->>'target_temp_id')
      or rel->>'kind' not in ('member-of','located-at','owns','allied-with','opposed-to','related-to')
      or char_length(coalesce(rel->>'notes',''))>500
    then raise exception 'Workshop relationship target is invalid' using errcode='23514'; end if;
    if jsonb_typeof(rel->'sources')<>'array' or jsonb_array_length(rel->'sources')<1
      or exists(select 1 from jsonb_array_elements_text(rel->'sources') sid where not exists(select 1 from internal.workshop_ai_evidence e where e.workshop_session_id=p_workshop_id and e.source_id=sid::uuid))
    then raise exception 'Workshop relationship source is outside frozen evidence' using errcode='23514'; end if;
  end loop;

  for item in select value from jsonb_array_elements(p_draft->'gm_secrets') loop
    if nullif(btrim(item->>'text'),'') is null or char_length(item->>'text')>1000
      or jsonb_typeof(item->'sources')<>'array' or jsonb_array_length(item->'sources')<1
      or exists(select 1 from jsonb_array_elements_text(item->'sources') sid where not exists(select 1 from internal.workshop_ai_evidence e where e.workshop_session_id=p_workshop_id and e.source_id=sid::uuid))
    then raise exception 'Workshop GM secret is invalid' using errcode='23514'; end if;
  end loop;

  if jsonb_typeof(p_draft->'session_1_prep')<>'object'
    or nullif(btrim(p_draft->'session_1_prep'->>'objective'),'') is null
    or nullif(btrim(p_draft->'session_1_prep'->>'opening_scene'),'') is null
    or nullif(btrim(p_draft->'session_1_prep'->>'scene_notes'),'') is null
    or char_length(p_draft->'session_1_prep'->>'objective')>1000
    or char_length(p_draft->'session_1_prep'->>'opening_scene')>3000
    or char_length(p_draft->'session_1_prep'->>'scene_notes')>5000
    or jsonb_typeof(p_draft->'session_1_prep'->'prep_checklist')<>'array'
    or jsonb_array_length(p_draft->'session_1_prep'->'prep_checklist') not between 3 and 5
  then raise exception 'Session 1 prep is invalid' using errcode='23514'; end if;
  for item in select value from jsonb_array_elements(p_draft->'session_1_prep'->'prep_checklist') loop
    if nullif(btrim(item->>'text'),'') is null or char_length(item->>'text')>300
      or jsonb_typeof(item->'sources')<>'array' or jsonb_array_length(item->'sources')<1
      or exists(select 1 from jsonb_array_elements_text(item->'sources') sid where not exists(select 1 from internal.workshop_ai_evidence e where e.workshop_session_id=p_workshop_id and e.source_id=sid::uuid))
    then raise exception 'Session 1 checklist source is invalid' using errcode='23514'; end if;
  end loop;
  foreach v_temp in array array(select jsonb_array_elements_text(coalesce(p_draft->'session_1_prep'->'pinned_temp_ids','[]'::jsonb))) loop
    if not exists(select 1 from jsonb_array_elements(p_draft->'entities') x where x->>'temp_id'=v_temp) then raise exception 'Pinned workshop entity is invalid' using errcode='23514'; end if;
  end loop;
  foreach v_temp in array array(select jsonb_array_elements_text(coalesce(p_draft->'session_1_prep'->'active_thread_temp_ids','[]'::jsonb))) loop
    if not exists(select 1 from jsonb_array_elements(p_draft->'entities') x where x->>'temp_id'=v_temp and x->>'entity_type'='thread') then raise exception 'Active workshop Thread is invalid' using errcode='23514'; end if;
  end loop;
end;
$$;

create or replace function public.save_saga_workshop_draft(p_workshop_id uuid,p_expected_version integer,p_draft jsonb)
returns jsonb language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare w public.workshop_sessions%rowtype;
begin
 select * into w from public.workshop_sessions where id=p_workshop_id and user_id=auth.uid() for update;
 if not found or not public.user_is_workspace_member(w.workspace_id) then raise exception 'Workshop is unavailable' using errcode='42501'; end if;
 if w.state<>'in_progress' or w.workshop_phase<>'review' or w.generation_status<>'complete' or w.review_version<>p_expected_version then raise exception 'Workshop draft changed; refresh before saving' using errcode='40001'; end if;
 perform internal.assert_valid_saga_workshop_draft(w.id,p_draft);
 update public.workshop_sessions set draft_payload=p_draft,review_version=review_version+1,updated_at=now() where id=w.id;
 return jsonb_build_object('workshop_id',w.id,'review_version',w.review_version+1,'saved',true);
end $$;

create or replace function public.commit_saga_workshop(p_workshop_id uuid,p_expected_version integer,p_commit_key uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,internal,pg_temp
as $$
declare
  w public.workshop_sessions%rowtype;
  v_world uuid; v_era uuid; v_saga uuid; v_session uuid;
  ent jsonb; rel jsonb;
  v_entity uuid; v_draft uuid; v_rel uuid; v_sources uuid[];
  v_type public.entity_type; v_idx integer:=0; v_temp_id text;
  v_tags text[]; v_creation_context jsonb;
  v_entity_map jsonb:='{}'::jsonb; v_from jsonb; v_to jsonb;
begin
  select * into w from public.workshop_sessions where id=p_workshop_id and user_id=auth.uid() for update;
  if not found or not public.user_is_workspace_member(w.workspace_id) then raise exception 'Workshop is unavailable' using errcode='42501'; end if;
  if w.state='committed' then
    if w.commit_key=p_commit_key then return jsonb_build_object('workspace_id',w.workspace_id,'world_id',w.world_id,'saga_id',w.saga_id,'session_id',w.committed_session_id,'replayed',true); end if;
    raise exception 'Workshop was already committed' using errcode='23505';
  end if;
  if w.state<>'in_progress' or w.workshop_phase<>'review' or w.generation_status<>'complete' or w.review_version<>p_expected_version then raise exception 'Workshop draft changed; refresh before committing' using errcode='40001'; end if;
  perform internal.assert_valid_saga_workshop_draft(w.id,w.draft_payload);

  v_world:=w.world_id;
  if v_world is null then
    insert into public.worlds(workspace_id,owner_gm_id,name,summary,default_game_system,world_ai_context)
    values(
      w.workspace_id,auth.uid(),coalesce(nullif(w.creation_input->>'world_name',''),(w.draft_payload->'saga'->>'name')||' World'),
      nullif(w.draft_payload->'world_updates'->>'summary',''),nullif(w.draft_payload->'saga'->>'game_system',''),
      nullif(w.draft_payload->'world_updates'->>'world_ai_context','')
    ) returning id into v_world;
  end if;
  select id into v_era from public.world_eras where workspace_id=w.workspace_id and world_id=v_world order by sort_order limit 1;
  if v_era is null then insert into public.world_eras(workspace_id,world_id,name,summary) values(w.workspace_id,v_world,'Default Era','Default timeframe for this world.') returning id into v_era; end if;
  v_creation_context:=jsonb_strip_nulls(jsonb_build_object(
    'tone',w.draft_payload->'saga'->>'tone',
    'central_conflict',w.draft_payload->'saga'->>'central_conflict',
    'first_session_hook',w.draft_payload->'saga'->>'first_session_hook',
    'gm_secrets',w.draft_payload->'gm_secrets',
    'world_update_proposal',case when w.world_id is not null then w.draft_payload->'world_updates' else null end
  ));
  insert into public.sagas(workspace_id,world_id,owner_gm_id,name,premise,game_system,primary_era_id,creation_context)
  values(w.workspace_id,v_world,auth.uid(),w.draft_payload->'saga'->>'name',w.draft_payload->'saga'->>'premise',nullif(w.draft_payload->'saga'->>'game_system',''),v_era,v_creation_context)
  returning id into v_saga;

  update internal.workshop_ai_evidence e set public_source_id=e.source_id where e.workshop_session_id=w.id and e.public_source_id is not null;
  for v_temp_id in select e.source_id::text from internal.workshop_ai_evidence e where e.workshop_session_id=w.id and e.public_source_id is null loop
    insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,uploader_id,raw_excerpt)
    select e.source_id,w.workspace_id,v_world,v_saga,'saga','workshop_input',auth.uid(),e.evidence_text from internal.workshop_ai_evidence e where e.workshop_session_id=w.id and e.source_id=v_temp_id::uuid;
    update internal.workshop_ai_evidence set public_source_id=v_temp_id::uuid where workshop_session_id=w.id and source_id=v_temp_id::uuid;
  end loop;

  for ent in select value from jsonb_array_elements(w.draft_payload->'entities') loop
    v_type:=(ent->>'entity_type')::public.entity_type;
    v_entity:=public.uuid7();
    select coalesce(array_agg(tag order by ordinality),'{}'::text[]) into v_tags from jsonb_array_elements_text(ent->'tags') with ordinality x(tag,ordinality);
    if v_type='character' then
      insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,status,tags,is_stub,created_by) values(v_entity,w.workspace_id,v_world,v_saga,'saga',ent->>'name',ent->>'summary',ent->>'narrative',ent->>'gm_notes',coalesce(nullif(ent->>'status',''),'active'),v_tags,coalesce((ent->>'is_stub')::boolean,false),'gm_via_ai_approval');
    elsif v_type='place' then
      insert into public.places(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,status,tags,is_stub,created_by) values(v_entity,w.workspace_id,v_world,v_saga,'saga',ent->>'name',ent->>'summary',ent->>'narrative',ent->>'gm_notes',coalesce(nullif(ent->>'status',''),'active'),v_tags,coalesce((ent->>'is_stub')::boolean,false),'gm_via_ai_approval');
    elsif v_type='faction' then
      insert into public.factions(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,status,tags,is_stub,created_by) values(v_entity,w.workspace_id,v_world,v_saga,'saga',ent->>'name',ent->>'summary',ent->>'narrative',ent->>'gm_notes',coalesce(nullif(ent->>'status',''),'active'),v_tags,coalesce((ent->>'is_stub')::boolean,false),'gm_via_ai_approval');
    elsif v_type='artifact' then
      insert into public.artifacts(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,status,tags,is_stub,created_by) values(v_entity,w.workspace_id,v_world,v_saga,'saga',ent->>'name',ent->>'summary',ent->>'narrative',ent->>'gm_notes',coalesce(nullif(ent->>'status',''),'active'),v_tags,coalesce((ent->>'is_stub')::boolean,false),'gm_via_ai_approval');
    elsif v_type='thread' then
      insert into public.threads(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,status,tags,is_stub,created_by) values(v_entity,w.workspace_id,v_world,v_saga,'saga',ent->>'name',ent->>'summary',ent->>'narrative',ent->>'gm_notes',coalesce(nullif(ent->>'status',''),'active'),v_tags,coalesce((ent->>'is_stub')::boolean,false),'gm_via_ai_approval');
    end if;
    v_entity_map:=v_entity_map || jsonb_build_object(ent->>'temp_id',jsonb_build_object('entity_type',v_type::text,'entity_id',v_entity));
    select array_agg(coalesce(e.public_source_id,e.source_id)) into v_sources from internal.workshop_ai_evidence e where e.workshop_session_id=w.id and e.source_id in (select jsonb_array_elements_text(ent->'sources')::uuid);
    insert into public.drafts(workspace_id,world_id,saga_id,scope,entity_type,target_entity_id,state,change_kind,proposed_payload,committed_payload,confidence_reason,created_by,resolved_at)
    values(w.workspace_id,v_world,v_saga,'saga',v_type,v_entity,'approved','create',ent,ent,'single_clear_segment','gm_via_ai_approval',now()) returning id into v_draft;
    insert into public.draft_sources(workspace_id,world_id,saga_id,scope,draft_id,source_id) select w.workspace_id,v_world,v_saga,'saga',v_draft,unnest(v_sources) on conflict do nothing;
    insert into public.canon_audit(workspace_id,world_id,saga_id,scope,entity_type,entity_id,draft_id,to_state,action,actor_kind,source_ids,change_summary)
    values(w.workspace_id,v_world,v_saga,'saga',v_type,v_entity,v_draft,'canon','edit_and_approve','gm_via_ai_approval',coalesce(v_sources,'{}'),jsonb_build_object('workshop_session_id',w.id));
  end loop;

  for rel in select value from jsonb_array_elements(coalesce(w.draft_payload->'relationships','[]')) loop
    v_from:=v_entity_map->(rel->>'source_temp_id');
    v_to:=v_entity_map->(rel->>'target_temp_id');
    insert into public.relationships(workspace_id,world_id,saga_id,scope,from_entity_type,from_entity_id,to_entity_type,to_entity_id,kind,notes)
    values(w.workspace_id,v_world,v_saga,'saga',(v_from->>'entity_type')::public.entity_type,(v_from->>'entity_id')::uuid,(v_to->>'entity_type')::public.entity_type,(v_to->>'entity_id')::uuid,(rel->>'kind')::public.relationship_kind,rel->>'notes')
    returning id into v_rel;
    insert into public.relationship_sources(workspace_id,world_id,saga_id,scope,relationship_id,source_id)
    select w.workspace_id,v_world,v_saga,'saga',v_rel,coalesce(e.public_source_id,e.source_id) from internal.workshop_ai_evidence e where e.workshop_session_id=w.id and e.source_id in (select jsonb_array_elements_text(rel->'sources')::uuid);
  end loop;

  insert into public.sessions(workspace_id,world_id,saga_id,name,status,objective,opening_scene,scene_notes,prep_checklist)
  values(w.workspace_id,v_world,v_saga,'Session 1','planned',w.draft_payload->'session_1_prep'->>'objective',w.draft_payload->'session_1_prep'->>'opening_scene',w.draft_payload->'session_1_prep'->>'scene_notes',
    (select jsonb_agg(jsonb_build_object('text',x->>'text','done',false)) from jsonb_array_elements(w.draft_payload->'session_1_prep'->'prep_checklist') x)) returning id into v_session;
  v_idx:=0;
  for v_temp_id in select jsonb_array_elements_text(w.draft_payload->'session_1_prep'->'pinned_temp_ids') loop
    v_from:=v_entity_map->v_temp_id;
    insert into public.session_pinned_entities(workspace_id,world_id,saga_id,session_id,entity_type,entity_id,order_index)
    values(w.workspace_id,v_world,v_saga,v_session,(v_from->>'entity_type')::public.entity_type,(v_from->>'entity_id')::uuid,v_idx);
    v_idx:=v_idx+1;
  end loop;
  v_idx:=0;
  for v_temp_id in select jsonb_array_elements_text(w.draft_payload->'session_1_prep'->'active_thread_temp_ids') loop
    v_from:=v_entity_map->v_temp_id;
    insert into public.session_active_threads(workspace_id,world_id,saga_id,session_id,thread_id,order_index)
    values(w.workspace_id,v_world,v_saga,v_session,(v_from->>'entity_id')::uuid,v_idx);
    v_idx:=v_idx+1;
  end loop;
  update public.workshop_sessions set state='committed',workshop_phase='committed',world_id=v_world,saga_id=v_saga,committed_session_id=v_session,commit_key=p_commit_key,committed_at=now(),updated_at=now() where id=w.id;
  return jsonb_build_object('workspace_id',w.workspace_id,'world_id',v_world,'saga_id',v_saga,'session_id',v_session,'replayed',false);
end;
$$;

revoke all on function internal.assert_valid_saga_workshop_draft(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.save_saga_workshop_draft(uuid,integer,jsonb) from public,anon;
revoke all on function public.commit_saga_workshop(uuid,integer,uuid) from public,anon;
grant execute on function public.save_saga_workshop_draft(uuid,integer,jsonb) to authenticated;
grant execute on function public.commit_saga_workshop(uuid,integer,uuid) to authenticated;
