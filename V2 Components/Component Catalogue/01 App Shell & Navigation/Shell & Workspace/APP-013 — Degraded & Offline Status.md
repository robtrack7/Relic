---
id: APP-013
status: active
kind: component
authority: current
system: SYS-01
family: shell-workspace
storybook: component
depends_on:
- STG-001
platforms:
- web
---

# APP-013 — Degraded & Offline Status

Parent: [[APP-001 — Global App Shell]]

## Purpose

Degraded / Offline Status tells the GM when Relic's operating conditions materially differ from normal and whether their work remains safe.

Its primary job is confidence, especially during live-session use.

## Context & placement

Hidden completely during normal operation.

When needed, appears in screen space near a lower viewport edge, likely lower-right unless the active surface requires that region.

It overlays rather than resizing the workspace.

Stage may expose additional capture-specific queue detail locally, but the shell remains the source of the overall connectivity/sync condition.

## Use

Relevant states include:

- offline;
- reconnecting;
- local changes queued;
- synchronization delayed;
- synchronization resumed.

The component should answer the practical question: **Is my work safe, and is there anything I need to do?**

Provider/model outages do not automatically belong here. A Librarian-only provider outage should be communicated inside Librarian.

## Anatomy

Typical presentation:

- concise state label;
- optional queued-item count;
- reassuring local-save message where applicable;
- optional details/retry action only if user intervention is useful.

Examples:

`Offline · changes saving locally`

`Reconnecting · 4 changes queued`

Avoid technical networking terminology.

## Appearance & behaviour

Quiet but unambiguous.

Colour must not be the sole state cue.

Persistent offline state remains visible until normal operation resumes.

Recovery should briefly confirm synchronization before the indicator disappears.

Do not animate continuously merely to communicate "offline."

## States & variants

- offline, local-safe;
- offline with queue;
- reconnecting;
- sync delayed;
- resumed/synced;
- degraded condition requiring user action.

## Relationships

- [[APP-001 — Global App Shell]] — owns global mounting.
- [[SYS-19 — Platform & Data Architecture]] — supplies connectivity/queue state.
- [[STG-001 — Stage Workspace State]] — requires particularly clear continuity feedback.
- Stage capture queue/status components — may show more detailed session-specific information without replacing this global state.

## Data / utility relationship

Reads connectivity, local persistence, and synchronization state.

It does not implement sync or queue processing.

## Handoff

Build **APP-013 — Degraded & Offline Status** as the normally hidden global confidence indicator for offline, queued, reconnecting, and resumed operation.
