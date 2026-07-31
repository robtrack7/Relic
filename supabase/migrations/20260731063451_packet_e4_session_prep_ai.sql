-- Packet E4: recoverable, source-frozen Session Prep AI review boundary.

create table internal.prep_ai_requests (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  gm_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  task_name text not null check (task_name in (
    'compose_prep_briefing',
    'generate_session_prep',
    'propose_scene_beats',
    'propose_thread_complication',
    'propose_npc_for_scene',
    'propose_quick_stub_fleshing',
    'draft_entity_from_prompt'
  )),
  ai_task_run_id uuid unique,
  parent_request_id uuid references internal.prep_ai_requests(id) on delete set null,
  prep_version_at_submit timestamptz not null,
  retrieval_mode text not null default 'none' check (retrieval_mode in ('none','hybrid','lexical_fallback')),
  status text not null default 'queued' check (status in (
    'queued','running','complete','quota_blocked','provider_unavailable',
    'retrieval_unavailable','validation_failed','failed','dead_letter'
  )),
  review_state text not null default 'pending' check (review_state in ('pending','accepted','rejected','dismissed')),
  result_payload jsonb,
  edited_payload jsonb,
  failure_category text,
  quota_snapshot jsonb not null default '{}'::jsonb,
  acceptance_destination text,
  accepted_draft_id uuid references public.drafts(id) on delete set null,
  accepted_prep_version timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  reviewed_at timestamptz,
  unique (gm_id, saga_id, session_id, idempotency_key)
);

create index prep_ai_requests_session_created_idx
  on internal.prep_ai_requests(gm_id, workspace_id, world_id, saga_id, session_id, created_at desc);
create index prep_ai_requests_run_idx on internal.prep_ai_requests(ai_task_run_id);

alter table internal.ai_task_runs
  add column if not exists prep_ai_request_id uuid references internal.prep_ai_requests(id) on delete set null;
create unique index if not exists ai_task_runs_prep_request_idx
  on internal.ai_task_runs(prep_ai_request_id) where prep_ai_request_id is not null;
alter table internal.prep_ai_requests
  add constraint prep_ai_requests_run_fk foreign key (ai_task_run_id)
  references internal.ai_task_runs(id) on delete set null;

create table internal.prep_ai_evidence_snapshots (
  request_id uuid not null references internal.prep_ai_requests(id) on delete cascade,
  ordinal integer not null check (ordinal between 1 and 20),
  workspace_id uuid not null,
  world_id uuid not null,
  saga_id uuid not null,
  source_id uuid not null references public.sources(id) on delete restrict,
  source_version text not null,
  source_kind text not null,
  source_entity_type text,
  source_entity_id uuid,
  title text not null,
  context_anchor jsonb not null default '{}'::jsonb,
  evidence_text text not null check (char_length(evidence_text) between 1 and 6000),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (request_id, source_id),
  unique (request_id, ordinal)
);

revoke all on table internal.prep_ai_requests, internal.prep_ai_evidence_snapshots
  from public, anon, authenticated;

