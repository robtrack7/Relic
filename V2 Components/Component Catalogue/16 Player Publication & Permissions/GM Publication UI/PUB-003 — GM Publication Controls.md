---
id: PUB-003
status: deferred
kind: component
authority: current
system: SYS-16
family: gm-publication-ui
storybook: component
platforms:
- web
---

# PUB-003 — GM Publication Controls

Parent: [[SYS-16 — Player Publication & Permissions]]

## Purpose

Provides simple GM-side controls for choosing which settled material becomes visible to players.

## Placement

Publication should appear as a natural object/session action rather than a separate administration product.

Possible entry points:
- Focus object actions;
- Session recap actions;
- Settlement publication handoff;
- Chronicle/Event actions where appropriate.

## Family presets

Prefer family-defined sensible presets over field-by-field ACL editing.

Character examples could include:
- **Public Profile** — identity, portrait, public summary, selected public Relationships;
- **Player Sheet** — public profile plus selected mechanics/holdings where appropriate;
- **Custom** — future/expanded control.

Exact publishable content is owned by each family projection contract.

## Default

New settled content remains GM-only unless the GM explicitly publishes it.

Do not assume `settled = safe for players`.

## Unpublish

The GM can revoke publication.

Unpublish removes future player access but does not delete the World Object or erase publication audit history.

## Handoff

Implement only after the Player Wiki is prioritized. Keep the control lightweight enough that publishing does not become a second approval queue.
