import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSessionEvidenceDraft,
  readSessionEvidenceDraft,
  writeSessionEvidenceDraft,
} from "@/lib/session-evidence-draft";
import { installMemoryLocalStorage } from "./local-storage";

const scope = { workspaceId: "workspace", worldId: "world", sagaId: "saga", sessionId: "session" };

describe("Session evidence local drafts", () => {
  beforeEach(installMemoryLocalStorage);

  it("keeps a stable source id across edits and isolates drafts by owner", () => {
    const first = writeSessionEvidenceDraft("owner-a", scope, "pasted_text", "First version");
    const second = writeSessionEvidenceDraft("owner-a", scope, "pasted_text", "Second version");

    expect(second.sourceId).toBe(first.sourceId);
    expect(readSessionEvidenceDraft("owner-a", scope, "pasted_text")).toMatchObject({ sourceId: first.sourceId, text: "Second version" });
    expect(readSessionEvidenceDraft("owner-b", scope, "pasted_text")).toBeNull();
  });

  it("clears only the confirmed kind and session draft", () => {
    writeSessionEvidenceDraft("owner-a", scope, "pasted_text", "Raw notes");
    writeSessionEvidenceDraft("owner-a", scope, "gm_manual_summary", "Summary");

    clearSessionEvidenceDraft("owner-a", scope, "pasted_text");

    expect(readSessionEvidenceDraft("owner-a", scope, "pasted_text")).toBeNull();
    expect(readSessionEvidenceDraft("owner-a", scope, "gm_manual_summary")?.text).toBe("Summary");
  });
});
