---
status: active
authority: primary
scope: engineering
read_after:
  - "[[00 - Start Here]]"
last_audited: 2026-08-08
---

# Engineering Contract

Executable sources—not this note—define exact columns, RPC signatures, migrations, HTTP contracts, routes, components, environment names, and test commands. Use `supabase/migrations`, `supabase/tests`, `services`, `apps`, `packages`, `scripts`, and `docs/operations.md` as the implementation record.

## Data and tenancy

Account → Workspace → World → Saga → Session is a mandatory authorization hierarchy. Every read, write, Storage path, job, source, draft, attachment, export, and provider task is owned and revalidated at the correct scope. Missing, forged, stale, sibling, and cross-tenant scope fail closed.

Browser roles do not receive broad public-table DML. Server actions and browser-callable RPCs accept only allowlisted operations, validate hierarchy and expected versions server-side, and use safe fixed search paths. Internal worker access remains service-only and least-privilege. Storage is private and hierarchy-prefixed; signed URLs are short-lived and never provider context.

Canon records are World- or Saga-scoped. Sources, draft sources, provenance, audit, relationships, notes, transcript/manual evidence, audio chunks, session markers, pipeline runs, usage, notifications, exports, and action receipts must preserve ownership and version identity. Archive is the normal destructive state. Hard delete requires an archived, unreferenced record, exact-name/two-step deterministic confirmation, and an audited writer; Saga deletion includes real Storage cleanup before database finalization.

## AI, retrieval, and authority

The Loom provider receives a bounded prompt/context and a server-owned manifest, never SQL, credentials, arbitrary RPC names, raw private objects, or mutation authority. A server-owned planner uses the cheapest sufficient read path: deterministic navigation, exact, structured, lexical, then scoped hybrid retrieval. Exact/structured evidence without an authorized identity never reaches a provider. Retrieval is scope-filtered, excludes pending/rejected material and raw imports by default, uses bounded graph expansion, and keeps frozen evidence snapshots for provider work.

Provider output is schema-validated and treated as untrusted. The browser submits only a reviewed action ID/version/decision/idempotency key. The server rechecks target, evidence, scope, cost, authority, intent version, and action manifest before creating a receipt or calling an existing writer. Unknown, stale, cross-scope, prose-only, duplicate, or unconfirmed actions have zero effect. A confirmed proposal can still create only a pending draft; later Approval Queue approval creates canon, audit, and eligible embedding work.

Quota preflight and metering apply before provider work; exact deterministic reads and confirmed workflow navigation do not add hidden model work. Retries bind the same task/evidence/action identity and cannot duplicate charges or writes. Telemetry is fixed-field and payload-free: no prompts, responses, search queries, imported text, transcripts, audio, images, vectors, secrets, JWTs, cookies, signed URLs, or private content.

## Runtime and recovery

Jobs have idempotent leases, retry/dead-letter boundaries, safe status projections, and service-only execution. Provider configuration is explicit and fail-closed; deterministic local/test mode must not inherit live endpoints or credentials. Hosted workers use short-lived scoped identity and revalidate in Postgres.

Stage web recovery persists bounded audio chunks and non-audio intents locally before replay. Replay is FIFO with stable GM-scoped receipts; lifecycle/consent conflicts surface rather than overwrite. Prep autosave is recoverable and rejects stale writes. Transcription, synthesis, export, retention, cleanup, and notifications expose safe user states without revealing internals.

## Verification baseline

For any change, run the narrow unit/component/pgTAP/runtime checks, then the relevant integrated route or worker flow. Verify a negative tenancy/permission case, a retry/recovery case where applicable, clean migration replay for database changes, type check/build for web changes, and a private-content/secret review. See [[40 - Delivery Status]] for release gates and [[45 - Security Findings Register]] for live risk.
