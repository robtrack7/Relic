alter type public.source_kind add value if not exists 'imported_text';

do $$ begin
  create type public.import_lifecycle_state as enum ('draft', 'validating', 'uploading', 'extracting', 'ready_for_review', 'failed', 'rejected', 'archived');
exception when duplicate_object then null;
end $$;

alter table public.sources
  add column if not exists uploader_id uuid,
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists byte_size bigint,
  add column if not exists ingestion_method text,
  add column if not exists content_sha256 text,
  add column if not exists import_state public.import_lifecycle_state,
  add column if not exists failure_code text,
  add column if not exists ready_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.sources drop constraint if exists sources_import_contract_check;
alter table public.sources add constraint sources_import_contract_check check (
  kind::text <> 'imported_text' or (
    scope = 'saga' and saga_id is not null and uploader_id is not null
    and ingestion_method in ('paste', 'plain_text_file', 'markdown_file')
    and mime_type in ('text/plain', 'text/markdown')
    and byte_size >= 1 and content_sha256 ~ '^[0-9a-f]{64}$'
    and import_state is not null and ready_at is not null
    and source_entity_type is null and source_entity_id is null and note_id is null and transcript_id is null and session_id is null
  )
);

create unique index if not exists sources_import_content_dedupe_idx
on public.sources(workspace_id, world_id, saga_id, uploader_id, content_sha256);
create index if not exists sources_import_review_idx
on public.sources(workspace_id, world_id, saga_id, import_state, created_at desc);

create or replace function public.protect_import_source_provenance()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.kind = 'imported_text' and (
    new.id is distinct from old.id or new.workspace_id is distinct from old.workspace_id or new.world_id is distinct from old.world_id
    or new.saga_id is distinct from old.saga_id or new.scope is distinct from old.scope or new.kind is distinct from old.kind
    or new.uploader_id is distinct from old.uploader_id or new.original_filename is distinct from old.original_filename
    or new.mime_type is distinct from old.mime_type or new.byte_size is distinct from old.byte_size
    or new.ingestion_method is distinct from old.ingestion_method or new.content_sha256 is distinct from old.content_sha256
    or new.raw_excerpt is distinct from old.raw_excerpt or new.created_at is distinct from old.created_at or new.ready_at is distinct from old.ready_at
  ) then
    raise exception 'import provenance is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_import_source_provenance on public.sources;
create trigger protect_import_source_provenance before update on public.sources for each row execute function public.protect_import_source_provenance();
revoke all on function public.protect_import_source_provenance() from public,anon,authenticated;

