---
id: REV-010
status: active
kind: behavior
authority: current
system: SYS-12
family: settlement-model-lifecycle
storybook: none
depends_on:
- REV-008
- REV-009
- REV-014
---

# REV-010 — Exceptions, Conflicts & Protected Changes

Parent: [[SYS-12 — Review & Settlement]]

## Purpose

Concentrates GM attention on the small set of changes where automatic interpretation or settlement is unsafe, ambiguous, stale, conflicting, or structurally destructive.

## Needs Attention reasons

Examples:
- ambiguous identity;
- conflicting current canon;
- weak/broken evidence;
- stale proposal;
- historical retcon;
- destructive merge;
- delete/archive with consequences;
- scope change;
- unsupported inference;
- invalid temporal position.

## Protected changes

Even higher autonomy modes should keep structurally risky actions conspicuous.

Examples:
- identity merge;
- destructive deletion;
- historical retcon;
- World/Saga scope change;
- destructive replacement;
- ambiguous identity resolution.

Routine state updates and relationship/thread/event changes can follow normal settlement policy.

## Optimistic conflict

If target state changed after interpretation:

show:
- state at interpretation time;
- current state;
- proposed state.

Do not blindly commit.

Actions:
- refresh against current;
- edit;
- reject;
- regenerate Story Change.

## Stale review

Pending Review can remain indefinitely.

After meaningful age/current-world drift, show that it may no longer reflect current state.

Nothing silently disappears.

## Evidence quality

Use `Needs Review` / `Weak evidence` language rather than numeric AI confidence.

Evidence quality is about support, not the model's internal self-confidence.

## Relationships

- [[REV-008 — Evidence & Transcript Inspector]]
- [[REV-009 — Settlement Policy & Review Style]]
- [[REV-014 — Revert, Correct & Audit]]

## Handoff

Build **REV-010 — Exceptions, Conflicts & Protected Changes** as the review-by-exception layer that keeps effortless settlement trustworthy.
