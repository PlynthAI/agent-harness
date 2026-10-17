import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import {
  STATUSES,
  IDENTITY_FIELDS,
  globToRegExp,
  matchesAny,
  normalisePath,
  validateProfile,
  selectChecks,
  assessEvidence,
  compareIdentity,
  assessReviewEvidence,
} from '../scripts/select-checks.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(here, '..', 'scripts', 'select-checks.mjs');

// A fixture profile in the shape a project would own. Its commands are
// deliberately not real tools, to show the selector carries no tool of its own.
function fixtureProfile() {
  return {
    schemaVersion: 1,
    project: 'fixture',
    profiles: [
      { id: 'docs', kind: 'non-product', when: ['docs/**', '**/*.md'], checks: ['links'] },
      { id: 'backend', kind: 'product', when: ['src/**/*.py', 'tests/**/*.py'], checks: ['lint', 'types', 'unit'] },
      { id: 'frontend', kind: 'product', when: ['app/**/*.tsx', 'components/**/*.tsx'], checks: ['eslint', 'tsc', 'browser'] },
    ],
    checks: [
      { id: 'links', run: 'run links', required: true },
      { id: 'lint', run: 'run lint', required: true },
      { id: 'types', run: 'run types', required: true },
      { id: 'unit', run: 'run unit', required: true },
      { id: 'eslint', run: 'run eslint', required: true },
      { id: 'tsc', run: 'run tsc', required: true },
      { id: 'browser', run: 'run browser', required: false, requires: ['dev-server'] },
    ],
  };
}

function identityFor(scope) {
  return {
    project: 'fixture',
    contentIdentity: 'tree-a',
    dependencyIdentity: 'lock-1',
    environment: 'win32-node22',
    scope,
  };
}

function recordFor(selection, statuses) {
  return {
    candidate: 'a'.repeat(40),
    identity: identityFor(selection.activatedProfiles.join('+')),
    checks: selection.selectedChecks.map((check) => ({ id: check.id, status: statuses[check.id] || 'pass' })),
  };
}

function currentFor(selection, overrides = {}) {
  return { ...identityFor(selection.activatedProfiles.join('+')), ...overrides };
}

function selectionAndCurrent() {
  const selection = selectChecks(fixtureProfile(), ['src/service/ingest.py']);
  return { selection, current: currentFor(selection) };
}

// The in-harness reviewer's record, in the shape the review-evidence assessor
// reads: the identity it read, whether the pass completed, and any unresolved
// confirmed blocker.
function reviewerRecord(scope, overrides = {}) {
  return {
    slot: '01',
    engine: 'in-harness-reviewer',
    candidate: `commit ${'a'.repeat(40)}`,
    identity: identityFor(scope),
    complete: true,
    blockers: [],
    ...overrides,
  };
}

// A normalized SF-047 slot-02 record. It is never read directly by the assessor
// now; it is only the artifact a thin envelope points at, so nothing here
// re-parses native OCR output.
function nativeRecord(overrides = {}) {
  return {
    schema_version: 'ocr.slot-02/v1',
    engine: 'native-open-code-review',
    outcome: 'complete',
    complete: true,
    reasons: [],
    candidate: { requested: `commit ${'a'.repeat(40)}`, resolved: 'a'.repeat(40), match: true },
    coverage: {
      selected: 2, completed: 2, reused: 0, reviewed: 2, failed: 0, waived: 0, unreviewed: [],
      excluded: { available: true, count: 0, files: [] },
    },
    raw: { result: 'artifacts/run/native-result.json', stdout: 'artifacts/run/stdout.txt', stderr: 'artifacts/run/stderr.txt', record: 'artifacts/run/slot-02.json' },
    ...overrides,
  };
}

// The binding envelope the team lead issues around a native run: it names the exact
// normalized record bytes, the candidate the native run resolved, the identity
// it read and the triage of that run's findings. Slot 02 is qualified through
// this envelope, never from a bare normalized record.
const envelopeDir = mkdtempSync(join(tmpdir(), 'select-checks-envelope-'));
after(() => rmSync(envelopeDir, { recursive: true, force: true }));
let envelopeSeq = 0;

function sha256(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function writeEnvelopeBytes(text) {
  envelopeSeq += 1;
  const recordPath = join(envelopeDir, `slot-02-${envelopeSeq}.json`);
  writeFileSync(recordPath, text, 'utf8');
  return { recordPath, recordSha256: sha256(text) };
}

function envelope(record, overrides = {}) {
  const { recordPath, recordSha256 } = writeEnvelopeBytes(JSON.stringify(record, null, 2));
  return {
    recordPath,
    recordSha256,
    reviewedCandidate: (record.candidate && record.candidate.resolved) || null,
    identity: identityFor('backend'),
    blockers: [],
    ...overrides,
  };
}

// An envelope whose recordSha256 is measured from bytes other than the ones now
// sitting at recordPath - the "same head, different run" substitution case.
function envelopeOverText(text, overrides = {}) {
  const { recordPath, recordSha256 } = writeEnvelopeBytes(text);
  return {
    recordPath,
    recordSha256,
    reviewedCandidate: 'a'.repeat(40),
    identity: identityFor('backend'),
    blockers: [],
    ...overrides,
  };
}

function currentIdentity(overrides = {}) {
  return { ...identityFor('backend'), ...overrides };
}

// A whole review pair on one current identity, with every fresh input sharing
// that identity so a test can move a single thing and prove which seam failed.
function pairFor(current, options = {}) {
  const selection = options.selection ?? selectChecks(fixtureProfile(), ['src/service/ingest.py']);
  const validation = options.validation ?? assessEvidence(selection, recordFor(selection, {}), current);
  return {
    selection,
    current,
    validation,
    slot01: reviewerRecord('backend', { identity: current, ...(options.slot01 ?? {}) }),
    slot02: options.slot02 ?? envelope(options.record ?? nativeRecord(), { identity: current, ...(options.envelope ?? {}) }),
  };
}

test('the profile contract rejects what it cannot select from', () => {
  assert.equal(validateProfile(fixtureProfile()).ok, true);

  const unknownCheck = fixtureProfile();
  unknownCheck.profiles[1].checks.push('nope');
  const result = validateProfile(unknownCheck);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /names unknown check nope/);

  const missingCommand = fixtureProfile();
  missingCommand.checks[0].run = '';
  assert.equal(validateProfile(missingCommand).ok, false);

  const duplicate = fixtureProfile();
  duplicate.checks.push({ id: 'lint', run: 'x', required: true });
  assert.match(validateProfile(duplicate).errors.join('\n'), /duplicate check id/);

  const badKind = fixtureProfile();
  badKind.profiles[0].kind = 'documentation';
  assert.match(validateProfile(badKind).errors.join('\n'), /kind must be product or non-product/);
});

