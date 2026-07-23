# E3 Hosted Guide Readiness

Status: **authorized; environment-gated by provider credential scope**

Packet E3 is functionally complete in the local deterministic environment. On 2026-07-23 the user authorized several synthetic hosted calls under a hard cumulative USD $0.50 ceiling and separately approved the temporary staging gateway-JWT exception required by the server-only internal-token functions. The smoke remains incomplete because the protected OpenAI project key returns `401 missing_scope` for Chat Completions.

## Proposed smoke

1. **Environment and project:** synthetic-only `relic-staging`; never production.
2. **Proxy and alias:** a newly isolated staging proxy/key; `relic-balanced` for `answer_saga_question` and `relic-embed` for query retrieval. Do not reuse the E2 `relic-llm-dev` exception without explicit authorization.
3. **Expected resolved models:** the staging operator must name and verify the concrete model behind `relic-balanced`; `relic-embed` must resolve to `text-embedding-3-small` at 1536 dimensions. An alias-only response is insufficient evidence.
4. **Synthetic classification:** one invented Saga, one eligible World record, one current-Saga record, one sibling-Saga exclusion, one unapproved import exclusion, and one fictional continuity question. No user campaign content.
5. **Maximum attempts:** three query-embedding requests and at most six AI provider requests across three conversational turns, including registry-permitted repairs. Stop immediately when a known run reaches an unexpected terminal state.
6. **Cost ceiling:** authorized cumulative packet ceiling USD $0.50. The isolated retry proxy is capped at USD $0.49, reserving the balance for earlier short rejected/preflight paths.
7. **Isolation prerequisite:** a separately rotatable least-privilege staging proxy/key must exist, or the user must explicitly approve the exact temporary exception after reviewing its risk.
8. **Credential prerequisite:** the temporary broad E2 key remains an accepted risk and should be restricted or rotated. No credential values enter commands, logs, chat, fixtures, or commits.
9. **Command:** `npx pnpm@10.11.0 e3:smoke:hosted` prints a non-mutating preflight. `scripts/invoke-e3-hosted-smoke.ps1 -ValidateFixture` performs the zero-inference staging fixture/auth/RLS proof. `scripts/invoke-e3-hosted-smoke.ps1 -Execute` is the approved hosted path and enforces the fixture ID, attempt limits, isolated proxy budget, temporary scheduler pause, temporary gateway-JWT setting, restoration, and cleanup.
10. **Cleanup:** disable the fixture-specific runner, delete synthetic Workspace data, verify queues/alerts are clear, and retain only payload-free telemetry and usage evidence.
11. **Evidence:** route submission, immutable allowlist, resolved concrete model, cited answer or `no_answer`, keyboard-openable source context, exactly-once usage, exact replay with no additional provider call, sibling/import exclusion, safe-log scan, and zero automatic canon writes.

## Local proof complete

- Clean migration replay and 21 focused Guide pgTAP assertions.
- Strict Guide schema and Edge source suites pass.
- Full web tests, TypeScript, production build, and repository verification pass.
- Authenticated browser proof exercises the real route, server action, hybrid retrieval, shared AI runtime, citation context, insufficiency, explicit draft confirmation, refresh recovery, and 1440×900, 1024×768, 768×1024, and 390×844 layouts.
- Post-reset safe telemetry identifies only `deterministic-test` AI and `deterministic-development-test` embeddings; both AI runs are non-billable and require zero repair calls.

## Local-provider incident

Before the helper was hardened, its `--env-file` retained live provider configuration despite process-level deterministic overrides. Four synthetic LiteLLM requests occurred: one embedding, one entity draft, and one Guide answer plus its bounded repair. No private data or production system was involved. The successful draft recorded 315 input and 227 output tokens and three local credits; the failed Guide result recorded zero user credits. Provider cost fields were unavailable. The helper now defaults to deterministic isolation and strips live credentials from the temporary Edge environment.

## Authorized staging attempt

- The zero-inference fixture preflight passed: scoped JWT issuance, authenticated RLS read, current-Saga/World eligibility, sibling-Saga and unapproved-import sentinels, zero AI runs/provider events, and complete cleanup.
- The first execution exposed and fixed the linked-login `cron.job` mutation boundary by using `cron.alter_job`.
- A second execution exposed and fixed the harness assumption that Guide submission always completes synchronously; exact direct dispatch now uses the same leased run when submission remains pending.
- A third execution exposed the Supabase gateway JWT setting required by internal-token-only functions. The user explicitly approved a temporary staging exception; the wrapper now restores gateway verification afterward.
- The provider-reaching execution stopped at turn one with terminal `provider_rejected`. A payload-free direct metadata/probe isolated the cause as OpenAI `401 missing_scope`; the protected key lacks Chat Completions write permission. No valid completion, usage event, draft, or canon write was produced.
- Every attempt restored the original staging provider, re-enabled both dispatch schedules, destroyed the temporary Fly app, and removed all synthetic rows, queues, AI runs, and provider events.

## Remaining gate

Install a staging OpenAI key with Chat Completions write permission (and access to the configured `gpt-5.6-terra` model), then rerun the same bounded command. Do not mark E3 complete or begin E4 until all three conversational turns, exact replay, citations/no-answer behavior, metering, isolation, safe telemetry, and zero automatic canon writes pass.
