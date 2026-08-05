-- Phase F3: private-content-free email delivery, threshold receipts, and deep-link recovery.

alter type public.notification_kind add value if not exists 'quota_warn_90';
alter type public.notification_kind add value if not exists 'quota_blocked';
alter type public.notification_kind add value if not exists 'loom_task_ready';
alter type public.notification_kind add value if not exists 'loom_task_failed';
alter type public.notification_kind add value if not exists 'loom_task_stale';

alter table internal.notification_queue
  add column if not exists delivery_provider text,
  add column if not exists provider_message_id text,
  add column if not exists deep_link text;

create table if not exists internal.quota_threshold_receipts (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_start date not null,
  limit_key text not null,
  threshold smallint not null check (threshold in (70,90,100)),
  used numeric not null,
  effective_limit numeric not null,
  created_at timestamptz not null default now(),
  unique(workspace_id,period_start,limit_key,threshold)
);
revoke all on table internal.quota_threshold_receipts from public,anon,authenticated;

alter table public.gm_profiles alter column notification_preferences set default '{
  "email": {
    "pipeline_ready": true,
    "pipeline_failed": true,
    "pipeline_stale_30d": true,
    "pipeline_stale_90d": true,
    "quota_warn_90": true,
    "quota_blocked": true,
    "loom_task_ready": true,
    "loom_task_failed": true,
    "loom_task_stale": true
  },
  "push": {
    "pipeline_ready": true,
    "pipeline_failed": true,
    "transcription_complete": false,
    "synthesis_in_progress": false
  },
  "paused": false
}'::jsonb;

update public.gm_profiles set notification_preferences=jsonb_set(
  notification_preferences,
  '{email}',
  '{"quota_warn_90":true,"quota_blocked":true,"loom_task_ready":true,"loom_task_failed":true,"loom_task_stale":true}'::jsonb || coalesce(notification_preferences->'email','{}'::jsonb),
  true
);

create or replace function internal.validate_notification_preferences(p_preferences jsonb)
returns jsonb language plpgsql immutable set search_path=pg_catalog,pg_temp as $$
declare top_key text; channel_key text; setting_key text; setting_value jsonb;
begin
  if jsonb_typeof(p_preferences)<>'object' then raise exception 'Notification preferences must be an object' using errcode='22023'; end if;
  for top_key in select jsonb_object_keys(p_preferences) loop if top_key not in ('paused','email','push') then raise exception 'Notification preferences contain an unsupported field' using errcode='22023'; end if; end loop;
  if p_preferences?'paused' and jsonb_typeof(p_preferences->'paused')<>'boolean' then raise exception 'Notification pause state must be boolean' using errcode='22023'; end if;
  foreach channel_key in array array['email','push'] loop
    if p_preferences?channel_key then
      if jsonb_typeof(p_preferences->channel_key)<>'object' then raise exception 'Notification channel preferences must be objects' using errcode='22023'; end if;
      for setting_key,setting_value in select key,value from jsonb_each(p_preferences->channel_key) loop
        if (channel_key='email' and setting_key not in ('pipeline_ready','pipeline_failed','pipeline_stale_30d','pipeline_stale_90d','quota_warn_90','quota_blocked','loom_task_ready','loom_task_failed','loom_task_stale'))
          or (channel_key='push' and setting_key not in ('pipeline_ready','pipeline_failed','transcription_complete','synthesis_in_progress')) then raise exception 'Notification channel contains an unsupported event' using errcode='22023'; end if;
        if jsonb_typeof(setting_value)<>'boolean' then raise exception 'Notification event preferences must be boolean' using errcode='22023'; end if;
      end loop;
    end if;
  end loop;
  return p_preferences;
end;
$$;

create or replace function internal.validate_notification_payload(p_kind public.notification_kind,p_payload jsonb)
returns jsonb language plpgsql immutable set search_path=pg_catalog,pg_temp as $$
declare key text; allowed text[];
begin
  if jsonb_typeof(coalesce(p_payload,'{}'::jsonb))<>'object' then raise exception 'Notification payload must be an object' using errcode='22023'; end if;
  allowed:=case
    when p_kind in ('pipeline_ready','pipeline_failed','pipeline_stale_30d','pipeline_stale_90d') then array['pipeline_run_id','session_id']
    when p_kind in ('quota_warn_90','quota_blocked') then array['limit_key','threshold','period_start']
    when p_kind in ('loom_task_ready','loom_task_failed','loom_task_stale') then array['thread_id','turn_id']
    when p_kind in ('transcription_complete','synthesis_in_progress') then array['session_id']
    else array[]::text[] end;
  for key in select jsonb_object_keys(coalesce(p_payload,'{}'::jsonb)) loop
    if not key=any(allowed) then raise exception 'Notification payload contains an unsupported field' using errcode='22023'; end if;
  end loop;
  return coalesce(p_payload,'{}'::jsonb);
