import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = process.cwd();
const vaultRoot = join(repositoryRoot, "Relic Vault");
const currentFilePath = fileURLToPath(import.meta.url);
const failures = [];

const requiredPaths = [
  "AGENTS.md",
  "README.md",
  ".github/workflows/ci.yml",
  "docs/operations.md",
  "docs/ui-figma-import.md",
  "Relic Vault/00 - Start Here.md",
  "Relic Vault/05 - Deferred Decisions.md",
  "Relic Vault/10 - Product Contract.md",
  "Relic Vault/20 - Engineering Contract.md",
  "Relic Vault/30 - Experience Contract.md",
  "Relic Vault/40 - Delivery Status.md",
  "Relic Vault/45 - Security Findings Register.md",
  "apps/web/app",
  "apps/web/lib/data.ts",
  "apps/web/app/actions.ts",
  "supabase/config.toml",
  "supabase/migrations",
  "supabase/functions",
  "supabase/tests",
  "supabase/security/rpc-boundary.md",
  "scripts"
];

for (const requiredPath of requiredPaths) {
  if (!existsSync(join(repositoryRoot, requiredPath))) {
    failures.push(`Missing required path: ${requiredPath}`);
  }
}

function walkFiles(relativeRoot, extensions = null) {
  const root = join(repositoryRoot, relativeRoot);
  if (!existsSync(root)) {
    return [];
  }

  if (statSync(root).isFile()) {
    return !extensions || extensions.has(extname(root).toLowerCase()) ? [root] : [];
  }

  const files = [];
  const ignoredDirectories = new Set([
    ".git",
    ".next",
    ".obsidian",
    "coverage",
    "node_modules",
    "output",
    "playwright-report",
    "test-results"
  ]);
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          stack.push(fullPath);
        }
      } else if (entry.isFile() && (!extensions || extensions.has(extname(entry.name).toLowerCase()))) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function repositoryPath(filePath) {
  return relative(repositoryRoot, filePath).replaceAll("\\", "/");
}

function cleanLinkTarget(rawTarget) {
  return rawTarget.trim().replace(/^<|>$/g, "").split(/[\#^]/, 1)[0].trim();
}

function isExternalTarget(target) {
  return target.length === 0 || target.startsWith("#") || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target);
}

function isInsideVault(filePath) {
  const vaultRelative = relative(vaultRoot, filePath);
  return vaultRelative !== "" && !vaultRelative.startsWith("..") && !isAbsolute(vaultRelative);
}

const vaultFiles = walkFiles("Relic Vault", new Set([".md", ".html"]));
const vaultTargetIndex = new Map();
for (const filePath of vaultFiles) {
  const targetName = basename(filePath, extname(filePath));
  const entries = vaultTargetIndex.get(targetName) ?? [];
  entries.push(filePath);
  vaultTargetIndex.set(targetName, entries);
}

function resolveVaultTarget(sourcePath, rawTarget, defaultExtension) {
  const target = cleanLinkTarget(rawTarget);
  if (isExternalTarget(target)) {
    return null;
  }

  const withExtension = extname(target) ? target : `${target}${defaultExtension}`;
  const baseDirectory = target.startsWith("Relic Vault/") || target.startsWith("Relic Vault\\")
    ? repositoryRoot
    : dirname(sourcePath);
  const directPath = resolve(baseDirectory, withExtension);
  if (isInsideVault(directPath) && existsSync(directPath)) {
    return directPath;
  }

  const indexedTargets = vaultTargetIndex.get(basename(target, extname(target))) ?? [];
  if (indexedTargets.length === 1) {
    return indexedTargets[0];
  }

  return null;
}

for (const sourcePath of vaultFiles.filter((filePath) => extname(filePath).toLowerCase() === ".md")) {
  const source = readFileSync(sourcePath, "utf8");
  const wikiLinkPattern = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  for (const match of source.matchAll(wikiLinkPattern)) {
    if (!resolveVaultTarget(sourcePath, match[1], ".md")) {
      failures.push(`Broken vault wikilink in ${repositoryPath(sourcePath)}: [[${match[1]}]]`);
    }
  }

  const markdownLinkPattern = /\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))\s*\)/g;
  for (const match of source.matchAll(markdownLinkPattern)) {
    const target = match[1] ?? match[2];
    if (extname(cleanLinkTarget(target)).toLowerCase() === ".html" && !resolveVaultTarget(sourcePath, target, ".html")) {
      failures.push(`Broken vault HTML link in ${repositoryPath(sourcePath)}: ${target}`);
    }
  }
}

