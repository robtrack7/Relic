// Opt-in local fixture world. All content uses the same validated repository operations as the app.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const appRequire = createRequire(path.join(root, 'package.json'));
const ts = appRequire('typescript');
const cache = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (!path.extname(filename)) filename += '.ts';
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = name => name.startsWith('@/') ? load(path.join(root, name.slice(2))) : name.startsWith('.') ? load(path.resolve(path.dirname(filename), name)) : appRequire(name);
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}
async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Development fixtures are unavailable in production.');
  const out = path.resolve(root, '../../output/playwright/goal06-2');
  fs.mkdirSync(out, { recursive: true });
  const manifestPath = path.join(out, 'fixture-world.json');
  const { db, closeDb } = load(path.join(root, 'lib/world/db.ts'));
  const { PostgresDeskRepository } = load(path.join(root, 'lib/world/postgres-store.ts'));
  const { KNOWLEDGE_FIXTURES, KNOWLEDGE_RICH } = load(path.join(root, 'components/world-objects/knowledge.fixtures.ts'));
  const repository = PostgresDeskRepository.open(db());
  const must = result => { if (result.state !== 'ok') throw new Error(JSON.stringify(result)); return result.data; };
  try {
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (await repository.openComposition(manifest.compositionId)) { console.log(JSON.stringify(manifest)); return; }
    }
    const worldId = randomUUID();
    const desk = await repository.openDesk(worldId);
    await db()`update worlds set name = 'The Drowned Coast · development study' where id = ${worldId}`;
    const board = await repository.createBoard({ worldId, compositionId: randomUUID(), name: 'The bell below the tide · a study in living knowledge' });
    const ids = new Map(KNOWLEDGE_FIXTURES.map(fixture => [fixture.objectId, randomUUID()]));
    const placements = [];
    for (const [index, fixture] of KNOWLEDGE_FIXTURES.entries()) {
      const objectId = ids.get(fixture.objectId);
      const representationId = randomUUID();
      const card = must(await repository.captureCard({ compositionId: desk.compositionId, cardId: randomUUID(), objectId,
        body: fixture.body, layout: { ...fixture.layout, x: index % 4 * 360, y: Math.floor(index / 4) * 420 }, author: 'gm',
        ...(fixture.representation ? { initialRepresentation: { representationId, kind: fixture.representation.kind, label: fixture.representation.label } } : {}) }));
      if (fixture.representation) must(await repository.editRepresentation({ representationId, observedVersion: 1, label: fixture.representation.label, fields: fixture.representation.fields }));
      const claims = [];
      const assertions = [...fixture.claims.map(claim => ({ key: claim.claimKind, value: claim.value, target: claim.objectValue, story: claim.story, truth: claim.truthState })),
        ...fixture.links.filter(link => link.direction === 'out' && !fixture.claims.some(claim => claim.claimKind === link.claimKind)).map(link => ({ key: link.claimKind, value: link.other.label, target: link.other.objectId, truth: link.truthState }))];
      placements.push({ fixture, card, assertions, claims });
    }
    for (const { fixture, card, assertions, claims } of placements) {
      for (const assertion of assertions) {
        const claim = must(await repository.setClaim({ claimId: randomUUID(), subjectId: card.objectId, claimKind: assertion.key,
          value: assertion.value, objectValue: assertion.target ? ids.get(assertion.target) ?? null : null, story: assertion.story, author: 'gm' }));
        if (assertion.truth === 'ink' || assertion.truth === 'disputed') claims.push({ claimId: claim.id, truth: assertion.truth, observedVersion: claim.version });
      }
      must(await repository.settleTruth({ objectId: card.objectId, maturity: fixture.maturity, claims, author: 'gm' }));
    }
    const onBoard = must(await repository.referenceObjects({ compositionId: board.compositionId, placements: KNOWLEDGE_RICH.slice(0, 5).map((fixture, index) => ({ cardId: randomUUID(), objectId: ids.get(fixture.objectId), layout: { x: index % 3 * 410 - 600, y: Math.floor(index / 3) * 460 - 280, width: fixture.layout.width, height: fixture.layout.height } })) }));
    const prep = must(await repository.createSession({ worldId, sessionId: randomUUID(), compositionId: randomUUID(), title: 'Session 9 · The fourth bell' }));
    must(await repository.setBeat({ sessionId: prep.session.id, beatId: randomUUID(), body: 'Let Mara examine the torn passenger list before the tide turns.', refs: [ids.get(KNOWLEDGE_RICH[0].objectId)], author: 'gm' }));
    const manifest = { worldId, compositionId: board.compositionId, deskCompositionId: desk.compositionId, prepCompositionId: prep.session.compositionId,
      url: `http://127.0.0.1:3100/c/${board.compositionId}`, cards: onBoard.map(card => ({ cardId: card.cardId, objectId: card.objectId })),
      objects: placements.map(({ fixture, card }) => ({ objectId: card.objectId, label: fixture.representation?.label ?? fixture.body.slice(0, 45), kind: fixture.representation?.kind ?? 'fragment' })) };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify(manifest));
  } finally { await closeDb(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
