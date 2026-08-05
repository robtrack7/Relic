-- Packet E5: recoverable agentic Saga workshop with a separate GM commit boundary.

alter table internal.ai_task_runs alter column world_id drop not null;
alter table internal.ai_task_runs drop constraint if exists ai_task_runs_retrieval_profile_check;
alter table internal.ai_task_runs add constraint ai_task_runs_retrieval_profile_check check (
  retrieval_profile in ('none','workshop_grounding','session_prep_grounding','sanctum_grounding','sanctum_qa_grounding','post_session_synthesis')
);

alter table public.workshop_sessions
  add column if not exists idempotency_key uuid,
  add column if not exists input_hash text,
  add column if not exists generation_status text not null default 'idle',
  add column if not exists failure_category text,
  add column if not exists quota_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists review_version integer not null default 1,
  add column if not exists ai_task_run_id uuid,
  add column if not exists committed_at timestamptz,
  add column if not exists commit_key uuid,
  add column if not exists committed_session_id uuid references public.sessions(id) on delete set null;

alter table public.workshop_sessions drop constraint if exists workshop_sessions_generation_status_check;
alter table public.workshop_sessions add constraint workshop_sessions_generation_status_check check (
  generation_status in ('idle','queued','running','complete','quota_blocked','provider_unavailable','retrieval_unavailable','validation_failed','failed','dead_letter')
);
create unique index if not exists workshop_sessions_owner_idempotency_idx
  on public.workshop_sessions(user_id, idempotency_key) where idempotency_key is not null;

alter table internal.ai_task_runs
  add column if not exists workshop_session_id uuid references public.workshop_sessions(id) on delete set null;
create unique index if not exists ai_task_runs_workshop_idx
  on internal.ai_task_runs(workshop_session_id) where workshop_session_id is not null;
alter table public.workshop_sessions drop constraint if exists workshop_sessions_ai_run_fk;
alter table public.workshop_sessions add constraint workshop_sessions_ai_run_fk
  foreign key (ai_task_run_id) references internal.ai_task_runs(id) on delete set null;

create table internal.workshop_ai_evidence (
  workshop_session_id uuid not null references public.workshop_sessions(id) on delete cascade,
  ordinal integer not null check (ordinal between 1 and 12),
  source_id uuid not null,
  public_source_id uuid references public.sources(id) on delete restrict,
  source_kind text not null check (source_kind in ('workshop_input','existing_entity')),
  title text not null,
  evidence_text text not null check (char_length(evidence_text) between 1 and 12000),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (workshop_session_id, source_id),
  unique (workshop_session_id, ordinal)
);
revoke all on table internal.workshop_ai_evidence from public,anon,authenticated;

create or replace function internal.ai_task_contracts()
returns table (task_name text,prompt_version text,quota_tier text,ai_credits numeric,model_tier text,retrieval_profile text,source_policy text,output_mode text,active boolean)
language sql stable set search_path=public,pg_temp as $$ values
  ('scaffold_saga','scaffold_saga@1.1.0','heavy',10::numeric,'relic-deep','workshop_grounding','canon_plus_untrusted_input','workshop_draft_payload',true),
  ('draft_entity_from_prompt','draft_entity_from_prompt@1.1.0','standard',3::numeric,'relic-balanced','sanctum_grounding','canon_plus_untrusted_input','draft',true),
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
  p_workshop_id uuid,p_workspace_id uuid,p_existing_world_id uuid,p_path public.workshop_path,
  p_saga_name text,p_world_name text,p_game_system text,p_idea_or_notes text,
  p_gm_profile jsonb,p_idempotency_key uuid
)
returns jsonb language plpgsql security definer
set search_path=public,internal,extensions,pg_temp as $$
declare v_existing public.workshop_sessions%rowtype; v_hash text; v_contract record; v_quota record;
  v_run_id uuid:=public.uuid7(); v_input_source uuid:=public.uuid7(); v_ord int:=1; s public.sources%rowtype;
