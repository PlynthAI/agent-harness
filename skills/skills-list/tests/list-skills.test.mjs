import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {
  discover,
  findDuplicates,
  parseArgs,
  parseRuntimeInput,
  readFrontmatter,
  runRuntime,
} from '../scripts/list-skills.mjs';

const sandboxes = [];
function sandbox() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'skills-list-'));
  // The aggregate runner may place Temp inside a real checkout. Give each
  // fixture its own discovery boundary so ancestor skills cannot leak in.
  // Tests that need Git metadata initialise this empty directory themselves.
  mkdirSync(path.join(dir, '.git'));
  sandboxes.push(dir);
  return dir;
}
test.after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true });
});

function writeSkill(root, name, { description = 'A skill used to prove discovery works.', frontmatterName, body = 'Body text.\n', group, lead = false } = {}) {
  const dir = path.join(root, name);
  mkdirSync(dir, { recursive: true });
  const declared = frontmatterName === undefined ? name : frontmatterName;
  const metadata = group === undefined ? '' : `metadata:\n  group: ${group}\n${lead ? '  lead: true\n' : ''}`;
  writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${declared}\ndescription: ${description}\n${metadata}---\n\n${body}`);
  return dir;
}

// A plugin cache lays an entry out as vendor/plugin/version/skills.
function pluginCacheDir(codexHome, ...segments) {
  return path.join(codexHome, 'plugins', 'cache', ...segments);
}

const runtimeSample = JSON.stringify([
  { role: 'system', content: [{ text: 'System prompt, no skills block here.' }] },
  {
    role: 'developer',
    content: [{
      text: [
        '<skills_instructions>',
        '## Skills',
        '### Skill roots',
        '- `r0` = `C:/home/Example/.codex/skills`',
        '- `r2` = `C:/home/Example/.codex/skills/.system`',
        '### Available skills',
        '- imagegen: Generate or edit raster images. (file: r2/imagegen/SKILL.md)',
        '- code-review: Review a fixed candidate: against a plan. (file: r0/code-review/SKILL.md)',
        '</skills_instructions>',
      ].join('\n'),
    }],
  },
  { role: 'user', content: [{ text: 'A user turn that mentions - not-a-skill: nope. (file: r0/x/SKILL.md)' }] },
]);

test('the runtime block is parsed into roots and skills with resolved paths', () => {
  const result = parseRuntimeInput(runtimeSample);
  assert.equal(result.blockFound, true);
  assert.equal(result.roots.length, 2);
  assert.equal(result.skills.length, 2);
  const imagegen = result.skills.find((skill) => skill.name === 'imagegen');
  assert.equal(imagegen.root, 'r2');
  assert.match(imagegen.path.replace(/\\/g, '/'), /\.codex\/skills\/\.system\/imagegen$/);
  assert.equal(imagegen.description, 'Generate or edit raster images.');
});

test('a description containing a colon does not split the skill line', () => {
  const review = parseRuntimeInput(runtimeSample).skills.find((skill) => skill.name === 'code-review');
  assert.equal(review.description, 'Review a fixed candidate: against a plan.');
});

// A plugin contributes its skills under a namespaced name, so the runtime line
// carries a colon inside the name as well as the one before the description.
const namespacedRuntimeSample = JSON.stringify([
  {
    role: 'developer',
    content: [{
      text: [
        '<skills_instructions>',
        '### Skill roots',
        '- `r4` = `C:/home/Example/.codex/plugins/cache/openai-curated-remote/canva/15.0.0/skills`',
        '### Available skills',
        '- canva:canva-brand-check: Check a Canva design against a brand kit. (file: r4/canva-brand-check/SKILL.md)',
        '- spreadsheets:excel-live-control: Control an open workbook: carefully. (file: r4/excel-live-control/SKILL.md)',
        '</skills_instructions>',
      ].join('\n'),
    }],
  },
]);

test('a plugin-namespaced name keeps its colon instead of being dropped', () => {
  const result = parseRuntimeInput(namespacedRuntimeSample);
  assert.deepEqual(result.skills.map((skill) => skill.name), [
    'canva:canva-brand-check',
    'spreadsheets:excel-live-control',
  ]);
});

test('a namespaced name still resolves its root, path and description', () => {
  const result = parseRuntimeInput(namespacedRuntimeSample);
  const brand = result.skills.find((skill) => skill.name === 'canva:canva-brand-check');
  assert.equal(brand.description, 'Check a Canva design against a brand kit.');
  assert.equal(brand.root, 'r4');
  assert.equal(brand.kind, 'runtime');
  assert.match(brand.path.replace(/\\/g, '/'), /canva\/15\.0\.0\/skills\/canva-brand-check$/);
  const live = result.skills.find((skill) => skill.name === 'spreadsheets:excel-live-control');
  // The colon that separates the name from the description is not the only one
  // a description may carry.
  assert.equal(live.description, 'Control an open workbook: carefully.');
});

test('a user turn is never read as the skills block', () => {
  const result = parseRuntimeInput(runtimeSample);
  assert.equal(result.skills.some((skill) => skill.name === 'not-a-skill'), false);
});

test('input with no skills block reports that plainly instead of inventing skills', () => {
  const result = parseRuntimeInput(JSON.stringify([{ role: 'developer', content: [{ text: 'No block.' }] }]));
  assert.equal(result.blockFound, false);
  assert.deepEqual(result.skills, []);
});

test('non-JSON runtime output is an error, not an empty answer', () => {
  assert.throws(() => parseRuntimeInput('not json'), /not JSON/);
});

test('frontmatter is read without the body, and a quoted or folded value is unwrapped', () => {
  const dir = path.join(sandbox(), 'quoted-skill');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'SKILL.md'), [
    '---',
    'name: "quoted-skill"',
    'description: >-',
    '  A folded description that',
    '  spans two lines.',
    '---',
    '',
    'The body mentions CATALOGUE-BODY-MARKER and must never be read.',
  ].join('\n'));
  const front = readFrontmatter(path.join(dir, 'SKILL.md'));
  assert.equal(front.name, 'quoted-skill');
  assert.equal(front.description, 'A folded description that spans two lines.');
  assert.equal(front.frontmatter, true);
});

test('a quoted YAML description is decoded, and a plain one is left as written', () => {
  const root = sandbox();
  const read = (name, descriptionLine) => {
    const dir = path.join(root, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${descriptionLine}\n---\n\nBody.\n`);
    return readFrontmatter(path.join(dir, 'SKILL.md')).description;
  };
  // Double-quoted: the outer quotes go, \" becomes " and \\ becomes \.
  assert.equal(read('double', String.raw`"Use for \"how does X work\" and C:\\temp paths."`), String.raw`Use for "how does X work" and C:\temp paths.`);
  // Single-quoted: the outer quotes go and '' becomes '.
  assert.equal(read('single', `'Don''t say "how" twice.'`), `Don't say "how" twice.`);
  // Plain scalars carry no escapes: backslashes and edge quotes stay.
  assert.equal(read('plain', String.raw`Handles C:\temp and ends on a "quoted"`), String.raw`Handles C:\temp and ends on a "quoted"`);
});

