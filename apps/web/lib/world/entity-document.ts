import type { DeskCard, Lifecycle, RepresentationKind, WorldId } from "./model";

/** Authored material is a document; claims and relationships remain domain records. */
export type RichNode = Readonly<{
  type: string;
  text?: string;
  attrs?: Readonly<Record<string, string | number | boolean | null>>;
  marks?: readonly Readonly<{ type: string; attrs?: Readonly<Record<string, string | number | boolean | null>> }>[];
  content?: readonly RichNode[];
}>;
export type RichDocument = RichNode & { type: "doc"; content: readonly RichNode[] };
export type TextRole = "narrative" | "roleplay" | "goals" | "notes" | "custom";
export type EntityBlock = Readonly<{
  id: string;
  title: string;
  collapsed?: boolean;
}> & (
  | Readonly<{ kind: "text"; role: TextRole; content: RichDocument }>
  | Readonly<{ kind: "media" | "details" | "mechanics" | "relationships" | "state" | "sources" | "history" }>
);
export type EntityDocument = Readonly<{ schemaVersion: 1; version: number; blocks: readonly EntityBlock[] }>;
export type MechanicsProfile = Readonly<{
  schemaVersion: 1;
  system: string;
  variant: "general" | "pc" | "npc" | "adversary";
  fields: readonly Readonly<{ id: string; label: string; group: string; value: string | number }>[];
  resources: readonly Readonly<{ id: string; label: string; current: number | null; max: number | null }>[];
  features: readonly Readonly<{ id: string; name: string; description: RichDocument }>[];
  equipment: readonly Readonly<{ id: string; label: string; objectId?: string }>[];
  notes: RichDocument;
}>;
export type EntityContent = Pick<DeskCard, "objectId" | "body" | "bodyVersion" | "maturity" | "settled" | "written" | "representation" | "claims" | "links">;
export type EntitySnapshot = EntityContent & Readonly<{ worldId: WorldId; lifecycle: Lifecycle; document: EntityDocument }>;

