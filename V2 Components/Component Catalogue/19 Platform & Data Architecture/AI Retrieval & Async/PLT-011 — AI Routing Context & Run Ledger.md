---
id: PLT-011
status: active
kind: platform
authority: current
system: SYS-19
family: ai-retrieval-async
storybook: none
---

# PLT-011 — AI Routing Context & Run Ledger

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Separates conceptual user tasks from provider calls and tool invocations while keeping model routing replaceable and usage explainable.

## Routing seam

Product code should target Relic capability aliases rather than provider/model names.

Example aliases may represent fast/balanced/deep capability classes; exact names are implementation details.

LiteLLM maps aliases to supported providers/models.

## Three records

Keep conceptually distinct:

**AI task/run** — one user/workflow goal.

**Model call** — one provider inference request.

**Tool invocation** — one deterministic Relic operation.

One task may contain several model calls/retrievals/tools.

## Run ledger

Internal telemetry may record:
- task/origin;
- model alias;
- actual provider/model;
- latency;
- tokens/cost;
- retries;
- tool calls;
- status/failure;
- user-facing credit charge.

Section 17 surfaces understandable task-level activity, not raw provider traces.

## Conversation compaction

Compacted conversation summaries are derived context aids.

They are not:
- canon;
- citation sources;
- hidden world memory.

They may be rebuilt from retained conversation.

## Provider independence

Fallback/BYOK/local routing never changes:
- RLS;
- semantic tools;
- authority/autonomy;
- protected actions;
- citation requirements.

## Privacy

Avoid indefinite raw prompt/response storage as ordinary telemetry. If temporary debug retention is enabled, scope it explicitly by environment and privacy policy.

## Flexibility

Aliases, provider mappings, SDKs and telemetry storage may evolve. Preserve task/model/tool separation and authority independence.

## Handoff

Make one Section 17 usage entry traceable to one conceptual task even if retries/fallback required several provider calls.
