---
id: OBJ-002
status: active
kind: behavior
authority: current
system: SYS-03
family: representation-framework
storybook: pattern
depends_on:
- OBJ-001
- DSK-026
- DSK-021
- DS-OBJ
platforms:
- web
---

# OBJ-002 — World Object Projection Resolver

Parent: [[OBJ-001 — World Object Representation Framework]]

## Purpose

Selects which separately coded representation component should render for a World Object in the current product context.

It prevents Desk, Stage, Search, Focus, Chronicle, Prepare, and Library from each inventing their own projection-selection rules.

## Inputs / context

The resolver may consider:

- World Object family/type;
- active surface;
- requested disclosure level;
- semantic zoom level;
- Placement-local presentation choice;
- current story position or Now;
- relevant Session context;
- explicit GM action;
- availability of a specialized family projection.

The resolver should use a small deterministic input contract rather than infer presentation from arbitrary component state.

## Expected results

Examples:

- `Character + Desk + far → simplified Small Character Card`
- `Character + Desk + normal → Small Character Card`
- `Character + Desk + expanded → Expanded Character Card`
- `Character + Focus → right-side Character Focus`
- `Character + Builder → central Entity Builder bound to the same identity`
- `Character + Stage Canvas + normal → Character Card`
- `Character + Stage Entity Rail → Character Stage Bubble`
- `Thread + Chronicle → Thread Chronicle Projection`

If a family does not define a specialized contextual projection, use the fallback declared by that family rather than generating an improvised generic representation.

## Important behaviour

Projection selection is deterministic and family-declared.

Each family should expose:
- supported representation roles;
- fallback representation for unsupported roles;
- semantic-zoom boundaries where applicable;
- explicit disclosure relationships.

Semantic zoom may simplify the Small Card's image/name treatment at far scale, but never promotes it into Expanded Card or Focus. Focus and Builder are explicit actions; neither is inferred from zoom, proximity, or Placement geometry.

Changing projection never changes persistent identity or story state.

## Relationships

- [[OBJ-003 — Representation Transition Coordinator]] — handles visual handoff after projection changes.
- [[DSK-026 — Semantic Zoom]] — supplies camera-driven far/normal context.
- [[DSK-021 — Placement Resize & Disclosure]] — supplies intentional Desk disclosure.
- World Object family routers — declare supported components and fallbacks.

## Data / utility relationship

Consumes identity/type plus presentation context. It does not own data loading, domain mutation, or the internals of the resolved component.

## Handoff

Implement **OBJ-002 — World Object Projection Resolver** as the deterministic mapping from World Object context to an existing separately coded representation component.
