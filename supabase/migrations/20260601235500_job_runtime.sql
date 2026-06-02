alter table internal.embedding_jobs
  add column if not exists scheduled_at timestamptz not null default now(),
  add column if not exists started_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists locked_at timestamptz,
  add column if not exists max_attempts int not null default 5;

alter table internal.transcription_jobs
  add column if not exists scheduled_at timestamptz not null default now(),
  add column if not exists started_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists locked_at timestamptz,
  add column if not exists max_attempts int not null default 3;

alter table internal.cleanup_jobs
  add column if not exists scheduled_at timestamptz not null default now(),
  add column if not exists started_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists locked_at timestamptz,
  add column if not exists max_attempts int not null default 5;

alter table internal.export_jobs
  add column if not exists scheduled_at timestamptz not null default now(),
  add column if not exists started_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists locked_at timestamptz,
  add column if not exists max_attempts int not null default 2,
  add column if not exists idempotency_key text;

alter table internal.notification_queue
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists locked_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists max_attempts int not null default 3,
  add column if not exists idempotency_key text;

do $$
begin
  alter table internal.notification_queue drop constraint if exists notification_queue_state_check;
  alter table internal.notification_queue
    add constraint notification_queue_state_check
    check (state in ('pending', 'running', 'sent', 'failed', 'skipped'));
end $$;

create unique index if not exists export_jobs_idempotency_key_idx
  on internal.export_jobs(idempotency_key)
  where idempotency_key is not null;

create unique index if not exists notification_queue_idempotency_key_idx
  on internal.notification_queue(idempotency_key)
  where idempotency_key is not null;

create unique index if not exists dead_letter_jobs_job_key_idx
  on internal.dead_letter_jobs(job_table, job_id);

create index if not exists transcription_jobs_pending_idx on internal.transcription_jobs(state, scheduled_at) where state = 'pending';
create index if not exists cleanup_jobs_pending_idx on internal.cleanup_jobs(state, scheduled_at) where state = 'pending';
create index if not exists export_jobs_pending_idx on internal.export_jobs(state, scheduled_at) where state = 'pending';

create or replace function internal.sanitize_failure_reason(p_reason text)
returns text
language sql
immutable
set search_path = pg_temp
as $$
  select left(
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(p_reason, 'job failed'), '(token|secret|key|jwt|authorization)\s*=?\s*[^,\s]+', '\1=[redacted]', 'gi'),
        '(prompt|body|content)\s+[^,]+',
        '\1 [redacted]',
        'gi'
      ),
      '\s+',
      ' ',
      'g'
    ),
    500
  );
$$;

create or replace function internal.backoff_interval(p_job_table text, p_attempts int)
returns interval
language sql
immutable
set search_path = pg_temp
as $$
  select case p_job_table
    when 'embedding_jobs' then make_interval(secs => least(240, power(4, greatest(p_attempts - 1, 0))::int))
    when 'transcription_jobs' then make_interval(secs => case greatest(p_attempts, 1) when 1 then 10 when 2 then 60 else 300 end)
    when 'cleanup_jobs' then make_interval(secs => least(405, 5 * power(3, greatest(p_attempts - 1, 0))::int))
    when 'export_jobs' then interval '60 seconds'
    when 'notification_queue' then make_interval(secs => case greatest(p_attempts, 1) when 1 then 5 when 2 then 30 else 120 end)
    else interval '60 seconds'
  end;
$$;

