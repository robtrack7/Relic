import { beforeEach, describe, expect, it, vi } from "vitest";
import { addThreadObjectiveAction, createEntityAction } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  })
}));

function form(entries: Record<string, string>) {
  const formData = new FormData();
  Object.entries(entries).forEach(([key, value]) => {
    formData.set(key, value);
  });
  return formData;
}

function authenticatedSupabase() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-a" } },
        error: null
      })
    },
    rpc: vi.fn().mockResolvedValue({ data: { id: "entity-a" }, error: null }),
    from: vi.fn(() => {
      throw new Error("Direct table access should not be used by security-hardened actions.");
    })
  };
}

describe("security-hardened server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  });

  it("creates entities through a scoped RPC instead of direct table mutation", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await expect(createEntityAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      entityType: "character",
      scope: "saga",
      name: "Mara",
      summary: "Scout",
      narrative: "Knows the old roads.",
      gmNotes: "voice: direct"
    }))).rejects.toThrow("NEXT_REDIRECT:/app/w/workspace-a/world/world-a/saga/saga-a/entities/character/entity-a");

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("create_entity", {
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      entity_type: "character",
      entity_scope: "saga",
      payload: {
        name: "Mara",
        summary: "Scout",
        narrative: "Knows the old roads.",
        gm_notes: "voice: direct",
        canon_state: "canon",
        created_by: "gm"
      }
    });
  });

  it("appends a thread objective through an RPC without trusting client JSON", async () => {
    const supabase = authenticatedSupabase();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await addThreadObjectiveAction(form({
      workspaceId: "workspace-a",
      worldId: "world-a",
      sagaId: "saga-a",
      threadId: "thread-a",
      objective: "Find the reliquary",
      objectivesLog: "{not valid client json"
    }));

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("append_thread_objective", {
      workspace_id: "workspace-a",
      world_id: "world-a",
      saga_id: "saga-a",
      thread_id: "thread-a",
      objective_text: "Find the reliquary"
    });
  });
});
