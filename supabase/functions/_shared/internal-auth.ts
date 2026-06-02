import { errorResponse } from "./http.ts";

export function requireInternalAuth(req: Request): Response | null {
  const expectedToken = Deno.env.get("INTERNAL_TOKEN");
  const authHeader = req.headers.get("authorization") ?? "";

  if (!expectedToken) {
    return errorResponse(500, "internal_token_not_configured", "Internal auth is not configured.");
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    // Never echo the supplied token; callers only need the denial reason.
    return errorResponse(403, "forbidden", "Internal authorization failed.");
  }

  return null;
}
