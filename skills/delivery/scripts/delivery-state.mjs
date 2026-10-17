#!/usr/bin/env node
// Turn a delivery intent, the project's adapter and the live state into the steps,
// the authority and any blockers. Method only: the commands and the route come
// from the adapter, and the state comes from the caller's live reading.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compareIdentity } from '../../validate-implementation/scripts/select-checks.mjs';

export const INTENTS = ['commit', 'push', 'open-pr', 'update-pr', 'merge', 'deploy', 'production'];

const AUTHORITY = {
  commit: 'local working tree',
  push: 'remote push',
  'open-pr': 'pull request',
  'update-pr': 'pull request',
  merge: 'merge',
  deploy: 'deployment',
  production: 'production',
};

const REMOTE_INTENTS = ['push', 'open-pr', 'update-pr', 'merge', 'deploy', 'production'];

export function validateAdapter(adapter) {
  const errors = [];
  if (!adapter || typeof adapter !== 'object') return { ok: false, errors: ['adapter is not an object'] };
  if (adapter.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (typeof adapter.project !== 'string' || adapter.project.trim() === '') errors.push('project is required');
  if (!adapter.branchRules || typeof adapter.branchRules.base !== 'string' || adapter.branchRules.base.trim() === '') {
    errors.push('branchRules.base is required');
  }
  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} input
 * @param {string} input.intent one of INTENTS
 * @param {object} input.adapter the project's delivery record
 * @param {object} input.snapshot what the caller just read live
 * @param {object} [input.approval] which deployment authorities have been recorded, e.g. { deployment: true }
 */
export function planDelivery({ intent, adapter, snapshot = {}, approval = {} }) {
  const blockers = [];
  const notes = [];
  const steps = [];

  if (!INTENTS.includes(intent)) {
    return { ok: false, intent: intent ?? null, authority: null, state: 'blocked:unknown-intent', steps, blockers: [`unknown intent '${intent}'; expected one of ${INTENTS.join(', ')}`], notes };
  }
  const validation = validateAdapter(adapter);
  if (!validation.ok) {
    return { ok: false, intent, authority: null, state: 'blocked:invalid-adapter', steps, blockers: validation.errors, notes };
  }

  const authority = AUTHORITY[intent];
  const branch = snapshot.branch || '(current branch)';
  const base = adapter.branchRules.base;
  const existing = snapshot.pullRequest || null;
  const tools = snapshot.tools || {};
  const host = adapter.host || 'github';
  const hostTool = host === 'gitlab' ? 'glab' : 'gh';

  // An empty check list is not a read check list: silence is not a pass.
  const checksKnown = Array.isArray(snapshot.checks)
    ? (snapshot.checks.length > 0 || adapter.checks?.required === false)
    : false;
  // Two different staleness checks: the pull request may still point at an older
  // head, and the review may have been recorded against a different one.
  const pullRequestHeadMismatch = Boolean(existing && snapshot.head && existing.head && existing.head !== snapshot.head);
  const reviewHeadMismatch = Boolean(snapshot.review?.head && snapshot.head && snapshot.review.head !== snapshot.head);
  const reviewInputsMatch = snapshot.review?.complete === true
    && Array.isArray(snapshot.review?.blockers) && snapshot.review.blockers.length === 0
    && compareIdentity(snapshot.review.identity, snapshot.identity).ok;
  const alreadyClosed = Boolean(existing && (existing.state === 'merged' || existing.state === 'closed'));

  if (intent === 'commit') {
    steps.push(`stage only the intended paths on ${branch}`, 'commit with a message that states the change and the verification performed');
    notes.push('a commit is a local act: it does not push, open a pull request, merge or deploy anything');
  }

  if (intent === 'push') {
    if (tools.git === false) blockers.push('git is not available in this session, so the push cannot be attempted');
    if (snapshot.remote === false) blockers.push('no remote is configured for this repository');
    steps.push(`push ${branch} to its remote`);
    notes.push('a push publishes the branch; it does not open a pull request, merge or deploy');
  }

  if (intent === 'open-pr' || intent === 'update-pr') {
    // The tool gate comes first. Answering "resume" before checking whether this
    // session can touch the pull request reported success for an action it could
    // not perform, and skipped the live-check gate with it.
    if (tools[hostTool] === false) blockers.push(`the ${host} command line is not available in this session, so the pull request cannot be changed`);
    if (adapter.remote?.identity && snapshot.remoteIdentity && snapshot.remoteIdentity !== adapter.remote.identity) {
      blockers.push(`this repository's remote is ${snapshot.remoteIdentity}, not the ${adapter.remote.identity} this project delivers from`);
    }
    if (alreadyClosed) blockers.push(`pull request #${existing.number} is ${existing.state}; open a new one from a fresh branch rather than resuming it`);
    if (!checksKnown && adapter.checks?.required !== false) {
      blockers.push('the required checks for the current head have not been read; a delivery document is not a substitute for the live check state');
    }
    if (intent === 'open-pr' && existing) {
      notes.push(`a pull request already exists for ${branch}: #${existing.number}. Update it instead of opening a second one.`);
      steps.push(`update pull request #${existing.number} with the current head ${snapshot.head || '(unread)'}`);
      return { ok: blockers.length === 0, intent, authority, state: blockers.length === 0 ? 'resume-existing-pull-request' : 'blocked', steps, blockers, notes };
    }
    if (intent === 'update-pr' && !existing) {
      blockers.push(`no pull request is recorded for ${branch}, so there is nothing to update`);
    }
    if (adapter.branchRules.draftByDefault !== false) notes.push('open as a draft until the change is ready for review');
    steps.push(`target ${base}`, intent === 'open-pr' ? `open a pull request for ${branch}` : `update pull request #${existing?.number ?? '(unknown)'}`);
    notes.push('a pull request is a review request: it does not merge or deploy');
  }

  if (intent === 'merge' || intent === 'deploy' || intent === 'production') {
    if (!existing) blockers.push(`no pull request is recorded for ${branch}, so there is nothing to merge`);
    if (!checksKnown && adapter.checks?.required !== false) {
      blockers.push('the required checks for the current head have not been read; a delivery document is not a substitute for the live check state');
    }
    if (checksKnown) {
      const failing = snapshot.checks.filter((check) => check.status !== 'pass').map((check) => `${check.name} (${check.status})`);
      if (failing.length > 0) blockers.push(`required checks are not passing for the current head: ${failing.join(', ')}`);
    }
    if (adapter.review?.required !== false && snapshot.review?.status !== 'approved') {
      blockers.push(`the review requirement is not satisfied (recorded: ${snapshot.review?.status ?? 'nothing read'})`);
    }
    if (Array.isArray(snapshot.review?.blockers) && snapshot.review.blockers.length > 0) {
      blockers.push('the review has unresolved confirmed blockers');
    }
    if ((snapshot.identity !== undefined || snapshot.review?.identity !== undefined) && !reviewInputsMatch) {
      blockers.push('the supplied review inputs are incomplete or do not match the current identity');
    }
    if (pullRequestHeadMismatch) {
      blockers.push(`the pull request is still on ${existing.head} while the current head is ${snapshot.head}; re-read the check state for the head you intend to merge`);
    }
    if (reviewHeadMismatch && !reviewInputsMatch) {
      blockers.push(`the review was recorded against ${snapshot.review.head}, not the current head ${snapshot.head}; a review of another candidate is not a review of this one`);
    }
  }

  if (intent === 'merge') {
    // The gate facts are the authority: no separate merge approval exists.
    if (existing && existing.mergeable !== true) blockers.push(`pull request #${existing.number} is not reported mergeable by the forge (read: ${existing.mergeable ?? 'nothing'})`);
    steps.push(`merge into ${base} using ${adapter.merge?.method ?? 'the project method'}`);
    notes.push('a merge is not a deployment, and it is not production');
  }

  if (intent === 'deploy' || intent === 'production') {
    if (approval.deployment !== true) blockers.push('deployment authority is not recorded for this change');
    const route = adapter.deployment?.route;
    if (!route) blockers.push('this project declares no deployment route, so no session may deploy it');
    else steps.push(`deploy through ${route}`);
  }

  if (intent === 'production') {
    const boundary = adapter.deployment?.production?.boundary;
    if (!boundary) blockers.push('this project does not declare what counts as production');
    if (approval.production !== true) blockers.push(`production authority is not recorded for this change (${adapter.deployment?.production?.authority ?? 'the project has not named one'})`);
    steps.push('perform the guarded production action the project names');
    notes.push('a deployment is not production: they are separate authorities and separate evidence');
  }

  return {
    ok: blockers.length === 0,
    intent,
    authority,
    state: blockers.length === 0 ? 'ready' : 'blocked',
    steps,
    blockers,
    notes,
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function main(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--intent') { args.intent = argv[index + 1]; index += 1; }
    else if (token === '--adapter') { args.adapter = argv[index + 1]; index += 1; }
    else if (token === '--snapshot') { args.snapshot = argv[index + 1]; index += 1; }
    else if (token === '--approval') { args.approval = argv[index + 1]; index += 1; }
  }
  if (!args.intent || !args.adapter) {
    process.stderr.write('usage: delivery-state.mjs --intent <intent> --adapter <file> [--snapshot <file>] [--approval <file>]\n');
    return 2;
  }
  const result = planDelivery({
    intent: args.intent,
    adapter: readJson(args.adapter),
    snapshot: args.snapshot ? readJson(args.snapshot) : {},
    approval: args.approval ? readJson(args.approval) : {},
  });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  return result.ok ? 0 : 1;
}

// Compare real paths: Node runs a linked script from its real file, so through a
// junction or symlink the invoked path differs and main() would silently not run.
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
