import { describe, expect, it } from "vitest";
import { formatStageElapsed, parseGmNotesTags, quickCreateEntityType, remainingUndoSeconds } from "@/lib/stage";

describe("Stage GM notes tags", () => {
  it("extracts the first voice and wants tags and leaves the rest as body", () => {
    expect(parseGmNotesTags("voice: clipped whisper\nwants: the deed\nKeep the secret.")).toEqual({
      voice: "clipped whisper",
      wants: "the deed",
      body: "Keep the secret."
    });
  });

  it("formats live elapsed time and the persisted undo deadline", () => {
    const started = "2026-07-20T12:00:00.000Z";
    expect(formatStageElapsed(started, Date.parse("2026-07-20T13:02:03.000Z"))).toBe("1:02:03");
    expect(remainingUndoSeconds(started, Date.parse("2026-07-20T12:00:47.000Z"))).toBe(13);
    expect(remainingUndoSeconds(started, Date.parse("2026-07-20T12:02:00.000Z"))).toBe(0);
  });

  it("maps wireframe quick-create labels onto canonical entity types", () => {
    expect(quickCreateEntityType("npc")).toBe("character");
    expect(quickCreateEntityType("location")).toBe("place");
    expect(quickCreateEntityType("item")).toBe("artifact");
    expect(quickCreateEntityType("note")).toBe("note");
  });
});
