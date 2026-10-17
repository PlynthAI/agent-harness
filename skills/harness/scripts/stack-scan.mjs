#!/usr/bin/env node
/**
 * The adoption stack scan: what a repository is built with, read from its
 * manifests, so adoption can choose the quality kit and name coverage gaps.
 * Read-only. It decides tooling and coverage only; it adopts nothing from the
 * repository as a convention.
 *
 * Files are read at the root and up to two folders down, skipping hidden
 * folders, installed packages, virtual environments and build output. A
 * language is shown by its manifests, or by its source files when it has none;
 * a language with source files only is incidental and gets no kit by default.
 *
 * Exit 0 after a scan, 2 when it could not run (bad arguments, no such folder,
 * no library index).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(here, "../../../principles-and-patterns/index.md");

const USAGE = `Usage: node stack-scan.mjs <repository>

Reads the repository's manifests (root and two folders down) and prints the
languages found with the quality kit each maps to, the library pages that will
apply, and the direct runtime dependencies no library page covers. A language
with no manifest is found by its source files and listed as incidental, with
no kit by default.`;

// Language by manifest file name, then by source file extension; kit is the
// quality kit's column, page the library's language pattern page.
const LANGUAGES = [
  {
    name: "TypeScript/JavaScript", kit: "TypeScript kit", page: "patterns/typescript.md",
    files: ["package.json", "deno.json", "deno.jsonc"], extensions: [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"],
  },
  {
    name: "Python", kit: "Python kit", page: "patterns/python.md",
    files: ["pyproject.toml", "requirements.txt", "setup.py", "setup.cfg", "Pipfile"], extensions: [".py"],
  },
  { name: "Go", files: ["go.mod"], extensions: [".go"] },
  { name: "Rust", files: ["Cargo.toml"], extensions: [".rs"] },
  { name: "Ruby", files: ["Gemfile"], extensions: [".rb"] },
  { name: "Java", files: ["pom.xml", "build.gradle", "build.gradle.kts"], extensions: [".java"] },
  { name: "C#", files: [/\.csproj$/], extensions: [".cs"] },
  { name: "PHP", files: ["composer.json"], extensions: [".php"] },
  { name: "Swift", files: ["Package.swift"], extensions: [".swift"] },
  { name: "Dart", files: ["pubspec.yaml"], extensions: [".dart"] },
  { name: "Elixir", files: ["mix.exs"], extensions: [".ex", ".exs"] },
  { name: "PowerShell", files: [/\.psd1$/], extensions: [".ps1", ".psm1"] },
];
const SKIP = new Set(["node_modules", "venv", "env", "__pycache__", "dist", "build", "out", "target", "coverage"]);

function walk(root, relative = "", depth = 0) {
  const found = [];
  for (const entry of readdirSync(resolve(root, relative), { withFileTypes: true })) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isFile()) found.push(path);
    else if (entry.isDirectory() && depth < 2 && !entry.name.startsWith(".") && !SKIP.has(entry.name)) {
      found.push(...walk(root, path, depth + 1));
    }
  }
  return found;
}

// A file's language, and whether it is a manifest or a source file.
function classify(path) {
  const name = path.split("/").at(-1);
  const manifest = LANGUAGES.find((language) => language.files.some((file) => (typeof file === "string" ? file === name : file.test(name))));
  if (manifest) return { language: manifest, manifest: true };
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot).toLowerCase() : "";
  return { language: LANGUAGES.find((language) => language.extensions.includes(extension)), manifest: false };
}

const list = (items) => (items.length ? items.map((item) => `- ${item}`) : ["- none found"]);
const withoutBom = (text) => text.replace(/^﻿/, "");
// PEP 503 normalised form, so "Pydantic_Settings" and "pydantic-settings" meet.
const pythonName = (name) => name.toLowerCase().replace(/[-_.]+/g, "-");

// package.json "dependencies" and "optionalDependencies", without workspace,
// file and link references.
function packageDependencies(text) {
  const manifest = JSON.parse(text);
  const declared = { ...manifest.dependencies, ...manifest.optionalDependencies };
  return Object.keys(declared).filter((name) => !/^(workspace|file|link):/.test(String(declared[name])));
}

// The [project] dependencies and optional-dependencies groups of a
// pyproject.toml, however TOML spells their keys. Not Poetry's tables or
// [dependency-groups].
function pyprojectDependencies(text) {
  const items = [];
  const take = (path, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, inner] of Object.entries(value)) take([...path, key], inner);
      return;
    }
    const wanted = path[0] === "project"
      && ((path.length === 2 && path[1] === "dependencies") || (path.length === 3 && path[1] === "optional-dependencies"));
    if (wanted && Array.isArray(value)) items.push(...value.filter((item) => typeof item === "string"));
  };
  readToml(text, take);
  return items.map((item) => /^\s*([A-Za-z0-9][A-Za-z0-9._-]*)/.exec(item)?.[1]).filter(Boolean).map(pythonName);
}

const ESCAPES = { b: "\b", t: "\t", n: "\n", f: "\f", r: "\r", '"': '"', "\\": "\\" };

// The TOML subset the scan needs: table headers and key = value pairs, with
// bare, quoted and dotted keys, strings of all four kinds, arrays and inline
// tables. Calls take(path, value) for each pair; any other value is null.
// Throws on text it cannot read.
function readToml(text, take) {
  let at = 0;
  const bad = (what) => {
    throw new Error(`${what} at offset ${at}`);
  };
  const blank = (lines) => {
    for (;;) {
      if (text[at] === "#") while (at < text.length && text[at] !== "\n") at++;
      else if (text[at] === " " || text[at] === "\t" || text[at] === "\r" || (lines && text[at] === "\n")) at++;
      else return;
    }
  };
  // A basic string's escape, from its backslash: the TOML 1.0 set, and in a
  // multiline string a line-ending backslash that drops the whitespace after it.
  const escape = (multiline) => {
    const letter = text[++at];
    if (Object.hasOwn(ESCAPES, letter ?? "")) {
      at++;
      return ESCAPES[letter];
    }
    if (letter === "u" || letter === "U") {
      const digits = letter === "u" ? 4 : 8;
      const hex = /^[0-9A-Fa-f]*/.exec(text.slice(at + 1, at + 1 + digits))[0];
      const code = hex.length === digits ? parseInt(hex, 16) : -1;
      if (code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) bad("Invalid unicode escape");
      at += 1 + digits;
      return String.fromCodePoint(code);
    }
    const lineEnd = /[ \t]*\r?\n[ \t\r\n]*/y;
    lineEnd.lastIndex = at;
    if (multiline && lineEnd.test(text)) {
      at = lineEnd.lastIndex;
      return "";
    }
    return bad("Invalid escape");
  };
  const string = () => {
    const quote = text[at];
    const multiline = text.startsWith(quote.repeat(3), at);
    const close = multiline ? quote.repeat(3) : quote;
    at += close.length;
    let value = "";
    while (!text.startsWith(close, at)) {
      if (at >= text.length || (!multiline && text[at] === "\n")) bad("Unterminated string");
      if (quote === '"' && text[at] === "\\") {
        value += escape(multiline);
        continue;
      }
      value += text[at++];
    }
    at += close.length;
    return value;
  };
  const key = () => {
    const parts = [];
    for (;;) {
      blank(false);
      if (text[at] === '"' || text[at] === "'") parts.push(string());
      else {
        const bare = /^[A-Za-z0-9_-]+/.exec(text.slice(at, at + 256));
        if (!bare) bad("Expected a key");
        parts.push(bare[0]);
        at += bare[0].length;
      }
      blank(false);
      if (text[at] !== ".") return parts;
      at++;
    }
  };
  const value = () => {
    if (text[at] === '"' || text[at] === "'") return string();
    if (text[at] === "[" || text[at] === "{") {
      const array = text[at] === "[";
      const result = array ? [] : {};
      at++;
      for (;;) {
        blank(true);
        if (text[at] === (array ? "]" : "}")) break;
        if (array) result.push(value());
        else {
          const path = key();
          if (text[at++] !== "=") bad("Expected =");
          blank(false);
          let table = result;
          for (const part of path.slice(0, -1)) table = table[part] ??= {};
          table[path.at(-1)] = value();
        }
        blank(true);
        if (text[at] === ",") at++;
        else if (text[at] !== (array ? "]" : "}")) bad("Expected , or a closing bracket");
      }
      at++;
      return result;
    }
    const scalar = /^[^,\]}#\r\n]+/.exec(text.slice(at, at + 256));
    if (!scalar) bad("Expected a value");
    at += scalar[0].length;
    return null;
  };

  let table = [];
  for (;;) {
    blank(true);
    if (at >= text.length) return;
    if (text[at] === "[") {
      const brackets = text[at + 1] === "[" ? 2 : 1;
      at += brackets;
      table = key();
      if (!text.startsWith("]".repeat(brackets), at)) bad("Unclosed table header");
      at += brackets;
    } else {
      const path = key();
      if (text[at++] !== "=") bad("Expected =");
      blank(false);
      take([...table, ...path], value());
    }
    blank(false);
    if (at < text.length && text[at] !== "\n") bad("Expected the end of the line");
  }
}

