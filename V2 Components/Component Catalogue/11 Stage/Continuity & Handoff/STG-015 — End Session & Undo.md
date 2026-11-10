---
id: STG-015
status: active
kind: behavior
authority: current
system: SYS-11
family: continuity-handoff
storybook: pattern
depends_on:
- SES-001
- STG-007
- STG-016
platforms:
- web
---

# STG-015 — End Session & Undo

Parent: [[STG-002 — Stage Carriage]]

## Purpose

Provides a deliberate recoverable seam from live Stage into post-session processing and Review.

## End flow

`End Session` confirms before:
- stopping/finalizing active recording safely;
- finalizing local captures;
- preserving Session Instances/runtime history;
- preparing queued uploads;
- beginning post-session processing after the undo window.

## Undo window

After confirm:

`Session ended · Processing starts in 0:58 · Undo`

Use approximately 60 seconds.

During the window:
- Stage remains visible;
- local captures/audio remain safe;
- Undo restores In Progress;
- recording can resume as a new safe segment if needed.

This is transient, not another long-term Session lifecycle category.

## Closing note

Optionally ask: **Anything Review should know before you leave?** One concise note. This becomes Review input/provenance, not immediate canon.

## Final transition

At undo expiry, Session becomes Ended, queued local work finalizes, post-session processing is enqueued, and Stage exits toward downstream Session Settlement context.

## Relationships

- [[SES-001 — Session Model & Lifecycle]]
- [[STG-007 — Recording & Consent]]
- [[STG-016 — Stage Offline Continuity & Recovery]]
- Review & Settlement

## Handoff

Build **STG-015 — End Session & Undo** as a two-step end action with a recoverable undo window before processing begins.
