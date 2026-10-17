# Unattended work with automatic approval

Use this reference to investigate approval interruptions in Codex or Claude Code
and qualify a small, evidence-backed exception when automatic review is selected.
The operator chooses the active chat's mode; user configuration supplies defaults.
Agents must not change settings to unblock themselves. A high
approval percentage is not a target for weakening controls: measure completion
of legitimate work and retention of protective denials separately.

This is a retrospective method, not an automatic permission editor. Use existing
task authority through [workflow authorization](../../../orchestrate-work/references/authorization.md).
A denial never authorizes the executing agent to edit its own policy, add an
allow rule, switch runtimes or have another agent perform the denied action.
An authorized maintenance task can prepare and apply a reviewed configuration
change through the supported product route, subject to managed restrictions.

## 1. Establish what actually stopped

Record the client/version, model/provider, host, shell, task and child identities,
effective permission mode, config layers and applicable managed restrictions.
Inspect launch flags and app/session settings as well as config files. Saved
defaults are not evidence of a running session's mode. Do not print credentials.

Qualify fresh, cold-resumed and already-loaded conversations separately. A
successful `config/read` or changed layer hash proves disk loading, not the
reviewer's captured policy. Check that the client's refresh path updates the
specific materialized reviewer fields before relying on hot reload. A resume
request can reuse a loaded session and ignore overrides; a new turn alone does
not prove reconstruction. Use a retained harmless conversation for a cold-resume
test, keep its thread ID and require an actual automatic-review outcome. Report
any remaining loaded-session gap without interrupting unrelated active teams.

| Observed stop | Response |
|---|---|
| The agent asks for authority already present | Carry the actual user scope and supporting evidence into the assignment and approval request. No permission rule is needed. |
| A sandbox boundary needs approval | Use the active route's supported approval mechanism. Automatic review applies only when selected; under `never`, report the blocked step without requesting escalation. Distinguish this from an explicit review denial. |
| The reviewer denies the action | Retain the rationale and establish whether it is a correct denial, missing evidence or a false block. Continue only unaffected work or a materially safer alternative. |
| A rule, hook, managed policy, OS consent or connector blocks it | Identify that owner. A classifier exception cannot override a different layer. |
| Authentication, network/service failure, reviewer timeout or circuit breaker | Diagnose the actual failure. Do not label it a false-positive security decision or broaden permissions to repair it. |

Automatic review is not guaranteed protection against deleting a production
database. Some actions never reach it, and classifiers can be wrong. Keep
production credentials, database roles and execution guards narrow independently
of reviewer instructions. Existing project database execution procedures remain
the owner of production actions.

## 2. Mine a bounded set of incidents

Use the current session or a user-authorized set of repositories, dates and
sessions, following [the retrospective](session-evidence.md). Do not crawl every
project or upload transcripts to another service. Start with the existing
session selector and redacting digest, not a new collector:

```text
node skills/harness/scripts/session-digest.mjs list --cwd <repo> --runtime all --since <YYYY-MM-DD> --last <N>
node skills/harness/scripts/session-digest.mjs digest --cwd <repo> --runtime all --since <YYYY-MM-DD> --last <N> --out <resolved-scratch>
```

These are factory-source paths; when installed, resolve the helper relative to
this skill. Use `--worktrees` or explicit `--cwd` values when needed. Codex's
default source is `~/.codex/sessions`; Claude's is `~/.claude/projects`. Archived
or differently configured logs need an explicit source. Digests locate evidence;
they are not a complete approval audit and may omit the decisive tool event.
Read a bounded section of the original JSONL around each candidate, pairing the
tool request and result by their recorded IDs. Verify the actual log schema
before filtering; quoted instructions containing "denied" are not incidents.

For each incident retain a small redacted record in the existing proposal or
project evidence route:

- Session/time and source event pointer; exact command/tool arguments, cwd and
  intended effects; resolved paths, account/environment and destination.
- The supporting user authorization, information sent outside the machine and
  established provider/usage scope, when relevant.
