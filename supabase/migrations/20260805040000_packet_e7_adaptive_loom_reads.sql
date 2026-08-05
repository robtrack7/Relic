-- Packet E7: cheapest-sufficient Loom retrieval planning and deterministic read tools.

alter table public.guide_turns drop constraint if exists guide_turns_retrieval_mode_check;
alter table public.guide_turns add constraint guide_turns_retrieval_mode_check
  check (retrieval_mode in ('hybrid','lexical_fallback','lexical','exact','structured','deterministic_read','none'));

alter table public.guide_action_intents
  add column if not exists result_snapshot jsonb not null default '{}'::jsonb;
alter table public.guide_action_intents drop constraint if exists guide_action_intents_action_type_check;
alter table public.guide_action_intents add constraint guide_action_intents_action_type_check
  check (action_type in ('open_record','list_records','show_source','explain_provenance','navigate_surface','draft_entity'));
alter table public.guide_action_intents drop constraint if exists guide_action_intents_json_shape_check;
alter table public.guide_action_intents add constraint guide_action_intents_json_shape_check check (
  jsonb_typeof(arguments)='object' and jsonb_typeof(evidence_versions)='object'
  and jsonb_typeof(cost_snapshot)='object' and jsonb_typeof(result_snapshot)='object'
);

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
  ('draft_entity','1.0.0','Draft one non-canon Saga entity proposal from current cited evidence.',
   'non_canon_generation','explicit','downstream_ai_task',
   '{"type":"object","additionalProperties":false,"required":["entity_type","intent"],"properties":{"entity_type":{"type":"string","enum":["character","place","faction","artifact","thread"]},"intent":{"type":"string","minLength":1,"maxLength":500}}}'::jsonb,
   array['character','place','faction','artifact','thread']::text[],true,'draft_entity_from_prompt',3::numeric,
   'Create one non-canon pending entity draft for later review.','Open Library and create or draft the record manually.',true)
$$;

create or replace function internal.loom_visible_records(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid
)
returns table(
  record_type text,record_id uuid,name text,status text,summary text,detail text,
  scope public.content_scope,updated_at timestamptz,source_id uuid,session_number integer
)
language sql stable set search_path=public,pg_temp as $$
  select 'character',c.id,c.name,c.status,c.summary,c.narrative,c.scope,c.updated_at,src.id,null::integer
  from public.characters c left join lateral (
    select s.id from public.sources s where s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and s.source_entity_type='character' and s.source_entity_id=c.id and s.kind<>'imported_text'
    order by s.created_at desc,s.id desc limit 1
  ) src on true
  where c.workspace_id=p_workspace_id and c.world_id=p_world_id and c.canon_state='canon'
    and ((c.scope='saga' and c.saga_id=p_saga_id) or (c.scope='world' and c.saga_id is null))
  union all
  select 'place',p.id,p.name,p.status,p.summary,p.narrative,p.scope,p.updated_at,src.id,null::integer
  from public.places p left join lateral (
    select s.id from public.sources s where s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and s.source_entity_type='place' and s.source_entity_id=p.id and s.kind<>'imported_text'
    order by s.created_at desc,s.id desc limit 1
  ) src on true
  where p.workspace_id=p_workspace_id and p.world_id=p_world_id and p.canon_state='canon'
    and ((p.scope='saga' and p.saga_id=p_saga_id) or (p.scope='world' and p.saga_id is null))
  union all
  select 'faction',f.id,f.name,f.status,f.summary,f.narrative,f.scope,f.updated_at,src.id,null::integer
  from public.factions f left join lateral (
    select s.id from public.sources s where s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and s.source_entity_type='faction' and s.source_entity_id=f.id and s.kind<>'imported_text'
    order by s.created_at desc,s.id desc limit 1
  ) src on true
  where f.workspace_id=p_workspace_id and f.world_id=p_world_id and f.canon_state='canon'
    and ((f.scope='saga' and f.saga_id=p_saga_id) or (f.scope='world' and f.saga_id is null))
  union all
  select 'artifact',a.id,a.name,a.status,a.summary,a.narrative,a.scope,a.updated_at,src.id,null::integer
  from public.artifacts a left join lateral (
    select s.id from public.sources s where s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and s.source_entity_type='artifact' and s.source_entity_id=a.id and s.kind<>'imported_text'
    order by s.created_at desc,s.id desc limit 1
  ) src on true
  where a.workspace_id=p_workspace_id and a.world_id=p_world_id and a.canon_state='canon'
    and ((a.scope='saga' and a.saga_id=p_saga_id) or (a.scope='world' and a.saga_id is null))
  union all
  select 'thread',t.id,t.name,t.resolution_state,t.summary,concat_ws(E'\n\n',t.narrative,t.objective),t.scope,t.updated_at,src.id,null::integer
  from public.threads t left join lateral (
    select s.id from public.sources s where s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and s.source_entity_type='thread' and s.source_entity_id=t.id and s.kind<>'imported_text'
    order by s.created_at desc,s.id desc limit 1
  ) src on true
  where t.workspace_id=p_workspace_id and t.world_id=p_world_id and t.canon_state='canon'
    and ((t.scope='saga' and t.saga_id=p_saga_id) or (t.scope='world' and t.saga_id is null))
  union all
  select 'session',se.id,se.name,se.status::text,se.summary,
    concat_ws(E'\n\n',se.narrative,se.objective,se.opening_scene),se.scope,se.updated_at,src.id,se.session_number
  from public.sessions se left join lateral (
    select s.id from public.sources s where s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and s.saga_id=p_saga_id and s.source_entity_type='session' and s.source_entity_id=se.id and s.kind<>'imported_text'
    order by s.created_at desc,s.id desc limit 1
  ) src on true
  where se.workspace_id=p_workspace_id and se.world_id=p_world_id and se.saga_id=p_saga_id
    and se.archived_at is null
