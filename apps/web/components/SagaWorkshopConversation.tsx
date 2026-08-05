"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { answerSagaWorkshopAction, draftSagaWorkshopAction } from "@/app/actions";
import type { SagaWorkshop } from "@/lib/data";

type Row = Record<string, unknown>;
const activeStatuses = new Set(["queued", "running"]);
const failedStatuses = new Set(["provider_unavailable", "retrieval_unavailable", "validation_failed", "failed", "dead_letter"]);
const text = (value: unknown) => typeof value === "string" ? value : "";

export function SagaWorkshopConversation({ workshop, error }: { workshop: SagaWorkshop; error?: string }) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [answerKey, setAnswerKey] = useState(() => crypto.randomUUID());
  const [draftKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState<"answer" | "draft" | null>(null);
  const [awaitingConversationVersion, setAwaitingConversationVersion] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!activeStatuses.has(workshop.generation_status)) return;
    const timer = window.setInterval(() => router.refresh(), 1800);
    return () => window.clearInterval(timer);
  }, [router, workshop.generation_status]);

  useEffect(() => {
    if (awaitingConversationVersion !== null && workshop.conversation_version >= awaitingConversationVersion) {
      setAwaitingConversationVersion(null);
    }
  }, [awaitingConversationVersion, workshop.conversation_version]);

  const outline = useMemo(() => Object.entries(workshop.emerging_outline ?? {}).filter(([, value]) => {
    return typeof value === "string" ? value.trim().length > 0 : Array.isArray(value) && value.length > 0;
  }), [workshop.emerging_outline]);

  async function sendAnswer() {
    const normalized = answer.normalize("NFKC").trim();
    if (!normalized || normalized.length > 5000) return;
    setBusy("answer"); setNotice("Saving your answer…");
    const form = new FormData();
    form.set("workshopId", workshop.id); form.set("conversationVersion", String(workshop.conversation_version));
    form.set("answer", normalized); form.set("idempotencyKey", answerKey);
    const result = await answerSagaWorkshopAction(form);
    setBusy(null);
    if (!result.ok) {
      setNotice(result.category === "stale" ? "This conversation advanced elsewhere. Refresh before answering again." : result.message ?? "Your answer could not be saved.");
      return;
    }
    setAnswer(""); setAnswerKey(crypto.randomUUID());
    setAwaitingConversationVersion(result.conversationVersion ?? workshop.conversation_version + 1);
    setNotice("Answer saved. No AI credit was used for this turn. Refreshing the next question…");
    router.refresh();
  }

  async function draftNow() {
    setBusy("draft"); setNotice("Checking the 10-credit draft allowance…");
    const form = new FormData();
    form.set("workshopId", workshop.id); form.set("conversationVersion", String(workshop.conversation_version));
    form.set("idempotencyKey", draftKey);
    const result = await draftSagaWorkshopAction(form);
    setBusy(null);
    if (!result.ok) { setNotice(result.message ?? "The draft could not be queued. Your conversation is still saved."); return; }
    setNotice("Full scaffold queued. This logical draft costs 10 credits; retries and review do not charge again.");
    router.refresh();
  }

  if (workshop.phase === "planning" && activeStatuses.has(workshop.generation_status)) return (
    <section className="auth-card" aria-live="polite">
      <div className="page-eyebrow">The Loom · 1-credit workshop plan</div>
      <h1 className="auth-title">Reading your starting material</h1>
      <p className="auth-subtitle">The Loom is extracting what you already know and choosing three to five questions that will most improve the first playable packet.</p>
      <div className="notice">{workshop.generation_status === "queued" ? "Waiting for the planning worker…" : "Building the emerging outline…"}</div>
      <Link className="btn btn-ghost" href="/app">Save and leave</Link>
    </section>
  );

  if (workshop.phase === "planning" && workshop.generation_status === "quota_blocked") return (
    <section className="auth-card" aria-live="polite">
      <div className="page-eyebrow">The Loom · workshop plan paused</div>
      <h1 className="auth-title">Your starting material is saved</h1>
      <p className="auth-subtitle">The 1-credit planning task is not available under the current allowance. Nothing was charged and no canon was created.</p>
      <div className="notice">You can save this workshop and return when credits are available, or start the Saga manually without an AI task.</div>
      <div className="form-stack"><Link className="btn btn-ink" href="/app/new-saga">Start Blank</Link><Link className="btn btn-ghost" href="/app">Save and leave</Link></div>
    </section>
  );

  if (workshop.phase === "drafting" && activeStatuses.has(workshop.generation_status)) return (
    <section className="auth-card" aria-live="polite">
      <div className="page-eyebrow">The Loom · non-canon deep draft</div>
      <h1 className="auth-title">Assembling your Saga scaffold</h1>
      <p className="auth-subtitle">The frozen conversation is becoming a premise, starting place, cast, factions, Threads, secrets, relationships, and Session 1 packet. You can leave safely while it runs.</p>
      <div className="notice">{workshop.generation_status === "queued" ? "Waiting for the drafting worker…" : "Drafting and validating every cited section…"}</div>
      <Link className="btn btn-ghost" href="/app">Save and leave</Link>
    </section>
  );

  if (failedStatuses.has(workshop.generation_status)) return (
    <section className="auth-card" aria-live="assertive">
      <div className="page-eyebrow">The Loom · recoverable workshop</div>
      <h1 className="auth-title">Your work is still here</h1>
      <p className="auth-subtitle">The current AI task could not finish ({workshop.failure_category ?? workshop.generation_status}). No canon was created, and the saved input remains available.</p>
      <div className="form-stack"><Link className="btn btn-ink" href="/app/new-saga">Create manually</Link><Link className="btn btn-ghost" href="/app">Save and leave</Link></div>
    </section>
  );

  return (
    <section className="workshop-review" aria-labelledby="loom-workshop-title">
      <header className="auth-card">
        <div className="page-eyebrow">The Loom · drafting · answers are free</div>
        <h1 className="auth-title" id="loom-workshop-title">Shape {workshop.saga_name || "your Saga"} through conversation</h1>
        <p className="auth-subtitle">The interview plan cost 1 credit. These saved answer turns make no provider call. When ready, the full scaffold is a separate 10-credit task.</p>
        {(error || notice || workshop.generation_status === "quota_blocked") && <div className="notice" role="status" aria-live="polite">{error || notice || "The deep draft is currently quota-blocked. Keep answering or return later; nothing was lost."}</div>}
      </header>

      <div className="loom-workshop-grid">
        <div className="auth-card loom-conversation" aria-label="Workshop conversation">
          <div className="page-eyebrow">Conversation · {workshop.total_message_count}/20 messages</div>
          <div className="loom-message-list">
            {workshop.conversation.map((message, index) => <article className={`loom-message ${text(message.role) === "gm" ? "gm" : "assistant"}`} key={`${index}-${text(message.timestamp)}`}>
              <span className="chip">{text(message.role) === "gm" ? "You" : "The Loom"}</span>
              <p>{text(message.content)}</p>
            </article>)}
          </div>
          {workshop.current_question ? <div className="form-stack">
            <label className="field"><span>Your answer</span><textarea className="textarea" rows={5} maxLength={5000} value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={busy !== null} /></label>
            <div className="muted">{answer.length}/5,000 · {workshop.gm_input_chars}/50,000 saved GM characters</div>
            <button className="button" type="button" onClick={sendAnswer} disabled={busy !== null || !answer.trim()}>{busy === "answer" ? "Saving…" : "Send"}</button>
          </div> : <div className="notice">The planned questions are complete. Draft from what you have or save and return later.</div>}
        </div>

        <aside className="auth-card loom-outline" aria-label="Emerging Saga outline">
          <div className="page-eyebrow">Emerging outline · not canon</div>
          <h2>What The Loom understands</h2>
          {outline.length === 0 ? <p className="muted">Your starting material is being organized. Outline fields will appear here as they become clear.</p> : outline.map(([field, value]) => <div className="loom-outline-item" key={field}>
            <span>{field.replaceAll("_", " ")}</span>
            <p>{Array.isArray(value) ? value.join(", ") : String(value)}</p>
          </div>)}
          <div className="notice">DRAFTING · Nothing here is canon until you review and commit the finished scaffold.</div>
        </aside>
      </div>

      <footer className="auth-card loom-workshop-actions">
        <button className="button" type="button" onClick={draftNow} disabled={busy !== null || awaitingConversationVersion !== null || !workshop.can_draft}>{busy === "draft" ? "Queuing…" : awaitingConversationVersion !== null ? "Refreshing saved answer…" : "Draft it now · 10 credits"}</button>
        <Link className="btn btn-ghost" href="/app">Save and leave</Link>
        <p className="muted">Drafting freezes the saved GM conversation as evidence. Confirmation does not repeat the planning call, and exact retries cannot double-charge.</p>
      </footer>
    </section>
  );
}
