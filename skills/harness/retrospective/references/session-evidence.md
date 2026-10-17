# Session retrospective

Use this route when asked to improve the working environment after a coding
session. Start with the named session; otherwise use the current one. Read its
primary evidence: the requirement, changes, failures, repair, checks and review
findings. A handoff or summary helps locate evidence but is not proof by itself.
Do not crawl unrelated sessions or require a learning-queue event. A CI failure
recorded by delivery under the workspace's `findings/ci-green/` is an input
here, and may be any CI failure. A miss names the check CI ran that the local
profile did not, so its repair is to the profile, the check selection or the
review reference, not the symptom; any other entry names its class and cause,
and its repair follows that cause.

Reading several sessions is opt-in. When the user names one question and a
bounded set of sessions (for example "the last ten sessions in this repository,
for navigability"), read those sessions' primary evidence for that question
only. Aggregate what repeated, such as the same file hunted for, the same
document found stale or the same term re-explained, and rank candidates by how
often each cost time. Repetition ranks a candidate; the durable bar still
grounds it. A project term re-explained across sessions is a lead for the
project's `GLOSSARY.md`, which [domain-modeling](../../../domain-modeling/SKILL.md)
writes. Read the logs through [session logs](../../references/session-logs.md):
it names where each runtime keeps them, how to bound the selection and how to
handle the digests.

Look for a specific future mistake or wasted investigation the environment could
prevent. Useful candidate types include:

| Candidate | First useful response |
|---|---|
| Hard-to-find feature or dependency | Correct the existing project map or add a short navigation pointer. |
| Missed mechanical defect | Check whether the project's existing lint, type, test or CI command already catches it. Repair an unwired/broken check first; otherwise add the deterministic check described below. |
| No guardrail at all | No pre-commit hook and no CI job runs the project's lint, type and test command. That is a finding, not a neutral default: propose wiring the existing command into the cheaper of the two. |
| Review judgement repeatedly needed | Clarify the project's coding standard or review reference with the requirement and valid alternatives. |
| Bloated or ineffective instructions | Remove or narrow the line that did not change a decision. Keep `AGENTS.md` a map. |
| Tool economy | An expensive or token-heavy tool call, CLI or MCP: route it through a cheaper existing command or a small helper, where the failed task shows the cost. |
| Approval interruption | Use [approval edge cases](auto-approval.md) to distinguish missing context, false blocks, protective denials and runtime failures before changing permissions. |
| Information access | A crucial fact the agent could not reach: give it a route, such as dev-server logs teed to a file or read-only access to a third-party service, where the failed task shows the need. |

Do not turn each category into a required output. Inspect the actual project
commands and document owners before proposing another check, skill or file.
Repetition, a cloud review comment and historical code are leads, not authority.
Use the durable bar in [job.md](job.md): a reproduced failure, an owned external
contract or an explicit project decision must ground the proposed change.

## Choose the smallest owner

- A mechanical violation the session reproduced (a fixed syntactic pattern, a
  banned API, an import shape, a file-location rule) gets a deterministic check
  by default: a rule in the project's existing linter, a pre-commit hook or a CI
  job, whichever its stack and existing guardrail make cheapest. An existing
  type checker, linter or test that already catches it reliably comes first, and
  any check must permit valid code. The boundary is the evidence: a reproduced
  mechanical failure gets the check, while an uncertain or judgement rule starts
  as advice. Do not add a mandatory hook simply because a rule can be written.
- A project-specific implementation or review judgement, one no check could
  hold (cross-file consistency, matching the surrounding style), belongs in the
  project's living `CODING_STANDARDS.md` - a maintained lesson file the
  retrospective keeps refining, not a document written once. An authorized in-project retro writes
  the accepted lesson there directly: add an entry, sharpen or supersede an old
  one, or remove the entry whose requirement no longer holds; an assessment-only
  request reports the candidate as advice and writes nothing. Reconcile an
  existing equivalent guide in place once; never open a competing standards file.
  State the requirement, failure or contract and the legitimate alternatives.
  Review should check it; implementers may read the relevant part when it helps.
  Do not force the whole guide into every edit, and add no compulsory gate.
- `ARCHITECTURE.md` owns responsibilities, boundaries, flows and consequential
  tradeoffs. A navigation path belongs in `PROJECT.md` or the existing project
  map. Reusable workflow changes belong to the shared harness. Project findings
  belong to that project's workspace.
- If the code or existing guidance already makes the lesson easy to recover,
  the result is no lesson. State why; no new document is necessary.

For a rule, be able to say: **this rule protects this requirement, catches this
demonstrated failure, and permits these legitimate alternatives**. Prefer a small
repair to the current owner over another entrypoint or standing approval step. Use
[proposal.md](proposal.md) when a shared-harness or cross-project change needs a
packet; the ordinary project writer handles an authorized project finding.

Return the candidate and its owner, the source evidence, the smallest change and
a check or observation that could disprove it. Explain material tradeoffs and
rank multiple candidates by practical consequence when useful. An honest
no-lesson answer is complete, and no quota, event marker or user review ceremony
is required.