export const emptyRichText = (): RichDocument => ({ type: "doc", content: [{ type: "paragraph" }] });
export function richText(value: string): RichDocument {
  if (!value.trim()) return emptyRichText();
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  const content: RichNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) { content.push({ type: "heading", attrs: { level: Math.min(3, heading[1]!.length + 1) }, content: inlineText(heading[2]!) }); index++; continue; }
    if (/^\s*(?:[-*•]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: RichNode[] = [];
      while (index < lines.length && (ordered ? /^\s*\d+\.\s+/.test(lines[index] ?? "") : /^\s*[-*•]\s+/.test(lines[index] ?? ""))) {
        items.push({ type: "listItem", content: [{ type: "paragraph", content: inlineText((lines[index] ?? "").replace(/^\s*(?:[-*•]|\d+\.)\s+/, "")) }] }); index++;
      }
      content.push({ type: ordered ? "orderedList" : "bulletList", content: items }); continue;
    }
    if (/^>\s?/.test(line)) { content.push({ type: "blockquote", content: [{ type: "paragraph", content: inlineText(line.replace(/^>\s?/, "")) }] }); index++; continue; }
    if (!line.trim()) { index++; continue; }
    const paragraph = [line]; index++;
    while (index < lines.length && (lines[index] ?? "").trim() && !/^(?:#{1,3}\s|>\s|[-*•]\s|\d+\.\s)/.test(lines[index] ?? "")) paragraph.push(lines[index++] ?? "");
    content.push({ type: "paragraph", content: inlineText(paragraph.join("\n")) });
  }
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}
function inlineText(value: string): RichNode[] {
  const result: RichNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^\s)]+\))/g;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const at = match.index!;
    if (at > cursor) result.push({ type: "text", text: value.slice(cursor, at) });
    const part = match[0]; const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) result.push(/^(https?:|mailto:)/i.test(link[2]!) ? { type: "text", text: link[1]!, marks: [{ type: "link", attrs: { href: link[2]! } }] } : { type: "text", text: part });
    else { const bold = part.startsWith("**") || part.startsWith("__"); result.push({ type: "text", text: part.slice(bold ? 2 : 1, bold ? -2 : -1), marks: [{ type: bold ? "bold" : "italic" }] }); }
    cursor = at + part.length;
  }
  if (cursor < value.length) result.push({ type: "text", text: value.slice(cursor) });
  return result;
}
export function richPlainText(node: RichNode): string {
  if (node.type === "entityReference") return String(node.attrs?.label ?? "Referenced entity");
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const separator = ["doc", "bulletList", "orderedList", "blockquote"].includes(node.type) ? "\n" : "";
  return (node.content ?? []).map(richPlainText).join(separator);
}
/** Compatibility projection for existing capture, search and Librarian readers. */
export function richMarkdown(node: RichNode): string {
  if (node.type === "entityReference") return String(node.attrs?.label ?? "Referenced entity");
  if (node.type === "text") return (node.marks ?? []).reduce((text, mark) => mark.type === "bold" ? `**${text}**` : mark.type === "italic" ? `*${text}*` : mark.type === "link" ? `[${text}](${mark.attrs?.href ?? ""})` : text, node.text ?? "");
  if (node.type === "hardBreak") return "\n";
  const value = (node.content ?? []).map(richMarkdown);
  if (node.type === "heading") return `${"#".repeat(Math.max(1, Math.min(3, Number(node.attrs?.level ?? 2) - 1)))} ${value.join("")}`;
  if (node.type === "bulletList") return value.map(v => `• ${v}`).join("\n");
  if (node.type === "orderedList") return value.map((v, i) => `${i + 1}. ${v}`).join("\n");
  if (node.type === "blockquote") return value.map(v => `> ${v}`).join("\n");
  return value.join(node.type === "doc" ? "\n\n" : "");
}
const AUTHORED_KEYS = new Set(["portrayal", "roleplay", "goals", "gmNotes", "notes"]);
export function legacyDocument(entity: EntityContent): EntityDocument {
  const fields = entity.representation?.fields ?? {};
  const body = entity.body.replace(/^!\[[^\]]*\]\([^\s)]+\)\s*/, "");
  const blocks: EntityBlock[] = [{ id: `${entity.objectId}:narrative`, kind: "text", role: "narrative", title: "Narrative", content: richText(body) }];
  for (const [key, role, title] of [["portrayal", "roleplay", "At the table"], ["roleplay", "roleplay", "Roleplay"], ["goals", "goals", "Goals & motives"], ["gmNotes", "notes", "GM notes"], ["notes", "notes", "Notes"]] as const) {
    if (String(fields[key] ?? "").trim()) blocks.push({ id: `${entity.objectId}:${key}`, kind: "text", role, title, content: richText(String(fields[key])) });
  }
  if (fields.image || /^!\[/.test(entity.body)) blocks.push({ id: `${entity.objectId}:media`, kind: "media", title: "Images" });
  if (["ancestry", "pronouns", "aliases", "sourceType", "origin", "page", "category", "rarity"].some(key => fields[key])) blocks.push({ id: `${entity.objectId}:details`, kind: "details", title: entity.representation?.kind === "source" ? "Source record" : "Details" });
  if (entity.representation?.kind === "character") blocks.push({ id: `${entity.objectId}:mechanics`, kind: "mechanics", title: "Mechanics" });
  if (entity.links.length) blocks.push({ id: `${entity.objectId}:relationships`, kind: "relationships", title: "Relationships" });
  return { schemaVersion: 1, version: 0, blocks };
}
export function narrativeBody(document: EntityDocument): string {
  const primary = document.blocks.find(block => block.kind === "text" && block.role === "narrative");
  return primary?.kind === "text" ? richMarkdown(primary.content) : "";
}
export function legacyMechanics(entity: EntityContent): MechanicsProfile {
  const identity = new Set([...AUTHORED_KEYS, "image", "imageAlt", "imagePosition", "composition", "quote", "ruleset", "ancestry", "pronouns", "role", "aliases", "category", "sourceType", "origin", "page", "excerpt", "population", "terrain", "size", "rarity", "attunement"]);
  const featureKeys = new Set(["traits", "actions", "attacks", "reactions", "spells"]);
  return { schemaVersion: 1, system: String(entity.representation?.fields.ruleset || "General"), variant: "general",
    fields: Object.entries(entity.representation?.fields ?? {}).filter(([key]) => !identity.has(key) && !featureKeys.has(key)).map(([id, value]) => ({ id, label: id.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2"), group: ["str", "dex", "con", "int", "wis", "cha"].includes(id) ? "Attributes" : "Statistics", value })),
    resources: [], features: Object.entries(entity.representation?.fields ?? {}).filter(([key, value]) => featureKeys.has(key) && String(value).trim()).map(([id, value]) => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1), description: richText(String(value)) })), equipment: [], notes: emptyRichText() };
}

