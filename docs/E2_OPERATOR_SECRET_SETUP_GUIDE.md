# Packet E2 secure setup guide

**Purpose:** complete the three user-owned setup actions that unblock the hosted E2 smoke tests.
**Environment:** Supabase `relic-staging` (`scagegrrilvrpuilthzz`) and the temporary E2 Fly proxy `relic-llm-dev`.
**Time required:** about 10–15 minutes at a trusted computer.
**Provider cost from these steps:** none. Installing secrets does not make an OpenAI inference call. Updating a Fly secret may briefly restart the existing Fly Machine.

This guide is safe to follow independently. Stop at any warning instead of guessing. Codex can perform the remaining E2 deployment, schedule, smoke, evidence, cleanup, and verification work after these steps.

## What the credentials do

| Credential | Stored in | Used for | Must never go to |
|---|---|---|---|
| OpenAI project API key | Fly secret `OPENAI_API_KEY` | Fly/LiteLLM calls chat, transcription, and embedding models | Supabase, the web app, Git, docs, chat, or a command-line argument |
| LiteLLM proxy credential | Fly `LITELLM_MASTER_KEY` and matching Supabase `LITELLM_PROXY_KEY` | Supabase workers authenticate to the Fly proxy | Browser code, chat, or logs |
| Relic internal token | Supabase `INTERNAL_TOKEN` | Cron and internal workers authenticate to Edge Functions | Browser code, public endpoints, chat, or logs |
| Staging JWT signing secret | Supabase `RELIC_JWT_SIGNING_SECRET` | The dedicated issuer creates short-lived, GM-scoped worker JWTs | Fly, browser code, chat, Git, or any worker other than the issuer |

The bootstrap helper generates the Relic internal token and transfers the existing proxy credential without displaying either value. Your manual work is limited to installing the OpenAI key, installing the staging JWT secret, and authenticating the local Supabase CLI.

## Safety rules

- Work only on a private, trusted computer. Do not complete these steps on a shared or public machine.
- Never paste a secret into ChatGPT, a document, source code, an `.env` file in the repository, a screenshot, or a browser-visible application setting.
- Check the project/app name before every save: `relic-staging` for Supabase and `relic-llm-dev` for Fly.
- Do not use PowerShell command arguments such as `--token VALUE` or `OPENAI_API_KEY=VALUE`; they can remain in shell history or process inspection.
- Do not share unreviewed terminal output. It is safe to report configured **names**, success/error categories, and exit codes, but not values, digests, headers, URLs containing tokens, or verbose/debug logs.
- If any value is accidentally exposed, stop and rotate or revoke it before continuing.

## Before starting

1. Open PowerShell in `F:\Playground\RELIC`.
2. Confirm the repository path:

   ```powershell
   Get-Location
   ```

3. Run the read-only preflight:

   ```powershell
   npm run e2:preflight
   ```

Expected evidence:

- `"mode": "preflight"`
- `"performs_mutation": false`
- project ref `scagegrrilvrpuilthzz`
- Fly app `relic-llm-dev`
- `"inference_attempts_so_far": 6`
- `"successful_provider_calls_so_far": 1`
- `"maximum_additional_inference_attempts": 6`
- `"packet_inference_attempt_limit": 12`

If any environment identifier differs, stop and tell Codex. Do not edit the script to make it match another environment.

## Action 1 — Create and install the capped OpenAI key

### 1A. Create the key

