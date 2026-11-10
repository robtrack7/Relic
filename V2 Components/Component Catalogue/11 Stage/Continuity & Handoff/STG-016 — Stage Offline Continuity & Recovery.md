---
id: STG-016
status: active
kind: behavior
authority: current
system: SYS-11
family: continuity-handoff
storybook: pattern
depends_on:
- APP-013
- STG-007
- STG-009
platforms:
- web
---

# STG-016 — Stage Offline Continuity & Recovery

Parent: [[STG-001 — Stage Workspace State]]

## Purpose

Makes Stage the most failure-resistant workspace in Relic so live play can continue through temporary network loss or application interruption.

## Locally resilient capabilities

Where caching/local storage allows, preserve:
- current Session;
- Scenes/Beats;
- prepared references;
- current Board state;
- Scene selection;
- Encounter Flow runtime;
- Session Instances;
- Session Mechanics State;
- Quick Capture;
- recording;
- Mark Moment;
- dice;
- Canvas composition changes;
- End Session queue.

## Degraded services

**Search** uses cached/recent/prepared identity and Source scope where available.

**Librarian** network-backed capabilities may become unavailable.

No local-model fallback is required for current V2.

Stage remains usable without AI connectivity.

## Status

Healthy: show nothing. Offline/degraded: quiet status such as `Offline · changes queued`. Escalate only when storage, audio safety or queue preservation is genuinely at risk.

## Crash recovery

If the browser/tab reloads, crashes, or Relic restarts after interruption during an In Progress Session, offer a resume path restoring where recoverable:
- Session;
- current Scene;
- Board/view;
- Encounter Flow;
- Session Instances;
- runtime mechanics;
- captures;
- local audio.

## Conflict rule

Do not ask the GM to resolve sync conflicts during play. Preserve local work and surface conflict handling after the Session.

## Relationships

- [[APP-013 — Degraded & Offline Status]]
- [[STG-007 — Recording & Consent]]
- [[STG-009 — Encounter Flow]]
- [[STG-010 — Session Instance Model]]
- [[MEC-022 — Session Mechanics State]]

## Platform offline owner

Physical offline cache/sync is implemented by [[PLT-014 — Offline Cache Sync & Conflict Recovery]], using semantic domain operations rather than arbitrary table patches.

## Handoff

Implement **STG-016 — Stage Offline Continuity & Recovery** around local preservation first and deferred conflict resolution after play.
