// Fixture coverage for scripts/session-digest.mjs, the multi-session
// retrospective's log reader. Every log here is an invented fixture written to a
// temporary folder; no real session log is read. Token-shaped values are built
// at runtime so no token-shaped literal sits in the repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, '..', 'scripts', 'session-digest.mjs');

const REPO = 'D:\\work\\example-app';
const SIBLING = 'D:\\work\\example-api';

function scratch() {
  const root = mkdtempSync(join(tmpdir(), 'session-digest-'));
  const codex = join(root, 'codex-sessions');
  const claude = join(root, 'claude-projects');
  const out = join(root, 'out');
  mkdirSync(codex, { recursive: true });
  mkdirSync(claude, { recursive: true });
  return { root, codex, claude, out, roots: ['--codex-root', codex, '--claude-root', claude],
    done: () => rmSync(root, { recursive: true, force: true }) };
}

const at = (minute) => `2026-10-01T10:${String(minute).padStart(2, '0')}:00.000Z`;

// A Codex rollout: the first line is session_meta with the recorded cwd; the
// rest are the given records, each { type, payload }.
function codexRollout(s, { name, cwd, day = '2026/10/01', records = [], mtime, meta = {} }) {
  const dir = join(s.codex, ...day.split('/'));
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `rollout-${name}.jsonl`);
  const lines = [{ timestamp: at(0), type: 'session_meta', payload: { id: name, cwd, base_instructions: { text: 'instructions' }, ...meta } },
    ...records.map((r, i) => ({ timestamp: at(i + 1), ...r }))];
  writeFileSync(file, lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n') + '\n');
  if (mtime) utimesSync(file, mtime, mtime);
  return file;
}

// A Claude Code transcript: the first lines carry no cwd, as real ones do.
function claudeTranscript(s, { name, cwd, slug = 'D--work-example-app', entries = [], mtime }) {
  const dir = join(s.claude, slug);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${name}.jsonl`);
  const lines = [{ type: 'summary', summary: 'earlier work' },
    ...entries.map((e, i) => (typeof e === 'string' ? e : { cwd, sessionId: name, timestamp: at(i + 1), ...e }))];
  writeFileSync(file, lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n') + '\n');
  if (mtime) utimesSync(file, mtime, mtime);
  return file;
}

const user = (text) => ({ type: 'user', message: { role: 'user', content: text } });
const assistant = (...content) => ({ type: 'assistant', message: { role: 'assistant', content } });
const toolUse = (id, name, input) => ({ type: 'tool_use', id, name, input });
const toolResult = (id, content, isError = false) => ({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content, is_error: isError }] } });

const fnCall = (callId, name, args) => ({ type: 'response_item', payload: { type: 'function_call', call_id: callId, name, arguments: JSON.stringify(args) } });
const fnOutput = (callId, output) => ({ type: 'response_item', payload: { type: 'function_call_output', call_id: callId, output } });
const execCall = (callId, input, name = 'exec') => ({ type: 'response_item', payload: { type: 'custom_tool_call', call_id: callId, name, input } });
const execOutput = (callId, chunks) => ({ type: 'response_item', payload: { type: 'custom_tool_call_output', call_id: callId,
  output: [{ type: 'input_text', text: 'Script completed\nWall time 0.1 seconds\nOutput:\n' },
    ...chunks.map(([exitCode, output]) => ({ type: 'input_text', text: JSON.stringify({ chunk_id: 'c1', wall_time_seconds: 0.1, exit_code: exitCode, original_token_count: 1, output }) }))] } });
const codexUser = (text) => ({ type: 'event_msg', payload: { type: 'user_message', message: text } });
const codexAssistant = (text) => ({ type: 'response_item', payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] } });
// One exec_command call as Codex writes it inside an exec script.
const cmd = (command) => `text(await tools.exec_command({cmd:${JSON.stringify(command)},"yield_time_ms":3500}));`;

function run(args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, out: `${r.stdout}\n${r.stderr}` };
}

function digestOf(s, args) {
  const r = run(['digest', ...s.roots, '--out', s.out, ...args]);
  assert.equal(r.status, 0, r.out);
  const files = readdirSync(s.out).filter((f) => f.endsWith('.md'));
  return Object.fromEntries(files.map((f) => [f, readFileSync(join(s.out, f), 'utf8')]));
}

function only(digests) {
  const values = Object.values(digests);
  assert.equal(values.length, 1, Object.keys(digests).join(', '));
  return values[0];
}

// The rows of one "## Heading" section, as "count|key" strings.
function section(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## ${heading}`));
  assert.ok(start >= 0, `no section ${heading}`);
  const rows = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    const m = line.match(/^- (\d+)x (.+)$/);
    if (m) rows.push(`${m[1]}|${m[2]}`);
  }
  return rows;
}