test('a docs-only change runs no product check', () => {
  const selection = selectChecks(fixtureProfile(), ['docs/guide.md', 'notes/plan.md']);
  assert.deepEqual(selection.activatedProfiles, ['docs']);
  assert.deepEqual(selection.productProfiles, []);
  assert.deepEqual(selection.selectedChecks.map((check) => check.id), ['links']);
  assert.deepEqual(selection.unmappedPaths, []);
});

test('a backend change selects the backend checks and nothing from another surface', () => {
  const selection = selectChecks(fixtureProfile(), ['src/service/ingest.py']);
  assert.deepEqual(selection.activatedProfiles, ['backend']);
  assert.deepEqual(selection.requiredChecks, ['lint', 'types', 'unit']);
  assert.equal(selection.selectedChecks.some((check) => check.id === 'browser'), false);
});

test('a mixed change keeps every activated product obligation', () => {
  const selection = selectChecks(fixtureProfile(), ['src/service/ingest.py', 'app/page.tsx', 'docs/readme.md']);
  assert.deepEqual([...selection.activatedProfiles].sort(), ['backend', 'docs', 'frontend']);
  assert.deepEqual(selection.productProfiles, ['backend', 'frontend']);
  assert.deepEqual([...selection.requiredChecks].sort(), ['eslint', 'links', 'lint', 'tsc', 'types', 'unit']);
  assert.deepEqual(selection.optionalChecks, ['browser']);
});

test('a path no profile covers is reported rather than silently passing', () => {
  const selection = selectChecks(fixtureProfile(), ['infra/terraform/main.tf']);
  assert.deepEqual(selection.activatedProfiles, []);
  assert.deepEqual(selection.selectedChecks, []);
  assert.deepEqual(selection.unmappedPaths, ['infra/terraform/main.tf']);
});

test('globs match by segment and normalise Windows separators', () => {
  assert.equal(normalisePath('app\\page.tsx'), 'app/page.tsx');
  assert.equal(matchesAny(['app/**/*.tsx'], 'app\\deep\\nested\\page.tsx'), true);
  assert.equal(matchesAny(['app/**/*.tsx'], 'app/page.tsx'), true);
  assert.equal(matchesAny(['app/*.tsx'], 'app/deep/page.tsx'), false);
  assert.equal(matchesAny(['**/*.md'], 'readme.md'), true);
  assert.equal(globToRegExp('docs/**').test('docs/a/b/c.md'), true);
});

test('a required check that is not a pass blocks qualification', () => {
  const profile = fixtureProfile();
  const selection = selectChecks(profile, ['src/service/ingest.py']);
  assert.equal(assessEvidence(selection, recordFor(selection, {}), currentFor(selection)).ok, true);

  for (const status of ['fail', 'skipped', 'unavailable', 'cancelled', 'not_run']) {
    const assessment = assessEvidence(selection, recordFor(selection, { unit: status }), currentFor(selection));
    assert.equal(assessment.ok, false, `${status} must not qualify`);
    assert.match(assessment.failures.join('\n'), new RegExp(`unit is ${status}`));
  }
});

test('an optional check that is unavailable is noted, not counted as a failure', () => {
  const profile = fixtureProfile();
  const selection = selectChecks(profile, ['app/page.tsx']);
  const assessment = assessEvidence(selection, recordFor(selection, { browser: 'unavailable' }), currentFor(selection));
  assert.equal(assessment.ok, true);
  assert.match(assessment.notes.join('\n'), /browser is unavailable/);
});

test('a missing result, an unknown status and an unnamed candidate are all failures', () => {
  const profile = fixtureProfile();
  const selection = selectChecks(profile, ['src/service/ingest.py']);
  const current = currentFor(selection);

  const missing = recordFor(selection, {});
  missing.checks = missing.checks.filter((entry) => entry.id !== 'types');
  assert.match(assessEvidence(selection, missing, current).failures.join('\n'), /no result recorded for types/);

  const unknown = recordFor(selection, { unit: 'probably-fine' });
  assert.match(assessEvidence(selection, unknown, current).failures.join('\n'), /unknown status/);

  const anonymous = recordFor(selection, {});
  delete anonymous.candidate;
  assert.match(assessEvidence(selection, anonymous, current).failures.join('\n'), /does not name the candidate/);
});

test('the status vocabulary is exactly the documented six', () => {
  assert.deepEqual(STATUSES, ['pass', 'fail', 'skipped', 'unavailable', 'cancelled', 'not_run']);
});

test('the identity comparator uses exactly the five project-issued fields', () => {
  assert.deepEqual(IDENTITY_FIELDS, ['project', 'contentIdentity', 'dependencyIdentity', 'environment', 'scope']);
  assert.equal(compareIdentity(identityFor('backend'), identityFor('backend')).status, 'current');

  const noCurrent = compareIdentity(identityFor('backend'), null);
  assert.equal(noCurrent.status, 'unknown');
  assert.match(noCurrent.reasons.join('\n'), /no current identity/);

  const noRecorded = compareIdentity(undefined, identityFor('backend'));
  assert.equal(noRecorded.status, 'unknown');
  assert.match(noRecorded.reasons.join('\n'), /carries no identity/);

  const incomplete = compareIdentity({ ...identityFor('backend'), contentIdentity: '' }, identityFor('backend'));
  assert.equal(incomplete.status, 'unknown');
  assert.match(incomplete.reasons.join('\n'), /incomplete/);
});

test('the same contents under a new commit stay reusable, and changed content does not', () => {
  const { selection, current } = selectionAndCurrent();
  const record = recordFor(selection, {});
  // A new commit with an identical content identity, and the pointer that says
  // where the earlier receipt lives.
  record.candidate = 'b'.repeat(40);
  record.reuse = { of: 'artifacts/run-1/evidence.json' };

  const assessment = assessEvidence(selection, record, current);
  assert.equal(assessment.ok, true, assessment.failures.join('; '));
  assert.equal(assessment.freshness.status, 'current');

  const moved = assessEvidence(selection, record, currentFor(selection, { contentIdentity: 'tree-b' }));
  assert.equal(moved.ok, false);
  assert.equal(moved.freshness.status, 'stale');
  assert.deepEqual(moved.freshness.changedFields, ['contentIdentity']);
  assert.equal(moved.freshness.scope, 'backend');
  assert.match(moved.freshness.reasons.join('\n'), /stale for scope 'backend'/);
});

