import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'skills/design/drawing/scripts/post-drawing.mjs');
const requirements = fs.readFileSync(path.join(root, 'skills/design/drawing/references/post-drawing.md'), 'utf8').trim();
const event = (tool_name, tool_input, tool_response = {}) => ({ hook_event_name: 'PostToolUse', tool_name, tool_input, tool_response });
function invoke(payload, args = [], file = script) {
  return spawnSync(process.execPath, [file, ...args], { input: typeof payload === 'string' ? payload : JSON.stringify(payload), encoding: 'utf8', timeout: 5000 });
}
function assertReminder(result) {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const output = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(output), ['hookSpecificOutput']);
  assert.deepEqual(Object.keys(output.hookSpecificOutput), ['hookEventName', 'additionalContext']);
  assert.equal(output.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.equal(output.hookSpecificOutput.additionalContext, requirements);
}
function assertQuiet(result) {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
}

test('a successful direct SVG edit adds the consuming-surface requirements without blocking', () => {
  assertReminder(invoke(event('Write', { file_path: '/missing/diagram.svg', content: '<svg><text>Title</text></svg>' })));
});

test('inline SVG authoring reaches the reminder through Write, Edit and apply_patch', () => {
  for (const payload of [
    event('Write', { file_path: 'src/Diagram.astro', content: '<svg viewBox="0 0 900 460"><text>Title</text></svg>' }),
    event('Edit', { file_path: 'src/Diagram.tsx', old_string: '<svg width="1120">', new_string: '<svg width="900">' }),
    event('Edit', { file_path: 'diagram.svg', old_string: 'Before', new_string: 'After' }),
    event('apply_patch', { command: '*** Begin Patch\n*** Update File: src/page.html\n-<svg width="1120">\n+<svg width="900">\n*** End Patch' }),
    event('apply_patch', '*** Begin Patch\n*** Update File: figures/title.svg\n-Title\n+Better title\n*** End Patch'),
  ]) assertReminder(invoke(payload));
});

for (const [name, payload] of [
  ['path geometry through Edit', event('Edit', { file_path: 'src/Diagram.tsx', old_string: '<path d="M0 0L1 1" />', new_string: '<path d="M0 0L2 2" />' })],
  ['text child through Edit', event('Edit', { file_path: 'src/Diagram.astro', old_string: '<text>Before</text>', new_string: '<text>After</text>' })],
  ['circle geometry through apply_patch', event('apply_patch', [
    '*** Begin Patch',
    '*** Update File: src/Diagram.vue',
    '@@',
    '-  <circle cx="120" cy="80" r="48" />',
    '+  <circle cx="120" cy="80" r="36" />',
    '*** End Patch',
  ].join('\n'))],
]) {
  test(`inline SVG child revision reaches the reminder: ${name}`, () => {
    assertReminder(invoke(payload));
    assertQuiet(invoke({ ...payload, tool_response: { isError: true } }));
  });
}

test('moving an inline SVG component keeps the changed markup attached to its destination', () => {
  const patch = [
    '*** Begin Patch',
    '*** Update File: src/Diagram.tsx',
    '*** Move to: src/components/Diagram.tsx',
    '@@',
    ' export function Diagram() {',
    '-  return <svg viewBox="0 0 1120 460"><text>Title</text></svg>;',
    '+  return <svg viewBox="0 0 900 460"><text>Title</text></svg>;',
    ' }',
    '*** End Patch',
  ].join('\n');
  assertReminder(invoke(event('apply_patch', patch)));
  assertQuiet(invoke(event('apply_patch', patch, { isError: true })));
});

test('moving an SVG into a component retains recognition for edits below the SVG root', () => {
  const patch = [
    '*** Begin Patch',
    '*** Update File: figures/diagram.svg',
    '*** Move to: src/components/Diagram.astro',
    '@@',
    ' <svg viewBox="0 0 900 460">',
    '-  <circle cx="120" cy="80" r="48" />',
    '+  <circle cx="120" cy="80" r="36" />',
    ' </svg>',
    '*** End Patch',
  ].join('\n');
  assertReminder(invoke(event('apply_patch', patch)));
});

