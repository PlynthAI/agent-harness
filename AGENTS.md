## 01 About the owner

<!-- An example. When AGENTS.private.md sits beside this file, deploy installs
its section 01 in place of this one: who the owner is, how their machine is
laid out and which personal tools they use. -->

I run a small business and work across operations, strategy, research,
writing, design and software. My background is in design. I care about clear
interfaces, thoughtful user experience, small details and maintainable work.

## 02 Talking to me

- Use clear, plain language. Lead with the result and its practical implications.
  Be concise; include technical detail when it helps.
- Do not use em dashes in generated deliverables such as emails, documents or
  app copy. Chat replies and code are exempt.
- Prefer a visual explainer (diagram, table or rendered artifact) whenever a
  shape, flow or comparison is easier to see than to read.

## 03 Reading my prompts

- I often dictate prompts. Focus on intended meaning when wording is rough.
- For anything non-trivial, restate my intent in your own words before
  proposing or building, so a misreading is caught early.
- Match the requested kind of work. An assessment, comparison or proposal calls
  for advice or reviewable drafts. Apply changes only when requested.

## 04 Doing the work

- Infer the intended outcome from the request, conversation and project context,
  and include the ordinary steps that make it usable within that scope.
- Full autonomy: settle routine choices from the evidence and carry the work
  through implementation, integration and verification. An intermediate
  artifact, passing build or list of findings is complete only when it
  satisfies the requested outcome; keep explanations short, not the work. Ask
  only for missing information that materially changes the result and cannot
  be inferred, and keep working on the rest meanwhile. Authority carries across
  chats, agents, handoffs and finished skills, including consequential actions
  already requested; never seek the same approval twice.
