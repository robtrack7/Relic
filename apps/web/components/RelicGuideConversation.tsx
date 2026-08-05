"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DraftCitationContext } from "@/lib/data";
import { SourceContextDisclosure } from "@/components/SourceContextDisclosure";

export type GuideCitation = {
  sourceId: string;
  context: DraftCitationContext;
};

export type LoomReadRecord = {
  recordType: string;
  recordId: string;
  name: string;
  status?: string;
  summary?: string;
  href: string;
};

export type LoomReadSnapshot = {
  record?: LoomReadRecord;
  relationships?: Array<LoomReadRecord & { kind: string; direction: string }>;
  objectives?: Array<{ id?: string; text: string; state: string }>;
  source?: { kind: string; excerpt?: string; createdAt?: string };
  provenance?: Array<{ operation: string; actorKind?: string; createdAt?: string; sourceCount?: number }>;
};

export type LoomFieldDiff = {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
};

export type GuideBlock =
  | { type: "grounded_answer"; text: string; citations: GuideCitation[] }
  | { type: "creative_proposal"; text: string }
  | { type: "grounded_proposal"; text: string; citations: GuideCitation[] }
  | { type: "guidance"; text: string }
  | {
      type: "action_preview";
      actionId: string;
      intentVersion: number;
      action:
        | { name: "open_record"; version: "1.0.0"; href: string; result?: LoomReadSnapshot }
        | { name: "list_records"; version: "1.0.0"; records: LoomReadRecord[] }
        | { name: "show_source"; version: "1.0.0"; result: LoomReadSnapshot }
        | { name: "explain_provenance"; version: "1.0.0"; result: LoomReadSnapshot }
        | { name: "navigate_surface"; version: "1.0.0"; destination: string; href: string }
         | {
             name: "draft_entity";
            version: "1.0.0";
            entityType: "character" | "place" | "faction" | "artifact" | "thread";
             intent: string;
          }
        | {
            name: "propose_record_create" | "propose_record_update";
            version: "1.0.0";
            recordType: string;
            recordName?: string;
            fields: LoomFieldDiff[];
            reviewHref: string;
            draftId?: string;
          }
        | {
            name: "add_relationship" | "remove_relationship";
            version: "1.0.0";
            operation: "add" | "remove";
            kind: string;
            fromName: string;
            toName: string;
            alreadyPresent?: boolean;
          }
        | {
            name: "set_thread_state";
            version: "1.0.0";
            recordName: string;
            fromState: string;
            toState: string;
            resolutionDetails?: string;
            href: string;
          }
        | {
            name: "mutate_thread_objective";
            version: "1.0.0";
            recordName: string;
            operation: string;
            objectiveText: string;
            newText?: string;
            href: string;
          };
      explanation: string;
      authorityTier: "read_navigation" | "non_canon_generation" | "canon_mutation";
      confirmationPolicy: "none" | "explicit";
      costCredits: number;
      effectSummary: string;
      manualFallback: string;
      availabilityState?: string;
      state?: "pending" | "processing" | "accepted" | "dismissed" | "quota_blocked" | "conflict" | "failed";
    };

export type GuideTurn = {
  id: string;
  question: string;
  status:
    | "queued"
    | "running"
    | "complete"
    | "quota_blocked"
    | "provider_unavailable"
    | "retrieval_fallback"
    | "failed"
    | "dead_letter";
  noAnswer?: boolean;
  insufficiencyReason?: string;
  blocks: GuideBlock[];
};

export type GuideThread = {
  id: string;
  state: "active" | "archived";
  turns: GuideTurn[];
};

type Props = {
  sagaRoot: string;
  thread: GuideThread;
  initialQuestion?: string;
  onSubmit: (question: string) => void | Promise<void>;
  onConfirmAction?: (actionId: string, intentVersion: number) => void | Promise<void>;
  onDismissAction?: (actionId: string, intentVersion: number) => void | Promise<void>;
  onNewThread?: () => void | Promise<void>;
  onRetry?: (turnId: string) => void | Promise<void>;
};

type GuideAction = Extract<GuideBlock, { type: "action_preview" }>["action"];
type KnowledgeAction = Extract<GuideAction, {
  name: "propose_record_create" | "propose_record_update" | "add_relationship" | "remove_relationship"
    | "set_thread_state" | "mutate_thread_objective";
}>;

function diffValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function KnowledgeActionDetails({ action }: { action: KnowledgeAction }) {
  if (action.name === "propose_record_create" || action.name === "propose_record_update") {
    return (
      <div className="guide-read-result">
        <strong>{action.recordName ?? `${action.recordType} proposal`}</strong>
        <ul className="guide-read-list">{action.fields.map((field) => (
          <li key={field.field}>
            <span className="guide-block-label">{field.label}</span>
            {action.name === "propose_record_update" && <p>Current: {diffValue(field.oldValue)}</p>}
            <p>Proposed: {diffValue(field.newValue)}</p>
          </li>
        ))}</ul>
      </div>
    );
  }
  if (action.name === "add_relationship" || action.name === "remove_relationship") {
    return (
      <div className="guide-read-result">
        <p><strong>{action.fromName}</strong> · {action.kind} · <strong>{action.toName}</strong></p>
        {action.alreadyPresent && <p>This exact relationship is already present; confirmation will not duplicate it.</p>}
      </div>
    );
  }
  if (action.name === "set_thread_state") {
    return (
      <div className="guide-read-result">
        <strong>{action.recordName}</strong>
        <p>{action.fromState} → {action.toState}</p>
        {action.resolutionDetails && <p>{action.resolutionDetails}</p>}
      </div>
    );
  }
  if ("objectiveText" in action) {
    return (
      <div className="guide-read-result">
        <strong>{action.recordName}</strong>
        <p>{action.operation}: {action.objectiveText}</p>
        {action.newText && action.newText !== action.objectiveText && <p>New text: {action.newText}</p>}
      </div>
    );
  }
  return null;
}

