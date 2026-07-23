create extension if not exists pgtap with schema extensions;
begin;
select plan(21);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,email_change_token_new,recovery_token)
values
('e3000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','guide@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','',''),
('e3000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-guide@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','')
on conflict(id) do nothing;
insert into public.workspaces(id,owner_gm_id,name,usage_limits) values
('e3010000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001','Guide Workspace','{"plan":"test","ai_credits_monthly":100,"transcription_seconds_monthly":3600,"storage_bytes":1000000,"worlds_active":5,"sagas_active":5,"entities_per_saga":100,"imports_monthly":10,"exports_monthly":10}')
on conflict(id) do nothing;
insert into public.worlds(id,workspace_id,owner_gm_id,name) values
('e3020000-0000-0000-0000-000000000001','e3010000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001','Guide World')
on conflict(id) do nothing;
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name) values
('e3030000-0000-0000-0000-000000000001','e3010000-0000-0000-0000-000000000001','e3020000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001','Guide Saga'),
('e3030000-0000-0000-0000-000000000002','e3010000-0000-0000-0000-000000000001','e3020000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001','Sibling Saga')
on conflict(id) do nothing;
insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state)
values
('e3040000-0000-0000-0000-000000000001','e3010000-0000-0000-0000-000000000001','e3020000-0000-0000-0000-000000000001','e3030000-0000-0000-0000-000000000001','saga','Mara','Gate captain','Mara guards the sealed Iron Gate.','canon'),
('e3040000-0000-0000-0000-000000000002','e3010000-0000-0000-0000-000000000001','e3020000-0000-0000-0000-000000000001','e3030000-0000-0000-0000-000000000002','saga','Sibling Mara','Forbidden sibling','Must never appear.','canon')
on conflict(id) do nothing;
insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,source_entity_type,source_entity_id,raw_excerpt)
values
('e3060000-0000-0000-0000-000000000001','e3010000-0000-0000-0000-000000000001','e3020000-0000-0000-0000-000000000001','e3030000-0000-0000-0000-000000000001','saga','existing_entity','character','e3040000-0000-0000-0000-000000000001','Mara guards the sealed Iron Gate.'),
('e3060000-0000-0000-0000-000000000002','e3010000-0000-0000-0000-000000000001','e3020000-0000-0000-0000-000000000001','e3030000-0000-0000-0000-000000000002','saga','existing_entity','character','e3040000-0000-0000-0000-000000000002','Forbidden sibling evidence.')
on conflict(id) do nothing;

select is((select prompt_version from internal.ai_task_contracts() where task_name='answer_saga_question'),'answer_saga_question@1.1.0','Guide task contract is versioned');
select has_table('public','guide_threads','Guide threads exist');
select has_table('public','guide_turns','Guide turns exist');
select has_table('internal','guide_evidence_snapshots','Guide evidence snapshot is internal');

select lives_ok($$
  select public.create_guide_turn_for_worker(
    'e3010000-0000-0000-0000-000000000001','e3020000-0000-0000-0000-000000000001',
    'e3030000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001',
    null,'e3100000-0000-0000-0000-000000000001','e3110000-0000-0000-0000-000000000001',
    '  What protects the eastern road?  ','lexical_fallback',
    array['e3060000-0000-0000-0000-000000000001','e3060000-0000-0000-0000-000000000002']::uuid[])
$$,'Worker creates a normalized scoped Guide turn');
select is((select question from public.guide_turns where id='e3100000-0000-0000-0000-000000000001'),'What protects the eastern road?','Question is normalized');
select is((select count(*)::int from internal.guide_evidence_snapshots where turn_id='e3100000-0000-0000-0000-000000000001'),1,'Sibling-Saga evidence is excluded');
select is((select prompt_version from internal.ai_task_runs where guide_turn_id='e3100000-0000-0000-0000-000000000001'),'answer_saga_question@1.1.0','Turn invokes registered task');
select is((select allowed_source_ids from internal.ai_task_runs where guide_turn_id='e3100000-0000-0000-0000-000000000001'),array['e3060000-0000-0000-0000-000000000001']::uuid[],'Run freezes its source allowlist');

