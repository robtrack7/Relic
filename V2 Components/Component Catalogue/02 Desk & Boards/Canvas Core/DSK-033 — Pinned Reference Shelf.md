---
id: DSK-033
status: active
kind: component
authority: current
system: SYS-02
family: canvas-core
storybook: component
depends_on:
- DSK-007
- OBJ-SRC
- MEC-015
- DS-CAN
platforms:
- web
---

# DSK-033 — Pinned Reference Shelf

Parent: [[DSK-001 — Desk Surface]]

## Purpose

Provides one-click access to rules, source documents, web references, house rules, and other frequently consulted material without requiring those references to occupy permanent Canvas space.

## Context & placement

Appears as a small secondary book/reference control beneath or adjacent to [[DSK-007 — Canvas Tool Cluster]]. It is visually separated from Select/Create/Compose/Connect because it is a reference shelf, not a Canvas tool. It is hidden entirely when nothing is pinned. During Stage it shifts with the Canvas edge; Stage can also expose the same pinned-reference collection in its carriage.

## Use

A Source can be placed normally on a Board, found through Search, opened through Librarian, or **Pinned to Reference Shelf**. Typical references include core rules PDFs, GM screens, spell/ability references, house rules, campaign rules, webpages, and encounter/reference tables.

## Anatomy

Resting: one quiet book/reference symbol. Open: compact list of pinned references with title, source type, optional page/anchor, and optional source icon.

## Appearance & behaviour

Feels like a small stack of reference material attached to the Desk, not a fifth Canvas tool mode. Opening a reference can use Source Peek/Viewer, a deep-linked PDF page, or web reference according to Source type.

## Relationships

- [[OBJ-SRC — Source Representation Family]] — underlying reference identity.
- [[MEC-015 — Rules Reference Binding]] — mechanics deep-links.
- [[APP-004 — Global Search & Quick Open]] — searches indexed reference content.
- [[LBR-001 — Librarian Carriage]] — retrieves/cites rules material.
- [[STG-002 — Stage Carriage]] — exposes the same pinned reference collection during live play.

## Data / utility relationship

Stores a user/Saga reference to existing Source identities; it does not duplicate Source content.

## Handoff

Build **DSK-033 — Pinned Reference Shelf** as the conditional one-click shelf for frequently consulted Source material.
