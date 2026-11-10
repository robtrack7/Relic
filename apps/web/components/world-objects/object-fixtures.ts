import {
  asCardId, asClaimId, asCompositionId, asRepresentationId, asWorldId, asWorldObjectId,
  cardRef, type Claim, type DeskCard, type DeskView, type RepresentationKind, type Workspace
} from "@/lib/world/model";
import type { ResolvedObjectSnapshot } from "@/lib/world/object-projection";

const gm = { kind: "gm_assertion" as const, authoredBy: "gm" as const, recordedAt: "2026-08-17T12:00:00Z" };
const world = asWorldId("00000000-0000-4000-8000-000000000501");
const composition = asCompositionId("00000000-0000-4000-8000-000000000502");

function object(index: number, kind: RepresentationKind | null, label: string, body: string, fields: Record<string, string | number> = {}): DeskCard {
  return {
    cardId: asCardId(`goal05-card-${index}`), objectId: asWorldObjectId(`goal05-object-${index}`),
    layout: { x: 0, y: 0, width: 340, height: 300 }, z: index,
    body, maturity: kind === null ? "pencil" : "ink", settled: kind ? { by: "gm", at: gm.recordedAt } : null,
    written: null, cardVersion: 1, bodyVersion: 1,
    representation: kind ? { id: asRepresentationId(`goal05-representation-${index}`), objectId: asWorldObjectId(`goal05-object-${index}`), kind, label, fields, templateId: null, version: 1 } : null,
    claims: [], links: []
  };
}

export function fixtureClaim(card: DeskCard, key: string, value: string, options: Partial<Claim> = {}): Claim {
  return { id: asClaimId(`${card.objectId}-${key}`), subjectId: card.objectId, claimKind: key, value, objectValue: null, truthState: "ink", provenance: gm, settled: { by: "gm", at: gm.recordedAt }, story: { order: null, precision: "unknown", label: null }, version: 1, ...options };
}

const mara = object(1, "character", "Mara Veyra", "Diplomatic emissary and eyes of the crown. She moves between courts and currents, carrying letters, promises, and quiet threats.", {
  image: "/world/mara-veyra.png", imageAlt: "Mara, a dark-haired envoy in an embroidered olive coat, overlooking the harbour.", imagePosition: "52% 30%",
  quote: "“The sea remembers what maps forget.”", portrayal: "Patient, precise, and almost never surprised. Low voice; pauses before saying a name.", gmNotes: "Met Captain Rellion at Greyspire Abbey during the midsummer conclave.",
  ruleset: "D&D 5e", level: 5, ac: 14, hp: 32, speed: "30 ft.", initiative: "+2", str: 10, dex: 14, con: 12, int: 16, wis: 15, cha: 18,
  skills: "Insight +5 · Persuasion +7 · History +6", senses: "Passive Perception 12", languages: "Common, Elvish, Old Coastal",
  traits: "Courtly composure. Mara keeps her voice level even under threat.\nA familiar face. She knows the customs of the coastal courts.",
  attacks: "Rapier. +5 to hit · reach 5 ft. · one target. Hit: 6 (1d8 + 2) piercing damage.",
  actions: "Read the room. Mara studies a creature she can see, looking for hesitation, loyalties, or a concealed motive.",
  reactions: "A quiet warning. Calls an ally’s attention to a threat she can see."
});
const place = object(2, "place", "Watcher’s Spire", "A wind-scoured watchpost keeping time with the sea. At low tide, the old steps lead somewhere they should not.", { image: "/desk/blackwater-harbour.webp", imageAlt: "A weathered bell tower above the misty harbour and fishing boats.", category: "Coastal outpost", terrain: "North shore", gmNotes: "The lower door is visible only at the turning tide." });
const source = object(3, "source", "Tide ledger, folio 9", "A fragment of the harbour ledger. Three departures are recorded in a different hand.", { image: "/world/tide-ledger.png", imageAlt: "An illustrated archival page of a handwritten shipping ledger.", sourceType: "Ledger scan", citation: "Blackwater Parish Archive · Folio 9", page: "Folio 9 of 24", origin: "Parish harbour records", excerpt: "“The bell rang at the turning tide. No one was in the tower.”", gmNotes: "The handwriting changes after the entry for the Lark." });
const fragment = object(4, null, "", "The lighthouse keeps watch even in storms that have no name.");
const thread = object(5, "thread", "The Bell Below the Tide", "Why does the bell toll when no hand rings it?", { concerns: "Who sealed the door beneath the spire?\nWhat did the missing crews hear?\nWhy does Mara recognize the bell?", gmNotes: "If the bell sounds a fourth time, the harbour will answer." });
export const THIRD_TOLL = object(6, "event", "The Third Toll", "At the turning tide, the drowned bell sounded three times. Mara was standing on the lower steps when the water began to rise.");

