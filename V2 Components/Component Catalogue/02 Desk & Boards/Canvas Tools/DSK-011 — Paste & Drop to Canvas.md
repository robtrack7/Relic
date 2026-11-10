---
id: DSK-011
status: active
kind: behavior
authority: current
system: SYS-02
family: canvas-tools
storybook: none
depends_on:
- BRD-006
- DS-CAN
---

# DSK-011 — Paste & Drop to Canvas

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Lets the GM bring material into the world using ordinary clipboard and drag/drop habits without detouring through a separate import screen.

## Interaction

Expected mappings:
- pasted plain/rich text → new Fragment;
- pasted image → image/media Source with Board Placement;
- dropped image/file → Source/import flow with immediate spatial placeholder;
- dropped supported document → Source/import/ingestion placeholder;
- pasted URL → lightweight Source/link capture;
- dragged existing Relic search/library result → Placement of existing identity, not a duplicate World Object.

New content is placed near the pointer or a sensible visible position.

## Boundaries

Large/document ingestion may continue asynchronously through platform pipelines, but the Canvas should immediately show a durable placeholder/source identity when capture succeeds.

Dropping existing Relic content creates a Board reference/Placement rather than copying content.

## States & variants

- valid drop target;
- importing placeholder;
- unsupported content;
- failed import with recoverable source placeholder where possible.

## Relationships

- [[BRD-006 — Placement Host]] — hosts newly placed content.
- Source/import system — owns file ingestion.
- Search/Library result components — may be dragged into the Canvas.

## Handoff

Implement **DSK-011 — Paste & Drop to Canvas** as the direct spatial capture/placement path for clipboard data, files, URLs, and existing Relic objects.
