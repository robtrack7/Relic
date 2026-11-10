---
id: DS-WFL-CARRIAGE
status: active
kind: component
authority: current
system: SYS-18
family: ds-wfl
storybook: component
depends_on:
- DS-FND-TYPE
- DS-FND-COLOR
- DS-FND-STATE
platforms:
- web
---

# DS-WFL-CARRIAGE — Carriage Shell

## Purpose

Defines the reusable Carriage Shell structure shared by workflow carriages while allowing Prepare, Stage, Settlement and Librarian to keep distinct content.

## Design rules

Share structural rhythm, not domain meaning. Dense Stage use and conversational Librarian use must still feel like one product.

When collapsed on the Canvas, Prepare, Stage, and Librarian use shared labeled icon capsules on the Canvas edge. The top-right Librarian Toggle remains available. Opening or collapsing preserves camera, draft, and section state and does not invoke AI.

Expanded carriages share the floating-surface radius tokens. Left headers read icon → left-aligned identity/context → collapse; right headers mirror this as collapse → right-aligned identity/context → icon, preserving natural text direction. Collapsed capsules follow the same side-aware ordering, with the expand control nearest the Canvas.

## Storybook / manual test

Normal, narrow/long content, empty section, active/current context, overflow, and docked composition.

Use realistic Relic copy rather than lorem ipsum. The story is a design/test fixture, not a substitute for the owning product contract.

## Implementation flexibility

Exact DOM/CSS/component composition may change as long as the approved visual and interaction contract remains coherent.
