[CmdletBinding()]
param(
  [switch]$Execute,
  [switch]$ValidateFixture,
  [string]$SupabaseProjectRef = "scagegrrilvrpuilthzz"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$e2StatePath = Join-Path $repoRoot "infra/litellm/.secrets.e2-staging"
$providerStatePath = Join-Path $repoRoot "infra/litellm/.secrets.dev"
$flyctlPath = Join-Path $env:USERPROFILE ".fly/bin/flyctl.exe"
$priorProxyUrl = "https://relic-llm-dev.fly.dev/v1"
$costCeiling = [decimal]0.50
$remainingProxyBudget = [decimal]0.49
$aiAttemptLimit = 6
$embeddingAttemptLimit = 3

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
    if ($LASTEXITCODE -ne 0) { throw "Could not restrict temporary E3 material." }
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

function Set-StagingProvider([string]$ProxyUrl, [string]$ProxyKey, [string]$TemporaryDirectory) {
  $envPath = Join-Path $TemporaryDirectory ("edge-" + [guid]::NewGuid().ToString("N") + ".env")
  $content = "LITELLM_PROXY_URL=$ProxyUrl`nLITELLM_PROXY_KEY=$ProxyKey`n"
  [IO.File]::WriteAllText($envPath, $content, [Text.UTF8Encoding]::new($false))
  Protect-LocalFile $envPath
  $result = Invoke-SupabaseCommand @(
    "secrets", "set", "--project-ref", $SupabaseProjectRef,
    "--env-file", $envPath, "--yes", "--agent", "no"
  )
  Remove-Item -LiteralPath $envPath -Force
  if ($result.ExitCode -ne 0) { throw "Supabase rejected the isolated E3 provider update." }
}

function Deploy-E3Functions([bool]$DisableGatewayJwt) {
  foreach ($functionName in @("hybrid-search", "ai-task-runner", "guide-submit")) {
    $arguments = @(
      "functions", "deploy", $functionName,
      "--project-ref", $SupabaseProjectRef, "--use-api"
    )
    if ($DisableGatewayJwt) { $arguments += "--no-verify-jwt" }
    $result = Invoke-SupabaseCommand $arguments
    if ($result.ExitCode -ne 0) {
      $result = Invoke-SupabaseCommand $arguments
    }
    if ($result.ExitCode -ne 0) { throw "The E3 function deployment failed safely for $functionName." }
  }
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
  - model_name: relic-embed
    litellm_params:
      model: openai/text-embedding-3-small
      api_key: $providerKey
  - model_name: relic-balanced
    litellm_params:
      model: openai/gpt-5.6-terra
      api_key: $providerKey
litellm_settings:
  set_verbose: false
  turn_off_message_logging: true
  log_raw_request_response: false
  max_budget: 0.49
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

function Wait-ProxyHealthy([string]$BaseUrl) {
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri ($BaseUrl + "/health/liveliness") -UseBasicParsing -TimeoutSec 10
      if ($response.StatusCode -eq 200) { return }
    } catch {
      Start-Sleep -Seconds 3
    }
  }
  throw "The isolated E3 proxy did not become healthy."
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
      -RedirectStandardInput $inputPath `
      -RedirectStandardOutput $stdoutPath `
      -RedirectStandardError $stderrPath `
      -WindowStyle Hidden -Wait -PassThru
    $exitCode = $process.ExitCode
    $output = @()
    if (Test-Path -LiteralPath $stdoutPath) { $output += Get-Content -LiteralPath $stdoutPath }
    if (Test-Path -LiteralPath $stderrPath) { $output += Get-Content -LiteralPath $stderrPath }
  } finally {
    foreach ($path in @($inputPath, $stdoutPath, $stderrPath)) {
      if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
    }
  }
  return @{ ExitCode = $exitCode; Output = $output }
}

function Invoke-NodeSmoke([string[]]$Arguments, [string]$TemporaryDirectory) {
  $nodePath = (Get-Command node -ErrorAction Stop).Source
  $stdoutPath = Join-Path $TemporaryDirectory ("node-smoke-" + [guid]::NewGuid().ToString("N") + ".out")
  $stderrPath = Join-Path $TemporaryDirectory ("node-smoke-" + [guid]::NewGuid().ToString("N") + ".err")
  try {
    $process = Start-Process -FilePath $nodePath `
      -ArgumentList $Arguments `
      -RedirectStandardOutput $stdoutPath `
      -RedirectStandardError $stderrPath `
      -WindowStyle Hidden -Wait -PassThru
    $stdout = if (Test-Path -LiteralPath $stdoutPath) {
      Get-Content -Raw -LiteralPath $stdoutPath
    } else { "" }
    $stderr = if (Test-Path -LiteralPath $stderrPath) {
      Get-Content -Raw -LiteralPath $stderrPath
    } else { "" }
    if ($process.ExitCode -ne 0) {
      $safeDetail = if ($stderr -match '(?m)^Error:\s*(.+)$') {
        $Matches[1]
      } else {
        "No safe runner detail was available."
      }
      $safeDetail = $safeDetail `
        -replace '(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]+', '[redacted-key]' `
        -replace '(?i)(authorization|cookie|jwt|token|secret|key)\s*[:=]\s*\S+', '$1=[redacted]' `
        -replace '[\r\n]+', ' '
      if ($safeDetail.Length -gt 500) { $safeDetail = $safeDetail.Substring(0, 500) }
      throw "The E3 hosted smoke runner failed safely: $safeDetail"
    }
    return $stdout | ConvertFrom-Json
  } finally {
    foreach ($path in @($stdoutPath, $stderrPath)) {
      if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
    }
  }
}