test('--help prints usage naming the subcommands and how to include worktrees', () => {
  const r = run(['--help']);
  assert.equal(r.status, 0, r.out);
  for (const word of ['list', 'digest', 'aggregate', '--cwd', '--worktrees', '--out', '--last', '--since', '--min-mb', '--runtime']) {
    assert.ok(r.stdout.includes(word), `usage lacks ${word}`);
  }
  assert.equal(run([]).status, 2);
});

test('sessions are selected by the cwd their log records, never by a text match', (t) => {
  const s = scratch(); t.after(s.done);
  // Instruction text naming the repository must not select a sibling's session.
  const named = codexRollout(s, { name: 'named', cwd: SIBLING, meta: { base_instructions: { text: `see ${REPO}` } } });
  const inRepo = codexRollout(s, { name: 'in-repo', cwd: REPO });
  const subfolder = codexRollout(s, { name: 'subfolder', cwd: `${REPO}\\apps\\web` });
  const lookalike = codexRollout(s, { name: 'lookalike', cwd: `${REPO}-old` });
  const nested = claudeTranscript(s, { name: 'nested', cwd: `${REPO}\\.claude\\worktrees\\fix-nav`, entries: [user('hello')] });
  // The slug names the repository but the recorded cwd is the sibling.
  const wrongSlug = claudeTranscript(s, { name: 'wrong-slug', cwd: SIBLING, entries: [user('hello')] });
  // A POSIX cwd and a trailing separator on --cwd select the same way.
  const posix = claudeTranscript(s, { name: 'posix', cwd: '/home/m/example-app', slug: '-home-m-example-app', entries: [user('hi')] });
  const r = run(['list', ...s.roots, '--cwd', `${REPO}\\`, '--cwd', '/home/m/example-app']);
  assert.equal(r.status, 0, r.out);
  for (const file of [inRepo, subfolder, nested, posix]) assert.ok(r.stdout.includes(file), `missing ${file}`);
  for (const file of [named, lookalike, wrongSlug]) assert.ok(!r.stdout.includes(file), `wrongly selected ${file}`);
  assert.equal(run(['list', ...s.roots]).status, 2, 'list without --cwd is bad input');
});

test('the selection is bounded by runtime, recency, date, size and main thread', (t) => {
  const s = scratch(); t.after(s.done);
  const old = codexRollout(s, { name: 'old', cwd: REPO, day: '2026/09/01', mtime: new Date('2026-09-01T10:00:00Z') });
  const sub = codexRollout(s, { name: 'sub', cwd: REPO, meta: { parent_thread_id: 'parent' }, mtime: new Date('2026-10-02T10:00:00Z') });
  const big = codexRollout(s, { name: 'big', cwd: REPO, records: [codexUser('x'.repeat(200_000))], mtime: new Date('2026-10-03T10:00:00Z') });
  const claude = claudeTranscript(s, { name: 'cc', cwd: REPO, entries: [user('hi')], mtime: new Date('2026-10-04T10:00:00Z') });
  const list = (...args) => run(['list', ...s.roots, '--cwd', REPO, ...args]).stdout;
  const has = (text, files) => files.map((f) => text.includes(f));
  assert.deepEqual(has(list(), [old, sub, big, claude]), [true, true, true, true]);
  assert.deepEqual(has(list('--last', '2'), [old, sub, big, claude]), [false, false, true, true]);
  assert.deepEqual(has(list('--since', '2026-10-01'), [old, sub, big, claude]), [false, true, true, true]);
  assert.deepEqual(has(list('--min-mb', '0.1'), [old, sub, big, claude]), [false, false, true, false]);
  assert.deepEqual(has(list('--runtime', 'claude'), [old, sub, big, claude]), [false, false, false, true]);
  assert.deepEqual(has(list('--main-only'), [old, sub, big, claude]), [true, false, true, true]);
  // Newest first, so the order of the full list follows the last write.
  const full = list();
  assert.ok(full.indexOf(claude) < full.indexOf(big) && full.indexOf(big) < full.indexOf(old));
  assert.equal(run(['list', ...s.roots, '--cwd', REPO, '--runtime', 'cursor']).status, 2);
  assert.equal(run(['list', ...s.roots, '--cwd', REPO, '--since', 'last week']).status, 2);
});

