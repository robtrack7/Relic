type ExportJob = {
  id: string;
  workspace_id: string;
  world_id: string;
  saga_id: string;
  requested_formats?: string[];
  include_audit?: boolean;
  created_at?: string;
};

type ExportEnvelope = { job: ExportJob; payload: Record<string, unknown> };
type ExportService = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  storage: { from: (bucket: string) => { upload: (path: string, body: Uint8Array, options: Record<string, unknown>) => Promise<{ error: { message: string } | null }> } };
};

const encoder = new TextEncoder();

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(",")}}`;
}

function slug(value: unknown, fallback: string) {
  const cleaned = String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return cleaned.slice(0, 80) || fallback;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function recordMarkdown(record: Record<string, unknown>, fallback: string) {
  const name = text(record.name) || text(record.title) || fallback;
  const summary = text(record.summary);
  const body = text(record.narrative) || text(record.body);
  const notes = text(record.gm_notes);
  return [`# ${name}`, summary ? `_${summary}_` : "", body, notes ? `## GM notes\n\n${notes}` : ""].filter(Boolean).join("\n\n") + "\n";
}

function markdownFiles(payload: Record<string, unknown>) {
  const files = new Map<string, string>();
  const saga = (payload.saga ?? {}) as Record<string, unknown>;
  const world = (payload.world ?? {}) as Record<string, unknown>;
  files.set("saga.md", [
    `# ${text(saga.name) || "Untitled Saga"}`,
    text(saga.premise) ? `_${text(saga.premise)}_` : "",
    `- World: ${text(world.name) || "Unspecified"}`,
    `- Game system: ${text(saga.game_system) || "Unspecified"}`,
    `- Audio retention: ${text(saga.audio_retention)}`,
    `- Transcript retention: ${text(saga.transcript_retention)}`
  ].filter(Boolean).join("\n\n") + "\n");

  const collections = ["characters", "places", "factions", "artifacts", "threads", "notes"];
  for (const collection of collections) {
    const records = Array.isArray(payload[collection]) ? payload[collection] as Record<string, unknown>[] : [];
    records.forEach((record, index) => {
      const label = text(record.name) || text(record.title) || `${collection}-${index + 1}`;
      files.set(`${collection}/${slug(label, `${collection}-${index + 1}`)}.md`, recordMarkdown(record, label));
    });
  }

  const sessions = Array.isArray(payload.sessions) ? payload.sessions as Record<string, unknown>[] : [];
  sessions.forEach((session, index) => {
    const label = text(session.name) || `Session ${session.session_number ?? index + 1}`;
    files.set(`sessions/${slug(label, `session-${index + 1}`)}.md`, recordMarkdown(session, label));
  });
  const transcripts = Array.isArray(payload.transcripts) ? payload.transcripts as Record<string, unknown>[] : [];
  transcripts.forEach((transcript, index) => {
    const segments = Array.isArray(transcript.segments) ? transcript.segments as Record<string, unknown>[] : [];
    const body = segments.filter((segment) => !segment.deleted).map((segment) => `[${segment.start ?? 0}-${segment.end ?? "?"}] ${text(segment.text)}`).join("\n\n");
    files.set(`sessions/transcript-${index + 1}.md`, `# Session transcript ${index + 1}\n\n${body}\n`);
  });
  const audit = payload.audit as Record<string, unknown> | undefined;
  if (audit && Array.isArray(audit.canon_audit)) {
    const lines = (audit.canon_audit as Record<string, unknown>[]).map((entry) => `- ${entry.created_at ?? ""} · ${entry.entity_type ?? "record"} · ${entry.action ?? "change"}`);
    files.set("audit/canon-audit.md", `# Canon audit\n\n${lines.join("\n")}\n`);
  }
  return files;
}

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(value?: string) {
  const date = value ? new Date(value) : new Date("1980-01-01T00:00:00Z");
  const year = Math.max(1980, date.getUTCFullYear());
  return {
    time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate()
  };
}

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function zipStore(files: Map<string, string>, timestamp?: string) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const stamp = dosTimestamp(timestamp);
  for (const [path, content] of [...files.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const name = encoder.encode(path.replace(/\\/g, "/"));
    const body = encoder.encode(content);
    const crc = crc32(body);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, 0, true);
    lv.setUint16(10, stamp.time, true); lv.setUint16(12, stamp.date, true); lv.setUint32(14, crc, true); lv.setUint32(18, body.length, true); lv.setUint32(22, body.length, true); lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true); local.set(name, 30);
    localParts.push(local, body);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, stamp.time, true); cv.setUint16(14, stamp.date, true); cv.setUint32(16, crc, true); cv.setUint32(20, body.length, true); cv.setUint32(24, body.length, true); cv.setUint16(28, name.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true); cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true); cv.setUint32(42, offset, true); central.set(name, 46);
    centralParts.push(central);
    offset += local.length + body.length;
  }
  const central = concat(centralParts);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true); ev.setUint16(8, files.size, true); ev.setUint16(10, files.size, true); ev.setUint32(12, central.length, true); ev.setUint32(16, offset, true); ev.setUint16(20, 0, true);
  return concat([...localParts, central, end]);
}

async function sha256(bytes: Uint8Array) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...hash].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildSagaExport(service: ExportService, claimedJob: ExportJob) {
  const { data, error } = await service.rpc("get_saga_export_payload_for_worker", { p_export_id: claimedJob.id });
  if (error) throw new Error(error.message);
  const envelope = data as ExportEnvelope;
  const job = envelope.job;
  const payload = envelope.payload;
  const formats = new Set(job.requested_formats ?? ["json", "markdown"]);
  const files = new Map<string, string>();
  if (formats.has("json")) files.set("saga.json", `${stableJson(payload)}\n`);
  if (formats.has("markdown")) for (const [path, content] of markdownFiles(payload)) files.set(path, content);
  const included = job.include_audit ? "Canon, working records, retained transcripts, drafts, citation/audit evidence, and user-visible Loom history." : "Current readable Saga records and retained transcripts.";
  files.set("README.txt", `Relic Saga export\nSchema version: ${payload.schema_version ?? 1}\nExported at: ${payload.exported_at ?? job.created_at}\nIncluded: ${included}\nAlways excluded: audio bytes, embeddings, internal queues, prompts, provider payloads, telemetry, credentials, tokens, and user-level profile data.\n`);
  const archive = zipStore(files, job.created_at);
  const archiveSha256 = await sha256(archive);
  const storagePath = `${job.workspace_id}/${job.world_id}/${job.saga_id}/${job.id}.zip`;
  const upload = await service.storage.from("exports").upload(storagePath, archive, { contentType: "application/zip", upsert: true, cacheControl: "3600" });
  if (upload.error) throw new Error(upload.error.message);
  return { storagePath, archiveBytes: archive.length, archiveSha256, entryCount: files.size };
}

export const exportBuilderTest = { stableJson, markdownFiles, zipStore, crc32 };
