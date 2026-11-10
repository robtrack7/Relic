---
id: PLT-001
status: active
kind: platform
authority: current
system: SYS-19
family: core-domain-security
storybook: none
---

# PLT-001 — Runtime Repository & Contract Boundaries

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Separates application, domain, AI, persistence and offline contracts so production code does not collapse every representation into one shared type system.

## Logical boundaries

The repository should make these concepts independently legible:
- web application;
- future mobile application adapter (not a current web-build dependency);
- shared domain contracts/validation;
- mechanics contracts/templates;
- AI task/tool schemas;
- design-system implementation;
- Supabase migrations/functions/tests;
- LiteLLM/provider configuration.

Exact folder names are flexible.

## Type boundaries

Keep distinct:
1. generated database row types;
2. domain models;
3. runtime validation schemas;
4. AI structured-input/output/tool schemas;
5. local/offline persistence representations (current web adapter plus future platform adapters).

Transform between them explicitly where needed. Do not make one enormous type file imply these layers are identical.

## Read/write boundary

Simple authorized reads may use Supabase directly through RLS.

Complex read models may use RLS-safe views or narrowly-scoped RPCs.

Meaningful semantic writes should flow through a small domain mutation layer rather than arbitrary feature components updating related tables independently.

## UI boundary

Do not create persistence simply because a UI concept exists.

Avoid screen-mirroring tables such as:
- `focus_blocks` merely because Focus renders blocks;
- `chronicle_rows` merely because Chronicle displays entries;
- `settlement_canvas_cards` merely because Settlement shows a Canvas preview.

Persist domain meaning; derive screen representations.

## Flexibility

Repository layout and service decomposition may evolve. The stable requirement is clear ownership between domain semantics, persistence, AI contracts and local/offline state.

## Handoff

Implement the minimum architectural seams needed to prevent cross-layer coupling before feature implementation scales.
