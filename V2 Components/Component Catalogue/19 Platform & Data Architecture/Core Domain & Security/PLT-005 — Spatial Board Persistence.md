---
id: PLT-005
status: active
kind: platform
authority: current
system: SYS-19
family: core-domain-security
storybook: none
---

# PLT-005 — Spatial Board Persistence

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Persists spatial composition while preserving the law that the Canvas/Board is a view over World identity, not world truth.

## Persisted structures

Persist distinct domain/composition records for:
- Board;
- Placement;
- Board Section;
- Annotation;
- decorative connector;
- Board Link;
- semantic Relationship projection references where needed.

## Placement

A Placement references a persistent World Object and stores Board-specific presentation such as:
- x/y;
- size;
- projection choice;
- z-order;
- presentation/tint where supported.

Moving/resizing/removing a Placement does not mutate the World Object.

## Relationship distinction

A semantic Relationship remains a Relationship domain record. Its Board representation references that identity.

Decorative connectors remain composition-only and must not create semantic relationship data.

## View state

Viewport/camera, zoom and ephemeral selection may be user-specific view state rather than canonical Board composition.

Only persist what materially improves return/recovery.

## Offline

Board movement should be expressible as semantic offline operations such as `board.move_placement` rather than arbitrary row patches.

## Flexibility

Exact coordinate format, viewport persistence and batching strategy may evolve with the Canvas engine. Semantic separation between Board composition and world truth is non-negotiable.

## Handoff

Implement Board persistence so the real Canvas can evolve without coupling object identity/state to screen coordinates.
