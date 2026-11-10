---
id: DS-BHV-PROTECTED
status: active
kind: behavior
authority: current
system: SYS-18
family: ds-bhv
storybook: pattern
depends_on:
- DS-FND-TYPE
- DS-FND-COLOR
- DS-FND-STATE
platforms:
- web
---

# DS-BHV-PROTECTED — Protected Action & Confirmation Pattern

## Purpose

Defines the cross-product behavior contract for protected action & confirmation pattern.

## Design rules

Feature components consume this behavior rather than reimplementing subtly different versions. Keep the contract semantic and implementation-flexible.

## Storybook / manual test

Demonstrate the behavior through a small Storybook harness with keyboard/pointer edge cases and failure/recovery where applicable.

Use realistic Relic copy rather than lorem ipsum. The story is a design/test fixture, not a substitute for the owning product contract.

## Implementation flexibility

Exact DOM/CSS/component composition may change as long as the approved visual and interaction contract remains coherent.
