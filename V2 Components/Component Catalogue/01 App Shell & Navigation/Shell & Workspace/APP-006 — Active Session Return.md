---
id: APP-006
status: active
kind: component
authority: current
system: SYS-01
family: shell-workspace
storybook: component
depends_on:
- APP-005
- STG-001
- PREP-001
platforms:
- web
---

# APP-006 — Active Session Return

Parent: [[APP-001 — Global App Shell]]

## Purpose

Active Session Return gives the GM a reliable one-action route back to a current Session when they leave Prepare or Stage to work elsewhere.

It exists because active session work has stronger temporal relevance than ordinary navigation.

## Context & placement

Conditionally appears in the upper working frame near Current Context and Search.

It is absent when:

- there is no current/upcoming Session worth returning to;
- the GM is already inside that Session's Prepare or Stage context.

While already in Session context, its information is absorbed into [[APP-005 — Current Context Control]].

## Use

Examples:

- `Session 12 · Prepare`
- `Session 12 · Ready`
- `Session 12 · Live`

Selecting it returns directly to the appropriate Session working context.

The component should not expose Session management controls.

It is a return affordance, not a Session dashboard.

## Anatomy

- Session identifier/title;
- small status cue;
- optional directional/return affordance.

The visible text should remain compact.

## Appearance & behaviour

More noticeable than passive context text but less prominent than a primary action button.

A live Session may receive slightly stronger treatment than a merely prepared Session.

Animation/state should remain restrained; avoid pulsing or distracting "LIVE" broadcast aesthetics.

## States & variants

- prepared;
- ready;
- live;
- session ended / component disappears;
- unavailable/recovering.

## Relationships

- [[APP-005 — Current Context Control]] — absorbs Session context while user is already there.
- [[STG-001 — Stage Workspace State]] — live return destination.
- [[PREP-001 — Prepare Workspace State]] — pre-session return destination.
- [[APP-001 — Global App Shell]] — owns conditional placement.

## Data / utility relationship

Reads the current relevant Session and its lifecycle status.

It does not mutate Session state.

## Handoff

Build **APP-006 — Active Session Return** as the conditional shell-level shortcut back to the GM's current Prepare or Stage context.
