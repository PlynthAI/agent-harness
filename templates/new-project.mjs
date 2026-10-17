#!/usr/bin/env node
// Create a project from a harness template, and optionally seed its workspace
// and apply a design library profile.
//
//   node templates/new-project.mjs <template> <target-dir> [--name <project-name>]
//                                  [--workspace <workspace-root>] [--remote <owner/repo>]
//                                  [--design <profile-id>] [--library <design-library-root>]
//   node templates/new-project.mjs design <project-dir> --design <profile-id>
//                                  [--library <design-library-root>] [--remote <owner/repo>] [--force]
//
// Copies templates/<template>/ into <target-dir> (which must not exist or must be
// empty), skipping installed and generated folders, and replaces the
// __PROJECT_NAME__ placeholder in text files with the project name (default: the
// target folder's basename).
//
// With --workspace, it also seeds the project's external workspace at
// <workspace-root> from harness-docs-starter (AGENTS.md, README.md, LICENSE, the
// templates/ recipes and the empty route folders), fills the starter's project
// and root placeholders, points the project's PROJECT.md at that root, and
// prints the docs-workspace registry entry to add. The workspace root must be
// outside the project (a brain's Workspaces/<repo>/ is the usual place).
// Without --workspace, PROJECT.md says the workspace is not seeded yet.
//
// The design: every template ships the design library's Kit, applied the same
// way --design applies any other in-repo library profile. With --design, the
// copier reads <library>/profiles/<id>/profile.json and writes the project's
// DESIGN.md (the profile's DESIGN.md, named for the project), and in the
// template's design folder tokens.css, type.css (the profile's, beside its
// tokens.css, else the library Kit's foundations/kit/type.css), role-bridge.css,
// fonts.css (one @import per font package) and SOURCE.json (profile, library
// commit and each source file's sha256). It sets the design's font packages in
// package.json at the library's locked versions and drops the replaced design's.
// The library root is --library, else the docs-workspace registry's
// design-library shared root. It refuses a project's own profile (that is
// another project's authority) and a font with no installable package, before
// writing anything, and a profile path outside the library, a DESIGN.md without
// closed front matter and a role whose token the design does not declare. It never
// writes into the library; it prints the profile adapter and sources.local.json
// line the library needs to see the new project.
//
// The design command applies a profile to a project already created from a
// template: it finds the design folder by its SOURCE.json (refusing a folder
// without one, or one reached through a link), refuses when DESIGN.md or a design
// file differs from the hash SOURCE.json says was written (an edit; --force
// overwrites it), then writes the same files and package.json fonts as --design.
//
// It installs nothing and starts nothing; the printed next steps do that.
// The templates README lists what each template contains.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const starter = path.resolve(here, "..", "harness-docs-starter");
const resolver = path.resolve(here, "..", "skills", "docs-workspace", "scripts", "resolve-workspace.mjs");
const SKIP = new Set([
  "node_modules",
  ".cache",
  ".next",
  ".astro",
  "dist",
  "out",
  "playwright-report",
  "test-results",
  "tsconfig.tsbuildinfo",
  "next-env.d.ts",
]);
const TEXT = /\.(md|json|jsonc|yaml|yml|ts|tsx|mts|mjs|cjs|js|jsx|astro|css|html|svg|txt|toml|gitignore|gitattributes|editorconfig|prettierrc|prettierignore|npmrc|node-version)$|^\.(gitignore|gitattributes|editorconfig|prettierrc|prettierignore|npmrc|node-version)$/;
const NAME = /__PROJECT_NAME__/g;
// A DESIGN.md's front matter: opening and closing --- fences at the top of the file.
const FRONT = /^---\r?\n([\s\S]*?)\r?\n---/;
const WORKSPACE = /__WORKSPACE_ROOT__/g;
const WORKSPACE_FOLDERS = ["goals", "findings", "plans", "prds", "specs", "adrs", "features", ".artifacts", ".task-scratch"];
const NOT_SEEDED =
  "no workspace seeded yet (rerun the harness copier with --workspace <root>, or adopt one through harness-docs-starter)";
