-- Phase G1: bounded private static-image attachments and explicit text-only Loom evidence.

create table public.media_attachments (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  uploader_id uuid not null references auth.users(id),
  target_kind text not null check (target_kind in ('character','place','faction','artifact','thread','note')),
  target_id uuid not null,
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  state text not null default 'uploading' check (state in ('uploading','validating','ready','failed','rejected')),
  declared_mime text not null check (declared_mime in ('image/jpeg','image/png','image/webp')),
  declared_byte_size bigint not null check (declared_byte_size between 16 and 5242880),
  detected_mime text check (detected_mime in ('image/jpeg','image/png','image/webp')),
  byte_size bigint check (byte_size between 16 and 5242880),
  pixel_width integer check (pixel_width between 1 and 8192),
  pixel_height integer check (pixel_height between 1 and 8192),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  title text check (title is null or char_length(title) <= 120),
  alt_text text not null check (char_length(alt_text) between 1 and 500),
  description text check (description is null or char_length(description) <= 2000),
  failure_code text,
  validation_attempt_id uuid,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (state <> 'ready' or (detected_mime is not null and byte_size is not null and pixel_width is not null and pixel_height is not null and sha256 is not null and validated_at is not null)),
  check (pixel_width is null or pixel_height is null or pixel_width::bigint * pixel_height::bigint <= 32000000)
);
create index media_attachments_target_idx on public.media_attachments(saga_id,target_kind,target_id,created_at desc) where deleted_at is null;
create index media_attachments_storage_policy_idx on public.media_attachments(storage_path,uploader_id,state) where deleted_at is null;
create unique index media_attachments_ready_content_idx on public.media_attachments(saga_id,uploader_id,sha256,target_kind,target_id) where state='ready' and deleted_at is null;
alter table public.media_attachments enable row level security;
revoke all on table public.media_attachments from public,anon,authenticated;

