#!/usr/bin/env python3
"""Small Relic V2 catalogue resolver.

Commands:
  find QUERY        Find likely catalogue targets.
  get ID            Print one catalogue entry.
  context ID        Print target + direct depends_on entries (one hop).
  paths ID          Print filesystem paths for target + direct dependencies.
  index             Print discovered catalogue index path.
  audit             Validate the canonical index and local catalogue links.

Set RELIC_CATALOGUE_INDEX to override discovery.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import unquote

INDEX_NAMES = {"00 — Catalogue Index.json", "00 - Catalogue Index.json"}
SKIP_DIRS = {".git", "node_modules", ".next", "dist", "build", "coverage", ".turbo"}


def discover_index(start: Path) -> Path:
    override = os.environ.get("RELIC_CATALOGUE_INDEX")
    if override:
        p = Path(override).expanduser().resolve()
        if not p.is_file():
            raise FileNotFoundError(f"RELIC_CATALOGUE_INDEX does not exist: {p}")
        return p

    start = start.resolve()
    search_roots = [start, *start.parents]
    seen = set()
    candidates: list[Path] = []

    for root in search_roots:
        if root in seen:
            continue
        seen.add(root)
        # Prefer cheap conventional locations first.
        for name in INDEX_NAMES:
            for direct in (
                root / "00 Catalogue" / name,
                root / "Relic V2 Component Registry — Canonical" / "00 Catalogue" / name,
                root / "catalogue" / "00 Catalogue" / name,
            ):
                if direct.is_file():
                    candidates.append(direct)
        if candidates:
            break

        # Recursively search only the working root first. Parent recursion can be enormous.
        if root == start:
            for dirpath, dirnames, filenames in os.walk(root):
                dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
                for filename in filenames:
                    if filename in INDEX_NAMES:
                        candidates.append(Path(dirpath) / filename)
            if candidates:
                break

    if not candidates:
        raise FileNotFoundError(
            "Could not find `00 — Catalogue Index.json` in the current repository. "
            "Set RELIC_CATALOGUE_INDEX to the canonical index path."
        )

    # Prefer canonical/current-looking paths and shorter relative depth.
    def rank(p: Path) -> tuple[int, int, str]:
        s = str(p).lower()
        penalty = 0
        if "component catalogue" in s and p.parent.name == "00 Catalogue":
            penalty -= 100
        if "canonical" in s:
            penalty -= 20
        if any(part in s for part in ("archive", "historic", "old", "backup", "pass")):
            penalty += 100
        return penalty, len(p.parts), str(p)

    return sorted(set(candidates), key=rank)[0].resolve()


def load_index(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Catalogue index must be a JSON array.")
    return [x for x in data if isinstance(x, dict) and x.get("id")]


def actual_heading(catalogue_root: Path, entry: dict) -> str | None:
    rel = entry.get("path")
    if not rel:
        return None
    p = catalogue_root / rel
    if not p.is_file():
        return None
    try:
        text = p.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None
    m = re.search(r"(?m)^#\s+(.+?)\s*$", text)
    return m.group(1).strip() if m else None


def normalized(s: object) -> str:
    return str(s or "").casefold()


def score(entry: dict, q: str) -> int:
    qn = q.casefold().strip()
    eid = normalized(entry.get("id"))
    path = normalized(entry.get("path"))
    title = normalized(entry.get("title"))
    family = normalized(entry.get("family"))
    system = normalized(entry.get("system"))
    kind = normalized(entry.get("kind"))
    storybook = normalized(entry.get("storybook"))

    if eid == qn:
        return 10_000
    s = 0
    if eid.startswith(qn):
        s += 1600
    if qn in eid:
        s += 1000
    if qn in path:
        s += 700
    if qn in family:
        s += 400
    if qn in system:
        s += 300
    if qn in title:
        s += 250
    if qn in kind:
        s += 80
    if qn in storybook:
        s += 60

    tokens = [t for t in re.split(r"[^a-z0-9]+", qn) if t]
    hay = " ".join([eid, path, title, family, system, kind, storybook])
    s += sum(40 for t in tokens if t in hay)
    return s


def enrich(entry: dict, root: Path) -> dict:
    out = dict(entry)
    heading = actual_heading(root, entry)
    if heading:
        out["heading"] = heading
    rel = entry.get("path")
    if rel:
        out["absolute_path"] = str((root / rel).resolve())
    return out


def find_repo_root(index_path: Path) -> Path | None:
    for candidate in (index_path.parent, *index_path.parents):
        if (candidate / "AGENTS.md").is_file() and (candidate / "package.json").is_file():
            return candidate
    return None


def audit_catalogue(index_path: Path, entries: list[dict]) -> dict:
    root = index_path.parent.parent
    repo_root = find_repo_root(index_path)
    ids: dict[str, list[dict]] = {}
    for entry in entries:
        ids.setdefault(normalized(entry.get("id")), []).append(entry)

    duplicate_ids = sorted(
        group[0].get("id") for group in ids.values() if len(group) > 1
    )
    missing_paths = sorted(
        str(entry.get("path"))
        for entry in entries
        if not entry.get("path") or not (root / str(entry.get("path"))).is_file()
    )
    invalid_depends_on = sorted(
        {str(dep) for entry in entries for dep in (entry.get("depends_on") or []) if normalized(dep) not in ids}
    )

    link_names: dict[str, set[str]] = {}
    for entry in entries:
        rel = str(entry.get("path") or "")
        for value in (entry.get("id"), entry.get("title"), Path(rel).stem):
            key = normalized(value)
            if key:
                link_names.setdefault(key, set()).add(str(entry.get("id")))

    broken_links: list[str] = []
    ambiguous_links: list[str] = []
    wiki_pattern = re.compile(r"\[\[([^\]]+)\]\]")
    markdown_pattern = re.compile(r"(?<!!)\[[^\]]*\]\(([^)]+)\)")
    for entry in entries:
        rel = str(entry.get("path") or "")
        source = root / rel
        if not source.is_file():
            continue
        text = source.read_text(encoding="utf-8", errors="ignore")
        for raw in wiki_pattern.findall(text):
            target = raw.split("|", 1)[0].split("#", 1)[0].strip()
            matches = link_names.get(normalized(target), set())
            label = f"{rel} -> [[{raw}]]"
            if not matches:
                broken_links.append(label)
            elif len(matches) > 1:
                ambiguous_links.append(label)
        for raw in markdown_pattern.findall(text):
            target = raw.strip().split(" ", 1)[0].strip("<>")
            if not target or target.startswith(("#", "http://", "https://", "mailto:")):
                continue
            local = (source.parent / unquote(target.split("#", 1)[0])).resolve()
            if not local.exists():
                broken_links.append(f"{rel} -> ({raw})")

    storybook_entries = [
        entry for entry in entries if normalized(entry.get("storybook")) not in ("", "none")
    ]
    expected_repo_paths = (
        "AGENTS.md",
        "apps/web/package.json",
        "apps/web/.storybook/main.ts",
        ".claude/skills/relic-ui/SKILL.md",
        ".claude/skills/relic-ux/SKILL.md",
        ".claude/skills/relic-v2-catalogue/SKILL.md",
    )
    missing_repo_paths = [] if repo_root else ["<repo root>"]
    if repo_root:
        missing_repo_paths.extend(
            rel for rel in expected_repo_paths if not (repo_root / rel).exists()
        )

    canonical = "component catalogue" in str(index_path).casefold() and index_path.parent.name == "00 Catalogue"
    lookup_by_id = len(ids) == len(entries) and all(key for key in ids)
    lookup_by_name = all(entry.get("title") and score(entry, str(entry.get("title"))) > 0 for entry in entries)
    lookup_by_keyword = any(score(entry, "button") > 0 for entry in entries)
    one_hop_context_lookup = not invalid_depends_on
    result = {
        "ok": not any((duplicate_ids, missing_paths, invalid_depends_on, broken_links, ambiguous_links, missing_repo_paths)) and canonical and lookup_by_id and lookup_by_name and lookup_by_keyword,
        "index": str(index_path),
        "catalogue_root": str(root),
        "entries": len(entries),
        "unique_ids": len(ids),
        "duplicate_ids": duplicate_ids,
        "missing_paths": missing_paths,
        "broken_links": sorted(set(broken_links)),
        "ambiguous_links": sorted(set(ambiguous_links)),
        "invalid_depends_on": invalid_depends_on,
        "storybook_targets": len(storybook_entries),
        "storybook_targets_retrievable": sum(1 for entry in storybook_entries if (root / str(entry.get("path"))).is_file()),
        "lookup_by_id": lookup_by_id,
        "lookup_by_name": lookup_by_name,
        "lookup_by_keyword": lookup_by_keyword,
        "one_hop_context_lookup": one_hop_context_lookup,
        "missing_repo_paths": missing_repo_paths,
        "canonical_index_selected": canonical,
        "historical_sources_are_current_authority": False,
    }
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_find = sub.add_parser("find")
    p_find.add_argument("query")
    p_find.add_argument("--limit", type=int, default=12)

    for cmd in ("get", "context", "paths"):
        p = sub.add_parser(cmd)
        p.add_argument("id")

    sub.add_parser("index")
    sub.add_parser("audit")
    args = parser.parse_args()

    try:
        index_path = discover_index(Path.cwd())
        entries = load_index(index_path)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 2

    root = index_path.parent.parent
    by_id = {str(e["id"]).casefold(): e for e in entries}

    if args.cmd == "index":
        print(index_path)
        return 0

    if args.cmd == "audit":
        result = audit_catalogue(index_path, entries)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0 if result["ok"] else 4

    if args.cmd == "find":
        ranked = [(score(e, args.query), e) for e in entries]
        ranked = [(s, e) for s, e in ranked if s > 0]
        ranked.sort(key=lambda x: (-x[0], str(x[1].get("id"))))
        results = [enrich(e, root) for _, e in ranked[: max(1, args.limit)]]
        print(json.dumps(results, indent=2, ensure_ascii=False))
        return 0

    key = args.id.casefold()
    entry = by_id.get(key)
    if not entry:
        print(f"error: catalogue ID not found: {args.id}", file=sys.stderr)
        return 3

    if args.cmd == "get":
        print(json.dumps(enrich(entry, root), indent=2, ensure_ascii=False))
        return 0

    deps = []
    missing = []
    for dep_id in entry.get("depends_on") or []:
        dep = by_id.get(str(dep_id).casefold())
        if dep:
            deps.append(enrich(dep, root))
        else:
            missing.append(dep_id)

    target = enrich(entry, root)

    if args.cmd == "context":
        print(json.dumps({"target": target, "dependencies": deps, "missing_dependencies": missing}, indent=2, ensure_ascii=False))
        return 0

    if args.cmd == "paths":
        print(target.get("absolute_path", ""))
        for dep in deps:
            print(dep.get("absolute_path", ""))
        if missing:
            print("# missing: " + ", ".join(map(str, missing)), file=sys.stderr)
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
