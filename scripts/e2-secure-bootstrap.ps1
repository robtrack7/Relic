[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$RotateOpenAI,
  [string]$SupabaseProjectRef = "scagegrrilvrpuilthzz",
  [string]$FlyApp = "relic-llm-dev"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$localStatePath = Join-Path $repoRoot "infra/litellm/.secrets.e2-staging"
$developmentStatePath = Join-Path $repoRoot "infra/litellm/.secrets.dev"
$flyctlPath = Join-Path $env:USERPROFILE ".fly/bin/flyctl.exe"

$configuration = [ordered]@{
  RELIC_ENV = "staging"
  LITELLM_PROXY_URL = "https://relic-llm-dev.fly.dev/v1"
  TRANSCRIPTION_PROVIDER_MODE = "live"
  TRANSCRIPTION_MODEL_ALIAS = "relic-transcribe"
  TRANSCRIPTION_RESOLVED_MODEL = "whisper-1"
  TRANSCRIPTION_TIMEOUT_MS = "120000"
  EMBEDDING_PROVIDER_MODE = "live"
  EMBEDDING_MODEL_ALIAS = "relic-embed"
  EMBEDDING_RESOLVED_MODEL = "text-embedding-3-small"
  EMBEDDING_DIMENSIONS = "1536"
  EMBEDDING_TIMEOUT_MS = "60000"
  AI_PROVIDER_MODE = "live"
  AI_MODEL_RELIC_FAST = "relic-fast"
  AI_RESOLVED_MODEL_RELIC_FAST = "gpt-5.6-luna"
  AI_MAX_OUTPUT_TOKENS_RELIC_FAST = "800"
  AI_MODEL_RELIC_BALANCED = "relic-balanced"
  AI_RESOLVED_MODEL_RELIC_BALANCED = "gpt-5.6-terra"
  AI_MAX_OUTPUT_TOKENS_RELIC_BALANCED = "1200"
  AI_MODEL_RELIC_DEEP = "relic-deep"
  AI_RESOLVED_MODEL_RELIC_DEEP = "gpt-5.6-sol"
  AI_MAX_OUTPUT_TOKENS_RELIC_DEEP = "1800"
  AI_TIMEOUT_MS = "140000"
}

function Read-DotEnvValue([string]$Path, [string]$Name) {
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match ("^" + [regex]::Escape($Name) + "=") } | Select-Object -First 1
  if (-not $line) { return $null }
  return $line.Substring($line.IndexOf("=") + 1).Trim().Trim('"').Trim("'")
}

function New-RandomToken {
  $bytes = [byte[]]::new(32)
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
  return -join ($bytes | ForEach-Object { $_.ToString("x2") })
}

function Protect-LocalFile([string]$Path) {
  if ($env:OS -eq "Windows_NT") {
    & icacls.exe $Path /inheritance:r /grant:r ("$env:USERNAME" + ":(F)") *> $null
    if ($LASTEXITCODE -ne 0) { throw "Could not restrict the local E2 state file." }
  }
}

function Get-RemoteSecretNames {
  $raw = & npx supabase secrets list --project-ref $SupabaseProjectRef --output json --agent no 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Supabase CLI authentication is required before E2 secret bootstrap." }
  $parsed = $raw | ConvertFrom-Json
  return @($parsed | ForEach-Object { $_.name })
}

if (-not $Apply) {
  [ordered]@{
    mode = "preflight"
    performs_mutation = $false
    project_ref = $SupabaseProjectRef
    fly_app = $FlyApp
    required_provider_actions = @(
      "Install a valid capped-project OPENAI_API_KEY directly in Fly server-side secrets.",
      "Install RELIC_JWT_SIGNING_SECRET directly in Supabase Edge secrets for the synthetic staging-only compatibility path.",
      "Authenticate the local Supabase CLI without sharing its access token."
    )
    codex_can_finish_after_login = @(
      "Generate a staging-only INTERNAL_TOKEN.",
      "Transfer the existing proxy credential without printing it.",
      "Install the approved server-only alias/model configuration.",
      "Verify configured secret names and run the bounded synthetic smoke matrix."
    )
    inference_attempts_so_far = 41
    successful_provider_calls_so_far = 1
    maximum_additional_inference_attempts = 0
    packet_inference_attempt_limit = 40
    next_paid_call_requires_apply = $true
  } | ConvertTo-Json -Depth 5
  exit 0
}

