type ServiceClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type PreparedDelivery = {
  outcome: "send" | "skipped";
  reason_code?: string;
  destination_email?: string;
  kind?: string;
  subject?: string;
  body_text?: string;
  deep_link?: string;
};

type DispatchResult =
  | { outcome: "sent"; provider: string }
  | { outcome: "skipped"; reasonCode: string }
  | { outcome: "retry" | "failed"; reason: string };

function providerMode() {
  return (Deno.env.get("NOTIFICATION_PROVIDER_MODE") ?? "live").trim().toLowerCase();
}

function absoluteAppUrl(path: string) {
  const base = (Deno.env.get("APP_BASE_URL") ?? "").replace(/\/$/, "");
  if (!base) throw new Error("notification_app_url_missing");
  const url = new URL(path, `${base}/`);
  if (url.origin !== new URL(base).origin) throw new Error("notification_deep_link_invalid");
  return url.toString();
}

async function sendResendEmail(prepared: PreparedDelivery) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFICATION_FROM_EMAIL");
  if (!apiKey || !from) return { outcome: "failed" as const, reason: "notification_provider_not_configured" };
  const deepLink = absoluteAppUrl(String(prepared.deep_link ?? "/app"));
  const bodyText = String(prepared.body_text ?? "Relic has an update.").replace(String(prepared.deep_link ?? ""), deepLink);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: controller.signal,
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [prepared.destination_email], subject: prepared.subject, text: bodyText })
    });
    if (response.status === 429 || response.status >= 500) return { outcome: "retry" as const, reason: "notification_provider_retryable" };
    if (!response.ok) return { outcome: "failed" as const, reason: "notification_provider_rejected" };
    const result = await response.json().catch(() => ({})) as { id?: unknown };
    return { outcome: "sent" as const, provider: "resend", providerMessageId: typeof result.id === "string" ? result.id : "accepted" };
  } catch (error) {
    return { outcome: "retry" as const, reason: error instanceof DOMException && error.name === "AbortError" ? "notification_provider_timeout" : "notification_provider_unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function dispatchNotification(service: ServiceClient, notificationId: string): Promise<DispatchResult> {
  const preparedResult = await service.rpc("prepare_notification_delivery_for_worker", { p_notification_id: notificationId });
  if (preparedResult.error) return { outcome: "retry", reason: "notification_prepare_failed" };
  const prepared = preparedResult.data as PreparedDelivery;
  if (prepared.outcome === "skipped") {
    const reasonCode = String(prepared.reason_code ?? "email_disabled");
    const skipped = await service.rpc("skip_notification_delivery_for_worker", { p_notification_id: notificationId, p_reason_code: reasonCode });
    return skipped.error ? { outcome: "retry", reason: "notification_skip_failed" } : { outcome: "skipped", reasonCode };
  }

  const mode = providerMode();
  let delivery: { outcome: "sent"; provider: string; providerMessageId: string } | { outcome: "retry" | "failed"; reason: string };
  if (mode === "deterministic") {
    if (!["local", "test"].includes((Deno.env.get("RELIC_ENV") ?? "").toLowerCase())) return { outcome: "failed", reason: "deterministic_notification_forbidden" };
    delivery = { outcome: "sent", provider: "deterministic", providerMessageId: `local-${notificationId}` };
  } else if (mode === "live") {
    delivery = await sendResendEmail(prepared);
  } else {
    return { outcome: "failed", reason: "notification_provider_mode_invalid" };
  }
  if (delivery.outcome !== "sent") return delivery;
  const completed = await service.rpc("complete_notification_delivery_for_worker", { p_notification_id: notificationId, p_provider: delivery.provider, p_provider_message_id: delivery.providerMessageId });
  return completed.error ? { outcome: "retry", reason: "notification_completion_failed" } : { outcome: "sent", provider: delivery.provider };
}

export const notificationProviderTest = { absoluteAppUrl };
