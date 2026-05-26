# Relic — Design System

> Relic is the GM's continuity engine: a calm, structured workspace that turns scattered worldbuilding, session prep, live play, and post-session review into one clear creative loop.

At the heart of Relic, the app helps Game Masters **build the myth, run the table, and keep the thread.** AI handles administrative mess; canon stays under the GM's control.

The product has two faces that share one design language:

- **The Sanctum** — the parchment-light reflective workspace. Home, worldbuilding, session prep, entity library, post-session review.
- **The Stage** — the dark, focused, high-contrast surface used live at the table. Strips back; every decoration costs milliseconds.

This system is the connective tissue between them: editorial restraint, warm-not-cold neutrals, amber-as-structure, two typographic voices.

---

## Sources

The visual identity in this project was distilled from a single canonical source:

- `uploads/14 - Design System Source.html` — Relic v0.3 design system specimen (May 2026). Contains the colour palette, type scale, components, mode surfaces, thread-state chips, and design principles. Treat this as the source of truth; everything in this project derives from it.

No codebase, Figma, or screenshots were provided beyond that file. UI kits in this project are **reconstructed from the design source** — they reproduce the visual vocabulary faithfully but are not copies of production code (none exists in the inputs).

---

## Index

Root files:

- `README.md` — this file
- `SKILL.md` — agent-skill manifest (drop-in for Claude Code)
- `colors_and_type.css` — CSS custom properties + semantic type classes. Import this and wrap content in `.relic-root` to inherit Relic.
- `assets/` — logos, brand marks, the wordmark
- `preview/` — design system specimen cards (rendered in the Design System tab)
- `ui_kits/` — interactive UI kit reconstructions
  - `sanctum/` — The Sanctum (light, reflective): threads, entities, sessions, review
  - `stage/` — The Stage (dark, table-ready): live session surface
- `fonts/` — see *Type* below; Relic uses Google Fonts for now

---

## Content fundamentals

Relic's voice is **literary, restrained, and deferential.** The product behaves like a careful editor sitting beside a creative author — never the author itself.

**Tone**
- Calm and editorial. Sentences are short, never breathless. No marketing energy.
- Slightly literary. "Recover the stolen deed before House Kael brokers the sale." "Speaks with a slight lisp and carries a map he refuses to show anyone."
- Deferential about AI: it **suggests, drafts, proposes.** Never silent, never automatic. The GM is the author; Relic is the scribe. Example CTAs in the source: "Commit to Canon", "Publish Recap", "Save Draft", "Approve / Edit / Reject".

**Casing**
- Sentence case for body and most UI ("Commit to Canon", "Save Draft" are the exceptions — these read as proper-noun rituals).
- Mono uppercase for eyebrows, labels, status chips, section labels: `NPC · ANTAGONIST · REVEALED`, `SESSION 14 · ACTIVE`.
- Display serif (Cormorant) for proper nouns of the world: NPCs, locations, factions, quests, sagas.

**Person**
- Second person for direct instructions to the GM ("Recover the deed", "Tap any marker for tooltip").
- Third person for canon and entity descriptions ("She doesn't make it out of the alley", "Frequents the Drowning Rat tavern").
- First person is reserved for in-character quoted transcript: `01:23:45 → "He is actually an informant for the Crown..."`

**Emoji**
- **No emoji.** Status uses small unicode shapes only: `◆` active, `◈` loose, `○` dormant, `✓` resolved, `✦` ornamental rule, `↳` linkage, `→` diff arrow, `⌘` keyboard glyph.

**Specifics — copy patterns that recur**
- Approval queue diffs: `Status: Alive → Deceased — killed during the ambush at the eastern gate.`
- Transcript sources: `Transcript · 01:23:45 — "She doesn't make it out of the alley"`
- Meta lines: `Last updated · Session 12 · 3 days ago`
- Session status: `Session 15 · Prepping`, `Session 14 · Recording`, `Session 14 · In progress`
- Eyebrows on cards: `NPC · Merchant`, `Location · Tavern`, `Quest · Active`, `Faction · Antagonist`

**Vibe**
> "A modern field journal for storytellers." Parchment paper, ink, a steady hand, no flourishes. The product is quietly magical — it knows things, but it whispers them.

---

## Visual foundations