test('--worktrees adds checkouts of the same repository kept outside it, not its siblings', (t) => {
  const s = scratch(); t.after(s.done);
  const desktop = claudeTranscript(s, { name: 'desktop', slug: 'wt', cwd: 'D:\\work\\.claude-worktrees\\example-app\\fix-nav', entries: [user('a')] });
  const codexWt = codexRollout(s, { name: 'codex-wt', cwd: 'C:\\home\\m\\.codex\\worktrees\\ab12\\example-app' });
  const sibling = codexRollout(s, { name: 'sibling-wt', cwd: 'C:\\home\\m\\.codex\\worktrees\\cd34\\example-api' });
  const notWt = codexRollout(s, { name: 'not-wt', cwd: 'D:\\backup\\example-app' });
  const without = run(['list', ...s.roots, '--cwd', REPO]).stdout;
  const withWt = run(['list', ...s.roots, '--cwd', REPO, '--worktrees']).stdout;
  assert.ok(!without.includes(desktop) && !without.includes(codexWt));
  assert.ok(withWt.includes(desktop) && withWt.includes(codexWt), withWt);
  assert.ok(!withWt.includes(sibling) && !withWt.includes(notWt), withWt);
});

test('all three Codex shell shapes are read, and the js browser REPL is not file navigation', (t) => {
  const s = scratch(); t.after(s.done);
  codexRollout(s, { name: 'shapes', cwd: REPO, records: [
    fnCall('c1', 'exec_command', { cmd: 'rg -n "useNav" src' }),
    fnCall('c2', 'shell', { command: ['bash', '-lc', 'cat src/app.ts'] }),
    execCall('c3', `${cmd('Get-Content src/nav.ts; rg -n "Nav" src/components')}\n${cmd('ls src')}`),
    execCall('c4', 'const r = await tools.exec_command({cmd: "cat src/browser-only.ts"}); await page.goto("http://localhost:3000/a.html");', 'js'),
    fnCall('c5', 'spawn_agent', { message: 'look at src/agent-only.ts' }),
  ] });
  const d = only(digestOf(s, ['--cwd', REPO]));
  assert.deepEqual(section(d, 'Files read').sort(), ['1|src/app.ts', '1|src/nav.ts']);
  assert.deepEqual(section(d, 'Shell searches').sort(), ['1|Get-Content src/nav.ts; rg -n "Nav" src/components', '1|ls src', '1|rg -n "useNav" src']);
  // The compound command both reads and searches, so it is in both lists.
  assert.deepEqual(section(d, 'Shell reads').sort(), ['1|Get-Content src/nav.ts; rg -n "Nav" src/components', '1|cat src/app.ts']);
  assert.doesNotMatch(d, /browser-only|agent-only/);
  assert.match(d, /subagents spawned: 1/);
});

test('Claude Code Read, Grep, Glob, Bash and PowerShell calls are counted', (t) => {
  const s = scratch(); t.after(s.done);
  claudeTranscript(s, { name: 'tools', cwd: REPO, entries: [
    user('find the nav'),
    assistant(
      toolUse('t1', 'Read', { file_path: `${REPO}\\src\\nav.ts` }),
      toolUse('t2', 'Grep', { pattern: 'useNav', path: `${REPO}\\src`, glob: '*.tsx' }),
      toolUse('t3', 'Glob', { pattern: '**/*.css', path: REPO }),
      toolUse('t4', 'Bash', { command: 'cat src/nav.ts && grep -rn Nav src' }),
      toolUse('t5', 'PowerShell', { command: 'Get-ChildItem src -Recurse -Filter *.tsx' }),
      toolUse('t6', 'Edit', { file_path: `${REPO}\\src\\edited.ts`, old_string: 'a', new_string: 'b' }),
    ),
  ] });
  const d = only(digestOf(s, ['--cwd', REPO]));
  assert.deepEqual(section(d, 'Files read'), ['2|src/nav.ts']);
  assert.deepEqual(section(d, 'Grep patterns'), ['1|useNav  in src  glob *.tsx']);
  assert.deepEqual(section(d, 'Glob patterns'), ['1|**/*.css  in .']);
  assert.deepEqual(section(d, 'Shell searches').sort(), ['1|Get-ChildItem src -Recurse -Filter *.tsx', '1|cat src/nav.ts && grep -rn Nav src']);
  assert.deepEqual(section(d, 'Shell reads'), ['1|cat src/nav.ts && grep -rn Nav src']);
  assert.match(d, /tool calls: 6/);
});

