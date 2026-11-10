import OpenAI from "openai";

import type { LibrarianEvent, LibrarianProvider, LibrarianTool, Turn } from "./model";
import type { Spend } from "./spend";

/**
 * The Librarian, run by GPT.
 *
 * The second of two files in Relic that know a model exists, and it exists to
 * prove the first one was honest. `AI.md` says models are replaceable workers
 * behind a stable product intelligence; a port with one implementation is a
 * claim, and a port with two is a fact. Everything the Librarian *is* — its
 * identity, its truth laws, what it may see, what it may cite, what it may do —
 * is assembled above this line and arrives as a `Turn`. Nothing here decides any
 * of it, which is the property worth keeping: swapping this file for the
 * Anthropic one must not be able to change what the Librarian believes about Ink.
 *
 * Read this beside `anthropic.ts`. They are deliberately the same shape, and
 * where they differ the difference is the provider's, not Relic's.
 */

/**
 * V1 reached the same three models through a LiteLLM alias table — `relic-fast`,
 * `relic-balanced`, `relic-deep` mapping to luna, terra, and sol. The indirection
 * existed to keep a key out of the app and to allow a model swap without a
 * deploy; `LIBRARIAN_MODEL` buys both more cheaply. Terra is V1's "balanced",
 * and balanced is what a conversation beside a canvas wants.
 */
const MODEL = process.env.LIBRARIAN_MODEL?.trim() || "gpt-5.6-terra";

/**
 * A conversation beside a working canvas, not a research run.
 *
 * The same judgment `anthropic.ts` makes in its own vocabulary: answers here are
 * two or three sentences over material Relic has already assembled, and the GM is
 * waiting with a card half-dragged. Depth is the wrong thing to buy.
 */
const EFFORT = "low" as const;

/** Room for reasoning plus a short answer; both draw on the same ceiling. */
const MAX_TOKENS = 8000;

/**
 * How many times the Librarian may look something up before it has to answer.
 *
 * Not a safety rail against a hostile model — a bound on how long the GM waits.
 * Identical to the Anthropic adapter's, because it is a product decision about
 * patience rather than a property of either model.
 */
const MAX_LOOKUPS = 4;

/**
 * The output items a turn configured with function tools alone can produce, and
 * the three that are legal to send back as input. Named because it is the exact
 * overlap of `ResponseOutputItem` and `ResponseInputItem` that Relic uses.
 */
type Spoken =
  | OpenAI.Responses.ResponseOutputMessage
  | OpenAI.Responses.ResponseFunctionToolCall
  | OpenAI.Responses.ResponseReasoningItem;

export class OpenAILibrarian implements LibrarianProvider {
  readonly #client: OpenAI | null;

  constructor(apiKey: string | undefined) {
    this.#client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  static open(): OpenAILibrarian {
    return new OpenAILibrarian(process.env.OPENAI_API_KEY?.trim() || undefined);
  }

  get ready(): boolean {
    return this.#client !== null;
  }

