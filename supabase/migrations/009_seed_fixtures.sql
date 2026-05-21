create or replace view public.foundation_fixture_contract as
select
  'supabase/fixtures/foundation.sql'::text as fixture_file,
  array[
    'two users',
    'two workspaces',
    'one world per workspace',
    'two sibling sagas in one world',
    'world-scoped canon',
    'saga-scoped canon',
    'drafts and sources',
    'retrieval content',
    'quota edge cases',
    'storage path edge cases'
  ]::text[] as required_fixture_sets;

comment on view public.foundation_fixture_contract is
  'Production-safe pointer to deterministic foundation fixtures. Test data lives in supabase/fixtures/foundation.sql and is loaded by the SQL test harness, not by production migrations.';

grant select on public.foundation_fixture_contract to anon, authenticated;
