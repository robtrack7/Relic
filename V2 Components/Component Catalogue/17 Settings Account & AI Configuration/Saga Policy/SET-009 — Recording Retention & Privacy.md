---
id: SET-009
status: active
kind: component
authority: current
system: SYS-17
family: saga-policy
storybook: component
depends_on:
- STG-007
- REV-008
- SET-013
platforms:
- web
---

# SET-009 — Recording Retention & Privacy

Parent: [[SET-001 — Settings Surface & Scope Navigation]]

## Purpose

Configures Saga-level retention/privacy defaults for Session recording artifacts without
bypassing live recording consent.

## Audio retention

Recommended default:

**Delete audio after successful transcription/processing**

Alternative where supported:
**Retain recordings**

Retention remains subject to storage/plan policy.

## Transcript retention

Default:
**Retain transcripts**

Transcripts support:
- evidence;
- Session history;
- Settlement;
- citations.

Session-level deletion can be supported with clear consequences.

## Deletion consequences

Explain the effect before destructive deletion.

Example:
`Deleting this transcript removes transcript search and transcript/audio evidence access.
Settled world history remains intact.`

Exact provenance/evidence retention semantics are finalized in Section 19.

## Consent boundary

Settings cannot pre-authorize people at the table.

Recording consent remains a per-Session interaction owned by
[[STG-007 — Recording & Consent]].

## Scope

Saga setting / default.

A Session can still have its own actual recording state and retained artifacts.

## Relationships

- [[STG-007 — Recording & Consent]]
- [[REV-008 — Evidence & Transcript Inspector]]
- [[SET-013 — Settings Scope & Inheritance]]

## Handoff

Build **SET-009 — Recording Retention & Privacy** as a Saga retention default, never as
a bypass for live consent.
