create extension if not exists pgtap with schema extensions;

begin;

select plan(23);

select has_table('internal', 'ai_task_provider_calls', 'private per-completion provider ledger exists');
select has_column('internal', 'ai_task_runs', 'provider_completions', 'run ledger exposes cumulative provider completions');
select has_column('internal', 'ai_task_runs', 'provider_cost_estimate_complete', 'run ledger exposes cost completeness');
select has_function(
  'public', 'record_ai_task_provider_completion_for_worker',
  array['uuid','text','integer','text','text','text','text','integer','integer','numeric','boolean','text','boolean','boolean'],
  'service-only provider completion writer exists'
);
select table_privs_are('internal', 'ai_task_provider_calls', 'anon', array[]::text[], 'anonymous has no provider-call ledger access');
select table_privs_are('internal', 'ai_task_provider_calls', 'authenticated', array[]::text[], 'authenticated has no provider-call ledger access');
select function_privs_are(
  'public', 'record_ai_task_provider_completion_for_worker',
  array['uuid','text','integer','text','text','text','text','integer','integer','numeric','boolean','text','boolean','boolean'],
  'authenticated', array[]::text[], 'authenticated cannot write provider completions'
);
select has_function(
  'public', 'checkpoint_ai_task_provider_output_for_worker',
  array['uuid','text','jsonb','text','text','text','integer','integer','numeric','boolean','boolean','integer'],
  'successful-repair checkpoint overload exists'
);
select function_privs_are(
  'public', 'checkpoint_ai_task_provider_output_for_worker',
  array['uuid','text','jsonb','text','text','text','integer','integer','numeric','boolean','boolean','integer'],
  'authenticated', array[]::text[], 'authenticated cannot project repair attempts'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values (
  'e5600000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase-e-accounting@example.test', extensions.crypt('password', extensions.gen_salt('bf')),
  now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, '', '', '', ''
);
insert into public.workspaces(id, owner_gm_id, name)
values ('e5610000-0000-4000-8000-000000000001','e5600000-0000-4000-8000-000000000001','Phase E Accounting');
insert into public.worlds(id, workspace_id, owner_gm_id, name)
values ('e5620000-0000-4000-8000-000000000001','e5610000-0000-4000-8000-000000000001','e5600000-0000-4000-8000-000000000001','Phase E Accounting World');
insert into public.sagas(id, workspace_id, world_id, owner_gm_id, name)
values ('e5630000-0000-4000-8000-000000000001','e5610000-0000-4000-8000-000000000001','e5620000-0000-4000-8000-000000000001','e5600000-0000-4000-8000-000000000001','Phase E Accounting Saga');

insert into internal.ai_task_runs(
  id, workspace_id, world_id, saga_id, gm_id, task_name, prompt_version, quota_tier,
  ai_credits, model_tier, retrieval_profile, source_policy, output_mode, input_payload, allowed_source_ids
) values
('e5640000-0000-4000-8000-000000000001','e5610000-0000-4000-8000-000000000001','e5620000-0000-4000-8000-000000000001','e5630000-0000-4000-8000-000000000001','e5600000-0000-4000-8000-000000000001','plan_saga_workshop','plan_saga_workshop@1.0.0','light',1,'relic-fast','none','untrusted_input_only','workshop_draft_payload','{}','{}'),
('e5640000-0000-4000-8000-000000000002','e5610000-0000-4000-8000-000000000001','e5620000-0000-4000-8000-000000000001','e5630000-0000-4000-8000-000000000001','e5600000-0000-4000-8000-000000000001','plan_saga_workshop','plan_saga_workshop@1.0.0','light',1,'relic-fast','none','untrusted_input_only','workshop_draft_payload','{}','{}');

create temp table phase_e_accounting_results(step text primary key, result jsonb not null);
grant select, insert on phase_e_accounting_results to service_role;

set local role service_role;
insert into phase_e_accounting_results values ('claim', public.claim_ai_task_run_for_worker('e5640000-0000-4000-8000-000000000001','phase-e-worker'));
insert into phase_e_accounting_results values ('initial', public.record_ai_task_provider_completion_for_worker(
  'e5640000-0000-4000-8000-000000000001','phase-e-worker',1,'initial','relic-fast','gpt-5.6-luna','openai',10,20,0.001,true,'proxy_or_local_upper_bound',true,true
));
insert into phase_e_accounting_results values ('initial-replay', public.record_ai_task_provider_completion_for_worker(
  'e5640000-0000-4000-8000-000000000001','phase-e-worker',1,'initial','relic-fast','gpt-5.6-luna','openai',10,20,0.001,true,'proxy_or_local_upper_bound',true,true
));
reset role;

select is((select provider_completions from internal.ai_task_runs where id='e5640000-0000-4000-8000-000000000001'),1,'first completion is counted once');
select is((select provider_tokens_in from internal.ai_task_runs where id='e5640000-0000-4000-8000-000000000001'),10,'first input tokens are projected');
select ok((select (result->>'exact_redelivery')::boolean from phase_e_accounting_results where step='initial-replay'),'completion ledger replay is exact');
select is((select count(*) from internal.ai_task_provider_calls where ai_run_id='e5640000-0000-4000-8000-000000000001'),1::bigint,'exact replay cannot duplicate a provider call');

set local role service_role;
select throws_like(
  $$ select public.record_ai_task_provider_completion_for_worker('e5640000-0000-4000-8000-000000000001','phase-e-worker',1,'initial','relic-fast','gpt-5.6-luna','openai',11,20,0.001,true,'proxy_or_local_upper_bound',true,true) $$,
  '%ai_task_provider_completion_conflict%', 'changed completion replay fails closed'
);
insert into phase_e_accounting_results values ('repair', public.record_ai_task_provider_completion_for_worker(
  'e5640000-0000-4000-8000-000000000001','phase-e-worker',1,'schema_repair','relic-fast','gpt-5.6-luna','openai',5,7,0.002,true,'proxy_or_local_upper_bound',true,false
));
insert into phase_e_accounting_results values ('checkpoint', public.checkpoint_ai_task_provider_output_for_worker(
  'e5640000-0000-4000-8000-000000000001','phase-e-worker','{}','relic-fast','gpt-5.6-luna','openai',5,7,0.002,true,false,1
));
select throws_like(
  $$ select public.checkpoint_ai_task_provider_output_for_worker(
    'e5640000-0000-4000-8000-000000000001','phase-e-worker','{}','relic-fast','gpt-5.6-luna','openai',5,7,0.002,true,false,2
  ) $$,
  '%ai_task_repair_attempts_invalid%', 'checkpoint rejects more than one repair'
);
insert into phase_e_accounting_results values ('fail', public.fail_ai_task_run_for_worker(
  'e5640000-0000-4000-8000-000000000001','phase-e-worker','validation_failed',false,1
));
insert into phase_e_accounting_results values ('claim-incomplete', public.claim_ai_task_run_for_worker('e5640000-0000-4000-8000-000000000002','phase-e-worker-2'));
insert into phase_e_accounting_results values ('incomplete', public.record_ai_task_provider_completion_for_worker(
  'e5640000-0000-4000-8000-000000000002','phase-e-worker-2',1,'initial','relic-fast','gpt-5.6-luna','openai',null,null,null,false,'unavailable',true,false
));
reset role;

select is((select provider_completions from internal.ai_task_runs where id='e5640000-0000-4000-8000-000000000001'),2,'repair is counted as a second completion');
select is((select provider_tokens_in from internal.ai_task_runs where id='e5640000-0000-4000-8000-000000000001'),15,'input tokens accumulate across repair');
select is((select provider_tokens_out from internal.ai_task_runs where id='e5640000-0000-4000-8000-000000000001'),27,'output tokens accumulate across repair');
select is((select provider_cost_estimate_usd from internal.ai_task_runs where id='e5640000-0000-4000-8000-000000000001'),0.003::numeric,'cost accumulates across repair');
select is((select repair_attempts from internal.ai_task_runs where id='e5640000-0000-4000-8000-000000000001'),1,'successful repair is projected before delivery');
select is((select status from internal.ai_task_runs where id='e5640000-0000-4000-8000-000000000001'),'terminal','validation failure remains terminal');
select is((select provider_completions from internal.ai_task_runs where id='e5640000-0000-4000-8000-000000000001'),2,'terminal failure preserves provider completion evidence');
select ok((select not provider_cost_estimate_complete from internal.ai_task_runs where id='e5640000-0000-4000-8000-000000000002'),'missing provider usage makes cost evidence incomplete');

select * from finish();
rollback;