test('a path in a sibling repository keeps its own namespace', (t) => {
  const s = scratch(); t.after(s.done);
  claudeTranscript(s, { name: 'paths', cwd: REPO, entries: [
    assistant(
      toolUse('t1', 'Read', { file_path: 'D:\\work\\example-api\\src\\nav.ts' }),
      toolUse('t2', 'Read', { file_path: 'D:\\work\\example-app\\src\\nav.ts' }),
      toolUse('t3', 'Read', { file_path: 'd:/work/example-app/src/nav.ts' }),
      toolUse('t4', 'Bash', { command: 'cat /d/work/example-app/src/nav.ts "D:\\work\\example-api\\docs\\Read Me.md"' }),
      toolUse('t5', 'Read', { file_path: 'D:\\work\\example-app-old\\src\\nav.ts' }),
    ),
  ] });
  const d = only(digestOf(s, ['--cwd', REPO]));
  assert.deepEqual(section(d, 'Files read').sort(), [
    '1|D:/work/example-api/docs/Read Me.md', '1|D:/work/example-api/src/nav.ts',
    '1|D:/work/example-app-old/src/nav.ts', '3|src/nav.ts']);
});

test('the skills counter holds only Skill calls and SKILL.md reads', (t) => {
  const s = scratch(); t.after(s.done);
  claudeTranscript(s, { name: 'skills', cwd: REPO, entries: [
    user('use /tdd and check </div> and $PATH please'),
    assistant(
      toolUse('t1', 'Skill', { skill: 'tdd' }),
      toolUse('t2', 'Skill', { skill: 'codex:rescue', args: '$HOME/div' }),
      toolUse('t3', 'Read', { file_path: 'C:\\harness\\skills\\design\\SKILL.md' }),
      toolUse('t4', 'Bash', { command: 'cat ~/.codex/skills/delivery/SKILL.md; echo $HOME/div; cat src/div.tsx' }),
      toolUse('t5', 'Read', { file_path: `${REPO}\\skills\\notes.md` }),
      // A loop variable in the path names no skill.
      toolUse('t6', 'Bash', { command: 'for n in a b; do cat skills/${n}/SKILL.md; cat "skills/$n/SKILL.md"; done' }),
    ),
  ] });
  codexRollout(s, { name: 'codex-skills', cwd: REPO, records: [
    codexUser('run $planner on <span>'),
    execCall('c1', cmd('Get-Content C:\\home\\m\\.codex\\skills\\planner\\SKILL.md')),
  ] });
  const digests = digestOf(s, ['--cwd', REPO]);
  const claude = Object.entries(digests).find(([f]) => f.startsWith('claude-'))[1];
  const codex = Object.entries(digests).find(([f]) => f.startsWith('codex-'))[1];
  assert.deepEqual(section(claude, 'Skills loaded').sort(), ['1|codex:rescue', '1|delivery', '1|design', '1|tdd']);
  assert.deepEqual(section(codex, 'Skills loaded'), ['1|planner']);
});

