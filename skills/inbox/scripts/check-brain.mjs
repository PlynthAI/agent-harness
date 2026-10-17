#!/usr/bin/env node
/**
 * Check a company brain (an Obsidian vault) against its front-matter contract.
 *
 * Runs the pinned, unmodified OKF checker (check_okf.py beside this file) over
 * the brain's concept pages only, then adds the brain's own rules: every
 * concept page has a description and parent link, source pages name their
 * resources, every wikilink resolves, and concept file names are unique.
 * Read-only: the brain is never written; the scoped
 * copy the OKF checker reads lives in a temporary folder that is removed.
 *
 * Exit 0 when there are no errors, 1 with a list of errors, 2 when the check
 * could not run (bad arguments, a missing folder, uv or PyYAML unavailable).
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = `Usage: node check-brain.mjs <brain-root>

Checks the brain's concept pages: the OKF structure (through check_okf.py, run
with uv and PyYAML), descriptions, source resources, parent links, resolved
wikilinks and unique page file names. Skips AGENTS.md, README.md, Home/,
Templates/, plans/ and dot folders. Inbox/, index.md, log.md and home pages
are exempt from source and parent rules. When the brain is a folder inside a
larger Obsidian vault, links resolve across that vault. Exit 0 pass, 1 errors
found, 2 the check could not run.`;

const checker = join(dirname(fileURLToPath(import.meta.url)), "check_okf.py");

class CannotCheck extends Error {}

function fail(message) {
  throw new CannotCheck(message);
}

// Every file Obsidian can see: dot folders and dot files are never loaded.
// Walking a larger vault only for its link targets, installed packages and
// folders that cannot be read are skipped.
function walk(root, relative = "", vaultWide = false) {
  const files = [];
  let entries;
  try {
    entries = readdirSync(join(root, relative), { withFileTypes: true });
  } catch (error) {
    if (vaultWide) return files;
    throw error;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!(vaultWide && entry.name === "node_modules")) files.push(...walk(root, path, vaultWide));
    } else if (entry.isFile()) files.push(path);
  }
  return files;
}

// Concept pages and navigation files; the brain's AGENTS.md names what is not.
function inScope(path) {
  if (!path.toLowerCase().endsWith(".md")) return false;
  const parts = path.split("/");
  const name = parts.at(-1).toLowerCase();
  if (name === "agents.md" || name === "readme.md") return false;
  const folders = parts.slice(0, -1).map((part) => part.toLowerCase());
  if (folders[0] === "home") return false;
  return !folders.some((folder) => folder === "templates" || folder === "plans");
}

const isNavigation = (path) => /(^|\/)(index|log)\.md$/i.test(path);

function splitFrontmatter(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0] !== "---") return { frontmatter: "", body: lines.join("\n") };
  const end = lines.indexOf("---", 1);
  if (end === -1) return { frontmatter: "", body: lines.join("\n") };
  return { frontmatter: lines.slice(1, end).join("\n"), body: lines.slice(end + 1).join("\n") };
}

function indentWidth(text) {
  let column = 0;
  for (const char of text) column += char === "\t" ? 4 - column % 4 : 1;
  return column;
}

// Code blocks, inline code and comments are examples, not links.
function withoutCode(body) {
  const kept = [];
  let fence = null;
  let listIndent = 0;
  let paragraph = false;
  let indentedCode = false;
  for (const line of body.split("\n")) {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (match && match[1][0] === fence.char && match[1].length >= fence.length && !match[2].trim()) fence = null;
      continue;
    }
    if (match) {
      fence = { char: match[1][0], length: match[1].length };
      paragraph = false;
      continue;
    }
    if (!line.trim()) {
      paragraph = false;
      kept.push(line);
      continue;
    }
    const indent = indentWidth(line.match(/^[ \t]*/)[0]);
    if (indent >= listIndent + 4 && (!paragraph || indentedCode)) {
      indentedCode = true;
      continue;
    }
    indentedCode = false;
    const list = line.match(/^[ \t]*(?:[-+*]|\d+[.)])[ \t]+/);
    if (list) listIndent = indentWidth(list[0]);
    else if (indent < listIndent) listIndent = 0;
    // Indentation cannot start code in an open paragraph. List continuations
    // need four extra columns beyond the list's content indentation.
    const setext = paragraph && /^ {0,3}(?:=+|-+)[ \t]*$/.test(line);
    paragraph = !setext && !/^ {0,3}(?:#{1,6}(?:\s|$)|>|(?:[-*_][ \t]*){3,}$)/.test(line);
    kept.push(line);
  }
  return kept.join("\n")
    .replace(/(`+)[\s\S]*?\1/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/%%[\s\S]*?%%/g, "");
}

function wikilinks(text) {
  const targets = [];
  for (const match of text.matchAll(/!?\[\[([^[\]\n]+?)\]\]/g)) {
    // A table cell escapes the alias pipe as \|.
    const target = match[1].split(/\\?\|/)[0].split("#")[0].replace(/\\$/, "").trim();
    if (target) targets.push(target);
  }
  return targets;
}

// Obsidian resolves a bare name by file name anywhere in the vault, a name
// with folders by the end of its path, and omits .md; matching ignores case.
function linkIndex(files) {
  const names = new Set();
  const paths = [];
  for (const file of files) {
    const lower = file.toLowerCase();
    const name = lower.split("/").at(-1);
    names.add(name);
    paths.push(lower);
    if (name.endsWith(".md")) {
      names.add(name.slice(0, -3));
      paths.push(lower.slice(0, -3));
    }
  }
  return (target) => {
    const wanted = target.toLowerCase().replace(/^\.?\//, "");
    if (!wanted.includes("/")) return names.has(wanted);
    return paths.some((path) => path === wanted || path.endsWith(`/${wanted}`));
  };
}

// Obsidian resolves links across its whole vault: the nearest folder at or
// above the brain root that holds .obsidian/. A brain that is only a folder of
// a larger vault still has just its own pages checked. Obsidian does not index
// dot folders, so a brain reached through one is not part of a vault above it.
function vaultRoot(root) {
  for (let dir = root; ; dir = dirname(dir)) {
    if (existsSync(join(dir, ".obsidian"))) return dir;
    if (dirname(dir) === dir || basename(dir).startsWith(".")) return root;
  }
}

function runChecker(bundle) {
  // Reuse OKF's YAML loader in the same uv process; keep the pinned file intact.
  // Only the fields needed by the brain rules cross the JSON boundary.
  const bridge = `
import json, runpy, sys
from pathlib import Path
okf = runpy.run_path(sys.argv[1])
root = Path(sys.argv[2])
try:
    report = okf["check_bundle"](root, quality=True)
    report["metadata"] = {}
    invalid = {item["path"] for item in report["errors"] if item["code"] in ("frontmatter", "encoding")}
    for file in root.rglob("*.md"):
        path = file.relative_to(root).as_posix()
        if path in invalid:
            continue
        lines = file.read_text(encoding="utf-8-sig").splitlines()
        fields = okf["yaml"].load("\\n".join(lines[1:lines.index("---", 1)]), Loader=okf["FrontmatterLoader"]) if lines and lines[0] == "---" else {}
        fields = fields if isinstance(fields, dict) else {}
        sources = fields.get("sources")
        parents = []
        for key in ("area", "project", "related"):
            value = fields.get(key)
            parents.extend(item for item in (value if isinstance(value, list) else [value]) if isinstance(item, str))
        report["metadata"][path] = {
            "type": fields.get("type") if isinstance(fields.get("type"), str) else None,
            "sources": [{"resource": item.get("resource") if isinstance(item, dict) and isinstance(item.get("resource"), str) else None} for item in sources] if isinstance(sources, list) else None,
            "parents": parents,
        }
    print(json.dumps(report))
except (OSError, ValueError) as exc:
    print(json.dumps({"tool_error": str(exc)}))
`;
  const result = spawnSync(
    "uv",
    ["run", "--no-project", "--quiet", "--with", "pyyaml", "python", "-c", bridge, checker, bundle],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.error) {
    fail(result.error.code === "ENOENT"
      ? "uv is not on PATH; install uv (https://docs.astral.sh/uv/) to run check_okf.py with PyYAML."
      : `uv did not run: ${result.error.message}`);
  }
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    fail(`check_okf.py returned no report (exit ${result.status}).\n${result.stderr || result.stdout}`.trim());
  }
  if (report.tool_error) fail(report.tool_error);
  return report;
}

// The OKF quality pass reports a missing description as advice; in a brain it
// is required. x_project is not used in a brain, so its advice is noise.
function adapt(report, root) {
  const errors = [...report.errors];
  const warnings = [];
  for (const item of report.warnings) {
    if (item.code === "editorial" && /\bdescription\b/.test(item.message)) {
      errors.push({ path: item.path, code: "description", message: 'A concept page needs a description: what it holds, then "Read when ...".' });
    } else if (item.code === "editorial" && /\btitle\b/.test(item.message)) {
      warnings.push({ path: item.path, code: "title", message: "No title; the brain's front-matter contract asks for one." });
    } else if (item.code === "editorial" && /x_project/.test(item.message)) {
      continue;
    } else if (item.code === "broken-link" && markdownTargetExists(root, item)) {
      // The scoped copy leaves out guides and attachments; the brain has them.
      continue;
    } else {
      warnings.push(item);
    }
  }
  return { errors, warnings };
}

function markdownTargetExists(root, item) {
  const target = item.message.replace(/^Target not present in this bundle: /, "").split(/[?#]/)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    return false;
  }
  const relative = decoded.startsWith("/")
    ? decoded.slice(1)
    : posix.join(posix.dirname(item.path), decoded);
  const candidate = resolve(root, relative);
  return candidate.startsWith(resolve(root)) && existsSync(candidate);
}

function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  if (argv.length !== 1 || argv[0].startsWith("-")) {
    console.error(USAGE);
    return 2;
  }
  const root = resolve(argv[0]);
  if (!existsSync(root) || !statSync(root).isDirectory()) fail(`${root} is not a folder.`);
  if (!existsSync(checker)) fail(`check_okf.py is missing beside this script (${checker}).`);

  const files = walk(root);
  const pages = files.filter(inScope);
  const bundle = mkdtempSync(join(tmpdir(), "brain-check-"));
  let report;
  try {
    for (const page of pages) {
      const target = join(bundle, page);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(root, page), target);
    }
    report = runChecker(bundle);
  } finally {
    rmSync(bundle, { recursive: true, force: true });
  }

  const { errors, warnings } = adapt(report, root);

  for (const page of pages) {
    const metadata = report.metadata[page];
    if (!metadata || isNavigation(page) || /^Inbox\//i.test(page) || metadata.type === "home") continue;
    if (metadata.type === "source" && (!metadata.sources?.length || metadata.sources.some((source) => !source.resource?.trim()))) {
      errors.push({ path: page, code: "sources", message: "A source page needs a nonempty sources list with a resource string on every entry." });
    }
    const { body } = splitFrontmatter(readFileSync(join(root, page), "utf8"));
    if (![...wikilinks(withoutCode(body)), ...metadata.parents.flatMap(wikilinks)].length) {
      errors.push({ path: page, code: "parent", message: "A concept page needs a parent wikilink in its body, area, project or related." });
    }
  }

  const vault = vaultRoot(root);
  const resolves = linkIndex(vault === root ? files : walk(vault, "", true));
  for (const page of pages) {
    const { frontmatter, body } = splitFrontmatter(readFileSync(join(root, page), "utf8"));
    const missing = [...new Set([...wikilinks(frontmatter), ...wikilinks(withoutCode(body))])]
      .filter((target) => !resolves(target));
    for (const target of missing) {
      errors.push({ path: page, code: "wikilink", message: `No page or file named [[${target}]] in this brain.` });
    }
  }

  const byName = new Map();
  for (const page of pages.filter((path) => !isNavigation(path))) {
    const name = page.split("/").at(-1).toLowerCase();
    byName.set(name, [...(byName.get(name) ?? []), page]);
  }
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    group.sort();
    errors.push({
      path: group[0],
      code: "duplicate-name",
      message: `Same file name in ${group.join(" and ")}; a bare wikilink cannot tell them apart.`,
    });
  }

  const order = (a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code);
  console.log(`Brain check: ${root}`);
  if (vault !== root) console.log(`Links resolve across the vault at ${vault}; only pages under the brain root are checked.`);
  console.log(`${pages.length} page(s) checked, ${files.filter((f) => f.toLowerCase().endsWith(".md")).length - pages.length} skipped by scope.`);
  for (const item of errors.sort(order)) console.log(`ERROR ${item.path} [${item.code}]: ${item.message}`);
  for (const item of warnings.sort(order)) console.log(`WARNING ${item.path} [${item.code}]: ${item.message}`);
  if (errors.length === 0) {
    console.log(`Brain check passed: ${warnings.length} advisory warning(s).`);
    return 0;
  }
  console.log(`Brain check FAILED: ${errors.length} error(s), ${warnings.length} advisory warning(s).`);
  return 1;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof CannotCheck)) throw error;
  console.error(`Cannot check brain: ${error.message}`);
  process.exitCode = 2;
}
