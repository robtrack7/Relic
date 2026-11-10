---
id: FOC-006
status: active
kind: component
authority: current
system: SYS-06
family: focus-host-navigation
storybook: component
depends_on:
- FOC-010
- FOC-004
- FOC-002
- DS-FOC
platforms:
- web
---

# FOC-006 — Focus Section Navigator

Parent: [[FOC-001 — Focus Host]]

## Purpose

Provides rapid navigation through long Focus publications without creating a permanent application sidebar. It complements the page/tab strip; it does not turn Focus into a generic outline or Builder block list.

## Context & placement

On generous widths, appears as a narrow internal document outline aligned to the Focus margin or as page-level tab overflow.

On narrow widths, collapses into Focus Surface Chrome as a compact section menu.

## Anatomy

Contains only pages and blocks present in the current family/object composition.

Example Character labels:
- Overview;
- Roleplay;
- Mechanics;
- Knowledge;
- Relationships;
- History;
- Sources.

Labels are family-declared rather than inferred from raw component names.

## Appearance & behaviour

Subtle typography-first outline.

Current section receives quiet emphasis.

Selecting an entry switches to the corresponding Focus page or scrolls to its anchor. Horizontal touch gestures may move between pages when the pointer is not selecting or editing text.

Scrolling updates current-section state.

Keyboard navigation is supported.

## States & variants

- wide outline;
- compact menu;
- active section;
- very short Focus / navigator hidden.

## Relationships

- [[FOC-010 — Focus Anchor & Deep Link]] — section anchors.
- [[FOC-004 — Focus Composition Contract]] — labels/order.
- [[FOC-002 — Focus Surface Chrome]] — compact-mode host.

## Handoff

Build **FOC-006 — Focus Section Navigator** as the lightweight page/section navigation for long Focus surfaces, with keyboard and touch parity.
