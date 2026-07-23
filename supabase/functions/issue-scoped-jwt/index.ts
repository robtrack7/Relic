import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { errorResponse, jsonResponse } from "../_shared/http.ts";
import { requireInternalAuth } from "../_shared/internal-auth.ts";

const encoder = new TextEncoder();

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

Deno.serve(async (req) => {
  const authFailure = requireInternalAuth(req);
  if (authFailure) return authFailure;

  const jwtSecret = Deno.env.get("RELIC_JWT_SIGNING_SECRET");
  if (!jwtSecret) {
    return errorResponse(500, "jwt_secret_not_configured", "JWT issuance is not configured.");
  }

  const body = await req.json().catch(() => ({}));
  const gmUserId = body.gm_user_id;
  const purpose = body.purpose;
  const sagaId = body.saga_id;

  if (!gmUserId || !purpose) {
    return errorResponse(400, "missing_parameters", "gm_user_id and purpose are required.");
  }
  if (sagaId !== undefined
    && (typeof sagaId !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sagaId))) {
    return errorResponse(400, "invalid_scope", "saga_id must be a valid UUID when provided.");
  }

  const token = await create(
    { alg: "HS256", typ: "JWT" },
    {
      sub: gmUserId,
      role: "authenticated",
      aud: "authenticated",
      iss: "supabase",
      iat: getNumericDate(0),
      exp: getNumericDate(60 * 5),
      purpose,
      ...(sagaId ? { saga_id: sagaId } : {})
    },
    await signingKey(jwtSecret)
  );

  return jsonResponse({ token });
});
