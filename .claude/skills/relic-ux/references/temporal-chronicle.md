# Chronicle and temporal model

Use this whenever implementing Chronicle, Threads over time, entity history, relationship history, knowledge, post-session synthesis, retcons, temporal retrieval, or any feature asking "what was true/known then?"

## Foundational law

**Identity is permanent. State is temporal. Presentation is projected.**

Mara in Session 4 and Mara now are the same Mara at different story states.

The Desk/Boards normally show **Now**. Chronicle shows how Now came to be. Focus may inspect an entity "as of" a past story point.

## Two clocks

Never confuse:

### Transaction time
When Relic/database/user recorded or edited something.

Example: `Robin corrected Mara on Aug 15`.

### Story time
When the fact/event was valid in the fiction.

Example: `Mara learned the secret during Session 9, Scene 3`.

Audit/history needs both. A retcon entered today can change story truth three years earlier without pretending the edit happened then.

## Do not build full event sourcing

Keep fast current projections for Desk, Search, Stage and ordinary Librarian work. Retain append-only story history underneath.

Conceptually:

`World Object identity + story position -> state shown by Relic`

Current projection is cached/materialized. Historical state is reconstructed from temporal facts/events/relationships when asked.

Do not replay thousands of events on every Stage lookup.

## First-class Event

Chronicle is built from story **Events**, not database edits.

An Event is a narratively meaningful occurrence such as:
- Mara learns the Queen's secret;
- the third bell disappears;
- Orin agrees to betray the harbourmaster;
- the Glass Church burns.

An Event should carry or link to:
- stable identity;
- title/summary;
- Saga/World scope;
- story position;
- optional Session/Scene;
- participants;
- places;
- Threads;
- causes/consequences when established or proposed;
- sources/provenance;
- maturity and claim-level truth state.

### Scenes
Scenes may group Events. Do not require a heavyweight scene-management system just to have Chronicle structure. Post-session synthesis may propose scenes/events from recordings and Marks.

## Story position and uncertainty

Do not require Gregorian dates or exact fantasy calendars.

Support:
- stable chronological ordering;
- Session/Scene/Event position when known;
- optional display date/name;
- fuzzy/range/relative timing;
- unknown order when evidence is insufficient.

Imported campaigns often know only `before Session 4` or `sometime that winter`. Preserve uncertainty rather than inventing precision.

Custom calendars can map onto story positions later without changing event identity.

## Temporal state

Story-significant mutable state should support validity over story time.

Examples:
- location;
- status/alive/dead/missing;
- office/role;
- allegiance;
- possession/holder;
- important goals or conditions.

Conceptually represent:

`valid_from_story_position`
`valid_to_story_position | present`

Do not temporalize every field. Record change when it affects narrative understanding.

## Character knowledge and belief

Knowledge is one of Relic's highest-value temporal structures.

For narratively meaningful information, support states such as:
- knows;
- believes;
- suspects;
- was_told.

Tie them to:
- subject/claim;
- Character;
- learned/changed at Event/story position;
- optional end/supersession;
- source/provenance.

Do **not** construct an exhaustive character × fact matrix. Unknown/unmodeled is valid. Create knowledge state only when play, the GM, imports, or Librarian synthesis makes it narratively relevant.

This enables accurate questions such as:
- What does Mara know now?
- What did Mara know before the cathedral?
- Who knew the Queen was involved by Session 12?

## Temporal relationships

Relationships also evolve.

Examples:
- allied → distrustful → opposed;
- employer → debtor;
- strangers → lovers → estranged.

Store meaningful relationship states/claims with story validity. Current relationship views use the Now projection; Chronicle can show transitions and the Events that caused them.

## Threads

A Thread is a **persistent line of narrative pressure through the world**, not merely a quest.

It may represent:
- mystery;
- promise;
- personal arc;
- political conflict;
- looming consequence;
- unresolved question;
- quest.

Threads are first-class model structures but second-class navigation.

### Event membership
Events attach to one or many Threads. This is what makes Chronicle junctions meaningful.

A Thread may evolve through states such as:
- emerges;
- active;
- dormant;
- returns;
- resolved;
- failed.

Do not draw a visual intersection merely because lines cross. A junction means shared semantic Event/relationship.

