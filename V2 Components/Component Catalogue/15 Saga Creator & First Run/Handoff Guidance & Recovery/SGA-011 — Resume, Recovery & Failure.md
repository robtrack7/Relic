---
id: SGA-011
status: active
kind: behavior
authority: current
system: SYS-15
family: handoff-guidance-recovery
storybook: pattern
platforms:
- web
---

# SGA-011 — Resume, Recovery & Failure

Parent: [[SYS-15 — Saga Creator & First Run]]

## Purpose

Keeps first-run creation safe across interruption, import failure, provider failure, or switching from assisted to manual work.

## Persist

Preserve Saga shell, World/mechanics selection, Desk, Sources, Librarian conversation, Starting World Change Set and Session 1 seed as applicable.

## Resume

Reopen the real Desk, not a wizard. A subtle cue can offer Continue with Librarian / review proposals / continue manually.

## AI failure

Preserve GM input and proposals. Offer Retry or continue manually. Provider failure never makes the Saga unusable.

## Import failure

Successfully stored Sources remain available even if interpretation fails.
