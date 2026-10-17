#!/usr/bin/env node
// Skills-list discovery.
//
// Three different surfaces answer "which skills are there", and they disagree:
// the calling agent's own context (the thread surface, which this script cannot
// see), a freshly launched CLI runtime (`codex debug prompt-input`, whose home,
// model, plugins and sandbox can differ from a desktop task), and the installed
// files on disk. On 2026-10-05 the same machine gave 4, 140 and 375 entries.
// So every result names its `surface` and the `identity` behind it, and a
// runtime result is compared with the files on disk: what it shortened
// (`truncated`) and what it left out (`on_disk_not_listed`).
//
// Nothing is stored and nothing is merged: a name that resolves to more than one
// directory is reported as a duplicate, and one directory reached through more
// than one root is reported as an alias. Reading a skill never loads its body -
// only the frontmatter block is parsed.
import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTMATTER_CHUNK = 8192;
const FRONTMATTER_CEILING = 64 * 1024;
const FRONTMATTER_OPEN = /^\uFEFF?---\r?\n/;
const FRONTMATTER_CLOSED = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/;
// Deepest level below plugins/cache at which a shipped entry keeps its skills:
// the vendor/plugin/version/skills layout. Dot directories are skipped by
// listDirs, so a hidden .claude/skills beside a real one is never a root.
const PLUGIN_SCAN_DEPTH = 4;
// The plugin manager leaves randomly suffixed backup and install staging
// folders (plugin-backup-1uKmxr, plugin-install-hH8jhi) beside the installed
// versions. The runtime never lists their skills; scanning them only repeats
// older copies as duplicates.
const PLUGIN_STAGING = /^plugin-(backup|install)-/;
const PROJECT_SCAN_DEPTH = 8;

function listDirs(p) {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith('.'))
      .sort();
  } catch {
    return [];
  }
}

function realPathOrNull(p) {
  try {
    return realpathSync(p);
  } catch {
    return null;
  }
}

// Longest-prefix match from an absolute path back to the root that supplied it,
// so a runtime entry can be labelled with the kind of root it came from rather
// than the uninformative word "runtime".
function kindIndex(roots) {
  return roots
    .filter((root) => existsSync(root.path))
    .map((root) => ({ path: path.resolve(root.path), kind: root.kind }))
    .sort((a, b) => b.path.length - a.path.length);
}

function kindForPath(index, target) {
  const resolved = path.resolve(target);
  for (const entry of index) {
    if (resolved === entry.path || resolved.startsWith(entry.path + path.sep)) return entry.kind;
  }
  return 'runtime';
}

// Read in chunks until the closing delimiter arrives, so the body is never
// loaded. Some shipped skills carry frontmatter past 16 KiB, so a fixed first
// read cut them short; the ceiling only stops a file that never closes.
function readFrontmatterText(skillMdPath) {
  const fd = openSync(skillMdPath, 'r');
  try {
    const chunks = [];
    let total = 0;
    for (;;) {
      const chunk = Buffer.alloc(Math.min(FRONTMATTER_CHUNK, FRONTMATTER_CEILING - total));
      const read = readSync(fd, chunk, 0, chunk.length, null);
      if (read === 0) return { text: Buffer.concat(chunks).toString('utf8'), capped: false };
      chunks.push(chunk.subarray(0, read));
      total += read;
      const text = Buffer.concat(chunks).toString('utf8');
      if (!FRONTMATTER_OPEN.test(text) || FRONTMATTER_CLOSED.test(text)) return { text, capped: false };
      if (total >= FRONTMATTER_CEILING) return { text, capped: true };
    }
  } finally {
    closeSync(fd);
  }
}

