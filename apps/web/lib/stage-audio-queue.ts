"use client";

import { createClient } from "@/lib/supabase/browser";

export type StageAudioScope = {
  workspaceId: string;
  worldId: string;
  sagaId: string;
  sessionId: string;
};

export type StageAudioQueueStatus = "idle" | "queued" | "uploading" | "failed" | "recovered";

export type StageAudioQueueSummary = {
  status: StageAudioQueueStatus;
  queued: number;
  uploading: number;
  failed: number;
  totalChunks: number;
  lastError: string | null;
};

export type StoredStageAudioChunk = StageAudioScope & {
  id: string;
  sessionKey: string;
  sequence: number;
  blob: Blob;
  mimeType: string;
  durationMs: number;
  recordedAt: string;
  state: "queued" | "uploading" | "failed";
  attempts: number;
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string;
};

type StageAudioSession = StageAudioScope & {
  sessionKey: string;
  nextSequence: number;
  totalChunks: number;
  finalizationRequested: boolean;
  finalizationCompleted: boolean;
  recoveredAt: string | null;
  lastError: string | null;
};

export interface StageAudioStore {
  getSession(sessionKey: string): Promise<StageAudioSession | null>;
  putSession(session: StageAudioSession): Promise<void>;
  listSessions(): Promise<StageAudioSession[]>;
  putChunk(chunk: StoredStageAudioChunk): Promise<void>;
  listChunks(sessionKey: string): Promise<StoredStageAudioChunk[]>;
  deleteChunk(id: string): Promise<void>;
}

export interface StageAudioTransport {
  getRemoteNextSequence(scope: StageAudioScope): Promise<number>;
  uploadChunk(chunk: StoredStageAudioChunk): Promise<void>;
  finalizeRecording(scope: StageAudioScope, expectedChunks: number): Promise<void>;
}

export function stageAudioSessionKey(scope: StageAudioScope) {
  return `${scope.workspaceId}:${scope.worldId}:${scope.sagaId}:${scope.sessionId}`;
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanError(error: unknown) {
  return error instanceof Error ? error.message : "Audio upload failed.";
}

export class MemoryStageAudioStore implements StageAudioStore {
  private sessions = new Map<string, StageAudioSession>();
  private chunks = new Map<string, StoredStageAudioChunk>();

  async getSession(sessionKey: string) { return this.sessions.get(sessionKey) ?? null; }
  async putSession(session: StageAudioSession) { this.sessions.set(session.sessionKey, { ...session }); }
  async listSessions() { return [...this.sessions.values()].map((session) => ({ ...session })); }
  async putChunk(chunk: StoredStageAudioChunk) { this.chunks.set(chunk.id, { ...chunk }); }
  async listChunks(sessionKey: string) {
    return [...this.chunks.values()]
      .filter((chunk) => chunk.sessionKey === sessionKey)
      .sort((a, b) => a.sequence - b.sequence)
      .map((chunk) => ({ ...chunk }));
  }
  async deleteChunk(id: string) { this.chunks.delete(id); }
}

const DB_NAME = "relic-stage-audio";
const DB_VERSION = 1;

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed.")), { once: true });
  });
}

export class IndexedDbStageAudioStore implements StageAudioStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open() {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.addEventListener("upgradeneeded", () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "sessionKey" });
          if (!db.objectStoreNames.contains("chunks")) {
            const store = db.createObjectStore("chunks", { keyPath: "id" });
            store.createIndex("sessionKey", "sessionKey", { unique: false });
          }
        });
        request.addEventListener("success", () => resolve(request.result), { once: true });
        request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB is unavailable.")), { once: true });
      });
    }
    return this.dbPromise;
  }

  private async store(name: "sessions" | "chunks", mode: IDBTransactionMode) {
    const db = await this.open();
    return db.transaction(name, mode).objectStore(name);
  }

  async getSession(sessionKey: string) {
    const store = await this.store("sessions", "readonly");
    return (await requestResult(store.get(sessionKey))) as StageAudioSession | null ?? null;
  }

  async putSession(session: StageAudioSession) {
    const store = await this.store("sessions", "readwrite");
    await requestResult(store.put(session));
  }

  async listSessions() {
    const store = await this.store("sessions", "readonly");
    return await requestResult(store.getAll()) as StageAudioSession[];
  }

  async putChunk(chunk: StoredStageAudioChunk) {
    const store = await this.store("chunks", "readwrite");
    await requestResult(store.put(chunk));
  }

  async listChunks(sessionKey: string) {
    const store = await this.store("chunks", "readonly");
    const chunks = await requestResult(store.index("sessionKey").getAll(sessionKey)) as StoredStageAudioChunk[];
    return chunks.sort((a, b) => a.sequence - b.sequence);
  }

  async deleteChunk(id: string) {
    const store = await this.store("chunks", "readwrite");
    await requestResult(store.delete(id));
  }
}

