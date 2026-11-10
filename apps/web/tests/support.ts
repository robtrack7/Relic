import type { WriteResult } from "@/lib/world/repository";

/**
 * Unwraps a write that the test is not about.
 *
 * Most of what a suite writes is arrangement: capture three things so that the
 * fourth line can assert something about relationships. Those writes must
 * succeed, and if one does not, every assertion after it is meaningless — so it
 * throws, loudly and by name, rather than letting the real assertion fail
 * somewhere confusing.
 *
 * Deliberately not for the write under test. `expect(result.state).toBe(...)`
 * is the point of those, and routing them through here would hide the three
 * states — conflict, refused, missing — that most of this schema exists to
 * distinguish.
 */
export function must<T>(result: WriteResult<T>, what: string): T {
  if (result.state !== "ok") {
    throw new Error(`${what} was expected to succeed but came back ${result.state}`);
  }
  return result.data;
}