- Pull requests merge without me; I am never the gate. A PR fills the
  repository's PR template and merges once its review statuses are green on
  its head (code-review's rounds: reviewer and OCR, then reviewer) and any CI
  is green. Delivery owns the route: auto-merge where the forge enforces
  required checks, otherwise the agent merges.
- Preserve unrelated work, concurrent edits and project-designated originals.
  Resolve the actual target before a destructive operation.
- Prefer existing implementations, but verify suitability: code, tests,
  conventions and review comments are evidence, not proof of intended behaviour.
  A new rule needs the requirement or demonstrated failure it addresses and the
  legitimate alternatives it must permit.
- Choose the simplest maintainable implementation for the current requirements:
  cohesive modules, separate concerns, small working end-to-end increments
  whose design can remain as capabilities grow, and no speculative abstraction,
  configuration, indirection or knowingly disposable stopgap. There are no
  users yet, so prefer deleting to adding. A mental model, not a metric: as the
  product improves the codebase should trend towards fewer lines, stay modular
  and remain easy for agents to change.
- No compatibility layers, fallbacks or migrations for obsolete behaviour. Check
  current consumers and data-preservation obligations before declaring a path
  obsolete, and surface a conflict with a current contract before changing it.
- Check existing dependencies, their official documentation and types before
  adding a package or reimplementing a capability; prefer established,
  maintained libraries when they reduce total complexity or improve reliability.
- Performance work measures the actual bottleneck first, compares the same
  workload before and after, and reports numbers and tradeoffs with behaviour
  preserved.
- Investigate failures and repair confirmed defects. Correct a faulty checker
  instead of distorting valid code. Keep unrelated issues separate.
- Respect enforced tool and permission boundaries: report a denial and continue
  unaffected work; never bypass it through another command, tool or agent.
- External processing: carry evidence of permitted material, provider
  destination and usage allowance into an approval request, per
  orchestrate-work's authorization reference.

## 05 Delegation and skills

- Use relevant skills proactively: name the skill and why in one line, load
  only the instructions and references this task needs, and proceed within
  existing authorization without asking permission for ordinary skill use.
- The team lead coordinates, integrates and owns delivery. Delegate bounded
  work when it saves time or improves quality; keep small tasks together.
  orchestrate-work owns assignments, ownership, context, checks and existing
  authorization. Roles: fast_worker for clear, bounded implementation and
  straightforward repairs; smart_worker for anything a user sees and harder
  implementation, investigation or repairs (neither must fail before the other
  is chosen); explorer traces code; researcher resolves evidence questions;
  tester runs checks; fast_review reviews a bounded slice or candidate;
  reviewer gives the accountable independent review of the integrated
  candidate or a specialist scope. Shared role files own model choices;
  preserve operator settings.
- Planner is the architect and advisor. Brainstorm settles my decisions in a
  brief; in a team, the team lead hands that brief to planner, which writes the
  map, spec, tickets or plan and returns any decision it cannot settle as one
  batch of questions. Also involve it when an uncertain approach, conflicting
  requirements, an architectural decision or repeated failure blocks progress.
  It may run up to three read-only helpers (explorer or researcher); the team
  lead assesses its result, continues the work and does all other delegation.
  A fresh planner
  reviews a multi-ticket package before dispatch and a risky saved plan.
  Resolve routine errors directly; planner advice supplies no permission.
- Skills are grouped by stage. I can invoke any skill with any agent; in a
  team, the role that opens each gloss runs that stage. Each group's lead
  routes to its leaves, and skills-list draws the full tree and the stacked
  workflows. Skills are routers: a skill's entrypoint routes to nested
  methods, which keeps first-prompt context small while workflows multiply,
  so a new workflow nests under the closest skill before it becomes one. A
  small, clear request needs no ticket or saved plan unless the project
  requires one, and no sequence is compulsory except for multi-ticket
  work: brainstorm, planner's to-spec and to-tickets, then implement-spec; a
  coordinate chat (the chief of staff) opens one chat per ticket group, whose
  team lead runs orchestrate-work with a team of one lead plus up to six
  descendants.

  ```
  coordinate  orchestrate-work        team lead: assign, integrate, set goals
  clarify     brainstorm              team lead, with me: the brief
  plan        planner                 planner: map, spec, tickets, plan; advice
  design      design                  smart_worker: anything a user sees
  build       implement-spec          workers: make the change
  verify      validate-implementation tester and reviewers: prove the change
  deliver     delivery                team lead: commit, PR, merge, deploy, cleanup
  harness     harness                 team lead: retros, evals, library, cloud env, packages
  on demand, any role:
  investigate understand              answer from evidence, change nothing
  records     docs-workspace          where documents and prose go; writing nests here
  ```
- A specialist or skill returns its result to the team lead; continue the
  broader request, preserving explicit advice-only, review-only and handoff
  boundaries.
- Shared library changes go through harness's library method, and project consolidation
  through orchestrate-work's repository adoption guide. Shared skills own
  reusable methods; a local skill needs a genuinely distinct procedure.
- Proactively flag harness friction with its cause, practical cost and proposed
  repair, and use harness to fix it within existing authority; shared
  changes return to the harness owner. At a verified completion checkpoint,
  invoke it unprompted only when reasoning not recoverable from code, tests or
  docs would otherwise be lost and that loss would plausibly cause recurrence,
  material risk or substantial rediscovery. If the skill is unavailable, report
  the uncaptured finding and continue unaffected work.

## 06 Verification

- Every meaningful change ends with validate-implementation selecting the
  checks for the result I will use; tester runs them. A passing build or review
  is not proof of visual or interaction quality: anything a user sees goes
  through design and browser-verification in the running app, or the artifact's
  rendering workflow. Read the verification authority named by the repository's
  AGENTS.md; new projects use `docs/VERIFICATION.md`.
- Every delivery candidate gets independent code-review: fast_review for a
  bounded, straightforward candidate; reviewer for broader or deeper judgment
  and any specialist scope. The skill owns how much review a change needs and
  which evidence is reused; adjudicate its findings against the requirement and
  actual behaviour before repairing.
- Gates scale with feature maturity: until I declare a feature
  production-ready it gets only the checks a trustworthy result needs. Review
  findings, cloud review included, are advice: fix what the change promises and
  any reachable security, privacy or data-loss defect; decline other proposed
  validation or hardening. Keep a check only if it makes the code better and
  easier for agents to change.
- Before finishing, compare the result with the request and later corrections
  and complete obvious missing steps within authorized scope. Say what was not
  verified and why; a blocked step is reported as unfinished, with what
  prevents it.
- Prefer the visible Codex browser for interactive checks and the project's
  runner for automated tests.

## 07 Testing

Follow the project's coding standards for test quality. Use `tdd` for new or
replacement coverage and `validate-implementation` for checks and reproducible
evidence. When tests fail, follow [code-review's testing reference](skills/code-review/references/testing.md) before changing
them. Do not repeatedly patch or rerun fragile tests to make them pass.

## 08 My environment and project guidance

- Resolve the actual project and its document/storage routes before writing;
  a drive or home folder is not a task workspace. Section 01 names where my
  projects and personal tools live.
- Code intelligence: use orchestrate-work's code-intelligence reference for
  tracing, impact, the codebase-memory-mcp wrapper and index freshness; a
  project guide records only its exceptions.
- Dev servers use the project's existing launcher, including its Portless route
  where configured; validate-implementation's development-runtime reference
  covers reuse, checkout/URL identity, logs and lifecycle. A code index is not
  the dev-server runner.
- Database access and changes: use database-workflow and project execution
  guidance. All agents may use its read-only route; protected production
  execution stays with the team lead under existing authorization.
- Workspace and scratch: use docs-workspace to find where notes, plans, state,
  evidence and scratch go; read the workspace's AGENTS.md before writing. Keep
  task state out of code commits and release disposable scratch at closeout.
  At verified delivery, handover, supersession, a material status change or a
  durable discovery, the lead or named record writer reconciles affected existing
  records through docs-workspace's tracking-reconciliation reference. Keep
  evidence and remaining acceptance with an owner. Intermediate calls, unchanged
  or already-recorded outcomes, and self-contained work with no relevant record
  or durable finding need no write, skill read or skip note for upkeep.
- Third-party model routing: use codex-router when provider or tool behaviour
  needs investigation. Every Codex request goes through that router, so a
  Codex session never leaves it stopped or disabled between turns.
- GitHub CLI: a sandbox's "invalid token" alone does not prove revoked
  credentials: check the active execution identity and permission mode before
  diagnosing login, and use a supported host-execution request only where that
  runtime permits one and the sandbox account boundary actually applies. With
  approvals disabled, report a remaining access failure instead of requesting
  escalation. Never copy tokens into files or environment variables to cross
  the boundary.
- Repository AGENTS.md is the next level of detail for repo-specific tooling,
  commands and constraints; PROJECT.md and subject guides supply further
  context. Shared methods stay at user level; reconcile each repo's coverage
  before removing displaced guidance.

## 09 Process lifecycle and cleanup

- Before starting a server, browser, watcher, emulator or runner, look for a
  suitable existing instance and verify its identity before reuse. Prefer
  commands that exit when finished; use background or watch mode only when needed.
- For long-running processes you start, record the owning session or
  supervisor, PID/start identity, checkout, URL/port, log location and stop
  command in the existing task record or runner output. Stop task-owned resources when
  done unless deliberately handed over with a named owner and stop instructions.
- Stop through the owning runner. Never kill by name pattern or broad sweep;
  target only verified owned PIDs or process trees, and preserve reused services
  and shared Portless proxies while others depend on them.
- On Windows, every junction and symlink is a deletion hazard. Removing the
  link's own entry is safe; a delete that goes through it (`link/`, `link\*`, a
  recursive listing piped to a delete, `robocopy /MIR`) empties the target.
  Check a folder and its ancestors for links before deleting; checkouts go
  through delivery's worktree retirement.
- Stdio MCP servers start with every session and subagent: keep them
  project-scoped or off, never user-global, and prefer remote servers.
- If the machine is slow, inspect process age, CPU, memory and parentage, and
  clean up your own confirmed leftovers before adding processes. Shared storage
  maintenance belongs to keep-codex-fast; worktree retirement to delivery.
