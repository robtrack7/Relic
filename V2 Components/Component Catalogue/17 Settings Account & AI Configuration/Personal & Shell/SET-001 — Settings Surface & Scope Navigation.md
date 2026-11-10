---
id: SET-001
status: active
kind: surface
authority: current
system: SYS-17
family: personal-shell
storybook: scene
depends_on:
- APP-008
- APP-009
- SET-013
platforms:
- web
---

# SET-001 — Settings Surface & Scope Navigation

Parent: [[SYS-17 — Settings Account & AI Configuration]]

## Purpose

Provides one conventional Settings surface with clear personal, account/workspace, and
current-Saga scopes.

## Entry

Primary entry:

`Profile → Settings`

Contextual deep links may open:
- Saga Settings;
- AI Usage;
- Recording Settings;
- AI Connections;
- Data Export.

Do not add permanent Settings navigation to the main app shell.

## Navigation

Recommended information architecture:

**Personal**
- Account
- Appearance
- Notifications

**Relic**
- Usage & Plan
- AI Connections
- Data

**Current Saga**
- General
- Librarian & Settlement
- Recording & Privacy

The Saga section follows Current Context.

## Appearance & behaviour

Use a restrained conventional settings layout.

Settings is not a spatial Canvas and should not imitate Desk interactions merely for
visual novelty.

## Scope cues

Settings that affect only the current Saga must clearly say so.

Example:
`The Winter Court · Saga setting`

Avoid making users infer whether a change applies globally or to one campaign.

## Relationships

- [[APP-008 — Profile Control]]
- [[APP-009 — Profile Menu]]
- [[SET-013 — Settings Scope & Inheritance]]

## Handoff

Build **SET-001 — Settings Surface & Scope Navigation** as one compact settings shell
with explicit scope, deep-link support, and no duplicate configuration surfaces.