test('repeated user messages are listed once, with raw and distinct counts', (t) => {
  const s = scratch(); t.after(s.done);
  // Claude Code repeats user entries after compaction; injected context is not a user turn.
  claudeTranscript(s, { name: 'compacted', cwd: REPO, entries: [
    user('Where does the nav live?'), user('Fix the header'), user('Where does the nav  live?'),
    user('<system-reminder>context</system-reminder>'), user('Where does the nav live?'),
    { type: 'user', isMeta: true, message: { role: 'user', content: 'meta entry' } },
  ] });
  // Codex records each user turn as an event and again as a response item.
  codexRollout(s, { name: 'codex-turns', cwd: REPO, records: [
    codexUser('Ship it'), { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Ship it' }] } },
    { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: '<environment_context>cwd</environment_context>' }] } },
  ] });
  const digests = digestOf(s, ['--cwd', REPO]);
  const claude = Object.entries(digests).find(([f]) => f.startsWith('claude-'))[1];
  const codex = Object.entries(digests).find(([f]) => f.startsWith('codex-'))[1];
  assert.match(claude, /user messages: 4 raw, 2 distinct/);
  assert.equal(claude.match(/Where does the nav/g).length, 1);
  assert.doesNotMatch(claude, /system-reminder|meta entry/);
  assert.match(codex, /user messages: 1 raw, 1 distinct/);
  assert.doesNotMatch(codex, /environment_context/);
});

test('hunt snippets come from assistant text, are de-duplicated and capped with the cap stated', (t) => {
  const s = scratch(); t.after(s.done);
  const hunts = Array.from({ length: 50 }, (_, i) => assistant({ type: 'text', text: `Checked the layout. I could not find the nav file number ${i} anywhere.` }));
  claudeTranscript(s, { name: 'hunts', cwd: REPO, entries: [...hunts, ...hunts,
    assistant({ type: 'text', text: 'All tests pass.' })] });
  codexRollout(s, { name: 'codex-hunts', cwd: REPO, records: [codexAssistant('Let me search for the route table; the old doc looks stale.')] });
  const digests = digestOf(s, ['--cwd', REPO]);
  const claude = Object.entries(digests).find(([f]) => f.startsWith('claude-'))[1];
  const codex = Object.entries(digests).find(([f]) => f.startsWith('codex-'))[1];
  const snippets = (text) => text.split('## Hunt')[1].split('\n## ')[0].split('\n').filter((l) => l.startsWith('- '));
  assert.equal(snippets(claude).length, 40);
  assert.match(claude, /## Hunt[^\n]*first 40/);
  assert.match(claude, /hunt snippets: 50 distinct/);
  assert.doesNotMatch(claude, /All tests pass/);
  assert.equal(snippets(codex).length, 1);
});

test('lookup errors are labelled noisy, and a search that found nothing is not an error', (t) => {
  const s = scratch(); t.after(s.done);
  claudeTranscript(s, { name: 'lookups', cwd: REPO, entries: [
    assistant(toolUse('t1', 'Read', { file_path: `${REPO}\\src\\gone.ts` })),
    toolResult('t1', 'File does not exist.', true),
    assistant(toolUse('t2', 'Bash', { command: 'rg -n "useGone" src' })),
    toolResult('t2', 'Exit code 1', true),
    assistant(toolUse('t3', 'Grep', { pattern: 'useGone' })),
    toolResult('t3', 'No matches found'),
    assistant(toolUse('t4', 'Bash', { command: 'cat src/gone.ts' })),
    toolResult('t4', 'Exit code 1\ncat: src/gone.ts: No such file or directory', true),
    // A successful result that merely mentions "not found" is not a lookup error.
    assistant(toolUse('t5', 'Bash', { command: 'grep -rn "not found" src' })),
    toolResult('t5', 'src/errors.ts:3: throw new Error("not found")'),
  ] });
  codexRollout(s, { name: 'codex-lookups', cwd: REPO, records: [
    execCall('c1', `${cmd('rg -n "useGone" src')}\n${cmd('Get-Content src/gone.ts')}`),
    execOutput('c1', [[1, ''], [1, "Get-Content: Cannot find path 'src/gone.ts' because it does not exist."]]),
    fnCall('c2', 'exec_command', { cmd: 'grep -rn useGone src' }),
    fnOutput('c2', 'Exit code: 1\nWall time: 0.1 seconds\nOutput:\n'),
  ] });
  const digests = digestOf(s, ['--cwd', REPO]);
  const claude = Object.entries(digests).find(([f]) => f.startsWith('claude-'))[1];
  const codex = Object.entries(digests).find(([f]) => f.startsWith('codex-'))[1];
  assert.match(claude, /lookup errors \(noisy[^)]*\): 2;/);
  assert.match(claude, /empty searches[^:]*: 2/);
  assert.match(codex, /lookup errors \(noisy[^)]*\): 1;/);
  assert.match(codex, /empty searches[^:]*: 2/);
});

