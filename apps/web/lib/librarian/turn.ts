import type { DeskRepository } from "@/lib/world/repository";

import { buildBrief, catalogue, searchTool } from "./context";
import { handTools } from "./hands";
import {
  citedSources,
  SOUL,
  type LibrarianProvider,
  type Vantage,
  type WireEvent
} from "./model";
import { combine, reckon, type Spend } from "./spend";

/**
 * One turn, from a vantage to a stream of events.
 *
 * Lifted out of the route handler because everything interesting happens here
 * and none of it is HTTP: assembling the grounding, deciding what the Librarian
 * may reach, running the conversation, resolving citations, and recording the
 * exchange. The route is left holding request parsing and a `ReadableStream`,
 * which is all a route should be holding — and this is drivable by a suite with
 * a scripted provider, which the route never was.
 *
 * The re-resolution is the security property and it lives here. The caller hands
 * over identifiers; every word of world content is read from them, on the
 * server. A card id naming something on another composition resolves to nothing
 * rather than to context, and — now that the Librarian has hands — to nothing
 * rather than to a target.
 */
export async function runTurn({
  repository,
  provider,
  vantage,
  ask
}: {
  repository: DeskRepository;
  provider: LibrarianProvider;
  vantage: Vantage;
  ask: string;
}): Promise<AsyncIterable<WireEvent> | null> {
  const view = await repository.openComposition(vantage.compositionId);
  if (!view) return null;

  // Read from the composition, never from the client — which session is being
  // prepared is a property of where the GM is standing, not something a browser
  // gets to name. Null everywhere but a Prep, and the planning tool is then
  // simply not offered.
  const [workspace, history, prep] = await Promise.all([
    repository.openWorld(view.worldId),
    repository.librarianHistory(view.worldId),
    view.kind === "prep" ? repository.openPrep(view.compositionId) : Promise.resolve(null)
  ]);

  // One numbering for the whole turn. The brief, every search result, and
  // anything the Librarian creates all draw from it — so an object reached three
  // ways is one number, and a number is the only way to name anything.
  const sources = catalogue();
  const brief = buildBrief({ workspace, view, prep, vantage, cite: sources.cite });

  const tools = [
    searchTool(repository, view.worldId, sources.cite),
    ...handTools({
      repository,
      compositionId: view.compositionId,
      catalogue: sources,
      here: vantage.here,
      session: prep?.session ?? null
    })
  ];

  const conversation = provider.converse(
    { worldId: view.worldId, soul: SOUL, brief, history, ask },
    tools
  );

  return (async function* stream(): AsyncIterable<WireEvent> {
    // What was done, kept so that a turn which acted without speaking still
    // leaves an account of itself in the transcript.
    const acts: string[] = [];

    /*
     * What each round trip cost. A turn that searches twice before answering is
     * three calls to the provider and one cost to the GM, so they are summed
     * here rather than reported one by one — the transcript's unit is the turn,
     * and so is the question anybody asks about spend.
     *
     * These never reach the browser as tokens. Pricing needs the rate table and
     * `LIBRARIAN_RATES`, both of which are the server's, so `done` carries a
     * priced reckoning instead.
     */
    const costs: Spend[] = [];

    for await (const event of conversation) {
      if (event.type === "acted") acts.push(event.note);
      if (event.type === "spent") {
        costs.push(event.spend);
        continue;
      }
      if (event.type !== "done") {
        yield event;
        continue;
      }

      const body = event.body.trim() || summarise(acts);
      if (!body) {
        // Nothing said and nothing done. Recording it would put a silent turn
        // into every later prompt, reading as a question the Librarian ignored.
        yield { type: "failed", message: "The Librarian had nothing to say." };
        continue;
      }

      const spend = combine(costs);
      const cited = citedSources(body, sources.sources());
      await repository.recordExchange({
        worldId: view.worldId,
        compositionId: view.compositionId,
        ask,
        answer: body,
        sources: cited,
        spend
      });
      yield {
        type: "done",
        body,
        sources: cited,
        spent: reckon({ turns: spend ? 1 : 0, byModel: spend ? [spend] : [] })
      };
    }
  })();
}

/**
 * What to record when the Librarian worked but did not speak.
 *
 * The transcript is part of every later prompt, so a turn that moved half the
 * Desk and then said nothing would replay as though the request had been
 * ignored — and the GM scrolling back would find no account of why their world
 * changed. The notes the tools already produced are that account.
 */
function summarise(acts: readonly string[]): string {
  if (acts.length === 0) return "";
  return acts.join(" ");
}
