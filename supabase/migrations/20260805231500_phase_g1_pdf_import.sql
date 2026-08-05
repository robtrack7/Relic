-- Phase G1: private, text-bearing PDF Import Inbox intake.
-- Originals remain private in Storage. A trusted extractor records versioned
-- derived text; upload alone never invokes AI, embedding, or canon writes.

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp']
where id = 'attachments';

drop policy if exists storage_attachments_member_all on storage.objects;
drop policy if exists storage_attachments_member_select on storage.objects;
drop policy if exists storage_attachments_member_insert on storage.objects;
drop policy if exists storage_attachments_member_update on storage.objects;
drop policy if exists storage_attachments_member_delete on storage.objects;

create policy storage_attachments_member_select on storage.objects
for select to authenticated
using (
  bucket_id = 'attachments'
  and public.storage_path_allowed(name)
  and public.storage_path_segment(name, 4) in ('imports','images')
);

create policy storage_attachments_member_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'attachments'
  and public.storage_path_allowed(name)
  and public.storage_path_segment(name, 4) in ('imports','images')
);

create policy storage_attachments_member_update on storage.objects
for update to authenticated
using (
  bucket_id = 'attachments'
  and public.storage_path_allowed(name)
  and public.storage_path_segment(name, 4) in ('imports','images')
)
with check (
  bucket_id = 'attachments'
  and public.storage_path_allowed(name)
  and public.storage_path_segment(name, 4) in ('imports','images')
);

create policy storage_attachments_member_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'attachments'
  and public.storage_path_allowed(name)
  and public.storage_path_segment(name, 4) in ('imports','images')
);

alter table public.sources
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists original_sha256 text,
  add column if not exists extraction_version text,
  add column if not exists page_count integer,
  add column if not exists extracted_characters integer,
  add column if not exists extracted_at timestamptz,
  add column if not exists extraction_attempt_id uuid,
  add column if not exists extraction_started_at timestamptz;

create or replace function public.attachment_object_write_allowed(path text)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare v_kind text; v_source_id uuid;
begin
  if not public.storage_path_allowed(path) then return false; end if;
  v_kind := public.storage_path_segment(path,4);
  if v_kind='images' then return true; end if;
  if v_kind<>'imports' or public.storage_path_segment(path,6)<>'original.pdf' then return false; end if;
  v_source_id := public.storage_path_segment(path,5)::uuid;
  return exists(
    select 1 from public.sources s
    where s.id=v_source_id and s.uploader_id=auth.uid() and s.kind='imported_text' and s.ingestion_method='pdf_file'
      and s.storage_bucket='attachments' and s.storage_path=path and s.import_state in ('uploading','failed') and s.original_sha256 is null
  );
exception when invalid_text_representation or null_value_not_allowed then
  return false;
end;
$$;

revoke all on function public.attachment_object_write_allowed(text) from public,anon;
grant execute on function public.attachment_object_write_allowed(text) to authenticated;

drop policy if exists storage_attachments_member_insert on storage.objects;
drop policy if exists storage_attachments_member_update on storage.objects;
drop policy if exists storage_attachments_member_delete on storage.objects;
create policy storage_attachments_member_insert on storage.objects
for insert to authenticated
with check (bucket_id='attachments' and public.attachment_object_write_allowed(name));
create policy storage_attachments_member_update on storage.objects
for update to authenticated
using (bucket_id='attachments' and public.attachment_object_write_allowed(name))
with check (bucket_id='attachments' and public.attachment_object_write_allowed(name));
create policy storage_attachments_member_delete on storage.objects
for delete to authenticated
using (bucket_id='attachments' and public.attachment_object_write_allowed(name));

create unique index if not exists sources_import_storage_path_idx
  on public.sources(storage_bucket, storage_path)
  where storage_path is not null;