test('dependency, environment, scope and review-base changes each invalidate reuse', () => {
  const { selection } = selectionAndCurrent();
  const record = recordFor(selection, {});

  for (const field of ['dependencyIdentity', 'environment', 'scope']) {
    const assessment = assessEvidence(selection, record, currentFor(selection, { [field]: 'moved' }));
    assert.equal(assessment.ok, false, `${field} drift must not qualify`);
    assert.equal(assessment.freshness.status, 'stale');
    assert.ok(assessment.freshness.changedFields.includes(field), `${field} must be named`);
  }

  // A review's comparison base is part of its content identity: a changed base
  // is a changed contentIdentity even when the target tree is untouched.
  const baseMoved = assessEvidence(selection, record, currentFor(selection, { contentIdentity: 'base-2..tree-a' }));
  assert.equal(baseMoved.freshness.status, 'stale');
});

test('a wording-only change outside the code scope leaves the proof current', () => {
  const { selection, current } = selectionAndCurrent();
  const record = recordFor(selection, {});
  record.candidate = 'c'.repeat(40);
  // The optional wording document is outside the code scope, so the project
  // issues the same content identity and the proof stands.
  const assessment = assessEvidence(selection, record, current);
  assert.equal(assessment.ok, true, assessment.failures.join('; '));
  assert.equal(assessment.freshness.status, 'current');
});

test('a changed contract invalidates the proof it belongs to', () => {
  const { selection } = selectionAndCurrent();
  const record = recordFor(selection, {});
  // Contract-bearing documentation is part of the content identity, so a
  // changed contract is a changed contentIdentity, not a wording-only edit.
  const assessment = assessEvidence(selection, record, currentFor(selection, { contentIdentity: 'contract-2' }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.freshness.status, 'stale');
  assert.ok(assessment.freshness.changedFields.includes('contentIdentity'));
});

test('one scope moving does not invalidate an unrelated scope', () => {
  const selection = selectChecks(fixtureProfile(), ['src/service/ingest.py', 'app/page.tsx']);
  const backendRecord = { ...recordFor(selection, {}), identity: identityFor('backend') };
  const frontendRecord = { ...recordFor(selection, {}), identity: identityFor('frontend') };
  const current = identityFor('backend');
  current.scope = 'backend';

  assert.equal(assessEvidence(selection, backendRecord, current).freshness.status, 'current');
  const frontendCurrent = { ...identityFor('frontend'), contentIdentity: 'tree-b' };
  const frontend = assessEvidence(selection, frontendRecord, frontendCurrent);
  assert.equal(frontend.freshness.status, 'stale');
  assert.equal(frontend.freshness.scope, 'frontend');
});

test('missing current identity fails closed while the result status is still reported', () => {
  const { selection } = selectionAndCurrent();
  const assessment = assessEvidence(selection, recordFor(selection, {}));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.freshness.status, 'unknown');
  assert.match(assessment.freshness.reasons.join('\n'), /no current identity/);
  assert.deepEqual(assessment.failures, []);
});

