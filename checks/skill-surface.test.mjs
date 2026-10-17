import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discover, identitySummary } from '../skills/skills-list/scripts/list-skills.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const survivors = ['code-review', 'delivery', 'docs-workspace', 'planner', 'to-tickets', 'database-workflow',
  'brainstorm', 'implement-spec', 'to-spec', 'wayfinder', 'orchestrate-work', 'coordinate', 'ci',
  'understand', 'writing', 'research', 'hillclimb', 'inbox', 'handoff', 'seo-programme', 'diagnosing-bugs'];
const retired = ['investigate', 'wizard', 'open-code-review', 'sdlc-review', 'workspace-resolution', 'inspection',
  'codebase-design', 'implement', 'improve-codebase-architecture', 'triage', 'how', 'why', 'teach', 'unslop',
  // Design's methods nest as design/<name>/METHOD.md; the old top-level leaves stay gone.
  ...['ai-chat-interface', 'app-ui', 'colour', 'components', 'data-visualization', 'drawing',
    'impeccable', 'layout', 'map-gis-interface', 'marketing', 'mobile-native', 'motion',
    'prototype', 'review', 'shadcn', 'sourcing', 'video'].map((name) => `design-${name}`)];
const read = (path) => readFileSync(join(root, path), 'utf8');

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.name === 'node_modules') return [];
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : [];
  });
}

test('retired skill entrypoints are absent from discovery', () => {
  for (const name of [...retired, 'setup-matt-pocock-skills']) {
    assert.equal(existsSync(join(root, 'skills', name, 'SKILL.md')), false, name);
  }
});

test('surviving skills expose matching names and nonempty descriptions', () => {
  for (const name of survivors) {
    const text = read(`skills/${name}/SKILL.md`);
    const frontmatter = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    assert.ok(frontmatter, `${name}: frontmatter`);
    assert.equal(frontmatter.match(/^name:\s*(.+)$/m)?.[1].trim(), name);
    assert.ok(frontmatter.match(/^description:\s*\S.+$/m), `${name}: description`);
    if (name === 'database-workflow') {
      assert.match(frontmatter, /^metadata:\s*\r?\n\s+group:\s*build\s*$/m, 'database-workflow belongs to build');
    }
  }
});

test('consolidated skills have resolvable local Markdown links', () => {
  for (const name of survivors) {
    for (const file of markdownFiles(join(root, 'skills', name))) {
      // Fenced examples are illustrative, not navigational references.
      const text = readFileSync(file, 'utf8').replace(/^\s*```[^\n]*\n[\s\S]*?^\s*```\s*$/gm, '');
      for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
        const href = match[1].replace(/^<|>$/g, '').split('#')[0];
        if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
        assert.ok(existsSync(resolve(dirname(file), decodeURIComponent(href))), `${file}: ${href}`);
      }
    }
  }
});

// Reviewing skills reach the principles and patterns library through its one
// generated index, so entries can be added, renamed or retired without editing a
// skill. code-review's Standards pass is one such consumer.
test('skills reach the principles library through its index only', () => {
  const libraryLinks = (name) => markdownFiles(join(root, 'skills', name)).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/\]\(([^)]*principles-and-patterns\/[^)]*)\)/g)]
      .map((match) => ({ file, href: match[1] })));
  for (const name of survivors) {
    for (const { file, href } of libraryLinks(name)) {
      assert.match(href, /principles-and-patterns\/index\.md(?:#.*)?$/, `${file}: ${href}`);
    }
  }
  assert.ok(libraryLinks('code-review').length > 0, 'code-review links the library index');
});

test('migrated executable adapters and their behavior suites remain reachable', async () => {
  for (const path of [
    'skills/code-review/scripts/native-slot.mjs',
    'skills/code-review/tests/native-slot.test.mjs',
    'skills/docs-workspace/scripts/resolve-workspace.mjs',
    'skills/docs-workspace/tests/resolve-workspace.test.mjs',
    'skills/delivery/scripts/delivery-state.mjs',
    'skills/delivery/tests/delivery-state.test.mjs',
  ]) assert.ok(existsSync(join(root, path)), path);
  const ocr = await import('../skills/code-review/scripts/native-slot.mjs');
  assert.equal(typeof ocr.runNativeSlot, 'function');
  const resolver = await import('../skills/docs-workspace/scripts/resolve-workspace.mjs');
  assert.ok(Object.keys(resolver).length > 0, 'resolver exports its existing API');
});

