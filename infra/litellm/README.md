# Relic development LiteLLM gateway

This package deploys the development gateway. Packet E2 temporarily reuses it
for a bounded, non-sensitive hosted smoke while the staging database remains a
separate Supabase project. It exposes explicit `relic-transcribe`,
`relic-embed`, `relic-fast`, `relic-balanced`, and `relic-deep` aliases. There
is no silent provider/model fallback, LiteLLM database, or admin UI.

The E2 map is OpenAI-only: `whisper-1`, `text-embedding-3-small` at 1536
dimensions, GPT-5.6 Luna, GPT-5.6 Terra, and GPT-5.6 Sol. The OpenAI key remains
only in Fly secret storage. A separate `relic-llm-staging` application is still
required before ordinary staging traffic; this temporary exception expires at
E2 closeout.

## What each secret does

- `OPENAI_API_KEY`: lets LiteLLM call OpenAI. Only Fly receives this value.
- `LITELLM_MASTER_KEY`: lets Relic authenticate to LiteLLM. Fly and the
  server-only Relic environment receive this value. `config.yaml` binds it to
  LiteLLM's `general_settings.master_key`; this development gateway does not
  use database-backed virtual keys.
- `INTERNAL_TOKEN`: a separate Relic worker token. It does not belong in Fly
  and is created when the local Supabase environment is wired.

## 1. Verify the pinned image

The Dockerfile pins official LiteLLM release `v1.93.0`. Its release page
publishes this signature-verification command:

```powershell
cosign verify `
  --key https://raw.githubusercontent.com/BerriAI/litellm/0112e53046018d726492c814b3644b7d376029d0/cosign.pub `
  ghcr.io/berriai/litellm:v1.93.0
```

Do not use the mutable `main`, `latest`, or `main-latest` tags.

## 2. Create the Fly application

Run from this directory:

```powershell
fly apps create relic-llm-dev
```

Fly application names are globally unique. If that name is unavailable, add a
short non-secret suffix, update `app` in `fly.toml`, and use the same name in
later commands.

This command reserves the application name. It does not deploy a Machine yet.

## 3. Prepare and import secrets

Copy the template:

```powershell
Copy-Item .secrets.dev.example .secrets.dev
```

Open `.secrets.dev` locally and paste the OpenAI project key after
`OPENAI_API_KEY=`. Generate a different random proxy key in PowerShell:

```powershell
"sk-" + [Convert]::ToHexString(
  [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
).ToLower()
```

Save that output after `LITELLM_MASTER_KEY=` and in a password manager. Do not
print either file or value in logs or chat.

Import both values into Fly through stdin so they do not appear as command-line
arguments:

```powershell
Get-Content -Raw -LiteralPath .secrets.dev |
  fly secrets import --stage -a relic-llm-dev
```

`--stage` records the encrypted secrets without attempting a deployment before
the image is ready. `fly secrets list -a relic-llm-dev` shows names and digests,
never plaintext values.

## 4. Deploy one development Machine

```powershell
fly deploy "F:\Playground\RELIC\infra\litellm" `
  --config "F:\Playground\RELIC\infra\litellm\fly.toml" `
  --ha=false
```

The deployment builds the pinned container and starts one 2 GB shared-CPU
Machine in `iad`. Development uses `min_machines_running = 0`, so Fly may stop
the Machine while idle and restart it on the next request. Expect a cold-start
delay after idle periods. Fly checks `/health/liveliness` before routing
traffic.

## 5. Verify without calling OpenAI

These checks do not create embeddings:

```powershell
fly status -a relic-llm-dev
fly checks list -a relic-llm-dev
Invoke-RestMethod https://relic-llm-dev.fly.dev/health/liveliness
```

Do not send ad-hoc provider requests. E2 is closed and its runner is hard-disabled:
the final conservative count is 41 attempts against the authorized 40-call ceiling,
with total exposure below the packet `$1` and project `$5` caps. Any later provider
request requires a new packet-level authorization and independently tracked budget.
