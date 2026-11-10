---
id: LIB-002
status: active
kind: component
authority: current
system: SYS-09
family: library
storybook: component
depends_on:
- LIB-003
- LIB-004
platforms:
- web
---

# LIB-002 — Library Category Navigator

Parent: [[LIB-001 — Library Surface]]

## Purpose

Lets the GM browse Library systematically by meaningful content family.

## Categories

Suggested structure:

**All**

**World**
- Characters
- Places
- Factions
- Artifacts
- Threads
- Events
- Fragments

**Sources**
- Sources

## Counts

Optional secondary counts may appear, for example:
`Characters 42`

Counts should aid orientation, not become KPI/dashboard elements.

## Appearance & behaviour

On wide Library layouts, a narrow editorial rail is acceptable because category browsing is the primary task of the surface.

On narrower layouts, use a compact category selector.

This is Library-local navigation, not permanent global application navigation.

## Relationships

- [[LIB-001 — Library Surface]]
- [[LIB-003 — Library Index Collection]]
- [[LIB-004 — Library Filter Bar]]

## Handoff

Build **LIB-002 — Library Category Navigator** as the compact Library-local family/category browser.
