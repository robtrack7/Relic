-- Phase F2: real deterministic private Saga exports.

alter table internal.export_jobs
  add column if not exists archive_bytes bigint,
  add column if not exists archive_sha256 text;

drop policy if exists storage_exports_member_all on storage.objects;
drop policy if exists storage_exports_member_select on storage.objects;
create policy storage_exports_member_select on storage.objects
  for select to authenticated
  using (bucket_id='exports' and public.storage_path_allowed(name));

alter table internal.export_jobs drop constraint if exists export_jobs_archive_sha256_check;
alter table internal.export_jobs add constraint export_jobs_archive_sha256_check
  check (archive_sha256 is null or archive_sha256 ~ '^[0-9a-f]{64}$');

create or replace function public.get_saga_export_status(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_export_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare job internal.export_jobs%rowtype;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  select * into job from internal.export_jobs ej where ej.id=p_export_id and ej.workspace_id=p_workspace_id and ej.world_id=p_world_id and ej.saga_id=p_saga_id;
  if not found then return jsonb_build_object('available',false,'state','missing'); end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'available',true,'export_id',job.id,'state',job.state,'requested_formats',to_jsonb(job.requested_formats),
    'include_audit',job.include_audit,'created_at',job.created_at,'completed_at',job.completed_at,
    'expires_at',job.expires_at,'archive_bytes',job.archive_bytes,'archive_sha256',job.archive_sha256,
    'failure_reason',job.failure_reason
  ));
end;
$$;

