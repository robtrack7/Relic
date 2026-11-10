---
id: LIB-004
status: active
kind: component
authority: current
system: SYS-09
family: library
storybook: component
depends_on:
- LIB-003
- SRH-005
platforms:
- web
---

# LIB-004 — Library Filter Bar

Parent: [[LIB-001 — Library Surface]]

## Purpose

Provides small category-relevant browsing controls without turning Library into a database query builder.

## Common controls

Potential common controls:
- search within selected category;
- scope;
- archived;
- maturity where useful;
- sort;
- list/grid mode where supported.

## Category-specific filters

Examples:

**Thread**
- status.

**Source**
- PDF / Web / Transcript / Image / Notes.

**Character**
- PC/NPC only if it proves useful.

**Place**
- scale/category only if browsing actually benefits from it.

## Filter philosophy

Expose only filters that answer real browsing questions.

Do not automatically surface every persisted property as a filter.

## Relationships

- [[LIB-003 — Library Index Collection]]
- [[SRH-005 — Search Scope & Filters]]

## Handoff

Build **LIB-004 — Library Filter Bar** as the restrained category-aware browsing/filter control row.
