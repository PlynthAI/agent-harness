# Repository adoption

For the complete project-owner assignment, use the source harness's
`harness-setup-guide.md` at its root. Locate that maintained source for adoption;
the guide covers intent, shared installation and workspace seeding. This reference expands
the consolidation decisions.

The harness owns how agents work; the project supplies what they need to know.
Changing a reusable workflow should require changing the harness once. A project
changes when its facts, commands, contracts or requirements change. Removing
SKILL.md while keeping cloned procedures in reference folders is not adoption.

Prepare or apply within the user's scope. Name the delivery owner for work
across separate tasks using [the assignment contract](assignment.md). Existing
publication authority persists; a forwarded message does not transfer runtime
permissions or bypass an enforced denial. Adoption adds no approval gate.

## What belongs where

| Information | Authoritative home |
|---|---|
| Reusable planning, implementation, testing, review, delivery and design methods | Existing shared harness skills |
| Project routing and links to local facts | Repository PROJECT.md, reached from its short AGENTS.md |
| Lasting architecture, API contracts, domain invariants and operational requirements | Existing versioned project documents and tooling |
| Current task objective, scope and acceptance | User request, issue, or PR for a small change; a lasting spec only when warranted |
| What the candidate delivers, tradeoffs and verification limits | Existing PR description |
| Goals, findings, exploration, temporary plans, state and evidence | External project workspace |

PROJECT.md is a project map, not a new workflow skill or copied handbook.
Populate it from current project evidence using
[the repository template](../../../harness-docs-starter/templates/PROJECT.md) in the
source harness. Link authoritative guides by subject: a testing guide can serve
TDD, validation and review; a contract can serve planning, implementation and API
design. Do not make one adapter, guide or folder for every shared skill.

The map lives at the repository root. The external workspace README.md owns
knowledge/task navigation and useful legacy pointers, and links to repository
PROJECT.md for project facts. Do not create a second workspace project.md.
When adopting an older workspace, reconcile useful navigation from its project.md
into README.md and update active links before retiring the old map; do not erase
unique content. Neither ordinary document is an automatically discovered skill.
AGENTS.md supplies the pointer; agents read only the relevant subjects, not a
full document stack before edits.

For an existing project with an equivalent authoritative map, reconcile that
owner rather than maintain two maps. Use PROJECT.md for new adoption where this
convention is requested. File names and optional templates do not invent missing
project standards or block ordinary work in projects not yet adopted.

## Consolidate content, not just entrypoints

Inspect local skills, references, scripts and root/nested instructions against
the actual shared methods and their consumers. Compare responsibilities and
behaviour, not only names. Earlier inventories are starting points, not proof.

- Remove duplicated generic procedure rather than preserving it under a new
  heading or in a references-only copy of the old skill tree.
- Extract useful project facts into their existing subject documents. Resolve
  disagreements against the accepted requirement and observed behaviour.
  Existing tests, conventions and reviewer labels do not establish requirements.
- Retire superseded skill folders after updating their active callers. Ordinary
  guides belong with project documentation. Useful executable helpers belong
  with their owning tooling: inspect consumers before moving or retiring them.
  A real compatibility dependency can justify a bounded residual path with its
  consumer and remaining work recorded in the current handoff, not permanent
  duplicate guidance or an invented migration system.
- A local skill earns an entrypoint only for an independently useful procedure
  that a shared method plus project guidance cannot adequately cover. A project
  name, path, command, safeguard or specialized vocabulary is insufficient.
  Reassess existing local skills; a former classification does not approve them.
- The repository keeps one verification authority named by AGENTS.md. New
  projects use `docs/VERIFICATION.md`; established guides keep their owning
  routes. A project router points to that guide and distinct procedures rather
  than copying the shared method. Reconcile consumers before retiring duplicated
  guidance or a routing skill. Follow validation's
  [setup route](../../validate-implementation/references/setup-and-maintenance.md).
- Route reusable improvements to the existing shared source owner. A repository
  agent does not edit the global installation or create a local replacement.
  Continue unaffected work; identify the concrete capability gap when work
  really depends on a shared change.
- For third-party content, inspect official upstream before porting or
  generalising and retain required licenses/provenance through the harness library.
  Unused or duplicate copies can be retired without inventing another port.

Preserve unrelated edits, original evidence, project design nuance and working
domain behaviour. Do not discard production safeguards merely because they are
project-specific. Changes to enforced controls need their own authorized scope
and relevant verification; adoption is not a reason to add controls either.

## A small repository entry

Use the [repository AGENTS recipe](../../../harness-docs-starter/templates/repository-agents.md).
User-level AGENTS.md owns cross-project preferences and minimal skill routing.
The repository root owns verified command shortcuts, consequential local
constraints and a PROJECT.md pointer. Nested AGENTS.md files contain only subtree
differences. Preserve useful scoped rules, including review requirements used by
cloud reviewers; reconcile contradictions instead of copying parent instructions.

