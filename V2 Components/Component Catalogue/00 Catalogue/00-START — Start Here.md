---
id: 00-START
status: active
kind: reference
authority: invariant
storybook: none
depends_on:
- 00-PRODUCT-LAWS
- 00-CATALOGUE-MAP
- 00-AUTHORITY-POLICY
---

# Relic V2 Catalogue — Start Here

This catalogue is the durable product/design contract used to implement Relic systematically without loading the entire specification into context.

## Read first

- [[00-PRODUCT-LAWS — Product Laws]]
- [[00-CATALOGUE-MAP — Catalogue Map]]
- [[00-AUTHORITY-POLICY — Authority & Change Policy]]
- [[00-REG-SCHEMA — Registry Schema]]
- [[00-GLOSSARY — Canonical Glossary]]

## Working rule

Find the exact component/behavior/domain/platform contract first. Load only its direct `depends_on` context and the relevant Storybook/design family when doing UI work. Inspect the current code before choosing implementation. Do not treat documentation folder boundaries as mandatory code-module boundaries.

## Design workflow

Reusable visual components are designed and manually tested through Storybook. Product systems own semantics; Section 18 owns reusable visual language and reference scenes. Current implementation target is the complete **web** product.

## Change rule

If implementation reveals a materially better product answer, challenge a `current` decision rather than coding around it. Preserve `invariant` laws unless deliberately revisiting the product. Use lightweight documentation sync after implementation only when the contract actually changed.

## Implementation

Use [[SYS-20 — Catalogue Audit & Implementation Plan]] for build sequencing, Storybook/manual testing workflow, context loading, and the future Codex catalogue skill.
