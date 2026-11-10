---
id: DSK-027
status: active
kind: behavior
authority: current
system: SYS-02
family: selection-placement
storybook: pattern
depends_on:
- FOC-001
- DSK-021
- BRD-005
- DS-CAN
platforms:
- web
---

# DSK-027 — Focus Invocation

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Defines how a selected World Object deepens from spatial Board representation into its full Focus experience while preserving the user's place.

## Interaction

Focus can be invoked through:
- explicit Focus action in Selection Toolbar/context menu;
- keyboard action (`F` on the Desk);
- double-click or keyboard activation (`Enter`) on a selected card.

`F`/double-click/`Enter` opens the right-side Focus surface. `F2` remains the contextual rename action; substantive writing belongs in Focus or Entity Builder. Focus remains explicit so rename and deep inspection do not compete for the same gesture.

Before transition, capture:
- active Board;
- Placement identity;
- viewport position/zoom;
- current selection;
- relevant transform/shared-element origin.

Exiting Focus restores the originating Board/Placement context.

## Boundaries

Focus is explicit. Resizing a card does not accidentally open Focus.

Composition-only Board objects such as annotations and decorative connectors do not open World Object Focus unless they define their own small edit surface.

## Appearance & behaviour

Use representation-specific morph/shared-element transitions where available so Focus feels like deepening the selected object.

Reduced-motion preference uses a restrained fade/geometry transition while preserving spatial return.

## Relationships

- [[FOC-001 — Focus Host]] — destination.
- World Object Focus components — full destination representations.
- [[DSK-021 — Placement Resize & Disclosure]] — shallower in-place disclosure.
- [[BRD-005 — Board Open & Restore]] — helps restore Board context.

## Handoff

Implement **DSK-027 — Focus Invocation** as the explicit, reversible transition from a Board Placement into Focus with exact spatial return.