test('a record that agrees with its own reuse claim still fails against changed current input', () => {
  const { selection } = selectionAndCurrent();
  const record = recordFor(selection, {});
  // Self-consistent: every reuse field copies the record's own values, which is
  // exactly the comparison that used to pass while the current input had moved.
  record.reuse = {
    of: 'artifacts/run-1/evidence.json',
    candidate: record.candidate,
    contentIdentity: 'tree-a',
    dependencyIdentity: 'lock-1',
    environment: 'win32-node22',
    scope: 'backend',
  };
  const assessment = assessEvidence(selection, record, currentFor(selection, { contentIdentity: 'tree-b' }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.freshness.status, 'stale');
  assert.match(assessment.notes.join('\n'), /reuse is a pointer only/);
});

test('the method carries no project command of its own', () => {
  const source = readFileSync(scriptPath, 'utf8');
  for (const tool of ['eslint', 'pytest', 'playwright', 'npm run', 'uv run', 'pnpm', 'ruff']) {
    assert.equal(source.toLowerCase().includes(tool), false, `the selector must not embed ${tool}`);
  }
  assert.equal(/(?:^|[\s"'])[A-Za-z]:[\\/]/.test(source), false, 'the selector must not embed a host path');
});

test('the command line selects from a profile file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'select-checks-'));
  try {
    const profilePath = join(dir, 'profile.json');
    writeFileSync(profilePath, JSON.stringify(fixtureProfile()), 'utf8');
    const output = execFileSync(process.execPath, [scriptPath, 'select', '--profile', profilePath, '--changed', 'app/page.tsx'], { encoding: 'utf8' });
    const parsed = JSON.parse(output);
    assert.deepEqual(parsed.activatedProfiles, ['frontend']);
    assert.deepEqual(parsed.requiredChecks, ['eslint', 'tsc']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a product profile may not match every path', () => {
  const profile = fixtureProfile();
  profile.profiles.push({ id: 'everything', kind: 'product', when: ['**'], checks: ['unit'] });
  const result = validateProfile(profile);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /matches every path/);

  // The failure it prevents: a docs-only change pulling in a product check.
  const clean = fixtureProfile();
  const selection = selectChecks(clean, ['docs/guide.md']);
  assert.deepEqual(selection.requiredChecks, ['links']);
});

test('a check that needs something first reports it as a prerequisite', () => {
  const profile = fixtureProfile();
  const selection = selectChecks(profile, ['app/page.tsx']);
  assert.deepEqual(selection.prerequisites, ['dev-server']);
  assert.match(assessEvidence(selection, recordFor(selection, { browser: 'unavailable' }), currentFor(selection)).notes.join('\n'), /confirm these prerequisites/);

  const invalid = fixtureProfile();
  invalid.checks[0].requires = ['ok', ''];
  assert.match(validateProfile(invalid).errors.join('\n'), /requires must be an array of non-empty strings/);
});

test('an unmapped path is not a green result on either path', () => {
  const profile = fixtureProfile();
  const selection = selectChecks(profile, ['infra/terraform/main.tf']);
  const assessment = assessEvidence(selection, { candidate: 'a'.repeat(40), checks: [] });
  assert.equal(assessment.ok, false);
  assert.match(assessment.failures.join('\n'), /matched no profile/);
});

test('the shipped evidence record is the shape the assessor reads', () => {
  const templatePath = join(here, '..', 'templates', 'evidence.json');
  const template = JSON.parse(readFileSync(templatePath, 'utf8'));
  assert.deepEqual(template.statusVocabulary, STATUSES);
  assert.deepEqual(Object.keys(template.identity).sort(), [...IDENTITY_FIELDS].sort());

  const profile = fixtureProfile();
  const selection = selectChecks(profile, ['src/service/ingest.py']);
  const record = {
    ...template,
    candidate: 'a'.repeat(40),
    identity: { ...template.identity, scope: 'backend' },
    checks: selection.selectedChecks.map((check) => ({ id: check.id, status: 'pass' })),
  };
  const assessment = assessEvidence(selection, record, { ...record.identity });
  assert.equal(assessment.ok, true, assessment.failures.join('; '));
});

test('the command line fails closed on an unknown command and on a non-zero selection', () => {
  const dir = mkdtempSync(join(tmpdir(), 'select-checks-cli-'));
  const run = (...args) => {
    try {
      const out = execFileSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8' });
      return { code: 0, out };
    } catch (error) {
      return { code: error.status, out: String(error.stdout || '') };
    }
  };
  try {
    const profilePath = join(dir, 'profile.json');
    writeFileSync(profilePath, JSON.stringify(fixtureProfile()), 'utf8');
    assert.equal(run('assesss', '--profile', profilePath, '--changed', 'a.py').code, 2);
    assert.equal(run('select', '--profile', profilePath, '--changed', 'infra/main.tf').code, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the command line assesses against a separately supplied current identity', () => {
  const dir = mkdtempSync(join(tmpdir(), 'select-checks-current-'));
  const run = (...args) => {
    try {
      const out = execFileSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8' });
      return { code: 0, out };
    } catch (error) {
      return { code: error.status, out: String(error.stdout || '') };
    }
  };
  try {
    const profilePath = join(dir, 'profile.json');
    writeFileSync(profilePath, JSON.stringify(fixtureProfile()), 'utf8');
    const { selection, current } = selectionAndCurrent();
    const recordPath = join(dir, 'record.json');
    writeFileSync(recordPath, JSON.stringify(recordFor(selection, {})), 'utf8');
    const currentPath = join(dir, 'current.json');
    writeFileSync(currentPath, JSON.stringify(current), 'utf8');

    const matched = run('assess', '--profile', profilePath, '--changed', 'src/service/ingest.py', '--record', recordPath, '--current', currentPath);
    assert.equal(matched.code, 0);
    assert.equal(JSON.parse(matched.out).assessment.freshness.status, 'current');

    // Without --current the freshness is unknown, so the assessment fails closed.
    const anonymous = run('assess', '--profile', profilePath, '--changed', 'src/service/ingest.py', '--record', recordPath);
    assert.equal(anonymous.code, 1);
    assert.equal(JSON.parse(anonymous.out).assessment.freshness.status, 'unknown');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('two completed slots on the current identity are both reusable', () => {
  const { selection, current } = selectionAndCurrent();
  const validation = assessEvidence(selection, recordFor(selection, {}), current);
  const assessment = assessReviewEvidence({ current, validation, slot01: reviewerRecord('backend'), slot02: envelope(nativeRecord()) });
  assert.equal(assessment.ok, true, assessment.failures.join('; '));
  assert.deepEqual(assessment.reusableSlots, ['01', '02']);
  assert.deepEqual(assessment.staleScopes, []);
  assert.deepEqual(assessment.coverageGaps, []);
  assert.deepEqual(assessment.failures, []);
});

test('slot 02 is consumed through an envelope that points at its normalized record', () => {
  const dir = mkdtempSync(join(tmpdir(), 'select-checks-slot02-'));
  try {
    const { selection, current } = selectionAndCurrent();
    const validation = assessEvidence(selection, recordFor(selection, {}), current);
    const recordText = JSON.stringify(nativeRecord(), null, 2);
    const slot02Path = join(dir, 'slot-02.json');
    writeFileSync(slot02Path, recordText, 'utf8');
    const byReference = assessReviewEvidence({
      current,
      validation,
      slot01: reviewerRecord('backend'),
      slot02: { recordPath: slot02Path, recordSha256: sha256(recordText), reviewedCandidate: 'a'.repeat(40), identity: current, blockers: [] },
    });
    assert.equal(byReference.ok, true, byReference.failures.join('; '));
    assert.equal(byReference.slots['02'].status, 'reusable');
    // The raw evidence paths the native adapter recorded are carried through.
    assert.equal(byReference.slots['02'].raw.record, 'artifacts/run/slot-02.json');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a partial or failed native run never counts as a completed pass', () => {
  const { selection, current } = selectionAndCurrent();
  const validation = assessEvidence(selection, recordFor(selection, {}), current);

  const partial = assessReviewEvidence({ current, validation, slot01: reviewerRecord('backend'), slot02: envelope(nativeRecord({ outcome: 'partial', complete: false })) });
  assert.equal(partial.ok, false);
  assert.equal(partial.slots['02'].status, 'incomplete');
  assert.equal(partial.coverageGaps[0].kind, 'partial');
  assert.deepEqual(partial.reusableSlots, ['01']);

  const failed = assessReviewEvidence({ current, validation, slot01: reviewerRecord('backend'), slot02: envelope(nativeRecord({ outcome: 'failed', complete: false })) });
  assert.equal(failed.ok, false);
  assert.equal(failed.slots['02'].status, 'failed');
  assert.match(failed.failures.join('\n'), /slot 02 failed/);

  const mismatched = assessReviewEvidence({ current, validation, slot01: reviewerRecord('backend'), slot02: envelope(nativeRecord({ candidate: { requested: 'commit x', resolved: 'b'.repeat(40), match: false } })) });
  assert.equal(mismatched.slots['02'].status, 'stale');
  assert.equal(mismatched.staleScopes[0].slot, '02');
});

test('a policy-permitted native skip stays a visible gap, not a completed pass', () => {
  const { selection, current } = selectionAndCurrent();
  const validation = assessEvidence(selection, recordFor(selection, {}), current);
  const skipped = assessReviewEvidence({
    current,
    validation,
    slot01: reviewerRecord('backend'),
    slot02: envelope(nativeRecord({
      outcome: 'skipped',
      complete: false,
      reasons: ['ocr excludes prose by extension'],
      coverage: {
        selected: 0, completed: 0, reused: 0, reviewed: 0, failed: 0, waived: 0, unreviewed: [],
        excluded: { available: true, count: 2, files: [{ path: 'docs/a.md', reason: 'extension' }, { path: 'docs/b.md', reason: 'extension' }] },
      },
    })),
  });
  assert.equal(skipped.ok, false);
  assert.equal(skipped.slots['02'].status, 'skipped');
  assert.equal(skipped.coverageGaps.length, 1);
  assert.equal(skipped.coverageGaps[0].kind, 'skipped');
  assert.match(skipped.coverageGaps[0].reason, /docs\/a\.md/);
  // A documented skip is a gap, not an execution failure.
  assert.deepEqual(skipped.failures, []);
});

test('an unresolved confirmed blocker keeps slot 01 out of reuse', () => {
  const { selection, current } = selectionAndCurrent();
  const validation = assessEvidence(selection, recordFor(selection, {}), current);
  const blocked = assessReviewEvidence({
    current,
    validation,
    slot01: reviewerRecord('backend', { blockers: ['null deref at src/service/ingest.py:42'] }),
    slot02: envelope(nativeRecord()),
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.slots['01'].status, 'blocked');
  assert.match(blocked.failures.join('\n'), /unresolved confirmed blockers/);
  assert.deepEqual(blocked.reusableSlots, ['02']);
});

test('a slot-01 identity that moved is stale and names its scope', () => {
  const { selection, current } = selectionAndCurrent();
  const validation = assessEvidence(selection, recordFor(selection, {}), current);
  const stale = assessReviewEvidence({
    current,
    validation,
    slot01: reviewerRecord('backend', { identity: { ...identityFor('backend'), contentIdentity: 'tree-b' } }),
    slot02: envelope(nativeRecord()),
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.slots['01'].status, 'stale');
  assert.equal(stale.staleScopes[0].slot, '01');
  assert.equal(stale.staleScopes[0].scope, 'backend');
});

test('stale validation keeps the review evidence out of reuse', () => {
  const { selection, current } = selectionAndCurrent();
  const staleValidation = assessEvidence(selection, recordFor(selection, {}), currentFor(selection, { contentIdentity: 'tree-b' }));
  const assessment = assessReviewEvidence({ current, validation: staleValidation, slot01: reviewerRecord('backend'), slot02: envelope(nativeRecord()) });
  assert.equal(assessment.ok, false);
  assert.match(assessment.failures.join('\n'), /validation assessment is not qualified/);
  assert.ok(assessment.staleScopes.some((entry) => entry.slot === 'validation'));
  assert.deepEqual(assessment.reusableSlots, ['01', '02']);
});

test('without a current identity no slot is reusable', () => {
  const { selection, current } = selectionAndCurrent();
  const validation = assessEvidence(selection, recordFor(selection, {}), current);
  const assessment = assessReviewEvidence({ current: null, validation, slot01: reviewerRecord('backend'), slot02: envelope(nativeRecord()) });
  assert.equal(assessment.ok, false);
  assert.deepEqual(assessment.reusableSlots, []);
  assert.equal(assessment.slots['02'].status, 'incomplete');
  assert.match(assessment.slots['02'].reasons.join('\n'), /no current identity/);
});

test('the command line assesses a review pair by reference', () => {
  const dir = mkdtempSync(join(tmpdir(), 'select-checks-review-'));
  const run = (...args) => {
    try {
      const out = execFileSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8' });
      return { code: 0, out };
    } catch (error) {
      return { code: error.status, out: String(error.stdout || '') };
    }
  };
  try {
    const { selection, current } = selectionAndCurrent();
    const validation = assessEvidence(selection, recordFor(selection, {}), current);
    const write = (name, value) => {
      const path = join(dir, name);
      writeFileSync(path, JSON.stringify(value), 'utf8');
      return path;
    };
    const currentPath = write('current.json', current);
    const validationPath = write('validation.json', validation);
    const slot01Path = write('slot01.json', reviewerRecord('backend'));
    const normalizedPath = join(dir, 'normalized-slot-02.json');
    const normalizedText = JSON.stringify(nativeRecord(), null, 2);
    writeFileSync(normalizedPath, normalizedText, 'utf8');
    const slot02Path = write('slot02-envelope.json', {
      recordPath: normalizedPath,
      recordSha256: sha256(normalizedText),
      reviewedCandidate: 'a'.repeat(40),
      identity: current,
      blockers: [],
    });

    const pair = run('assess-review', '--current', currentPath, '--validation', validationPath, '--slot01', slot01Path, '--slot02', slot02Path);
    assert.equal(pair.code, 0);
    assert.deepEqual(JSON.parse(pair.out).reusableSlots, ['01', '02']);

    // A skipped native slot fails closed on the command line too.
    const skippedPath = write('slot02-skip.json', envelope(nativeRecord({ outcome: 'skipped', complete: false }), { identity: current }));
    const skipped = run('assess-review', '--current', currentPath, '--validation', validationPath, '--slot01', slot01Path, '--slot02', skippedPath);
    assert.equal(skipped.code, 1);
    assert.equal(JSON.parse(skipped.out).slots['02'].status, 'skipped');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The two holes the stale-proof reproduction demonstrated, isolated one at a
// time: a saved validation assessment whose `ok` describes an earlier
// comparison must be recompared with the current input, and slot 02 must be
// bound to the exact native run through its envelope rather than read as a bare
// normalized record.

function savedValidation() {
  const selection = selectChecks(fixtureProfile(), ['src/service/ingest.py']);
  const current = currentIdentity();
  return { selection, current, validation: assessEvidence(selection, recordFor(selection, {}), current) };
}

test('a validation assessment stale by content identity cannot qualify a fresh pair', () => {
  const { selection, validation } = savedValidation();
  const assessment = assessReviewEvidence(pairFor(currentIdentity({ contentIdentity: 'tree-b' }), { selection, validation }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.validation.ok, false);
  assert.equal(assessment.validation.status, 'stale');
  assert.equal(assessment.slots['01'].status, 'reusable');
  assert.equal(assessment.slots['02'].status, 'reusable');
  assert.ok(assessment.staleScopes.some((entry) => entry.slot === 'validation'));
});

test('a validation assessment stale by dependency identity cannot qualify a fresh pair', () => {
  const { selection, validation } = savedValidation();
  const assessment = assessReviewEvidence(pairFor(currentIdentity({ dependencyIdentity: 'lock-2' }), { selection, validation }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.validation.status, 'stale');
  assert.deepEqual(assessment.validation.identity.dependencyIdentity, 'lock-1');
});

test('a validation assessment stale by environment cannot qualify a fresh pair', () => {
  const { selection, validation } = savedValidation();
  const assessment = assessReviewEvidence(pairFor(currentIdentity({ environment: 'win32-node24' }), { selection, validation }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.validation.status, 'stale');
});

test('a validation assessment stale by scope cannot qualify a fresh pair', () => {
  const { selection, validation } = savedValidation();
  const assessment = assessReviewEvidence(pairFor(currentIdentity({ scope: 'backend-2' }), { selection, validation }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.validation.status, 'stale');
  assert.match(assessment.validation.reasons.join('\n'), /scope/);
});

test('a validation assessment stale by project cannot qualify a fresh pair', () => {
  const { selection, validation } = savedValidation();
  const assessment = assessReviewEvidence(pairFor(currentIdentity({ project: 'other-project' }), { selection, validation }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.validation.status, 'stale');
});

test('a validation assessment whose recorded freshness says current still fails against moved input', () => {
  const { selection, validation } = savedValidation();
  // This is the reproduction: the saved flags agree with themselves, but the
  // caller's identity has moved, so the old `ok` cannot be a shortcut.
  assert.equal(validation.ok, true);
  assert.equal(validation.freshness.status, 'current');
  const assessment = assessReviewEvidence(pairFor(currentIdentity({ contentIdentity: 'new-content' }), { selection, validation }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.validation.ok, false);
  assert.equal(assessment.validation.status, 'stale');
  assert.match(assessment.failures.join('\n'), /validation assessment is not qualified/);
});

test('the validation assessor returns the recorded identity as a copy, never the current snapshot', () => {
  const selection = selectChecks(fixtureProfile(), ['src/service/ingest.py']);
  const record = recordFor(selection, {});
  const assessment = assessEvidence(selection, record, currentFor(selection, { contentIdentity: 'tree-b' }));
  assert.equal(assessment.identity.contentIdentity, 'tree-a');
  assert.notEqual(assessment.identity, record.identity);
  assessment.identity.contentIdentity = 'mutated';
  assert.equal(record.identity.contentIdentity, 'tree-a');
});

test('a validation assessment with no captured identity is unknown and cannot qualify', () => {
  const { selection, validation } = savedValidation();
  const anon = { ...validation, identity: undefined };
  const assessment = assessReviewEvidence(pairFor(currentIdentity(), { selection, validation: anon }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.validation.status, 'unknown');
  assert.match(assessment.validation.reasons.join('\n'), /carries no identity|no identity/);
});

test('a validation assessment with recorded failures cannot qualify even on the current identity', () => {
  const { selection, validation } = savedValidation();
  const failed = { ...validation, failures: ['unit is fail'] };
  const assessment = assessReviewEvidence(pairFor(currentIdentity(), { selection, validation: failed }));
  assert.equal(assessment.ok, false);
  assert.match(assessment.validation.reasons.join('\n'), /unit is fail/);
});

test('a validation assessment marked not ok cannot qualify even on the current identity', () => {
  const { selection, validation } = savedValidation();
  const assessment = assessReviewEvidence(pairFor(currentIdentity(), { selection, validation: { ...validation, ok: false } }));
  assert.equal(assessment.ok, false);
  assert.match(assessment.validation.reasons.join('\n'), /not qualified/);
});

test('a validation assessment with no freshness result cannot qualify', () => {
  const { selection, validation } = savedValidation();
  const assessment = assessReviewEvidence(pairFor(currentIdentity(), { selection, validation: { ...validation, freshness: undefined } }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.validation.status, 'unknown');
  assert.match(assessment.validation.reasons.join('\n'), /no freshness result/);
});

test('a bare normalized native record is a diagnostic and cannot qualify', () => {
  const assessment = assessReviewEvidence(pairFor(currentIdentity(), { slot02: nativeRecord() }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.slots['02'].status, 'incomplete');
  assert.equal(assessment.slots['02'].gapKind, 'unbound');
  assert.equal(assessment.coverageGaps[0].kind, 'unbound');
  assert.deepEqual(assessment.reusableSlots, ['01']);
});

test('a bare native record that declares only a schema version is still a diagnostic', () => {
  const assessment = assessReviewEvidence(pairFor(currentIdentity(), { slot02: { schema_version: 'ocr.slot-02/v1' } }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.slots['02'].status, 'incomplete');
  assert.equal(assessment.coverageGaps[0].kind, 'unbound');
});

test('substituted native record bytes fail even at the same head', () => {
  const current = currentIdentity();
  const env = envelopeOverText(JSON.stringify(nativeRecord(), null, 2), { identity: current });
  writeFileSync(env.recordPath, JSON.stringify(nativeRecord({ outcome: 'failed' }), null, 2), 'utf8');
  const assessment = assessReviewEvidence(pairFor(current, { slot02: env }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.slots['02'].status, 'failed');
  assert.match(assessment.slots['02'].reasons.join('\n'), /does not match the envelope's recordSha256/);
});

test('a native envelope whose declared sha does not match the bytes fails', () => {
  const current = currentIdentity();
  const env = envelope(nativeRecord(), { identity: current, recordSha256: 'f'.repeat(64) });
  const assessment = assessReviewEvidence(pairFor(current, { slot02: env }));
  assert.equal(assessment.slots['02'].status, 'failed');
  assert.match(assessment.slots['02'].reasons.join('\n'), /does not match/);
});

test('a native envelope with no recordSha256 fails', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { recordSha256: undefined } }));
  assert.equal(assessment.slots['02'].status, 'failed');
  assert.match(assessment.slots['02'].reasons.join('\n'), /no recordSha256/);
});

test('a native envelope with no recordPath is missing', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { slot02: { identity: current, blockers: [] } }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.slots['02'].status, 'missing');
});

test('a native envelope pointing at a missing file fails', () => {
  const current = currentIdentity();
  const env = envelope(nativeRecord(), { identity: current, recordPath: join(envelopeDir, 'no-such-record.json') });
  const assessment = assessReviewEvidence(pairFor(current, { slot02: env }));
  assert.equal(assessment.slots['02'].status, 'failed');
  assert.match(assessment.slots['02'].reasons.join('\n'), /could not be read/);
});

test('a native record that is not valid JSON fails even when its bytes match', () => {
  const current = currentIdentity();
  const env = envelopeOverText('{ not json', { identity: current });
  const assessment = assessReviewEvidence(pairFor(current, { slot02: env }));
  assert.equal(assessment.slots['02'].status, 'failed');
  assert.match(assessment.slots['02'].reasons.join('\n'), /not valid JSON/);
});

test('an envelope reviewedCandidate that differs from the resolved candidate is stale', () => {
  const current = currentIdentity();
  const env = envelope(nativeRecord(), { identity: current, reviewedCandidate: 'b'.repeat(40) });
  const assessment = assessReviewEvidence(pairFor(current, { slot02: env }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.slots['02'].status, 'stale');
  assert.match(assessment.slots['02'].reasons.join('\n'), /reviewedCandidate/);
});

test('a native record whose candidate did not match is stale', () => {
  const current = currentIdentity();
  const record = nativeRecord({ candidate: { requested: 'commit x', resolved: 'a'.repeat(40), match: false } });
  const assessment = assessReviewEvidence(pairFor(current, { record }));
  assert.equal(assessment.slots['02'].status, 'stale');
});

test('a requested-name fallback cannot qualify', () => {
  const current = currentIdentity();
  const record = nativeRecord({ candidate: { requested: 'a'.repeat(40), resolved: null, match: true } });
  const assessment = assessReviewEvidence(pairFor(current, { record, envelope: { reviewedCandidate: 'a'.repeat(40) } }));
  assert.equal(assessment.slots['02'].status, 'stale');
  assert.match(assessment.slots['02'].reasons.join('\n'), /requested-name fallback/);
});

test('an envelope with no reviewedCandidate is stale', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { reviewedCandidate: undefined } }));
  assert.equal(assessment.slots['02'].status, 'stale');
  assert.match(assessment.slots['02'].reasons.join('\n'), /names no reviewedCandidate/);
});

test('a native envelope stale by content identity does not qualify', () => {
  const current = currentIdentity({ contentIdentity: 'tree-b' });
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { identity: currentIdentity() } }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.slots['02'].status, 'stale');
  assert.equal(assessment.slots['01'].status, 'reusable');
});

test('a native envelope stale by dependency identity does not qualify', () => {
  const current = currentIdentity({ dependencyIdentity: 'lock-2' });
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { identity: currentIdentity() } }));
  assert.equal(assessment.slots['02'].status, 'stale');
  assert.ok(assessment.slots['02'].reasons.join('\n').includes('dependencyIdentity'));
});

test('a native envelope stale by environment does not qualify', () => {
  const current = currentIdentity({ environment: 'linux-node24' });
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { identity: currentIdentity() } }));
  assert.equal(assessment.slots['02'].status, 'stale');
});

test('a native envelope stale by scope does not qualify', () => {
  const current = currentIdentity({ scope: 'backend-2' });
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { identity: currentIdentity() } }));
  assert.equal(assessment.slots['02'].status, 'stale');
});

test('a native envelope stale by project does not qualify', () => {
  const current = currentIdentity({ project: 'other-project' });
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { identity: currentIdentity() } }));
  assert.equal(assessment.slots['02'].status, 'stale');
});

test('a native envelope with no captured identity is unknown and cannot qualify', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { identity: undefined } }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.slots['02'].status, 'incomplete');
  assert.match(assessment.slots['02'].reasons.join('\n'), /carries no identity/);
});

test('missing native triage is incomplete', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { blockers: undefined } }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.slots['02'].status, 'incomplete');
  assert.match(assessment.slots['02'].reasons.join('\n'), /no explicit blockers triage/);
});

