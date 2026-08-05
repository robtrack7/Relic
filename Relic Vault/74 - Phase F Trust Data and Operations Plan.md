---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
  - "[[59 - Phase E Loom Operating Layer Plan]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[24 - Approval Queue]]"
  - "[[25 - Pricing and Rate Limits]]"
  - "[[58 - Backend Module 10 Notifications Export Operations Plan]]"
  - "[[69 - Settings Usage Design Spec]]"
supersedes: []
last_audited: 2026-08-05
source_file: "Relic Vault/74 - Phase F Trust Data and Operations Plan.md"
---

# Phase F Trust, Data, and Operations Plan

## Purpose

Phase F makes the completed Loom operating layer trustworthy in daily use. It is the control plane around conversation, retrieval, async work, data ownership, and provider cost. It does not add autonomous authority: AI output remains non-canon until the GM uses the existing inline review or Approval Queue commit path.

The prior F1-F3 headings were directionally correct but too narrow. Forms, ZIP generation, and email delivery alone do not prove that a conversational operating layer can recover from quota blocks, honor retention, export its user-owned state, and notify without leaking private content. This plan closes those contracts.

## Non-negotiable boundaries

- Settings is deterministic and provider-free. The Loom may read safe usage/setting summaries, explain consequences, and navigate to the exact panel or preserved manual workflow. It may not choose or mutate retention, notification, account, provider, or billing settings.
- A quota block preserves the current Loom thread, turn, prompt, action identity, and manual product path. It states the human unit, remaining/reset state, what is blocked, what remains available, and a return link. It creates no provider call, query embedding, usage charge, draft, canon write, or hidden retry.
- Retention changes are explicitly confirmed when destructive, affect future cleanup only, and never imply recovery of already-deleted data. Cleanup removes the eligible source bytes and derived retrieval artifacts together while retaining the minimum scoped audit/provenance required to explain an approved canon write.
- User-owned exports include the selected Saga's readable canon and working history, including Loom conversations, typed action receipts, citations, drafts, and canon audit when the audit option is enabled. Exports always exclude secrets, system/developer prompts, raw provider payloads, private worker telemetry, embeddings, and `internal.*` rows.
- Notifications contain safe labels and scoped deep links, not prompts, generated prose, transcript excerpts, push tokens, provider payloads, or private story content. Dispatch reads the latest preference at send time and remains deduped, retryable, and observable through safe state.
- Provider pricing and model routing remain server-owned. MVP exposes AI credits, not tokens, BYOK, model selection, prompt tuning, or provider cost internals.

## Packet F1 — Settings, retention, and quota recovery

### Scope

1. Add scoped read/write contracts for GM profile, Saga game system and profile override, audio/transcript retention, and notification preferences. Server code derives the authenticated user and validates Workspace/World/Saga ownership independently of browser input.
2. Give Settings explicit Saga, World, Workspace Usage, Retention, Notifications, Export, and Account sections. Scope labels and consequences must remain visible on mobile and desktop.
3. Render 70%, 90%, and 100% states from the same effective-limit projection used by quota preflight, including overrides and reset time. The 100% state identifies the blocked operation and keeps view/edit/review/delete/download/manual paths open.
4. Add calm recovery links for Loom, transcription, import, export, storage, and create-limit blocks. A Loom-originated block returns to the same conversation/manual path rather than treating Settings as a mandatory detour.
5. Apply retention changes only to future cleanup. Audio from permanently failed transcription remains recoverable. Transcript deletion is a separate explicit operation; no setting silently deletes existing transcripts or source citations.
6. Validate preference shape and permitted keys in the database. Notification changes are user-scoped and auditable without storing destination addresses, tokens, or message bodies in browser-readable rows.

### F1 done gate

- Wrong Workspace/World/Saga, sibling Saga, forged user, unknown key, malformed preference, and invalid retention attempts have zero effects.
- Exact replay is idempotent; concurrent changes return a current state rather than silently overwriting incompatible input.
- Retention queue behavior, effective quota thresholds, preference-at-send behavior, and Loom/manual recovery links have focused database/web coverage.
- Settings works at 360×800, 768×1024, 1280×800, and 1440×900 with keyboard-visible labels and non-colour-only states.

## Packet F2 — Real deterministic export

### Scope

