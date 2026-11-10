---
id: FOC-BLK-005
status: active
kind: component
authority: current
system: SYS-06
family: blocks
storybook: component
depends_on:
- MEC-003
- MEC-018
- MEC-015
- DS-FOC
platforms:
- web
---

# FOC-BLK-005 — Mechanics Block Host

Parent: [[SYS-06 — Focus & Shared Focus Blocks]]

## Purpose

Bridges Focus composition to the shared Mechanics & Rules system without duplicating stat-block rendering inside each World Object family.

## Context & placement

Family Focus determines where Mechanics appears.

The block hosts the object's mechanics template in its `full_focus` presentation profile.

## Anatomy

- block heading/context where required;
- [[MEC-003 — Mechanics Layout Renderer]];
- optional template/profile identity;
- optional Rules Reference access;
- optional mechanics assignment/configuration action where authorized.

The actual stats/actions/resources come from the mechanics template.

## Appearance & behaviour

Mechanics may be denser and more structured than surrounding narrative blocks while still belonging to the same Focus visual language.

The block can use bounded surfaces/tables where mechanical scanning benefits from them.

## Relationships

- [[MEC-003 — Mechanics Layout Renderer]] — full mechanics renderer.
- [[MEC-018 — Object Mechanics Assignment]] — template/profile assignment.
- [[MEC-015 — Rules Reference Binding]] — direct rule links.

## Handoff

Build **FOC-BLK-005 — Mechanics Block Host** as the Focus wrapper around the shared system-template mechanics renderer.