alter table public.sources drop constraint if exists sources_import_contract_check;
alter table public.sources add constraint sources_import_contract_check check (
  kind::text <> 'imported_text' or (
    scope = 'saga'
    and saga_id is not null
    and uploader_id is not null
    and byte_size >= 1
    and import_state is not null
    and source_entity_type is null
    and source_entity_id is null
    and note_id is null
    and transcript_id is null
    and session_id is null
    and (
      (
        ingestion_method in ('paste','plain_text_file','markdown_file')
        and mime_type in ('text/plain','text/markdown')
        and content_sha256 ~ '^[0-9a-f]{64}$'
        and import_state in ('ready_for_review','archived')
        and ready_at is not null
        and nullif(btrim(raw_excerpt),'') is not null
        and storage_bucket is null
        and storage_path is null
        and original_sha256 is null
        and extraction_version is null
        and page_count is null
        and extracted_characters is null
        and extracted_at is null
        and extraction_attempt_id is null
        and extraction_started_at is null
        and failure_code is null
      )
      or
      (
        ingestion_method = 'pdf_file'
        and mime_type = 'application/pdf'
        and lower(original_filename) ~ '[.]pdf$'
        and storage_bucket = 'attachments'
        and storage_path is not null
        and (
          (
            import_state in ('uploading','extracting')
            and ready_at is null
            and raw_excerpt = ''
            and content_sha256 is null
            and failure_code is null
          )
          or
          (
            import_state in ('failed','rejected')
            and ready_at is null
            and raw_excerpt = ''
            and content_sha256 is null
            and failure_code is not null
          )
          or
          (
            import_state in ('ready_for_review','archived')
            and ready_at is not null
            and nullif(btrim(raw_excerpt),'') is not null
            and content_sha256 ~ '^[0-9a-f]{64}$'
            and original_sha256 ~ '^[0-9a-f]{64}$'
            and extraction_version is not null
            and page_count between 1 and 100
            and extracted_characters = char_length(raw_excerpt)
            and extracted_at is not null
            and failure_code is null
          )
        )
      )
    )
  )
);