select lives_ok($$
  select public.create_guide_turn_for_worker(
    'e3010000-0000-0000-0000-000000000001','e3020000-0000-0000-0000-000000000001',
    'e3030000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001',
    (select thread_id from public.guide_turns where id='e3100000-0000-0000-0000-000000000001'),
    'e3100000-0000-0000-0000-000000000099','e3110000-0000-0000-0000-000000000001',
    'What protects the eastern road?','lexical_fallback',array['e3060000-0000-0000-0000-000000000001']::uuid[])
$$,'Exact retry returns the existing turn');
select is((select count(*)::int from public.guide_turns where saga_id='e3030000-0000-0000-0000-000000000001'),1,'Exact retry creates no duplicate turn');
select throws_ok($$
  select public.create_guide_turn_for_worker(
    'e3010000-0000-0000-0000-000000000001','e3020000-0000-0000-0000-000000000001',
    'e3030000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001',
    null,'e3100000-0000-0000-0000-000000000098','e3110000-0000-0000-0000-000000000001',
    'A changed question','none','{}'::uuid[])
$$,'23505','Guide idempotency key was already used for another question','Changed payload cannot reuse idempotency identity');

select lives_ok(format($f$
  select public.complete_guide_turn_for_worker(%L,
  '{"no_answer":false,"blocks":[{"type":"grounded_answer","text":"The Iron Gate protects the road.","citations":[{"source_id":"e3060000-0000-0000-0000-000000000001"}]},{"type":"action_preview","action":{"type":"draft_entity","entity_type":"character","intent":"Draft the gate lieutenant."},"explanation":"Creates a pending reviewed draft."}],"confidence_reason":"single_clear_segment"}')
$f$,(select ai_task_run_id from public.guide_turns where id='e3100000-0000-0000-0000-000000000001')),'Worker completes the Guide turn');
select is((select status from public.guide_turns where id='e3100000-0000-0000-0000-000000000001'),'complete','Completed response is recoverable');
select is((select count(*)::int from public.guide_action_intents where saga_id='e3030000-0000-0000-0000-000000000001'),1,'Validated action intent is stored separately');
select is((select count(*)::int from public.drafts where saga_id='e3030000-0000-0000-0000-000000000001'),0,'Guide answer and action preview write no drafts');
select is((select count(*)::int from public.canon_audit where saga_id='e3030000-0000-0000-0000-000000000001'),0,'Guide answer writes no canon audit');

select set_config('request.jwt.claim.sub','e3000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
select ok(public.get_guide_thread('e3010000-0000-0000-0000-000000000001','e3020000-0000-0000-0000-000000000001','e3030000-0000-0000-0000-000000000001',null) is not null,'Owner recovers the active Guide thread');
select is(
  (public.set_guide_action_state(
    'e3010000-0000-0000-0000-000000000001',
    'e3020000-0000-0000-0000-000000000001',
    'e3030000-0000-0000-0000-000000000001',
    (
      public.get_guide_thread(
        'e3010000-0000-0000-0000-000000000001',
        'e3020000-0000-0000-0000-000000000001',
        'e3030000-0000-0000-0000-000000000001',
        null
      )->'turns'->0->'actions'->0->>'id'
    )::uuid,
    'accepted'
  )->>'state'),
  'processing',
  'Confirmed entity action enters its separately metered task path'
);
select is(
  public.get_guide_thread(
    'e3010000-0000-0000-0000-000000000001',
    'e3020000-0000-0000-0000-000000000001',
    'e3030000-0000-0000-0000-000000000002',
    null
  ),
  null::jsonb,
  'Sibling Saga route cannot recover the current Saga thread'
);
reset role;
select is(
  (select task_name from internal.ai_task_runs where saga_id='e3030000-0000-0000-0000-000000000001' and task_name='draft_entity_from_prompt' and input_payload ? 'guide_action_id' limit 1),
  'draft_entity_from_prompt',
  'Confirmed action invokes the registered entity drafting task'
);

select * from finish();
rollback;