**Ground / surfaces.** The page lives on **Parchment `#EFEBE4`** — a warm, slightly creamy off-white that reads as old paper. Cards sit on **Cream `#F7F4EF`** (a half-step lighter than parchment, so cards lift gently rather than punching out). The Stage flips entirely: **Ink `#1A1916`** ground, near-black, with a `rgba(255,255,255,0.04)` translucent card. Cream is *not* a mode differentiator — session prep lives inside Sanctum, marked by an **amber left-rule** on its CTAs, not a separate surface.

**Texture.** A very subtle SVG turbulence noise (`.relic-grain`) is overlaid fixed across the viewport at `opacity: 0.025`, giving everything a faint paper tooth. Never aggressive — you should only notice it when you look for it. No gradients, no patterns, no illustrations layered behind UI.

**Colour vibe.** Warm, low-saturation, **never cool or screen-y.** Stone neutrals run from `#1A1916` ink through `#38342E → #6A6258 → #9C9389 → #C6BEB3 → #E4DDD4` to parchment. Accents are a tight set: **Amber `#B8702A`** is the only structural accent, used to mark canon, prep CTAs, and the brand wordmark's final letter. **Rust `#8A3828`** is for destructive/loss-of-canon (deceased, delete). **Verdigris `#2F6B6E`** (formerly Sage) is for resolved/positive-progress (approved, revealed, active threads) — chosen as a teal-leaning patina rather than green so its dim form stays distinguishable from Amber dim under red-green colour-vision deficiency. Faction accents (slate-blue, violet) appear only as 8px card left rules, never as fills.

**Type.** Three families, never more.
- **Cormorant Garamond** (display serif) carries the names of the world: NPCs, locations, quests, panel titles. 60/40/28px scale. Italic 28px for descriptions and pull quotes.
- **Instrument Sans** (UI sans) carries every interface chrome: buttons, body copy, headings, form labels. 17/15/13px scale.
- **DM Mono** carries metadata: eyebrows, labels, timestamps, status chips. Always 9–12px, always with `letter-spacing: 0.12em–0.22em`, almost always uppercase.

The two voices **never compete.** Display serif for the diegetic world; sans for everything the GM does to manage it.

**Spacing.** 4px base unit. Scale: 4/8/12/16/20/24/32/40/48/64/80/96. Layout breathes — sections are separated by `--space-24` (96px), cards by `--space-4` (16px). Whitespace is not empty; it is breathing room for the GM's imagination (Principle 01).

**Backgrounds & imagery.** No hero photography, no illustrations, no decorative SVG. Backgrounds are flat parchment, flat ink, or flat cream. The only "imagery" the system uses is unicode ornament glyphs (`✦`) on rule dividers. Imagery, where it exists in product (NPC portraits, etc.), would be warm, slightly desaturated, with film grain — like old book plates. Never glossy, never neon.

**Borders.** `1px solid var(--stone-300)` is the workhorse — visible but quiet. Nested elements drop to `var(--stone-100)`. The Stage uses `rgba(255,255,255,0.08)` (translucent white) for the same purpose. Entity cards carry a **3px-wide vertical left rule** (`::before` element) in the entity's category colour — this is the system's only "decoration" and it carries real meaning (NPC=amber, Location=slate-blue, Quest=sage, Faction=violet).

**Shadows.** Two tiers, both very soft and warm-toned (rgba ink, not black):
- `--shadow-card` — `0 1px 2px rgba(26,25,22,0.06), 0 3px 12px rgba(26,25,22,0.05)` (resting cards)
- `--shadow-elevated` — `0 2px 6px rgba(26,25,22,0.08), 0 8px 28px rgba(26,25,22,0.07)` (hover, header, modal)

No inner shadows. No glow. No coloured shadow. The Stage uses a single darker shadow for the whole surface plate.

**Radii.** Restrained.
- `--radius-sm: 2px` — chips, badges, swatch labels
- `--radius-md: 4px` — buttons, inputs, small cards
- `--radius-lg: 8px` — large cards, panels, the Stage surface
- Never 12px+. Never fully rounded except avatars (50%) and pills (20px for nav session chips).

**Cards.** Cream surface, `1px solid stone-300` border, `8px` radius, `--shadow-card` resting, `--shadow-elevated` on hover plus `translateY(-1px)` and a darkened border. Entity cards add the 3px category-coloured left rule. The session-prep card variant uses a 4px amber left rule.