test('a double-quoted description decodes the YAML escapes and leaves an unknown one as written', () => {
  const dir = path.join(sandbox(), 'escaped');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: escaped\ndescription: ${String.raw`"One\ntwo\t\u0061\x41\/\U0001F600 \q end"`}\n---\n\nBody.\n`);
  assert.equal(readFrontmatter(path.join(dir, 'SKILL.md')).description, 'One\ntwo\taA/\u{1F600} \\q end');
});

test('the tree prints a quoted description without its escape backslashes', () => {
  const root = path.join(sandbox(), 'skills');
  writeSkill(root, 'quoted-lead', { group: 'ask', lead: true, description: String.raw`"Use for \"how does X work\" questions."` });
  const selfPath = fileURLToPath(new URL('../scripts/list-skills.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [selfPath, '--source', 'filesystem', '--no-default-roots', '--root', root, '--format', 'tree'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /quoted-lead: Use for "how does X work" questions\./);
  assert.doesNotMatch(run.stdout, /\\/);
});

test('a file with no frontmatter is reported as such', () => {
  const skillMd = path.join(sandbox(), 'SKILL.md');
  writeFileSync(skillMd, '# No frontmatter here\n');
  const front = readFrontmatter(skillMd);
  assert.equal(front.frontmatter, false);
  assert.equal(front.name, null);
});

test('a new repo with no project skills works and reports no project root', () => {
  const home = sandbox();
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex') });
  assert.equal(result.surface, 'filesystem');
  assert.equal(result.skills.length, 0);
  assert.equal(result.duplicates.length, 0);
  assert.equal(result.roots.some((root) => root.kind === 'project' && root.exists), false);
});

test('a repo with local skills is discovered as a project root', () => {
  const home = sandbox();
  const repo = sandbox();
  const codexHome = path.join(home, '.codex');
  writeSkill(path.join(repo, '.codex', 'skills'), 'local-procedure');
  writeSkill(path.join(codexHome, 'skills'), 'shared-method');
  const result = discover({ cwd: repo, source: 'filesystem', homeDir: home, codexHome });
  assert.deepEqual(result.skills.map((skill) => skill.name).sort(), ['local-procedure', 'shared-method']);
  assert.equal(result.skills.find((skill) => skill.name === 'local-procedure').kind, 'project');
  assert.equal(result.skills.find((skill) => skill.name === 'shared-method').kind, 'shared');
});

test('a nested working directory still resolves the project skills', () => {
  const home = sandbox();
  const repo = sandbox();
  const nested = path.join(repo, 'packages', 'app', 'src');
  mkdirSync(nested, { recursive: true });
  writeSkill(path.join(repo, '.codex', 'skills'), 'local-procedure');
  const result = discover({ cwd: nested, source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex') });
  assert.deepEqual(result.skills.map((skill) => skill.name), ['local-procedure']);
});

test('a duplicate name is reported, not merged', () => {
  const home = sandbox();
  const rootA = path.join(home, 'a');
  const rootB = path.join(home, 'b');
  writeSkill(rootA, 'shared-name', { description: 'The first one.' });
  writeSkill(rootB, 'shared-name', { description: 'The second one.' });
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [rootA, rootB] });
  assert.equal(result.skills.length, 2);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.duplicates[0].name, 'shared-name');
  assert.equal(new Set(result.duplicates[0].paths).size, 2);
});

test('a plugin cache entry is found at the shipped depth, one skills directory per entry', () => {
  const home = sandbox();
  const codexHome = path.join(home, '.codex');
  // A cache entry lays itself out as vendor/plugin/version/skills.
  writeSkill(pluginCacheDir(codexHome, 'openai-curated-remote', 'canva', '15.0.0', 'skills'), 'canva-brand-check');
  writeSkill(pluginCacheDir(codexHome, 'openai-bundled', 'browser', '26.915.31945', 'skills'), 'computer-use');
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome });
  assert.deepEqual(result.skills.map((skill) => skill.name).sort(), ['canva-brand-check', 'computer-use']);
  assert.deepEqual(result.roots.filter((root) => root.kind === 'plugin' && root.exists).map((root) => root.id), [
    'plugin:openai-bundled/browser/26.915.31945/skills',
    'plugin:openai-curated-remote/canva/15.0.0/skills',
  ]);
});

test('plugin backup and install staging folders are not scanned as plugins', () => {
  const home = sandbox();
  const codexHome = path.join(home, '.codex');
  // The plugin manager leaves randomly suffixed backup and install folders
  // beside the installed versions; each holds an older copy of a plugin whose
  // skills would otherwise be listed again as duplicates.
  writeSkill(pluginCacheDir(codexHome, 'openai-bundled', 'browser', '26.928.20755', 'skills'), 'browser-use');
  writeSkill(pluginCacheDir(codexHome, 'openai-bundled', 'plugin-backup-1uKmxr', 'browser', '26.608.12217', 'skills'), 'browser-use');
  writeSkill(pluginCacheDir(codexHome, 'openai-curated', 'plugin-install-hH8jhi', 'vercel', '35bbf711', 'skills'), 'vercel-connect');
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome });
  assert.deepEqual(result.skills.map((skill) => skill.name), ['browser-use']);
  assert.deepEqual(result.duplicates, []);
  assert.deepEqual(result.roots.filter((root) => root.kind === 'plugin').map((root) => root.id), [
    'plugin:openai-bundled/browser/26.928.20755/skills',
  ]);
});

test('the plugin scan stays bounded below the deepest shipped layout', () => {
  const home = sandbox();
  const codexHome = path.join(home, '.codex');
  writeSkill(pluginCacheDir(codexHome, 'a', 'b', 'c', 'd', 'e', 'skills'), 'too-deep');
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome });
  assert.deepEqual(result.skills, []);
  assert.equal(result.roots.filter((root) => root.kind === 'plugin').length, 0);
});

test('a hidden tool distribution inside a plugin is not offered as a plugin root', () => {
  const home = sandbox();
  const codexHome = path.join(home, '.codex');
  const version = pluginCacheDir(codexHome, 'vercel', 'vercel-plugin', '6e1917f9b805d5f4df3a95ea1c601867e48677c4');
  writeSkill(path.join(version, 'skills'), 'visible-skill');
  writeSkill(path.join(version, '.claude', 'skills'), 'hidden-skill');
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome });
  assert.deepEqual(result.skills.map((skill) => skill.name), ['visible-skill']);
  assert.equal(result.roots.some((root) => root.kind === 'plugin' && root.path.includes('.claude')), false);
});

test('one directory reached through two roots is an alias, not a second skill', () => {
  const home = sandbox();
  const root = path.join(home, 'real');
  writeSkill(root, 'aliased');
  const link = path.join(home, 'link');
  try {
    symlinkSync(root, link, 'junction');
  } catch {
    return; // junction creation needs a privilege this host may withhold
  }
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [root, link] });
  // The same directory is reported twice by name and once by identity: the
  // duplicate set stays empty and the alias names the second root's path.
  assert.equal(result.skills.length, 1);
  assert.equal(result.duplicates.length, 0);
  assert.equal(result.aliases.some((alias) => alias.path === path.join(link, 'aliased')), true);
});

test('a directory with no SKILL.md, and a dot directory, are not skills', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  mkdirSync(path.join(root, 'not-a-skill'), { recursive: true });
  mkdirSync(path.join(root, '.repo-skill-backups'), { recursive: true });
  writeSkill(root, 'real-skill');
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [root] });
  assert.deepEqual(result.skills.map((skill) => skill.name), ['real-skill']);
});

test('the name comes from the frontmatter, so a directory mismatch stays visible', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  writeSkill(root, 'directory-name', { frontmatterName: 'declared-name' });
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [root] });
  assert.equal(result.skills[0].name, 'declared-name');
  assert.equal(result.skills[0].directory, 'directory-name');
});

test('duplicates are keyed by name and carry both kinds', () => {
  const duplicates = findDuplicates([
    { name: 'one', path: 'a', kind: 'shared', root: 'shared:codex' },
    { name: 'one', path: 'b', kind: 'project', root: 'project:work/app' },
    { name: 'two', path: 'c', kind: 'shared', root: 'shared:codex' },
  ]);
  assert.equal(duplicates.length, 1);
  assert.deepEqual(duplicates[0].kinds, ['project', 'shared']);
  assert.deepEqual(duplicates[0].roots, ['project:work/app', 'shared:codex']);
});

test('a nested skill directory does not hide the repository one', () => {
  const home = sandbox();
  const repo = sandbox();
  const nested = path.join(repo, 'packages', 'app');
  mkdirSync(path.join(repo, '.git'), { recursive: true });
  writeSkill(path.join(repo, '.codex', 'skills'), 'repo-skill');
  writeSkill(path.join(nested, '.codex', 'skills'), 'nested-skill');
  const result = discover({ cwd: nested, source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex') });
  assert.deepEqual(result.skills.map((skill) => skill.name).sort(), ['nested-skill', 'repo-skill']);
  assert.equal(result.roots.filter((root) => root.kind === 'project').length, 2);
});

test('a name in both the nested and the repository directory is a duplicate, not a shadow', () => {
  const home = sandbox();
  const repo = sandbox();
  const nested = path.join(repo, 'packages', 'app');
  mkdirSync(path.join(repo, '.git'), { recursive: true });
  writeSkill(path.join(repo, '.codex', 'skills'), 'shared-name', { description: 'The repository copy.' });
  writeSkill(path.join(nested, '.codex', 'skills'), 'shared-name', { description: 'The nested copy.' });
  const result = discover({ cwd: nested, source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex') });
  assert.equal(result.skills.length, 2);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.duplicates[0].roots.length, 2);
});

test('the project walk does not cross the repository boundary', () => {
  const home = sandbox();
  const workspace = sandbox();
  const repo = path.join(workspace, 'repo');
  mkdirSync(path.join(repo, '.git'), { recursive: true });
  writeSkill(path.join(workspace, '.codex', 'skills'), 'above-the-boundary');
  const result = discover({ cwd: repo, source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex') });
  assert.deepEqual(result.skills, []);
  assert.equal(result.roots.filter((root) => root.kind === 'project').length, 0);
});

test('both sources report the same top-level fields', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  writeSkill(root, 'on-disk');
  const filesystem = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [root] });
  const expected = ['aliases', 'cwd', 'duplicates', 'identity', 'listed_not_on_disk', 'on_disk_not_listed', 'parse_errors', 'roots', 'runtime_unavailable', 'skills', 'surface', 'truncated'];
  assert.deepEqual(Object.keys(filesystem).sort(), expected);
});

test('a flag with no value is refused rather than becoming undefined', () => {
  assert.throws(() => parseArgs(['--source']), /--source needs a value/);
  assert.throws(() => parseArgs(['--root']), /--root needs a value/);
  assert.throws(() => parseArgs(['--format', '']), /--format needs a value/);
});

test('the command line runs when its own directory contains a space', () => {
  const dir = path.join(sandbox(), 'a directory with spaces');
  mkdirSync(dir, { recursive: true });
  const selfPath = fileURLToPath(new URL('../scripts/list-skills.mjs', import.meta.url));
  const copy = path.join(dir, 'list-skills.mjs');
  copyFileSync(selfPath, copy);
  const home = sandbox();
  const root = path.join(home, 'skills');
  writeSkill(root, 'on-disk');
  const run = spawnSync(process.execPath, [copy, '--source', 'filesystem', '--no-default-roots', '--root', root, '--format', 'json'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const parsed = JSON.parse(run.stdout);
  assert.deepEqual(parsed.skills.map((skill) => skill.name), ['on-disk']);
});

test('an unusable runtime falls back to the filesystem when the source is auto', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  writeSkill(root, 'on-disk');
  const result = discover({
    cwd: sandbox(),
    source: 'auto',
    homeDir: home,
    codexHome: path.join(home, '.codex'),
    includeDefaultRoots: false,
    extraRoots: [root],
    command: 'definitely-not-a-codex-binary',
  });
  assert.equal(result.surface, 'filesystem');
  assert.deepEqual(result.skills.map((skill) => skill.name), ['on-disk']);
  assert.equal(result.runtime_unavailable.length, 1);
});

test('on Windows the runtime is reached through its .cmd shim, from a directory with spaces', { skip: process.platform !== 'win32' }, () => {
  // npm installs the Codex CLI as an extensionless POSIX script beside a .cmd
  // shim. Node refuses to spawn a .cmd file directly (EINVAL), so the shim has
  // to be run through cmd.exe with the fixed arguments passed on unchanged.
  const dir = path.join(sandbox(), 'codex shim');
  mkdirSync(dir, { recursive: true });
  const emit = path.join(dir, 'emit.cjs');
  writeFileSync(emit, [
    "const args = process.argv.slice(2);",
    "if (args.join(' ') !== 'debug prompt-input') { process.stderr.write('unexpected args: ' + args.join(' ')); process.exit(9); }",
    `process.stdout.write(${JSON.stringify(runtimeSample)});`,
  ].join('\n'));
  writeFileSync(path.join(dir, 'fake-codex.cmd'), `@"${process.execPath}" "%~dp0emit.cjs" %*\r\n`);
  for (const command of [path.join(dir, 'fake-codex'), path.join(dir, 'fake-codex.cmd')]) {
    const result = discover({ cwd: sandbox(), source: 'runtime', homeDir: sandbox(), includeDefaultRoots: false, command });
    assert.equal(result.surface, 'cli-runtime', command);
    assert.deepEqual(result.skills.map((skill) => skill.name).sort(), ['code-review', 'imagegen'], command);
  }
});

test('an explicitly requested runtime that is unusable is an error, not an empty list', () => {
  assert.throws(
    () => discover({ cwd: sandbox(), source: 'runtime', homeDir: sandbox(), command: 'definitely-not-a-codex-binary' }),
    /runtime discovery unavailable/,
  );
});

test('the group and lead flag are read from metadata without the body', () => {
  const root = path.join(sandbox(), 'skills');
  writeSkill(root, 'group-lead', { group: 'verify', lead: true, body: 'CATALOGUE-BODY-MARKER must never be read.\n' });
  writeSkill(root, 'group-leaf', { group: 'verify' });
  writeSkill(root, 'no-group');
  const lead = readFrontmatter(path.join(root, 'group-lead', 'SKILL.md'));
  assert.equal(lead.group, 'verify');
  assert.equal(lead.lead, true);
  const leaf = readFrontmatter(path.join(root, 'group-leaf', 'SKILL.md'));
  assert.equal(leaf.group, 'verify');
  assert.equal(leaf.lead, false);
  const bare = readFrontmatter(path.join(root, 'no-group', 'SKILL.md'));
  assert.equal(bare.group, null);
  assert.equal(bare.lead, false);
});

test('a discovered skill carries its group and lead flag', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  writeSkill(root, 'group-lead', { group: 'verify', lead: true });
  writeSkill(root, 'no-group');
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [root] });
  const lead = result.skills.find((skill) => skill.name === 'group-lead');
  assert.equal(lead.group, 'verify');
  assert.equal(lead.lead, true);
  const bare = result.skills.find((skill) => skill.name === 'no-group');
  assert.equal(bare.group, null);
  assert.equal(bare.lead, false);
});

test('the tree format groups skills by group, lead first, leaves alphabetical, ungrouped last', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  writeSkill(root, 'validate-it', { group: 'verify', lead: true, description: 'Choose the checks.' });
  writeSkill(root, 'browser-check', { group: 'verify', description: 'Prove it in a browser.' });
  writeSkill(root, 'code-look', { group: 'verify', description: 'Review a fixed slice.' });
  writeSkill(root, 'ship', { group: 'deliver', lead: true, description: 'Commit, PR, merge.' });
  writeSkill(root, 'loose-end', { description: 'Declares no group.' });
  const selfPath = fileURLToPath(new URL('../scripts/list-skills.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [selfPath, '--source', 'filesystem', '--no-default-roots', '--root', root, '--format', 'tree'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const lines = run.stdout.split(/\r?\n/).filter((line) => line.trim() !== '');
  // The first line says where the answer came from and how many groups it holds.
  assert.match(lines[0], /2 group\(s\), 5 skill\(s\) from filesystem/);
  // Each line yields its names in reading order: the group, then the lead on
  // the same line, or the one leaf hanging below.
  const names = lines.slice(1).flatMap((line) => line.replace(/^[\s│├└]+/, '').split(': ')[0].split(/\s*─\s*/).map((part) => part.trim()).filter(Boolean));
  assert.deepEqual(names, ['deliver', 'ship', 'verify', 'validate-it', 'browser-check', 'code-look', 'ungrouped', 'loose-end']);
  // A lead sits on the group's own line; a leaf hangs below it with its trigger.
  assert.match(lines[1], /^deliver .*ship: Commit, PR, merge\./);
  assert.match(lines.find((line) => line.includes('browser-check')), /^\s+[├└]─ browser-check: Prove it in a browser\./);
});

test('a lead\'s nested methods hang below it as lead/method, are not counted as skills, and a nested SKILL.md is not one', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  const lead = writeSkill(root, 'shape', { group: 'design', lead: true, description: 'Route visual work.' });
  writeSkill(root, 'tidy', { group: 'design', description: 'A sibling skill.' });
  for (const [name, description] of [['motion', 'Animate it.'], ['colour', 'Pick the palette.']]) {
    mkdirSync(path.join(lead, name), { recursive: true });
    writeFileSync(path.join(lead, name, 'METHOD.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\nMETHOD-BODY-MARKER\n`);
  }
  // A folder with neither entry file, and one carrying a stray SKILL.md, are not methods.
  mkdirSync(path.join(lead, 'references'), { recursive: true });
  writeSkill(lead, 'stray');
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [root] });
  assert.deepEqual(result.skills.map((skill) => skill.name).sort(), ['shape', 'tidy']);
  const found = result.skills.find((skill) => skill.name === 'shape');
  assert.deepEqual(found.methods.map((method) => [method.name, method.description]), [['colour', 'Pick the palette.'], ['motion', 'Animate it.']]);
  const selfPath = fileURLToPath(new URL('../scripts/list-skills.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [selfPath, '--source', 'filesystem', '--no-default-roots', '--root', root, '--format', 'tree'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.doesNotMatch(run.stdout, /METHOD-BODY-MARKER|stray/);
  const lines = run.stdout.split(/\r?\n/).filter((line) => line.trim() !== '');
  assert.match(lines[0], /1 group\(s\), 2 skill\(s\) from filesystem/);
  assert.match(lines[1], /^design .*shape: Route visual work\./);
  assert.deepEqual(lines.slice(2).map((line) => line.replace(/^[\s│├└─]+/, '').split(': ')[0]), ['shape/colour', 'shape/motion', 'tidy']);
  assert.match(lines[2], /^\s+├─ shape\/colour: Pick the palette\./);
});