create or replace function public.get_saga_export_download(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_export_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare job internal.export_jobs%rowtype;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  select * into job from internal.export_jobs ej where ej.id=p_export_id and ej.workspace_id=p_workspace_id and ej.world_id=p_world_id and ej.saga_id=p_saga_id;
  if not found or job.state<>'complete' or job.expires_at<=now() or job.storage_path is null then
    return jsonb_build_object('available',false,'state',coalesce(job.state,'missing'));
  end if;
  return jsonb_build_object('available',true,'export_id',job.id,'storage_path',job.storage_path,'expires_at',job.expires_at,'archive_bytes',job.archive_bytes,'archive_sha256',job.archive_sha256);
end;
$$;

create or replace function public.get_saga_export_payload_for_worker(p_export_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare
  job internal.export_jobs%rowtype;
  saga_row public.sagas%rowtype;
  world_row public.worlds%rowtype;
  payload jsonb;
begin
  select * into job from internal.export_jobs ej where ej.id=p_export_id and ej.state in ('pending','running','complete');
  if not found then raise exception 'Export job is not available' using errcode='P0002'; end if;
  select * into saga_row from public.sagas s where s.id=job.saga_id and s.workspace_id=job.workspace_id and s.world_id=job.world_id and s.deleted_at is null;
  if not found then raise exception 'Export Saga is not available' using errcode='P0002'; end if;
  select * into world_row from public.worlds w where w.id=job.world_id and w.workspace_id=job.workspace_id and w.deleted_at is null;

  payload:=jsonb_build_object(
    'schema_version',saga_row.schema_version,
    'exported_at',job.created_at,
    'scope',jsonb_build_object('workspace_id',job.workspace_id,'world_id',job.world_id,'saga_id',job.saga_id),
    'world',jsonb_build_object('id',world_row.id,'name',world_row.name,'summary',world_row.summary,'default_game_system',world_row.default_game_system),
    'saga',jsonb_build_object('id',saga_row.id,'name',saga_row.name,'premise',saga_row.premise,'game_system',saga_row.game_system,'gm_profile_override',saga_row.gm_profile_override,'audio_retention',saga_row.audio_retention,'transcript_retention',saga_row.transcript_retention,'schema_version',saga_row.schema_version,'created_at',saga_row.created_at,'updated_at',saga_row.updated_at),
    'characters',(select coalesce(jsonb_agg(to_jsonb(x)-array['workspace_id','world_id','saga_id','search_tsv'] order by x.created_at,x.id),'[]') from public.characters x where x.saga_id=job.saga_id),
    'places',(select coalesce(jsonb_agg(to_jsonb(x)-array['workspace_id','world_id','saga_id','search_tsv'] order by x.created_at,x.id),'[]') from public.places x where x.saga_id=job.saga_id),
    'factions',(select coalesce(jsonb_agg(to_jsonb(x)-array['workspace_id','world_id','saga_id','search_tsv'] order by x.created_at,x.id),'[]') from public.factions x where x.saga_id=job.saga_id),
    'artifacts',(select coalesce(jsonb_agg(to_jsonb(x)-array['workspace_id','world_id','saga_id','search_tsv'] order by x.created_at,x.id),'[]') from public.artifacts x where x.saga_id=job.saga_id),
    'threads',(select coalesce(jsonb_agg(to_jsonb(x)-array['workspace_id','world_id','saga_id','search_tsv'] order by x.created_at,x.id),'[]') from public.threads x where x.saga_id=job.saga_id),
    'sessions',(select coalesce(jsonb_agg(to_jsonb(x)-array['workspace_id','world_id','saga_id','search_tsv'] order by x.created_at,x.id),'[]') from public.sessions x where x.saga_id=job.saga_id),
    'notes',(select coalesce(jsonb_agg(to_jsonb(x)-array['workspace_id','world_id','saga_id','search_tsv'] order by x.created_at,x.id),'[]') from public.notes x where x.saga_id=job.saga_id and (job.include_audit or x.note_type<>'quick_capture')),
    'relationships',(select coalesce(jsonb_agg(to_jsonb(x)-array['workspace_id','world_id','saga_id'] order by x.created_at,x.id),'[]') from public.relationships x where x.saga_id=job.saga_id),
    'transcripts',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'session_id',x.session_id,'language',x.language,'duration_seconds',x.duration_seconds,'state',x.state,'segments',x.segments,'original_segments',x.original_segments,'edited_at',x.edited_at,'created_at',x.created_at,'updated_at',x.updated_at) order by x.created_at,x.id),'[]') from public.transcripts x where x.saga_id=job.saga_id and x.deleted_at is null),
    'pipeline_runs',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'session_id',x.session_id,'state',x.state,'summary_note_id',x.summary_note_id,'created_at',x.created_at,'updated_at',x.updated_at,'closed_at',x.closed_at) order by x.created_at,x.id),'[]') from public.pipeline_runs x where x.saga_id=job.saga_id)
  );

  if job.include_audit then
    payload:=payload||jsonb_build_object('audit',jsonb_build_object(
      'drafts',(select coalesce(jsonb_agg(to_jsonb(x)-array['workspace_id','world_id','saga_id'] order by x.created_at,x.id),'[]') from public.drafts x where x.saga_id=job.saga_id),
      'sources',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'kind',x.kind,'source_entity_type',x.source_entity_type,'source_entity_id',x.source_entity_id,'note_id',x.note_id,'transcript_id',x.transcript_id,'session_id',x.session_id,'start_seconds',x.start_seconds,'end_seconds',x.end_seconds,'raw_excerpt',x.raw_excerpt,'created_at',x.created_at) order by x.created_at,x.id),'[]') from public.sources x where x.saga_id=job.saga_id),
      'draft_sources',(select coalesce(jsonb_agg(jsonb_build_object('draft_id',x.draft_id,'source_id',x.source_id,'created_at',x.created_at) order by x.created_at,x.id),'[]') from public.draft_sources x where x.saga_id=job.saga_id),
      'canon_audit',(select coalesce(jsonb_agg(to_jsonb(x)-array['workspace_id','world_id','saga_id'] order by x.created_at,x.id),'[]') from public.canon_audit x where x.saga_id=job.saga_id),
      'loom_threads',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'title',x.title,'state',x.state,'created_at',x.created_at,'updated_at',x.updated_at) order by x.created_at,x.id),'[]') from public.guide_threads x where x.saga_id=job.saga_id and x.gm_id=job.gm_id),
      'loom_turns',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'thread_id',x.thread_id,'ordinal',x.ordinal,'question',x.question,'status',x.status,'retrieval_mode',x.retrieval_mode,'response_payload',x.response_payload,'failure_category',x.failure_category,'created_at',x.created_at,'updated_at',x.updated_at,'completed_at',x.completed_at) order by x.thread_id,x.ordinal),'[]') from public.guide_turns x where x.saga_id=job.saga_id and x.gm_id=job.gm_id),
      'loom_actions',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'thread_id',x.thread_id,'turn_id',x.turn_id,'action_type',x.action_type,'action_version',x.action_version,'intent_version',x.intent_version,'arguments',x.arguments,'authority_tier',x.authority_tier,'confirmation_policy',x.confirmation_policy,'target_type',x.target_type,'target_id',x.target_id,'cost_snapshot',x.cost_snapshot,'effect_summary',x.effect_summary,'manual_fallback',x.manual_fallback,'availability_state',x.availability_state,'state',x.state,'created_draft_id',x.created_draft_id,'plan_step',x.plan_step,'plan_size',x.plan_size,'created_at',x.created_at,'updated_at',x.updated_at) order by x.created_at,x.id),'[]') from public.guide_action_intents x where x.saga_id=job.saga_id and x.gm_id=job.gm_id),
      'loom_action_receipts',(select coalesce(jsonb_agg(jsonb_build_object('action_intent_id',x.action_intent_id,'decision',x.decision,'status',x.status,'result',x.result,'created_at',x.created_at,'updated_at',x.updated_at) order by x.created_at,x.id),'[]') from internal.loom_action_receipts x where x.saga_id=job.saga_id and x.gm_id=job.gm_id)
    ));
  end if;

  return jsonb_build_object('job',jsonb_build_object('id',job.id,'workspace_id',job.workspace_id,'world_id',job.world_id,'saga_id',job.saga_id,'requested_formats',job.requested_formats,'include_audit',job.include_audit,'created_at',job.created_at),'payload',payload);