if (-not $Execute -and -not $ValidateFixture) {
  [ordered]@{
    mode = "preflight"
    performs_mutation = $false
    project_ref = $SupabaseProjectRef
    fixture_classification = "synthetic_non_sensitive"
    isolated_temporary_proxy = @{
      image = "ghcr.io/berriai/litellm:v1.93.0"
      models = @("relic-balanced", "relic-embed")
      global_budget_usd = $remainingProxyBudget
      packet_cost_ceiling_usd = $costCeiling
      budget_duration = "2h"
      maximum_concurrency = 1
      prompt_logging = $false
      destroyed_after_smoke = $true
    }
    guard = @{
      maximum_ai_attempts = $aiAttemptLimit
      maximum_embedding_attempts = $embeddingAttemptLimit
      maximum_cost_usd = $costCeiling
    }
    generic_ai_and_embedding_dispatch_paused_during_fixture = $true
    restores_prior_proxy = $true
    secrets_printed = $false
  } | ConvertTo-Json -Depth 6
  exit 0
}

$internalToken = Read-DotEnvValue $e2StatePath "INTERNAL_TOKEN"
if (-not $internalToken) {
  throw "The protected staging internal token is unavailable; no hosted call was made."
}

$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$tempDirectory = [IO.Path]::Combine($tempRoot, "relic-e3-smoke-" + [guid]::NewGuid().ToString("N"))
$resolvedTempDirectory = [IO.Path]::GetFullPath($tempDirectory)
if (-not $resolvedTempDirectory.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to use a temporary directory outside the OS temporary root."
}
New-Item -ItemType Directory -Path $resolvedTempDirectory | Out-Null