-- E4 generation outputs are review results. The legacy automatic Prep writers
-- remain unreachable because every Prep-family contract now completes as ephemeral.
create or replace function internal.ai_task_contracts()
returns table (
  task_name text,
  prompt_version text,
  quota_tier text,
  ai_credits numeric,
  model_tier text,
  retrieval_profile text,
  source_policy text,
  output_mode text,
  active boolean
)
language sql
stable
set search_path = public, pg_temp
as $$
  values
    ('scaffold_saga','scaffold_saga@1.0.0','heavy',10::numeric,'relic-deep','none','canon_plus_untrusted_input','workshop_draft_payload',true),
    ('draft_entity_from_prompt','draft_entity_from_prompt@1.0.0','standard',3::numeric,'relic-balanced','sanctum_grounding','canon_plus_untrusted_input','draft',true),
    ('generate_session_prep','generate_session_prep@1.0.0','heavy',10::numeric,'relic-deep','session_prep_grounding','canon_only','ephemeral',true),
    ('compose_prep_briefing','compose_prep_briefing@1.0.0','standard',3::numeric,'relic-balanced','session_prep_grounding','canon_only','ephemeral',true),
    ('synthesize_session','synthesize_session@1.0.0','pipeline_synthesis',15::numeric,'relic-deep','post_session_synthesis','canon_plus_untrusted_input','draft_batch',true),
    ('propose_scene_beats','propose_scene_beats@1.0.0','light',1::numeric,'relic-balanced','session_prep_grounding','canon_only','ephemeral',true),
    ('propose_thread_complication','propose_thread_complication@1.0.0','light',1::numeric,'relic-balanced','sanctum_grounding','canon_only','ephemeral',true),
    ('propose_npc_for_scene','propose_npc_for_scene@1.0.0','light',1::numeric,'relic-balanced','session_prep_grounding','canon_only','ephemeral',true),
    ('answer_saga_question','answer_saga_question@1.1.0','light',1::numeric,'relic-balanced','sanctum_qa_grounding','canon_only','ephemeral',true),
    ('propose_quick_stub_fleshing','propose_quick_stub_fleshing@1.0.0','light',1::numeric,'relic-balanced','post_session_synthesis','canon_plus_untrusted_input','ephemeral',true);
$$;

create or replace function public.create_prep_ai_request_for_worker(
  p_request_id uuid,
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_session_id uuid,
  p_gm_id uuid,
  p_idempotency_key uuid,
  p_task_name text,
  p_input_payload jsonb,
  p_prep_version timestamptz,
  p_parent_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  v_existing internal.prep_ai_requests%rowtype;
  v_contract record;
  v_session public.sessions%rowtype;
  v_run_id uuid := public.uuid7();
  v_hash text;
begin
  if p_task_name not in (
    'compose_prep_briefing','generate_session_prep','propose_scene_beats',
    'propose_thread_complication','propose_npc_for_scene',
    'propose_quick_stub_fleshing','draft_entity_from_prompt'
  ) then
    raise exception 'Prep AI task is unsupported' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.sagas s join public.workspaces w on w.id=s.workspace_id
    where s.id=p_saga_id and s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and w.owner_gm_id=p_gm_id and s.deleted_at is null
  ) then
    raise exception 'Prep AI Saga is not available' using errcode='42501';
  end if;
  select * into v_session from public.sessions s
  where s.id=p_session_id and s.workspace_id=p_workspace_id and s.world_id=p_world_id
    and s.saga_id=p_saga_id and s.archived_at is null for update;
  if not found or v_session.status not in ('planned','ready') then
    raise exception 'Prep AI is available only for editable Sessions' using errcode='23514';
  end if;

  v_hash := encode(extensions.digest(convert_to(
    p_task_name || ':' || coalesce(p_input_payload,'{}'::jsonb)::text || ':' || p_prep_version::text,
    'UTF8'
  ), 'sha256'), 'hex');
  select * into v_existing from internal.prep_ai_requests r
  where r.gm_id=p_gm_id and r.saga_id=p_saga_id and r.session_id=p_session_id
    and r.idempotency_key=p_idempotency_key;
  if found then
    if v_existing.id<>p_request_id or v_existing.input_hash<>v_hash then
      raise exception 'Prep AI idempotency key was reused with different input' using errcode='23505';
    end if;
    return jsonb_build_object(
      'request_id',v_existing.id,'run_id',v_existing.ai_task_run_id,
      'status',v_existing.status,'replayed',true
    );
  end if;

  if p_task_name='draft_entity_from_prompt' then
    perform 1 from internal.prep_ai_requests r
    where r.id=p_parent_request_id and r.gm_id=p_gm_id and r.workspace_id=p_workspace_id
      and r.world_id=p_world_id and r.saga_id=p_saga_id and r.session_id=p_session_id
      and r.task_name='propose_npc_for_scene' and r.status='complete' and r.review_state='pending'
    for update;
    if not found then
      raise exception 'NPC candidate is not available for drafting' using errcode='42501';
    end if;
  elsif p_parent_request_id is not null then
    raise exception 'Only an NPC draft follow-up may name a parent request' using errcode='22023';
  end if;

  select * into v_contract from internal.ai_task_contracts() c
  where c.task_name=p_task_name and c.active;
  if not found then raise exception 'Prep AI task contract is unavailable' using errcode='22023'; end if;

  insert into internal.prep_ai_requests(
    id,workspace_id,world_id,saga_id,session_id,gm_id,idempotency_key,input_hash,
    task_name,parent_request_id,prep_version_at_submit
  ) values (
    p_request_id,p_workspace_id,p_world_id,p_saga_id,p_session_id,p_gm_id,
    p_idempotency_key,v_hash,p_task_name,p_parent_request_id,p_prep_version
  );
  insert into internal.ai_task_runs(
    id,workspace_id,world_id,saga_id,session_id,gm_id,task_name,prompt_version,
    quota_tier,ai_credits,model_tier,retrieval_profile,source_policy,output_mode,
    input_payload,allowed_source_ids,allowed_source_versions,prep_ai_request_id
  ) values (
    v_run_id,p_workspace_id,p_world_id,p_saga_id,p_session_id,p_gm_id,
    v_contract.task_name,v_contract.prompt_version,v_contract.quota_tier,v_contract.ai_credits,
    v_contract.model_tier,
    case when p_task_name='draft_entity_from_prompt' and p_parent_request_id is not null
      then 'session_prep_grounding' else v_contract.retrieval_profile end,
    v_contract.source_policy,
    v_contract.output_mode,coalesce(p_input_payload,'{}'::jsonb),'{}','{}',p_request_id
  );
  update internal.prep_ai_requests set ai_task_run_id=v_run_id where id=p_request_id;
  return jsonb_build_object('request_id',p_request_id,'run_id',v_run_id,'status','queued','replayed',false);