test('a resolved native blocker does not block reuse', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { blockers: [{ severity: 'blocker', summary: 'fixed', resolved: true }] } }));
  assert.equal(assessment.ok, true);
  assert.deepEqual(assessment.reusableSlots, ['01', '02']);
});

test('an unresolved native string blocker blocks reuse', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { blockers: ['null deref at src/service/ingest.py:42'] } }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.slots['02'].status, 'blocked');
  assert.match(assessment.failures.join('\n'), /slot 02 has unresolved confirmed blockers/);
});

test('an unresolved native blocker object blocks reuse', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { blockers: [{ severity: 'blocker', summary: 'null deref at src/service/ingest.py:42' }] } }));
  assert.equal(assessment.slots['02'].status, 'blocked');
  assert.match(assessment.slots['02'].reasons.join('\n'), /null deref/);
});

test('a native nit-level finding is not a blocker', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { envelope: { blockers: [{ severity: 'nit', summary: 'wording' }] } }));
  assert.equal(assessment.slots['02'].status, 'reusable');
});

test('a native partial run is a visible gap, not a completed slot', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { record: nativeRecord({ outcome: 'partial', complete: false }) }));
  assert.equal(assessment.ok, false);
  assert.equal(assessment.slots['02'].status, 'incomplete');
  assert.equal(assessment.coverageGaps[0].kind, 'partial');
});

