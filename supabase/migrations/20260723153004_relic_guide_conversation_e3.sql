-- Packet E3: persistent Saga-scoped Relic Guide conversations.

create table public.guide_threads (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  gm_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Relic Guide',
  state text not null default 'active' check (state in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index guide_threads_owner_scope_idx
  on public.guide_threads(gm_id, workspace_id, world_id, saga_id, updated_at desc);

create table public.guide_turns (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  gm_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.guide_threads(id) on delete cascade,
  ordinal int not null check (ordinal > 0),
  idempotency_key uuid not null,
  question text not null check (char_length(question) between 1 and 2000),
  question_hash text not null check (question_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'queued' check (status in (
    'queued','running','complete','quota_blocked','provider_unavailable',
    'retrieval_fallback','failed','dead_letter','superseded'
  )),
  retrieval_mode text not null check (retrieval_mode in ('hybrid','lexical_fallback','none')),
  ai_task_run_id uuid,
  response_payload jsonb,
  failure_category text,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (thread_id, ordinal),
  unique (gm_id, saga_id, idempotency_key)
);
create index guide_turns_thread_idx on public.guide_turns(thread_id, ordinal);

create table public.guide_action_intents (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  gm_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.guide_threads(id) on delete cascade,
  turn_id uuid not null references public.guide_turns(id) on delete cascade,
  block_index int not null check (block_index >= 0),
  action_type text not null check (action_type in ('open_record','draft_entity')),
  source_id uuid references public.sources(id) on delete set null,
  entity_type public.entity_type,
  intent text,
  explanation text not null,
  state text not null default 'pending' check (state in ('pending','processing','accepted','dismissed','conflict','failed')),
  accepted_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (turn_id, block_index)
);

create table internal.guide_evidence_snapshots (
  turn_id uuid not null references public.guide_turns(id) on delete cascade,
  ordinal int not null check (ordinal > 0 and ordinal <= 20),
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
  primary key (turn_id, source_id),
  unique (turn_id, ordinal)
);

alter table internal.ai_task_runs
  add column if not exists guide_thread_id uuid references public.guide_threads(id) on delete set null,
  add column if not exists guide_turn_id uuid references public.guide_turns(id) on delete set null,
  add column if not exists allowed_source_versions jsonb not null default '{}'::jsonb;
create unique index if not exists ai_task_runs_guide_turn_idx
  on internal.ai_task_runs(guide_turn_id) where guide_turn_id is not null;

alter table public.guide_threads enable row level security;
alter table public.guide_turns enable row level security;
alter table public.guide_action_intents enable row level security;

create policy guide_threads_owner_select on public.guide_threads
  for select to authenticated
  using ((select auth.uid()) = gm_id and public.saga_row_allowed(workspace_id, world_id, saga_id));
create policy guide_turns_owner_select on public.guide_turns
  for select to authenticated
  using ((select auth.uid()) = gm_id and public.saga_row_allowed(workspace_id, world_id, saga_id));
create policy guide_actions_owner_select on public.guide_action_intents
  for select to authenticated
  using ((select auth.uid()) = gm_id and public.saga_row_allowed(workspace_id, world_id, saga_id));

revoke all on table public.guide_threads, public.guide_turns, public.guide_action_intents from public, anon, authenticated;
grant select on table public.guide_threads, public.guide_turns, public.guide_action_intents to authenticated;
revoke all on table internal.guide_evidence_snapshots from public, anon, authenticated;

create or replace function internal.normalize_guide_question(p_question text)
returns text
language plpgsql immutable
set search_path = ''
as $$
declare v text;
begin
  v := btrim(regexp_replace(replace(replace(normalize(coalesce(p_question,''), NFKC), E'\r\n', E'\n'), E'\r', E'\n'), '[\t ]+', ' ', 'g'));
  if v = '' or char_length(v) > 2000 or v ~ '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]' then
    raise exception 'Guide question must contain 1 to 2,000 safe characters' using errcode = '22023';
  end if;
  return v;
end;
$$;

create or replace function internal.guide_source_text(p_source public.sources)
returns text
language plpgsql stable
set search_path = public, pg_temp
as $$
declare v text;
begin
  if p_source.kind::text = 'imported_text' then return null; end if;
  if nullif(btrim(p_source.raw_excerpt), '') is not null then return left(p_source.raw_excerpt, 6000); end if;
  case p_source.source_entity_type::text
    when 'character' then select concat_ws(E'\n\n', name, summary, narrative) into v from public.characters where id=p_source.source_entity_id and canon_state<>'archived';
    when 'place' then select concat_ws(E'\n\n', name, summary, narrative) into v from public.places where id=p_source.source_entity_id and canon_state<>'archived';
    when 'faction' then select concat_ws(E'\n\n', name, summary, narrative) into v from public.factions where id=p_source.source_entity_id and canon_state<>'archived';
    when 'artifact' then select concat_ws(E'\n\n', name, summary, narrative) into v from public.artifacts where id=p_source.source_entity_id and canon_state<>'archived';
    when 'thread' then select concat_ws(E'\n\n', name, summary, narrative, objective) into v from public.threads where id=p_source.source_entity_id and canon_state<>'archived';
    when 'session' then select concat_ws(E'\n\n', name, summary, narrative, objective, opening_scene) into v from public.sessions where id=p_source.source_entity_id;
    else
      if p_source.note_id is not null then
        select concat_ws(E'\n\n', title, body) into v from public.notes
        where id=p_source.note_id and note_type<>'gm_note' and canon_state<>'archived';
      end if;
  end case;
  return left(nullif(btrim(v), ''), 6000);
end;
$$;

create or replace function public.create_guide_turn_for_worker(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_gm_id uuid,
  p_thread_id uuid,
  p_turn_id uuid,
  p_idempotency_key uuid,
  p_question text,
  p_retrieval_mode text,
  p_source_ids uuid[]
)
returns jsonb
language plpgsql security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  v_question text := internal.normalize_guide_question(p_question);
  v_hash text := encode(extensions.digest(convert_to(v_question,'UTF8'),'sha256'),'hex');
  v_thread public.guide_threads%rowtype;
  v_existing public.guide_turns%rowtype;
  v_turn public.guide_turns%rowtype;
  v_contract record;
  v_source public.sources%rowtype;
  v_text text;
  v_ids uuid[] := array[]::uuid[];
  v_versions jsonb := '{}'::jsonb;
  v_context jsonb := '[]'::jsonb;
  v_ordinal int;
  v_run_id uuid := public.uuid7();
  v_count int := 0;
  v_source_id uuid;
begin
  if p_retrieval_mode not in ('hybrid','lexical_fallback','none') then
    raise exception 'Guide retrieval mode is invalid' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.sagas s join public.workspaces w on w.id=s.workspace_id
    where s.id=p_saga_id and s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and w.owner_gm_id=p_gm_id and s.deleted_at is null
  ) then raise exception 'Guide Saga is not available' using errcode='42501'; end if;

  select * into v_existing from public.guide_turns
  where gm_id=p_gm_id and saga_id=p_saga_id and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.question_hash <> v_hash then
      raise exception 'Guide idempotency key was already used for another question' using errcode='23505';
    end if;
    return jsonb_build_object('thread_id',v_existing.thread_id,'turn_id',v_existing.id,
      'run_id',v_existing.ai_task_run_id,'status',v_existing.status,'replayed',true);
  end if;

  if p_thread_id is null then
    insert into public.guide_threads(workspace_id,world_id,saga_id,gm_id)
    values(p_workspace_id,p_world_id,p_saga_id,p_gm_id) returning * into v_thread;
  else
    select * into v_thread from public.guide_threads where id=p_thread_id for update;
    if not found or v_thread.gm_id<>p_gm_id or v_thread.workspace_id<>p_workspace_id
      or v_thread.world_id<>p_world_id or v_thread.saga_id<>p_saga_id or v_thread.state<>'active' then
      raise exception 'Guide thread is not available in this Saga' using errcode='42501';
    end if;
  end if;

  select coalesce(max(ordinal),0)+1 into v_ordinal from public.guide_turns where thread_id=v_thread.id;
  update public.guide_turns set status='superseded', superseded_at=now(), updated_at=now()
  where thread_id=v_thread.id and status in ('queued','running','retrieval_fallback');

  insert into public.guide_turns(id,workspace_id,world_id,saga_id,gm_id,thread_id,ordinal,
    idempotency_key,question,question_hash,status,retrieval_mode)
  values(p_turn_id,p_workspace_id,p_world_id,p_saga_id,p_gm_id,v_thread.id,v_ordinal,
    p_idempotency_key,v_question,v_hash,
    case when p_retrieval_mode='lexical_fallback' then 'retrieval_fallback' else 'queued' end,
    p_retrieval_mode) returning * into v_turn;

  foreach v_source_id in array coalesce(p_source_ids,array[]::uuid[]) loop
    exit when v_count >= 20;
    select * into v_source from public.sources s where s.id=v_source_id;
    if not found or v_source.workspace_id<>p_workspace_id or v_source.world_id<>p_world_id
      or not ((v_source.scope='saga' and v_source.saga_id=p_saga_id)
        or (v_source.scope='world' and v_source.saga_id is null))
      or v_source.kind::text='imported_text' then continue;
    end if;
    v_text := internal.guide_source_text(v_source);
    if v_text is null then continue; end if;
    if v_source.id = any(v_ids) then continue; end if;
    v_count := v_count+1;
    v_ids := array_append(v_ids,v_source.id);
    v_versions := v_versions || jsonb_build_object(v_source.id::text,
      coalesce(v_source.updated_at,v_source.created_at)::text);
    insert into internal.guide_evidence_snapshots(
      turn_id,ordinal,workspace_id,world_id,saga_id,source_id,source_version,source_kind,
      source_entity_type,source_entity_id,title,context_anchor,evidence_text,evidence_hash
    ) values (
      v_turn.id,v_count,p_workspace_id,p_world_id,p_saga_id,v_source.id,
      coalesce(v_source.updated_at,v_source.created_at)::text,v_source.kind::text,
      v_source.source_entity_type::text,v_source.source_entity_id,
      coalesce(v_source.source_entity_type::text,replace(v_source.kind::text,'_',' '),'Source'),
      jsonb_strip_nulls(jsonb_build_object('session_id',v_source.session_id,'start_seconds',v_source.start_seconds,'end_seconds',v_source.end_seconds)),
      v_text,encode(extensions.digest(convert_to(v_text,'UTF8'),'sha256'),'hex')
    );
  end loop;

  select * into v_contract from internal.ai_task_contracts() c where c.task_name='answer_saga_question' and c.active;
  with latest as (
    select t.*
    from public.guide_turns t
    where t.thread_id=v_thread.id and t.id<>v_turn.id and t.status='complete'
    order by t.ordinal desc
    limit 8
  ), messages as (
    select l.ordinal,1 as role_order,
      jsonb_build_object('role','gm','text',left(l.question,375),'turn_id',l.id) as item
    from latest l
    union all
    select l.ordinal,2,
      jsonb_build_object(
        'role','guide',
        'text',left(coalesce((
          select string_agg(b->>'text',E'\n' order by n)
          from jsonb_array_elements(coalesce(l.response_payload->'blocks','[]'::jsonb))
            with ordinality as block(b,n)
          where b->>'type' in ('grounded_answer','creative_proposal','grounded_proposal','guidance')
        ), case when l.response_payload->>'no_answer'='true' then 'No answer: insufficient evidence.' else '' end),375),
        'turn_id',l.id
      )
    from latest l
  )
  select coalesce(jsonb_agg(item order by ordinal,role_order),'[]'::jsonb)
  into v_context
  from messages;

  insert into internal.ai_task_runs(
    id,workspace_id,world_id,saga_id,gm_id,task_name,prompt_version,quota_tier,ai_credits,
    model_tier,retrieval_profile,source_policy,output_mode,input_payload,allowed_source_ids,
    allowed_source_versions,guide_thread_id,guide_turn_id
  ) values (
    v_run_id,p_workspace_id,p_world_id,p_saga_id,p_gm_id,v_contract.task_name,v_contract.prompt_version,
    v_contract.quota_tier,v_contract.ai_credits,v_contract.model_tier,v_contract.retrieval_profile,
    v_contract.source_policy,v_contract.output_mode,
    jsonb_build_object('question',v_question,'guide_thread_id',v_thread.id,'guide_turn_id',v_turn.id,
      'conversation_context',v_context),v_ids,v_versions,v_thread.id,v_turn.id
  );
  update public.guide_turns set ai_task_run_id=v_run_id where id=v_turn.id;
  update public.guide_threads set updated_at=now() where id=v_thread.id;
  return jsonb_build_object('thread_id',v_thread.id,'turn_id',v_turn.id,'run_id',v_run_id,
    'status',v_turn.status,'replayed',false,'source_count',cardinality(v_ids));
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
  from internal.ai_task_runs r join internal.guide_evidence_snapshots e on e.turn_id=r.guide_turn_id
  where r.id=p_run_id;
$$;

create or replace function public.set_guide_turn_state_for_worker(
  p_run_id uuid, p_status text, p_failure_category text default null
)
returns void language plpgsql security definer
set search_path = public, internal, pg_temp
as $$
begin
  if p_status not in ('running','quota_blocked','provider_unavailable','failed','dead_letter') then
    raise exception 'Guide state is invalid' using errcode='22023';
  end if;
  update public.guide_turns t set status=p_status,failure_category=left(p_failure_category,100),updated_at=now()
  from internal.ai_task_runs r where r.id=p_run_id and t.id=r.guide_turn_id and t.status<>'superseded';
end;
$$;

create or replace function public.block_guide_turn_for_worker(p_run_id uuid,p_reason text)
returns void language plpgsql security definer
set search_path = public, internal, pg_temp
as $$
begin
  if p_reason <> 'quota_blocked' then raise exception 'Guide block reason is invalid' using errcode='22023'; end if;
  update public.guide_turns t set status='quota_blocked',failure_category='quota_blocked',updated_at=now(),completed_at=now()
  from internal.ai_task_runs r where r.id=p_run_id and t.id=r.guide_turn_id;
  update internal.ai_task_runs set status='terminal',failure_reason='quota_blocked',completed_at=now(),updated_at=now()
  where id=p_run_id and status='pending';
end;
$$;

create or replace function public.complete_guide_turn_for_worker(p_run_id uuid, p_output jsonb)
returns void language plpgsql security definer
set search_path = public, internal, pg_temp
as $$
declare v_turn public.guide_turns%rowtype; v_block jsonb; v_index int:=0; v_action jsonb;
begin
  select t.* into v_turn from public.guide_turns t join internal.ai_task_runs r on r.guide_turn_id=t.id
  where r.id=p_run_id for update of t;
  if not found then return; end if;
  if v_turn.status<>'superseded' then
    update public.guide_turns set status='complete',response_payload=p_output,failure_category=null,
      completed_at=now(),updated_at=now() where id=v_turn.id;
  end if;
  for v_block in select value from jsonb_array_elements(coalesce(p_output->'blocks','[]'::jsonb)) loop
    if v_block->>'type'='action_preview' then
      v_action:=v_block->'action';
      insert into public.guide_action_intents(
        workspace_id,world_id,saga_id,gm_id,thread_id,turn_id,block_index,action_type,
        source_id,entity_type,intent,explanation
      ) values (
        v_turn.workspace_id,v_turn.world_id,v_turn.saga_id,v_turn.gm_id,v_turn.thread_id,v_turn.id,v_index,
        v_action->>'type',nullif(v_action->>'source_id','')::uuid,
        nullif(v_action->>'entity_type','')::public.entity_type,v_action->>'intent',v_block->>'explanation'
      ) on conflict(turn_id,block_index) do nothing;
    end if;
    v_index:=v_index+1;
  end loop;
end;
$$;

create or replace function public.get_guide_thread(
  p_workspace_id uuid, p_world_id uuid, p_saga_id uuid, p_thread_id uuid default null
)
returns jsonb language plpgsql stable security definer
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
    'actions',coalesce((select jsonb_agg(jsonb_build_object(
      'id',a.id,'block_index',a.block_index,'type',a.action_type,'source_id',a.source_id,
      'entity_type',a.entity_type,'intent',a.intent,'explanation',a.explanation,
      'state',case
        when a.state='processing' and r.status='complete' then 'accepted'
        when a.state='processing' and r.status in ('failed','terminal','dead_letter') then 'failed'
        else a.state
      end
    ) order by a.block_index)
      from public.guide_action_intents a
      left join internal.ai_task_runs r on r.id=a.accepted_run_id
      where a.turn_id=t.id),'[]'::jsonb)
  ) order by t.ordinal),'[]'::jsonb) into v_turns
  from public.guide_turns t where t.thread_id=v_thread.id;
  return jsonb_build_object('id',v_thread.id,'state',v_thread.state,'title',v_thread.title,'turns',v_turns);