test('a leaf\'s nested methods hang in its group as leaf/method, after the leaf', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  writeSkill(root, 'filing', { group: 'records', lead: true, description: 'Route documents.' });
  const leaf = writeSkill(root, 'prose', { group: 'records', description: 'Write it.' });
  mkdirSync(path.join(leaf, 'sources'), { recursive: true });
  writeFileSync(path.join(leaf, 'sources', 'METHOD.md'), '---\nname: sources\ndescription: Cite it.\n---\n');
  const selfPath = fileURLToPath(new URL('../scripts/list-skills.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [selfPath, '--source', 'filesystem', '--no-default-roots', '--root', root, '--format', 'tree'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const lines = run.stdout.split(/\r?\n/).filter((line) => line.trim() !== '');
  assert.match(lines[0], /1 group\(s\), 2 skill\(s\) from filesystem/);
  assert.deepEqual(lines.slice(2).map((line) => line.replace(/^[\s│├└─]+/, '').split(': ')[0]), ['prose', 'prose/sources']);
  assert.match(lines[3], /^\s+└─ prose\/sources: Cite it\./);
});

test('a group with no lead still prints, with the group name alone on its line', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  writeSkill(root, 'orphan-leaf', { group: 'records', description: 'No lead declared.' });
  const selfPath = fileURLToPath(new URL('../scripts/list-skills.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [selfPath, '--source', 'filesystem', '--no-default-roots', '--root', root, '--format', 'tree'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const lines = run.stdout.split(/\r?\n/).filter((line) => line.trim() !== '');
  assert.match(lines[1], /^records\s*$/);
  assert.match(lines[2], /orphan-leaf: No lead declared\./);
});

test('the argument contract rejects what it cannot answer', () => {
  assert.throws(() => parseArgs(['--source', 'telepathy']), /unknown source/);
  assert.throws(() => parseArgs(['--format', 'yaml']), /unknown format/);
  assert.throws(() => parseArgs(['--nonsense']), /unknown argument/);
  const parsed = parseArgs(['--source', 'filesystem', '--root', 'a', '--root', 'b', '--no-default-roots']);
  assert.deepEqual(parsed.extraRoots, ['a', 'b']);
  assert.equal(parsed.includeDefaultRoots, false);
});

// Modelled on installed plugin skills whose frontmatter runs past 8 KiB (a long
// workflow block ahead of the description), which once came back as the bare
// directory name with no description.
function writeLongFrontmatterSkill(root, name) {
  const dir = path.join(root, name);
  mkdirSync(dir, { recursive: true });
  const steps = Array.from({ length: 200 }, (_, i) => `  - step-${String(i).padStart(3, '0')}: a harmless generated line of workflow text`);
  const text = [
    '---',
    `name: ${name}`,
    'workflow:',
    ...steps,
    'description: The real description, declared after the long block.',
    'metadata:',
    '  group: build',
    '---',
    '',
    'Body.',
    '',
  ].join('\n');
  assert.ok(text.indexOf('\n---\n') > 9000, 'the fixture closes its frontmatter past 9,000 characters');
  writeFileSync(path.join(dir, 'SKILL.md'), text);
  return dir;
}

test('frontmatter that closes past 8 KiB still yields its name, description and metadata', () => {
  const dir = writeLongFrontmatterSkill(sandbox(), 'long-front');
  const front = readFrontmatter(path.join(dir, 'SKILL.md'));
  assert.equal(front.name, 'long-front');
  assert.equal(front.description, 'The real description, declared after the long block.');
  assert.equal(front.group, 'build');
  assert.equal(front.error, null);
});

test('a frontmatter that never closes is a parse error, not a directory-name skill', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  writeLongFrontmatterSkill(root, 'long-front');
  const broken = path.join(root, 'unclosed');
  mkdirSync(broken, { recursive: true });
  writeFileSync(path.join(broken, 'SKILL.md'), '---\nname: unclosed\ndescription: Never closed.\n\nBody with no closing delimiter.\n');
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [root] });
  assert.deepEqual(result.skills.map((skill) => skill.name), ['long-front']);
  assert.equal(result.skills[0].description, 'The real description, declared after the long block.');
  assert.equal(result.parse_errors.length, 1);
  assert.equal(result.parse_errors[0].path, path.join(broken, 'SKILL.md'));
  assert.match(result.parse_errors[0].reason, /not closed/);
  // The entry carries the kind of the root it was found in, so a consumer need
  // not infer it from the reported roots.
  assert.equal(result.parse_errors[0].kind, 'explicit');
});

