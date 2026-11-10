---
id: DS-BHV
status: active
kind: family
authority: current
system: SYS-18
family: shared-ui-behaviors
storybook: none
---

# DS-BHV — Shared UI Behaviors

Parent: [[SYS-18 — Relic Design System]]

## Purpose

Cross-component interaction contracts that should not be reinvented by each feature.

## Catalogue

- [[DS-BHV-ACCESS — Accessibility & Input Modality]]
- [[DS-BHV-AUTOSAVE — Autosave & Save-State Contract]]
- [[DS-BHV-KEYBOARD — Keyboard Command & Focus Arbitration]]
- [[DS-BHV-OVERLAY — Overlay Dismissal Focus & Layering]]
- [[DS-BHV-PROTECTED — Protected Action & Confirmation Pattern]]

## Consumers

All product components that need this family.

## Rule

This is a retrieval/design family, not a mandatory production-code package. Atomic stories/components can share implementation when that produces a cleaner system.
