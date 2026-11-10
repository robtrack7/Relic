import { asCardId, asRepresentationId, asWorldObjectId, type DeskCard, type RepresentationKind } from "@/lib/world/model";
import { BELL_THREAD, LOOSE_FRAGMENT, MARA, THIRD_TOLL, TIDE_LEDGER, WATCHERS_SPIRE, fixtureClaim } from "./object-fixtures";

/** A coherent development world; never installed into the GM's real world. */
function specimen(key: string, kind: RepresentationKind | null, name: string, body: string, fields: Record<string, string | number> = {}): DeskCard {
  const objectId = asWorldObjectId(`knowledge-${key}`);
  return { ...LOOSE_FRAGMENT, objectId, cardId: asCardId(`knowledge-card-${key}`), body, claims: [], links: [],
    layout: { x: 0, y: 0, width: 300, height: 260 }, maturity: "pencil", settled: null,
    representation: kind ? { id: asRepresentationId(`knowledge-rep-${key}`), objectId, kind, label: name, fields, version: 1, templateId: null } : null };
}

const faction = specimen("guild", "faction", "The Lamplighters’ Compact",
  "The harbour’s lamplighters know which boats return without their crews. Their compact began as a burial fund; it has become the coast’s quietest intelligence network.\n\nEvery member carries a brass wick key. No member will enter the drowned tower alone.",
  { image: "/desk/blackwater-harbour.webp", imageAlt: "Lanterns reflected in Blackwater harbour.", purpose: "Keep the coastal lights burning, and bring their keepers home.", influence: "Harbour watch, ferry crews, and parish archives", gmNotes: "Their leader has hidden a page from the tide ledger. She will trade it for the names of the missing crew." });
const richFaction = { ...faction, maturity: "ink" as const, claims: [fixtureClaim(faction, "status", "Divided"), fixtureClaim(faction, "goal", "Recover the lost keepers"), fixtureClaim(faction, "development:600", "The western lamp went dark for the first time in forty years.", { story: { order: 600, precision: "relative", label: "Before the third toll" } })] };

export const KNOWLEDGE_RICH: readonly DeskCard[] = [
  { ...MARA, body: "Mara arrived with the winter tide and an unopened letter from the crown. She has the patience of someone who has survived three courts and the manners of someone who remembers every slight.\n\nShe is searching for the name erased from the harbour register. The search has brought her to Watcher’s Spire, where she once swore never to return.\n\nAt the table, let her finish listening before she answers. When she lies, she becomes more precise.", representation: { ...MARA.representation!, fields: { ...MARA.representation!.fields, gmNotes: "Mara recognizes the bell because her brother cast it. She has not told the Compact.\n\nIf the GM needs a quiet scene, offer tea in the parish archive and let the rain do the talking." } } },
  { ...WATCHERS_SPIRE, representation: { ...WATCHERS_SPIRE.representation!, fields: { ...WATCHERS_SPIRE.representation!.fields, atmosphere: "Salt in every seam. A bell rope stiff with old seawater. Below the last step, a warm current moves against the tide." } } },
  BELL_THREAD, TIDE_LEDGER,
  { ...LOOSE_FRAGMENT, body: "Found inside a sailor’s coat:\n\nThe fourth bell is a promise, not a warning. If I do not return, ask the woman who lights the western lamp.\n\nThe paper smells of lamp oil. No signature." },
  richFaction, THIRD_TOLL
];

export const KNOWLEDGE_SPARSE: readonly DeskCard[] = [
  specimen("sparse-character", "character", "Iven, the night ferryman", "Won’t take a fare after the third bell.", { portrayal: "Always checks the water before answering." }),
  specimen("sparse-place", "place", "The western lamp", "A light on the outer shoal. Extinguished since the storm."),
  specimen("sparse-thread", "thread", "A debt to the sea", "Who is keeping the harbour’s oldest promise?", { concerns: "Who signed the first compact?" }),
  specimen("sparse-source", "source", "A torn passenger list", "Seven names. The eighth has been cut away.", { citation: "Parish archive · uncatalogued loose leaf", sourceType: "Handwritten note", origin: "Recovered from the western lamp" }),
  specimen("sparse-fragment", null, "", "A brass key that opens no lock anyone remembers."),
  specimen("sparse-faction", "faction", "The Empty Choir", "A name whispered by returning crews.")
];

export const KNOWLEDGE_FIXTURES = [...KNOWLEDGE_RICH, ...KNOWLEDGE_SPARSE];