if ($ValidateFixture) {
  $priorInternal = $env:INTERNAL_TOKEN
  $priorFixture = $env:E3_FIXTURE_RUN_ID
  $priorCost = $env:E3_MAX_COST_USD
  $priorAi = $env:E3_MAX_AI_ATTEMPTS
  $priorEmbedding = $env:E3_MAX_EMBEDDING_ATTEMPTS
  try {
    $env:INTERNAL_TOKEN = $internalToken
    $env:E3_FIXTURE_RUN_ID = [guid]::NewGuid().ToString()
    $env:E3_MAX_COST_USD = $costCeiling.ToString([Globalization.CultureInfo]::InvariantCulture)
    $env:E3_MAX_AI_ATTEMPTS = $aiAttemptLimit.ToString()
    $env:E3_MAX_EMBEDDING_ATTEMPTS = $embeddingAttemptLimit.ToString()
    Invoke-NodeSmoke @(
      (Join-Path $repoRoot "scripts/smoke-e3-hosted.mjs"),
      "--execute", "--validate-fixture"
    ) $resolvedTempDirectory | ConvertTo-Json -Depth 12
  } finally {
    $env:INTERNAL_TOKEN = $priorInternal
    $env:E3_FIXTURE_RUN_ID = $priorFixture
    $env:E3_MAX_COST_USD = $priorCost
    $env:E3_MAX_AI_ATTEMPTS = $priorAi
    $env:E3_MAX_EMBEDDING_ATTEMPTS = $priorEmbedding
    $internalToken = $null
    if (Test-Path -LiteralPath $resolvedTempDirectory) {
      Remove-Item -LiteralPath $resolvedTempDirectory -Recurse -Force
    }
  }
  exit 0
}

$priorProxyKey = Read-DotEnvValue $e2StatePath "LITELLM_PROXY_KEY"
$openAiKey = Read-DotEnvValue $providerStatePath "OPENAI_API_KEY"
if (-not $priorProxyKey -or -not $openAiKey -or -not (Test-Path -LiteralPath $flyctlPath)) {
  throw "Protected staging credentials or Fly tooling are unavailable; no hosted call was made."
}

