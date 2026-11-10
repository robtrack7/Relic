---
id: DS-FBK-SAVE
status: active
kind: component
authority: current
system: SYS-18
family: ds-fbk
storybook: component
depends_on:
- DS-FND-TYPE
- DS-FND-COLOR
- DS-FND-STATE
platforms:
- web
---

# DS-FBK-SAVE — Save State Indicator

## Purpose

Defines the shared Save State Indicator feedback pattern without turning every state into persistent chrome.

## Design rules

Communicate what is happening, what remains safe, and what the user can do next. Healthy/normal state should be quiet.

## Storybook / manual test

Representative normal, warning/error, recovery, long-running/unknown-duration, and compact host states as applicable.

Use realistic Relic copy rather than lorem ipsum. The story is a design/test fixture, not a substitute for the owning product contract.

## Implementation flexibility

Exact DOM/CSS/component composition may change as long as the approved visual and interaction contract remains coherent.
