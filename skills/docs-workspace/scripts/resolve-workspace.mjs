#!/usr/bin/env node
/**
 * Shared Codex project/workspace resolution.
 *
 * Answers one question from anywhere inside a product repository: which
 * project is this, where is its existing machine-local workspace, and which
 * routes does that project already use?
 *
 * Two properties matter:
 *
 *   1. Read-only. Nothing is created, moved, repaired or deleted. A route that
 *      does not exist yet is reported as missing, not created.
 *   2. No host paths in reusable logic. This file contains no drive letters and
 *      no product names. Every host-specific mapping comes from a registry
 *      document; see references/registry-format.md.
 *
 * It adapts, rather than replaces, the existing resolvers:
 *   - identity, worktree separation and nested-cwd behaviour follow the
 *     frontend's scripts/codex/local-workspace.mjs;
 *   - route names follow the workspace conventions this harness and the
 *     product repositories already agree on.
 *
 * No writer is required. Goals, findings, plans and task state are plain files
 * edited directly. A registry may still name a writer for a project that keeps
 * one; the resolver reports that block and never invokes it.
 */

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

export const RESOLVER_ID = "codex-workspace-resolution/1";
export const SCHEMA_VERSION = 1;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WINDOWS = process.platform === "win32";

/** Route names every project must be able to answer for. */
export const REQUIRED_ROUTES = Object.freeze([
  "goals",
  "findings",
  "prds",
  "specs",
  "adrs",
  "features",
  "plans",
  "artifacts",
]);

/**
 * Generic fallback route names. These are conventions, not host paths; a
 * registry may override or extend any of them per project.
 *
 * A dot means Obsidian ignores the folder. Knowledge routes are plain so they
 * stay visible when a workspace sits in a vault; task storage is dotted so its
 * bulk stays hidden when it has to live inside a workspace.
 */
export const DEFAULT_ROUTES = Object.freeze({
  goals: "goals",
  findings: "findings",
  prds: "prds",
  specs: "specs",
  adrs: "adrs",
  features: "features",
  plans: "plans",
  artifacts: ".artifacts",
  reviews: "reviews",
  receipts: "receipts",
  // Retired conventions: still named so a registry can be explicit about them,
  // but unused by default so nothing invites an agent to create them.
  objects: null,
  index: null,
  scratch: ".task-scratch",
});

/**
 * Task storage: the routes a host `scratchRoot` takes out of the workspace, and
 * their folder names under `<scratchRoot>/<project id>/`. The scratch root is
 * already hidden and outside every brain, so the names there are plain.
 */
export const SCRATCH_ROOT_ROUTES = Object.freeze({
  artifacts: "artifacts",
  scratch: "task-scratch",
});

/**
 * The kinds a project's design namespace separates. Originals and references
 * are `source`, derivatives and task working output are `working`, and approved
 * outputs meant for another consumer are `export`. Keeping the three apart is
 * what stops a derivative being mistaken for the original it came from, and
 * what keeps an approved export from reading as disposable.
 */
export const ASSET_KINDS = Object.freeze(["source", "working", "export"]);

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SLUG_PATTERN = /^[a-z0-9._-]+\/[a-z0-9._-]+$/;

export class ResolutionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ResolutionError";
    this.code = code;
    this.details = details;
  }
}

/* ------------------------------------------------------------------ paths */

function expandEnv(value, env) {
  return String(value)
    .replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (match, name) => env[name] ?? match)
    .replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name) => env[name] ?? match)
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, name) => env[name] ?? match);
}

function expandPath(value, env) {
  const expanded = expandEnv(value, env);
  if (expanded === "~") return homedir();
  if (expanded.startsWith("~/") || expanded.startsWith("~\\")) {
    return join(homedir(), expanded.slice(2));
  }
  return expanded;
}

/**
 * Resolve symlinks and junctions for the existing part of a path, so a later
 * component cannot hide behind a link.
 */
export function physicalPath(path) {
  try {
    lstatSync(path);
    return realpathSync.native(path);
  } catch (error) {
    if (error.code !== "ENOENT" || dirname(path) === path) throw error;
    return join(physicalPath(dirname(path)), relative(dirname(path), path));
  }
}

function isAbsoluteHostPath(path) {
  return isAbsolute(path) || /^[A-Za-z]:/.test(path);
}

/** An expanded absolute path, or null when the value is empty or relative. */
function absoluteRoot(value, env) {
  if (typeof value !== "string" || !value.trim()) return null;
  const expanded = expandPath(value, env);
  return isAbsoluteHostPath(expanded) ? resolve(expanded) : null;
}

function within(parent, child) {
  const suffix = relative(parent, child);
  return suffix === "" || (!isAbsolute(suffix) && suffix !== ".." && !suffix.startsWith(`..${sep}`));
}

/** Physical path when it is resolvable, otherwise the plain absolute path. */
function physicalOrResolved(path) {
  try {
    return physicalPath(path);
  } catch {
    return resolve(path);
  }
}

function samePath(a, b) {
  const left = physicalOrResolved(a);
  const right = physicalOrResolved(b);
  return WINDOWS ? left.toLowerCase() === right.toLowerCase() : left === right;
}

/* -------------------------------------------------------------------- git */

