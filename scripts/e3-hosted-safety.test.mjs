import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runner = readFileSync(new URL("./smoke-e3-hosted.mjs", import.meta.url), "utf8");
const wrapper = readFileSync(new URL("./invoke-e3-hosted-smoke.ps1", import.meta.url), "utf8");

test("E3 hosted smoke is explicit, synthetic, targeted, and hard bounded", () => {
  assert.match(runner, /--execute/);
  assert.match(runner, /--validate-fixture/);
  assert.match(runner, /E3_HOSTED_FIXTURE_PREFLIGHT_OK/);
  assert.match(runner, /provider_calls_made:\s*0/);
  assert.match(runner, /E3_FIXTURE_RUN_ID/);
  assert.match(runner, /synthetic_non_sensitive/);
  assert.match(runner, /APPROVED_COST_CEILING_USD\s*=\s*0\.50/);
  assert.match(runner, /APPROVED_AI_ATTEMPTS\s*=\s*6/);
  assert.match(runner, /APPROVED_EMBEDDING_ATTEMPTS\s*=\s*3/);
  assert.match(runner, /guide-submit/);
  assert.match(runner, /invokeInternal\("ai-task-runner", \{ run_id: response\.body\.run_id \}/);
  assert.match(runner, /run_id/);
  assert.doesNotMatch(runner, /invokeInternal\("dispatch-ai-tasks"/);
});

test("E3 hosted smoke pauses generic dispatch and proves exact replay before cleanup", () => {
  assert.match(runner, /pause_generic_dispatch/);
  assert.match(runner, /cron\.alter_job\(jobid, active => false\)/);
  assert.match(runner, /cron\.alter_job\(jobid, active => true\)/);
  assert.match(runner, /Exact Guide replay caused additional provider or usage work/);
  assert.match(runner, /sibling_allowed_matches/);
  assert.match(runner, /import_allowed_matches/);
  assert.match(runner, /canon_writes/);
  assert.match(runner, /fixture_cleanup/);
  assert.match(runner, /cleanup_residue/);
});

test("E3 wrapper creates and destroys a two-model temporary proxy with a global budget", () => {
  assert.match(wrapper, /Invoke-FlyCommand @\("apps", "create", \$temporaryApp/);
  assert.match(wrapper, /model_name:\s*relic-balanced/);
  assert.match(wrapper, /model_name:\s*relic-embed/);
  assert.match(wrapper, /max_budget:\s*0\.49/);
  assert.match(wrapper, /\$costCeiling = \[decimal\]0\.50/);
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
  assert.match(wrapper, /Deploy-E3Functions \$true/);
  assert.match(wrapper, /Deploy-E3Functions \$false/);
  assert.match(runner, /authorization: `Bearer \$\{internalToken\}`/);
});
