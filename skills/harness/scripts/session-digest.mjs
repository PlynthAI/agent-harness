#!/usr/bin/env node
// Session digest: select agent session logs by their recorded working
// directory, stream each into a small Markdown digest, and roll a folder of
// digests into one aggregate ranked by spread across sessions. It never loads a
// log whole, and redacts token-shaped strings before anything is written. The
// method is references/retrospective.md ("Reading several sessions is opt-in").
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';

const USAGE = `Usage:
  node session-digest.mjs list      --cwd <dir> [selection]
  node session-digest.mjs digest    --out <dir> (--cwd <dir> [selection] | <log.jsonl>...)
  node session-digest.mjs aggregate --out <file.md> <digest-dir>

list       prints the matching sessions, newest first: runtime, last write,
           size, main or subagent, recorded cwd and file.
digest     writes one <runtime>-<session>.md per session into --out.
aggregate  rolls every digest in <digest-dir> into one file, ranked by the
           number of sessions an item appears in, then by its total count.

Selection (a session matches by the cwd its log records, never by text):
  --cwd <dir>         the repository; repeat for several. Matches that folder
                      and anything under it, so .claude/worktrees/<name> inside
                      the repository is included.
  --worktrees         also match worktrees kept outside the repository: a cwd
                      with a folder named exactly like the repository below a
                      folder whose name contains "worktrees" (.codex-worktrees,
                      .claude-worktrees, ~/.codex/worktrees/<id>/<repo>).
                      Another worktree folder can also be passed as a --cwd.
  --runtime <r>       codex, claude or all (default all).
  --last <n>          keep the n most recently written sessions.
  --since <date>      keep sessions written on or after YYYY-MM-DD.
  --min-mb <n>        keep sessions of at least n MB.
  --main-only         drop Codex subagent rollouts (they share the parent's cwd).
  --skill <name>      keep sessions that loaded this skill (a Skill call or a
                      SKILL.md read); repeat for any of several. A plugin
                      skill also matches by the name after its colon.
  --tool <name>       keep sessions that called this tool; repeat for any of
                      several. A trailing * matches a prefix (mcp__github__*).
                      --skill and --tool read each candidate log whole, newest
                      first, and --last then counts matching sessions only.
  --codex-root <dir>  default ~/.codex/sessions (rollout-*.jsonl by date).
  --claude-root <dir> default ~/.claude/projects (<slug>/*.jsonl).

Output:
  --out is required for digest and aggregate. Digests can carry private chat
  text, so writing inside a git checkout is refused unless the folder is
  git-ignored there or --allow-inside-repo is given. Treat digests as disposable
  evidence under the task's scratch route and delete them at closeout.

Exit 0 ok, 1 a log could not be read (the rest still written), 2 bad input.`;

class InputError extends Error {}
function fail(message) { throw new InputError(message); }

// ---- Paths ---------------------------------------------------------------
// Windows and POSIX paths compare in one form: forward slashes, no trailing
// slash, no \\?\ prefix, and a lower-case key when the path has a drive letter
// (Windows paths are case-insensitive; POSIX paths are not).

function slashes(p) {
  return String(p ?? '').trim().replace(/^\\\\\?\\/, '').replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1');
}
function pathKey(p) {
  const s = slashes(p);
  return /^[A-Za-z]:/.test(s) ? s.toLowerCase() : s;
}
function isUnder(child, parent) {
  return child === parent || child.startsWith(parent.endsWith('/') ? parent : `${parent}/`);
}

// A checkout of the repository kept outside it: a folder named exactly like the
// repository below a folder whose name contains "worktrees".
function isWorktreeOf(cwdKey, repoKey) {
  const name = repoKey.split('/').pop();
  const parts = cwdKey.split('/');
  const at = parts.indexOf(name);
  return at > 0 && parts.slice(0, at).some((part) => part.toLowerCase().includes('worktrees'));
}

// ---- Selection -----------------------------------------------------------

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else yield p;
  }
}

