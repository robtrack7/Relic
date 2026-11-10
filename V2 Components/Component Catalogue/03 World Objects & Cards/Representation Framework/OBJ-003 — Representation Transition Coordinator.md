---
id: OBJ-003
status: active
kind: behavior
authority: current
system: SYS-03
family: representation-framework
storybook: pattern
depends_on:
- OBJ-002
- DSK-027
- DS-FND-MOTION
- DS-OBJ
platforms:
- web
---

# OBJ-003 — Representation Transition Coordinator

Parent: [[OBJ-001 — World Object Representation Framework]]

## Purpose

Coordinates visual continuity when the same World Object moves between separately coded representations.

Progressive disclosure should feel like the same fictional thing becoming more or less available, not like unrelated components replacing one another.

## Interaction

Supports transitions such as:

- simplified Small Card ↔ Small Card;
- Small Card ↔ Expanded Card;
- Small/Expanded Card ↔ right-side Focus;
- Focus ↔ central Entity Builder;
- Focus/Builder → originating Card, Library item, or Placement;
- contextual projection changes where a family explicitly designs continuity.

The coordinator receives the stable object identity, source representation, destination representation, source/destination bounds, and available shared visual elements.

## Shared transition concerns

Owns common rules for:

- stable identity handoff;
- image/name continuity;
- transform origin;
- interrupted transitions;
- reverse transitions;
- maintaining selection/context;
- reduced-motion fallback;
- preventing animation from blocking the underlying state change.

Family-specific transition behaviors can specialize exact timing or choreography where needed.

## Boundaries

This is not one animation preset imposed on every family.

When source and destination have little visual overlap, use a restrained transition while still preserving spatial/contextual continuity.

## Relationships

- [[OBJ-002 — World Object Projection Resolver]] — determines the destination representation.
- [[DSK-021 — Placement Resize & Disclosure]] — can trigger Desk transitions.
- [[DSK-027 — Focus Invocation]] — supplies source Placement and viewport context.
- family-specific disclosure-transition tickets — optional specialization.

## Handoff

Implement **OBJ-003 — Representation Transition Coordinator** as shared identity-preserving transition infrastructure between separately coded projections.


## Character calibration

Character simplified Small Card → Small Card → Expanded Card → right-side Focus → Entity Builder uses this same transition contract. The simplified far rendering is semantic zoom of Small Card, not a separate user-facing disclosure level.