end;
$$;

create or replace function public.freeze_prep_ai_evidence_for_worker(
  p_run_id uuid,
  p_source_ids uuid[],
  p_retrieval_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  v_run internal.ai_task_runs%rowtype;
  v_request internal.prep_ai_requests%rowtype;
  v_source public.sources%rowtype;
  v_source_id uuid;
  v_text text;
  v_ids uuid[] := '{}'::uuid[];
  v_versions jsonb := '{}'::jsonb;
  v_count integer := 0;
begin
  if p_retrieval_mode not in ('hybrid','lexical_fallback') then
    raise exception 'Prep AI retrieval mode is invalid' using errcode='22023';
  end if;
  select * into v_run from internal.ai_task_runs r where r.id=p_run_id for update;
  if not found or v_run.prep_ai_request_id is null then
    raise exception 'Prep AI run is not available' using errcode='42501';
  end if;
  select * into v_request from internal.prep_ai_requests r
  where r.id=v_run.prep_ai_request_id for update;
  if exists(select 1 from internal.prep_ai_evidence_snapshots e where e.request_id=v_request.id) then
    return public.get_prep_ai_evidence_for_worker(p_run_id);
  end if;
  foreach v_source_id in array coalesce(p_source_ids,'{}'::uuid[]) loop
    exit when v_count>=20;
    select * into v_source from public.sources s where s.id=v_source_id;
    if not found or v_source.workspace_id<>v_request.workspace_id or v_source.world_id<>v_request.world_id
      or not ((v_source.scope='saga' and v_source.saga_id=v_request.saga_id)
        or (v_source.scope='world' and v_source.saga_id is null))
      or v_source.kind::text='imported_text' then
      continue;
    end if;
    v_text := internal.guide_source_text(v_source);
    if v_text is null or v_source.id=any(v_ids) then continue; end if;
    v_count:=v_count+1;
    v_ids:=array_append(v_ids,v_source.id);
    v_versions:=v_versions||jsonb_build_object(
      v_source.id::text,coalesce(v_source.updated_at,v_source.created_at)::text
    );
    insert into internal.prep_ai_evidence_snapshots(
      request_id,ordinal,workspace_id,world_id,saga_id,source_id,source_version,
      source_kind,source_entity_type,source_entity_id,title,context_anchor,
      evidence_text,evidence_hash
    ) values (
      v_request.id,v_count,v_request.workspace_id,v_request.world_id,v_request.saga_id,
      v_source.id,coalesce(v_source.updated_at,v_source.created_at)::text,
      v_source.kind::text,v_source.source_entity_type::text,v_source.source_entity_id,
      coalesce(v_source.source_entity_type::text,replace(v_source.kind::text,'_',' '),'Source'),
      jsonb_strip_nulls(jsonb_build_object(
        'session_id',v_source.session_id,'start_seconds',v_source.start_seconds,
        'end_seconds',v_source.end_seconds
      )),
      v_text,encode(extensions.digest(convert_to(v_text,'UTF8'),'sha256'),'hex')
    );
  end loop;
  update internal.ai_task_runs set allowed_source_ids=v_ids,
    allowed_source_versions=v_versions,updated_at=now() where id=v_run.id;
  update internal.prep_ai_requests set retrieval_mode=p_retrieval_mode,updated_at=now()
  where id=v_request.id;
  return public.get_prep_ai_evidence_for_worker(p_run_id);
end;
$$;

create or replace function public.get_prep_ai_evidence_for_worker(p_run_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, internal, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'source_id',e.source_id,'source_version',e.source_version,'source_kind',e.source_kind,
    'source_entity_type',e.source_entity_type,'source_entity_id',e.source_entity_id,
    'title',e.title,'context_anchor',e.context_anchor,'text',e.evidence_text
  ) order by e.ordinal),'[]'::jsonb)
  from internal.ai_task_runs r
  join internal.prep_ai_evidence_snapshots e on e.request_id=r.prep_ai_request_id
  where r.id=p_run_id;