async function headLines(file, max, stop) {
  const stream = createReadStream(file, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let n = 0;
  try {
    for await (const line of rl) {
      n += 1;
      let j; try { j = JSON.parse(line); } catch { j = null; }
      if (j && stop(j)) return j;
      if (n >= max) break;
    }
  } finally { rl.close(); stream.destroy(); }
  return null;
}

async function sessionMeta(runtime, file) {
  if (runtime === 'codex') {
    const first = await headLines(file, 1, () => true);
    const p = first?.payload ?? {};
    return { cwd: p.cwd ?? first?.cwd ?? '', sub: Boolean(p.parent_thread_id || p.source?.subagent) };
  }
  const hit = await headLines(file, 200, (j) => typeof j.cwd === 'string' && j.cwd);
  return { cwd: hit?.cwd ?? '', sub: false };
}

function candidates(values) {
  const runtime = values.runtime ?? 'all';
  if (!['codex', 'claude', 'all'].includes(runtime)) fail('--runtime must be codex, claude or all');
  const found = [];
  if (runtime !== 'claude') {
    const root = values['codex-root'] ?? join(homedir(), '.codex', 'sessions');
    for (const file of walk(root)) if (/^rollout-.*\.jsonl$/.test(basename(file))) found.push({ runtime: 'codex', file });
  }
  if (runtime !== 'codex') {
    const root = values['claude-root'] ?? join(homedir(), '.claude', 'projects');
    let slugs = [];
    try { slugs = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch { /* no root */ }
    for (const d of slugs) {
      for (const f of readdirSync(join(root, d.name))) if (f.endsWith('.jsonl')) found.push({ runtime: 'claude', file: join(root, d.name, f) });
    }
  }
  return found;
}

function nonNegative(value, flag, whole) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || (whole && !Number.isInteger(n))) fail(`${flag} must be a ${whole ? 'whole ' : ''}number`);
  return n;
}

async function select(values) {
  const repos = (values.cwd ?? []).map(pathKey).filter(Boolean);
  if (repos.length === 0) fail('give the repository with --cwd <dir>');
  const last = nonNegative(values.last, '--last', true);
  const minMb = nonNegative(values['min-mb'], '--min-mb', false) ?? 0;
  let since = 0;
  if (values.since !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.since) || Number.isNaN(Date.parse(values.since))) fail('--since must be YYYY-MM-DD');
    since = new Date(`${values.since}T00:00:00`).getTime();
  }
  const matches = (cwd) => {
    const key = pathKey(cwd);
    return Boolean(key) && repos.some((repo) => isUnder(key, repo) || (values.worktrees && isWorktreeOf(key, repo)));
  };
  const picked = [];
  for (const c of candidates(values)) {
    const st = statSync(c.file);
    if (st.size === 0 || st.mtimeMs < since || st.size < minMb * 1048576) continue;
    const meta = await sessionMeta(c.runtime, c.file);
    if (!matches(meta.cwd) || (values['main-only'] && meta.sub)) continue;
    picked.push({ ...c, ...meta, mtimeMs: st.mtimeMs, size: st.size });
  }
  picked.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const wanted = contentFilter(values);
  if (!wanted) return last === undefined ? picked : picked.slice(0, last);
  // A skill or tool filter needs the whole log: digest newest first, keep the
  // digest for the caller, and stop once --last matching sessions are found.
  const kept = [];
  for (const c of picked) {
    if (last !== undefined && kept.length >= last) break;
    let digest;
    try { digest = await digestSession(c.file, c.runtime); } catch (error) {
      process.stderr.write(`[session-digest] cannot read ${c.file}: ${error.message}\n`);
      continue;
    }
    if (wanted(digest)) kept.push({ ...c, digest });
  }
  return kept;
}

// --skill and --tool: a session matches when it used any named skill or tool.
function contentFilter(values) {
  const skills = (values.skill ?? []).map((v) => v.trim().toLowerCase()).filter(Boolean);
  const tools = (values.tool ?? []).map((v) => v.trim()).filter(Boolean);
  if (skills.length === 0 && tools.length === 0) return null;
  const skillHit = (name) => {
    const n = name.toLowerCase();
    return skills.some((s) => n === s || n.split(':').pop() === s);
  };
  const toolHit = (name) => tools.some((t) => (t.endsWith('*') ? name.startsWith(t.slice(0, -1)) : name === t));
  return (d) => [...d.skills.keys()].some(skillHit) || [...d.tools.keys()].some(toolHit);
}

const megabytes = (bytes) => (bytes / 1048576).toFixed(1);

// ---- Reading one session --------------------------------------------------