The Librarian may propose a Pencil Thread when multiple Events/claims appear to form one narrative current.

## Chronicle: temporal gravity

**Chronicle is the world under temporal gravity.**

It is not a Gantt chart and not a second timeline database.

Default projection:
- horizontal axis = story time/order;
- other-axis placement = semantic clustering / active arrangement mode;
- Threads = continuous narrative currents through Events;
- Characters/Places/Factions gather around Events where they mattered;
- true Thread intersections use shared Event junctions;
- enormous negative space is acceptable and desirable.

### Now line

A quiet `Now` boundary separates happened history from possible/prepared future.

- left of Now: established/past story material;
- at Now: current projection;
- right of Now: plans, consequences, predictions, unresolved future pressure, normally Pencil/provisional.

Future material is not a generated plot tree; it is possibility in the same world.

### Semantic zoom

Far:
- Saga shape;
- major Threads;
- large turning points/junctions;
- very few cards/labels.

Mid:
- Sessions/scenes;
- named Events;
- Thread labels;
- key Characters/Places.

Near:
- Event prose;
- state changes;
- knowledge gained;
- relationships moved;
- sources/provenance;
- Pencil consequences.

### Arrangement gravity

Chronicle can keep time fixed while changing the clustering argument:
- arrange by Thread;
- Place;
- Character;
- Faction;
- selected conflict.

A saved Chronicle arrangement is a **temporal argument**, analogous to a Board being a spatial argument.

### Focus in Chronicle

Pull Mara → show her footprint through time.

Pull Mara + Glass Church → show their shared and influencing Events/Threads.

Pull a Thread → reveal its Event current, state changes, branches/junctions and unresolved future pressure.

## Entity history UX

Deep Focus on an entity should expose history without creating separate historical copies.

Recommended model:
- default state = Now;
- history rail/scrub/chronology shows meaningful changes;
- selecting a historical Event/story point projects the same entity **as of then**;
- knowledge, relationships and story-significant state update accordingly;
- returning to Now restores current projection.

Do not imply the entity had today's knowledge/status in old scenes.

## Librarian temporal grounding

For temporal questions, resolve time structurally before the model reasons.

Conceptual context:

`Soul → Story Kernel → query/selection → resolved story position → relevant as-of state/events/sources → task`

Examples:
- `What does Mara know?` → current projection.
- `What did Mara know when she reached Blackwater?` → resolve arrival Event; assemble Mara as-of that story position.

This prevents **future-information leakage**, where current lore accidentally contaminates historical reasoning.

Do not solve temporal filtering by stuffing all history into the prompt.

## Embeddings / retrieval

Do not embed every snapshot of every entity.

Prefer indexing:
- current entities;
- Events;
- important temporal claims/knowledge records;
- sources;
- session summaries.

Use structural SQL/time filters and graph relations to assemble historical state; let the LLM reason over that clean context.

## Retcons and corrections

A correction may alter past story truth without deleting transaction history.

When a past signal changes:
1. preserve original source/edit/audit history;
2. update/supersede story-valid claim/event state deliberately;
3. recompute dependent Pencil interpretation;
4. surface conflicts with remaining settled claims;
5. refresh current projections and Chronicle;
6. never silently rewrite settled truth.

## Librarian vs layout engine

The Librarian edits **semantic structure**, not Chronicle geometry.

Good operations:
- attach Event to Thread;
- set relative story order;
- mark Mara participant;
- establish `Mara learned X at Event Y`;
- group Chronicle around Glass Church;
- propose causal relationship;
- create temporal view.

Application code/layout algorithms decide:
- x/y coordinates;
- line/spline routing;
- collision avoidance;
- clustering forces;
- zoom-level rendering;
- stable animations.

For manual Board drag, user placement coordinates are legitimate composition state. The Librarian should prefer semantic layout intents such as `place_near`, `cluster_by`, `order_by`, `emphasize`, then let the layout solver produce geometry.

## Limits

Do not turn Relic into a simulation engine.

Avoid by default:
- tracking every property at every instant;
- exhaustive NPC knowledge matrices;
- continuous physical position;
- numerical relationship simulation;
- alternate/branching universes unless product scope explicitly adds them;
- fabricated exact chronology from vague sources.

The temporal model exists to preserve **narrative understanding and continuity**.
