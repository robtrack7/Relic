import { AnthropicLibrarian } from "./anthropic";
import type { LibrarianProvider } from "./model";

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
  return AnthropicLibrarian.open();
}