// Claude Code reaches the installed skills through a directory link to the Codex
// copies. Node runs the linked file's real path, so an entrypoint guard that
// compares the invoked path with import.meta.url silently skips main() and exits
// 0 there. Each script must behave the same through the link as when run directly.
test('skill scripts run as entrypoints through a linked skills directory', (t) => {
  const scratch = mkdtempSync(join(tmpdir(), 'skill-link-'));
  const link = join(scratch, 'skills');
  symlinkSync(join(root, 'skills'), link, process.platform === 'win32' ? 'junction' : 'dir');
  t.after(() => {
    // Remove the link itself before the scratch folder, so cleanup can never
    // reach the linked source tree.
    if (lstatSync(link, { throwIfNoEntry: false })?.isSymbolicLink()) unlinkSync(link);
    rmSync(scratch, { recursive: true, force: true });
  });
  for (const script of [
    'validate-implementation/scripts/environment-preflight.mjs',
    'validate-implementation/scripts/select-checks.mjs',
    'docs-workspace/scripts/resolve-workspace.mjs',
    'docs-workspace/scripts/task-state.mjs',
    'delivery/scripts/delivery-state.mjs',
    'code-review/scripts/native-slot.mjs',
    'skills-list/scripts/list-skills.mjs',
    'skills-list/scripts/claude-skill-stubs.mjs',
    'harness/scripts/optimiser-job.mjs',
    'harness/scripts/doc-bench.mjs',
    'inbox/scripts/check-brain.mjs',
    'harness/scripts/library-index.mjs',
    'harness/scripts/session-digest.mjs',
    'harness/scripts/stack-scan.mjs',
    'harness/scripts/env-scan.mjs',
  ]) {
    // --help is read-only for every script here: help, usage or an argument error.
    // The limit only stops a hung child; a loaded machine can take seconds per run.
    const invoke = (base) => spawnSync(process.execPath, [join(base, script), '--help'], { encoding: 'utf8', timeout: 60000 });
    const direct = invoke(join(root, 'skills'));
    const linked = invoke(link);
    assert.equal(direct.error ?? linked.error, undefined, `${script}: both runs finish`);
    assert.ok(direct.stdout + direct.stderr, `${script}: a direct run reports something`);
    assert.equal(linked.status, direct.status, `${script}: exit status through the link`);
    assert.equal(linked.stdout + linked.stderr, direct.stdout + direct.stderr, `${script}: output through the link`);
  }
});