// Index lines: "- [Title](path) (notes): description", dependency names in backticks.
function libraryPages() {
  return [...readFileSync(indexPath, "utf8").matchAll(/^- \[(.+?)\]\(([^)\s]+)\) \(([^)]*)\): /gm)].map((match) => ({
    title: match[1],
    path: match[2],
    dependency: [...match[3].matchAll(/`([^`]+)`/g)].map((name) => name[1]),
  }));
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
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    console.error(`Cannot scan: ${root} is not a folder.`);
    return 2;
  }
  if (!existsSync(indexPath)) {
    console.error(`Cannot scan: no library index at ${indexPath}.`);
    return 2;
  }

  const files = walk(root)
    .map((path) => ({ path, ...classify(path) }))
    .filter((file) => file.language)
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));
  const languages = LANGUAGES.filter((language) => files.some((file) => file.language === language));

  const notes = [];
  const dependencies = new Map(); // name -> read from pyproject.toml
  for (const { path } of files) {
    const name = path.split("/").at(-1);
    if (name !== "package.json" && name !== "pyproject.toml") continue;
    const python = name === "pyproject.toml";
    try {
      const text = withoutBom(readFileSync(resolve(root, path), "utf8"));
      for (const dependency of python ? pyprojectDependencies(text) : packageDependencies(text)) {
        dependencies.set(dependency, python || (dependencies.get(dependency) ?? false));
      }
    } catch {
      notes.push(`NOTE ${path}: could not be read as ${python ? "TOML" : "JSON"}; its dependencies were skipped.`);
    }
  }
  const names = (page, dependency, python) => page.dependency.some((name) => name === dependency || (python && pythonName(name) === dependency));
  const pages = libraryPages();
  const applying = pages.flatMap((page) => {
    const reasons = [...dependencies].filter(([dependency, python]) => names(page, dependency, python)).map(([dependency]) => dependency).sort();
    reasons.push(...languages.filter((language) => language.page === page.path).map((language) => language.name));
    return reasons.length ? [`${page.title} (${page.path}): ${reasons.join(", ")}`] : [];
  });
  const uncovered = [...dependencies].filter(([dependency, python]) => !pages.some((page) => names(page, dependency, python))).map(([dependency]) => dependency).sort();

  console.log(`Stack scan: ${root}`);
  for (const note of notes) console.log(note);
  console.log("\nLanguages and quality kit:");
  for (const line of list(languages.map((language) => {
    const own = files.filter((file) => file.language === language);
    const manifests = own.filter((file) => file.manifest).map((file) => file.path);
    if (!manifests.length) {
      return `${language.name}: incidental, no kit by default (source files: ${own[0].path}${own.length > 1 ? ` and ${own.length - 1} more` : ""})`;
    }
    return `${language.name}: ${language.kit ?? "no kit yet"} (${manifests.join(", ")})`;
  }))) console.log(line);
  console.log("\nLibrary pages that apply:");
  for (const line of list(applying)) console.log(line);
  console.log("\nDirect runtime dependencies with no library page:");
  for (const line of list(uncovered)) console.log(line);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
