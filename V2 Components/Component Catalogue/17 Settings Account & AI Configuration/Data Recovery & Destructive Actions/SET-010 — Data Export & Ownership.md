---
id: SET-010
status: active
kind: component
authority: current
system: SYS-17
family: data-recovery-destructive-actions
storybook: component
depends_on:
- SET-002
- SET-011
platforms:
- web
---

# SET-010 — Data Export & Ownership

Parent: [[SET-001 — Settings Surface & Scope Navigation]]

## Purpose

Gives the GM deterministic access to their campaign/account data independent of AI
availability or quota.

## Saga export

Support deterministic export formats appropriate to the product architecture, including:
- readable Markdown;
- structured JSON/archive.

Export can optionally include history/audit when that format is implemented.

## Account export

Provide an eventual account-level:
**Export all my data**

where supported by the platform/backend.

## No AI dependency

Export should not require the Librarian.

It remains available when:
- AI quota is exhausted;
- provider is offline;
- Librarian is unavailable.

## Ownership principle

The GM's access to their data should not depend on purchasing additional AI usage.

Data export/ownership access must not be paywalled behind AI credits.

## Security

Export respects the authenticated user's authorized scope.

Sensitive exports may require re-authentication or a secure download flow.

## Relationships

- [[SET-002 — Account & Identity]]
- [[SET-011 — Archive Delete & Protected Actions]]

## Handoff

Build **SET-010 — Data Export & Ownership** as deterministic authorized export, not an AI
summarization feature.
