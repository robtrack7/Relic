import { cardRef, cardTitle } from "@/lib/world/model";
import type {
  Claim,
  DeskCard,
  DeskView,
  Link,
  ObjectRef,
  Workspace,
  WorldEntry
} from "@/lib/world/model";
import type { DeskRepository } from "@/lib/world/repository";

import type { LibrarianTool, Vantage } from "./model";

/**
 * Assembling what the Librarian is allowed to know.
 *
 * Everything here is read on the server from identifiers the client sent. The
 * browser names a composition, a focused card, and a selection; Relic re-reads
 * what those actually are. Nothing that can write to the page can write to this
 * grounding, and the same re-resolution is the seam that becomes tenancy
 * enforcement when Relic grows accounts.
 *
 * The brief is bounded on purpose. A world is much larger than a prompt, and the
 * honest way to handle that is a small accurate view of *where the GM is* plus a
 * way to look up everything else — not a truncated dump of the world that reads
 * as though it were complete. `searchTool` below is that way.
 */

/** How much of the current composition to name before it stops being a view. */
const CARDS_SHOWN = 60;
/** How many selected things get their claims spelled out rather than a line. */
const SELECTION_DETAILED = 6;
const PROSE_SHOWN = 700;
const SEARCH_RESULTS = 8;

/**
 * The numbering behind every `[n]` in an answer.
 *
 * Shared across the whole turn — the brief and every search result draw from one
 * counter — so an object mentioned twice is cited by one number wherever it came
 * from. That is the identity invariant showing up in the conversation: the
 * Harbour Guild found by search and the Harbour Guild sitting on the Desk must
 * not be two different sources.
 */
export type Catalogue = Readonly<{
  cite: (ref: ObjectRef) => number;
  sources: () => readonly ObjectRef[];
}>;

export function catalogue(): Catalogue {
  const refs: ObjectRef[] = [];
  const seen = new Map<string, number>();

  return {
    cite: (ref) => {
      const already = seen.get(ref.objectId);
      if (already !== undefined) return already;
      refs.push(ref);
      seen.set(ref.objectId, refs.length);
      return refs.length;
    },
    sources: () => refs
  };
}

const clip = (text: string, limit: number): string => {
  const flat = text.trim().replace(/\s+/g, " ");
  return flat.length <= limit ? flat : `${flat.slice(0, limit).trimEnd()}…`;
};

/** How an object reads in one line: what it is called, what it is, how settled. */
function nameLine(card: DeskCard, n: number): string {
  const kind = card.representation?.kind ?? "unclassified";
  const title = cardTitle(card) || "Unnamed";
  return `[${n}] ${title} — ${kind}, ${card.maturity}`;
}

/**
 * A claim as the Librarian must read it: the assertion, whether Relic believes
 * it, and where that belief came from.
 *
 * Truth and provenance are both stated because they answer different questions,
 * and an answer that reports the first without the second is how "the Librarian
 * inferred this" quietly becomes "this is so".
 */
function claimLine(claim: Claim, cite: (ref: ObjectRef) => number, links: readonly Link[]): string {
  const believed =
    claim.truthState === "ink"
      ? `Ink, established by ${claim.settled?.by ?? "someone"}`
      : claim.truthState === "disputed"
        ? "disputed"
        : "Pencil";
  const from = `${claim.provenance.kind.replace(/_/g, " ")} by ${claim.provenance.authoredBy}`;

  // A relational claim points at an identity. Give the far end its number so the
  // Librarian can cite the thing itself, not only the sentence about it.
  const link = links.find((l) => l.claimId === claim.id);
  const value = link ? `${claim.value} → [${cite(link.other)}]` : claim.value;

  const when = claim.story.label ? `, ${claim.story.label}` : "";
  return `    ${claim.claimKind}: ${value} (${believed}; ${from}${when})`;
}

function linkLine(link: Link, cite: (ref: ObjectRef) => number): string {
  const arrow = link.direction === "out" ? "→" : "←";
  return `    ${arrow} ${link.claimKind}: [${cite(link.other)}] ${link.other.label} (${link.truthState})`;
}

/** One object in full: prose, mechanical sheet, claims, neighbourhood. */
function inDepth(card: DeskCard, cite: (ref: ObjectRef) => number): string {
  const lines: string[] = [nameLine(card, cite(cardRef(card)))];

  const body = clip(card.body, PROSE_SHOWN);
  if (body) lines.push(`  Written: ${body}`);

  const fields = Object.entries(card.representation?.fields ?? {});
  if (fields.length > 0) {
    lines.push(`  Sheet: ${fields.map(([k, v]) => `${k} ${v}`).join(", ")}`);
  }

  if (card.claims.length > 0) {
    lines.push("  Claims:");
    for (const claim of card.claims) lines.push(claimLine(claim, cite, card.links));
  } else {
    lines.push("  Claims: none asserted.");
  }

  if (card.links.length > 0) {
    lines.push("  Connected to:");
    for (const link of card.links) lines.push(linkLine(link, cite));
  }

  return lines.join("\n");
}

