---
id: PUB-008
status: deferred
kind: domain
authority: current
system: SYS-16
family: player-experience
storybook: none
---

# PUB-008 — Permission-Safe Search & Retrieval

Parent: [[SYS-16 — Player Publication & Permissions]]

## Purpose

Ensures future player Search and retrieval operate only over material the player is authorized to access.

## Security rule

Filtering happens **before or within retrieval at the data-access layer**.

Correct conceptual flow:
`Player request → RLS-permitted corpus → Search/retrieval → result`

Forbidden conceptual flow:
`retrieve GM corpus → ask UI/model not to reveal secrets`

## Search

Player Search should reuse the Search architecture but query only the player's authorized published projection.

Do not expose hidden object names, excerpts, counts or metadata through ranking or autocomplete.

## Embeddings / semantic retrieval

Future embeddings/retrieval indexes must preserve the same authorization boundary.

Do not create an embedding corpus that allows player requests to retrieve chunks from GM-private content.

## Player Librarian

A player-facing Librarian/Ask experience is deferred beyond the first player release.

If added later, it must consume this permission-safe retrieval path rather than receiving GM context with prompt-level secrecy instructions.

## Handoff

Section 19 must preserve RLS-compatible retrieval/indexing architecture so this can be implemented safely later.