  async *converse(
    turn: Turn,
    tools: readonly LibrarianTool[]
  ): AsyncIterable<LibrarianEvent> {
    const client = this.#client;
    if (!client) {
      yield {
        type: "failed",
        message: "The Librarian is not configured. Set OPENAI_API_KEY to wake it."
      };
      return;
    }

    const byName = new Map(tools.map((tool) => [tool.name, tool]));

    /*
     * `strict: false` deliberately. Strict mode would guarantee well-formed
     * arguments, but it constrains a schema to a subset — every property
     * required, optionals expressed as nullable unions — and `LibrarianTool.schema`
     * is one schema shared by both adapters. Satisfying one provider's dialect
     * would push its constraint up through the port into Relic's own tool
     * definitions, which is backwards. The tools validate their own input
     * regardless: a citation number is checked against the turn's catalogue
     * before anything is written, and that check cannot be delegated to a schema.
     */
    const definitions: OpenAI.Responses.FunctionTool[] = tools.map((tool) => ({
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.schema,
      strict: false
    }));

    /*
     * Soul first, grounding second, in one string because this API takes one.
     * The reasoning survives the shape change: the Soul and the tool list are
     * byte-identical on every turn in every world, the brief changes with the
     * GM's every click, and caching is a property of the prefix. Putting the
     * volatile half first would cache nothing.
     */
    const instructions = `${turn.soul}\n\n# Grounding\n\n${turn.brief}`;

    const input: OpenAI.Responses.ResponseInput = [
      ...turn.history.map(
        (message): OpenAI.Responses.ResponseInputItem => ({
          role: message.speaker === "gm" ? "user" : "assistant",
          content: message.body
        })
      ),
      { role: "user", content: turn.ask }
    ];

    let spoken = "";

    try {
      for (let lookup = 0; ; lookup += 1) {
        const stream = await client.responses.create({
          model: MODEL,
          instructions,
          input,
          tools: definitions,
          max_output_tokens: MAX_TOKENS,
          reasoning: { effort: EFFORT },
          /*
           * Relic keeps the transcript, in Postgres, read on the server by world
           * id. That is a security decision before it is a storage one — a
           * conversation held anywhere the server has to be told about is a
           * conversation something else can rewrite. Not storing it here also
           * means reasoning has to ride back in `input`, hence the include.
           */
          store: false,
          include: ["reasoning.encrypted_content"],
          stream: true
        });

        let reply: OpenAI.Responses.Response | null = null;

        for await (const event of stream) {
          if (event.type === "response.output_text.delta" && event.delta) {
            spoken += event.delta;
            yield { type: "text", text: event.delta };
            continue;
          }
          if (event.type === "response.completed") reply = event.response;
          if (event.type === "response.incomplete") reply = event.response;
          if (event.type === "response.failed") {
            yield { type: "failed", message: "The Librarian could not answer that." };
            return;
          }
        }

        if (!reply) {
          yield { type: "failed", message: "The Librarian stopped mid-sentence." };
          return;
        }

        // Before anything that can return. A round trip that ends in a refusal
        // or a tool loop still cost what it cost, and a meter that only counts
        // the turns that went well is a meter that under-reports.
        if (reply.usage) yield { type: "spent", spend: spent(reply.usage) };

        // A refusal is a decision, not a failure, and the Soul's laws are not
        // what triggers one. Report it as itself rather than as an error.
        const refused = reply.output.some(
          (item) =>
            item.type === "message" &&
            item.content.some((part) => part.type === "refusal")
        );
        if (refused) {
          yield { type: "failed", message: "The Librarian declined to answer that." };
          return;
        }

        const calls = reply.output.filter(
          (item): item is OpenAI.Responses.ResponseFunctionToolCall =>
            item.type === "function_call"
        );
        if (calls.length === 0) break;

        /*
         * Reasoning rides back unchanged alongside the calls it preceded — drop
         * it and the model re-derives its way to the same tool call, which is
         * both slower and a different answer.
         *
         * The filter is a type narrowing, not a policy: `output` is typed as
         * every item kind the API can produce, including tools Relic does not
         * enable, and only these three are reachable from a request carrying
         * function tools alone. Anything else appearing here is a surprise, and
         * silently forwarding a surprise is worse than dropping it.
         */
        input.push(
          ...reply.output.filter(
            (item): item is Spoken =>
              item.type === "message" ||
              item.type === "function_call" ||
              item.type === "reasoning"
          )
        );

        if (lookup >= MAX_LOOKUPS) {
          // Stop looking and answer from what is already in hand. Cutting the
          // turn off entirely would throw away work the GM has waited for.
          for (const call of calls) {
            input.push({
              type: "function_call_output",
              call_id: call.call_id,
              output: "Enough looking — answer from what you have found so far."
            });
          }
          continue;
        }

        for (const call of calls) {
          const tool = byName.get(call.name);
          if (!tool) {
            input.push({
              type: "function_call_output",
              call_id: call.call_id,
              output: `There is no tool called ${call.name}.`
            });
            continue;
          }

          const asked = read(call.arguments);
          if (!asked) {
            input.push({
              type: "function_call_output",
              call_id: call.call_id,
              output: "Those arguments were not readable JSON."
            });
            continue;
          }

          yield { type: "consulting", note: tool.note(asked) };

          try {
            const outcome = await tool.run(asked);
            // The effect goes to the browser and the prose goes back to the
            // model. This adapter reads neither — it only knows an outcome has
            // two halves and which way each one travels.
            if (outcome.effect) {
              yield { type: "acted", note: outcome.told, effect: outcome.effect };
            }
            input.push({
              type: "function_call_output",
              call_id: call.call_id,
              output: outcome.told
            });
          } catch {
            // Reported to the model rather than thrown, so a failed lookup ends
            // in "I could not reach that" instead of a dead conversation.
            input.push({
              type: "function_call_output",
              call_id: call.call_id,
              output: "That lookup failed."
            });
          }
        }
      }
    } catch (error) {
      yield { type: "failed", message: explain(error) };
      return;
    }

    yield { type: "done", body: spoken };
  }
}