**Buttons.** Six variants, all `--radius-md`, all 13px Instrument Sans 500.
- **Primary (Ink)** — `bg: ink, fg: cream`. The default commit action. Hover → `stone-900`.
- **Amber** — `bg: amber, fg: white`. Reserved for "Commit to Canon" and prep CTAs. Hover → `amber-light`.
- **Secondary** — transparent, `1px solid stone-300` border, ink text. Hover → `bg: stone-100, border: stone-500`.
- **Ghost** — transparent, no border, `stone-700` text. Hover → `bg: stone-100, fg: ink`.
- **Rust** — transparent, `1px solid rgba(rust, 0.25)`, rust text. For destructive. Hover → `bg: rgba(rust, 0.06)`.
- **Icon** — square, transparent, bordered, holds a single glyph.

**Transitions.** `transition: all 0.12s ease`. Fast, no bounces, no spring physics. Cards lift `-1px` on hover; that is the maximum motion the language allows in the Sanctum. The Stage has one animated element: a pulsing record dot (`opacity 1 → 0.3` over 1.4s).

**Hover / press states.** Hover darkens (primary → stone-900), lightens (amber → amber-light), or tints background (ghost/secondary → stone-100). Press doesn't shrink — it doesn't need to; the system is too restrained to need haptic-feeling feedback.

**Focus.** Inputs glow `0 0 0 3px var(--amber-dim)` and shift border to amber. This is the only place amber appears as an aura.

**Transparency & blur.** Used only on The Stage (`rgba(255,255,255,0.04–0.10)` for nested cards on ink) and in a faint translucent tag on the dark nav (`rgba(184,112,42,0.15)` for the session pill). No backdrop blur. The product is paper, not glass.

**Layout rules.** 1100px max content width, centered. Generous side padding (32px+). Sections are clearly delineated by mono section labels (`SECTION LABEL` 10px uppercase, amber underscore prefix). Two-column grids collapse to one column below 680px. Fixed elements are rare — only the Stage nav is sticky.

**Iconography.** Minimal. See *Iconography* below — Relic prefers unicode glyphs and small geometric shapes over an icon set.

---

## Iconography

Relic has **no production icon set in the source**. The visual language deliberately avoids the typical SaaS icon-stripe; the product reads as a journal, not a dashboard.

What it uses instead:

- **Unicode glyphs as functional icons.** `◆ ◈ ○ ✓` (thread states), `✦` (ornamental rule divider), `↳` (input-hint linkage arrow), `→` (diff arrow), `↗` (external link), `⌘ ⏎ K` (keyboard glyphs). All set in **DM Mono** so they sit in the same rhythm as labels.
- **Geometric shapes drawn in CSS** for status: a 4px `::before` dot inside badges (`currentColor`, `opacity: 0.6`); a 3px vertical left rule on cards; a 6px pulsing dot in the Stage record button.
- **Type as iconography.** The wordmark uses serif-`c`-in-amber as the brand mark itself; there is no separate symbol. See `assets/wordmark.svg` and the *brand wordmark* preview card.

**Substitution for design work in this kit:** When an interface genuinely needs UI icons (kebab menus, close, chevron, search), use **Lucide** (`https://unpkg.com/lucide@latest`) at `stroke-width: 1.5`, `stone-700` colour, 16–18px. Lucide's editorial weight matches the Instrument Sans body, and the thin stroke keeps the type-first hierarchy intact. **Flag this substitution to the user** — it is a stand-in until a bespoke icon set ships.

**No emoji.** Anywhere. Ever.

**No png icons.** Ever — all icons are unicode, CSS shape, or thin-stroke SVG.

---

## Font substitution note

The source HTML loads the full Cormorant Garamond, Instrument Sans, and DM Mono families from Google Fonts directly — there are no local `.ttf`/`.woff2` files to copy. `colors_and_type.css` keeps that Google Fonts import so the system is portable. **If you need offline-bundled fonts, ask for the originals** — they were not provided in the source.

---

## Caveats

- No real product screenshots, codebase, or Figma files were supplied, only the design specimen HTML. UI kit screens are faithful reconstructions of the specimen's vocabulary, not pixel-perfect copies of a shipping product.
- Iconography is unicode-first by design — no SVG icon library was supplied, so Lucide is documented as the recommended stand-in.
- Cormorant, Instrument Sans, and DM Mono are loaded over the network from Google Fonts. No local font files are bundled.
