---
id: OBJ-016
status: deferred
kind: component
authority: current
system: SYS-03
family: expanded-cards
storybook: component
depends_on:
- OBJ-017
- BRD-006
- DS-OBJ
platforms:
- web
---

# OBJ-016 — Two-Sided Expanded Card Host

Parent: [[OBJ-001 — World Object Representation Framework]]

> **Current notice — superseded presentation.** The user-facing two-sided Expanded Card is deferred. Expanded Cards are single bounded surfaces; mechanics and deeper material belong in Focus and Entity Builder. This stable contract remains for historical traceability.

## Purpose (historical)

Hosts separately coded front and back representations inside one Expanded Card Placement. It allows an alternate utility face without combining incompatible information hierarchies into one overloaded card.

## Context & placement

Used only by families that define a meaningful second face. Character uses a narrative/worldbuilding front and abbreviated mechanics back; other families may define different backs or remain one-sided.

## Anatomy

- front-face component;
- back-face component;
- current-face presentation state;
- [[OBJ-017 — Expanded Card Flip Control]];
- [[OBJ-017 — Expanded Card Flip Control]].

Only the active face is interactive.

## Appearance & behaviour

Both faces share persistent identity, Placement, dimensions, and selection. Visible face is Board-local presentation state, not canon, so separate Placements may remain on different faces.

## Relationships

- [[BRD-006 — Placement Host]] — spatial geometry.
- [[OBJ-017 — Expanded Card Flip Control]] — switches face.
- [[OBJ-017 — Expanded Card Flip Control]] — motion.
- family-specific front/back components — content.

## Handoff

This deferred contract is retained for historical traceability and is not a current implementation target.
