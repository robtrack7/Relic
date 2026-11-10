---
id: PUB-005
status: deferred
kind: behavior
authority: current
system: SYS-16
family: player-experience
storybook: pattern
platforms:
- web
---

# PUB-005 — Published World Object Projections

Parent: [[SYS-16 — Player Publication & Permissions]]

## Purpose

Defines how each persistent World Object family can project an intentionally limited player-safe representation without duplicating identity.

## Family ownership

Each family declares its publishable content and sensible defaults.

Examples:

**Character**
- identity/portrait;
- public narrative;
- selected mechanics;
- public/known Relationships;
- selected holdings.

**Place**
- public description/image;
- known location/context;
- published related Events/Factions.

**Faction**
- public description/reputation;
- known members/Relationships;
- published goals where appropriate.

**Artifact**
- known properties/history;
- revealed mechanics.

**Thread**
- only Threads intentionally known to players.

**Event**
- published narrative occurrence suitable for Player Chronicle.

## Source / Fragment boundary

**Source**
Raw Sources are not generically published by default. Future handouts can use an explicit publication-artifact path.

**Fragment**
Do not generically publish unresolved Fragments. Resolve or intentionally convert them into appropriate public material first.

## Temporal behavior

Published object projections read the current **settled** allowed state unless the publication type explicitly freezes a version.

Pending Settlement interpretation must never leak through a player projection.

## Handoff

Use family projection contracts when implemented; avoid one universal player-card schema that erases meaningful family differences.
