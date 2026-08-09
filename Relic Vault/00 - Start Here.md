---
status: active
authority: primary
scope: universal-router
last_audited: 2026-08-08
---

# Relic: Start Here

This is the mandatory entry point for all Relic work. The vault is a compact policy and product-contract layer; executable behavior is proven in the repository's migrations, tests, routes, types, server actions, Edge Functions, and configuration.

## Read order

1. [[10 - Product Contract]] for user, scope, product language, and MVP exclusions.
2. [[20 - Engineering Contract]] for data, tenancy, authority, AI, retrieval, privacy, and operations invariants.
3. [[30 - Experience Contract]] for Sanctum, Stage, first-run, review, accessibility, and platform behavior.
4. [[40 - Delivery Status]] for the only current delivery position, blockers, and executable evidence pointers.
5. [[45 - Security Findings Register]] whenever a change crosses identity, tenancy, Storage, providers, secrets, telemetry, permissions, or destructive behavior.
6. [[03 - Glossary]] for product language and allowed internal identifiers; [[05 - Deferred Decisions]] for intentionally excluded work.

## Non-negotiable invariants

- Relic is GM software. Its two surfaces are **The Sanctum** (create, organize, prep, review, approve) and **The Stage** (live play). Both are responsive-web MVP surfaces; native Expo is post-alpha.
- The hierarchy is Account → Workspace → World → Saga → Session. Workspace owns billing/usage and future collaboration; World owns shared setting canon; Saga owns active play and session data. Era/Timeframe is backend-ready only.
- AI is GM-invoked except for a visible read-only prep briefing. **The Loom** is the user-facing AI layer. `/guide`, `guide_*`, and `answer_saga_question` are compatibility identifiers, never visible product copy.
- AI output, imported material, transcript text, and raw notes are never canon merely because they exist. Canon changes require direct GM action or the explicit reviewed Approval Queue/GM-direct approval path with provenance and audit.
- The provider has no SQL, arbitrary RPC, service credential, or self-chosen write authority. The server validates registered actions, scope, target/version, cost, confirmation, idempotency, and effects.
- Cross-Workspace, cross-World, and sibling-Saga reads/writes fail closed. Browser roles do not receive broad table mutation authority; scoped RPCs and server actions revalidate hierarchy.
- Stage must preserve GM work through offline/reconnect recovery. It does not run background AI while a session is live. Recording consent, evidence provenance, and explicit End/undo boundaries remain mandatory.
- Never record secrets, credentials, private content, prompts, responses, audio, transcripts, images, vectors, JWTs, or signed URLs in docs, fixtures, telemetry, or browser-visible configuration.

## Current status

Phase G is the active release lane. G1 is complete. G2—the twin real-Loom integrated journeys—is next, but its hosted acceptance is blocked until leaked-password protection is enabled in the hosted Supabase console and a private authenticated web staging deployment exists. See [[40 - Delivery Status]].

Git history is the archive for removed planning and session records. Do not recreate a parallel source map, design-spec layer, or delivery log inside this vault.
