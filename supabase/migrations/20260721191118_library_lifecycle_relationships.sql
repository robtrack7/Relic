set check_function_bodies = off;

alter table public.mentions add column if not exists snoozed_until timestamptz;

create unique index if not exists relationships_saga_edge_unique
on public.relationships (workspace_id, world_id, saga_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, kind)
where scope = 'saga';

create unique index if not exists relationships_world_edge_unique
on public.relationships (workspace_id, world_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, kind)
where scope = 'world';

create unique index if not exists mentions_saga_pair_unique
on public.mentions (workspace_id, world_id, saga_id, source_entity_type, source_entity_id, mentioned_entity_type, mentioned_entity_id)
where scope = 'saga';

create unique index if not exists mentions_world_pair_unique
on public.mentions (workspace_id, world_id, source_entity_type, source_entity_id, mentioned_entity_type, mentioned_entity_id)
where scope = 'world';

create unique index if not exists note_attachments_saga_pair_unique
on public.note_attachments (workspace_id, world_id, saga_id, note_id, entity_type, entity_id)
where scope = 'saga';

create unique index if not exists note_attachments_world_pair_unique
on public.note_attachments (workspace_id, world_id, note_id, entity_type, entity_id)
where scope = 'world';

create or replace function internal.library_table(p_entity_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_entity_type
    when 'character' then 'characters'
    when 'place' then 'places'
    when 'faction' then 'factions'
    when 'artifact' then 'artifacts'
    when 'thread' then 'threads'
    when 'note' then 'notes'
    else null
  end;
$$;

create or replace function internal.library_record(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  table_name text := internal.library_table(p_entity_type);
  result jsonb;
begin
  if table_name is null then
    raise exception 'Unsupported Library record type' using errcode = '23514';
  end if;

  if p_entity_type = 'note' then
    select jsonb_build_object(
      'id', n.id, 'entityType', 'note', 'workspace_id', n.workspace_id, 'world_id', n.world_id,
      'saga_id', n.saga_id, 'scope', n.scope, 'name', coalesce(nullif(n.title, ''), 'Untitled note'),
      'summary', left(n.body, 180), 'narrative', n.body, 'gm_notes', null, 'status', null,
      'canon_state', n.canon_state, 'is_stub', false, 'note_type', n.note_type,
      'created_by', n.created_by, 'created_at', n.created_at, 'updated_at', n.updated_at
    ) into result
    from public.notes n
    where n.id = p_entity_id and n.workspace_id = p_workspace_id and n.world_id = p_world_id
      and (n.saga_id = p_saga_id or (n.scope = 'world' and n.saga_id is null));
  else
    execute format(
      'select to_jsonb(e) || jsonb_build_object(''entityType'', $1) from public.%I e where e.id=$2 and e.workspace_id=$3 and e.world_id=$4 and (e.saga_id=$5 or (e.scope=''world'' and e.saga_id is null))',
      table_name
    ) into result using p_entity_type, p_entity_id, p_workspace_id, p_world_id, p_saga_id;
  end if;

  return result;
end;
$$;

create or replace function internal.library_candidates(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid
)
returns table(entity_type text, entity_id uuid, name text, scope public.content_scope, saga_id uuid, canon_state public.entity_canon_state)
language sql
security definer
stable
set search_path = ''
as $$
  select 'character', e.id, e.name, e.scope, e.saga_id, e.canon_state from public.characters e where e.workspace_id=$1 and e.world_id=$2 and (e.saga_id=$3 or (e.scope='world' and e.saga_id is null))
  union all select 'place', e.id, e.name, e.scope, e.saga_id, e.canon_state from public.places e where e.workspace_id=$1 and e.world_id=$2 and (e.saga_id=$3 or (e.scope='world' and e.saga_id is null))
  union all select 'faction', e.id, e.name, e.scope, e.saga_id, e.canon_state from public.factions e where e.workspace_id=$1 and e.world_id=$2 and (e.saga_id=$3 or (e.scope='world' and e.saga_id is null))
  union all select 'artifact', e.id, e.name, e.scope, e.saga_id, e.canon_state from public.artifacts e where e.workspace_id=$1 and e.world_id=$2 and (e.saga_id=$3 or (e.scope='world' and e.saga_id is null))
  union all select 'thread', e.id, e.name, e.scope, e.saga_id, e.canon_state from public.threads e where e.workspace_id=$1 and e.world_id=$2 and (e.saga_id=$3 or (e.scope='world' and e.saga_id is null))
  union all select 'note', e.id, coalesce(nullif(e.title,''),'Untitled note'), e.scope, e.saga_id, e.canon_state from public.notes e where e.workspace_id=$1 and e.world_id=$2 and (e.saga_id=$3 or (e.scope='world' and e.saga_id is null));
$$;

create or replace function internal.library_dependency_summary(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  with counts as (
    select
      (select count(*) from public.relationships r where r.workspace_id=$1 and r.world_id=$2 and (r.saga_id=$3 or r.saga_id is null) and ((r.from_entity_type::text=$4 and r.from_entity_id=$5) or (r.to_entity_type::text=$4 and r.to_entity_id=$5))) relationships,
      (select count(*) from public.mentions m where m.workspace_id=$1 and m.world_id=$2 and (m.saga_id=$3 or m.saga_id is null) and m.state in ('suggested','accepted') and ((m.source_entity_type::text=$4 and m.source_entity_id=$5) or (m.mentioned_entity_type::text=$4 and m.mentioned_entity_id=$5))) mentions,
      (select count(*) from public.note_attachments a where a.workspace_id=$1 and a.world_id=$2 and (a.saga_id=$3 or a.saga_id is null) and ((a.note_id=$5 and $4='note') or (a.entity_type::text=$4 and a.entity_id=$5))) note_attachments,
      (select count(*) from public.session_pinned_entities p where p.workspace_id=$1 and p.world_id=$2 and p.saga_id=$3 and p.entity_type::text=$4 and p.entity_id=$5) session_pins,
      (select count(*) from public.session_active_threads t where t.workspace_id=$1 and t.world_id=$2 and t.saga_id=$3 and $4='thread' and t.thread_id=$5) thread_activations,
      (select count(*) from public.drafts d where d.workspace_id=$1 and d.world_id=$2 and (d.saga_id=$3 or d.saga_id is null) and d.entity_type::text=$4 and d.target_entity_id=$5 and d.state='pending') pending_drafts
  )
  select jsonb_build_object(
    'total', relationships + mentions + note_attachments + session_pins + thread_activations + pending_drafts,
    'relationships', relationships, 'mentions', mentions, 'note_attachments', note_attachments,
    'session_pins', session_pins, 'thread_activations', thread_activations, 'pending_drafts', pending_drafts
  ) from counts;
$$;

create or replace function internal.regex_escape(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(p_value, '([\\.\\^\\$\\|\\(\\)\\[\\]\\{\\}\\*\\+\\?\\\\-])', '\\\1', 'g');
$$;

create or replace function internal.refresh_exact_mentions(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_scope public.content_scope,
  p_source_entity_type text,
  p_source_entity_id uuid,
  p_text text,
  p_source_archived boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  row_saga_id uuid := case when p_scope='world' then null else p_saga_id end;
  pattern text;
begin
  delete from public.mentions m
  where m.workspace_id=p_workspace_id and m.world_id=p_world_id
    and m.source_entity_type::text=p_source_entity_type and m.source_entity_id=p_source_entity_id
    and (m.state='suggested' or (m.state='snoozed' and m.snoozed_until<=now()));

  if p_source_archived or nullif(trim(coalesce(p_text,'')), '') is null then return; end if;
  if exists (
    select 1 from public.sessions s where s.workspace_id=p_workspace_id and s.world_id=p_world_id
      and (p_scope='world' or s.saga_id=p_saga_id) and s.status in ('in_progress','ended_pending_undo')
  ) then return; end if;

  for candidate in
    select c.* from internal.library_candidates(p_workspace_id,p_world_id,p_saga_id) c
    where c.canon_state='canon' and c.entity_type <> 'note'
      and not (c.entity_type=p_source_entity_type and c.entity_id=p_source_entity_id)
      and (p_scope='saga' or c.scope='world')
  loop
    pattern := '(^|[^[:alnum:]_])' || internal.regex_escape(lower(candidate.name)) || '([^[:alnum:]_]|$)';
    if lower(p_text) ~ pattern and not exists (
      select 1 from public.mentions m where m.workspace_id=p_workspace_id and m.world_id=p_world_id
        and m.saga_id is not distinct from row_saga_id and m.source_entity_type::text=p_source_entity_type
        and m.source_entity_id=p_source_entity_id and m.mentioned_entity_type::text=candidate.entity_type
        and m.mentioned_entity_id=candidate.entity_id
    ) then
      insert into public.mentions(workspace_id,world_id,saga_id,scope,source_entity_type,source_entity_id,mentioned_entity_type,mentioned_entity_id,mention_text,state)
      values(p_workspace_id,p_world_id,row_saga_id,p_scope,p_source_entity_type::public.entity_type,p_source_entity_id,candidate.entity_type::public.entity_type,candidate.entity_id,candidate.name,'suggested');
    end if;
  end loop;
end;
$$;

create or replace function internal.detect_library_mentions_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_type text := case tg_table_name when 'characters' then 'character' when 'places' then 'place' when 'factions' then 'faction' when 'artifacts' then 'artifact' when 'threads' then 'thread' when 'notes' then 'note' end;
  body text;
begin
  if tg_table_name='notes' then body := concat_ws(' ',new.title,new.body);
  else body := concat_ws(' ',new.summary,new.narrative,new.gm_notes); end if;
  perform internal.refresh_exact_mentions(new.workspace_id,new.world_id,new.saga_id,new.scope,source_type,new.id,body,new.canon_state='archived');
  return new;
end;
$$;

drop trigger if exists detect_character_mentions on public.characters;
create trigger detect_character_mentions after insert or update of summary,narrative,gm_notes,canon_state on public.characters for each row execute function internal.detect_library_mentions_trigger();
drop trigger if exists detect_place_mentions on public.places;
create trigger detect_place_mentions after insert or update of summary,narrative,gm_notes,canon_state on public.places for each row execute function internal.detect_library_mentions_trigger();
drop trigger if exists detect_faction_mentions on public.factions;
create trigger detect_faction_mentions after insert or update of summary,narrative,gm_notes,canon_state on public.factions for each row execute function internal.detect_library_mentions_trigger();
drop trigger if exists detect_artifact_mentions on public.artifacts;
create trigger detect_artifact_mentions after insert or update of summary,narrative,gm_notes,canon_state on public.artifacts for each row execute function internal.detect_library_mentions_trigger();
drop trigger if exists detect_thread_mentions on public.threads;
create trigger detect_thread_mentions after insert or update of summary,narrative,gm_notes,canon_state on public.threads for each row execute function internal.detect_library_mentions_trigger();
drop trigger if exists detect_note_mentions on public.notes;
create trigger detect_note_mentions after insert or update of title,body,canon_state on public.notes for each row execute function internal.detect_library_mentions_trigger();

create or replace function public.archive_entity(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  entity_type text,
  entity_id uuid,
  expected_version timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  record_row jsonb;
  table_name text := internal.library_table(entity_type);
  source_id uuid;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  if table_name is null then raise exception 'Unsupported Library record type' using errcode='23514'; end if;
  if expected_version is null then raise exception 'expected_version is required' using errcode='22023'; end if;
  record_row := internal.library_record(workspace_id,world_id,saga_id,entity_type,entity_id);
  if record_row is null then raise exception 'Entity is not available' using errcode='42501'; end if;
  if (record_row->>'updated_at')::timestamptz <> expected_version then raise exception 'conflict: expected_version does not match live entity version' using errcode='40001'; end if;
  if record_row->>'canon_state'='archived' then return entity_id; end if;

  execute format('update public.%I set canon_state=''archived'', updated_at=now() where id=$1',table_name) using entity_id;
  source_id := public.write_manual_canon_source(workspace_id,world_id,(record_row->>'saga_id')::uuid,(record_row->>'scope')::public.content_scope,entity_type,entity_id,'archive','{}'::jsonb);
  perform public.write_manual_canon_audit(workspace_id,world_id,(record_row->>'saga_id')::uuid,(record_row->>'scope')::public.content_scope,entity_type,entity_id,'canon','archived','archive',source_id,'{}'::jsonb);
  return entity_id;
end;
$$;

create or replace function public.restore_entity(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  entity_type text,
  entity_id uuid,
  expected_version timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  record_row jsonb;
  table_name text := internal.library_table(entity_type);
  source_id uuid;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  if table_name is null then raise exception 'Unsupported Library record type' using errcode='23514'; end if;
  if expected_version is null then raise exception 'expected_version is required' using errcode='22023'; end if;
  record_row := internal.library_record(workspace_id,world_id,saga_id,entity_type,entity_id);
  if record_row is null then raise exception 'Entity is not available' using errcode='42501'; end if;
  if (record_row->>'updated_at')::timestamptz <> expected_version then raise exception 'conflict: expected_version does not match live entity version' using errcode='40001'; end if;
  if record_row->>'canon_state'<>'archived' then raise exception 'Only archived records can be restored' using errcode='23514'; end if;

  execute format('update public.%I set canon_state=''canon'', updated_at=now() where id=$1',table_name) using entity_id;
  source_id := public.write_manual_canon_source(workspace_id,world_id,(record_row->>'saga_id')::uuid,(record_row->>'scope')::public.content_scope,entity_type,entity_id,'restore','{}'::jsonb);
  perform public.write_manual_canon_audit(workspace_id,world_id,(record_row->>'saga_id')::uuid,(record_row->>'scope')::public.content_scope,entity_type,entity_id,'archived','canon','restore',source_id,'{}'::jsonb);
  return entity_id;
end;
$$;

create or replace function public.hard_delete_entity(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  entity_type text,
  entity_id uuid,
  expected_version timestamptz,
  confirmation_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  record_row jsonb;
  blockers jsonb;
  table_name text := internal.library_table(entity_type);
  source_id uuid;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  if table_name is null then raise exception 'Unsupported Library record type' using errcode='23514'; end if;
  record_row := internal.library_record(workspace_id,world_id,saga_id,entity_type,entity_id);
  if record_row is null then raise exception 'Entity is not available' using errcode='42501'; end if;
  if expected_version is null or (record_row->>'updated_at')::timestamptz <> expected_version then raise exception 'conflict: expected_version does not match live entity version' using errcode='40001'; end if;
  if record_row->>'canon_state'<>'archived' then raise exception 'Only archived records can be permanently deleted' using errcode='23514'; end if;
  if confirmation_name is distinct from record_row->>'name' then raise exception 'confirmation name does not match the archived record' using errcode='22023'; end if;
  blockers := internal.library_dependency_summary(workspace_id,world_id,saga_id,entity_type,entity_id);
  if (blockers->>'total')::bigint > 0 then raise exception 'record still has references: %',blockers using errcode='23503'; end if;

  source_id := public.write_manual_canon_source(workspace_id,world_id,(record_row->>'saga_id')::uuid,(record_row->>'scope')::public.content_scope,entity_type,entity_id,'hard_delete','{}'::jsonb);
  perform public.write_manual_canon_audit(workspace_id,world_id,(record_row->>'saga_id')::uuid,(record_row->>'scope')::public.content_scope,entity_type,entity_id,'archived','archived','hard_delete',source_id,jsonb_build_object('name',record_row->>'name'));
  update public.sources s set source_entity_type=null,source_entity_id=null where s.workspace_id=workspace_id and s.world_id=world_id and s.source_entity_type::text=entity_type and s.source_entity_id=entity_id;
  delete from public.embeddings e where e.workspace_id=workspace_id and e.world_id=world_id and e.source_entity_type::text=entity_type and e.source_entity_id=entity_id;
  execute format('delete from public.%I where id=$1',table_name) using entity_id;
  return jsonb_build_object('deleted',true,'id',entity_id,'name',record_row->>'name');
end;
$$;

create or replace function public.create_relationship(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  from_entity_type text,
  from_entity_id uuid,
  to_entity_type text,
  to_entity_id uuid,
  relationship_kind public.relationship_kind,
  relationship_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  from_row jsonb;
  to_row jsonb;
  row_scope public.content_scope;
  row_saga_id uuid;
  relation public.relationships%rowtype;
  source_id uuid;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  if from_entity_type='note' or to_entity_type='note' then raise exception 'Use Note attachments for Note links' using errcode='23514'; end if;
  if from_entity_type=to_entity_type and from_entity_id=to_entity_id then raise exception 'A record cannot relate to itself' using errcode='23514'; end if;
  from_row:=internal.library_record(workspace_id,world_id,saga_id,from_entity_type,from_entity_id);
  to_row:=internal.library_record(workspace_id,world_id,saga_id,to_entity_type,to_entity_id);
  if from_row is null or to_row is null or from_row->>'canon_state'<>'canon' or to_row->>'canon_state'<>'canon' then raise exception 'relationship endpoint is outside active canon scope' using errcode='23514'; end if;
  row_scope:=case when from_row->>'scope'='world' and to_row->>'scope'='world' then 'world'::public.content_scope else 'saga'::public.content_scope end;
  row_saga_id:=case when row_scope='world' then null else saga_id end;

  select * into relation from public.relationships r where r.workspace_id=workspace_id and r.world_id=world_id and r.saga_id is not distinct from row_saga_id and r.kind=relationship_kind and (
    (r.from_entity_type::text=from_entity_type and r.from_entity_id=from_entity_id and r.to_entity_type::text=to_entity_type and r.to_entity_id=to_entity_id)
    or (relationship_kind in ('allied-with','opposed-to','related-to') and r.from_entity_type::text=to_entity_type and r.from_entity_id=to_entity_id and r.to_entity_type::text=from_entity_type and r.to_entity_id=from_entity_id)
  );
  if relation.id is null then
    insert into public.relationships(workspace_id,world_id,saga_id,scope,from_entity_type,from_entity_id,to_entity_type,to_entity_id,kind,notes)
    values(workspace_id,world_id,row_saga_id,row_scope,from_entity_type::public.entity_type,from_entity_id,to_entity_type::public.entity_type,to_entity_id,relationship_kind,nullif(trim(relationship_notes),'')) returning * into relation;
    source_id:=public.write_manual_canon_source(workspace_id,world_id,row_saga_id,row_scope,from_entity_type,from_entity_id,'relationship',jsonb_build_object('to_type',to_entity_type,'to_id',to_entity_id,'kind',relationship_kind));
    insert into public.relationship_sources(workspace_id,world_id,saga_id,scope,relationship_id,source_id) values(workspace_id,world_id,row_saga_id,row_scope,relation.id,source_id);
  end if;
  return to_jsonb(relation);
end;
$$;

create or replace function public.delete_relationship(workspace_id uuid,world_id uuid,saga_id uuid,relationship_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare deleted_id uuid;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  delete from public.relationships r where r.id=relationship_id and r.workspace_id=workspace_id and r.world_id=world_id and (r.saga_id=saga_id or (r.scope='world' and r.saga_id is null)) returning id into deleted_id;
  if deleted_id is null then raise exception 'Relationship is not available' using errcode='42501'; end if;
  return jsonb_build_object('deleted',true,'id',deleted_id);
end; $$;

create or replace function public.resolve_mention(workspace_id uuid,world_id uuid,saga_id uuid,mention_id uuid,resolution public.mention_state)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare mention_row public.mentions%rowtype;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  if resolution not in ('accepted','dismissed') then raise exception 'Mention resolution must be accepted or dismissed' using errcode='23514'; end if;
  update public.mentions m set state=case when resolution='dismissed' then 'snoozed'::public.mention_state else resolution end,snoozed_until=case when resolution='dismissed' then now()+interval '7 days' else null end,updated_at=now() where m.id=mention_id and m.workspace_id=workspace_id and m.world_id=world_id and (m.saga_id=saga_id or (m.scope='world' and m.saga_id is null)) returning * into mention_row;
  if mention_row.id is null then raise exception 'Mention is not available' using errcode='42501'; end if;
  return to_jsonb(mention_row);
end; $$;

create or replace function public.create_note_attachment(workspace_id uuid,world_id uuid,saga_id uuid,note_id uuid,target_entity_type text,target_entity_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare note_row jsonb; target_row jsonb; row_scope public.content_scope; row_saga_id uuid; attachment public.note_attachments%rowtype;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  if target_entity_type='note' or internal.library_table(target_entity_type) is null then raise exception 'Unsupported Note attachment target' using errcode='23514'; end if;
  note_row:=internal.library_record(workspace_id,world_id,saga_id,'note',note_id); target_row:=internal.library_record(workspace_id,world_id,saga_id,target_entity_type,target_entity_id);
  if note_row is null or target_row is null or note_row->>'canon_state'<>'canon' or target_row->>'canon_state'<>'canon' then raise exception 'Note attachment endpoint is outside active canon scope' using errcode='23514'; end if;
  row_scope:=case when note_row->>'scope'='world' and target_row->>'scope'='world' then 'world'::public.content_scope else 'saga'::public.content_scope end; row_saga_id:=case when row_scope='world' then null else saga_id end;
  select * into attachment from public.note_attachments a where a.workspace_id=workspace_id and a.world_id=world_id and a.saga_id is not distinct from row_saga_id and a.note_id=note_id and a.entity_type::text=target_entity_type and a.entity_id=target_entity_id;
  if attachment.id is null then insert into public.note_attachments(workspace_id,world_id,saga_id,scope,note_id,entity_type,entity_id) values(workspace_id,world_id,row_saga_id,row_scope,note_id,target_entity_type::public.entity_type,target_entity_id) returning * into attachment; end if;
  return to_jsonb(attachment)||jsonb_build_object('target_name',target_row->>'name');
end; $$;

create or replace function public.delete_note_attachment(workspace_id uuid,world_id uuid,saga_id uuid,attachment_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare deleted_id uuid;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  delete from public.note_attachments a where a.id=attachment_id and a.workspace_id=workspace_id and a.world_id=world_id and (a.saga_id=saga_id or (a.scope='world' and a.saga_id is null)) returning id into deleted_id;
  if deleted_id is null then raise exception 'Note attachment is not available' using errcode='42501'; end if;
  return jsonb_build_object('deleted',true,'id',deleted_id);
end; $$;

create or replace function public.get_library_record_detail(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  entity_type text,
  entity_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
#variable_conflict use_variable
declare
  record_row jsonb;
  provenance_rows jsonb;
  relationship_rows jsonb;
  mention_rows jsonb;
  backlink_rows jsonb;
  candidate_rows jsonb;
  blockers jsonb;
begin
  perform public.assert_saga_access(workspace_id,world_id,saga_id);
  record_row:=internal.library_record(workspace_id,world_id,saga_id,entity_type,entity_id);
  if record_row is null then raise exception 'Library record is not available' using errcode='42501'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'operation',coalesce(a.change_summary->>'operation',a.action::text,'canon change'),
    'actor_kind',a.actor_kind,'from_state',a.from_state,'to_state',a.to_state,'created_at',a.created_at,
    'sources',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'kind',s.kind,'excerpt',nullif(s.raw_excerpt,''),'created_at',s.created_at) order by s.created_at) from unnest(a.source_ids) source_id join public.sources s on s.id=source_id),'[]'::jsonb)
  ) order by a.created_at desc),'[]'::jsonb) into provenance_rows
  from public.canon_audit a where a.workspace_id=workspace_id and a.world_id=world_id and (a.saga_id=saga_id or a.saga_id is null) and a.entity_type::text=entity_type and a.entity_id=entity_id;

  select coalesce(jsonb_agg(item order by item->>'created_at'),'[]'::jsonb) into relationship_rows from (
    select jsonb_build_object(
      'link_type','relationship','id',r.id,'kind',r.kind,'notes',r.notes,'created_at',r.created_at,
      'direction',case when r.from_entity_type::text=entity_type and r.from_entity_id=entity_id then 'outbound' else 'inbound' end,
      'related_type',case when r.from_entity_type::text=entity_type and r.from_entity_id=entity_id then r.to_entity_type::text else r.from_entity_type::text end,
      'related_id',case when r.from_entity_type::text=entity_type and r.from_entity_id=entity_id then r.to_entity_id else r.from_entity_id end,
      'related_name',internal.library_record(workspace_id,world_id,saga_id,
        case when r.from_entity_type::text=entity_type and r.from_entity_id=entity_id then r.to_entity_type::text else r.from_entity_type::text end,
        case when r.from_entity_type::text=entity_type and r.from_entity_id=entity_id then r.to_entity_id else r.from_entity_id end)->>'name'
    ) item from public.relationships r where r.workspace_id=workspace_id and r.world_id=world_id and (r.saga_id=saga_id or r.saga_id is null) and ((r.from_entity_type::text=entity_type and r.from_entity_id=entity_id) or (r.to_entity_type::text=entity_type and r.to_entity_id=entity_id))
    union all
    select jsonb_build_object(
      'link_type','note_attachment','id',a.id,'kind','attached-to','notes',null,'created_at',a.created_at,'direction',case when entity_type='note' then 'outbound' else 'inbound' end,
      'related_type',case when entity_type='note' then a.entity_type::text else 'note' end,
      'related_id',case when entity_type='note' then a.entity_id else a.note_id end,
      'related_name',internal.library_record(workspace_id,world_id,saga_id,case when entity_type='note' then a.entity_type::text else 'note' end,case when entity_type='note' then a.entity_id else a.note_id end)->>'name'
    ) item from public.note_attachments a where a.workspace_id=workspace_id and a.world_id=world_id and (a.saga_id=saga_id or a.saga_id is null) and ((entity_type='note' and a.note_id=entity_id) or (entity_type<>'note' and a.entity_type::text=entity_type and a.entity_id=entity_id))
  ) links;

  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'state',m.state,'mention_text',m.mention_text,'related_type',m.mentioned_entity_type,'related_id',m.mentioned_entity_id,'related_name',internal.library_record(workspace_id,world_id,saga_id,m.mentioned_entity_type::text,m.mentioned_entity_id)->>'name','snoozed_until',m.snoozed_until,'updated_at',m.updated_at) order by m.updated_at desc),'[]'::jsonb) into mention_rows
  from public.mentions m where m.workspace_id=workspace_id and m.world_id=world_id and (m.saga_id=saga_id or m.saga_id is null) and m.source_entity_type::text=entity_type and m.source_entity_id=entity_id;

  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'state',m.state,'mention_text',m.mention_text,'source_type',m.source_entity_type,'source_id',m.source_entity_id,'source_name',internal.library_record(workspace_id,world_id,saga_id,m.source_entity_type::text,m.source_entity_id)->>'name','updated_at',m.updated_at) order by m.updated_at desc),'[]'::jsonb) into backlink_rows
  from public.mentions m where m.workspace_id=workspace_id and m.world_id=world_id and (m.saga_id=saga_id or m.saga_id is null) and m.mentioned_entity_type::text=entity_type and m.mentioned_entity_id=entity_id and m.state='accepted';

  select coalesce(jsonb_agg(jsonb_build_object('entityType',c.entity_type,'id',c.entity_id,'name',c.name,'scope',c.scope) order by c.entity_type,c.name),'[]'::jsonb) into candidate_rows
  from internal.library_candidates(workspace_id,world_id,saga_id) c where c.canon_state='canon' and not(c.entity_type=entity_type and c.entity_id=entity_id);

  blockers:=internal.library_dependency_summary(workspace_id,world_id,saga_id,entity_type,entity_id);
  return jsonb_build_object(
    'record',record_row,'provenance',provenance_rows,'relationships',relationship_rows,
    'mentions',mention_rows,'backlinks',backlink_rows,'candidates',candidate_rows,
    'delete_blockers',blockers,'can_hard_delete',(record_row->>'canon_state'='archived' and (blockers->>'total')::bigint=0)
  );
