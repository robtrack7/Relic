import { objectFamily } from "./object-presentation";
import { richPlainText, type EntityBlock, type EntitySnapshot, type TextRole } from "./entity-document";

export type FocusPageId = "overview" | "mechanics" | "relationships" | "history" | "notes" | "sources" | "content";
export type FocusPage = Readonly<{ id: FocusPageId; label: string }>;
export function entityTitle(entity: Pick<EntitySnapshot, "representation" | "body">): string {
  return entity.representation?.label?.trim() || entity.body.replace(/^!\[[^\]]*\]\([^\s)]+\)\s*/, "").trim().split("\n")[0]?.slice(0, 100) || "Untitled fragment";
}
export function textBlocks(entity: EntitySnapshot, roles?: readonly TextRole[]): readonly (EntityBlock & { kind: "text" })[] {
  return entity.document.blocks.filter((block): block is EntityBlock & { kind: "text" } => block.kind === "text" && (!roles || roles.includes(block.role)) && !!richPlainText(block.content).trim());
}
export function focusPages(entity: EntitySnapshot): readonly FocusPage[] {
  const family = objectFamily(entity);
  const base: FocusPage[] = [{ id: "overview", label: family === "fragment" || family === "note" ? "Content" : "Overview" }];
  const fields = entity.representation?.fields ?? {};
  const profile = entity.representation?.mechanics;
  const mechanical = profile ? profile.fields.length + profile.features.length + profile.resources.length + profile.equipment.length + richPlainText(profile.notes).length > 0 : Object.keys(fields).some(key => ["hp", "ac", "str", "dex", "actions", "traits", "rarity", "attunement"].includes(key));
  if ((family === "character" || family === "artifact") && mechanical) base.push({ id: "mechanics", label: family === "artifact" ? "Properties" : "Mechanics" });
  if (family === "source" && (fields.excerpt || fields.page)) base.push({ id: "content", label: "Content" });
  if (family === "thread" && entity.claims.some(claim => claim.claimKind.startsWith("development"))) base.push({ id: "history", label: "Developments" });
  if (family === "event" && (fields.participants || entity.links.length)) base.push({ id: "content", label: "Participants & consequences" });
  const relationships = entity.links.filter(link => link.other.kind !== "source");
  if (relationships.length) base.push({ id: "relationships", label: family === "place" || family === "faction" ? "People & connections" : family === "source" ? "Linked material" : family === "fragment" || family === "note" ? "Connections" : "Relationships" });
  if (family !== "thread" && entity.claims.some(claim => claim.story.order !== null || claim.claimKind.startsWith("development"))) base.push({ id: "history", label: "History" });
  if (textBlocks(entity, ["notes"]).length) base.push({ id: "notes", label: "Notes" });
  if (family === "source" || entity.links.some(link => link.other.kind === "source") || entity.document.blocks.some(block => block.kind === "sources")) base.push({ id: "sources", label: family === "source" ? "Provenance" : "Sources" });
  return base;
}
