import { AnthropicLibrarian } from "./anthropic";
import type { LibrarianEvent, LibrarianProvider } from "./model";
import { OpenAILibrarian } from "./openai";

/**
 * How the app gets at the Librarian.
 *
 * The return type is the port, exactly as `deskRepository()` returns
 * `DeskRepository` and never the Postgres class. Everything above this line
 * knows only that something can hold a conversation — which is what makes the
 * model behind it replaceable without the product's intelligence changing.
 *
 * Never call this at module scope: `next build` imports route modules, and a
 * client constructed during the build is constructed on a machine with no key.
 */
export function librarian(): LibrarianProvider {
  const named = process.env.LIBRARIAN_PROVIDER?.trim().toLowerCase();
  if (named === "openai") return OpenAILibrarian.open();
  if (named === "anthropic") return AnthropicLibrarian.open();

  /*
   * Unnamed, so infer from what is actually configured. Two providers is a
   * development convenience and this is the shape that makes it one: a key in
   * the environment is the only signal anybody wants to give. Naming the
   * provider explicitly still wins, so a machine holding both keys is not
   * ambiguous — and selecting a provider without its key fails as itself rather
   * than silently answering through the other one.
   */
  const openai = OpenAILibrarian.open();
  if (openai.ready) return openai;

  const anthropic = AnthropicLibrarian.open();
  if (anthropic.ready) return anthropic;

  return UNCONFIGURED;
}

/**
 * No model at all.
 *
 * Relic works without one — the world is the product, and a Librarian that could
 * make the Desk unusable by being unconfigured would have the dependency
 * backwards. This exists rather than defaulting to one of the two adapters so
 * that the message can name both routes instead of whichever import happened to
 * come first.
 */
const UNCONFIGURED: LibrarianProvider = {
  ready: false,
  async *converse(): AsyncIterable<LibrarianEvent> {
    yield {
      type: "failed",
      message:
        "The Librarian is not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY to wake it."
    };
  }
};
