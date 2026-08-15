# Objects, cards and states

Read when building card components, tint systems, imagery, stacks, Ink/Pencil treatments or semantic zoom.

---

## The card family

Cards are physical enough to manipulate but never skeuomorphic:

**index card × museum plate × editorial layout × contemporary software object**

Materials: warm paper, charcoal, restrained orange, occasional photographic surfaces, shallow stacking, strong typography, thin boundaries, generous internal whitespace, modest architectural radius.

**Do not force every object into one identical rectangle.** A Person, a Place, a Thread, a source image and an unfinished Pencil fragment should read as members of one family without being the same component. Differences come from content and maturity, not from decoration.

Suggested distinctions:

| Type | Characteristic treatment |
|---|---|
| Person | Portrait aperture or initial mark; name in sans at `--t-head`; role in mono micro |
| Place | Image-forward; wider aspect; place-name typography allowed larger |
| Faction | Sigil or flat mark; relationship count; slate or tan accent |
| Artifact | Object plate framing; provenance line in mono, always visible |
| Event | Date in mono as the leading element; compact |
| Thread | Linear form; status and movement cue; orange when active |
| Fragment | Least structured — text on paper, no header furniture, often untitled |
| Source | Contact-sheet or document edge; citation in mono |

**Archival cues** — index cards, museum object labels, accession numbers, field notebooks, catalogues, documentary captions, contact sheets — communicate permanence and provenance. They must not become old-paper pastiche.

**Tints.** Cards are user-tintable for personalization and visual clarity. Ship roughly **12 tints derived from the palette** (paper, tan, sage, slate, rust, orange at low saturation, plus neutral steps) — never a rainbow picker. Tint is composition, not semantics: it must never encode truth state.

**Resizing.** Cards are resizable. Content reflows by tier rather than scaling type: at small sizes drop to name + type; at large sizes reveal prose and metadata.

---

## Image cards

Photography can become the card's entire surface. Use strong crops with restrained information overlays. Do not cover images in UI — a small mono caption bar or a corner label is enough.

Presentation modes: full-bleed card, pinned visual reference, edge-to-edge crop, contact-sheet arrangement, image stack, isolated hero image. Typography and controls stay perfectly crisp over any image; if legibility needs help, use a small solid plate rather than a full-surface scrim.

Images are one of the main ways the fictional world suddenly feels tangible. Give them room.

---

## Stacked material

Use stacked sheets for sources, related artifacts, session material, grouped fragments, alternative versions and Prep.

Show **two or three underlying edges** — a few millimetres of offset and a hairline each. No deep fake 3D stacks, no fanned decks, no perspective. Stack top gets `--lift-2`; the rest stay flat. Expanding a stack should spread in place, not open a modal.

---

## Object states

State must be legible without becoming noisy.

### Canonical (Ink)

Crisp, stable, unremarkable. Solid typography, normal surface, hairline edge. The default — it should look like the world simply is this way.

### Pencil / unresolved

Material that has not yet become world truth: speculation, inference, proposals, disputed or unresolved facts.

Treatment: lighter paper, thin dashed or interrupted edge, optional subtle dot-matrix region, marginal or handwritten cue, small `PENCIL` mono label, reduced visual certainty via `--ink-4` body text.

It must read as **provisional, not disabled**. Pencil objects are fully interactive, fully editable, fully searchable, and may remain Pencil indefinitely. Check contrast — provisional must not mean unreadable.

Promotion to Ink is a deliberate act, and provenance stays attached afterwards. Relic must always be able to answer: **why do we believe this?**

### Selected

Structural emphasis, never a glowing border: ink frame, orange registration corners, slightly elevated contrast, exposed connection points, contextual controls appearing nearby.

### Librarian proposal

Shown **in place**, never in a separate review panel: ghost object, orange hairline, provisional connector, subtle patterned fill, diff marker, inline accept / reject / undo. A proposal never silently becomes canonical truth.

### Secondary marks

Registration/calibration and dot-matrix language may appear in extremely small doses — selection corner ticks, indexing marks, crop-like frames, relationship coordinates, dotted separators, provisional-data patterns, uncertainty fields.

**Every mark must communicate something.** Never scatter technical-looking glyphs into empty space for atmosphere.

---

## Semantic zoom

Zoom changes **information**, not just pixel size. Three tiers with hysteresis at the boundaries (±0.05 scale) so cards do not flicker while panning.

### Far — scale < 0.45

Board territories, major clusters, geographic or thematic regions, large Threads, faint relationship structure. Individual cards simplify radically: a tinted block, a type mark, maybe four words. Labels are selective, not universal.

### Mid — 0.45 to 1.4

The primary working scale. Object names, type, important imagery, major relationships, status. This is where a card should look most like itself.

### Near — scale > 1.4

Prose, metadata, annotations, provenance, controls, sources, detailed relationship information.

**Transitions stay continuous.** Cross-fade content tiers over `--m-quick`; never abruptly replace the whole interface at a breakpoint. Keep the object's position and identity anchored through the change — the card is the same card, showing more of itself.