function git(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/**
 * Reduce any Git remote URL to a stable `owner/repo` slug. Supports https,
 * ssh://, the scp-like `git@host:owner/repo` form and trailing `.git`.
 */
export function normalizeRemoteSlug(url) {
  if (typeof url !== "string" || !url.trim()) return null;
  let value = url.trim().replace(/\\/g, "/");
  const scp = /^[^/@\s]+@([^:/\s]+):(.+)$/.exec(value);
  if (scp) {
    value = `${scp[1]}/${scp[2]}`;
  } else {
    value = value.replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\//, "");
    value = value.replace(/^[^/@\s]+@/, "");
  }
  value = value.replace(/\.git$/i, "").replace(/\/+$/, "");
  const parts = value.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return parts.slice(-2).join("/").toLowerCase();
}

function repoRootOf(cwd) {
  try {
    return physicalPath(git(cwd, ["rev-parse", "--show-toplevel"]));
  } catch (error) {
    throw new ResolutionError("not-a-git-worktree", `Not inside a Git working tree: ${cwd}`, {
      cause: String(error.stderr ?? error.message ?? error).trim(),
    });
  }
}

function remotesOf(repoRoot) {
  const names = git(repoRoot, ["remote"]).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return names.map((name) => {
    let url = "";
    try {
      url = git(repoRoot, ["remote", "get-url", name]);
    } catch {
      url = "";
    }
    return { name, url, slug: normalizeRemoteSlug(url) };
  });
}

function worktreesOf(repoRoot) {
  const porcelain = git(repoRoot, ["worktree", "list", "--porcelain", "-z"]);
  return porcelain
    .split("\0")
    .filter((record) => record.startsWith("worktree "))
    .map((record) => physicalPath(record.slice("worktree ".length)));
}

function isGitIgnored(repoRoot, path) {
  try {
    git(repoRoot, ["check-ignore", "-q", "--", path]);
    return true;
  } catch (error) {
    if (error.status === 1) return false; // Git confirmed the path is not ignored.
    throw new ResolutionError(
      "workspace-unresolvable",
      "Cannot determine whether the registered workspace is Git-ignored in the canonical checkout.",
      { worktree: repoRoot, cause: String(error.stderr ?? error.message ?? error).trim() },
    );
  }
}

/* --------------------------------------------------------------- registry */

export function registryCandidates({ registryPath, env = process.env } = {}) {
  const candidates = [];
  const push = (path, source) => {
    if (path) candidates.push({ path: resolve(path), source });
  };
  push(registryPath, "explicit");
  push(env.CODEX_WORKSPACE_REGISTRY, "environment");
  push(join(env.CODEX_HOME || join(homedir(), ".codex"), "workspace-registry.json"), "codex-home");
  push(join(SCRIPT_DIR, "..", "registry.json"), "shipped-with-skill");
  push(join(SCRIPT_DIR, "..", "..", "..", "config", "workspace-registry.json"), "factory-config");
  return candidates;
}

export function loadRegistry({ registryPath, env = process.env } = {}) {
  const candidates = registryCandidates({ registryPath, env });
  // An explicit path or an explicit environment variable is an instruction, not
  // a hint. If either is set and unreadable, fail rather than silently resolving
  // against a different registry.
  const required = new Set(["explicit", "environment"]);
  for (const candidate of candidates) {
    let text;
    try {
      text = readFileSync(candidate.path, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        if (required.has(candidate.source)) {
          throw new ResolutionError("registry-not-found", `Registry not found: ${candidate.path}`, {
            source: candidate.source,
          });
        }
        continue;
      }
      if (error.code === "EISDIR" && candidate.source === "codex-home") continue;
      throw new ResolutionError("registry-unreadable", `Cannot read registry: ${candidate.path}`, {
        cause: error.message,
      });
    }
    let document;
    try {
      document = JSON.parse(text);
    } catch (error) {
      throw new ResolutionError("registry-invalid-json", `Registry is not valid JSON: ${candidate.path}`, {
        cause: error.message,
      });
    }
    return { path: candidate.path, source: candidate.source, document };
  }
  throw new ResolutionError(
    "registry-not-found",
    "No workspace registry found. Set CODEX_WORKSPACE_REGISTRY or pass --registry <path>.",
    { searched: candidates.map((candidate) => `${candidate.source}: ${candidate.path}`) },
  );
}

function normalizeProject(entry, registry, env, index) {
  const where = `projects[${index}]`;
  if (!entry || typeof entry !== "object") {
    return { error: `${where} must be an object.` };
  }
  if (typeof entry.id !== "string" || !ID_PATTERN.test(entry.id)) {
    return { error: `${where}.id must be 1-64 lowercase letters, digits, dots, dashes or underscores.` };
  }
  const identity = entry.identity ?? {};
  const remotes = Array.isArray(identity.remotes) ? identity.remotes.map((value) => String(value).toLowerCase()) : [];
  if (remotes.length === 0) {
    return { error: `${entry.id}.identity.remotes must list at least one owner/repo.` };
  }
  for (const remote of remotes) {
    if (!SLUG_PATTERN.test(remote)) {
      return { error: `${entry.id}.identity.remotes entry "${remote}" is not an owner/repo slug.` };
    }
  }
  const routes = { ...DEFAULT_ROUTES, ...(registry.routes ?? {}), ...(entry.routes ?? {}) };
  const notUsedRoutes = [];
  for (const [name, value] of Object.entries(routes)) {
    // A project can state that a convention route is deliberately unused, so
    // the output does not invite an agent to create it.
    if (value === null || value === false) {
      notUsedRoutes.push(name);
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      return { error: `${entry.id}.routes.${name} must be a non-empty relative path or null.` };
    }
    const raw = expandPath(value, env);
    if (isAbsolute(raw) || /^[A-Za-z]:/.test(raw)) {
      return { error: `${entry.id}.routes.${name} must be relative to the workspace root.` };
    }
    if (raw.split(/[\\/]/).includes("..")) {
      return { error: `${entry.id}.routes.${name} must not escape the workspace root with "..": ${value}` };
    }
  }
  const layout = entry.workspaceLayout ?? registry.workspaceLayout ?? "v1";
  const trackedRoutes = [];
  for (const item of entry.trackedRoutes ?? []) {
    const path = typeof item === "string" ? item : item?.path;
    if (typeof path !== "string" || !path.trim()) {
      return { error: `${entry.id}.trackedRoutes entries need a repo-relative path.` };
    }
    if (isAbsolute(path) || /^[A-Za-z]:/.test(path) || path.split(/[\\/]/).includes("..")) {
      return { error: `${entry.id}.trackedRoutes path must be repo-relative without "..": ${path}` };
    }
    trackedRoutes.push({
      id: String(item?.id ?? path),
      path,
      note: item?.note ?? null,
    });
  }
  let workspaceRoot = entry.workspaceRoot;
  if (!workspaceRoot && registry.workspaceParent) {
    workspaceRoot = join(String(registry.workspaceParent), entry.id, layout);
  }
  if (!workspaceRoot) {
    return { error: `${entry.id} has no workspaceRoot and the registry has no workspaceParent.` };
  }
  const expandedRoot = expandPath(workspaceRoot, env);
  if (!isAbsolute(expandedRoot) && !/^[A-Za-z]:/.test(expandedRoot)) {
    return { error: `${entry.id}.workspaceRoot must resolve to an absolute path: ${expandedRoot}` };
  }
  // The business brain (an Obsidian vault) this project's workspace belongs to.
  let brainRoot = null;
  if (entry.brainRoot !== undefined && entry.brainRoot !== null) {
    brainRoot = absoluteRoot(entry.brainRoot, env);
    if (!brainRoot) {
      return { error: `${entry.id}.brainRoot must resolve to an absolute path: ${entry.brainRoot}` };
    }
  }
  return {
    project: {
      id: entry.id,
      remotes,
      subdirectory: identity.root ?? null,
      workspaceRoot: expandedRoot,
      brainRoot,
      routes,
      notUsedRoutes,
      trackedRoutes,
      writer: entry.writer ?? null,
      dataRoots: entry.dataRoots ?? [],
      designRoots: entry.designRoots ?? [],
      notes: entry.notes ?? [],
    },
  };
}

/**
 * Structural validation only. It never requires a path to exist and never
 * touches the filesystem.
 */
export function validateRegistry(document, { env = process.env } = {}) {
  const errors = [];
  const warnings = [];
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return { ok: false, errors: ["Registry root must be a JSON object."], warnings, projects: [] };
  }
  if (document.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${SCHEMA_VERSION} (found ${JSON.stringify(document.schemaVersion)}).`);
  }
  if (!Array.isArray(document.projects) || document.projects.length === 0) {
    errors.push("projects must be a non-empty array.");
    return { ok: false, errors, warnings, projects: [] };
  }
  if (document.sharedRoots !== undefined) {
    if (!Array.isArray(document.sharedRoots)) {
      errors.push("sharedRoots must be an array when present.");
    } else {
      const seen = new Set();
      document.sharedRoots.forEach((root, index) => {
        if (!root || typeof root !== "object" || typeof root.id !== "string" || !root.id) {
          errors.push(`sharedRoots[${index}] needs a string id.`);
          return;
        }
        if (seen.has(root.id)) errors.push(`Duplicate shared root id: ${root.id}.`);
        seen.add(root.id);
        const raw = typeof root.path === "string" ? expandPath(root.path, env) : "";
        if (!raw || (!isAbsolute(raw) && !/^[A-Za-z]:/.test(raw))) {
          errors.push(`sharedRoots.${root.id}.path must resolve to an absolute path.`);
        }
      });
    }
  }
  let scratchRoot = null;
  if (document.scratchRoot !== undefined && document.scratchRoot !== null) {
    scratchRoot = absoluteRoot(document.scratchRoot, env);
    if (!scratchRoot) errors.push(`scratchRoot must resolve to an absolute path: ${document.scratchRoot}`);
  }
  const projects = [];
  document.projects.forEach((entry, index) => {
    const normalized = normalizeProject(entry, document, env, index);
    if (normalized.error) {
      errors.push(normalized.error);
      return;
    }
    projects.push(normalized.project);
  });
  // Scratch and artifacts never live in a brain: synced vaults must not carry
  // bulky task output. Checked lexically, so validation stays off the disk.
  for (const project of projects) {
    if (!project.brainRoot) continue;
    const taskStorage = scratchRoot ? join(scratchRoot, project.id) : project.workspaceRoot;
    if (within(project.brainRoot, taskStorage)) {
      errors.push(
        `${project.id} would keep scratch and artifacts inside its brain (${project.brainRoot}); ` +
          "set the registry scratchRoot to a folder outside every brain.",
      );
    }
  }
  const bySlug = new Map();
  const byRoot = new Map();
  const byId = new Map();
  for (const project of projects) {
    if (byId.has(project.id)) errors.push(`Duplicate project id: ${project.id}.`);
    byId.set(project.id, project);
    for (const remote of project.remotes) {
      if (!bySlug.has(remote)) bySlug.set(remote, []);
      bySlug.get(remote).push(project);
    }
    const key = WINDOWS ? project.workspaceRoot.toLowerCase() : project.workspaceRoot;
    if (byRoot.has(key) && byRoot.get(key) !== project.id) {
      errors.push(`Workspace root ${project.workspaceRoot} is claimed by both ${byRoot.get(key)} and ${project.id}.`);
    }
    byRoot.set(key, project.id);
    for (const name of REQUIRED_ROUTES) {
      if (!project.routes[name]) errors.push(`${project.id} has no route for ${name}.`);
    }
  }
  for (const [remote, owners] of bySlug) {
    const unique = [...new Set(owners)];
    if (unique.length < 2) continue;
    const ids = unique.map((project) => project.id).join(", ");
    // One remote may legitimately serve several projects in a monorepo, but only
    // when configuration disambiguates them by repository-relative root.
    if (unique.some((project) => !project.subdirectory)) {
      errors.push(`Remote ${remote} is claimed by ${ids}; every one of them must set identity.root.`);
      continue;
    }
    const roots = unique.map((project) => project.subdirectory);
    if (new Set(roots).size !== roots.length) {
      errors.push(`Remote ${remote} is claimed by ${ids} with a duplicate identity.root.`);
    }
  }
  return { ok: errors.length === 0, errors, warnings, projects, scratchRoot };
}

/**
 * Where a route lives: task storage moves to `<scratchRoot>/<project id>/`
 * when the registry sets a scratch root; everything else stays in the workspace.
 */
function routeLocation(name, projectId, workspaceRoot, relativePath, scratchRoot) {
  if (scratchRoot && name in SCRATCH_ROOT_ROUTES) {
    return { location: "scratch-root", base: join(scratchRoot, projectId), relativePath: SCRATCH_ROOT_ROUTES[name] };
  }
  return { location: "workspace", base: workspaceRoot, relativePath };
}

/* ----------------------------------------------------------------- routes */

function inspectPath(path) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT") {
      // Windows also reports ENOENT for a descendant of an existing file.
      const parent = dirname(path);
      const ancestor = parent !== path ? inspectPath(parent) : null;
      // A directory's failed listing does not prevent looking up a child.
      if (ancestor && (
        ancestor.type === "file" || ancestor.type === "unreadable" ||
        (ancestor.type === "link" && (ancestor.linkTarget === null || ancestor.unreadable === "ENOTDIR"))
      )) {
        return { exists: false, type: "unreadable", entries: null, linkTarget: null, unreadable: ancestor.unreadable ?? "ENOTDIR" };
      }
      return { exists: false, type: "missing", entries: null, linkTarget: null };
    }
    return { exists: false, type: "unreadable", entries: null, linkTarget: null, unreadable: error.code ?? error.message };
  }
  if (stat.isSymbolicLink()) {
    let target = null;
    try {
      target = realpathSync.native(path);
    } catch {
      target = null;
    }
    let entries = null;
    let unreadable = null;
    try {
      entries = readdirSync(path).length;
    } catch (error) {
      unreadable = error.code ?? error.message;
    }
    return { exists: true, type: "link", entries, linkTarget: target, unreadable };
  }
  if (stat.isDirectory()) {
    let entries = null;
    let unreadable = null;
    try {
      entries = readdirSync(path).length;
    } catch (error) {
      unreadable = error.code ?? error.message;
    }
    return { exists: true, type: "dir", entries, linkTarget: null, unreadable };
  }
  return { exists: true, type: "file", entries: null, linkTarget: null };
}

function stateOf(info) {
  if (!info.exists) return info.type === "unreadable" ? "unreadable" : "missing";
  if (info.type === "file") return "file";
  // `entries` is null only when the path could not be enumerated: a link whose
  // target is not a directory, a broken link, or a directory we may not read.
  if (info.entries === null) return "unreadable";
  return info.entries === 0 ? "empty" : "populated";
}

function variantName(name) {
  return name.startsWith(".") ? name.slice(1) : `.${name}`;
}

function describeRoute(name, root, relativePath, options) {
  const path = join(root, relativePath);
  const info = inspectPath(path);
  const record = {
    name,
    path,
    relativePath,
    location: options.location,
    exists: info.exists,
    type: info.type,
    state: stateOf(info),
    entries: info.entries,
    linkTarget: info.linkTarget,
    variant: null,
    warnings: [],
  };
  if (info.unreadable) record.warnings.push(`cannot enumerate: ${info.unreadable}`);
  const alternate = variantName(relativePath.split(/[\\/]/).pop());
  if (alternate !== relativePath.split(/[\\/]/).pop()) {
    const alternatePath = join(dirname(path), alternate);
    const alternateInfo = inspectPath(alternatePath);
    if (alternateInfo.exists) {
      record.variant = {
        path: alternatePath,
        relativePath: alternate,
        state: stateOf(alternateInfo),
        entries: alternateInfo.entries,
      };
    }
    if (info.type === "missing" && alternateInfo.type === "missing") {
      record.warnings.push("route does not exist yet; resolution does not create it");
    } else if (info.type === "missing" && alternateInfo.exists) {
      record.warnings.push(
        `configured path is missing while ${alternate} exists (${stateOf(alternateInfo)}); ` +
          "this is a naming split, not a resolution error",
      );
    }
    // Task storage is dotted by convention, so the plain-name preference covers
    // knowledge routes only.
    if (relativePath.startsWith(".") && options.plainNamesPreferred && !(name in SCRATCH_ROOT_ROUTES)) {
      record.warnings.push(
        "uses a dotted name; this registry asks for plain route names, so the plain spelling is the convention it " +
          "prefers - the configured name is reported as written and never renamed here",
      );
    }
  }
  return record;
}

/* --------------------------------------------------------------- resolve */

function matchProject(projects, repoRoot, cwd, remotes) {
  const observed = remotes.filter((remote) => remote.slug);
  const candidates = [];
  const excluded = [];
  for (const project of projects) {
    const matched = observed.find((remote) => project.remotes.includes(remote.slug));
    if (!matched) continue;
    const projectRoot = project.subdirectory ? physicalPath(resolve(repoRoot, project.subdirectory)) : repoRoot;
    if (project.subdirectory && !within(projectRoot, cwd)) {
      excluded.push({ project: project.id, root: projectRoot });
      continue;
    }
    candidates.push({ project, remote: matched, projectRoot });
  }
  if (candidates.length === 0) {
    // The remote is registered but this directory is outside every configured
    // project root. Saying "unregistered" here would invite an agent to add a
    // duplicate entry and invent a path.
    if (excluded.length > 0) {
      return {
        error: new ResolutionError(
          "outside-project-root",
          "This repository's remote is registered, but the working directory is outside every configured project root.",
          { cwd, candidates: excluded },
        ),
      };
    }
    return {
      error: new ResolutionError(
        "unregistered-identity",
        "No registered project matches this repository's remotes.",
        {
          observedRemotes: observed.map((remote) => `${remote.name}: ${remote.slug}`),
          registeredRemotes: projects.flatMap((project) => project.remotes),
        },
      ),
    };
  }
  const byProject = new Map();
  for (const candidate of candidates) {
    const existing = byProject.get(candidate.project.id);
    if (!existing || candidate.projectRoot.length > existing.projectRoot.length) {
      byProject.set(candidate.project.id, candidate);
    }
  }
  const ranked = [...byProject.values()].sort((a, b) => b.projectRoot.length - a.projectRoot.length);
  const best = ranked[0];
  const tied = ranked.filter((candidate) => candidate.projectRoot.length === best.projectRoot.length);
  if (tied.length > 1) {
    return {
      error: new ResolutionError("ambiguous-identity", "More than one registered project matches this worktree.", {
        projects: tied.map((candidate) => candidate.project.id),
      }),
    };
  }
  return { match: best };
}

export function resolveWorkspace({
  cwd = process.cwd(),
  registryPath,
  registry: providedRegistry,
  overrideRoot,
  env = process.env,
} = {}) {
  const loaded = providedRegistry
    ? { path: null, source: "provided", document: providedRegistry }
    : loadRegistry({ registryPath, env });
  const validation = validateRegistry(loaded.document, { env });
  if (!validation.ok) {
    throw new ResolutionError("registry-invalid", "Workspace registry failed validation.", {
      registry: loaded.path,
      errors: validation.errors,
    });
  }
  const registry = loaded.document;
  const startDir = physicalPath(resolve(cwd));
  const repoRoot = repoRootOf(startDir);
  const remotes = remotesOf(repoRoot);
  const worktrees = worktreesOf(repoRoot);
  const matched = matchProject(validation.projects, repoRoot, startDir, remotes);
  if (matched.error) throw matched.error;
  const { project, remote, projectRoot } = matched.match;

  let workspaceRoot;
  try {
    workspaceRoot = physicalPath(project.workspaceRoot);
  } catch (error) {
    throw new ResolutionError(
      "workspace-unresolvable",
      `Cannot resolve the configured workspace root for ${project.id}: ${project.workspaceRoot}`,
      { cause: error.message },
    );
  }
  let placement = "outside-worktrees";
  for (const [index, worktree] of worktrees.entries()) {
    const strictlyInside = within(worktree, workspaceRoot) && !samePath(worktree, workspaceRoot);
    if (index === 0 && strictlyInside && isGitIgnored(worktree, workspaceRoot)) {
      placement = "ignored-in-canonical-checkout";
      continue;
    }
    if (within(worktree, workspaceRoot) || within(workspaceRoot, worktree)) {
      throw new ResolutionError(
        "workspace-inside-worktree",
        `Workspace root overlaps a repository worktree without an ignored canonical-checkout placement: ${workspaceRoot}`,
        { worktree },
      );
    }
  }
  const requested = overrideRoot ?? env.CODEX_WORKSPACE_ROOT ?? null;
  let override = null;
  if (requested) {
    const requestedPath = resolve(expandPath(String(requested), env));
    if (!samePath(requestedPath, workspaceRoot)) {
      throw new ResolutionError(
        "conflicting-override",
        "A workspace root override conflicts with the registered root. Refusing to invent a second tree.",
        { override: requestedPath, registered: workspaceRoot, project: project.id },
      );
    }
    override = { value: requestedPath, matched: true };
  }

  const workspaceInfo = inspectPath(workspaceRoot);
  const warnings = [];
  if (!workspaceInfo.exists) {
    warnings.push(
      `workspace root does not exist yet for ${project.id}; resolution is read-only and does not create it`,
    );
  }
  const scratchRoot = validation.scratchRoot;
  let scratchRootRecord = null;
  if (scratchRoot) {
    const projectPath = join(scratchRoot, project.id);
    const info = inspectPath(projectPath);
    scratchRootRecord = { path: scratchRoot, projectPath, exists: info.exists, state: stateOf(info) };
    if (!inspectPath(scratchRoot).exists) {
      warnings.push("the host scratch root does not exist yet; resolution is read-only and does not create it");
    }
  }
  let brain = null;
  if (project.brainRoot) {
    const info = inspectPath(project.brainRoot);
    brain = {
      root: project.brainRoot,
      exists: info.exists,
      state: stateOf(info),
      workspaceInside: within(physicalOrResolved(project.brainRoot), workspaceRoot),
    };
    if (!info.exists) warnings.push("the brain root does not exist yet; resolution is read-only and does not create it");
  }
  const routes = {};
  for (const name of Object.keys(project.routes)) {
    if (project.notUsedRoutes.includes(name)) {
      routes[name] = {
        name,
        path: null,
        relativePath: null,
        location: null,
        exists: false,
        type: "unused",
        state: "not-used",
        entries: null,
        linkTarget: null,
        variant: null,
        warnings: [],
      };
      continue;
    }
    const where = routeLocation(name, project.id, workspaceRoot, project.routes[name], scratchRoot);
    routes[name] = describeRoute(name, where.base, where.relativePath, {
      location: where.location,
      plainNamesPreferred: Boolean(registry.plainNamesPreferred),
    });
    if (where.location === "scratch-root") {
      const legacy = join(workspaceRoot, project.routes[name]);
      if (inspectPath(legacy).exists) {
        routes[name].warnings.push(
          `the in-workspace folder ${legacy} still exists; new ${name} output goes under the scratch root and nothing is moved here`,
        );
      }
    }
    warnings.push(...routes[name].warnings.map((warning) => `${name}: ${warning}`));
  }
  let writer = null;
  if (project.writer) {
    let cwd = repoRoot;
    if (project.writer.cwd === "projectRoot") {
      cwd = projectRoot;
    } else if (project.writer.cwd && project.writer.cwd !== "repoRoot") {
      cwd = resolve(expandPath(project.writer.cwd, env));
    }
    writer = { ...project.writer, cwd };
  }
  const optionalRoots = {
    data: project.dataRoots.map((root) => describeOptionalRoot(root, env, workspaceRoot)),
    design: project.designRoots.map((root) => describeOptionalRoot(root, env, workspaceRoot)),
    shared: describeSharedRoots(registry, env),
  };

  return {
    resolver: RESOLVER_ID,
    action: "resolve",
    readOnly: true,
    registry: {
      path: loaded.path,
      source: loaded.source,
      schemaVersion: registry.schemaVersion,
    },
    project: {
      id: project.id,
      identity: {
        matchedRemote: remote.name,
        slug: remote.slug,
        url: remote.url,
        registeredRemotes: project.remotes,
      },
      cwd: startDir,
      repoRoot,
      projectRoot,
      worktree: worktrees.find((worktree) => within(worktree, startDir)) ?? null,
      worktreeCount: worktrees.length,
      trackedRoutes: project.trackedRoutes.map((route) => {
        const path = resolve(projectRoot, route.path);
        const info = within(projectRoot, path) ? inspectPath(path) : { exists: false, type: "unreadable", entries: null };
        return { ...route, path, exists: info.exists, state: stateOf(info), entries: info.entries };
      }),
      notes: project.notes,
    },
    workspace: {
      root: workspaceRoot,
      parent: dirname(workspaceRoot),
      exists: workspaceInfo.exists,
      placement,
      override,
    },
    brain,
    scratchRoot: scratchRootRecord,
    routes,
    writer,
    optionalRoots,
    warnings,
  };
}

/**
 * Host-wide roots any project may read, such as a cross-project design library.
 * Validation requires absolute paths, so no workspace root is needed to place them.
 */
function describeSharedRoots(registry, env) {
  return (registry.sharedRoots ?? []).map((root) =>
    describeOptionalRoot({ scope: "shared", ...root }, env, null),
  );
}

function describeOptionalRoot(root, env, workspaceRoot) {
  const defined = typeof root === "string" ? { id: root, path: root } : root ?? {};
  const raw = defined.path ? expandPath(String(defined.path), env) : null;
  if (!raw) {
    return { id: defined.id ?? null, path: null, exists: false, state: "unconfigured", note: defined.note ?? null };
  }
  const path = isAbsolute(raw) || /^[A-Za-z]:/.test(raw) ? resolve(raw) : resolve(workspaceRoot, raw);
  const info = inspectPath(path);
  return {
    id: defined.id ?? null,
    path,
    scope: defined.scope ?? "project",
    env: defined.env ?? null,
    exists: info.exists,
    state: stateOf(info),
    entries: info.entries,
    note: defined.note ?? null,
  };
}

/* ---------------------------------------------------- design asset routes */

/**
 * A task or asset component is supplied by a caller, so it is untrusted: it may
 * name a nested relative path, and it may not be absolute, empty, or walk out
 * of the namespace with `.` or `..`. A `:` is refused because it opens an
 * alternate data stream on Windows.
 */
function safeComponent(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ResolutionError("asset-component-invalid", `${label} must be a non-empty relative path.`, {
      component: typeof value === "string" ? value : null,
    });
  }
  const raw = value.trim();
  if (isAbsolute(raw) || /^[A-Za-z]:/.test(raw)) {
    throw new ResolutionError("asset-component-invalid", `${label} must stay relative to the asset namespace.`, {
      component: raw,
    });
  }
  const segments = raw.split(/[\\/]/);
  const bad = segments.find(
    (segment) => segment === "" || segment === "." || segment === ".." || segment.includes(":"),
  );
  if (bad !== undefined) {
    throw new ResolutionError(
      "asset-component-invalid",
      `${label} must not carry an empty, current-directory or parent-directory segment, or a colon.`,
      { component: raw, segment: bad },
    );
  }
  return segments.join("/");
}

/**
 * A physical link that leaves its namespace is refused rather than followed, so
 * a link cannot smuggle an asset out of the directory that owns it. A path whose
 * physical form cannot be decided is reported as a warning instead of a guess.
 */
function containment(namespacePath, candidatePath) {
  let namespacePhysical;
  let candidatePhysical;
  try {
    namespacePhysical = physicalPath(namespacePath);
    candidatePhysical = physicalPath(candidatePath);
  } catch (error) {
    return { decided: false, detail: error.code ?? error.message };
  }
  return { decided: true, inside: within(namespacePhysical, candidatePhysical), namespacePhysical, candidatePhysical };
}

function assertInsideNamespace(namespacePath, candidatePath, label, warnings) {
  const check = containment(namespacePath, candidatePath);
  if (!check.decided) {
    warnings.push(`${label} could not be resolved physically (${check.detail}); no escape check was applied`);
    return;
  }
  if (!check.inside) {
    throw new ResolutionError("asset-namespace-escape", `${label} resolves outside the project asset namespace.`, {
      namespace: check.namespacePhysical,
      resolved: check.candidatePhysical,
    });
  }
}

function assetKindRecord(kind, { available, path, relativePath, namespacePath, task, asset, warnings }) {
  const info = inspectPath(path);
  const record = {
    kind,
    path,
    relativePath,
    available,
    exists: info.exists,
    type: info.type,
    state: stateOf(info),
    entries: info.entries,
    linkTarget: info.linkTarget,
    target: null,
    warnings: [],
  };
  if (!info.exists) {
    record.warnings.push("does not exist yet; resolution does not create it");
  } else {
    assertInsideNamespace(namespacePath, path, `the ${kind} route`, warnings);
  }
  if (task || asset) {
    const targetRelative = [relativePath, task, asset].filter(Boolean).join("/");
    const targetPath = join(path, task ?? "", asset ?? "");
    const targetInfo = inspectPath(targetPath);
    // Checked even when the leaf is missing: `physicalPath` resolves the
    // existing prefix, so a link part-way along the requested path is still
    // caught, while a plainly absent path stays a normal missing route.
    assertInsideNamespace(namespacePath, targetPath, `the ${kind} target`, warnings);
    record.target = {
      path: targetPath,
      relativePath: targetRelative,
      exists: targetInfo.exists,
      type: targetInfo.type,
      state: stateOf(targetInfo),
      entries: targetInfo.entries,
      linkTarget: targetInfo.linkTarget,
      warnings: targetInfo.exists ? [] : ["does not exist yet; resolution does not create it"],
    };
  }
  return record;
}

/**
 * Where new owned design assets live: one namespace per project, derived from
 * the resolver's stable project id beneath a selected configured design root.
 * It reports; it never creates a directory, copies content or moves an original.
 * A project with no configured design root has the capability absent, which is
 * a finding rather than a failure.
 */
export function assetRoutes({
  cwd = process.cwd(),
  registryPath,
  registry: providedRegistry,
  overrideRoot,
  env = process.env,
  task,
  asset,
} = {}) {
  const resolved = resolveWorkspace({ cwd, registryPath, registry: providedRegistry, overrideRoot, env });
  const taskComponent = task === undefined ? null : safeComponent(task, "the task component");
  const assetComponent = asset === undefined ? null : safeComponent(asset, "the asset component");
  const namespaceId = resolved.project.id;
  const warnings = [...resolved.warnings];
  const configured = resolved.optionalRoots.design.filter((root) => root.path);
  const selected = configured[0] ?? null;
  const routes = {};

  if (!selected) {
    for (const kind of ASSET_KINDS) {
      routes[kind] = {
        kind,
        path: null,
        relativePath: null,
        available: false,
        exists: false,
        type: "missing",
        state: "unconfigured",
        entries: null,
        linkTarget: null,
        target: null,
        warnings: ["no design root is configured; the design-asset capability is absent"],
      };
    }
    warnings.push(
      `${namespaceId} has no configured design root, so it has no source, working or export route; ` +
        "report the absence rather than creating one",
    );
    return {
      resolver: RESOLVER_ID,
      action: "assets",
      readOnly: true,
      registry: resolved.registry,
      project: {
        id: namespaceId,
        identity: resolved.project.identity,
        workspaceRoot: resolved.workspace.root,
        namespace: namespaceId,
      },
      designRoot: null,
      routes,
      warnings,
    };
  }

  if (configured.length > 1) {
    const named = configured.map((root) => root.id ?? "<unnamed>").join(", ");
    warnings.push(`more than one design root is configured (${named}); routes use the first, ${selected.id ?? "<unnamed>"}`);
  }
  if (!selected.exists) {
    warnings.push("the selected design root does not exist yet; resolution is read-only and does not create it");
  }

  const namespacePath = join(selected.path, namespaceId);
  const namespaceInfo = inspectPath(namespacePath);
  if (namespaceInfo.exists) {
    assertInsideNamespace(selected.path, namespacePath, "the project namespace", warnings);
  }

  for (const kind of ASSET_KINDS) {
    routes[kind] = assetKindRecord(kind, {
      available: true,
      path: join(selected.path, namespaceId, kind),
      relativePath: `${namespaceId}/${kind}`,
      namespacePath,
      task: taskComponent,
      asset: assetComponent,
      warnings,
    });
  }

  return {
    resolver: RESOLVER_ID,
    action: "assets",
    readOnly: true,
    registry: resolved.registry,
    project: {
      id: namespaceId,
      identity: resolved.project.identity,
      workspaceRoot: resolved.workspace.root,
      namespace: namespaceId,
    },
    designRoot: {
      id: selected.id,
      path: selected.path,
      scope: selected.scope,
      exists: selected.exists,
      state: selected.state,
      entries: selected.entries,
      note: selected.note,
      available: true,
      namespace: {
        path: namespacePath,
        relativePath: namespaceId,
        exists: namespaceInfo.exists,
        state: stateOf(namespaceInfo),
      },
    },
    routes,
    warnings,
  };
}

export function listProjects({ registryPath, registry: providedRegistry, env = process.env } = {}) {
  const loaded = providedRegistry
    ? { path: null, source: "provided", document: providedRegistry }
    : loadRegistry({ registryPath, env });
  const validation = validateRegistry(loaded.document, { env });
  if (!validation.ok) {
    throw new ResolutionError("registry-invalid", "Workspace registry failed validation.", {
      registry: loaded.path,
      errors: validation.errors,
    });
  }
  return {
    resolver: RESOLVER_ID,
    action: "projects",
    readOnly: true,
    registry: { path: loaded.path, source: loaded.source, schemaVersion: loaded.document.schemaVersion },
    sharedRoots: describeSharedRoots(loaded.document, env),
    scratchRoot: validation.scratchRoot,
    projects: validation.projects.map((project) => {
      let root = project.workspaceRoot;
      let info;
      let unresolvable = null;
      try {
        root = physicalPath(project.workspaceRoot);
        info = inspectPath(root);
      } catch (error) {
        unresolvable = error.message;
      }
      return {
        id: project.id,
        remotes: project.remotes,
        subdirectory: project.subdirectory,
        workspaceRoot: root,
        brainRoot: project.brainRoot,
        exists: info ? info.exists : false,
        state: info ? stateOf(info) : "unresolvable",
        unresolvable,
        routes: Object.fromEntries(
          Object.entries(project.routes).map(([name, path]) => {
            if (typeof path !== "string") return [name, null];
            const where = routeLocation(name, project.id, root, path, validation.scratchRoot);
            return [name, join(where.base, where.relativePath)];
          }),
        ),
      };
    }),
  };
}

export function checkRegistry({ registryPath, registry: providedRegistry, env = process.env } = {}) {
  const loaded = providedRegistry
    ? { path: null, source: "provided", document: providedRegistry }
    : loadRegistry({ registryPath, env });
  const validation = validateRegistry(loaded.document, { env });
  return {
    resolver: RESOLVER_ID,
    action: "check",
    readOnly: true,
    registry: { path: loaded.path, source: loaded.source, schemaVersion: loaded.document?.schemaVersion ?? null },
    ok: validation.ok,
    errors: validation.errors,
    warnings: validation.warnings,
    scratchRoot: validation.scratchRoot,
    projects: validation.projects.map((project) => ({
      id: project.id,
      workspaceRoot: project.workspaceRoot,
      brainRoot: project.brainRoot,
    })),
  };
}

/* -------------------------------------------------------------------- cli */

const USAGE =
  "Usage: node resolve-workspace.mjs [--registry <path>] [--cwd <dir>] [--workspace-root <path>] " +
  "resolve|projects|check|assets [--task <relative>] [--asset <relative>]";

export function run(argv, { env = process.env } = {}) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        registry: { type: "string" },
        cwd: { type: "string" },
        "workspace-root": { type: "string" },
        task: { type: "string" },
        asset: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      allowPositionals: true,
    });
  } catch (error) {
    return { exitCode: 2, stdout: "", stderr: `[workspace-resolution] ${error.message}\n${USAGE}\n` };
  }
  const [command, ...extra] = parsed.positionals;
  if (parsed.values.help || !command) {
    return { exitCode: parsed.values.help ? 0 : 2, stdout: `${USAGE}\n`, stderr: "" };
  }
  if (extra.length > 0 || !["resolve", "projects", "check", "assets"].includes(command)) {
    return { exitCode: 2, stdout: "", stderr: `[workspace-resolution] unknown command\n${USAGE}\n` };
  }
  const options = {
    registryPath: parsed.values.registry,
    cwd: parsed.values.cwd ? resolve(parsed.values.cwd) : process.cwd(),
    overrideRoot: parsed.values["workspace-root"],
    env,
  };
  try {
    let result;
    if (command === "resolve") {
      result = resolveWorkspace(options);
    } else if (command === "projects") {
      result = listProjects(options);
    } else if (command === "assets") {
      result = assetRoutes({ ...options, task: parsed.values.task, asset: parsed.values.asset });
    } else {
      result = checkRegistry(options);
    }
    return { exitCode: command === "check" && !result.ok ? 2 : 0, stdout: `${JSON.stringify(result, null, 2)}\n`, stderr: "" };
  } catch (error) {
    const payload = {
      resolver: RESOLVER_ID,
      action: command,
      readOnly: true,
      ok: false,
      error: { code: error.code ?? "error", message: error.message, details: error.details ?? {} },
    };
    return { exitCode: 2, stdout: `${JSON.stringify(payload, null, 2)}\n`, stderr: "" };
  }
}

// Compare real paths: Node runs a linked script from its real file, so through a
// junction or symlink the invoked path differs and main() would silently not run.
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const { exitCode, stdout, stderr } = run(process.argv.slice(2));
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  process.exitCode = exitCode;
}
