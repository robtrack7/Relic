[CmdletBinding()]
param(
  [switch]$DeepOnly,
  [switch]$SharedRepeat
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $repoRoot "infra/litellm/.secrets.e2-staging"

function Read-DotEnvValue([string]$Path, [string]$Name) {
  $line = Get-Content -LiteralPath $Path |
    Where-Object { $_ -match ("^" + [regex]::Escape($Name) + "=") } |
    Select-Object -First 1
  if (-not $line) { return $null }
  return $line.Substring($line.IndexOf("=") + 1)
}

$priorToken = $env:INTERNAL_TOKEN
try {
  if (-not $env:INTERNAL_TOKEN) {
    $env:INTERNAL_TOKEN = Read-DotEnvValue $statePath "INTERNAL_TOKEN"
  }
  if (-not $env:INTERNAL_TOKEN) {
    throw "The protected E2 internal token is unavailable."
  }
  $runnerArgs = @((Join-Path $repoRoot "scripts/smoke-e2-hosted.mjs"), "--execute")
  if ($DeepOnly) { $runnerArgs += "--deep-only" }
  if ($SharedRepeat) { $runnerArgs += "--shared-repeat" }
  & node @runnerArgs
  if ($LASTEXITCODE -ne 0) {
    throw "The hosted E2 smoke runner failed."
  }
} finally {
  $env:INTERNAL_TOKEN = $priorToken
}
