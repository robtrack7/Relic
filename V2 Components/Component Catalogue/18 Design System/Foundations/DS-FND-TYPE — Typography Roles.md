---
id: DS-FND-TYPE
status: active
kind: primitive
authority: current
system: SYS-18
family: ds-fnd
storybook: primitive
platforms:
- web
---

# DS-FND-TYPE — Typography Roles

## Purpose

Defines semantic typography roles used across Relic. Exact font family, optical tuning, sizes and line heights are designed in Storybook; component specs consume roles rather than inventing local type scales.

## Roles to establish

At minimum test: display/brand expression; workspace/page title; World Object title; section title; UI/body text; secondary/quiet text; caption/metadata; compact control label; and mono/structured metadata where it materially helps.

A role can share physical values with another role. The catalogue defines meaning, not a demand for a unique CSS token for every label.

## Design rules

- prioritize excellent long-form reading in Focus and compact legibility in Stage;
- hierarchy should come from scale, weight, spacing and placement before excessive colour;
- avoid generic SaaS “everything is 14px medium” flattening;
- avoid decorative fantasy display treatment that compromises working readability;
- truncation/wrapping behavior is validated with real names and campaign prose.

## Storybook / manual test

Show the complete role ladder plus realistic combinations: Character Card, Focus section, Carriage row, metadata cluster, long title, dense mechanics entry and grounded Librarian answer. Test browser zoom and narrow web layouts before approving the scale.