test('a malformed or truncated line is skipped and counted, not fatal', (t) => {
  const s = scratch(); t.after(s.done);
  claudeTranscript(s, { name: 'torn', cwd: REPO, entries: [
    assistant(toolUse('t1', 'Read', { file_path: `${REPO}\\src\\a.ts` })),
    '{"type":"assistant","message":{"content":[{"type":"tool_use"',
    'not json at all',
    assistant(toolUse('t2', 'Read', { file_path: `${REPO}\\src\\a.ts` })),
  ] });
  const d = only(digestOf(s, ['--cwd', REPO]));
  assert.deepEqual(section(d, 'Files read'), ['2|src/a.ts']);
  assert.match(d, /malformed lines skipped: 2/);
});

// Fake secrets, assembled here so no token-shaped literal is stored in the file.
function fakeTokens() {
  const body = (seed, n) => Array.from({ length: n }, (_, i) => 'Qx7Lm2Vp9Rt4Wk8Zn3Bc6'[(i * seed + seed) % 21]).join('');
  return {
    huggingFace: ['hf', '_', body(1, 34)].join(''),
    openAi: ['sk', '-', 'proj', '-', body(2, 40)].join(''),
    githubPersonal: ['gh', 'p', '_', body(3, 36)].join(''),
    githubOauth: ['gh', 'o', '_', body(4, 36)].join(''),
    githubFineGrained: ['github', '_pat_', body(5, 22), '_', body(6, 59)].join(''),
    slack: ['xo', 'xb', '-', '1234567890', '-', body(7, 24)].join(''),
    aws: ['AK', 'IA', body(8, 16).toUpperCase()].join(''),
    jwt: ['ey', 'J', body(9, 24), '.', body(10, 30), '.', body(11, 30)].join(''),
    bearer: body(12, 44),
  };
}

test('a token pasted into a chat appears in no digest or aggregate', (t) => {
  const s = scratch(); t.after(s.done);
  const tok = fakeTokens();
  // A bearer value is only recognisable after the word Bearer.
  const all = Object.entries(tok).map(([kind, v]) => (kind === 'bearer' ? `Bearer ${v}` : v)).join(' and ');
  // A token straddling the user-message clip must not survive as a fragment.
  // 480 characters, then the token: the 500-character clip keeps 20 of its characters.
  const longPaste = `${'context '.repeat(60)}${tok.huggingFace} tail`;
  claudeTranscript(s, { name: 'leaky', cwd: REPO, entries: [
    user(`here are my keys ${all}`), user(longPaste),
    user('the task-runner-configuration-file lives in src/desk-layout-component-final.tsx'),
    assistant(
      { type: 'text', text: `I could not find where ${tok.openAi} is used.` },
      toolUse('t1', 'Bash', { command: `curl -H "Authorization: Bearer ${tok.bearer}" https://api.example.test; cat ${tok.githubPersonal}.txt` }),
      toolUse('t2', 'Grep', { pattern: tok.githubOauth, path: `${REPO}\\src` }),
      toolUse('t3', 'Read', { file_path: `${REPO}\\secrets\\${tok.aws}.json` }),
      toolUse('t4', 'Glob', { pattern: `**/${tok.slack}*` }),
    ),
  ] });
  codexRollout(s, { name: 'leaky-codex', cwd: REPO, records: [
    codexUser(`use ${tok.huggingFace} then ${tok.jwt}`),
    execCall('c1', cmd(`rg -n "${tok.githubFineGrained}" src`)),
  ] });
  const d = run(['digest', ...s.roots, '--cwd', REPO, '--out', s.out]);
  assert.equal(d.status, 0, d.out);
  const a = run(['aggregate', '--out', join(s.out, 'aggregate.md'), s.out]);
  assert.equal(a.status, 0, a.out);
  const written = readdirSync(s.out).map((f) => readFileSync(join(s.out, f), 'utf8'));
  assert.equal(written.length, 3);
  for (const [kind, value] of Object.entries(tok)) {
    const secret = value.replace(/^(hf_|sk-proj-|gh[po]_|github_pat_|xoxb-1234567890-|AKIA|eyJ)/, '');
    for (const text of [...written, d.out, a.out]) {
      assert.ok(!text.includes(value), `${kind} leaked`);
      assert.ok(!text.includes(secret.slice(0, 10)), `part of ${kind} leaked`);
    }
  }
  const joined = written.join('\n');
  assert.match(joined, /\[REDACTED\]/);
  // Ordinary words and paths that merely contain a prefix are kept.
  assert.match(joined, /task-runner-configuration-file lives in src\/desk-layout-component-final\.tsx/);
});

