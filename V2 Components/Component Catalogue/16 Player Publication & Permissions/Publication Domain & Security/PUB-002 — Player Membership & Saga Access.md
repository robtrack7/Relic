---
id: PUB-002
status: deferred
kind: domain
authority: current
system: SYS-16
family: publication-domain-security
storybook: none
---

# PUB-002 — Player Membership & Saga Access

Parent: [[SYS-16 — Player Publication & Permissions]]

## Purpose

Defines the coarse first-release membership boundary through which players gain access to published Saga material.

## Scope

Player membership attaches to **Saga**, not entire World.

Membership in one Saga must not automatically expose sibling Saga-specific material even when both Sagas share a World.

## Initial roles

Start with:
- **GM** — normal authorized GM access;
- **Player** — read-only access to the permission-filtered published Saga projection.

Do not introduce co-GM/editor/moderator role complexity in the first player implementation.

## Initial visibility target

The first publication target is all Players in the Saga.

Per-player and subgroup visibility are explicitly deferred.

## RLS ownership

Membership and role are authorization inputs to Supabase RLS.

Client UI is not the security boundary.

## Handoff

Section 19 should leave clean room for Saga membership/role policies, but implementation can remain absent until player features are prioritized.
