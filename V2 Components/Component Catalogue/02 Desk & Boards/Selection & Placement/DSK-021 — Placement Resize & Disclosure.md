---
id: DSK-021
status: prototype
kind: behavior
authority: current
system: SYS-02
family: selection-placement
storybook: pattern
depends_on:
- DSK-019
- DSK-026
- DS-CAN
platforms:
- web
---

# DSK-021 — Placement Resize & Disclosure

Parent: [[BRD-006 — Placement Host]]

## Purpose

Lets the GM resize spatial representations and intentionally cross progressive-disclosure thresholds without treating every card as a uniformly scalable bitmap.

## Interaction

Dragging a resize handle changes the Placement's available dimensions.

Within one representation, layout adapts fluidly inside allowed bounds.

The Interactive Desk starts new captures and Library insertions from the same 260×160 placement preference; content can require a taller footprint. Intentional dimensions and paper tints belong to the Board placement, never the World Object. Pointer resize and arrow keys on the resize control share the same validated write; Shift uses larger increments. The current size range is 180–720 wide and 120–640 high.

Goal 06.1 uses explicit Expand/Collapse (`E`) for deeper disclosure. Family-specific automatic resize thresholds remain a later refinement.

When the Placement crosses a defined disclosure threshold and remains there, the object can transition to the sibling representation appropriate to that family.

Example:
`Character Card → Expanded Character Card`

The inverse transition occurs when deliberately reduced below the corresponding threshold.

## Boundaries

Not every World Object family needs every disclosure level.

Automatic semantic zoom and deliberate resize are different:
- Semantic Zoom simplifies distant viewing.
- Resize/disclosure represents an intentional local choice to give an object more or less spatial importance.

Focus is not reached accidentally by making a card slightly larger; Focus remains an explicit deep action.

## Appearance & behaviour

Transitions should preserve shared elements such as image/name where possible and feel like one object reorganizing itself.

Threshold hysteresis should prevent the component from flickering between representations while resizing near a boundary.

## Relationships

- World Object representation families — define sibling components and thresholds.
- [[DSK-019 — Selection Frame & Handles]] — provides resize handles.
- [[DSK-026 — Semantic Zoom]] — camera-driven representation changes.
- representation transition behaviors — own family-specific morph animation.

## Handoff

Implement **DSK-021 — Placement Resize & Disclosure** as intentional size-driven transitions between separately coded representation components.
