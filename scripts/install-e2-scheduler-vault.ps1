[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $repoRoot "infra/litellm/.secrets.e2-staging"
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$tempDirectory = Join-Path $tempRoot ("relic-e2-vault-" + [guid]::NewGuid().ToString("N"))
$sqlPath = Join-Path $tempDirectory "vault-bootstrap.sql"

function Read-DotEnvValue([string]$Path, [string]$Name) {
  $line = Get-Content -LiteralPath $Path |
    Where-Object { $_ -match ("^" + [regex]::Escape($Name) + "=") } |
    Select-Object -First 1
  if (-not $line) { return $null }
  return $line.Substring($line.IndexOf("=") + 1)
}

function Protect-Path([string]$Path) {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $rights = if (Test-Path -LiteralPath $Path -PathType Container) { "(OI)(CI)F" } else { "F" }
  & icacls.exe $Path /inheritance:r /grant:r "${identity}:$rights" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not protect temporary scheduler material." }
}

$result = $null
try {
  $internalToken = Read-DotEnvValue $statePath "INTERNAL_TOKEN"
  if ([string]::IsNullOrWhiteSpace($internalToken)) {
    throw "The protected E2 internal token is unavailable."
  }
  $escapedToken = $internalToken.Replace("'", "''")
  $edgeBaseUrl = "https://scagegrrilvrpuilthzz.supabase.co/functions/v1"

  New-Item -ItemType Directory -Path $tempDirectory | Out-Null
  Protect-Path $tempDirectory
  $sql = @"
do `$bootstrap`$
declare
  secret_id uuid;
begin
  select id into secret_id from vault.secrets where name = 'relic_internal_worker_token' order by created_at desc limit 1;
  if secret_id is null then
    perform vault.create_secret('$escapedToken', 'relic_internal_worker_token', 'E2 hosted worker dispatch credential');
  else
    perform vault.update_secret(secret_id, '$escapedToken', 'relic_internal_worker_token', 'E2 hosted worker dispatch credential');
  end if;

  select id into secret_id from vault.secrets where name = 'relic_edge_functions_base_url' order by created_at desc limit 1;
  if secret_id is null then
    perform vault.create_secret('$edgeBaseUrl', 'relic_edge_functions_base_url', 'E2 staging Edge Functions base URL');
  else
    perform vault.update_secret(secret_id, '$edgeBaseUrl', 'relic_edge_functions_base_url', 'E2 staging Edge Functions base URL');
  end if;
end
`$bootstrap`$;
"@
  [IO.File]::WriteAllText($sqlPath, $sql, [Text.UTF8Encoding]::new($false))
  Protect-Path $sqlPath

  $priorErrorAction = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $null = & supabase db query --linked --file $sqlPath --output json --agent no 2>&1
    $queryExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $priorErrorAction
  }
  if ($queryExitCode -ne 0) {
    throw "The scheduler Vault bootstrap failed without exposing command output."
  }
  $result = [pscustomobject]@{
    result = "E2_SCHEDULER_VAULT_OK"
    configured_names = @("relic_edge_functions_base_url", "relic_internal_worker_token")
    secret_values_printed = $false
    temporary_material_removed = $false
  }
} finally {
  $internalToken = $null
  $escapedToken = $null
  if (Test-Path -LiteralPath $tempDirectory) {
    $verifiedPath = [IO.Path]::GetFullPath($tempDirectory)
    if (-not $verifiedPath.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to remove an unverified temporary path."
    }
    Remove-Item -LiteralPath $verifiedPath -Recurse -Force
  }
}
$result.temporary_material_removed = $true
$result | ConvertTo-Json
