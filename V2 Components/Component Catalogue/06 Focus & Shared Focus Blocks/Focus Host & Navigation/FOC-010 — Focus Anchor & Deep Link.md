---
id: FOC-010
status: active
kind: behavior
authority: current
system: SYS-06
family: focus-host-navigation
storybook: pattern
depends_on:
- FOC-006
- FOC-011
- MEC-015
- DS-FOC
platforms:
- web
---

# FOC-010 — Focus Anchor & Deep Link

Parent: [[FOC-001 — Focus Host]]

## Purpose

Allows Focus surfaces and specific semantic sections/items to be addressed directly for navigation, Search, Librarian, Chronicle, Review, and rules-reference workflows.

## Addressable targets

Examples:
- Character → Knowledge;
- Character → Mechanics;
- Character → Mechanics → specific ability;
- Place → Event History;
- Artifact → Sources;
- Source → cited passage.

A deep link can also carry an as-of story position where the target is temporal.

## Behaviour

Opening a deep link:
1. resolves persistent World Object identity;
2. opens the correct family Focus;
3. applies story-position context if supplied;
4. scrolls/focuses the declared section/item;
5. preserves a valid return context where the link originated inside Relic.

Browser reload of a valid deep link should reconstruct a safe Focus state.

## Relationships

- [[FOC-006 — Focus Section Navigator]] — section navigation.
- [[FOC-011 — Focus Temporal Context]] — as-of links.
- Search/Librarian/Review/Chronicle — common link producers.
- [[MEC-015 — Rules Reference Binding]] — mechanics-specific external/deep reference counterpart.

## Handoff

Implement **FOC-010 — Focus Anchor & Deep Link** as stable addressability for Focus objects, sections, and meaningful nested items.
