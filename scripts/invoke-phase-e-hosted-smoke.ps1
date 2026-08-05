[CmdletBinding()]
param(
  [switch]$Execute,
  [string]$Authorization = "",
  [string]$SupabaseProjectRef = "scagegrrilvrpuilthzz"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$approvedAuthorization = "PHASE_E_HOSTED_SMOKE_APPROVED"
$approvedProjectRef = "scagegrrilvrpuilthzz"
$costCeiling = [decimal]1.00
$proxyBudget = [decimal]0.99
$providerCompletionLimit = 12
$repoRoot = Split-Path -Parent $PSScriptRoot
$stagingStatePath = Join-Path $repoRoot "infra/litellm/.secrets.e2-staging"
$providerStatePath = Join-Path $repoRoot "infra/litellm/.secrets.dev"
$flyctlPath = Join-Path $env:USERPROFILE ".fly/bin/flyctl.exe"

function Read-DotEnvValue([string]$Path, [string]$Name) {
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $line = Get-Content -LiteralPath $Path |
    Where-Object { $_ -match ("^" + [regex]::Escape($Name) + "=") } |
    Select-Object -First 1
  if (-not $line) { return $null }
  return $line.Substring($line.IndexOf("=") + 1).Trim().Trim('"').Trim("'")
}

function New-RandomToken {
  $bytes = [byte[]]::new(32)
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
  return "sk-" + (-join ($bytes | ForEach-Object { $_.ToString("x2") }))
}

function Protect-LocalFile([string]$Path) {
  if ($env:OS -eq "Windows_NT") {
    & icacls.exe $Path /inheritance:r /grant:r ("$env:USERNAME" + ":(F)") *> $null
    if ($LASTEXITCODE -ne 0) { throw "Could not restrict temporary Phase E material." }
  }
}

function Invoke-SupabaseCommand([string[]]$Arguments) {
  $priorPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & supabase @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $priorPreference
  }
  return @{ ExitCode = $exitCode; Output = $output }
}

function Set-DispatchSchedules([bool]$Active) {
  $activeSql = if ($Active) { "true" } else { "false" }
  $result = Invoke-SupabaseCommand @(
    "db", "query", "--linked",
    "select count(*) as schedules_updated from (select cron.alter_job(jobid,active=>$activeSql) from cron.job where jobname in ('relic-dispatch-ai-tasks','relic-dispatch-embeddings')) changed;",
    "--output", "json", "--agent", "no"
  )
  if ($result.ExitCode -ne 0) { throw "Could not change the Phase E dispatch schedules safely." }
}

function Get-StagingQueueState {
  $result = Invoke-SupabaseCommand @(
    "db", "query", "--linked",
    "select (select count(*) from internal.ai_task_runs where status in ('pending','queued','retryable','running')) as ai, (select count(*) from internal.embedding_jobs where state in ('queued','retryable','running')) as embedding;",
    "--output", "json", "--agent", "no"
  )
  if ($result.ExitCode -ne 0) { throw "Could not verify idle staging queues." }
  $rows = ($result.Output -join "`n") | ConvertFrom-Json
  if (-not $rows -or $rows.Count -ne 1) { throw "The staging queue response was invalid." }
  return $rows[0]
}

function Set-StagingProvider([string]$ProxyUrl, [string]$ProxyKey, [string]$TemporaryDirectory) {
  $envPath = Join-Path $TemporaryDirectory ("edge-" + [guid]::NewGuid().ToString("N") + ".env")
  [IO.File]::WriteAllText($envPath, "LITELLM_PROXY_URL=$ProxyUrl`nLITELLM_PROXY_KEY=$ProxyKey`n", [Text.UTF8Encoding]::new($false))
  Protect-LocalFile $envPath
  try {
    $result = Invoke-SupabaseCommand @(
      "secrets", "set", "--project-ref", $SupabaseProjectRef,
      "--env-file", $envPath, "--yes", "--agent", "no"
    )
  } finally {
    if (Test-Path -LiteralPath $envPath) { Remove-Item -LiteralPath $envPath -Force }
  }
  if ($result.ExitCode -ne 0) { throw "Supabase rejected the isolated Phase E provider update." }
}

