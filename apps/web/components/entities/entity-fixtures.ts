import { asCardId, asRepresentationId, asWorldId, asWorldObjectId, type DeskCard } from "@/lib/world/model";
import { legacyDocument, richText, type EntityBlock, type EntityDocument, type EntitySnapshot, type MechanicsProfile, type RichDocument } from "@/lib/world/entity-document";
import { BELL_THREAD, LOOSE_FRAGMENT, MARA, TIDE_LEDGER, WATCHERS_SPIRE } from "@/components/world-objects/object-fixtures";
import { KNOWLEDGE_FIXTURES } from "@/components/world-objects/knowledge.fixtures";

/** Story-only world material. These identities never install into a user's world. */
export const ENTITY_STORY_WORLD = asWorldId("00000000-0000-4000-8000-000000000681");

const prose = (value: string): RichDocument => richText(value);
const withNarrative = (card: DeskCard, narrative: RichDocument, extra: readonly EntityBlock[] = []): EntityDocument => {
  const legacy = legacyDocument(card);
  const blocks = legacy.blocks.map((block) => block.kind === "text" && block.role === "narrative" ? { ...block, content: narrative } : block);
  return { schemaVersion: 1, version: 0, blocks: [...blocks, ...extra] };
};

function snapshot(card: DeskCard, document = legacyDocument(card)): EntitySnapshot {
  return { ...card, worldId: ENTITY_STORY_WORLD, lifecycle: "active", document };
}

const noteCard: DeskCard = {
  ...LOOSE_FRAGMENT,
  cardId: asCardId("entity-story-note-card"),
  objectId: asWorldObjectId("entity-story-note"),
  body: "Ask the player who keeps the western lamp lit after the tide turns.",
  maturity: "pencil",
  settled: null,
  representation: { id: asRepresentationId("entity-story-note-representation"), objectId: asWorldObjectId("entity-story-note"), kind: "note", label: "Question for the next table", fields: { privacy: "gm" }, templateId: null, version: 1 },
};

const artifactCard: DeskCard = {
  ...LOOSE_FRAGMENT,
  cardId: asCardId("entity-story-artifact-card"),
  objectId: asWorldObjectId("entity-story-artifact"),
  body: "A brass wick key cut from the same pattern as the lock beneath Watcher’s Spire.",
  maturity: "ink",
  settled: { by: "gm", at: "2026-11-06T20:00:00Z" },
  representation: { id: asRepresentationId("entity-story-artifact-representation"), objectId: asWorldObjectId("entity-story-artifact"), kind: "artifact", label: "The Brass Wick Key of Saint Orra", fields: { rarity: "Unique", attunement: "A lamplighter of the Compact", origin: "Blackwater parish", quote: "Every lock remembers the hand that made it." }, templateId: null, version: 1 },
};

const pcMechanics: MechanicsProfile = {
  schemaVersion: 1,
  system: "D&D 5e",
  variant: "pc",
  fields: [
    { id: "level", label: "Level", group: "Identity", value: 5 },
    { id: "armor", label: "Armor class", group: "Defenses", value: 14 },
    { id: "strength", label: "Strength", group: "Attributes", value: 10 },
    { id: "dexterity", label: "Dexterity", group: "Attributes", value: 16 },
    { id: "constitution", label: "Constitution", group: "Attributes", value: 12 },
    { id: "intelligence", label: "Intelligence", group: "Attributes", value: 14 },
    { id: "wisdom", label: "Wisdom", group: "Attributes", value: 13 },
    { id: "charisma", label: "Charisma", group: "Attributes", value: 18 },
  ],
  resources: [
    { id: "hit-points", label: "Hit points", current: 32, max: 38 },
    { id: "inspiration", label: "Inspiration", current: 1, max: 1 },
    { id: "spell-slots", label: "Spell slots", current: 2, max: 3 },
  ],
  features: [
    { id: "courtly-composure", name: "Courtly composure", description: prose("Mara keeps her voice level even when the room has decided to panic.") },
    { id: "read-the-room", name: "Read the room", description: prose("Once per scene, ask which person is most likely to break first. The answer is an impression, not a settled assertion.") },
    { id: "old-coastal", name: "Old Coastal", description: prose("Mara can read the tide marks and the shorthand used by the coast’s vanished ferrymen.") },
  ],
  equipment: [
    { id: "rapier", label: "Weathered rapier" },
    { id: "letter-case", label: "Sealed letter case" },
    { id: "wick-key", label: "Brass wick key", objectId: artifactCard.objectId },
  ],
  notes: prose("Her level and resources are table-facing mechanics. Her loyalties remain authored narrative, and should not be inferred from this sheet."),
};

const pcCard: DeskCard = {
  ...MARA,
  cardId: asCardId("entity-story-pc-card"),
  objectId: asWorldObjectId("entity-story-pc-mara"),
  maturity: "ink",
  representation: { ...MARA.representation!, id: asRepresentationId("entity-story-pc-representation"), objectId: asWorldObjectId("entity-story-pc-mara"), label: "Mara Veyra · Player Character", fields: { ...MARA.representation!.fields, role: "Player character", class: "Swashbuckler", background: "Courtier", quote: "The sea remembers what maps forget." }, mechanics: pcMechanics, version: 3 },
  body: "Mara Veyra has survived three courts, two mutinies, and the long silence after a letter stops arriving. At the table she is a player character: decisive in danger, attentive in a room, and not yet certain which promises she is allowed to break.",
};

