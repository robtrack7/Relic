# Canvas and motion

Read when implementing pan/zoom, selection mechanics, drag, connectors, or any animation.

---

## Canvas feel

The canvas is the product's handshake. It should feel excellent under the hand before it looks impressive in a demo.

Required qualities: buttery pan, **cursor-anchored zoom**, controlled inertia, immediate interruption, excellent trackpad behaviour, predictable scaling, continuity through Focus and view changes.

Suggested parameters — tune by feel, keep the relationships:

- Scale range `0.08 – 4.0`; semantic tiers at `< 0.45` / `0.45–1.4` / `> 1.4` with ±0.05 hysteresis.
- Wheel and pinch zoom anchor on the pointer, never on viewport centre. Solve for the world point under the cursor and hold it fixed.
- Trackpad two-finger scroll pans; ⌘/ctrl + scroll zooms. Respect `deltaMode` and normalize wheel deltas across browsers.
- Momentum decay around `0.92` per frame, cutoff below `0.15 px/frame`. **Any pointerdown kills momentum instantly** — no waiting out a glide.
- Snap arrangement to an 8px world grid; hold a modifier to bypass.
- Keyboard: arrows nudge 8px, shift+arrows 1px, `0` zoom-to-fit, `1` reset to 100%, `f` focus selection, `⌘K` palette.

Spatial navigation must never require remembering where something was left — search always retrieves.

---

## Implementation notes

- **One transformed layer.** Apply a single `translate3d(x, y, 0) scale(s)` to a container rather than positioning each card in screen space. Keeps card DOM stable and lets the compositor do the work.
- **Virtualize** cards outside the viewport plus a margin of roughly one screen. Mount by tier: far-tier cards are cheap blocks, near-tier cards are full components.
- **Pointer Events only** — `pointerdown/move/up` with `setPointerCapture`. Never mouse events; pen and touch must behave identically.
- **Batch to rAF.** Coalesce pointer moves, write transforms once per frame, never read layout during a drag.
- **Hit-test in world space** with a spatial index (quadtree or grid buckets) rather than DOM hit-testing at scale.
- **Connectors** render in one SVG layer sharing the same transform. Only draw the visible neighbourhood.
- Use `contain: layout paint` on cards and avoid animating anything but `transform` and `opacity`.
- **Persist viewport per Board** — returning to a Board should return to where the GM was looking.

---

## Motion discipline

Canvas motion is inertial and physical. **Everything else is quiet.**

Use short motion primarily for selection, focus continuity, disclosure, stack movement, object creation and state change. Cards under direct manipulation may use a tightly damped spring; nothing else should spring.

| Purpose | Token | Notes |
|---|---|---|
| Selection, hover, small state | `--m-instant` 90ms | Nearly imperceptible |
| Disclosure, inspector, tier cross-fade | `--m-quick` 160ms | |
| Focus expand, layout reflow | `--m-settle` 240ms | Preserve identity — transform the same element, never swap it out |
| Stage entry, scene change, End Session | `--m-stage` 480ms | Cinematic, and only when it preserves orientation |

Ease with `--ease` for entering, symmetrical or slightly faster for exiting.

No bouncing UI. No constant ambient animation. No gratuitous entrance choreography. No animated loading personality.

**Stage exception:** transitions may be slower and more cinematic — entering Stage, opening a visual scene, deepening an object, ending the session. But live controls (search, capture, record, mark) respond **immediately**. Atmosphere can breathe; table actions cannot wait.

**Motion shows meaning.** When the Librarian moves twenty cards, animate the move so the GM can see what happened — that legibility is the point, not the flourish. Transitions preserve identity: an object that expands into Focus is the same element growing, so the eye keeps track of it.

**Reduced motion:** with `prefers-reduced-motion`, drop to cross-fades, make canvas pans instant, keep Stage transitions under 120ms. The information must survive the loss of the animation.
