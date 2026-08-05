-- Phase E hosted closeout: successful schema repairs must project their bounded
-- repair count as well as their already-authoritative per-completion ledger.

create or replace function public.checkpoint_ai_task_provider_output_for_worker(
  p_run_id uuid,
  p_worker_id text,
  p_output jsonb,
  p_provider_alias text,
  p_resolved_model text,
  p_resolved_provider text,
  p_tokens_in integer,
  p_tokens_out integer,
  p_cost_estimate_usd numeric,
  p_billable boolean,
  p_provider_request_id_present boolean,
  p_repair_attempts integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  checkpoint_result jsonb;
begin
  if p_repair_attempts is null or p_repair_attempts not between 0 and 1 then
    raise exception 'ai_task_repair_attempts_invalid' using errcode = '22023';
  end if;

  checkpoint_result := public.checkpoint_ai_task_provider_output_for_worker(
    p_run_id,
    p_worker_id,
    p_output,
    p_provider_alias,
    p_resolved_model,
    p_resolved_provider,
    p_tokens_in,
    p_tokens_out,
    p_cost_estimate_usd,
    p_billable,
    p_provider_request_id_present
  );

  update internal.ai_task_runs
  set repair_attempts = greatest(repair_attempts, p_repair_attempts),
      updated_at = now()
  where id = p_run_id
    and status = 'running'
    and locked_by is not distinct from p_worker_id;

  return checkpoint_result;
end;
$$;

revoke all on function public.checkpoint_ai_task_provider_output_for_worker(
  uuid, text, jsonb, text, text, text, integer, integer, numeric, boolean, boolean, integer
) from public, anon, authenticated;
grant execute on function public.checkpoint_ai_task_provider_output_for_worker(
  uuid, text, jsonb, text, text, text, integer, integer, numeric, boolean, boolean, integer
) to service_role;
