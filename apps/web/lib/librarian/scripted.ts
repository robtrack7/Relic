import type { LibrarianEvent, LibrarianProvider, LibrarianTool, Turn } from "./model";
import type { Spend } from "./spend";

/**
 * A Librarian that does exactly what it is told to do.
 *
 * Not a mock. It runs the **real** tools — the same `LibrarianTool.run` the
 * OpenAI and Anthropic adapters call, reaching the same repository and writing
 * to the same database — and yields the same events in the same order. What it
 * replaces is only the part that is expensive and non-deterministic: deciding
 * which tool to call.
 *
 * That is the whole reason it exists. The tool surface is where this slice's
 * judgment lives — what a citation number resolves to, what happens when it
 * resolves to nothing, whether a write lands as Pencil with the right name on
 * it — and none of that can be specified against a real model without paying
 * for a coin flip. V1 built the same idea and used it well; this is that idea
 * with the tools left real instead of the outputs hand-written.
 *
 * A suite that needed a key to run would stop being run.
 */

export type Step =
  /** Call a tool, exactly as a model would, with arguments as raw as a model's. */
  | Readonly<{ use: string; input: Record<string, unknown> }>
  /** Say something. Streams a word at a time, because the real ones do. */
  | Readonly<{ say: string }>
  /**
   * Report a round trip's cost, as a real adapter does after each reply.
   *
   * A step rather than a constructor argument, because the property worth
   * specifying is that a turn taking three round trips is summed into one cost
   * — and that is only reachable if a script can spend more than once.
   */
  | Readonly<{ spend: Omit<Spend, "provider" | "model"> }>;

/**
 * The model a scripted spend claims to have run through.
 *
 * A real model id rather than a made-up one, deliberately: the rate table is
 * keyed by model, so a fictional name would send every scripted turn down the
 * "no known rate" branch and leave the priced path — the one a GM actually
 * reads — unexercised. What this class fakes is which tool to call, not what a
 * token costs.
 */
export const SCRIPTED_MODEL = "claude-opus-5";

export class ScriptedLibrarian implements LibrarianProvider {
  readonly #script: readonly Step[];

  /** Every tool outcome, in order, for a suite to assert against. */
  readonly heard: string[] = [];

  constructor(script: readonly Step[]) {
    this.#script = script;
  }

  get ready(): boolean {
    return true;
  }

  async *converse(_turn: Turn, tools: readonly LibrarianTool[]): AsyncIterable<LibrarianEvent> {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    let spoken = "";

    for (const step of this.#script) {
      if ("spend" in step) {
        // A named model, so a script exercises the priced path rather than the
        // "no rate known" one by accident.
        yield {
          type: "spent",
          spend: { provider: "scripted", model: SCRIPTED_MODEL, ...step.spend }
        };
        continue;
      }

      if ("say" in step) {
        // A word at a time, so anything downstream that reassembles a streamed
        // answer is exercised rather than handed one whole string.
        for (const word of step.say.split(/(\s+)/)) {
          if (!word) continue;
          spoken += word;
          yield { type: "text", text: word };
        }
        continue;
      }

      const tool = byName.get(step.use);
      if (!tool) {
        this.heard.push(`no tool called ${step.use}`);
        continue;
      }

      yield { type: "consulting", note: tool.note(step.input) };

      const outcome = await tool.run(step.input);
      this.heard.push(outcome.told);

      if (outcome.effect) {
        yield { type: "acted", note: outcome.told, effect: outcome.effect };
      }
    }

    yield { type: "done", body: spoken };
  }
}
