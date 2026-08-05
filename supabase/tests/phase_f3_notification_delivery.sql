create extension if not exists pgtap with schema extensions;

begin;

select plan(30);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('f3000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','phase-f3@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
insert into public.gm_profiles(id,user_id,experience_level,notification_preferences)
values ('f3010000-0000-0000-0000-000000000001','f3000000-0000-0000-0000-000000000001','experienced','{"email":{"pipeline_ready":true,"pipeline_failed":true,"pipeline_stale_30d":true,"pipeline_stale_90d":true,"quota_warn_90":true,"quota_blocked":true,"loom_task_ready":true,"loom_task_failed":true,"loom_task_stale":true},"push":{},"paused":false}');
insert into public.workspaces(id,owner_gm_id,name,usage_limits)
values ('f3020000-0000-0000-0000-000000000001','f3000000-0000-0000-0000-000000000001','F3 Workspace','{"ai_credits_monthly":100,"transcription_seconds_monthly":100,"storage_bytes":100,"imports_monthly":100,"exports_monthly":100}');
insert into public.worlds(id,workspace_id,owner_gm_id,name)
values ('f3030000-0000-0000-0000-000000000001','f3020000-0000-0000-0000-000000000001','f3000000-0000-0000-0000-000000000001','F3 World');
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name)
values ('f3040000-0000-0000-0000-000000000001','f3020000-0000-0000-0000-000000000001','f3030000-0000-0000-0000-000000000001','f3000000-0000-0000-0000-000000000001','F3 Saga');
insert into public.usage_monthly_rollups(workspace_id,period_start,period_end)
values ('f3020000-0000-0000-0000-000000000001',date_trunc('month',now())::date,(date_trunc('month',now())+interval '1 month - 1 day')::date);

select has_function('public','prepare_notification_delivery_for_worker',array['uuid'],'worker delivery preparation exists');
select has_function('public','complete_notification_delivery_for_worker',array['uuid','text','text'],'worker delivery completion exists');
select has_function('public','skip_notification_delivery_for_worker',array['uuid','text'],'worker delivery suppression exists');
select has_function('public','get_notification_delivery_summary',array['uuid','uuid'],'content-safe delivery summary exists');
select has_function('internal','scan_stale_loom_turns',array[]::text[],'stale Loom scanner exists');

select throws_ok(
  $$select internal.enqueue_notification('f3000000-0000-0000-0000-000000000001','f3020000-0000-0000-0000-000000000001','f3030000-0000-0000-0000-000000000001','f3040000-0000-0000-0000-000000000001','pipeline_ready',array['email'::public.notification_channel],'{"pipeline_run_id":"f3050000-0000-0000-0000-000000000001","story_text":"secret"}','f3:unsafe')$$,
  '22023','Notification payload contains an unsupported field','notification payloads reject private or unknown content');

select internal.enqueue_notification(
  'f3000000-0000-0000-0000-000000000001','f3020000-0000-0000-0000-000000000001','f3030000-0000-0000-0000-000000000001','f3040000-0000-0000-0000-000000000001',
  'pipeline_ready',array['email'::public.notification_channel],'{"pipeline_run_id":"f3050000-0000-0000-0000-000000000001"}','f3:pipeline-ready');
select is((select payload from internal.notification_queue where idempotency_key='f3:pipeline-ready'),'{"pipeline_run_id":"f3050000-0000-0000-0000-000000000001"}'::jsonb,'only allowlisted identifiers enter the queue');

create temp table f3_delivery as
select public.prepare_notification_delivery_for_worker(id) value from internal.notification_queue where idempotency_key='f3:pipeline-ready';
select is((select value->>'outcome' from f3_delivery),'send','enabled email is prepared at send time');
select is((select value->>'deep_link' from f3_delivery),'/app/w/f3020000-0000-0000-0000-000000000001/world/f3030000-0000-0000-0000-000000000001/saga/f3040000-0000-0000-0000-000000000001/review','delivery uses the authorized review deep link');
select ok((select position('F3 Saga' in value->>'body_text')=0 from f3_delivery),'email body excludes Saga content and names');

