# Long runs

Three shapes of work that outlast one exchange: driving one task to done, picking
up another session's work, and stopping cleanly so someone else can. A standing
programme of many units is [programme](programme.md).

## Autonomous run

A long task to drive to completion without stopping ("run until done", "loop until X").

**You own the exit condition. Define done, then drive to it without stopping.**

1. State the exit condition as a checkable predicate before the first iteration (tests green, repro fixed, all N PRs merged, pixel-diff zero).
2. Pick the wake mechanism using the session's scheduling tool or a watcher subagent. An event to watch (CI, a merge, a ref advancing) gets a watcher subagent that wakes you on the event, with a long time-based heartbeat as fallback. No event gets a fixed-interval heartbeat sized to when the result is worth re-checking.
3. Each iteration makes the smallest change the evidence justifies, verifies it against the predicate, commits if it advanced, discards changes that didn't help. Belt-and-suspenders that "might help" gets reverted, not left to ride.
   Sequence the work into small units that each end in a check, verifying each unit before the next instead of batching checks at the end.
4. Mid-run discoveries are yours. Address broken skills, related bugs, flaky verifiers, review noise, tooling failures, orphaned follow-ups, and fixable drift yourself. Put out-of-band fixes in their own PR. Do not park reversible work for the human or put a question to the user. Surface only irreversible actions, genuine product or preference calls no experiment can settle, or a real dead end. Keep the predicate as the main drive, and return to it after each side fix. A verifier or tooling fix is a side fix only while it unblocks the predicate: two iterations in a row that change only verification machinery (proof tooling, harnesses, observers, launch environments, requalification) without moving the predicate are a loop; a fix that lets the real operation run or closes a safety defect is not. Halt the machinery work, not the run, get the real outcome signal by validation's [machinery rule](../../validate-implementation/SKILL.md#2-select-for-the-change-then-run), and surface a requirement nothing supported can observe as a decision, not more tooling.
5. Checkpoint every iteration in a decision log per [the decision-log reference](../../hillclimb/references/decision-log.md), a row for what changed and whether the predicate moved.
6. Stop when the predicate is met. A plateau is not a stop, so keep going and pivot your approach to push past it. Surface a genuine dead end rather than spinning, and never relax the predicate to declare victory.

**Reply:** the exit condition, iterations run, what landed, what was discarded, final predicate state.

## Session pickup

Resuming or taking over a prior agent's in-flight work from a transcript, a resume note or a pushed branch. A catch-up on a topic across several sessions, with no single chat to resume, is [recall](../../recall/SKILL.md).

**You own the resume point. Read the prior trail, don't redo it.**

1. Locate the prior trail. The session transcript, a resume note (`.state/state.md` at the root of the task's checkout, or an older one in the project's registered workspace), or a pushed branch. Read only this project's sessions; searching across other projects' session stores crosses workspace boundaries and reads private chats from unrelated projects. Read the metadata overview and last messages first, then scan back for the decision points. Parse a long transcript in a subagent and keep the reduced timeline in the main thread ([guard the context window](autonomy.md#guard-the-context-window)).
2. Reconstruct operational state. The branch and worktree, what already landed (`git log`, `git diff` against the base), the open todos, the decisions made. The prior trail is authoritative input. Resist the bias to re-derive it.
3. Diff done vs pending. Compare what shipped against what was planned, name the resume point, do not re-run the prior repro or redo completed work. A "let me verify from scratch" pass means you're treating the trail as untrustworthy when it's authoritative.
4. Route the remaining work to the matching skill and pick the verdict: continue the execution, ship a finished recommendation, ratify or override a prior conclusion, or postmortem a failed run. Pickup ends here. The routed skill owns the rest.
5. Verify the inherited claims against the original goal on the real artifact, not a proxy or "it compiles". A passing prior self-report is not the proof.

**Reply:** where the prior agent stopped, what you inherited vs redid (ideally nothing redone), the resume point, and the outcome.

## Pause safely

Suspending in-flight work cleanly so it can be resumed, on an explicit pause, going offline or a session restart. The complement to Session pickup. A context compaction gives no warning, so it is not a pause: a long task keeps its [state.md](../../docs-workspace/references/plan-and-state.md) (`.state/state.md` at the root of its checkout, written only by the team lead) current as each step completes.

**You own a clean stop. Leave a checkpoint a cold-start agent can resume from.** This is explicit only. On "keep going", "going to bed, keep going", or "don't stop", do not pause.

1. Stop at a safe boundary. Finish the current atomic step or back out of it. Start nothing new, and cancel any nested subagents.
2. Take no irreversible action to pause. No PR and no push unless you already had one out.
3. Make the work durable. Where committing is authorized, commit uncommitted edits as one clear `wip:` commit on the current branch so nothing is lost; otherwise leave them in the worktree and name them in the resume note. If the tree is broken, say so in the commit body in one line.
4. Write the resume note off-context. Capture intent, what you were doing, progress and what's verified, current state, next steps, key files, and gotchas. Write it as the task's `.state/state.md` at the root of the checkout it runs in, as [docs-workspace](../../docs-workspace/SKILL.md) describes; with no checkout, it goes on the project's resolved scratch route. If a decision log exists, point at it instead of duplicating it.

**Reply:** where you are in the loop, what's on disk versus still in your head (paths, no diff dumps), the commits you made and whether the tree is clean, and the first action on resume. This is a pause, not a final report.
