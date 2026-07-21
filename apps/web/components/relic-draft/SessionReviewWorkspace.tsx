"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { retrySessionTranscriptionAction, saveSessionEvidenceAction, updateTranscriptAction } from "@/app/actions";
import { RelicIcon } from "@/components/RelicIcon";
import type { SessionReviewData, TranscriptSegment } from "@/lib/data";
import {
  clearSessionEvidenceDraft,
  readSessionEvidenceDraft,
  writeSessionEvidenceDraft,
  type SessionEvidenceKind,
} from "@/lib/session-evidence-draft";
import type { IdParams } from "@/lib/types";

function formatTimestamp(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function stepTone(state: string | undefined, completeStates: string[]) {
  if (state === "failed") return "failed";
  if (state && completeStates.includes(state)) return "done";
  if (state && ["pending", "queued", "running", "transcribing", "synthesizing"].includes(state)) return "pending";
  return "waiting";
}

const emptyEvidenceDrafts = {
  pasted_text: { sourceId: "", text: "" },
  gm_manual_summary: { sourceId: "", text: "" },
};

export function SessionReviewWorkspace({ ownerId, params, sessionId, review }: { ownerId: string; params: IdParams; sessionId: string; review: SessionReviewData }) {
  const router = useRouter();
  const transcript = review.transcript;
  const job = review.transcription_job;
  const [segments, setSegments] = useState<TranscriptSegment[]>(transcript?.segments ?? []);
  const [busy, setBusy] = useState(false);
  const [evidenceBusy, setEvidenceBusy] = useState<SessionEvidenceKind | null>(null);
  const [evidenceDrafts, setEvidenceDrafts] = useState(emptyEvidenceDrafts);
  const [message, setMessage] = useState("");
  const audioReady = Boolean(review.audio.finalized_at)
    && Number(review.audio.expected_chunks ?? 0) > 0
    && review.audio.registered_chunks >= Number(review.audio.expected_chunks ?? 0);

  useEffect(() => {
    setSegments(transcript?.segments ?? []);
  }, [transcript?.id, transcript?.edited_at, transcript?.state]);

  useEffect(() => {
    const scope = { ...params, sessionId };
    const pasted = readSessionEvidenceDraft(ownerId, scope, "pasted_text");
    const summary = readSessionEvidenceDraft(ownerId, scope, "gm_manual_summary");
    setEvidenceDrafts({
      pasted_text: { sourceId: pasted?.sourceId ?? "", text: pasted?.text ?? "" },
      gm_manual_summary: { sourceId: summary?.sourceId ?? "", text: summary?.text ?? "" },
    });
  }, [ownerId, params.workspaceId, params.worldId, params.sagaId, sessionId]);

  function formData(extra: Record<string, string>) {
    const data = new FormData();
    data.set("workspaceId", params.workspaceId);
    data.set("worldId", params.worldId);
    data.set("sagaId", params.sagaId);
    data.set("sessionId", sessionId);
    Object.entries(extra).forEach(([key, value]) => data.set(key, value));
    return data;
  }

  async function saveTranscript() {
    if (!transcript) return;
    setBusy(true); setMessage("");
    try {
      await updateTranscriptAction(formData({ transcriptId: transcript.id, segments: JSON.stringify(segments) }));
      setMessage("Transcript edits saved. Citations retain the original evidence excerpt.");
      router.refresh();
    } catch {
      setMessage("Transcript edits could not be saved. Your text remains in this form; retry when ready.");
    } finally { setBusy(false); }
  }

  async function retryTranscription() {
    setBusy(true); setMessage("");
    try {
      await retrySessionTranscriptionAction(formData({}));
      setMessage("Transcription queued with a fresh retry budget.");
      router.refresh();
    } catch {
      setMessage("Transcription could not be requeued. The audio evidence is still preserved.");
    } finally { setBusy(false); }
  }

  function updateEvidenceDraft(kind: SessionEvidenceKind, text: string) {
    const current = evidenceDrafts[kind];
    const saved = writeSessionEvidenceDraft(ownerId, { ...params, sessionId }, kind, text, current.sourceId || undefined);
    setEvidenceDrafts((drafts) => ({ ...drafts, [kind]: { sourceId: saved.sourceId, text: saved.text } }));
  }

  async function saveEvidence(kind: SessionEvidenceKind) {
    const current = evidenceDrafts[kind];
    if (!current.text.trim()) {
      setMessage(kind === "pasted_text" ? "Add pasted session notes before saving." : "Add a manual summary before saving.");
      return;
    }
    const stable = writeSessionEvidenceDraft(ownerId, { ...params, sessionId }, kind, current.text, current.sourceId || undefined);
    setEvidenceDrafts((drafts) => ({ ...drafts, [kind]: { sourceId: stable.sourceId, text: stable.text } }));
    setEvidenceBusy(kind); setMessage("");
    try {
      await saveSessionEvidenceAction(formData({ sourceId: stable.sourceId, kind, text: stable.text }));
      clearSessionEvidenceDraft(ownerId, { ...params, sessionId }, kind);
      setEvidenceDrafts((drafts) => ({ ...drafts, [kind]: { sourceId: "", text: "" } }));
      setMessage(kind === "pasted_text"
        ? "Pasted notes saved as Session evidence. Synthesis has not started."
        : "Manual summary saved as Session evidence. Synthesis has not started.");
      router.refresh();
    } catch {
      setMessage(`${kind === "pasted_text" ? "Pasted notes" : "Manual summary"} could not be saved. Your text remains on this device; retry when ready.`);
    } finally { setEvidenceBusy(null); }
  }

  const transcriptTone = stepTone(transcript?.state ?? job?.state, ["complete"]);
  const pipelineTone = stepTone(review.pipeline?.state, ["ready_for_review", "closed"]);

  return <>
    <section className="card pipeline-card session-review-card" aria-label="Post-session pipeline">
      <div className="sec-label"><RelicIcon name="clock" size={11} /> Evidence pipeline</div>
      <div className="pipeline-step">
        <span className={`pipeline-ico ${audioReady ? "done" : "waiting"}`}><RelicIcon name={audioReady ? "check" : "clock"} size={14} /></span>
        <div><div className="pipeline-title">Audio evidence</div><div className="pipeline-desc">{audioReady ? `${review.audio.registered_chunks} of ${review.audio.expected_chunks} chunks registered.` : "Waiting for every finalized recording chunk."}</div></div>
      </div>
      <div className="pipeline-step">
        <span className={`pipeline-ico ${transcriptTone}`}><RelicIcon name={transcriptTone === "failed" ? "alert" : transcriptTone === "done" ? "check" : "clock"} size={14} /></span>
        <div className="pipeline-copy"><div className="pipeline-title">Transcription · {transcript?.state ?? job?.state ?? "waiting"}</div><div className="pipeline-desc">{transcript?.state === "complete" ? `${segments.length} timestamped segments · ${transcript.language ?? "language auto-detected"}` : transcript?.failure_reason || job?.failure_reason || "Queued audio is processed asynchronously."}</div></div>
        {transcript?.state === "failed" && <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void retryTranscription()}>Retry transcription</button>}
      </div>
      <div className="pipeline-step">
        <span className={`pipeline-ico ${pipelineTone}`}><RelicIcon name={pipelineTone === "failed" ? "alert" : pipelineTone === "done" ? "check" : "spark"} size={14} /></span>
        <div><div className="pipeline-title">Synthesis · {review.pipeline?.state ?? "waiting"}</div><div className="pipeline-desc">Transcript evidence can feed draft proposals, but nothing becomes canon until explicit GM approval.</div></div>
      </div>
      {transcript?.state === "failed" && <div className="transcript-fallback">Audio remains preserved. You can retry transcription, save pasted notes or a manual summary below, or continue manual review without accepting AI changes.</div>}
      {message && <div className="review-action-message" role="status">{message}</div>}
    </section>

    <section className="card settings-content-card session-review-card" aria-label="Manual session evidence">
      <div className="transcript-card-head"><div><div className="sec-label"><RelicIcon name="file" size={11} /> Manual evidence</div><p>Save rough notes or your own summary as immutable Session sources. This does not start synthesis or change canon.</p></div></div>
      <div className="manual-evidence-grid">
        <div className="manual-evidence-field"><label><span>Pasted session notes <small>up to 50,000 characters</small></span><textarea aria-label="Pasted session notes" value={evidenceDrafts.pasted_text.text} maxLength={50000} disabled={evidenceBusy === "pasted_text"} onChange={(event) => updateEvidenceDraft("pasted_text", event.target.value)} placeholder="Paste rough notes, chat excerpts, or your table notes…" /></label><small>Preserved locally until the server confirms the source.</small><button className="btn btn-secondary btn-sm" type="button" disabled={evidenceBusy !== null || !evidenceDrafts.pasted_text.text.trim()} onClick={() => void saveEvidence("pasted_text")}>{evidenceBusy === "pasted_text" ? "Saving…" : "Save pasted notes"}</button></div>
        <div className="manual-evidence-field"><label><span>GM manual summary <small>up to 10,000 characters</small></span><textarea aria-label="GM manual summary" value={evidenceDrafts.gm_manual_summary.text} maxLength={10000} disabled={evidenceBusy === "gm_manual_summary"} onChange={(event) => updateEvidenceDraft("gm_manual_summary", event.target.value)} placeholder="What changed, what mattered, and what should carry forward?" /></label><small>Use your own concise account when audio or transcript is incomplete.</small><button className="btn btn-secondary btn-sm" type="button" disabled={evidenceBusy !== null || !evidenceDrafts.gm_manual_summary.text.trim()} onClick={() => void saveEvidence("gm_manual_summary")}>{evidenceBusy === "gm_manual_summary" ? "Saving…" : "Save manual summary"}</button></div>
      </div>
      {(review.manual_evidence ?? []).length > 0 && <div className="saved-evidence-list"><div className="sec-label"><RelicIcon name="check" size={11} /> Saved sources</div>{review.manual_evidence.map((source) => <article className="saved-evidence-item" key={source.id}><header><strong>{source.kind === "pasted_text" ? "Pasted notes" : "GM manual summary"}</strong><span>Saved {source.created_at.slice(0, 10)}</span></header><p>{source.text}</p></article>)}</div>}
    </section>

    <section className="card settings-content-card session-review-card" aria-label="Transcript editor">
      <div className="transcript-card-head"><div><div className="sec-label"><RelicIcon name="file" size={11} /> Transcript evidence</div><p>Edit text or hide a segment. Timestamps and segment boundaries remain immutable.</p></div>{transcript?.state === "complete" && <button className="btn btn-ink btn-sm" disabled={busy} onClick={() => void saveTranscript()}>{busy ? "Saving…" : "Save transcript"}</button>}</div>
      {transcript?.state === "complete" && segments.length ? <div className="transcript-segments">{segments.map((segment, index) => <article className={segment.deleted ? "transcript-segment deleted" : "transcript-segment"} key={`${segment.start}-${segment.end}`}><div className="transcript-time">{formatTimestamp(segment.start)}–{formatTimestamp(segment.end)}</div><textarea aria-label={`Transcript segment ${index + 1}`} value={segment.text} disabled={segment.deleted || busy} onChange={(event) => setSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item))} /><label className="transcript-delete"><input type="checkbox" checked={Boolean(segment.deleted)} disabled={busy} onChange={(event) => setSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, deleted: event.target.checked } : item))} />Hide segment</label></article>)}</div> : <div className="transcript-empty">{transcript?.state === "failed" ? "Transcript unavailable after provider retries. Audio evidence is preserved for recovery." : "Timestamped transcript segments will appear here when processing completes."}</div>}
    </section>
  </>;
}