test('a frontmatter with no name or no description is a parse error naming what is missing', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  writeSkill(root, 'fine');
  const nameless = path.join(root, 'nameless');
  mkdirSync(nameless, { recursive: true });
  writeFileSync(path.join(nameless, 'SKILL.md'), '---\ndescription: Has no name.\n---\n\nBody.\n');
  const result = discover({ cwd: sandbox(), source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [root] });
  assert.deepEqual(result.skills.map((skill) => skill.name), ['fine']);
  assert.deepEqual(result.parse_errors.map((entry) => entry.reason), ['no name in frontmatter']);
});

test('the read stops at a hard ceiling when the delimiter never comes', () => {
  const dir = path.join(sandbox(), 'endless');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: endless\n${'filler: x\n'.repeat(10000)}`);
  const front = readFrontmatter(path.join(dir, 'SKILL.md'));
  assert.equal(front.name, null);
  assert.match(front.error, /not closed within 65536 bytes/);
});

// A stand-in for the Codex CLI that answers only the two commands the script
// may run: `--version` and `debug prompt-input`. Anything else exits non-zero,
// so a test fails if the script ever asks the CLI for something else.
function fakeCodex(dir, { output, version = 'codex-cli 9.9.9-fake', delayMs = 0 }) {
  mkdirSync(dir, { recursive: true });
  const emit = path.join(dir, 'emit.cjs');
  writeFileSync(emit, [
    "const args = process.argv.slice(2).join(' ');",
    version === null
      ? "if (args === '--version') { process.exit(3); }"
      : `if (args === '--version') { process.stdout.write(${JSON.stringify(`${version}\n`)}); }`,
    `else if (args === 'debug prompt-input') { setTimeout(() => process.stdout.write(${JSON.stringify(output)}), ${delayMs}); }`,
    "else { process.stderr.write('unexpected args: ' + args); process.exit(9); }",
  ].join('\n'));
  if (process.platform === 'win32') {
    const shim = path.join(dir, 'fake-codex.cmd');
    writeFileSync(shim, `@"${process.execPath}" "%~dp0emit.cjs" %*\r\n`);
    return shim;
  }
  const bin = path.join(dir, 'fake-codex');
  writeFileSync(bin, `#!/bin/sh\nexec "${process.execPath}" "${emit}" "$@"\n`);
  chmodSync(bin, 0o755);
  return bin;
}

const slash = (value) => value.split(path.sep).join('/');

function runtimeOutput(rootLines, skillLines, extraMessages = []) {
  return JSON.stringify([
    {
      role: 'developer',
      content: [{ text: ['<skills_instructions>', '### Skill roots', ...rootLines, '### Available skills', ...skillLines, '</skills_instructions>'].join('\n') }],
    },
    ...extraMessages,
  ]);
}

test('a runtime result reports every description rendered shorter than its source, with both lengths', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  const long = 'Route interface and visual work through the project design authority, loading only the methods the task needs.';
  writeSkill(root, 'shortened', { description: long });
  writeSkill(root, 'whole', { description: 'Complete as written.' });
  writeSkill(root, 'unlisted', { description: 'On disk but never offered to the runtime.' });
  const rendered = long.slice(0, 40).trimEnd();
  const output = runtimeOutput(
    [`- \`r0\` = \`${slash(root)}\``],
    [`- shortened: ${rendered} (file: r0/shortened/SKILL.md)`, '- whole: Complete as written. (file: r0/whole/SKILL.md)'],
  );
  const command = fakeCodex(path.join(sandbox(), 'fake codex'), { output });
  const result = discover({ cwd: sandbox(), source: 'runtime', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [root], command });
  assert.equal(result.surface, 'cli-runtime');
  assert.deepEqual(result.truncated, [{ name: 'shortened', rendered_length: rendered.length, source_length: long.length, path: path.join(root, 'shortened') }]);
  assert.deepEqual(result.on_disk_not_listed.map((skill) => skill.name), ['unlisted']);

  // Both reports print with their counts in the text and tree outputs.
  const selfPath = fileURLToPath(new URL('../scripts/list-skills.mjs', import.meta.url));
  for (const format of ['text', 'tree']) {
    const run = spawnSync(process.execPath, [selfPath, '--source', 'runtime', '--no-default-roots', '--root', root, '--codex', command, '--format', format], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /^truncated descriptions: 1$/m, format);
    assert.match(run.stdout, new RegExp(`^  shortened: rendered ${rendered.length} of ${long.length} characters `, 'm'), format);
    assert.match(run.stdout, /^on disk, not listed: 1$/m, format);
    assert.match(run.stdout, /^  unlisted \(explicit\) /m, format);
    assert.match(run.stdout, /cli-runtime/, format);
  }
});

