---
id: BRD-011
status: active
kind: behavior
authority: current
system: SYS-02
family: boards
storybook: pattern
depends_on:
- BRD-002
- BRD-009
- DSK-031
- DS-CAN
platforms:
- web
---

# BRD-011 — Board Preview Renderer

Parent: [[SYS-02 — Desk & Boards]]

## Purpose

Generates lightweight abstract spatial previews of Boards for switching, Board Link Cards, and other recognition surfaces without screenshotting or rendering the full live Canvas.

## Inputs / outputs

Input:
- Board bounds;
- Placement geometry;
- broad projection/category/image-presence cues;
- Section geometry.

Output:
- small abstract preview representation suitable for thumbnail-scale rendering.

Readable card text is not required.

## Important behaviour

The renderer should preserve spatial silhouette and major visual masses:
- clusters;
- prominent imagery;
- Sections;
- major Placement blocks.

Preview generation must remain cheap enough to update after meaningful Board composition changes without constantly rendering expensive screenshots.

It should degrade gracefully for enormous Boards.

## Relationships

- [[BRD-002 — Board Preview Tile]] — primary consumer.
- [[BRD-009 — Board Link Card]] — embedded preview consumer.
- [[DSK-031 — Contextual Minimap]] — may share simplified geometry primitives but remains a live viewport component.

## Data / utility relationship

Reads Board composition geometry only. It does not need full World Object content beyond minimal visual/category cues.

## Handoff

Implement **BRD-011 — Board Preview Renderer** as a lightweight abstract spatial thumbnail generator for Board recognition.
