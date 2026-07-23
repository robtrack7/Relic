-- Packet E2: authenticated hosted worker dispatch. Credential values live in
-- Supabase Vault; only stable secret names are present in migration history.
do $migration$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'relic-dispatch-transcription';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'relic-dispatch-transcription',
    '* * * * *',
    $command$
      select net.http_post(
        url := (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'relic_edge_functions_base_url'
        ) || '/transcribe-session',
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'authorization', 'Bearer ' || (
            select decrypted_secret from vault.decrypted_secrets
            where name = 'relic_internal_worker_token'
          ),
          'x-worker-id', 'cron-transcription'
        ),
        body := '{}'::jsonb
      );
    $command$
  );

  select jobid into existing_job from cron.job where jobname = 'relic-dispatch-embeddings';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'relic-dispatch-embeddings',
    '* * * * *',
    $command$
      select net.http_post(
        url := (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'relic_edge_functions_base_url'
        ) || '/embed-row-dispatch',
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'authorization', 'Bearer ' || (
            select decrypted_secret from vault.decrypted_secrets
            where name = 'relic_internal_worker_token'
          ),
          'x-worker-id', 'cron-embeddings'
        ),
        body := '{}'::jsonb
      );
    $command$
  );

  select jobid into existing_job from cron.job where jobname = 'relic-dispatch-ai-tasks';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
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
        body := '{}'::jsonb
      );
    $command$
  );
end
$migration$;