end;
$$;

create or replace function public.get_guide_source_context(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_turn_id uuid
)
returns jsonb language plpgsql stable security definer
set search_path = public, internal, pg_temp
as $$
declare e internal.guide_evidence_snapshots%rowtype; s public.sources%rowtype; result jsonb:='[]'::jsonb; item jsonb;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  if not exists(select 1 from public.guide_turns t where t.id=p_turn_id and t.gm_id=auth.uid()
    and t.workspace_id=p_workspace_id and t.world_id=p_world_id and t.saga_id=p_saga_id) then
    return jsonb_build_array(jsonb_build_object('status','unavailable','source_kind','unknown','label','Source unavailable','drift_state','unavailable'));
  end if;
  for e in select * from internal.guide_evidence_snapshots where turn_id=p_turn_id order by ordinal loop
    select * into s from public.sources where id=e.source_id;
    if not found then
      item:=jsonb_build_object('source_id',e.source_id,'status','broken','source_kind',e.source_kind,'label','Source unavailable','frozen_excerpt',e.evidence_text,'drift_state','unavailable');
    elsif s.kind='transcript_segment' then
      item:=public.get_transcript_source_context(s.id)||jsonb_build_object('source_id',s.id);
    else
      item:=jsonb_build_object('source_id',s.id,'status','available','source_kind',e.source_kind,
        'label',e.title,'frozen_excerpt',e.evidence_text,'source_entity_type',e.source_entity_type,
        'source_entity_id',e.source_entity_id,
        'drift_state',case when coalesce(s.updated_at,s.created_at)::text=e.source_version then 'not_applicable' else 'edited' end);
    end if;
    result:=result||jsonb_build_array(item);
  end loop;
  return result;