create or replace function internal.claim_embedding_job(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  claimed internal.embedding_jobs%rowtype;
begin
  update internal.embedding_jobs ej
  set state = 'running',
      locked_by = worker_id,
      locked_at = now(),
      started_at = coalesce(ej.started_at, now()),
      updated_at = now()
  where ej.id = (
    select id
    from internal.embedding_jobs
    where state = 'pending'
      and debounce_until <= now()
    order by debounce_until, created_at
    for update skip locked
    limit 1
  )
  returning * into claimed;

  if claimed.id is null then
    return null;
  end if;

  return to_jsonb(claimed);
end;
$$;

create or replace function internal.claim_transcription_job(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  claimed internal.transcription_jobs%rowtype;
begin
  update internal.transcription_jobs tj
  set state = 'running',
      locked_by = worker_id,
      locked_at = now(),
      started_at = coalesce(tj.started_at, now()),
      updated_at = now()
  where tj.id = (
    select id
    from internal.transcription_jobs
    where state = 'pending'
      and scheduled_at <= now()
    order by scheduled_at, created_at
    for update skip locked
    limit 1
  )
  returning * into claimed;

  if claimed.id is null then
    return null;
  end if;

  return to_jsonb(claimed);
end;
$$;

create or replace function internal.claim_cleanup_job(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  claimed internal.cleanup_jobs%rowtype;
begin
  update internal.cleanup_jobs cj
  set state = 'running',
      locked_by = worker_id,
      locked_at = now(),
      started_at = coalesce(cj.started_at, now()),
      updated_at = now()
  where cj.id = (
    select id
    from internal.cleanup_jobs
    where state = 'pending'
      and scheduled_at <= now()
    order by scheduled_at, created_at
    for update skip locked
    limit 1
  )
  returning * into claimed;

  if claimed.id is null then
    return null;
  end if;

  return to_jsonb(claimed);
end;
$$;

create or replace function internal.claim_export_job(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  claimed internal.export_jobs%rowtype;
begin
  update internal.export_jobs ej
  set state = 'running',
      locked_by = worker_id,
      locked_at = now(),
      started_at = coalesce(ej.started_at, now()),
      updated_at = now()
  where ej.id = (
    select id
    from internal.export_jobs
    where state = 'pending'
      and scheduled_at <= now()
    order by scheduled_at, created_at
    for update skip locked
    limit 1
  )
  returning * into claimed;

  if claimed.id is null then
    return null;
  end if;

  return to_jsonb(claimed);
end;
$$;

create or replace function internal.claim_notification_job(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  claimed internal.notification_queue%rowtype;
begin
  update internal.notification_queue nq
  set state = 'running',
      locked_by = worker_id,
      locked_at = now(),
      started_at = coalesce(nq.started_at, now()),
      updated_at = now()
  where nq.id = (
    select id
    from internal.notification_queue
    where state = 'pending'
      and scheduled_at <= now()
    order by scheduled_at, created_at
    for update skip locked
    limit 1
  )
  returning * into claimed;

  if claimed.id is null then
    return null;
  end if;

  return to_jsonb(claimed);
end;
$$;

create or replace function internal.complete_job(
  p_job_table text,
  p_job_id uuid,
  p_result jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
begin
  if p_job_table = 'embedding_jobs' then
    update internal.embedding_jobs set state = 'complete', completed_at = now(), locked_by = null, locked_at = null, failure_reason = null, updated_at = now() where id = p_job_id;
  elsif p_job_table = 'transcription_jobs' then
    update internal.transcription_jobs set state = 'complete', completed_at = now(), locked_by = null, locked_at = null, failure_reason = null, updated_at = now() where id = p_job_id;
  elsif p_job_table = 'cleanup_jobs' then
    update internal.cleanup_jobs set state = 'complete', completed_at = now(), locked_by = null, locked_at = null, failure_reason = null, payload = payload || coalesce(p_result, '{}'::jsonb), updated_at = now() where id = p_job_id;
  elsif p_job_table = 'export_jobs' then
    update internal.export_jobs set state = 'complete', completed_at = now(), locked_by = null, locked_at = null, failure_reason = null, updated_at = now() where id = p_job_id;
  elsif p_job_table = 'notification_queue' then
    update internal.notification_queue set state = 'sent', sent_at = now(), completed_at = now(), locked_by = null, locked_at = null, failure_reason = null, updated_at = now() where id = p_job_id;
  else
    raise exception 'Unsupported job table: %', p_job_table using errcode = '22023';
  end if;

  return p_job_id;
end;
$$;

create or replace function internal.write_dead_letter(
  p_job_table text,
  p_job_id uuid,
  p_payload jsonb,
  p_failure_reason text
)
returns uuid
language plpgsql
security definer
set search_path = internal, pg_temp
as $$
declare
  dead_id uuid;
begin
  insert into internal.dead_letter_jobs (job_table, job_id, payload, failure_reason)
  values ('internal.' || p_job_table, p_job_id, coalesce(p_payload, '{}'::jsonb), internal.sanitize_failure_reason(p_failure_reason))
  on conflict (job_table, job_id) do update
    set payload = internal.dead_letter_jobs.payload || excluded.payload,
        failure_reason = excluded.failure_reason
  returning id into dead_id;

  return dead_id;
end;
$$;

create or replace function internal.fail_job(
  p_job_table text,
  p_job_id uuid,
  p_failure_reason text,
  p_retryable boolean default true,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  next_attempts int;
  max_allowed int;
  clean_reason text := internal.sanitize_failure_reason(p_failure_reason);
  should_retry boolean;
  job_payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  if p_job_table = 'embedding_jobs' then
    select attempts + 1, max_attempts, to_jsonb(ej) || job_payload into next_attempts, max_allowed, job_payload from internal.embedding_jobs ej where id = p_job_id;
    should_retry := p_retryable and next_attempts < max_allowed;
    if should_retry then
      update internal.embedding_jobs set state = 'pending', attempts = next_attempts, debounce_until = now() + internal.backoff_interval(p_job_table, next_attempts), locked_by = null, locked_at = null, failure_reason = clean_reason, updated_at = now() where id = p_job_id;
    else
      update internal.embedding_jobs set state = 'failed', attempts = next_attempts, locked_by = null, locked_at = null, failure_reason = clean_reason, updated_at = now() where id = p_job_id;
      perform internal.write_dead_letter(p_job_table, p_job_id, job_payload, clean_reason);
    end if;
  elsif p_job_table = 'transcription_jobs' then
    select attempts + 1, max_attempts, to_jsonb(tj) || job_payload into next_attempts, max_allowed, job_payload from internal.transcription_jobs tj where id = p_job_id;
    should_retry := p_retryable and next_attempts < max_allowed;
    if should_retry then
      update internal.transcription_jobs set state = 'pending', attempts = next_attempts, scheduled_at = now() + internal.backoff_interval(p_job_table, next_attempts), locked_by = null, locked_at = null, failure_reason = clean_reason, updated_at = now() where id = p_job_id;
    else
      update internal.transcription_jobs set state = 'failed', attempts = next_attempts, locked_by = null, locked_at = null, failure_reason = clean_reason, updated_at = now() where id = p_job_id;
      update public.transcripts t
      set state = 'failed',
          failure_reason = clean_reason,
          updated_at = now()
      from internal.transcription_jobs tj
      where tj.id = p_job_id
        and t.session_id = tj.session_id
        and t.workspace_id = tj.workspace_id
        and t.world_id = tj.world_id
        and t.saga_id = tj.saga_id;
      perform internal.write_dead_letter(p_job_table, p_job_id, job_payload, clean_reason);
    end if;
  elsif p_job_table = 'cleanup_jobs' then
    select attempts + 1, max_attempts, to_jsonb(cj) || job_payload into next_attempts, max_allowed, job_payload from internal.cleanup_jobs cj where id = p_job_id;
    should_retry := p_retryable and next_attempts < max_allowed;
    if should_retry then
      update internal.cleanup_jobs set state = 'pending', attempts = next_attempts, scheduled_at = now() + internal.backoff_interval(p_job_table, next_attempts), locked_by = null, locked_at = null, failure_reason = clean_reason, updated_at = now() where id = p_job_id;
    else
      update internal.cleanup_jobs set state = 'failed', attempts = next_attempts, locked_by = null, locked_at = null, failure_reason = clean_reason, updated_at = now() where id = p_job_id;
      perform internal.write_dead_letter(p_job_table, p_job_id, job_payload, clean_reason);
    end if;
  elsif p_job_table = 'export_jobs' then
    select attempts + 1, max_attempts, to_jsonb(ej) || job_payload into next_attempts, max_allowed, job_payload from internal.export_jobs ej where id = p_job_id;
    should_retry := p_retryable and next_attempts < max_allowed;
    if should_retry then
      update internal.export_jobs set state = 'pending', attempts = next_attempts, scheduled_at = now() + internal.backoff_interval(p_job_table, next_attempts), locked_by = null, locked_at = null, failure_reason = clean_reason, updated_at = now() where id = p_job_id;
    else
      update internal.export_jobs set state = 'failed', attempts = next_attempts, locked_by = null, locked_at = null, failure_reason = clean_reason, updated_at = now() where id = p_job_id;
      perform internal.write_dead_letter(p_job_table, p_job_id, job_payload, clean_reason);
    end if;
  elsif p_job_table = 'notification_queue' then
    select attempts + 1, max_attempts, to_jsonb(nq) || job_payload into next_attempts, max_allowed, job_payload from internal.notification_queue nq where id = p_job_id;
    should_retry := p_retryable and next_attempts < max_allowed;
    if should_retry then
      update internal.notification_queue set state = 'pending', attempts = next_attempts, scheduled_at = now() + internal.backoff_interval(p_job_table, next_attempts), locked_by = null, locked_at = null, failure_reason = clean_reason, updated_at = now() where id = p_job_id;
    else
      update internal.notification_queue set state = 'failed', attempts = next_attempts, locked_by = null, locked_at = null, failure_reason = clean_reason, updated_at = now() where id = p_job_id;
      perform internal.write_dead_letter(p_job_table, p_job_id, job_payload, clean_reason);
    end if;
  else
    raise exception 'Unsupported job table: %', p_job_table using errcode = '22023';
  end if;

  return p_job_id;
end;
$$;

create or replace function internal.reset_stalled_jobs(p_stale_after interval default interval '10 minutes')
returns integer
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  reset_count int := 0;
  changed int;
begin
  update internal.embedding_jobs
  set state = 'pending', locked_by = null, locked_at = null, updated_at = now()
  where state = 'running' and coalesce(locked_at, started_at, updated_at) < now() - p_stale_after;
  get diagnostics changed = row_count;
  reset_count := reset_count + changed;

  update internal.transcription_jobs
  set state = 'pending', locked_by = null, locked_at = null, updated_at = now()
  where state = 'running' and coalesce(locked_at, started_at, updated_at) < now() - p_stale_after;
  get diagnostics changed = row_count;
  reset_count := reset_count + changed;

  update internal.cleanup_jobs
  set state = 'pending', locked_by = null, locked_at = null, updated_at = now()
  where state = 'running' and coalesce(locked_at, started_at, updated_at) < now() - p_stale_after;
  get diagnostics changed = row_count;
  reset_count := reset_count + changed;

  update internal.export_jobs
  set state = 'pending', locked_by = null, locked_at = null, updated_at = now()
  where state = 'running' and coalesce(locked_at, started_at, updated_at) < now() - p_stale_after;
  get diagnostics changed = row_count;
  reset_count := reset_count + changed;

  update internal.notification_queue
  set state = 'pending', locked_by = null, locked_at = null, updated_at = now()
  where state = 'running' and coalesce(locked_at, started_at, updated_at) < now() - p_stale_after;
  get diagnostics changed = row_count;
  reset_count := reset_count + changed;

  return reset_count;
end;
$$;
