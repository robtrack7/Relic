---
id: IMP-001
status: active
kind: reference
authority: implementation
system: SYS-20
storybook: none
depends_on:
- 00-CATALOGUE-MAP
- 00-REG-SCHEMA
---

# IMP-001 — Context Loading & Dependency Policy

## Goal

Keep Codex/Claude context focused enough that implementation time is spent building rather than re-reading the registry.

## Default retrieval path

`embedded laws/map → exact target → direct depends_on context → relevant design/platform contract only if needed → inspect current code → implement/test`

## Rules

1. Load [[00-PRODUCT-LAWS — Product Laws]] and the compact system/family topology through the skill, not the full catalogue.
2. Resolve the exact target by ID/title/family/Storybook metadata from the generated JSON index.
3. Read the target file before opening its neighbors.
4. Load `depends_on` **once**. Do not recursively load dependencies of dependencies.
5. Do not automatically load the system file merely because `system:` is present; system metadata is routing. Load the system/family packet only when the task changes broader semantics or the atomic file lacks enough local context.
6. Wikilinks are human/concept navigation, not an instruction to crawl.
7. For visual work, load the exact Storybook target plus only the DS contracts it directly consumes.
8. For domain/platform work, load the exact semantic contract plus only the directly relevant Section 19 contract(s).
9. Inspect existing code before choosing architecture. Current code may already satisfy or supersede an implementation suggestion.
10. If context still feels insufficient, search the generated catalogue index for one specific related concept rather than broad-reading a section.

## Dependency meaning

`depends_on` is **context dependency**, not build order, ownership, or code import dependency. It can be mutual. The skill never recursively expands it, so cycles do not create context explosions.

## Context budget rule

Prefer one target + roughly 1–4 direct contracts. A task that genuinely requires an entire system should say why; otherwise narrow the task.