Put copy-pasteable install, dev, test, lint and typecheck commands near the top
when applicable. Verify their working directory, prerequisites, non-watch mode,
selectors and actual coverage against manifests, runner configuration and CI.
Inspect .github/workflows when used and follow its referenced scripts; a workflow
filename alone does not establish required branch checks. Keep script behavior
in tooling and detailed check selection in one verification guide.

Do not impose pnpm, Turbo or Vitest on other stacks. A test task does not imply
lint, types or build ran; a package filter may omit affected consumers. Prove
documented commands during tooling adoption, adding scripts only for an actual
gap. Run relevant existing checks and required gates; add or update meaningful
behavior coverage when needed. Fix in-scope failures and report unrelated failures
without expanding the task silently or claiming a green suite.

PROJECT.md maps architecture, standards, design, contracts, operations and document
owners. Keep full directory trees, examples and longer procedures in those owners.
Link the actual PR template and delivery requirements; do not invent approval
gates or automatic rejection policies. Host troubleshooting belongs to its shared
tooling/operations owner, not every repository's standing instructions.

Shared skills use the project guidance reached through AGENTS.md. Do not assume
a matching .codex/skills/<method>/references directory is loaded or merged into a
global skill. Paths in PROJECT.md are repository-relative unless explicitly
qualified; use the active worktree. Use installed skills by the source paths
supplied by the session. Missing discovery is not a reason to revive a duplicate.

Repository skills live in `.codex/skills` only. Claude Code sees them through
generated stubs in `.claude/skills`, written from the repository root with
`node <shared-skills>/skills-list/scripts/claude-skill-stubs.mjs --write`. The
stubs are committed like any generated file and never edited by hand. Where the
harness is installed, the repository's check script runs the same command with
`--check`, which fails on a stale, missing or orphaned stub.

## Quality kit and existing debt

The tool-choice owner settles the project's accepted pack. Repository adoption
applies its selected [quality-kit](../../validate-implementation/references/quality-kit.md)
checks through the project's guide and runner; an excluded or deferred tool
stays excluded or deferred. The kit owns reusable commands and baseline methods,
and ci's [adoption](../../ci/references/adoption.md) owns the selected CI gates.
The repository keeps its own tool configuration, baselines and facts.

