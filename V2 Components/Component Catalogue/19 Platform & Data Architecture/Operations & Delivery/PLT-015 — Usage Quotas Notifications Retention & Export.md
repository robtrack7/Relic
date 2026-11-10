---
id: PLT-015
status: active
kind: platform
authority: current
system: SYS-19
family: operations-delivery
storybook: none
depends_on:
- PLT-011
---

# PLT-015 — Usage Quotas Notifications Retention & Export

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Consolidates deterministic operational workflows around metering, limits, notifications, retention cleanup and user-owned data export.

## Usage boundary

Workspace/account is the primary usage/plan boundary.

Track conceptual categories such as:
- AI credits;
- transcription minutes;
- storage.

Internally preserve actual provider usage/cost separately from user-facing credit abstractions.

## Origin attribution

Every metered AI action must be attributable to the conceptual task/workflow origin from Section 13/[[PLT-011 — AI Routing Context & Run Ledger]].

Provider retries do not become mysterious extra Librarian tasks in the user-facing activity list.

## Preflight

AI/transcription/storage-dependent workflows can preflight allowance before expensive work begins and return a clear product-level limitation state.

## Quota safety

Quota exhaustion never prevents:
- manual Relic;
- viewing canon;
- safe Stage shutdown / End Session;
- manual Prepare;
- data export.

## Notifications

Generate deterministic notifications for events such as:
- processing ready/failed;
- usage threshold;
- recovery issue.

Do not invoke Librarian merely to state known application facts.

## Retention

Durable cleanup jobs enforce policies such as:
- delete audio after successful processing;
- retained transcript policy;
- temporary export expiry;
- deleted/archived data cleanup according to product rules.

Cleanup is idempotent and auditable where destructive.

## Export

Export is deterministic and authorized.

Support readable Markdown and structured JSON/archive as implemented, with temporal history/assets according to export mode. Export does not require AI.

## Flexibility

Exact credit conversion, plan limits, billing provider and retention timing are product/pricing implementation choices. Traceability, safe quota behavior and data ownership are hard contracts.

## Handoff

Design the usage ledger so Section 17 can explain usage without exposing raw provider accounting.
