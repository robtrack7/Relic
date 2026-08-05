import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const runnerPath = new URL("./smoke-phase-e-hosted.mjs", import.meta.url);
const wrapperPath = new URL("./invoke-phase-e-hosted-smoke.ps1", import.meta.url);
const runner = readFileSync(runnerPath, "utf8");
const wrapper = readFileSync(wrapperPath, "utf8");

test("Phase E preflight is manifest-only and reports zero hosted work", () => {
  const output = JSON.parse(execFileSync(process.execPath, [fileURLToPath(runnerPath)], {
    cwd: process.cwd(), encoding: "utf8", windowsHide: true,
    env: { ...process.env, INTERNAL_TOKEN: "must-not-be-read-in-preflight" }
  }));
  assert.equal(output.mode, "preflight");
  assert.equal(output.performs_mutation, false);
  assert.equal(output.network_calls_made, 0);
  assert.equal(output.provider_calls_made, 0);
  assert.equal(output.task_count, 6);
  assert.equal(output.product_credits, 28);
  assert.equal(output.maximum_provider_completions, 12);
  assert.equal(output.provider_cost_ceiling_usd, 4);
  assert.equal(output.prior_provider_spend_reserve_usd, 0.50);
  assert.equal(output.isolated_proxy_budget_usd, 3.49);
  assert.equal(output.temporary_proxy_infrastructure_cost_hard_capped, false);
});

test("Phase E local fixture validation is a distinct zero-provider mode", () => {
  assert.match(runner, /validateLocal = process\.argv\.includes\("--validate-local"\)/);
  assert.match(runner, /databaseTarget = validateLocal \? "--local" : "--linked"/);
  assert.match(runner, /PHASE_E_HOSTED_LOCAL_FIXTURE_OK/);
  assert.match(runner, /provider_calls_made: 0/);
  assert.match(runner, /answer_manifest_size/);
});

test("Phase E runner requires fresh authorization and the exact staging project", () => {
  assert.match(runner, /configuredAuthorization !== AUTHORIZATION/);
  assert.match(runner, /configuredProjectRef !== PROJECT_REF/);
  assert.match(runner, /PHASE_E_HOSTED_SMOKE_APPROVED/);
  assert.match(wrapper, /if \(\$Authorization -ne \$approvedAuthorization -or \$SupabaseProjectRef -ne \$approvedProjectRef\)/);
  assert.match(wrapper, /no hosted call was made/);

  const guardedEnvironment = {
    ...process.env,
    PATH: "",
    INTERNAL_TOKEN: "synthetic-guard-token",
    PHASE_E_FIXTURE_RUN_ID: "e5000000-0000-4000-8000-000000000099",
    PHASE_E_MAX_COST_USD: "4",
    PHASE_E_MAX_PROVIDER_COMPLETIONS: "12",
    PHASE_E_WRAPPER_OWNS_SCHEDULES: "1"
  };
  const denied = spawnSync(process.execPath, [fileURLToPath(runnerPath), "--execute"], {
    cwd: process.cwd(), encoding: "utf8", windowsHide: true,
    env: {
      ...guardedEnvironment,
      PHASE_E_HOSTED_AUTHORIZATION: "NOT_APPROVED",
      PHASE_E_SUPABASE_PROJECT_REF: "scagegrrilvrpuilthzz"
    }
  });
  assert.equal(denied.status, 1);
  assert.match(denied.stderr, /Fresh Phase E hosted authorization is required/);
  assert.doesNotMatch(denied.stderr, /linked staging operation|fetch failed|ENOTFOUND/);

  const wrongProject = spawnSync(process.execPath, [fileURLToPath(runnerPath), "--execute"], {
    cwd: process.cwd(), encoding: "utf8", windowsHide: true,
    env: {
      ...guardedEnvironment,
      PHASE_E_HOSTED_AUTHORIZATION: "PHASE_E_HOSTED_SMOKE_APPROVED",
      PHASE_E_SUPABASE_PROJECT_REF: "wrong-project"
    }
  });
  assert.equal(wrongProject.status, 1);
  assert.match(wrongProject.stderr, /staging project lock did not match/);
  assert.doesNotMatch(wrongProject.stderr, /linked staging operation|fetch failed|ENOTFOUND/);
});

