# Blast radius

Adapted from pstack's `blast-radius` skill. Use it when choosing checks for a
change whose consumers are not obvious, when reviewing a small diff you do not
trust, or when a PR's `Blast radius:` line needs more than a guess. It finds
what the change could break outside the diff and proves the one fact the change
is safe because of.

Listing callers is not the job. Get the caller list through
[code intelligence](../../orchestrate-work/references/code-intelligence.md) and
spend the effort on the breakage a symbol search does not show.

## Steps

1. Read the change: the diff, the symbols it adds, changes and deletes, and what
   it now does differently, including the part the diff does not spell out.
   [why](../../understand/why/METHOD.md) pulls the PR and commit history when that matters.
2. Name the one fact the change is safe because of. Most risky-looking changes
   are safe because of a single fact, such as "this call only drops cache
   entries that are already dead". If it holds, most risks clear at once. Spend
   the time here, not on a long list of possibilities.
3. Look where search stops:
   - consumers outside the symbol graph: an API response, a database column, a
     wire format, another language reading the same bytes, a feature flag,
     configuration, code several hops downstream;
   - shared state: caches, singletons, files, queues, anything two callers write;
   - contracts: the library's own source at its pinned version and any local
     patch, a public API, documented behaviour;
   - timing: when things run, such as microtasks, teardown, retries and ordering
     between processes.
4. Rate each risk with a real likelihood and a real cost. Keep the confirmed
   risks and list the checked-and-cleared ones separately. Cite a real
   `file:line`. A search that finds nothing is still a result; never invent a
   caller or an API.
5. Prove the one fact by running real code before returning.

## How sure you are

Take each fact the change's safety rests on as far down this ladder as is
cheap, and say where it stopped.

1. You said so. Worth nothing alone.
2. You pointed at the line: a real `file:line`, or the library's own source.
3. You showed the bad case cannot happen by walking the failure step by step.
4. You ran it: a script or test that calls the real code and fails loudly if
   you are wrong.
5. You reproduced it in the running app.

Step 4 is usually one small script that imports the library the app ships and
calls the exact function in question. A writeup that sounds right is not
evidence: it reads the same whether or not it is true. For a wide change, the
independent reviewer in [code-review](../../code-review/SKILL.md) is the second
opinion.

## What to hand back

- **What it does.** What changed, including the part that is not obvious.
- **The safety fact.** The fact, the ladder step it reached and the proof, or
  `unproven`.
- **Risks.** How each one breaks, its `file:line`, likelihood and cost, and how
  to check it.
- **Cleared.** What was checked and why it is fine.
- **Before merge.** The cheapest test or reproduction that catches the real
  bug, including the script used.

Keep the proof script and its output with the recorded evidence so a reviewer
can rerun it. Remove private context before any of it reaches a public PR.
