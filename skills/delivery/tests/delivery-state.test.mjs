import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { INTENTS, validateAdapter, planDelivery } from '../scripts/delivery-state.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(here, '..', 'scripts', 'delivery-state.mjs');

function fixtureAdapter() {
  return {
    schemaVersion: 1,
    project: 'fixture',
    branchRules: { base: 'main', naming: 'type/scope-summary', draftByDefault: true },
    checks: { source: 'the pull request required checks', required: true },
    review: { required: true, source: 'the project review record' },
    merge: { method: 'squash' },
    deployment: { route: 'the project pipeline', production: { boundary: 'the live service', authority: 'the owner' } },
  };
}

const liveState = {
  branch: 'type/add-thing',
  head: 'a'.repeat(40),
  remote: true,
  tools: { git: true, gh: true },
  pullRequest: { number: 42, url: 'https://example.invalid/pr/42', head: 'a'.repeat(40), state: 'open', mergeable: true },
  checks: [{ name: 'build', status: 'pass' }, { name: 'tests', status: 'pass' }],
  review: { status: 'approved' },
};

const plan = (intent, overrides = {}) => planDelivery({
  intent,
  adapter: fixtureAdapter(),
  snapshot: { ...liveState, ...(overrides.snapshot || {}) },
  approval: overrides.approval || {},
});

test('commit is a local act and implies nothing downstream', () => {
  const result = plan('commit');
  assert.equal(result.ok, true);
  const text = [...result.steps, ...result.notes].join(' ').toLowerCase();
  for (const downstream of ['push', 'pull request', 'merge', 'deploy']) {
    assert.equal(result.steps.join(' ').toLowerCase().includes(downstream), false, `commit must not plan a ${downstream}`);
  }
  assert.match(text, /does not push/);
});

test('push publishes the branch and still does not open a pull request', () => {
  const result = plan('push');
  assert.equal(result.ok, true);
  assert.equal(result.steps.some((step) => /pull request/.test(step)), false);
  assert.match(result.notes.join(' '), /does not open a pull request, merge or deploy/);
});

