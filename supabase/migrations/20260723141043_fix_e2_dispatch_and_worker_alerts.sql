-- Packet E2 forward fix:
-- - Dispatch only a due AI task run, passing the required run_id.
-- - Match operational heartbeat checks to the worker_type values actually emitted.
-- - Do not alert on an idle worker when its queue has no work.

create or replace function public.get_provider_operational_alerts_for_worker()
returns jsonb
language sql
security definer
stable
set search_path = public, internal, pg_temp
as $$
  with alerts as (
    select 'sustained_provider_failure'::text code, count(*)::bigint count
    from internal.provider_pipeline_events
    where event_name = 'provider_call_failed' and occurred_at >= now() - interval '15 minutes'
    having count(*) >= 3
    union all
    select 'dead_letter_growth', count(*) from internal.dead_letter_jobs
    where created_at >= now() - interval '1 hour'
    having count(*) > 0
    union all
    select 'stranded_running_jobs', count(*) from (
      select id from internal.embedding_jobs where state = 'running' and locked_at < now() - interval '10 minutes'
      union all
      select id from internal.transcription_jobs where state = 'running' and locked_at < now() - interval '10 minutes'
      union all
      select id from internal.ai_task_runs where status = 'running' and updated_at < now() - interval '10 minutes'
    ) stranded
    having count(*) > 0
    union all
    select 'dimension_or_model_mismatch', count(*) from internal.provider_pipeline_events
    where error_category in ('dimension_mismatch', 'model_mismatch') and occurred_at >= now() - interval '1 hour'
    having count(*) > 0
    union all
    select 'repeated_quota_denial', count(*) from internal.provider_pipeline_events
    where state = 'quota_blocked' and occurred_at >= now() - interval '1 hour'
    having count(*) >= 3
    union all
    select 'unexpected_deterministic_mode', count(*) from internal.provider_pipeline_events
    where environment in ('staging', 'production') and provider like 'deterministic%'
      and occurred_at >= now() - interval '1 day'
    having count(*) > 0
    union all
    select 'missing_worker_execution', count(*) from (
      values
        (
          'transcription_jobs'::text,
          exists (
            select 1 from internal.transcription_jobs
            where state in ('queued', 'pending', 'retryable', 'running')
          )
        ),
        (
          'embedding_jobs'::text,
          exists (
            select 1 from internal.embedding_jobs
            where state in ('queued', 'retryable', 'running')
          )
        ),
        (
          'ai_task'::text,
          exists (
            select 1 from internal.ai_task_runs
            where status in ('pending', 'retryable', 'running')
          )
        )
    ) required(worker_type, has_work)
    where required.has_work
      and not exists (
        select 1 from internal.provider_pipeline_events event
        where (
          event.worker_type = required.worker_type
          or event.worker_type like required.worker_type || ':%'
        )
          and event.occurred_at >= now() - interval '10 minutes'
      )
    having count(*) > 0
    union all
    select 'missing_scheduler_configuration', count(*) from (
      values ('relic-dispatch-transcription'::text), ('relic-dispatch-embeddings'::text), ('relic-dispatch-ai-tasks'::text)
    ) required(job_name)
    where not exists (select 1 from cron.job where jobname = required.job_name and active)
    having count(*) > 0
    union all
    select 'duplicate_metering', count(*) from (
      select idempotency_key from public.usage_events group by idempotency_key having count(*) > 1
    ) duplicates
    having count(*) > 0
    union all
    select 'sensitive_field_logging_regression', count(*) from internal.provider_pipeline_events
    where event_name = 'observability_event_rejected' and occurred_at >= now() - interval '1 day'
    having count(*) > 0
  )
  select coalesce(jsonb_agg(jsonb_build_object('code', code, 'count', count) order by code), '[]'::jsonb)
  from alerts;
$$;

revoke all on function public.get_provider_operational_alerts_for_worker() from public, anon, authenticated;
grant execute on function public.get_provider_operational_alerts_for_worker() to service_role;

do $migration$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'relic-dispatch-ai-tasks';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'relic-dispatch-ai-tasks',
    '* * * * *',
    $command$
      select net.http_post(
        url := (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'relic_edge_functions_base_url'
        ) || '/ai-task-runner',
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'authorization', 'Bearer ' || (
            select decrypted_secret from vault.decrypted_secrets
            where name = 'relic_internal_worker_token'
          ),
          'x-worker-id', 'cron-ai-tasks'
        ),
        body := jsonb_build_object('run_id', due.id)
      )
      from (
        select id
        from internal.ai_task_runs
        where status in ('pending', 'retryable')
          and scheduled_at <= now()
        order by scheduled_at, created_at
        limit 1
      ) due;
    $command$
  );
end
$migration$;
