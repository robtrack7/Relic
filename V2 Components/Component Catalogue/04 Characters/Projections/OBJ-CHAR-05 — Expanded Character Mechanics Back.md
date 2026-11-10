---
id: OBJ-CHAR-05
status: deferred
kind: component
authority: current
system: SYS-04
family: projections
storybook: component
depends_on:
- MEC-022
- MEC-023
- MEC-003
- DS-OBJ
platforms:
- web
---

# OBJ-CHAR-05 — Expanded Character Mechanics Back

Parent: [[OBJ-CHAR — Character Representation Family]]

> **Current notice — superseded presentation.** The user-facing mechanics back is deferred. Character mechanics are presented in the right-side Focus Mechanics page and the central Entity Builder's mechanics block; no Expanded Card flip or third card disclosure is required.

## Purpose (historical)

Abbreviated game-system-aware Character reference answering **what do I need mechanically to use this Character right now?**

## Anatomy

Uses the active mechanics template's `expanded_back` profile. Depending on system: core defenses/health/movement/initiative, primary attributes, important skills, signature actions/attacks/reactions, spells/powers, relevant resources, and short Rules Reference links.

## Appearance & behaviour

Glanceable and abbreviated. Group recorded primary statistics, abilities, actions, traits, and secondary reference details. Preserve zero values and custom rules vocabulary; do not infer system-specific modifiers without a declared template rule. If data exceeds available space, render the template's prioritized subset and link directly to Mechanics in Focus. Avoid internal scrolling by default.

## Live resources

During a live Session, this face can project [[MEC-022 — Session Mechanics State]] through [[MEC-023 — Live Resource Definition]].

- Flow Only → no runtime resource controls required.
- Essentials → template-declared primary live resources.
- Custom → GM-selected resources.

HP, Stress, Hope, spell resources, Ki/Energy, Luck, ammunition, charges, or system-specific resources may be manually edited where defined. Relic does not automatically spend, apply damage, or adjudicate outcomes.

## Relationships

- [[MEC-003 — Mechanics Layout Renderer]]
- [[OBJ-CHAR-16 — Character Mechanical Summary]]
- [[MEC-015 — Rules Reference Binding]]
- [[OBJ-CHAR-06 — Character Focus]]

## Handoff

This deferred contract is retained for historical traceability. Do not build a user-facing mechanics back; use the family-aware Mechanics page in [[OBJ-CHAR-06 — Character Focus]] and the shared Entity Builder mechanics block.
