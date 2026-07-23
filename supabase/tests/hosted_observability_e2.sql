create extension if not exists pgtap with schema extensions;

begin;

select plan(54);

select has_table('internal', 'provider_pipeline_events', 'E2 safe provider event ledger exists');
select has_function('public', 'record_provider_pipeline_event_for_worker', array[
  'text','text','text','text','text','uuid','uuid','uuid','uuid','uuid','uuid','uuid','text','text','text','text','integer','bigint','bigint','bigint','text','text','numeric','text','numeric','text','numeric','text','text','text','jsonb'
], 'service-only structured event writer exists');
select has_function('public', 'get_provider_operations_summary_for_worker', array['integer'], 'operator summary query exists');
select has_function('public', 'get_provider_operational_alerts_for_worker', array[]::text[], 'operator alert query exists');

select set_eq(
  $$ select privilege_type from information_schema.role_table_grants where table_schema = 'internal' and table_name = 'provider_pipeline_events' and grantee in ('anon','authenticated') $$,
  $$ values ('__none__') except values ('__none__') $$,
  'browser roles have no provider event table grants'
);

select function_privs_are(
  'public', 'record_provider_pipeline_event_for_worker',
  array['text','text','text','text','text','uuid','uuid','uuid','uuid','uuid','uuid','uuid','text','text','text','text','integer','bigint','bigint','bigint','text','text','numeric','text','numeric','text','numeric','text','text','text','jsonb'],
  'anon', array[]::text[], 'anonymous cannot write provider events'
);
select function_privs_are(
  'public', 'record_provider_pipeline_event_for_worker',
  array['text','text','text','text','text','uuid','uuid','uuid','uuid','uuid','uuid','uuid','text','text','text','text','integer','bigint','bigint','bigint','text','text','numeric','text','numeric','text','numeric','text','text','text','jsonb'],
  'authenticated', array[]::text[], 'authenticated users cannot write provider events'
);

set local role service_role;

select lives_ok(
  $$ select public.record_provider_pipeline_event_for_worker(
    'provider_call_completed', 'info', 'staging', 'deployment-1', 'embedding',
    null, null, null, null, null, null, 'e2000000-0000-0000-0000-000000000001',
    'request-hash', 'relic-embed', 'text-embedding-3-small', 'litellm', 1,
    25, 320, 410, 'success', null, 120, 'character', 1536, 'dimension', 120, 'token',
    null, null, '{"dimensions":1536,"exact_redelivery":false}'::jsonb
  ) $$,
  'service worker can record an allowlisted safe event'
);

reset role;

select is((select count(*) from internal.provider_pipeline_events where event_name = 'provider_call_completed'), 1::bigint, 'safe event is stored once');
select is((select provider_alias from internal.provider_pipeline_events where event_name = 'provider_call_completed'), 'relic-embed', 'provider alias is retained');
select is((select resolved_model from internal.provider_pipeline_events where event_name = 'provider_call_completed'), 'text-embedding-3-small', 'resolved model is retained');

select throws_like(
  $$ select public.record_provider_pipeline_event_for_worker(
    'provider_call_failed', 'error', 'staging', null, 'ai_task',
    null, null, null, null, null, null, null, null, 'relic-deep', 'model-x', 'litellm', 1,
    null, null, null, 'terminal_failure', 'malformed_response', null, null, null, null, null, null,
    null, null, '{"prompt":"private fixture text"}'::jsonb
  ) $$,
  '%observability_metadata_not_allowlisted%',
  'raw prompt metadata is rejected before storage'
);

select throws_like(
  $$ select public.record_provider_pipeline_event_for_worker(
    'provider_call_failed', 'error', 'staging', null, 'transcription',
    null, null, null, null, null, null, null, null, 'relic-transcribe', 'model-y', 'litellm', 1,
    null, null, null, 'retryable_failure', 'timeout', null, null, null, null, null, null,
    null, null, '{"signed_url":"https://example.test/private?token=secret"}'::jsonb
  ) $$,
  '%observability_metadata_not_allowlisted%',
  'signed URL metadata is rejected before storage'
);

select lives_ok(
  $$ select public.record_provider_pipeline_event_for_worker(
    'configuration_rejected', 'error', 'staging', 'deployment-1', 'ai_task',
    null, null, null, null, null, null, null, 'config-hash', 'relic-deep', 'unexpected-model', 'litellm', 1,
    0, 0, 1, 'terminal_failure', 'model_mismatch', 0, 'token', 0, 'token', 0, 'token',
    null, null, '{"expected_model":"configured-model","actual_model":"unexpected-model"}'::jsonb
  ) $$,
  'dimension/model mismatch signal can be recorded safely'
);

