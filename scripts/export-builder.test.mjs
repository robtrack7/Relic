import test from "node:test";
import assert from "node:assert/strict";
import { exportBuilderTest } from "../supabase/functions/_shared/export-builder.ts";

function unzipStored(bytes) {
  const files = new Map();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const bodyStart = nameStart + nameLength + extraLength;
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLength));
    files.set(name, new TextDecoder().decode(bytes.slice(bodyStart, bodyStart + size)));
    offset = bodyStart + size;
  }
  assert.equal(view.getUint32(offset, true), 0x02014b50, "ZIP should have a central directory");
  return files;
}

test("Phase F2 export builder creates deterministic, openable stored ZIPs", () => {
  const source = new Map([
    ["saga.json", `${exportBuilderTest.stableJson({ z: 1, a: { d: 2, b: 1 } })}\n`],
    ["README.txt", "Relic export\n"],
    ["characters/mara.md", "# Mara\n"]
  ]);
  const first = exportBuilderTest.zipStore(source, "2026-08-05T12:00:00Z");
  const second = exportBuilderTest.zipStore(source, "2026-08-05T12:00:00Z");
  assert.deepEqual(first, second, "same content and export time should produce identical bytes");
  const files = unzipStored(first);
  assert.equal(files.get("saga.json"), '{"a":{"b":1,"d":2},"z":1}\n');
  assert.equal(files.get("characters/mara.md"), "# Mara\n");
  assert.equal(files.size, 3);
});

test("Phase F2 Markdown builder includes retained user content without runtime internals", () => {
  const files = exportBuilderTest.markdownFiles({
    saga: { name: "The Glass Road", game_system: "Cairn", audio_retention: "retain", transcript_retention: "retain" },
    world: { name: "Ash Coast" },
    characters: [{ id: "one", name: "Mara", summary: "Scout", narrative: "Knows the old road." }],
    sessions: [], transcripts: [], places: [], factions: [], artifacts: [], threads: [], notes: []
  });
  assert.match(files.get("saga.md"), /The Glass Road/);
  assert.match(files.get("characters/mara.md"), /Knows the old road/);
  assert.doesNotMatch([...files.values()].join("\n"), /provider_payload|embedding|service_role|api_key/i);
});
