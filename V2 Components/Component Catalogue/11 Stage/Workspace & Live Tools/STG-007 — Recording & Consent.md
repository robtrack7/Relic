---
id: STG-007
status: active
kind: behavior
authority: current
system: SYS-11
family: workspace-live-tools
storybook: pattern
depends_on:
- STG-006
- STG-015
- STG-016
platforms:
- web
---

# STG-007 — Recording & Consent

Parent: [[STG-002 — Stage Carriage]]

## Purpose

Provides optional resilient Session recording with explicit consent and recoverable local-first audio handling.

## Consent

The first Record action in a Session requires the GM to confirm appropriate participant consent. No audio capture begins before confirmation.

## Recording states

- Off;
- Recording;
- Paused;
- Resuming;
- locally safe / upload queued;
- Error.

Stopping recording does not End Session. A Session may contain multiple recording segments.

## Resilience

Audio should write in recoverable chunks/segments locally before or while uploading. Temporary network failure must not stop a locally capable recording path.

## AI boundary

Recording does not imply live machine understanding.

Current V2 does not require:
- real-time transcription;
- speaker diarization;
- continuous hidden live summaries.

The Librarian's live awareness comes from structured Stage state, selected context, manual captures, GM instructions and authorized existing Sources. Recorded speech becomes machine-readable through downstream transcription after play.

## Relationships

- [[STG-006 — Session Capture & Marking]]
- [[STG-015 — End Session & Undo]]
- [[STG-016 — Stage Offline Continuity & Recovery]]
- future post-session processing

## Retention setting

Saga-level default audio/transcript retention is configured through
[[SET-009 — Recording Retention & Privacy]].

This setting never bypasses the per-Session consent gate.

## Handoff

Implement **STG-007 — Recording & Consent** as optional, consent-gated, locally recoverable segmented recording independent of Session start.
