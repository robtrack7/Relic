"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { retrySessionTranscriptionAction, updateTranscriptAction } from "@/app/actions";
import { RelicIcon } from "@/components/RelicIcon";
import type { SessionReviewData, TranscriptSegment } from "@/lib/data";
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

export function SessionReviewWorkspace({ params, sessionId, review }: { params: IdParams; sessionId: string; review: SessionReviewData }) {
  const router = useRouter();
  const transcript = review.transcript;
  const job = review.transcription_job;
  const [segments, setSegments] = useState<TranscriptSegment[]>(transcript?.segments ?? []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const audioReady = Boolean(review.audio.finalized_at)
    && Number(review.audio.expected_chunks ?? 0) > 0
    && review.audio.registered_chunks >= Number(review.audio.expected_chunks ?? 0);

  useEffect(() => {
    setSegments(transcript?.segments ?? []);
  }, [transcript?.id, transcript?.edited_at, transcript?.state]);

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
      {transcript?.state === "failed" && <div className="transcript-fallback">Audio remains preserved. You can retry, paste notes in a later recovery step, or continue manual review without accepting AI changes.</div>}
      {message && <div className="review-action-message" role="status">{message}</div>}
    </section>

    <section className="card settings-content-card session-review-card" aria-label="Transcript editor">
      <div className="transcript-card-head"><div><div className="sec-label"><RelicIcon name="file" size={11} /> Transcript evidence</div><p>Edit text or hide a segment. Timestamps and segment boundaries remain immutable.</p></div>{transcript?.state === "complete" && <button className="btn btn-ink btn-sm" disabled={busy} onClick={() => void saveTranscript()}>{busy ? "Saving…" : "Save transcript"}</button>}</div>
      {transcript?.state === "complete" && segments.length ? <div className="transcript-segments">{segments.map((segment, index) => <article className={segment.deleted ? "transcript-segment deleted" : "transcript-segment"} key={`${segment.start}-${segment.end}`}><div className="transcript-time">{formatTimestamp(segment.start)}–{formatTimestamp(segment.end)}</div><textarea aria-label={`Transcript segment ${index + 1}`} value={segment.text} disabled={segment.deleted || busy} onChange={(event) => setSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item))} /><label className="transcript-delete"><input type="checkbox" checked={Boolean(segment.deleted)} disabled={busy} onChange={(event) => setSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, deleted: event.target.checked } : item))} />Hide segment</label></article>)}</div> : <div className="transcript-empty">{transcript?.state === "failed" ? "Transcript unavailable after provider retries. Audio evidence is preserved for recovery." : "Timestamped transcript segments will appear here when processing completes."}</div>}
    </section>
  </>;
}