select ok((public.get_provider_operations_summary_for_worker(60) ? 'events'), 'operator summary returns event counts');
select ok((public.get_provider_operations_summary_for_worker(60) ? 'latency'), 'operator summary returns latency aggregates');
select ok((public.get_provider_operations_summary_for_worker(60) ? 'queues'), 'operator summary returns live queue states');
select ok((public.get_provider_operations_summary_for_worker(60) ? 'schedules'), 'operator summary returns cron execution state');
select ok((public.get_provider_operational_alerts_for_worker()::text like '%dimension_or_model_mismatch%'), 'operator alerts surface model/dimension mismatch');
select is((select count(*) from internal.provider_pipeline_events where safe_metadata ?| array['prompt','transcript','content','signed_url','authorization']), 0::bigint, 'sensitive metadata keys never persist');

select has_column('internal', 'ai_task_runs', 'scheduled_at', 'AI task runs have an explicit due time');
select has_column('internal', 'ai_task_runs', 'provider_completed_at', 'AI task runs can checkpoint validated provider completion');
select has_function('public', 'claim_ai_task_run_for_worker', array['uuid','text'], 'atomic AI task lease exists');
select has_function(
  'public', 'checkpoint_ai_task_provider_output_for_worker',
  array['uuid','text','jsonb','text','text','text','integer','integer','numeric','boolean','boolean'],
  'validated provider-output checkpoint exists'
);
select has_function('public', 'fail_ai_task_run_for_worker', array['uuid','text','text','boolean','integer'], 'bounded AI task failure transition exists');
select has_function('public', 'replay_ai_task_run_for_worker', array['uuid'], 'guarded AI task replay exists');
select has_function('public', 'reset_stalled_ai_task_runs_for_worker', array['integer'], 'AI task lease watchdog exists');
select has_function('public', 'prune_provider_pipeline_events_for_worker', array['integer'], 'provider event retention boundary exists');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values (
  'e2100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'e2-ai@example.test', extensions.crypt('password', extensions.gen_salt('bf')),
  now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, '', '', '', ''
) on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values ('e2110000-0000-0000-0000-000000000001', 'e2100000-0000-0000-0000-000000000001', 'E2 AI Workspace');
insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('e2120000-0000-0000-0000-000000000001', 'e2110000-0000-0000-0000-000000000001', 'e2100000-0000-0000-0000-000000000001', 'E2 AI World');
insert into public.sagas (id, workspace_id, world_id, owner_gm_id, name)
values ('e2130000-0000-0000-0000-000000000001', 'e2110000-0000-0000-0000-000000000001', 'e2120000-0000-0000-0000-000000000001', 'e2100000-0000-0000-0000-000000000001', 'E2 AI Saga');

insert into internal.ai_task_runs (
  id, workspace_id, world_id, saga_id, gm_id, task_name, prompt_version,
  quota_tier, ai_credits, model_tier, retrieval_profile, source_policy, output_mode,
  input_payload, allowed_source_ids
) values (
  'e2140000-0000-0000-0000-000000000001',
  'e2110000-0000-0000-0000-000000000001',
  'e2120000-0000-0000-0000-000000000001',
  'e2130000-0000-0000-0000-000000000001',
  'e2100000-0000-0000-0000-000000000001',
  'propose_thread_complication', 'propose_thread_complication@1.0.0',
  'light', 1, 'relic-balanced', 'sanctum_grounding', 'canon_only', 'ephemeral',
  '{"fixture":"non-sensitive"}'::jsonb, '{}'::uuid[]
);

create temp table e2_ai_results (step text primary key, result jsonb not null);
grant select, insert on e2_ai_results to service_role;

set local role service_role;
insert into e2_ai_results values (
  'claim-1',
  public.claim_ai_task_run_for_worker('e2140000-0000-0000-0000-000000000001', 'e2-worker-1')
);
insert into e2_ai_results values (
  'busy',
  public.claim_ai_task_run_for_worker('e2140000-0000-0000-0000-000000000001', 'e2-worker-2')
);
insert into e2_ai_results values (
  'checkpoint-1',
  public.checkpoint_ai_task_provider_output_for_worker(
    'e2140000-0000-0000-0000-000000000001', 'e2-worker-1',
    '{"complications":[{"id":"c1","summary":"A quiet complication","narrative":"A harmless fixture complication.","entities_implicated":[],"escalation_level":"low","sources":[]}],"confidence_reason":"direct_gm_input"}'::jsonb,
    'relic-balanced', 'gpt-5.6-terra', 'openai', 20, 30, 0.001, true, true
  )
);
insert into e2_ai_results values (
  'failure-1',
  public.fail_ai_task_run_for_worker(
    'e2140000-0000-0000-0000-000000000001', 'e2-worker-1', 'timeout', true, 0
  )
);
insert into e2_ai_results values (
  'not-due',
  public.claim_ai_task_run_for_worker('e2140000-0000-0000-0000-000000000001', 'e2-worker-2')
);
reset role;