- The layer that stopped it, exact rationale and what context the reviewer had.
- Outcome: correct denial, confirmed false block, agent-created pause, runtime
  failure or unresolved. Include recovery and human-wait time when observable.

Group by cause and effect, not merely command spelling. Rank by blocked sessions,
lost work and wait time. Report unknowns and denominators: reviewed requests,
confirmed false blocks among reviewed requests, and unattended completions among
attempted runs. Bypass-mode logs can identify workflow demand but cannot establish
the auto reviewer's false-block rate. Do not infer a local "remaining 4.9%" from
a vendor chart or treat missing events as approvals.

## 3. Choose the smallest effective repair

Prefer making existing authority visible first. The reviewer may see a compact
transcript rather than the agent's private reasoning. Name what runs, the exact
target and environment, what data leaves, the destination, and the relevant user
scope. Read-only evidence can resolve ambiguity; repeating the same denied
action with different wording cannot.

| Candidate repair | When it earns its place |
|---|---|
| Better assignment or request context | The action is authorized, but the reviewer did not receive verifiable scope or effects. |
| Narrow sandbox path/network access | A routine safe resource is unnecessarily outside the boundary. Check all capabilities this grants, not just the incident command. |
| Classifier environment or policy context | Recurring legitimate work needs a documented trust/authorization fact while retaining action review. |
| Exact command or tool allowance | The whole matching capability is acceptable without per-action classifier review, and the product actually honors the rule. |
| Preserve the block | Authority, effects or safety remain unresolved, or the denial protects an intended boundary. |

A proposed allowance states the observed failure, permitted effect, precise
scope, source of authority, exclusions, config owner and removal condition.
Inspect trailing arguments, shell expansion, compound commands, executable lookup,
redirects, hooks, plugins and scripts invoked by the command. An allowed test
runner can execute repository code; a prefix is not an exact-command restriction.
Never blanket-allow a shell, interpreter, database CLI, arbitrary HTTP client or
mutable wrapper merely to make its current invocation pass. If the rule language
cannot express the required boundary, keep review and use a genuinely constrained
existing tool or runner. A wrapper that conceals the same denied effect is not a
repair.

Keep project destinations and commands in that project's existing operations or
configuration owner. This shared reference owns the method, not a global list of
trusted projects. A recurring problem is evidence for investigation, not automatic
promotion onto an allowlist.

## 4. Use each product's actual controls

Codex contracts below were checked against official documentation on
14 October 2026; the Claude entries retain their 7 October checkpoint. Recheck
support and effective behavior on the target client before deployment; source
examples do not prove desktop, CLI or child-session behavior.

### Codex

The supported combination for eligible automatic reviews is:

```toml
approval_policy = "on-request"
approvals_reviewer = "auto_review"
sandbox_mode = "workspace-write"
```

