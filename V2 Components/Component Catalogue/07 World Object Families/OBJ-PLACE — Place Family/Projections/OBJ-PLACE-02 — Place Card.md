---
id: OBJ-PLACE-02
status: active
kind: component
authority: current
system: SYS-07
family: place
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-PLACE-02 — Place Card

Parent: [[OBJ-PLACE — Place Representation Family]]

## Purpose

The normal Place Card answers:

> What is this place?

Preferred anatomy:
- image/map crop when available, extending to the top edge; integrate the Place/category and Pencil/Ink cues near its lower edge with a readable tonal overlay;
- Place name;
- category/scale;
- one-line atmosphere/identity;
- one or two contextual cues such as current status, parent Place, or active Thread.

Example:

**The Gilded Harbour**  
*Dock district · Brassgate*  
Salt, bells, smugglers and old money.

The Card should feel spatial and evocative rather than like address metadata.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Place content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
