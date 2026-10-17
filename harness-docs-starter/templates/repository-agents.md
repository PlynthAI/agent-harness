<!-- Approved adoption recipe. Populate separately for each repository.
Replace placeholders with verified facts. Omit inapplicable sections.
This is the second level beneath the user-level AGENTS.md. The user level owns
preferences, delegation and the stage table; this file owns the repository's
commands, verified facts, local constraints and a pointer to PROJECT.md. It
never repeats that handbook. Every session in this checkout reads it, so every
line costs. -->

# <project>

## 01 Project context

<One paragraph: purpose and the architectural boundary that explains the
repository. Point to PROJECT.md for the full map.>

Stack: `<language and runtime, with versions>`, `<framework, with version>`,
`<the few dependencies that shape the code: data layer, UI kit, test runner>`.
Versions come from `<lockfile or manifest>`.
Node, where used, is declared with `.node-version` = `24` and `engines.node` =
`>=24`; any other pin records its reason here.

## 02 Commands

Run from `<working directory>`. Package manager: `<name/version source>`.
Prerequisites: `<runtime, local configuration, supported test environment>`.

| Task | Exact command | Scope or prerequisite |
|---|---|---|
| Install | `<command>` | `<lockfile and environment>` |
| Dev | `<existing launcher>` | `<app or package>` |
| Test all | `<non-watch command>` | `<what it actually covers>` |
| Test file | `<command with an example file>` | `<runner>` |
| Test name | `<supported selector>` | `<runner; omit if unavailable>` |
| E2E | `<command>` | `<server, auth, test data; artifacts>` |
| Lint | `<command>` | `<scope>` |
| Typecheck | `<command>` | `<scope; omit if inapplicable>` |
| Build | `<command>` | `<when required>` |

<Write each command as it is typed, flags included; a tool name is not a
command. Name package selectors only where supported. List a real aggregate
separately if it runs several checks. Do not assume test runs lint, types or build.>

## 03 Repository tooling

### Development runtime

- Start: `<idempotent command: reuses this checkout's healthy instance or starts one, through Portless where configured, and prints its URL>`.
- Status: `<command reporting URL, liveness and checkout identity; non-zero exit when the instance is unusable>`.
- Logs: `<location and bounded read command>`.
- Stop: `<command that ends only this checkout's instance>`.
- Runtime guide: `<existing guide with Portless/worktree details where configured>`.

<These are commands in the project's runner, not procedures. A step agents
repeat by hand (reading runtime metadata, building a test environment block,
comparing checkout identity) is a missing command: add it to the runner.>

### Code navigation

- Search and tracing: `<available tools and exact repository/worktree selector>`.
- Code graph: the shared codebase-memory-mcp wrapper; `<only exceptions: a .cbmignore, blind spots, paths not to index>`.

### Agent runtimes

<Only when Claude Code works here: it reads this file directly, so the
repository keeps no CLAUDE.md. Claude sees a repository skill in
`.codex/skills` through a generated stub in `.claude/skills`: run
`node <shared-skills>/skills-list/scripts/claude-skill-stubs.mjs --write`, commit
the stubs, and keep `--check` in the check script where the harness is
installed.>

### Other task-dependent tools

<Only applicable entries: database read/execution guide, browser/test login,
design authority, content tooling or data pipelines. Name the trigger and owning
guide. Keep shared procedures in shared skills, local commands here or in the guide.>

## 04 Layout and coding conventions

<Link ARCHITECTURE.md's bindings for where things live, or give a small map of
non-obvious directories.>

- <Up to a few local rules that tools cannot enforce.>

<One short snippet copied from real code that already follows the target
conventions and shows house style (naming, error handling, imports), or a link
to the coding standards section that holds one. A real example teaches more
than paragraphs describing it; an example of old debt teaches the debt.>

<Omit the Code Review Rules section below until the owner declares a feature
production-ready; until then every path is experiment tier by default and an
unfilled section would publish placeholders as rules. Codex's GitHub review
reads this heading from the root and nested AGENTS.md covering each changed
file, and harness reviewers take each feature's tier from it (code-review's
finding triage). Link conventions rather than restating them.>

## Code Review Rules

Production-ready features, declared by the owner: `<paths or features>`.
Every other path is experiment tier.

- Do not propose new validation, gates or hardening for experiment-tier paths.
  Security, privacy and data-loss defects are reported at any tier.
- Report all findings in one pass, defects in promised behaviour first.
- Conventions: `<links to ARCHITECTURE.md and CODING_STANDARDS.md>`.

## 05 Boundaries

Always, without asking:

- <Routine actions the agent takes as part of the work, such as running the
  checks in section 02 or regenerating a generated file with its owning tool.>

Ask first:

- <The few actions that need the user, such as anything under this
  repository's actual production, data or external-processing restrictions.
  Each line names the real consequence: data loss, a live customer effect, cost.>

Never:

- <Commit secrets or credentials.>
- <Edit generated paths, vendor folders or whatever else this project protects,
  with the owning tool named.>
- <Break a domain invariant or contract a change must preserve.>

<Record real project restrictions. Do not invent blanket approval rules for
dependencies, APIs or migrations, and keep caution out of "ask first": a line
there stops the agent, so it must name what goes wrong otherwise. Nested
AGENTS.md adds only subtree differences.>

## 06 CI and quality gates

- CI definitions: `<actual workflows and referenced scripts>`.
- Required checks: `<verified requirements and when they apply>`.
- Verification guide: <declared authoritative path; new projects use
  `docs/VERIFICATION.md`> (check selection, journeys, launch, evidence and cleanup).
  A project routing skill may point here without copying the shared method.
- Local ladder: pre-commit `<tool and staged checks>`; push `<lint, types and
  unit test commands>`, never a build or browser run; the verification guide's
  CI parity table maps each CI job to its local command or hosted-only reason
  (validate-implementation's check ladder).
- Evidence: `<test/browser artifacts and their configured destination>`.

<Check workflow contents and actual requirements; file presence alone does not
prove a required gate. Mark unavailable capabilities as adoption gaps, not passes.>

## 07 Commits and pull requests

- Branch prefix: `<prefix, e.g. claude/ or codex/>`.
- Commit conventions: `<existing convention, if any>`.
- PR template: `<actual path>`; every PR body fills it.
- Merge route: `<auto-merge armed on required checks | agent merge>` (delivery's
  merge gate). Agents merge; the owner is never the gate.
- Deployment: `<what a merge deploys, if anything>`.

<Use shared delivery. Link existing requirements; do not invent automatic PR
rejection or a new approval process. "Agent merge" is for a repository whose
forge has no required checks: arming auto-merge there would merge before CI
reports.>

## 08 Documents and deeper guidance

Project map: `<PROJECT.md or existing authoritative map>`.

- Use `<architecture doc>` for `<service boundaries and where new code goes>`.
- Use `<schema or data doc>` for `<schema and migration changes>`.
- Use `<operations doc>` for `<preparing a release or deployment>`.

<One row per document, each naming the situation that calls for it. No document
stack is required reading before a small edit. The map links standards, design,
contracts, specs/PRDs/decisions and the configured workspace for plans, findings
and evidence. Use existing owners; do not create empty documents to fill rows.>

## 09 Done means

<The requested behavior is demonstrated by applicable checks from section 06,
including affected consumers and meaningful interaction evidence where relevant.
Required gates pass before the merge gate admits it. Report unrelated failures and
unverified checks accurately; a passing build alone is not completion.>

Before publishing, check the populated file against the "Review flags" section
of the installed writing skill's agent-instructions reference, then delete this
note.