select is((select result->>'claim_state' from e2_ai_results where step = 'claim-1'), 'claimed', 'first AI dispatch obtains the lease');
select is((select (result->>'attempts')::integer from e2_ai_results where step = 'claim-1'), 1, 'claim records the first delivery attempt exactly once');
select is((select result->>'claim_state' from e2_ai_results where step = 'busy'), 'busy', 'duplicate concurrent delivery cannot obtain the lease');
select is((select (result->>'exact_redelivery')::boolean from e2_ai_results where step = 'checkpoint-1'), false, 'first validated provider result creates one checkpoint');
select ok((select provider_completed_at is not null and output_payload is not null from internal.ai_task_runs where id = 'e2140000-0000-0000-0000-000000000001'), 'private validated output checkpoint is retained for recovery');
select is((select result->>'status' from e2_ai_results where step = 'failure-1'), 'retryable', 'first retryable failure schedules a bounded retry');
select is((select result->>'claim_state' from e2_ai_results where step = 'not-due'), 'not_due', 'backoff prevents immediate repeated provider delivery');

update internal.ai_task_runs
set scheduled_at = now() - interval '1 second'
where id = 'e2140000-0000-0000-0000-000000000001';

set local role service_role;
insert into e2_ai_results values (
  'claim-2',
  public.claim_ai_task_run_for_worker('e2140000-0000-0000-0000-000000000001', 'e2-worker-2')
);
insert into e2_ai_results values (
  'failure-2',
  public.fail_ai_task_run_for_worker(
    'e2140000-0000-0000-0000-000000000001', 'e2-worker-2', 'timeout', true, 0
  )
);
insert into e2_ai_results values (
  'replay',
  public.replay_ai_task_run_for_worker('e2140000-0000-0000-0000-000000000001')
);
insert into e2_ai_results values (
  'claim-replay',
  public.claim_ai_task_run_for_worker('e2140000-0000-0000-0000-000000000001', 'e2-worker-3')
);
insert into e2_ai_results values (
  'checkpoint-replay',
  public.checkpoint_ai_task_provider_output_for_worker(
    'e2140000-0000-0000-0000-000000000001', 'e2-worker-3',
    '{"complications":[{"id":"c1","summary":"A quiet complication","narrative":"A harmless fixture complication.","entities_implicated":[],"escalation_level":"low","sources":[]}],"confidence_reason":"direct_gm_input"}'::jsonb,
    'relic-balanced', 'gpt-5.6-terra', 'openai', 20, 30, 0.001, true, true
  )
);
insert into e2_ai_results values (
  'complete',
  public.record_ai_task_output_for_worker(
    'e2140000-0000-0000-0000-000000000001',
    '{"complications":[{"id":"c1","summary":"A quiet complication","narrative":"A harmless fixture complication.","entities_implicated":[],"escalation_level":"low","sources":[]}],"confidence_reason":"direct_gm_input"}'::jsonb,
    '{}'::uuid[], 'gpt-5.6-terra', 'openai'
  )
);
insert into e2_ai_results values (
  'claim-complete',
  public.claim_ai_task_run_for_worker('e2140000-0000-0000-0000-000000000001', 'e2-worker-4')
);
insert into e2_ai_results values (
  'replay-complete',
  public.replay_ai_task_run_for_worker('e2140000-0000-0000-0000-000000000001')
);
reset role;