// A path relative to the session's recorded cwd when it lies inside it;
// otherwise kept whole, so a sibling repository never merges into this one.
function normPath(raw, cwdKey) {
  let s = slashes(String(raw ?? '').replace(/^["']|["']$/g, ''));
  if (!s) return '';
  if (/^[a-z]:/.test(cwdKey)) s = s.replace(/^\/([A-Za-z])(\/|$)/, (_, d, rest) => `${d.toUpperCase()}:${rest || '/'}`);
  if (/^([A-Za-z]:|\/|~)/.test(s)) {
    const key = pathKey(s);
    if (cwdKey && key === cwdKey) return '.';
    if (cwdKey && isUnder(key, cwdKey)) return s.slice(cwdKey.length + 1);
    return s;
  }
  return s.replace(/^\.\//, '');
}

// A skill folder name; a shell variable such as ${n} or $n is not one.
const SKILL_FILE = /(?:^|\/)skills\/([A-Za-z0-9][\w.:-]*)\/SKILL\.md$/i;
const FILE_EXT = /\.(?:[cm]?[jt]sx?|json|mdx?|s?css|html?|ya?ml|toml|ps1|psm1|py|sql|svg|txt|sh|rs|go|java|rb|php|vue|svelte|xml|csv|ini|cfg|conf|env|lock)$/i;
const SEARCH_WORDS = new Set(['rg', 'grep', 'egrep', 'findstr', 'select-string', 'sls', 'find', 'fd', 'get-childitem', 'gci', 'ls', 'dir', 'tree']);
const READ_WORDS = new Set(['cat', 'type', 'gc', 'get-content', 'head', 'tail', 'less', 'more', 'bat', 'nl']);

// Split a shell command into its simple commands, outside quotes.
function segments(command) {
  const parts = [];
  let cur = '';
  let quote = '';
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i];
    if (quote) { if (ch === quote) quote = ''; cur += ch; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === ';' || ch === '|' || ch === '&' || ch === '\n') { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function tokens(segment) {
  return [...segment.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3]);
}

// What a simple command does: 'search', 'read' or nothing.
function shellKind(segment) {
  const words = tokens(segment.replace(/^[({\s]+/, '')).filter((w) => !/^\w+=/.test(w));
  const name = (words[0] ?? '').split(/[\\/]/).pop().toLowerCase().replace(/\.exe$/, '');
  if (name === 'git' && ['grep', 'ls-files'].includes(words[1])) return 'search';
  if (SEARCH_WORDS.has(name)) return 'search';
  if (READ_WORDS.has(name) || (name === 'sed' && words.includes('-n'))) return 'read';
  return '';
}

// ---- Redaction -----------------------------------------------------------
// Users paste secrets into chats. Token-shaped strings are replaced before any
// text is clipped (so a cut cannot leave a fragment) and again over every file
// before it is written. A prefix inside a longer word (task-..., desk-...) is
// not a token.

const REDACTED = '[REDACTED]';
const SECRETS = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/g, `Bearer ${REDACTED}`],
  [/(?<![A-Za-z0-9])hf_[A-Za-z0-9]{20,}/g, REDACTED],
  [/(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}/g, REDACTED],
  [/(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{20,}/g, REDACTED],
  [/(?<![A-Za-z0-9])github_pat_[A-Za-z0-9_]{20,}/g, REDACTED],
  [/(?<![A-Za-z0-9])xox[abposr]-[A-Za-z0-9-]{10,}/g, REDACTED],
  [/(?<![A-Za-z0-9])(?:AKIA|ASIA)[0-9A-Z]{16}(?![A-Za-z0-9])/g, REDACTED],
  // JWT-like: three long base64url parts joined by dots.
  [/(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, REDACTED],
];

function redact(text) {
  let s = String(text ?? '');
  for (const [pattern, replacement] of SECRETS) s = s.replace(pattern, replacement);
  return s;
}

function clip(s, n) {
  const flat = redact(s).replace(/\s+/g, ' ').trim();
  return flat.length > n ? `${flat.slice(0, n)} ...` : flat;
}

// Keys are single-line so a digest row always parses back as one row.
function inc(map, key, n = 1) { if (key) { const k = String(key).replace(/[\r\n]+/g, ' '); map.set(k, (map.get(k) ?? 0) + n); } }

const USER_CLIP = 500;
const HUNT_CAP = 40;
const HUNT_CLIP = 320;
// Context the runtime injects into a user entry is not something the user said.
const INJECTED = /^\s*(<system-reminder>|<environment_context>|<task-notification>|<local-command|<command-name>|<command-message>|<bash-input>|<bash-stdout>|<user_instructions>|<permissions|<turn_aborted>|\[SYSTEM NOTIFICATION|# AGENTS\.md|<INSTRUCTIONS>)/i;
const HUNT = /(where (is|are|does)|couldn'?t find|could not find|cannot find|can'?t find|unable to (find|locate)|no such file|not found|does not exist|doesn'?t exist|which file|let me (search|look for|find|locate)|searching for|looking for|not sure where|wrong (path|file|directory)|outdated|stale|misleading|no longer exists)/i;
const NOT_FOUND = /no such file|cannot find (path|the path|the file)|does not exist|not found|could not find|no such path/i;
const NO_MATCHES = /^No (matches|files) found/i;

function newDigest(file, runtime, size) {
  return { file, runtime, size, cwd: '', cwdKey: '', first: '', last: '', toolCalls: 0, agents: 0, malformed: 0,
    reads: new Map(), greps: new Map(), globs: new Map(), shellSearches: new Map(), shellReads: new Map(),
    skills: new Map(), tools: new Map(), toolFailures: new Map(), toolNames: new Map(), users: newUsers(), usersAlt: newUsers(), hunts: new Set(), lookupErrors: 0, emptySearches: 0,
    pending: new Map() };
}

// Raw count plus distinct messages, keyed by a hash of the whole text so a long
// paste is not held in memory and a re-sent entry is listed once.
function newUsers() { return { raw: 0, distinct: new Map() }; }
function addUser(users, text) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!flat || INJECTED.test(flat)) return;
  users.raw += 1;
  const key = createHash('sha1').update(flat).digest('hex');
  if (!users.distinct.has(key)) users.distinct.set(key, clip(flat, USER_CLIP));
}

function addHunt(d, text) {
  const s = redact(text);
  const m = s.match(HUNT);
  if (!m) return;
  d.hunts.add(clip(s.slice(Math.max(0, m.index - 120), m.index + 200), HUNT_CLIP));
}

const isSearchCommand = (command) => segments(String(command ?? '')).some((seg) => shellKind(seg) === 'search');

// One tool result: a search that found nothing (exit 1 with no output, or a
// "No matches found" reply) is an empty search; not-found text in a failed
// result is a lookup error. The second is a text match, so it stays noisy.
function result(d, { search, failed, exit, body }) {
  const text = String(body ?? '').trim();
  if ((search && exit === 1 && !text) || NO_MATCHES.test(text)) d.emptySearches += 1;
  else if (failed && NOT_FOUND.test(text)) d.lookupErrors += 1;
}

// Codex shell output: "Exit code: 1 ... Output:\n<body>", "Process exited with
// code 1 ...", or a JSON object with an exit code and the output.
function shellOutput(raw) {
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
  if (text.trimStart().startsWith('{')) {
    try {
      const o = JSON.parse(text);
      const exit = o.metadata?.exit_code ?? o.exit_code;
      return { exit: typeof exit === 'number' ? exit : undefined, body: o.output ?? '' };
    } catch { /* plain text */ }
  }
  const m = text.match(/(?:Exit code:?|exited with code)\s*(-?\d+)/i);
  const at = text.search(/Output:\r?\n/);
  return { exit: m ? Number(m[1]) : undefined, body: at >= 0 ? text.slice(at).replace(/^Output:\r?\n/, '') : text };
}

function readFile(d, raw) {
  const path = normPath(raw, d.cwdKey);
  if (!path) return;
  inc(d.reads, path);
  const skill = path.match(SKILL_FILE);
  if (skill) inc(d.skills, skill[1]);
}

// A compound command is counted once as a search and once as a read when it
// does both; the files it reads are counted from its read parts only.
function shell(d, command) {
  const text = String(command ?? '');
  if (!text.trim()) return;
  let searched = false;
  let read = false;
  for (const segment of segments(text)) {
    const kind = shellKind(segment);
    if (kind === 'search') searched = true;
    if (kind !== 'read') continue;
    read = true;
    for (const word of tokens(segment).slice(1)) {
      const candidate = word.replace(/[),;]+$/, '');
      if (!candidate.startsWith('-') && FILE_EXT.test(candidate)) readFile(d, candidate);
    }
  }
  if (searched) inc(d.shellSearches, clip(text, 220));
  if (read) inc(d.shellReads, clip(text, 220));
}

function shellCommandOf(args) {
  const c = args.cmd ?? args.command;
  if (typeof c === 'string') return c;
  if (!Array.isArray(c)) return '';
  // ["bash", "-lc", "<script>"] and the like run their last argument.
  return /^(ba|z)?sh$|^pwsh$|^powershell$|^cmd$/i.test(String(c[0]).split(/[\\/]/).pop().replace(/\.exe$/i, '')) ? String(c.at(-1)) : c.join(' ');
}

// The cmd strings of tools.exec_command({cmd: "..."}) calls in a Codex exec script.
function execCommands(script) {
  const found = [];
  const re = /exec_command\(\s*\{[^]*?\bcmd\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g;
  for (const m of String(script ?? '').matchAll(re)) {
    const literal = m[1];
    let value;
    if (literal.startsWith('"')) { try { value = JSON.parse(literal); } catch { value = null; } }
    found.push(value ?? literal.slice(1, -1).replace(/\\n/g, '\n').replace(/\\(["'`\\])/g, '$1'));
  }
  return found;
}

function codexRecord(d, j) {
  const p = j.payload ?? {};
  if (j.type === 'response_item' && p.type === 'function_call') {
    d.toolCalls += 1;
    inc(d.tools, p.name);
    d.toolNames.set(p.call_id, p.name);
    if (/^spawn_agents?(_batch)?$/.test(p.name)) d.agents += 1;
    let args = {};
    try { args = JSON.parse(p.arguments ?? '{}'); } catch { /* unreadable arguments */ }
    if (args && typeof args === 'object' && ('cmd' in args || 'command' in args)) {
      const command = shellCommandOf(args);
      shell(d, command);
      d.pending.set(p.call_id, [command]);
    }
  } else if (j.type === 'response_item' && p.type === 'function_call_output') {
    const name = d.toolNames.get(p.call_id);
    d.toolNames.delete(p.call_id);
    const commands = d.pending.get(p.call_id);
    if (!commands) return;
    d.pending.delete(p.call_id);
    const out = shellOutput(p.output);
    const failed = out.exit !== undefined && out.exit !== 0;
    if (failed) inc(d.toolFailures, name);
    result(d, { search: isSearchCommand(commands[0]), failed, ...out });
  } else if (j.type === 'response_item' && p.type === 'custom_tool_call') {
    // Only `exec` runs shell commands; the `js` browser REPL is not file navigation.
    const commands = p.name === 'exec' ? execCommands(p.input) : [];
    d.toolCalls += Math.max(1, commands.length);
    inc(d.tools, p.name);
    d.toolNames.set(p.call_id, p.name);
    for (const command of commands) shell(d, command);
    if (commands.length) d.pending.set(p.call_id, commands);
  } else if (j.type === 'response_item' && p.type === 'custom_tool_call_output') {
    const name = d.toolNames.get(p.call_id);
    d.toolNames.delete(p.call_id);
    const commands = d.pending.get(p.call_id);
    if (!commands) return;
    d.pending.delete(p.call_id);
    // Each exec_command result is one JSON chunk, in call order when all settle.
    const chunks = [];
    for (const item of Array.isArray(p.output) ? p.output : []) {
      let o;
      try { o = JSON.parse(String(item?.text ?? '')); } catch { continue; }
      if (o && typeof o.value === 'object' && o.value) o = o.value;
      if (o && typeof o === 'object' && 'exit_code' in o) chunks.push(o);
    }
    if (chunks.some((o) => o.exit_code !== 0)) inc(d.toolFailures, name);
    chunks.forEach((o, i) => {
      const search = chunks.length === commands.length ? isSearchCommand(commands[i]) : commands.some(isSearchCommand);
      result(d, { search, exit: o.exit_code, failed: o.exit_code !== 0, body: o.output });
    });
  } else if (j.type === 'event_msg' && p.type === 'user_message') {
    addUser(d.users, p.message);
  } else if (j.type === 'response_item' && p.type === 'message') {
    const text = (Array.isArray(p.content) ? p.content : []).map((c) => c?.text ?? '').join(' ');
    if (p.role === 'user') addUser(d.usersAlt, text);
    else if (p.role === 'assistant') addHunt(d, text);
  } else if (j.type === 'response_item' && p.type === 'agent_message') {
    addHunt(d, typeof p.content === 'string' ? p.content : (Array.isArray(p.content) ? p.content : []).map((c) => c?.text ?? '').join(' '));
  }
}

function claudeResultText(content) {
  if (typeof content === 'string') return content;
  return (Array.isArray(content) ? content : []).map((c) => (typeof c?.text === 'string' ? c.text : '')).join('\n');
}

function claudeRecord(d, j) {
  const content = Array.isArray(j.message?.content) ? j.message.content
    : typeof j.message?.content === 'string' ? [{ type: 'text', text: j.message.content }] : [];
  if (j.type === 'user' && !j.isMeta) {
    for (const c of content) {
      if (c.type === 'text') addUser(d.users, c.text);
      if (c.type !== 'tool_result') continue;
      const call = d.pending.get(c.tool_use_id);
      d.pending.delete(c.tool_use_id);
      const text = claudeResultText(c.content);
      const m = text.match(/^Exit code (-?\d+)\s*/);
      const failed = c.is_error === true || Boolean(m && m[1] !== '0');
      if (failed) inc(d.toolFailures, call?.name);
      result(d, { search: Boolean(call?.search), exit: m ? Number(m[1]) : undefined,
        failed, body: m ? text.slice(m[0].length) : text });
    }
  } else if (j.type === 'assistant') {
    for (const c of content) {
      if (c.type === 'text') { addHunt(d, c.text); continue; }
      if (c.type !== 'tool_use') continue;
      d.toolCalls += 1;
      inc(d.tools, c.name);
      const inp = c.input ?? {};
      d.pending.set(c.id, { name: c.name, search: c.name === 'Grep' || c.name === 'Glob'
        || ((c.name === 'Bash' || c.name === 'PowerShell') && isSearchCommand(inp.command)) });
      if (c.name === 'Read') readFile(d, inp.file_path);
      else if (c.name === 'Grep') inc(d.greps, `${clip(inp.pattern, 120)}  in ${normPath(inp.path, d.cwdKey) || '.'}${inp.glob ? `  glob ${inp.glob}` : ''}`);
      else if (c.name === 'Glob') inc(d.globs, `${clip(inp.pattern, 120)}  in ${normPath(inp.path, d.cwdKey) || '.'}`);
      else if (c.name === 'Bash' || c.name === 'PowerShell') shell(d, inp.command);
      else if (c.name === 'Skill' && inp.skill) inc(d.skills, String(inp.skill));
      else if (c.name === 'Agent' || c.name === 'Task') d.agents += 1;
    }
  }
}

async function digestSession(file, runtime) {
  const d = newDigest(file, runtime, statSync(file).size);
  const stream = createReadStream(file, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let j;
    try { j = JSON.parse(line); } catch { j = null; }
    if (!j || typeof j !== 'object') { d.malformed += 1; continue; }
    const ts = j.timestamp ?? j.payload?.timestamp;
    if (typeof ts === 'string') { if (!d.first) d.first = ts; d.last = ts; }
    if (!d.cwd) {
      const cwd = j.payload?.cwd ?? j.cwd;
      if (typeof cwd === 'string' && cwd) { d.cwd = cwd; d.cwdKey = pathKey(cwd); }
    }
    if (runtime === 'codex') codexRecord(d, j); else claudeRecord(d, j);
  }
  return d;
}

// Digests can carry private chat text. Refuse a target inside a git checkout
// unless the checkout ignores it or the caller says so.
function guardOutput(target, isDir, allow) {
  if (allow) return;
  const abs = resolve(target);
  let probe = isDir ? abs : dirname(abs);
  while (!existsSync(probe) && dirname(probe) !== probe) probe = dirname(probe);
  const top = spawnSync('git', ['-C', probe, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (top.error) {
    // No git to ask: refuse anywhere below a .git folder.
    for (let dir = probe; ; dir = dirname(dir)) {
      if (existsSync(join(dir, '.git'))) fail(`${target} is inside the git checkout ${dir}; pass --allow-inside-repo to write there`);
      if (dirname(dir) === dir) return;
    }
  }
  if (top.status !== 0) return;
  const root = top.stdout.trim();
  const rel = relative(resolve(root), abs).replace(/\\/g, '/');
  const ignored = rel && !rel.startsWith('..')
    && spawnSync('git', ['-C', root, 'check-ignore', '-q', '--no-index', isDir ? `${rel}/` : rel]).status === 0;
  if (!ignored) fail(`${target} is inside the git checkout ${root} and not ignored there; write under the task's scratch route, or pass --allow-inside-repo`);
}

async function digestCommand(values, files) {
  const outDir = values.out;
  if (!outDir) fail('digest needs --out <dir>');
  guardOutput(outDir, true, values['allow-inside-repo']);
  const sessions = files.length > 0
    ? files.map((file) => ({ file, runtime: /^rollout-.*\.jsonl$/.test(basename(file)) ? 'codex' : 'claude' }))
    : await select(values);
  mkdirSync(outDir, { recursive: true });
  // Logs named on the command line skip select(), so the filter applies here.
  const wanted = files.length > 0 ? contentFilter(values) : null;
  let unreadable = 0;
  let skipped = 0;
  for (const s of sessions) {
    let d;
    try { d = s.digest ?? await digestSession(s.file, s.runtime); } catch (error) {
      unreadable += 1;
      process.stderr.write(`[session-digest] cannot read ${s.file}: ${error.message}\n`);
      continue;
    }
    if (wanted && !wanted(d)) { skipped += 1; continue; }
    const name = basename(s.file, '.jsonl');
    const target = join(outDir, `${s.runtime}-${name}.md`);
    writeFileSync(target, redact(renderDigest(d, name)), 'utf8');
    process.stdout.write(`${s.runtime} ${name}: ${megabytes(d.size)} MB, ${d.toolCalls} tool calls, ${d.reads.size} files read\n`);
  }
  process.stdout.write(`${sessions.length - unreadable - skipped} digest(s) in ${outDir}\n`);
  return unreadable > 0 ? 1 : 0;
}

function top(map, n) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}
const total = (map) => [...map.values()].reduce((a, b) => a + b, 0);

const DIGEST_SECTIONS = [
  ['Files read', 'reads', 60],
  ['Grep patterns', 'greps', 60],
  ['Glob patterns', 'globs', 40],
  ['Shell searches', 'shellSearches', 60],
  ['Shell reads', 'shellReads', 40],
  ['Skills loaded', 'skills', 40],
  ['Tools used', 'tools', 60],
  ['Tool failures', 'toolFailures', 40],
];

function renderDigest(d, name) {
  // Codex records a user turn as an event and again as a response item; use
  // the events when there are any.
  const users = d.users.raw > 0 ? d.users : d.usersAlt;
  const hunts = [...d.hunts];
  const stats = { runtime: d.runtime, toolCalls: d.toolCalls, userRaw: users.raw, userDistinct: users.distinct.size,
    lookupErrors: d.lookupErrors, emptySearches: d.emptySearches, malformed: d.malformed };
  const lines = [`# Session digest: ${name}`, `<!-- session-digest ${JSON.stringify(stats)} -->`, '',
    `- runtime: ${d.runtime}`, `- file: ${d.file} (${megabytes(d.size)} MB)`, `- cwd: ${d.cwd}`, `- span: ${d.first} to ${d.last}`,
    `- tool calls: ${d.toolCalls}; subagents spawned: ${d.agents}`,
    `- searches: ${total(d.greps)} Grep, ${total(d.globs)} Glob, ${total(d.shellSearches)} shell`,
    `- lookup errors (noisy: not-found text in a failed result): ${d.lookupErrors}; empty searches (exit 1 with no output, or no matches): ${d.emptySearches}`,
    `- user messages: ${users.raw} raw, ${users.distinct.size} distinct (each clipped to ${USER_CLIP} characters)`,
    `- hunt snippets: ${hunts.length} distinct, first ${HUNT_CAP} listed (each clipped to ${HUNT_CLIP} characters)`,
    `- malformed lines skipped: ${d.malformed}`, ''];
  for (const [heading, key, cap] of DIGEST_SECTIONS) {
    lines.push(`## ${heading} (top ${cap})`, ...top(d[key], cap).map(([k, n]) => `- ${n}x ${k}`), '');
  }
  lines.push(`## Hunt or stale-lead snippets (first ${HUNT_CAP})`, ...hunts.slice(0, HUNT_CAP).map((h) => `- ${h}`), '');
  lines.push('## User messages (distinct, in order)', ...[...users.distinct.values()].map((u, i) => `${i + 1}. ${u}`), '');
  return `${lines.join('\n')}`;
}

// ---- Aggregate -----------------------------------------------------------

const AGGREGATE_ROWS = 80;
const AGGREGATE_HUNTS = 200;

function aggregate(dir) {
  let names;
  try { names = readdirSync(dir).filter((f) => f.endsWith('.md')).sort(); } catch (error) { fail(`cannot read ${dir}: ${error.message}`); }
  const headings = DIGEST_SECTIONS.map(([heading]) => heading);
  const totals = new Map(headings.map((h) => [h, new Map()]));
  const spread = new Map(headings.map((h) => [h, new Map()]));
  const sum = { codex: 0, claude: 0, toolCalls: 0, userRaw: 0, userDistinct: 0, lookupErrors: 0, emptySearches: 0, malformed: 0 };
  const hunts = [];
  let sessions = 0;
  for (const name of names) {
    const text = readFileSync(join(dir, name), 'utf8');
    // Only digests: an aggregate or note in the same folder is not read back.
    const meta = text.match(/^# Session digest: (.+)\r?\n<!-- session-digest (\{.*\}) -->/);
    if (!meta) continue;
    let stats;
    try { stats = JSON.parse(meta[2]); } catch { continue; }
    sessions += 1;
    sum[stats.runtime] = (sum[stats.runtime] ?? 0) + 1;
    for (const k of ['toolCalls', 'userRaw', 'userDistinct', 'lookupErrors', 'emptySearches', 'malformed']) sum[k] += Number(stats[k]) || 0;
    let current = '';
    for (const line of text.split(/\r?\n/)) {
      const h = line.match(/^## (.+?)(?: \(.*\))?$/);
      if (h) { current = h[1]; continue; }
      if (totals.has(current)) {
        const row = line.match(/^- (\d+)x (.+)$/);
        if (!row) continue;
        inc(totals.get(current), row[2], Number(row[1]));
        inc(spread.get(current), row[2]);
      } else if (current === 'Hunt or stale-lead snippets' && line.startsWith('- ')) {
        hunts.push(`${line.slice(2)}  [${meta[1]}]`);
      }
    }
  }
  if (sessions === 0) fail(`no session digests in ${dir}`);
  const step = Math.max(1, Math.ceil(hunts.length / AGGREGATE_HUNTS));
  const lines = [`# Aggregate of ${sessions} session digests`, '',
    `- sessions: ${sessions} (codex ${sum.codex}, claude ${sum.claude}); tool calls: ${sum.toolCalls}`,
    `- user messages: ${sum.userRaw} raw, ${sum.userDistinct} distinct`,
    `- lookup errors (noisy: not-found text in a failed result): ${sum.lookupErrors}; empty searches: ${sum.emptySearches}; malformed lines skipped: ${sum.malformed}`,
    '- ranking: the number of sessions an item appears in, then its total count.',
    `- caps: each digest lists up to ${HUNT_CAP} hunt snippets per session and its user messages clipped to ${USER_CLIP} characters, `
      + `and only its top rows per section; this file keeps the top ${AGGREGATE_ROWS} rows per section and an even sample of up to ${AGGREGATE_HUNTS} of the ${hunts.length} hunt snippets.`,
    ''];
  for (const heading of headings) {
    const rows = [...totals.get(heading).entries()]
      .map(([key, n]) => [key, spread.get(heading).get(key), n])
      .sort((a, b) => b[1] - a[1] || b[2] - a[2] || a[0].localeCompare(b[0]))
      .slice(0, AGGREGATE_ROWS);
    lines.push(`## ${heading} (by sessions, then total)`, ...rows.map(([key, n, count]) => `- in ${n} session${n === 1 ? '' : 's'}, ${count} total: ${key}`), '');
  }
  lines.push(`## Hunt or stale-lead snippets (sample of ${Math.min(hunts.length, AGGREGATE_HUNTS)})`,
    ...hunts.filter((_, i) => i % step === 0).slice(0, AGGREGATE_HUNTS).map((h) => `- ${h}`), '');
  return { text: lines.join('\n'), sessions };
}

function aggregateCommand(values, dirs) {
  if (!values.out) fail('aggregate needs --out <file.md>');
  if (dirs.length !== 1) fail('aggregate takes one digest folder');
  guardOutput(values.out, false, values['allow-inside-repo']);
  const { text, sessions } = aggregate(dirs[0]);
  mkdirSync(dirname(resolve(values.out)), { recursive: true });
  writeFileSync(values.out, redact(text), 'utf8');
  process.stdout.write(`${sessions} digest(s) -> ${values.out} (${(Buffer.byteLength(text) / 1024).toFixed(0)} KB)\n`);
  return 0;
}

function listText(sessions) {
  const rows = sessions.map((s) => `${s.runtime.padEnd(6)} ${new Date(s.mtimeMs).toISOString().slice(0, 16).replace('T', ' ')} `
    + `${megabytes(s.size).padStart(7)} MB  ${s.sub ? 'sub ' : 'main'}  ${s.cwd}\n       ${s.file}`);
  return `${rows.join('\n')}${rows.length ? '\n' : ''}${sessions.length} session(s)\n`;
}

const OPTIONS = {
  cwd: { type: 'string', multiple: true },
  worktrees: { type: 'boolean' },
  runtime: { type: 'string' },
  last: { type: 'string' },
  since: { type: 'string' },
  'min-mb': { type: 'string' },
  'main-only': { type: 'boolean' },
  skill: { type: 'string', multiple: true },
  tool: { type: 'string', multiple: true },
  'codex-root': { type: 'string' },
  'claude-root': { type: 'string' },
  out: { type: 'string' },
  'allow-inside-repo': { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
};

async function main() {
  let parsed;
  try {
    parsed = parseArgs({ args: process.argv.slice(2), allowPositionals: true, options: OPTIONS });
  } catch (error) {
    process.stderr.write(`[session-digest] ${error.message}\n${USAGE}\n`);
    return 2;
  }
  const [command] = parsed.positionals;
  if (parsed.values.help || !command || command === 'help') {
    process.stdout.write(`${USAGE}\n`);
    return parsed.values.help || command === 'help' ? 0 : 2;
  }
  try {
    if (command === 'list') {
      process.stdout.write(listText(await select(parsed.values)));
      return 0;
    }
    if (command === 'digest') return await digestCommand(parsed.values, parsed.positionals.slice(1));
    if (command === 'aggregate') return aggregateCommand(parsed.values, parsed.positionals.slice(1));
    fail(`unknown command: ${command}`);
  } catch (error) {
    if (!(error instanceof InputError)) throw error;
    process.stderr.write(`[session-digest] ${error.message}\n`);
    return 2;
  }
}

process.exitCode = await main();