$$;

create or replace function public.get_prep_ai_context_for_worker(p_run_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, internal, pg_temp
as $$
  select jsonb_build_object(
    'retrieval_mode',r.retrieval_mode,
    'evidence',public.get_prep_ai_evidence_for_worker(a.id)
  )
  from internal.ai_task_runs a
  join internal.prep_ai_requests r on r.id=a.prep_ai_request_id
  where a.id=$1;
$$;

create or replace function public.set_prep_ai_request_state_for_worker(
  p_run_id uuid,
  p_status text,
  p_failure_category text default null
)
returns void
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
begin
  if p_status not in (
    'running','quota_blocked','provider_unavailable','retrieval_unavailable',
    'validation_failed','failed','dead_letter'
  ) then raise exception 'Prep AI state is invalid' using errcode='22023'; end if;
  update internal.prep_ai_requests r set status=p_status,
    failure_category=left(p_failure_category,100),updated_at=now(),
    completed_at=case when p_status in ('quota_blocked','validation_failed','dead_letter') then now() else r.completed_at end
  from internal.ai_task_runs a where a.id=p_run_id and r.id=a.prep_ai_request_id;
end;
$$;

create or replace function public.block_prep_ai_request_for_worker(
  p_run_id uuid,
  p_quota jsonb
)
returns void
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
begin
  update internal.prep_ai_requests r set status='quota_blocked',
    quota_snapshot=coalesce(p_quota,'{}'::jsonb),failure_category='quota_blocked',
    updated_at=now(),completed_at=now()
  from internal.ai_task_runs a where a.id=p_run_id and r.id=a.prep_ai_request_id;
  update internal.ai_task_runs set status='terminal',failure_reason='quota_blocked',
    updated_at=now(),completed_at=now() where id=p_run_id and status='pending';
end;
$$;

create or replace function public.complete_prep_ai_request_for_worker(
  p_run_id uuid,
  p_output jsonb
)
returns void
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
begin
  update internal.prep_ai_requests r set status='complete',result_payload=p_output,
    failure_category=null,updated_at=now(),completed_at=now()
  from internal.ai_task_runs a where a.id=p_run_id and r.id=a.prep_ai_request_id;
  update internal.prep_ai_requests parent set review_state='accepted',
    acceptance_destination='approval_queue',reviewed_at=now(),updated_at=now()
  from internal.prep_ai_requests child
  join internal.ai_task_runs a on a.prep_ai_request_id=child.id
  where a.id=p_run_id and child.task_name='draft_entity_from_prompt'
    and child.parent_request_id=parent.id;
end;
$$;

create or replace function public.get_session_prep_ai(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, internal, pg_temp
as $$
begin
  perform public.assert_saga_access($1,$2,$3);
  if not exists (
    select 1 from public.sessions s where s.id=$4 and s.workspace_id=$1
      and s.world_id=$2 and s.saga_id=$3 and s.archived_at is null
  ) then raise exception 'Session is not available' using errcode='42501'; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',r.id,'task_name',r.task_name,'status',r.status,'review_state',r.review_state,
      'prep_version_at_submit',r.prep_version_at_submit,'retrieval_mode',r.retrieval_mode,
      'result_payload',r.result_payload,'edited_payload',r.edited_payload,
      'failure_category',r.failure_category,'quota',r.quota_snapshot,
      'acceptance_destination',r.acceptance_destination,'accepted_draft_id',r.accepted_draft_id,
      'accepted_prep_version',r.accepted_prep_version,'parent_request_id',r.parent_request_id,
      'retry_input',coalesce((
        select case
          when a.task_name='generate_session_prep' then jsonb_build_object(
            'regenerate_scope',a.input_payload->>'regenerate_scope')
          when a.task_name='propose_thread_complication' then jsonb_build_object(
            'thread_id',a.input_payload->>'thread_id')
          when a.task_name='propose_npc_for_scene' then jsonb_build_object(
            'role_description',a.input_payload->>'role_description')
          when a.task_name='propose_quick_stub_fleshing' then jsonb_build_object(
            'entity_type',a.input_payload->>'entity_type','entity_id',a.input_payload->>'entity_id')
          when a.task_name='draft_entity_from_prompt' then jsonb_build_object(
            'candidate',a.input_payload->'candidate')
          else '{}'::jsonb
        end
        from internal.ai_task_runs a where a.id=r.ai_task_run_id
      ),'{}'::jsonb),
      'created_at',r.created_at,'updated_at',r.updated_at,
      'sources',coalesce((
        select jsonb_agg(jsonb_build_object(
          'source_id',e.source_id,
          'context',jsonb_build_object(
            'status',case when current_text is null then 'broken' else 'available' end,
            'source_kind',e.source_kind,'label',e.title,
            'frozen_excerpt',e.evidence_text,'current_text',current_text,
            'drift_state',case when current_text is null then 'deleted'
              when btrim(current_text)=btrim(e.evidence_text) then 'exact' else 'edited' end,
            'start_seconds',e.context_anchor->'start_seconds',
            'end_seconds',e.context_anchor->'end_seconds'
          )
        ) order by e.ordinal)
        from (
          select snap.*,internal.guide_source_text(src) current_text
          from internal.prep_ai_evidence_snapshots snap
          join public.sources src on src.id=snap.source_id
          where snap.request_id=r.id
        ) e
      ),'[]'::jsonb)
    ) order by r.created_at desc),'[]'::jsonb)
    from internal.prep_ai_requests r
    where r.gm_id=auth.uid() and r.workspace_id=$1 and r.world_id=$2
      and r.saga_id=$3 and r.session_id=$4
  );