select is((select result->>'claim_state' from e2_ai_results where step = 'claim-2'), 'claimed', 'due retry obtains a new lease');
select is((select (result->>'attempts')::integer from e2_ai_results where step = 'claim-2'), 2, 'second delivery reaches the configured attempt limit');
select is((select result->>'status' from e2_ai_results where step = 'failure-2'), 'dead_letter', 'retry exhaustion transitions to dead-letter');
select is((select count(*) from internal.dead_letter_jobs where job_table = 'internal.ai_task_runs' and job_id = 'e2140000-0000-0000-0000-000000000001'), 1::bigint, 'retry exhaustion creates one idempotent dead-letter record');
select ok(not exists (
  select 1 from internal.dead_letter_jobs
  where job_table = 'internal.ai_task_runs'
    and job_id = 'e2140000-0000-0000-0000-000000000001'
    and payload ?| array['input_payload','output_payload','prompt','content','retrieval']
), 'AI dead-letter payload omits task input, output, prompt, and retrieval content');
select is((select result->>'status' from e2_ai_results where step = 'replay'), 'retryable', 'operator replay restores an exhausted run to the queue');
select ok((select (result->>'provider_checkpoint_present')::boolean from e2_ai_results where step = 'replay'), 'replay reports that a charge-saving provider checkpoint remains available');
select is((select result->>'claim_state' from e2_ai_results where step = 'claim-replay'), 'claimed', 'replayed run can be claimed after configuration recovery');
select ok((select (result->>'exact_redelivery')::boolean from e2_ai_results where step = 'checkpoint-replay'), 'checkpoint retry is exact and does not replace provider output');
select ok((select (result->>'ok')::boolean from e2_ai_results where step = 'complete'), 'checkpointed output completes through the normal persistence boundary');
select is((select result->>'claim_state' from e2_ai_results where step = 'claim-complete'), 'complete', 'completed-run delivery cannot call the provider again');
select ok((select (result->>'duplicate_replay')::boolean from e2_ai_results where step = 'replay-complete'), 'dead-letter replay cannot overwrite a completed result');

insert into internal.ai_task_runs (
  id, workspace_id, world_id, saga_id, gm_id, task_name, prompt_version,
  quota_tier, ai_credits, model_tier, retrieval_profile, source_policy, output_mode,
  status, attempts, max_attempts, started_at, locked_at, locked_by, input_payload
) values
  (
    'e2140000-0000-0000-0000-000000000002', 'e2110000-0000-0000-0000-000000000001',
    'e2120000-0000-0000-0000-000000000001', 'e2130000-0000-0000-0000-000000000001',
    'e2100000-0000-0000-0000-000000000001', 'propose_thread_complication',
    'propose_thread_complication@1.0.0', 'light', 1, 'relic-balanced', 'sanctum_grounding',
    'canon_only', 'ephemeral', 'running', 2, 2, now() - interval '20 minutes',
    now() - interval '20 minutes', 'abandoned-worker', '{"fixture":"stalled"}'::jsonb
  ),
  (
    'e2140000-0000-0000-0000-000000000003', 'e2110000-0000-0000-0000-000000000001',
    'e2120000-0000-0000-0000-000000000001', 'e2130000-0000-0000-0000-000000000001',
    'e2100000-0000-0000-0000-000000000001', 'propose_thread_complication',
    'propose_thread_complication@1.0.0', 'light', 1, 'relic-balanced', 'sanctum_grounding',
    'canon_only', 'ephemeral', 'running', 2, 2, now() - interval '20 minutes',
    now() - interval '20 minutes', 'abandoned-checkpoint-worker', '{"fixture":"stalled-checkpoint"}'::jsonb
  );
update internal.ai_task_runs
set provider_completed_at = now() - interval '19 minutes',
    provider_alias = 'relic-balanced', resolved_model = 'gpt-5.6-terra', resolved_provider = 'openai',
    output_payload = '{"fixture":"validated"}'::jsonb
where id = 'e2140000-0000-0000-0000-000000000003';

set local role service_role;
select public.reset_stalled_ai_task_runs_for_worker(600);
reset role;

select is((select status from internal.ai_task_runs where id = 'e2140000-0000-0000-0000-000000000002'), 'dead_letter', 'exhausted abandoned delivery is dead-lettered instead of looping');
select is((select status from internal.ai_task_runs where id = 'e2140000-0000-0000-0000-000000000003'), 'retryable', 'abandoned checkpointed delivery is safely resumable without another provider call');

insert into internal.provider_pipeline_events (
  occurred_at, event_name, environment, worker_type, state, safe_metadata
) values (
  now() - interval '31 days', 'worker_idle', 'staging', 'retention-fixture', 'idle', '{}'::jsonb
);

set local role service_role;
create temp table e2_retention_result as
select public.prune_provider_pipeline_events_for_worker(30) as deleted_count;
reset role;

select ok((select deleted_count >= 1 from e2_retention_result), '30-day retention removes expired safe events');
select is((select count(*) from internal.provider_pipeline_events where worker_type = 'retention-fixture'), 0::bigint, 'expired event content is gone after retention');
select is((select count(*) from cron.job where jobname = 'relic-prune-provider-events' and active), 1::bigint, 'daily provider-event retention schedule is active');
select is((select count(*) from cron.job where jobname = 'relic-ai-task-watchdog' and active), 1::bigint, 'AI stalled-lease watchdog schedule is active');
select throws_like(
  $$ select public.prune_provider_pipeline_events_for_worker(365) $$,
  '%provider_event_retention_invalid%',
  'retention outside the reviewed one-to-ninety-day bound fails closed'
);

select * from finish();
rollback;