begin
  if auth.uid() is null or not public.user_owns_workspace(p_workspace_id) then raise exception 'Workspace access denied' using errcode='42501'; end if;
  if p_path not in ('build_with_ai','bring_your_notes') then raise exception 'Workshop path is unsupported' using errcode='22023'; end if;
  if nullif(btrim(p_saga_name),'') is null or char_length(p_saga_name)>120 then raise exception 'Saga name is invalid' using errcode='23514'; end if;
  if nullif(btrim(p_idea_or_notes),'') is null or char_length(p_idea_or_notes)>50000 then raise exception 'Workshop input must contain 1 to 50000 characters' using errcode='23514'; end if;
  if p_existing_world_id is not null and not exists(select 1 from public.worlds w where w.id=p_existing_world_id and w.workspace_id=p_workspace_id and w.deleted_at is null) then raise exception 'World access denied' using errcode='42501'; end if;
  v_hash:=encode(extensions.digest(convert_to(jsonb_build_object('path',p_path,'saga_name',btrim(p_saga_name),'world_name',btrim(coalesce(p_world_name,'')),'game_system',btrim(coalesce(p_game_system,'')),'input',p_idea_or_notes,'world_id',p_existing_world_id)::text,'UTF8'),'sha256'),'hex');
  select * into v_existing from public.workshop_sessions w where w.user_id=auth.uid() and w.idempotency_key=p_idempotency_key;
  if found then
    if v_existing.id<>p_workshop_id or v_existing.input_hash<>v_hash then raise exception 'Workshop idempotency key was reused with different input' using errcode='23505'; end if;
    return jsonb_build_object('workshop_id',v_existing.id,'run_id',v_existing.ai_task_run_id,'status',v_existing.generation_status,'replayed',true,'allowed',v_existing.generation_status<>'quota_blocked');
  end if;
  select * into v_contract from internal.ai_task_contracts() where task_name='scaffold_saga' and active;
  select * into v_quota from public.check_quota_preflight(p_workspace_id,p_existing_world_id,null,'ai_call',v_contract.ai_credits,jsonb_build_object('task_name','scaffold_saga'));
  insert into public.workshop_sessions(id,user_id,workspace_id,world_id,path,gm_profile_snapshot,conversation,state,idempotency_key,input_hash,generation_status,quota_snapshot)
  values(p_workshop_id,auth.uid(),p_workspace_id,p_existing_world_id,p_path,coalesce(p_gm_profile,'{}'),jsonb_build_array(jsonb_build_object('role','gm','content',p_idea_or_notes)),'in_progress',p_idempotency_key,v_hash,case when v_quota.allowed then 'queued' else 'quota_blocked' end,to_jsonb(v_quota));
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
    jsonb_build_object('workshop_session_id',p_workshop_id,'saga_name',btrim(p_saga_name),'world_name',nullif(btrim(p_world_name),''),'game_system',nullif(btrim(p_game_system),''),'path',p_path),array_agg(e.source_id order by e.ordinal),p_workshop_id
  from internal.workshop_ai_evidence e where e.workshop_session_id=p_workshop_id;
  update public.workshop_sessions set ai_task_run_id=v_run_id where id=p_workshop_id;
  return jsonb_build_object('workshop_id',p_workshop_id,'run_id',v_run_id,'status','queued','allowed',true,'replayed',false);
end $$;

create or replace function public.get_saga_workshop(p_workshop_id uuid)
returns jsonb language sql security definer set search_path=public,internal,pg_temp as $$
 select jsonb_build_object('id',w.id,'workspace_id',w.workspace_id,'world_id',w.world_id,'path',w.path,'state',w.state,'generation_status',w.generation_status,'failure_category',w.failure_category,'quota',w.quota_snapshot,'review_version',w.review_version,'draft_payload',w.draft_payload,'conversation',w.conversation,'updated_at',w.updated_at,'committed_at',w.committed_at,'saga_id',w.saga_id,'committed_session_id',w.committed_session_id,'sources',coalesce((select jsonb_agg(jsonb_build_object('source_id',e.source_id,'kind',e.source_kind,'title',e.title,'excerpt',left(e.evidence_text,600)) order by e.ordinal) from internal.workshop_ai_evidence e where e.workshop_session_id=w.id),'[]'::jsonb))
 from public.workshop_sessions w where w.id=p_workshop_id and w.user_id=auth.uid() and public.user_is_workspace_member(w.workspace_id)
$$;

