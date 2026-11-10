---
id: CHR-013
status: active
kind: behavior
authority: current
system: SYS-14
family: librarian-bridge
storybook: none
depends_on:
- CHR-003
- LBR-013
- LBR-003
---

# CHR-013 — Chronicle Librarian Context Bridge

Parent: [[CHR-004 — Chronicle Workspace State]]

## Purpose

Supplies Chronicle/as-of context to the core Librarian operating layer without triggering AI simply because the GM moves through history.

## Context supplied

Where relevant/authorized:
- active Story Position;
- selected Event/Story Change;
- selected historical World Object projection;
- as-of state;
- compare positions;
- truth-layer mode;
- originating Session/evidence;
- current Chronicle selection.

## Natural capabilities

On explicit request the GM can ask:
- `What did Mara believe about Seraphine here?`
- `When did they become enemies?`
- `What changed between Session 8 and 14?`
- `Who controlled Brassgate before the siege?`
- `Why does Mara know about the Iron Deed here?`
- `This is wrong—Mara left one Session earlier.`

## Resolver rule

Librarian temporal answers use [[CHR-003 — Temporal Resolver & Now Projection]] / temporal evidence rather than searching stale prose and guessing historical state.

## Human-initiation boundary

No model call merely because the GM:
- scrolls Chronicle;
- changes Story Position;
- opens historical Focus;
- selects an Event;
- performs deterministic state comparison.

AI begins only under [[LBR-013 — Human-Initiated Agentic Work]].

## Implementation latitude

This bridge may simply extend the shared Librarian context snapshot rather than exist as a standalone runtime module. Preserve the documented context fields and invocation boundary, not file-to-class symmetry.

## Relationships

- [[LBR-003 — Context Scope & Inspector]]
- [[LBR-007 — Retrieval & Temporal Reasoning]]
- [[LBR-013 — Human-Initiated Agentic Work]]
- [[CHR-003 — Temporal Resolver & Now Projection]]

## Handoff

Implement **CHR-013** as Chronicle's contribution to the shared Librarian context contract with zero passive model invocation.
