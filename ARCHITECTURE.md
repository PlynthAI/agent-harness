# Harness architecture and north star

The harness gives agents what they need to turn a requirement into working,
reviewed software with minimal human supervision. The human starts the work;
agents clarify what matters, implement, investigate failures, verify and obtain
independent review. The normal end point is a merged PR: agents merge once
delivery's merge gate holds, with evidence and honest remaining limitations in
the PR. The human is never the merge gate; an explicit hold always remains a
hold.

Success is less supervision and more reliable delivery, not more agents, tools,
instructions, documents or approval stages. The factory supplies the working
environment; the agent supplies judgment. Project requirements plug into that
environment instead of being baked into every role and skill.

## Ownership and shape

| Surface | Responsibility |
|---|---|
| User-level AGENTS.md | Cross-project preferences and minimal shared-method routing; no project commands or troubleshooting recipes. The owner's own section 01 lives in `AGENTS.private.md`, which the installers compose in (`config/compose-agents.mjs`), so the shared file and the public copy stay generic |
| Shared skills/ | One reusable entrypoint per method, with details loaded as needed |
| principles-and-patterns/ | Principles and language or package patterns that reviewing skills read through one generated index, installed beside skills |
| agents/ and operator configuration | Swappable specialist roles and model choices; no repo copies |
| Repository AGENTS.md | Verified command shortcuts, consequential local constraints and a pointer to the project map |
| Nested AGENTS.md | Requirements and command differences limited to that subtree; no copies of parent instructions |
| Repository PROJECT.md or existing map | Relevant project facts and links to authoritative subject guides |
| Project workspace | Shared local goals, findings, plans, state, artifacts and scratch across worktrees |
| Workspace templates/ | Local starting documents seeded from harness-docs-starter/templates; use selectively |
| Project tools and CI | Executable feedback and genuinely necessary project controls |

This repository is the maintained, versioned source. Deployment is deliberate
copy and reconciliation, not a service or installation framework. The harness
needs no application database, schema, task registration service or writer API.
Project applications may use databases; that is separate from storing harness
instructions and working documents.

A repository has one verification authority named by its AGENTS.md, which links
its journey map and runner and is read by the shared validation skill.
New projects use `docs/VERIFICATION.md`; existing authoritative routes remain.
A project routing skill may point to that guide and distinct procedures, but
must not copy the shared validation method beside the guide and runner.

[harness-docs-starter/](harness-docs-starter/README.md) is the minimal workspace
starter. The fuller OKF material is the upstream template clone at
`<reference-repos>\llm-wiki-okf`, a read-only reference rather than a required
workspace format; the staged harness copy was retired on 2026-09-30 (see
[harness-docs/workspace.md](harness-docs/workspace.md)).
[harness-docs/](harness-docs/index.md) is this repository's own knowledge
collection, which links these authorities instead of copying them.
One workspace serves each project and its worktrees. README.md navigates working
knowledge; the repository's PROJECT.md remains the single project map. Templates
are copied at adoption and selectively refreshed, never applied over filled docs.
The setup guide is the entry for adopting another project.
DESIGN.md is reserved for later work and supplies no invented design standards.

## How work moves

The team lead selects the next useful method and delegates bounded work where it
helps.
Outside multi-ticket work there is no compulsory skill sequence, and there is no
fixed agent hierarchy. Small requests need no ticket or plan unless the project
genuinely requires one. Larger work uses clear intent, relevant context and a
useful acceptance criterion.
Multi-ticket work takes brainstorm, planner's to-spec and to-tickets, then
implement-spec, and the coordinator (the chief of staff) running `coordinate`
opens a chat per ticket group, whose team lead runs orchestrate-work for that group.

Workers make ordinary implementation decisions and repair demonstrated defects.
The team lead integrates results, resolves routine blockers and continues the
authorized request. A skill finishing, a handoff or a context restart does not revoke existing
authority. Shared task records preserve useful progress without per-agent ledgers.

Validation exercises relevant behavior. Independent review assesses the fixed
candidate against the requirement, context and legitimate alternatives.
[Code-review](skills/code-review/SKILL.md) starts with one accountable independent
review for ordinary changes and adds specialist coverage where the risk warrants
it. A qualified hosted review may supply that review. Matching early coverage
is reused through local integration, commit and push; unrelated base movement
does not restart it. Changed content, dependencies, fixtures, configuration or
scope invalidate affected evidence. Final integration is verified before merge.
The [team reference](skills/orchestrate-work/references/team.md) preserves one
group candidate review for related tickets. Review comments, tests and historical
conventions are evidence, not requirements.
Agents investigate and adjudicate findings instead of automatically implementing
cloud review suggestions or repeatedly checking unchanged work.

A ready PR explains what changed, why, what was verified and real limitations.
Source checks, installed configuration, fresh-session discovery and live product
behavior are distinct claims; report only evidence actually obtained.

## Good and bad changes

| Good | Bad |
|---|---|
| One shared method using project subject guides | A project copy or references-only clone of every skill |
| Short instructions that change a decision | Large mandatory reading stacks and rigid itineraries |
| Relevant checks that catch a real failure | Gates enforcing historical wording or checker preferences |
| Repairing a faulty checker and permitting valid alternatives | Distorting valid code just to obtain green checks |
| Resolving blockers within existing authority | Returning every worker problem for human approval |
| Preserving source provenance and useful project nuance | Treating existing code as gospel or erasing domain knowledge |
| Using local templates when helpful | Requiring every template to be filled before work starts |
| A justified control against a consequential risk | Adding guards because more blocking feels safer |

## Autonomy and necessary boundaries

Prefer clear skills and rules over hard blockers for ordinary workflow choices.
A proposed constraint must identify the protected requirement or demonstrated
failure, the legitimate alternatives it permits, and why lighter guidance or an
existing tool is insufficient. Trial uncertain advice before enforcing it. Remove
redundant controls instead of accumulating approval stages.

Agents still respect actual permission boundaries, private data, credentials,
production protections, unrelated work and explicit scope. A genuine new product
choice, materially expanded paid usage, unauthorized disclosure or irreversible
operation can require the human. Do not invent authorization or bypass a denial.

For recurring external processing, preserve established material, destination,
purpose and usage scope in existing project guidance. Carry that evidence into
requests and handoffs. Public source documents do not become confidential merely
because they are cached locally; inspect what is actually sent. Credentials and
provider configuration alone do not grant permission. See
[workflow authorization](skills/orchestrate-work/references/authorization.md).

## Maintaining this factory

Read this document when proposing harness behavior changes. Improve the existing
owner first. Keep project facts local, preserve operator model/plugin/permission
choices, inspect current upstream sources before porting, and use progressive
disclosure. Check the affected routes and obtain independent review proportional
to the change. Keep the source and authorized installed copies aligned and record
actual deployment limits. No extra approval is needed merely to move between
already-authorized preparation, implementation, validation and review.