An eligible granular policy is another option. Clients using permission profiles
can use `default_permissions = ":workspace"` instead of `sandbox_mode`; never
combine the two. `never` supplies no approval request to review; Full access or
`--yolo` can remove the boundary that would trigger it. Review does not inspect
every in-sandbox action. [Auto-review](https://learn.chatgpt.com/docs/sandboxing/auto-review)
describes the trigger, context, denial behavior and limitations.

Choose among these distinct controls:

- `auto_review.extra_policy` adds local Markdown context alongside the main
  policy; managed `guardian_extra_policy` takes precedence. Prefer a narrow
  factual addition when supported, retaining the default policy. `auto_review.policy`
  replaces the current policy; do not substitute a short allowlist for it.
  [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference#configtoml)
  defines these keys. Neither is a deterministic command allowlist.
- `prefix_rule(..., decision = "allow")` can execute matching commands outside
  the sandbox without review. `prompt` sends eligible requests to the reviewer;
  `forbidden` blocks them. The strictest matching rule wins. Some managed/model
  requirements ignore allow prefixes. Inspect applicable requirements before
  promising an exception will work.
- App tools have separate per-app/per-tool approval settings and reviewer
  inheritance. Native Computer Use app consent can still require the user.
  Do not infer shell-rule coverage for MCP, apps, browser or OS consent.

#### Maintaining standing approval context

When the operator flags approval friction, retain the actual request, decision
and existing authority in the incident record, then classify the cause above.
For a confirmed missing authorization fact in recurring legitimate work, propose
a narrow `auto_review.extra_policy` addition through reviewed configuration
maintenance. Name the permitted operation, material, destination, purpose, usage
scope and exclusions, with its human authorization source. Add context alongside
the main policy; do not automatically promote every denial onto an allowlist.
This is a supported maintenance route, not a release of a previously denied action.
Verify loaded policy and an authorized future workflow before claiming repair.

The Harness maintains general operations and native OCR processing as two source
components, assembled into one user-level `auto_review.extra_policy` value.
Maintain this shared context once; repositories supply their own targets and
execution procedures without policy copies. Requested coordination includes
run-related follow-ups, callbacks, dependency messages and replacements, while
native direct-human authority requirements remain effective.

For native OCR, state the approved verified OpenAI/ChatGPT subscription
destination and scoped source/docs/diffs/tests/review context directly, including
relevant registered external workspace docs. Inspect the actual inputs and
effective route; loopback alone is not proof. Preserve secret-value, customer-data,
unrelated-transcript, provider and billing exclusions. Workspace trust governs
project configuration loading; filesystem permissions govern path access.
Neither supplies outbound processing consent or releases a denied action.

OpenAI's [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference#configtoml)
defines `extra_policy` as additional Markdown alongside the main policy. Its
[policy-writing guidance](https://learn.chatgpt.com/docs/sandboxing/auto-review#configuration)
mainly covers replacement `policy`, which requires preserving the complete
current policy. There is no separate official `extra_policy` writing recipe
established by those pages. The scope fields above are the harness's method.

Test proposed command rules without executing their payload using
`codex execpolicy check --pretty --rules <candidate.rules> -- <command>`, plus
inline `match`/`not_match` cases. Load all relevant rule files for precedence
checks. A matcher result alone does not prove that the effective runtime permits
execution. [Rules](https://learn.chatgpt.com/docs/agent-configuration/rules)
documents prefix semantics and shell-wrapper handling; verify the actual Windows
shell rather than assuming Bash parsing applies to PowerShell.

The documented TUI `/approve` action is a human override for one denied action's
retry, which still undergoes review. An agent must not synthesize that override.
The current documented breaker interrupts after three consecutive denials or ten
within the last fifty reviews in one turn. Do not loop until it trips. These are
versioned product facts, not thresholds the harness should try to evade.

### Claude Code

For headless execution, select `claude -p "<task>" --permission-mode auto`
explicitly. `permissions.defaultMode: "auto"` is a user/managed setting, not a
project/local setting. Availability depends on client, model/provider and managed
settings. Native Windows support must be checked separately. Do not use
`bypassPermissions` or `--dangerously-skip-permissions` as a fallback.
[Permission modes](https://code.claude.com/docs/en/permission-modes)
also documents headless versus interactive defaults and denial behavior.

The [auto mode configuration](https://code.claude.com/docs/en/auto-mode-config)
controls serve different purposes:

- `autoMode.environment` supplies infrastructure context. `autoMode.allow`
  contains natural-language exceptions inside the classifier; it can override
  `soft_deny`, never `hard_deny`. Preserve `"$defaults"` in customized arrays or
  that section's built-in list is replaced.
- `autoMode` loads from user or managed settings and explicit `--settings`/SDK
  settings, not project/local `.claude` settings. Loaded `CLAUDE.md` can also
  supply context, without becoming an enforced security boundary.
- Narrow `permissions.allow` shell rules normally resolve before the classifier.
  `autoMode.classifyAllShell: true` suspends shell allow rules in auto mode so
  shell commands reach review. Decide deliberately which behavior is wanted;
  do not combine it with an assumption that shell allowances will skip review.
- On supported versions, inspect `claude auto-mode defaults` and
  `claude auto-mode config`; `critique` supplies advisory feedback. Treat
  `/auto-mode-setup` suggestions as candidates needing scope and negative-case
  review, not automatic approval to install them.

Native permission rules follow deny, ask, then allow precedence. An explicit
`permissions.ask` can still require a person in auto mode; an allow cannot
override it. Shell patterns do not enforce filesystem or network boundaries.
[Permissions](https://code.claude.com/docs/en/permissions)
explains this layer. Review prompts from hooks separately.

Native [subagents](https://code.claude.com/docs/en/sub-agents) inherit an auto
parent's mode; subagent frontmatter cannot override it. Background execution
does not remove approval requirements. Separate sessions and cross-runtime
forwarders still need their own effective-mode verification.

For targeted incident collection, the documented `PermissionDenied`
[hook](https://code.claude.com/docs/en/hooks) includes tool input, reason and
transcript pointers, including no-verdict failures. It omits manual denials,
permission-rule denials and `PreToolUse` blocks. Installing collection hooks is
a separate scoped change; never use a retry hook to reverse a denial.

Current documented classifier thresholds are three consecutive or twenty total
blocks. Interactive sessions can fall back to prompting; headless `-p` without
`--permission-prompt-tool` denies the action and continues. Repeated no-verdict
responses can stop the turn. Verify behavior for the installed version instead
of assuming all unavailable-reviewer cases behave alike.

### Browser developer-access prompts

Treat full-CDP browser consent as its own capability, not automatically as a
false classifier denial. Start ordinary UI verification with the built-in
Browser's documented interaction, DOM, screenshot and console APIs. For
unattended repeatable checks, use the project's existing Playwright runner with
its own disposable browser, test identity and evidence collection. Do not request
optional full CDP before finding out whether those routes satisfy the claim.
[Browser verification](../../../browser-verification/references/unattended.md)
owns this selection and the distinction between a separate authorized test
context and rerouting a denied action.

## 5. Qualify the exception before unattended use

Freeze a small set of real legitimate incidents and adverse near-neighbors before
changing a rule. Include the same command aimed at production, an unapproved
destination, a sibling path or Windows junction target, unexpected trailing
arguments, compound shell execution and an altered executable/script where
relevant. Use inert fixtures, rule matchers and disposable local resources for
negative cases, never destructive production probes or real secret exports.

Compare baseline and candidate on the same cases. Require the intended work to
proceed without a human and the protected cases to remain blocked. Record which
layer supplied each decision. A reviewer is probabilistic: retain repeated-run
results and uncertainty where classifier behavior is involved, instead of calling
one pass a guarantee. Check the actual unattended launcher, child inheritance,
separate chats, resume path and sensitive connector tools used by the workload.

Use [harness's library method](../../library/METHOD.md) for shared source changes and the
owning setup procedure for authorized live configuration. Preserve unrelated
settings, record the before/after bytes and backup, review the bounded delta,
and verify fresh-session effective settings. Remove the exception or restore its
backup if a negative case passes, scope changes or the workflow is retired.
The executing agent must not widen the exception in response to another denial.

## 6. Keep coordination moving when a dependency is blocked

The coordinator carries authorized effects, destinations and limits into every
assignment, and verifies the chosen transport supports the selected mode.
Native children, separate chats and cross-runtime forwarders can have different
settings. A route requiring a human click, first-time consent or a launch mode
that disables approvals cannot prove automatic-review acceptance. A deliberately
bounded no-prompt transport can remain a valid route for its authorized scope.

On a genuine block, checkpoint the smallest affected operation in the existing
team/task record: its dependency, rationale, evidence and exact remaining action.
Continue independent tickets, local verification or a materially safer task.
Never retry the blocked effect through a sibling or a new session. Reconcile
effects before any permitted retry, so a partial mutation is not duplicated.
If all remaining work depends on the blocked operation, stop honestly and leave
one actionable blocker for the operator. Do not mark it Done or keep polling for
consent. Auto approval reduces unnecessary stops; it cannot promise completion
through every enforced boundary while the user is asleep.

Success is a measured reduction in legitimate unattended failures with protective
denials retained. Record source checks, deployed settings and live-run evidence
separately. Published approval rates, free-tier claims and a green source review
are not evidence of this installation's cost, entitlement or completion rate.
