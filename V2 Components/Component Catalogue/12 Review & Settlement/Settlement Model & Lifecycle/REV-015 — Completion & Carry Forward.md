---
id: REV-015
status: active
kind: behavior
authority: current
system: SYS-12
family: settlement-model-lifecycle
storybook: none
depends_on:
- PREP-008
- REV-006
- REV-009
---

# REV-015 — Completion & Carry Forward

Parent: [[REV-002 — Session Settlement Workspace]]

## Purpose

Closes the loop from post-session interpretation into the changed world and the next Prepare without requiring every pending exception to be resolved first.

## Completion

A Session Review can be considered complete/acknowledged when the GM has handled what they care about.

Pending exceptions may remain in General Review.

Review completion does not require clearing every proposal.

## Supervised completion

Summary-first Supervised flow:

1. Relic shows Session story + Settlement Canvas + Needs Attention.
2. GM corrects anything wrong.
3. GM explicitly chooses `Settle Session`.
4. Eligible reviewed Story Changes commit.
5. protected/unresolved exceptions remain pending.

## Semi-autonomous / autonomous completion

Routine eligible changes may already be settled.

The GM may only see:

`World updated from Session 14 · 1 item needs attention`

Opening Settlement focuses on the exception while preserving full inspect/revert access to everything else.

## Carry-forward

Next Prepare receives:
- settled world state;
- settled Session recap;
- accepted Prep implications;
- unresolved Threads/consequences;
- recent-change traces.

Pending Session interpretation is not silently presented as settled truth.

## Unsettled prior Session

If the GM starts Prepare before settling the prior Session in Supervised mode:

show a clear pending layer:

`Session 14 has not been settled yet.`

Carry-Forward may display **Pending from last Session** using proposal treatment.

The GM can continue preparing and open Settlement at any time.

Prepare/Librarian must distinguish pending interpretation from settled canon.

## Relationships

- [[PREP-008 — Carry-Forward Briefing]]
- [[REV-006 — Recent Change & Temporal Trace]]
- [[REV-009 — Settlement Policy & Review Style]]
- Chronicle & Temporal Model

## Publication boundary

Settlement never implies player publication.

Future [[PUB-009 — Settlement to Publication Handoff]] may offer an optional downstream publication step, but Review completion and Carry-Forward remain independent of player decisions.

## Handoff

Build **REV-015 — Completion & Carry Forward** so the campaign loop continues even when Review is deferred, while settled and pending truth remain unambiguous.