update public.gm_profiles set notification_preferences=jsonb_set(notification_preferences,'{email,pipeline_ready}','false') where user_id='f3000000-0000-0000-0000-000000000001';
select is((select public.prepare_notification_delivery_for_worker(id)->>'reason_code' from internal.notification_queue where idempotency_key='f3:pipeline-ready'),'email_disabled','preferences are rechecked immediately before delivery');
select public.skip_notification_delivery_for_worker((select id from internal.notification_queue where idempotency_key='f3:pipeline-ready'),'email_disabled');
select is((select state::text from internal.notification_queue where idempotency_key='f3:pipeline-ready'),'skipped','disabled delivery reaches a terminal skipped state');
select throws_ok(
  $$select public.complete_notification_delivery_for_worker((select id from internal.notification_queue where idempotency_key='f3:pipeline-ready'),'deterministic','late-id')$$,
  'P0002','Notification is not available','a late provider callback cannot overwrite a skipped terminal state');

update public.gm_profiles set notification_preferences=jsonb_set(notification_preferences,'{email,pipeline_ready}','true') where user_id='f3000000-0000-0000-0000-000000000001';
select internal.enqueue_notification(
  'f3000000-0000-0000-0000-000000000001','f3020000-0000-0000-0000-000000000001','f3030000-0000-0000-0000-000000000001','f3040000-0000-0000-0000-000000000001',
  'pipeline_ready',array['email'::public.notification_channel],'{"pipeline_run_id":"f3050000-0000-0000-0000-000000000002"}','f3:pipeline-send');
select public.complete_notification_delivery_for_worker((select id from internal.notification_queue where idempotency_key='f3:pipeline-send'),'deterministic','first-id');
select is((select state::text from internal.notification_queue where idempotency_key='f3:pipeline-send'),'sent','provider completion records sent state');
select public.complete_notification_delivery_for_worker((select id from internal.notification_queue where idempotency_key='f3:pipeline-send'),'deterministic','second-id');
select is((select provider_message_id from internal.notification_queue where idempotency_key='f3:pipeline-send'),'first-id','exact completion replay is idempotent');

update public.usage_monthly_rollups set ai_credits_used=70 where workspace_id='f3020000-0000-0000-0000-000000000001';
select is((select count(*) from internal.quota_threshold_receipts where workspace_id='f3020000-0000-0000-0000-000000000001'),1::bigint,'70 percent creates an audit receipt');
select is((select count(*) from internal.notification_queue where workspace_id='f3020000-0000-0000-0000-000000000001' and kind in ('quota_warn_90','quota_blocked')),0::bigint,'70 percent remains in-app only');
update public.usage_monthly_rollups set ai_credits_used=90 where workspace_id='f3020000-0000-0000-0000-000000000001';
update public.usage_monthly_rollups set ai_credits_used=100 where workspace_id='f3020000-0000-0000-0000-000000000001';
select is((select count(*) from internal.quota_threshold_receipts where workspace_id='f3020000-0000-0000-0000-000000000001'),3::bigint,'70, 90, and 100 percent receipts are durable');
select is((select count(*) from internal.notification_queue where workspace_id='f3020000-0000-0000-0000-000000000001' and kind in ('quota_warn_90','quota_blocked')),2::bigint,'90 and 100 percent each enqueue one email');
update public.usage_monthly_rollups set ai_credits_used=100 where workspace_id='f3020000-0000-0000-0000-000000000001';
select is((select count(*) from internal.notification_queue where workspace_id='f3020000-0000-0000-0000-000000000001' and kind in ('quota_warn_90','quota_blocked')),2::bigint,'quota threshold retries do not duplicate delivery');

set local role authenticated;
select set_config('request.jwt.claim.sub','f3000000-0000-0000-0000-000000000001',true);
select ok(public.get_notification_delivery_summary('f3020000-0000-0000-0000-000000000001','f3040000-0000-0000-0000-000000000001') @> '[{"kind":"quota_blocked"}]'::jsonb,'Saga Settings includes Workspace-wide quota delivery state');
select ok(not (public.get_notification_delivery_summary('f3020000-0000-0000-0000-000000000001','f3040000-0000-0000-0000-000000000001')::text like '%payload%'),'delivery summary exposes no queued payload');
reset role;

