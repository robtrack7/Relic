---
id: REV-011
status: active
kind: component
authority: current
system: SYS-12
family: settlement-model-lifecycle
storybook: component
depends_on:
- STG-011
- MEC-023
- OBJ-FRAG-01
- DS-TRUST
platforms:
- web
---

# REV-011 — Session Material Resolution

Parent: [[REV-002 — Session Settlement Workspace]]

## Purpose

Handles loose Session-scoped material without forcing unnecessary decisions or cluttering Review.

## Session Instances

Default outcome is **remain Session-only**.

Only surface a promotion decision when meaningful, such as:
- GM marked it;
- it appeared repeatedly;
- captures/Events/Relationships depend on it;
- Librarian identifies likely persistent relevance.

Example:

**Alden Marr · Innkeeper**
`Appeared in 3 scenes · referenced in 4 captures`

Actions:
- Keep Session-only
- Keep in World

`Keep in World` invokes [[STG-011 — Resolve Session Instance]].

## Fragments

Fragments never have to resolve.

Review can suggest:
- create Event;
- create/update Thread;
- merge into Character/other object;
- remain Fragment.

`Remain Fragment` is always valid.

## Runtime mechanics

[[MEC-023 — Live Resource Definition]] settlement policy prevents mechanical noise:

**Ephemeral**
Never enters Review.

**Carry**
Moves into the next runtime context where appropriate without canon approval.

**Settle / Review**
Only these can surface as meaningful persistent consequences.

Never ask to approve routine HP/charge/recharge changes.

## Relationships

- [[STG-010 — Session Instance Model]]
- [[STG-011 — Resolve Session Instance]]
- [[OBJ-FRAG-01 — Resolve Fragment]]
- [[MEC-022 — Session Mechanics State]]

## Handoff

Build **REV-011 — Session Material Resolution** as sparse exception-based resolution for Session Instances, Fragments and settlement-relevant runtime state.