create or replace function public.save_saga_workshop_draft(p_workshop_id uuid,p_expected_version integer,p_draft jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare w public.workshop_sessions%rowtype;
begin
 select * into w from public.workshop_sessions where id=p_workshop_id and user_id=auth.uid() for update;
 if not found then raise exception 'Workshop is unavailable' using errcode='42501'; end if;
 if w.state<>'in_progress' or w.generation_status<>'complete' or w.review_version<>p_expected_version then raise exception 'Workshop draft changed; refresh before saving' using errcode='40001'; end if;
 if jsonb_typeof(p_draft)<>'object' or pg_column_size(p_draft)>200000 then raise exception 'Workshop draft is invalid' using errcode='23514'; end if;
 update public.workshop_sessions set draft_payload=p_draft,review_version=review_version+1,updated_at=now() where id=w.id;
 return jsonb_build_object('workshop_id',w.id,'review_version',w.review_version+1,'saved',true);
end $$;

create or replace function public.get_workshop_evidence_for_worker(p_run_id uuid)
returns jsonb language sql security definer set search_path=public,internal,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('source_id',e.source_id,'source_kind',e.source_kind,'source_version',e.evidence_hash,'title',e.title,'text',e.evidence_text) order by e.ordinal),'[]'::jsonb)
 from internal.ai_task_runs r join internal.workshop_ai_evidence e on e.workshop_session_id=r.workshop_session_id where r.id=p_run_id
$$;

create or replace function public.set_workshop_state_for_worker(p_run_id uuid,p_status text,p_failure_category text default null)
returns void language plpgsql security definer set search_path=public,internal,pg_temp as $$
begin update public.workshop_sessions w set generation_status=p_status,failure_category=p_failure_category,updated_at=now() from internal.ai_task_runs r where r.id=p_run_id and w.id=r.workshop_session_id; end $$;

create or replace function public.complete_workshop_for_worker(p_run_id uuid,p_output jsonb)
returns void language plpgsql security definer set search_path=public,internal,pg_temp as $$
begin update public.workshop_sessions w set draft_payload=p_output,generation_status='complete',failure_category=null,review_version=review_version+1,updated_at=now() from internal.ai_task_runs r where r.id=p_run_id and w.id=r.workshop_session_id and w.state='in_progress'; end $$;

