"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DraftCitationContext } from "@/lib/data";
import { SourceContextDisclosure } from "@/components/SourceContextDisclosure";

export type GuideCitation = {
  sourceId: string;
  context: DraftCitationContext;
};

export type GuideBlock =
  | { type: "grounded_answer"; text: string; citations: GuideCitation[] }
  | { type: "creative_proposal"; text: string }
  | { type: "grounded_proposal"; text: string; citations: GuideCitation[] }
  | { type: "guidance"; text: string }
  | {
      type: "action_preview";
      actionId: string;
      action:
        | { type: "open_record"; href: string }
        | {
            type: "draft_entity";
            entityType: "character" | "place" | "faction" | "artifact" | "thread";
            intent: string;
          };
      explanation: string;
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
  onConfirmAction?: (actionId: string) => void | Promise<void>;
  onDismissAction?: (actionId: string) => void | Promise<void>;
  onNewThread?: () => void | Promise<void>;
  onRetry?: (turnId: string) => void | Promise<void>;
};

function ActionBlock({
  block,
  onConfirm,
  onDismiss
}: {
  block: Extract<GuideBlock, { type: "action_preview" }>;
  onConfirm?: (actionId: string) => void | Promise<void>;
  onDismiss?: (actionId: string) => void | Promise<void>;
}) {
  const [reviewing, setReviewing] = useState(false);
  if (block.action.type === "open_record") {
    return (
      <section className="guide-action-card" aria-label="Suggested action">
        <div className="guide-block-label">Suggested action</div>
        <p>{block.explanation}</p>
        <Link href={block.action.href} className="btn btn-secondary btn-sm">Open record</Link>
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
        <div className="guide-block-label">Draft action</div>
        <p>{copy}</p>
      </section>
    );
  }
  return (
    <section className="guide-action-card" aria-label="Reviewed draft action">
      <div className="guide-block-label">Review before acting</div>
      <p>{block.explanation}</p>
      {!reviewing ? (
        <div className="guide-action-buttons">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReviewing(true)}>
            Review draft action
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDismiss?.(block.actionId)}>
            Dismiss action
          </button>
        </div>
      ) : (
        <div className="guide-action-confirm">
          <p>
            This will use the entity drafting task and its quota. The result remains a pending draft until you review it.
          </p>
          <div className="guide-action-buttons">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onConfirm?.(block.actionId)}>
              Confirm and draft
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReviewing(false)}>
              Keep reviewing
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDismiss?.(block.actionId)}>
              Dismiss action
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function statusCopy(status: GuideTurn["status"]) {
  if (status === "queued") return "Question queued. Relic Guide will answer when it is ready.";
  if (status === "running") return "Relic Guide is reviewing authorized Saga evidence.";
  if (status === "quota_blocked") return "Your current usage limit blocks this AI answer. Your question is preserved.";
  if (status === "provider_unavailable") return "Relic Guide is temporarily unavailable. Your question is preserved.";
  if (status === "retrieval_fallback") return "Semantic retrieval is unavailable. Relic is using lexical evidence.";
  if (status === "dead_letter") return "Relic could not complete this answer after safe retries.";
  if (status === "failed") return "Relic Guide could not finish this answer. Your question is preserved.";
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
    <section className="guide-conversation" aria-label="Relic Guide conversation">
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
                      Retry Guide
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
        <label htmlFor="guide-question">Ask Relic Guide</label>
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
            Ask Guide
          </button>
        </div>
      </form>
    </section>
  );
}
