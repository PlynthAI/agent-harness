---
name: retrospective
description: Improve the working environment after a session, a bounded set of sessions or a recorded learning event. The broad sweep across the harness; hands skill, tool and validation findings to their own methods.
---

# Retrospective

A retrospective examines the specified session, a bounded set of sessions the
user names for one question, or one recorded learning event.
It returns a reviewable proposal, writes an authorized in-project lesson into the
project's own living standards file, records a project-owned finding, or reports
an honest no-lesson result. A finished task is not itself a lesson.
Routine record upkeep follows [tracking reconciliation](../../docs-workspace/references/tracking-reconciliation.md)
without invoking a retrospective. Read
[session evidence](references/session-evidence.md) for a session retro;
use the event helper below only when a learning event already exists. To test a
candidate instruction change for one shared skill against reviewed tasks before
proposing it, use the opt-in
[nightly review pilot](references/nightly-review.md). For unattended Codex or
Claude Code work with automatic approval enabled, use
[approval edge cases](references/auto-approval.md) to mine bounded incidents,
qualify narrow exceptions and preserve protective denials.

This is the broad sweep. When its evidence points at one skill, at how tools
are used, or at the review and validation loop, continue in
[skill-refine](../skill-refine/METHOD.md), [tool-eval](../tool-eval/METHOD.md)
or [verify-eval](../verify-eval/METHOD.md) with that evidence rather than
repeating their work here.

## 1. Recorded-event mode, when applicable

For an existing event, the input is its queue directory and stable key. The
producer beside the hooks runtime owns the record; its contract is in
[learning-events.md](../../delivery/references/learning-events.md). The job reads
that record without moving, rewriting or deleting it. An event records a
transition call, not proof of delivery or of a reusable lesson.

Both modes start on purpose. A session retro needs no event, queue, completion
marker, scheduler or extra permission stage. The event helper's identity and
resume rules apply only to recorded-event mode. Neither mode infers authority to
apply a proposed change from a green check. An assessment-only request prepares
advice. When the request already authorizes an in-project retrospective, an
accepted implementation or review lesson is written straight into that project's
own living standards file - normally its `CODING_STANDARDS.md`. A shared-library
or cross-project change instead returns to the team lead, which continues the in-scope work under
[harness's library method](../library/METHOD.md) without seeking the same approval again.

```bash
node scripts/optimiser-job.mjs read     --queue <dir> --key <key>
node scripts/optimiser-job.mjs status   --queue <dir> --packet-root <dir> --key <key>
node scripts/optimiser-job.mjs complete --queue <dir> --packet-root <dir> --key <key> \
    --outcome <proposal|finding|no-lesson> --event-sha256 <digest returned by read> \
    --artifact <path>
```

## 2. Hold the durable bar

Ask the counterfactual before writing anything: if this finding disappeared,
would a future session repeat the mistake or redo substantial investigation? A
lesson is established by one reproduced failure, a real external contract, or an
explicit project decision. Completion, effort, diff size, frequency and existing
code or tests are not evidence of the requirement, and neither is repetition.

One proposal handles one coherent finding; a session may surface several
independent candidates, each judged separately. A no-lesson result is a real
result rather than a failed job. Read [references/job.md](references/job.md) for
the bar, the evidence rules and how each outcome is recorded.

## 3. Keep the output where its owner lives

- A shared or project harness change becomes a packet under the factory source's
  `.local/proposals/<packet-id>/` route when preparing that change. A packet is
  a review artefact and never applies itself. A requested session assessment can
  first report candidates inline without creating a packet for each impression.
- A project-owned implementation or review judgement belongs in that project's
  living `CODING_STANDARDS.md`. When the request authorizes the in-project retro,
  write the accepted lesson there directly - adding, refining or removing an
  entry - rather than opening a proposal packet or seeking another approval.
  Reconcile an existing standards guide in place once; never create a competing
  file. An assessment-only request reports the candidate as advice instead.
- A non-standards project fact belongs to that project: write it through the
  project's own findings route when this invocation covers that write. In event
  mode, a pending write follows [references/job.md](references/job.md) and
  completion waits for the routed artefact. A project fact never becomes a shared
  rule by being written down carefully enough.
- Nothing reusable means saying so. Event mode records no-lesson against its
  stable key; a direct session retro can simply report it.

The packet template, the overlap check and the grounding rules are in
[references/proposal.md](references/proposal.md).

## 4. Ground a rule before it is written

A rule - proposed or written straight into a project's standards - explains the
requirement it protects, the demonstrated failure or contract it answers, and the
legitimate alternatives it still permits. Check those claims against the actual
code and evidence at the revision you name. Cite a pull request or issue for a
merge claim: a bare local commit proves nothing remotely. Reuse the harness's
existing independent review rather than adding a second hierarchy or an automatic
semantic pass over your own output.

## 5. Finish, resume, and stay honest about both

In recorded-event mode, the event key is the job's identity. Find that event
again rather than turning it into a second proposal. Keep its initial digest in the
packet's note or proposal, and pass it back unchanged when completing. Completion
is recorded only when the current record still has that digest and every final
artefact it names still exists; a directory of drafts is not a result. An
interrupted job resumes its own packet, and a completed or no-lesson result is
reused instead of a fresh proposal being written.

Documented event-helper limits are part of the answer: no exactly-once effect
and no power-loss durability. A direct retro has no such completion claim. See
[references/sources.md](references/sources.md) for the pinned upstream revisions
this method was adapted from and for what was deliberately not ported.

For `status` and `complete`, the helper's exit code is the question a caller asks
it. `0` means a valid completed result already exists for this event, so the
job is reused; `1` means the caller still has work, whether the packet is new,
half-written, or no longer holds; `2` means the invocation was rejected. `read`
exits `0` only to say that a usable record was read; the job itself is still
unfinished.

## References

- [references/job.md](references/job.md) - the durable bar, the evidence rules
  and the outcomes.
- [references/session-evidence.md](references/session-evidence.md) - direct session
  evidence, candidate categories and deciding where an improvement belongs.
- [references/proposal.md](references/proposal.md) - the packet template, the
  overlap check and the grounding rules.
- [references/sources.md](references/sources.md) - upstream pins, adaptations and
  refusals.
- [scripts/optimiser-job.mjs](../scripts/optimiser-job.mjs) - identity, completion
  and the honest state of a packet.
- [tests/optimiser-job.test.mjs](../tests/optimiser-job.test.mjs) - the helper's
  fixture coverage.
- [references/nightly-review.md](references/nightly-review.md),
  [scripts/skillopt_review.py](../scripts/skillopt_review.py) and
  [tests/skillopt-review.test.mjs](../tests/skillopt-review.test.mjs) - the
  SkillOpt-Sleep evaluation pilot, its runner and fixtures.
- [scripts/session-digest.mjs](../scripts/session-digest.mjs) and
  [tests/session-digest.test.mjs](../tests/session-digest.test.mjs) - the
  multi-session retro's log selector, redacting digest and aggregate, and fixtures.
- [doc-bench](../doc-bench/METHOD.md),
  [scripts/doc-bench.mjs](../scripts/doc-bench.mjs) and
  [tests/doc-bench.test.mjs](../tests/doc-bench.test.mjs) - the document bench,
  its key check, prompt renderer and scorer, and fixtures.
