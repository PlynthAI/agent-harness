# Native mode

Native mode is OCR driving its own provider: OCR selects files, resolves rules,
prompts its own model, positions comments and post-filters. It is the independent
engine of round 1 in [candidate review](../push-review.md#two-rounds-before-push):
before every push, with or without a pull request, it reviews the same pinned
commit as the reviewer, in parallel, through
[`native-slot.mjs --commit`](../review-assignments.md#native-ocr-in-round-1).
Round 2 does not rerun it.

Run it from a terminal or CI, or when the user explicitly asks for it. From a
Codex Desktop session, project guidance may forbid a nested model CLI; delegation
mode is the compatible choice there.

Commands checked against the installed `ocr` v1.12.11+sol-streaming on
2026-10-04. Read [observability](observability.md) to inspect a session, open the
viewer, verify telemetry or recover those services.

## Commands

```bash
ocr review                                  # staged, unstaged and untracked changes
ocr review --from main --to feature-branch  # merge-base range
ocr review --commit abc123                  # one commit against its parent
ocr review --preview                        # which files would be reviewed, no model call
ocr scan --path internal/agent              # whole files, no diff needed
ocr session list                            # saved sessions
ocr review --from main --to feature-branch --resume <session-id>
```

Flags worth knowing:

| Flag | Effect |
|---|---|
| `--audience agent` | Suppress progress UI; emit only the final summary. Always use this for agent consumption. |
| `--output <path>` | Write the full result to a file. Requires v1.10.0 or later; read the file in full rather than piping through `tail` or `head`. |
| `--format text\|json\|sarif` | `json` for machine-readable findings, `sarif` for code scanning. |
| `--background`, `--background-file` | Requirement context; the file variant takes precedence. |
| `--exclude <patterns>` | Extra gitignore-style excludes, merged with rule excludes. |
| `--max-tokens`, `--max-tokens-budget` | Prompt/input ceiling per group, and a soft aggregate input/output stop threshold. Final submission rounds and in-flight work can exceed the aggregate threshold; inspect actual usage and manifest coverage. |
| `--no-filter` | Keep all comments and skip the model post-filtering call. |
| `--timeout <minutes>`, `--concurrency <n>` | Per-group timeout (`0` disables it) and parallel semantic groups (default `8`). Tool calls are dispatched sequentially within each group. Lower concurrency if rate limited. |
| `--provider`, `--model` | Override the configured provider or model for one run. |

OCR 1.12.9 cannot guarantee a hard aggregate token ceiling with these flags.
Use any token allowance the operator established; do not invent a cap that
prevents the requested review. When a strict ceiling is required, report this
tool limitation before running. When no token ceiling is required, omit
`--max-tokens-budget` or pass `0` (OCR's documented unlimited value), and retain
the applicable time/concurrency bounds. A budget
failure is incomplete coverage, not evidence of an API-key or provider failure.
See the [1.12.9 CLI contract](https://github.com/alibaba/open-code-review/blob/v1.12.9/pages/src/content/docs/en/cli-reference.md).

## Local CLI access

OCR saves a session under `~/.opencodereview/sessions/` even when `--output`
points into the project workspace. If this tool has had a session-write failure,
verify that directory is writable in the effective execution environment before
spending provider tokens. Use a scoped writable root or supported permission
request; changing the output path alone does not fix it. Keep provider config
and credentials outside that write grant. A final session-save error remains an
incomplete tool run even when analysis reports zero findings.

Treat TLS trust, SSH trust-file access and a crashed Git helper as separate
failures. Use supported scoped access or approved host execution for sandbox
limitations. Never disable certificate or SSH host verification. For a confirmed
Codex CA-loading problem, its documented `CODEX_CA_CERTIFICATE` option can select
an existing verified PEM bundle for that process; do not import an unknown root
or change trust merely because a tool failed. See the [official CA guidance](https://learn.chatgpt.com/docs/auth#custom-ca-bundles).

## External review authorization

When native OCR is part of an authorized delivery task and its configured
destination/material/usage scope is authorized, it needs no separate review or
export consent. Carry the original human authorization pointer and exclusions
through the existing review assignment and recovery record, by
[workflow authorization](../../../orchestrate-work/references/authorization.md#native-ocr-within-authorized-delivery).
Candidate hashes, file lists and PRs bind coverage, not consent lifetime. Check
the current scope and existing runs before launch; added relevant files, rebases,
delegation and resume do not themselves create another permission gate. Keep
resource scheduling separate, and preserve actual provider/billing/sensitive-data
boundaries. Do not send unrelated transcripts as proof of authority.

Before requesting native execution, resolve the actual provider, endpoint and
model from the effective configuration and any invocation overrides. Inspect only
the needed fields; never print tokens, API keys or credential-loader output.
`protocol=openai` describes the wire format, not the provider or destination.

Check the host's recorded destination requirement before supplying `--provider`
or `--model` and before asking for any approval; the harness setup guide's
native OCR section holds it. A saved provider entry or an available credential
for another destination is not a route to offer the user as an approval choice.
When the recorded route is unavailable, report the coverage gap.

In the tool justification, name that destination and model, the pinned candidate
and repository, and the material the review may send: candidate diffs and source
snippets, resolved rules, and supplied background content (including any context
file). State the applicable time/concurrency bounds and the operator's token
allowance, including when no token ceiling is required. Describe the inspected inputs
without claiming an exact outbound payload unless it has been verified.
The adapter's `--scope` input reconciles local coverage; it does not constrain
transmitted content.

Treat this as a scope match, not a new approval for every candidate. Check the
current user instruction, relevant prior approval, handoff and project guide for
evidence of the user's authorization covering the material, destination, purpose
and applicable usage bounds. Carry that evidence into the request when it matches; do not ask
again because the candidate, repository or task changed within the approved
scope. If no matching authority is found, do not export the material. Complete
the local independent review and state native OCR's coverage gap; raise only the
missing scope if native review is needed for this task or a required project gate.
A general request to review code or repair this guidance does not establish
permission to export it to a particular external destination.

Respect an automatic approval denial: record the reason and affected coverage,
and continue the local independent review when slot 02 is unavailable. Do not
retry through another command, provider or agent, or relax permission settings
to bypass the denial. An unavailable external slot is a coverage limit, not a pass.
Report recurring authorization-context failures to the authorized harness owner;
do not ask the user to reapprove an ordinary candidate change. An unresolved
platform denial stays an explicit coverage gap until supported resolution.

## Slot 02 adapter

`scripts/native-slot.mjs` is the factory binding for slot 02. It invokes the
installed CLI on one pinned candidate, keeps the raw output beside the record,
and reports an outcome read from the run manifest.

```powershell
node skills/code-review/scripts/native-slot.mjs --out <dir> --commit <full-hash> `
  --context-file <review-facts.md> --repo <path> --scope <delegate-preview.json>
```

- `--context-file` takes the candidate's
  [review facts](../review-assignments.md#the-review-facts), the same file
  the independent reviewer receives, and forwards it as OCR's `--background-file`. `--context`
  passes a short inline background instead.

- The candidate must be a full immutable commit hash. Resolve a branch or tag
  first: the adapter refuses a ref it cannot bind, before anything is spawned,
  so a run can always be matched against the hash it actually reviewed.
- A range is pinned to the **diff base the run actually used**. `--from` is that
  base, which for divergent branches is the range's merge base rather than the
  branch endpoint: resolve it first (`ocr delegate preview --format json` reports
  `merge_base`, or use `git merge-base <from> <to>`) and pass that hash as
  `--from`. A manifest whose `resolved_base` differs from `--from` is reported as
  a candidate mismatch naming both, so the requested endpoint is never silently
  equated with the diff base.
- Every value is one element of an argument array and nothing goes through a
  shell. Optional `--provider <id>` and `--model <id>` forward only the caller's
  explicit per-run choices, unchanged and independently optional. Each must be
  a string that remains nonempty after OCR's Go whitespace trimming; invalid
  values are refused before spawning. When omitted,
  the installed OCR profile supplies the provider and model. The adapter has no
  provider/model defaults and never overrides effort or changes that profile.
  Requested bindings appear in `requested.provider` and `requested.model`;
  actual bindings come from `manifest.execution` and appear in `ocr.provider`
  and `ocr.model`. Comparison uses OCR's resolved identity: trim surrounding
  whitespace from provider/model overrides, then remove only a model's final
  `[digitsm]` token suffix (the exact pattern `\[\d+m\]$`). Original arguments and
  requested strings remain unchanged; slashes, hyphens and other punctuation
  stay part of the identity. A supplied binding that is missing or differs from
  this resolved identity in the manifest produces `error`, even with full coverage
  and exit zero. Summary metadata does not establish execution identity. See the
  [resolver trim](https://github.com/alibaba/open-code-review/blob/bccbc15f/internal/llm/resolver.go#L96)
  and [model suffix contract](https://github.com/alibaba/open-code-review/blob/bccbc15f/internal/llm/resolver.go#L753).
- On Windows the npm global install exposes `ocr.cmd`/`ocr.ps1` shims, which
  cannot be spawned without a shell. The adapter resolves the platform package's
  native binary, or the package's Node launcher, the same way the shim does, and
  spawns it directly. `--ocr <command>` overrides that resolution.
- `--timeout`, `--max-tokens-budget`, `--concurrency` and `--deadline` are
  validated before anything is spawned: `--timeout` takes nonnegative minutes
  (`0` disables the native group timeout), `--deadline` takes positive minutes,
  and `--concurrency` takes a positive whole number,
  and `--max-tokens-budget` takes a nonnegative whole number. Omission leaves
  OCR's unlimited budget default; explicit `0` forwards that unlimited value.
  Empty or whitespace-only CLI timeout and budget values are usage errors, never implicit zero.
  Omitting `--timeout` keeps OCR's configured default; disabling the native timeout
  does not disable an explicitly supplied adapter `--deadline`.
  A malformed value is a usage error (exit 2) instead of
  a silently dropped bound, and the record echoes what was requested, including
  `requested.deadline_minutes`. Passing `--ocr ocr` names the default command
  and resolves like the default; any other value must name something spawnable
  without a shell.
- `--out <dir>` receives one run's evidence: the JSON result, stdout, stderr, a
  per-run record and the latest `slot-02.json`. Runs never share result paths, so
  a reused directory cannot feed an earlier result into a new classification.
  `raw.result` is `null` when the CLI wrote no result file, so a consumer never
  resolves a path that does not exist.

Outcome vocabulary, and how to read it:

| Outcome | Meaning |
| --- | --- |
| `complete` | terminal state `complete`, every selected item covered, candidate and any explicit execution bindings match |
| `partial` | some selected items failed, were waived, or are otherwise unreviewed; exit zero and zero findings do not change this |
| `failed` | every selected item failed |
| `empty-coverage` | no items were selected, so no review ran even when the CLI reports `complete` |
| `skipped` | the caller stated a skip, the run reported terminal state `skipped`, or every selected item was waived |
| `candidate-mismatch` | the run resolved a different candidate than the one requested |
| `error` | execution failed, exit contradicts completion, or an explicit provider/model binding is missing or differs; raw evidence and coverage remain visible |
| `timeout`, `malformed`, `missing-cli` | the run produced no trusted completed review; the raw output is kept for the record |

Two rules keep the outcome honest. First, only `completed` and `reused` items
count as reviewed: a waived item is a decision not to review, so it stays visible
in `coverage.waived_items` but never completes a slot, and a scope with any waiver
is reported as a coverage limit rather than a full review. Second, candidate
identity is bound to `manifest.input.resolved_head`, which is the only proof that
a ref was resolved; an echo in `requested_head` is recorded separately as
`candidate.requested_echo` with `candidate.evidence` naming what is missing, and
it never establishes a match.

Coverage comes from `manifest.coverage`, never from `summary.files_reviewed`: the
captured runs count selected items in the summary, including the ones the
manifest records as failed. The record carries the candidate it resolved, the
coverage counts, the failed and waived items, and the paths of the raw files. It
is written to `slot-02.json` in the run directory and printed to stdout; the
process exit code mirrors `complete` (0 completed, 1 any other classified
outcome, 2 a usage error) and is never derived from OCR's exit code.

The installed v1.12.11+sol-streaming platform binary's `--version` and
`review --help` were checked on 2026-10-04 without a shell. Its help confirms
`--audience`, `--format`, `--output`, `--commit`, `--from`, `--to`,
`--background`, `--background-file`, `--timeout`, `--max-tokens-budget` and
`--concurrency`.

## Findings shape

Each comment carries `path`, `content`, `start_line`, `end_line`, `category`
(`bug`, `security`, `performance`, `maintainability`, `test`, `style`,
`documentation`, `other`), `severity` (`critical`, `high`, `medium`, `low`),
and optionally `suggestion_code`, `existing_code` and `thinking`.

When `start_line` and `end_line` are both `0`, positioning failed. Locate the
code from the comment text before acting on it; a `0/0` comment is not evidence
that the line does not exist.

Map severity to the house vocabulary before reporting: `critical`/`high` →
blocker, `medium` → should, `low` → nit.

## Configuration and provenance

These OCR adapter assets originated in the former `open-code-review` skill.
The manifest contract and fixtures retain their recorded version provenance.
Check `ocr --version` and installed help when flags differ. The CLI is the npm
package `@alibaba-group/open-code-review`; do not install or change provider
configuration merely because review cannot run.

Provider/model defaults and effort belong to operator configuration, not this skill.
After a provider, profile or router change, prove the route once on a small
commit before relying on it: the manifest names the provider, the model and
complete coverage.
Explicit per-run provider/model choices belong to the caller and do not edit the
saved profile. Resolve the effective saved profile and invocation together:
environment variables alone do not prove the destination when saved configuration
takes precedence. In OCR 1.12.9, `OCR_CONFIG_PATH` does not redirect the review
configuration. Do not use it as a substitute for an explicit per-run binding.
Read the installed `~/.opencodereview/config.json` only as needed without exposing
credentials. `ocr llm test` checks native connectivity; delegation needs no LLM.
Preserve the existing provider, model, effort and telemetry settings.

Native mode spends provider tokens. Set appropriate timeout and concurrency
bounds; add a token budget only when the operator set one. Report partial
coverage honestly, and report the slot record's token usage (input, output,
cache read) alongside coverage so token spend is visible per review.
`OCR_NO_UPDATE=1` prevents the npm wrapper's background update when a run must
stay on the installed version. Do not lower effort or change models silently.

For authorized provider setup, consult the installed `ocr config` help. Keep
secrets out of files and prompts. Custom providers using `api_key_cmd` require a
successful command returning a single nonempty line; on Windows, `echo %VAR%`
can return the literal placeholder when unset. An environment-reading PowerShell
command avoids treating that placeholder as a credential.
