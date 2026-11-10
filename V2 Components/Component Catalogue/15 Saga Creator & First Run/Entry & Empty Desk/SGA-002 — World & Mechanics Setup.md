---
id: SGA-002
status: active
kind: component
authority: current
system: SYS-15
family: entry-empty-desk
storybook: component
depends_on:
- MEC-017
platforms:
- web
---

# SGA-002 — World & Mechanics Setup

Parent: [[SYS-15 — Saga Creator & First Run]]

## Purpose

Establishes setting scope and system mechanics without exposing unnecessary platform administration.

## World

If no World exists, create one quietly with the Saga. If Worlds exist, offer `Use existing World` or `Create new World` with one explanation: `Use the same World when your Sagas share a setting.`

Do not expose Workspace or Era setup here.

## Mechanics

Assign [[MEC-017 — Saga Mechanics Profile]] from implemented templates. Include `Other / Custom` and `Decide later`. Choosing a system must not force template customization during first run.

## Decide later

A mechanics-unassigned Saga remains valid for worldbuilding, Sources, Canvas, Librarian and Sessions.
