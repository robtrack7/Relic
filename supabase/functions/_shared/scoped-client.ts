import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export class ScopedClientError extends Error {
  readonly category: "configuration" | "persistence";
  readonly retryable: boolean;

  constructor(category: "configuration" | "persistence", retryable: boolean) {
    super(category);
    this.name = "ScopedClientError";
    this.category = category;
    this.retryable = retryable;
  }
}

export async function createScopedClient(
  gmUserId: string,
  purpose: string,
  sagaId?: string | null,
) {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const functionsUrl = Deno.env.get("EDGE_FUNCTIONS_URL") ?? `${url}/functions/v1`;
  const internalToken = Deno.env.get("INTERNAL_TOKEN");

  if (!url || !anonKey || !internalToken) {
    throw new ScopedClientError("configuration", false);
  }

  let res: Response;
  try {
    res = await fetch(`${functionsUrl}/issue-scoped-jwt`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${internalToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        gm_user_id: gmUserId,
        purpose,
        ...(sagaId ? { saga_id: sagaId } : {}),
      })
    });
  } catch {
    throw new ScopedClientError("persistence", true);
  }

  if (!res.ok) {
    const retryable = res.status === 408 || res.status === 425 || res.status === 429 || res.status >= 500;
    throw new ScopedClientError(retryable ? "persistence" : "configuration", retryable);
  }

  const body = await res.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) throw new ScopedClientError("configuration", false);
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    accessToken: async () => token
  });
}
