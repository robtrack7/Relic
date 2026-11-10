// Opt-in persisted authoring-study fixtures. This script never runs in production
// and never resets or mutates a user's existing world.
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
  if (!fs.existsSync(filename)) {
    const candidate = ['.ts', '.tsx', '.js'].find(extension => fs.existsSync(`${filename}${extension}`));
    if (candidate) filename += candidate;
  }
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = name => name.startsWith('@/') ? load(path.join(root, name.slice(2))) : name.startsWith('.') ? load(path.resolve(path.dirname(filename), name)) : appRequire(name);
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}

function must(result, operation) {
  if (result.state !== 'ok') throw new Error(`${operation} failed: ${JSON.stringify(result)}`);
  return result.data;
}

function remapId(value, ids, label) {
  if (typeof value !== 'string') return value;
  const mapped = ids.get(value);
  if (mapped) return mapped;
  // Keep prose readable when a sparse fixture names material outside this study.
  if (label) return undefined;
  throw new Error(`Fixture reference ${value} for ${label || 'entity'} is not in the authoring study.`);
}

function remapRich(node, ids) {
  const attrs = node.attrs && typeof node.attrs === 'object' ? { ...node.attrs } : undefined;
  if (node.type === 'entityReference' && attrs?.objectId) {
    const mapped = remapId(attrs.objectId, ids, attrs.label || 'rich reference');
    if (!mapped) return { type: 'text', text: String(attrs.label || 'Referenced entity') };
    attrs.objectId = mapped;
  }
  return {
    ...node,
    ...(attrs ? { attrs } : {}),
    ...(node.content ? { content: node.content.map(child => remapRich(child, ids)) } : {})
  };
}

function remapDocument(document, objectId, ids) {
  return {
    ...document,
    version: 1,
    blocks: document.blocks.map((block, index) => {
      const original = String(block.id || `section-${index}`).split(':').slice(1).join(':') || `section-${index}`;
      const id = `${objectId}:${original}`;
      return block.kind === 'text'
        ? { ...block, id, content: remapRich(block.content, ids) }
        : { ...block, id };
    })
  };
}

function remapMechanics(profile, ids) {
  if (!profile) return null;
  return {
    ...profile,
    equipment: profile.equipment.map(item => {
      if (!item.objectId) return { ...item };
      const mapped = remapId(item.objectId, ids, item.label);
      return mapped ? { ...item, objectId: mapped } : { ...item, objectId: undefined };
    }),
    features: profile.features.map(feature => ({ ...feature, description: remapRich(feature.description, ids) })),
    notes: remapRich(profile.notes, ids)
  };
}

