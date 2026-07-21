"use client";

import { createClient } from "@/lib/supabase/browser";

export type StageWriteScope = {
  workspaceId: string;
  worldId: string;
  sagaId: string;
  sessionId: string;
};

export type StageWriteIntentKind = "quick_capture" | "quick_stub" | "mark_moment" | "end_session" | "undo_end_session";
export type StageWriteQueueStatus = "idle" | "queued" | "uploading" | "failed" | "recovered";

export type StageWriteQueueSummary = {
  status: StageWriteQueueStatus;
  queued: number;
  uploading: number;
  failed: number;
  lastError: string | null;
};

export type StoredStageWriteIntent = StageWriteScope & {
  id: string;
  sessionKey: string;
  sequence: number;
  kind: StageWriteIntentKind;
  payload: Record<string, unknown>;
  state: "queued" | "uploading" | "failed";
  attempts: number;
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string;
};

type StageWriteSession = StageWriteScope & {
  sessionKey: string;
  nextSequence: number;
  recoveredAt: string | null;
  lastError: string | null;
};

export interface StageWriteStore {
  getSession(sessionKey: string): Promise<StageWriteSession | null>;
  putSession(session: StageWriteSession): Promise<void>;
  listSessions(): Promise<StageWriteSession[]>;
  putIntent(intent: StoredStageWriteIntent): Promise<void>;
  listIntents(sessionKey: string): Promise<StoredStageWriteIntent[]>;
  deleteIntent(id: string): Promise<void>;
}

export interface StageWriteTransport {
  deliver(intent: StoredStageWriteIntent): Promise<Record<string, unknown>>;
}

export function stageWriteSessionKey(scope: StageWriteScope) {
  return `${scope.workspaceId}:${scope.worldId}:${scope.sagaId}:${scope.sessionId}`;
}

function newId() {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `stage_write:${suffix}`;
}

function cleanError(error: unknown) {
  return error instanceof Error ? error.message : "Stage write failed.";
}

export class MemoryStageWriteStore implements StageWriteStore {
  private sessions = new Map<string, StageWriteSession>();
  private intents = new Map<string, StoredStageWriteIntent>();

  async getSession(sessionKey: string) { return this.sessions.get(sessionKey) ?? null; }
  async putSession(session: StageWriteSession) { this.sessions.set(session.sessionKey, { ...session }); }
  async listSessions() { return [...this.sessions.values()].map((session) => ({ ...session })); }
  async putIntent(intent: StoredStageWriteIntent) { this.intents.set(intent.id, { ...intent, payload: { ...intent.payload } }); }
  async listIntents(sessionKey: string) {
    return [...this.intents.values()]
      .filter((intent) => intent.sessionKey === sessionKey)
      .sort((a, b) => a.sequence - b.sequence)
      .map((intent) => ({ ...intent, payload: { ...intent.payload } }));
  }
  async deleteIntent(id: string) { this.intents.delete(id); }
}

const DB_NAME = "relic-stage-writes";
const DB_VERSION = 1;

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed.")), { once: true });
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("IndexedDB transaction was aborted.")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error ?? new Error("IndexedDB transaction failed.")), { once: true });
  });
}

export class IndexedDbStageWriteStore implements StageWriteStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open() {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.addEventListener("upgradeneeded", () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "sessionKey" });
          if (!db.objectStoreNames.contains("intents")) {
            const store = db.createObjectStore("intents", { keyPath: "id" });
            store.createIndex("sessionKey", "sessionKey", { unique: false });
          }
        });
        request.addEventListener("success", () => resolve(request.result), { once: true });
        request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB is unavailable.")), { once: true });
      });
    }
    return this.dbPromise;
  }

  private async transaction(name: "sessions" | "intents", mode: IDBTransactionMode) {
    const db = await this.open();
    return db.transaction(name, mode);
  }

  async getSession(sessionKey: string) {
    const transaction = await this.transaction("sessions", "readonly");
    const store = transaction.objectStore("sessions");
    return (await requestResult(store.get(sessionKey))) as StageWriteSession | null ?? null;
  }

  async putSession(session: StageWriteSession) {
    const transaction = await this.transaction("sessions", "readwrite");
    const store = transaction.objectStore("sessions");
    await requestResult(store.put(session));
    await transactionDone(transaction);
  }

  async listSessions() {
    const transaction = await this.transaction("sessions", "readonly");
    const store = transaction.objectStore("sessions");
    return await requestResult(store.getAll()) as StageWriteSession[];
  }

  async putIntent(intent: StoredStageWriteIntent) {
    const transaction = await this.transaction("intents", "readwrite");
    const store = transaction.objectStore("intents");
    await requestResult(store.put(intent));
    await transactionDone(transaction);
  }

  async listIntents(sessionKey: string) {
    const transaction = await this.transaction("intents", "readonly");
    const store = transaction.objectStore("intents");
    const intents = await requestResult(store.index("sessionKey").getAll(sessionKey)) as StoredStageWriteIntent[];
    return intents.sort((a, b) => a.sequence - b.sequence);
  }

  async deleteIntent(id: string) {
    const transaction = await this.transaction("intents", "readwrite");
    const store = transaction.objectStore("intents");
    await requestResult(store.delete(id));
    await transactionDone(transaction);
  }
}