The stack scan identifies language and dependency coverage questions:
`node <shared-skills>/harness/scripts/stack-scan.mjs <repository>` lists
the languages found with their kit (or no kit yet, a gap for the harness
owner), the library pages that will apply, and the direct runtime dependencies
no page covers. A language with a manifest is a pack-selection input, not
authority to add every kit tool. A language seen only in source is incidental
unless its files run in CI or a deploy, or become a package; the tool-choice
owner decides which checks apply. From that list an agent proposes a page only for a package that
shapes how code is written (a framework, data layer, auth or state library),
under the library's
[rules for a page](../../harness/library/references/principles-and-patterns.md#adapted-upstream-rules),
and the owner decides. Nothing already in the repository is adopted on
trust: the scan informs the tool-choice owner's coverage decisions, while
conventions come through the audit below, into
ARCHITECTURE.md, CODING_STANDARDS.md and PROJECT.md.

The environment inventory records what the repository needs from a machine:
`node <shared-skills>/harness/scripts/env-scan.mjs <repository>` lists the
runtime and package-manager pins, tools the dependencies imply, every
environment variable declared in an example file or referenced in code (likely
secrets marked; names only, a real `.env` is never opened), CI secrets,
services, update automation and existing setup hooks. Adoption fills the gaps
it shows in the repository's standard sources: a pin where the ecosystem
expects one, a commented `.env.example` line for each variable the code reads,
an idempotent `scripts/setup-env.sh` when setup takes more than the package
install, and PROJECT.md's Environment section pointing at them. That makes the
environment portable; the harness's
cloud-env method then packages it for a
cloud container, and [update-packages](../../harness/update-packages/METHOD.md)
keeps it current.

A new project adopts its selected blocking checks with empty baselines, so its
first violation fails CI. An existing repository adopts selected tools in this order, each step
a short pull request merged the same day. Never keep cleanup on a long-lived
branch.

1. **Baseline pull request, config only.** The kit's config files, every
   baseline recorded from the current tree, the CI gate made a required check,
   and a parity row per tool. Comments a tool writes (`ruff check --add-noqa`)
   count as baseline content. A framework lint config that lags its framework
   is updated here, since it changes what the baseline records. From this merge
   no new debt lands. State each baseline's size in the description, so later
   shrinkage can be measured.
2. **Delete dead code.** Nobody is editing it, so it conflicts with nothing.
   Each candidate is confirmed by search and passes the tests before it goes;
   cold is not dead. The dead-code gates turn on with this step, since knip
   has no baseline and vulture's whitelist cannot hold unreachable code.
3. **Cold areas: one small pull request per module.** Decide "cold" per
   repository from measured churn (no commits in 90 days, say) and from open
   pull requests and plans, not history alone: a quiet folder with a large open
   draft is not cold.
4. **Hot areas: inside the feature work that already touches them,** as its own
   commit, so review can tell the tidy-up from the behaviour change.
5. **Wide mechanical changes** (a formatter, a codemod, a tree-wide autofix): one
   fast pull request at a quiet moment, with its commit added to
   `.git-blame-ignore-revs`.

Every fix lands with its shrunk baseline file.

**The conventions pages state the target, not the tree.** Software
repositories require ARCHITECTURE.md and CODING_STANDARDS.md, written from the
target conventions with the starter recipes
([architecture](../../../harness-docs-starter/templates/architecture.md),
[coding standards](../../../harness-docs-starter/templates/coding-standards.md)),
never by describing the tree as it stands; deliberate departures are stated
with their reason and accidental ones become debt issues, not lines on either
page. The conventions pages and the debt issues come from planner's
[codebase audit](../../planner/references/audit.md), scoped to recently
changed areas and run after the baseline pull request; its debt issues and
strong candidates then follow the order above. The pull request that adds the
pages adds the kit's binding paths check to the CI gate.

**Debt lives in one place per repository:** one issue per rule and area, with
a `debt` label. The baseline entry names its issue where the format takes a
comment; otherwise the issue names the rule and area exactly as the baseline
keys them. An existing debt tracker file is reconciled into those issues, not
kept as a second home. Most accidents stay off the conventions page; one that
will catch the next change gets a single warning line pointing at its issue.

After adoption, docs-workspace's
[docs audit](../../docs-workspace/references/docs-audit.md) keeps the
repository's documents and workspace records true, on request or on a schedule.

## Workspace and template adoption

Use [harness-docs-starter/README.md](../../../harness-docs-starter/README.md) only when workspace
adoption is in scope. Worktrees share one external root. Local records are plain
Markdown: no database, schema, writer, installer or symlink tree is required.
Keep legacy machine stores and active task records at their declared owners
unless the assignment explicitly includes their move and consumer reconciliation.

Seed the complete harness-docs-starter/templates/ into workspace templates/ and create
every working folder in the starter README's folder map, including empty folders.
Workspace AGENTS.md routes writers to these local recipes and README.md lists them.
Use templates when helpful, not as mandatory documents. On refresh, preserve
project adaptations and filled documents; add missing recipes and reconcile changes
deliberately. No background synchronization or extra skill entrypoint is needed.

Keep one design authority at its existing owner. Derive new standards from
project evidence only when that work is requested; a missing DESIGN.md does not
justify inventing a standard or blocking unrelated adoption. That authority is
the root DESIGN.md in the Google DESIGN.md format, with `designmd lint` in the
repository's check script. The alignment pass moves or replaces a nested or
pointer DESIGN.md and repoints the library profile and any drawing theme in the
same change, following the design skill's
[DESIGN.md adoption route](../../design/references/design-md-adoption.md).
Backend, frontend, website and non-software projects select only applicable
subjects and tooling.

## Review context and acceptance

Use the existing shared code-review and delivery methods. Keep essential intent,
scope, acceptance, meaningful tradeoffs and evidence in the PR context, scaled to
the change. The shared review method owns this brief; no extra packet or mandatory
section list is needed. Cloud reviewers cannot be assumed to inherit workstation
skills or access the external workspace. Judge their findings against actual
requirements and consequences; do not implement comments blindly. Clear any
OCR path rules the repository already has with code-review's
[a repository's rules](../../code-review/references/ocr/project-rules.md#a-repositorys-rules).

Verify representative paths through the new guidance: a task reaches one shared
method and the correct project facts without a duplicate workflow. Check active
links, relevant executable consumers, discovery and generated mirrors as affected.
Use proportional existing checks and independent review of the fixed candidate;
do not add prose word-count gates or run an application build merely for copying
docs. Report fresh-session checks only if actually performed. Live issue trials
remain a separate final rollout step, not a prerequisite for preparing source.

Return the removed procedures, surviving facts and their owners, justified local
entrypoints, remaining compatibility dependencies and real shared gaps in the
existing task handoff. This is change evidence, not a new maintained inventory.
A folder count alone does not establish consolidation.

## Repository-owner brief

Adapt this with the owned repository, workspace and delivery scope:

> Consolidate this repository around the shared harness. Inspect actual content
> and consumers, not only SKILL.md names. Remove duplicated methods, consolidate
> useful project facts by subject at their authoritative documents, and retire
> superseded skill-shaped reference trees after updating callers. Retain useful
> executable helpers with their owning tooling and justify each remaining local
> skill against a shared method plus project guidance.
>
> Populate repository PROJECT.md from current documents, tools and requirements;
> let AGENTS.md add concise project instructions to the global guidance and point
> to that map. Use workspace README.md for knowledge/task navigation, reconciling
> any former workspace project.md and its links. Preserve domain behaviour,
> design nuance, safeguards, originals and
> unrelated edits. Keep task records in the declared workspace. Route shared
> capability gaps to the harness owner without cloning a local procedure.
>
> Reconcile active references and mirrors, run proportional checks and obtain
> independent review. Demonstrate representative shared-method/project-guide
> routing. Return a concise before/after handoff with remaining limits. Follow
> the user's commit, PR and merge scope; add no publication or production action.
