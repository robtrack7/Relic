---
id: OBJ-014
status: active
kind: component
authority: current
system: SYS-03
family: shared-projection-components
storybook: component
depends_on:
- OBJ-010
- BRD-006
- DS-OBJ
platforms:
- web
---

# OBJ-014 — Archived & Unavailable Object Treatment

Parent: [[OBJ-001 — World Object Representation Framework]]

## Purpose

Preserves understandable references when a World Object is archived, inaccessible, stale, or otherwise unable to render normally instead of allowing valid Board/historical references to silently disappear.

## Use

Conditions include:

- archived object;
- current scope cannot access the object;
- stale reference awaiting recovery;
- deleted/missing reference where a safe display label remains available.

Archived and unavailable are distinct states.

## Appearance & behaviour

Maintain only the minimum identity necessary to explain the reference where authorization permits it.

Examples:
- `The Ashen Crown · Archived`;
- `Unavailable object`;
- quiet disabled Board placement with explanatory interaction.

Never leak restricted content through fallback presentation.

Where recovery or unarchive is permitted, the relevant surface can expose that action.

## States & variants

- archived;
- unavailable by scope;
- stale/recovering;
- missing/deleted reference.

## Relationships

- [[OBJ-010 — Inline Object Reference]] — compact fallback.
- [[BRD-006 — Placement Host]] — Board occurrence fallback.
- Library/Focus — may expose archive/unarchive actions.

## Data / utility relationship

Uses only authorized identity/status data required to represent the reference safely.

## Handoff

Build **OBJ-014 — Archived & Unavailable Object Treatment** as the safe shared fallback for references that cannot render their normal World Object projection.