end;
$$;

create or replace function internal.enqueue_notification(
  p_gm_id uuid,p_workspace_id uuid,p_world_id uuid,p_saga_id uuid,p_kind public.notification_kind,
  p_channels public.notification_channel[],p_payload jsonb,p_idempotency_key text
)
returns uuid language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare notification_id uuid; safe_payload jsonb:=internal.validate_notification_payload(p_kind,p_payload);
begin
  select id into notification_id from internal.notification_queue where idempotency_key=p_idempotency_key;
  if found then return notification_id; end if;
  insert into internal.notification_queue(gm_id,workspace_id,world_id,saga_id,kind,channels,payload,state,idempotency_key)
  values(p_gm_id,p_workspace_id,p_world_id,p_saga_id,p_kind,p_channels,safe_payload,'pending',p_idempotency_key)
  returning id into notification_id;
  return notification_id;
end;
$$;

create or replace function internal.notification_deep_link(job internal.notification_queue)
returns text language plpgsql stable set search_path=public,internal,pg_temp as $$
declare root text;
begin
  if job.workspace_id is null then return '/app'; end if;
  if job.world_id is null or job.saga_id is null then return format('/app/w/%s/settings?from=notification#usage',job.workspace_id); end if;
  root:=format('/app/w/%s/world/%s/saga/%s',job.workspace_id,job.world_id,job.saga_id);
  if job.kind in ('pipeline_ready','pipeline_stale_30d','pipeline_stale_90d') then return root||'/review';
  elsif job.kind='pipeline_failed' and job.payload?'session_id' then return root||'/sessions/'||(job.payload->>'session_id')||'/review';
  elsif job.kind in ('quota_warn_90','quota_blocked') then return root||'/settings?from=notification#usage';
  elsif job.kind in ('loom_task_ready','loom_task_failed','loom_task_stale') then return root||'/guide?thread='||(job.payload->>'thread_id');
  elsif job.payload?'session_id' then return root||'/sessions/'||(job.payload->>'session_id')||'/review';
  end if;
  return root;
end;
$$;

