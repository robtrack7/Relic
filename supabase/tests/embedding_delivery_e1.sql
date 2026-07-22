create extension if not exists pgtap with schema extensions;

begin;

select plan(42);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e1-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
  ('e1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e1-b@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values
  ('e1100000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light'),
  ('e1100000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name) values
  ('e1200000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'E1 Workspace A'),
  ('e1200000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'E1 Workspace B')
on conflict (id) do nothing;
insert into public.worlds (id, workspace_id, owner_gm_id, name) values
  ('e1300000-0000-0000-0000-000000000001', 'e1200000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'E1 World A'),
  ('e1300000-0000-0000-0000-000000000002', 'e1200000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'E1 World B')
on conflict (id) do nothing;
insert into public.world_eras (id, workspace_id, world_id, name) values
  ('e1400000-0000-0000-0000-000000000001', 'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'E1 Era A'),
  ('e1400000-0000-0000-0000-000000000002', 'e1200000-0000-0000-0000-000000000002', 'e1300000-0000-0000-0000-000000000002', 'E1 Era B')
on conflict (id) do nothing;
insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name) values
  ('e1500000-0000-0000-0000-000000000001', 'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'e1400000-0000-0000-0000-000000000001', 'E1 Current Saga'),
  ('e1500000-0000-0000-0000-000000000002', 'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'e1400000-0000-0000-0000-000000000001', 'E1 Sibling Saga'),
  ('e1500000-0000-0000-0000-000000000003', 'e1200000-0000-0000-0000-000000000002', 'e1300000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'e1400000-0000-0000-0000-000000000002', 'E1 Other Tenant')
on conflict (id) do nothing;

delete from internal.embedding_jobs where workspace_id in ('e1200000-0000-0000-0000-000000000001', 'e1200000-0000-0000-0000-000000000002');
delete from internal.dead_letter_jobs where job_table = 'internal.embedding_jobs' and payload->>'workspace_id' in ('e1200000-0000-0000-0000-000000000001', 'e1200000-0000-0000-0000-000000000002');
update internal.embedding_jobs set scheduled_at = now() + interval '1 day', debounce_until = now() + interval '1 day'
where state in ('queued','retryable');

insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes)
values ('e1600000-0000-0000-0000-000000000001', 'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'e1500000-0000-0000-0000-000000000001', 'saga', 'Lantern Keeper', 'Guards a submerged gate', 'A physician protects the drowned road.', 'PRIVATE_E1_FIELD');

select is((select count(*) from internal.embedding_jobs where source_entity_id = 'e1600000-0000-0000-0000-000000000001'), 1::bigint, 'canonical insert enqueues one versioned job');
select ok((select input_hash ~ '^[0-9a-f]{64}$' and source_version <> '' and dimensions = 1536 from internal.embedding_jobs where source_entity_id = 'e1600000-0000-0000-0000-000000000001'), 'job stores hash, source version, and dimensions');
select ok((select request_identity = idempotency_key from internal.embedding_jobs where source_entity_id = 'e1600000-0000-0000-0000-000000000001'), 'request identity is the exact delivery idempotency key');

update internal.embedding_jobs set scheduled_at = now(), debounce_until = now() where source_entity_id = 'e1600000-0000-0000-0000-000000000001';
create temp table e1_first_claim as select internal.claim_embedding_job('e1-worker-a') job;
select ok((select job->>'id' is not null from e1_first_claim), 'due work is claimed');
select is(internal.claim_embedding_job('e1-worker-b'), null::jsonb, 'concurrent duplicate claim returns no work');

select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);
create temp table e1_first_prepare as select public.prepare_embedding_job(((select job->>'id' from e1_first_claim))::uuid) prepared;
select is((select prepared->>'status' from e1_first_prepare), 'ready', 'scoped worker preparation resolves current input');
select ok((select prepared->>'input' not like '%PRIVATE_E1_FIELD%' from e1_first_prepare), 'GM-private fields never enter embedding input');

create temp table e1_first_complete as
select public.complete_embedding_job_for_worker(
  ((select job->>'id' from e1_first_claim))::uuid,
  to_jsonb(array_prepend(1::numeric, array_fill(0::numeric, array[1535]))),
  'deterministic-development-test', 'text-embedding-3-small', 1536, '{}', null, false
) result;
select is((select result->>'status' from e1_first_complete), 'complete', 'validated deterministic result persists through worker completion');
select is((select count(*) from public.embeddings where source_entity_id = 'e1600000-0000-0000-0000-000000000001' and is_current), 1::bigint, 'one current embedding is persisted');
select is((select count(*) from public.usage_events where event_kind = 'embedding' and metadata->>'job_id' = (select job->>'id' from e1_first_claim)), 0::bigint, 'deterministic delivery is never billable');
select is((select gm_notes from public.characters where id = 'e1600000-0000-0000-0000-000000000001'), 'PRIVATE_E1_FIELD', 'embedding completion performs zero canon writes');

select public.complete_embedding_job_for_worker(
  ((select job->>'id' from e1_first_claim))::uuid,
  to_jsonb(array_prepend(1::numeric, array_fill(0::numeric, array[1535]))),
  'deterministic-development-test', 'text-embedding-3-small', 1536, '{}', null, false
);
select is((select count(*) from public.embeddings where source_entity_id = 'e1600000-0000-0000-0000-000000000001'), 1::bigint, 'exact redelivery confirms the existing result');

update public.characters set narrative = 'A healer now protects the flooded western road.', updated_at = clock_timestamp()
where id = 'e1600000-0000-0000-0000-000000000001';
select is((select count(*) from internal.embedding_jobs where source_entity_id = 'e1600000-0000-0000-0000-000000000001'), 2::bigint, 'changed content creates a new required embedding version');
select is((select count(*) from public.embeddings where source_entity_id = 'e1600000-0000-0000-0000-000000000001' and is_current), 1::bigint, 'prior usable embedding remains current while replacement is queued');

update internal.embedding_jobs set scheduled_at = now(), debounce_until = now()
where source_entity_id = 'e1600000-0000-0000-0000-000000000001' and state = 'queued';
create temp table e1_old_running as select internal.claim_embedding_job('e1-worker-old') job;
update public.characters set narrative = 'A doctor conceals the sea road beneath the western cliff.', updated_at = clock_timestamp()
where id = 'e1600000-0000-0000-0000-000000000001';
select is((select state from internal.embedding_jobs where id = ((select job->>'id' from e1_old_running))::uuid), 'stale', 'rapid edit supersedes running obsolete work');
select is((public.complete_embedding_job_for_worker(
  ((select job->>'id' from e1_old_running))::uuid,
  to_jsonb(array_prepend(0.8::numeric, array_prepend(0.2::numeric, array_fill(0::numeric, array[1534])))),
  'litellm', 'text-embedding-3-small', 1536, '{"input_tokens":8,"total_tokens":8}', 'e1-request-old', true
)->>'status'), 'stale', 'older provider completion cannot overwrite newer work');
select is((select count(*) from public.usage_events where idempotency_key = 'embedding-job:' || ((select job->>'id' from e1_old_running)) || ':provider-accepted'), 1::bigint, 'provider-accepted stale delivery is metered once');
select ok((select metadata->>'user_charge' = 'false' from public.usage_events where idempotency_key = 'embedding-job:' || ((select job->>'id' from e1_old_running)) || ':provider-accepted'), 'superseded hosted work is not charged to the user');

select throws_like(
  $$ select public.complete_embedding_job_for_worker(
    ((select id from internal.embedding_jobs where source_entity_id = 'e1600000-0000-0000-0000-000000000001' and state = 'queued' order by created_at desc limit 1)),
    '[0]'::jsonb, 'litellm', 'text-embedding-3-small', 1, '{}', null, true
  ) $$,
  '%embedding_dimension_mismatch%',
  'dimension mismatch is rejected before persistence or metering'
);

update internal.embedding_jobs set scheduled_at = now(), debounce_until = now()
where source_entity_id = 'e1600000-0000-0000-0000-000000000001' and state = 'queued';
create temp table e1_latest_claim as select internal.claim_embedding_job('e1-worker-latest') job;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000002', true);
select throws_like(
  format('select public.prepare_embedding_job(%L::uuid)', (select job->>'id' from e1_latest_claim)),
  '%embedding_job_scope_denied%',
  'cross-tenant worker identity cannot prepare another tenant job'
);

select public.fail_embedding_job_for_worker(((select job->>'id' from e1_latest_claim))::uuid, 'timeout', true);
select is((select state from internal.embedding_jobs where id = ((select job->>'id' from e1_latest_claim))::uuid), 'retryable', 'retryable provider failure preserves recoverable work');
select is((select count(*) from public.embeddings where source_entity_id = 'e1600000-0000-0000-0000-000000000001' and is_current), 1::bigint, 'provider failure preserves the last good embedding');
select is((select count(*) from public.usage_events where metadata->>'job_id' = (select job->>'id' from e1_latest_claim)), 0::bigint, 'provider failure creates no usage event');

update internal.embedding_jobs set state = 'running', attempts = 4 where id = ((select job->>'id' from e1_latest_claim))::uuid;
select public.fail_embedding_job_for_worker(((select job->>'id' from e1_latest_claim))::uuid, 'provider_unavailable', true);
select is((select state from internal.embedding_jobs where id = ((select job->>'id' from e1_latest_claim))::uuid), 'dead_letter', 'retry exhaustion becomes dead-lettered');
select is((select count(*) from internal.dead_letter_jobs where job_table = 'internal.embedding_jobs' and job_id = ((select job->>'id' from e1_latest_claim))::uuid), 1::bigint, 'dead-letter payload is observable once');
select ok((select payload::text not like '%doctor conceals%' from internal.dead_letter_jobs where job_table = 'internal.embedding_jobs' and job_id = ((select job->>'id' from e1_latest_claim))::uuid), 'dead-letter payload contains no source text');
select is((public.replay_embedding_job_for_worker(((select job->>'id' from e1_latest_claim))::uuid)->>'status'), 'queued', 'eligible dead letter can be replayed');
select ok((public.replay_embedding_job_for_worker(((select job->>'id' from e1_latest_claim))::uuid)->>'duplicate_replay')::boolean, 'duplicate replay request is idempotent');

insert into public.quota_overrides (workspace_id, limit_key, override_value, reason)
values ('e1200000-0000-0000-0000-000000000001', 'embedding_tokens_monthly', 0, 'E1 quota fixture');
update internal.embedding_jobs set scheduled_at = now(), debounce_until = now() where id = ((select job->>'id' from e1_latest_claim))::uuid;
create temp table e1_quota_claim as select internal.claim_embedding_job('e1-worker-quota') job;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);
create temp table e1_quota_prepare as select public.prepare_embedding_job(((select job->>'id' from e1_quota_claim))::uuid) prepared;
select is((select prepared->>'status' from e1_quota_prepare), 'quota_blocked', 'quota denial preserves source work in a recoverable state');
select is((select state from internal.embedding_jobs where id = ((select job->>'id' from e1_quota_claim))::uuid), 'retryable', 'quota-blocked job is not lost');
delete from public.quota_overrides where workspace_id = 'e1200000-0000-0000-0000-000000000001' and limit_key = 'embedding_tokens_monthly';

insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name, status, ended_at)
values ('e1700000-0000-0000-0000-000000000001', 'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'e1500000-0000-0000-0000-000000000001', 'saga', 'E1 Transcript Session', 'ended', now());
insert into public.pipeline_runs (id, workspace_id, world_id, saga_id, session_id, state)
values ('e1800000-0000-0000-0000-000000000001', 'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'e1500000-0000-0000-0000-000000000001', 'e1700000-0000-0000-0000-000000000001', 'ready_for_review');
insert into public.transcripts (id, workspace_id, world_id, saga_id, session_id, whisper_model, duration_seconds, state, segments)
values ('e1900000-0000-0000-0000-000000000001', 'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'e1500000-0000-0000-0000-000000000001', 'e1700000-0000-0000-0000-000000000001', 'relic-transcribe', 40, 'pending', '[{"start":0,"end":40,"text":"The bronze door opens beneath the tide.","deleted":false}]');
update public.transcripts set state = 'complete', updated_at = clock_timestamp() where id = 'e1900000-0000-0000-0000-000000000001';
select is((select count(*) from internal.embedding_jobs where source_kind = 'transcript_chunk' and source_entity_id = 'e1900000-0000-0000-0000-000000000001'), 1::bigint, 'completed transcript enqueues window embedding work');
select is((select count(*) from public.sources where transcript_id = 'e1900000-0000-0000-0000-000000000001' and kind = 'transcript_segment'), 1::bigint, 'transcript window receives immutable source evidence');

create temp table e1_frozen_source as select id, raw_excerpt from public.sources where transcript_id = 'e1900000-0000-0000-0000-000000000001' order by created_at limit 1;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);
select public.update_transcript_segments(
  'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'e1500000-0000-0000-0000-000000000001', 'e1900000-0000-0000-0000-000000000001',
  '[{"start":0,"end":40,"text":"The verdigris portal opens below the sea.","deleted":false}]'
);
select is((select count(*) from internal.embedding_jobs where source_kind = 'transcript_chunk' and source_entity_id = 'e1900000-0000-0000-0000-000000000001'), 2::bigint, 'transcript text edit enqueues a new version');
select is((select raw_excerpt from public.sources where id = (select id from e1_frozen_source)), (select raw_excerpt from e1_frozen_source), 'frozen citation excerpt remains unchanged after edit');
select ok((select (public.get_transcript_source_context((select id from e1_frozen_source))->>'drift_detected')::boolean), 'citation context reports transcript drift without mutating evidence');

select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);
select public.update_transcript_segments(
  'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'e1500000-0000-0000-0000-000000000001', 'e1900000-0000-0000-0000-000000000001',
  '[{"start":0,"end":40,"text":"The verdigris portal opens below the sea.","deleted":true}]'
);
select is((select count(*) from public.embeddings where source_kind = 'transcript_chunk' and source_entity_id = 'e1900000-0000-0000-0000-000000000001' and is_current), 0::bigint, 'soft-hide removes semantic eligibility immediately');
select ok((public.get_transcript_source_context((select id from e1_frozen_source))->>'current_text_deleted')::boolean, 'soft-hidden current context is reported deleted while evidence stays frozen');

select public.update_transcript_segments(
  'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'e1500000-0000-0000-0000-000000000001', 'e1900000-0000-0000-0000-000000000001',
  '[{"start":0,"end":40,"text":"The verdigris portal opens below the sea.","deleted":false}]'
);
select ok(exists (select 1 from internal.embedding_jobs where source_kind = 'transcript_chunk' and source_entity_id = 'e1900000-0000-0000-0000-000000000001' and state = 'queued'), 'restore re-enables semantic delivery work');
select ok(not (public.get_transcript_source_context((select id from e1_frozen_source))->>'current_text_deleted')::boolean, 'restore re-enables current transcript context');
select is((select raw_excerpt from public.sources where id = (select id from e1_frozen_source)), (select raw_excerpt from e1_frozen_source), 'restore still leaves frozen citation evidence unchanged');

select public.update_transcript_segments(
  'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'e1500000-0000-0000-0000-000000000001', 'e1900000-0000-0000-0000-000000000001',
  '[{"start":0,"end":40,"text":"The green portal opens below the sea.","deleted":false}]'
);
select public.update_transcript_segments(
  'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'e1500000-0000-0000-0000-000000000001', 'e1900000-0000-0000-0000-000000000001',
  '[{"start":0,"end":40,"text":"The green portal opens beneath the sea cliff.","deleted":false}]'
);
select is((select count(*) from internal.embedding_jobs where source_kind = 'transcript_chunk' and source_entity_id = 'e1900000-0000-0000-0000-000000000001' and state = 'queued'), 1::bigint, 'rapid transcript edits collapse to one latest queued version');
select throws_like(
  $$ select public.update_transcript_segments(
    'e1200000-0000-0000-0000-000000000001', 'e1300000-0000-0000-0000-000000000001', 'e1500000-0000-0000-0000-000000000002', 'e1900000-0000-0000-0000-000000000001',
    '[{"start":0,"end":40,"text":"Substitution attempt.","deleted":false}]'
  ) $$,
  '%not available%',
  'sibling-Saga substitution cannot edit or enqueue transcript work'
);

select * from finish();
rollback;