export const MARA: DeskCard = { ...mara, claims: [fixtureClaim(mara, "occupation", "Crown envoy"), fixtureClaim(mara, "allegiance", "House Seradine"), fixtureClaim(mara, "location", "Watcher’s Spire", { objectValue: place.objectId }), fixtureClaim(mara, "status", "Alive"), fixtureClaim(mara, "disposition", "Pragmatic")], links: [ { claimId: asClaimId("mara-location"), claimKind: "location", direction: "out", other: cardRef(place), truthState: "ink" }, { claimId: asClaimId("mara-thread"), claimKind: "involved in", direction: "out", other: cardRef(thread), truthState: "ink" } ] };
export const WATCHERS_SPIRE: DeskCard = { ...place, claims: [fixtureClaim(place, "region", "Norfell Coast"), fixtureClaim(place, "status", "Watched"), fixtureClaim(place, "climate", "Cold & salt-worn")], links: [ { claimId: asClaimId("mara-location"), claimKind: "location", direction: "in", other: cardRef(mara), truthState: "ink" }, { claimId: asClaimId("place-thread"), claimKind: "unfolding at", direction: "in", other: cardRef(thread), truthState: "ink" } ] };
export const TIDE_LEDGER: DeskCard = { ...source, links: [{ claimId: asClaimId("ledger-thread"), claimKind: "evidence for", direction: "out", other: cardRef(thread), truthState: "ink" }] };
export const LOOSE_FRAGMENT = fragment;
const development = (order: number, label: string, text: string, pending = false) => fixtureClaim(thread, `development:${order}`, text, { story: { order, label, precision: "relative" }, truthState: pending ? "pencil" : "ink", settled: pending ? null : { by: "gm", at: gm.recordedAt } });
export const BELL_THREAD: DeskCard = { ...thread, claims: [
  fixtureClaim(thread, "status", "Active"), fixtureClaim(thread, "open_question", "Why does the bell toll when no hand rings it?"), fixtureClaim(thread, "stakes", "A fourth missing vessel. A harbour running out of explanations."), fixtureClaim(thread, "next", "The lowest tide is tomorrow night."), fixtureClaim(thread, "narrative_pull", "High"),
  development(400, "Session 4 · The old sailor", "A sailor speaks of a drowned vow."), development(600, "Session 6 · A different hand", "Mara finds three altered entries in the tide ledger."), { ...development(800, "Session 8 · At low tide", "The bell sounds again beneath the spire."), objectValue: THIRD_TOLL.objectId }, development(900, "After Session 8 · Pending", "A fourth vessel may have answered the bell.", true)
], links: [ { claimId: asClaimId("thread-mara"), claimKind: "involves", direction: "out", other: cardRef(mara), truthState: "ink" }, { claimId: asClaimId("thread-place"), claimKind: "unfolding at", direction: "out", other: cardRef(place), truthState: "ink" }, { claimId: asClaimId("thread-source"), claimKind: "supported by", direction: "out", other: cardRef(source), truthState: "ink" }, { claimId: asClaimId(`${thread.objectId}-development:800`), claimKind: "development:800", direction: "out", other: cardRef(THIRD_TOLL), truthState: "ink" } ] };

export const THREAD_AT_SESSION_FOUR: ResolvedObjectSnapshot = {
  context: { kind: "historical", position: { order: 400, label: "Session 4 · The old sailor", precision: "relative" } },
  card: { ...BELL_THREAD, body: "An old sailor’s story. A bell no one else has heard.", representation: { ...thread.representation!, fields: {} }, claims: [fixtureClaim(thread, "status", "Dormant"), fixtureClaim(thread, "open_question", "What did the old sailor hear beneath the quay?"), fixtureClaim(thread, "narrative_pull", "Faint")], links: [] },
  developments: [{ id: "bell-4", summary: "A sailor speaks of a drowned vow.", story: { order: 400, label: "Session 4 · The old sailor", precision: "relative" }, layer: "settled", provenance: gm }]
};
export const THREAD_AT_SESSION_SIX: ResolvedObjectSnapshot = {
  context: { kind: "historical", position: { order: 600, label: "Session 6 · A different hand", precision: "relative" } },
  card: { ...BELL_THREAD, representation: { ...thread.representation!, fields: { concerns: "Who altered the entries in the ledger?" } }, claims: [fixtureClaim(thread, "status", "Active"), fixtureClaim(thread, "open_question", "What connects the missing ships?"), fixtureClaim(thread, "narrative_pull", "Growing")], links: BELL_THREAD.links.filter(link => link.other.kind !== "place" && link.other.kind !== "event") },
  developments: [...THREAD_AT_SESSION_FOUR.developments, { id: "bell-6", summary: "Mara finds three altered entries in the tide ledger.", story: { order: 600, label: "Session 6 · A different hand", precision: "relative" }, layer: "settled", provenance: gm }]
};

export const OBJECT_DESK: DeskView = { worldId: world, compositionId: composition, kind: "desk", name: "The Drowned Coast", cards: [
  { ...MARA, layout: { x: -510, y: -220, width: 340, height: 332 } },
  { ...WATCHERS_SPIRE, layout: { x: -106, y: -320, width: 366, height: 382 } },
  { ...BELL_THREAD, layout: { x: 326, y: -210, width: 340, height: 394 } },
  { ...TIDE_LEDGER, layout: { x: -460, y: 190, width: 390, height: 320 } },
  { ...LOOSE_FRAGMENT, layout: { x: 20, y: 200, width: 310, height: 250 } }
] };
export const OBJECT_WORKSPACE: Workspace = { worldId: world, name: "The Drowned Coast", compositions: [{ compositionId: composition, kind: "desk", name: "Desk", cardCount: 5 }], sessions: [] };
