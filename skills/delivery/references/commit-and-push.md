# Commit and push

Lint, review and record the change; then publish it. Both steps reuse the
project's known commands and revalidate before acting on them.

## Before a commit

- Run the project's relevant lint and formatting checks on the intended change,
  or reuse current results for identical content. Use the existing formatter;
  do not reformat unrelated files or introduce a user-global commit hook.
- A repository's own pre-commit hook is the commit rung of the
  [check ladder](../../validate-implementation/references/check-ladder.md).
  Do not bypass a repository hook (`--no-verify`, `HUSKY=0`); fix or report the
  finding.
- Select early independent review when it usefully catches risk. A commit alone
  neither requires a new review nor expires matching evidence. The team lead owns
  finding dispositions and routes repairs.
- Before the first commit, inspect `git status --porcelain` and path ownership
  in the task checkout; read the main checkout when integration depends on it.
  Commit only the owned scope. Preserve foreign edits in place and identify their
  owner or ownership gap. Work explicitly adopted into the assignment gets its
  own commit ("Carry uncommitted edits from `<path>` on `<date>`: `<what>`") and
  a "Carried uncommitted work" section in the PR listing its origin and adopted
  owner. Review that commit separately; a known incomplete edit stays held until
  its promised behavior is ready.

## Qualify the publication base

Before adopting a branch for dispatch and again before its first publication,
read the forge's actual default branch name/head and the intended PR base
name/head, refreshing their refs through the project's permitted route. Compare
the intended candidate's ancestry, introduced commits and full prospective PR
diff against that published base (`git merge-base <base-ref> <head>`,
`git log <base-ref>..<head>` and `git diff <base-ref>...<head>`). A commit-parent
or chosen local-base diff alone misses inherited unpublished work. Keep these
identities and scope in the existing task evidence.

Inspect the full diff, including inherited hunks in otherwise owned files,
against assigned ownership and holds. Intentional stacks and prerequisite commits
remain valid with named owners and qualified scope; unpublished canonical commits
are not implicitly released. If foreign held work is included, use an owned base
or integrate its owner's released prerequisite before publication. Preserve the
original refs and work; no universal rebase or foreign republication is required.
Also qualify the chosen merge method's resulting ancestry and net tree: removing
foreign changes from the diff does not authorize merging their commits. Repeat
only affected qualification when the candidate or base changes.

## Before a push

- If the branch's pull request has auto-merge armed, disarm it first
  (`gh pr merge <number> --disable-auto`): the forge would otherwise merge the
  new head before its review statuses are posted. Arm it again only once the
  merge gate in the [skill](../SKILL.md) section 4 holds on that head.
- Run the push rung: for each row of the project's CI parity table whose
  trigger paths the branch touches, run the local command (lint, types, unit
  tests) unless validation already ran it on this candidate, or name the
  hosted-only reason. Never start a build, server or browser run just to push;
  reuse validation's evidence or leave it to CI. This is a step, not a pre-push
  hook and not a local CI; see the
  [check ladder](../../validate-implementation/references/check-ladder.md).
- Complete code-review's [rounds](../../code-review/references/push-review.md)
  before the push: round 1, the reviewer and OCR in parallel on one commit,
  triaged once with one fix commit; round 2, the reviewer alone on that fix.
  The team lead writes the round's triage record, whose contract is in
  [finding triage](../../code-review/references/finding-triage.md). Related
  tickets receive the rounds once at their group PR. Reuse matching earlier
  coverage; push metadata and unrelated base movement alone do not expire it.
- Then push, and post the review statuses on the pushed head right away:
  GitHub accepts a status only for a commit it already has. Run
  [review-status.mjs](../scripts/review-status.mjs) `post --repo <owner/name>
  --sha <head> --triage <triage.json>` from the checkout, and arm nothing until
  it exits 0. A failure description names the first unsettled finding or stale
  record; settle it, then post again on the resulting head.
- Verify the final proposed integration before merge. Changed dependencies,
  fixtures, configuration, relevant content or scope rerun affected checks and
  review; independently establish current inputs rather than trusting an old
  receipt's claim of freshness.
- At PR preparation, check whether changed behavior or commands affect the
  project's feature map or verification guide. Use the bounded documentation
  check in push review; no extra pass is needed when those documents are
  unaffected.