create or replace function internal.media_attachment_target(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_target_kind text,p_target_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_target jsonb;
begin
  if internal.library_table(p_target_kind) is null then raise exception 'Unsupported media target' using errcode='23514'; end if;
  v_target:=internal.library_record(p_workspace_id,p_world_id,p_saga_id,p_target_kind,p_target_id);
  if v_target is null or v_target->>'scope'<>'saga' or v_target->>'saga_id'<>p_saga_id::text or v_target->>'canon_state'<>'canon' then
    raise exception 'Media target is outside active Saga canon' using errcode='42501';
  end if;
  return v_target;
end; $$;

create or replace function internal.media_attachment_object_write_allowed(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.media_attachments a
    where a.storage_path=p_path and a.uploader_id=(select auth.uid()) and a.deleted_at is null
      and a.state in ('uploading','failed') and a.validation_attempt_id is null);
$$;
create or replace function internal.media_attachment_object_read_allowed(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.media_attachments a
    where a.storage_path=p_path and a.deleted_at is null and a.state='ready'
      and public.saga_row_allowed(a.workspace_id,a.world_id,a.saga_id));
$$;
revoke all on function internal.media_attachment_target(uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function internal.media_attachment_object_write_allowed(text) from public,anon,authenticated;
revoke all on function internal.media_attachment_object_read_allowed(text) from public,anon,authenticated;

create or replace function public.attachment_object_write_allowed(path text)
returns boolean language plpgsql security definer stable set search_path='' as $$
declare v_kind text; v_source_id uuid;
begin
  if not public.storage_path_allowed(path) then return false; end if;
  v_kind:=public.storage_path_segment(path,4);
  if v_kind='images' then
    return exists(select 1 from public.media_attachments a
      where a.storage_path=path and a.uploader_id=auth.uid() and a.deleted_at is null
        and a.state in ('uploading','failed') and a.validation_attempt_id is null);
  end if;
  if v_kind<>'imports' or public.storage_path_segment(path,6)<>'original.pdf' then return false; end if;
  v_source_id:=public.storage_path_segment(path,5)::uuid;
  return exists(select 1 from public.sources s where s.id=v_source_id and s.uploader_id=auth.uid()
    and s.kind='imported_text' and s.ingestion_method='pdf_file' and s.storage_bucket='attachments'
    and s.storage_path=path and s.import_state in ('uploading','failed') and s.original_sha256 is null);
exception when invalid_text_representation or null_value_not_allowed then return false;
end; $$;

drop policy if exists storage_attachments_member_select on storage.objects;
create policy storage_attachments_member_select on storage.objects for select to authenticated using (
  bucket_id='attachments' and public.storage_path_allowed(name)
    and public.storage_path_segment(name,4)='imports'
);

create or replace function public.begin_media_attachment(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_attachment_id uuid,p_target_kind text,p_target_id uuid,
  p_original_filename text,p_declared_mime text,p_declared_byte_size bigint,p_title text,p_alt_text text,p_description text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_path text; v_extension text; v_existing public.media_attachments%rowtype;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  perform internal.media_attachment_target(p_workspace_id,p_world_id,p_saga_id,p_target_kind,p_target_id);
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_declared_mime not in ('image/jpeg','image/png','image/webp') or p_declared_byte_size not between 16 and 5242880 then raise exception 'Image type or size is invalid' using errcode='22023'; end if;
  if nullif(btrim(p_original_filename),'') is null or char_length(p_original_filename)>255 or p_original_filename~'[[:cntrl:]]' then raise exception 'Image filename is invalid' using errcode='22023'; end if;
  if char_length(coalesce(p_title,''))>120 or nullif(btrim(p_alt_text),'') is null or char_length(p_alt_text)>500 or char_length(coalesce(p_description,''))>2000 then raise exception 'Image metadata is invalid' using errcode='22023'; end if;
  v_extension:=case p_declared_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else 'webp' end;
  v_path:=concat_ws('/',p_workspace_id,p_world_id,p_saga_id,'images',p_attachment_id,'original.'||v_extension);
  select * into v_existing from public.media_attachments where id=p_attachment_id;
  if found then
    if v_existing.workspace_id<>p_workspace_id or v_existing.world_id<>p_world_id or v_existing.saga_id<>p_saga_id
      or v_existing.uploader_id<>auth.uid() or v_existing.target_kind<>p_target_kind or v_existing.target_id<>p_target_id
      or v_existing.declared_mime<>p_declared_mime or v_existing.declared_byte_size<>p_declared_byte_size then
      raise exception 'Attachment retry does not match the original upload' using errcode='23505';
    end if;
    return jsonb_build_object('id',v_existing.id,'state',v_existing.state,'bucket','attachments','storage_path',v_existing.storage_path,'replayed',true);
  end if;
  insert into public.media_attachments(id,workspace_id,world_id,saga_id,uploader_id,target_kind,target_id,storage_path,original_filename,declared_mime,declared_byte_size,title,alt_text,description)
  values(p_attachment_id,p_workspace_id,p_world_id,p_saga_id,auth.uid(),p_target_kind,p_target_id,v_path,btrim(p_original_filename),p_declared_mime,p_declared_byte_size,nullif(btrim(p_title),''),btrim(p_alt_text),nullif(btrim(p_description),''));
  return jsonb_build_object('id',p_attachment_id,'state','uploading','bucket','attachments','storage_path',v_path,'replayed',false);
end; $$;

create or replace function public.claim_media_attachment_operation(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_attachment_id uuid,p_attempt_id uuid,p_operation text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.media_attachments%rowtype;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  select * into a from public.media_attachments where id=p_attachment_id and workspace_id=p_workspace_id and world_id=p_world_id and saga_id=p_saga_id and uploader_id=auth.uid() and deleted_at is null for update;
  if not found then raise exception 'Attachment is unavailable' using errcode='42501'; end if;
  if p_operation='view' then
    if a.state<>'ready' then raise exception 'Attachment is not ready to view' using errcode='23514'; end if;
  elsif p_operation='validate' then
    if a.state='ready' then return jsonb_build_object('id',a.id,'state',a.state,'ready',true); end if;
    if a.state not in ('uploading','failed') then raise exception 'Attachment cannot be validated' using errcode='23514'; end if;
    update public.media_attachments set state='validating',validation_attempt_id=p_attempt_id,failure_code=null,updated_at=now() where id=a.id returning * into a;
  elsif p_operation='delete' then
    if a.state='validating' then raise exception 'Attachment is busy' using errcode='40001'; end if;
    update public.media_attachments set state='validating',validation_attempt_id=p_attempt_id,updated_at=now() where id=a.id returning * into a;
  else raise exception 'Unsupported attachment operation' using errcode='22023';
  end if;
  return jsonb_build_object('id',a.id,'state',a.state,'bucket','attachments','storage_path',a.storage_path,'declared_mime',a.declared_mime,'declared_byte_size',a.declared_byte_size,'uploader_id',a.uploader_id,'ready',a.state='ready');
end; $$;

create or replace function public.complete_media_attachment_validation_for_worker(
  p_attachment_id uuid,p_uploader_id uuid,p_attempt_id uuid,p_detected_mime text,p_byte_size bigint,p_pixel_width integer,p_pixel_height integer,p_sha256 text,p_validator_version text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.media_attachments%rowtype; duplicate_row public.media_attachments%rowtype;
begin
  select * into a from public.media_attachments where id=p_attachment_id and uploader_id=p_uploader_id and state='validating' and validation_attempt_id=p_attempt_id and deleted_at is null for update;
  if not found then raise exception 'Attachment validation claim is stale' using errcode='40001'; end if;
  if p_detected_mime not in ('image/jpeg','image/png','image/webp') or p_detected_mime<>a.declared_mime or p_byte_size<>a.declared_byte_size or p_byte_size not between 16 and 5242880
    or p_pixel_width not between 1 and 8192 or p_pixel_height not between 1 and 8192 or p_pixel_width::bigint*p_pixel_height::bigint>32000000 or p_sha256!~'^[0-9a-f]{64}$' or p_validator_version<>'relic-static-image-v1' then
    raise exception 'Trusted image result is invalid' using errcode='22023';
  end if;
  select * into duplicate_row from public.media_attachments d where d.id<>a.id and d.saga_id=a.saga_id and d.uploader_id=a.uploader_id and d.target_kind=a.target_kind and d.target_id=a.target_id and d.sha256=p_sha256 and d.state='ready' and d.deleted_at is null order by d.created_at limit 1;
  if found then
    update public.media_attachments set state='rejected',failure_code='duplicate_image',validation_attempt_id=null,updated_at=now() where id=a.id;
    return jsonb_build_object('id',duplicate_row.id,'state','ready','duplicate',true,'discard_upload',true);
  end if;
  update public.media_attachments set state='ready',detected_mime=p_detected_mime,byte_size=p_byte_size,pixel_width=p_pixel_width,pixel_height=p_pixel_height,sha256=p_sha256,failure_code=null,validation_attempt_id=null,validated_at=now(),updated_at=now() where id=a.id returning * into a;
  return jsonb_build_object('id',a.id,'state',a.state,'duplicate',false,'detected_mime',a.detected_mime,'pixel_width',a.pixel_width,'pixel_height',a.pixel_height);
end; $$;

create or replace function public.fail_media_attachment_for_worker(p_attachment_id uuid,p_uploader_id uuid,p_attempt_id uuid,p_state text,p_failure_code text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_state not in ('failed','rejected') or p_failure_code not in ('storage_missing','download_failed','size_mismatch','mime_mismatch','malformed_image','animated_image_rejected','image_size_exceeded','image_dimensions_exceeded','validator_unavailable','delete_failed') then raise exception 'Image failure is invalid' using errcode='22023'; end if;
  update public.media_attachments set state=p_state,failure_code=p_failure_code,validation_attempt_id=null,updated_at=now() where id=p_attachment_id and uploader_id=p_uploader_id and state='validating' and validation_attempt_id=p_attempt_id and deleted_at is null;
  if not found then raise exception 'Attachment failure claim is stale' using errcode='40001'; end if;
end; $$;

create or replace function public.complete_media_attachment_delete_for_worker(p_attachment_id uuid,p_uploader_id uuid,p_attempt_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.media_attachments set deleted_at=now(),validation_attempt_id=null,updated_at=now() where id=p_attachment_id and uploader_id=p_uploader_id and state='validating' and validation_attempt_id=p_attempt_id and deleted_at is null;
  if not found then raise exception 'Attachment delete claim is stale' using errcode='40001'; end if;
end; $$;

create or replace function public.list_media_attachments(p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_target_kind text,p_target_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  perform internal.media_attachment_target(p_workspace_id,p_world_id,p_saga_id,p_target_kind,p_target_id);
  return (select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'target_kind',a.target_kind,'target_id',a.target_id,'state',a.state,'original_filename',a.original_filename,'detected_mime',a.detected_mime,'byte_size',a.byte_size,'pixel_width',a.pixel_width,'pixel_height',a.pixel_height,'title',a.title,'alt_text',a.alt_text,'description',a.description,'failure_code',a.failure_code,'created_at',a.created_at,'updated_at',a.updated_at) order by a.created_at desc),'[]'::jsonb) from public.media_attachments a where a.workspace_id=p_workspace_id and a.world_id=p_world_id and a.saga_id=p_saga_id and a.target_kind=p_target_kind and a.target_id=p_target_id and a.deleted_at is null);
end; $$;

create or replace function public.update_media_attachment_metadata(p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_attachment_id uuid,p_title text,p_alt_text text,p_description text,p_expected_version timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.media_attachments%rowtype;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  if char_length(coalesce(p_title,''))>120 or nullif(btrim(p_alt_text),'') is null or char_length(p_alt_text)>500 or char_length(coalesce(p_description,''))>2000 then raise exception 'Image metadata is invalid' using errcode='22023'; end if;
  update public.media_attachments set title=nullif(btrim(p_title),''),alt_text=btrim(p_alt_text),description=nullif(btrim(p_description),''),updated_at=now()
  where id=p_attachment_id and workspace_id=p_workspace_id and world_id=p_world_id and saga_id=p_saga_id and uploader_id=auth.uid() and state='ready' and deleted_at is null and updated_at=p_expected_version returning * into a;
  if not found then
    if exists(select 1 from public.media_attachments where id=p_attachment_id and workspace_id=p_workspace_id and world_id=p_world_id and saga_id=p_saga_id and uploader_id=auth.uid() and deleted_at is null) then raise exception 'conflict: attachment changed elsewhere' using errcode='40001'; end if;
    raise exception 'Attachment is unavailable' using errcode='42501';
  end if;
  return jsonb_build_object('id',a.id,'updated_at',a.updated_at,'title',a.title,'alt_text',a.alt_text,'description',a.description);
end; $$;

create or replace function public.create_media_attachment_loom_turn_for_worker(
  p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_gm_id uuid,p_thread_id uuid,p_turn_id uuid,p_idempotency_key uuid,p_question text,p_attachment_ids uuid[]
) returns jsonb language plpgsql security definer set search_path=public,internal,extensions,pg_temp as $$
declare v_ids uuid[]; v_result jsonb; v_run_id uuid; a public.media_attachments%rowtype; v_source_id uuid; v_text text; v_version text; v_versions jsonb:='{}'::jsonb; v_source_ids uuid[]:='{}'::uuid[]; v_ordinal integer:=0; v_existing jsonb;
begin
  select array_agg(x order by x) into v_ids from unnest(coalesce(p_attachment_ids,'{}'::uuid[])) x;
  if cardinality(v_ids) not between 1 and 4 or cardinality(v_ids)<>(select count(distinct x) from unnest(v_ids) x) then raise exception 'Media enrollment requires 1 to 4 distinct attachments' using errcode='22023'; end if;
  if (select count(*) from public.media_attachments m where m.id=any(v_ids) and m.workspace_id=p_workspace_id and m.world_id=p_world_id and m.saga_id=p_saga_id and m.uploader_id=p_gm_id and m.state='ready' and m.deleted_at is null and nullif(btrim(m.alt_text),'') is not null)<>cardinality(v_ids) then raise exception 'Selected media is unavailable for Loom enrollment' using errcode='42501'; end if;
  v_result:=public.create_loom_provider_turn_for_worker(p_workspace_id,p_world_id,p_saga_id,p_gm_id,p_thread_id,p_turn_id,p_idempotency_key,p_question,'exact','{}'::uuid[]);
  v_run_id:=(v_result->>'run_id')::uuid;
  if coalesce((v_result->>'replayed')::boolean,false) then
    select r.input_payload->'media_attachment_ids' into v_existing from internal.ai_task_runs r where r.id=v_run_id;
    if v_existing<>to_jsonb(v_ids) then raise exception 'Loom retry does not match selected media' using errcode='23505'; end if;
    return v_result||jsonb_build_object('media_attachment_ids',v_existing);
  end if;
  for a in select * from public.media_attachments m where m.id=any(v_ids) order by m.id loop
    v_ordinal:=v_ordinal+1;
    v_text:=concat_ws(E'\n','GM-authored description; image not inspected.','Title: '||coalesce(a.title,'Untitled image'),'Alt text: '||a.alt_text,case when a.description is not null then 'Description: '||a.description end,'Safe metadata: '||a.detected_mime||', '||a.pixel_width||'×'||a.pixel_height||' pixels.');
    insert into public.sources(workspace_id,world_id,saga_id,scope,kind,raw_excerpt,uploader_id) values(p_workspace_id,p_world_id,p_saga_id,'saga','gm_instruction',left(v_text,6000),p_gm_id) returning id into v_source_id;
    v_version:=internal.loom_source_current_version(v_source_id);
    v_source_ids:=array_append(v_source_ids,v_source_id); v_versions:=v_versions||jsonb_build_object(v_source_id::text,v_version);
    insert into internal.guide_evidence_snapshots(turn_id,ordinal,workspace_id,world_id,saga_id,source_id,source_version,source_kind,source_entity_type,source_entity_id,title,context_anchor,evidence_text,evidence_hash)
    values(p_turn_id,v_ordinal,p_workspace_id,p_world_id,p_saga_id,v_source_id,v_version,'gm_instruction',case when a.target_kind<>'note' then a.target_kind end,a.target_id,coalesce(a.title,'Image description'),jsonb_build_object('media_attachment_id',a.id,'target_kind',a.target_kind,'target_id',a.target_id,'detected_mime',a.detected_mime,'pixel_width',a.pixel_width,'pixel_height',a.pixel_height,'image_not_inspected',true),left(v_text,6000),encode(extensions.digest(convert_to(left(v_text,6000),'UTF8'),'sha256'),'hex'));
  end loop;
  update internal.ai_task_runs set allowed_source_ids=v_source_ids,allowed_source_versions=v_versions,input_payload=input_payload||jsonb_build_object('media_attachment_ids',v_ids,'media_text_only_enrollment',true) where id=v_run_id and guide_turn_id=p_turn_id;
  return v_result||jsonb_build_object('source_count',cardinality(v_source_ids),'media_attachment_ids',v_ids);
end; $$;

create or replace function public.get_guide_turn_replay_for_worker(p_gm_id uuid,p_saga_id uuid,p_idempotency_key uuid)
returns jsonb language sql stable security definer set search_path=public,internal,pg_temp as $$
  select jsonb_build_object('id',t.id,'thread_id',t.thread_id,'ai_task_run_id',t.ai_task_run_id,'status',t.status,'question',t.question,'workspace_id',t.workspace_id,'world_id',t.world_id,
    'import_source_ids',coalesce(r.input_payload->'import_enrollment_source_ids','[]'::jsonb),'media_attachment_ids',coalesce(r.input_payload->'media_attachment_ids','[]'::jsonb))
  from public.guide_turns t left join internal.ai_task_runs r on r.id=t.ai_task_run_id where t.gm_id=p_gm_id and t.saga_id=p_saga_id and t.idempotency_key=p_idempotency_key;
$$;

create or replace function internal.library_dependency_summary(p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_entity_type text,p_entity_id uuid)
returns jsonb language sql security definer stable set search_path='' as $$
  with counts as (select
    (select count(*) from public.relationships r where r.workspace_id=$1 and r.world_id=$2 and (r.saga_id=$3 or r.saga_id is null) and ((r.from_entity_type::text=$4 and r.from_entity_id=$5) or (r.to_entity_type::text=$4 and r.to_entity_id=$5))) relationships,
    (select count(*) from public.mentions m where m.workspace_id=$1 and m.world_id=$2 and (m.saga_id=$3 or m.saga_id is null) and m.state in ('suggested','accepted') and ((m.source_entity_type::text=$4 and m.source_entity_id=$5) or (m.mentioned_entity_type::text=$4 and m.mentioned_entity_id=$5))) mentions,
    (select count(*) from public.note_attachments a where a.workspace_id=$1 and a.world_id=$2 and (a.saga_id=$3 or a.saga_id is null) and ((a.note_id=$5 and $4='note') or (a.entity_type::text=$4 and a.entity_id=$5))) note_attachments,
    (select count(*) from public.media_attachments a where a.workspace_id=$1 and a.world_id=$2 and a.saga_id=$3 and a.target_kind=$4 and a.target_id=$5 and a.deleted_at is null) media_attachments,
    (select count(*) from public.session_pinned_entities p where p.workspace_id=$1 and p.world_id=$2 and p.saga_id=$3 and p.entity_type::text=$4 and p.entity_id=$5) session_pins,
    (select count(*) from public.session_active_threads t where t.workspace_id=$1 and t.world_id=$2 and t.saga_id=$3 and $4='thread' and t.thread_id=$5) thread_activations,
    (select count(*) from public.drafts d where d.workspace_id=$1 and d.world_id=$2 and (d.saga_id=$3 or d.saga_id is null) and d.entity_type::text=$4 and d.target_entity_id=$5 and d.state='pending') pending_drafts)
  select jsonb_build_object('total',relationships+mentions+note_attachments+media_attachments+session_pins+thread_activations+pending_drafts,'relationships',relationships,'mentions',mentions,'note_attachments',note_attachments,'media_attachments',media_attachments,'session_pins',session_pins,'thread_activations',thread_activations,'pending_drafts',pending_drafts) from counts;
$$;

revoke all on function public.begin_media_attachment(uuid,uuid,uuid,uuid,text,uuid,text,text,bigint,text,text,text) from public,anon;
revoke all on function public.claim_media_attachment_operation(uuid,uuid,uuid,uuid,uuid,text) from public,anon;
revoke all on function public.list_media_attachments(uuid,uuid,uuid,text,uuid) from public,anon;
revoke all on function public.update_media_attachment_metadata(uuid,uuid,uuid,uuid,text,text,text,timestamptz) from public,anon;
grant execute on function public.begin_media_attachment(uuid,uuid,uuid,uuid,text,uuid,text,text,bigint,text,text,text) to authenticated;
grant execute on function public.claim_media_attachment_operation(uuid,uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.list_media_attachments(uuid,uuid,uuid,text,uuid) to authenticated;
grant execute on function public.update_media_attachment_metadata(uuid,uuid,uuid,uuid,text,text,text,timestamptz) to authenticated;
revoke all on function public.complete_media_attachment_validation_for_worker(uuid,uuid,uuid,text,bigint,integer,integer,text,text) from public,anon,authenticated;
revoke all on function public.fail_media_attachment_for_worker(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.complete_media_attachment_delete_for_worker(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.create_media_attachment_loom_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function public.complete_media_attachment_validation_for_worker(uuid,uuid,uuid,text,bigint,integer,integer,text,text) to service_role;
grant execute on function public.fail_media_attachment_for_worker(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.complete_media_attachment_delete_for_worker(uuid,uuid,uuid) to service_role;
grant execute on function public.create_media_attachment_loom_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,uuid[]) to service_role;
revoke all on function public.get_guide_turn_replay_for_worker(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_guide_turn_replay_for_worker(uuid,uuid,uuid) to service_role;
revoke all on function internal.library_dependency_summary(uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
notify pgrst,'reload schema';
