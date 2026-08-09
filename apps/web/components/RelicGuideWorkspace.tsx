"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  newGuideThreadAction,
  reviewLoomActionAction,
  submitGuideQuestionAction
} from "@/app/actions";
import {
  RelicGuideConversation
} from "@/components/RelicGuideConversation";
import type { GuideThread } from "@/lib/loom-types";
import type { IdParams } from "@/lib/types";

function scopedForm(params: IdParams) {
  const form = new FormData();
  form.set("workspaceId", params.workspaceId);
  form.set("worldId", params.worldId);
  form.set("sagaId", params.sagaId);
  return form;
}

export function RelicGuideWorkspace({
  params,
  sagaRoot,
  initialThread,
  initialQuestion
}: {
  params: IdParams;
  sagaRoot: string;
  initialThread: GuideThread;
  initialQuestion?: string;
}) {
  const router = useRouter();
  const [thread, setThread] = useState(initialThread);
  const submissions = useRef(new Map<string, { question: string; idempotencyKey: string; threadId: string }>());
  const actionReviews = useRef(new Map<string, string>());

  useEffect(() => {
    setThread(initialThread);
  }, [initialThread]);

  async function dispatch(turnId: string, question: string, idempotencyKey: string, requestedThreadId: string) {
    let threadId = requestedThreadId;
    if (!threadId) {
      const form = scopedForm(params);
      const created = await newGuideThreadAction(form);
      if (!created.ok || !created.threadId) return;
      threadId = created.threadId;
      const pending = submissions.current.get(turnId);
      if (pending) submissions.current.set(turnId, { ...pending, threadId });
      setThread((current) => ({ ...current, id: threadId }));
    }
    const form = scopedForm(params);
    form.set("question", question);
    form.set("threadId", threadId);
    form.set("turnId", turnId);
    form.set("idempotencyKey", idempotencyKey);
    const result = await submitGuideQuestionAction(form);
    if (!result.ok) {
      setThread((current) => ({
        ...current,
        turns: current.turns.map((turn) => turn.id === turnId
          ? { ...turn, status: result.category === "quota_blocked" ? "quota_blocked" : "provider_unavailable" }
          : turn)
      }));
      return;
    }
    submissions.current.delete(turnId);
    router.refresh();
  }

  async function submit(question: string) {
    const turnId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const submission = { question, idempotencyKey, threadId: thread.id };
    submissions.current.set(turnId, submission);
    setThread((current) => ({
      ...current,
      turns: [...current.turns, { id: turnId, question, status: "queued", blocks: [] }]
    }));
    await dispatch(turnId, question, idempotencyKey, thread.id);
  }

  async function retry(turnId: string) {
    const submission = submissions.current.get(turnId);
    if (!submission) return;
    setThread((current) => ({
      ...current,
      turns: current.turns.map((turn) => turn.id === turnId ? { ...turn, status: "queued" } : turn)
    }));
    await dispatch(turnId, submission.question, submission.idempotencyKey, submission.threadId);
  }

  async function changeAction(actionId: string, expectedIntentVersion: number, decision: "confirmed" | "dismissed") {
    const reviewIdentity = `${actionId}:${expectedIntentVersion}:${decision}`;
    const idempotencyKey = actionReviews.current.get(reviewIdentity) ?? crypto.randomUUID();
    actionReviews.current.set(reviewIdentity, idempotencyKey);
    const form = new FormData();
    form.set("actionId", actionId);
    form.set("expectedIntentVersion", String(expectedIntentVersion));
    form.set("decision", decision);
    form.set("idempotencyKey", idempotencyKey);
    const result = await reviewLoomActionAction(form);
    setThread((current) => ({
      ...current,
      turns: current.turns.map((turn) => ({
        ...turn,
        blocks: turn.blocks.map((block) => block.type === "action_preview" && block.actionId === actionId
          ? {
              ...block,
              intentVersion: result.intentVersion ?? block.intentVersion,
              state: result.ok
                ? (result.state ?? (decision === "confirmed" ? "processing" : "dismissed"))
                : (result.category === "quota_blocked" ? "quota_blocked" : "conflict")
            }
          : block)
      }))
    }));
    router.refresh();
  }

  async function newThread() {
    const form = scopedForm(params);
    const result = await newGuideThreadAction(form);
    if (result.ok && result.threadId) {
      setThread({ id: result.threadId, state: "active", turns: [] });
    }
    router.refresh();
  }

  return (
    <RelicGuideConversation
      sagaRoot={sagaRoot}
      thread={thread}
      initialQuestion={initialQuestion}
      onSubmit={submit}
      onConfirmAction={(actionId, intentVersion) => changeAction(actionId, intentVersion, "confirmed")}
      onDismissAction={(actionId, intentVersion) => changeAction(actionId, intentVersion, "dismissed")}
      onNewThread={newThread}
      onRetry={retry}
    />
  );
}