create or replace function public.prepare_notification_delivery_for_worker(p_notification_id uuid)
returns jsonb language plpgsql security definer set search_path=public,internal,auth,pg_temp as $$
declare job internal.notification_queue%rowtype; prefs jsonb; destination text; link text; subject text; body_text text;
begin
  select * into job from internal.notification_queue nq where nq.id=p_notification_id for update;
  if not found or job.state not in ('pending','running') then raise exception 'Notification is not available' using errcode='P0002'; end if;
  select gp.notification_preferences,u.email into prefs,destination from public.gm_profiles gp join auth.users u on u.id=gp.user_id where gp.user_id=job.gm_id;
  if coalesce((prefs->>'paused')::boolean,false) then return jsonb_build_object('outcome','skipped','reason_code','preferences_paused'); end if;
  if not ('email'=any(job.channels)) or not coalesce((prefs#>>array['email',job.kind::text])::boolean,false) then return jsonb_build_object('outcome','skipped','reason_code','email_disabled'); end if;
  if destination is null then return jsonb_build_object('outcome','skipped','reason_code','email_unavailable'); end if;
  if job.payload?'session_id' and exists(select 1 from public.sessions s where s.id=(job.payload->>'session_id')::uuid and s.status in ('in_progress','ended_pending_undo')) then return jsonb_build_object('outcome','skipped','reason_code','live_session'); end if;
  link:=internal.notification_deep_link(job);
  subject:=case job.kind
    when 'pipeline_ready' then 'Relic review is ready' when 'pipeline_failed' then 'Relic processing needs attention'
    when 'pipeline_stale_30d' then 'Relic review is still waiting' when 'pipeline_stale_90d' then 'Relic review needs a decision'
    when 'quota_warn_90' then 'Relic Workspace usage is near its limit' when 'quota_blocked' then 'Relic Workspace limit reached'
    when 'loom_task_ready' then 'Your Loom task is ready' when 'loom_task_failed' then 'Your Loom task needs attention'
    when 'loom_task_stale' then 'Your Loom task is still waiting' else 'Relic update' end;
  body_text:=subject||E'\n\nOpen Relic to review the current authorized state. This email intentionally contains no Saga prose, prompts, transcript excerpts, or generated content.\n\n'||link;
  return jsonb_build_object('outcome','send','destination_email',destination,'kind',job.kind,'subject',subject,'body_text',body_text,'deep_link',link);
end;
$$;

create or replace function public.claim_notification_job_for_worker(worker_id text)
returns jsonb language sql security definer set search_path='' as $$select internal.claim_notification_job($1)$$;

create or replace function public.complete_notification_delivery_for_worker(p_notification_id uuid,p_provider text,p_provider_message_id text)
returns uuid language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare job internal.notification_queue%rowtype;
begin
  select * into job from internal.notification_queue where id=p_notification_id for update;
  if not found then raise exception 'Notification is not available'; end if;
  if job.state='sent' then return job.id; end if;
  if job.state not in ('pending','running') then raise exception 'Notification is not available' using errcode='P0002'; end if;
  update internal.notification_queue set state='sent',sent_at=coalesce(sent_at,now()),completed_at=coalesce(completed_at,now()),delivery_provider=left(nullif(p_provider,''),40),provider_message_id=left(nullif(p_provider_message_id,''),160),deep_link=internal.notification_deep_link(job),failure_reason=null,locked_by=null,locked_at=null,updated_at=now() where id=job.id;
  return job.id;
end;
$$;

create or replace function public.skip_notification_delivery_for_worker(p_notification_id uuid,p_reason_code text)
returns uuid language plpgsql security definer set search_path=public,internal,pg_temp as $$
begin
  if p_reason_code not in ('preferences_paused','email_disabled','email_unavailable','live_session') then raise exception 'Notification skip reason is invalid' using errcode='22023'; end if;
  update internal.notification_queue set state='skipped',completed_at=coalesce(completed_at,now()),failure_reason=p_reason_code,locked_by=null,locked_at=null,updated_at=now() where id=p_notification_id and state in ('pending','running','skipped');
  if not found then raise exception 'Notification is not available'; end if;
  return p_notification_id;
end;
$$;

create or replace function public.get_notification_delivery_summary(p_workspace_id uuid,p_saga_id uuid default null)
returns jsonb language plpgsql security definer stable set search_path=public,internal,pg_temp as $$
begin
  if not public.user_can_access_workspace(p_workspace_id) then raise exception 'Workspace access denied' using errcode='42501'; end if;
  if p_saga_id is not null and not exists(select 1 from public.sagas s where s.id=p_saga_id and s.workspace_id=p_workspace_id and public.user_can_access_saga(s.workspace_id,s.world_id,s.id)) then raise exception 'Saga access denied' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',n.id,'kind',n.kind,'state',n.state,'reason_code',n.failure_reason,'deep_link',n.deep_link,'created_at',n.created_at,'sent_at',n.sent_at)) order by n.created_at desc)
    from (select * from internal.notification_queue where gm_id=auth.uid() and workspace_id=p_workspace_id and (saga_id is null or p_saga_id is null or saga_id=p_saga_id) order by created_at desc limit 20) n),'[]'::jsonb);
end;
$$;

create or replace function internal.enqueue_quota_threshold_notifications()
returns trigger language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare item record; threshold int; effective numeric; inserted_id uuid; owner_id uuid; kind public.notification_kind;
begin
  select owner_gm_id into owner_id from public.workspaces where id=new.workspace_id;
  for item in select * from (values
    ('ai_credits_monthly',new.ai_credits_used::numeric),('transcription_seconds_monthly',new.transcription_seconds_used::numeric),('storage_bytes',new.storage_bytes_current::numeric),('imports_monthly',new.imports_used::numeric),('exports_monthly',new.exports_used::numeric)
  ) value(limit_key,used) loop
    select coalesce((select qo.override_value from public.quota_overrides qo where qo.workspace_id=new.workspace_id and qo.limit_key=item.limit_key and (qo.expires_at is null or qo.expires_at>now()) order by qo.created_at desc limit 1),(select (w.usage_limits->>item.limit_key)::numeric from public.workspaces w where w.id=new.workspace_id),0) into effective;
    if effective<=0 then continue; end if;
    foreach threshold in array array[70,90,100] loop
      if item.used>=effective*threshold/100.0 then
        inserted_id:=null;
        insert into internal.quota_threshold_receipts(workspace_id,period_start,limit_key,threshold,used,effective_limit) values(new.workspace_id,new.period_start,item.limit_key,threshold,item.used,effective) on conflict do nothing returning id into inserted_id;
        if inserted_id is not null and threshold>=90 then
          kind:=case when threshold=100 then 'quota_blocked'::public.notification_kind else 'quota_warn_90'::public.notification_kind end;
          perform internal.enqueue_notification(owner_id,new.workspace_id,null,null,kind,array['email'::public.notification_channel],jsonb_build_object('limit_key',item.limit_key,'threshold',threshold,'period_start',new.period_start),'notification:quota:'||new.workspace_id||':'||new.period_start||':'||item.limit_key||':'||threshold);
        end if;
      end if;
    end loop;
  end loop;
  return new;
