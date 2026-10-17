---
type: finding
title: "<Specific result or open question>"
description: "<What this record establishes or investigates>. Read when <the question comes up again>."
status: draft
related: []
sources:
  - resource: "<URL or repository path of evidence taken from outside, or delete>"
stale_after: ""
---
# <Specific result or open question>

Goal: <link to the canonical goal, when relevant>
Scope: <feature, relevant inputs/version/environment>
Date: <YYYY-MM-DD>

## Current finding

<Keep observations, inferences and uncertainty distinct. A tentative finding is
useful when its limits are explicit.>

## Evidence and conditions

<What was tried, on which inputs/revision, what happened, and links to evidence.
Retain evidence at its existing owner or under artifacts, not only scratch.>

## Failed approaches and open questions

<What did not work and under what conditions; unresolved questions and contrary
evidence. Omit when irrelevant.>

## Changes to this conclusion

<When correcting or superseding a finding, record why and link the replacement
or contrary evidence. Omit for a new finding. Do not erase useful failed attempts.>

Search for an existing finding before creating another. Update the same topic
when it remains the same question; use links for findings relevant to several
goals. Keep `sources` only for evidence actually recorded, and set `stale_after`
only when an outside fact needs rechecking. `status` is the document's review
state (an agent writes `draft`, a person sets `stable`), never issue or
deployment status.
