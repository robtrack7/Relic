create extension if not exists pgtap with schema extensions;

begin;

select plan(27);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd1-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', ''),
  ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd1-b@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name) values
  ('d1100000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'D1 Workspace One'),
  ('d1100000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'D1 Workspace Two'),
  ('d1100000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000002', 'D1 Other Owner')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name) values
  ('d1200000-0000-0000-0000-000000000001', 'd1100000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'D1 World One'),
  ('d1200000-0000-0000-0000-000000000002', 'd1100000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'D1 World Two'),
  ('d1200000-0000-0000-0000-000000000003', 'd1100000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'D1 World Three'),
  ('d1200000-0000-0000-0000-000000000004', 'd1100000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000002', 'D1 Private World')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, name) values
  ('d1300000-0000-0000-0000-000000000001', 'd1100000-0000-0000-0000-000000000001', 'd1200000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'D1 Saga One'),
  ('d1300000-0000-0000-0000-000000000002', 'd1100000-0000-0000-0000-000000000001', 'd1200000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'D1 Saga Sibling'),
  ('d1300000-0000-0000-0000-000000000003', 'd1100000-0000-0000-0000-000000000001', 'd1200000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'D1 Saga Other World'),
  ('d1300000-0000-0000-0000-000000000004', 'd1100000-0000-0000-0000-000000000002', 'd1200000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'D1 Saga Other Workspace'),
  ('d1300000-0000-0000-0000-000000000005', 'd1100000-0000-0000-0000-000000000003', 'd1200000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000002', 'D1 Private Saga')
on conflict (id) do nothing;

insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, canon_state, created_by) values
  ('d1400000-0000-0000-0000-000000000001', 'd1100000-0000-0000-0000-000000000001', 'd1200000-0000-0000-0000-000000000001', 'd1300000-0000-0000-0000-000000000001', 'saga', 'D1 Delete Me', 'canon', 'gm'),
  ('d1400000-0000-0000-0000-000000000002', 'd1100000-0000-0000-0000-000000000001', 'd1200000-0000-0000-0000-000000000001', 'd1300000-0000-0000-0000-000000000002', 'saga', 'D1 Keep Me', 'canon', 'gm')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'd1300000-0000-0000-0000-000000000001', true);

select has_function('public', 'rename_saga', array['uuid','uuid','uuid','text'], 'rename_saga has a scoped browser signature');
select has_function('public', 'delete_saga', array['uuid','uuid','uuid','text'], 'delete_saga has a scoped typed-confirmation signature');

create temp table d1_context as
select public.get_saga_context(
  'd1100000-0000-0000-0000-000000000001',
  'd1200000-0000-0000-0000-000000000001',
  'd1300000-0000-0000-0000-000000000001'
) as payload;

select is(jsonb_array_length(payload #> '{hierarchy,workspaces}'), 2, 'hierarchy lists only workspaces owned by the caller') from d1_context;
select is(jsonb_array_length(payload #> '{hierarchy,worlds}'), 2, 'hierarchy lists Worlds only inside the active Workspace') from d1_context;
select is(jsonb_array_length(payload #> '{hierarchy,sagas}'), 2, 'hierarchy lists Sagas only inside the active World') from d1_context;
select ok(not (payload::text like '%D1 Private%'), 'hierarchy payload does not leak another owner names') from d1_context;
select is(payload #>> '{hierarchy,workspaces,0,target,sagaId}', 'd1300000-0000-0000-0000-000000000001', 'active Workspace option retains the exact current route') from d1_context;
select is(payload #>> '{hierarchy,worlds,0,target,sagaId}', 'd1300000-0000-0000-0000-000000000001', 'active World option retains the exact current route') from d1_context;
select ok((payload #> '{hierarchy,workspaces,1,target}') ? 'sagaId', 'each switchable Workspace supplies an authorized landing target') from d1_context;

select is(
  public.rename_saga('d1100000-0000-0000-0000-000000000001', 'd1200000-0000-0000-0000-000000000001', 'd1300000-0000-0000-0000-000000000001', 'D1 Saga Renamed')->>'name',
  'D1 Saga Renamed',
  'owner can rename a scoped Saga'
);
reset role;
select is((select name from public.sagas where id='d1300000-0000-0000-0000-000000000001'), 'D1 Saga Renamed', 'rename persists only to the target Saga');
select is((select name from public.sagas where id='d1300000-0000-0000-0000-000000000002'), 'D1 Saga Sibling', 'rename leaves the sibling Saga unchanged');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'd1300000-0000-0000-0000-000000000001', true);
select throws_like(
  $$ select public.rename_saga('d1100000-0000-0000-0000-000000000003', 'd1200000-0000-0000-0000-000000000004', 'd1300000-0000-0000-0000-000000000005', 'Leaked') $$,
  '%saga context is not available%',
  'rename rejects another owner hierarchy'
);
select throws_like(
  $$ select public.delete_saga('d1100000-0000-0000-0000-000000000001', 'd1200000-0000-0000-0000-000000000001', 'd1300000-0000-0000-0000-000000000001', 'wrong') $$,
  '%confirmation name does not match%',
  'delete requires the exact current Saga name'
);

reset role;
insert into public.sessions (id, workspace_id, world_id, saga_id, name, status)
values ('d1500000-0000-0000-0000-000000000001', 'd1100000-0000-0000-0000-000000000001', 'd1200000-0000-0000-0000-000000000001', 'd1300000-0000-0000-0000-000000000001', 'D1 Live Session', 'in_progress');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'd1300000-0000-0000-0000-000000000001', true);
select is(
  public.get_saga_context('d1100000-0000-0000-0000-000000000001', 'd1200000-0000-0000-0000-000000000001', 'd1300000-0000-0000-0000-000000000001') #>> '{hierarchy,switching_blocked}',
  'true',
  'hierarchy context blocks switching while a Session is live'
);
select throws_like(
  $$ select public.delete_saga('d1100000-0000-0000-0000-000000000001', 'd1200000-0000-0000-0000-000000000001', 'd1300000-0000-0000-0000-000000000001', 'D1 Saga Renamed') $$,
  '%cannot delete a Saga while a session is live or ending%',
  'delete is blocked while the Saga has a live Session'
);
select ok((select deleted_at is null from public.sagas where id='d1300000-0000-0000-0000-000000000001'), 'blocked delete leaves Saga active');

reset role;
update public.sessions set status='ended' where id='d1500000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'd1300000-0000-0000-0000-000000000001', true);
create temp table d1_delete as
select public.delete_saga(
  'd1100000-0000-0000-0000-000000000001',
  'd1200000-0000-0000-0000-000000000001',
  'd1300000-0000-0000-0000-000000000001',
  'D1 Saga Renamed'
) as payload;

select is(payload->>'state', 'cleanup_pending', 'confirmed delete returns a cleanup-pending state') from d1_delete;
select is(payload->>'next_saga_id', 'd1300000-0000-0000-0000-000000000002', 'delete chooses the same-World sibling as the next context') from d1_delete;
reset role;
select ok((select deleted_at is not null from public.sagas where id='d1300000-0000-0000-0000-000000000001'), 'confirmed delete immediately hides the Saga');
select is((select count(*) from internal.cleanup_jobs where saga_id='d1300000-0000-0000-0000-000000000001' and job_kind='saga'), 1::bigint, 'confirmed delete enqueues one Saga cleanup job');

select lives_ok(
  $$ select internal.complete_cleanup_job((select id from internal.cleanup_jobs where saga_id='d1300000-0000-0000-0000-000000000001' and job_kind='saga'), 3, 0) $$,
  'successful Storage cleanup finalizes database deletion'
);
select is((select count(*) from public.sagas where id='d1300000-0000-0000-0000-000000000001'), 0::bigint, 'cleanup completion hard-deletes the Saga row');
select is((select count(*) from public.characters where id='d1400000-0000-0000-0000-000000000001'), 0::bigint, 'cleanup completion cascades target Saga data');
select is((select count(*) from public.characters where id='d1400000-0000-0000-0000-000000000002'), 1::bigint, 'cleanup completion preserves sibling Saga data');
select is((select state from internal.cleanup_jobs where job_kind='saga' and payload->>'saga_id'='d1300000-0000-0000-0000-000000000001' limit 1), 'complete', 'cleanup receipt remains complete for operational audit');

set local role anon;
select throws_ok(
  $$ select public.rename_saga('d1100000-0000-0000-0000-000000000001', 'd1200000-0000-0000-0000-000000000001', 'd1300000-0000-0000-0000-000000000002', 'Anonymous') $$,
  '42501',
  'permission denied for function rename_saga',
  'anonymous callers cannot rename a Saga'
);

select * from finish();
rollback;