function ActionBlock({
  block,
  onConfirm,
  onDismiss
}: {
  block: Extract<GuideBlock, { type: "action_preview" }>;
  onConfirm?: (actionId: string, intentVersion: number) => void | Promise<void>;
  onDismiss?: (actionId: string, intentVersion: number) => void | Promise<void>;
}) {
  const [reviewing, setReviewing] = useState(false);
  if (block.action.name === "propose_record_create" || block.action.name === "propose_record_update"
    || block.action.name === "add_relationship" || block.action.name === "remove_relationship"
    || block.action.name === "set_thread_state" || block.action.name === "mutate_thread_objective") {
    const action = block.action;
    const isProposal = action.name === "propose_record_create" || action.name === "propose_record_update";
    if (block.state && block.state !== "pending") {
      const copy = block.state === "accepted"
        ? isProposal ? "One pending proposal was created. Canon is unchanged until Review approval." : "The reviewed canon change was applied."
        : block.state === "dismissed" ? "This suggested action was dismissed with no product change."
          : block.state === "conflict" ? "The target or evidence changed. Refresh before deciding whether to try again."
            : "Relic could not safely complete this action.";
      return (
        <section className="guide-action-card" aria-label="Knowledge action status">
          <div className="guide-block-label">
            {isProposal ? "Proposal" : "Canon action"} · 0 additional credits · {isProposal ? "Not canon" : "Explicitly reviewed"}
          </div>
          <p>{copy}</p>
          <KnowledgeActionDetails action={action} />
          {block.state === "accepted" && isProposal && <Link href={action.reviewHref} className="btn btn-secondary btn-sm">Open Review</Link>}
          {block.state === "accepted" && (action.name === "set_thread_state" || action.name === "mutate_thread_objective")
            && <Link href={action.href} className="btn btn-secondary btn-sm">Open Thread</Link>}
          {block.state === "conflict" && <p>{block.manualFallback}</p>}
        </section>
      );
    }
    return (
      <section className="guide-action-card" aria-label={isProposal ? "Record proposal review" : "Canon change review"}>
        <div className="guide-block-label">
          Review before acting · 0 additional credits · {isProposal ? "Not canon" : "Canon change"}
        </div>
        <p>{block.explanation}</p>
        <KnowledgeActionDetails action={action} />
        <p className="guide-action-meta">{block.effectSummary}</p>
        {!reviewing ? (
          <div className="guide-action-buttons">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReviewing(true)}>
              {isProposal ? "Review proposal action" : "Review canon change"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDismiss?.(block.actionId, block.intentVersion)}>
              Dismiss action
            </button>
          </div>
        ) : (
          <div className="guide-action-confirm">
            <p>{isProposal
              ? "This creates one pending Review item. It does not approve or publish the proposed fields."
              : "This applies the displayed effect through Relic's existing scoped, version-checked canon path."}</p>
            <div className="guide-action-buttons">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onConfirm?.(block.actionId, block.intentVersion)}>
                {isProposal ? "Send to Review" : "Confirm canon change"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReviewing(false)}>Keep reviewing</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDismiss?.(block.actionId, block.intentVersion)}>Dismiss action</button>
            </div>
          </div>
        )}
      </section>
    );
  }
  if (block.action.name !== "draft_entity") {
    const action = block.action;
    const result = "result" in action ? action.result : undefined;
    const readLabel = action.name === "list_records" ? "Record list"
      : action.name === "show_source" ? "Source"
      : action.name === "explain_provenance" ? "Provenance"
      : action.name === "navigate_surface" ? "Navigation" : "Current record";
    return (
      <section className="guide-action-card" aria-label={`${readLabel} read action`}>
        <div className="guide-block-label">{readLabel} · Free · Read only</div>
        <p>{block.explanation}</p>
        <p className="guide-action-meta">{block.effectSummary}</p>
        {action.name === "open_record" && result?.record && (
          <div className="guide-read-result">
            <strong>{result.record.name}</strong>
            {result.record.status && <span className="chip stone">{result.record.status}</span>}
            {result.record.summary && <p>{result.record.summary}</p>}
            {result.relationships?.length ? (
              <div>
                <div className="guide-block-label">One-hop relationships</div>
                <ul>{result.relationships.map((record) => (
                  <li key={`${record.recordType}:${record.recordId}:${record.kind}`}>
                    <Link href={record.href}>{record.name}</Link> · {record.kind}
                  </li>
                ))}</ul>
              </div>
            ) : null}
            {result.objectives?.length ? (
              <div>
                <div className="guide-block-label">Thread objectives</div>
                <ul>{result.objectives.map((objective, index) => (
                  <li key={objective.id ?? `${objective.text}-${index}`}>{objective.text} · {objective.state}</li>
                ))}</ul>
              </div>
            ) : null}
          </div>
        )}
        {action.name === "list_records" && (
          action.records.length ? <ul className="guide-read-list">{action.records.map((record) => (
            <li key={`${record.recordType}:${record.recordId}`}>
              <Link href={record.href}>{record.name}</Link>
              {record.status && <span className="chip stone">{record.status}</span>}
              {record.summary && <p>{record.summary}</p>}
            </li>
          ))}</ul> : <p>No current records match that bounded list.</p>
        )}
        {(action.name === "show_source" || action.name === "explain_provenance") && (
          <div className="guide-read-result">
            <p><strong>{result?.source?.kind ?? "Source"}</strong></p>
            {result?.source?.excerpt ? <blockquote>{result.source.excerpt}</blockquote> : <p>Source text is unavailable.</p>}
            {action.name === "explain_provenance" && (
              result?.provenance?.length ? <ol>{result.provenance.map((entry, index) => (
                <li key={`${entry.operation}-${entry.createdAt ?? index}`}>
                  {entry.operation}{entry.actorKind ? ` · ${entry.actorKind}` : ""}
                </li>
              ))}</ol> : <p>No additional audit provenance is available.</p>
            )}
          </div>
        )}
        {(action.name === "open_record" || action.name === "navigate_surface") && (
          <Link href={action.href} className="btn btn-secondary btn-sm">
            {action.name === "open_record" ? "Open record" : "Open surface"}
          </Link>
        )}
      </section>
    );
  }
  if (block.state && block.state !== "pending") {
    const copy = block.state === "processing"
      ? "Drafting is in progress. Any result will remain pending for your review."
      : block.state === "accepted"
        ? "This draft action was accepted and sent to the Approval Queue path."
        : block.state === "dismissed"
          ? "This suggested action was dismissed."
          : block.state === "quota_blocked"
            ? "Your current usage limit blocks this draft. The suggestion remains available."
            : "Relic could not safely complete this action.";
    return (
      <section className="guide-action-card" aria-label="Draft action status">
        <div className="guide-block-label">Draft action · {block.costCredits} AI credits · Not canon</div>
        <p>{copy}</p>
        {block.state === "conflict" && <p>{block.manualFallback}</p>}
      </section>
    );
  }
  return (
    <section className="guide-action-card" aria-label="Reviewed draft action">
      <div className="guide-block-label">Review before acting · {block.costCredits} AI credits · Not canon</div>
      <p>{block.explanation}</p>
      <p className="guide-action-meta">{block.effectSummary}</p>
      {!reviewing ? (
        <div className="guide-action-buttons">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReviewing(true)}>
            Review draft action
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDismiss?.(block.actionId, block.intentVersion)}>
            Dismiss action
          </button>
        </div>
      ) : (
        <div className="guide-action-confirm">
          <p>
            This will spend exactly {block.costCredits} AI credits. It creates one non-canon pending entity draft; nothing becomes canon until you approve it through the review path.
          </p>
          <div className="guide-action-buttons">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onConfirm?.(block.actionId, block.intentVersion)}>
              Confirm and draft
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReviewing(false)}>
              Keep reviewing
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDismiss?.(block.actionId, block.intentVersion)}>
              Dismiss action
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function statusCopy(status: GuideTurn["status"]) {
  if (status === "queued") return "Question queued. The Loom will answer when it is ready.";
  if (status === "running") return "The Loom is reviewing authorized Saga evidence.";
  if (status === "quota_blocked") return "Your current usage limit blocks this AI answer. Your question is preserved.";
  if (status === "provider_unavailable") return "The Loom is temporarily unavailable. Your question is preserved.";
  if (status === "retrieval_fallback") return "Semantic retrieval is unavailable. Relic is using lexical evidence.";
  if (status === "dead_letter") return "Relic could not complete this answer after safe retries.";
  if (status === "failed") return "The Loom could not finish this answer. Your question is preserved.";
  return "";
}

