import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { errorResponse, jsonResponse } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import {
  PDF_EXTRACTOR_VERSION,
  PdfExtractionError,
  extractPdfText,
  sha256Hex,
} from "../_shared/pdf-extractor.ts";

type RequestBody = {
  workspace_id?: string;
  world_id?: string;
  saga_id?: string;
  source_id?: string;
  attempt_id?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validBody(body: RequestBody | null): body is Required<RequestBody> {
  return !!body && [body.workspace_id, body.world_id, body.saga_id, body.source_id, body.attempt_id]
    .every((value) => typeof value === "string" && UUID.test(value));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return errorResponse(405, "method_not_allowed", "Method not allowed.");
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return errorResponse(401, "authentication_required", "Authentication is required.");
  const body = await req.json().catch(() => null) as RequestBody | null;
  if (!validBody(body)) return errorResponse(400, "invalid_request", "PDF extraction scope is invalid.");

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return errorResponse(500, "configuration", "PDF extraction is not configured.");
  const accessToken = authorization.slice("Bearer ".length);
  const service = createServiceClient();
  const { data: authData, error: authError } = await service.auth.getUser(accessToken);
  if (authError || !authData.user) return errorResponse(401, "authentication_required", "Authentication is required.");
  const scoped = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: claim, error: claimError } = await scoped.rpc("claim_pdf_import_extraction", {
    p_workspace_id: body.workspace_id,
    p_world_id: body.world_id,
    p_saga_id: body.saga_id,
    p_source_id: body.source_id,
    p_attempt_id: body.attempt_id,
  });
  if (claimError || !claim || claim.bucket !== "attachments" || typeof claim.storage_path !== "string") {
    return errorResponse(409, "claim_failed", "This PDF import is unavailable or already being processed.");
  }

  const fail = async (state: "failed" | "rejected", code: string, originalSha256?: string, pageCount?: number) => {
    const { error } = await service.rpc("fail_pdf_import_extraction_for_worker", {
      p_source_id: body.source_id,
      p_uploader_id: authData.user.id,
      p_attempt_id: body.attempt_id,
      p_state: state,
      p_failure_code: code,
      p_original_sha256: originalSha256 ?? null,
      p_page_count: pageCount ?? null,
    });
    if (error) throw new Error("pdf_failure_persistence_failed");
  };

  const { data: object, error: downloadError } = await scoped.storage.from("attachments").download(claim.storage_path);
  if (downloadError || !object) {
    const code = downloadError?.message?.toLowerCase().includes("not found") ? "storage_missing" : "download_failed";
    await fail("failed", code);
    return errorResponse(422, code, code === "storage_missing" ? "The uploaded PDF could not be found. Reselect it and retry." : "The PDF could not be downloaded. Retry extraction.");
  }
  const bytes = new Uint8Array(await object.arrayBuffer());
  if (bytes.byteLength !== Number(claim.byte_size)) {
    await fail("rejected", "size_mismatch");
    return errorResponse(422, "size_mismatch", "The uploaded PDF size changed. Replace the file.");
  }
  const originalSha256 = await sha256Hex(bytes);

  try {
    const extracted = await extractPdfText(bytes);
    const derivedSha256 = await sha256Hex(new TextEncoder().encode(extracted.text));
    const { data: completed, error: completionError } = await service.rpc("complete_pdf_import_extraction_for_worker", {
      p_source_id: body.source_id,
      p_uploader_id: authData.user.id,
      p_attempt_id: body.attempt_id,
      p_original_sha256: originalSha256,
      p_derived_text: extracted.text,
      p_derived_sha256: derivedSha256,
      p_page_count: extracted.pageCount,
      p_extracted_characters: extracted.extractedCharacters,
      p_extraction_version: PDF_EXTRACTOR_VERSION,
    });
    if (completionError) return errorResponse(409, "completion_failed", "The extracted PDF could not be committed safely. Retry extraction.");
    return jsonResponse({ ...completed, page_count: extracted.pageCount, extracted_characters: extracted.extractedCharacters });
  } catch (error) {
    const extraction = error instanceof PdfExtractionError
      ? error
      : new PdfExtractionError("extractor_unavailable", false);
    await fail(extraction.terminal ? "rejected" : "failed", extraction.code, originalSha256);
    const messages: Record<string, string> = {
      mime_mismatch: "The file contents do not match a PDF.",
      malformed_pdf: "The PDF is malformed or incomplete.",
      encrypted_pdf: "Password-protected or encrypted PDFs are not supported.",
      active_content_rejected: "PDFs with active content are not accepted.",
      embedded_file_rejected: "PDFs with embedded files are not accepted.",
      page_limit_exceeded: "The PDF exceeds the 100-page MVP limit.",
      character_limit_exceeded: "The PDF contains too much extracted text for one import.",
      processing_timeout: "PDF extraction timed out. Retry or split the PDF.",
      no_extractable_text: "No selectable text was found. OCR for scanned PDFs is planned for V1.",
      extractor_unavailable: "PDF extraction is temporarily unavailable. Retry later.",
    };
    return errorResponse(422, extraction.code, messages[extraction.code] ?? "The PDF could not be extracted.");
  }
});