end;
$$;

create or replace function public.new_guide_thread(p_workspace_id uuid,p_world_id uuid,p_saga_id uuid)
returns uuid language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v uuid;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  insert into public.guide_threads(workspace_id,world_id,saga_id,gm_id)
  values(p_workspace_id,p_world_id,p_saga_id,auth.uid()) returning id into v;
  return v;
end;
$$;

create or replace function public.set_guide_action_state(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_action_id uuid,p_state text
)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare a public.guide_action_intents%rowtype; c record; q record; run_id uuid;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  select * into a from public.guide_action_intents where id=p_action_id for update;
  if not found or a.gm_id<>auth.uid() or a.workspace_id<>p_workspace_id or a.world_id<>p_world_id or a.saga_id<>p_saga_id then
    raise exception 'Guide action is not available' using errcode='42501';
  end if;
  if p_state='dismissed' then
    if a.state='pending' then update public.guide_action_intents set state='dismissed',updated_at=now() where id=a.id; end if;
    return jsonb_build_object('action_id',a.id,'state','dismissed');
  end if;
  if p_state<>'accepted' or a.action_type<>'draft_entity' then
    raise exception 'Guide action cannot be accepted' using errcode='22023';
  end if;
  if a.accepted_run_id is not null then
    return jsonb_build_object('action_id',a.id,'state',a.state,'run_id',a.accepted_run_id,'replayed',true);
  end if;
  select * into c from internal.ai_task_contracts() where task_name='draft_entity_from_prompt' and active;
  select * into q from public.check_quota_preflight(
    p_workspace_id,p_world_id,p_saga_id,'ai_call',c.ai_credits,
    jsonb_build_object('task_name',c.task_name,'guide_action_id',a.id)
  );
  if not q.allowed then
    return jsonb_build_object(
      'action_id',a.id,'state','quota_blocked','allowed',false,
      'severity',q.severity,'message',q.message,'reset_at',q.reset_at
    );
  end if;
  run_id:=public.uuid7();
  insert into internal.ai_task_runs(
    id,workspace_id,world_id,saga_id,gm_id,task_name,prompt_version,quota_tier,ai_credits,
    model_tier,retrieval_profile,source_policy,output_mode,input_payload,allowed_source_ids
  ) select run_id,p_workspace_id,p_world_id,p_saga_id,auth.uid(),c.task_name,c.prompt_version,c.quota_tier,
    c.ai_credits,c.model_tier,c.retrieval_profile,c.source_policy,c.output_mode,
    jsonb_build_object('entity_type',a.entity_type,'change_kind','create','prompt',a.intent,
      'desired_scope','saga','guide_action_id',a.id),
    coalesce(array_agg(e.source_id order by e.ordinal),'{}')
  from internal.guide_evidence_snapshots e where e.turn_id=a.turn_id;
  update public.guide_action_intents set state='processing',accepted_run_id=run_id,updated_at=now() where id=a.id;
  return jsonb_build_object('action_id',a.id,'state','processing','run_id',run_id,'replayed',false);