test('a double-quoted source description rendered decoded is not reported as shortened', () => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  writeSkill(root, 'escaped', { description: String.raw`"Line one\nnext a end."` });
  const output = runtimeOutput(
    [`- \`r0\` = \`${slash(root)}\``],
    ['- escaped: Line one next a end. (file: r0/escaped/SKILL.md)'],
  );
  const command = fakeCodex(path.join(sandbox(), 'fake codex'), { output });
  const result = discover({ cwd: sandbox(), source: 'runtime', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [root], command });
  assert.equal(result.surface, 'cli-runtime');
  assert.deepEqual(result.truncated, []);
});

test('a runtime-listed skill outside the scanned roots with unreadable frontmatter is a parse error', () => {
  const home = sandbox();
  const root = path.join(home, 'runtime-only');
  writeSkill(root, 'fine');
  const broken = path.join(root, 'unclosed');
  mkdirSync(broken, { recursive: true });
  writeFileSync(path.join(broken, 'SKILL.md'), '---\nname: unclosed\ndescription: Never closed.\n\nBody.\n');
  const output = runtimeOutput(
    [`- \`r0\` = \`${slash(root)}\``],
    ['- fine: A skill used to prove discovery works. (file: r0/fine/SKILL.md)', '- unclosed: Never closed. (file: r0/unclosed/SKILL.md)'],
  );
  const command = fakeCodex(path.join(sandbox(), 'fake codex'), { output });
  const result = discover({ cwd: sandbox(), source: 'runtime', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, command });
  assert.equal(result.surface, 'cli-runtime');
  assert.equal(result.parse_errors.length, 1);
  assert.equal(result.parse_errors[0].path, path.join(broken, 'SKILL.md'));
  assert.match(result.parse_errors[0].reason, /not closed/);
  assert.equal(result.parse_errors[0].kind, 'runtime');

  // The same file reached by the scan as well is reported once.
  const both = discover({ cwd: sandbox(), source: 'runtime', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [root], command });
  assert.deepEqual(both.parse_errors.map((entry) => [entry.path, entry.kind]), [[path.join(broken, 'SKILL.md'), 'explicit']]);

  // On Windows the runtime may spell the same file in another case; it is
  // still one file and one error.
  if (process.platform === 'win32') {
    const shouted = fakeCodex(path.join(sandbox(), 'fake codex shouted'), { output: runtimeOutput(
      [`- \`r0\` = \`${slash(root).toUpperCase()}\``],
      ['- fine: A skill used to prove discovery works. (file: r0/FINE/SKILL.md)', '- unclosed: Never closed. (file: r0/UNCLOSED/SKILL.md)'],
    ) });
    const once = discover({ cwd: sandbox(), source: 'runtime', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false, extraRoots: [root], command: shouted });
    assert.equal(once.parse_errors.length, 1);
  }
});