const pcExtra: EntityBlock[] = [
  { id: "entity-story-pc-mara:roleplay", kind: "text", role: "roleplay", title: "Playing Mara", content: prose("Mara asks one precise question before committing to a plan. Give her a quiet way to notice what others miss.") },
  { id: "entity-story-pc-mara:notes", kind: "text", role: "notes", title: "Private notes", content: prose("The player does not yet know that Mara cast the first wick key. Keep this separate from the established character history.") },
];

const pcDocument = withNarrative(pcCard, prose("## A letter that never arrived\n\nMara came to the harbour carrying an unopened letter from the crown. She has the patience of someone who has survived three courts and the manners of someone who remembers every slight.\n\nHer search has brought her to Watcher’s Spire, where she once swore never to return. The bell below the tide has started calling her by a name she has not used since childhood."), pcExtra);

const artifactDocument = withNarrative(artifactCard, prose("## The key remembers\n\nThe wick key is too warm after the third toll. Its teeth match the lock beneath Watcher’s Spire, but the Compact’s records insist the key was lost with Saint Orra forty years ago.\n\nIt opens one door. It does not choose what waits on the other side."), [{ id: "entity-story-artifact:notes", kind: "text", role: "notes", title: "GM notes", content: prose("Let the key turn only after the players have named what they are willing to leave behind.") }]);

const threadDocument = withNarrative(BELL_THREAD, prose("## The Bell Below the Tide\n\nThe harbour has a story it tells only when the water is lowest: a bell beneath the old steps, a fourth vessel that never returns, and a promise no one remembers making.\n\nThe question is not whether the bell is real. The question is who has been answering it.\n\n### Developments\n\nA sailor spoke of a drowned vow. Mara found three altered entries in the tide ledger. At the next low tide, the bell sounded beneath the spire."));
const sourceDocument = withNarrative(TIDE_LEDGER, prose("## Folio 9\n\nThree departures are recorded in a different hand. The final line reads:\n\n> The bell rang at the turning tide. No one was in the tower.\n\nThe paper smells of lamp oil. The handwriting changes after the entry for the Lark."));
const fragmentDocument = withNarrative(LOOSE_FRAGMENT, prose("A brass key that opens no lock anyone remembers."));
const noteDocument = withNarrative(noteCard, prose("## Next table\n\nAsk the player who keeps the western lamp lit after the tide turns. Do not offer the answer; let the question create the pressure."));

const baseKnowledge = KNOWLEDGE_FIXTURES;
const richEntities: readonly EntitySnapshot[] = [
  snapshot(pcCard, pcDocument),
  snapshot(WATCHERS_SPIRE, withNarrative(WATCHERS_SPIRE, prose("## Watcher’s Spire\n\nA wind-scoured watchpost keeping time with the sea. At low tide, the old steps lead somewhere they should not.\n\nSalt sits in every seam. Below the last step, a warm current moves against the tide."))),
  snapshot(BELL_THREAD, threadDocument),
  snapshot(TIDE_LEDGER, sourceDocument),
  snapshot(artifactCard, artifactDocument),
  snapshot(LOOSE_FRAGMENT, fragmentDocument),
  snapshot(noteCard, noteDocument),
  ...baseKnowledge.filter(card => ![pcCard.objectId, WATCHERS_SPIRE.objectId, BELL_THREAD.objectId, TIDE_LEDGER.objectId].includes(card.objectId)).map(card => snapshot(card)),
];

const familyExamples = [...new Map(richEntities.map(entity => [entity.representation?.kind ?? "fragment", entity])).values()];
export const ENTITY_FIXTURES: readonly EntitySnapshot[] = [...richEntities, ...familyExamples.map(entity => {
  const objectId = asWorldObjectId(`${entity.objectId}-authoring-sparse`);
  const sparse = { ...entity, objectId, body: "", bodyVersion: 1, claims: [], links: [], maturity: "pencil" as const, settled: null, written: null,
    representation: entity.representation ? { ...entity.representation, id: asRepresentationId(`${entity.representation.id}-sparse`), objectId, label: `Unfinished ${entity.representation.kind}`, fields: {}, mechanics: undefined, version: 1 } : null };
  return { ...sparse, document: legacyDocument(sparse) };
})];

export const ENTITY_FIXTURE_MAP = new Map(ENTITY_FIXTURES.map(entity => [entity.objectId, entity]));
export const ENTITY_FIXTURE_GROUPS = {
  character: ENTITY_FIXTURES.filter(entity => entity.representation?.kind === "character"),
  place: ENTITY_FIXTURES.filter(entity => entity.representation?.kind === "place"),
  thread: ENTITY_FIXTURES.filter(entity => entity.representation?.kind === "thread"),
  source: ENTITY_FIXTURES.filter(entity => entity.representation?.kind === "source"),
  artifact: ENTITY_FIXTURES.filter(entity => entity.representation?.kind === "artifact"),
  fragment: ENTITY_FIXTURES.filter(entity => !entity.representation),
  note: ENTITY_FIXTURES.filter(entity => entity.representation?.kind === "note"),
} as const;

export function cloneEntityFixture(entity: EntitySnapshot, overrides: Partial<EntitySnapshot> = {}): EntitySnapshot {
  return structuredClone({ ...entity, ...overrides });
}

/** Keep Storybook sessions isolated when the same specimen is opened in several stories. */
export function scopedEntityFixture(entity: EntitySnapshot, scope: string): EntitySnapshot {
  const objectId = asWorldObjectId(`${entity.objectId}-${scope}`);
  return cloneEntityFixture(entity, {
    objectId,
    representation: entity.representation ? { ...entity.representation, objectId } : null,
  });
}