test("Phase E allowlist pins all six current task, prompt, alias, model, and credit contracts", () => {
  const expected = [
    ["plan_saga_workshop@1.0.0", "relic-fast", "gpt-5.6-luna", "credits: 1"],
    ["scaffold_saga@1.2.0", "relic-deep", "gpt-5.6-sol", "credits: 10"],
    ["regenerate_saga_scaffold_section@1.0.0", "relic-balanced", "gpt-5.6-terra", "credits: 3"],
    ["answer_saga_question@1.6.0", "relic-balanced", "gpt-5.6-terra", "credits: 1"],
    ["generate_session_prep@1.0.0", "relic-deep", "gpt-5.6-sol", "credits: 10"],
    ["draft_entity_from_prompt@1.1.0", "relic-balanced", "gpt-5.6-terra", "credits: 3"]
  ];
  for (const fields of expected) for (const field of fields) assert.match(runner, new RegExp(field.replaceAll(".", "\\.")));
  assert.match(runner, /c\.task_name='\$\{spec\.task\}'.*c\.prompt_version='\$\{spec\.prompt\}'/s);
  assert.match(runner, /c\.model_tier='\$\{spec\.alias\}'.*c\.ai_credits=\$\{spec\.credits\}/s);
});

test("Phase E cost and call guards reserve at most one repair per task", () => {
  assert.match(runner, /MAX_PROVIDER_COMPLETIONS = 12/);
  assert.match(runner, /enforceGuards\(guardEvidence\(\), 2\)/);
  assert.match(runner, /sum\(provider_completions\)/);
  assert.match(runner, /numberValue\(run\.repairs\) > 1/);
  assert.match(runner, /cost_usd\) \+ PRIOR_PROVIDER_SPEND_RESERVE_USD > COST_CEILING_USD/);
  assert.match(runner, /cost_estimate_complete/);
  assert.match(wrapper, /max_budget: \$proxyBudget/);
  assert.match(wrapper, /\$priorProviderSpendReserve = \[decimal\]0\.50/);
  assert.match(wrapper, /\$proxyBudget = \[decimal\]3\.49/);
  assert.match(wrapper, /budget_duration: 2h/);
  assert.match(wrapper, /hard_limit = 1/);
});

test("Phase E forbids query embeddings and product mutations during task-family delivery", () => {
  assert.match(runner, /query_embedding_events/);
  assert.match(runner, /worker_type='hybrid_search'/);
  assert.match(runner, /canon_audit_rows/);
  assert.match(runner, /draft_rows\) !== 1/);
  assert.match(runner, /pending_entity_drafts\) !== 1/);
  assert.match(runner, /action_intents/);
  assert.doesNotMatch(runner, /review_loom_action|archive_entity|restore_entity|hard_delete_entity|commit_/);
});

test("Phase E exact replay cannot add provider, usage, or cost work", () => {
  assert.match(runner, /beforeReplay\.provider_completions.*afterReplay\.provider_completions/s);
  assert.match(runner, /beforeReplay\.provider_call_started.*afterReplay\.provider_call_started/s);
  assert.match(runner, /beforeReplay\.usage_events.*afterReplay\.usage_events/s);
  assert.match(runner, /beforeReplay\.cost_usd.*afterReplay\.cost_usd/s);
});

test("Phase E wrapper protects secrets and restores every temporary staging change", () => {
  assert.match(wrapper, /& supabase @Arguments 2>\$null/);
  assert.doesNotMatch(wrapper, /& supabase @Arguments 2>&1/);
  assert.match(wrapper, /Protect-LocalFile \$envPath/);
  assert.match(wrapper, /Protect-LocalFile \$inputPath/);
  assert.match(wrapper, /Set-StagingProvider \$priorProxyUrl \$priorProxyKey/);
  assert.match(wrapper, /Restore-TaskRunnerGatewayJwt/);
  assert.match(wrapper, /Set-DispatchSchedules \$false.*Set-StagingProvider \$temporaryProxyUrl/s);
  assert.match(wrapper, /Set-StagingProvider \$priorProxyUrl \$priorProxyKey.*Set-DispatchSchedules \$true/s);
  assert.match(runner, /wrapperOwnsSchedules/);
  assert.match(wrapper, /relic-dispatch-ai-tasks','relic-dispatch-embeddings/);
  assert.match(wrapper, /apps", "destroy", \$temporaryApp/);
  assert.match(wrapper, /StartsWith\(\$tempRoot/);
  assert.match(runner, /cleanupFixture\(\)/);
  assert.match(runner, /cleanup_residue/);
});

test("Phase E telemetry checks remain payload-free", () => {
  assert.match(runner, /unsafe_fixture_text_matches/);
  assert.match(runner, /raw_payload_key_matches/);
  assert.match(runner, /secrets_printed: false/);
  assert.match(runner, /private_payloads_printed: false/);
  assert.doesNotMatch(wrapper, /Write-Output\s+\$openAiKey|Write-Host\s+\$openAiKey/);
  assert.match(runner, /collectSafeFailureEvidence/);
  assert.match(runner, /failure_category/);
  assert.match(runner, /SAFE_VALIDATION_CATEGORIES/);
  assert.match(runner, /validation categories:/);
  assert.match(runner, /failed_run: safeFailureEvidence\.failed_run/);
  assert.match(runner, /totals: safeFailureEvidence\.totals/);
  assert.doesNotMatch(runner, /safe_failure_evidence[\s\S]{0,1800}output_payload/);
});
