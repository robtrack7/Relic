---
id: SET-006
status: active
kind: component
authority: current
system: SYS-17
family: saga-policy
storybook: component
depends_on:
- LBR-013
- LBR-009
- REV-009
platforms:
- web
---

# SET-006 — Librarian Authority & Review Policy

Parent: [[SET-001 — Settings Surface & Scope Navigation]]

## Purpose

Configures how much AI-authored semantic work may settle automatically and how much
post-session detail the GM prefers to inspect.

## AI authority

**Supervised — default**
AI-authored/inferred semantic changes remain proposed until explicit settlement.

**Semi-autonomous**
Eligible routine changes may settle automatically; exceptions/protected changes remain
conspicuous.

**Autonomous**
Broader eligible changes may settle automatically while preserving inspection,
correction and revert.

Protected operations remain gated in every mode.

## Review Style

Independent choice:

**Summary-first — default**
Prioritize Session story, Settlement Canvas and exceptions.

**Detailed**
Expose Story Changes, semantic diffs and per-change controls more prominently.

Authority and inspection preference are separate.

## Scope

These are Saga settings.

Different Sagas may legitimately use different authority/review policies.

## No proactivity setting

Do not add:
- Low/Medium/High Librarian Proactivity;
- autonomous background creativity;
- continuous campaign monitoring.

[[LBR-013 — Human-Initiated Agentic Work]] remains invariant regardless of autonomy mode.

## No per-tool matrix

Do not initially expose a giant matrix such as:
`AI may create Characters`, `AI may edit Threads`, `AI may move Cards`, etc.

Use the action classes, autonomy modes and protected-operation rules defined by the
Librarian system.

## Relationships

- [[LBR-009 — Intent, Authority & Autonomy Gate]]
- [[LBR-013 — Human-Initiated Agentic Work]]
- [[REV-009 — Settlement Policy & Review Style]]
- [[SET-013 — Settings Scope & Inheritance]]

## Handoff

Build **SET-006 — Librarian Authority & Review Policy** around understandable product
behavior rather than raw AI/tool configuration.
