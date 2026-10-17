# Learning events

One verified transition may record exactly one bounded learning event. A shared
producer beside the hooks runtime writes it; a separate, explicit proposal job
owns consumption. This reference covers the writer's boundary, its queue and its
recovery.

```bash
node <codex home>/hooks/learning-queue.mjs enqueue --queue <factory queue dir> --request <request.json> [--now <iso>]
```

The caller supplies the queue directory - the factory maintenance area the
operator resolved - and it must already exist. The producer **never creates** a
directory, embeds no host path, and never consumes the queue.

**Not deployed on this host yet.** The harness source carries
`hooks/learning-queue.mjs`, but the install does not place it beside the hooks
runtime and no factory queue is named. Until both exist, record a
failed-task observation as a finding in the project workspace instead, with the
same identity and evidence fields, and run the harness retrospective
on it. Babysit's [CI step](babysit.md) routes every CI failure this way.
A CI miss goes to `findings/ci-green/<topic>.md`, as
validate-implementation's
[check ladder](../../validate-implementation/references/check-ladder.md)
describes.

## What an event is, and is not

| An event is | An event is not |
|---|---|
| the transition owner's own record that it called this writer once for one identity | proof that a change was committed, pushed, merged, deployed or accepted |
| a bounded index to evidence the caller already keeps | a copy of a transcript, an environment, a credential or an artifact |
| the deduplication key a later proposal job reads | a task ledger, a status board or a second programme tracker |

[scripts/delivery-state.mjs](../scripts/delivery-state.mjs) plans the steps and
names the authority; a planned, unblocked `ok` is not a completed transition. The
transition owner verifies the actual transition, keeps the evidence, and then
calls the writer. An event records that the owner called this writer for that
identity: it is **not proof of delivery**, of a product outcome or of any
downstream processing.

A useful failed-task observation is recorded as its own transition kind and
cannot carry a success claim.

## Identity and deduplication

The key is a versioned hash of four fields: `project`, `run` (the run or task
execution id), `candidate` (the actual candidate) and `transition_kind`. The two
kinds are `task-completed` and `failed-task-finding`; everything else about the
request is a bounded reference, not part of the identity.

A later consumer reads the same contract from the same module - `eventKey`,
`readPublishedEvent`, `canonicalPayload` and `LIMITS` are exported for reuse - so
the key and the envelope have one definition rather than a second copy.

- A retry of one identity reads the published record and leaves its bytes alone.
- A different payload under the same identity is a conflict: the existing record
  is reported and never replaced.
- Records are kept for the deduplication lifetime. Derive pending work from
  completed output, never from a record's absence.
- The attempt timestamp is recorded and left out of the comparison, so the same
  bounded request matches on any later attempt.

## Bounds

| Bound | Value |
|---|---|
| request file | 64 KiB, refused before it is parsed |
| one record | 16 KiB |
| identity field | 200 characters |
| one reference | 300 characters |
| one reference list | 16 entries |

A field the allowlist does not name is rejected rather than carried, and a
rejection echoes no value from the request. A secret, an environment dump, a
transcript or a stray success flag therefore cannot reach a record.

## Outcomes

| Outcome | Exit | Meaning |
|---|---|---|
| `published` | 0 | this attempt linked the one record for this identity |
| `existing-identical` | 0 | the record was already there and matches this request |
| `conflict` | 1 | a different payload holds this identity; nothing was replaced |
| `corrupt` | 1 | the record at this key cannot be trusted as an event |
| `recoverable-missed-event` | 1 | the queue could not take the event; nothing was published |
| `rejected` | 2 | the request is outside the contract; nothing was written |

Publication is a **hard link** from a flushed, closed, same-directory temporary
record. The link cannot replace an existing event, and it is the only
publication step: a filesystem that cannot link reports `publication-unsupported`
instead of falling back to a weaker rename or copy.

## Recovery and limits

- Retry the same bounded request from the identity and evidence references the
  task owner already keeps. A recoverable outcome returns the stable key and
  that bounded request, so they can be saved in the task's normal artifacts.
- A crash before publication is recoverable only that way. Without durable
  caller evidence, this queue cannot recover the request and does not claim that
  no event was lost.
- An **orphan** temporary left by an interrupted attempt is ignored: it is never
  promoted, consumed or mistaken for an event.
- A queue failure neither fails nor passes the change. An ordinary completion
  stands on its own evidence, and a missed event is preserved as a reference for
  a later attempt.
- Deduplicated publication is not idempotent downstream processing, and no
  power-loss durability or exactly-once effect is claimed. The proposal job owns
  its own recovery of partial output.