test('a native skip stays a visible gap with its excluded paths and no failure', () => {
  const current = currentIdentity();
  const record = nativeRecord({
    outcome: 'skipped',
    complete: false,
    reasons: ['ocr excludes prose by extension'],
    coverage: {
      selected: 0, completed: 0, reused: 0, reviewed: 0, failed: 0, waived: 0, unreviewed: [],
      excluded: { available: true, count: 1, files: [{ path: 'docs/proposal.md', reason: 'extension' }] },
    },
  });
  const assessment = assessReviewEvidence(pairFor(current, { record }));
  assert.equal(assessment.slots['02'].status, 'skipped');
  assert.equal(assessment.coverageGaps[0].kind, 'skipped');
  assert.match(assessment.coverageGaps[0].reason, /docs\/proposal\.md/);
  assert.deepEqual(assessment.failures, []);
});

test('a native failure never completes a slot', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { record: nativeRecord({ outcome: 'failed', complete: false }) }));
  assert.equal(assessment.slots['02'].status, 'failed');
  assert.deepEqual(assessment.reusableSlots, ['01']);
});

test('a native record with no outcome fails', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { record: nativeRecord({ outcome: undefined }) }));
  assert.equal(assessment.slots['02'].status, 'failed');
  assert.match(assessment.slots['02'].reasons.join('\n'), /no outcome/);
});

