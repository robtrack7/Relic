# Relic — The Librarian

## Technical vision

The Librarian should feel as though it has lived inside a World for years without carrying the entire World in its head.

Its intelligence comes from a small permanent identity, a compact understanding of the story, and the ability to reach into Relic for everything else.

**The Librarian remembers the shape of the story. Relic remembers the world.**

---

## The memory stack

### 1. The Soul

The Librarian has a small, versioned core that is always present.

It defines:

- who the Librarian is;
- its personality and voice;
- the interaction laws of Relic;
- how it treats truth, uncertainty and provenance;
- when to act, ask, suggest or remain quiet;
- how it uses its tools.

This should remain deliberately small and model-independent.

Claude, GPT or Gemini may provide the reasoning engine underneath it.

**The Librarian belongs to Relic, not to the model.**

---

### 2. The Story Kernel

Every World and Saga maintains a short living brief containing what cannot safely be rediscovered from isolated facts.

For a World, this is its essential character: premise, tone, themes, fundamental truths, important tensions and creative boundaries.

For a Saga, it is the story being told now: its premise, dramatic question, central forces, themes, important promises, current direction and the things the GM considers important.

This is not a catalogue of NPCs or lore.

It is the **shape and soul of the story**.

The Kernel stays concise, human-readable and versioned. The GM can edit or pin what matters. The Librarian may propose how it should evolve as the story changes, but it cannot quietly rewrite the creative intent of the campaign.

---

### 3. Canon

Everything actually true about the World remains in Relic's structured data.

Characters, places, relationships, events, Threads, sessions, notes and sources do not get copied into the Librarian's permanent memory.

When needed, the Librarian retrieves them.

Canon always outranks memory.

**The Librarian's memory is an interpretation of the world. The database is the world.**

There is no shadow canon.

---

### 4. Working memory

For each task, Relic assembles only what the Librarian needs now:

**Soul → Story Kernel → current view and selection → recent conversation → relevant canon and sources → task.**

A conversation may run for hours, but it does not need to remain verbatim forever. Important decisions and unresolved work can be compacted into short working notes while the original conversation remains available as history.

A new task retrieves a new working set.

The Librarian therefore appears to remember everything without asking every model call to read everything.

---

### 5. Skills and tools

Skills are not memory.

They teach the Librarian **how to work**.

A session-prep skill may know how to turn current tensions into playable material.

A continuity skill may know how to trace a contradiction.

A Board skill may know how to reorganize a composition.

A post-session skill may know how to interpret recordings, Marks and changes.

Only the relevant skill needs to be loaded.

The Librarian remains one intelligence while acquiring the right method for the work in front of it.

---

## Reflection without drift

After sessions and meaningful periods of work, the Librarian can reflect on what changed.

Most changes belong only in canon.

Some change the current situation and therefore update the Saga's working understanding.

Very few change what the story fundamentally *is*.

The deeper the memory layer, the slower it should change.

**Events accumulate quickly.
The story state evolves steadily.
The story's soul changes rarely.**

This prevents a long campaign from slowly becoming whatever the latest model happened to summarize.

---

## Grounded by construction

The Librarian should never need to pretend it remembers.

Every factual answer can reach back to canon and provenance.

Every inference can remain visibly distinct from truth.

Every persistent story summary can be rebuilt or inspected.

Changing the underlying AI model does not change the World, the Story Kernel or the Librarian's identity.

The intelligence is replaceable.

**The continuity is not.**

---

## The test

Open a Saga after six months.

The Librarian still sounds like the Librarian.

It understands what kind of story this is and what the GM cares about.

It knows where the story currently stands.

It does not carry every forgotten locksmith in its permanent prompt.

Ask about one, and it finds him.

Ask why he matters, and it understands enough of the larger story to answer.

Correct the world, and its understanding follows.

Change the model underneath Relic, and nothing essential is lost.

That is the Librarian:

**a small enduring mind with the whole living world at its fingertips.**
