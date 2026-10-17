#!/usr/bin/env node
/**
 * Check the principles and patterns library, or rebuild its index.
 *
 * The library holds its root index.md and one Markdown page per entry directly
 * under principles/ or patterns/; any other file fails. The inbox skill's
 * pinned, unmodified OKF checker (check_okf.py) checks the
 * entries' structure and reads their front matter; this script adds the
 * library's own rules and builds the index from those fields, so the index
 * cannot drift from the entries. Read-only unless --write is given; the scoped
 * copy the OKF checker reads lives in a temporary folder that is removed.
 *
 * Exit 0 when the library passes (or the index was written), 1 with a list of
 * errors, 2 when the check could not run (bad arguments, a missing folder, uv
 * or PyYAML unavailable, a file or temporary folder the system refused).
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const checker = resolve(here, "../../inbox/scripts/check_okf.py");
const defaultLibrary = resolve(here, "../../../principles-and-patterns");

const USAGE = `Usage: node library-index.mjs [--write] [<library-root>]

Checks the principles and patterns library: OKF structure (through the inbox
skill's check_okf.py, run with uv and PyYAML), the required front matter of
every entry, and that index.md equals a fresh build from that front matter.
--write rebuilds index.md instead of comparing it, and only when every entry
passes. Entries are the .md files directly under principles/ and patterns/;
any other file except the root index.md fails, as does a SKILL.md or AGENTS.md.
The default library is principles-and-patterns beside the skills folder.
A sourced entry reviewed over six months before today (LIBRARY_TODAY=YYYY-MM-DD
overrides the date) is an advisory warning. Exit 0 pass, 1 errors found, 2 the check could not run.`;

// Each type lives in its own folder; the index groups them in this order.
const GROUPS = [
  { type: "principle", folder: "principles", heading: "Principles" },
  { type: "pattern", folder: "patterns", heading: "Patterns" },
];
// Agent tools load these by name, so the library never holds one.
const RESERVED = ["skill.md", "agents.md"];
const APPLIES = ["plan", "diff"];

class CannotCheck extends Error {}

function fail(message) {
  throw new CannotCheck(message);
}

function walk(root, relative = "") {
  const files = [];
  for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...walk(root, path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function runChecker(bundle) {
  // Reuse OKF's YAML loader in the same uv process; keep the pinned file intact.
  const bridge = `
import json, runpy, sys
from pathlib import Path
okf = runpy.run_path(sys.argv[1])
root = Path(sys.argv[2])
try:
    report = okf["check_bundle"](root)
    report["metadata"] = {}
    invalid = {item["path"] for item in report["errors"] if item["code"] in ("frontmatter", "encoding")}
    for file in root.rglob("*.md"):
        path = file.relative_to(root).as_posix()
        if path in invalid:
            continue
        lines = file.read_text(encoding="utf-8-sig").splitlines()
        fields = okf["yaml"].load("\\n".join(lines[1:lines.index("---", 1)]), Loader=okf["FrontmatterLoader"]) if lines and lines[0] == "---" else {}
        report["metadata"][path] = fields if isinstance(fields, dict) else {}
    print(json.dumps(report, default=str))
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

const isText = (value) => typeof value === "string" && value.trim() !== "";
const isTextList = (value) => Array.isArray(value) && value.length > 0 && value.every(isText);

// The library's own rules, on top of OKF's structure.
function entryErrors(path, fields) {
  const errors = [];
  const add = (code, message) => errors.push({ path, code, message });
  const group = GROUPS.find((item) => item.type === fields.type);
  if (!group) add("type", `type must be one of ${GROUPS.map((item) => item.type).join(", ")}.`);
  else if (!path.startsWith(`${group.folder}/`)) add("type", `A ${group.type} entry belongs under ${group.folder}/.`);
  if (!isText(fields.title)) add("title", "An entry needs a title.");
  if (!isText(fields.description)) add("description", "An entry needs a description: one sentence saying when to apply it.");
  const applies = fields.applies_to;
  if (!isTextList(applies) || applies.some((item) => !APPLIES.includes(item)) || new Set(applies).size !== applies.length) {
    add("applies_to", `applies_to must list plan, diff or both (found ${JSON.stringify(applies ?? null)}).`);
  }
  if ("dependency" in fields && (fields.type !== "pattern" || !isTextList(fields.dependency))) {
    add("dependency", "dependency belongs to a pattern entry: the list of package names that trigger it.");
  }
  if ("status" in fields && fields.status !== "trial") add("status", 'The only status an entry carries is "trial".');
  if ("source" in fields && !isText(fields.source)) add("source", "source is the upstream URL at its pinned commit.");
  if ("source" in fields && !dateOf(fields.reviewed)) add("reviewed", 'An entry with a source needs reviewed: "YYYY-MM-DD", the date it was last checked against that source.');
  return errors;
}

// A "YYYY-MM-DD" calendar date string as a UTC Date, or null.
function dateOf(value) {
  const match = typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match && new Date(Date.UTC(match[1], match[2] - 1, match[3]));
  return date && date.toISOString().startsWith(match[0]) ? date : null;
}

// The date six calendar months on, a day past the target month's end clamped to it.
function sixMonthsAfter(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 6;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(date.getUTCDate(), last));
}

// Advisory: a sourced entry last checked against its source over six months ago.
function staleWarnings(entries) {
  const today = dateOf(process.env.LIBRARY_TODAY || new Date().toISOString().slice(0, 10));
  if (!today) fail("LIBRARY_TODAY must be a YYYY-MM-DD date.");
  return entries
    .filter(({ fields }) => "source" in fields && today > sixMonthsAfter(dateOf(fields.reviewed)))
    .map(({ path, fields }) => ({ path, code: "reviewed", message: `Last reviewed ${fields.reviewed}, over six months ago; re-check it against ${fields.source}.` }));
}

// OKF advice that does not apply here: "trial" is this library's own status,
// and a link to a file the scoped copy left out (a skill, for one) is fine when
// the file exists.
function keptWarnings(warnings, root, metadata) {
  return warnings.filter((item) => {
    if (item.code === "status" && metadata[item.path]?.status === "trial") return false;
    if (item.code === "broken-link" || item.code === "outside-bundle") {
      const target = item.message.replace(/^[^:]*: /, "").split(/[?#]/)[0];
      try {
        return !existsSync(resolve(root, posix.dirname(item.path), decodeURIComponent(target)));
      } catch {
        return true;
      }
    }
    return true;
  });
}

function buildIndex(entries) {
  const lines = [
    "---",
    'okf_version: "0.2"',
    "---",
    "# Principles and patterns",
    "",
    "Named principles and patterns that reviewing skills read: `plan` entries for",
    "plan review, `diff` entries for diff review. Open an entry only when its",
    "description applies; a pattern with a dependency applies only where the",
    "project uses that package. Built from each entry's front matter by",
    "the harness library's `scripts/library-index.mjs --write`; edit the entries, never",
    "this page.",
  ];
  for (const group of GROUPS) {
    const members = entries
      .filter((entry) => entry.fields.type === group.type)
      .sort((a, b) => a.fields.title.localeCompare(b.fields.title, "en", { sensitivity: "base" }) || a.path.localeCompare(b.path));
    if (!members.length) continue;
    lines.push("", `## ${group.heading}`, "");
    for (const { path, fields } of members) {
      const notes = [fields.applies_to.join(", ")];
      if (fields.dependency) notes.push(`dependency ${fields.dependency.map((name) => `\`${name}\``).join(", ")}`);
      if (fields.status === "trial") notes.push("trial");
      lines.push(`- [${fields.title.trim()}](${linkTo(path)}) (${notes.join("; ")}): ${fields.description.trim()}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

// Encode each path segment on its own so "#", "?", "%" and parentheses in a
// file name stay part of the link destination; the separators stay "/".
function linkTo(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment).replace(/[()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");
}

function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  const writing = argv.includes("--write");
  const rest = argv.filter((arg) => arg !== "--write");
  if (rest.length > 1 || rest.some((arg) => arg.startsWith("-"))) {
    console.error(USAGE);
    return 2;
  }
  const root = resolve(rest[0] ?? defaultLibrary);
  if (!existsSync(root) || !statSync(root).isDirectory()) fail(`${root} is not a folder.`);
  if (!existsSync(checker)) fail(`check_okf.py is missing from the inbox skill (${checker}).`);

  // Only index.md and principles/<entry>.md or patterns/<entry>.md belong here.
  const layout = [];
  const pages = [];
  for (const path of walk(root)) {
    if (path === "index.md") continue;
    const parts = path.split("/");
    const name = parts.at(-1).toLowerCase();
    if (RESERVED.includes(name)) {
      layout.push({ path, code: "layout", message: "Agent tools load a file with this name on their own; the library never holds one." });
    } else if (parts.length !== 2 || !GROUPS.some((group) => group.folder === parts[0]) || !name.endsWith(".md")) {
      layout.push({ path, code: "layout", message: `The library holds index.md and one .md page per entry in ${GROUPS.map((group) => `${group.folder}/`).join(" or ")}; nothing else.` });
    } else pages.push(path);
  }
  const bundle = mkdtempSync(join(tmpdir(), "library-check-"));
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

  const errors = [...layout, ...report.errors];
  const failed = new Set(errors.map((item) => item.path));
  const entries = [];
  for (const path of pages) {
    if (failed.has(path)) continue;
    const fields = report.metadata[path] ?? {};
    const problems = entryErrors(path, fields);
    errors.push(...problems);
    if (!problems.length) entries.push({ path, fields });
  }
  const warnings = [...keptWarnings(report.warnings, root, report.metadata), ...staleWarnings(entries)];

  const indexPath = join(root, "index.md");
  const index = buildIndex(entries);
  if (!writing && !errors.length) {
    const current = existsSync(indexPath) ? readFileSync(indexPath, "utf8").replace(/\r\n/g, "\n") : null;
    if (current !== index) {
      errors.push({
        path: "index.md",
        code: "index",
        message: current === null ? "No index; build it with --write." : "The index differs from a fresh build; rebuild it with --write, never by hand.",
      });
    }
  }

  const order = (a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code);
  console.log(`Library check: ${root}`);
  for (const item of errors.sort(order)) console.log(`ERROR ${item.path} [${item.code}]: ${item.message}`);
  for (const item of warnings.sort(order)) console.log(`WARNING ${item.path} [${item.code}]: ${item.message}`);
  if (errors.length) {
    console.log(`Library check FAILED: ${errors.length} error(s), ${warnings.length} advisory warning(s).${writing ? " The index was not written." : ""}`);
    return 1;
  }
  if (writing) {
    writeFileSync(indexPath, index);
    console.log(`Wrote index.md: ${entries.length} entries, ${warnings.length} advisory warning(s).`);
    return 0;
  }
  console.log(`Library check passed: ${entries.length} entries, index current, ${warnings.length} advisory warning(s).`);
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  // A system error (a temporary folder, the library or the index that cannot be
  // read or written) says nothing about the library either: it cannot be checked.
  if (!(error instanceof CannotCheck) && typeof error?.syscall !== "string") throw error;
  console.error(`Cannot check library: ${error.message}`);
  process.exitCode = 2;
}
