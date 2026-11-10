---
id: DSK-004
status: active
kind: behavior
authority: current
system: SYS-02
family: canvas-core
storybook: pattern
depends_on:
- DSK-005
- DSK-031
- BRD-005
- DS-CAN
platforms:
- web
---

# DSK-004 — Canvas Camera Navigation

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Defines how the GM moves through spatial Board content.

Camera navigation is foundational interaction quality: it should feel closer to mature spatial tools than to a scrollable webpage.

## Interaction

Support:
- trackpad pan;
- mouse-wheel / trackpad zoom;
- cursor-anchored zoom;
- Space + drag temporary pan;
- middle-mouse drag where available;
- touch pinch/pan where relevant;
- programmatic pan/zoom from Fit, Minimap, Search, Focus return, and Board restore.

Zoom should anchor under the pointer or gesture centroid rather than around an arbitrary screen centre.

## Boundaries

Camera movement changes only viewport state.

It never modifies Placement coordinates.

When a docked carriage opens, the camera's world position remains stable while visible bounds change.

Programmatic camera moves should be interruptible by user input.

## Behaviour

Use controlled, low-latency motion with little or no gratuitous inertia.

Zoom has practical minimum/maximum limits broad enough for large-world overview and close card work.

Avoid hard world boundaries unless implementation requires a very large safety envelope; the Board should feel effectively infinite.

## Relationships

- [[DSK-005 — View Controls]] — direct camera commands.
- [[DSK-031 — Contextual Minimap]] — alternate overview navigation.
- [[BRD-005 — Board Open & Restore]] — restores saved camera state.
- [[DSK-027 — Focus Invocation]] — restores originating camera on Focus exit.

## Handoff

Implement **DSK-004 — Canvas Camera Navigation** as cursor-anchored, interruptible pan/zoom behavior shared by all Board content.
