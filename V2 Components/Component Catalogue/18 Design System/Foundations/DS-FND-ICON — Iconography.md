---
id: DS-FND-ICON
status: active
kind: primitive
authority: current
system: SYS-18
family: ds-fnd
storybook: primitive
platforms:
- web
---

# DS-FND-ICON — Iconography

## Purpose

Defines the icon system and semantic wrapper used throughout Relic. **Phosphor is the current preferred icon family**, subject to visual confirmation in Storybook.

## Rules

- one wrapper owns standard size, weight, optical alignment and accessible labeling;
- feature code chooses a semantic icon meaning rather than importing arbitrary libraries locally;
- use icons alone only when recognition is strong; otherwise pair with a label;
- avoid decorative fantasy glyph proliferation;
- state change should not depend on a tiny icon alone;
- custom Relic-specific glyphs should be rare and justified by repeated product meaning.

## Storybook / manual test

Show common navigation, Canvas, object, relationship, temporal, AI, recording and mechanics icons at compact/normal sizes beside text. Check optical weight across thin/dense shapes and browser zoom.
