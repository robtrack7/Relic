---
id: DS-CTL-TEXT-ACTION
status: active
kind: component
authority: current
system: SYS-18
family: ds-ctl
storybook: component
depends_on:
- DS-FND-TYPE
- DS-FND-COLOR
- DS-FND-STATE
platforms:
- web
---

# DS-CTL-TEXT-ACTION — Text & Link Action

## Purpose

Low-chrome textual action for inline secondary commands and true navigation links where a full Button would add unnecessary weight.

## Semantics

Use actual link semantics for navigation/deep links and button semantics for actions. Visual similarity must not erase behavioral semantics.

## Rules

- do not hide primary/destructive decisions as quiet text actions;
- preserve visible focus and sufficient hover/active affordance;
- inline actions should not compete with surrounding prose;
- distinguish external/download behavior when relevant.

## Storybook / manual test

Inline edit action, deep link, quiet secondary action, destructive text action only where appropriately conspicuous, focus-visible, long label and use inside metadata/content rows.
