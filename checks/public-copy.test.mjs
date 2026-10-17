import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeAgents } from '../config/compose-agents.mjs';
import { publicTree, readWorkingTree } from '../config/publish-public.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'config/public-mirror.json'), 'utf8'));

// The one guard against personal and project strings in shared files: the
// public copy, built from the working tree, carries none.
test('the public copy of the working tree carries no denied string', () => {
  const { leaks } = publicTree(readWorkingTree(), config);
  assert.deepEqual(leaks, []);
});

test('the overlay replaces only the sections it numbers', () => {
  const shared = '## 01 About the owner\n\nGeneric.\n\n## 02 Talking to me\n\nShared.\n';
  assert.equal(composeAgents(shared, '## 01 About me\n\nMine.\n'), '## 01 About me\n\nMine.\n\n## 02 Talking to me\n\nShared.\n');
  assert.equal(composeAgents(shared, '## 02 Talk\n\nMine.\n'), '## 01 About the owner\n\nGeneric.\n\n## 02 Talk\n\nMine.\n');
  assert.equal(composeAgents(shared, undefined), shared);
});

test('an overlay section with nothing to replace, or text outside a section, is refused', () => {
  const shared = '## 01 About the owner\n\nGeneric.\n';
  assert.throws(() => composeAgents(shared, '## 07 Testing\n\nMine.\n'), /section 07 has no section to replace/);
  assert.throws(() => composeAgents(shared, 'Loose text.\n\n## 01 About me\n'), /text outside a numbered section/);
});

test('excluded paths stay out, replacements swap in and the owner overlay is never published', () => {
  const files = new Map([
    ['AGENTS.private.md', Buffer.from('## 01 About me\n')],
    ['README.md', Buffer.from('# private readme\n')],
    ['config/public-mirror/README.md', Buffer.from('# public readme\n')],
    ['config/public-mirror/registry.json', Buffer.from('{}\n')],
    ['config/public-mirror/LICENSE', Buffer.from('MIT\n')],
    ['skills/x/SKILL.md', Buffer.from('see [setup](../../harness-setup-guide.md)\n')],
    ['harness-setup-guide.md', Buffer.from('setup\n')],
  ]);
  const { tree, unlinked } = publicTree(files, config);
  assert.equal(tree.has('AGENTS.private.md'), false);
  assert.equal(tree.get('README.md').toString(), '# public readme\n');
  assert.equal(tree.get('LICENSE').toString(), 'MIT\n');
  assert.equal(tree.has('config/public-mirror/README.md'), false);
  assert.deepEqual(unlinked, ['skills/x/SKILL.md -> ../../harness-setup-guide.md']);
  assert.equal(tree.get('skills/x/SKILL.md').toString(), 'see setup\n');
});

test('a binary file is scanned too, and a short term matches only as a word', () => {
  // Built from parts, so this file does not itself carry the strings it tests.
  const owner = ['Mat', 'thew'].join('');
  const term = ['d', 'cp'].join('');
  const files = new Map([
    ['README.md', Buffer.from('# readme\n')],
    ['config/public-mirror/README.md', Buffer.from('# public readme\n')],
    ['config/public-mirror/registry.json', Buffer.from('{}\n')],
    ['config/public-mirror/LICENSE', Buffer.from('MIT\n')],
    ['cover.png', Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0]), Buffer.from(`Author: ${owner}`)])],
    ['le.bin', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`Author: ${owner}`, 'utf16le')])],
    ['be.bin', Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(`Author: ${owner}`, 'utf16le').swap16()])],
    // Odd lengths and odd alignments, with a nonzero byte after the text.
    ['be-tail.bin', Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(owner, 'utf16le').swap16(), Buffer.from([0xff])])],
    ['be-odd.bin', Buffer.concat([Buffer.from([0x01]), Buffer.from(owner, 'utf16le').swap16(), Buffer.from([0xff, 0xff])])],
    ['le-odd.bin', Buffer.concat([Buffer.from([0x01]), Buffer.from(owner, 'utf16le'), Buffer.from([0xff])])],
    ['late.bin', Buffer.concat([Buffer.from('A'.repeat(9000)), Buffer.from(owner, 'utf16le')])],
    ['pnpm-lock.yaml', Buffer.from(`integrity: sha512-1${term}PU0\n`)],
    ['notes.md', Buffer.from(`The ${term.toUpperCase()} reader\n`)],
  ]);
  const { leaks } = publicTree(files, { ...config, deny: [term] });
  assert.deepEqual(leaks, [
    `cover.png: binary carries "${owner}"`,
    `le.bin: binary carries "${owner}"`,
    `be.bin: binary carries "${owner}"`,
    `be-tail.bin: binary carries "${owner}"`,
    `be-odd.bin: binary carries "${owner}"`,
    `le-odd.bin: binary carries "${owner}"`,
    `late.bin: binary carries "${owner}"`,
    `notes.md:1: "${term}"`,
  ]);
});
