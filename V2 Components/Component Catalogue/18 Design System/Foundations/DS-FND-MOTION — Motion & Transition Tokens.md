---
id: DS-FND-MOTION
status: active
kind: primitive
authority: current
system: SYS-18
family: ds-fnd
storybook: primitive
platforms:
- web
---

# DS-FND-MOTION — Motion & Transition Tokens

## Purpose

Defines restrained timing/easing roles for motion that explains continuity, hierarchy or acknowledgement. Motion is not ambient decoration.

## Roles to establish

Use a very small set for: immediate control feedback; ordinary overlay/disclosure transition; spatial continuity/representation change; and deliberately slower high-attention transitions only when they improve comprehension.

## Rules

- Card → Expanded → Focus and Canvas camera movement should preserve perceived continuity;
- navigation/spatial movement should generally be interruptible;
- Stage interactions never wait for ornamental animation;
- no ambient fantasy particles or bouncy SaaS motion language;
- respect reduced-motion preferences with equivalent state clarity.

## Storybook / manual test

Test overlay open/close, selected state, Card disclosure, Focus entry/return, Carriage docking and proposal→settled acknowledgement at normal and reduced motion.
