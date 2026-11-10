---
id: REL-007
status: active
kind: behavior
authority: current
system: SYS-08
family: domain
storybook: none
depends_on:
- REL-001
- CHR-001
- CHR-003
---

# REL-007 — Relationship Temporal History

Parent: [[SYS-08 — Relationships]]

## Purpose

Preserves how a Semantic Relationship begins, changes, ends, or recurs across story time without overwriting meaningful campaign history.

## Story-valid lifecycle

Example: Session 2 Mara is a member of Lantern Society; Session 9 membership ends; Session 14 Mara becomes opposed to Lantern Society. The earlier membership remains historically valid for its interval.

## End versus correction

**End Relationship** means it was true and stopped being true: preserve historical validity and record/infer a story position. **Correct / Remove Relationship** means the assertion should not be story-valid because it was mistaken, retconned, or bad imported/proposed data. These must be distinct product actions.

## Recurring relationships

A Relationship type may recur, such as join → leave → rejoin. The domain model must preserve multiple validity periods or equivalent history without forcing incoherent duplicate identities. Exact storage can be settled later; recurrence must remain representable.

## Historical rendering

Now shows active current Relationships. Historical Focus/Chronicle shows Relationships valid at the selected story position. Ended relationships can render natural contextual language such as `former member of` where appropriate.

## Editing historical state

Editing historical Relationship history requires explicit temporal intent. Ordinary Now editing must not silently rewrite past validity while the GM is looking at historical context.

## Relationships

- [[FOC-011 — Focus Temporal Context]]
- [[SYS-14 — Chronicle & Temporal Model]]
- [[REL-009 — Relationship Resolver]]
- [[REL-003 — Relationship Composer]]
- [[CHR-011 — Historical Editing, Correction & Retcon]]

## Session settlement

Relationship create/end/correct actions can link to [[REV-004 — Session Change Set & Story Changes]].

Temporal history should distinguish:
- pending;
- auto-settled;
- GM-settled;
- corrected/reverted.

A mistaken AI interpretation can remain in audit while no longer counting as story-valid relationship history.

## Handoff

Implement **REL-007 — Relationship Temporal History** as story-valid begin/end/recurrence/correction semantics shared by Focus, Chronicle, and Librarian.
