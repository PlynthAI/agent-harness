---
name: understand
description: Investigate project questions from evidence, read only. How and why X works, placement and ownership, regressions, postmortems, data-backed thresholds, "are we sure about X", "teach me X", explainers, X vs Y, a leak, spin or trace. Fixes go to diagnosing-bugs; external contracts to research.
metadata:
  group: investigate
  lead: true
---

# Understand

**You own the answer. Plan, route, write.**

Investigation requests are read-only. They produce a cited explanation or a
recommendation, not a code change. This entrypoint is pstack's Investigation
playbook with the harness's routes; the body of each answer comes from the method
it routes to.

## Route by the question

| The question is | Route |
|---|---|
| how does X work, where should this live, which layer owns it | [how](how/METHOD.md) |
| why is it this way, what forced it, a regression or postmortem, where a threshold came from | [why](why/METHOD.md) |
| teach me X, help me really understand X, explain this change or subsystem | [teach](teach/METHOD.md), which runs how and why and weaves them |
| catch me up on X, where did we leave off, what happened with X last week | [recall](../recall/SKILL.md), which reads the workspace before the transcripts |
| a live symptom: a leak, an idle-CPU spin, a glitch | [runtime forensics](references/runtime-forensics.md) |
| a captured profile, trace, spindump or heap snapshot | [trace forensics](references/trace-forensics.md) |
| an external contract, API, specification or library behaviour | [research](../research/SKILL.md) |
| X or Y? | [how](how/METHOD.md) when mechanics matter, [why](why/METHOD.md) when the current shape matters, then a recommendation with a tradeoffs table |

## The playbook

1. Select the route that answers the question and read its method or reference.
   A direct how, why or teaching question starts with that method; add another
   only when its evidence is needed. Runtime and trace questions use their
   forensics references.
2. Use the selected route's output shape. For how, use its applicable Overview /
   Key Concepts / How It Works / Where Things Live / Gotchas sections. Why
   separates findings, inference, hypotheses and unknowns; teach gives a plain
   explanation at the person's pace. A decision gets a recommendation with a
   tradeoffs table.
3. Write the reply plainly. Every claim carries its evidence or its label in the
   same sentence: measured, inferred, or guess.

No PR, no delivery, no design sketch unless the investigation precedes a code
change. If it does, hand back to the user and re-route: a defect to
[diagnosing-bugs](../diagnosing-bugs/SKILL.md), a change to
[implement-spec](../implement-spec/SKILL.md), an open approach to
[planner](../planner/SKILL.md). An answer worth keeping becomes a finding at the
workspace's findings route, recorded by the team lead through
[docs-workspace](../docs-workspace/SKILL.md).

**Reply:** the investigation output. For "are we sure?" answers, include your
real judgment with reasons. Push back if the premise is wrong.

## References

- [references/runtime-forensics.md](references/runtime-forensics.md) - diagnose
  a live symptom from instrumentation; the deliverable is a diagnosis.
- [references/trace-forensics.md](references/trace-forensics.md) - diagnose a
  captured artifact handed over after the fact.
