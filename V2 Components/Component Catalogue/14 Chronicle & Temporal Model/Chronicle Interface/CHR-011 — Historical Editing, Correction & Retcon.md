---
id: CHR-011
status: active
kind: behavior
authority: current
system: SYS-14
family: chronicle-interface
storybook: pattern
depends_on:
- LBR-009
- REV-014
- REL-007
platforms:
- web
---

# CHR-011 — Historical Editing, Correction & Retcon

Parent: [[SYS-14 — Chronicle & Temporal Model]]

## Purpose

Prevents ordinary editing from accidentally rewriting history and clearly distinguishes ending a truth, correcting bad history, and deliberately retconning the fiction.

## Historical default

Historical/as-of surfaces are read-first. Ordinary inline editing must not silently mutate Now or historical validity.

## End

**End** means the fact/Relationship was true and stops being true at a later Story Position. Earlier history remains valid.

## Correct

**Correct** means Relic's stored interpretation was wrong. The bad assertion loses story validity while correction/audit history remains.

## Retcon

**Retcon** means the GM intentionally changes fictional history/effective Story Position. This can invalidate downstream assumptions and is a protected action.

## Impact review

Before meaningful retcon commit, identify potentially affected:
- later Events;
- Relationships;
- Knowledge;
- Threads;
- current object state;
- Session Change Sets/dependencies.

The Librarian may help construct a coherent correction plan when explicitly asked.

## Authority

Retcon and destructive historical corrections route through protected-action policy in [[LBR-009 — Intent, Authority & Autonomy Gate]].

## Implementation latitude

Impact analysis can begin conservatively and become more sophisticated as dependency modeling improves. The invariant is no blind historical rewrite: explicitly identify effective Story Position and surface known downstream risk.

## Relationships

- [[REV-014 — Revert, Correct & Audit]]
- [[REL-007 — Relationship Temporal History]]
- [[LBR-009 — Intent, Authority & Autonomy Gate]]

## Handoff

Build **CHR-011** as explicit temporal edit intents with protected retcon handling; do not hide history-rewrite semantics behind ordinary Save.