const OPTIONS = ["--name", "--workspace", "--remote", "--design", "--library"];
const FLAGS = ["--force"];
// A project name and a profile id: lowercase letters, digits and hyphens.
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
// The library Kit's type roles, written when a profile has no type.css of its own.
const KIT_TYPE = "foundations/kit/type.css";
// The files the design command overwrites, relative to the design folder (DESIGN.md is at the root).
const DESIGN_FILES = ["tokens.css", "type.css", "role-bridge.css", "fonts.css"];
// The selectors the templates switch dark mode on (the Kit's), for the printed library adapter.
const MODES = { light: [":root"], dark: [':root[data-theme="dark"]', ".dark"] };

function usage(message) {
  if (message) console.error(`error: ${message}\n`);
  console.error(
    "usage: node templates/new-project.mjs <template> <target-dir> [--name <project-name>] [--workspace <workspace-root>] [--remote <owner/repo>] [--design <profile-id>] [--library <design-library-root>]\n" +
      "       node templates/new-project.mjs design <project-dir> --design <profile-id> [--library <design-library-root>] [--remote <owner/repo>] [--force]",
  );
  const available = readdirSync(here).filter((entry) => statSync(path.join(here, entry)).isDirectory());
  console.error(`templates: ${available.join(", ")}`);
  process.exit(message ? 1 : 0);
}

function emptyOrAbsent(dir) {
  return !existsSync(dir) || readdirSync(dir).length === 0;
}

function inside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function posix(file) {
  return file.split(path.sep).join("/");
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

// DESIGN.md as written, hashed with the project name put back as the placeholder,
// so a template's SOURCE.json stays true in every copy of it.
function designWrittenHash(file, name) {
  const text = readFileSync(file, "utf8").replace(/^name: .*$/m, (line) => (line === `name: ${name}` ? "name: __PROJECT_NAME__" : line));
  return createHash("sha256").update(text).digest("hex");
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function replaceInTextFiles(dir, replace) {
  let touched = 0;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      touched += replaceInTextFiles(full, replace);
    } else if (TEXT.test(entry)) {
      const before = readFileSync(full, "utf8");
      const after = replace(before);
      if (after !== before) {
        writeFileSync(full, after);
        touched += 1;
      }
    }
  }
  return touched;
}

// The template's design folder: the folder named "design" that holds SOURCE.json.
// Symbolic links and junctions are not followed, so the folder is the project's own.
function findDesignDir(dir, base = dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = lstatSync(full);
    if (stat.isSymbolicLink() || !stat.isDirectory()) continue;
    const source = path.join(full, "SOURCE.json");
    if (entry === "design" && existsSync(source) && lstatSync(source).isFile()) return posix(path.relative(base, full));
    const found = findDesignDir(full, base);
    if (found) return found;
  }
  return null;
}

