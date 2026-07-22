import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchForUi } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }),
}));

const params = { workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a" };
const lexical = [{ source_kind: "entity", source_entity_id: "lexical-a", snippet: "Lexical result" }];
const hybrid = [{ source_kind: "entity", source_entity_id: "hybrid-a", snippet: "Hybrid result" }];

function mockSupabase() {
  const rpc = vi.fn(async (name: string) => {
    if (name === "get_saga_context") {
      return { data: { workspace: { id: "workspace-a" }, world: { id: "world-a" }, saga: { id: "saga-a" } }, error: null };
    }
    if (name === "search_for_ui") return { data: lexical, error: null };
    throw new Error(`Unexpected RPC ${name}`);
  });
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "gm-a" } }, error: null }) },
    rpc,
  } as never);
  return rpc;
}

describe("hybrid Sanctum search fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable";
    process.env.INTERNAL_TOKEN = "test-internal-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.INTERNAL_TOKEN;
  });

  it("uses the internal server-only hybrid endpoint for non-literal Sanctum search", async () => {
    const rpc = mockSupabase();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: hybrid }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchForUi(params, "underwater physician", false, "sanctum")).resolves.toEqual(hybrid);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:54321/functions/v1/hybrid-search", expect.objectContaining({ method: "POST", cache: "no-store" }));
    expect(rpc).not.toHaveBeenCalledWith("search_for_ui", expect.anything());
  });

  it("falls back to the existing lexical RPC when semantic delivery is unavailable", async () => {
    const rpc = mockSupabase();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(searchForUi(params, "exact lexical phrase", false, "sanctum")).resolves.toEqual(lexical);
    expect(rpc).toHaveBeenCalledWith("search_for_ui", expect.objectContaining({
      query_text: "exact lexical phrase",
      literal_only: true,
    }));
  });

  it("keeps Stage/literal search off the provider path", async () => {
    const rpc = mockSupabase();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchForUi(params, "stage exact", true, "stage")).resolves.toEqual(lexical);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("search_for_ui", expect.objectContaining({ literal_only: true, surface: "stage" }));
  });
});