$$;

create or replace function internal.loom_record_current_version(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_record_type text,p_record_id uuid
)
returns text language sql stable set search_path=internal,extensions,pg_temp as $$
  select encode(extensions.digest(convert_to(concat_ws('|',r.record_type,r.record_id::text,r.updated_at::text),'UTF8'),'sha256'),'hex')
  from internal.loom_visible_records(p_workspace_id,p_world_id,p_saga_id) r
  where r.record_type=p_record_type and r.record_id=p_record_id limit 1
$$;

create or replace function internal.loom_record_snapshot(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_record_type text,p_record_id uuid
)
returns jsonb language plpgsql stable security definer set search_path=public,internal,pg_temp as $$
declare r record; v_links jsonb:='[]'::jsonb; v_objectives jsonb:='[]'::jsonb; v_session jsonb:='{}'::jsonb;
begin
  select * into r from internal.loom_visible_records(p_workspace_id,p_world_id,p_saga_id) x
  where x.record_type=p_record_type and x.record_id=p_record_id;
  if not found then return '{}'::jsonb; end if;
  if p_record_type<>'session' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'kind',x.kind,'direction',x.direction,'record_type',x.related_type,'record_id',x.related_id,
      'name',x.related_name,'status',x.related_status
    ) order by x.related_name,x.related_id),'[]'::jsonb) into v_links
    from (
      select rel.kind::text,
        case when rel.from_entity_type::text=p_record_type and rel.from_entity_id=p_record_id then 'outbound' else 'inbound' end direction,
        case when rel.from_entity_type::text=p_record_type and rel.from_entity_id=p_record_id then rel.to_entity_type::text else rel.from_entity_type::text end related_type,
        case when rel.from_entity_type::text=p_record_type and rel.from_entity_id=p_record_id then rel.to_entity_id else rel.from_entity_id end related_id,
        vr.name related_name,vr.status related_status
      from public.relationships rel
      join internal.loom_visible_records(p_workspace_id,p_world_id,p_saga_id) vr
        on vr.record_type=case when rel.from_entity_type::text=p_record_type and rel.from_entity_id=p_record_id then rel.to_entity_type::text else rel.from_entity_type::text end
       and vr.record_id=case when rel.from_entity_type::text=p_record_type and rel.from_entity_id=p_record_id then rel.to_entity_id else rel.from_entity_id end
      where rel.workspace_id=p_workspace_id and rel.world_id=p_world_id and rel.canon_state='canon'
        and ((rel.scope='saga' and rel.saga_id=p_saga_id) or (rel.scope='world' and rel.saga_id is null))
        and ((rel.from_entity_type::text=p_record_type and rel.from_entity_id=p_record_id)
          or (rel.to_entity_type::text=p_record_type and rel.to_entity_id=p_record_id))
      order by vr.name,vr.record_id limit 8
    ) x;
  end if;
  if p_record_type='thread' then
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id',o->>'id','text',o->>'text','state',coalesce(o->>'state','open'),
      'order_index',coalesce(nullif(o->>'order_index','')::integer,n::integer-1),'completed_at',o->>'completed_at'
    )) order by coalesce(nullif(o->>'order_index','')::integer,n::integer-1)),'[]'::jsonb)
    into v_objectives
    from public.threads t cross join lateral jsonb_array_elements(coalesce(t.objectives_log,'[]')) with ordinality items(o,n)
    where t.id=p_record_id and t.workspace_id=p_workspace_id and t.world_id=p_world_id
      and ((t.scope='saga' and t.saga_id=p_saga_id) or (t.scope='world' and t.saga_id is null));
  elsif p_record_type='session' then
    select jsonb_strip_nulls(jsonb_build_object(
      'session_number',s.session_number,'status',s.status,'planned_start_at',s.planned_start_at,
      'objective',s.objective,'opening_scene',s.opening_scene,'updated_at',s.updated_at
    )) into v_session from public.sessions s where s.id=p_record_id and s.workspace_id=p_workspace_id
      and s.world_id=p_world_id and s.saga_id=p_saga_id and s.archived_at is null;
  end if;
  return jsonb_build_object(
    'record',jsonb_strip_nulls(jsonb_build_object('record_type',r.record_type,'record_id',r.record_id,
      'name',r.name,'status',r.status,'summary',r.summary,'scope',r.scope,'updated_at',r.updated_at,
      'source_state',case when r.source_id is null then 'unavailable' else 'available' end)),
    'relationships',v_links,'objectives',v_objectives,'session',coalesce(v_session,'{}'::jsonb)
  );
