import { describe, expect, it } from "vitest";
import { parseGmNotesTags } from "@/lib/stage";

describe("Stage GM notes tags", () => {
  it("extracts the first voice and wants tags and leaves the rest as body", () => {
    expect(parseGmNotesTags("voice: clipped whisper\nwants: the deed\nKeep the secret.")).toEqual({
      voice: "clipped whisper",
      wants: "the deed",
      body: "Keep the secret."
    });
  });
});
