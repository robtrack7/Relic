create extension if not exists pgtap with schema extensions;

begin;

select plan(27);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manual-evidence@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values ('e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Manual Evidence Workspace')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('e3000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Manual Evidence World')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values ('e4000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'Manual Evidence Era')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values
  ('e5000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'Manual Evidence Saga'),
  ('e5000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'Sibling Saga')
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, name, status, ended_at)
values
  ('e6000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', 'Pasted Notes Session', 'ended', now()),
  ('e6000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000002', 'Sibling Session', 'ended', now()),
  ('e6000000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', 'Live Session', 'in_progress', null),
  ('e6000000-0000-0000-0000-000000000004', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', 'Manual Summary Session', 'ended', now())
on conflict (id) do update set status = excluded.status, ended_at = excluded.ended_at;

insert into public.pipeline_runs (workspace_id, world_id, saga_id, session_id, state, failure_reason, inputs_summary)
values ('e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001', 'failed', 'no_inputs_after_transcription_failure', '{"transcript_failed":true}')
on conflict do nothing;

create temp table initial_counts as
select
  (select count(*) from public.notes) notes,
  (select count(*) from public.drafts) drafts,
  (select count(*) from public.canon_audit) audits,
  (select count(*) from internal.ai_task_runs) ai_runs,
  (select count(*) from public.usage_events) usage_events;

select has_function('public', 'save_session_evidence', array['uuid','uuid','uuid','uuid','uuid','source_kind','text'], 'manual evidence write RPC exists');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'e5000000-0000-0000-0000-000000000001', true);

create temp table pasted_result as
select public.save_session_evidence(
  'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001',
  'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001',
  'e8000000-0000-0000-0000-000000000001', 'pasted_text', 'The bridge collapsed after Mara crossed.'
) result;

select is((select result->>'kind' from pasted_result), 'pasted_text', 'pasted notes return their immutable source kind');
select is(
  public.save_session_evidence(
    'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001',
    'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001',
    'e8000000-0000-0000-0000-000000000001', 'pasted_text', 'The bridge collapsed after Mara crossed.'
  ),
  (select result from pasted_result),
  'an identical source UUID replay returns the first result'
);
select throws_like(
  $$ select public.save_session_evidence(
    'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001',
    'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001',
    'e8000000-0000-0000-0000-000000000001', 'pasted_text', 'Different text'
  ) $$,
  '%source key is already bound to different evidence%',
  'source UUID reuse with different text fails closed'
);
select throws_like(
  $$ select public.save_session_evidence(
    'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001',
    'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000003',
    'e8000000-0000-0000-0000-000000000003', 'pasted_text', 'Live text'
  ) $$,
  '%manual evidence can only be saved for an ended Session%',
  'manual evidence cannot be attached while Stage is live'
);
select throws_like(
  $$ select public.save_session_evidence(
    'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001',
    'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000002',
    'e8000000-0000-0000-0000-000000000004', 'pasted_text', 'Sibling text'
  ) $$,
  '%Session is not available%',
  'manual evidence rejects a Session outside the requested Saga scope'
);
select throws_like(
  $$ select public.save_session_evidence(
    'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001',
    'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001',
    'e8000000-0000-0000-0000-000000000005', 'note', 'Not an allowed manual source kind'
  ) $$,
  '%Unsupported manual evidence kind%',
  'manual evidence accepts only pasted notes or a GM summary'
);

create temp table summary_result as
select public.save_session_evidence(
  'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001',
  'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000004',
  'e8000000-0000-0000-0000-000000000002', 'gm_manual_summary', 'Mara chose the town over the relic.'
) result;

select is((select result->>'kind' from summary_result), 'gm_manual_summary', 'GM summary returns its immutable source kind');
select ok(
  (public.get_session_review(
    'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001',
    'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001'
  )->'manual_evidence') @> '[{"id":"e8000000-0000-0000-0000-000000000001","kind":"pasted_text"}]'::jsonb,
  'Session Review returns saved pasted-note evidence'
);
select ok(
  (public.get_session_review(
    'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001',
    'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000004'
  )->'manual_evidence') @> '[{"id":"e8000000-0000-0000-0000-000000000002","kind":"gm_manual_summary"}]'::jsonb,
  'Session Review returns saved GM-summary evidence'
);
reset role;

select is((select count(*) from public.sources where id = 'e8000000-0000-0000-0000-000000000001'), 1::bigint, 'pasted notes create one source row after duplicate delivery');
select ok((select workspace_id = 'e2000000-0000-0000-0000-000000000001' and world_id = 'e3000000-0000-0000-0000-000000000001' and saga_id = 'e5000000-0000-0000-0000-000000000001' and session_id = 'e6000000-0000-0000-0000-000000000001' and scope = 'saga' from public.sources where id = 'e8000000-0000-0000-0000-000000000001'), 'pasted source preserves the full Session hierarchy');
select is((select raw_excerpt from public.sources where id = 'e8000000-0000-0000-0000-000000000001'), 'The bridge collapsed after Mara crossed.', 'pasted source preserves submitted text');
select is((select state from public.pipeline_runs where session_id = 'e6000000-0000-0000-0000-000000000001' order by created_at desc limit 1), 'queued'::public.pipeline_state, 'pasted notes recover a no-input pipeline to queued');
select is((select failure_reason from public.pipeline_runs where session_id = 'e6000000-0000-0000-0000-000000000001' order by created_at desc limit 1), null, 'pasted notes clear only the no-input failure reason');
select is((select (inputs_summary->>'pasted_text_count')::integer from public.pipeline_runs where session_id = 'e6000000-0000-0000-0000-000000000001' order by created_at desc limit 1), 1, 'pasted notes independently register a surviving synthesis input');
select is((select count(*) from public.sources where id = 'e8000000-0000-0000-0000-000000000002'), 1::bigint, 'GM summary creates one source row');
select is((select count(*) from public.pipeline_runs where session_id = 'e6000000-0000-0000-0000-000000000004'), 1::bigint, 'GM summary creates the missing queued pipeline read model');
select is((select inputs_summary->>'gm_summary_present' from public.pipeline_runs where session_id = 'e6000000-0000-0000-0000-000000000004'), 'true', 'GM summary independently marks a surviving synthesis input');
select is((select (inputs_summary->>'manual_evidence_count')::integer from public.pipeline_runs where session_id = 'e6000000-0000-0000-0000-000000000004'), 1, 'manual-only pipeline counts one evidence input');
select is((select count(*) from public.notes), (select notes from initial_counts), 'manual evidence creates no note or canon content row');
select is((select count(*) from public.drafts), (select drafts from initial_counts), 'manual evidence creates no proposal draft');
select is((select count(*) from public.canon_audit), (select audits from initial_counts), 'manual evidence creates no canon audit mutation');
select is((select count(*) from internal.ai_task_runs), (select ai_runs from initial_counts), 'manual evidence does not invoke synthesis or create an AI run');
select is((select count(*) from public.usage_events), (select usage_events from initial_counts), 'manual evidence does not meter or charge usage');
select ok(not has_function_privilege('anon', 'public.save_session_evidence(uuid,uuid,uuid,uuid,uuid,public.source_kind,text)', 'execute'), 'anonymous role cannot execute manual evidence intake');

set local role anon;
select throws_like(
  $$ select public.save_session_evidence(
    'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001',
    'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001',
    'e8000000-0000-0000-0000-000000000006', 'pasted_text', 'Anonymous text'
  ) $$,
  '%permission denied%',
  'anonymous manual evidence call is denied'
);
reset role;

select * from finish();
rollback;
