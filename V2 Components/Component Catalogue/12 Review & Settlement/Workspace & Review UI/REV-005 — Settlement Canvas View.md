---
id: REV-005
status: active
kind: surface
authority: current
system: SYS-12
family: workspace-review-ui
storybook: scene
depends_on:
- DSK-029
- REV-006
- REV-007
- DS-TRUST
platforms:
- web
---

# REV-005 — Settlement Canvas View

Parent: [[REV-002 — Session Settlement Workspace]]

## Purpose

Creates an ephemeral visual projection of the affected world so the GM can quickly assess whether Relic interpreted the Session correctly.

## Core rule

Settlement Canvas is a **view**, not a Board and not another persistence model.

Relic assembles affected persistent World Objects, proposed new identities, relevant Session Instances, Threads, Events and Relationships into a temporary readable composition.

## Visual language

Use ordinary family Cards wherever possible.

Proposed/unsettled material uses the shared Proposal Layer language:
- dashed/ghosted edges;
- proposed cards;
- temporal/change markers;
- visible distinction from settled world state.

Settled/auto-settled changes can use the recent-change trace rather than proposal styling.

## Typical use

A Session-level glance should make misinterpretations obvious.

Examples:
- Mara shown as newly allied with Crown;
- Seraphine linked to ledger;
- courier Event at Brassgate;
- Thread marked resolved;
- newly proposed Character.

The GM can immediately say `No, Mara did not join the Crown` and correct the interpretation through Librarian or detail editing.

## Interaction

- click/select → inspect shallow change context;
- double-click/deep-open → ordinary Focus/detail where appropriate;
- select Relationship → relationship change detail/evidence;
- select proposed identity → proposed object detail;
- select changed marker → before/after temporal trace.

Manipulating proposal-layer semantics edits the proposal interpretation, not settled canon.

## When not to use

A trivial text correction or isolated metadata change can stay in detail mode.

Do not force Canvas presentation when it adds no understanding.

## Relationships

- [[DSK-029 — Canvas Proposal Layer]]
- [[REV-006 — Recent Change & Temporal Trace]]
- [[REV-007 — Change Detail & Inline Edit]]
- [[REV-013 — Settlement Librarian Context Bridge]]

## Handoff

Build **REV-005 — Settlement Canvas View** as the ephemeral story-to-world preview that lets the GM recognize errors before or after settlement.
