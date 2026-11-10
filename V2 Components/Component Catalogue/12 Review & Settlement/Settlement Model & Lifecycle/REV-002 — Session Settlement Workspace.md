---
id: REV-002
status: active
kind: surface
authority: current
system: SYS-12
family: settlement-model-lifecycle
storybook: scene
depends_on:
- REV-005
- REV-007
- REV-008
- DS-WFL
platforms:
- web
---

# REV-002 — Session Settlement Workspace

Parent: [[SYS-12 — Review & Settlement]]

## Purpose

Provides the primary post-session trust surface where the GM reviews Relic's understanding of the Session, corrects mistakes, inspects evidence, and settles or acknowledges the resulting world changes.

## Core product model

Primary wide layout:

`Session Story Carriage | Settlement Canvas / Detail Surface | Librarian`

The GM reviews **what Relic thinks happened**, not a raw queue of database mutations.

## Entry points

Open from:
- Session marked Review Ready;
- post-processing notification;
- Sessions Surface;
- next Prepare when prior Session remains unsettled;
- Librarian;
- General Review for non-session proposals.

Review does not require a permanent top-level app destination.

## Central modes

The centre can become:
- [[REV-005 — Settlement Canvas View]];
- [[REV-007 — Change Detail & Inline Edit]];
- [[REV-008 — Evidence & Transcript Inspector]].

Choose the representation that best supports the decision.

Do not force every change through Canvas or every change through a diff.

## Summary-first default

Default Review Style should be Summary-first.

The GM first sees:
- what happened;
- what changed;
- what needs attention;
- what may matter next Session.

Detailed field-level proposals remain one interaction away.

## Relationships

- [[REV-003 — Session Story Carriage]]
- [[REV-005 — Settlement Canvas View]]
- [[REV-009 — Settlement Policy & Review Style]]
- [[REV-013 — Settlement Librarian Context Bridge]]

## Handoff

Build **REV-002 — Session Settlement Workspace** as the narrative/spatial settlement state rather than an administrative approval-queue page.