create or replace function public.save_import_inbox_source(
  workspace_id uuid, world_id uuid, saga_id uuid, source_id uuid,
  ingestion_method text, original_filename text, mime_type text, byte_size bigint, content text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid(); existing public.sources%rowtype; duplicate_source public.sources%rowtype;
  content_hash text; import_count integer; import_limit integer; soft_limit boolean;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if source_id is null then raise exception 'A stable source id is required' using errcode = '23514'; end if;
  perform public.assert_saga_access(save_import_inbox_source.workspace_id, save_import_inbox_source.world_id, save_import_inbox_source.saga_id);
  if ingestion_method not in ('paste','plain_text_file','markdown_file') then raise exception 'unsupported import method' using errcode = '23514'; end if;
  if content is null or length(btrim(content)) = 0 then raise exception 'import content is required' using errcode = '23514'; end if;
  if position(chr(65533) in content) > 0 or regexp_replace(content, E'[\\t\\n\\r]', '', 'g') ~ '[[:cntrl:]]' then raise exception 'import contains malformed text' using errcode = '22021'; end if;
  if byte_size is distinct from octet_length(content) then raise exception 'import byte size does not match content' using errcode = '23514'; end if;
  if ingestion_method = 'paste' and length(content) > 50000 then raise exception 'pasted import is too large' using errcode = '22001'; end if;
  if ingestion_method <> 'paste' and byte_size > 1048576 then raise exception 'file import is too large' using errcode = '22001'; end if;
  if ingestion_method = 'paste' then
    if original_filename is not null or mime_type <> 'text/plain' then raise exception 'paste provenance is invalid' using errcode = '23514'; end if;
  else
    if original_filename is null or length(original_filename) > 180 or original_filename in ('.','..') or original_filename ~ '[\\/[:cntrl:]]' then raise exception 'import filename is unsafe' using errcode = '23514'; end if;
    if ingestion_method = 'plain_text_file' and (lower(original_filename) !~ '[.]txt$' or mime_type <> 'text/plain') then raise exception 'filename does not match plain-text import or MIME type does not match' using errcode = '23514'; end if;
    if ingestion_method = 'markdown_file' and (lower(original_filename) !~ '[.](md|markdown)$' or mime_type not in ('text/plain','text/markdown')) then raise exception 'filename does not match Markdown import or MIME type does not match' using errcode = '23514'; end if;
  end if;
  content_hash := encode(extensions.digest(convert_to(content, 'UTF8'), 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('import:' || caller_id::text || ':' || source_id::text, 0));
  select * into existing from public.sources s where s.id = source_id;
  if existing.id is not null then
    if existing.workspace_id <> save_import_inbox_source.workspace_id or existing.world_id <> save_import_inbox_source.world_id or existing.saga_id is distinct from save_import_inbox_source.saga_id
      or existing.uploader_id is distinct from caller_id or existing.ingestion_method is distinct from ingestion_method
      or existing.original_filename is distinct from original_filename or existing.mime_type is distinct from mime_type
      or existing.byte_size is distinct from byte_size or existing.content_sha256 is distinct from content_hash or existing.raw_excerpt is distinct from content then
      raise exception 'source key is already bound to a different import' using errcode = '23505';
    end if;
    return jsonb_build_object('id',existing.id,'state',existing.import_state,'filename',existing.original_filename,'duplicate',false);
  end if;
  select * into duplicate_source from public.sources s where s.workspace_id=save_import_inbox_source.workspace_id and s.world_id=save_import_inbox_source.world_id and s.saga_id=save_import_inbox_source.saga_id and s.uploader_id=caller_id and s.kind='imported_text' and s.content_sha256=content_hash limit 1;
  if duplicate_source.id is not null then
    return jsonb_build_object('id',duplicate_source.id,'state',duplicate_source.import_state,'filename',duplicate_source.original_filename,'duplicate',true);
  end if;
  select coalesce((w.usage_limits->>'imports_monthly')::integer,100), coalesce((w.usage_limits->>'alpha_soft_limit')::boolean,false)
    into import_limit, soft_limit from public.workspaces w where w.id=save_import_inbox_source.workspace_id;
  select count(*) into import_count from public.sources s where s.workspace_id=save_import_inbox_source.workspace_id and s.kind='imported_text' and s.created_at >= date_trunc('month',now());
  if not soft_limit and import_count >= import_limit then raise exception 'monthly import quota reached; paste or keep the material manually and retry after reset' using errcode = 'P0001'; end if;
  insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,uploader_id,original_filename,mime_type,byte_size,ingestion_method,content_sha256,import_state,raw_excerpt,ready_at)
  values(source_id,save_import_inbox_source.workspace_id,save_import_inbox_source.world_id,save_import_inbox_source.saga_id,'saga','imported_text',caller_id,original_filename,mime_type,byte_size,ingestion_method,content_hash,'ready_for_review',content,now());
  return jsonb_build_object('id',source_id,'state','ready_for_review','filename',original_filename,'duplicate',false);
end;
$$;

create or replace function public.get_import_inbox(workspace_id uuid, world_id uuid, saga_id uuid, include_archived boolean default true)
returns jsonb language plpgsql security definer stable set search_path = '' as $$
begin
  perform public.assert_saga_access(get_import_inbox.workspace_id,get_import_inbox.world_id,get_import_inbox.saga_id);
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'workspace_id',s.workspace_id,'world_id',s.world_id,'saga_id',s.saga_id,'uploader_id',s.uploader_id,
    'filename',s.original_filename,'mime_type',s.mime_type,'byte_size',s.byte_size,'ingestion_method',s.ingestion_method,
    'state',s.import_state,'content',s.raw_excerpt,'created_at',s.created_at,'ready_at',s.ready_at,'archived_at',s.archived_at
  ) order by s.created_at desc,s.id desc),'[]'::jsonb) from public.sources s where s.workspace_id=get_import_inbox.workspace_id and s.world_id=get_import_inbox.world_id and s.saga_id=get_import_inbox.saga_id and s.kind='imported_text' and (get_import_inbox.include_archived or s.import_state <> 'archived'));
end;
$$;

create or replace function public.set_import_source_state(workspace_id uuid, world_id uuid, saga_id uuid, source_id uuid, next_state text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare updated public.sources%rowtype;
begin
  perform public.assert_saga_access(set_import_source_state.workspace_id,set_import_source_state.world_id,set_import_source_state.saga_id);
  if next_state not in ('ready_for_review','archived') then raise exception 'unsupported import state transition' using errcode='23514'; end if;
  update public.sources s set import_state=next_state::public.import_lifecycle_state, archived_at=case when next_state='archived' then coalesce(s.archived_at,now()) else null end, updated_at=now()
  where s.id=set_import_source_state.source_id and s.workspace_id=set_import_source_state.workspace_id and s.world_id=set_import_source_state.world_id and s.saga_id=set_import_source_state.saga_id and s.kind='imported_text' returning s.* into updated;
  if updated.id is null then raise exception 'import is not available' using errcode='42501'; end if;
  return jsonb_build_object('id',updated.id,'state',updated.import_state,'archived_at',updated.archived_at);
end;
$$;

revoke all on function public.save_import_inbox_source(uuid,uuid,uuid,uuid,text,text,text,bigint,text) from public,anon;
grant execute on function public.save_import_inbox_source(uuid,uuid,uuid,uuid,text,text,text,bigint,text) to authenticated;
revoke all on function public.get_import_inbox(uuid,uuid,uuid,boolean) from public,anon;
grant execute on function public.get_import_inbox(uuid,uuid,uuid,boolean) to authenticated;
revoke all on function public.set_import_source_state(uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function public.set_import_source_state(uuid,uuid,uuid,uuid,text) to authenticated;
