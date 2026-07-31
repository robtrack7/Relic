"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SourceContextDisclosure } from "@/components/SourceContextDisclosure";
import type { PrepAiRequest } from "@/lib/data";
import type { SessionPrepPin } from "@/lib/types";

type StartOptions = {
  requestId?: string;
  prepVersion?: string;
  parentRequestId?: string | null;
};
type ReviewState = "accepted" | "rejected" | "dismissed";
type AcceptScope = "objective" | "opening_scene" | "scene_notes" | "prep_checklist" | "pinned_entities" | "active_threads";

type Props = {
  requests: PrepAiRequest[];
  locked: boolean;
  activeThreads: SessionPrepPin[];
  quickStubs: SessionPrepPin[];
  onStart: (task: string, input: Record<string, unknown>, options?: StartOptions) => Promise<boolean>;
  onReview: (
    request: PrepAiRequest,
    state: ReviewState,
    editedPayload?: Record<string, unknown> | null
  ) => Promise<boolean>;
  onAcceptPrep: (
    request: PrepAiRequest,
    scope: AcceptScope,
    value: string | string[],
    editedPayload: Record<string, unknown>
  ) => Promise<boolean>;
};

const FAILURE_STATES = new Set([
  "quota_blocked", "provider_unavailable", "retrieval_unavailable",
  "validation_failed", "failed", "dead_letter"
]);
const TASK_LABELS: Record<string, string> = {
  compose_prep_briefing: "Canon briefing",
  generate_session_prep: "Session suggestions",
  propose_scene_beats: "Scene beats",
  propose_thread_complication: "Complications",
  propose_npc_for_scene: "NPC candidates",
  propose_quick_stub_fleshing: "Quick Stub proposal",
  draft_entity_from_prompt: "NPC review draft"
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}
function list(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => (
    Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)
  )) : [];
}
function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}
function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function ResultSources({ request, sourceIds }: { request: PrepAiRequest; sourceIds?: string[] }) {
  const allowed = sourceIds?.length ? new Set(sourceIds) : null;
  const sources = request.sources.filter((source) => !allowed || allowed.has(source.source_id));
  if (!sources.length) return null;
  return (
    <span className="prep-ai-sources" aria-label="Sources used">
      <span>Sources used</span>
      {sources.map((source, index) => (
        <SourceContextDisclosure
          key={source.source_id}
          citation={{ sourceId: source.source_id, context: source.context }}
          index={index}
        />
      ))}
    </span>
  );
}

function ReviewButtons({
  request,
  onReview
}: {
  request: PrepAiRequest;
  onReview: Props["onReview"];
}) {
  if (request.review_state !== "pending") {
    return <span className="prep-ai-reviewed">Marked {request.review_state.replace("_", " ")}</span>;
  }
  return (
    <span className="prep-ai-review-actions">
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => void onReview(request, "rejected")}>
        Reject
      </button>
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => void onReview(request, "dismissed")}>
        Dismiss
      </button>
    </span>
  );
}

function EditablePrepResult({
  request,
  item,
  scope,
  onAcceptPrep
}: {
  request: PrepAiRequest;
  item: Record<string, unknown>;
  scope: AcceptScope;
  onAcceptPrep: Props["onAcceptPrep"];
}) {
  const initial = text(item.value || item.narrative);
  const [draft, setDraft] = useState(initial);
  const itemValues = strings(item.items);
  const edited = {
    ...record(request.result_payload),
    accepted_item: { ...item, ...(initial ? { value: draft } : {}) }
  };
  return (
    <article className="prep-ai-item">
      {text(item.summary) && <strong>{text(item.summary)}</strong>}
      {initial ? (
        <textarea
          className="settings-field"
          aria-label={`Edit ${TASK_LABELS[request.task_name] ?? "Prep AI"} before accepting`}
          rows={4}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      ) : (
        <p>{itemValues.join(", ")}</p>
      )}
      {text(item.rationale) && <p className="prep-ai-rationale">{text(item.rationale)}</p>}
      {text(item.thread_implication) && <p className="prep-ai-rationale">{text(item.thread_implication)}</p>}
      <ResultSources request={request} sourceIds={strings(item.sources)} />
      {request.review_state === "pending" && (
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          disabled={initial ? !draft.trim() : itemValues.length === 0}
          onClick={() => void onAcceptPrep(request, scope, initial ? draft : itemValues, edited)}
        >
          Apply through Prep autosave
        </button>
      )}
    </article>
  );
}

