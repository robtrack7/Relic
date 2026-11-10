---
id: PLT-002
status: active
kind: platform
authority: current
system: SYS-19
family: core-domain-security
storybook: none
---

# PLT-002 — Tenancy Authentication RLS & Security

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Defines the structural authorization boundary for all Relic user data and future player projections.

## Hierarchy

Canonical ownership hierarchy:

`Account → Workspace → World → Saga → Session`

World stores shared setting context. Saga stores one playable storyline. Session stores one play lifecycle.

## Scope columns

Domain rows should carry enough denormalized scope identifiers to make authorization, indexing and debugging straightforward.

Database constraints/triggers must ensure scope consistency—for example, a `saga_id` cannot be paired with a different `world_id` merely because a client supplied both.

## RLS invariant

Enable RLS on every user-content table and every derived table/index that contains user-derived content.

Authorization must also apply to:
- Storage object paths/metadata;
- retrieval documents/embeddings;
- views/RPCs;
- future publication/player projections.

Client-side hiding is not a security boundary.

## Service-role boundary

The service role is never exposed to clients.

Background/async processing must preserve the initiating user's effective authorization or use a narrowly-scoped audited server capability. Unrestricted service-role reads over user content are not the default execution model.

## Saga / World retrieval boundary

Default reasoning/search scope is active Saga + relevant World-scoped canon.

Sibling Saga-specific state is excluded unless an explicit future cross-Saga operation authorizes it.

## Future player compatibility

Section 16 remains deferred, but the security architecture must permit a future Player role to see only published/authorized Saga projections.

Never design retrieval around “retrieve GM data then tell the model not to reveal it.”

## Acceptance tests

At minimum test:
- User A cannot read/write User B;
- sibling Saga-specific content does not leak;
- World-scoped content appears where intended;
- Storage follows the same scope model;
- retrieval/indexes cannot bypass RLS;
- GM-private fixtures remain unavailable to future Player-role fixtures.

## Flexibility

Exact policy helpers, claims and denormalization details may change. The access outcomes and test matrix are hard invariants.

## Handoff

Treat failing RLS/security tests as merge blockers for migrations that touch user data.
