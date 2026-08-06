import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { errorResponse, jsonResponse } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import {
  ImageValidationError,
  MEDIA_IMAGE_VALIDATOR_VERSION,
  sha256Hex,
  validateStaticImage,
} from "../_shared/image-validator.ts";

type RequestBody = {
  workspace_id?: string;
  world_id?: string;
  saga_id?: string;
  attachment_id?: string;
  attempt_id?: string;
  operation?: "validate" | "view" | "delete";
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validBody(body: RequestBody | null): body is Required<RequestBody> {
  return !!body && [body.workspace_id, body.world_id, body.saga_id, body.attachment_id, body.attempt_id]
    .every((value) => typeof value === "string" && UUID.test(value))
    && ["validate", "view", "delete"].includes(body.operation ?? "");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return errorResponse(405, "method_not_allowed", "Method not allowed.");
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return errorResponse(401, "authentication_required", "Authentication is required.");
  const body = await req.json().catch(() => null) as RequestBody | null;
  if (!validBody(body)) return errorResponse(400, "invalid_request", "The attachment request is invalid.");

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return errorResponse(500, "configuration", "Private attachments are not configured.");
  const accessToken = authorization.slice("Bearer ".length);
  const service = createServiceClient();
  const { data: authData, error: authError } = await service.auth.getUser(accessToken);
  if (authError || !authData.user) return errorResponse(401, "authentication_required", "Authentication is required.");
  const scoped = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: claim, error: claimError } = await scoped.rpc("claim_media_attachment_operation", {
    p_workspace_id: body.workspace_id,
    p_world_id: body.world_id,
    p_saga_id: body.saga_id,
    p_attachment_id: body.attachment_id,
    p_attempt_id: body.attempt_id,
    p_operation: body.operation,
  });
  if (claimError || !claim) return errorResponse(409, "claim_failed", "This attachment is unavailable or already being processed.");
  if (body.operation === "validate" && claim.ready) return jsonResponse({ id: body.attachment_id, state: "ready", replayed: true });
  if (claim.bucket !== "attachments" || typeof claim.storage_path !== "string" || claim.uploader_id !== authData.user.id) {
    return errorResponse(409, "claim_failed", "The private attachment claim is invalid.");
  }

  if (body.operation === "view") {
    const { data, error } = await service.storage.from("attachments").createSignedUrl(claim.storage_path, 60);
    if (error || !data?.signedUrl) return errorResponse(503, "view_unavailable", "The private image could not be opened. Retry.");
    return jsonResponse({ id: body.attachment_id, signed_url: data.signedUrl, expires_in: 60 });
  }

  if (body.operation === "delete") {
    const { error: removeError } = await service.storage.from("attachments").remove([claim.storage_path]);
    if (removeError && !/not found/i.test(removeError.message)) {
      await service.rpc("fail_media_attachment_for_worker", { p_attachment_id: body.attachment_id, p_uploader_id: authData.user.id, p_attempt_id: body.attempt_id, p_state: "failed", p_failure_code: "delete_failed" });
      return errorResponse(503, "delete_failed", "The private object could not be deleted. Retry.");
    }
    const { error } = await service.rpc("complete_media_attachment_delete_for_worker", { p_attachment_id: body.attachment_id, p_uploader_id: authData.user.id, p_attempt_id: body.attempt_id });
    if (error) return errorResponse(409, "delete_conflict", "The attachment changed while it was being deleted. Refresh and retry.");
    return jsonResponse({ id: body.attachment_id, deleted: true });
  }

  const fail = async (state: "failed" | "rejected", code: string) => {
    await service.rpc("fail_media_attachment_for_worker", {
      p_attachment_id: body.attachment_id,
      p_uploader_id: authData.user.id,
      p_attempt_id: body.attempt_id,
      p_state: state,
      p_failure_code: code,
    });
    if (state === "rejected") await service.storage.from("attachments").remove([claim.storage_path]).catch(() => undefined);
  };
  const { data: object, error: downloadError } = await service.storage.from("attachments").download(claim.storage_path);
  if (downloadError || !object) {
    const code = downloadError?.message?.toLowerCase().includes("not found") ? "storage_missing" : "download_failed";
    await fail("failed", code);
    return errorResponse(422, code, code === "storage_missing" ? "The uploaded image could not be found. Reselect it and retry." : "The image could not be downloaded. Retry validation.");
  }
  const bytes = new Uint8Array(await object.arrayBuffer());
  if (bytes.byteLength !== Number(claim.declared_byte_size)) {
    await fail("rejected", "size_mismatch");
    return errorResponse(422, "size_mismatch", "The uploaded image size changed. Choose the file again.");
  }
  try {
    const validated = validateStaticImage(bytes, String(claim.declared_mime));
    const hash = await sha256Hex(bytes);
    const { data, error } = await service.rpc("complete_media_attachment_validation_for_worker", {
      p_attachment_id: body.attachment_id,
      p_uploader_id: authData.user.id,
      p_attempt_id: body.attempt_id,
      p_detected_mime: validated.detectedMime,
      p_byte_size: bytes.byteLength,
      p_pixel_width: validated.width,
      p_pixel_height: validated.height,
      p_sha256: hash,
      p_validator_version: MEDIA_IMAGE_VALIDATOR_VERSION,
    });
    if (error) return errorResponse(409, "completion_failed", "The image validation result could not be committed safely. Retry.");
    if (data?.discard_upload) await service.storage.from("attachments").remove([claim.storage_path]).catch(() => undefined);
    return jsonResponse(data);
  } catch (error) {
    const code = error instanceof ImageValidationError ? error.code : "validator_unavailable";
    await fail(error instanceof ImageValidationError ? "rejected" : "failed", code);
    const messages: Record<string, string> = {
      mime_mismatch: "The file contents do not match its selected image type.",
      malformed_image: "The image is malformed, incomplete, or contains appended data.",
      animated_image_rejected: "Animated images are not supported in the MVP.",
      image_size_exceeded: "The image exceeds the 5 MiB limit.",
      image_dimensions_exceeded: "The image exceeds the 8,192-pixel edge or 32-megapixel limit.",
      validator_unavailable: "Image validation is temporarily unavailable. Retry later.",
    };
    return errorResponse(422, code, messages[code] ?? "The image could not be validated.");
  }
});