/**
 * Tool arguments arrive as a JSON string rather than a parsed object here, so
 * malformed JSON is a case rather than an impossibility. Told to the model, like
 * every other tool failure, because it can fix it on the next call.
 */
function read(args: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(args || "{}");
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * OpenAI's usage, in Relic's buckets.
 *
 * The subtraction is the whole reason this is a function rather than an object
 * literal. OpenAI reports `input_tokens` as the **total** prompt, with the
 * cached portion counted inside it and repeated in
 * `input_tokens_details.cached_tokens`; Anthropic reports the uncached
 * remainder with cache figures beside it. Copying either dialect straight
 * through would double-count the cached half here and make two worlds' totals
 * incomparable — so `input` is reduced to what was genuinely read fresh.
 *
 * `cacheWrite` is zero because this API caches automatically and charges
 * nothing to populate a cache. That is a real zero, not a missing figure:
 * pricing it as input would invent a cost the account will never be billed.
 *
 * Reasoning tokens are already inside `output_tokens` and are billed as output,
 * so they are deliberately not added again.
 */
function spent(usage: OpenAI.Responses.ResponseUsage): Spend {
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  return {
    provider: "openai",
    model: MODEL,
    input: Math.max(0, usage.input_tokens - cached),
    cacheWrite: 0,
    cacheRead: cached,
    output: usage.output_tokens
  };
}

/**
 * What went wrong, in words a GM can act on.
 *
 * Typed classes rather than message matching, and deliberately not the raw
 * provider text: "insufficient_quota" is the model's vocabulary, not Relic's.
 * The sentences match the Anthropic adapter's exactly — which provider is
 * behind the Librarian is not the GM's problem.
 *
 * The whole provider error is logged on the way past, because the sentence a GM
 * reads and the sentence an operator needs are different sentences. Flattening
 * both into the former made a misconfigured `LIBRARIAN_MODEL` undiagnosable
 * without writing a script against the provider by hand — which is a real cost
 * paid for a privacy the server console does not owe anybody. Nothing here
 * carries the key: the SDK's errors report status and body, never credentials.
 */
function explain(error: unknown): string {
  console.error("[librarian] openai:", error);

  if (error instanceof OpenAI.AuthenticationError) {
    return "The Librarian's credentials were refused.";
  }
  if (error instanceof OpenAI.PermissionDeniedError) {
    return "The Librarian's credentials do not allow that model.";
  }
  if (error instanceof OpenAI.RateLimitError) {
    return "The Librarian is being asked too much at once. Try again shortly.";
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return "The Librarian could not be reached.";
  }
  /*
   * A rejected request is never the GM's fault, and telling them the Librarian
   * "could not answer that" points them at their own question — the one place
   * the problem is not. Relic builds every request itself, so a refusal of its
   * *shape* is a misconfiguration or a bug here: an unknown model name is the
   * common one and reads exactly like this.
   */
  if (error instanceof OpenAI.NotFoundError || error instanceof OpenAI.BadRequestError) {
    return "The Librarian is misconfigured — check LIBRARIAN_MODEL names a real model.";
  }
  if (error instanceof OpenAI.APIError) {
    return "The Librarian could not answer that.";
  }
  return "Something went wrong reaching the Librarian.";
}