insert into public.guide_threads(id,workspace_id,world_id,saga_id,gm_id,title)
values ('f3060000-0000-0000-0000-000000000001','f3020000-0000-0000-0000-000000000001','f3030000-0000-0000-0000-000000000001','f3040000-0000-0000-0000-000000000001','f3000000-0000-0000-0000-000000000001','F3 Loom');
insert into public.guide_turns(id,workspace_id,world_id,saga_id,gm_id,thread_id,ordinal,idempotency_key,question,question_hash,status,retrieval_mode,created_at)
values
 ('f3070000-0000-0000-0000-000000000001','f3020000-0000-0000-0000-000000000001','f3030000-0000-0000-0000-000000000001','f3040000-0000-0000-0000-000000000001','f3000000-0000-0000-0000-000000000001','f3060000-0000-0000-0000-000000000001',1,'f3080000-0000-0000-0000-000000000001','ready','0000000000000000000000000000000000000000000000000000000000000000','queued','none',now()-interval '10 minutes'),
 ('f3070000-0000-0000-0000-000000000002','f3020000-0000-0000-0000-000000000001','f3030000-0000-0000-0000-000000000001','f3040000-0000-0000-0000-000000000001','f3000000-0000-0000-0000-000000000001','f3060000-0000-0000-0000-000000000001',2,'f3080000-0000-0000-0000-000000000002','failed','0000000000000000000000000000000000000000000000000000000000000000','queued','none',now()-interval '10 minutes'),
 ('f3070000-0000-0000-0000-000000000003','f3020000-0000-0000-0000-000000000001','f3030000-0000-0000-0000-000000000001','f3040000-0000-0000-0000-000000000001','f3000000-0000-0000-0000-000000000001','f3060000-0000-0000-0000-000000000001',3,'f3080000-0000-0000-0000-000000000003','stale','0000000000000000000000000000000000000000000000000000000000000000','queued','none',now()-interval '31 minutes');
update public.guide_turns set status='complete' where id='f3070000-0000-0000-0000-000000000001';
update public.guide_turns set status='failed' where id='f3070000-0000-0000-0000-000000000002';
select is((select count(*) from internal.notification_queue where kind='loom_task_ready' and payload->>'turn_id'='f3070000-0000-0000-0000-000000000001'),1::bigint,'delayed Loom completion enqueues one recovery notice');
select is((select count(*) from internal.notification_queue where kind='loom_task_failed' and payload->>'turn_id'='f3070000-0000-0000-0000-000000000002'),1::bigint,'delayed Loom failure enqueues one recovery notice');
select ok(internal.scan_stale_loom_turns()>=1,'stale Loom scan discovers delayed work');
select internal.scan_stale_loom_turns();
select is((select count(*) from internal.notification_queue where kind='loom_task_stale' and payload->>'turn_id'='f3070000-0000-0000-0000-000000000003'),1::bigint,'stale Loom scanning is idempotent');

insert into public.sessions(id,workspace_id,world_id,saga_id,scope,name,status)
values ('f3090000-0000-0000-0000-000000000001','f3020000-0000-0000-0000-000000000001','f3030000-0000-0000-0000-000000000001','f3040000-0000-0000-0000-000000000001','saga','Live F3','in_progress');
insert into public.guide_turns(id,workspace_id,world_id,saga_id,gm_id,thread_id,ordinal,idempotency_key,question,question_hash,status,retrieval_mode,created_at)
values
 ('f3070000-0000-0000-0000-000000000004','f3020000-0000-0000-0000-000000000001','f3030000-0000-0000-0000-000000000001','f3040000-0000-0000-0000-000000000001','f3000000-0000-0000-0000-000000000001','f3060000-0000-0000-0000-000000000001',4,'f3080000-0000-0000-0000-000000000004','live ready','0000000000000000000000000000000000000000000000000000000000000000','queued','none',now()-interval '10 minutes'),
 ('f3070000-0000-0000-0000-000000000005','f3020000-0000-0000-0000-000000000001','f3030000-0000-0000-0000-000000000001','f3040000-0000-0000-0000-000000000001','f3000000-0000-0000-0000-000000000001','f3060000-0000-0000-0000-000000000001',5,'f3080000-0000-0000-0000-000000000005','live stale','0000000000000000000000000000000000000000000000000000000000000000','queued','none',now()-interval '31 minutes');
update public.guide_turns set status='complete' where id='f3070000-0000-0000-0000-000000000004';
select is((select count(*) from internal.notification_queue where payload->>'turn_id'='f3070000-0000-0000-0000-000000000004'),0::bigint,'live Session suppresses Loom completion email');
select internal.scan_stale_loom_turns();
select is((select count(*) from internal.notification_queue where payload->>'turn_id'='f3070000-0000-0000-0000-000000000005'),0::bigint,'live Session suppresses stale Loom email');
select is((select count(*) from cron.job where jobname in ('relic-dispatch-notifications','relic-scan-stale-loom-notifications')),2::bigint,'notification delivery and stale Loom schedules exist');

select throws_ok(
  $$select internal.validate_notification_preferences('{"email":{"story_ready":true},"paused":false}')$$,
  '22023','Notification channel contains an unsupported event','preference validator rejects unknown event keys');

select * from finish();
rollback;