function CompleteResult({
  request,
  onReview,
  onAcceptPrep,
  onStart
}: {
  request: PrepAiRequest;
  onReview: Props["onReview"];
  onAcceptPrep: Props["onAcceptPrep"];
  onStart: Props["onStart"];
}) {
  const output = record(request.result_payload);
  const noAnswer = output.no_answer === true;
  if (noAnswer) {
    return (
      <div className="prep-ai-insufficient">
        <p>Relic did not find enough eligible canon to answer safely.</p>
        <span>{text(output.insufficiency_reason).replaceAll("_", " ")}</span>
        <ReviewButtons request={request} onReview={onReview} />
      </div>
    );
  }

  if (request.task_name === "compose_prep_briefing") {
    return (
      <>
        <p className="prep-ai-long">{text(output.body)}</p>
        <ul>{strings(output.bullets).map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
        <ResultSources request={request} sourceIds={strings(output.sources)} />
        <span className="prep-ai-review-actions">
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => void navigator.clipboard.writeText(text(output.body))}>
            Copy briefing
          </button>
          <ReviewButtons request={request} onReview={onReview} />
        </span>
      </>
    );
  }

  if (request.task_name === "generate_session_prep") {
    return (
      <>
        <p>{text(output.summary)}</p>
        {list(output.suggestions).map((item, index) => (
          <EditablePrepResult
            key={text(item.id) || index}
            request={request}
            item={item}
            scope={text(item.scope) as AcceptScope}
            onAcceptPrep={onAcceptPrep}
          />
        ))}
        <ReviewButtons request={request} onReview={onReview} />
      </>
    );
  }

  if (request.task_name === "propose_scene_beats") {
    return (
      <>
        {list(output.beats).map((item, index) => (
          <EditablePrepResult key={text(item.id) || index} request={request} item={item} scope="scene_notes" onAcceptPrep={onAcceptPrep} />
        ))}
        <ReviewButtons request={request} onReview={onReview} />
      </>
    );
  }

  if (request.task_name === "propose_thread_complication") {
    return (
      <>
        {list(output.complications).map((item, index) => (
          <EditablePrepResult key={text(item.id) || index} request={request} item={item} scope="scene_notes" onAcceptPrep={onAcceptPrep} />
        ))}
        <ReviewButtons request={request} onReview={onReview} />
      </>
    );
  }

  if (request.task_name === "propose_npc_for_scene") {
    return (
      <>
        {list(output.candidates).map((candidate, index) => (
          <NpcCandidate
            key={text(candidate.id) || index}
            request={request}
            candidate={candidate}
            onStart={onStart}
          />
        ))}
        <ReviewButtons request={request} onReview={onReview} />
      </>
    );
  }

  if (request.task_name === "propose_quick_stub_fleshing") {
    return <QuickStubReview request={request} output={output} onReview={onReview} />;
  }

  const entity = record(output.entity);
  return (
    <>
      <p>{text(entity.name)} is now a pending reviewed draft in the Approval Queue.</p>
      <ResultSources request={request} sourceIds={strings(output.sources)} />
    </>
  );
}

function NpcCandidate({
  request,
  candidate,
  onStart
}: {
  request: PrepAiRequest;
  candidate: Record<string, unknown>;
  onStart: Props["onStart"];
}) {
  const [name, setName] = useState(text(candidate.name));
  const [summary, setSummary] = useState(text(candidate.summary));
  const [role, setRole] = useState(text(candidate.role_in_scene));
  return (
    <article className="prep-ai-item">
      <input className="settings-field" aria-label="NPC candidate name" value={name} onChange={(event) => setName(event.target.value)} />
      <textarea className="settings-field" aria-label="NPC candidate summary" rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} />
      <input className="settings-field" aria-label="NPC role in scene" value={role} onChange={(event) => setRole(event.target.value)} />
      <ResultSources request={request} sourceIds={strings(candidate.sources)} />
      {request.review_state === "pending" && (
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          disabled={!name.trim() || !summary.trim()}
          onClick={() => void onStart("draft_entity_from_prompt", {
            candidate: { name, summary, role_in_scene: role }
          }, { parentRequestId: request.id })}
        >
          Create pending review draft
        </button>
      )}
    </article>
  );
}

function QuickStubReview({
  request,
  output,
  onReview
}: {
  request: PrepAiRequest;
  output: Record<string, unknown>;
  onReview: Props["onReview"];
}) {
  const proposal = record(output.proposal);
  const [summary, setSummary] = useState(text(proposal.summary));
  const [narrative, setNarrative] = useState(text(proposal.narrative));
  const edited = { ...output, proposal: { ...proposal, summary, narrative } };
  return (
    <article className="prep-ai-item">
      <input className="settings-field" aria-label="Quick Stub proposal summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
      <textarea className="settings-field" aria-label="Quick Stub proposal narrative" rows={5} value={narrative} onChange={(event) => setNarrative(event.target.value)} />
      <ResultSources request={request} sourceIds={strings(proposal.sources)} />
      {request.review_state === "pending" ? (
        <span className="prep-ai-review-actions">
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            disabled={!summary.trim() || !narrative.trim()}
            onClick={() => void onReview(request, "accepted", edited)}
          >
            Send to Approval Queue
          </button>
          <ReviewButtons request={request} onReview={onReview} />
        </span>
      ) : <span className="prep-ai-reviewed">Marked {request.review_state}</span>}
    </article>
  );
}

