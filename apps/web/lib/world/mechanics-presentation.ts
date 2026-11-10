import type { DeskCard, FieldDef } from "./model";
import { legacyMechanics, type EntityContent, type MechanicsProfile } from "./entity-document";
import { builtInTemplate } from "./templates";

// Presentation priorities, not a rules engine. Never derive system-specific
// modifiers or invent a stat the GM has not recorded.
const REFERENCE_FIELDS: readonly FieldDef[] = [
  { key: "speed", label: "Speed", kind: "text", group: "Statistics" },
  { key: "initiative", label: "Initiative", kind: "text", group: "Statistics" },
  { key: "skills", label: "Skills", kind: "longtext", group: "Reference" },
  { key: "saves", label: "Saving throws", kind: "text", group: "Reference" },
  { key: "senses", label: "Senses", kind: "text", group: "Reference" },
  { key: "languages", label: "Languages", kind: "text", group: "Reference" },
  { key: "resistances", label: "Resistances", kind: "text", group: "Reference" },
  { key: "traits", label: "Traits", kind: "longtext", group: "Traits" },
  { key: "attacks", label: "Attacks", kind: "longtext", group: "Actions" },
  { key: "actions", label: "Actions", kind: "longtext", group: "Actions" },
  { key: "reactions", label: "Reactions", kind: "longtext", group: "Actions" },
  { key: "spells", label: "Spells & powers", kind: "longtext", group: "Powers" },
  { key: "resources", label: "Resources", kind: "longtext", group: "Resources" }
];
const PRESENTATION_FIELDS = new Set([
  "image", "imageAlt", "imagePosition", "composition", "portrayal", "quote", "gmNotes",
  "ruleset", "ancestry", "pronouns", "role", "aliases", "category", "goals", "notes"
]);

export function mechanicsFields(card: Pick<DeskCard, "representation">): readonly FieldDef[] {
  const values = card.representation?.fields ?? {};
  const builtIn = builtInTemplate("character").fields;
  // Custom sheets have their own vocabulary. Until their template is loaded,
  // expose recorded values rather than populating a D&D-shaped empty form.
  const defaults = card.representation?.templateId ? [] : builtIn;
  const known = [...defaults, ...REFERENCE_FIELDS.filter(field => field.key in values)];
  const keys = new Set(known.map(field => field.key));
  return [...known, ...Object.keys(values).filter(key => !PRESENTATION_FIELDS.has(key) && !keys.has(key)).map(key => ({
    key, label: key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "),
    kind: typeof values[key] === "number" ? "number" as const : "longtext" as const,
    group: typeof values[key] === "number" ? "Statistics" : "Reference"
  }))];
}

export function populatedMechanics(card: Pick<DeskCard, "representation">) {
  const values = card.representation?.fields ?? {};
  return mechanicsFields(card).filter(field => String(values[field.key] ?? "").trim() !== "");
}

