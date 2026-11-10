---
id: PLT-012
status: active
kind: platform
authority: current
system: SYS-19
family: ai-retrieval-async
storybook: none
---

# PLT-012 — Durable Jobs Queues & Pipeline Orchestration

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Provides durable retryable orchestration for ingestion, transcription, Settlement processing, embeddings, exports, retention and notifications.

## Queue direction

Prefer a Postgres/Supabase-native durable queue abstraction where it satisfies requirements rather than inventing several bespoke job tables.

Operational queue technology is replaceable behind the workflow contract.

## Work categories

Potential durable work includes:
- Source ingestion;
- embeddings/index refresh;
- transcription;
- post-Session interpretation;
- export generation;
- retention/cleanup;
- deterministic notifications.

Do not create one queue per minor function without operational need.

## Pipeline run versus queue message

Keep user-visible durable workflow state separate from operational queue delivery.

Example:
- `pipeline_run`: Preparing / Transcribing / Understanding / Ready;
- queue message: implementation machinery that may retry multiple times.

Never expose queue internals as product lifecycle.

## Job invariants

Every durable job must be:
- idempotent;
- safe under duplicate delivery;
- scope/actor-aware;
- observable;
- retryable with bounded policy;
- capable of partial failure reporting where the product supports partial results.

## Execution environment

Use Edge Functions/server functions for authenticated orchestration and external API calls where practical.

If measured workloads exceed execution/resource limits, move heavy work to a dedicated worker behind the same queue/pipeline contract rather than weakening reliability.

## Trigger invariant

AI-heavy workflows must still have a human/workflow task origin. Queue delivery does not create authority or a new AI goal.

## Flexibility

Queue product, queue count, retry timing and worker hosting are explicitly flexible. Durable idempotent workflow semantics are hard.

## Handoff

Prototype the End Session and Source ingestion pipelines first; they exercise most queue/idempotency/recovery requirements.
