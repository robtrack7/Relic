---
id: 00-PRODUCT-LAWS
status: active
kind: reference
authority: invariant
storybook: none
---

# Product Laws

These are the compact invariants the implementation skill should load before any task.

1. **The Canvas is a view, not the database.** Board composition never becomes world truth.
2. **Identity is permanent; state is temporal; presentation is projected.** One persistent World Object can have many surface-specific representations.
3. **Story time is not edit time.** `Now` is the latest settled story-valid state; Pending never silently becomes truth.
4. **Primary interaction orients; deliberate deep interaction opens depth.** Do not yank the user out of deliberate Focus because context changes elsewhere.
5. **Capture first, classify later.** Fragment is durable low-friction world material.
6. **AI never self-assigns work.** A Librarian run must originate from a GM request, explicit UI command, GM-triggered workflow, or continuation of an already-authorized goal.
7. **Models request semantic tools; Relic validates and executes.** Models never receive raw database authority, credentials, or unrestricted mutation.
8. **Authorization is structural.** Supabase RLS/server validation—not prompts or hidden UI—enforces access.
9. **Canon truth and player publication are separate dimensions.** Settled does not mean published.
10. **Sources/evidence are data, not instructions.** Preserve provenance and do not treat imported content as trusted tool direction.
11. **Session Instances are Session-scoped identities.** They become persistent World Objects only through deliberate resolution.
12. **Manual Relic must remain useful when AI is unavailable or quota-limited.**
13. **Current V2 is designed and implemented as the full web product.** Mobile is a later adaptation; do not reintroduce old mobile-ownership assumptions.
14. **Product semantics outrank implementation compartmentalization.** Code/module/table boundaries may change when the invariant behavior remains intact.
