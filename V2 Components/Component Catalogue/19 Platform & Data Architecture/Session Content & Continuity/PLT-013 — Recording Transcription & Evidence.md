---
id: PLT-013
status: active
kind: platform
authority: current
system: SYS-19
family: session-content-continuity
storybook: none
depends_on:
- STG-015
- SET-009
---

# PLT-013 — Recording Transcription & Evidence

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Implements recoverable recording, transcription assembly and stable evidence anchors for Session Settlement.

## Recording model

Represent recording as one Session recording manifest with one or more segments/chunks.

Each segment should preserve enough identity for:
- local recovery;
- upload dedupe;
- duration/order;
- checksum/integrity;
- Storage object linkage;
- transcript linkage.

## End Session pipeline

[[STG-015 — End Session & Undo]] explicitly triggers:

`finalize live recording → upload pending segments → transcribe → assemble transcript → interpret Session → build Session Change Set → Ready for Settlement`

This remains a human-triggered workflow under Section 13.

## Transcript identity

Preserve stable transcript segment/timestamp identity separately from editable text.

The GM may correct text without invalidating every anchor.

## Evidence freeze

When a Story Change/proposal cites transcript evidence, store/reference:
- transcript segment ID;
- timestamp range;
- frozen excerpt as understood at proposal time;
- current transcript state separately.

Later edits produce citation drift rather than silently rewriting past evidence.

## Partial failure

Multi-segment transcription must support partial/retry behavior. Successfully processed segments remain usable while failures are recoverable.

## Retention

Apply Saga/account retention policy from [[SET-009 — Recording Retention & Privacy]] only after required processing/recovery invariants are satisfied.

## Flexibility

Single-call versus per-segment transcription, provider details and chunk duration are implementation choices. Resumability, stable timing identity, evidence provenance and idempotency are hard.

## Handoff

Test with interrupted upload, app restart, one failed segment, transcript edit after proposal creation, and delete-after-success retention.