test('an existing pull request is resumed, never duplicated', () => {
  const result = plan('open-pr');
  assert.equal(result.state, 'resume-existing-pull-request');
  assert.equal(result.steps.some((step) => /update pull request #42/.test(step)), true);
  assert.equal(result.steps.some((step) => /^open a pull request/.test(step)), false);
});

test('a project with no pull request for the branch opens the first one', () => {
  const result = plan('open-pr', { snapshot: { pullRequest: null } });
  assert.equal(result.ok, true);
  assert.equal(result.state, 'ready');
  assert.equal(result.steps.some((step) => /^open a pull request/.test(step)), true);
  assert.match(result.notes.join(' '), /draft/i);
});

test('update-pr without an existing pull request is a concrete blocker', () => {
  const result = plan('update-pr', { snapshot: { pullRequest: null } });
  assert.equal(result.ok, false);
  assert.match(result.blockers.join(' '), /nothing to update/);
});

test('a live check state is required: a delivery document is not a substitute', () => {
  const result = plan('merge', { snapshot: { checks: null } });
  assert.equal(result.ok, false);
  assert.match(result.blockers.join(' '), /required checks for the current head have not been read/);
});

test('failing checks block a merge and are named', () => {
  const result = plan('merge', { snapshot: { checks: [{ name: 'tests', status: 'fail' }] } });
  assert.equal(result.ok, false);
  assert.match(result.blockers.join(' '), /tests \(fail\)/);
});

test('a merge is ready once its gate holds, with no separate approval', () => {
  const ready = plan('merge');
  assert.equal(ready.ok, true);
  assert.equal(ready.state, 'ready');
  assert.match(ready.notes.join(' '), /not a deployment, and it is not production/);
});

test('a merge missing a gate fact stays blocked and names that fact', () => {
  const cases = [
    [{ checks: null }, /required checks for the current head have not been read/],
    [{ checks: [{ name: 'tests', status: 'pending' }] }, /tests \(pending\)/],
    [{ review: { status: 'nothing' } }, /review requirement is not satisfied/],
    [{ pullRequest: null }, /nothing to merge/],
    [{ pullRequest: { ...liveState.pullRequest, head: 'c'.repeat(40) } }, /pull request is still on c+/],
    [{ pullRequest: { ...liveState.pullRequest, mergeable: false } }, /not reported mergeable/],
    [{ pullRequest: { ...liveState.pullRequest, mergeable: undefined } }, /not reported mergeable/],
  ];
  for (const [snapshot, blocker] of cases) {
    const result = plan('merge', { snapshot });
    assert.equal(result.ok, false, JSON.stringify(snapshot));
    assert.match(result.blockers.join(' '), blocker);
  }
});

test('an unsatisfactory review is a blocker, not a warning', () => {
  const result = plan('merge', { snapshot: { review: { status: 'changes-requested' } } });
  assert.equal(result.ok, false);
  assert.match(result.blockers.join(' '), /review requirement is not satisfied/);
});

test('a missing tool or remote yields a concrete state, not a success claim', () => {
  const noRemote = plan('push', { snapshot: { remote: false } });
  assert.equal(noRemote.ok, false);
  assert.match(noRemote.blockers.join(' '), /no remote is configured/);

  const noCli = plan('open-pr', { snapshot: { pullRequest: null, tools: { git: true, gh: false } } });
  assert.equal(noCli.ok, false);
  assert.match(noCli.blockers.join(' '), /command line is not available/);
});

test('deployment and production are separate authorities', () => {
  const deploy = plan('deploy', { approval: { deployment: true } });
  assert.equal(deploy.ok, true);

  const deployWithoutApproval = plan('deploy');
  assert.equal(deployWithoutApproval.ok, false);
  assert.match(deployWithoutApproval.blockers.join(' '), /deployment authority is not recorded/);

  const production = plan('production', { approval: { deployment: true } });
  assert.equal(production.ok, false);
  assert.match(production.blockers.join(' '), /production authority is not recorded/);

  const full = plan('production', { approval: { deployment: true, production: true } });
  assert.equal(full.ok, true);
  assert.match(full.notes.join(' '), /not production: they are separate authorities/);
});

test('a project that declares no deployment route cannot be deployed from a session', () => {
  const adapter = fixtureAdapter();
  delete adapter.deployment;
  const result = planDelivery({ intent: 'deploy', adapter, snapshot: liveState, approval: { deployment: true } });
  assert.equal(result.ok, false);
  assert.match(result.blockers.join(' '), /declares no deployment route/);
});

test('an unknown intent and an invalid adapter are refused explicitly', () => {
  const unknown = planDelivery({ intent: 'ship-it', adapter: fixtureAdapter(), snapshot: liveState });
  assert.equal(unknown.state, 'blocked:unknown-intent');
  assert.match(unknown.blockers.join(' '), /expected one of/);

  const invalid = planDelivery({ intent: 'commit', adapter: { schemaVersion: 2 }, snapshot: liveState });
  assert.equal(invalid.state, 'blocked:invalid-adapter');
  assert.equal(validateAdapter({ schemaVersion: 1, project: 'x', branchRules: { base: 'main' } }).ok, true);
});

test('the vocabulary is the seven delivery steps', () => {
  assert.deepEqual(INTENTS, ['commit', 'push', 'open-pr', 'update-pr', 'merge', 'deploy', 'production']);
});

test('the method carries no project route of its own', () => {
  const source = readFileSync(scriptPath, 'utf8');
  for (const tool of ['git push', 'gh pr create', 'npm run', 'uv run', 'vercel', 'wrangler']) {
    assert.equal(source.toLowerCase().includes(tool), false, `the method must not embed ${tool}`);
  }
  assert.equal(/(?:^|[\s"'])[A-Za-z]:[\\/]/.test(source), false, 'the method must not embed a host path');
});

test('the tool gate applies before resuming an existing pull request', () => {
  const result = plan('open-pr', { snapshot: { tools: { git: true, gh: false } } });
  assert.equal(result.ok, false);
  assert.equal(result.state, 'blocked');
  assert.match(result.blockers.join(' '), /command line is not available/);
  assert.match(result.notes.join(' '), /already exists/);
});

test('an empty check list is not a read check list', () => {
  for (const intent of ['merge', 'deploy', 'production']) {
    const result = plan(intent, {
      snapshot: { checks: [] },
      approval: { deployment: true, production: true },
    });
    assert.equal(result.ok, false, `${intent} must not pass with no checks read`);
    assert.match(result.blockers.join(' '), /required checks for the current head have not been read/);
  }
  // A project that declares it has no required checks may proceed.
  const adapter = fixtureAdapter();
  adapter.checks.required = false;
  const relaxed = planDelivery({ intent: 'deploy', adapter, snapshot: { ...liveState, checks: [] }, approval: { deployment: true } });
  assert.equal(relaxed.ok, true);
});

test('missing optional merge metadata does not veto a merge whose gate holds', () => {
  const adapter = fixtureAdapter();
  for (const merge of [undefined, { method: 'squash' }]) {
    adapter.merge = merge;
    const result = planDelivery({ intent: 'merge', adapter, snapshot: liveState });
    assert.equal(result.ok, true);
  }
});

test('a review of a different head is not a review of this one', () => {
  const result = plan('merge', {
    snapshot: { review: { status: 'approved', head: 'b'.repeat(40) } },
  });
  assert.equal(result.ok, false);
  assert.match(result.blockers.join(' '), /review was recorded against/);
});

test('matching review inputs survive a new commit while current checks still gate merge', () => {
  const identity = { project: 'fixture', contentIdentity: 'scoped-blobs', dependencyIdentity: 'rules-fixtures-tools', environment: 'ci', scope: 'ordinary-change' };
  const snapshot = { identity, review: { status: 'approved', head: 'b'.repeat(40), identity, complete: true, blockers: [] } };
  assert.equal(plan('merge', { snapshot }).ok, true);
  const failedChecks = plan('merge', { snapshot: { ...snapshot, checks: [{ name: 'integration', status: 'fail' }] } });
  assert.equal(failedChecks.ok, false);
});

test('changed or unknown review inputs and unresolved defects block reuse', () => {
  const identity = { project: 'fixture', contentIdentity: 'scoped-blobs', dependencyIdentity: 'rules-fixtures-tools', environment: 'ci', scope: 'ordinary-change' };
  const review = { status: 'approved', head: 'b'.repeat(40), identity, complete: true, blockers: [] };
  for (const field of Object.keys(identity)) {
    for (const value of ['changed', undefined]) {
      const result = plan('merge', { snapshot: { identity: { ...identity, [field]: value }, review } });
      assert.equal(result.ok, false, field);
    }
  }
  for (const head of [liveState.head, review.head]) {
    const blocked = plan('merge', { snapshot: { identity, review: { ...review, head, blockers: ['confirmed publication defect'] } } });
    assert.equal(blocked.ok, false);
  }
});

test('a current-head approval cannot override explicitly changed review inputs', () => {
  const identity = { project: 'fixture', contentIdentity: 'same-code', dependencyIdentity: 'old-fixture', environment: 'ci', scope: 'ordinary-change' };
  const result = plan('merge', { snapshot: { identity: { ...identity, dependencyIdentity: 'new-fixture' }, review: { status: 'approved', head: liveState.head, identity, complete: true, blockers: [] } } });
  assert.equal(result.ok, false);
});

test('a merged or closed pull request is not resumed', () => {
  for (const state of ['merged', 'closed']) {
    const result = plan('open-pr', { snapshot: { pullRequest: { ...liveState.pullRequest, state } } });
    assert.equal(result.ok, false);
    assert.match(result.blockers.join(' '), /open a new one from a fresh branch/);
  }
});

test('the host and the remote identity come from the project adapter', () => {
  const adapter = { ...fixtureAdapter(), host: 'gitlab', remote: { identity: 'group/project' } };
  const absent = planDelivery({
    intent: 'open-pr',
    adapter,
    snapshot: { ...liveState, pullRequest: null, tools: { git: true, glab: false } },
  });
  assert.equal(absent.ok, false);
  assert.match(absent.blockers.join(' '), /gitlab command line/);

  const wrongRemote = planDelivery({
    intent: 'push',
    adapter,
    snapshot: { ...liveState, remoteIdentity: 'someone-else/fork' },
  });
  assert.equal(wrongRemote.ok, true, 'push itself does not check the remote identity; the pull-request step does');
  const wrongRemotePr = planDelivery({
    intent: 'open-pr',
    adapter,
    snapshot: { ...liveState, pullRequest: null, remoteIdentity: 'someone-else/fork' },
  });
  assert.equal(wrongRemotePr.ok, false);
  assert.match(wrongRemotePr.blockers.join(' '), /not the group\/project this project delivers from/);
});
