import type { Vantage, WireEvent } from "@/lib/librarian/model";
import { reckon } from "@/lib/librarian/spend";
import { librarian } from "@/lib/librarian/store";
import { runTurn } from "@/lib/librarian/turn";
import { asCompositionId } from "@/lib/world/model";
import { deskRepository } from "@/lib/world/store";

/**
 * The Librarian's boundary.
 *
 * A route handler rather than a server action, for one reason: the answer
 * streams. Everything else in Relic commits and returns, and a server action is
 * the right shape for that; a sentence arriving a word at a time is not.
 *
 * What crosses this boundary inward is identifiers, one point, and one sentence
 * of the GM's. No world content, and no transcript — both are read in `turn.ts`,
 * from the ids, so that nothing able to write to the page is able to write to
 * the model's context or to choose what it writes to. What crosses outward is
 * newline-delimited JSON: we own both ends, and SSE's field grammar would be
 * ceremony over a channel that carries five kinds of event.
 *
 * The turn itself is deliberately not here. This file parses a request and
 * pumps a stream; what a turn *is* belongs somewhere a suite can reach without
 * standing up HTTP.
 */

/** A question, not a document. Long enough for a paragraph of context. */
const ASK_LIMIT = 4000;

/**
 * Every id in Relic is a uuid, and this is the one place that has to say so.
 *
 * Not a security boundary — the re-resolution in `runTurn` is that, and an id
 * that gets past this still only reaches a composition that actually exists. It
 * is about *how* a bad request fails. Anything that is not a uuid reaches
 * Postgres as a uuid comparison and comes back as a 500, which reports Relic as
 * broken when the request was merely malformed. Server actions do not have this
 * problem because `run()` catches into a typed `failed`; a route has to say it
 * itself.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const identifier = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);

export async function GET(request: Request) {
  const compositionId = new URL(request.url).searchParams.get("composition");
  if (!identifier(compositionId)) return bad("No composition named.");

  const repository = deskRepository();
  const view = await repository.openComposition(asCompositionId(compositionId));
  if (!view) return bad("That composition does not exist.", 404);

  /*
   * The transcript and the bill are two different windows onto the same rows.
   * History is the most recent forty messages, because that is what a prompt
   * needs; spend is every message this world ever paid for, because "what has
   * this cost me" is a lifetime question and answering it from the visible tail
   * would answer it low.
   *
   * Priced here rather than in the browser: the rate table and
   * `LIBRARIAN_RATES` are the server's, and shipping them to the client to
   * multiply four numbers would put a cost model in the one place that cannot
   * be trusted to hold one.
   */
  const [messages, tally] = await Promise.all([
    repository.librarianHistory(view.worldId),
    repository.librarianSpend(view.worldId)
  ]);

  return Response.json({
    ready: librarian().ready,
    messages,
    spent: reckon(tally)
  });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return bad("Malformed request.");
  }

  const input = payload as Partial<{
    compositionId: string;
    focusCardId: string | null;
    selectedCardIds: string[];
    here: { x: number; y: number } | null;
    ask: string;
  }>;

  const ask = typeof input.ask === "string" ? input.ask.trim() : "";
  if (!ask) return bad("Nothing was asked.");
  if (ask.length > ASK_LIMIT) return bad("That is too long to ask at once.");
  if (!identifier(input.compositionId)) return bad("No composition named.");

  const vantage: Vantage = {
    compositionId: asCompositionId(input.compositionId),
    focusCardId: typeof input.focusCardId === "string" ? input.focusCardId : null,
    selectedCardIds: Array.isArray(input.selectedCardIds)
      ? input.selectedCardIds.filter((id): id is string => typeof id === "string")
      : [],
    here: point(input.here)
  };

  const conversation = await runTurn({
    repository: deskRepository(),
    provider: librarian(),
    vantage,
    ask
  });
  if (!conversation) return bad("That composition does not exist.", 404);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: WireEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      try {
        for await (const event of conversation) send(event);
      } catch {
        send({ type: "failed", message: "The conversation was interrupted." });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      // Proxies that buffer would turn a streamed sentence back into a pause.
      "x-accel-buffering": "no"
    }
  });
}

/**
 * Where the GM is looking.
 *
 * Bounded rather than trusted — not because a bad coordinate is dangerous, but
 * because `NaN` or `1e300` would reach the layout code and produce a card
 * nobody can find. Anything unreadable becomes null, and the composition's own
 * middle is used instead.
 */
function point(value: unknown): { x: number; y: number } | null {
  if (value === null || typeof value !== "object") return null;
  const { x, y } = value as { x?: unknown; y?: unknown };
  if (typeof x !== "number" || typeof y !== "number") return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (Math.abs(x) > 1e7 || Math.abs(y) > 1e7) return null;
  return { x, y };
}

const bad = (message: string, status = 400) =>
  Response.json({ error: message }, { status });
