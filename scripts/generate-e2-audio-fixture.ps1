[CmdletBinding()]
param([string]$OutputPath)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $OutputPath) {
  $fixtureDirectory = Join-Path ([IO.Path]::GetTempPath()) "relic-e2-fixtures"
  New-Item -ItemType Directory -Path $fixtureDirectory -Force | Out-Null
  $OutputPath = Join-Path $fixtureDirectory "relic-e2-transcription-smoke.wav"
}

$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
$parent = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }

Add-Type -AssemblyName System.Speech
$synthesizer = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
  $synthesizer.Rate = 0
  $synthesizer.SetOutputToWaveFile($resolvedOutput)
  $synthesizer.Speak("Relic staging fixture. The glass heron waits beside the blue observatory.")
} finally {
  $synthesizer.Dispose()
}

$bytes = [IO.File]::ReadAllBytes($resolvedOutput)
if ($bytes.Length -lt 44 -or [Text.Encoding]::ASCII.GetString($bytes, 0, 4) -ne "RIFF" -or [Text.Encoding]::ASCII.GetString($bytes, 8, 4) -ne "WAVE") {
  throw "Generated transcription fixture is not a valid WAV file."
}

[ordered]@{
  result = "E2_AUDIO_FIXTURE_OK"
  path = $resolvedOutput
  bytes = $bytes.Length
  text_classification = "synthetic_non_sensitive"
  expected_phrase = "glass heron waits beside the blue observatory"
} | ConvertTo-Json