1. Replace the placeholder manifest URL with a deterministic archive builder that reads a worker-only, scope-checked export projection and produces `saga.json`, a Markdown tree, and `README.txt` in one ZIP.
2. Upload the ZIP to the private `exports/<workspace>/<world>/<saga>/<export>.zip` path. Browser access is only through a fresh, short-lived signed URL returned after a scoped status check; the database does not persist a reusable public URL.
3. Default export contains current readable Saga data. `Include audit trail and drafts` additionally includes drafts, citations/sources, canon audit, consent/dice/quick-capture evidence, Loom conversations, and typed action/provenance receipts needed to understand user-visible operations.
4. Exclude audio bytes, embeddings, query embeddings, internal queues, prompt templates, provider request/response payloads, operational ledgers, secrets, push tokens, and user-level profile data.
5. Keep generation idempotent, charge one export unit only after a usable archive exists, retry safely, expose sanitized failure state, and delete expired Storage objects before finalizing cleanup state.

### F2 done gate

- A real downloaded ZIP opens; JSON validates; Markdown and manifest contents match the requested scope/options.
- Sibling and cross-Workspace data are absent, unsafe internal keys are absent, signed URLs expire, and exact retry neither duplicates archives nor charges.
- Expired export cleanup removes the private object and leaves a safe expired status.

## Packet F3 — Notification delivery

### Scope

1. Deliver mandatory MVP email for pipeline ready, failed, and 30/90-day stale review events through a provider adapter. Mobile push stays behind the mobile release branch; existing push schema remains reserved and disabled on web.
2. Add quota 70/90/100 threshold receipts and async Loom task ready/failed/stale receipts only where they close a recoverable loop. Threshold enqueue is idempotent per Workspace, meter, period, and threshold.
3. Generate server-owned deep links to the exact Review, Session recovery, Loom thread, Usage, or Export status surface. The payload stores identifiers and safe state only.
4. Read the latest GM preferences at dispatch, suppress during live/undo states where required, record sent/skipped/failed state, retry transient failures, and dead-letter terminal failures with sanitized reason codes.
5. Expose safe user-visible delivery state only where recovery matters. Never expose queue payloads, destination addresses, tokens, or provider responses.

### F3 done gate

- Enabled email delivers once; disabled/paused email does not; a transient failure retries; terminal failure is visible without leaking the address or provider body.
- Deep links open the correct authorized recovery surface and fail safely after the underlying object is deleted or access changes.
- Live/undo suppression, stale dedupe, quota threshold dedupe, and unsafe-payload rejection pass focused and integrated tests.

## Phase F milestone gate

Run a clean local reset and full database, script/runtime, web, type, lint, and production-build suites. Inspect one real ZIP. Execute one bounded email smoke against a dedicated test destination only when explicitly configured; no OpenAI call is required for Phase F. Exercise settings mutation, retention enqueue/cleanup, Loom quota recovery, export expiry, notification retry, restart recovery, and all four viewport classes. Safe logs must contain no credentials, addresses, prompts, prose payloads, transcript text, or export contents.

Phase F is complete only when F1-F3 and this milestone gate pass. Phase G remains blocked while any Phase F trust or recovery gate is red.

## Completion record

**Complete 2026-08-05.** F1-F3 pass without changing the Loom authority model or making an OpenAI call. Settings mutations are scope-checked, provider-free, auditable, and future-only where destructive; quota recovery preserves the exact Loom/manual path. Real exports are private deterministic ZIPs with selected user-owned Loom history and strict runtime exclusions. Email delivery uses content-safe identifiers/deep links, current preferences, live-session suppression, dedupe, and service-only lifecycle boundaries; the live provider adapter is configured but the milestone used deterministic delivery because no dedicated email-provider test destination was configured.

The final gate passed clean migration replay; all 40 database files / 1,149 pgTAP assertions; 105 script/runtime tests; 153 web tests; TypeScript; production build; repository verification; database lint with no Phase F warning; real ZIP download/inspection; deterministic sent/skipped notification delivery; and authenticated Settings/export proof at 360×800, 768×1024, 1280×800, and 1440×900. The Supabase advisor follow-up also pins ten foundational invoker helpers to an empty `search_path`; the remaining authenticated-definer notices describe the intentional allowlisted RPC boundary. Phase G may begin with G1 loading, errors, permissions, and accessibility.
