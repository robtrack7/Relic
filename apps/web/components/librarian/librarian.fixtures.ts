import { asLibrarianMessageId, type LibrarianMessage, type WireEvent } from "@/lib/librarian/model";
import { asCompositionId, asWorldObjectId } from "@/lib/world/model";

/** Authored Storybook data only. Production always uses /api/librarian. */
export const LIBRARIAN_COMPOSITION = asCompositionId("00000000-0000-4000-8000-000000000008");
export const LIBRARIAN_SOURCES = [{ n: 1, ref: { objectId: asWorldObjectId("00000000-0000-4000-8000-000000000009"), kind: "source" as const, label: "Tide ledger · folio 9" } }];
export const LIBRARIAN_HISTORY: readonly LibrarianMessage[] = [
  { id: asLibrarianMessageId("fixture-question"), speaker: "gm", body: "What connects the missing crews to the western quay?", sources: [], compositionId: LIBRARIAN_COMPOSITION, spend: null, saidAt: "2026-11-05T18:00:00Z" },
  { id: asLibrarianMessageId("fixture-answer"), speaker: "librarian", body: "The tide ledger places all three crews at the western quay before they disappeared. Each entry records the same knock pattern. [1]\n\nThe ledger does not establish who was knocking, or why the crews followed it.", sources: LIBRARIAN_SOURCES, compositionId: LIBRARIAN_COMPOSITION, spend: null, saidAt: "2026-11-05T18:00:01Z" }
];

export type LibrarianFixtureState = "ready" | "empty" | "overflow" | "unavailable" | "interrupted" | "submitting";

/** A local transport seam: no model calls or world mutations in these stories. */
export function librarianFixtureRequest(state: LibrarianFixtureState = "ready"): typeof fetch {
  return async (_input, init) => {
    if (init?.method !== "POST") {
      const messages = state === "empty" ? [] : state === "overflow"
        ? Array.from({ length: 10 }, (_, index) => LIBRARIAN_HISTORY.map(message => ({ ...message, id: asLibrarianMessageId(`${message.id}-${index}`) }))).flat()
        : LIBRARIAN_HISTORY;
      return Response.json({ ready: state !== "unavailable", messages });
    }
    if (state === "interrupted") return Response.json({ error: "The connection was interrupted. Your question is kept below." }, { status: 503 });
    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setTimeout>;
    return new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        const events: WireEvent[] = [
          { type: "consulting", note: "Reading the tide ledger" },
          { type: "text", text: LIBRARIAN_HISTORY[1]!.body },
          { type: "done", body: LIBRARIAN_HISTORY[1]!.body, sources: LIBRARIAN_SOURCES, spent: { turns: 0, tokens: 0, usd: null } }
        ];
        let index = 0;
        const send = () => {
          controller.enqueue(encoder.encode(JSON.stringify(events[index++]) + "\n"));
          if (index === events.length) controller.close();
          else timer = setTimeout(send, state === "submitting" ? 5000 : 250);
        };
        send();
      },
      cancel() { clearTimeout(timer); }
    }), { headers: { "content-type": "application/x-ndjson" } });
  };
}