test('output goes only where it is told, and never into a checkout\'s tracked tree unless allowed', (t) => {
  const s = scratch(); t.after(s.done);
  claudeTranscript(s, { name: 'private', cwd: REPO, entries: [user('private words')] });
  const repo = join(s.root, 'repo');
  assert.equal(spawnSync('git', ['init', '-q', repo]).status, 0);
  writeFileSync(join(repo, '.gitignore'), 'scratch/\n');
  const digest = (out, ...extra) => run(['digest', ...s.roots, '--cwd', REPO, '--out', out, ...extra]);
  assert.equal(run(['digest', ...s.roots, '--cwd', REPO]).status, 2, 'digest without --out is bad input');
  const refused = digest(join(repo, 'digests'));
  assert.equal(refused.status, 2, refused.out);
  assert.match(refused.out, /git checkout/);
  assert.ok(!readdirSync(repo).includes('digests'), 'nothing written when refused');
  assert.equal(digest(join(repo, 'scratch', 'digests')).status, 0, 'a git-ignored folder is allowed');
  assert.equal(digest(join(repo, 'digests'), '--allow-inside-repo').status, 0);
  const agg = run(['aggregate', '--out', join(repo, 'aggregate.md'), join(repo, 'scratch', 'digests')]);
  assert.equal(agg.status, 2, agg.out);
  assert.equal(run(['aggregate', '--out', join(repo, 'scratch', 'aggregate.md'), join(repo, 'scratch', 'digests')]).status, 0);
});

// The rows of one aggregate section, as "sessions|total|key" strings.
function aggregateRows(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## ${heading}`));
  assert.ok(start >= 0, `no section ${heading}`);
  const rows = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    const m = line.match(/^- in (\d+) sessions?, (\d+) total: (.+)$/);
    if (m) rows.push(`${m[1]}|${m[2]}|${m[3]}`);
  }
  return rows;
}

test('the aggregate ranks by number of sessions first, then total count, and states its caps', (t) => {
  const s = scratch(); t.after(s.done);
  const reads = (...files) => assistant(...files.map((f, i) => toolUse(`r${i}`, 'Read', { file_path: `${REPO}\\src\\${f}` })));
  claudeTranscript(s, { name: 's1', cwd: REPO, entries: [user('one'), reads('a.ts', 'a.ts', 'a.ts', 'a.ts', 'a.ts', 'b.ts')] });
  claudeTranscript(s, { name: 's2', cwd: REPO, entries: [user('two'), user('two'), reads('b.ts', 'c.ts')] });
  codexRollout(s, { name: 's3', cwd: REPO, records: [codexUser('three'), execCall('c1', cmd('cat src/b.ts src/c.ts'))] });
  digestOf(s, ['--cwd', REPO]);
  // An aggregate written into the digest folder is not read back as a digest.
  const target = join(s.out, 'aggregate.md');
  for (let pass = 0; pass < 2; pass += 1) {
    const r = run(['aggregate', '--out', target, s.out]);
    assert.equal(r.status, 0, r.out);
  }
  const text = readFileSync(target, 'utf8');
  assert.match(text, /Aggregate of 3 session digests/);
  assert.deepEqual(aggregateRows(text, 'Files read'), ['3|3|src/b.ts', '2|2|src/c.ts', '1|5|src/a.ts']);
  assert.match(text, /user messages: 4 raw, 3 distinct/);
  assert.match(text, /40 hunt snippets per session/);
  assert.match(text, /clipped to 500 characters/);
  assert.match(text, /top \d+ rows per section/);
  assert.equal(run(['aggregate', s.out]).status, 2, 'aggregate without --out is bad input');
});

