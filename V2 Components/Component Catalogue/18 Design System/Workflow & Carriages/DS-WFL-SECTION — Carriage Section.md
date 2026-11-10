---
id: DS-WFL-SECTION
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

# DS-WFL-SECTION — Carriage Section

## Purpose

Defines the reusable Carriage Section structure shared by workflow carriages while allowing Prepare, Stage, Settlement and Librarian to keep distinct content.

## Design rules

Share structural rhythm, not domain meaning. Dense Stage use and conversational Librarian use must still feel like one product.

## Storybook / manual test

Normal, narrow/long content, empty section, active/current context, overflow, and docked composition.

Use realistic Relic copy rather than lorem ipsum. The story is a design/test fixture, not a substitute for the owning product contract.

## Implementation flexibility

Exact DOM/CSS/component composition may change as long as the approved visual and interaction contract remains coherent.
