import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeEntityRow, requireUser } from "@/lib/data";
import { SUPABASE_CONFIG_ERROR } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn()
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  })
}));

const supabaseEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
];

describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseEnvKeys.forEach((key) => {
      delete process.env[key];
    });
  });

  it("redirects to sign in before creating a Supabase client when env is missing", async () => {
    const expectedPath = `/auth/sign-in?error=${encodeURIComponent(SUPABASE_CONFIG_ERROR)}`;

    await expect(requireUser()).rejects.toThrow(`NEXT_REDIRECT:${expectedPath}`);
    expect(redirect).toHaveBeenCalledWith(expectedPath);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("Library row normalization", () => {
  it("preserves the unified detail name and narrative for Notes", () => {
    expect(normalizeEntityRow({
      id: "note-1",
      workspace_id: "workspace-1",
      world_id: "world-1",
      saga_id: "saga-1",
      scope: "saga",
      name: "Archive safety lines",
      summary: "Consent notes",
      narrative: "Pause on claustrophobia.",
      canon_state: "canon"
    }, "note")).toMatchObject({
      name: "Archive safety lines",
      summary: "Consent notes",
      narrative: "Pause on claustrophobia."
    });
  });
});
