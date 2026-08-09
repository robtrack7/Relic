---
status: active
authority: primary
scope: security
read_after:
  - "[[00 - Start Here]]"
last_audited: 2026-08-08
---

# Security Findings Register

Do not put secrets, keys, tokens, private environment values, prompts, provider payloads, audio, transcripts, images, signed URLs, or production identifiers in this register.

## Live release blockers

| ID | Severity | Finding | Required closure | Evidence |
|---|---|---|---|---|
| SEC-G-001 | medium | Hosted Supabase Auth leaked-password protection is disabled. | Enable it during hosted Phase G setup and verify sign-up/sign-in recovery. | Hosted advisor read and authenticated recovery check. |

## Accepted risks requiring production review

| ID | Severity | Risk | Guardrail | Required follow-up |
|---|---|---|---|---|
| SEC-E2-005 | high | The isolated staging provider key temporarily has broad permissions because restricted transcription failed. | Capped staging spend; no credential/payload logging; server-only storage. | Rotate/restrict before normal staging or production use. |
| SEC-E2-006 | medium | Some internal worker tables have RLS disabled. | Browser roles have no schema/table/function access; service-only worker path is tested. | Add defense-in-depth RLS only with worker-role regression coverage. |
| SEC-FOUNDATION-011 | medium | Allowlisted browser-callable `security definer` RPCs remain in `public`. | Direct browser table DML/anonymous execution denied; fixed search paths; allowlisted execution only. | Revisit placement before production hardening or multi-GM work. |

## Fixed invariants to preserve

- Direct browser mutation of workspace usage, drafts, public tables, and usage-event update/delete is denied. Scoped RPCs validate the hierarchy and expected versions.
- Absent active-Saga scope fails closed; sibling-Saga relationship, pin, source, and target writes are denied.
- Hosted provider configuration is explicit and fail-closed. Test mode cannot inherit live provider endpoints/credentials; unexpected aliases/models fail closed.
- Telemetry uses fixed safe fields. Raw query, prompt, response, provider, import, transcript, audio, image, vector, cookie, JWT, signed URL, and credential content is excluded.
- Provider retries, schedules, metering, restart, dead-letter/replay, and zero-canon-write boundaries have deterministic and hosted evidence. Exact replay cannot duplicate a charge/effect.
- Browser-provided source IDs, model/alias choices, history, quota decisions, and mutation targets are untrusted; server-generated scope/evidence/action validation is mandatory.

## Ongoing verification

For relevant work run `supabase/tests/foundation.sql`, `supabase/tests/access_control.sql`, hosted-observability/provider safety checks, Edge/runtime source tests, and the affected route/action tests. Perform a clean migration replay and permission-denial regression before closing a tenant/security change.