/**
 * Builds the brief for one turn.
 *
 * Ordered widest to narrowest — world, composition, selection, focus — because
 * that is the order of increasing attention. What the GM has deliberately
 * deepened into comes last and in full; what merely happens to be on screen is a
 * list of names.
 */
export function buildBrief({
  workspace,
  view,
  vantage,
  cite
}: {
  workspace: Workspace;
  view: DeskView;
  vantage: Vantage;
  cite: (ref: ObjectRef) => number;
}): string {
  const out: string[] = [];

  const here = view.name ?? (view.kind === "desk" ? "the Desk" : "this composition");
  const others = workspace.compositions
    .filter((c) => c.compositionId !== view.compositionId)
    .map((c) => `${c.name} (${c.cardCount})`);

  out.push("# The world");
  out.push(
    `${workspace.name ?? "This world"} holds ${workspace.compositions.length} composition${
      workspace.compositions.length === 1 ? "" : "s"
    }. The GM is on ${here}${others.length > 0 ? `; also: ${others.join(", ")}` : ""}.`
  );
  out.push(
    "Compositions hold references and layout, never world content. The same object may sit on several at once."
  );

  const byCard = new Map(view.cards.map((card) => [card.cardId as string, card]));
  const focused = vantage.focusCardId ? (byCard.get(vantage.focusCardId) ?? null) : null;
  const selected = vantage.selectedCardIds
    .map((id) => byCard.get(id))
    .filter((card): card is DeskCard => card !== undefined);

  out.push("");
  out.push(`# In front of the GM — ${here}`);
  if (view.cards.length === 0) {
    out.push("Nothing is on it yet.");
  } else {
    const shown = [...view.cards].sort((a, b) => a.z - b.z).slice(0, CARDS_SHOWN);
    for (const card of shown) out.push(nameLine(card, cite(cardRef(card))));
    if (view.cards.length > shown.length) {
      out.push(
        `…and ${view.cards.length - shown.length} more on this composition. Search to reach them.`
      );
    }
  }

  out.push("");
  if (selected.length === 0) {
    out.push("# Selected\nNothing is selected.");
  } else if (selected.length > SELECTION_DETAILED) {
    // A large selection is an arrangement, not a reading. Names are the honest
    // amount of attention to pay it.
    out.push(`# Selected (${selected.length})`);
    for (const card of selected) out.push(nameLine(card, cite(cardRef(card))));
  } else {
    out.push(`# Selected (${selected.length})`);
    for (const card of selected) out.push(inDepth(card, cite));
  }

  out.push("");
  if (!focused) {
    out.push("# Open in the entity surface\nNothing is focused.");
  } else {
    out.push("# Open in the entity surface");
    out.push(
      "The GM deliberately deepened into this. It is almost certainly what an unqualified question is about."
    );
    out.push(inDepth(focused, cite));
  }

  return out.join("\n");
}

/**
 * The one capability offered at this step: looking things up.
 *
 * It is `searchWorld` — the same ranked index behind global search, the Library,
 * and the relationship picker. A second retrieval path for the Librarian would
 * drift from that one, and the one that drifted would be the one that could not
 * find something. What the Librarian can find is exactly what the GM can find.
 *
 * Read-only, deliberately. The Librarian's eyes arrive before its hands.
 */
export function searchTool(
  repository: DeskRepository,
  worldId: DeskView["worldId"],
  cite: (ref: ObjectRef) => number
): LibrarianTool {
  return {
    name: "search_world",
    description:
      "Search this world by name or by prose, across everything in it — not only what is on the current composition. Use it whenever the answer depends on material you cannot already see. Returns numbered entries you may cite.",
    schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Words to look for. A name matches ahead of a mention in prose. Empty browses the world alphabetically."
        }
      },
      required: ["query"],
      additionalProperties: false
    },
    note: (input) => {
      const query = typeof input.query === "string" ? input.query.trim() : "";
      return query ? `Searching for “${query}”` : "Reading the index";
    },
    run: async (input) => {
      const query = typeof input.query === "string" ? input.query : "";
      const found = await repository.searchWorld({
        worldId,
        query,
        // Archived material is out of reach here. It is what the GM cleared off
        // the Desk, and answering from it without being asked would be the
        // Librarian re-raising something they put down.
        include: "active",
        limit: SEARCH_RESULTS
      });

      if (found.length === 0) return `Nothing in this world matches “${query}”.`;
      return found.map((entry) => resultLine(entry, cite)).join("\n");
    }
  };
}

function resultLine(entry: WorldEntry, cite: (ref: ObjectRef) => number): string {
  const kinds = entry.kinds.length > 0 ? entry.kinds.join(", ") : "unclassified";
  const snippet = clip(entry.snippet, 180);
  return `[${cite(entry.ref)}] ${entry.ref.label} — ${kinds}, ${entry.maturity}${
    snippet ? ` · ${snippet}` : ""
  }`;
}
