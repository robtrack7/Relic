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
