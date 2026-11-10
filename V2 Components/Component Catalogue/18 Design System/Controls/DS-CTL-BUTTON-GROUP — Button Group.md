---
id: DS-CTL-BUTTON-GROUP
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

# DS-CTL-BUTTON-GROUP — Button Group

## Purpose

Composes a small set of closely related actions without making every adjacent button look like a segmented selector.

## Use

Use when actions belong to one local decision or toolbar cluster. Selection-state choices use Segmented Control or Toggle Button when the group represents one mutually exclusive/current state.

## Rules

- preserve each Button's semantic hierarchy;
- keep spacing/alignment predictable at normal and compact density;
- do not visually fuse unrelated destructive and primary actions;
- wrapping is preferable to crushed unreadable labels when a host becomes constrained.

## Storybook / manual test

Show primary+secondary, quiet toolbar groups, destructive-with-safe-alternative, compact Canvas controls, long labels and constrained wrapping. Verify tab order and that grouped actions remain individually named.
