---
name: Relic
description: A living research desk for creating, exploring, and running fictional worlds.
colors:
  paper-deep: "#EAE7E0"
  paper: "#F7F4EF"
  card: "#FBF9F4"
  card-raised: "#FFFDF9"
  canvas-surface: "#FFFEFA"
  chrome-surface: "#FAF8F4"
  chrome-hover: "#E7E0D8"
  carriage-surface: "#EFE8E4"
  carriage-context: "#F3EEEA"
  ink: "#1A1916"
  ink-quiet: "#57514A"
  ink-faint: "#70695F"
  rule: "#DDD6C7"
  rule-strong: "#C8C0AE"
  chrome-rule: "#E1DAD1"
  selection-orange: "#FF6D1F"
  selection-wash: "rgba(255, 109, 31, 0.10)"
  selection-edge: "rgba(255, 109, 31, 0.38)"
  workflow-accent: "#B8702A"
  workflow-ink: "#995A21"
  status-ready: "#496640"
  destructive: "#8A3828"
  tint-sand: "#F4ECDC"
  tint-sage: "#EDF0E7"
  tint-slate: "#EAF0F2"
  tint-rose: "#F4E9E5"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.018em"
  card-title:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  section-title:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.2
  fragment:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "25px"
    fontWeight: 500
    lineHeight: 1.28
  body:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  card-body:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  focus-prose:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  editor-body:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  ui:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.055em"
  meta:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.45
  stat-value:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.1
rounded:
  hairline: "2px"
  sm: "6px"
  control: "8px"
  inset: "12px"
  card: "14px"
  surface: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  workspace-edge: "20px"
  touch-target: "44px"
components:
  button-primary:
    backgroundColor: "{colors.workflow-ink}"
    textColor: "{colors.card-raised}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.chrome-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-quiet}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  button-destructive:
    backgroundColor: "transparent"
    textColor: "{colors.destructive}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    height: "44px"
  icon-button:
    backgroundColor: "{colors.chrome-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "44px"
  search-trigger:
    backgroundColor: "{colors.chrome-surface}"
    textColor: "{colors.ink-quiet}"
    typography: "{typography.ui}"
    rounded: "{rounded.inset}"
    padding: "0 16px"
    height: "44px"
  text-field:
    backgroundColor: "{colors.card-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  object-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  carriage:
    backgroundColor: "{colors.carriage-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  focus-surface:
    backgroundColor: "{colors.card-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  builder-surface:
    backgroundColor: "{colors.card-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  floating-surface:
    backgroundColor: "{colors.chrome-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
  nav-destination:
    backgroundColor: "{colors.chrome-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "48px"
---

# Design System: Relic

## Overview

**Creative North Star: The Living Research Desk.** Relic is a contemporary spatial workbench holding an accumulated fictional world: portraits, field notes, places, fragments, sources, relationships and unfinished ideas. It feels editorial, tactile, personal and quietly cinematic—not like a fantasy-themed dashboard or an administrative database.

The archival quality belongs to the world material, while the software remains precise and responsive. A GM should be able to explore slowly during preparation and retrieve important information quickly during play. The design concepts establish composition and ambition; the canonical catalogue governs domain semantics and interaction contracts.

**Key characteristics**
- Warm mineral paper, near-black ink, fine rules and rich world imagery.
- Asymmetric spatial composition and restrained floating controls.
- Literary type for the fictional world; clean sans for the instruments around it.
- Calm, useful information density rather than empty expanses or microtype.
- Continuous transitions between Card, Focus and Builder without losing context.

## Colors

The interface is deliberately quiet. Paper shades define depth; imagery and world material provide atmosphere. Accent colors communicate a small number of specific actions and states.

