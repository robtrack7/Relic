create extension if not exists pgtap with schema extensions;

begin;
select plan(23);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
 ('f1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f1-owner@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','',''),
 ('f1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f1-other@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','')
on conflict(id) do nothing;
insert into public.gm_profiles(id,user_id,experience_level,improv_comfort,prep_style)
values
 ('f1010000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','returning','mixed','mixed'),
 ('f1010000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','returning','mixed','mixed')
on conflict(id) do nothing;
insert into public.workspaces(id,owner_gm_id,name,usage_limits) values
 ('f1020000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','F1 Workspace','{"plan":"free","ai_credits_monthly":100,"transcription_seconds_monthly":600,"storage_bytes":1000,"imports_monthly":5,"exports_monthly":3}'),
 ('f1020000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','Other Workspace','{"plan":"free","ai_credits_monthly":100}')
on conflict(id) do nothing;
insert into public.worlds(id,workspace_id,owner_gm_id,name) values
 ('f1030000-0000-4000-8000-000000000001','f1020000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','F1 World'),
 ('f1030000-0000-4000-8000-000000000002','f1020000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','Other World')
on conflict(id) do nothing;
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name,audio_retention,transcript_retention) values
 ('f1040000-0000-4000-8000-000000000001','f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','F1 Saga','retain','retain'),
 ('f1040000-0000-4000-8000-000000000002','f1020000-0000-4000-8000-000000000002','f1030000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','Other Saga','retain','retain')
on conflict(id) do nothing;
insert into public.sessions(id,workspace_id,world_id,saga_id,scope,name,status) values
 ('f1050000-0000-4000-8000-000000000001','f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001','saga','Retention Session','ended')
on conflict(id) do nothing;
insert into public.transcripts(id,workspace_id,world_id,saga_id,session_id,whisper_model,state,segments,original_segments) values
 ('f1060000-0000-4000-8000-000000000001','f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001','f1050000-0000-4000-8000-000000000001','test','complete','[{"start":0,"end":2,"text":"A private transcript."}]','[{"start":0,"end":2,"text":"A private transcript."}]')
on conflict(id) do nothing;
insert into public.pipeline_runs(id,workspace_id,world_id,saga_id,session_id,state) values
 ('f1070000-0000-4000-8000-000000000001','f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001','f1050000-0000-4000-8000-000000000001','ready_for_review')
on conflict(id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);

select has_function('public','get_settings_control_plane',array['uuid','uuid','uuid'],'scoped Settings projection exists');
select has_function('public','update_saga_operational_settings',array['uuid','uuid','uuid','text','jsonb','timestamptz','text'],'Saga operational settings writer exists');
select has_function('public','update_saga_retention_settings',array['uuid','uuid','uuid','text','text','boolean','timestamptz','text'],'retention writer exists');
select has_function('public','update_notification_preferences',array['jsonb','uuid','text'],'scoped notification writer exists');
select is((public.get_settings_control_plane('f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001')#>>'{usage,meters,0,severity}') is not null,true,'Settings uses the shared effective usage projection');

select is(public.update_saga_operational_settings('f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001','Cairn','{"experience_level":"veteran","improv_comfort":"planner","prep_style":"light"}',null,'f1:operational:1')->>'game_system','Cairn','Saga system and override update through the scoped writer');
select is(public.update_saga_operational_settings('f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001','Cairn','{"experience_level":"veteran","improv_comfort":"planner","prep_style":"light"}',null,'f1:operational:1')->>'replayed','true','exact Saga settings replay returns the receipt');
reset role;
select is((select count(*) from internal.settings_action_receipts where idempotency_key='f1:operational:1'),1::bigint,'exact replay writes one settings receipt');
set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.update_saga_operational_settings('f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001','Fate',null,null,'f1:operational:1')$$,'23505','Settings idempotency key was reused with different input','changed input cannot reuse a settings receipt');
select throws_ok($$select public.update_saga_operational_settings('f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001','Fate','{"experience_level":"wizard","improv_comfort":"mixed","prep_style":"mixed"}',null,'f1:bad-profile')$$,'22023','GM profile values are invalid','invalid profile input has zero effects');
select throws_ok($$select public.update_saga_retention_settings('f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001','delete_after_transcription','delete_after_synthesis',false,null,'f1:retention:denied')$$,'22023','Retention cleanup must be explicitly confirmed','destructive retention change requires explicit confirmation');
select is(public.update_saga_retention_settings('f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001','delete_after_transcription','delete_after_synthesis',true,null,'f1:retention:1')->>'future_cleanup_only','true','confirmed retention change states future-only behavior');
select is(public.get_settings_control_plane('f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001')#>>'{saga,transcript_retention}','delete_after_synthesis','confirmed transcript retention persists');
select is(public.update_notification_preferences('{"paused":true,"email":{"pipeline_ready":false}}','f1020000-0000-4000-8000-000000000001','f1:notifications:1')#>>'{notification_preferences,paused}','true','notification patch is scoped and saved');
select is(public.update_notification_preferences('{"paused":true,"email":{"pipeline_ready":false}}','f1020000-0000-4000-8000-000000000001','f1:notifications:1')->>'replayed','true','notification replay is idempotent');
select throws_ok($$select public.update_notification_preferences('{"email":{"unknown_event":true}}','f1020000-0000-4000-8000-000000000001','f1:notifications:bad')$$,'22023','Notification channel contains an unsupported event','unknown notification events fail closed');
select throws_ok($$select public.update_notification_preferences('{"secret":"leak"}','f1020000-0000-4000-8000-000000000001','f1:notifications:secret')$$,'22023','Notification preferences contain an unsupported field','unknown notification fields fail closed');

select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.get_settings_control_plane('f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001')$$,'42501','saga context is not available','another GM cannot read Settings');
select throws_ok($$select public.update_saga_retention_settings('f1020000-0000-4000-8000-000000000001','f1030000-0000-4000-8000-000000000001','f1040000-0000-4000-8000-000000000001','retain','retain',true,null,'f1:cross-owner')$$,'42501','saga context is not available','another GM cannot mutate retention');

reset role;
update public.pipeline_runs set state='closed',closed_at=now() where id='f1070000-0000-4000-8000-000000000001';
select is((select segments from public.transcripts where id='f1060000-0000-4000-8000-000000000001'),'[]'::jsonb,'pipeline close removes transcript text when future retention requires it');
select ok((select deleted_at is not null from public.transcripts where id='f1060000-0000-4000-8000-000000000001'),'pipeline close marks transcript deleted');
select ok((select transcript_deleted_at is not null from public.sessions where id='f1050000-0000-4000-8000-000000000001'),'Session records transcript retention cleanup');
select is((select count(*) from public.embeddings where source_kind='transcript_chunk' and source_entity_id='f1060000-0000-4000-8000-000000000001' and is_current),0::bigint,'deleted transcript has no current retrieval embeddings');

select * from finish();
rollback;
