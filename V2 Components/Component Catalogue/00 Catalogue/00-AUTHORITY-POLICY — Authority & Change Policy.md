---
id: 00-AUTHORITY-POLICY
status: active
kind: reference
authority: invariant
storybook: none
---

# Authority & Change Policy

## Three levels

**Invariant** — changing it materially changes Relic's product/security/trust contract. Escalate before changing.

**Current** — the best current product/design answer. Implement it, but challenge it when manual testing or implementation reveals a materially clearer or simpler result.

**Implementation** — a suggested physical/code approach. Codex may change it freely while preserving surrounding contracts.

## Change rule

Do not mechanically implement a bad specification. Small implementation improvements need no registry update. If testing changes a user-visible/product contract, update the smallest affected catalogue files after the implementation decision is accepted.

## Documentation sync

The primary implementation agent should build/test. A lightweight follow-up agent can compare the result with the registry and update documentation only when the product contract changed. Most tasks should require no documentation edit.