create or replace function public.protect_import_source_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.kind = 'imported_text' and (
    new.id is distinct from old.id
    or new.workspace_id is distinct from old.workspace_id
    or new.world_id is distinct from old.world_id
    or new.saga_id is distinct from old.saga_id
    or new.scope is distinct from old.scope
    or new.kind is distinct from old.kind
    or new.uploader_id is distinct from old.uploader_id
    or new.original_filename is distinct from old.original_filename
    or new.mime_type is distinct from old.mime_type
    or new.byte_size is distinct from old.byte_size
    or new.ingestion_method is distinct from old.ingestion_method
    or new.storage_bucket is distinct from old.storage_bucket
    or new.storage_path is distinct from old.storage_path
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'import provenance is immutable' using errcode = '23514';
  end if;

  if old.kind = 'imported_text' and old.import_state in ('ready_for_review','archived') and (
    new.content_sha256 is distinct from old.content_sha256
    or new.original_sha256 is distinct from old.original_sha256
    or new.raw_excerpt is distinct from old.raw_excerpt
    or new.ready_at is distinct from old.ready_at
    or new.extraction_version is distinct from old.extraction_version
    or new.page_count is distinct from old.page_count
    or new.extracted_characters is distinct from old.extracted_characters
    or new.extracted_at is distinct from old.extracted_at
  ) then
    raise exception 'ready import provenance is immutable' using errcode = '23514';
  end if;

  if old.kind = 'imported_text' and not (
    new.import_state = old.import_state
    or (old.import_state = 'uploading' and new.import_state in ('extracting','failed','rejected'))
    or (old.import_state = 'extracting' and new.import_state in ('ready_for_review','failed','rejected'))
    or (old.import_state = 'failed' and new.import_state = 'extracting')
    or (old.import_state = 'ready_for_review' and new.import_state = 'archived')
    or (old.import_state = 'archived' and new.import_state = 'ready_for_review')
  ) then
    raise exception 'unsupported import state transition' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.begin_pdf_import(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_source_id uuid,
  p_original_filename text,
  p_mime_type text,
  p_byte_size bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_caller uuid := auth.uid();
  v_existing public.sources%rowtype;
  v_storage_path text;
  v_import_count integer;
  v_import_limit integer;
  v_soft_limit boolean;
begin
  if v_caller is null then raise exception 'Authentication required' using errcode='28000'; end if;
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  if p_source_id is null then raise exception 'A stable source id is required' using errcode='23514'; end if;
  if p_original_filename is null or char_length(p_original_filename)>180 or p_original_filename in ('.','..') or p_original_filename ~ '[\\/[:cntrl:]]' then raise exception 'import filename is unsafe' using errcode='23514'; end if;
  if lower(p_original_filename) !~ '[.]pdf$' or p_mime_type <> 'application/pdf' then raise exception 'filename or MIME type does not match PDF import' using errcode='23514'; end if;
  if p_byte_size < 8 or p_byte_size > 10485760 then raise exception 'PDF import is too large or empty' using errcode='22001'; end if;
  v_storage_path := concat_ws('/',p_workspace_id,p_world_id,p_saga_id,'imports',p_source_id,'original.pdf');

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('pdf-import:'||v_caller::text||':'||p_source_id::text,0));
  select * into v_existing from public.sources where id=p_source_id;
  if found then
    if v_existing.workspace_id<>p_workspace_id or v_existing.world_id<>p_world_id or v_existing.saga_id is distinct from p_saga_id
      or v_existing.uploader_id is distinct from v_caller or v_existing.ingestion_method<>'pdf_file'
      or v_existing.original_filename is distinct from p_original_filename or v_existing.mime_type is distinct from p_mime_type
      or v_existing.byte_size is distinct from p_byte_size or v_existing.storage_path is distinct from v_storage_path then
      raise exception 'source key is already bound to a different import' using errcode='23505';
    end if;
    return jsonb_build_object('id',v_existing.id,'state',v_existing.import_state,'bucket',v_existing.storage_bucket,'storage_path',v_existing.storage_path,'replayed',true);
  end if;

  select coalesce((usage_limits->>'imports_monthly')::integer,100),coalesce((usage_limits->>'alpha_soft_limit')::boolean,false)
  into v_import_limit,v_soft_limit from public.workspaces where id=p_workspace_id;
  select count(*) into v_import_count from public.sources where workspace_id=p_workspace_id and kind='imported_text' and created_at>=date_trunc('month',now());
  if not v_soft_limit and v_import_count>=v_import_limit then raise exception 'monthly import quota reached; keep the material manually and retry after reset' using errcode='P0001'; end if;

  insert into public.sources(
    id,workspace_id,world_id,saga_id,scope,kind,uploader_id,original_filename,mime_type,byte_size,
    ingestion_method,import_state,storage_bucket,storage_path
  ) values (
    p_source_id,p_workspace_id,p_world_id,p_saga_id,'saga','imported_text',v_caller,p_original_filename,p_mime_type,p_byte_size,
    'pdf_file','uploading','attachments',v_storage_path
  );
  return jsonb_build_object('id',p_source_id,'state','uploading','bucket','attachments','storage_path',v_storage_path,'replayed',false);
end;
$$;

create or replace function public.claim_pdf_import_extraction(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_source_id uuid,
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_source public.sources%rowtype;
begin
  if auth.uid() is null or p_attempt_id is null then raise exception 'Authentication and attempt id are required' using errcode='28000'; end if;
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  select * into v_source from public.sources
  where id=p_source_id and workspace_id=p_workspace_id and world_id=p_world_id and saga_id=p_saga_id
    and uploader_id=auth.uid() and kind='imported_text' and ingestion_method='pdf_file'
  for update;
  if not found then raise exception 'PDF import is not available' using errcode='42501'; end if;
  if v_source.import_state='extracting' and v_source.extraction_attempt_id=p_attempt_id then
    return jsonb_build_object('id',v_source.id,'bucket',v_source.storage_bucket,'storage_path',v_source.storage_path,'byte_size',v_source.byte_size,'mime_type',v_source.mime_type,'replayed',true);
  end if;
  if v_source.import_state='extracting' and v_source.extraction_started_at>now()-interval '5 minutes' then raise exception 'PDF extraction is already in progress' using errcode='55000'; end if;
  if v_source.import_state not in ('uploading','failed','extracting') then raise exception 'PDF import cannot be extracted from its current state' using errcode='55000'; end if;
  update public.sources set import_state='extracting',failure_code=null,extraction_attempt_id=p_attempt_id,extraction_started_at=now(),updated_at=now() where id=v_source.id;
  return jsonb_build_object('id',v_source.id,'bucket',v_source.storage_bucket,'storage_path',v_source.storage_path,'byte_size',v_source.byte_size,'mime_type',v_source.mime_type,'replayed',false);
end;
$$;

create or replace function public.complete_pdf_import_extraction_for_worker(
  p_source_id uuid,
  p_uploader_id uuid,
  p_attempt_id uuid,
  p_original_sha256 text,
  p_derived_text text,
  p_derived_sha256 text,
  p_page_count integer,
  p_extracted_characters integer,
  p_extraction_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare v_source public.sources%rowtype; v_duplicate public.sources%rowtype;
begin
  if p_original_sha256 !~ '^[0-9a-f]{64}$' or p_derived_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'PDF extraction hashes are invalid' using errcode='22023'; end if;
  if encode(extensions.digest(convert_to(p_derived_text,'UTF8'),'sha256'),'hex')<>p_derived_sha256 then raise exception 'PDF derived hash does not match text' using errcode='23514'; end if;
  if nullif(btrim(p_derived_text),'') is null or char_length(p_derived_text)<>p_extracted_characters or p_extracted_characters>500000 then raise exception 'PDF derived text is invalid' using errcode='23514'; end if;
  if p_page_count not between 1 and 100 or p_extraction_version<>'pdfjs-5.4.149/relic-1' then raise exception 'PDF extraction metadata is invalid' using errcode='23514'; end if;
  select * into v_source from public.sources where id=p_source_id and uploader_id=p_uploader_id and ingestion_method='pdf_file' for update;
  if not found or v_source.import_state<>'extracting' or v_source.extraction_attempt_id is distinct from p_attempt_id then raise exception 'PDF extraction attempt is stale or unavailable' using errcode='40001'; end if;
  select * into v_duplicate from public.sources s where s.id<>v_source.id and s.workspace_id=v_source.workspace_id and s.world_id=v_source.world_id and s.saga_id=v_source.saga_id and s.uploader_id=v_source.uploader_id and s.kind='imported_text' and s.content_sha256=p_derived_sha256 and s.import_state in ('ready_for_review','archived') order by s.created_at limit 1;
  if found then
    update public.sources set import_state='rejected',failure_code='duplicate_content',original_sha256=p_original_sha256,extraction_version=p_extraction_version,page_count=p_page_count,extracted_characters=p_extracted_characters,extracted_at=now(),updated_at=now() where id=v_source.id;
    return jsonb_build_object('id',v_source.id,'state','rejected','failure_code','duplicate_content','duplicate_id',v_duplicate.id);
  end if;
  update public.sources set import_state='ready_for_review',content_sha256=p_derived_sha256,original_sha256=p_original_sha256,raw_excerpt=p_derived_text,ready_at=now(),failure_code=null,extraction_version=p_extraction_version,page_count=p_page_count,extracted_characters=p_extracted_characters,extracted_at=now(),updated_at=now() where id=v_source.id;
  return jsonb_build_object('id',v_source.id,'state','ready_for_review','duplicate',false);
end;
$$;

create or replace function public.fail_pdf_import_extraction_for_worker(
  p_source_id uuid,
  p_uploader_id uuid,
  p_attempt_id uuid,
  p_state text,
  p_failure_code text,
  p_original_sha256 text default null,
  p_page_count integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_source public.sources%rowtype;
begin
  if p_state not in ('failed','rejected') then raise exception 'PDF failure state is invalid' using errcode='22023'; end if;
  if p_failure_code not in ('storage_missing','download_failed','size_mismatch','mime_mismatch','malformed_pdf','encrypted_pdf','active_content_rejected','embedded_file_rejected','page_limit_exceeded','character_limit_exceeded','processing_timeout','no_extractable_text','extractor_unavailable') then raise exception 'PDF failure code is invalid' using errcode='22023'; end if;
  if p_original_sha256 is not null and p_original_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'PDF original hash is invalid' using errcode='22023'; end if;
  select * into v_source from public.sources where id=p_source_id and uploader_id=p_uploader_id and ingestion_method='pdf_file' for update;
  if not found or v_source.import_state not in ('uploading','extracting','failed') then raise exception 'PDF import is unavailable' using errcode='40001'; end if;
  if v_source.import_state='extracting' and v_source.extraction_attempt_id is distinct from p_attempt_id then raise exception 'PDF extraction attempt is stale' using errcode='40001'; end if;
  update public.sources set import_state=p_state::public.import_lifecycle_state,failure_code=p_failure_code,original_sha256=coalesce(original_sha256,p_original_sha256),page_count=coalesce(page_count,p_page_count),updated_at=now() where id=v_source.id;
  return jsonb_build_object('id',v_source.id,'state',p_state,'failure_code',p_failure_code);
end;
$$;

create or replace function public.get_import_inbox(workspace_id uuid, world_id uuid, saga_id uuid, include_archived boolean default true)
returns jsonb language plpgsql security definer stable set search_path = '' as $$
begin
  perform public.assert_saga_access(get_import_inbox.workspace_id,get_import_inbox.world_id,get_import_inbox.saga_id);
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'workspace_id',s.workspace_id,'world_id',s.world_id,'saga_id',s.saga_id,'uploader_id',s.uploader_id,
    'filename',s.original_filename,'mime_type',s.mime_type,'byte_size',s.byte_size,'ingestion_method',s.ingestion_method,
    'state',s.import_state,'failure_code',s.failure_code,'content',s.raw_excerpt,'created_at',s.created_at,'ready_at',s.ready_at,'archived_at',s.archived_at,
    'storage_bucket',s.storage_bucket,'storage_path',s.storage_path,'original_sha256',s.original_sha256,'derived_sha256',s.content_sha256,
    'extraction_version',s.extraction_version,'page_count',s.page_count,'extracted_characters',s.extracted_characters,'extracted_at',s.extracted_at
  ) order by s.created_at desc,s.id desc),'[]'::jsonb) from public.sources s where s.workspace_id=get_import_inbox.workspace_id and s.world_id=get_import_inbox.world_id and s.saga_id=get_import_inbox.saga_id and s.kind='imported_text' and (get_import_inbox.include_archived or s.import_state <> 'archived'));
end;
$$;

revoke all on function public.begin_pdf_import(uuid,uuid,uuid,uuid,text,text,bigint) from public,anon;
grant execute on function public.begin_pdf_import(uuid,uuid,uuid,uuid,text,text,bigint) to authenticated;
revoke all on function public.claim_pdf_import_extraction(uuid,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.claim_pdf_import_extraction(uuid,uuid,uuid,uuid,uuid) to authenticated;
revoke all on function public.complete_pdf_import_extraction_for_worker(uuid,uuid,uuid,text,text,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.complete_pdf_import_extraction_for_worker(uuid,uuid,uuid,text,text,text,integer,integer,text) to service_role;
revoke all on function public.fail_pdf_import_extraction_for_worker(uuid,uuid,uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.fail_pdf_import_extraction_for_worker(uuid,uuid,uuid,text,text,text,integer) to service_role;

notify pgrst, 'reload schema';
