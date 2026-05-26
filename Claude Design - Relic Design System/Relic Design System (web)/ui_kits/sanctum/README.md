# UI Kit — The Sanctum

The Sanctum is Relic's home: the parchment-light, reflective workspace where the GM builds the world, preps the session, and reviews what happened. It is the **default** product surface and the language all other surfaces derive from.

This kit is a high-fidelity reconstruction of the Sanctum visual vocabulary. It is **not** production code — components are simple, cosmetic, and easy to lift into mocks.

## What's in here

- `index.html` — interactive demo. Click between four tabs: **Threads · Entities · Sessions · Review**. Open the ⌘K search palette. Approve / edit / reject items in the review queue.
- `Sidebar.jsx` — top web header (Sanctum nav + session pill + GM avatar)
- `Threads.jsx` — thread timeline view (active / loose / dormant / resolved chips)
- `Entities.jsx` — entity card grid with category left-rules
- `Sessions.jsx` — session list + session-prep card with amber rule
- `Review.jsx` — post-session approval queue with diff format
- `SearchPalette.jsx` — ⌘K command palette (parchment surface)

## How to use

Open `index.html` directly in a browser. Babel transpiles JSX in-browser; no build step.

## What it does **not** include

- Real authentication, persistence, AI calls — all data is static demo content.
- A complete entity-editor surface (long-form). The kit emphasises navigation, lists, cards, and the approval loop — the parts most-used in mocks.
- Mobile breakpoints. Sanctum is desktop-first.
