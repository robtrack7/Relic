export function parseGmNotesTags(notes: string | null | undefined) {
  const lines = (notes ?? "").split(/\r?\n/);
  let voice: string | null = null;
  let wants: string | null = null;
  const body: string[] = [];

  for (const line of lines) {
    const match = /^(voice|wants):\s*(.+)$/i.exec(line);
    if (match?.[1].toLowerCase() === "voice" && voice === null) {
      voice = match[2];
      continue;
    }
    if (match?.[1].toLowerCase() === "wants" && wants === null) {
      wants = match[2];
      continue;
    }
    body.push(line);
  }

  return {
    voice,
    wants,
    body: body.join("\n").trim()
  };
}

export function remainingUndoSeconds(startedAt: string | null | undefined, now = Date.now()) {
  if (!startedAt) return 60;
  const elapsed = Math.floor((now - new Date(startedAt).getTime()) / 1_000);
  return Math.max(0, 60 - Math.max(0, elapsed));
}

export function formatStageElapsed(startedAt: string | null | undefined, now = Date.now()) {
  if (!startedAt) return "0:00:00";
  const total = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1_000));
  const hours = Math.floor(total / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function quickCreateEntityType(type: string) {
  const map: Record<string, "character" | "place" | "artifact" | "thread" | "faction" | "note"> = {
    npc: "character",
    location: "place",
    item: "artifact",
    thread: "thread",
    faction: "faction",
    note: "note",
  };
  return map[type] ?? null;
}