end;
$$;

revoke all on function internal.library_table(text) from public,anon,authenticated;
revoke all on function internal.library_record(uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function internal.library_candidates(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function internal.library_dependency_summary(uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function internal.regex_escape(text) from public,anon,authenticated;
revoke all on function internal.refresh_exact_mentions(uuid,uuid,uuid,public.content_scope,text,uuid,text,boolean) from public,anon,authenticated;
revoke all on function internal.detect_library_mentions_trigger() from public,anon,authenticated;

revoke all on function public.restore_entity(uuid,uuid,uuid,text,uuid,timestamptz) from public,anon;
revoke all on function public.hard_delete_entity(uuid,uuid,uuid,text,uuid,timestamptz,text) from public,anon;
revoke all on function public.create_relationship(uuid,uuid,uuid,text,uuid,text,uuid,public.relationship_kind,text) from public,anon;
revoke all on function public.delete_relationship(uuid,uuid,uuid,uuid) from public,anon;
revoke all on function public.resolve_mention(uuid,uuid,uuid,uuid,public.mention_state) from public,anon;
revoke all on function public.create_note_attachment(uuid,uuid,uuid,uuid,text,uuid) from public,anon;
revoke all on function public.delete_note_attachment(uuid,uuid,uuid,uuid) from public,anon;
revoke all on function public.get_library_record_detail(uuid,uuid,uuid,text,uuid) from public,anon;

grant execute on function public.restore_entity(uuid,uuid,uuid,text,uuid,timestamptz) to authenticated;
grant execute on function public.hard_delete_entity(uuid,uuid,uuid,text,uuid,timestamptz,text) to authenticated;
grant execute on function public.create_relationship(uuid,uuid,uuid,text,uuid,text,uuid,public.relationship_kind,text) to authenticated;
grant execute on function public.delete_relationship(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.resolve_mention(uuid,uuid,uuid,uuid,public.mention_state) to authenticated;
grant execute on function public.create_note_attachment(uuid,uuid,uuid,uuid,text,uuid) to authenticated;
grant execute on function public.delete_note_attachment(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.get_library_record_detail(uuid,uuid,uuid,text,uuid) to authenticated;
