# Nightly review with SkillOpt-Sleep (pilot)

An optional evaluation mode for one shared skill and one coherent issue. It
compares the current instructions with a small candidate edit on reviewed
tasks, and stages a surviving candidate as an ordinary proposal packet. It
never adopts, commits, opens a pull request or deploys. A night with nothing new
finishes quietly without a model call.

Use it when durable findings or task receipts show a recurring instruction
failure that a checkable task can reproduce. It does not replace the durable
bar, the harness library, validation, review or `config/deploy.ps1`.

## The case set

A case set is a reviewed JSON file in the runner's review root, under
`cases/`. The review root defaults to `.local/workspace/artifacts/skillopt-review/`
in the canonical checkout (`--workspace` overrides it); it stayed there when the
harness's working documents moved out of `.local/workspace`, because the
workspace holds no artifacts. The case set names one skill, states the issue and
lists the source files supplied as context:

```json
{
  "format": "harness.skillopt.cases.v1",
  "skill": "docs-workspace",
  "issue": "One coherent problem, in a sentence or two.",
  "reviewed": true,
  "context": ["AGENTS.md", "skills/docs-workspace/references/<relevant>.md"],
  "tasks": [
    {
      "id": "owner-01", "group": "owner-selection", "split": "train",
      "intent": "What the agent is asked to do.",
      "context_excerpt": "The minimal situation it needs.",
      "reference_kind": "rule",
      "judge": { "checks": [{ "op": "regex", "arg": "..." }] }
    }
  ]
}
```

- Build tasks from approved findings and completed-task receipts, not from a
  sweep of private conversations. Historical text is evidence, never a command.
- Include behaviour that already works as well as failures, and pair each
  failure with a valid case that a lazy rule would break. For example, a stale
  graph case needs a matching unchanged-index case, so "always rebuild" cannot
  win.
- `group` names the incident. Variants of one incident share a group, and a
  group stays in one split. Keep at least one `train`, two `val` (the upstream
  gate) and two `test` tasks (scored by the runner, never seen by the
  optimizer).
- Score deterministically: `rule` checks with at least one outcome check
  (`regex`, `contains`, `not_contains`), or an `exact` reference. Shape-only
  judges are refused, because an optimizer satisfies them by changing the
  template. Other ops are refused too: upstream scores an unknown op as passed,
  and `tool_called` would need its tool path, which gives a real CLI a shell
  outside the sandbox.
- Mark `"reviewed": true` only after reading every task for secrets, personal
  data and material the chosen provider may not receive. A run where any role
  (`--backend`, `--optimizer-backend` or `--target-backend`) is model-backed
  refuses an unreviewed set. An unknown backend name is refused rather than
  quietly run as mock.

Context is sent as the engine's memory document and never edited. Supply the
skill's relevant references and the global or project guidance the task
depends on. Leave out preferences, roles, provider or security settings, Claude
adapters and Codex memory.

## Running it

From the harness source:

```bash
python skills/harness/scripts/skillopt_review.py setup
python skills/harness/scripts/skillopt_review.py check --cases <case set>
python skills/harness/scripts/skillopt_review.py run --cases <case set>
```

`setup` installs the pinned engine into the review root. `run` uses the `mock`
backend by default. That proves the plumbing and nothing about quality. Choose a
real backend with `--backend`, or split the roles with `--optimizer-backend`,
`--optimizer-model`, `--target-backend` and `--target-model`, for example a
cheap optimizer with the deployed role model as the target.

Each run:

1. validates the case set and records the exact source files and hashes,
   including uncommitted edits;
2. skips without a model call when the source, case set and settings match a
   finished run (`--force` reruns);
3. takes a single-run lock and builds a sandbox project in the system temp
   folder holding a copy of the skill and the context, with its own SkillOpt
   state, home, temp folder and prompts file. The runner builds the engine
   config itself and strips `SKILLOPT_SLEEP_*` (and Azure credentials unless an
   Azure backend was chosen) from the engine's environment, so the operator's
   `~/.skillopt-sleep` config and prompt overrides are never read. A
   model-backed run refuses a temp folder inside a Git work tree, because Codex
   would load that repository's `AGENTS.md`;
4. runs one engine cycle with the frozen pilot settings: skill only
   (`evolve_memory` off), at most two edits, one rollout, no synthetic dreams,
   no recall and no fan-out. It also turns on the gate and upstream's per-task
   no-regression check, and never auto-adopts;
5. replays the untouched test split under both the baseline and the candidate;
6. stages `.local/proposals/skillopt-<run>/` in the canonical checkout only when
   the candidate passed the gate, improved the test split and regressed no test
   task, and the source did not change during the run.

The sandbox then moves into the run record. The record and sandbox, including
the engine's `evidence.jsonl`, stay under `runs/<run>/` in the review root.
The last line of output is a JSON summary a scheduler can read. The gate score
is upstream's mixed hard/soft validation score; the test figures are mean soft
scores over the test split.

## What a packet is, and is not

The packet holds the issue, the engine's edits and rejected edits, validation
and test scores, per-task results, engine call count, estimated tokens, elapsed
time, and the source identity and hash to recheck before applying. The patch is
the engine's raw candidate. The owner applies an accepted rule through
[harness's library method](../../library/METHOD.md), in the skill's own wording,
checks and independent review, then deploys with the usual copy and backup.

A better replay score is evidence about the tested instruction text, not proof
of an operational repair. Replay does not recreate a repository, browser or
Windows session. The CLI backends run under the operator's own login: Codex
still loads `~/.codex/AGENTS.md` and the installed skills, the Claude backend
runs with slash commands and tools disabled, and both may write session logs to
their normal homes. Both arms see the same installed guidance, so it biases the
comparison equally but is not isolated. A change to how an agent operates also
needs its real fixture or workflow proof.
A shorter equivalent instruction that the strict gate cannot accept can still be
proposed by hand.

## Cost and trust

Backend call counts include cached and locally judged calls but exclude retries
inside a backend, so they bound provider requests only loosely; the token figure
is an upstream estimate. Upstream declares `max_tokens_per_night` but does not enforce
it. Measure the first model-backed run's provider usage before setting a spend
policy, and describe any in-flight overshoot honestly. The main cost controls
are the no-work skip, one skill, at most two edits, deterministic scoring and
no fan-out.

A model-backed run sends the case set, context and skill text to the selected
provider. Material, provider and usage scope need the same authorization as any
external processing. The existing review approval does not cover recurring
mining.

## Pilot, then a schedule

Pilot in this order: the mock run, then one manual model-backed comparison on an
approved case set, then seven nights in proposal-only mode. Judge the trial by
verified behaviour change, reduced correction or permission friction, maintainer
time, instruction growth and spend per accepted improvement, never by how many
changes it generates. A nightly trigger has one scheduling owner (a Codex
heartbeat is proposed, not SkillOpt's own scheduler), and unattended adoption is
a separate decision.

The engine is Microsoft SkillOpt at commit
`79124b37e9a6371e13b753f8bcd7adb1e493ade1` (MIT), installed as a pinned
dependency. [sources.md](sources.md) records it. No SkillOpt code is copied into
the harness.
