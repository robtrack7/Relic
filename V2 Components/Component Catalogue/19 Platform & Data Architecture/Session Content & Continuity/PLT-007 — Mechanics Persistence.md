---
id: PLT-007
status: active
kind: platform
authority: current
system: SYS-19
family: session-content-continuity
storybook: none
depends_on:
- MEC-023
---

# PLT-007 — Mechanics Persistence

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Persists mechanics definitions, assignments and live values as separate layers so system rules and runtime resource state do not contaminate one another.

## Three layers

`Mechanics Template → Object/Instance Assignment → Session Mechanics State`

**Template** defines schema/layout/flow/resource concepts.

**Assignment** binds a World Object or Session Instance to a template plus allowed overrides.

**Session Mechanics State** holds mutable live values.

## Templates

First-party templates may be seeded/versioned code-controlled data.

Custom templates are user data with Workspace/World/Saga ownership as appropriate.

## Assignments

Changing a Saga default mechanics profile does not silently destroy explicit object-level assignments or overrides.

## Runtime

Live resources remain sparse Session runtime overlays and follow settlement policies from [[MEC-023 — Live Resource Definition]].

Routine resource changes must not become canonical object-definition edits.

## Versioning

Template schema/version changes require migration/compatibility behavior for persisted assignments. Do not mutate historical Session interpretation invisibly.

## Flexibility

Exact JSON/schema persistence can evolve with mechanics implementation. Preserve the three-layer separation and template version identity.

## Handoff

Prototype multiple first-party templates before freezing the persistence representation; D&D-only assumptions are prohibited.