export class SupabaseStageAudioTransport implements StageAudioTransport {
  private supabase = createClient();

  async getRemoteNextSequence(scope: StageAudioScope) {
    const { data, error } = await this.supabase
      .from("audio_chunks")
      .select("sequence")
      .eq("workspace_id", scope.workspaceId)
      .eq("world_id", scope.worldId)
      .eq("saga_id", scope.sagaId)
      .eq("session_id", scope.sessionId)
      .order("sequence", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return data?.length ? Number(data[0].sequence) + 1 : 0;
  }

  async uploadChunk(chunk: StoredStageAudioChunk) {
    const extension = chunk.mimeType.includes("mp4") || chunk.mimeType.includes("m4a") ? "m4a" : "webm";
    const { data: target, error: targetError } = await this.supabase.rpc("get_audio_upload_target", {
      workspace_id: chunk.workspaceId,
      world_id: chunk.worldId,
      saga_id: chunk.sagaId,
      session_id: chunk.sessionId,
      sequence: chunk.sequence,
      extension,
      bytes: chunk.blob.size,
    });
    if (targetError) throw new Error(targetError.message);
    const uploadTarget = target as { bucket: string; storage_path: string };
    const { error: uploadError } = await this.supabase.storage
      .from(uploadTarget.bucket)
      .upload(uploadTarget.storage_path, chunk.blob, {
        contentType: chunk.mimeType,
        cacheControl: "3600",
        upsert: true,
      });
    if (uploadError) throw new Error(uploadError.message);
    const { error: registerError } = await this.supabase.rpc("register_audio_chunk", {
      workspace_id: chunk.workspaceId,
      world_id: chunk.worldId,
      saga_id: chunk.sagaId,
      session_id: chunk.sessionId,
      sequence: chunk.sequence,
      storage_path: uploadTarget.storage_path,
      bytes: chunk.blob.size,
      duration_seconds: chunk.durationMs / 1_000,
      client_recorded_at: chunk.recordedAt,
      idempotency_key: chunk.id,
    });
    if (registerError) throw new Error(registerError.message);
  }

  async finalizeRecording(scope: StageAudioScope, expectedChunks: number) {
    const { error } = await this.supabase.rpc("finalize_audio_upload", {
      workspace_id: scope.workspaceId,
      world_id: scope.worldId,
      saga_id: scope.sagaId,
      session_id: scope.sessionId,
      expected_chunks: expectedChunks,
    });
    if (error) throw new Error(error.message);
  }
}

type QueueListener = (scope: StageAudioScope, summary: StageAudioQueueSummary) => void;

export class StageAudioUploadQueue {
  private activeFlushes = new Map<string, Promise<StageAudioQueueSummary>>();
  private listeners = new Set<QueueListener>();

  constructor(private store: StageAudioStore, private transport: StageAudioTransport) {}

