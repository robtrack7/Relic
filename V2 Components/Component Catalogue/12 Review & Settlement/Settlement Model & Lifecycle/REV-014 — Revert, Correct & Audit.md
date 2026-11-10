---
id: REV-014
status: active
kind: behavior
authority: current
system: SYS-12
family: settlement-model-lifecycle
storybook: none
depends_on:
- REV-004
- REV-006
- CHR-010
---

# REV-014 — Revert, Correct & Audit

Parent: [[SYS-12 — Review & Settlement]]

## Purpose

Makes autonomy trustworthy by ensuring every Session settlement and individual world change remains inspectable, correctable, and reversibly represented in temporal/audit history.

## Session-level revert

A Session Change Set can expose:

`Revert Session Update`

This does not erase audit history.

It creates a correction/reversion record that restores story-valid state as if the mistaken settlement had not been true.

## Individual correction

The GM can also correct/revert one mutation without undoing the entire Session.

Dependent Story Changes should surface downstream implications before commit.

## Temporal semantics

Distinguish:
- settled story truth;
- pending interpretation;
- corrected/reverted interpretation;
- audit history.

A mistaken AI settlement can remain in audit history while no longer counting as story-valid temporal truth.

## Audit data

Preserve:
- originating Session;
- processing run;
- evidence;
- before state;
- proposed state;
- final settled state;
- settlement actor/policy;
- GM edits;
- correction/revert chain;
- timestamps.

## Protected revert

Reverting changes that have since become dependencies may require an explicit correction plan rather than blindly rewinding current state.

Section 14/19 should define temporal and transaction semantics in detail.

## Relationships

- [[REV-004 — Session Change Set & Story Changes]]
- [[REV-006 — Recent Change & Temporal Trace]]
- Chronicle & Temporal Model
- future backend transaction/audit layer

## Temporal authority

Story-valid correction/revert semantics are resolved through [[CHR-010 — Temporal Truth Layers]] and [[CHR-011 — Historical Editing, Correction & Retcon]]. Audit records remain even when an interpretation stops being story-valid.

## Handoff

Build **REV-014 — Revert, Correct & Audit** as the trust foundation for semi-autonomous/autonomous world settlement.
