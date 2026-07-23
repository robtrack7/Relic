-- PostgREST exposes current JWT claims through request.jwt.claims. Keep the
-- legacy per-claim setting only as a local-test and older-runtime fallback.
create or replace function public.active_saga_matches(target_saga_id uuid)
returns boolean
language sql
security invoker
stable
set search_path = ''
as $$
  with active_claim as (
    select coalesce(
      nullif(auth.jwt() ->> 'saga_id', ''),
      nullif(current_setting('request.jwt.claim.saga_id', true), '')
    ) as saga_id
  )
  select saga_id is not null and saga_id::uuid = target_saga_id
  from active_claim;
$$;

comment on function public.active_saga_matches(uuid) is
  'Fails closed unless the current JWT active Saga claim matches the target; reads modern JWT claims with a legacy local-test fallback.';