1. Open the [OpenAI API keys page](https://platform.openai.com/settings/organization/api-keys).
2. Select the dedicated project on which you already configured the `$5` maximum. Verify the project name and limit before creating the key.
3. Create a new **project-scoped restricted key** named `relic-e2-staging`.
4. Grant only model-request permission. If the key screen offers endpoint-level controls, allow:
   - `POST /v1/chat/completions`
   - `POST /v1/embeddings`
   - `POST /v1/audio/transcriptions`
   - optionally `GET /v1/models` for a non-inference inventory check
5. Deny administration, assistants, files, fine-tuning, batches, vector stores, and other unused capabilities.
6. Copy the key once. Do not save it in a text file or password field associated with a browser-visible app.

OpenAI's current permission model groups chat, audio, embeddings, and images under **Model capabilities — Request**. Dashboard labels may change; the required capability is the narrow ability to call the three endpoints above. If the UI cannot produce a project-scoped restricted key, stop and tell Codex rather than creating a broad organization key.

### 1B. Send the value directly to Fly through standard input

Paste the following block into PowerShell. It prompts for the key without echoing it and does not place the key in command history:

```powershell
$secureOpenAIKey = Read-Host "Paste the new OpenAI key" -AsSecureString
$openAIKeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureOpenAIKey)
try {
  $plainOpenAIKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($openAIKeyPointer)
  "OPENAI_API_KEY=$plainOpenAIKey" |
    & "$env:USERPROFILE\.fly\bin\flyctl.exe" secrets import --app relic-llm-dev
} finally {
  if ($openAIKeyPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($openAIKeyPointer)
  }
  Remove-Variable plainOpenAIKey, secureOpenAIKey, openAIKeyPointer -ErrorAction SilentlyContinue
  Set-Clipboard -Value $null
}
```

This updates only the server-side Fly secret and may create a new Fly release/restart. It does not call OpenAI.

Verify names and deployment state only:

```powershell
& "$env:USERPROFILE\.fly\bin\flyctl.exe" secrets list --app relic-llm-dev
& "$env:USERPROFILE\.fly\bin\flyctl.exe" status --app relic-llm-dev
```

Expected secret names:

- `OPENAI_API_KEY`
- `LITELLM_MASTER_KEY`

Do not run an inference test yourself. Codex will run the bounded application smokes and count every external call.

## Action 2 — Install the staging JWT signing secret in Supabase

This is a deliberately narrow E2 compatibility step for an empty staging project and synthetic fixtures. Supabase recommends asymmetric signing keys for durable production use; production must not inherit this legacy-secret arrangement without the planned issuer upgrade.

1. Open the [JWT signing keys page for `relic-staging`](https://supabase.com/dashboard/project/scagegrrilvrpuilthzz/settings/jwt).
2. Confirm the displayed project is `relic-staging` and its ref is `scagegrrilvrpuilthzz`.
3. Locate the existing **Legacy JWT secret** and use the dashboard's reveal/copy control.
4. Do **not** click **Migrate JWT secret**, **Rotate keys**, **Revoke**, or **Delete**. E2 only needs a copy of the existing staging secret.
5. In a second tab, open [Edge Function Secrets for `relic-staging`](https://supabase.com/dashboard/project/scagegrrilvrpuilthzz/functions/secrets).
6. Add one server-side secret:
   - name: `RELIC_JWT_SIGNING_SECRET`
   - value: the legacy JWT secret copied in step 3
7. Save, verify that the **name** is listed, and clear the clipboard:

   ```powershell
   Set-Clipboard -Value $null
   ```

Do not place this value in Fly, OpenAI, web hosting, GitHub, a public `NEXT_PUBLIC_*` variable, or any local repository file. Supabase makes Edge secrets available without redeploying functions.

If the dashboard does not expose an existing legacy JWT secret, stop. Do not create, rotate, migrate, or guess one. That means the E2 issuer must be upgraded to the asymmetric signing-key path before the hosted smoke.

## Action 3 — Authenticate the local Supabase CLI

The login lets the prepared helper set and verify **server-side secret names**. It does not grant browser code access to them.

1. From PowerShell in the repository, run:

   ```powershell
   npx supabase login --name relic-e2-local-cli
   ```

2. Follow the browser login flow. If Supabase instead asks for a personal access token, create it only at the [Supabase access-token page](https://supabase.com/dashboard/account/tokens), choose the shortest available expiry that comfortably covers E2, and paste it into the interactive terminal prompt. Never pass it with `--token` and never paste it into chat.
3. Verify access:

   ```powershell
   npx supabase projects list
   ```

4. Confirm that the output includes `relic-staging` and `scagegrrilvrpuilthzz`.

Supabase normally stores the token in the operating system's native credential store. If the CLI reports that it will fall back to plaintext storage under your user profile, continue only on a private, encrypted computer. Stop on a shared or untrusted machine.

Do not set `SUPABASE_ACCESS_TOKEN` permanently. Keep the login until Codex finishes E2. After E2 is complete, you may run `npx supabase logout` and revoke a temporary personal access token if you created one.

## Action 4 — Run the prepared secure bootstrap

This action installs the approved server-only alias/model configuration, creates the internal token, and transfers the proxy credential. It does not call OpenAI.

1. Run the read-only check once more:

   ```powershell
   npm run e2:preflight
   ```

2. Apply the prepared bootstrap:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/e2-secure-bootstrap.ps1 -Apply
   ```

Expected result:

- `"result": "E2_SECURE_BOOTSTRAP_OK"`
- project ref `scagegrrilvrpuilthzz`
- Fly app `relic-llm-dev`
- `"openai_rotated": false` because Action 1 already rotated it directly
- `"secret_values_printed": false`

The helper uses a protected temporary file for the Supabase transfer, deletes it in `finally`, and retains only the internal/proxy credentials in ignored, access-controlled local state for the E2 smoke. It never stores the OpenAI key or JWT signing secret locally.

## Final name-only verification

Run:

```powershell
npx supabase secrets list --project-ref scagegrrilvrpuilthzz
```

The following names must be present. Do not report their values or digests:

- `INTERNAL_TOKEN`
- `RELIC_JWT_SIGNING_SECRET`
- `LITELLM_PROXY_KEY`
- `RELIC_ENV`
- `LITELLM_PROXY_URL`
- `TRANSCRIPTION_PROVIDER_MODE`
- `TRANSCRIPTION_MODEL_ALIAS`
- `TRANSCRIPTION_RESOLVED_MODEL`
- `TRANSCRIPTION_TIMEOUT_MS`
- `EMBEDDING_PROVIDER_MODE`
- `EMBEDDING_MODEL_ALIAS`
- `EMBEDDING_RESOLVED_MODEL`
- `EMBEDDING_DIMENSIONS`
- `EMBEDDING_TIMEOUT_MS`
- `AI_PROVIDER_MODE`
- `AI_MODEL_RELIC_FAST`
- `AI_RESOLVED_MODEL_RELIC_FAST`
- `AI_MAX_OUTPUT_TOKENS_RELIC_FAST`
- `AI_MODEL_RELIC_BALANCED`
- `AI_RESOLVED_MODEL_RELIC_BALANCED`
- `AI_MAX_OUTPUT_TOKENS_RELIC_BALANCED`
- `AI_MODEL_RELIC_DEEP`
- `AI_RESOLVED_MODEL_RELIC_DEEP`
- `AI_MAX_OUTPUT_TOKENS_RELIC_DEEP`
- `AI_TIMEOUT_MS`

## What to send back in ChatGPT

Send only this name/status-level confirmation:

> E2 secure bootstrap completed. Fly lists `OPENAI_API_KEY` and `LITELLM_MASTER_KEY`. Supabase lists `INTERNAL_TOKEN`, `RELIC_JWT_SIGNING_SECRET`, `LITELLM_PROXY_KEY`, and the E2 configuration names. Please continue the bounded E2 hosted smokes. No values shared.

If something failed, send only:

- which numbered action failed;
- the command name, not the command with any value;
- the exit code;
- a short redacted error category such as `not authenticated`, `project not found`, or `permission denied`.

Do not paste complete logs until you have checked that they contain no keys, tokens, authorization headers, signed URLs, or secret values.

## Stop conditions

Stop and ask Codex for help if any of these occur:

- the Supabase project or Fly app name does not match this guide;
- the `$5` OpenAI project protection is absent or the key cannot be restricted;
- the Supabase legacy JWT secret is unavailable;
- a dashboard asks you to migrate, rotate, revoke, or delete signing keys;
- the CLI account cannot see `relic-staging`;
- login would store a token in plaintext on a shared/untrusted computer;
- a secret value appears in output, source control, a screenshot, or chat;
- the bootstrap result is not `E2_SECURE_BOOTSTRAP_OK`.

## Recovery and rollback

- **Wrong or rejected OpenAI key:** create a new project-scoped restricted key and repeat Action 1. Revoke the incorrect key after the replacement is installed. Do not delete `LITELLM_MASTER_KEY`.
- **Wrong Supabase Edge secret value:** correct `RELIC_JWT_SIGNING_SECRET` in Edge Function Secrets. Do not rotate the project's Auth signing key. Until corrected, the worker path fails closed.
- **Wrong Supabase project:** stop immediately and report which non-secret project name was affected. Do not attempt cleanup by deleting projects, functions, or keys.
- **Unwanted CLI login:** after E2 is complete, run `npx supabase logout`; if you manually created a Supabase personal access token, revoke it from the access-token page.
- **Suspected exposure:** revoke/rotate the exposed credential at its owner first—OpenAI for the provider key, Supabase for a personal access token, or the relevant hosted secret store—then tell Codex only which credential class was rotated.

## Closeout note

These setup actions are complete. The three Vault-authenticated schedules and all four synthetic hosted workflow families passed, including restart, retry/recovery, metering, isolation, safe logs, cleanup, and zero canon writes.

The final conservative count was 41 attempts against the authorized ceiling of 40 because repeat mode dispatched a different queued synthetic embedding job after the intended proof. The path was removed, cleanup passed, and the runner is hard-disabled. No further provider request is authorized by E2; any later call requires a new packet-level ceiling.

## Official references

- [OpenAI platform permissions and least-privilege guidance](https://developers.openai.com/api/docs/guides/rbac)
- [OpenAI API authentication/quota error guidance](https://developers.openai.com/api/docs/guides/error-codes)
- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase CLI login and credential storage](https://supabase.com/docs/reference/cli/supabase-login)
- [Supabase JWT signing keys and legacy-secret migration](https://supabase.com/docs/guides/auth/signing-keys)
