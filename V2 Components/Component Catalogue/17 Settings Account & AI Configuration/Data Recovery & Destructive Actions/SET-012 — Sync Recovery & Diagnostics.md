---
id: SET-012
status: active
kind: component
authority: current
system: SYS-17
family: data-recovery-destructive-actions
storybook: component
depends_on:
- STG-016
- LBR-014
platforms:
- web
---

# SET-012 — Sync Recovery & Diagnostics

Parent: [[SYS-17 — Settings Account & AI Configuration]]

## Purpose

Provides user-facing recovery controls only when something needs attention, while keeping
healthy sync/runtime state invisible.

## Healthy state

Show no persistent sync dashboard when everything is working.

Healthy network/sync remains quiet.

## Actionable states

Examples:
- unsynced changes;
- failed upload;
- failed Session processing;
- retained recoverable audio;
- unresolved sync conflict;
- retryable provider/network operation.

## Presentation

Example:

**Session 14 Audio**
`Processing failed. Audio retained for recovery.`

Actions:
- Retry;
- inspect/recover where supported.

## Boundary

This is not a developer diagnostics console.

Do not expose ordinary users to:
- stack traces;
- raw provider requests;
- internal job IDs;
- SQL/RLS logs;
- token-level traces.

## Stage continuity

Reuse the recovery principles of [[STG-016 — Stage Offline Continuity & Recovery]].

Settings can provide a later recovery entry point but should not replace in-context
recovery where the issue occurs.

## Relationships

- [[STG-016 — Stage Offline Continuity & Recovery]]
- [[LBR-014 — Failure, Insufficiency & Recovery]]

## Handoff

Build **SET-012 — Sync Recovery & Diagnostics** as exception-only recovery UI with
internal diagnostics kept separate.