end $$;

create or replace function internal.loom_list_snapshot(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_record_type text,p_status text,p_limit integer
)
returns jsonb language sql stable set search_path=internal,pg_temp as $$
  select jsonb_build_object('record_type',p_record_type,'status_filter',p_status,'count',count(*),
    'records',coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'record_type',r.record_type,'record_id',r.record_id,'name',r.name,'status',r.status,
      'summary',left(r.summary,240),'scope',r.scope,'updated_at',r.updated_at
    )) order by case when r.record_type='session' then r.session_number end desc nulls last,r.name,r.record_id),'[]'::jsonb))
  from (select * from internal.loom_visible_records(p_workspace_id,p_world_id,p_saga_id) v
    where v.record_type=p_record_type and (p_status is null or lower(v.status)=lower(p_status))
    order by case when v.record_type='session' then v.session_number end desc nulls last,v.name,v.record_id
    limit greatest(1,least(coalesce(p_limit,10),20))) r
$$;

create or replace function internal.loom_source_snapshot(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_source_id uuid,p_provenance boolean default false
)
returns jsonb language plpgsql stable security definer set search_path=public,internal,pg_temp as $$
declare s public.sources%rowtype; v_record jsonb:='{}'::jsonb; v_audit jsonb:='[]'::jsonb;
begin
  select * into s from public.sources x where x.id=p_source_id and x.workspace_id=p_workspace_id and x.world_id=p_world_id
    and x.kind<>'imported_text' and ((x.scope='saga' and x.saga_id=p_saga_id) or (x.scope='world' and x.saga_id is null));
  if not found then return '{}'::jsonb; end if;
  if s.source_entity_type is not null and s.source_entity_id is not null then
    v_record:=internal.loom_record_snapshot(p_workspace_id,p_world_id,p_saga_id,s.source_entity_type::text,s.source_entity_id)->'record';
    if p_provenance then
      select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'operation',coalesce(a.change_summary->>'operation',a.action::text,'canon change'),
        'actor_kind',a.actor_kind,'created_at',a.created_at,'source_count',cardinality(a.source_ids)
      )) order by a.created_at desc),'[]'::jsonb) into v_audit
      from (select * from public.canon_audit a where a.workspace_id=p_workspace_id and a.world_id=p_world_id
        and (a.saga_id=p_saga_id or a.saga_id is null) and a.entity_type=s.source_entity_type
        and a.entity_id=s.source_entity_id order by a.created_at desc limit 10) a;
    end if;
  end if;
  return jsonb_build_object('source',jsonb_strip_nulls(jsonb_build_object(
    'kind',s.kind,'excerpt',left(nullif(s.raw_excerpt,''),1200),'created_at',s.created_at,
    'start_seconds',s.start_seconds,'end_seconds',s.end_seconds,'session_id',s.session_id
  )),'record',coalesce(v_record,'{}'::jsonb),'provenance',v_audit,
    'provenance_state',case when p_provenance and jsonb_array_length(v_audit)=0 then 'unavailable' else 'available' end);
end $$;

create or replace function internal.loom_sources_for_record(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_record_type text,p_record_id uuid
)
returns uuid[] language sql stable set search_path=public,internal,pg_temp as $$
  with direct as (
    select r.source_id,0 priority from internal.loom_visible_records(p_workspace_id,p_world_id,p_saga_id) r
    where r.record_type=p_record_type and r.record_id=p_record_id and r.source_id is not null
  ), neighbors as (
    select vr.source_id,1 priority
    from public.relationships rel
    join internal.loom_visible_records(p_workspace_id,p_world_id,p_saga_id) vr
      on vr.record_type=case when rel.from_entity_type::text=p_record_type and rel.from_entity_id=p_record_id then rel.to_entity_type::text else rel.from_entity_type::text end
     and vr.record_id=case when rel.from_entity_type::text=p_record_type and rel.from_entity_id=p_record_id then rel.to_entity_id else rel.from_entity_id end
    where p_record_type<>'session' and rel.workspace_id=p_workspace_id and rel.world_id=p_world_id and rel.canon_state='canon'
      and ((rel.scope='saga' and rel.saga_id=p_saga_id) or (rel.scope='world' and rel.saga_id is null))
      and ((rel.from_entity_type::text=p_record_type and rel.from_entity_id=p_record_id)
        or (rel.to_entity_type::text=p_record_type and rel.to_entity_id=p_record_id))
      and vr.source_id is not null limit 8
  )
  select coalesce(array_agg(source_id order by priority,source_id),'{}'::uuid[])
  from (select distinct on(source_id) source_id,priority from (select * from direct union all select * from neighbors) x
    order by source_id,priority limit 20) y