export function mechanicsGroups(card: DeskCard) {
  const fields = populatedMechanics(card);
  const priority = ["hp", "ac", "speed", "initiative", "level"];
  const primary = fields.filter(field => field.group === "Statistics").sort((a, b) => {
    const ai = priority.indexOf(a.key), bi = priority.indexOf(b.key);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  const abilities = fields.filter(field => field.group === "Abilities");
  const groups = [...new Set(fields.filter(field => !primary.includes(field) && !abilities.includes(field)).map(field => field.group || "Reference"))]
    .map(label => ({ label, fields: fields.filter(field => (field.group || "Reference") === label && !primary.includes(field) && !abilities.includes(field)) }));
  const order = ["Actions", "Traits", "Powers", "Resources", "Reference"];
  groups.sort((a, b) => (order.indexOf(a.label) < 0 ? 99 : order.indexOf(a.label)) - (order.indexOf(b.label) < 0 ? 99 : order.indexOf(b.label)));
  return { primary, abilities, groups };
}

// ---------------------------------------------------------------------------
// Stat block presentation. Presentation-only: which recorded values a ruleset
// puts in its vitals strip and attribute row. It never invents a value; the
// only derivation is a ruleset that explicitly declares one.

type StatField = MechanicsProfile["fields"][number];
type StatResource = MechanicsProfile["resources"][number];

export type RulesetPresentation = Readonly<{
  /** Field labels/ids (normalised) that belong in the vitals strip, in order. */
  vitals: readonly string[];
  /** Field labels/ids (normalised) that form the attribute row, in order. */
  attributes?: readonly string[];
  /** Short display names for long attribute labels, keyed by normalised label. */
  abbreviations?: Readonly<Record<string, string>>;
  /** The ruleset derives a modifier from a numeric attribute score. */
  deriveModifier?: (score: number) => number | null;
}>;

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const FIVE_E: RulesetPresentation = {
  vitals: ["hitpoints", "hp", "armorclass", "armourclass", "armor", "ac", "speed", "initiative"],
  attributes: ["strength", "str", "dexterity", "dex", "constitution", "con", "intelligence", "int", "wisdom", "wis", "charisma", "cha"],
  abbreviations: { strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA" },
  deriveModifier: score => score >= 1 && score <= 30 ? Math.floor((score - 10) / 2) : null,
};
const BLADES: RulesetPresentation = { vitals: ["stress", "harm", "trauma", "armor", "armour"], attributes: ["insight", "prowess", "resolve"] };
const PBTA: RulesetPresentation = { vitals: ["harm", "hp", "armor", "armour"] };

export const RULESET_PRESENTATION: Readonly<Record<string, RulesetPresentation>> = {
  dd5e: FIVE_E, dnd5e: FIVE_E, "5e": FIVE_E, dd2024: FIVE_E, dnd2024: FIVE_E,
  bladesinthedark: BLADES, blades: BLADES, scumandvillainy: BLADES,
  pbta: PBTA, poweredbytheapocalypse: PBTA, apocalypseworld: PBTA,
};

export function rulesetPresentation(system: string): RulesetPresentation | null {
  return RULESET_PRESENTATION[normalise(system)] ?? null;
}

export type StatVital = Readonly<{ kind: "resource"; resource: StatResource } | { kind: "field"; field: StatField }>;
export type StatAttribute = Readonly<{ field: StatField; display: string; modifier: number | null }>;
export type StatGroup = Readonly<{ label: string; fields: readonly StatField[] }>;
export type StatBlockLayout = Readonly<{ vitals: readonly StatVital[]; attributes: readonly StatAttribute[]; groups: readonly StatGroup[] }>;

const ATTRIBUTE_GROUPS = new Set(["attributes", "abilities", "abilityscores"]);
const filled = (field: StatField) => String(field.value).trim() !== "";
const keys = (field: StatField) => [normalise(field.label), normalise(field.id)];
const rank = (list: readonly string[], field: StatField) => Math.min(...keys(field).map(key => { const index = list.indexOf(key); return index < 0 ? Infinity : index; }));

export function statBlockLayout(profile: MechanicsProfile, { includeEmpty = false }: { includeEmpty?: boolean } = {}): StatBlockLayout {
  const ruleset = rulesetPresentation(profile.system);
  const fields = includeEmpty ? profile.fields : profile.fields.filter(filled);
  const isAttribute = (field: StatField) => ATTRIBUTE_GROUPS.has(normalise(field.group)) || (ruleset?.attributes ? rank(ruleset.attributes, field) < Infinity : false);
  const attributeFields = fields.filter(isAttribute);
  if (ruleset?.attributes) attributeFields.sort((a, b) => rank(ruleset.attributes!, a) - rank(ruleset.attributes!, b));
  const rest = fields.filter(field => !isAttribute(field));
  let vitalFields: StatField[];
  if (ruleset) vitalFields = rest.filter(field => rank(ruleset.vitals, field) < Infinity).sort((a, b) => rank(ruleset.vitals, a) - rank(ruleset.vitals, b));
  else vitalFields = rest.filter(field => typeof field.value === "number").slice(0, Math.max(2, 4 - profile.resources.length));
  const resources = includeEmpty ? profile.resources : profile.resources.filter(resource => resource.current !== null || resource.max !== null);
  const vitals: StatVital[] = [...resources.map(resource => ({ kind: "resource" as const, resource })), ...vitalFields.map(field => ({ kind: "field" as const, field }))];
  if (ruleset) {
    // Interleave by the ruleset's declared order so "Hit points" sits beside "Armor class".
    const order = (vital: StatVital) => vital.kind === "field" ? rank(ruleset.vitals, vital.field) : Math.min(ruleset.vitals.indexOf(normalise(vital.resource.label)) >>> 0, ruleset.vitals.indexOf(normalise(vital.resource.id)) >>> 0);
    vitals.sort((a, b) => order(a) - order(b));
  }
  const vitalIds = new Set(vitalFields.map(field => field.id));
  const remaining = rest.filter(field => !vitalIds.has(field.id));
  const groups = [...new Set(remaining.map(field => field.group || ""))].map(label => ({ label, fields: remaining.filter(field => (field.group || "") === label) }));
  const attributes = attributeFields.map(field => {
    const short = ruleset?.abbreviations?.[normalise(field.label)];
    const modifier = typeof field.value === "number" && ruleset?.deriveModifier ? ruleset.deriveModifier(field.value) : null;
    return { field, display: short ?? field.label, modifier };
  });
  return { vitals, attributes, groups };
}

export const signed = (value: number) => value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "+0";

/**
 * A field-based (pre-profile) character as a mechanics profile, keeping the
 * template's display names ("AC", "Skills") rather than raw storage keys.
 */
export function legacyMechanicsProfile(entity: EntityContent, { populatedOnly = false }: { populatedOnly?: boolean } = {}): MechanicsProfile {
  const legacy = legacyMechanics(entity);
  const known = new Map((populatedOnly ? populatedMechanics(entity) : mechanicsFields(entity)).map(field => [field.key, field]));
  const fields = legacy.fields.filter(field => !populatedOnly || known.has(field.id)).map(field => {
    const def = known.get(field.id);
    return def ? { ...field, label: def.label, group: def.group ?? field.group } : field;
  });
  return { ...legacy, fields };
}
