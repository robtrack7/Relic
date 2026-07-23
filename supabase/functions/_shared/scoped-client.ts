import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export async function createScopedClient(gmUserId: string, purpose: string, sagaId?: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const functionsUrl = Deno.env.get("EDGE_FUNCTIONS_URL") ?? `${url}/functions/v1`;
  const internalToken = Deno.env.get("INTERNAL_TOKEN");

  if (!url || !anonKey || !internalToken) {
    throw new Error("Scoped client environment is not configured.");
  }

  const res = await fetch(`${functionsUrl}/issue-scoped-jwt`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${internalToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ gm_user_id: gmUserId, purpose, saga_id: sagaId })
  });

  if (!res.ok) {
    throw new Error(`Scoped JWT issuance failed with status ${res.status}.`);
  }

  const { token } = await res.json();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    accessToken: async () => token
  });
}
