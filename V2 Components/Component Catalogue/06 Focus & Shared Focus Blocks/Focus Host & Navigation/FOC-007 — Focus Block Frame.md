---
id: FOC-007
status: active
kind: component
authority: current
system: SYS-06
family: focus-host-navigation
storybook: component
depends_on:
- FOC-009
- FOC-010
- DS-FOC
platforms:
- web
---

# FOC-007 — Focus Block Frame

Parent: [[FOC-001 — Focus Host]]

## Purpose

Provides shared structural framing for Focus Blocks without visually turning every section into a dashboard card.

## Anatomy

May provide:
- section title;
- optional helper/caption;
- optional block-level actions;
- deep-link anchor;
- editing state boundary;
- empty/add-content affordance;
- loading/error state.

Not all elements appear for every block.

## Appearance & behaviour

Prefer whitespace, typography, hairline rules, and editorial rhythm.

The frame may be visually almost invisible.

Avoid repeated rounded rectangles around every section unless a specific block such as Mechanics genuinely benefits from a bounded surface.

## States & variants

- normal;
- editing;
- loading;
- empty;
- error/retry;
- historical/as-of;
- action menu open.

## Relationships

- [[FOC-009 — Focus Empty & Add Content Pattern]] — sparse-state content.
- [[FOC-010 — Focus Anchor & Deep Link]] — section identity.
- all FOC-BLK components — common structural wrapper where useful.

## Handoff

Build **FOC-007 — Focus Block Frame** as the light shared structural wrapper for reusable Focus sections.
