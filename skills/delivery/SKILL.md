---
name: delivery
description: Carry out the authorized delivery step and nothing past it - commit, push, open or refresh a PR, babysit it to merge-ready, merge, deploy, reconcile a drifted branch - or assess handoff readiness. One word names the step; `cleanup` retires a merged branch and its worktree.
metadata:
  group: deliver
  lead: true
---

# Delivery

Commit, push, pull request, babysit, merge, deployment and cleanup are different
authorities. Identify which steps the user's request authorizes and complete
that scope. Do not infer deployment from a commit request, or ask again for a
step already authorized as part of a broader delivery request.

For coordinated work, use the delivery owner named in orchestrate-work's
assignment contract. Other tasks return reviewed candidates and checks before
publication is attempted. An enforced denial cannot be retried through another
task, command or tool; the team lead investigates supported recovery and continues
unaffected work before surfacing any unresolved user decision.

## 1. Route by the request

One word is enough. A bare `delivery` after this branch's pull request has
merged means `cleanup`; otherwise it means the steps the request's own words
authorize.

| Word | The step | Read first |
|---|---|---|
| `commit` | Lint, review and record the change locally | [commit-and-push.md](references/commit-and-push.md) |
| `push` | Push review and the push rung (lint, types, unit tests), then publish the branch | [commit-and-push.md](references/commit-and-push.md) |
| `pr` | Open the pull request, or refresh the one that exists; where the forge enforces required checks, arm auto-merge only after `review-status.mjs post` exits 0 on the head (babysit arms it where a bot review is required) | [pr-writing.md](references/pr-writing.md) |
| `babysit` | Drive a PR or a stack to merge-ready: conflicts, review threads, CI | [babysit.md](references/babysit.md) |
| `merge` | Where auto-merge is not armed or not offered, the agent merges once the merge gate in section 4 holds on the head (`review-status.mjs read` exits 0 and CI is green); either way, complete this task's closeout after merge | the project's route, section 2; [task closeout](references/worktree-retirement.md#close-out-the-tasks-own-checkout) |
| `deploy` | Run the project's deployment route | [adapter.md](references/adapter.md) |
| `reconcile` | Inspect a drifted branch, pull request or base and route the repair | [reconciliation.md](references/reconciliation.md) |
| `cleanup` | Retire a merged or abandoned branch and its worktree; reclaim disk | [task closeout](references/worktree-retirement.md#close-out-the-tasks-own-checkout) for this task's merged checkout; [worktree-cleanup.md](references/worktree-cleanup.md) for wider cleanup |
| `handoff` | Judge readiness at an ownership boundary; the brief for the next chat is the [handoff](../handoff/SKILL.md) skill | [handoff.md](references/handoff.md) |

## 2. Read the project's route, then check it live

Project guidance owns the branch rules, the review requirement, the merge method
and the deployment route; [adapter.md](references/adapter.md) describes optional
helper input. Then read the state that can change: the candidate head, the
required checks for that head, the review requirement and whether the branch
already has a pull request. If the live state cannot be read, that is the state
to report. Reuse the known commands, and revalidate before acting on them. For
credential or worktree ownership failures, use
[host-access.md](references/host-access.md).

Four commands read or record that state so no agent rebuilds it by hand. Run
them with `node` from any directory, except `review-status.mjs post`, which
runs in the checkout because it checks ancestry with git; the others take
`--json`, and `review-status.mjs` always prints JSON. The inventory and the
retirement plan fetch the remote first so merged proof is against the current
base (remote-tracking refs are the only thing they update; `--no-fetch` skips
it for the inventory).

| Question | Command |
|---|---|
| Which worktrees, branches and pull requests exist, and which are merged, held or ready to retire | [scripts/repo-inventory.mjs](scripts/repo-inventory.mjs) `[--repo <path>]` |
| Has the automated reviewer finished on this head, and what did it find | [scripts/pr-review.mjs](scripts/pr-review.mjs) `--pr <number> --reviewer <bot login> [--wait]` |
| Post the review statuses for a head from its triage record, or read them back | [scripts/review-status.mjs](scripts/review-status.mjs) `post --repo <owner/name> --sha <head> --triage <triage.json> [--target-url <url>]`; `read --repo <owner/name> --sha <head>` |
| Retire a merged worktree and its branches | [scripts/retire-worktree.mjs](scripts/retire-worktree.mjs) `<worktree-path>`, a plan until `--apply` |

Where the project requires a review of the current head, `pr-review.mjs`
exiting 0 with no open findings is that pass; any other exit is not, except
that review-body findings settled under babysit step 8 no longer hold the head.

## 3. Resume rather than duplicate

If the branch already has a pull request, update that one. Never open a second
pull request for the same work. Draft is the default until the change is ready
for review.

## 4. Stop at the boundary

- Commit does not imply push. Push does not imply a pull request. A pull request
  merges once the merge gate holds; the owner is never the gate, and AGENTS.md
  section 04 authorizes every merge that passes it, so no separate request is
  needed. The gate is the same everywhere: the body fills the repository's PR
  template; code-review's rounds are clean, recorded on the current head as the
  commit statuses `harness/review` and `harness/ocr`, both `success`, by
  [review-status.mjs](scripts/review-status.mjs) `post`; every CI check on that
  head is green where the repository has CI; and the forge reports it
  mergeable. `harness/ocr` is where the gate requires a clean OCR record;
  validation evidence alone does not. An explicit hold from the owner, or a
  required hosted review that is not passing on the current head, stops it.
  - Where the forge enforces required checks, its ruleset requires both
    contexts beside CI. Arm auto-merge (`gh pr merge --auto` with the
    project's merge method) only after `review-status.mjs post` exited 0 on the
    current head; where the project also requires a bot review of the current
    head, babysit arms it once [pr-review.mjs](scripts/pr-review.mjs) passes
    too. A new head has no statuses, so the forge resets the gate by itself.
    GitHub still keeps auto-merge armed when a writer pushes new commits, so if
    it is armed, disarm it (`gh pr merge <number> --disable-auto`) before
    pushing a new head, and arm it again once `post` exits 0 and any required
    bot review passes on that head. If GitHub refuses `--auto` because the pull
    request is already clean, merge it directly under the same conditions with
    `gh pr merge <number> --<method> --match-head-commit <reviewed sha>`.
  - Where it does not (a free private repository returns 403 for branch
    protection), never arm `--auto`, which would merge before CI reports. The
    agent merges only when `review-status.mjs read` exits 0 on the head and
    every CI check on it is green, with
    `gh pr merge <number> --<method> --match-head-commit <that sha>`.
  Merge does not imply deployment, and deployment does not imply production:
  where a merge deploys (a linked Vercel project, say), the repository's
  AGENTS.md section 07 says so and the deploy follows that route.
- Use the user's authorization for the requested scope and respect applicable
  reserved actions. Missing optional project authority metadata does not add an
  approval requirement. A helper flag records the caller's assessment; it cannot
  grant authority or override an enforced restriction.
- Keep the project's external-review and CI requirements; never reduce or
  discard a check to get a green result. Establishing or improving the CI
  itself is the [ci](../ci/SKILL.md) skill's work.
- When the outcome depends on a tool or an approval that is not available, report
  that: "not pushed: no remote configured" is an answer, and "done" is not.
- An empty or unread check list is not a pass. Read the checks for the head you
  intend to act on. A different review head needs the repository's authenticated
  coverage and input comparison; matching evidence can qualify, while a bare old
  approval cannot. Verify the final integrated candidate before merge.
- If authority is missing, prepare the reviewable result and identify
  the one decision needed. Do not turn authorized steps into repeated prompts.
- Once the work is on the target branch, complete the
  [task closeout sequence](references/worktree-retirement.md#close-out-the-tasks-own-checkout).
  It reconciles remaining task-owned edits, stops owned resources and completes
  safe supported retirement. Report verified removal separately from cleanup
  pending on manual chat archival, with its exact targets and recovery owner.
- Work left for the person to hand to another chat gets a brief from
  [handoff](../handoff/SKILL.md), pasted or filed in the brain's `Inbox/`, never
  a briefing file in scratch or artifacts.
- Do not park work in a stash: commit it to a branch or discard it deliberately.
- Preserve foreign edits and their ownership; only explicitly adopted work is carried in a
  separate commit, by [commit-and-push](references/commit-and-push.md). Report
  unresolved ownership and keep affected retirement or installation held.
  Another owner's dirty canonical checkout is not this task's cleanup obligation.
  Shared integration and installation use the named writers and reviewed source
  scope in [the team reference](../orchestrate-work/references/team.md#shared-integration-and-installation).

## 5. Keep tracking where it belongs

GitHub issues, dependencies and project boards are high-level tracking; the
how-to-build plan stays in the project workspace. After an authorized verified
transition, the lead or named record writer reconciles affected records through
[tracking reconciliation](../docs-workspace/references/tracking-reconciliation.md).
Keep remaining installation or runtime acceptance open with its owner. Unchanged
or already-recorded outcomes need no upkeep write, skill read or skip note.
A verified transition may record one bounded learning event through the shared
producer, or a workspace finding while the producer is not deployed; see
[learning-events.md](references/learning-events.md).

## 6. Report the run and archive readiness

End with a concise summary that lets the user or coordinator assess the run:

- The delivered outcome and linked PR, including its actual merge status.
- Checks, independent review, OCR and CI results, with any unperformed acceptance.
- Linked workspace records updated with the result and remaining work.
- Installation and deployment status, separately from source delivery.
- Task-owned process cleanup, worktree removal and local/remote branch removal.
  State each actual result; name any retained root or branch, pending action and
  owner. Queued native cleanup is not verified removal.

For work delivered to its target branch, complete the
[closeout sequence](references/worktree-retirement.md#close-out-the-tasks-own-checkout)
before declaring readiness. For commit-only, push-only or handoff scopes,
preserve the work and record retained resources and their owner without requiring
an unrequested merge or retirement. Leave the chat visible for the user to archive
manually unless automatic archival was explicitly requested. When all required
delivery and preservation work is complete and no remaining obligation needs
this chat, finish with: "This chat can be archived." If manual archival must
trigger managed worktree cleanup, say so before that line and identify the
remaining cleanup and verification owner. Do not claim that the checkout or
branches are already gone.

A real unresolved delivery, preservation or ownership obligation stays open
with its owner and next action. An independently recorded cleanup limitation
can remain pending without requiring this completed chat to stay active.

## References

- [references/commit-and-push.md](references/commit-and-push.md) - lint and
  optional early review before a commit; the review rounds, the push rung and
  the review statuses around a push.
- [references/pr-writing.md](references/pr-writing.md) - a compact visual PR
  body with observed evidence and merge risk.
- [references/babysit.md](references/babysit.md) - driving the merge frontier to
  merge-ready, with [bugbot-triage.md](references/bugbot-triage.md) for review
  automation, [scripts/watch-pr](scripts/watch-pr/watch-pr) as the watcher and
  [scripts/pr-review.mjs](scripts/pr-review.mjs) for the reviewer's state on
  the current head.
- [scripts/review-status.mjs](scripts/review-status.mjs) - posts and reads the
  `harness/review` and `harness/ocr` statuses the merge gate requires.
- [references/reconciliation.md](references/reconciliation.md) - inspecting one
  drifted branch or pull request and routing the repair.
- [references/worktree-cleanup.md](references/worktree-cleanup.md) - the cleanup
  playbook, audited by [scripts/repo-inventory.mjs](scripts/repo-inventory.mjs);
  [worktree-retirement.md](references/worktree-retirement.md) holds per-runtime
  liveness, removal through [scripts/retire-worktree.mjs](scripts/retire-worktree.mjs)
  and the one-time reset.
- [references/handoff.md](references/handoff.md) - the readiness judgment.
- [references/adapter.md](references/adapter.md), [host-access.md](references/host-access.md),
  [learning-events.md](references/learning-events.md).
- [scripts/delivery-state.mjs](scripts/delivery-state.mjs) - turns an intent,
  the live state and the adapter into steps, authorities and blockers, for
  commit/push/PR/merge/deploy only.