function libraryFromRegistry() {
  if (!existsSync(resolver)) return null;
  try {
    const listed = JSON.parse(execFileSync(process.execPath, [resolver, "projects"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
    return (listed.sharedRoots ?? []).find((root) => root.id === "design-library" && root.path)?.path ?? null;
  } catch {
    return null;
  }
}

function git(library, args) {
  try {
    return execFileSync("git", ["--no-optional-locks", "-C", library, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

// Everything --design will write, read and checked before anything is written.
function readDesign(library, id) {
  const profileFile = path.join(library, "profiles", id, "profile.json");
  if (!existsSync(profileFile)) usage(`no profile "${id}" in ${path.join(library, "profiles")}`);
  const profile = readJson(profileFile);
  if (profile.source?.repo !== "design-library") {
    usage(
      `profile "${id}" (${profile.name ?? id}) is another project's own authority, kept in ${profile.source?.repo ?? "another repository"}; ` +
        "only the library's in-repo designs apply (the Kit, and starters once they are library profiles)",
    );
  }
  const fonts = Object.entries(profile.fonts ?? {});
  const unpackaged = fonts.filter(([, font]) => !font.package);
  if (unpackaged.length > 0) {
    usage(
      `profile "${id}" names a font with no package, which cannot be installed:\n` +
        unpackaged.map(([face, font]) => `  ${face}: licence ${font.licence ?? "not recorded"}`).join("\n"),
    );
  }
  const lockFile = path.join(library, "package-lock.json");
  const locked = existsSync(lockFile) ? readJson(lockFile).packages ?? {} : {};
  const packages = new Map();
  for (const [face, font] of fonts) {
    const known = packages.get(font.package);
    if (known) {
      known.faces.push(face);
      continue;
    }
    const version = locked[`node_modules/${font.package}`]?.version;
    if (!version) usage(`font package ${font.package} (${face}) is not installed in the design library's package-lock.json`);
    packages.set(font.package, { faces: [face], version, licence: font.licence ?? "not recorded" });
  }
  const designMd = profile.inputs?.designMd;
  const css = profile.inputs?.css?.path;
  if (!designMd || !css) usage(`profile "${id}" has no inputs.designMd or inputs.css.path`);
  const typeCss = posix(path.join(path.dirname(css), "type.css"));
  const ownType = existsSync(path.join(library, typeCss));
  if (!ownType && !existsSync(path.join(library, KIT_TYPE))) {
    usage(`profile "${id}" has no type.css beside ${css}, and the library has no Kit type roles at ${KIT_TYPE} to write instead`);
  }
  const sources = {
    designMd,
    tokens: css,
    type: ownType ? typeCss : KIT_TYPE,
    bridge: `profiles/${id}/role-bridge.css`,
    profile: `profiles/${id}/profile.json`,
  };
  for (const from of Object.values(sources)) {
    if (from && !inside(path.resolve(library, from), path.resolve(library))) usage(`profile "${id}" names ${from}, which is outside the library`);
    if (from && !existsSync(path.join(library, from))) usage(`profile "${id}" names ${from}, which is missing from the library`);
  }
  const designText = readFileSync(path.join(library, designMd), "utf8");
  const front = designText.match(FRONT);
  if (!front || !/^name:/m.test(front[1])) usage(`${designMd} has no front matter (--- fences) with a name:`);
  // A role must point at a token the design declares; an undeclared one would fall back
  // to the template's alias of the role and cycle. A token only inside a comment is not declared.
  const tokensText = readFileSync(path.join(library, css), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const declared = new Set([...tokensText.matchAll(/(--[\w-]+)\s*:/g)].map(([, token]) => token));
  const undeclared = Object.entries(profile.roles ?? {}).filter(
    ([, target]) => typeof target === "string" && target.startsWith("css:") && !declared.has(target.slice(4)),
  );
  if (undeclared.length > 0) {
    usage(
      `profile "${id}" maps roles to tokens ${css} does not declare:\n` +
        undeclared.map(([role, target]) => `  ${role}: ${target.slice(4)}`).join("\n"),
    );
  }
  return { id, profile, packages, sources, ownType, designText };
}

function unquote(value) {
  if (value.startsWith('"')) return JSON.parse(value);
  if (value.startsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

// The profile's DESIGN.md, named for the project and described as applied here.
function projectDesign(text, name, profileName) {
  const front = text.match(FRONT);
  let block = front[1].replace(/^name:.*$/m, () => `name: ${name}`);
  const about = unquote(block.match(/^description:[ \t]*(.*)$/m)?.[1]?.trim() ?? "");
  const description = JSON.stringify(
    `This project's design authority: the design library's ${profileName} profile, applied by the harness project copier.${about ? ` ${about}` : ""}`,
  );
  block = /^description:/m.test(block)
    ? block.replace(/^description:.*$/m, () => `description: ${description}`)
    : block.replace(/^name:.*$/m, (line) => `${line}\ndescription: ${description}`);
  const start = front.index + front[0].indexOf(front[1]);
  return text.slice(0, start) + block + text.slice(start + front[1].length);
}

function fontImports(file) {
  return existsSync(file) ? [...readFileSync(file, "utf8").matchAll(/^@import "([^"]+)";/gm)].map(([, pkg]) => pkg) : [];
}

function applyDesign(design, library, target, designDir, name) {
  const { id, profile, packages, sources } = design;
  const folder = path.join(target, designDir);
  const replaced = fontImports(path.join(folder, "fonts.css"));

  writeFileSync(path.join(target, "DESIGN.md"), projectDesign(design.designText, name, profile.name ?? id));
  copyFileSync(path.join(library, sources.tokens), path.join(folder, "tokens.css"));
  copyFileSync(path.join(library, sources.type), path.join(folder, "type.css"));
  copyFileSync(path.join(library, sources.bridge), path.join(folder, "role-bridge.css"));
  writeFileSync(
    path.join(folder, "fonts.css"),
    "/* The applied design's font packages, written by the harness project copier from its library profile. */\n" +
      [...packages.keys()].map((pkg) => `@import "${pkg}";\n`).join(""),
  );

  const pkgFile = path.join(target, "package.json");
  const pkg = readJson(pkgFile);
  const before = JSON.stringify(pkg);
  const dependencies = { ...pkg.dependencies };
  for (const old of replaced) if (!packages.has(old)) delete dependencies[old];
  for (const [font, { version }] of packages) dependencies[font] = version;
  pkg.dependencies = Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  if (JSON.stringify(pkg) !== before) writeJson(pkgFile, pkg);

  const files = [
    { path: "DESIGN.md", from: sources.designMd },
    { path: `${designDir}/tokens.css`, from: sources.tokens },
    { path: `${designDir}/type.css`, from: sources.type },
    { path: `${designDir}/role-bridge.css`, from: sources.bridge },
    { path: `${designDir}/fonts.css`, from: sources.profile },
  ].map((entry) => {
    const written = entry.path === "DESIGN.md" ? designWrittenHash(path.join(target, entry.path), name) : sha256(path.join(target, entry.path));
    return { ...entry, sha256: sha256(path.join(library, entry.from)), written };
  });
  // A commit only when the library is its own repository, not a folder inside another one.
  const top = git(library, ["rev-parse", "--show-toplevel"]);
  const same = (a, b) => (process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b);
  const commit = top && same(path.resolve(top), path.resolve(library)) ? git(library, ["rev-parse", "HEAD"]) : null;
  const dirty = commit === null ? null : git(library, ["status", "--porcelain", "--", ...files.map((f) => f.from)]);
  writeJson(path.join(folder, "SOURCE.json"), {
    $comment:
      "What the harness project copier (new-project.mjs) applied from the design library. sha256 is each source file's hash at apply time and written the hash of the file as written here (DESIGN.md with its name line set back to the template placeholder); tokens.css, type.css and role-bridge.css are copied unchanged. To change the design, run node templates/new-project.mjs design <project-dir> --design <profile-id> from the harness checkout rather than editing these files.",
    profile: id,
    name: profile.name ?? id,
    library: { commit, workingTree: dirty === null ? null : dirty === "" ? "clean" : "modified" },
    files,
    fonts: profile.fonts ?? {},
    roles: profile.roles ?? {},
  });
  return { changedDependencies: JSON.stringify(pkg) !== before, commit };
}

// The library named by --library, else the registry's; checked before anything is written.
function resolveDesign() {
  if (options.library && !options.design) usage("--library needs --design <profile-id>");
  if (!options.design) return { library: null, design: null };
  if (!SLUG.test(options.design)) usage(`profile id "${options.design}" must be lowercase letters, digits and hyphens`);
  const library = options.library ? path.resolve(options.library) : libraryFromRegistry();
  if (!library) {
    usage("no design library: pass --library <path>, or register a design-library shared root in the docs-workspace registry");
  }
  if (!existsSync(path.join(library, "profiles"))) usage(`"${library}" is not a design library (no profiles folder)`);
  return { library, design: readDesign(library, options.design) };
}

// Applies the design and prints what it chose; returns whether package.json changed.
function applyAndReport(design, library, target, designDir, name) {
  const applied = applyDesign(design, library, target, designDir, name);
  const at = applied.commit ? ` at ${applied.commit.slice(0, 7)}` : "";
  console.log(`Applied the design library's ${design.profile.name ?? design.id} profile ("${design.id}") from ${library}${at} to DESIGN.md and ${designDir}/.`);
  if (!design.ownType) console.log(`The profile has no type.css, so ${designDir}/type.css is the library Kit's type roles (${design.sources.type}).`);
  console.log("Fonts (check each licence suits this project before it ships):");
  for (const [pkg, font] of design.packages) console.log(`  ${font.faces.join(", ")}: ${pkg} ${font.version}, licence ${font.licence}`);
  if (applied.changedDependencies) console.log("package.json dependencies changed, so pnpm-lock.yaml no longer matches: run pnpm install (not frozen) first.");
  return applied.changedDependencies;
}

// The design library registration: printed, never written.
function printAdapter(target, designDir, name) {
  const applied = readJson(path.join(target, designDir, "SOURCE.json"));
  const adapter = {
    $comment: `Adapter only: where ${name}'s design authority lives and which of its tokens fill the library's roles. Holds no token values.`,
    id: name,
    name,
    collection: name,
    surface: "<what this project is>",
    source: { repo: options.remote ?? `<owner>/${name}`, defaultPath: `../${name}` },
    authority: ["DESIGN.md", `${designDir}/tokens.css`, `${designDir}/type.css`, `${designDir}/role-bridge.css`],
    inputs: { designMd: "DESIGN.md", css: { path: `${designDir}/tokens.css`, ...MODES } },
    modes: ["light", "dark"],
    fonts: applied.fonts,
    roles: applied.roles,
  };
  console.log(
    `Register it with the design library (the copier never writes there): add profiles/${name}/profile.json with this adapter, then run the library's profile sync:`,
  );
  console.log(JSON.stringify(adapter, null, 2));
  console.log("and add this line to the library's sources.local.json:");
  console.log(`  ${JSON.stringify(name)}: ${JSON.stringify(posix(target))}`);
  return applied;
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) usage();
const positional = [];
const options = {};
for (let i = 0; i < args.length; i += 1) {
  if (FLAGS.includes(args[i])) {
    options[args[i].slice(2)] = true;
  } else if (OPTIONS.includes(args[i])) {
    if (args[i + 1] === undefined) usage(`${args[i]} needs a value`);
    options[args[i].slice(2)] = args[i + 1];
    i += 1;
  } else if (args[i].startsWith("--")) {
    usage(`unknown option ${args[i]}`);
  } else {
    positional.push(args[i]);
  }
}
if (positional.length > 2) usage(`unexpected argument "${positional[2]}"`);
if (options.remote && !/^[\w.-]+\/[\w.-]+$/.test(options.remote)) usage(`remote "${options.remote}" must be owner/repo`);

// The design files a previous apply wrote that have changed since, by SOURCE.json's written hashes.
function editedDesignFiles(target, designDir, name) {
  const sourceFile = `${designDir}/SOURCE.json`;
  let recorded;
  try {
    recorded = readJson(path.join(target, sourceFile)).files;
  } catch (error) {
    usage(`${sourceFile} is not valid JSON (${error.message}), so the design files cannot be checked for edits`);
  }
  if (!Array.isArray(recorded)) usage(`${sourceFile} has no files list, so the design files cannot be checked for edits`);
  const written = new Map(recorded.map((entry) => [entry?.path, entry?.written]));
  return ["DESIGN.md", ...DESIGN_FILES.map((file) => `${designDir}/${file}`)].filter((file) => {
    const full = path.join(target, file);
    if (!existsSync(full)) return false;
    const hash = file === "DESIGN.md" ? designWrittenHash(full, name) : sha256(full);
    return hash !== written.get(file);
  });
}

// design <project-dir>: apply a profile to a project created from a template.
if (positional[0] === "design") {
  const [, projectArg] = positional;
  if (!projectArg) usage("design needs the project directory");
  if (!options.design) usage("design needs --design <profile-id>");
  if (options.name || options.workspace) usage("design takes only --design, --library, --remote and --force");
  const target = path.resolve(projectArg);
  if (!existsSync(target) || !statSync(target).isDirectory()) usage(`project "${target}" is not a folder`);
  const designDir = findDesignDir(target);
  if (!designDir) usage(`"${target}" has no design folder with SOURCE.json, so it was not created from a harness template`);
  if (!inside(realpathSync(path.join(target, designDir)), realpathSync(target))) usage(`${designDir} resolves outside "${target}"`);
  const pkgFile = path.join(target, "package.json");
  const name = (existsSync(pkgFile) ? readJson(pkgFile).name : null) ?? path.basename(target);
  if (!SLUG.test(name)) usage(`project name "${name}" must be lowercase letters, digits and hyphens`);
  const edited = editedDesignFiles(target, designDir, name);
  if (edited.length > 0 && !options.force) {
    usage(
      `these files differ from what the last design apply wrote (${designDir}/SOURCE.json), so they look edited:\n` +
        edited.map((file) => `  ${file}`).join("\n") +
        "\nmove the edits into the design library profile, or rerun with --force to overwrite them",
    );
  }
  const { library, design } = resolveDesign();
  const changedDependencies = applyAndReport(design, library, target, designDir, name);
  printAdapter(target, designDir, name);
  console.log("Next:");
  console.log(
    changedDependencies
      ? "  pnpm install            # not frozen: the design changed package.json, so the lockfile is updated"
      : "  pnpm install --frozen-lockfile",
  );
  console.log("  pnpm run check          # lint, types, format, design lint, unit tests");
  console.log("  pnpm run test:e2e       # the design contract and the browser journey");
  process.exit(0);
}

const [template, targetArg] = positional;
if (!template || !targetArg) usage("template and target directory are required");
if (options.force) usage("--force applies only to the design command");

// Only a listed template name: a path such as ".." would copy the harness itself.
const available = readdirSync(here).filter((entry) => statSync(path.join(here, entry)).isDirectory());
if (!available.includes(template)) usage(`unknown template "${template}"`);
const source = path.join(here, template);

const target = path.resolve(targetArg);
if (!emptyOrAbsent(target)) usage(`target "${target}" exists and is not empty`);
if (inside(target, source)) usage("target cannot be inside the template");

const name = options.name ?? path.basename(target);
if (!SLUG.test(name)) usage(`project name "${name}" must be lowercase letters, digits and hyphens`);

const workspace = options.workspace ? path.resolve(options.workspace) : null;
if (workspace) {
  if (!existsSync(starter)) usage(`the docs starter is missing at ${starter}`);
  if (!emptyOrAbsent(workspace)) usage(`workspace "${workspace}" exists and is not empty`);
  if (inside(workspace, target) || inside(target, workspace)) usage("the workspace must be outside the project folder");
}

const designDir = findDesignDir(source);
if (!designDir) usage(`the ${template} template has no design folder with SOURCE.json`);
const { library, design } = resolveDesign();

// The project.
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true, filter: (entry) => !SKIP.has(path.basename(entry)) });
const workspaceText = workspace ? posix(workspace) : NOT_SEEDED;
const named = replaceInTextFiles(target, (text) => text.replace(NAME, name).replace(WORKSPACE, () => workspaceText));

console.log(`Created ${name} from the ${template} template at ${target} (${named} files filled in).`);

// The design.
const changedDependencies = design ? applyAndReport(design, library, target, designDir, name) : false;

// The workspace.
if (workspace) {
  mkdirSync(workspace, { recursive: true });
  for (const file of ["AGENTS.md", "README.md", "LICENSE"]) cpSync(path.join(starter, file), path.join(workspace, file));
  cpSync(path.join(starter, "templates"), path.join(workspace, "templates"), { recursive: true });
  for (const folder of WORKSPACE_FOLDERS) mkdirSync(path.join(workspace, folder), { recursive: true });
  const projectMap = posix(path.join(target, "PROJECT.md"));
  replaceInTextFiles(workspace, (text) =>
    text
      .replace(/<project>/g, name)
      .replace(/<workspace-root>/g, () => workspaceText)
      .replace("<repository PROJECT.md or existing facts owner>", () => projectMap),
  );
  const brainMarker = `${path.sep}Workspaces${path.sep}`;
  const brainRoot = workspace.includes(brainMarker) ? workspace.slice(0, workspace.indexOf(brainMarker)) : null;
  const entry = {
    id: name,
    identity: { remotes: [options.remote ?? `<owner>/${name}`] },
    workspaceRoot: workspace,
    ...(brainRoot ? { brainRoot } : {}),
    trackedRoutes: [],
    writer: null,
  };
  console.log(`Seeded the workspace at ${workspace} from harness-docs-starter.`);
  console.log("Register it: add this entry to the docs-workspace registry's projects (the skill's registry.json, or the machine override its registry-format reference names), then check it with resolve-workspace.mjs:");
  console.log(JSON.stringify(entry, null, 2));
}

const applied = printAdapter(target, designDir, name);

console.log("Next:");
console.log(`  cd ${target}`);
console.log("  git init                # tools such as Tailwind's source scan honour .gitignore only in a repository");
console.log(
  changedDependencies
    ? "  pnpm install            # not frozen: --design changed package.json, so the lockfile is updated"
    : "  pnpm install --frozen-lockfile",
);
console.log("  pnpm run check          # lint, types, format, design lint, unit tests");
console.log("  pnpm run dev:up         # start the dev server and print its URL");
console.log("  pnpm run test:e2e       # the template's browser journey");
console.log("Then read README.md and AGENTS.md.");
if (!workspace) console.log("No workspace was seeded; rerun with --workspace <root> when the project has a home for its records.");
console.log(
  `The design is the library's ${applied.name ?? applied.profile} profile. To apply another later, run node templates/new-project.mjs design <project-dir> --design <profile-id> from the harness checkout: any in-repo library profile, including the library's starters once they are profiles (the Kit is the only one today).`,
);
