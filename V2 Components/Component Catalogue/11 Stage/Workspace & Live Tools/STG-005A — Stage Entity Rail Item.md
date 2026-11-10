---
id: STG-005A
status: active
kind: component
authority: current
system: SYS-11
family: workspace-live-tools
storybook: component
depends_on:
- OBJ-015
platforms:
- web
---

# STG-005A — Stage Entity Rail Item

Parent: [[STG-005 — Stage Entity Rail]]

## Purpose

Shared compact navigation/relevance container used by Stage Entity Rail entries. Family projections contribute their identity/content; this component owns rail density, activation affordance, relevance/current-state treatment, and keyboard focus behavior.

## Anatomy

- family identity cue or image/icon;
- concise name;
- optional single relevance/current-context line;
- selected/current treatment when meaningful.

## Behavior

Primary activation locates or foregrounds the ordinary object projection. Deliberate deep activation opens Focus through [[OBJ-015 — Object Reference Navigation]]. It does not become a duplicate full Stage card.

## Storybook / manual test

Test Character, Place, Faction, Source/reference, selected/current, prepared/relevant, long-name, and dense-rail states.