test('unrelated changes, read mentions and failed edits stay quiet', () => {
  for (const payload of [
    event('Write', { file_path: 'README.md', content: 'Use <svg> in a figure.' }),
    event('Write', { file_path: 'src/page.html', content: '<h1>Title</h1>' }),
    event('Edit', { file_path: 'src/Heading.tsx', old_string: '<Text>Before</Text>', new_string: '<Text>After</Text>' }),
    event('Write', { file_path: 'src/Navigation.tsx', content: '<Path to="/home">Home</Path>' }),
    event('Edit', { file_path: 'src/page.html', old_string: '<p>Draw a circle</p>', new_string: '<p>Draw a path</p>' }),
    event('Write', { file_path: 'src/page.html', content: '<textarea>Notes</textarea><polyline-chart />' }),
    event('Read', { file_path: 'diagram.svg' }),
    event('Edit', { file_path: 'src/page.astro', old_string: 'Before', new_string: 'After' }),
    event('apply_patch', { command: '*** Begin Patch\n*** Update File: README.md\n+Example: <svg>\n*** Update File: src/page.html\n+<h1>Title</h1>\n*** End Patch' }),
    event('apply_patch', '*** Begin Patch\n*** Delete File: figures/title.svg\n*** End Patch'),
    event('apply_patch', '*** Begin Patch\n*** Update File: README.md\n*** Move to: docs/README.md\n@@\n-Example: <svg width="1120">\n+Example: <svg width="900">\n*** End Patch'),
    event('Write', { file_path: 'diagram.svg', content: '<svg/>' }, { isError: true }),
    event('Write', { file_path: 'diagram.svg', content: '<svg/>' }, { success: false }),
    { ...event('Write', { file_path: 'diagram.svg' }), hook_event_name: 'PreToolUse' },
    'not json {', '', 'null', '[]', '{}',
  ]) assertQuiet(invoke(payload));
});

test('Drawing Tools completed jobs and successful check or snapshot results add requirements', () => {
  const result = structuredContent => ({ structuredContent, content: [{ type: 'text', text: JSON.stringify(structuredContent) }] });
  for (const [tool, completed] of [
    ['get_render', { jobId: 'job-123', state: 'done', outputs: [{ kind: 'svg', path: '/drawing.svg' }] }],
    ['check', { jobId: 'job-123', style: 'box-sketch', checks: ['bounds'], findings: [{ rule: 'bounds', severity: 'error' }], unchecked: [] }],
    ['snapshot', { jobId: 'job-123', kind: 'still', image: { mimeType: 'image/png', width: 900, height: 460, bytes: 1024 } }],
  ]) {
    assertReminder(invoke(event(`mcp__drawing_tools__${tool}`, { jobId: 'job-123' }, result(completed))));
    assertReminder(invoke(event(`mcp__drawing_tools__${tool}`, { jobId: 'job-123' }, { content: [{ type: 'text', text: JSON.stringify(completed) }] })));
  }
});

test('Drawing Tools job starts, running jobs, failures and unconfirmed results stay quiet', () => {
  for (const [tool, response] of [
    ['render', { structuredContent: { jobId: 'job-123' } }],
    ['get_render', { structuredContent: { jobId: 'job-123', state: 'running' } }],
    ['get_render', { structuredContent: { jobId: 'job-123', state: 'failed' } }],
    ['get_render', { structuredContent: { jobId: 'job-123', state: 'cancelled' } }],
    ['get_render', { structuredContent: { jobId: 'other-job', state: 'done' } }],
    ['get_render', { isError: true, structuredContent: { jobId: 'job-123', state: 'done' } }],
    ['check', { isError: true, content: [{ type: 'text', text: 'still running' }] }],
    ['snapshot', { content: [{ type: 'text', text: 'still running' }] }],
    ['check', { structuredContent: { jobId: 'job-123' } }],
    ['snapshot', { structuredContent: { jobId: 'job-123', image: { width: 900, height: 460 } } }],
  ]) assertQuiet(invoke(event(`mcp__drawing_tools__${tool}`, { jobId: 'job-123' }, response)));
  assertQuiet(invoke(event('mcp__other__get_render', { jobId: 'job-123' }, { structuredContent: { jobId: 'job-123', state: 'done' } })));
});

test('shell render output stays quiet because completion uses the explicit command', () => {
  // Native Codex unified exec hooks carry only raw command output, without an exit code.
  for (const [tool, command, response] of [
    ['Bash', 'node /tools/drawing-tools/scripts/studio.mjs render intro', 'render: 1 rendered, 0 failed\n'],
    ['Bash', 'drawing-tools still page.html scene end', 'still: /drawing.png\n'],
    ['Bash', 'drawing-tools render intro', 'error: render failed\n'],
    ['Bash', 'node build.mjs', 'finished\n'],
    ['Bash', 'npm run render', 'finished\n'],
    ['Bash', 'drawing-tools render intro', { exit_code: 0, stdout: 'render: 1 rendered, 0 failed\n' }],
    ['exec_command', 'node "C:\\Drawing Tools\\drawing-tools\\scripts\\studio.mjs" figure title.figure.js', { exit_code: 0, output: 'figure: 1 made' }],
  ]) assertQuiet(invoke(event(tool, { command, cmd: command }, response)));
});

test('explicit completion prints the same requirements after shell rendering and label-only edits', () => {
  const result = invoke('', ['--complete']);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout.trim(), requirements);
});

