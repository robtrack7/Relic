---
id: SYS-18
status: active
kind: system
authority: current
storybook: none
---

# SYS-18 — Relic Design System

## Purpose

Defines the living visual/component system used to design and manually test Relic on the web before and during integration. Storybook is the primary component workshop and reproducible visual test fixture layer.

## Authority chain

`Product semantics → Storybook design/component system → integrated product surfaces`

Product sections own meaning and behavior. Section 18 owns reusable visual language and isolated/composed design fixtures. A Storybook story cannot silently redefine domain behavior.

## Design workflow

`catalogue contract → Storybook component/story → manual test → lightweight automated checks → integration → reference scene / real surface`

Design primitives in isolation, domain components with realistic Relic proxy data, and whole systems through reference scenes. Iterate in both directions instead of finishing every atom before composing the product.

## Core rules

- Current V2 implementation target is the **full web product**. Mobile adaptation is later and must not distort current web design decisions.
- Share semantics/tokens before forcing code reuse.
- Domain ownership outranks DRYness.
- Do not create a shared abstraction until multiple real consumers prove the common behavior.
- Storybook is for manual inspection first; add interaction/a11y/visual automation where it gives real confidence.
- Use realistic Relic content and states, not generic lorem-ipsum specimens.

## Families

- [[DS-FND — Foundations]]
- [[DS-CTL — Controls]]
- [[DS-FRM — Forms]]
- [[DS-SRF — Surfaces & Overlays]]
- [[DS-FBK — Feedback & Status]]
- [[DS-BHV — Shared UI Behaviors]]
- [[DS-CAN — Canvas Visual System]]
- [[DS-OBJ — World Object Visual System]]
- [[DS-FOC — Focus & Content Visual System]]
- [[DS-MEC — Mechanics Visual System]]
- [[DS-WFL — Workflow & Carriage Visual System]]
- [[DS-TRUST — Temporal Proposal & Trust Visual System]]
- [[DS-SCN — Reference Scenes]]

## Implementation flexibility

The catalogue is intentionally more granular than the required code module structure. Codex may merge/split internal implementations while retaining independently testable Storybook stories and the semantic contracts owned by product sections.