  subscribe(listener: QueueListener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private async session(scope: StageAudioScope) {
    const sessionKey = stageAudioSessionKey(scope);
    const existing = await this.store.getSession(sessionKey);
    if (existing) return existing;
    const created: StageAudioSession = {
      ...scope,
      sessionKey,
      nextSequence: 0,
      totalChunks: 0,
      finalizationRequested: false,
      finalizationCompleted: false,
      recoveredAt: null,
      lastError: null,
    };
    await this.store.putSession(created);
    return created;
  }

  async prepareSession(scope: StageAudioScope) {
    const session = await this.session(scope);
    let remoteNext = 0;
    try {
      remoteNext = await this.transport.getRemoteNextSequence(scope);
    } catch {
      // The local monotonic sequence is authoritative while offline; reconnect reconciles the queue.
    }
    const local = await this.store.listChunks(session.sessionKey);
    session.nextSequence = Math.max(session.nextSequence, remoteNext, ...local.map((chunk) => chunk.sequence + 1));
    session.totalChunks = Math.max(session.totalChunks, session.nextSequence);
    await this.store.putSession(session);
    await this.emit(scope);
    return session.nextSequence;
  }

  async enqueueChunk(scope: StageAudioScope, blob: Blob, mimeType: string, durationMs: number, recordedAt = new Date().toISOString()) {
    const session = await this.session(scope);
    const sequence = session.nextSequence;
    const chunk: StoredStageAudioChunk = {
      ...scope,
      id: `audio_chunk:${scope.sessionId}:${sequence}:${newId()}`,
      sessionKey: session.sessionKey,
      sequence,
      blob,
      mimeType,
      durationMs,
      recordedAt,
      state: "queued",
      attempts: 0,
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date().toISOString(),
    };
    await this.store.putChunk(chunk);
    session.nextSequence = sequence + 1;
    session.totalChunks = Math.max(session.totalChunks, sequence + 1);
    session.recoveredAt = null;
    session.lastError = null;
    await this.store.putSession(session);
    await this.emit(scope);
    return chunk;
  }

  async requestFinalization(scope: StageAudioScope, flushNow = true) {
    const session = await this.session(scope);
    session.finalizationRequested = true;
    await this.store.putSession(session);
    return flushNow ? this.flushSession(scope, true) : this.emit(scope);
  }

  async getSummary(scope: StageAudioScope) {
    const session = await this.session(scope);
    const chunks = await this.store.listChunks(session.sessionKey);
    const uploading = chunks.filter((chunk) => chunk.state === "uploading").length;
    const failedChunks = chunks.filter((chunk) => chunk.state === "failed").length;
    const failed = failedChunks + (session.lastError && failedChunks === 0 ? 1 : 0);
    const queued = chunks.filter((chunk) => chunk.state === "queued").length;
    const status: StageAudioQueueStatus = uploading
      ? "uploading"
      : failed
        ? "failed"
        : queued
          ? "queued"
          : session.recoveredAt
            ? "recovered"
            : "idle";
    return { status, queued, uploading, failed, totalChunks: session.totalChunks, lastError: session.lastError };
  }

  private async emit(scope: StageAudioScope) {
    const summary = await this.getSummary(scope);
    this.listeners.forEach((listener) => listener(scope, summary));
    return summary;
  }

  async flushSession(scope: StageAudioScope, retryNow = false): Promise<StageAudioQueueSummary> {
    const sessionKey = stageAudioSessionKey(scope);
    const active = this.activeFlushes.get(sessionKey);
    if (active) return active;
    const run = this.flushUnlocked(scope, retryNow).finally(() => this.activeFlushes.delete(sessionKey));
    this.activeFlushes.set(sessionKey, run);
    return run;
  }

  private async flushUnlocked(scope: StageAudioScope, retryNow: boolean) {
    const session = await this.session(scope);
    const chunks = await this.store.listChunks(session.sessionKey);
    for (const chunk of chunks) {
      if (!retryNow && chunk.state === "failed" && chunk.nextRetryAt && Date.parse(chunk.nextRetryAt) > Date.now()) {
        return this.emit(scope);
      }
      chunk.state = "uploading";
      chunk.nextRetryAt = null;
      chunk.lastError = null;
      await this.store.putChunk(chunk);
      await this.emit(scope);
      try {
        await this.transport.uploadChunk(chunk);
        if (chunk.attempts > 0) session.recoveredAt = new Date().toISOString();
        await this.store.deleteChunk(chunk.id);
        session.lastError = null;
        await this.store.putSession(session);
      } catch (error) {
        chunk.state = "failed";
        chunk.attempts += 1;
        chunk.nextRetryAt = new Date(Date.now() + Math.min(300_000, 5_000 * (2 ** (chunk.attempts - 1)))).toISOString();
        chunk.lastError = cleanError(error);
        session.lastError = chunk.lastError;
        await this.store.putChunk(chunk);
        await this.store.putSession(session);
        return this.emit(scope);
      }
    }
    if (session.finalizationRequested && !session.finalizationCompleted && session.totalChunks > 0) {
      const recoveringFinalization = Boolean(session.lastError);
      try {
        await this.transport.finalizeRecording(scope, session.totalChunks);
        session.finalizationCompleted = true;
        if (recoveringFinalization) session.recoveredAt = new Date().toISOString();
        session.lastError = null;
        await this.store.putSession(session);
      } catch (error) {
        session.lastError = cleanError(error);
        await this.store.putSession(session);
      }
    }
    return this.emit(scope);
  }

  async recoverAll(retryNow = false) {
    const sessions = await this.store.listSessions();
    return Promise.all(sessions.map((session) => this.flushSession(session, retryNow)));
  }
}

let browserQueue: StageAudioUploadQueue | null = null;

export function getStageAudioUploadQueue() {
  if (!browserQueue) {
    browserQueue = new StageAudioUploadQueue(new IndexedDbStageAudioStore(), new SupabaseStageAudioTransport());
  }
  return browserQueue;
}
