import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bootstrap = readFileSync(new URL("./e2-secure-bootstrap.ps1", import.meta.url), "utf8");
const audio = readFileSync(new URL("./generate-e2-audio-fixture.ps1", import.meta.url), "utf8");
const hostedWrapper = readFileSync(new URL("./invoke-e2-hosted-smoke.ps1", import.meta.url), "utf8");
const hostedRunner = readFileSync(new URL("./smoke-e2-hosted.mjs", import.meta.url), "utf8");
const schedulerVault = readFileSync(new URL("./install-e2-scheduler-vault.ps1", import.meta.url), "utf8");

test("E2 secure bootstrap defaults to a non-mutating preflight", () => {
  assert.match(bootstrap, /if \(-not \$Apply\)/);
  assert.match(bootstrap, /performs_mutation = \$false/);
  assert.match(bootstrap, /inference_attempts_so_far = 41/);
  assert.match(bootstrap, /successful_provider_calls_so_far = 1/);
  assert.match(bootstrap, /maximum_additional_inference_attempts = 0/);
  assert.match(bootstrap, /packet_inference_attempt_limit = 40/);
  assert.ok(
    bootstrap.indexOf("if (-not $Apply)") < bootstrap.indexOf("$existingInternalToken ="),
    "protected state must not be read before the non-mutating preflight exits"
  );
});

test("E2 secret transfer avoids secret values in process arguments and output", () => {
  assert.match(bootstrap, /supabase secrets set --project-ref \$SupabaseProjectRef --env-file \$temporaryEnvPath/);
  assert.match(bootstrap, /\$flyInput \| & \$flyctlPath secrets import/);
  assert.match(bootstrap, /secret_values_printed = \$false/);
  assert.doesNotMatch(bootstrap, /Write-(?:Output|Host).*\$(?:internalToken|proxyKey|jwtSigningSecret|openAiKey)/i);
});

test("E2 temporary secret material is protected and removed from a verified temp path", () => {
  assert.match(bootstrap, /Protect-LocalFile \$temporaryEnvPath/);
  assert.match(bootstrap, /StartsWith\(\$tempRoot/);
  assert.match(bootstrap, /Remove-Item -LiteralPath \$verified -Recurse -Force/);
  assert.match(bootstrap, /infra\/litellm\/\.secrets\.e2-staging/);
});

test("E2 synthetic audio generator contains no private or variable user content", () => {
  assert.match(audio, /Relic staging fixture\. The glass heron waits beside the blue observatory\./);
  assert.match(audio, /synthetic_non_sensitive/);
  assert.doesNotMatch(audio, /Get-Content|Read-Host|clipboard/i);
});

test("E2 hosted smoke transfers the internal token only through a child environment", () => {
  assert.match(hostedWrapper, /\$env:INTERNAL_TOKEN\s*=/);
  assert.match(hostedWrapper, /\[switch\]\$DeepOnly/);
  assert.match(hostedWrapper, /\[switch\]\$SharedRepeat/);
  assert.match(hostedWrapper, /--deep-only/);
  assert.match(hostedWrapper, /--shared-repeat/);
  assert.doesNotMatch(hostedWrapper, /--(?:token|secret|key)\b/i);
  assert.doesNotMatch(hostedWrapper, /Write-(?:Output|Host).*(?:TOKEN|secret|key)/i);
  assert.match(hostedRunner, /process\.env\.INTERNAL_TOKEN/);
  assert.doesNotMatch(hostedRunner, /console\.log\([^)]*internalToken/);
});

test("E2 hosted smoke uses only supported Supabase CLI flags and stable JSON output", () => {
  assert.doesNotMatch(hostedRunner, /--log-level/);
  assert.doesNotMatch(bootstrap, /--log-level/);
  assert.match(hostedRunner, /"--output", "json", "--agent", "no"/);
  assert.match(hostedRunner, /if \(Array\.isArray\(parsed\)\) return parsed/);
  assert.match(hostedRunner, /E2_HOSTED_ACCESS_CHECK_OK/);
  assert.match(hostedRunner, /if \(cleanupError && executionError\)/);
  assert.match(hostedRunner, /const supabaseCli = process\.platform === "win32" \? "supabase\.exe"/);
  assert.doesNotMatch(hostedRunner, /npx\.cmd/);
  assert.match(hostedRunner, /transcription_outcome_check/);
  assert.match(hostedRunner, /embedding_outcome_check/);
  assert.match(hostedRunner, /embedding\.body\.state !== "managed"/);
  assert.match(hostedRunner, /"complications":\[\{/);
  assert.match(hostedRunner, /"session_summary":\{/);
  assert.match(hostedRunner, /"next_prep_implications":\[\]/);
  assert.match(hostedRunner, /invokeAiTaskWithRecovery/);
  assert.match(hostedRunner, /SAFE_AI_RETRY_CATEGORIES/);
  assert.match(hostedRunner, /\[200, 202, 500, 503\]/);
  assert.match(hostedRunner, /Math\.min\(55,/);
  assert.match(hostedRunner, /retry_recovery: safeAiRetryEvidence/);
  assert.match(hostedRunner, /E2_HOSTED_DEEP_CONTINUATION_OK/);
  assert.match(hostedRunner, /externalCalls > 4/);
  assert.match(hostedRunner, /e2_hosted_deep_continuation/);
  assert.match(hostedRunner, /'synthesizing', '\{"fixture":"synthetic_deep_continuation"\}'/);
  assert.match(hostedRunner, /synthesis_pipeline_transition/);
  assert.match(hostedRunner, /evidence\.exact_retry_replayed = true/);
  assert.doesNotMatch(hostedRunner, /run\.replay_count < 1/);
  assert.match(hostedRunner, /E2_HOSTED_POST_RESTART_SHARED_OK/);
  assert.doesNotMatch(hostedRunner, /post-restart duplicate delivery/);
  assert.match(hostedRunner, /Number\(run\.attempts \?\? 1\)/);
  assert.match(hostedRunner, /Number\(lightAttemptEvidence\.attempts \?\? 1\)/);
  assert.match(hostedRunner, /remainingCallBudget < 2/);
  assert.match(hostedRunner, /delete from internal\.provider_pipeline_events/);
  assert.match(hostedRunner, /select id from internal\.ai_task_runs where workspace_id/);
  assert.match(hostedRunner, /'dead_letters'/);
  assert.match(hostedRunner, /Object\.values\(residue\)\.some/);
});

test("E2 scheduler Vault bootstrap keeps credential values out of arguments and output", () => {
  assert.match(schedulerVault, /infra\/litellm\/\.secrets\.e2-staging/);
  assert.match(schedulerVault, /supabase db query --linked --file \$sqlPath/);
  assert.match(schedulerVault, /\$ErrorActionPreference = "Continue"/);
  assert.match(schedulerVault, /\$queryExitCode = \$LASTEXITCODE/);
  assert.match(schedulerVault, /Protect-Path \$sqlPath/);
  assert.match(schedulerVault, /WindowsIdentity\]::GetCurrent\(\)\.Name/);
  assert.match(schedulerVault, /else \{ "F" \}/);
  assert.match(schedulerVault, /vault\.create_secret/);
  assert.match(schedulerVault, /vault\.update_secret/);
  assert.match(schedulerVault, /secret_values_printed = \$false/);
  assert.match(schedulerVault, /Remove-Item -LiteralPath \$verifiedPath -Recurse -Force/);
  assert.match(schedulerVault, /\$result\.temporary_material_removed = \$true/);
  assert.doesNotMatch(schedulerVault, /Write-(?:Output|Host).*\$(?:internalToken|escapedToken)/i);
});