test('reviewer planner and explorer retain role configuration outside skill prose', () => {
  for (const role of ['reviewer', 'planner', 'explorer']) {
    const text = read(`agents/${role}.toml`);
    for (const field of ['name', 'description', 'model', 'model_provider', 'model_reasoning_effort']) {
      assert.ok(new RegExp(`^${field}\\s*=\\s*"[^"\\r\\n]+"`, 'm').test(text), `${role}: ${field}`);
    }
    assert.ok(/developer_instructions\s*=\s*"""[\s\S]+?"""/.test(text), `${role}: instructions`);
  }
  for (const name of survivors) {
    assert.doesNotMatch(read(`skills/${name}/SKILL.md`), /^\s*(?:model|model_provider)\s*=\s*"/m);
  }
});

// Completeness of the measured surface. The skills-list script measures one of
// two surfaces: the Codex CLI runtime's own catalogue (`codex debug
// prompt-input`) when a CLI is installed, and the installed files otherwise.
// Neither is the desktop thread's context: on 2026-10-06 the desktop listed 138
// entries with 135 descriptions cut short while the CLI runtime listed 49 with
// none cut (desktop baseline run 1, 2026-10-06, recorded in
// workspace/findings/harness/skill-surface-verification-20261006.md). A shortened trigger routes worse and an omitted skill cannot route
// at all, so either, for a shared skill, is a failure here.
function completenessProblems(result, sourceSkills) {
  // A parse error carries its kind. A truncation entry carries only a path, so
  // its kind is the longest reported root that holds it, as skills-list labels
  // its own rows; truncations only come from roots the runtime reported.
  const roots = (result.roots ?? []).map((entry) => ({ path: resolve(entry.path), kind: entry.kind }))
    .sort((a, b) => b.path.length - a.path.length);
  const kindOf = (target) => {
    const full = resolve(target);
    return roots.find((entry) => full === entry.path || full.startsWith(entry.path + sep))?.kind ?? null;
  };
  // Both surfaces: every source skill present, every shared file readable.
  const installed = new Set(result.skills.filter((skill) => skill.kind === 'shared').map((skill) => skill.directory));
  const problems = [
    ...sourceSkills.filter((name) => !installed.has(name))
      .map((name) => `${name}: a source skill not among the shared skills`),
    ...result.parse_errors.filter((entry) => entry.kind === 'shared')
      .map((entry) => `${entry.path}: frontmatter unreadable (${entry.reason})`),
  ];
  if (result.surface !== 'cli-runtime') return problems;
  return [
    ...problems,
    ...result.truncated.filter((entry) => kindOf(entry.path) === 'shared')
      .map((entry) => `${entry.name}: description rendered ${entry.rendered_length} of ${entry.source_length} characters`),
    ...result.on_disk_not_listed.filter((entry) => entry.kind === 'shared')
      .map((entry) => `${entry.name}: on disk but not listed (${entry.path})`),
  ];
}

function sourceSkillDirectories() {
  return readdirSync(join(root, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, 'skills', entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
}

function writeSkill(skillsRoot, name, description) {
  mkdirSync(join(skillsRoot, name), { recursive: true });
  writeFileSync(join(skillsRoot, name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\nBody.\n`);
}

// A Codex home, home directory and project, isolated from the operator's own.
function surfaceFixture(t) {
  const scratch = mkdtempSync(join(tmpdir(), 'skill-surface-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const home = join(scratch, 'home');
  const codexHome = join(home, '.codex');
  const project = join(scratch, 'project');
  mkdirSync(join(project, '.git'), { recursive: true });
  mkdirSync(join(codexHome, 'skills', '.system'), { recursive: true });
  return { scratch, home, codexHome, project, shared: join(codexHome, 'skills'), system: join(codexHome, 'skills', '.system') };
}

// A stand-in for the Codex CLI answering only `--version` and
// `debug prompt-input`, so discover() measures a runtime surface the test owns.
function fakeCodex(dir, output) {
  mkdirSync(dir, { recursive: true });
  const emit = join(dir, 'emit.cjs');
  writeFileSync(emit, [
    "const args = process.argv.slice(2).join(' ');",
    "if (args === '--version') { process.stdout.write('codex-cli 0.0.0-fixture\\n'); }",
    `else if (args === 'debug prompt-input') { process.stdout.write(${JSON.stringify(output)}); }`,
    "else { process.stderr.write('unexpected args: ' + args); process.exit(9); }",
  ].join('\n'));
  if (process.platform === 'win32') {
    const shim = join(dir, 'fake-codex.cmd');
    writeFileSync(shim, `@"${process.execPath}" "%~dp0emit.cjs" %*\r\n`);
    return shim;
  }
  const bin = join(dir, 'fake-codex');
  writeFileSync(bin, `#!/bin/sh\nexec "${process.execPath}" "${emit}" "$@"\n`);
  chmodSync(bin, 0o755);
  return bin;
}

const forward = (value) => value.split(/[\\/]/).join('/');

function runtimeOutput(roots, lines) {
  const rootLines = Object.entries(roots).map(([id, path]) => `- \`${id}\` = \`${forward(path)}\``);
  return JSON.stringify([{
    role: 'developer',
    content: [{ text: ['<skills_instructions>', '### Skill roots', ...rootLines, '### Available skills', ...lines, '</skills_instructions>'].join('\n') }],
  }]);
}

test('the completeness check names a shared skill the runtime cut short or left out, and only shared ones', (t) => {
  const fixture = surfaceFixture(t);
  const long = 'Route interface and visual work through the project design authority, loading only the methods the task needs.';
  writeSkill(fixture.shared, 'shortened', long);
  writeSkill(fixture.shared, 'whole', 'Complete as written.');
  writeSkill(fixture.shared, 'unlisted', 'On disk but never offered to the runtime.');
  writeSkill(fixture.system, 'bundled', long);
  const cut = long.slice(0, 40).trimEnd();
  const command = fakeCodex(join(fixture.scratch, 'fake codex'), runtimeOutput(
    { r0: fixture.shared, r1: fixture.system },
    [
      `- shortened: ${cut} (file: r0/shortened/SKILL.md)`,
      '- whole: Complete as written. (file: r0/whole/SKILL.md)',
      `- bundled: ${cut} (file: r1/bundled/SKILL.md)`,
    ],
  ));
  const result = discover({ cwd: fixture.project, source: 'auto', homeDir: fixture.home, codexHome: fixture.codexHome, command });
  assert.equal(result.surface, 'cli-runtime');
  const problems = completenessProblems(result, ['shortened', 'whole', 'unlisted']).join('\n');
  assert.match(problems, /shortened: description rendered 39 of 110 characters/);
  assert.match(problems, /unlisted: on disk but not listed/);
  assert.doesNotMatch(problems, /bundled|whole/, 'a system skill, and a whole description, are not shared-skill failures');
});

test('on the CLI runtime the completeness check names a source skill the runtime never offered', (t) => {
  const fixture = surfaceFixture(t);
  writeSkill(fixture.shared, 'offered', 'Offered by the runtime.');
  const command = fakeCodex(join(fixture.scratch, 'fake codex'), runtimeOutput(
    { r0: fixture.shared },
    ['- offered: Offered by the runtime. (file: r0/offered/SKILL.md)'],
  ));
  const result = discover({ cwd: fixture.project, source: 'auto', homeDir: fixture.home, codexHome: fixture.codexHome, command });
  assert.equal(result.surface, 'cli-runtime');
  const problems = completenessProblems(result, ['offered', 'absent']).join('\n');
  assert.match(problems, /absent: a source skill not among the shared skills/);
  assert.doesNotMatch(problems, /^offered: /m);
});

test('on the CLI runtime the completeness check names a shared skill whose frontmatter is unreadable', (t) => {
  const fixture = surfaceFixture(t);
  writeSkill(fixture.shared, 'offered', 'Offered by the runtime.');
  mkdirSync(join(fixture.shared, 'broken'), { recursive: true });
  writeFileSync(join(fixture.shared, 'broken', 'SKILL.md'), '---\nname: broken\n\nNever closed.\n');
  const command = fakeCodex(join(fixture.scratch, 'fake codex'), runtimeOutput(
    { r0: fixture.shared },
    ['- offered: Offered by the runtime. (file: r0/offered/SKILL.md)'],
  ));
  const result = discover({ cwd: fixture.project, source: 'auto', homeDir: fixture.home, codexHome: fixture.codexHome, command });
  assert.equal(result.surface, 'cli-runtime');
  const problems = completenessProblems(result, ['offered']).join('\n');
  assert.match(problems, /broken[\\/]SKILL\.md: frontmatter unreadable/);
});

test('on the CLI runtime a broken shared file is named even when the runtime never reports the shared root', (t) => {
  const fixture = surfaceFixture(t);
  mkdirSync(join(fixture.shared, 'broken'), { recursive: true });
  writeFileSync(join(fixture.shared, 'broken', 'SKILL.md'), '---\nname: broken\n\nNever closed.\n');
  const elsewhere = join(fixture.scratch, 'elsewhere');
  writeSkill(elsewhere, 'offered', 'Offered from a root the scan does not hold.');
  const command = fakeCodex(join(fixture.scratch, 'fake codex'), runtimeOutput(
    { r0: elsewhere },
    ['- offered: Offered from a root the scan does not hold. (file: r0/offered/SKILL.md)'],
  ));
  const result = discover({ cwd: fixture.project, source: 'auto', homeDir: fixture.home, codexHome: fixture.codexHome, command });
  assert.equal(result.surface, 'cli-runtime');
  const problems = completenessProblems(result, []).join('\n');
  assert.match(problems, /broken[\\/]SKILL\.md: frontmatter unreadable/);
});

test('without a Codex CLI the completeness check names a source skill missing from the installed files', (t) => {
  const fixture = surfaceFixture(t);
  writeSkill(fixture.shared, 'installed', 'Installed beside the router.');
  mkdirSync(join(fixture.shared, 'broken'), { recursive: true });
  writeFileSync(join(fixture.shared, 'broken', 'SKILL.md'), '---\nname: broken\n\nNever closed.\n');
  const result = discover({ cwd: fixture.project, source: 'auto', homeDir: fixture.home, codexHome: fixture.codexHome, command: 'definitely-not-a-codex-binary' });
  assert.equal(result.surface, 'filesystem');
  const problems = completenessProblems(result, ['installed', 'never-installed']).join('\n');
  assert.match(problems, /never-installed: a source skill not among the shared skills/);
  assert.match(problems, /broken[\\/]SKILL\.md: frontmatter unreadable/);
  assert.doesNotMatch(problems, /^installed: /m,'an installed, readable skill is not a failure');
});

// A Codex launcher on PATH, by the spellings an install leaves.
function codexOnPath() {
  const names = ['codex', 'codex.cmd', 'codex.exe', 'codex.ps1'];
  return (process.env.PATH ?? '').split(delimiter).filter(Boolean)
    .some((directory) => names.some((name) => existsSync(join(directory, name))));
}

// The real measurement launches the Codex CLI when one is installed, which can
// take tens of seconds on a loaded machine. `auto` falls back to the installed
// files on any runtime failure, so with a CLI on PATH a fallback is a failure
// here rather than a pass against files.
test('the skills-list surface (CLI runtime or installed files, not the desktop thread) offers every shared skill whole', { timeout: 180000 }, (t) => {
  const result = discover({ cwd: root, source: 'auto' });
  t.diagnostic(`measured surface ${result.surface}, ${result.skills.filter((skill) => skill.kind === 'shared').length} shared of ${result.skills.length} entries: ${identitySummary(result.identity)}`);
  assert.ok(['cli-runtime', 'filesystem'].includes(result.surface), `unexpected surface ${result.surface}`);
  if (codexOnPath()) {
    assert.equal(result.surface, 'cli-runtime', `a Codex CLI is on PATH but the runtime was unavailable: ${result.runtime_unavailable.join('; ')}`);
  }
  const problems = completenessProblems(result, sourceSkillDirectories());
  assert.deepEqual(problems, [], `measured surface ${result.surface}: ${identitySummary(result.identity)}\n${problems.join('\n')}`);
});
