# Reconciling a drifted branch or pull request

Reconciliation reads the owner and current state, then carries out the repair
when the user's request covers it. An audit-only request stops at findings;
recorded authorization for repair does not require another permission loop.

## Inspect the actual target

- Work one target at a time. A request about a branch, a pull request or a base
  is not an invitation to audit every branch; inspect the target and what
  directly touches it.
- Read live state rather than a remembered one: the current base, the branch's
  own commits, its remote counterpart, its pull request state and its checks.
- Establish the owning worktree, and whether an active task still holds the
  branch. An unowned branch and a branch with a live owner get different routes.
- Fetch before comparing, and compare against the ref you actually fetched.

## Classify without concluding

Classification is a report, not a decision to mutate.

- A branch that is behind its base is not automatically a branch that needs a
  rebase. Rebasing cleanly, merging the base in, waiting for the owner and
  leaving it alone can all be correct. Report the state and route the choice.
- A local-only branch describes push state; it is not proof that work is lost.
- A merged pull request does not cover commits made after the head it merged. A
  newer commit on the local or remote tip is new work and needs its own check.
- A comparison that fails or cannot complete fails closed: report it as
  unresolved instead of taking the convenient reading.
- When the owner is still working, the decision stays with them. Hand them the
  state and the suggested route rather than acting on their branch.

## Route rather than silently repair

- The project's guidance owns the commands. This reference names none, because
  the host, the branch rules and the merge method differ per project.
- Rebasing, force-pushing and deletion are separate authorities. Do not rebase a
  published branch, force-push it, or delete a branch because a report made it a
  candidate.
- A published branch that only needs a newer base can merge the base in, which
  keeps its push a fast-forward. A rebase needs a force-push, which Claude Code's
  auto mode denies as destructive, so prefer the merge unless the project
  requires linear history.
- Assess evidence inputs before rebasing or merging the base. Unrelated base
  movement does not expire matching review or checks. Changed relevant content,
  callers, dependencies, fixtures, configuration or scope need fresh affected
  coverage. Verify final integration through the project's authenticated gate;
  current head metadata alone does not establish freshness.
- A repair that needs validation or review goes through the project's own
  validation and an independent review of the fixed candidate.

## Respect a denial

A denial covers the operation and its target, not the spelling of the command
that carried it. Report it once and continue permitted work; retrying the same
operation through another command, shell, runtime or agent is not a remedy.

## Return the result

Return the target, its owner, the live state you read, the classification, the
route, repairs completed and the actions you deliberately did not take. An unresolved
classification is a result; a guess is not.
