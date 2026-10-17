# The proposal packet

A packet is a review artefact. It lives under the factory source's
`.local/proposals/<packet-id>/` route, which is git-ignored, so a packet is never
a change and never installs itself. For a recorded-event job, the directory is
named after its event key, so resume finds the same packet. A direct session
retro can use a descriptive packet ID; it needs no event key or completion marker.

The classification of an artefact - owned prose, an upstream-managed package, or
a project-specific procedure - belongs to the harness library method. Follow it rather than
restating it here.

## 1. What the packet carries

| File | Holds |
| --- | --- |
| `proposal.md` | the problem, the proposed change, the class it belongs to, the likely effect, the check that would show it works, and how it would be undone |
| the drafts and evidence | the draft, the diff, the branch or worktree reference, and the output of any check run against it |
| `completion.json` | recorded-event mode only: the machine-written record that this job finished for this event and these artefacts |

In recorded-event mode the completion record names each artefact by path, length
and SHA-256, with the event digest. It distinguishes a finished packet from one
whose input or output changed. The helper never creates the packet directory.
A direct retro's packet stays an ordinary review artefact; no completion marker
or synthetic queue record is required.

`proposal.md` answers the following in the order a reviewer reads them:

1. **The problem**, with the evidence that shows it: what breaks, or what rule is
   missing, and where that is visible.
2. **The change**: the smallest thing that addresses the problem, named by path
   or by method.
3. **Where it belongs**: the class above, and which copy it would reach.
4. **The likely effect**: what improves, what stays the same, and what could get
   worse.
5. **How it would be evaluated**: the check, example or observation that would
   show it works, named far enough in advance to be falsifiable.
6. **How it would be undone**: the restore path, so a decision to defer is cheap.
7. **The sources**: the files and revisions the claims were checked against.

## 2. Grounding a proposed rule

A proposed rule states three things, and each is checked against reality rather
than asserted:

1. **The requirement it protects.** What must stay true, and why it matters. Name
   the artefact that owns the requirement where one exists: a check, a contract, a
   role brief, a template.
2. **The demonstrated failure or contract it answers.** The reproduced failure
   with its evidence, or the external contract with its citation. "It happened
   several times" is not a demonstration, and neither is "the tests encode it".
3. **The legitimate alternatives it permits.** Which sound ways of satisfying the
   requirement remain allowed. A rule that forbids a sound alternative is not
   ready: either that alternative is genuinely wrong and should be named as such,
   or the rule is too narrow.

A requirement with no demonstrated failure behind it is a preference. Write it as
one, or do not write it.

## 3. Overlap, before a second packet exists

Read the existing packets and the existing guidance in the area the finding
touches.

- **The same problem, cause and remedy.** If something changed, update the
  existing packet rather than opening a second one and say what changed. If
  nothing changed, leave that packet untouched and record this event's no-lesson
  note referring to it; the note is a per-event result, not a second proposal.
  Linking the existing packet is enough, and its deferred status is not treated
  as approval. In a direct retro, report the overlap without manufacturing an
  event's no-lesson marker.
- **The same area, a different angle or remedy.** A new packet is fine. Say what
  overlaps so a reviewer can decide whether the pair should be consolidated.
- **Related but distinct.** Write the new packet and mention the neighbour when
  that helps the reader.

Look at the problem, the cause, the remedy, the files it touches and the rules it
would add. Do not reduce this to a numeric score: a threshold decides nothing a
reviewer cannot decide better with both packets in front of them.

## 4. How the change would be evaluated

Say how the change would be shown to work before anyone applies it: the check
that would catch its failure, the example that would exercise it, or the
observation that would falsify it. Where the evaluation needs a fixture, a
throwaway copy or a disposable target, name it. A change that can only be
evaluated by touching the live harness has not been prepared yet.

An evaluation that would only pass because it repeats the change's own wording is
not an evaluation. Prefer a case that would still fail if the change were
reverted.

## 5. What a packet should not add

- **No assertion floor, wording quota or length target.** A check is worth writing
  because it would catch a real failure, not because a neighbouring check carries
  more assertions.
- **No numeric threshold where judgement is the point.** Frequency is not
  authority, and a count is not a reason.
- **No scaffold.** Placeholders, drafted-but-unfilled sections and
  drafting-context numbering do not survive into a packet a reviewer reads.
- **No second review hierarchy**, and no automatic pass over the packet's own
  claims.
- **No quiet scope growth.** If the change needs a wider redesign, the packet says
  so and the decision goes back to its owner.
