# E3 Hosted Guide Readiness

Status: **Decision Stop 4 — not authorized**

Packet E3 is functionally complete in the local deterministic environment. This document is the bounded authorization packet for the remaining hosted smoke. It does not authorize deployment or provider calls.

## Proposed smoke

1. **Environment and project:** synthetic-only `relic-staging`; never production.
2. **Proxy and alias:** a newly isolated staging proxy/key; `relic-balanced` for `answer_saga_question` and `relic-embed` for query retrieval. Do not reuse the E2 `relic-llm-dev` exception without explicit authorization.
3. **Expected resolved models:** the staging operator must name and verify the concrete model behind `relic-balanced`; `relic-embed` must resolve to `text-embedding-3-small` at 1536 dimensions. An alias-only response is insufficient evidence.
4. **Synthetic classification:** one invented Saga, one eligible World record, one current-Saga record, one sibling-Saga exclusion, one unapproved import exclusion, and one fictional continuity question. No user campaign content.
5. **Maximum attempts:** one query-embedding request and at most two AI provider requests (initial plus the registry-permitted repair). Stop immediately after the known run reaches complete or terminal state.
6. **Cost ceiling:** requires explicit user approval. Recommended packet ceiling: USD $0.10, with the existing project-level cap retained.
7. **Isolation prerequisite:** a separately rotatable least-privilege staging proxy/key must exist, or the user must explicitly approve the exact temporary exception after reviewing its risk.
8. **Credential prerequisite:** the temporary broad E2 key remains an accepted risk and should be restricted or rotated. No credential values enter commands, logs, chat, fixtures, or commits.
9. **Command:** a dedicated E3 harness must receive the fixture run ID, enforce the approved provider-attempt and cost ceilings in code, and refuse generic queue dispatch. The command will be recorded here only after the harness exists and passes source tests.
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
