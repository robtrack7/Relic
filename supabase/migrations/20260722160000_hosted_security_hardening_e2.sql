-- The fixture contract is static public metadata, but it should still execute
-- with caller permissions so future edits cannot accidentally bypass RLS.
alter view public.foundation_fixture_contract
  set (security_invoker = true);

-- Internal helpers are reachable only through reviewed public wrappers. The
-- schema already withholds USAGE from browser roles; explicit function revokes
-- add defense in depth if exposed-schema configuration changes later.
revoke all on all functions in schema internal from public, anon, authenticated;
alter default privileges in schema internal revoke execute on functions from public;
