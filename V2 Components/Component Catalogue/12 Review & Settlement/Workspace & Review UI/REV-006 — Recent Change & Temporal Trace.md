---
id: REV-006
status: active
kind: component
authority: current
system: SYS-12
family: workspace-review-ui
storybook: component
depends_on:
- FOC-011
- REL-007
- DS-TRUST
platforms:
- web
---

# REV-006 — Recent Change & Temporal Trace

Parent: [[SYS-12 — Review & Settlement]]

## Purpose

Provides a subtle reusable cue that an object/field/relationship changed in a recent Session and lets the GM inspect the temporal change without cluttering the normal interface.

## Visual treatment

Use a restrained editorial temporal mark integrated with Relic's design language.

Avoid notification-dot language.

Examples:
- Card corner temporal glyph;
- Focus section mark;
- Relationship row change cue.

Hover/focus:
`Updated during Session 14 — The Winter Court`

## Interaction

Activating the trace can show:
- before value/state;
- after value/state;
- originating Session;
- Story Change;
- evidence/provenance;
- settlement method;
- correction/revert history.

Deep history presentation is ultimately owned by the Chronicle/Temporal system.

## Lifetime

The **recent emphasis** can fade/clear after acknowledgement or subsequent play.

The underlying temporal history remains permanently queryable.

Do not conflate UI emphasis lifetime with history retention.

## State distinctions

Trace can distinguish:
- pending;
- auto-settled;
- GM-settled;
- corrected;
- reverted.

Pending must never look identical to settled truth.

## Relationships

- [[SYS-14 — Chronicle & Temporal Model]]
- [[FOC-011 — Focus Temporal Context]]
- [[REL-007 — Relationship Temporal History]]
- [[REV-014 — Revert, Correct & Audit]]
- [[CHR-009 — Temporal Compare]]

## Handoff

Build **REV-006 — Recent Change & Temporal Trace** as a subtle cross-product marker backed by durable temporal history.