const isWindows = process.platform === 'win32';
function findSh() {
  if (!isWindows) return '/bin/sh';
  const candidates = [];
  if (process.env.CLAUDE_CODE_GIT_BASH_PATH) candidates.push(path.join(path.dirname(process.env.CLAUDE_CODE_GIT_BASH_PATH), 'sh.exe'));
  const git = spawnSync('where', ['git'], { encoding: 'utf8' });
  for (const file of (git.stdout || '').split(/\r?\n/).filter(Boolean)) candidates.push(path.join(path.dirname(path.dirname(file)), 'bin/sh.exe'));
  candidates.push('C:/Program Files/Git/bin/sh.exe');
  return candidates.find(file => fs.existsSync(file));
}
const sh = findSh();
function world(t) {
  const tempParent = fs.realpathSync(os.tmpdir());
  const temp = fs.mkdtempSync(path.join(tempParent, 'post-drawing-'));
  t.after(() => {
    assert.equal(path.dirname(temp), tempParent);
    for (let ancestor = temp; ; ancestor = path.dirname(ancestor)) {
      assert.equal(fs.lstatSync(ancestor).isSymbolicLink(), false, `no linked cleanup ancestor: ${ancestor}`);
      if (ancestor === path.dirname(ancestor)) break;
    }
    fs.rmSync(temp, { recursive: true, force: true });
  });
  const home = path.join(temp, 'home with spaces');
  const custom = path.join(temp, 'custom codex home');
  const cwd = path.join(temp, 'unrelated project');
  fs.mkdirSync(cwd, { recursive: true });
  for (const codex of [path.join(home, '.codex'), custom]) {
    const drawing = path.join(codex, 'skills/design/drawing');
    fs.mkdirSync(path.join(drawing, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(drawing, 'references'));
    fs.copyFileSync(script, path.join(drawing, 'scripts/post-drawing.mjs'));
    fs.writeFileSync(path.join(drawing, 'references/post-drawing.md'), requirements);
  }
  return { temp, home, custom, cwd };
}
function registration() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'hooks/hooks.json'), 'utf8'));
  const groups = manifest.hooks.PostToolUse;
  assert.equal(groups?.length, 1, 'one post-drawing handler is registered');
  const matcher = new RegExp(groups[0].matcher);
  for (const name of ['Write', 'Edit', 'apply_patch', 'mcp__drawing_tools__get_render', 'mcp__drawing_tools__check', 'mcp__drawing_tools__snapshot']) assert.equal(matcher.test(name), true, name);
  for (const name of ['Read', 'Bash', 'exec_command', 'mcp__drawing_tools__render', 'mcp__other__get_render']) assert.equal(matcher.test(name), false, name);
  return groups[0].hooks[0];
}
function runRegistered(shell, command, fixture, env, payload) {
  const base = { ...process.env, HOME: fixture.home, USERPROFILE: fixture.home };
  delete base.CODEX_HOME;
  const [file, args, options] = shell === 'cmd'
    ? [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `"${command}"`], { windowsVerbatimArguments: true }]
    : shell === 'powershell'
      ? ['powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {}]
      : [sh, ['-c', command], {}];
  return spawnSync(file, args, { cwd: fixture.cwd, env: { ...base, ...env }, input: JSON.stringify(payload), encoding: 'utf8', timeout: 30000, ...options });
}
const svgWrite = event('Write', { file_path: 'figures/title.svg', content: '<svg/>' });

test('the registered POSIX command preserves stdin through homes with spaces', t => {
  assert.ok(sh, 'POSIX sh is available');
  const fixture = world(t);
  const hook = registration();
  assertReminder(runRegistered('sh', hook.command, fixture, {}, svgWrite));
  assertReminder(runRegistered('sh', hook.command, fixture, { HOME: path.join(fixture.temp, 'missing default'), CODEX_HOME: fixture.custom }, svgWrite));
  assertQuiet(runRegistered('sh', hook.command, fixture, {}, event('Write', { file_path: 'README.md', content: 'Hello' })));
});

test('the registered Windows command preserves stdin in cmd and PowerShell', { skip: !isWindows }, t => {
  const fixture = world(t);
  const hook = registration();
  for (const shell of ['cmd', 'powershell']) {
    assertReminder(runRegistered(shell, hook.commandWindows, fixture, {}, svgWrite));
    assertReminder(runRegistered(shell, hook.commandWindows, fixture, { USERPROFILE: path.join(fixture.temp, 'missing default'), CODEX_HOME: fixture.custom }, svgWrite));
    assertQuiet(runRegistered(shell, hook.commandWindows, fixture, {}, event('Write', { file_path: 'README.md', content: 'Hello' })));
  }
});

test('an explicit missing CODEX_HOME never falls back to another installation', t => {
  const fixture = world(t);
  const hook = registration();
  for (const shell of ['sh', ...(isWindows ? ['cmd', 'powershell'] : [])]) {
    assertQuiet(runRegistered(shell, shell === 'sh' ? hook.command : hook.commandWindows, fixture, { CODEX_HOME: path.join(fixture.temp, 'missing explicit home') }, svgWrite));
  }
});

test('missing owned requirements report failure without inventing an acceptance result', t => {
  const fixture = world(t);
  fs.unlinkSync(path.join(fixture.custom, 'skills/design/drawing/references/post-drawing.md'));
  const result = invoke(svgWrite, [], path.join(fixture.custom, 'skills/design/drawing/scripts/post-drawing.mjs'));
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /requirements unavailable/);
});