$$;

create or replace function internal.plan_loom_retrieval(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_gm_id uuid,p_question text
)
returns jsonb language plpgsql stable security definer set search_path=public,internal,pg_temp as $$
declare
  q text:=lower(internal.normalize_guide_question(p_question)); target text; plural text; v_type text;
  destination text; search_query text; matches jsonb:='[]'::jsonb; chosen record; match_count integer:=0;
  action jsonb; sources uuid[]:='{}'::uuid[]; reason text:='semantic_question';
begin
  if not exists(select 1 from public.sagas s join public.workspaces w on w.id=s.workspace_id
    where s.id=p_saga_id and s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and w.owner_gm_id=p_gm_id and s.deleted_at is null) then
    raise exception 'Loom Saga is not available' using errcode='42501';
  end if;

  if q ~ '^(go to|open) (the )?(home|library|threads|sessions|review|approval queue|search)$' then
    destination:=regexp_replace(q,'^(go to|open) (the )?','','');
    if destination='approval queue' then destination:='review'; end if;
    action:=jsonb_build_object('name','navigate_surface','version','1.0.0','arguments',jsonb_build_object('destination',destination));
    return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','surface_navigation','source_ids','[]'::jsonb,'action',action);
  end if;
  if q ~ '^(find|search|look up)( for)? .+' then
    search_query:=btrim(regexp_replace(q,'^(find|search|look up)( for)?[[:space:]]+','',''));
    action:=jsonb_build_object('name','navigate_surface','version','1.0.0','arguments',jsonb_build_object('destination','search','query',left(search_query,200)));
    return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','literal_search_navigation','source_ids','[]'::jsonb,'action',action);
  end if;
  if q ~ '^(list|show)( me)?( all)?( active| planned| ready| resolved| dormant| failed)? (characters|places|factions|artifacts|threads|sessions)$' then
    plural:=regexp_replace(q,'^.* (characters|places|factions|artifacts|threads|sessions)$','\1');
    v_type:=case plural when 'characters' then 'character' when 'places' then 'place' when 'factions' then 'faction'
      when 'artifacts' then 'artifact' when 'threads' then 'thread' else 'session' end;
    target:=nullif((regexp_match(q,' (active|planned|ready|resolved|dormant|failed) '))[1],'');
    action:=jsonb_build_object('name','list_records','version','1.0.0','arguments',jsonb_strip_nulls(jsonb_build_object('record_type',v_type,'status',target,'limit',20)));
    return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','structured_list','source_ids','[]'::jsonb,'action',action);
  end if;

  if q ~ '^(show|list|what are)([[:space:]]+me)?[[:space:]]+(the[[:space:]]+)?(relationships|connections|objectives)[[:space:]]+(for|of)[[:space:]]+.+' then
    target:=btrim(regexp_replace(q,'^(show|list|what are)([[:space:]]+me)?[[:space:]]+(the[[:space:]]+)?(relationships|connections|objectives)[[:space:]]+(for|of)[[:space:]]+','',''));
    reason:=case when q ~ '(objectives)' then 'thread_objectives' else 'relationship_neighborhood' end;
  elsif q ~ '^(show|explain)([[:space:]]+me)?[[:space:]]+(the[[:space:]]+)?(source|sources|provenance)[[:space:]]+(for|behind)[[:space:]]+.+' or q ~ '^why do we know .+' then
    target:=case when q ~ '^why do we know ' then btrim(regexp_replace(q,'^why do we know[[:space:]]+','',''))
      else btrim(regexp_replace(q,'^(show|explain)([[:space:]]+me)?[[:space:]]+(the[[:space:]]+)?(source|sources|provenance)[[:space:]]+(for|behind)[[:space:]]+','','')) end;
    reason:=case when q ~ '(provenance)|^why do we know' then 'provenance' else 'source' end;
  elsif q ~ '^(open|show)([[:space:]]+me)?[[:space:]]+(the[[:space:]]+)?((character|place|faction|artifact|thread|session)[[:space:]]+)?.+' then
    target:=btrim(regexp_replace(q,'^(open|show)([[:space:]]+me)?[[:space:]]+(the[[:space:]]+)?((character|place|faction|artifact|thread|session)[[:space:]]+)?','',''));
    reason:='open_record';
  end if;

  if target is not null then
    select coalesce(jsonb_agg(jsonb_build_object('record_type',r.record_type,'record_id',r.record_id,'name',r.name,'status',r.status)
      order by r.record_type,r.name,r.record_id),'[]'::jsonb),count(*) into matches,match_count
    from internal.loom_visible_records(p_workspace_id,p_world_id,p_saga_id) r
    where lower(r.name)=target or (r.record_type='session' and target ~ '^(session )?[0-9]+$'
      and r.session_number=regexp_replace(target,'^session[[:space:]]+','','')::integer);
    if match_count=1 then
      select * into chosen from internal.loom_visible_records(p_workspace_id,p_world_id,p_saga_id) r
      where r.record_id=(matches->0->>'record_id')::uuid and r.record_type=matches->0->>'record_type';
      sources:=internal.loom_sources_for_record(p_workspace_id,p_world_id,p_saga_id,chosen.record_type,chosen.record_id);
      if reason in ('source','provenance') then
        if chosen.source_id is null then
          return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','provenance_unavailable',
            'source_ids','[]'::jsonb,'guidance','This record is current, but no inspectable provenance source is available.');
        end if;
        action:=jsonb_build_object('name',case when reason='provenance' then 'explain_provenance' else 'show_source' end,
          'version','1.0.0','arguments',jsonb_build_object('source_id',chosen.source_id));
      else
        action:=jsonb_build_object('name','open_record','version','1.0.0','arguments',
          case when chosen.source_id is null then jsonb_build_object('record_type',chosen.record_type,'record_id',chosen.record_id)
            else jsonb_build_object('source_id',chosen.source_id) end);
      end if;
      return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason',reason,
        'source_ids',to_jsonb(sources),'action',action);
    elsif match_count>1 then
      return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','ambiguous_target',
        'source_ids','[]'::jsonb,'choices',matches,'guidance','More than one current record has that name. Choose a type or open the list first.');
    else
      return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','target_not_found',
        'source_ids','[]'::jsonb,'guidance','No current record with that exact name is available in this Saga or its World canon.');
    end if;
  end if;

  select * into chosen from internal.loom_visible_records(p_workspace_id,p_world_id,p_saga_id) r
  where char_length(r.name)>=3 and strpos(q,lower(r.name))>0
  order by char_length(r.name) desc,r.scope desc,r.name,r.record_id limit 1;
  if found then
    sources:=internal.loom_sources_for_record(p_workspace_id,p_world_id,p_saga_id,chosen.record_type,chosen.record_id);
    if cardinality(sources)=0 then
      action:=jsonb_build_object('name','open_record','version','1.0.0','arguments',jsonb_build_object('record_type',chosen.record_type,'record_id',chosen.record_id));
      return jsonb_build_object('strategy','deterministic_read','provider_required',false,'reason','uncited_exact_record',
        'source_ids','[]'::jsonb,'action',action);
    end if;
    if q ~ '(relationship|connection|objective|session|status|provenance)' then
      return jsonb_build_object('strategy','structured','provider_required',true,'reason','structured_record_grounding','source_ids',to_jsonb(sources));
    end if;
    return jsonb_build_object('strategy','exact','provider_required',true,'reason','exact_name_grounding','source_ids',to_jsonb(sources));
  end if;
  if q ~ '"[^\"]+"' or array_length(regexp_split_to_array(q,'[[:space:]]+'),1)<=3 then
    return jsonb_build_object('strategy','lexical','provider_required',true,'reason','literal_or_short_query','source_ids','[]'::jsonb);
  end if;
  return jsonb_build_object('strategy','hybrid','provider_required',true,'reason','semantic_question','source_ids','[]'::jsonb);
