---
id: REV-004
status: active
kind: domain
authority: current
system: SYS-12
family: workspace-review-ui
storybook: none
depends_on:
- REV-001
- REV-014
- PLT-004
---

# REV-004 — Session Change Set & Story Changes

Parent: [[SYS-12 — Review & Settlement]]

## Purpose

Defines the durable grouping that ties a Session interpretation to its atomic world mutations, evidence, settlement state, corrections, and temporal history.

## Hierarchy

`Session Change Set → Story Change → Atomic Mutation`

**Session Change Set**
One interpretation/settlement grouping for a Session processing run.

**Story Change**
A coherent narrative occurrence/consequence understandable to a human.

**Atomic Mutation**
One precise semantic mutation needed to realize the Story Change.

## Story-first grouping

Primary grouping should answer **what happened?**, not only **which database row changed?**

Example:

**Mara swears to the Crown**
- create Event;
- add/end Relationship;
- update Mara state;
- advance Thread.

Grouping metadata is organizational, not canon.

## Settlement states

At minimum support:
- pending;
- auto-settled;
- GM-settled;
- needs attention;
- rejected;
- corrected/reverted;
- superseded.

Individual atomic mutations can differ in status within a larger Change Set.

## Evidence and provenance

Each Story Change / mutation can reference:
- transcript evidence;
- Marked Moment;
- Fragment;
- closing note;
- Source;
- current settled state;
- Librarian/manual origin.

Store enough before/after context for audit, explanation and revert.

## Atomicity

A coherent Story Change may settle as one transaction where feasible.

If validation/conflict prevents one required mutation, do not silently half-settle the rest.

Session-level settlement may commit multiple reviewed Story Changes while excluding Needs Attention/protected items.

## Relationships

- [[REV-001 — Post-Session Processing Pipeline]]
- [[REV-014 — Revert, Correct & Audit]]
- future temporal model
- future backend/transaction layer

## Platform transaction owner

The generalized persistence/commit contract is implemented by [[PLT-004 — Temporal State & Change-Set Transaction Engine]]. The older `drafts`-centric schema is not the V2 system of record for proposals.

## Handoff

Implement **REV-004 — Session Change Set & Story Changes** as the authoritative auditable grouping beneath effortless Session-level settlement.