end;
$$;

create or replace function internal.e4_stub_snapshot(
  p_type public.entity_type,
  p_id uuid,
  p_workspace uuid,
  p_world uuid,
  p_saga uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v jsonb;
begin
  if p_type='character' then select jsonb_build_object('updated_at',updated_at,'is_stub',is_stub) into v from public.characters where id=p_id and workspace_id=p_workspace and world_id=p_world and saga_id=p_saga and scope='saga' and canon_state<>'archived';
  elsif p_type='place' then select jsonb_build_object('updated_at',updated_at,'is_stub',is_stub) into v from public.places where id=p_id and workspace_id=p_workspace and world_id=p_world and saga_id=p_saga and scope='saga' and canon_state<>'archived';
  elsif p_type='faction' then select jsonb_build_object('updated_at',updated_at,'is_stub',is_stub) into v from public.factions where id=p_id and workspace_id=p_workspace and world_id=p_world and saga_id=p_saga and scope='saga' and canon_state<>'archived';
  elsif p_type='artifact' then select jsonb_build_object('updated_at',updated_at,'is_stub',is_stub) into v from public.artifacts where id=p_id and workspace_id=p_workspace and world_id=p_world and saga_id=p_saga and scope='saga' and canon_state<>'archived';
  elsif p_type='thread' then select jsonb_build_object('updated_at',updated_at,'is_stub',is_stub) into v from public.threads where id=p_id and workspace_id=p_workspace and world_id=p_world and saga_id=p_saga and scope='saga' and canon_state<>'archived';
  end if;
  return v;
end;
$$;

create or replace function public.set_prep_ai_review_state(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  request_id uuid,
  review_state text,
  edited_payload jsonb default null,
  accepted_prep_version timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  v_request internal.prep_ai_requests%rowtype;
  v_session public.sessions%rowtype;
  v_run internal.ai_task_runs%rowtype;
  v_payload jsonb;
  v_stub jsonb;
  v_type public.entity_type;
  v_target uuid;
  v_draft uuid;
  v_source uuid;
begin
  perform public.assert_saga_access($1,$2,$3);
  if review_state not in ('accepted','rejected','dismissed') then
    raise exception 'Prep AI review state is invalid' using errcode='22023';
  end if;
  select * into v_request from internal.prep_ai_requests r
  where r.id=$5 and r.gm_id=auth.uid() and r.workspace_id=$1 and r.world_id=$2
    and r.saga_id=$3 and r.session_id=$4 for update;
  if not found or v_request.status<>'complete' or v_request.review_state<>'pending' then
    raise exception 'Prep AI result is not available for review' using errcode='40001';
  end if;
  if review_state in ('rejected','dismissed') then
    update internal.prep_ai_requests set review_state=$6,edited_payload=$7,
      reviewed_at=now(),updated_at=now() where id=v_request.id;
    return jsonb_build_object('ok',true,'state',$6);
  end if;
  select * into v_session from public.sessions s where s.id=$4 and s.workspace_id=$1
    and s.world_id=$2 and s.saga_id=$3 and s.status in ('planned','ready') for update;
  if not found then raise exception 'Prep is no longer editable' using errcode='23514'; end if;
  v_payload:=coalesce($7,v_request.result_payload);

  if v_request.task_name='propose_quick_stub_fleshing' then
    select * into v_run from internal.ai_task_runs a where a.id=v_request.ai_task_run_id;
    begin
      v_type:=(v_run.input_payload->>'entity_type')::public.entity_type;
      v_target:=(v_run.input_payload->>'entity_id')::uuid;
    exception when others then
      raise exception 'Quick Stub target is invalid' using errcode='22023';
    end;
    v_stub:=internal.e4_stub_snapshot(v_type,v_target,$1,$2,$3);
    if v_stub is null or coalesce((v_stub->>'is_stub')::boolean,false)=false then
      raise exception 'Quick Stub target is stale or unavailable' using errcode='40001';
    end if;
    insert into public.drafts(
      workspace_id,world_id,saga_id,scope,entity_type,target_entity_id,state,
      change_kind,proposed_payload,expected_version,confidence_reason,created_by,
      ai_task_run_id,session_id,ai_task_name,ai_prompt_version,ai_model,ai_provider
    ) values (
      $1,$2,$3,'saga',v_type,v_target,'pending','update',
      jsonb_strip_nulls(jsonb_build_object(
        'summary',v_payload->'proposal'->>'summary',
        'narrative',v_payload->'proposal'->>'narrative',
        'is_stub',false
      )),
      (v_stub->>'updated_at')::timestamptz,
      nullif(v_payload->>'confidence_reason','')::public.confidence_reason,
      'gm_via_ai_approval',v_run.id,$4,v_run.task_name,v_run.prompt_version,
      v_run.resolved_model,v_run.resolved_provider
    ) returning id into v_draft;
    for v_source in
      select snap.source_id
      from internal.prep_ai_evidence_snapshots snap
      where snap.request_id=v_request.id
    loop
      insert into public.draft_sources(workspace_id,world_id,saga_id,scope,draft_id,source_id)
      values($1,$2,$3,'saga',v_draft,v_source) on conflict(draft_id,source_id) do nothing;
    end loop;
    update internal.prep_ai_requests set review_state='accepted',edited_payload=$7,
      acceptance_destination='approval_queue',accepted_draft_id=v_draft,
      reviewed_at=now(),updated_at=now() where id=v_request.id;
    return jsonb_build_object('ok',true,'state','accepted','destination','approval_queue','draft_id',v_draft);
  end if;

  if accepted_prep_version is null or v_session.updated_at is distinct from $8
    or $8<=v_request.prep_version_at_submit then
    raise exception 'Accepted Prep version is stale; the result remains pending' using errcode='40001';
  end if;
  update internal.prep_ai_requests set review_state='accepted',edited_payload=$7,
    acceptance_destination='prep_autosave',accepted_prep_version=$8,
    reviewed_at=now(),updated_at=now() where id=v_request.id;
  return jsonb_build_object('ok',true,'state','accepted','destination','prep_autosave');
end;
$$;

revoke all on function public.create_prep_ai_request_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,timestamptz,uuid) from public,anon,authenticated;
revoke all on function public.freeze_prep_ai_evidence_for_worker(uuid,uuid[],text) from public,anon,authenticated;
revoke all on function public.get_prep_ai_evidence_for_worker(uuid) from public,anon,authenticated;
revoke all on function public.get_prep_ai_context_for_worker(uuid) from public,anon,authenticated;
revoke all on function public.set_prep_ai_request_state_for_worker(uuid,text,text) from public,anon,authenticated;
revoke all on function public.block_prep_ai_request_for_worker(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.complete_prep_ai_request_for_worker(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_prep_ai_request_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,timestamptz,uuid) to service_role;
grant execute on function public.freeze_prep_ai_evidence_for_worker(uuid,uuid[],text) to service_role;
grant execute on function public.get_prep_ai_evidence_for_worker(uuid) to service_role;
grant execute on function public.get_prep_ai_context_for_worker(uuid) to service_role;
grant execute on function public.set_prep_ai_request_state_for_worker(uuid,text,text) to service_role;
grant execute on function public.block_prep_ai_request_for_worker(uuid,jsonb) to service_role;
grant execute on function public.complete_prep_ai_request_for_worker(uuid,jsonb) to service_role;

revoke all on function public.get_session_prep_ai(uuid,uuid,uuid,uuid) from public,anon;
revoke all on function public.set_prep_ai_review_state(uuid,uuid,uuid,uuid,uuid,text,jsonb,timestamptz) from public,anon;
grant execute on function public.get_session_prep_ai(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.set_prep_ai_review_state(uuid,uuid,uuid,uuid,uuid,text,jsonb,timestamptz) to authenticated;
