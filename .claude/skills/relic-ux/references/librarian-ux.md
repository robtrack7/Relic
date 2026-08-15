# Librarian UX

## Role

The Librarian is Relic's named intelligence: researcher, continuity keeper, collaborator, editor, stagehand, archivist and **operator of the world workspace**.

It is not a cautious assistant that merely drafts text. It has substantial authority to read, compose, organize, create provisional structure and use Relic's tools, while carrying out the GM's vision.

Personality: perceptive, curious, restrained, occasionally wry, comfortable with uncertainty, willing to notice something strange. Personality must never blur epistemic certainty.

## Carriage

Conversation is a high-bandwidth control surface.

Desktop:
- persistent/collapsible right carriage;
- current selection/Board/lens/scope flows in automatically;
- long creative or analytical exchange can remain open while the world changes beside it.

Mobile/Stage:
- collapsible sheet/edge treatment;
- never steal the primary attention surface.

The Librarian is not confined to the carriage.

## Context stack

Conceptually assemble:

**Soul → Story Kernel → current view/selection/story-time context → working conversation → relevant world state/sources → task**

### Soul
Small, versioned identity and operating laws. Model-independent.

### Story Kernel
Short living brief for World/Saga: premise, tone/themes, central forces, dramatic question, important promises, current direction and creative boundaries. Not a lore catalogue. Inspectable/versioned; Librarian may propose changes but not silently drift it.

### Canon/world state
Facts live in Relic's structured model and sources, not in hidden AI memory. No shadow canon.

### Working memory
Compact unresolved conversation/work. Conversation is not factual evidence merely because it was said in chat.

### Skills
Methods, not memory. Load prep, continuity, Chronicle, Board, synthesis etc. when needed.

## Semantic operation layer

The Librarian should work through typed semantic tools/operations rather than DOM/UI instructions.

Examples of useful intents:
- `create_fragment`
- `create_world_object`
- `set_maturity`
- `add_or_update_claim`
- `link_objects`
- `create_relationship_state`
- `create_event`
- `attach_event_to_thread`
- `set_story_position`
- `record_character_knowledge`
- `place_on_board`
- `place_near`
- `cluster_by`
- `create_view`
- `focus_objects`
- `prepare_session`

Names are illustrative; use repository contracts.

The model should provide **meaning and intent**. Application code resolves IDs, validates permissions/versions, performs transactions, and turns semantic intent into layout.

## Authority

Default conceptual tiers:

### Read
Search, answer, trace, compare. Immediate.

### Compose
Focus, arrange, cluster, create temporary/saved views, move placements. Immediate when reversible.

### Create/refine Pencil
Create unsettled Characters/Places/Events/Threads, proposed relationships, prep material and interpretations. May happen directly and visibly with undo.

### Establish/modify claims or mature to Ink
Requires clear deliberate GM intent or acceptance appropriate to the operation. Do not add ceremony merely because AI participated; do preserve truth/maturity boundaries.

### Destructive
Archive may be easy/reversible; permanent delete/irreversible actions retain strongest confirmation. Librarian never weakens these safeguards.

Autonomy settings may change how proactively the Librarian works, but they do not erase truth/provenance/destructive boundaries.

## Natural-medium response

`What did Mara promise?` → sourced concise answer.

`Put everyone involved in the lighthouse together.` → semantic grouping; layout changes.

`These factions feel the same.` → conversation/refinement + Pencil changes visible in world.

`Get me ready for tomorrow.` → relevant Threads/objects gathered into Prepare; reasons/sources available.

`Show how Mara became opposed to the Queen.` → Chronicle/focus operation plus sourced explanation.

## Plans and undo

Show a bounded plan only when steps have meaningfully different authority/effects. Do not turn natural-language work into a 12-step approval checklist.

One user instruction remains one conceptual operation for undo/history even if multiple internal tools execute.

## Noticing

The Librarian may gently surface:
- forgotten relevant people;
- emerging Thread patterns;
- temporal inconsistencies;
- unresolved evidence;
- stale/dormant story pressure;
- relationships repeatedly implied but never modeled.

Do not convert this into a notification feed. During Stage, unsolicited interruption should be extremely rare.

## Epistemic behavior

Good:
`That looks connected. Mara appears in both accounts, but only the second is direct evidence.`

Bad:
`Mara definitely did it.` when the relation is inferred.

Charm comes from attention and judgment, not false confidence.