end;
$$;

-- Registered Guide output is a breaking schema revision.
create or replace function internal.ai_task_contracts()
returns table (
  task_name text,prompt_version text,quota_tier text,ai_credits numeric,model_tier text,
  retrieval_profile text,source_policy text,output_mode text,active boolean
) language sql stable set search_path=public,pg_temp as $$
  values
    ('scaffold_saga','scaffold_saga@1.0.0','heavy',10::numeric,'relic-deep','none','canon_plus_untrusted_input','workshop_draft_payload',true),
    ('draft_entity_from_prompt','draft_entity_from_prompt@1.0.0','standard',3::numeric,'relic-balanced','sanctum_grounding','canon_plus_untrusted_input','draft',true),
    ('generate_session_prep','generate_session_prep@1.0.0','heavy',10::numeric,'relic-deep','session_prep_grounding','canon_only','prep_suggestions',true),
    ('compose_prep_briefing','compose_prep_briefing@1.0.0','standard',3::numeric,'relic-balanced','session_prep_grounding','canon_only','prep_briefing',true),
    ('synthesize_session','synthesize_session@1.0.0','pipeline_synthesis',15::numeric,'relic-deep','post_session_synthesis','canon_plus_untrusted_input','draft_batch',true),
    ('propose_scene_beats','propose_scene_beats@1.0.0','light',1::numeric,'relic-balanced','session_prep_grounding','canon_only','ephemeral',true),
    ('propose_thread_complication','propose_thread_complication@1.0.0','light',1::numeric,'relic-balanced','sanctum_grounding','canon_only','ephemeral',true),
    ('propose_npc_for_scene','propose_npc_for_scene@1.0.0','light',1::numeric,'relic-balanced','session_prep_grounding','canon_only','ephemeral',true),
    ('answer_saga_question','answer_saga_question@1.1.0','light',1::numeric,'relic-balanced','sanctum_qa_grounding','canon_only','ephemeral',true),
    ('propose_quick_stub_fleshing','propose_quick_stub_fleshing@1.0.0','light',1::numeric,'relic-balanced','post_session_synthesis','canon_plus_untrusted_input','draft',true);