create or replace function public.commit_saga_workshop(p_workshop_id uuid,p_expected_version integer,p_commit_key uuid)
returns jsonb language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare w public.workshop_sessions%rowtype; v_world uuid; v_era uuid; v_saga uuid; v_session uuid; ent jsonb; rel jsonb; chk jsonb; v_entity uuid; v_draft uuid; v_rel uuid; v_sources uuid[]; v_type public.entity_type; v_idx int:=0; v_temp_id text;
begin
 select * into w from public.workshop_sessions where id=p_workshop_id and user_id=auth.uid() for update;
 if not found then raise exception 'Workshop is unavailable' using errcode='42501'; end if;
 if w.state='committed' then
   if w.commit_key=p_commit_key then return jsonb_build_object('workspace_id',w.workspace_id,'world_id',w.world_id,'saga_id',w.saga_id,'session_id',w.committed_session_id,'replayed',true); end if;
   raise exception 'Workshop was already committed' using errcode='23505';
 end if;
 if w.generation_status<>'complete' or w.review_version<>p_expected_version then raise exception 'Workshop draft changed; refresh before committing' using errcode='40001'; end if;
 if jsonb_array_length(coalesce(w.draft_payload->'entities','[]'))<1 then raise exception 'Workshop has no selected entities' using errcode='23514'; end if;
 v_world:=w.world_id;
 if v_world is null then insert into public.worlds(workspace_id,owner_gm_id,name,summary,default_game_system) values(w.workspace_id,auth.uid(),coalesce(nullif(w.draft_payload->'saga'->>'world_name',''),(w.draft_payload->'saga'->>'name')||' World'),w.draft_payload->'saga'->>'premise',nullif(w.draft_payload->'saga'->>'game_system','')) returning id into v_world; end if;
 select id into v_era from public.world_eras where workspace_id=w.workspace_id and world_id=v_world order by sort_order limit 1;
 if v_era is null then insert into public.world_eras(workspace_id,world_id,name,summary) values(w.workspace_id,v_world,'Default Era','Default timeframe for this world.') returning id into v_era; end if;
 insert into public.sagas(workspace_id,world_id,owner_gm_id,name,premise,game_system,primary_era_id) values(w.workspace_id,v_world,auth.uid(),w.draft_payload->'saga'->>'name',w.draft_payload->'saga'->>'premise',nullif(w.draft_payload->'saga'->>'game_system',''),v_era) returning id into v_saga;
 update internal.workshop_ai_evidence e set public_source_id=e.source_id where e.workshop_session_id=w.id and e.public_source_id is not null;
 for v_temp_id in select e.source_id::text from internal.workshop_ai_evidence e where e.workshop_session_id=w.id and e.public_source_id is null loop
   insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,uploader_id,raw_excerpt) select e.source_id,w.workspace_id,v_world,v_saga,'saga','workshop_input',auth.uid(),e.evidence_text from internal.workshop_ai_evidence e where e.workshop_session_id=w.id and e.source_id=v_temp_id::uuid;
   update internal.workshop_ai_evidence set public_source_id=v_temp_id::uuid where workshop_session_id=w.id and source_id=v_temp_id::uuid;
 end loop;
 create temp table e5_entity_map(temp_id text primary key,entity_type public.entity_type,entity_id uuid) on commit drop;
 for ent in select value from jsonb_array_elements(w.draft_payload->'entities') loop
   v_type:=(ent->>'entity_type')::public.entity_type; v_entity:=public.uuid7();
   if v_type='character' then insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,is_stub,created_by) values(v_entity,w.workspace_id,v_world,v_saga,'saga',ent->>'name',ent->>'summary',ent->>'narrative',ent->>'gm_notes',coalesce((ent->>'is_stub')::boolean,false),'gm_via_ai_approval');
   elsif v_type='place' then insert into public.places(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,is_stub,created_by) values(v_entity,w.workspace_id,v_world,v_saga,'saga',ent->>'name',ent->>'summary',ent->>'narrative',ent->>'gm_notes',coalesce((ent->>'is_stub')::boolean,false),'gm_via_ai_approval');
   elsif v_type='faction' then insert into public.factions(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,is_stub,created_by) values(v_entity,w.workspace_id,v_world,v_saga,'saga',ent->>'name',ent->>'summary',ent->>'narrative',ent->>'gm_notes',coalesce((ent->>'is_stub')::boolean,false),'gm_via_ai_approval');
   elsif v_type='artifact' then insert into public.artifacts(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,is_stub,created_by) values(v_entity,w.workspace_id,v_world,v_saga,'saga',ent->>'name',ent->>'summary',ent->>'narrative',ent->>'gm_notes',coalesce((ent->>'is_stub')::boolean,false),'gm_via_ai_approval');
   elsif v_type='thread' then insert into public.threads(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,gm_notes,is_stub,created_by) values(v_entity,w.workspace_id,v_world,v_saga,'saga',ent->>'name',ent->>'summary',ent->>'narrative',ent->>'gm_notes',coalesce((ent->>'is_stub')::boolean,false),'gm_via_ai_approval'); end if;
   insert into e5_entity_map values(ent->>'temp_id',v_type,v_entity);
   select array_agg(coalesce(e.public_source_id,e.source_id)) into v_sources from internal.workshop_ai_evidence e where e.workshop_session_id=w.id and e.source_id in (select jsonb_array_elements_text(ent->'sources')::uuid);
   insert into public.drafts(workspace_id,world_id,saga_id,scope,entity_type,target_entity_id,state,change_kind,proposed_payload,committed_payload,confidence_reason,created_by,resolved_at) values(w.workspace_id,v_world,v_saga,'saga',v_type,v_entity,'approved','create',ent,ent,'single_clear_segment','gm_via_ai_approval',now()) returning id into v_draft;
   insert into public.draft_sources(workspace_id,world_id,saga_id,scope,draft_id,source_id) select w.workspace_id,v_world,v_saga,'saga',v_draft,unnest(v_sources) on conflict do nothing;
   insert into public.canon_audit(workspace_id,world_id,saga_id,scope,entity_type,entity_id,draft_id,to_state,action,actor_kind,source_ids,change_summary) values(w.workspace_id,v_world,v_saga,'saga',v_type,v_entity,v_draft,'canon','edit_and_approve','gm_via_ai_approval',coalesce(v_sources,'{}'),jsonb_build_object('workshop_session_id',w.id));
 end loop;
 for rel in select value from jsonb_array_elements(coalesce(w.draft_payload->'relationships','[]')) loop
   insert into public.relationships(workspace_id,world_id,saga_id,scope,from_entity_type,from_entity_id,to_entity_type,to_entity_id,kind,notes) select w.workspace_id,v_world,v_saga,'saga',a.entity_type,a.entity_id,b.entity_type,b.entity_id,(rel->>'kind')::public.relationship_kind,rel->>'summary' from e5_entity_map a,e5_entity_map b where a.temp_id=rel->>'from_temp_id' and b.temp_id=rel->>'to_temp_id' returning id into v_rel;
   insert into public.relationship_sources(workspace_id,world_id,saga_id,scope,relationship_id,source_id) select w.workspace_id,v_world,v_saga,'saga',v_rel,coalesce(e.public_source_id,e.source_id) from internal.workshop_ai_evidence e where e.workshop_session_id=w.id and e.source_id in (select jsonb_array_elements_text(rel->'sources')::uuid);
 end loop;
 insert into public.sessions(workspace_id,world_id,saga_id,name,status,objective,opening_scene,scene_notes,prep_checklist) values(w.workspace_id,v_world,v_saga,'Session 1','planned',w.draft_payload->'session_1_prep'->>'objective',w.draft_payload->'session_1_prep'->>'opening_scene',w.draft_payload->'session_1_prep'->>'scene_notes',(select jsonb_agg(jsonb_build_object('text',x->>'text','done',false)) from jsonb_array_elements(w.draft_payload->'session_1_prep'->'checklist') x)) returning id into v_session;
 v_idx:=0; for v_temp_id in select jsonb_array_elements_text(w.draft_payload->'session_1_prep'->'pinned_entity_temp_ids') loop insert into public.session_pinned_entities(workspace_id,world_id,saga_id,session_id,entity_type,entity_id,order_index) select w.workspace_id,v_world,v_saga,v_session,m.entity_type,m.entity_id,v_idx from e5_entity_map m where m.temp_id=v_temp_id; v_idx:=v_idx+1; end loop;
 for v_temp_id in select jsonb_array_elements_text(w.draft_payload->'session_1_prep'->'active_thread_temp_ids') loop insert into public.session_active_threads(workspace_id,world_id,saga_id,session_id,thread_id) select w.workspace_id,v_world,v_saga,v_session,m.entity_id from e5_entity_map m where m.temp_id=v_temp_id and m.entity_type='thread'; end loop;
 update public.workshop_sessions set state='committed',world_id=v_world,saga_id=v_saga,committed_session_id=v_session,commit_key=p_commit_key,committed_at=now(),updated_at=now() where id=w.id;
 return jsonb_build_object('workspace_id',w.workspace_id,'world_id',v_world,'saga_id',v_saga,'session_id',v_session,'replayed',false);