test('a native candidate-mismatch outcome is stale', () => {
  const current = currentIdentity();
  const assessment = assessReviewEvidence(pairFor(current, { record: nativeRecord({ outcome: 'candidate-mismatch', complete: false }) }));
  assert.equal(assessment.slots['02'].status, 'stale');
});

test('matching identities reuse across a new commit while the envelope names the historical head', () => {
  const current = currentIdentity();
  const pair = pairFor(current, { slot01: { candidate: 'b'.repeat(40) }, record: nativeRecord() });
  const assessment = assessReviewEvidence(pair);
  assert.equal(assessment.ok, true, assessment.failures.join('; '));
  assert.deepEqual(assessment.reusableSlots, ['01', '02']);
  assert.equal(assessment.slots['02'].reviewedCandidate, 'a'.repeat(40));
});

test('an uppercase recordSha256 still binds the same bytes', () => {
  const current = currentIdentity();
  const env = envelope(nativeRecord(), { identity: current });
  env.recordSha256 = env.recordSha256.toUpperCase();
  const assessment = assessReviewEvidence(pairFor(current, { slot02: env }));
  assert.equal(assessment.slots['02'].status, 'reusable');
});

test('the command line reads slot 02 through the envelope and fails closed when the bytes are substituted', () => {
  const dir = mkdtempSync(join(tmpdir(), 'select-checks-envelope-cli-'));
  const run = (...args) => {
    try {
      const out = execFileSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8' });
      return { code: 0, out };
    } catch (error) {
      return { code: error.status, out: String(error.stdout || '') };
    }
  };
  try {
    const { selection, current } = selectionAndCurrent();
    const validation = assessEvidence(selection, recordFor(selection, {}), current);
    const write = (name, value) => {
      const path = join(dir, name);
      writeFileSync(path, JSON.stringify(value), 'utf8');
      return path;
    };
    const currentPath = write('current.json', current);
    const validationPath = write('validation.json', validation);
    const slot01Path = write('slot01.json', reviewerRecord('backend'));
    const recordText = JSON.stringify(nativeRecord(), null, 2);
    const recordPath = join(dir, 'normalized-slot-02.json');
    writeFileSync(recordPath, recordText, 'utf8');
    const envelopePath = write('slot-02-envelope.json', {
      recordPath,
      recordSha256: sha256(recordText),
      reviewedCandidate: 'a'.repeat(40),
      identity: current,
      blockers: [],
    });

    const pair = run('assess-review', '--current', currentPath, '--validation', validationPath, '--slot01', slot01Path, '--slot02', envelopePath);
    assert.equal(pair.code, 0);
    assert.deepEqual(JSON.parse(pair.out).reusableSlots, ['01', '02']);

    writeFileSync(recordPath, JSON.stringify(nativeRecord({ outcome: 'failed' }), null, 2), 'utf8');
    const substituted = run('assess-review', '--current', currentPath, '--validation', validationPath, '--slot01', slot01Path, '--slot02', envelopePath);
    assert.equal(substituted.code, 1);
    assert.equal(JSON.parse(substituted.out).slots['02'].status, 'failed');

    const barePath = write('bare-slot-02.json', nativeRecord());
    const bare = run('assess-review', '--current', currentPath, '--validation', validationPath, '--slot01', slot01Path, '--slot02', barePath);
    assert.equal(bare.code, 1);
    assert.equal(JSON.parse(bare.out).slots['02'].status, 'incomplete');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('one selected independent review qualifies without a mandatory native review', () => {
  const { current, validation } = savedValidation();
  const assessment = assessReviewEvidence({ current, validation, reviews: [reviewerRecord('backend')] });
  assert.equal(assessment.ok, true, assessment.failures.join('; '));
  assert.equal(assessment.requiredReviews, 1);
  assert.deepEqual(assessment.reusableSlots, ['01']);
  assert.deepEqual(assessment.coverageGaps, []);

  const alias = assessReviewEvidence({ current, validation, slot01: reviewerRecord('backend') });
  assert.equal(alias.ok, true, alias.failures.join('; '));
  assert.deepEqual(alias.reusableSlots, ['01']);
});
test('the selected additional review is required and the CLI supports ordinary or native records', () => {
  const { current, validation } = savedValidation();
  const record = reviewerRecord('backend');
  const missing = assessReviewEvidence({ current, validation, reviews: [record], requiredReviews: 2 });
  assert.equal(missing.ok, false);
  assert.equal(missing.requiredReviews, 2);
  assert.match(missing.coverageGaps.map((gap) => gap.reason).join('\n'), /2.*required|requires 2/);

  const dir = mkdtempSync(join(tmpdir(), 'select-checks-selected-review-'));
  const write = (name, value) => {
    const path = join(dir, name);
    writeFileSync(path, JSON.stringify(value), 'utf8');
    return path;
  };
  const run = (...args) => {
    try {
      return { code: 0, result: JSON.parse(execFileSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8' })) };
    } catch (error) {
      return { code: error.status, result: JSON.parse(String(error.stdout || '{}')) };
    }
  };
  try {
    const args = ['assess-review', '--current', write('current.json', current), '--validation', write('validation.json', validation)];
    const reviewPath = write('review.json', record);
    const nativePath = write('native-envelope.json', envelope(nativeRecord()));
    const ordinary = run(...args, '--review', reviewPath);
    assert.equal(ordinary.code, 0);
    assert.deepEqual(ordinary.result.reusableSlots, ['01']);
    const nativeOnly = run(...args, '--review', nativePath);
    assert.equal(nativeOnly.code, 0);
    assert.equal(nativeOnly.result.slots['01'].reviewedCandidate, 'a'.repeat(40));
    const additional = run(...args, '--review', reviewPath, '--review', nativePath, '--required-reviews', '2');
    assert.equal(additional.code, 0);
    assert.equal(additional.result.requiredReviews, 2);
    assert.deepEqual(additional.result.reusableSlots, ['01', '02']);
    const unavailable = run(...args, '--review', reviewPath, '--required-reviews', '2');
    assert.equal(unavailable.code, 1);
    assert.equal(unavailable.result.coverageGaps[0].kind, 'missing');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('invalid review selections and duplicate records cannot multiply independent coverage', () => {
  const { current, validation } = savedValidation();
  const record = reviewerRecord('backend');
  for (const requiredReviews of [0, -1, 1.5, NaN, '2']) {
    const assessment = assessReviewEvidence({ current, validation, reviews: [record], requiredReviews });
    assert.equal(assessment.ok, false, `count ${requiredReviews} must fail closed`);
    assert.match(assessment.failures.join('\n'), /positive integer/);
  }
  const malformed = assessReviewEvidence({ current, validation, reviews: { record } });
  assert.equal(malformed.ok, false);
  assert.match(malformed.failures.join('\n'), /array/);
  const duplicate = assessReviewEvidence({ current, validation, reviews: [record, { ...record }], requiredReviews: 2 });
  assert.equal(duplicate.ok, false);
  assert.deepEqual(duplicate.reusableSlots, ['01']);
  assert.match(duplicate.failures.join('\n'), /duplicate/);

  const sameNativeRun = assessReviewEvidence({ current, validation, reviews: [envelope(nativeRecord()), envelope(nativeRecord())], requiredReviews: 2 });
  assert.equal(sameNativeRun.ok, false);
  assert.deepEqual(sameNativeRun.reusableSlots, ['01']);
  assert.match(sameNativeRun.failures.join('\n'), /duplicate/);
});
test('reordered ordinary review evidence cannot multiply independent coverage', () => {
  const { current, validation } = savedValidation();
  const record = reviewerRecord('backend');
  const reordered = Object.fromEntries(Object.entries(record).reverse());
  reordered.identity = Object.fromEntries(Object.entries(record.identity).reverse());
  const assessment = assessReviewEvidence({ current, validation, reviews: [record, reordered], requiredReviews: 2 });
  assert.equal(assessment.ok, false);
  assert.deepEqual(assessment.reusableSlots, ['01']);
  assert.match(assessment.failures.join('\n'), /duplicate/);
});

test('ordinary review evidence names its candidate and explicitly resolves confirmed blockers', () => {
  const { current, validation } = savedValidation();
  for (const override of [{ candidate: undefined }, { blockers: undefined }]) {
    const assessment = assessReviewEvidence({ current, validation, reviews: [reviewerRecord('backend', override)] });
    assert.equal(assessment.ok, false);
    assert.equal(assessment.slots['01'].status, 'incomplete');
    assert.match(assessment.failures.join('\n'), /candidate|triage/);
  }
  const blocked = assessReviewEvidence({ current, validation, reviews: [reviewerRecord('backend', { blockers: [{ severity: 'blocker', summary: 'weekly refresh publishes incomplete data' }] })] });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.slots['01'].status, 'blocked');
  assert.match(blocked.failures.join('\n'), /weekly refresh/);
  const resolved = assessReviewEvidence({ current, validation, reviews: [reviewerRecord('backend', { blockers: [{ severity: 'blocker', summary: 'fixed with changed-input recheck', resolved: true }] })] });
  assert.equal(resolved.ok, true);
});