$$;

revoke all on function public.create_guide_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid[]) from public,anon,authenticated;
revoke all on function public.get_guide_evidence_for_worker(uuid) from public,anon,authenticated;
revoke all on function public.set_guide_turn_state_for_worker(uuid,text,text) from public,anon,authenticated;
revoke all on function public.block_guide_turn_for_worker(uuid,text) from public,anon,authenticated;
revoke all on function public.complete_guide_turn_for_worker(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_guide_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid[]) to service_role;
grant execute on function public.get_guide_evidence_for_worker(uuid) to service_role;
grant execute on function public.set_guide_turn_state_for_worker(uuid,text,text) to service_role;
grant execute on function public.block_guide_turn_for_worker(uuid,text) to service_role;
grant execute on function public.complete_guide_turn_for_worker(uuid,jsonb) to service_role;

revoke all on function public.get_guide_thread(uuid,uuid,uuid,uuid) from public,anon;
revoke all on function public.get_guide_source_context(uuid,uuid,uuid,uuid) from public,anon;
revoke all on function public.new_guide_thread(uuid,uuid,uuid) from public,anon;
revoke all on function public.set_guide_action_state(uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function public.get_guide_thread(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.get_guide_source_context(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.new_guide_thread(uuid,uuid,uuid) to authenticated;
grant execute on function public.set_guide_action_state(uuid,uuid,uuid,uuid,text) to authenticated;
