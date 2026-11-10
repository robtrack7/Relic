import Anthropic from "@anthropic-ai/sdk";

import type { LibrarianEvent, LibrarianProvider, LibrarianTool, Turn } from "./model";
import type { Spend } from "./spend";

/**
 * The Librarian, run by Claude.
 *
 * The only file in Relic that knows a model exists. Everything the Librarian
 * *is* — its identity, the truth laws it works under, what it may see, what it
 * may cite, and what it is allowed to do — is assembled above this line and
 * arrives here as a `Turn`. That is `AI.md`'s rule made structural: models are
 * replaceable workers behind a stable product intelligence, so replacing one
 * must not be able to change what the Librarian believes about Ink.
 */

const MODEL = process.env.LIBRARIAN_MODEL?.trim() || "claude-opus-5";

/**
 * A conversation beside a working canvas, not a research run.
 *
 * `medium` is the deliberate choice rather than the default: answers here are
 * two or three sentences over material already assembled for the model, and the
 * GM is waiting with a card half-dragged. Depth is the wrong thing to buy.
 */
const EFFORT = "medium" as const;

/**
 * Room for thinking plus a short answer. Thinking is on by default on this model
 * and counts against the same ceiling, so a budget sized to the visible reply
 * would truncate the reply.
 */
const MAX_TOKENS = 8000;

/**
 * How many times the Librarian may look something up before it has to answer.
 *
 * Not a safety rail against a hostile model — a bound on how long the GM waits.
 * Four searches is more than any real question needs, and a Librarian still
 * hunting after four should say what it found rather than keep going.
 */
const MAX_LOOKUPS = 4;

export class AnthropicLibrarian implements LibrarianProvider {
  readonly #client: Anthropic | null;

  constructor(apiKey: string | undefined) {
    this.#client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  static open(): AnthropicLibrarian {
    return new AnthropicLibrarian(process.env.ANTHROPIC_API_KEY?.trim() || undefined);
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
        message: "The Librarian is not configured. Set ANTHROPIC_API_KEY to wake it."
      };
      return;
    }

    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    const definitions = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.schema as Anthropic.Tool.InputSchema
    }));

    /*
     * Render order is tools → system → messages, and the cache breakpoint sits
     * on the Soul rather than on the grounding. The Soul and the tool list are
     * byte-identical on every turn in every world; the brief changes with the
     * GM's every click. Caching the stable half and leaving the volatile half
     * after it is the whole trick — reversing them would cache nothing.
     */
    const system: Anthropic.TextBlockParam[] = [
      { type: "text", text: turn.soul, cache_control: { type: "ephemeral" } },
      { type: "text", text: `# Grounding\n\n${turn.brief}` }
    ];

    const messages: Anthropic.MessageParam[] = [
      ...turn.history.map(
        (message): Anthropic.MessageParam => ({
          role: message.speaker === "gm" ? "user" : "assistant",
          content: message.body
        })
      ),
      { role: "user", content: turn.ask }
    ];

    let spoken = "";

    try {
      for (let lookup = 0; ; lookup += 1) {
        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          output_config: { effort: EFFORT },
          system,
          tools: definitions,
          messages
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta" &&
            event.delta.text
          ) {
            spoken += event.delta.text;
            yield { type: "text", text: event.delta.text };
          }
        }

        const reply = await stream.finalMessage();

        // Before anything that can return. A round trip that ends in a refusal
        // or a tool loop still cost what it cost, and a meter that only counts
        // the turns that went well is a meter that under-reports.
        yield { type: "spent", spend: spent(reply.usage) };

        // A refusal is a decision, not a failure, and the Soul's laws are not
        // what triggers one. Report it as itself rather than as an error.
        if (reply.stop_reason === "refusal") {
          yield { type: "failed", message: "The Librarian declined to answer that." };
          return;
        }

        const calls = reply.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
        );
        if (reply.stop_reason !== "tool_use" || calls.length === 0) break;

        if (lookup >= MAX_LOOKUPS) {
          // Stop looking and answer from what is already in hand. Cutting the
          // turn off entirely would throw away work the GM has waited for.
          messages.push({ role: "assistant", content: reply.content });
          messages.push({
            role: "user",
            content: [
              ...calls.map(
                (call): Anthropic.ToolResultBlockParam => ({
                  type: "tool_result",
                  tool_use_id: call.id,
                  content: "Enough looking — answer from what you have found so far.",
                  is_error: true
                })
              )
            ]
          });
          continue;
        }

        // Thinking blocks ride back unchanged alongside the tool calls they
        // preceded; the whole content array goes, never a filtered copy of it.
        messages.push({ role: "assistant", content: reply.content });

        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const call of calls) {
          const tool = byName.get(call.name);
          const input = (call.input ?? {}) as Record<string, unknown>;

          if (!tool) {
            results.push({
              type: "tool_result",
              tool_use_id: call.id,
              content: `There is no tool called ${call.name}.`,
              is_error: true
            });
            continue;
          }

          yield { type: "consulting", note: tool.note(input) };

          try {
            const outcome = await tool.run(input);
            // The effect goes to the browser and the prose goes back to the
            // model. This adapter reads neither — it only knows an outcome has
            // two halves and which way each one travels.
            if (outcome.effect) {
              yield { type: "acted", note: outcome.told, effect: outcome.effect };
            }
            results.push({
              type: "tool_result",
              tool_use_id: call.id,
              content: outcome.told
            });
          } catch {
            // Reported to the model rather than thrown, so a failed lookup ends
            // in "I could not reach that" instead of a dead conversation.
            results.push({
              type: "tool_result",
              tool_use_id: call.id,
              content: "That lookup failed.",
              is_error: true
            });
          }
        }

        messages.push({ role: "user", content: results });
      }
    } catch (error) {
      yield { type: "failed", message: explain(error) };
      return;
    }

    yield { type: "done", body: spoken };
  }
}