// Frontmatter only. The body is never read, so listing a catalogue of a hundred
// skills does not load a hundred methods. `error` names why a file cannot stand
// as a skill, so a caller can report it instead of inventing a name for it.
export function readFrontmatter(skillMdPath) {
  const failed = (error) => ({ name: null, description: null, group: null, lead: false, frontmatter: false, error });
  let raw;
  let capped;
  try {
    ({ text: raw, capped } = readFrontmatterText(skillMdPath));
  } catch (error) {
    return failed(`unreadable: ${error.code ?? error.message}`);
  }
  if (!FRONTMATTER_OPEN.test(raw)) return failed('no frontmatter');
  const match = raw.match(FRONTMATTER_CLOSED);
  if (!match) return failed(capped ? `frontmatter is not closed within ${FRONTMATTER_CEILING} bytes` : 'frontmatter is not closed');
  const lines = match[1].split(/\r?\n/);
  const unquote = (value) => value.trim().replace(/^["']|["']$/g, '').trim();
  // A description is a YAML scalar: decode a double-quoted one (YAML's escapes,
  // so a source length is not inflated by them) or a single-quoted one ('' is
  // one quote); a plain scalar has no escapes. An unknown escape stays as written.
  const simpleEscapes = { '\\': '\\', '"': '"', '/': '/', ' ': ' ', n: '\n', t: '\t', r: '\r', '0': '\0', b: '\b', f: '\f', v: '\v', a: '\x07', e: '\x1b' };
  const decodeScalar = (value) => {
    const text = value.trim();
    if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
      return text.slice(1, -1).replace(/\\(?:x([0-9a-fA-F]{2})|u([0-9a-fA-F]{4})|U([0-9a-fA-F]{8})|(.))/g, (whole, x, u, U, other) => {
        const hex = x ?? u ?? U;
        if (hex) {
          const point = parseInt(hex, 16);
          return point <= 0x10ffff ? String.fromCodePoint(point) : whole;
        }
        return Object.hasOwn(simpleEscapes, other) ? simpleEscapes[other] : whole;
      });
    }
    if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
      return text.slice(1, -1).replace(/''/g, "'");
    }
    return text;
  };

  let name = null;
  let description = null;
  // `metadata.group` places the skill in a stage of the work; `metadata.lead`
  // marks the one skill that routes inside that group. Both are optional.
  let group = null;
  let lead = false;
  let inMetadata = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^metadata:\s*$/.test(lines[i])) { inMetadata = true; continue; }
    if (inMetadata) {
      if (!/^\s/.test(lines[i])) inMetadata = false;
      else {
        const groupMatch = lines[i].match(/^\s+group:\s*(.+?)\s*$/);
        if (groupMatch) group = unquote(groupMatch[1]);
        const leadMatch = lines[i].match(/^\s+lead:\s*(.+?)\s*$/);
        if (leadMatch) lead = unquote(leadMatch[1]) === 'true';
        continue;
      }
    }
    if (name === null) {
      const nameMatch = lines[i].match(/^name:\s*(.+?)\s*$/);
      if (nameMatch) name = unquote(nameMatch[1]);
    }
    if (description === null) {
      const descMatch = lines[i].match(/^description:\s*(.*)$/);
      if (descMatch) {
        const inline = descMatch[1].trim();
        if (inline === '' || /^[>|][+-]?$/.test(inline)) {
          const parts = [];
          for (let j = i + 1; j < lines.length; j += 1) {
            if (lines[j].trim() !== '' && !/^\s/.test(lines[j])) break;
            parts.push(lines[j].trim());
          }
          description = parts.join(' ').replace(/\s+/g, ' ').trim();
        } else {
          description = decodeScalar(inline);
        }
      }
    }
  }
  let error = null;
  if (!name) error = 'no name in frontmatter';
  else if (!description) error = 'no description in frontmatter';
  return { name, description, group, lead, frontmatter: true, error };
}