const retiredReferenceFragments = [
  "01 - Welcome",
  "02 - Source Map",
  "04 - Final Contradiction Pass",
  "10 - Project Overview for AI",
  "11 - Product Basepoint",
  "12 - MVP PRD",
  "13 - Design System",
  "14 - Design System Source",
  "20 - Entity and Canon Schema",
  "21 - Tech Architecture",
  "22 - Memory and Retrieval",
  "23 - AI Task Registry",
  "24 - Approval Queue",
  "25 - Pricing and Rate Limits",
  "30 - Sanctum UX Flow",
  "31 - Session Prep Flow",
  "32 - Stage UX Flow",
  "33 - First Run UX Flow",
  "34 - UI Implementation Spec",
  "35 - Web Design Wireframe",
  "40 - MVP Implementation Planning Sequence",
  "41 - Foundation Implementation Plan",
  "42 - UI Manual Flow Implementation Plan",
  "43 - AI Runtime Implementation Plan",
  "44 - Repo Bootstrap and GitHub Setup Plan",
  "46 - Backend Audit and Module Plan",
  "47 - Backend Module 0 Baseline Plan",
  "48 - Backend Module 1 Access Control Plan",
  "49 - Backend Module 2 Canon Write Path Plan",
  "50 - Session Log Index",
  "51 - Backend Module 3 Approval Queue Plan",
  "52 - Backend Module 4 Retrieval and Embeddings Plan",
  "53 - Backend Module 5 Session Prep and Stage Data Plan",
  "54 - Backend Module 6 Usage Quota and Metering Plan",
  "55 - Backend Module 7 Storage Audio Transcription Cleanup Plan",
  "56 - Backend Module 8 Background Job and Edge Runtime Plan",
  "57 - Backend Module 9 AI Task Router and Runtime Plan",
  "58 - Backend Module 10 Notifications Export Operations Plan",
  "59 - Phase E Loom Operating Layer Plan",
  "60 - Design Spec Overview",
  "61 - Sanctum Dashboard Design Spec",
  "62 - New Saga Design Spec",
  "63 - Saga Scaffold Review Design Spec",
  "64 - Unified Library Detail Design Spec",
  "65 - Session Prep Design Spec",
  "66 - Stage Design Spec",
  "67 - Approval Queue Design Spec",
  "68 - Ask Search Design Spec",
  "69 - Settings Usage Design Spec",
  "70 - Mobile App Design Spec",
  "71 - Component Inventory Design Spec",
  "72 - Navigation Design Spec",
  "73 - Figma UI Import Readiness",
  "74 - Phase F Trust Data and Operations Plan",
  "75 - Phase G Release Quality and Integrated MVP Plan",
  "90 - Next Steps Before Coding",
  "91 - Continuity Architecture Report",
  "92 - Priority 3 Alignment Report",
  "99 - Revisions Archive",
  "PLAN.md",
  "docs/MVP_GAP_ANALYSIS.md",
  "docs/E2_HOSTED_READINESS.md",
  "docs/E2_OPERATOR_SECRET_SETUP_GUIDE.md",
  "docs/E3_HOSTED_READINESS.md",
  "docs/PHASE_G0_HOSTED_READINESS.md",
  "docs/figma-relic-web-draft.md"
];

const referenceRoots = ["AGENTS.md", "README.md", ".github", "docs", "Relic Vault", "scripts"];
for (const referenceRoot of referenceRoots) {
  for (const filePath of walkFiles(referenceRoot, new Set([".md", ".mjs", ".yml", ".yaml"]))) {
    if (filePath === currentFilePath) {
      continue;
    }
    const source = readFileSync(filePath, "utf8");
    for (const fragment of retiredReferenceFragments) {
      if (source.includes(fragment)) {
        failures.push(`Retired vault/status reference in ${repositoryPath(filePath)}: ${fragment}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("RELIC_REPO_VERIFY_OK");