end $$;

create or replace function public.plan_loom_retrieval_for_worker(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_gm_id uuid,p_question text
)
returns jsonb language sql stable security definer set search_path=internal,pg_temp as $$
  select internal.plan_loom_retrieval(p_workspace_id,p_world_id,p_saga_id,p_gm_id,p_question)
$$;

create or replace function public.create_loom_deterministic_turn_for_worker(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_gm_id uuid,p_thread_id uuid,
  p_turn_id uuid,p_idempotency_key uuid,p_question text
)
returns jsonb language plpgsql security definer set search_path=public,internal,extensions,pg_temp as $$
declare
  v_question text:=internal.normalize_guide_question(p_question); v_hash text;
  v_plan jsonb; v_thread public.guide_threads%rowtype; v_existing public.guide_turns%rowtype;
  v_turn public.guide_turns%rowtype; v_ordinal integer; v_source_id uuid; v_source public.sources%rowtype;
  v_text text; v_count integer:=0; v_response jsonb; v_action_id uuid;
begin
  v_hash:=encode(extensions.digest(convert_to(v_question,'UTF8'),'sha256'),'hex');
  v_plan:=internal.plan_loom_retrieval(p_workspace_id,p_world_id,p_saga_id,p_gm_id,v_question);
  if coalesce((v_plan->>'provider_required')::boolean,true) or v_plan->>'strategy'<>'deterministic_read' then
    raise exception 'Loom turn is not a deterministic read' using errcode='22023';
  end if;
  select * into v_existing from public.guide_turns where gm_id=p_gm_id and saga_id=p_saga_id and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.question_hash<>v_hash or v_existing.id<>p_turn_id then
      raise exception 'Loom idempotency key was reused with different input' using errcode='23505';
    end if;
    return jsonb_build_object('thread_id',v_existing.thread_id,'turn_id',v_existing.id,'run_id',null,
      'status',v_existing.status,'replayed',true,'deterministic',true);
  end if;
  if p_thread_id is null then
    insert into public.guide_threads(workspace_id,world_id,saga_id,gm_id,title)
    values(p_workspace_id,p_world_id,p_saga_id,p_gm_id,'The Loom') returning * into v_thread;
  else
    select * into v_thread from public.guide_threads where id=p_thread_id for update;
    if not found or v_thread.gm_id<>p_gm_id or v_thread.workspace_id<>p_workspace_id
      or v_thread.world_id<>p_world_id or v_thread.saga_id<>p_saga_id or v_thread.state<>'active' then
      raise exception 'Loom thread is not available in this Saga' using errcode='42501';
    end if;
  end if;
  select coalesce(max(ordinal),0)+1 into v_ordinal from public.guide_turns where thread_id=v_thread.id;
  update public.guide_turns set status='superseded',superseded_at=now(),updated_at=now()
  where thread_id=v_thread.id and status in ('queued','running','retrieval_fallback');
  v_response:=case when v_plan?'action' then jsonb_build_object('no_answer',false,'blocks',jsonb_build_array(
      jsonb_build_object('type','action_preview','action',v_plan->'action','explanation',case v_plan->>'reason'
        when 'structured_list' then 'Show the current scoped records.' when 'surface_navigation' then 'Open this active-Saga surface.'
        when 'literal_search_navigation' then 'Open literal Saga search without semantic retrieval.'
        when 'source' then 'Show the current authorized source.' when 'provenance' then 'Explain the bounded provenance chain.'
        when 'relationship_neighborhood' then 'Open the record with its one-hop relationships.'
        when 'thread_objectives' then 'Open the Thread with its current objectives.' else 'Open the current authorized record.' end)),
      'confidence_reason','direct_gm_input')
    else jsonb_build_object('no_answer',true,'insufficiency_reason','no_relevant_evidence','blocks',jsonb_build_array(
      jsonb_build_object('type','guidance','text',coalesce(v_plan->>'guidance','Refine the exact read request.'))),
      'confidence_reason','ambiguous_source') end;
  insert into public.guide_turns(id,workspace_id,world_id,saga_id,gm_id,thread_id,ordinal,idempotency_key,
    question,question_hash,status,retrieval_mode,response_payload,completed_at)
  values(p_turn_id,p_workspace_id,p_world_id,p_saga_id,p_gm_id,v_thread.id,v_ordinal,p_idempotency_key,
    v_question,v_hash,'complete','deterministic_read',v_response,now()) returning * into v_turn;
  for v_source_id in select value::uuid from jsonb_array_elements_text(coalesce(v_plan->'source_ids','[]'::jsonb)) loop
    exit when v_count>=20;
    select * into v_source from public.sources s where s.id=v_source_id and s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and s.kind<>'imported_text' and ((s.scope='saga' and s.saga_id=p_saga_id) or (s.scope='world' and s.saga_id is null));
    if not found then continue; end if;
    v_text:=internal.guide_source_text(v_source); if v_text is null then continue; end if;
    v_count:=v_count+1;
    insert into internal.guide_evidence_snapshots(turn_id,ordinal,workspace_id,world_id,saga_id,source_id,source_version,
      source_kind,source_entity_type,source_entity_id,title,context_anchor,evidence_text,evidence_hash)
    values(v_turn.id,v_count,p_workspace_id,p_world_id,p_saga_id,v_source.id,
      coalesce(internal.loom_source_current_version(v_source.id),v_source.created_at::text),v_source.kind::text,
      v_source.source_entity_type::text,v_source.source_entity_id,
      coalesce(v_source.source_entity_type::text,replace(v_source.kind::text,'_',' '),'Source'),
      jsonb_strip_nulls(jsonb_build_object('session_id',v_source.session_id,'start_seconds',v_source.start_seconds,'end_seconds',v_source.end_seconds)),
      v_text,encode(extensions.digest(convert_to(v_text,'UTF8'),'sha256'),'hex')) on conflict do nothing;
  end loop;
  if v_plan?'action' then
    v_action_id:=internal.materialize_loom_action_intent(v_turn.id,0,v_plan->'action',v_response->'blocks'->0->>'explanation');
    update public.guide_action_intents set state='accepted',updated_at=now() where id=v_action_id;
  end if;
  update public.guide_threads set title='The Loom',updated_at=now() where id=v_thread.id;
  return jsonb_build_object('thread_id',v_thread.id,'turn_id',v_turn.id,'run_id',null,'status','complete',
    'replayed',false,'deterministic',true,'retrieval_strategy','deterministic_read');
