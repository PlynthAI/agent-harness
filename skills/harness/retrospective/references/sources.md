# Sources and adaptations

This method is owned prose written for this harness. It selectively adapts
pinned upstream references; it does not carry either complete package or track
upstream automatically. The Every source was inspected on 20 September 2026.
Matt's `retro` was compared with the current official revision on
27 September 2026 and again on 5 October 2026, after it graduated in 1.3. Required licence terms accompany the installation in the
root [third-party notices](../../../../THIRD_PARTY_NOTICES.md).

## Pinned sources

| Source | Revision | What was taken |
| --- | --- | --- |
| [EveryInc/compound-engineering-plugin, `skills/ce-compound`](https://github.com/EveryInc/compound-engineering-plugin/tree/6be0932b91dc369508da19e6e2bc753b4c038830/skills/ce-compound) | `6be0932b91dc369508da19e6e2bc753b4c038830` | the durable-bar counterfactual, one learning per run, the overlap check, the two-pass grounding split, and the merge-state citation rule |
| [mattpocock/skills, `retro`](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/skills/engineering/retro/SKILL.md) | `24fe0ef7737efae15c87225755e9f6f5965e4888`; package `1.3.1` | Primary-source session inspection; navigation, checks, standards, steering, tool economy and information-access candidate categories; the no-guardrail finding and a deterministic check for a mechanical violation. The earlier port also used citation discipline and one cited Markdown file per investigation. |

Both are MIT licensed: `ce-compound` is Copyright (c) 2025 Every, and
`mattpocock/skills` is Copyright (c) 2026 Matt Pocock. Both notices are retained
in that central file. This is a selected-method port dated
27 September 2026, made for the Codex harness; the original optimiser prose
predates it and its exact first-import date is not recorded here.

## Engine dependency

The [nightly review pilot](nightly-review.md) runs
[microsoft/SkillOpt](https://github.com/microsoft/SkillOpt/tree/79124b37e9a6371e13b753f8bcd7adb1e493ade1)
at commit `79124b37e9a6371e13b753f8bcd7adb1e493ade1` (MIT) as a pinned dependency
installed into the runner's review root. It was inspected on 28 September 2026.
No SkillOpt code or prose is copied into the harness, so it needs no entry in
the notice file unless that changes. The runner refuses an engine at any other
revision; moving the pin means re-reading upstream's config, cycle, gate and
staging behaviour and rerunning the fixtures.

## What was adapted

- **The durable bar** survives as a counterfactual question and stays a judgement.
  Upstream applies it and writes a solution document; here it gates a proposal
  packet, a direct project-standards update, a project finding or a no-lesson
  result.
- **One coherent finding per proposal** keeps grounding and overlap focused.
  A direct session retro may identify several candidates and judge each on its
  own evidence; the recorded-event helper still binds one event to one result.
- **Overlap assessment** keeps upstream's dimensions as things to look at. The
  scores and thresholds do not survive: with both packets in front of them, a
  reviewer decides that better than a number does.
- **Grounding** keeps upstream's split between claims about code behaviour, which
  are verified against the local tree, and claims about merge state, which are
  verified against remote truth with the pull request number first. The
  mechanical script and the semantic validator subagent are replaced by the
  harness's existing review workflow, rather than by a second one.
- **The event contract, the queue, the stable key and the completion record** come
  from this harness's own producer, not from upstream. They now apply only when
  a recorded event is the input; a session retro needs no synthetic event.
- **Session retrospective categories** follow Matt's `retro`. We inspect the
  specified session (default: current), actual commands and project owners.
  Candidates are judged by the durable bar instead of producing a mandatory
  severity list or automatic new rule for every observation. A reproduced
  mechanical violation gets a deterministic check and a repository with no
  guardrail is a finding, as upstream says; an uncertain rule still starts as
  advice.
- **Multi-session reading** is this harness's own opt-in addition: a bounded set
  of sessions the user names, read for one question and ranked by repetition.
- **Coding standards** remain project-owned, as a living agent-maintained lesson
  file. Matt reserves them mostly for reviewer judgement and his `retro` writes a
  separate solution document; here an authorized in-project retrospective updates
  `CODING_STANDARDS.md` directly, adding, refining or removing entries as
  requirements change. This harness also lets an implementer consult relevant
  guidance when it prevents a known mistake, without reading the whole guide for
  every edit. A mechanical rule moves to a check instead of the guide.

## What was refused

- **Session-history crawlers and scratch-run orchestration.** A direct retro
  reads the named session, the current one when none was named, or the bounded
  set the user names for one question. Event mode reads its supplied record.
  Neither scans unrelated sessions or creates a run directory merely to work in.
- **Subagent and command-line wiring.** Neither the retro nor event mode
  dispatches a model, and no stage requires a subagent. Only the opt-in
  [nightly review pilot](nightly-review.md) calls a model, and only for a
  backend the operator chooses. The [document bench](../../doc-bench/METHOD.md) script calls
  none; the operator makes its runs, under their own authorization.
- **Automatic writes into a solutions directory.** A proposal packet is
  reviewable by the authorized team lead or owner. The retro itself grants no
  new permission to apply it; broader authorized work continues through the team lead.
- **Numeric overlap thresholds, capture quotas and compulsory multi-agent
  stages.** Each replaces a judgement the reviewer is better placed to make.
- **Compound rule packs.** Upstream's packs are a larger design decision than this
  job needs, and adopting them is not part of this skill.
- **A check for a mechanical rule nobody has broken.** A deterministic check
  answers a reproduced violation, and an existing linter, type checker or test
  gets first claim. A blanket hook or a check enforcing prose wording would add
  friction without proving behaviour.
- **Forced writing-skill invocation or user approval for the retro.** Load
  relevant writing guidance if useful, and return the evidence-based result
  within the request's scope.