### Foundation
- **Paper / Canvas** (`paper`, `canvas-surface`): the primary spatial field; a faint dot grid may support orientation.
- **Card Stock** (`card`, `card-raised`): resting and actively handled World Object representations.
- **Chrome Paper** (`chrome-surface`, `chrome-hover`): toolbars, menus, search and floating controls.
- **Carriage Linen** (`carriage-surface`, `carriage-context`): Stage, Prepare and Librarian surfaces.
- **Ink and Rules** (`ink`, `ink-quiet`, `ink-faint`, `rule`, `chrome-rule`): hierarchy through contrast, not more boxes.

### Signals
- **Workflow Amber** (`workflow-accent`, `workflow-ink`): primary actions, workflow identity and restrained emphasis; use the darker ink for text or filled buttons.
- **Selection Orange** (`selection-orange`, `selection-wash`, `selection-edge`): direct selection, active manipulation and focus indicators. Use sparingly.
- **Ready Sage** (`status-ready`): bounded readiness/status contexts, always paired with a noncolor cue.
- **Destructive Rust** (`destructive`): destructive operations, never a decorative accent.
- **Paper Tints** (`tint-*`): optional personal or organizational treatments, not implicit narrative facts.

### Lamplit (low light)
Live play happens in dim rooms. **Lamplit** is the same world by lamplight: warm umber surfaces (`paper` #1a1612, `card` #24201b), parchment ink held near 11:1 (`ink` #e4d9c6) so text does not halate, and a lighter amber (`workflow-ink` #e2a868) that stays the only workflow colour. Text on filled workflow surfaces uses `on-workflow`, which turns dark under Lamplit. Pictures are lowered slightly so they do not glare. Lamplit follows the system dark preference unless the GM chooses Daylight or Lamplit in Settings; it is applied before first paint. Every token pair holds WCAG AA on every Lamplit surface. Components never hard-code daylight literals; they read tokens.

**The Distinct Signals Rule.** Amber indicates a workflow/action; orange indicates selected or actively manipulated context. Do not use either as general decoration. Validate contrast on every surface.

**The Separate States Rule.** Pencil/Ink indicate content maturity; Proposed/Pending/Settled indicate authority and truth workflow; publication is separate again. No color, border or label should silently equate these dimensions. Evidence and provenance retain their own clear presentation.

## Typography

### The two voices

**World voice:** Cormorant Garamond for names, short headings and expressive Fragments; Newsreader, a self-hosted reading serif with optical sizes, for lore, summaries, rules text and longer prose. Cormorant is a display face: never set running prose in it. Both families ship every weight and true italics, so nothing is synthesized by the browser. **Instrument voice:** Instrument Sans for controls, inputs, labels and mechanics keys. Mono appears only where alignment or technical provenance requires it.

The frontmatter defines the default type roles, and their values are intentionally compact. Do not replace the entire interface with oversized text. Use contrast, line height, grouping and progressive disclosure to keep the compact scale functional.

### Type hierarchy
- **Display, 34px:** major Focus/Builder identity; do not use as a repeated section heading.
- **Headline, 23px:** carriage and surface-level headings.
- **Card Title, 23px:** principal World Object name on a standard card.
- **Section Title, 19px:** meaningful sections within Focus or Builder.
- **Fragment, 25px:** short, expressive captured prose where content invites a display treatment.
- **Body and Card Body, 13px:** compact narrative summaries, descriptive material and supporting details.
- **Focus Prose, 14px:** an exception for Focus, which is read at arm's length during play.
- **Editor Body, 16px:** an exception for sustained authoring in Builder, held to a 62–70ch measure.
- **UI, 13px:** buttons, search, menus and working controls.
- **Label / Meta, 11px:** genuinely subordinate category, provenance and structural labels—not primary instructions. 11px is the legibility floor for functional text; nothing smaller carries meaning.
- **Stat Value, 28px:** a limited number of important mechanics figures, not every numeric field.

### Reading rules

**The Scale Rule.** Size tokens are default roles, not a command to make every object fit one fixed height. Use 12px body text where it works; if important text becomes hard to read, change composition or disclosure before shrinking it further. In sustained long-form content, test whether the editor requires a larger user-adjustable reading scale.

**The Canvas Zoom Rule.** At distant zoom levels, hide secondary text or project a simpler representation instead of rendering unreadable detail. Inspect text at actual application size and normal browser zoom—not only in enlarged isolated stories.

**The Mechanics Rule.** Stats and rules text must be quickly scannable. Labels, values, actions and descriptions have distinct typographic roles. Practical grouping and information density outrank decorative number grids or enormous whitespace; the active ruleset determines what is important.

Avoid fantasy display fonts, gratuitous all-caps, and very low contrast metadata. Use tabular numbers for aligned stats and counts.

## Layout

### The Desk and application shell

The Desk is an open plane populated by asymmetric clusters, not a dashboard grid. Global search and the main tool dock remain quiet and viewport-anchored. Canvas state and coordinates do not shift when standard desktop carriages or Focus open.

On regular desktop, carriages are persistent non-modal overlays over the Canvas. On constrained desktop/tablet widths, use the established intentional shared or resizable split arrangements. The global header and search stay stable; Stack scrolls beneath persistent chrome. Controls near an open carriage may avoid occlusion without changing world coordinates.

The bottom-centred Canvas controls are Select/Pan, Create, Compose and Connect. Menus normally anchor to and align with their triggers, with collision handling at viewport edges. The navigation rail offers destinations, not duplicate Canvas actions.

### Three depths of World Object interaction

**Card:** a tactile spatial object providing identity and atmosphere at a glance. **Expanded Card:** a richer on-Canvas representation, not a miniature editor. **Focus:** deep, quickly scannable inspection and contextual editing while keeping the surrounding world perceptible. **Entity Builder:** sustained authoring with flexible structured blocks, rich text and media, without repetitive form chrome.

Preserve identity, context and continuity between these depths. Avoid simply scaling one layout up and down. Family-specific compositions are deliberate: Place is image-led and often full-bleed; Character balances portrait and identity; Fragment privileges quick capture; Source shows evidence and provenance; Thread expresses evolving narrative concerns.

### Hierarchy within Focus and Builder

Focus should put the object's image/identity, immediately useful facts and high-value navigation before supporting metadata and long history. Use meaningful sections, locally persistent navigation or progressive disclosure to keep essentials reachable without an endless scroll.

Builder should be a calm writing environment with sufficient reading width, direct manipulation, contextual formatting, and clear structure. Editing should feel natural, not like expanding successive database forms. Mechanics, references and notes can be deep without constantly crowding the primary writing flow.

## Elevation & Depth

Depth feels like matte material on a desk. Use fine rules, small tonal steps and soft, warm shadows; avoid glass, glossy chrome, dramatic blurs and faux antique paper.

### Depth hierarchy
- **Field:** Canvas/Desk, with minimal texture.
- **World Material:** cards, notes, image stacks and collections; gentle lift signals manipulability.
- **Working Chrome:** floating tools, menus, carriages, Focus and Builder; clearly above the field without appearing to be a separate application.

**The Motion Rule.** Card selection, drag, lift, stacking, expansion, Focus transitions and closing should preserve a visible sense of origin and destination. Use restrained, interruptible motion. Duration depends on travel distance and component weight; do not mandate one timing for every transition. Honor `prefers-reduced-motion` and the application's reduced-motion setting.

**The Spatial Truth Rule.** Animation cannot disguise a camera reset, change object coordinates, or create apparent semantic relationships from mere spatial arrangement.

## Shapes

Use a small, repeatable radius vocabulary: 6px small, 8px control, 12px inset, 14px card and 24px large surface, with fully rounded circles and carriage capsules. These are starting tokens, not a mandate that all nested panels have identical proportions.

- **Controls:** consistent hit areas and optical icon centering; circular where the tool vocabulary calls for circles.
- **Cards:** family-specific crop, edge, and material treatment, without obligatory header/footer strips.
- **Carriages / Focus:** soft outer geometry with coherent inner spacing and section treatment.
- **Selection:** a precise visible frame or registration marks; no glowing aura.

Pencil and Ink maturity may use legible, differentiated edge treatments, but those cues must not be interpreted as Settled/Pending truth. Use explicitly labeled proposal/authority cues where needed; don't reuse a maturity treatment as a proposal marker.

## Components

### Buttons and controls

Keep buttons, icon controls, toggles, search, menus, tooltips and inputs consistent in scale, optical alignment, focus response and placement. The normal minimum interactive target is 44px where practical, including a hit area around a visually smaller icon. Tooltips should never be the only means of discovering an essential destination.

Primary actions use Workflow Ink, secondary controls use Chrome Paper, destructive actions use Rust, and selection uses Orange. Menus/panels anchor to the originating control with intelligent collision handling. All controls require keyboard focus and meaningful disabled/loading states.

### World Object cards and collections

The shared card system owns identity, selection, maturity treatment, dragging, disclosure and contextual actions; families own their content hierarchy. Favor strong imagery and believable fictional content rather than treating cards as standardized form summaries. A Place image should be full bleed to the top when this best communicates its character; details belong in Expanded Card and Focus.

Stacks, piles, folders and trays are spatial organization, not semantic Relationships. Their layering and transitions should feel tactile, legible and reversible. Avoid creating six parallel abstractions merely because six concept images exist.

### Focus

Focus is an information-rich reading and working surface, not a long field editor. Prioritize identity, current state, important relationships and mechanics, followed by deeper evidence, history and notes. Keep Back/Forward and cross-object navigation accessible; preserve Story Position and the original workspace context where applicable. Use contextual editing rather than rows of permanent Edit/Revise buttons.

### Entity Builder

Use a clean document-first structure: rich writing, structured information, imagery, mechanics and flexible blocks, with contextual tools and unobtrusive save/feedback states. The user and future Librarian should work through the same validated domain operations. Avoid inventing a parallel AI editor or speculative backend requirements.

### Mechanics

Mechanics are functional tabletop reference material, not an abstract statistical illustration. Make the most important values and actions visible; group secondary details clearly. The flipped Expanded Card, Focus and Builder can have distinct representations of the same ruleset-aware data. Do not assume D&D rules are universally applicable.

### Carriages and navigation

Stage, Prepare and Librarian share a visual shell but retain separate identities. Their headers and collapse actions mirror across the Canvas. The Librarian composer stays available at the bottom of its carriage. Opening surfaces does not silently change Canvas state or remove deliberate Focus.

## Do's and Don'ts

### Do
- Let world imagery and writing carry atmosphere; keep interface chrome quiet.
- Preserve the compact type system, but test actual readability and allow appropriate adaptation.
- Make Cards, Focus and Builder distinctly useful, with consistent identity and motion.
- Ensure mechanics are scan-friendly and editing is immediate and forgiving.
- Maintain clear separate cues for maturity, authority, and publication.
- Verify integrated layout, focus handling, contrast, motion and responsiveness in Storybook and the running application.

### Don't
- Use generic SaaS cards, fantasy ornament, decorative AI sparkles, faux parchment or permanent graph wallpaper.
- Force every World Object into identical header/body/footer geometry.
- Shrink essential information below the intended type roles to satisfy fixed component sizes.
- Treat Pencil as Pending, Ink as Settled, or spatial proximity as a Relationship.
- Fill Focus or Builder with repeated form furniture and redundant action labels.
- Make one rigid animation timing or pixel dimension govern every state.

These rules define the shared visual direction, not complete surface specifications. The catalogue remains authoritative for product semantics. Reconcile token changes with the working UI, then use Impeccable's documentation workflow to record accepted design decisions.