end $$;

create or replace function public.create_loom_provider_turn_for_worker(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_gm_id uuid,p_thread_id uuid,
  p_turn_id uuid,p_idempotency_key uuid,p_question text,p_retrieval_mode text,p_source_ids uuid[]
)
returns jsonb language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare v_base_mode text; v_result jsonb;
begin
  if p_retrieval_mode not in ('hybrid','lexical_fallback','lexical','exact','structured') then
    raise exception 'Loom retrieval mode is invalid' using errcode='22023';
  end if;
  v_base_mode:=case when p_retrieval_mode in ('exact','structured') then 'hybrid'
    when p_retrieval_mode='lexical' then 'lexical_fallback' else p_retrieval_mode end;
  v_result:=public.create_guide_turn_for_worker(p_workspace_id,p_world_id,p_saga_id,p_gm_id,p_thread_id,
    p_turn_id,p_idempotency_key,p_question,v_base_mode,p_source_ids);
  update public.guide_turns set retrieval_mode=p_retrieval_mode
  where id=p_turn_id and gm_id=p_gm_id and workspace_id=p_workspace_id and world_id=p_world_id and saga_id=p_saga_id;
  return v_result||jsonb_build_object('retrieval_strategy',p_retrieval_mode);
end $$;

create or replace function internal.materialize_loom_action_intent(
  p_turn_id uuid,p_block_index integer,p_action jsonb,p_explanation text
)
returns uuid language plpgsql security definer set search_path=public,internal,extensions,pg_temp as $$
declare
  t public.guide_turns%rowtype; c record; e internal.guide_evidence_snapshots%rowtype;
  v_name text; v_version text; v_args jsonb; v_source_id uuid; v_entity_type text; v_intent text;
  v_target_type text; v_target_id uuid; v_target_version text; v_versions jsonb:='{}'::jsonb;
  v_result jsonb:='{}'::jsonb; v_id uuid; v_status text; v_limit integer; v_destination text;
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
    if (v_args?'source_id') and (select count(*) from jsonb_object_keys(v_args))=1 then
      begin v_source_id:=(v_args->>'source_id')::uuid; exception when invalid_text_representation then raise exception 'open_record source is invalid' using errcode='22023'; end;
      select * into e from internal.guide_evidence_snapshots where turn_id=t.id and source_id=v_source_id;
      if not found or e.source_entity_type is null or not(e.source_entity_type=any(c.allowed_target_types)) then
        raise exception 'open_record source is outside the registered target set' using errcode='22023';
      end if;
      v_target_type:=e.source_entity_type; v_target_id:=e.source_entity_id;
      v_target_version:=internal.loom_source_current_version(v_source_id);
      if v_target_version is null then raise exception 'open_record target is unavailable' using errcode='22023'; end if;
      v_versions:=jsonb_build_object(v_source_id::text,v_target_version);
    elsif t.retrieval_mode='deterministic_read' and (select count(*) from jsonb_object_keys(v_args))=2
      and v_args?'record_type' and v_args?'record_id' then
      v_target_type:=v_args->>'record_type';
      begin v_target_id:=(v_args->>'record_id')::uuid; exception when invalid_text_representation then raise exception 'open_record target is invalid' using errcode='22023'; end;
      if not(v_target_type=any(c.allowed_target_types)) then raise exception 'open_record target type is invalid' using errcode='22023'; end if;
      v_target_version:=internal.loom_record_current_version(t.workspace_id,t.world_id,t.saga_id,v_target_type,v_target_id);
      if v_target_version is null then raise exception 'open_record target is unavailable' using errcode='22023'; end if;
    else raise exception 'open_record arguments are invalid' using errcode='22023'; end if;
    v_result:=internal.loom_record_snapshot(t.workspace_id,t.world_id,t.saga_id,v_target_type,v_target_id);
  elsif v_name='list_records' then
    if exists(select 1 from jsonb_object_keys(v_args) k where k not in ('record_type','status','limit'))
      or not(v_args?'record_type') then raise exception 'list_records arguments are invalid' using errcode='22023'; end if;
    v_target_type:=v_args->>'record_type'; v_status:=nullif(btrim(v_args->>'status'),'');
    begin v_limit:=coalesce((v_args->>'limit')::integer,10); exception when others then raise exception 'list_records limit is invalid' using errcode='22023'; end;
    if not(v_target_type=any(c.allowed_target_types)) or v_limit not between 1 and 20
      or (v_status is not null and (char_length(v_status)>40 or v_status!~'^[a-z_ -]+$')) then
      raise exception 'list_records arguments are invalid' using errcode='22023';
    end if;
    v_result:=internal.loom_list_snapshot(t.workspace_id,t.world_id,t.saga_id,v_target_type,v_status,v_limit);
  elsif v_name in ('show_source','explain_provenance') then
    if exists(select 1 from jsonb_object_keys(v_args) k where k<>'source_id') or (select count(*) from jsonb_object_keys(v_args))<>1 then
      raise exception 'Loom source action arguments are invalid' using errcode='22023'; end if;
    begin v_source_id:=(v_args->>'source_id')::uuid; exception when invalid_text_representation then raise exception 'Loom source is invalid' using errcode='22023'; end;
    select * into e from internal.guide_evidence_snapshots where turn_id=t.id and source_id=v_source_id;
    if not found then raise exception 'Loom source is outside the turn evidence' using errcode='22023'; end if;
    v_target_type:=e.source_entity_type; v_target_id:=e.source_entity_id;
    v_target_version:=internal.loom_source_current_version(v_source_id);
    if v_target_version is null then raise exception 'Loom source is unavailable' using errcode='22023'; end if;
    v_versions:=jsonb_build_object(v_source_id::text,v_target_version);
    v_result:=internal.loom_source_snapshot(t.workspace_id,t.world_id,t.saga_id,v_source_id,v_name='explain_provenance');
    if v_result='{}'::jsonb then raise exception 'Loom source is unavailable' using errcode='22023'; end if;
  elsif v_name='navigate_surface' then
    if exists(select 1 from jsonb_object_keys(v_args) k where k not in ('destination','query')) or not(v_args?'destination') then
      raise exception 'navigate_surface arguments are invalid' using errcode='22023'; end if;
    v_destination:=v_args->>'destination';
    if v_destination not in ('home','library','threads','sessions','review','search')
      or (v_args?'query' and (jsonb_typeof(v_args->'query')<>'string' or char_length(v_args->>'query')>200)) then
      raise exception 'navigate_surface arguments are invalid' using errcode='22023'; end if;
    v_result:=jsonb_strip_nulls(jsonb_build_object('destination',v_destination,'query',nullif(v_args->>'query','')));
  elsif v_name='draft_entity' then
    if exists(select 1 from jsonb_object_keys(v_args) k where k not in ('entity_type','intent')) or (select count(*) from jsonb_object_keys(v_args))<>2 then
      raise exception 'draft_entity arguments are invalid' using errcode='22023'; end if;
    v_entity_type:=v_args->>'entity_type'; v_intent:=normalize(coalesce(v_args->>'intent',''),NFKC);
    if not(v_entity_type=any(c.allowed_target_types)) or char_length(btrim(v_intent)) not between 1 and 500
      or v_intent~*'(delete[[:space:]]+from|drop[[:space:]]+table|execute[[:space:]]+rpc|bypass[[:space:]]+(approval|confirmation)|publish[[:space:]]+automatically)' then
      raise exception 'draft_entity arguments are invalid' using errcode='22023'; end if;
    v_target_type:=v_entity_type;
    for e in select * from internal.guide_evidence_snapshots where turn_id=t.id order by ordinal loop
      v_target_version:=internal.loom_source_current_version(e.source_id);
      if v_target_version is null then raise exception 'draft_entity evidence is unavailable' using errcode='22023'; end if;
      v_versions:=v_versions||jsonb_build_object(e.source_id::text,v_target_version);
    end loop;
    if v_versions='{}'::jsonb then raise exception 'draft_entity requires current evidence' using errcode='22023'; end if;
  else raise exception 'Loom action is not registered' using errcode='22023'; end if;

  insert into public.guide_action_intents(workspace_id,world_id,saga_id,gm_id,thread_id,turn_id,block_index,
    action_type,action_version,arguments,authority_tier,confirmation_policy,execution_kind,target_type,target_id,
    target_version,evidence_versions,cost_snapshot,effect_summary,manual_fallback,source_id,entity_type,intent,
    explanation,result_snapshot,state)
  values(t.workspace_id,t.world_id,t.saga_id,t.gm_id,t.thread_id,t.id,p_block_index,v_name,v_version,v_args,
    c.authority_tier,c.confirmation_policy,c.execution_kind,v_target_type,v_target_id,v_target_version,v_versions,
    jsonb_strip_nulls(jsonb_build_object('ai_credits',c.ai_credits,'task_name',c.downstream_task_name)),
    c.effect_summary,c.manual_fallback,v_source_id,
    case when v_entity_type is null then null else v_entity_type::public.entity_type end,v_intent,p_explanation,v_result,
    case when c.authority_tier='read_navigation' then 'accepted' else 'pending' end)
  on conflict(turn_id,block_index) do update set updated_at=public.guide_action_intents.updated_at
  returning id into v_id;
  return v_id;
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
      'receipt_id',a.execution_receipt_id,'state',case
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
  ('answer_saga_question','answer_saga_question@1.3.0','light',1::numeric,'relic-balanced','sanctum_qa_grounding','canon_only','ephemeral',true),
  ('propose_quick_stub_fleshing','propose_quick_stub_fleshing@1.0.0','light',1::numeric,'relic-balanced','post_session_synthesis','canon_plus_untrusted_input','ephemeral',true)
$$;

revoke all on function internal.loom_visible_records(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function internal.loom_record_current_version(uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function internal.loom_record_snapshot(uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function internal.loom_list_snapshot(uuid,uuid,uuid,text,text,integer) from public,anon,authenticated;
revoke all on function internal.loom_source_snapshot(uuid,uuid,uuid,uuid,boolean) from public,anon,authenticated;
revoke all on function internal.loom_sources_for_record(uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function internal.plan_loom_retrieval(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.plan_loom_retrieval_for_worker(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.create_loom_deterministic_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.create_loom_provider_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid[]) from public,anon,authenticated;
grant execute on function public.plan_loom_retrieval_for_worker(uuid,uuid,uuid,uuid,text) to service_role;
grant execute on function public.create_loom_deterministic_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text) to service_role;
grant execute on function public.create_loom_provider_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,uuid[]) to service_role;
