---
id: REV-001
status: active
kind: domain
authority: current
system: SYS-12
family: settlement-model-lifecycle
storybook: none
depends_on:
- LBR-013
- STG-015
- REV-004
---

# REV-001 — Post-Session Processing Pipeline

Parent: [[SYS-12 — Review & Settlement]]

## Purpose

Transforms the evidence produced during play into a coherent Session interpretation, proposed world changes, recap material, and prep implications without requiring the GM to reconstruct the Session manually.

## Task origin

The pipeline is initiated by the GM's explicit `End Session` workflow. This is a human-triggered product workflow under [[LBR-013 — Human-Initiated Agentic Work]], not spontaneous background Librarian activity.

## Inputs

Potential inputs:
- audio segments;
- transcript;
- Stage Fragments;
- Marked Moments;
- closing note;
- Scenes / Beats;
- prepared/contextual World Objects;
- active Threads;
- Session Instances;
- Encounter Flow history where useful;
- settlement-relevant Session Mechanics State;
- current settled Saga/World state.

Recording is optional. Notes/captures alone can produce a Review Set.

## Pipeline stages

Conceptually:

`Finalize Inputs → Transcribe → Assemble Evidence → Interpret Session → Build Session Change Set → Ready for Settlement`

User-facing language should remain simple:
- Preparing session
- Transcribing
- Understanding what changed
- Ready to review

## Progressive availability

Transcript can become available before the full interpretation is finished.

The GM can correct names/text while later stages continue.

If evidence changes after proposals were generated, citation drift is surfaced explicitly rather than silently rewriting the proposal.

## Failure behaviour

Partial success should remain usable.

If recap succeeds, six changes succeed, and one extraction fails, show the useful results and flag the failed/uncertain portion.

Do not make the entire Session Review unavailable because one artifact failed.

## Reprocessing

A re-run creates a new interpretation/change-set version.

Pending material from the prior run becomes superseded where appropriate.

Already settled canon is never silently rolled back by reprocessing.

## Relationships

- [[STG-015 — End Session & Undo]]
- [[REV-004 — Session Change Set & Story Changes]]
- [[REV-008 — Evidence & Transcript Inspector]]
- future backend/processing architecture

## Handoff

Implement **REV-001 — Post-Session Processing Pipeline** as the asynchronous transformation from live evidence into an auditable Session interpretation and change set.