end;
$$;

create or replace function internal.complete_export_job(
  p_export_id uuid,
  p_storage_path text,
  p_archive_bytes bigint,
  p_archive_sha256 text
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare job internal.export_jobs%rowtype; usage_id uuid; v_period_start date:=date_trunc('month',now())::date; v_period_end date:=(date_trunc('month',now())+interval '1 month - 1 day')::date;
begin
  select * into job from internal.export_jobs ej where ej.id=p_export_id for update;
  if not found then raise exception 'Export job is not available'; end if;
  if p_storage_path<>concat_ws('/',job.workspace_id::text,job.world_id::text,job.saga_id::text,job.id::text||'.zip') then raise exception 'Export Storage path is invalid' using errcode='22023'; end if;
  if p_archive_bytes is null or p_archive_bytes<1 or p_archive_sha256 is null or p_archive_sha256!~'^[0-9a-f]{64}$' then raise exception 'Export archive proof is invalid' using errcode='22023'; end if;
  update internal.export_jobs set state='complete',storage_path=p_storage_path,download_url=null,archive_bytes=p_archive_bytes,archive_sha256=p_archive_sha256,expires_at=greatest(expires_at,now()+interval '7 days'),completed_at=coalesce(completed_at,now()),locked_by=null,locked_at=null,failure_reason=null,updated_at=now() where id=p_export_id;
  insert into public.usage_events(workspace_id,world_id,saga_id,actor_gm_id,event_kind,units,unit_type,idempotency_key,metadata)
  values(job.workspace_id,job.world_id,job.saga_id,job.gm_id,'export',1,'count','export:'||job.id,jsonb_build_object('export_id',job.id,'formats',job.requested_formats,'include_audit',job.include_audit,'archive_bytes',p_archive_bytes,'archive_sha256',p_archive_sha256))
  on conflict(idempotency_key) do nothing returning id into usage_id;
  if usage_id is not null then insert into public.usage_monthly_rollups(workspace_id,period_start,period_end,exports_used) values(job.workspace_id,v_period_start,v_period_end,1) on conflict(workspace_id,period_start) do update set exports_used=public.usage_monthly_rollups.exports_used+1,period_end=excluded.period_end,updated_at=now(); end if;
  return p_export_id;
end;
$$;

drop function if exists public.complete_export_job_for_worker(uuid,text,text);
create or replace function public.complete_export_job_for_worker(p_export_id uuid,p_storage_path text,p_archive_bytes bigint,p_archive_sha256 text)
returns uuid language sql security definer set search_path=public,internal,pg_temp as $$select internal.complete_export_job($1,$2,$3,$4)$$;

create or replace function public.claim_export_job_for_worker(worker_id text)
returns jsonb language sql security definer set search_path='' as $$select internal.claim_export_job($1)$$;

create or replace function internal.claim_cleanup_job(worker_id text,p_job_kinds text[])
returns jsonb language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare claimed internal.cleanup_jobs%rowtype;
begin
  if p_job_kinds is null or cardinality(p_job_kinds)=0 or exists(select 1 from unnest(p_job_kinds) kind where kind not in ('audio','saga','exports')) then raise exception 'Cleanup worker kinds are invalid' using errcode='22023'; end if;
  update internal.cleanup_jobs cj set state='running',locked_by=worker_id,locked_at=now(),started_at=coalesce(cj.started_at,now()),updated_at=now()
  where cj.id=(select id from internal.cleanup_jobs where state='pending' and scheduled_at<=now() and job_kind=any(p_job_kinds) order by scheduled_at,created_at for update skip locked limit 1)
  returning * into claimed;
  if claimed.id is null then return null; end if;
  return to_jsonb(claimed);
end;
$$;

create or replace function public.claim_audio_cleanup_job_for_worker(worker_id text)
returns jsonb language sql security definer set search_path='' as $$select internal.claim_cleanup_job($1,array['audio'])$$;
create or replace function public.claim_saga_cleanup_job_for_worker(worker_id text)
returns jsonb language sql security definer set search_path='' as $$select internal.claim_cleanup_job($1,array['saga','exports'])$$;

revoke all on function public.get_saga_export_payload_for_worker(uuid) from public,anon,authenticated;
revoke all on function public.complete_export_job_for_worker(uuid,text,bigint,text) from public,anon,authenticated;
revoke all on function public.claim_export_job_for_worker(text) from public,anon,authenticated;
revoke all on function public.claim_audio_cleanup_job_for_worker(text) from public,anon,authenticated;
revoke all on function public.claim_saga_cleanup_job_for_worker(text) from public,anon,authenticated;
grant execute on function public.get_saga_export_payload_for_worker(uuid) to service_role;
grant execute on function public.complete_export_job_for_worker(uuid,text,bigint,text) to service_role;
grant execute on function public.claim_export_job_for_worker(text) to service_role;
grant execute on function public.claim_audio_cleanup_job_for_worker(text) to service_role;
grant execute on function public.claim_saga_cleanup_job_for_worker(text) to service_role;

do $migration$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname='relic-dispatch-exports'; if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('relic-dispatch-exports','* * * * *',$command$select net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name='relic_edge_functions_base_url')||'/export-saga',headers:=jsonb_build_object('content-type','application/json','authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='relic_internal_worker_token'),'x-worker-id','cron-exports'),body:='{}'::jsonb)$command$);
  select jobid into existing_job from cron.job where jobname='relic-dispatch-cleanup-saga'; if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('relic-dispatch-cleanup-saga','* * * * *',$command$select net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name='relic_edge_functions_base_url')||'/cleanup-saga',headers:=jsonb_build_object('content-type','application/json','authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='relic_internal_worker_token'),'x-worker-id','cron-cleanup-saga'),body:='{}'::jsonb)$command$);
  select jobid into existing_job from cron.job where jobname='relic-dispatch-cleanup-audio'; if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('relic-dispatch-cleanup-audio','* * * * *',$command$select net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name='relic_edge_functions_base_url')||'/cleanup-audio',headers:=jsonb_build_object('content-type','application/json','authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='relic_internal_worker_token'),'x-worker-id','cron-cleanup-audio'),body:='{}'::jsonb)$command$);
  select jobid into existing_job from cron.job where jobname='relic-enqueue-expired-exports'; if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('relic-enqueue-expired-exports','15 3 * * *',$command$select internal.enqueue_expired_export_cleanup_jobs()$command$);
end
$migration$;
