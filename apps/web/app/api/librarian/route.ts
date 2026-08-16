import { catalogue, buildBrief, searchTool } from "@/lib/librarian/context";
import { citedSources, SOUL, type LibrarianEvent, type Vantage } from "@/lib/librarian/model";
import { librarian } from "@/lib/librarian/store";
import { asCompositionId } from "@/lib/world/model";
import { deskRepository } from "@/lib/world/store";

/**
 * The Librarian's boundary.
 *
 * A route handler rather than a server action, for one reason: the answer
 * streams. Everything else in Relic commits and returns, and a server action is
 * the right shape for that; a sentence arriving a word at a time is not.
 *
 * What crosses this boundary inward is identifiers and one sentence of the GM's.
 * No world content, and no transcript — both are read here, from the ids, so
 * that nothing able to write to the page is able to write to the model's
 * context. What crosses outward is newline-delimited JSON: we own both ends, and
 * SSE's field grammar would be ceremony over a channel that carries four kinds
 * of event.
 */

/** A question, not a document. Long enough for a paragraph of context. */
const ASK_LIMIT = 4000;

export async function GET(request: Request) {
  const compositionId = new URL(request.url).searchParams.get("composition");
  if (!compositionId) return bad("No composition named.");

  const repository = deskRepository();
  const view = await repository.openComposition(asCompositionId(compositionId));
  if (!view) return bad("That composition does not exist.", 404);

  const messages = await repository.librarianHistory(view.worldId);
  return Response.json({ ready: librarian().ready, messages });
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
    ask: string;
  }>;

  const ask = typeof input.ask === "string" ? input.ask.trim() : "";
  if (!ask) return bad("Nothing was asked.");
  if (ask.length > ASK_LIMIT) return bad("That is too long to ask at once.");
  if (typeof input.compositionId !== "string") return bad("No composition named.");

  const repository = deskRepository();

  // The re-resolution. The client said which composition it is looking at; what
  // is *on* it is read here, and a card id the client sent that is not on it
  // simply resolves to nothing.
  const view = await repository.openComposition(asCompositionId(input.compositionId));
  if (!view) return bad("That composition does not exist.", 404);

  const vantage: Vantage = {
    compositionId: view.compositionId,
    focusCardId: typeof input.focusCardId === "string" ? input.focusCardId : null,
    selectedCardIds: Array.isArray(input.selectedCardIds)
      ? input.selectedCardIds.filter((id): id is string => typeof id === "string")
      : []
  };

  const [workspace, history] = await Promise.all([
    repository.openWorld(view.worldId),
    repository.librarianHistory(view.worldId)
  ]);

  // One numbering for the whole turn: the brief and every search result draw
  // from it, so an object found two ways is cited by one number.
  const sources = catalogue();
  const brief = buildBrief({ workspace, view, vantage, cite: sources.cite });
  const tools = [searchTool(repository, view.worldId, sources.cite)];

  const conversation = librarian().converse(
    { worldId: view.worldId, soul: SOUL, brief, history, ask },
    tools
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: LibrarianEvent & { sources?: unknown }) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      try {
        for await (const event of conversation) {
          if (event.type !== "done") {
            send(event);
            continue;
          }

          const body = event.body.trim();
          if (!body) {
            // Nothing was said. Recording it would put a silent turn into every
            // later prompt, which reads as the Librarian having ignored a
            // question it never actually answered.
            send({ type: "failed", message: "The Librarian had nothing to say." });
            continue;
          }

          const cited = citedSources(body, sources.sources());
          await repository.recordExchange({
            worldId: view.worldId,
            compositionId: view.compositionId,
            ask,
            answer: body,
            sources: cited
          });
          send({ type: "done", body, sources: cited });
        }
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

const bad = (message: string, status = 400) =>
  Response.json({ error: message }, { status });