$temporaryApp = "relic-e3-smoke-" + [guid]::NewGuid().ToString("N").Substring(0, 10)
$temporaryProxyKey = New-RandomToken
$temporaryProxyUrl = "https://$temporaryApp.fly.dev/v1"
$appCreated = $false
$providerInstalled = $false
$smokeResult = $null
$executionError = $null
try {
  Write-TemporaryProxyFiles $resolvedTempDirectory $temporaryApp $true
  $createResult = Invoke-FlyCommand @("apps", "create", $temporaryApp, "--yes")
  if ($createResult.ExitCode -ne 0) { throw "Fly could not create the isolated E3 proxy app." }
  $appCreated = $true

  $bootstrapDeploy = Invoke-FlyCommand @(
    "deploy", $resolvedTempDirectory, "--app", $temporaryApp,
    "--config", (Join-Path $resolvedTempDirectory "fly.toml"),
    "--remote-only", "--ha=false", "--smoke-checks=false", "--yes"
  )
  if ($bootstrapDeploy.ExitCode -ne 0) { throw "Fly could not bootstrap the isolated E3 proxy machine." }

  $secretInput = "OPENAI_API_KEY=$openAiKey`nLITELLM_MASTER_KEY=$temporaryProxyKey`n"
  $secretResult = Import-FlySecrets $temporaryApp $secretInput $resolvedTempDirectory
  $secretInput = $null
  if ($secretResult.ExitCode -ne 0) {
    $secretOutput = $secretResult.Output | Out-String
    $safeSecretCategory = if ($secretOutput -match "machine|deploy") {
      "machine_state"
    } elseif ($secretOutput -match "app|organization") {
      "app_state"
    } elseif ($secretOutput -match "flag|usage") {
      "cli_contract"
    } else {
      "unknown"
    }
    $safeSecretDetail = $secretOutput `
      -replace '(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]+', '[redacted-key]' `
      -replace '(?im)^([A-Za-z_][A-Za-z0-9_]*=).+$', '$1[redacted]' `
      -replace '[\r\n]+', ' '
    if ($safeSecretDetail.Length -gt 500) { $safeSecretDetail = $safeSecretDetail.Substring(0, 500) }
    throw "Fly could not install isolated E3 proxy secrets ($safeSecretCategory): $safeSecretDetail"
  }

  Write-TemporaryProxyFiles $resolvedTempDirectory $temporaryApp $false
  $deployResult = Invoke-FlyCommand @(
    "deploy", $resolvedTempDirectory, "--app", $temporaryApp,
    "--config", (Join-Path $resolvedTempDirectory "fly.toml"),
    "--remote-only", "--ha=false", "--yes"
  )
  if ($deployResult.ExitCode -ne 0) { throw "Fly could not deploy the isolated E3 proxy." }
  Wait-ProxyHealthy ("https://$temporaryApp.fly.dev")

  Set-StagingProvider $temporaryProxyUrl $temporaryProxyKey $resolvedTempDirectory
  $providerInstalled = $true
  Deploy-E3Functions $true

  $priorInternal = $env:INTERNAL_TOKEN
  $priorFixture = $env:E3_FIXTURE_RUN_ID
  $priorCost = $env:E3_MAX_COST_USD
  $priorAi = $env:E3_MAX_AI_ATTEMPTS
  $priorEmbedding = $env:E3_MAX_EMBEDDING_ATTEMPTS
  try {
    $env:INTERNAL_TOKEN = $internalToken
    $env:E3_FIXTURE_RUN_ID = [guid]::NewGuid().ToString()
    $env:E3_MAX_COST_USD = $costCeiling.ToString([Globalization.CultureInfo]::InvariantCulture)
    $env:E3_MAX_AI_ATTEMPTS = $aiAttemptLimit.ToString()
    $env:E3_MAX_EMBEDDING_ATTEMPTS = $embeddingAttemptLimit.ToString()
    $smokeResult = Invoke-NodeSmoke @(
      (Join-Path $repoRoot "scripts/smoke-e3-hosted.mjs"), "--execute"
    ) $resolvedTempDirectory
  } finally {
    $env:INTERNAL_TOKEN = $priorInternal
    $env:E3_FIXTURE_RUN_ID = $priorFixture
    $env:E3_MAX_COST_USD = $priorCost
    $env:E3_MAX_AI_ATTEMPTS = $priorAi
    $env:E3_MAX_EMBEDDING_ATTEMPTS = $priorEmbedding
  }
} catch {
  $executionError = $_
} finally {
  if ($providerInstalled) {
    try {
      Set-StagingProvider $priorProxyUrl $priorProxyKey $resolvedTempDirectory
      Deploy-E3Functions $false
    } catch {
      if (-not $executionError) { $executionError = $_ }
    }
  }
  try {
    $restoreSchedules = Invoke-SupabaseCommand @(
      "db", "query", "--linked",
      "select cron.alter_job(jobid, active => true) from cron.job where jobname in ('relic-dispatch-ai-tasks','relic-dispatch-embeddings')",
      "--output", "json", "--agent", "no"
    )
    if ($restoreSchedules.ExitCode -ne 0 -and -not $executionError) {
      $executionError = [Exception]::new("Could not restore the staging provider schedules.")
    }
  } catch {
    if (-not $executionError) { $executionError = $_ }
  }
  if ($appCreated) {
    try {
      $destroyResult = Invoke-FlyCommand @("apps", "destroy", $temporaryApp, "--yes")
      if ($destroyResult.ExitCode -ne 0 -and -not $executionError) {
        $executionError = [Exception]::new("Could not destroy the isolated E3 proxy app.")
      }
    } catch {
      if (-not $executionError) { $executionError = $_ }
    }
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
  result = "E3_HOSTED_ISOLATED_SMOKE_OK"
  smoke = $smokeResult
  isolated_proxy = @{
    models = @("relic-balanced", "relic-embed")
    global_budget_usd = $remainingProxyBudget
    packet_cost_ceiling_usd = $costCeiling
    budget_duration = "2h"
    maximum_concurrency = 1
    destroyed_after_smoke = $true
  }
  prior_proxy_restored = $true
  secrets_printed = $false
} | ConvertTo-Json -Depth 12