export function RelicGuideConversation({
  sagaRoot,
  thread,
  initialQuestion,
  onSubmit,
  onConfirmAction,
  onDismissAction,
  onNewThread,
  onRetry
}: Props) {
  const lastTurn = thread.turns.at(-1);
  const [question, setQuestion] = useState(
    initialQuestion ?? (lastTurn && lastTurn.status !== "complete" ? lastTurn.question : "")
  );
  const busy = lastTurn?.status === "queued" || lastTurn?.status === "running";
  const chronologicalTurns = useMemo(() => thread.turns, [thread.turns]);

  return (
    <section className="guide-conversation" aria-label="The Loom conversation">
      <div className="guide-thread-toolbar">
        <span className="guide-thread-scope">This conversation belongs to the active Saga.</span>
        {onNewThread && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNewThread()}>
            New thread
          </button>
        )}
      </div>

      <div className="guide-turn-list" aria-live="off">
        {chronologicalTurns.map((turn) => (
          <article className="guide-turn" key={turn.id}>
            <div className="guide-question">
              <div className="guide-block-label">You</div>
              <p>{turn.question}</p>
            </div>

            {turn.status !== "complete" && (
              <div className={`guide-state guide-state-${turn.status}`} role="status" aria-live="polite">
                <p>{statusCopy(turn.status)}</p>
                <div className="guide-state-actions">
                  {onRetry && ["quota_blocked", "provider_unavailable", "failed", "dead_letter"].includes(turn.status) && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => onRetry(turn.id)}>
                      Retry The Loom
                    </button>
                  )}
                  <Link href={`${sagaRoot}/search?q=${encodeURIComponent(turn.question)}`}>Search manually</Link>
                </div>
              </div>
            )}

            {turn.status === "complete" && turn.noAnswer && (
              <div className="guide-no-answer">
                <div className="guide-block-label">Not enough evidence</div>
                <p>Relic does not have enough reliable Saga evidence to answer that.</p>
                <div className="guide-state-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuestion(turn.question)}>
                    Edit question
                  </button>
                  <Link href={`${sagaRoot}/search?q=${encodeURIComponent(turn.question)}`}>Search manually</Link>
                </div>
              </div>
            )}

            {turn.status === "complete" && turn.blocks.map((block, blockIndex) => {
              if (block.type === "grounded_answer" || block.type === "grounded_proposal") {
                return (
                  <section className={`guide-answer-block guide-${block.type}`} key={`${turn.id}-${blockIndex}`}>
                    <div className="guide-block-label">
                      {block.type === "grounded_answer" ? "Grounded answer" : "Grounded proposal · Not canon"}
                    </div>
                    <p>
                      {block.text}{" "}
                      {block.citations.map((citation, citationIndex) => (
                        <SourceContextDisclosure
                          citation={citation}
                          index={citationIndex}
                          key={`${citation.sourceId}-${citationIndex}`}
                        />
                      ))}
                    </p>
                  </section>
                );
              }
              if (block.type === "creative_proposal") {
                return (
                  <section className="guide-creative-proposal" key={`${turn.id}-${blockIndex}`}>
                    <div className="guide-block-label">New proposal · Not canon</div>
                    <p>{block.text}</p>
                  </section>
                );
              }
              if (block.type === "guidance") {
                return <p className="guide-guidance" key={`${turn.id}-${blockIndex}`}>{block.text}</p>;
              }
              return (
                <ActionBlock
                  block={block}
                  key={`${turn.id}-${blockIndex}`}
                  onConfirm={onConfirmAction}
                  onDismiss={onDismissAction}
                />
              );
            })}
          </article>
        ))}
      </div>

      <form
        className="guide-composer"
        onSubmit={(event) => {
          event.preventDefault();
          const normalized = question.normalize("NFKC").trim();
          if (normalized && !busy) void onSubmit(normalized);
        }}
      >
        <label htmlFor="guide-question">Ask The Loom</label>
        <textarea
          id="guide-question"
          value={question}
          maxLength={2000}
          rows={3}
          disabled={busy}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="guide-composer-footer">
          <span>{question.length}/2000 · Enter to send · Shift+Enter for a new line</span>
          <button type="submit" className="btn btn-primary" disabled={busy || !question.trim()}>
            Ask The Loom
          </button>
        </div>
      </form>
    </section>
  );
}