function Disable-TaskRunnerGatewayJwt([System.Collections.Generic.List[string]]$ChangedFunctions) {
  $functionName = "ai-task-runner"
  [void]$ChangedFunctions.Add($functionName)
  $arguments = @(
    "functions", "deploy", $functionName, "--project-ref", $SupabaseProjectRef,
    "--use-api", "--no-verify-jwt"
  )
  $result = Invoke-SupabaseCommand $arguments
  if ($result.ExitCode -ne 0) { $result = Invoke-SupabaseCommand $arguments }
  if ($result.ExitCode -ne 0) { throw "The Phase E task-runner deployment failed safely." }
}

function Restore-TaskRunnerGatewayJwt([System.Collections.Generic.List[string]]$ChangedFunctions) {
  $firstFailure = $null
  foreach ($functionName in @($ChangedFunctions)) {
    try {
      $arguments = @(
        "functions", "deploy", $functionName, "--project-ref", $SupabaseProjectRef, "--use-api"
      )
      $result = Invoke-SupabaseCommand $arguments
      if ($result.ExitCode -ne 0) { $result = Invoke-SupabaseCommand $arguments }
      if ($result.ExitCode -ne 0 -and -not $firstFailure) {
        $firstFailure = [Exception]::new("Could not restore gateway JWT verification for $functionName.")
      }
    } catch {
      if (-not $firstFailure) { $firstFailure = $_ }
    }
  }
  return $firstFailure
}

