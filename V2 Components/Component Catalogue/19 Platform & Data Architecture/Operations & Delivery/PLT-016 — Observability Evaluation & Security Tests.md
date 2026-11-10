---
id: PLT-016
status: active
kind: platform
authority: current
system: SYS-19
family: operations-delivery
storybook: none
---

# PLT-016 — Observability Evaluation & Security Tests

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Makes platform correctness measurable across runtime failures, AI behavior, retrieval, RLS, temporal semantics and offline continuity.

## Operational observability

Use appropriate telemetry such as Sentry for runtime errors and product analytics for workflow/performance signals.

Do not send private campaign prose into ordinary analytics/event properties.

## AI observability

Track task-level metadata sufficient to debug cost/behavior:
- origin/task class;
- retrieval profile;
- model alias/provider internally;
- latency/cost;
- tool calls;
- result/failure;
- settlement/rejection where relevant.

Avoid indefinite raw prompt storage by default.

## RLS/security suite

Migration tests must cover cross-user, sibling-Saga, World scope, Storage, retrieval/index access and future Player fixtures.

A schema change that weakens access boundaries is a correctness failure.

## Temporal suite

Property/integration tests should prove examples such as:
- Knowledge exists at Session 9 but not Session 8;
- Now excludes Pending;
- correction to old story state does not become a new present-day Event;
- revert preserves audit while restoring story-valid state;
- historical projections do not leak future Relationships/state.

## Retrieval evaluation

Maintain reproducible synthetic fixtures and expected queries covering exact, semantic, source/citation, temporal and permission behavior.

## Offline E2E

Maintain a scenario equivalent to:
`Ready → network offline → Stage → Scene/Encounter/Capture/Mechanics/Recording → End → tab/browser interruption or reload → restore → reconnect → sync → processing`

This should run regularly enough to prevent offline behavior becoming aspirational documentation.

## AI/tool safety tests

Test that registered semantic tools cannot exceed:
- current actor scope;
- autonomy mode;
- protected-action policy;
- expected revision.

Malformed model outputs must fail closed.

## Flexibility

Exact test framework/telemetry vendors may change. Required behavior coverage and privacy constraints are hard.

## Handoff

Define acceptance tests alongside each implementation workstream rather than after the backend is considered “done.”