$existingInternalToken = if ($env:INTERNAL_TOKEN) { $env:INTERNAL_TOKEN } else { Read-DotEnvValue $localStatePath "INTERNAL_TOKEN" }
$proxyKey = if ($env:LITELLM_PROXY_KEY) { $env:LITELLM_PROXY_KEY } else { Read-DotEnvValue $localStatePath "LITELLM_PROXY_KEY" }
if (-not $proxyKey) { $proxyKey = Read-DotEnvValue $developmentStatePath "LITELLM_MASTER_KEY" }
$jwtSigningSecret = $env:RELIC_JWT_SIGNING_SECRET
$openAiKey = $env:OPENAI_API_KEY

$remoteSecretNames = Get-RemoteSecretNames
$jwtAlreadyHosted = $remoteSecretNames -contains "RELIC_JWT_SIGNING_SECRET"
$missing = @()
if (-not $proxyKey) { $missing += "LITELLM_PROXY_KEY" }
if (-not $jwtSigningSecret -and -not $jwtAlreadyHosted) { $missing += "RELIC_JWT_SIGNING_SECRET" }
if ($RotateOpenAI -and -not $openAiKey) { $missing += "OPENAI_API_KEY" }
if ($missing.Count -gt 0) {
  throw ("Missing secure runtime input(s): " + ($missing -join ", ") + ". Configure them in the provider secret UI or the current process, never chat.")
}

$internalToken = if ($existingInternalToken) { $existingInternalToken } else { New-RandomToken }
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$tempDirectory = [IO.Path]::Combine($tempRoot, "relic-e2-bootstrap-" + [guid]::NewGuid().ToString("N"))
$resolvedTempDirectory = [IO.Path]::GetFullPath($tempDirectory)
if (-not $resolvedTempDirectory.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to use a temporary directory outside the OS temporary root."
}

New-Item -ItemType Directory -Path $resolvedTempDirectory | Out-Null
$temporaryEnvPath = Join-Path $resolvedTempDirectory "edge.env"

try {
  $lines = [Collections.Generic.List[string]]::new()
  $lines.Add("INTERNAL_TOKEN=$internalToken")
  $lines.Add("LITELLM_PROXY_KEY=$proxyKey")
  if ($jwtSigningSecret) { $lines.Add("RELIC_JWT_SIGNING_SECRET=$jwtSigningSecret") }
  foreach ($entry in $configuration.GetEnumerator()) { $lines.Add($entry.Key + "=" + $entry.Value) }
  [IO.File]::WriteAllLines($temporaryEnvPath, $lines, [Text.UTF8Encoding]::new($false))
  Protect-LocalFile $temporaryEnvPath

  $setResult = & npx supabase secrets set --project-ref $SupabaseProjectRef --env-file $temporaryEnvPath --yes --agent no 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Supabase rejected the E2 server-only configuration update." }

  $localState = @(
    "INTERNAL_TOKEN=$internalToken",
    "LITELLM_PROXY_KEY=$proxyKey"
  )
  [IO.File]::WriteAllLines($localStatePath, $localState, [Text.UTF8Encoding]::new($false))
  Protect-LocalFile $localStatePath

  if ($RotateOpenAI) {
    if (-not (Test-Path -LiteralPath $flyctlPath)) { throw "Fly CLI was not found at the expected local path." }
    $flyInput = "OPENAI_API_KEY=$openAiKey"
    $flyResult = $flyInput | & $flyctlPath secrets import --app $FlyApp 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Fly rejected the OpenAI secret rotation." }
  }

  $configuredNames = Get-RemoteSecretNames
  $requiredNames = @("INTERNAL_TOKEN", "RELIC_JWT_SIGNING_SECRET", "LITELLM_PROXY_KEY") + @($configuration.Keys)
  $stillMissing = @($requiredNames | Where-Object { $configuredNames -notcontains $_ })
  if ($stillMissing.Count -gt 0) { throw ("Hosted verification is missing configured names: " + ($stillMissing -join ", ")) }

  [ordered]@{
    result = "E2_SECURE_BOOTSTRAP_OK"
    project_ref = $SupabaseProjectRef
    fly_app = $FlyApp
    configured_names = @($requiredNames | Sort-Object)
    openai_rotated = [bool]$RotateOpenAI
    secret_values_printed = $false
    next_step = "Run fail-closed checks, install authenticated schedules, then execute the bounded synthetic smoke matrix."
  } | ConvertTo-Json -Depth 4
} finally {
  $internalToken = $null
  $proxyKey = $null
  $jwtSigningSecret = $null
  $openAiKey = $null
  if (Test-Path -LiteralPath $resolvedTempDirectory) {
    $verified = [IO.Path]::GetFullPath($resolvedTempDirectory)
    if ($verified.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
      Remove-Item -LiteralPath $verified -Recurse -Force
    }
  }
}
