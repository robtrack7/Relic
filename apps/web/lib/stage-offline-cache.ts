"use client";

import type { StagePacket } from "@/lib/data";
import type { EntitySummary, SearchResult, StageLiteralSearchDocument } from "@/lib/types";
import type { StageWriteScope } from "@/lib/stage-write-queue";

export type StageOfflineSnapshot = StageWriteScope & {
  ownerId: string;
  sessionKey: string;
  cachedAt: string;
  packet: StagePacket;
  pinned: Array<{ pin: { entity_type: string; entity_id: string }; entity?: EntitySummary | null }>;
  activeThreads: Array<EntitySummary | undefined>;
  literalSearchIndex: StageLiteralSearchDocument[];
};

export interface StageOfflineStore {
  get(sessionKey: string): Promise<StageOfflineSnapshot | null>;
  put(snapshot: StageOfflineSnapshot): Promise<void>;
}

export function stageOfflineSessionKey(ownerId: string, scope: StageWriteScope) {
  return `${ownerId}:${scope.workspaceId}:${scope.worldId}:${scope.sagaId}:${scope.sessionId}`;
}

export class MemoryStageOfflineStore implements StageOfflineStore {
  private snapshots = new Map<string, StageOfflineSnapshot>();

  async get(sessionKey: string) {
    return structuredClone(this.snapshots.get(sessionKey) ?? null);
  }

  async put(snapshot: StageOfflineSnapshot) {
    this.snapshots.set(snapshot.sessionKey, structuredClone(snapshot));
  }
}

const DB_NAME = "relic-stage-offline";
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

export class IndexedDbStageOfflineStore implements StageOfflineStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open() {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.addEventListener("upgradeneeded", () => {
          if (!request.result.objectStoreNames.contains("snapshots")) {
            request.result.createObjectStore("snapshots", { keyPath: "sessionKey" });
          }
        });
        request.addEventListener("success", () => resolve(request.result), { once: true });
        request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB is unavailable.")), { once: true });
      });
    }
    return this.dbPromise;
  }

  async get(sessionKey: string) {
    const transaction = (await this.open()).transaction("snapshots", "readonly");
    return (await requestResult(transaction.objectStore("snapshots").get(sessionKey))) as StageOfflineSnapshot | null ?? null;
  }

  async put(snapshot: StageOfflineSnapshot) {
    const transaction = (await this.open()).transaction("snapshots", "readwrite");
    await requestResult(transaction.objectStore("snapshots").put(snapshot));
    await transactionDone(transaction);
  }
}

export class StageOfflineCache {
  constructor(private store: StageOfflineStore) {}

  get(ownerId: string, scope: StageWriteScope) {
    return this.store.get(stageOfflineSessionKey(ownerId, scope));
  }

  put(snapshot: StageOfflineSnapshot) {
    return this.store.put(snapshot);
  }

  async upsertLiteralDocument(ownerId: string, scope: StageWriteScope, document: StageLiteralSearchDocument) {
    const snapshot = await this.get(ownerId, scope);
    if (!snapshot) throw new Error("The Stage packet is not cached on this device.");
    snapshot.literalSearchIndex = [
      document,
      ...snapshot.literalSearchIndex.filter((item) => item.source_entity_id !== document.source_entity_id),
    ];
    snapshot.cachedAt = new Date().toISOString();
    await this.put(snapshot);
    return snapshot;
  }
}

function searchText(document: StageLiteralSearchDocument) {
  return `${document.name}\n${document.summary ?? ""}\n${document.narrative ?? ""}`.toLocaleLowerCase();
}

export function searchStageLiteralIndex(index: StageLiteralSearchDocument[], query: string): SearchResult[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];
  const terms = normalized.split(/\s+/).filter(Boolean);
  return index
    .filter((document) => document.canon_state === "canon" && terms.every((term) => searchText(document).includes(term)))
    .map((document) => {
      const name = document.name.toLocaleLowerCase();
      const score = name === normalized ? 4 : name.startsWith(normalized) ? 3 : name.includes(normalized) ? 2 : 1;
      const context = document.summary || document.narrative || "Cached canon result";
      return {
        source_kind: document.source_kind,
        source_entity_type: document.source_entity_type,
        source_entity_id: document.source_entity_id,
        snippet: `${document.name} — ${context}`,
        rrf_score: score,
        canon_state: document.canon_state,
        is_stub: document.is_stub,
      } satisfies SearchResult;
    })
    .sort((a, b) => b.rrf_score - a.rrf_score || a.snippet.localeCompare(b.snippet))
    .slice(0, 12);
}

let browserCache: StageOfflineCache | null = null;

export function getStageOfflineCache() {
  if (!browserCache) browserCache = new StageOfflineCache(new IndexedDbStageOfflineStore());
  return browserCache;
}
