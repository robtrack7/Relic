import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runner = readFileSync(new URL("./smoke-e3-hosted.mjs", import.meta.url), "utf8");
const wrapper = readFileSync(new URL("./invoke-e3-hosted-smoke.ps1", import.meta.url), "utf8");
const provider = readFileSync(new URL("../supabase/functions/_shared/ai-provider.ts", import.meta.url), "utf8");

test("E3 hosted smoke is explicit, synthetic, targeted, and hard bounded", () => {
  assert.match(runner, /--execute/);
  assert.match(runner, /--validate-fixture/);
  assert.match(runner, /E3_HOSTED_FIXTURE_PREFLIGHT_OK/);
  assert.match(runner, /provider_calls_made:\s*0/);
  assert.match(runner, /preflightGuideRetrieval/);
  assert.match(runner, /preflightGuideEvidenceFreeze/);
  assert.match(runner, /entity_facts_frozen:\s*true/);
  assert.match(runner, /retrieve_for_task_relaxed/);
  assert.doesNotMatch(runner, /Synthetic current-Saga evidence|Synthetic World evidence/);
  assert.ok(
    runner.indexOf("const retrievalPreflight = await preflightGuideRetrieval()")
      < runner.indexOf("for (let index = 0; index < turnSpecs.length"),
    "the exact grounded question must retrieve scoped sources before provider-backed Guide turns"
  );
  assert.match(runner, /E3_FIXTURE_RUN_ID/);
  assert.match(runner, /synthetic_non_sensitive/);
  assert.match(runner, /APPROVED_COST_CEILING_USD\s*=\s*1\.00/);
  assert.match(runner, /APPROVED_AI_ATTEMPTS\s*=\s*6/);
  assert.match(runner, /APPROVED_EMBEDDING_ATTEMPTS\s*=\s*3/);
  assert.match(runner, /guide-submit/);
  assert.match(runner, /invokeInternal\("ai-task-runner", \{ run_id: response\.body\.run_id \}/);
  assert.match(runner, /dispatch_validation_categories/);
  assert.match(runner, /run_id/);
  assert.doesNotMatch(runner, /invokeInternal\("dispatch-ai-tasks"/);
});

test("E3 hosted smoke pauses generic dispatch and proves exact replay before cleanup", () => {
  assert.match(runner, /pause_generic_dispatch/);
  assert.match(runner, /cron\.alter_job\(jobid, active => false\)/);
  assert.match(runner, /cron\.alter_job\(jobid, active => true\)/);
  assert.match(runner, /Exact Guide replay caused additional provider or usage work/);
  assert.match(runner, /acceptDraftAction/);
  assert.match(runner, /draft_entity_from_prompt/);
  assert.match(runner, /three_credit_runs/);
  assert.match(runner, /metered_credits/);
  assert.match(runner, /pending_count/);
  assert.match(runner, /sibling_allowed_matches/);
  assert.match(runner, /import_allowed_matches/);
  assert.match(runner, /canon_writes/);
  assert.match(runner, /fixture_cleanup/);
  assert.match(runner, /cleanup_residue/);
  assert.match(runner, /'guide_evidence'/);
  assert.match(runner, /'draft_batches'/);
  assert.match(runner, /'usage_events'/);
  assert.doesNotMatch(runner, /jsonb_object_length/);
  assert.ok(
    runner.indexOf("delete from internal.guide_evidence_snapshots where workspace_id='${IDs.workspace}'")
      < runner.indexOf("delete from public.workspaces where id='${IDs.workspace}'"),
    "frozen evidence must be removed before its cited source rows cascade"
  );
  assert.ok(
    runner.indexOf("delete from public.workspaces where id='${IDs.workspace}'")
      < runner.indexOf("delete from internal.ai_draft_batches where workspace_id='${IDs.workspace}'"),
    "public draft/action rows must cascade before internal draft batches are removed"
  );
});

test("E3 provider prompt requires a cited grounded answer when retrieved evidence directly answers", () => {
  assert.match(provider, /when retrieval_context directly answers the question/);
  assert.match(provider, /grounded_answer block with at least one exact source_id citation/);
});

test("E3 wrapper creates and destroys a two-model temporary proxy with a global budget", () => {
  assert.match(wrapper, /Invoke-FlyCommand @\("apps", "create", \$temporaryApp/);
  assert.match(wrapper, /model_name:\s*relic-balanced/);
  assert.match(wrapper, /model_name:\s*relic-embed/);
  assert.match(wrapper, /max_budget:\s*0\.99/);
  assert.match(wrapper, /\$costCeiling = \[decimal\]1\.00/);
  assert.match(wrapper, /budget_duration:\s*2h/);
  assert.match(wrapper, /hard_limit = 1/);
  assert.match(wrapper, /Invoke-FlyCommand @\("apps", "destroy", \$temporaryApp, "--yes"\)/);
  assert.match(wrapper, /Set-StagingProvider \$priorProxyUrl \$priorProxyKey/);
  assert.match(wrapper, /secrets_printed\s*=\s*\$false/);
  assert.doesNotMatch(wrapper, /Write-(?:Host|Output|Verbose).*(?:Key|Token|Secret)/i);
});

test("E3 wrapper transfers proxy keys through protected env files, not command arguments", () => {
  assert.match(wrapper, /"--env-file", \$envPath/);
  assert.match(wrapper, /Protect-LocalFile \$envPath/);
  assert.doesNotMatch(wrapper, /secrets set LITELLM_PROXY_KEY=/);
  assert.match(wrapper, /Remove-Item -LiteralPath \$envPath -Force/);
  assert.match(wrapper, /RedirectStandardInput \$inputPath/);
  assert.match(wrapper, /\[Text\.UTF8Encoding\]::new\(\$false\)/);
});

test("E3 wrapper captures Node output safely and supports a zero-inference fixture preflight", () => {
  assert.match(wrapper, /function Invoke-NodeSmoke/);
  assert.match(wrapper, /RedirectStandardOutput \$stdoutPath/);
  assert.match(wrapper, /RedirectStandardError \$stderrPath/);
  assert.match(wrapper, /"--execute", "--validate-fixture"/);
  assert.match(wrapper, /Remove-Item -LiteralPath \$path -Force/);
  assert.doesNotMatch(wrapper, /& node .*2>&1/);
});

test("E3 internal functions temporarily disable gateway JWT verification and restore it", () => {
  assert.match(wrapper, /"--no-verify-jwt"/);
  assert.match(wrapper, /Disable-E3FunctionGatewayJwt \$gatewayJwtChangedFunctions/);
  assert.match(wrapper, /Restore-E3FunctionGatewayJwt \$gatewayJwtChangedFunctions/);
  assert.match(runner, /authorization: `Bearer \$\{internalToken\}`/);
});

test("E3 gateway JWT cleanup tracks partial deployment and always restores changed functions", () => {
  assert.match(wrapper, /\$gatewayJwtChangedFunctions = \[System\.Collections\.Generic\.List\[string\]\]::new\(\)/);
  assert.match(wrapper, /\[void\]\$ChangedFunctions\.Add\(\$functionName\)/);
  assert.ok(
    wrapper.indexOf("[void]$ChangedFunctions.Add($functionName)")
      < wrapper.indexOf("Invoke-SupabaseCommand $arguments"),
    "each possible gateway change must be recorded before its deployment can partially fail"
  );
  assert.ok(
    wrapper.indexOf("Restore-E3FunctionGatewayJwt $gatewayJwtChangedFunctions")
      > wrapper.indexOf("} finally {"),
    "restoration must run from the outer finally block after partial deployment failure"
  );
  assert.doesNotMatch(wrapper, /temporaryFunctionAuthInstalled/);
});

test("E3 gateway JWT restoration continues after failures and preserves the first failure", () => {
  assert.match(wrapper, /function Restore-E3FunctionGatewayJwt[\s\S]*foreach \(\$functionName in @\(\$ChangedFunctions\)\)/);
  assert.match(wrapper, /\$firstFailure = \$null/);
  assert.match(wrapper, /if \(\$result\.ExitCode -ne 0 -and -not \$firstFailure\)/);
  assert.match(wrapper, /catch \{\s*if \(-not \$firstFailure\) \{ \$firstFailure = \$_ \}\s*\}/);
  assert.match(wrapper, /return \$firstFailure/);
  assert.match(wrapper, /if \(\$gatewayJwtRestoreError -and -not \$executionError\)/);
});

test("E3 existing-proxy reuse is explicit and does not read or replace the provider key", () => {
  assert.match(wrapper, /\[switch\]\$UseExistingProxy/);
  assert.match(wrapper, /if \(\$UseExistingProxy\) \{ \$null \} else \{ Read-DotEnvValue \$providerStatePath "OPENAI_API_KEY" \}/);
  assert.match(wrapper, /if \(-not \$UseExistingProxy\) \{/);
  assert.match(wrapper, /explicit_existing_e2_proxy_reuse/);
  assert.match(wrapper, /gatewayJwtChangedFunctions/);
});
