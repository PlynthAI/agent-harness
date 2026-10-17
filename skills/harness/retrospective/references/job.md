# The optimiser job

This reference carries the durable bar, the evidence rules and the outcomes for
both session retrospectives and recorded-event jobs. The event helper itself
still handles one event and one result per invocation.

## 1. What makes a finding worth keeping

Hold this counterfactual before writing anything:

> If this finding disappeared, would a future session repeat the mistake, or redo
> substantial investigation?

This is the durable bar from the pinned upstream reference
[EveryInc/compound-engineering-plugin, `ce-compound`](https://github.com/EveryInc/compound-engineering-plugin/blob/6be0932b91dc369508da19e6e2bc753b4c038830/skills/ce-compound/SKILL.md):
a learning earns its place only when it holds durable reasoning that is not
readily recoverable from the final code, tests, comments or existing
documentation. If the counterfactual fails, the honest result is no lesson.
Event mode records that result so the same event is not re-examined next month.

**What does establish a lesson**

- One reproduced failure, with the failure and the repair both visible.
- A real external contract: a specification, an interface, a licence or a
  platform behaviour, stated by the party that owns it.
- An explicit project decision, recorded by the people who own that project.

**What does not establish a lesson**

- Completion. A finished task is not evidence of anything reusable, however
  large or small it was.
- Effort, cost or confidence. A large diff and a small one carry the same weight.
- Frequency. The same mistake five times is still one unreproduced anecdote when
  nothing shows why it happened.
- Existing code, tests, comments and repetition. They record what was done, never
  what was intended and never what the requirement was. Read them as evidence to
  check a claim against, not as the claim's authority.

## 2. One lesson per change

A proposal handles one coherent finding. A direct session retrospective may
identify several candidates; assess each independently and prepare separate
changes only for those that pass the bar. The recorded-event helper still binds
one event to one completed outcome.

There is no capture quota here. Nothing requires a job to produce a lesson, and
nothing requires a number of jobs per project, review or week.

## 3. The outcomes

The recorded-event helper binds one event to one marker drawn from a fixed
schema: `proposal`, `finding` or `no-lesson`. A direct session retrospective is
not limited to those three: in an authorized in-project run, the same judgement
an event would record as a project finding can be written straight into the
project's own living standards file. That write stays inside the project; it does
not change the helper's schema or grant any shared-library authority.

**A standards entry (direct in-project runs).** The lesson is a project's own
implementation or review judgement. When the request authorizes the in-project
retrospective, write it to that project's `CODING_STANDARDS.md` directly - adding,
refining or removing an entry as requirements change. Reconcile an existing guide
in place; do not create a competing file, a proposal packet or a fresh approval
step for a project-owned write. An assessment-only request reports the candidate
as advice and writes nothing.

**A proposal.** Something in the shared harness, or in a project's harness
guidance, should change. The result is a packet under the factory source's
`.local/proposals/<packet-id>/` route, prepared so a reader who has not seen the
run can judge it. See [proposal.md](proposal.md).

**A project-owned finding.** The finding is true only inside one project: its
commands, its people, its data or its design decisions. Write it through that
project's findings route when this invocation covers that write. Otherwise a
direct retro reports the owner and pending action. In recorded-event mode, save
the pending finding, evidence, event key and digest, owner route and remaining
action in that event's packet. Do not mark that event complete while the project
write is pending; a later in-scope invocation resumes it and completes only
after the routed artefact exists. The pending packet grants no new authority.
A project fact never becomes a shared rule merely by being documented.

**No lesson.** Nothing here is worth keeping, or there is no new reusable finding
to add because the reasoning is already retained. For a recorded event, record
the reason in its packet so the next invocation reuses the answer. For a direct
session retro, a concise answer is enough.

## 4. Evidence, and its limits

- Link the evidence: name the file, command, record or pull request that shows the
  problem. Do not paste transcripts, environment dumps or secrets into a packet.
- Read the source at the revision you cite rather than a summary of it. A
  document that disagrees with the source is a finding about the document.
- For a claim that something merged or shipped, cite the pull request or the
  issue. A local commit proves a commit and says nothing about a remote.
- In event mode, the record says a transition owner called the producer for one
  identity. It is not proof of delivery, product outcome or lesson. Treat its
  fields as references to check, not findings.
- A single judgement is enough where the evidence is a reproduced failure or an
  owned contract. Where the evidence is only an impression, say so, and let the
  owner decide.

## 5. Review stays where it already is

An independent review of a candidate is the harness's existing review workflow,
at the point a change candidate exists. This job does not create a second review
hierarchy, does not run an automatic semantic pass over its own output, and does
not approve what it proposed.

Nothing here applies anything. A proposal is read by its owner, and a rejected or
deferred proposal leaves the live harness exactly as it was. That is a normal
outcome rather than a failure of the job.
