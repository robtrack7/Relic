# Hosted operations

Use this for an explicitly authorized staging or release operation. Product behavior and release status live in the compact vault contracts; this file contains only operational guardrails.

## Before an operation

- Confirm the exact environment, account, cost limit, model alias/resolved model, fixture set, and stop condition. Never assume that a prior staging exception remains authorized.
- Use synthetic data for smoke tests unless the user explicitly authorizes otherwise. Production changes require separate authorization.
- Keep provider, service, internal-worker, and signing credentials in approved server-side secret stores. Do not place values in the repository, browser code, shell arguments, fixtures, screenshots, chat, or logs.
- Run the relevant preflight and use the committed helper rather than ad-hoc credential handling.

## During an operation

- Require explicit provider mode, bounded timeout/output, quota or monetary cap, and payload-free telemetry.
- Preserve tenant isolation, immutable evidence/provenance, retry/idempotency controls, and the rule that AI never writes canon without GM approval.
- Stop on an environment mismatch, unexpected provider call, unsafe log output, exceeded cap, or unresolved access-control result.

## Closeout

- Restore any temporary scheduler, gateway, or configuration changes.
- Remove synthetic data and confirm queues, alerts, and retry/dead-letter state are clean.
- Record only names, safe outcome categories, counts, and verification results. Rotate or revoke any accidentally exposed credential before continuing.
