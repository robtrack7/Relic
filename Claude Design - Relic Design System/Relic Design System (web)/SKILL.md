---
name: relic-design
description: Use this skill to generate well-branded interfaces and assets for Relic, the GM's continuity engine for tabletop role-playing games — either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping the Sanctum (light, editorial) and the Stage (dark, table-ready) surfaces.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

Key files:

- `README.md` — full design system: brand, voice, content fundamentals, visual foundations, iconography.
- `colors_and_type.css` — drop-in CSS custom properties + semantic type classes. Wrap content in `.relic-root` to inherit Relic.
- `assets/` — wordmark and brand assets.
- `preview/` — small specimen cards (logos, swatches, components) — useful as visual reference.
- `ui_kits/sanctum/` — light reflective workspace (web app). Components: Header, Threads, Entities, Sessions, Review, SearchPalette.
- `ui_kits/stage/` — dark table-ready session surface. Components: StageShell, RosterRow, QuickLookup, Transcript, RulesPeek, ToneStrip.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out of this skill folder and create static HTML files for the user to view. Reference the design tokens (colours, type families, spacing, shadows, radii) defined in `colors_and_type.css`.

If working on production code, copy assets and read the rules in `README.md` to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions (audience, surface — Sanctum or Stage, fidelity, variations), and act as an expert designer who outputs HTML artifacts or production code, depending on the need.

## Non-negotiables for Relic

- **Two faces, one language.** The Sanctum is parchment-light and editorial. The Stage is ink-dark and high-contrast. Don't mix them on a single screen unless deliberately bridging modes.
- **Three fonts, never more.** Cormorant Garamond (display serif — names of the world), Instrument Sans (UI), DM Mono (metadata, labels, timestamps).
- **Amber is structural, not decorative.** It marks canon, prep CTAs, and the brand `c`. Don't sprinkle it as accent colour everywhere.
- **No emoji. No png icons.** Use unicode glyphs (`◆ ◈ ○ ✓ ✦ ↳ →`) or thin-stroke SVG (Lucide-shape) only.
- **The Stage strips back.** Dark, fast. Every decoration costs milliseconds. Pulse only on the record dot — nothing else animates.
- **The GM is the author.** UI language is deferential. "Suggest", "draft", "propose", "commit to canon". Never silent, never automatic.
