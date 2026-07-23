begin;
select plan(14);

select has_extension('pg_net', 'pg_net is enabled for hosted Edge dispatch');

select is(
  (select count(*) from cron.job where jobname in (
    'relic-dispatch-transcription',
    'relic-dispatch-embeddings',
    'relic-dispatch-ai-tasks'
  )),
  3::bigint,
  'all three E2 provider dispatch schedules exist'
);

select is((select count(*) from cron.job where jobname = 'relic-dispatch-transcription' and active), 1::bigint, 'transcription dispatch is active');
select is((select count(*) from cron.job where jobname = 'relic-dispatch-embeddings' and active), 1::bigint, 'embedding dispatch is active');
select is((select count(*) from cron.job where jobname = 'relic-dispatch-ai-tasks' and active), 1::bigint, 'AI dispatch is active');

select is((select schedule from cron.job where jobname = 'relic-dispatch-transcription'), '* * * * *', 'transcription dispatch runs every minute');
select is((select schedule from cron.job where jobname = 'relic-dispatch-embeddings'), '* * * * *', 'embedding dispatch runs every minute');
select is((select schedule from cron.job where jobname = 'relic-dispatch-ai-tasks'), '* * * * *', 'AI dispatch runs every minute');

select ok(
  (select bool_and(command like '%vault.decrypted_secrets%') from cron.job where jobname like 'relic-dispatch-%'),
  'dispatch commands resolve credentials from Vault'
);

select ok(
  (select bool_and(command not like '%INTERNAL_TOKEN%') from cron.job where jobname like 'relic-dispatch-%'),
  'dispatch commands do not reference Edge environment secret names'
);

select ok(
  (select bool_and(command not similar to '%(sk-|eyJ)[A-Za-z0-9._-]{12,}%') from cron.job where jobname like 'relic-dispatch-%'),
  'dispatch commands contain no credential-shaped literal'
);

select ok(
  (select command like '%jsonb_build_object(''run_id'', due.id)%'
   from cron.job where jobname = 'relic-dispatch-ai-tasks'),
  'AI dispatch passes the required due run_id'
);

select ok(
  (select command like '%status in (''pending'', ''retryable'')%'
     and command like '%scheduled_at <= now()%'
   from cron.job where jobname = 'relic-dispatch-ai-tasks'),
  'AI dispatch selects only due pending or retryable runs'
);

select is(
  public.get_provider_operational_alerts_for_worker() @> '[{"code":"missing_worker_execution"}]'::jsonb,
  false,
  'idle queues do not produce a missing-worker-execution alert'
);

select * from finish();
rollback;