end $$;

revoke all on function public.create_saga_workshop(uuid,uuid,uuid,public.workshop_path,text,text,text,text,jsonb,uuid) from public,anon;
revoke all on function public.get_saga_workshop(uuid) from public,anon;
revoke all on function public.save_saga_workshop_draft(uuid,integer,jsonb) from public,anon;
revoke all on function public.commit_saga_workshop(uuid,integer,uuid) from public,anon;
grant execute on function public.create_saga_workshop(uuid,uuid,uuid,public.workshop_path,text,text,text,text,jsonb,uuid) to authenticated;
grant execute on function public.get_saga_workshop(uuid) to authenticated;
grant execute on function public.save_saga_workshop_draft(uuid,integer,jsonb) to authenticated;
grant execute on function public.commit_saga_workshop(uuid,integer,uuid) to authenticated;
revoke all on function public.get_workshop_evidence_for_worker(uuid) from public,anon,authenticated;
revoke all on function public.set_workshop_state_for_worker(uuid,text,text) from public,anon,authenticated;
revoke all on function public.complete_workshop_for_worker(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.get_workshop_evidence_for_worker(uuid) to service_role;
grant execute on function public.set_workshop_state_for_worker(uuid,text,text) to service_role;
grant execute on function public.complete_workshop_for_worker(uuid,jsonb) to service_role;