function fixtureAssertions(fixture, ids) {
  const assertions = fixture.claims.map(claim => ({
    key: claim.claimKind,
    value: claim.value,
    target: claim.objectValue ? ids.get(claim.objectValue) : null,
    story: claim.story,
    truth: claim.truthState,
    author: claim.provenance?.authoredBy || 'gm'
  }));
  for (const link of fixture.links.filter(link => link.direction === 'out' && !fixture.claims.some(claim => claim.claimKind === link.claimKind))) {
    const target = ids.get(link.other.objectId);
    assertions.push({ key: link.claimKind, value: link.other.label, target: target || null, story: link.story, truth: link.truthState, author: link.provenance?.authoredBy || 'gm' });
  }
  return assertions;
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Development fixtures are unavailable in production.');
  const out = path.resolve(root, '../../output/playwright/three-layers');
  fs.mkdirSync(out, { recursive: true });
  const manifestPath = path.join(out, 'fixture-world.json');
  const { db, closeDb } = load(path.join(root, 'lib/world/db.ts'));
  const { PostgresDeskRepository } = load(path.join(root, 'lib/world/postgres-store.ts'));
  const { ENTITY_FIXTURES } = load(path.join(root, 'components/entities/entity-fixtures.ts'));
  const fixtures = [...new Map(ENTITY_FIXTURES.map(fixture => [String(fixture.objectId), fixture])).values()];
  const repository = PostgresDeskRepository.open(db());
  try {
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const board = await repository.openComposition(manifest.compositionId);
      const entities = await Promise.all((manifest.entities || []).map(entity => repository.loadEntity(manifest.worldId, entity.objectId)));
      if (board && entities.every(Boolean)) { console.log(JSON.stringify(manifest)); return; }
    }

    const worldId = randomUUID();
    const desk = await repository.openDesk(worldId);
    await db()`update worlds set name = 'The Drowned Coast · authoring study' where id = ${worldId}`;
    const board = await repository.createBoard({ worldId, compositionId: randomUUID(), name: 'Three layers · authoring study' });
    const ids = new Map(fixtures.map(fixture => [String(fixture.objectId), randomUUID()]));
    const created = [];

    for (const fixture of fixtures) {
      const objectId = ids.get(String(fixture.objectId));
      if (!objectId) throw new Error(`No generated id for ${fixture.objectId}`);
      const kind = fixture.representation?.kind;
      const entity = must(await repository.createEntity({ worldId, objectId, ...(kind ? { kind } : {}), label: fixture.representation?.label ?? null }), `createEntity:${fixture.representation?.label || fixture.objectId}`);
      created.push({ fixture, current: entity, assertions: fixtureAssertions(fixture, ids) });
    }
    for (const item of created) {
      const fixture = item.fixture;
      const objectId = item.current.objectId;
      let current = item.current;
      if (current.representation) {
        current = must(await repository.saveEntityIdentity({ worldId, objectId, observedVersion: current.representation.version, label: fixture.representation.label, fields: fixture.representation.fields }), 'saveEntityIdentity');
      }
      const mechanics = remapMechanics(fixture.representation?.mechanics, ids);
      if (mechanics && current.representation) current = must(await repository.saveEntityMechanics({ worldId, objectId, observedVersion: current.representation.version, profile: mechanics }), 'saveEntityMechanics');
      const document = remapDocument(fixture.document, objectId, ids);
      current = must(await repository.saveEntityDocument({ worldId, objectId, observedVersion: current.document.version, document, author: 'gm' }), 'saveEntityDocument');
      item.current = current;
    }

    for (const item of created) {
      const claims = [];
      for (const assertion of item.assertions) {
        const claim = must(await repository.setClaim({ claimId: randomUUID(), subjectId: item.current.objectId, claimKind: assertion.key, value: assertion.value, objectValue: assertion.target || null, story: assertion.story, author: assertion.author }), 'setClaim');
        if (assertion.truth === 'ink' || assertion.truth === 'disputed') claims.push({ claimId: claim.id, truth: assertion.truth, observedVersion: claim.version });
      }
      must(await repository.settleTruth({ objectId: item.current.objectId, maturity: item.fixture.maturity === 'ink' ? 'ink' : null, claims, author: 'gm' }), 'settleTruth');
    }

    const richKinds = ['character', 'place', 'thread', 'source'];
    const selected = [];
    for (const kind of richKinds) {
      const found = created.find(item => item.fixture.representation?.kind === kind && item.fixture.document.blocks.some(block => block.kind === 'text' && block.role === 'narrative'));
      if (found) selected.push(found);
    }
    const fragment = created.find(item => !item.fixture.representation && item.fixture.document.blocks.some(block => block.kind === 'text' && block.role === 'narrative'));
    if (fragment) selected.push(fragment);
    const onBoard = must(await repository.referenceObjects({ compositionId: board.compositionId, placements: selected.slice(0, 5).map((item, index) => ({ cardId: randomUUID(), objectId: item.current.objectId, layout: { x: (index % 3) * 410 - 600, y: Math.floor(index / 3) * 460 - 280, width: 260, height: 240 } })) }), 'referenceObjects');

    const manifest = {
      worldId,
      compositionId: board.compositionId,
      deskCompositionId: desk.compositionId,
      url: `http://127.0.0.1:3100/c/${board.compositionId}`,
      entities: created.map(item => ({ objectId: item.current.objectId, label: item.current.representation?.label || item.fixture.body.split('\n')[0].slice(0, 80) || 'Unnamed', family: item.current.representation?.kind || 'fragment' })),
      cards: onBoard.map(card => ({ cardId: card.cardId, objectId: card.objectId }))
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify(manifest));
  } finally {
    await closeDb();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
