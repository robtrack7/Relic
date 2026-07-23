create extension if not exists pgtap with schema extensions;

begin;

select plan(3);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e2000000-0000-4000-8000-000000000001","role":"authenticated","saga_id":"e2030000-0000-4000-8000-000000000001"}',
  true
);

select ok(
  public.active_saga_matches('e2030000-0000-4000-8000-000000000001'),
  'modern PostgREST JWT claims expose the active Saga'
);
select ok(
  not public.active_saga_matches('e2030000-0000-4000-8000-000000000002'),
  'modern PostgREST JWT claims exclude a sibling Saga'
);

select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.saga_id', 'e2030000-0000-4000-8000-000000000001', true);
select ok(
  public.active_saga_matches('e2030000-0000-4000-8000-000000000001'),
  'legacy local-test claim setting remains compatible'
);

select * from finish();
rollback;