end;
$$;
drop trigger if exists enqueue_quota_threshold_notifications on public.usage_monthly_rollups;
create trigger enqueue_quota_threshold_notifications after insert or update on public.usage_monthly_rollups for each row execute function internal.enqueue_quota_threshold_notifications();

create or replace function internal.enqueue_loom_turn_notification()
returns trigger language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare kind public.notification_kind;
begin
  if old.status is not distinct from new.status or new.created_at>now()-interval '5 minutes' then return new; end if;
  if new.status='complete' then kind:='loom_task_ready'; elsif new.status in ('failed','dead_letter') then kind:='loom_task_failed'; else return new; end if;
  if exists(select 1 from public.sessions s where s.saga_id=new.saga_id and s.status in ('in_progress','ended_pending_undo')) then return new; end if;
  perform internal.enqueue_notification(new.gm_id,new.workspace_id,new.world_id,new.saga_id,kind,array['email'::public.notification_channel],jsonb_build_object('thread_id',new.thread_id,'turn_id',new.id),'notification:'||kind||':'||new.id);
  return new;
end;
$$;
drop trigger if exists enqueue_loom_turn_notification on public.guide_turns;
create trigger enqueue_loom_turn_notification after update of status on public.guide_turns for each row execute function internal.enqueue_loom_turn_notification();

create or replace function internal.scan_stale_loom_turns()
returns integer language plpgsql security definer set search_path=public,internal,pg_temp as $$
declare turn_row public.guide_turns%rowtype; count_rows int:=0;
begin
  for turn_row in select * from public.guide_turns gt where gt.status in ('queued','running') and gt.created_at<=now()-interval '30 minutes' loop
    if not exists(select 1 from public.sessions s where s.saga_id=turn_row.saga_id and s.status in ('in_progress','ended_pending_undo')) then
      perform internal.enqueue_notification(turn_row.gm_id,turn_row.workspace_id,turn_row.world_id,turn_row.saga_id,'loom_task_stale',array['email'::public.notification_channel],jsonb_build_object('thread_id',turn_row.thread_id,'turn_id',turn_row.id),'notification:loom_task_stale:'||turn_row.id);
      count_rows:=count_rows+1;
    end if;
  end loop;
  return count_rows;
end;
$$;

revoke all on function public.prepare_notification_delivery_for_worker(uuid) from public,anon,authenticated;
revoke all on function public.claim_notification_job_for_worker(text) from public,anon,authenticated;
revoke all on function public.complete_notification_delivery_for_worker(uuid,text,text) from public,anon,authenticated;
revoke all on function public.skip_notification_delivery_for_worker(uuid,text) from public,anon,authenticated;
revoke all on function public.get_notification_delivery_summary(uuid,uuid) from public,anon;
grant execute on function public.prepare_notification_delivery_for_worker(uuid) to service_role;
grant execute on function public.claim_notification_job_for_worker(text) to service_role;
grant execute on function public.complete_notification_delivery_for_worker(uuid,text,text) to service_role;
grant execute on function public.skip_notification_delivery_for_worker(uuid,text) to service_role;
grant execute on function public.get_notification_delivery_summary(uuid,uuid) to authenticated;

do $migration$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname='relic-dispatch-notifications'; if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('relic-dispatch-notifications','* * * * *',$command$select net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name='relic_edge_functions_base_url')||'/send-notification',headers:=jsonb_build_object('content-type','application/json','authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='relic_internal_worker_token'),'x-worker-id','cron-notifications'),body:='{}'::jsonb)$command$);
  select jobid into existing_job from cron.job where jobname='relic-scan-stale-loom-notifications'; if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('relic-scan-stale-loom-notifications','*/5 * * * *',$command$select internal.scan_stale_loom_turns()$command$);
end
$migration$;