// Parse the skills block out of `codex debug prompt-input` output.
export function parseRuntimeInput(text) {
  let entries;
  try {
    entries = JSON.parse(text);
  } catch {
    throw new Error('runtime input was not JSON');
  }
  if (!Array.isArray(entries)) throw new Error('runtime input was not an array of messages');

  let block = null;
  for (const message of entries) {
    if (String(message?.role ?? '') === 'user') continue;
    const content = Array.isArray(message?.content) ? message.content : [{ text: message?.content }];
    const joined = content.map((part) => String(part?.text ?? '')).join('');
    if (joined.includes('<skills_instructions>')) {
      block = joined;
      break;
    }
  }
  if (block === null) return { roots: [], skills: [], blockFound: false };

  const roots = [];
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^- `([^`]+)` = `(.+)`\s*$/);
    if (m) roots.push({ id: m[1], path: m[2], kind: 'runtime' });
  }
  const rootById = new Map(roots.map((root) => [root.id, root.path]));

  const skills = [];
  for (const line of block.split(/\r?\n/)) {
    // A name may be namespaced by its plugin (`canva:canva-brand-check`) and a
    // description may carry its own colon, so the split is at the first colon
    // that is followed by a space, not at the first colon.
    const m = line.match(/^- (.+?): (.*?) \(file: ([^)]+)\)\s*$/);
    if (!m) continue;
    const file = m[3];
    const slash = file.indexOf('/');
    const rootId = slash === -1 ? file : file.slice(0, slash);
    const relative = slash === -1 ? '' : file.slice(slash + 1);
    const rootPath = rootById.get(rootId);
    // The runtime names the SKILL.md file; the catalogue reports the same shape
    // as the filesystem scan, so the two can be compared field by field.
    const skillMd = rootPath ? path.join(rootPath, relative) : file;
    skills.push({
      name: m[1].trim(),
      description: m[2].trim(),
      root: rootId,
      kind: 'runtime',
      path: path.dirname(skillMd),
      skill_md: skillMd,
    });
  }
  return { roots, skills, blockFound: true };
}

// Only the two top-level keys the identity reports are read from config.toml:
// `model` before the first table, and `skills.max_context_tokens` (as a dotted
// key or inside a [skills] table). A profile's model is not the default, so
// other tables are skipped. This is not a TOML parser and does not try to be.
// A missing file returns null so the caller can tell absent from empty.
export function readCodexConfig(configPath) {
  const found = { model: null, skills_max_context_tokens: null };
  let text;
  try {
    text = readFileSync(configPath, 'utf8');
  } catch {
    return null;
  }
  let table = '';
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, '').trim();
    if (line === '' || line.startsWith('#')) continue;
    const header = line.match(/^\[\s*([^\]]+?)\s*\]$/);
    if (header) { table = header[1]; continue; }
    // TOML allows a literal 'string' and digits separated by underscores.
    const model = line.match(/^model\s*=\s*(?:"([^"]*)"|'([^']*)')$/);
    if (table === '' && model) found.model = model[1] ?? model[2];
    const budget = table === 'skills'
      ? line.match(/^max_context_tokens\s*=\s*(\d+(?:_\d+)*)$/)
      : table === '' && line.match(/^skills\.max_context_tokens\s*=\s*(\d+(?:_\d+)*)$/);
    if (budget) found.skills_max_context_tokens = Number(budget[1].replace(/_/g, ''));
  }
  return found;
}

// Only Windows paths are case-insensitive; elsewhere two spellings are two files.
const foldCase = (value) => (process.platform === 'win32' ? value.toLowerCase() : value);

// The repository the working directory belongs to, from git itself, so a
// worktree or nested directory reports the checkout it is really in. An origin
// URL can carry a token in its userinfo, query or fragment; all three are
// dropped before reporting. A local path is not a URL, so a `#` or `?` in it
// stays: only an origin with a scheme is trimmed.
export function repositoryIdentity(cwd) {
  const git = (...args) => {
    const run = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true });
    return !run.error && run.status === 0 ? run.stdout.trim() : null;
  };
  const top = git('rev-parse', '--show-toplevel');
  if (!top) return null;
  const origin = git('remote', 'get-url', 'origin');
  return {
    top_level: path.resolve(top),
    origin: origin ? origin.replace(/^([a-z][a-z0-9+.-]*:\/\/)(?:[^@/]*@)?([^?#]*).*$/i, '$1$2') : null,
  };
}

// Who and what produced a result. user and home come from the operating system
// (os.userInfo, os.homedir); codex_home is the home the scan used and the runtime
// was launched with (CODEX_HOME, else ~/.codex); runtime is the launcher that
// answered and its `--version` line, null when no runtime measured the surface.
// model and skills.max_context_tokens come from the project's .codex/config.toml
// (at the git top level, else cwd), which Codex ranks above the user's
// config.toml; `sources` names the layer behind each value, or `unknown`.
// Trust state is not modelled: a present project file is read.
function buildIdentity({ cwd, codexHome, runtime }) {
  const repository = repositoryIdentity(cwd);
  const userPath = path.resolve(codexHome, 'config.toml');
  const projectPath = path.join(repository?.top_level ?? path.resolve(cwd), '.codex', 'config.toml');
  // Run from the home directory, the project file is the user file: one layer.
  const sameFile = foldCase(path.resolve(projectPath)) === foldCase(userPath);
  const layers = { project: sameFile ? null : readCodexConfig(projectPath), user: readCodexConfig(userPath) };
  const pick = (key) => {
    for (const layer of ['project', 'user']) {
      if (layers[layer]?.[key] != null) return { value: layers[layer][key], source: layer };
    }
    return { value: null, source: 'unknown' };
  };
  const model = pick('model');
  const budget = pick('skills_max_context_tokens');
  let user = null;
  try {
    user = os.userInfo().username;
  } catch {
    // Some containers run as a uid with no passwd entry; the rest still holds.
  }
  return {
    user,
    home: os.homedir(),
    codex_home: path.resolve(codexHome),
    runtime: runtime ? { command: runtime.command, version: runtime.version } : null,
    model: model.value,
    cwd: path.resolve(cwd),
    repository,
    skills_max_context_tokens: budget.value,
    config: { user: userPath, project: layers.project ? projectPath : null },
    sources: { model: model.source, skills_max_context_tokens: budget.source },
  };
}

// Lengths are compared on whitespace-collapsed text in code points, because a
// folded YAML description and a one-line rendering of it differ in spacing
// without either being shortened.
const visibleLength = (text) => Array.from(String(text).replace(/\s+/g, ' ').trim()).length;

export function defaultRoots({ cwd, codexHome, homeDir = os.homedir() }) {
  const roots = [
    { id: 'shared:codex', path: path.join(codexHome, 'skills'), kind: 'shared' },
    { id: 'shared:agents', path: path.join(homeDir, '.agents', 'skills'), kind: 'shared' },
    { id: 'system:codex', path: path.join(codexHome, 'skills', '.system'), kind: 'system' },
  ];

  // Plugin caches nest a `skills` directory at varying depth, so the scan looks
  // for the directory by name within a bounded depth rather than by a fixed path.
  const cache = path.join(codexHome, 'plugins', 'cache');
  const walk = (dir, depth) => {
    if (depth > PLUGIN_SCAN_DEPTH) return;
    for (const entry of listDirs(dir)) {
      if (PLUGIN_STAGING.test(entry)) continue;
      const child = path.join(dir, entry);
      if (entry === 'skills') {
        roots.push({ id: `plugin:${path.relative(cache, child).split(path.sep).join('/')}`, path: child, kind: 'plugin' });
        continue;
      }
      walk(child, depth + 1);
    }
  };
  walk(cache, 1);

  // Project roots: walk up to the repository boundary and collect every project
  // skill directory on the way, deepest first. Collecting the whole set rather
  // than stopping at the first hit is what keeps a nested directory that carries
  // its own skills from hiding the repository's: both are listed, and a name in
  // both becomes a duplicate instead of a silent shadow.
  //
  // The walk stops at the home directory under either spelling - the user-level
  // roots are listed separately, and a session must never inherit the profile's
  // skills as though they were the project's - and at the repository boundary,
  // because a skills directory above it belongs to the workspace, not the
  // project.
  const stopAt = new Set([path.resolve(homeDir), path.resolve(os.homedir())]);
  let dir = path.resolve(cwd);
  for (let depth = 0; depth < PROJECT_SCAN_DEPTH; depth += 1) {
    if (stopAt.has(dir)) break;
    for (const relative of [path.join('.codex', 'skills'), path.join('.agents', 'skills')]) {
      const candidate = path.join(dir, relative);
      if (!existsSync(candidate)) continue;
      roots.push({ id: `project:${candidate.split(path.sep).join('/')}`, path: candidate, kind: 'project' });
    }
    if (existsSync(path.join(dir, '.git'))) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return roots;
}

// A skill may nest methods: child folders whose entry file is METHOD.md, not
// SKILL.md, so neither runtime lists them as skills. They are reached through
// the skill that holds them and drawn beneath it as `<skill>/<method>`.
export function readMethods(skillDir) {
  return listDirs(skillDir)
    .filter((dirName) => existsSync(path.join(skillDir, dirName, 'METHOD.md')))
    .map((dirName) => {
      const front = readFrontmatter(path.join(skillDir, dirName, 'METHOD.md'));
      return { name: front.name || dirName, directory: dirName, description: front.description || '' };
    });
}

export function scanRoots(roots) {
  const skills = [];
  const aliases = [];
  const parseErrors = [];
  const seenReal = new Map();
  for (const root of roots) {
    const realRoot = realPathOrNull(root.path);
    if (realRoot === null) continue;
    if (realRoot !== path.resolve(root.path)) {
      aliases.push({ path: path.resolve(root.path), real: realRoot, root: root.id, kind: 'root' });
    }
    for (const dirName of listDirs(root.path)) {
      const dir = path.join(root.path, dirName);
      const skillMd = path.join(dir, 'SKILL.md');
      if (!existsSync(skillMd)) continue;
      const front = readFrontmatter(skillMd);
      // A file whose frontmatter cannot be read is reported, not listed under
      // its directory name with an empty description as if it were whole.
      if (front.error) {
        parseErrors.push({ path: path.resolve(skillMd), reason: front.error, kind: root.kind });
        continue;
      }
      const real = realPathOrNull(dir) ?? path.resolve(dir);
      const entry = {
        name: front.name,
        directory: dirName,
        description: front.description,
        group: front.group,
        lead: front.lead,
        path: path.resolve(dir),
        skill_md: path.resolve(skillMd),
        root: root.id,
        kind: root.kind,
        methods: readMethods(dir),
      };
      if (seenReal.has(real)) {
        // One directory, two roots: report the alias and list the skill once.
        aliases.push({ path: entry.path, real, root: root.id, also_in: seenReal.get(real).root, kind: 'skill' });
        continue;
      }
      seenReal.set(real, entry);
      skills.push(entry);
    }
  }
  return { skills, aliases, parse_errors: parseErrors };
}

export function findDuplicates(skills) {
  const byName = new Map();
  for (const skill of skills) {
    if (!byName.has(skill.name)) byName.set(skill.name, []);
    byName.get(skill.name).push(skill);
  }
  const duplicates = [];
  for (const [name, entries] of byName) {
    const paths = [...new Set(entries.map((entry) => entry.path))];
    if (paths.length < 2) continue;
    duplicates.push({
      name,
      paths,
      roots: [...new Set(entries.map((entry) => entry.root))].sort(),
      kinds: [...new Set(entries.map((entry) => entry.kind))].sort(),
    });
  }
  return duplicates.sort((a, b) => a.name.localeCompare(b.name));
}

// Node refuses to spawn a .cmd or .bat file directly (EINVAL), so on Windows a
// batch launcher runs through cmd.exe /d /s /c with the whole line quoted, the
// same wrapper the harness checks use. The arguments are fixed here; only the
// launcher path comes from the caller, and one that cmd.exe would reinterpret
// is refused rather than quoted.
function launch(candidate, args) {
  if (process.platform !== 'win32' || !/\.(cmd|bat)$/i.test(candidate)) return [candidate, args, {}];
  if (/["%]/.test(candidate)) throw new Error(`launcher path cmd.exe would reinterpret: ${candidate}`);
  return [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `""${candidate}" ${args.join(' ')}"`], { windowsVerbatimArguments: true }];
}

// The child gets CODEX_HOME set to the home this run scans, so the runtime and
// the comparison read the same installation and the identity names it truly.
// The time limit stops a stalled CLI: spawnSync blocks the event loop, so no
// outer timer could fire while it waits.
function runCli(candidate, args, cwd, codexHome, timeoutMs) {
  const [file, argv, options] = launch(candidate, args);
  return spawnSync(file, argv, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
    timeout: timeoutMs,
    env: codexHome ? { ...process.env, CODEX_HOME: codexHome } : process.env,
    ...options,
  });
}

export function runRuntime(cwd, command = 'codex', codexHome = null, timeoutMs = 120000) {
  // No shell resolves the name: on Windows the CLI is a shim, so the .cmd
  // spelling is tried second, and only that launcher goes through cmd.exe.
  const attempts = process.platform === 'win32' && !/\.(cmd|bat)$/i.test(command) ? [command, `${command}.cmd`] : [command];
  let failure = null;
  for (const candidate of attempts) {
    const result = runCli(candidate, ['debug', 'prompt-input'], cwd, codexHome, timeoutMs);
    if (!result.error && result.status === 0) {
      // Asked once, through the launcher that just answered, so the version
      // belongs to the same binary. A CLI that cannot say leaves it null.
      const versionRun = runCli(candidate, ['--version'], cwd, codexHome, timeoutMs);
      const version = !versionRun.error && versionRun.status === 0 ? versionRun.stdout.trim().split(/\r?\n/)[0] || null : null;
      return { ...parseRuntimeInput(result.stdout), command: candidate, version };
    }
    failure = result.error?.message ?? `exit ${result.status}`;
  }
  throw new Error(`runtime discovery unavailable: ${failure}`);
}

export function discover({
  cwd = process.cwd(),
  source = 'auto',
  extraRoots = [],
  includeDefaultRoots = true,
  command = 'codex',
  homeDir = os.homedir(),
  codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
} = {}) {
  const roots = [];
  if (includeDefaultRoots) roots.push(...defaultRoots({ cwd, codexHome, homeDir }));
  for (const extra of extraRoots) roots.push({ id: `explicit:${extra}`, path: extra, kind: 'explicit' });

  const reasons = [];
  if (source === 'auto' || source === 'runtime') {
    try {
      const runtime = runRuntime(cwd, command, codexHome);
      if (!runtime.blockFound || runtime.skills.length === 0) throw new Error('the runtime listed no skills');
      const scanned = scanRoots(roots);
      // The runtime's own roots and rows are re-labelled with the kind of the
      // root they came from, and given the fields the filesystem scan carries,
      // so an answer from either source can be read the same way.
      const index = kindIndex(roots);
      const runtimeRoots = runtime.roots.map((root) => ({
        id: root.id,
        path: root.path,
        kind: kindForPath(index, root.path),
        exists: existsSync(root.path),
      }));
      // The runtime line carries no group, so the group and lead flag come from
      // the frontmatter on disk when the file is there: frontmatter only, never
      // the body.
      const truncated = [];
      // A listed file may sit outside every scanned root, so its own
      // frontmatter error is reported too, once per file.
      const parseErrors = [...scanned.parse_errors];
      const reported = new Set(parseErrors.map((entry) => foldCase(entry.path)));
      const runtimeSkills = runtime.skills.map((skill) => {
        const front = existsSync(skill.skill_md) ? readFrontmatter(skill.skill_md) : { group: null, lead: false, description: null };
        const skillMd = path.resolve(skill.skill_md);
        if (front.error && !reported.has(foldCase(skillMd))) {
          reported.add(foldCase(skillMd));
          parseErrors.push({ path: skillMd, reason: front.error, kind: kindForPath(index, skill.path) });
        }
        // The catalogue budget shortens descriptions before it omits skills, and
        // a shortened trigger routes worse, so every shortening is reported.
        if (front.description && visibleLength(skill.description) < visibleLength(front.description)) {
          truncated.push({
            name: skill.name,
            rendered_length: visibleLength(skill.description),
            source_length: visibleLength(front.description),
            path: skill.path,
          });
        }
        return {
          ...skill,
          group: front.group,
          lead: front.lead,
          kind: kindForPath(index, skill.path),
          directory: path.basename(skill.path),
          methods: readMethods(skill.path),
        };
      });
      const listed = new Set(runtimeSkills.map((skill) => path.resolve(skill.path)));
      return {
        surface: 'cli-runtime',
        identity: buildIdentity({ cwd, codexHome, runtime }),
        cwd: path.resolve(cwd),
        roots: runtimeRoots,
        skills: runtimeSkills,
        duplicates: findDuplicates(runtimeSkills),
        aliases: scanned.aliases,
        on_disk_not_listed: scanned.skills
          .filter((skill) => !listed.has(path.resolve(skill.path)))
          .map((skill) => ({ name: skill.name, path: skill.path, kind: skill.kind })),
        listed_not_on_disk: runtimeSkills
          .filter((skill) => !existsSync(skill.path))
          .map((skill) => ({ name: skill.name, path: skill.path })),
        truncated,
        parse_errors: parseErrors,
        runtime_unavailable: [],
      };
    } catch (error) {
      if (source === 'runtime') throw error;
      reasons.push(error.message);
    }
  }

  const scanned = scanRoots(roots);
  return {
    // An inventory of installed files: it includes cached, inactive and
    // multiple-version packages and says nothing about what is enabled.
    surface: 'filesystem',
    identity: buildIdentity({ cwd, codexHome, runtime: null }),
    cwd: path.resolve(cwd),
    roots: roots.map((root) => ({ id: root.id, path: root.path, kind: root.kind, exists: existsSync(root.path) })),
    skills: scanned.skills,
    duplicates: findDuplicates(scanned.skills),
    aliases: scanned.aliases,
    on_disk_not_listed: [],
    listed_not_on_disk: [],
    truncated: [],
    parse_errors: scanned.parse_errors,
    runtime_unavailable: reasons,
  };
}

export function parseArgs(argv) {
  const options = { source: 'auto', cwd: process.cwd(), extraRoots: [], includeDefaultRoots: true, format: 'json', command: 'codex', help: false };
  let i = 0;
  const takeValue = (flag) => {
    const value = argv[++i];
    if (value === undefined || value === '') throw new Error(`${flag} needs a value`);
    return value;
  };
  for (i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source') options.source = takeValue(arg);
    else if (arg === '--cwd') options.cwd = takeValue(arg);
    else if (arg === '--root') options.extraRoots.push(takeValue(arg));
    else if (arg === '--codex') options.command = takeValue(arg);
    else if (arg === '--format') options.format = takeValue(arg);
    else if (arg === '--no-default-roots') options.includeDefaultRoots = false;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!['auto', 'runtime', 'filesystem'].includes(options.source)) throw new Error(`unknown source: ${options.source}`);
  if (!['json', 'text', 'tree'].includes(options.format)) throw new Error(`unknown format: ${options.format}`);
  return options;
}

// Groups by stage of the work, each led by the skill flagged `lead`, the other
// members and every member's nested methods (`design/<method>`,
// `writing/<method>`) below it alphabetically. Skills that declare no group close the tree under
// "ungrouped" so nothing discovered is hidden. The header counts skills only.
export function renderTree(result) {
  const groups = new Map();
  for (const skill of result.skills) {
    const key = skill.group || null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(skill);
  }
  const named = [...groups.keys()].filter((key) => key !== null).sort((a, b) => a.localeCompare(b));
  const order = groups.has(null) ? [...named, null] : named;
  // The header names the working directory and shared roots the answer was
  // read for, so a listing taken inside a sandbox or another profile is not
  // mistaken for this host's.
  const sharedRoots = (result.roots || []).filter((root) => root.kind === 'shared' && root.exists !== false).map((root) => slash(root.path));
  const where = [
    identitySummary(result.identity),
    sharedRoots.length ? `shared ${sharedRoots.join(', ')}` : null,
  ].filter(Boolean).join('; ');
  const lines = [`${named.length} group(s), ${result.skills.length} skill(s) from ${result.surface}${where ? ` (${where})` : ''}`];
  for (const key of order) {
    const members = groups.get(key).slice().sort((a, b) => a.name.localeCompare(b.name));
    const lead = key === null ? undefined : members.find((skill) => skill.lead);
    const methods = members.flatMap((skill) => (skill.methods || []).map((method) => ({ ...method, name: `${skill.name}/${method.name}` })));
    const leaves = [...members.filter((skill) => skill !== lead), ...methods].sort((a, b) => a.name.localeCompare(b.name));
    lines.push(lead ? `${key} ─ ${lead.name}: ${lead.description}` : (key ?? 'ungrouped'));
    leaves.forEach((skill, index) => {
      const branch = index === leaves.length - 1 ? '└─' : '├─';
      lines.push(`  ${branch} ${skill.name}: ${skill.description}`);
    });
  }
  // A skill the tree could not read still shows, so a missing entry is explained.
  for (const failure of result.parse_errors || []) lines.push(`parse error: ${slash(failure.path)}: ${failure.reason}`);
  lines.push(...comparisonLines(result));
  return `${lines.join('\n')}\n`;
}

const slash = (value) => String(value).replace(/\\/g, '/');

// One line naming who and what produced the answer, shared by text and tree.
export function identitySummary(identity) {
  const runtime = identity.runtime ? `${identity.runtime.command} (${identity.runtime.version ?? 'version unknown'})` : 'none';
  const repository = identity.repository
    ? `${slash(identity.repository.top_level)}${identity.repository.origin ? ` (origin ${identity.repository.origin})` : ''}`
    : 'none';
  // The config layer behind a value, so a project override is visible.
  const from = (key) => (identity.sources[key] === 'unknown' ? '' : ` (${identity.sources[key]} config)`);
  return [
    `user ${identity.user ?? 'unknown'}`,
    `home ${slash(identity.home)}`,
    `codex home ${slash(identity.codex_home)}`,
    `runtime ${runtime}`,
    `model ${identity.model ?? 'unknown'}${from('model')}`,
    `cwd ${slash(identity.cwd)}`,
    `repository ${repository}`,
    `skills.max_context_tokens ${identity.skills_max_context_tokens ?? 'unset'}${from('skills_max_context_tokens')}`,
  ].join('; ');
}

// Only a runtime answer can be compared with the files on disk; a filesystem
// answer is the disk, so it prints no comparison rather than two zero counts.
function comparisonLines(result) {
  if (result.surface !== 'cli-runtime') return [];
  const lines = [`truncated descriptions: ${result.truncated.length}`];
  for (const entry of result.truncated) {
    lines.push(`  ${entry.name}: rendered ${entry.rendered_length} of ${entry.source_length} characters ${slash(entry.path)}`);
  }
  lines.push(`on disk, not listed: ${result.on_disk_not_listed.length}`);
  for (const entry of result.on_disk_not_listed) lines.push(`  ${entry.name} (${entry.kind}) ${slash(entry.path)}`);
  return lines;
}

function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write('usage: list-skills.mjs [--source auto|runtime|filesystem] [--cwd DIR] [--root DIR]... [--no-default-roots] [--codex PATH] [--format json|text|tree]\n');
    return 0;
  }
  const result = discover(options);
  if (options.format === 'tree') {
    process.stdout.write(renderTree(result));
    return 0;
  }
  if (options.format === 'text') {
    process.stdout.write(`${result.skills.length} skill(s)\n`);
    process.stdout.write(`surface: ${result.surface}\n`);
    process.stdout.write(`identity: ${identitySummary(result.identity)}\n`);
    for (const skill of result.skills.slice().sort((a, b) => a.name.localeCompare(b.name))) {
      process.stdout.write(`  ${skill.name} (${skill.kind}) ${skill.path}\n`);
    }
    for (const duplicate of result.duplicates) process.stdout.write(`  duplicate: ${duplicate.name} -> ${duplicate.paths.join(', ')}\n`);
    for (const alias of result.aliases) process.stdout.write(`  alias: ${alias.path} -> ${alias.real}\n`);
    for (const failure of result.parse_errors) process.stdout.write(`  parse error: ${failure.path}: ${failure.reason}\n`);
    for (const line of comparisonLines(result)) process.stdout.write(`${line}\n`);
    return 0;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return 0;
}

// Compared as real file paths: import.meta.url is percent-encoded and points at
// the real file behind a junction or symlink, so comparing it with the invoked
// path as given would quietly skip main() and exit 0 having done nothing.
const invokedDirectly = Boolean(process.argv[1]) && existsSync(process.argv[1])
  && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`list-skills: ${error.message}\n`);
    process.exitCode = 2;
  }
}
