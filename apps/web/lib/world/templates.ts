import type { FieldDef, RepresentationKind, Template } from "@/lib/world/model";

/**
 * The templates Relic ships with.
 *
 * These live in code rather than in the `templates` table on purpose. They will
 * churn constantly while the product finds its shape, and editing a constant is
 * better than writing a migration to rename a field. The table exists for
 * templates a GM assembles themselves, when Relic has not provided the one they
 * need — those are data, these are product.
 *
 * The split between `fields` and `claims` is the important part and it is not
 * arbitrary:
 *
 *   **fields** are the mechanical sheet. Rules data. Nobody disputes a Dexterity
 *   score or cites a source for it, and it does not change with story time — it
 *   changes when the character levels up, which is an edit, not an assertion.
 *
 *   **claims** are narrative. Occupation, allegiance, location, status: exactly
 *   the things that change *because of what happened*, that a player might be
 *   wrong about, and that Relic should be able to answer "as of Session 4".
 *
 * When adding a field, ask which of those two it is. If it would ever appear in
 * a sentence beginning "we believe this because…", it is a claim.
 */

const ABILITIES: readonly FieldDef[] = [
  { key: "str", label: "STR", kind: "number", group: "Abilities" },
  { key: "dex", label: "DEX", kind: "number", group: "Abilities" },
  { key: "con", label: "CON", kind: "number", group: "Abilities" },
  { key: "int", label: "INT", kind: "number", group: "Abilities" },
  { key: "wis", label: "WIS", kind: "number", group: "Abilities" },
  { key: "cha", label: "CHA", kind: "number", group: "Abilities" }
];

export const BUILT_IN_TEMPLATES: Readonly<Record<RepresentationKind, Template>> = {
  character: {
    kind: "character",
    name: "Character",
    labelPrompt: "Who is this?",
    fields: [
      { key: "level", label: "Level", kind: "number", group: "Statistics" },
      { key: "ac", label: "AC", kind: "number", group: "Statistics" },
      { key: "hp", label: "HP", kind: "number", group: "Statistics" },
      ...ABILITIES
    ],
    claims: [
      { key: "occupation", label: "Occupation" },
      { key: "location", label: "Location" },
      { key: "allegiance", label: "Allegiance" },
      { key: "status", label: "Status" }
    ]
  },

  place: {
    kind: "place",
    name: "Place",
    labelPrompt: "What is this place called?",
    fields: [
      { key: "population", label: "Population", kind: "number", group: "Scale" },
      { key: "terrain", label: "Terrain", kind: "text", group: "Scale" }
    ],
    claims: [
      { key: "region", label: "Region" },
      { key: "ruler", label: "Held by" },
      { key: "status", label: "Status" }
    ]
  },

  faction: {
    kind: "faction",
    name: "Faction",
    labelPrompt: "What is this faction called?",
    fields: [{ key: "size", label: "Size", kind: "text", group: "Scale" }],
    claims: [
      { key: "seat", label: "Seat" },
      { key: "leader", label: "Led by" },
      { key: "goal", label: "Wants" },
      { key: "status", label: "Status" }
    ]
  },

  artifact: {
    kind: "artifact",
    name: "Artifact",
    labelPrompt: "What is this object?",
    fields: [
      { key: "rarity", label: "Rarity", kind: "text", group: "Rules" },
      { key: "attunement", label: "Attunement", kind: "text", group: "Rules" }
    ],
    claims: [
      { key: "holder", label: "Held by" },
      { key: "location", label: "Location" },
      { key: "origin", label: "Origin" }
    ]
  },

  event: {
    kind: "event",
    name: "Event",
    labelPrompt: "What happened?",
    fields: [],
    claims: [
      { key: "location", label: "Where" },
      { key: "participants", label: "Who" },
      { key: "consequence", label: "Consequence" }
    ]
  },

  thread: {
    kind: "thread",
    name: "Thread",
    labelPrompt: "What is the unresolved pressure?",
    fields: [],
    claims: [
      { key: "status", label: "Status" },
      { key: "stakes", label: "Stakes" },
      { key: "next", label: "Pressure" }
    ]
  },

  source: {
    kind: "source",
    name: "Source",
    labelPrompt: "What is this source?",
    fields: [
      { key: "citation", label: "Citation", kind: "text", group: "Reference" },
      { key: "page", label: "Page", kind: "text", group: "Reference" }
    ],
    claims: []
  },

  note: {
    kind: "note",
    name: "Note",
    labelPrompt: "What should this be called?",
    fields: [],
    claims: []
  }
};

export const REPRESENTATION_KINDS = Object.keys(
  BUILT_IN_TEMPLATES
) as readonly RepresentationKind[];

export function builtInTemplate(kind: RepresentationKind): Template {
  return BUILT_IN_TEMPLATES[kind];
}

/** Field definitions for a representation, honouring a user template if one is set. */
export function fieldsFor(
  kind: RepresentationKind,
  userFields: readonly FieldDef[] | null
): readonly FieldDef[] {
  return userFields ?? builtInTemplate(kind).fields;
}

/** Groups fields in definition order, so a sheet renders in a stable shape. */
export function groupFields(
  fields: readonly FieldDef[]
): readonly Readonly<{ group: string; fields: readonly FieldDef[] }>[] {
  const order: string[] = [];
  const byGroup = new Map<string, FieldDef[]>();

  for (const field of fields) {
    const group = field.group ?? "";
    if (!byGroup.has(group)) {
      byGroup.set(group, []);
      order.push(group);
    }
    byGroup.get(group)!.push(field);
  }

  return order.map((group) => ({ group, fields: byGroup.get(group)! }));
}