test('a runtime that stalls past the time limit is unavailable rather than blocking', () => {
  const command = fakeCodex(path.join(sandbox(), 'stalled'), { output: runtimeSample, delayMs: 2000 });
  // On Windows the timeout kills cmd.exe while the node it started sleeps on,
  // so the run uses the temp root as its cwd: an orphan holding a sandbox as
  // its working directory would block the sandbox cleanup.
  assert.throws(() => runRuntime(os.tmpdir(), command, null, 200), /runtime discovery unavailable/);
});

test('a filesystem result names its surface and the identity that holds offline', (t) => {
  const home = sandbox();
  const root = path.join(home, 'skills');
  writeSkill(root, 'on-disk');
  const cwd = sandbox();
  // The temp root can sit inside a repository (run-all puts it under
  // .local/checks), so git must not walk up past the sandbox: this identity is
  // the one that holds with no repository at all.
  const previousCeiling = process.env.GIT_CEILING_DIRECTORIES;
  process.env.GIT_CEILING_DIRECTORIES = path.dirname(cwd);
  t.after(() => {
    if (previousCeiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
    else process.env.GIT_CEILING_DIRECTORIES = previousCeiling;
  });
  const codexHome = path.join(home, '.codex');
  const result = discover({ cwd, source: 'filesystem', homeDir: home, codexHome, includeDefaultRoots: false, extraRoots: [root] });
  assert.equal(result.surface, 'filesystem');
  assert.deepEqual(result.truncated, []);
  assert.deepEqual(Object.keys(result.identity).sort(), ['codex_home', 'config', 'cwd', 'home', 'model', 'repository', 'runtime', 'skills_max_context_tokens', 'sources', 'user']);
  assert.equal(result.identity.user, (() => { try { return os.userInfo().username; } catch { return null; } })());
  assert.equal(result.identity.home, os.homedir());
  assert.equal(result.identity.codex_home, path.resolve(codexHome));
  assert.equal(result.identity.cwd, path.resolve(cwd));
  // No runtime measured this surface, the sandbox is outside any repository and
  // its Codex home carries no config.
  assert.equal(result.identity.runtime, null);
  assert.equal(result.identity.repository, null);
  assert.equal(result.identity.model, null);
  assert.equal(result.identity.skills_max_context_tokens, null);

  const selfPath = fileURLToPath(new URL('../scripts/list-skills.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [selfPath, '--source', 'filesystem', '--no-default-roots', '--root', root, '--format', 'text'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /^surface: filesystem$/m);
  assert.match(run.stdout, /^identity: user /m);
});

test('inside a repository the identity names its top level and an origin without credentials', () => {
  const repo = sandbox();
  const git = (...args) => spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  assert.equal(git('init', '-q').status, 0);
  assert.equal(git('remote', 'add', 'origin', 'https://someone:secret-token@example.com/owner/repo.git').status, 0);
  const nested = path.join(repo, 'src');
  mkdirSync(nested, { recursive: true });
  const home = sandbox();
  const result = discover({ cwd: nested, source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false });
  assert.equal(result.identity.repository.top_level.toLowerCase(), realpathSync.native(repo).toLowerCase());
  assert.equal(result.identity.repository.origin, 'https://example.com/owner/repo.git');

  // A token can ride in the query or fragment as well as the userinfo.
  assert.equal(git('remote', 'set-url', 'origin', 'https://example.com/owner/repo.git?access_token=secret#token=also').status, 0);
  const again = discover({ cwd: nested, source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false });
  assert.equal(again.identity.repository.origin, 'https://example.com/owner/repo.git');

  // A local path is not a URL: a `#` in it is part of the location, not a fragment.
  assert.equal(git('remote', 'set-url', 'origin', '/repos/issue#42/repo.git').status, 0);
  const local = discover({ cwd: nested, source: 'filesystem', homeDir: home, codexHome: path.join(home, '.codex'), includeDefaultRoots: false });
  assert.equal(local.identity.repository.origin, '/repos/issue#42/repo.git');
});

test('a runtime result names the CLI, its version, the model and the context budget', (t) => {
  const home = sandbox();
  // No project layer may leak in from a repository above the temp root.
  const previousCeiling = process.env.GIT_CEILING_DIRECTORIES;
  process.env.GIT_CEILING_DIRECTORIES = path.dirname(sandbox());
  t.after(() => {
    if (previousCeiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
    else process.env.GIT_CEILING_DIRECTORIES = previousCeiling;
  });
  const codexHome = path.join(home, '.codex');
  mkdirSync(codexHome, { recursive: true });
  writeFileSync(path.join(codexHome, 'config.toml'), [
    'model = "config-model" # the default model',
    'model_reasoning_effort = "medium"',
    '',
    '[skills]',
    'max_context_tokens = 6000',
    '',
    '[profiles.other]',
    'model = "profile-model"',
    '',
  ].join('\n'));
  const command = fakeCodex(path.join(sandbox(), 'versioned'), { output: runtimeSample });
  const result = discover({ cwd: sandbox(), source: 'runtime', homeDir: home, codexHome, includeDefaultRoots: false, command });
  assert.equal(result.surface, 'cli-runtime');
  assert.deepEqual(result.identity.runtime, { command, version: 'codex-cli 9.9.9-fake' });
  assert.equal(result.identity.model, 'config-model');
  assert.equal(result.identity.skills_max_context_tokens, 6000);
  assert.equal(result.identity.codex_home, path.resolve(codexHome));

  // A CLI that cannot report its version leaves the version null rather than failing.
  const silent = fakeCodex(path.join(sandbox(), 'silent'), { output: runtimeSample, version: null });
  const second = discover({ cwd: sandbox(), source: 'runtime', homeDir: home, codexHome, includeDefaultRoots: false, command: silent });
  assert.deepEqual(second.identity.runtime, { command: silent, version: null });
});

// Codex gives a trusted project's .codex/config.toml precedence over the user's
// config.toml, so the identity reads both and names the file behind each value.
test('a project config at the repository top level wins over the user config, field by field', (t) => {
  const home = sandbox();
  const codexHome = path.join(home, '.codex');
  mkdirSync(codexHome, { recursive: true });
  const userConfig = path.join(codexHome, 'config.toml');
  writeFileSync(userConfig, 'model = "user-model"\n\n[skills]\nmax_context_tokens = 6000\n');
  const repo = sandbox();
  assert.equal(spawnSync('git', ['-C', repo, 'init', '-q']).status, 0);
  mkdirSync(path.join(repo, '.codex'), { recursive: true });
  const projectConfig = path.join(realpathSync.native(repo), '.codex', 'config.toml');
  writeFileSync(projectConfig, 'model = "project-model"\n');
  const nested = path.join(repo, 'src');
  mkdirSync(nested, { recursive: true });

  const { identity } = discover({ cwd: nested, source: 'filesystem', homeDir: home, codexHome, includeDefaultRoots: false });
  assert.equal(identity.model, 'project-model');
  assert.equal(identity.skills_max_context_tokens, 6000);
  assert.equal(identity.config.user.toLowerCase(), path.resolve(userConfig).toLowerCase());
  assert.equal(identity.config.project.toLowerCase(), projectConfig.toLowerCase());
  assert.deepEqual(identity.sources, { model: 'project', skills_max_context_tokens: 'user' });

  // A single-quoted string and an underscore-separated integer are TOML too,
  // and a project value written that way still outranks the user's.
  writeFileSync(projectConfig, "model = 'literal-model'\nskills.max_context_tokens = 12_000\n");
  const literal = discover({ cwd: nested, source: 'filesystem', homeDir: home, codexHome, includeDefaultRoots: false }).identity;
  assert.equal(literal.model, 'literal-model');
  assert.equal(literal.skills_max_context_tokens, 12000);
  assert.deepEqual(literal.sources, { model: 'project', skills_max_context_tokens: 'project' });

  // Neither file setting a value reports it as unknown. The sandbox may sit in a
  // repository, so git must not walk up past it.
  const bare = sandbox();
  const previousCeiling = process.env.GIT_CEILING_DIRECTORIES;
  process.env.GIT_CEILING_DIRECTORIES = path.dirname(bare);
  t.after(() => {
    if (previousCeiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
    else process.env.GIT_CEILING_DIRECTORIES = previousCeiling;
  });
  const unset = discover({ cwd: bare, source: 'filesystem', homeDir: bare, codexHome: path.join(bare, '.codex'), includeDefaultRoots: false }).identity;
  assert.equal(unset.model, null);
  assert.deepEqual(unset.sources, { model: 'unknown', skills_max_context_tokens: 'unknown' });
});
