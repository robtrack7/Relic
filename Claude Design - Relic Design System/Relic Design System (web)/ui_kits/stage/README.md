# UI Kit — The Stage

The Stage is Relic's table-ready companion: dark, fast, high-contrast. Used **live, mid-session**, so every decoration costs milliseconds — and none are paid. Where the Sanctum reflects, the Stage focuses.

This kit is a high-fidelity reconstruction of the Stage surface vocabulary.

## What's in here

- `index.html` — interactive demo of a live session. Click an NPC to "pin" them; click the search row to invoke ⌘K-style lookup; the record dot pulses; transcript ticks in.
- `StageShell.jsx` — the dark surface plate, brand strip, recording bar
- `RosterRow.jsx` — present/referenced NPCs as ink-card tiles with amber left-rule when pinned
- `QuickLookup.jsx` — single-line search row, ⌘K affordance
- `Transcript.jsx` — read-only transcript ticker (mono, faded timestamps)
- `RulesPeek.jsx` — slide-in panel for rules / lore lookups

## How to use

Open `index.html` directly. JSX is transpiled in-browser; no build.

## What it does **not** include

- A real microphone capture loop. The "Recording" pill is decorative; the transcript is a scripted ticker.
- Multi-player / spectator views. Stage is single-screen GM.
- A character-sheet surface. Stage prioritises NPCs, lookups, and the transcript over rules-engine UI.