const NODE_TYPES = new Set(["doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem", "blockquote", "hardBreak", "entityReference"]);
export function validRichDocument(value: unknown): value is RichDocument {
  let count = 0;
  const visit = (node: unknown, depth: number): boolean => {
    if (!node || typeof node !== "object" || depth > 16 || ++count > 12000) return false;
    const n = node as RichNode;
    if (!NODE_TYPES.has(n.type) || (n.text !== undefined && typeof n.text !== "string")) return false;
    if (n.type === "entityReference" && (typeof n.attrs?.objectId !== "string" || typeof n.attrs.label !== "string")) return false;
    if (n.type === "heading" && ![2, 3].includes(Number(n.attrs?.level))) return false;
    if (n.marks && (!Array.isArray(n.marks) || n.marks.some(mark => !["bold", "italic", "link"].includes(mark.type) || (mark.type === "link" && !/^(https?:|mailto:)/i.test(String(mark.attrs?.href ?? "")))))) return false;
    return n.content === undefined || (Array.isArray(n.content) && n.content.every(child => visit(child, depth + 1)));
  };
  return !!value && (value as RichNode).type === "doc" && Array.isArray((value as RichNode).content) && JSON.stringify(value).length <= 200000 && visit(value, 0);
}
export function validEntityDocument(value: unknown): value is EntityDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as EntityDocument;
  if (doc.schemaVersion !== 1 || !Number.isInteger(doc.version) || doc.version < 0 || !Array.isArray(doc.blocks) || doc.blocks.length > 100) return false;
  if (doc.blocks.filter(block => block.kind === "text" && block.role === "narrative").length !== 1) return false;
  const seen = new Set<string>();
  return doc.blocks.every(block => {
    if (typeof block.id !== "string" || block.id.length > 180 || seen.has(block.id) || typeof block.title !== "string" || block.title.length > 120) return false;
    seen.add(block.id);
    return block.kind === "text" ? ["narrative", "roleplay", "goals", "notes", "custom"].includes(block.role) && validRichDocument(block.content) : ["media", "details", "mechanics", "relationships", "state", "sources", "history"].includes(block.kind);
  });
}
export function validMechanicsProfile(value: unknown): value is MechanicsProfile {
  if (!value || typeof value !== "object") return false;
  const p = value as MechanicsProfile;
  return p.schemaVersion === 1 && typeof p.system === "string" && p.system.length <= 120 && ["general", "pc", "npc", "adversary"].includes(p.variant)
    && Array.isArray(p.fields) && p.fields.length <= 100 && p.fields.every(f => typeof f.id === "string" && typeof f.label === "string" && typeof f.group === "string" && (typeof f.value === "string" || typeof f.value === "number" && Number.isFinite(f.value)))
    && Array.isArray(p.resources) && p.resources.length <= 50 && p.resources.every(r => typeof r.id === "string" && typeof r.label === "string" && [r.current, r.max].every(n => n === null || typeof n === "number" && Number.isFinite(n)))
    && Array.isArray(p.features) && p.features.length <= 100 && p.features.every(f => typeof f.id === "string" && typeof f.name === "string" && validRichDocument(f.description))
    && Array.isArray(p.equipment) && p.equipment.length <= 100 && p.equipment.every(i => typeof i.id === "string" && typeof i.label === "string" && (i.objectId === undefined || typeof i.objectId === "string")) && validRichDocument(p.notes) && JSON.stringify(p).length <= 300000;
}

export const BLOCK_CHOICES: readonly { kind: EntityBlock["kind"]; role?: TextRole; title: string }[] = [
  { kind: "text", role: "narrative", title: "Narrative" }, { kind: "text", role: "roleplay", title: "Roleplay" },
  { kind: "text", role: "goals", title: "Goals & motives" }, { kind: "text", role: "notes", title: "GM notes" },
  { kind: "text", role: "custom", title: "Writing" }, { kind: "details", title: "Details" }, { kind: "media", title: "Images" },
  { kind: "mechanics", title: "Mechanics" }, { kind: "relationships", title: "Relationships" },
  { kind: "state", title: "Current state" }, { kind: "sources", title: "Sources & evidence" }, { kind: "history", title: "History" }
];
export type EntityFamily = RepresentationKind | "fragment";