/**
 * Anthropic's usage, in Relic's buckets.
 *
 * The translation is a one-liner and still worth naming, because the two
 * providers disagree about what "input tokens" means. Anthropic reports
 * `input_tokens` as the uncached remainder, with cache reads and writes
 * counted separately beside it — which is already Relic's shape, so nothing is
 * subtracted here. The OpenAI adapter has to subtract, and reading the two
 * functions together is the only way to see that the difference was handled
 * rather than overlooked.
 */
function spent(usage: Anthropic.Usage): Spend {
  return {
    provider: "anthropic",
    model: MODEL,
    input: usage.input_tokens,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    output: usage.output_tokens
  };
}

/**
 * What went wrong, in words a GM can act on.
 *
 * Typed classes rather than message matching, and deliberately not the raw
 * provider text: "rate_limit_error" is the model's vocabulary, not Relic's.
 *
 * The whole provider error is logged on the way past, because the sentence a GM
 * reads and the sentence an operator needs are different sentences. Read this
 * beside `openai.ts`: the branches and the wording are deliberately the same,
 * because which provider is behind the Librarian is not the GM's problem.
 */
function explain(error: unknown): string {
  console.error("[librarian] anthropic:", error);

  if (error instanceof Anthropic.AuthenticationError) {
    return "The Librarian's credentials were refused.";
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return "The Librarian's credentials do not allow that model.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "The Librarian is being asked too much at once. Try again shortly.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "The Librarian could not be reached.";
  }
  // Relic builds every request itself, so a refusal of its *shape* is a
  // misconfiguration or a bug here — never the GM's question. An unknown model
  // name is the common one.
  if (error instanceof Anthropic.NotFoundError || error instanceof Anthropic.BadRequestError) {
    return "The Librarian is misconfigured — check LIBRARIAN_MODEL names a real model.";
  }
  if (error instanceof Anthropic.APIError) {
    return "The Librarian could not answer that.";
  }
  return "Something went wrong reaching the Librarian.";
}
