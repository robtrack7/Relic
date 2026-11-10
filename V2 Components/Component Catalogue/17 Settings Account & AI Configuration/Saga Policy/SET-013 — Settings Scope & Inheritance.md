---
id: SET-013
status: active
kind: behavior
authority: current
system: SYS-17
family: saga-policy
storybook: none
depends_on:
- SET-005
- SET-006
- SET-009
---

# SET-013 — Settings Scope & Inheritance

Parent: [[SYS-17 — Settings Account & AI Configuration]]

## Purpose

Defines which configuration belongs to the user, account/workspace, or Saga and how
defaults become Saga-owned settings without surprising retroactive changes.

## Personal scope

Examples:
- appearance;
- notification preferences;
- personal identity.

Applies across Relic for the user.

## Account / Workspace scope

Examples:
- plan;
- usage;
- storage;
- managed/BYOK provider credentials.

Workspace can remain mostly invisible in the ordinary single-GM UI while still being the
ownership/billing boundary.

## Saga scope

Examples:
- mechanics profile;
- autonomy;
- Review Style;
- recording retention;
- structural World association.

Different Sagas may use different values.

## Defaults for new Sagas

A personal/account default can seed a new Saga:

`default → new Saga copies value → Saga owns value`

Later changes to the default do not silently mutate existing Sagas.

## Migration / absence

Existing Sagas missing a newly introduced setting should resolve through an explicit
product default/migration policy.

Do not depend indefinitely on ambiguous inheritance chains.

## Relationships

- [[SET-005 — Current Saga General Settings]]
- [[SET-006 — Librarian Authority & Review Policy]]
- [[SET-009 — Recording Retention & Privacy]]

## Handoff

Implement **SET-013 — Settings Scope & Inheritance** as a stable data/configuration
contract even if the final persistence layout changes in Section 19.
