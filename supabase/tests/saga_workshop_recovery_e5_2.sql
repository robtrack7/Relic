create extension if not exists pgtap with schema extensions;
begin;
select plan(10);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,email_change_token_new,recovery_token)
values
('e5d00000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e5-recovery@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{}','{}',false,'','','',''),
('e5d00000-0000-4000-8000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e5-other@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{}','{}',false,'','','','')
on conflict do nothing;
insert into public.workspaces(id,owner_gm_id,name,usage_limits)
values('e5d00000-0000-4000-8000-000000000002','e5d00000-0000-4000-8000-000000000001','E5 Recovery Workspace','{"plan":"test","ai_credits_monthly":100}') on conflict do nothing;

select has_function('public','abandon_saga_workshop',array['uuid'],'Explicit workshop discard RPC exists');
set local role authenticated;
select set_config('request.jwt.claim.sub','e5d00000-0000-4000-8000-000000000001',true);
create temp table e5_recovery_create as select public.create_saga_workshop(
  'e5d00000-0000-4000-8000-000000000003','e5d00000-0000-4000-8000-000000000002',null,'bring_your_notes',
  'Recoverable Saga','Recoverable World','Cairn','Notes that must survive save and leave.','customize_for_saga',
  '{"experience_level":"returning","improv_comfort":"mixed","prep_style":"mixed"}',true,'e5d00000-0000-4000-8000-000000000004'
) result;
select is((select result->>'status' from e5_recovery_create),'queued','Recoverable workshop starts normally');
select is(public.get_bootstrap_context()->'resumable_workshop_session'->>'id','e5d00000-0000-4000-8000-000000000003','Bootstrap returns the latest resumable workshop');
select ok(not (public.get_bootstrap_context()->'resumable_workshop_session' ? 'conversation'),'Bootstrap exposes a narrow resume card rather than private conversation state');
select lives_ok($$select public.abandon_saga_workshop('e5d00000-0000-4000-8000-000000000003')$$,'Owning GM can explicitly discard the draft');
reset role;
select is((select state::text from public.workshop_sessions where id='e5d00000-0000-4000-8000-000000000003'),'abandoned','Discard changes only the workshop lifecycle state');
select is((select status from internal.ai_task_runs where workshop_session_id='e5d00000-0000-4000-8000-000000000003'),'terminal','Discard cancels an unclaimed workshop task');
select is((select failure_category from internal.ai_task_runs where workshop_session_id='e5d00000-0000-4000-8000-000000000003'),'job_cancelled','Cancelled workshop work has an explicit non-billable failure category');
set local role authenticated;
select set_config('request.jwt.claim.sub','e5d00000-0000-4000-8000-000000000001',true);
select is(public.get_bootstrap_context()->'resumable_workshop_session','null'::jsonb,'Discarded workshop no longer appears as resumable');
select set_config('request.jwt.claim.sub','e5d00000-0000-4000-8000-000000000009',true);
select throws_ok($$select public.abandon_saga_workshop('e5d00000-0000-4000-8000-000000000003')$$,'42501','Workshop is unavailable','Another user cannot discard the workshop');

select * from finish();
rollback;
