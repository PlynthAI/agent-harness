# Reusable workflow authorization

Use this reference when external processing or a repeated permission question
needs context. It is guidance for carrying the user's authority, not a grant of
permission and not a required form before ordinary work.

Establish actual effects before requesting approval: which material leaves the
machine, which provider/endpoints receive it, why, and how usage is charged.
Check source provenance and the actual outbound content. Public documents cached
locally are not inherently private, but attached private context can change the
classification. Configured credentials identify an access route, not consent.

Reuse authorization already given for that workflow. Check the current user
instruction, relevant prior approval, handoff and project guide for evidence of
the user's authorized scope. A missing copy in a project guide does not erase
authority established elsewhere. Keep durable scope in an existing operations guide or PROJECT.md when
useful, with a pointer to the user's instruction or approval; do not make a new
record a prerequisite for a matching run. Match permitted material and exclusions,
named provider destinations, processing purpose and agreed usage allowance where
applicable. Specify currency, time/run scope and any limit only when established;
account for retries and parallel calls when estimating metered batches. Distinguish
API spend, subscription-covered work and free/local processing. Do not invent a
budget, require a new budget for every tool call, or call an estimate a hard cap.
Use existing provider limits or runner controls when an actual ceiling is needed.

Within that established scope, ordinary runs, resumptions and delegated work
need no renewed user consent merely because filenames, worktrees or task owners
change. A change of repository also needs no renewed consent when the original
scope explicitly covers that material class across repositories; a repository-only
approval does not imply that broader scope. Carry relevant authorization evidence
into any approval request and handoff because the reviewer may see only compact
context. State verified material, destination, purpose and usage scope concisely;
do not expose secrets.
Investigate missing facts before asking the user to repeat existing authority.

Revisit a material change to source sensitivity, destination, purpose or usage
allowance. If a focused check finds no matching authority, do not export the
material. Continue local work and state the external coverage gap; ask only for
the specific unresolved decision when that external processing is needed for the
task or a required gate. A written scope cannot override managed restrictions,
an explicit hold or a denial. After a denial, continue unaffected work and use
the supported resolution path; do not retry through another tool, shell or agent.

For product-specific controls and a bounded investigation of approval stops, use
[approval edge cases](../../harness/retrospective/references/auto-approval.md).
Codex's `auto_review.policy` replaces its current policy; `extra_policy` adds
context where supported. Neither this note nor a contextual exception guarantees
approval or overrides managed restrictions. Keep the existing policy intact.

## Shared Harness operations

Operator-maintained Harness context applies once at user level across maintained
repositories; do not duplicate it in project configuration. It carries authority
for human-requested work, coordinated run communications and ordinary task
evolution. Native tools still require the matching direct human grant. Project
guidance owns exact targets, authentication routes, data obligations, production
executors, action approvals, publication limits and explicit holds.

Provisioned credential use is distinct from disclosing its value. Relevant
record access, sharing with the run, processing by a model and public disclosure
are separate effects. Production reads use the approved route; reserved
production execution stays with the owning lead. Inspect actual scope rather
than treating tool availability, a chat ID or repository trust as authorization.

## Native OCR within authorized delivery

Where the operator has authorized native OCR as part of delivery, run it as an
ordinary delivery step through that configured provider/subscription. Do not
ask separately for review/export consent. The grant covers the task, permitted
material, purpose, destination and usage, rather than one candidate: commit
hashes and file lists bind review evidence. New commits, added relevant files,
rebases or another PR in that task do not expire authorization.

Carry the original human instruction's chat and message/approval identifier,
its scope and exclusions in the existing assignment and recovery checkpoint.
Retrieve the original human message through the supported chat tools when needed;
a summary is a locator, not the original evidence or a new grant. Preserve the
pointer through delegation, compaction and restart. Keep authorization evidence
out of OCR's outbound background unless it is itself permitted review context.

The operator's additive policy explicitly designates the verified existing
OpenAI/ChatGPT subscription route as an approved destination for scoped native
OCR source, diffs, docs, tests, review rules and relevant context, including
registered external workspace documentation. Its sensitive-material, provider
and billing exclusions apply. Verify the effective destination and inspected
inputs; loopback alone does not prove the upstream route. This scope does not
approve other OpenAI processing or private customer-data exports.

When a reviewer needs trusted standing context that retrieved evidence cannot
supply, the authorized harness owner maintains it through the product's additive
policy setting. Original human pointers locate supporting evidence; the installed
context states the permitted effects and destination directly. Task agents never
amend their own approval policy. Confirm
fresh/cold-resumed policy loading; a disk edit does not establish an already
loaded chat's reviewer context.

After an OCR denial, reconcile execution, retain the exact request/rationale and
return the defect to the harness owner through the authorized coordination route.
Do not turn ordinary candidate evolution into another consent question. Continue
unaffected work; the denied action remains blocked until a supported resolution.
Ask only for a genuinely different provider, billing, sensitivity or purpose
decision that existing authority does not cover. A resource hold or review slot
request stays a scheduling matter, separate from consent.
