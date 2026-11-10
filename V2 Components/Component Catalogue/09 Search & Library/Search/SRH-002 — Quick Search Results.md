---
id: SRH-002
status: active
kind: component
authority: current
system: SYS-09
family: search
storybook: component
depends_on:
- APP-004
- SRH-001
- SRH-003
platforms:
- web
---

# SRH-002 — Quick Search Results

Parent: [[SYS-09 — Search & Library]]

## Purpose

Provides the fast result overlay attached to [[APP-004 — Global Search & Quick Open]].

This is the primary Search experience for normal navigation.

## Before typing

Show only a small useful recent set such as:
- recently opened World Objects;
- recent Boards;
- recent Sources;
- active Session where relevant.

Do not create a large activity dashboard.

## While typing

Return the smallest useful results first.

Light grouping may include:
- World;
- Boards;
- Sources;
- Sessions.

Do not force category headers when the query returns only a few items.

## Result anatomy

Use the family's Index/Search Projection wherever one exists.

Search owns:
- rank;
- query highlighting;
- keyboard state;
- light grouping;
- match-context excerpt.

Family owns:
- recognizable identity;
- type-specific context;
- disambiguation.

## Appearance & behaviour

- opens as the user types;
- arrow keys navigate;
- Enter opens;
- Escape dismisses;
- Search overlay does not resize Canvas;
- exact identity results appear before slower body/semantic matches where needed.

Include `See all results` when the query exceeds the useful Quick Search depth.

## Stage behaviour

Stage uses the same Quick Search component.

Active Session context can boost prepared/pinned objects, current Place, active Threads, and pinned references without creating a separate Stage Search system.

## Relationships

- [[APP-004 — Global Search & Quick Open]]
- [[SRH-001 — Search System]]
- [[SRH-003 — Full Search Surface]]
- [[SRH-004 — Search Result Match Context]]

## Handoff

Build **SRH-002 — Quick Search Results** as the fast keyboard-native global retrieval overlay.