export class SupabaseStageWriteTransport implements StageWriteTransport {
  private supabase = createClient();

  async deliver(intent: StoredStageWriteIntent) {
    const { data, error } = await this.supabase.rpc("apply_stage_write_intent", {
      workspace_id: intent.workspaceId,
      world_id: intent.worldId,
      saga_id: intent.sagaId,
      session_id: intent.sessionId,
      idempotency_key: intent.id,
      intent_kind: intent.kind,
      payload: intent.payload,
    });
    if (error) throw new Error(error.message);
    return data as Record<string, unknown>;
  }
}

type QueueListener = (scope: StageWriteScope, summary: StageWriteQueueSummary) => void;

export class StageWriteQueue {
  private activeFlushes = new Map<string, Promise<StageWriteQueueSummary>>();
  private listeners = new Set<QueueListener>();

  constructor(private store: StageWriteStore, private transport: StageWriteTransport) {}

  subscribe(listener: QueueListener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private async session(scope: StageWriteScope) {
    const sessionKey = stageWriteSessionKey(scope);
    const existing = await this.store.getSession(sessionKey);
    if (existing) return existing;
    const created: StageWriteSession = {
      ...scope,
      sessionKey,
      nextSequence: 0,
      recoveredAt: null,
      lastError: null,
    };
    await this.store.putSession(created);
    return created;
  }

  async prepareSession(scope: StageWriteScope) {
    const session = await this.session(scope);
    const intents = await this.store.listIntents(session.sessionKey);
    session.nextSequence = Math.max(session.nextSequence, 0, ...intents.map((intent) => intent.sequence + 1));
    await this.store.putSession(session);
    return this.emit(scope);
  }

  async enqueue(scope: StageWriteScope, kind: StageWriteIntentKind, payload: Record<string, unknown>) {
    const session = await this.session(scope);
    const intent: StoredStageWriteIntent = {
      ...scope,
      id: newId(),
      sessionKey: session.sessionKey,
      sequence: session.nextSequence,
      kind,
      payload,
      state: "queued",
      attempts: 0,
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date().toISOString(),
    };
    await this.store.putIntent(intent);
    session.nextSequence += 1;
    session.recoveredAt = null;
    session.lastError = null;
    await this.store.putSession(session);
    await this.emit(scope);
    return intent;
  }

  async getSummary(scope: StageWriteScope) {
    const session = await this.session(scope);
    const intents = await this.store.listIntents(session.sessionKey);
    const uploading = intents.filter((intent) => intent.state === "uploading").length;
    const failed = intents.filter((intent) => intent.state === "failed").length;
    const queued = intents.filter((intent) => intent.state === "queued").length;
    const status: StageWriteQueueStatus = uploading
      ? "uploading"
      : failed
        ? "failed"
        : queued
          ? "queued"
          : session.recoveredAt
            ? "recovered"
            : "idle";
    return { status, queued, uploading, failed, lastError: session.lastError };
  }

  private async emit(scope: StageWriteScope) {
    const summary = await this.getSummary(scope);
    this.listeners.forEach((listener) => listener(scope, summary));
    return summary;
  }

  async flushSession(scope: StageWriteScope, retryNow = false): Promise<StageWriteQueueSummary> {
    const sessionKey = stageWriteSessionKey(scope);
    const active = this.activeFlushes.get(sessionKey);
    if (active) return active;
    const run = this.flushUnlocked(scope, retryNow).finally(() => this.activeFlushes.delete(sessionKey));
    this.activeFlushes.set(sessionKey, run);
    return run;
  }

  private async flushUnlocked(scope: StageWriteScope, retryNow: boolean) {
    const session = await this.session(scope);
    const intents = await this.store.listIntents(session.sessionKey);
    for (const intent of intents) {
      if (!retryNow && intent.state === "failed" && intent.nextRetryAt && Date.parse(intent.nextRetryAt) > Date.now()) {
        return this.emit(scope);
      }
      intent.state = "uploading";
      intent.nextRetryAt = null;
      intent.lastError = null;
      await this.store.putIntent(intent);
      await this.emit(scope);
      try {
        await this.transport.deliver(intent);
        if (intent.attempts > 0) session.recoveredAt = new Date().toISOString();
        await this.store.deleteIntent(intent.id);
        session.lastError = null;
        await this.store.putSession(session);
      } catch (error) {
        intent.state = "failed";
        intent.attempts += 1;
        intent.nextRetryAt = new Date(Date.now() + Math.min(300_000, 5_000 * (2 ** (intent.attempts - 1)))).toISOString();
        intent.lastError = cleanError(error);
        session.lastError = intent.lastError;
        await this.store.putIntent(intent);
        await this.store.putSession(session);
        return this.emit(scope);
      }
    }
    return this.emit(scope);
  }

  async recoverAll() {
    const sessions = await this.store.listSessions();
    return Promise.all(sessions.map((session) => this.flushSession(session)));
  }
}

let browserQueue: StageWriteQueue | null = null;

export function getStageWriteQueue() {
  if (!browserQueue) {
    browserQueue = new StageWriteQueue(new IndexedDbStageWriteStore(), new SupabaseStageWriteTransport());
  }
  return browserQueue;
}
