import type { DeskCard, RepresentationKind } from "./model";

export type ObjectFamily = RepresentationKind | "fragment";
export type Disclosure = "marker" | "card" | "expanded";

export function objectFamily(card: Pick<DeskCard, "representation">): ObjectFamily {
  return card.representation?.kind ?? "fragment";
}

/** Authored presentation data uses the existing validated representation write. */
export function objectField(card: Pick<DeskCard, "representation">, key: string): string {
  const value = card.representation?.fields[key];
  return value === undefined ? "" : String(value);
}

export function safeMediaUrl(value: string): string | undefined {
  const text = value.trim();
  if (/^\/(?!\/)/.test(text)) return text;
  try {
    const url = new URL(text);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch { /* An unfinished URL is ordinary while editing. */ }
  return undefined;
}

/**
 * `imagePosition` is the image's focal point ("x% y%"). Faces that crop hard
 * (portraits) place that point deliberately; others use it as object-position.
 * Characters default to a face-friendly upper-third point.
 */
export function objectMedia(card: Pick<DeskCard, "representation" | "body">) {
  // Unclassified captures can carry an ordinary Markdown image without a typed sheet.
  const captureImage = /^!\[([^\]]*)\]\(([^\s)]+)\)\s*/.exec(card.body);
  const src = safeMediaUrl(objectField(card, "image") || captureImage?.[2] || "");
  return src ? {
    src,
    alt: objectField(card, "imageAlt") || captureImage?.[1] || `Artwork for ${card.representation?.label || "this object"}`,
    position: objectField(card, "imagePosition") || (card.representation?.kind === "character" ? "50% 28%" : "50% 35%")
  } : undefined;
}

export function objectProse(card: Pick<DeskCard, "body">): string {
  return card.body.replace(/^!\[[^\]]*\]\([^\s)]+\)\s*/, "");
}

export const fragmentProse = objectProse;

const MINOR_WORDS = new Set(["the", "a", "an", "of", "and", "de", "du", "von", "van"]);

/** Up to two initials for a composed image-less mark. */
export function objectInitials(title: string): string {
  const words = title.replace(/[^\p{L}\p{N}\s'’-]/gu, " ").split(/\s+/).filter(Boolean);
  const significant = words.filter(word => !MINOR_WORDS.has(word.toLowerCase()));
  const chosen = (significant.length ? significant : words).slice(0, 2);
  return chosen.map(word => word.charAt(0).toLocaleUpperCase()).join("") || "?";
}

export function claimKindLabel(kind: string): string {
  if (kind === "development" || kind.startsWith("development:")) return "Development";
  const labels: Record<string, string> = { next: "Pressure", open_question: "Open question", narrative_pull: "Narrative pull", allegiance: "Allegiance" };
  const label = labels[kind] ?? kind.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Camera distance simplifies; only deliberate disclosure expands. */
export function resolveDisclosure(tier: "far" | "mid" | "near", expanded: boolean): Disclosure {
  // Explicit expansion is a user intent, not a camera suggestion. Far zoom
  // aliases the same Small Card projection rather than introducing a third
  // marker form or collapsing a deliberate Expanded Card.
  return expanded ? "expanded" : tier === "far" ? "marker" : "card";
}

export const FAMILY_LABELS: Record<ObjectFamily, string> = {
  character: "Character", place: "Place", fragment: "Fragment", source: "Source",
  thread: "Thread", faction: "Faction", artifact: "Artifact", event: "Event", note: "Note"
};

/** Sizes are placement preferences, never dimensions of the persistent object. */
export const OBJECT_CARD_SIZES: Partial<Record<ObjectFamily, { width: number; height: number }>> = {
  character: { width: 280, height: 228 }, place: { width: 280, height: 228 },
  thread: { width: 280, height: 228 }, source: { width: 280, height: 228 },
  faction: { width: 280, height: 228 }, artifact: { width: 280, height: 228 },
  event: { width: 280, height: 228 }, fragment: { width: 260, height: 200 }, note: { width: 260, height: 200 }
};