test('each tool is counted by name, with its failed results counted apart', (t) => {
  const s = scratch(); t.after(s.done);
  claudeTranscript(s, { name: 'tool-use', cwd: REPO, entries: [
    assistant(
      toolUse('t1', 'Bash', { command: 'pnpm test' }),
      toolUse('t2', 'Bash', { command: 'pnpm lint' }),
      toolUse('t3', 'mcp__github__get_me', {}),
      toolUse('t4', 'Read', { file_path: `${REPO}\\src\\a.ts` }),
    ),
    toolResult('t1', 'Exit code 1\nFAIL src/a.test.ts'),
    toolResult('t2', 'ok'),
    toolResult('t3', 'Permission denied', true),
    toolResult('t4', 'text'),
  ] });
  codexRollout(s, { name: 'codex-tools', cwd: REPO, records: [
    fnCall('c1', 'exec_command', { cmd: 'pnpm build' }),
    fnOutput('c1', 'Exit code: 2\nOutput:\nerror TS2304'),
    execCall('c2', cmd('ls src')),
    execOutput('c2', [[0, 'a.ts']]),
  ] });
  const digests = digestOf(s, ['--cwd', REPO]);
  const claude = Object.entries(digests).find(([f]) => f.startsWith('claude-'))[1];
  const codex = Object.entries(digests).find(([f]) => f.startsWith('codex-'))[1];
  assert.deepEqual(section(claude, 'Tools used').sort(), ['1|Read', '1|mcp__github__get_me', '2|Bash']);
  assert.deepEqual(section(claude, 'Tool failures').sort(), ['1|Bash', '1|mcp__github__get_me']);
  assert.deepEqual(section(codex, 'Tools used').sort(), ['1|exec', '1|exec_command']);
  assert.deepEqual(section(codex, 'Tool failures'), ['1|exec_command']);
});

test('--skill and --tool keep only sessions that used them, and --last counts matches', (t) => {
  const s = scratch(); t.after(s.done);
  const minute = (m) => new Date(`2026-10-01T10:${String(m).padStart(2, '0')}:00Z`);
  const withSkill = claudeTranscript(s, { name: 'with-skill', cwd: REPO, mtime: minute(1),
    entries: [assistant(toolUse('t1', 'Skill', { skill: 'plugin:delivery' }))] });
  const withMcp = claudeTranscript(s, { name: 'with-mcp', cwd: REPO, mtime: minute(2),
    entries: [assistant(toolUse('t1', 'mcp__github__get_me', {}))] });
  const neither = claudeTranscript(s, { name: 'neither', cwd: REPO, mtime: minute(3),
    entries: [assistant(toolUse('t1', 'Read', { file_path: `${REPO}\\a.ts` }))] });
  const codexSkill = codexRollout(s, { name: 'codex-skill', cwd: REPO, mtime: minute(4),
    records: [execCall('c1', cmd('cat C:\\home\\m\\.codex\\skills\\delivery\\SKILL.md'))] });
  const listed = (args) => run(['list', ...s.roots, '--cwd', REPO, ...args]);
  let r = listed(['--skill', 'delivery']);
  assert.equal(r.status, 0, r.out);
  for (const file of [withSkill, codexSkill]) assert.ok(r.stdout.includes(file), `missing ${file}`);
  for (const file of [withMcp, neither]) assert.ok(!r.stdout.includes(file), `wrongly kept ${file}`);
  r = listed(['--tool', 'mcp__github__*']);
  assert.ok(r.stdout.includes(withMcp) && !r.stdout.includes(neither) && !r.stdout.includes(withSkill), r.out);
  // Newest first: the newest matching session, not the newest session.
  r = listed(['--skill', 'delivery', '--last', '1']);
  assert.ok(r.stdout.includes(codexSkill) && !r.stdout.includes(withSkill), r.out);
  r = listed(['--skill', 'delivery', '--tool', 'Read']);
  assert.match(r.stdout, /3 session\(s\)/);
  const digests = digestOf(s, ['--cwd', REPO, '--tool', 'Read']);
  assert.deepEqual(Object.keys(digests), ['claude-neither.md']);
  const named = run(['digest', '--out', join(s.root, 'named'), '--skill', 'delivery', withSkill, neither]);
  assert.equal(named.status, 0, named.out);
  assert.deepEqual(readdirSync(join(s.root, 'named')), ['claude-with-skill.md']);
});