function Write-TemporaryProxyFiles([string]$Directory, [string]$AppName, [bool]$Bootstrap) {
  $providerKey = if ($Bootstrap) { "sk-bootstrap-disabled" } else { "os.environ/OPENAI_API_KEY" }
  $masterKey = if ($Bootstrap) { "sk-bootstrap-disabled" } else { "os.environ/LITELLM_MASTER_KEY" }
  $dockerfile = @'
FROM ghcr.io/berriai/litellm:v1.93.0
COPY config.yaml /app/config.yaml
EXPOSE 4000
CMD ["--config", "/app/config.yaml", "--port", "4000"]
'@
  $config = @"
model_list:
  - model_name: relic-fast
    litellm_params:
      model: openai/gpt-5.6-luna
      api_key: $providerKey
  - model_name: relic-balanced
    litellm_params:
      model: openai/gpt-5.6-terra
      api_key: $providerKey
  - model_name: relic-deep
    litellm_params:
      model: openai/gpt-5.6-sol
      api_key: $providerKey
litellm_settings:
  set_verbose: false
  turn_off_message_logging: true
  log_raw_request_response: false
  max_budget: 0.99
  budget_duration: 2h
general_settings:
  master_key: $masterKey
  store_prompts_in_spend_logs: false
"@
  $flyConfig = @"
app = "$AppName"
primary_region = "iad"
[build]
  dockerfile = "Dockerfile"
[http_service]
  internal_port = 4000
  force_https = true
  auto_stop_machines = "off"
  auto_start_machines = true
  min_machines_running = 1
  [http_service.concurrency]
    type = "requests"
    soft_limit = 1
    hard_limit = 1
[[vm]]
  size = "shared-cpu-1x"
  memory = "2gb"
"@
  [IO.File]::WriteAllText((Join-Path $Directory "Dockerfile"), $dockerfile, [Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText((Join-Path $Directory "config.yaml"), $config, [Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText((Join-Path $Directory "fly.toml"), $flyConfig, [Text.UTF8Encoding]::new($false))
}

function Invoke-FlyCommand([string[]]$Arguments) {
  $priorPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $flyctlPath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $priorPreference
  }
  return @{ ExitCode = $exitCode; Output = $output }
}

function Import-FlySecrets([string]$AppName, [string]$SecretInput, [string]$TemporaryDirectory) {
  $inputPath = Join-Path $TemporaryDirectory ("fly-secrets-" + [guid]::NewGuid().ToString("N") + ".env")
  $stdoutPath = Join-Path $TemporaryDirectory ("fly-secrets-" + [guid]::NewGuid().ToString("N") + ".out")
  $stderrPath = Join-Path $TemporaryDirectory ("fly-secrets-" + [guid]::NewGuid().ToString("N") + ".err")
  [IO.File]::WriteAllText($inputPath, $SecretInput, [Text.UTF8Encoding]::new($false))
  Protect-LocalFile $inputPath
  try {
    $process = Start-Process -FilePath $flyctlPath `
      -ArgumentList @("secrets", "import", "--app", $AppName, "--stage") `
      -RedirectStandardInput $inputPath -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath `
      -WindowStyle Hidden -Wait -PassThru
    $exitCode = $process.ExitCode
  } finally {
    foreach ($path in @($inputPath, $stdoutPath, $stderrPath)) {
      if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
    }
  }
  return @{ ExitCode = $exitCode }
}

function Wait-ProxyHealthy([string]$BaseUrl) {
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri ($BaseUrl + "/health/liveliness") -UseBasicParsing -TimeoutSec 10
      if ($response.StatusCode -eq 200) { return }
    } catch { Start-Sleep -Seconds 3 }
  }
  throw "The isolated Phase E proxy did not become healthy."
}

function Invoke-NodeSmoke([string[]]$Arguments, [string]$TemporaryDirectory) {
  $nodePath = (Get-Command node -ErrorAction Stop).Source
  $stdoutPath = Join-Path $TemporaryDirectory ("node-smoke-" + [guid]::NewGuid().ToString("N") + ".out")
  $stderrPath = Join-Path $TemporaryDirectory ("node-smoke-" + [guid]::NewGuid().ToString("N") + ".err")
  try {
    $process = Start-Process -FilePath $nodePath -ArgumentList $Arguments `
      -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath `
      -WindowStyle Hidden -Wait -PassThru
    $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -Raw -LiteralPath $stdoutPath } else { "" }
    $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -Raw -LiteralPath $stderrPath } else { "" }
    if ($process.ExitCode -ne 0) {
      $safeDetail = if ($stderr -match '(?m)^Error:\s*(.+)$') { $Matches[1] } else { "No safe runner detail was available." }
      $safeDetail = $safeDetail `
        -replace '(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]+', '[redacted-key]' `
        -replace '(?i)(authorization|cookie|jwt|token|secret|key)\s*[:=]\s*\S+', '$1=[redacted]' `
        -replace '[\r\n]+', ' '
      if ($safeDetail.Length -gt 500) { $safeDetail = $safeDetail.Substring(0, 500) }
      throw "The Phase E hosted smoke runner failed safely: $safeDetail"
    }
    return $stdout | ConvertFrom-Json
  } finally {
    foreach ($path in @($stdoutPath, $stderrPath)) {
      if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
    }
  }
}

if (-not $Execute) {
  & node (Join-Path $repoRoot "scripts/smoke-phase-e-hosted.mjs")
  if ($LASTEXITCODE -ne 0) { throw "The local Phase E preflight failed." }
  exit 0
}

if ($Authorization -ne $approvedAuthorization -or $SupabaseProjectRef -ne $approvedProjectRef) {
  throw "Fresh Phase E authorization and the exact staging project lock are required; no hosted call was made."
}

$internalToken = Read-DotEnvValue $stagingStatePath "INTERNAL_TOKEN"
$priorProxyKey = Read-DotEnvValue $stagingStatePath "LITELLM_PROXY_KEY"
$priorProxyUrl = Read-DotEnvValue $stagingStatePath "LITELLM_PROXY_URL"
if (-not $priorProxyUrl) { $priorProxyUrl = "https://relic-llm-dev.fly.dev/v1" }
$openAiKey = Read-DotEnvValue $providerStatePath "OPENAI_API_KEY"
if (-not $internalToken -or -not $priorProxyKey -or -not $openAiKey -or -not (Test-Path -LiteralPath $flyctlPath)) {
  throw "Protected staging credentials or Fly tooling are unavailable; no hosted call was made."
}

$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$tempDirectory = [IO.Path]::Combine($tempRoot, "relic-phase-e-smoke-" + [guid]::NewGuid().ToString("N"))
$resolvedTempDirectory = [IO.Path]::GetFullPath($tempDirectory)
if (-not $resolvedTempDirectory.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to use a temporary directory outside the OS temporary root."
}
New-Item -ItemType Directory -Path $resolvedTempDirectory | Out-Null

$temporaryApp = "relic-phase-e-smoke-" + [guid]::NewGuid().ToString("N").Substring(0, 10)
$temporaryProxyKey = New-RandomToken
$temporaryProxyUrl = "https://$temporaryApp.fly.dev/v1"
$appCreated = $false
$providerInstalled = $false
$gatewayJwtChangedFunctions = [System.Collections.Generic.List[string]]::new()
$smokeResult = $null
$executionError = $null
try {
  Set-DispatchSchedules $false
  $queueState = Get-StagingQueueState
  if ([int]$queueState.ai -ne 0 -or [int]$queueState.embedding -ne 0) {
    throw "Staging queues are not idle; the isolated Phase E provider was not installed."
  }
  Write-TemporaryProxyFiles $resolvedTempDirectory $temporaryApp $true
  $createResult = Invoke-FlyCommand @("apps", "create", $temporaryApp, "--yes")
  if ($createResult.ExitCode -ne 0) { throw "Fly could not create the isolated Phase E proxy app." }
  $appCreated = $true

  $bootstrapDeploy = Invoke-FlyCommand @(
    "deploy", $resolvedTempDirectory, "--app", $temporaryApp,
    "--config", (Join-Path $resolvedTempDirectory "fly.toml"),
    "--remote-only", "--ha=false", "--smoke-checks=false", "--yes"
  )
  if ($bootstrapDeploy.ExitCode -ne 0) { throw "Fly could not bootstrap the isolated Phase E proxy." }

  $secretInput = "OPENAI_API_KEY=$openAiKey`nLITELLM_MASTER_KEY=$temporaryProxyKey`n"
  $secretResult = Import-FlySecrets $temporaryApp $secretInput $resolvedTempDirectory
  $secretInput = $null
  if ($secretResult.ExitCode -ne 0) { throw "Fly could not install the isolated Phase E proxy secrets." }

  Write-TemporaryProxyFiles $resolvedTempDirectory $temporaryApp $false
  $deployResult = Invoke-FlyCommand @(
    "deploy", $resolvedTempDirectory, "--app", $temporaryApp,
    "--config", (Join-Path $resolvedTempDirectory "fly.toml"),
    "--remote-only", "--ha=false", "--yes"
  )
  if ($deployResult.ExitCode -ne 0) { throw "Fly could not deploy the isolated Phase E proxy." }
  Wait-ProxyHealthy ("https://$temporaryApp.fly.dev")

  Set-StagingProvider $temporaryProxyUrl $temporaryProxyKey $resolvedTempDirectory
  $providerInstalled = $true
  Disable-TaskRunnerGatewayJwt $gatewayJwtChangedFunctions

  $priorInternal = $env:INTERNAL_TOKEN
  $priorFixture = $env:PHASE_E_FIXTURE_RUN_ID
  $priorAuthorization = $env:PHASE_E_HOSTED_AUTHORIZATION
  $priorProject = $env:PHASE_E_SUPABASE_PROJECT_REF
  $priorCost = $env:PHASE_E_MAX_COST_USD
  $priorCompletions = $env:PHASE_E_MAX_PROVIDER_COMPLETIONS
  $priorScheduleOwner = $env:PHASE_E_WRAPPER_OWNS_SCHEDULES
  try {
    $env:INTERNAL_TOKEN = $internalToken
    $env:PHASE_E_FIXTURE_RUN_ID = [guid]::NewGuid().ToString()
    $env:PHASE_E_HOSTED_AUTHORIZATION = $Authorization
    $env:PHASE_E_SUPABASE_PROJECT_REF = $SupabaseProjectRef
    $env:PHASE_E_MAX_COST_USD = $costCeiling.ToString([Globalization.CultureInfo]::InvariantCulture)
    $env:PHASE_E_MAX_PROVIDER_COMPLETIONS = $providerCompletionLimit.ToString()
    $env:PHASE_E_WRAPPER_OWNS_SCHEDULES = "1"
    $smokeResult = Invoke-NodeSmoke @((Join-Path $repoRoot "scripts/smoke-phase-e-hosted.mjs"), "--execute") $resolvedTempDirectory
  } finally {
    $env:INTERNAL_TOKEN = $priorInternal
    $env:PHASE_E_FIXTURE_RUN_ID = $priorFixture
    $env:PHASE_E_HOSTED_AUTHORIZATION = $priorAuthorization
    $env:PHASE_E_SUPABASE_PROJECT_REF = $priorProject
    $env:PHASE_E_MAX_COST_USD = $priorCost
    $env:PHASE_E_MAX_PROVIDER_COMPLETIONS = $priorCompletions
    $env:PHASE_E_WRAPPER_OWNS_SCHEDULES = $priorScheduleOwner
  }
} catch {
  $executionError = $_
} finally {
  if ($providerInstalled) {
    try { Set-StagingProvider $priorProxyUrl $priorProxyKey $resolvedTempDirectory }
    catch { if (-not $executionError) { $executionError = $_ } }
  }
  if ($gatewayJwtChangedFunctions.Count -gt 0) {
    try {
      $gatewayRestoreError = Restore-TaskRunnerGatewayJwt $gatewayJwtChangedFunctions
      if ($gatewayRestoreError -and -not $executionError) { $executionError = $gatewayRestoreError }
    } catch { if (-not $executionError) { $executionError = $_ } }
  }
  try {
    Set-DispatchSchedules $true
  } catch { if (-not $executionError) { $executionError = $_ } }
  if ($appCreated) {
    try {
      $destroyResult = Invoke-FlyCommand @("apps", "destroy", $temporaryApp, "--yes")
      if ($destroyResult.ExitCode -ne 0 -and -not $executionError) {
        $executionError = [Exception]::new("Could not destroy the isolated Phase E proxy app.")
      }
    } catch { if (-not $executionError) { $executionError = $_ } }
  }
  $temporaryProxyKey = $null
  $internalToken = $null
  $priorProxyKey = $null
  $openAiKey = $null
  if (Test-Path -LiteralPath $resolvedTempDirectory) {
    $verified = [IO.Path]::GetFullPath($resolvedTempDirectory)
    if ($verified.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
      Remove-Item -LiteralPath $verified -Recurse -Force
    }
  }
}

if ($executionError) { throw $executionError }
[ordered]@{
  result = "PHASE_E_HOSTED_ISOLATED_SMOKE_OK"
  smoke = $smokeResult
  isolated_proxy = @{
    models = @("relic-fast", "relic-balanced", "relic-deep")
    global_budget_usd = $proxyBudget
    packet_cost_ceiling_usd = $costCeiling
    budget_duration = "2h"
    maximum_concurrency = 1
    destroyed_after_smoke = $true
  }
  prior_proxy_restored = $true
  gateway_jwt_restored = $true
  schedules_restored = $true
  secrets_printed = $false
} | ConvertTo-Json -Depth 14