export function SessionPrepAiPanel({
  requests,
  locked,
  activeThreads,
  quickStubs,
  onStart,
  onReview,
  onAcceptPrep
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [threadId, setThreadId] = useState(activeThreads[0]?.entity_id ?? "");
  const [npcRole, setNpcRole] = useState("");
  const [stubKey, setStubKey] = useState(quickStubs[0]?.key ?? "");
  const hasPending = requests.some((request) => request.status === "queued" || request.status === "running");
  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => router.refresh(), 1500);
    return () => window.clearInterval(timer);
  }, [hasPending, router]);

  const latest = useMemo(() => requests.slice(0, 12), [requests]);
  async function run(task: string, input: Record<string, unknown>, options?: StartOptions) {
    setBusy(task);
    const ok = await onStart(task, input, options);
    setBusy("");
    return ok;
  }

  return (
    <section className="card prep-ai-panel" aria-labelledby="prep-ai-heading">
      <header>
        <div>
          <div className="sec-label">Session Prep AI</div>
          <h2 id="prep-ai-heading">Grounded suggestions, always optional</h2>
          <p>Generated results stay outside Prep and canon until you explicitly accept them.</p>
        </div>
      </header>
      <div className="prep-ai-controls" aria-label="Prep AI task controls">
        <button className="btn btn-secondary btn-sm" disabled={locked || Boolean(busy)} onClick={() => void run("compose_prep_briefing", {})}>Generate briefing</button>
        <button className="btn btn-secondary btn-sm" disabled={locked || Boolean(busy)} onClick={() => void run("generate_session_prep", { regenerate_scope: "all" })}>Suggest Session draft</button>
        <button className="btn btn-secondary btn-sm" disabled={locked || Boolean(busy)} onClick={() => void run("propose_scene_beats", {})}>Suggest scene beats</button>
        <span className="prep-ai-control-pair">
          <select aria-label="Thread for complication" value={threadId} onChange={(event) => setThreadId(event.target.value)}>
            <option value="">Choose Thread…</option>
            {activeThreads.map((thread) => <option key={thread.entity_id} value={thread.entity_id}>{thread.name}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" disabled={locked || Boolean(busy) || !threadId} onClick={() => void run("propose_thread_complication", { thread_id: threadId })}>Suggest complication</button>
        </span>
        <span className="prep-ai-control-pair">
          <input aria-label="NPC role description" placeholder="NPC role in this scene" value={npcRole} onChange={(event) => setNpcRole(event.target.value)} />
          <button className="btn btn-secondary btn-sm" disabled={locked || Boolean(busy) || !npcRole.trim()} onClick={() => void run("propose_npc_for_scene", { role_description: npcRole })}>Suggest NPCs</button>
        </span>
        <span className="prep-ai-control-pair">
          <select aria-label="Quick Stub for proposal" value={stubKey} onChange={(event) => setStubKey(event.target.value)}>
            <option value="">Choose pinned Quick Stub…</option>
            {quickStubs.map((stub) => <option key={stub.key} value={stub.key}>{stub.name}</option>)}
          </select>
          <button
            className="btn btn-secondary btn-sm"
            disabled={locked || Boolean(busy) || !stubKey}
            onClick={() => {
              const stub = quickStubs.find((item) => item.key === stubKey);
              if (stub) void run("propose_quick_stub_fleshing", { entity_type: stub.entity_type, entity_id: stub.entity_id });
            }}
          >
            Review Quick Stub
          </button>
        </span>
      </div>
      <div className="prep-ai-status" aria-live="polite">
        {busy ? `Starting ${TASK_LABELS[busy] ?? busy}…` : "Manual Prep remains available whether AI succeeds or not."}
      </div>
      <div className="prep-ai-results">
        {latest.length === 0 && <p className="inspector-empty">No generated results yet.</p>}
        {latest.map((request) => (
          <article className="prep-ai-result" key={request.id}>
            <header>
              <strong>{TASK_LABELS[request.task_name] ?? request.task_name}</strong>
              <span>{request.status.replaceAll("_", " ")}</span>
            </header>
            {request.status === "complete" ? (
              <CompleteResult request={request} onReview={onReview} onAcceptPrep={onAcceptPrep} onStart={run} />
            ) : FAILURE_STATES.has(request.status) ? (
              <div className="prep-ai-failure">
                <p>{request.quota?.message || "Generation could not finish. Your manual Prep is unchanged."}</p>
                {request.status !== "quota_blocked" && (
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => void run(request.task_name, request.retry_input, {
                      requestId: request.id,
                      prepVersion: request.prep_version_at_submit,
                      parentRequestId: request.parent_request_id
                    })}
                  >
                    Retry exact request
                  </button>
                )}
              </div>
            ) : <p>Generating from eligible current-Saga canon…</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
