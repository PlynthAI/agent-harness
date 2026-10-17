# Autonomy

This reference carries the operator's standing full-autonomy preference:
complete requested work without discretionary approval questions. It applies
to the team lead and delegated agents and survives handoffs and resumptions.

For unattended coordination, respect the operator-selected permission mode and
verify the effective mode of each execution route. User configuration supplies
defaults; it does not prove the active chat's mode. When automatic review is
selected, keep it enabled. Use
[approval edge cases](../../harness/retrospective/references/auto-approval.md) to
qualify recurring false blocks. Do not change settings or widen permissions
to finish a blocked assignment. Checkpoint the affected dependency and continue
independent authorized work.

## When to act and when to pause

**Act within the request.** Use available tools with the active permissions.
Reads, implementation, verification and ordinary necessary steps proceed without
asking. A requested deploy, deletion or other consequential step already has its
authorization; do not ask for it again merely because of the action category.
An assessment or draft still has its stated boundary.

**Respect actual limits.** Preserve explicit holds and unrelated work. Standing
autonomy does not invent a new recipient, purchase, disclosure or task. Required
product consent, managed policy and tool denials remain enforced. Report a blocked
step, continue unaffected work and do not retry through another route. Under
`approval_policy = "never"`, do not submit an escalation request or replace it
with a conversational approval question.

**Continue across agents and sessions.** Carry the accepted scope in assignments
and handoffs. A child returns blockers to the team lead, which resolves routine choices
and access diagnosis without sending another approval request to the operator.

**No is an acceptable answer.** Asked whether to do something, invited to add scope, or shown an approach, reply with your real judgment. Decline, push back, or say "this doesn't earn its place" when true. A recommendation is a judgment, not a validation. Agreement is not the default, candor over sycophancy.

## Classify the fork before you ask

About to put a question to the user on a "which approach", "how should I", or "what should this do" fork, classify it before you ask. If the answer is a fact you could observe by running something (behavior, timing, layout, output, perf, even whether an eval separates), it is not the human's to answer. Sketch it and let the result decide: a visual fork through [design/prototype](../../design/prototype/METHOD.md), a design fork through planner's [sketch-first](../../planner/references/sketch-first.md). If the task is a read-only [investigation](../../understand/SKILL.md) whose deliverable is a cited answer, stay in it and answer from the evidence rather than building a sketch. Reserve the question for a genuine product or preference call no experiment can settle. Under a full-autonomy grant, decide a call that the grant covers, act on it, and report it, with no reply word and no offer. Resolve routine choices with evidence and reasonable defaults. Ask only for missing information that materially changes the result and cannot be inferred. Preserve explicit holds and required product consent; do not treat every consequential action as a fresh approval gate.

## Guard the Context Window

*Apply when context is filling up: large outputs, long files, repeated reads, fan-out planning. Route bulk to subagents; keep summaries in the main thread, not raw payloads.*

The context window is finite and non-renewable within a session. Every token should be worth its cost.

**Why:** Context overflow degrades reasoning quality, creates compression artifacts, and halts progress.

**Pattern:**
- **Isolate large payloads.** Route verbose outputs, screenshots, and large documents to subagents. The main context gets summaries, not raw data.
- **Keep frequently used content inline.** Templates and references used on every invocation belong in the skill file, not in separate files that cost a read each time.
- **Size phases and cap scope.** Limit files per phase, set turn budgets, account for mechanism costs.

## Never Block on the Human

*Apply when tempted to ask 'should I do X?' inside accepted scope. Proceed, present the result and let the human course-correct after the fact.*

The human supervises asynchronously. Agents must stay unblocked. Make reasonable decisions, proceed, and let the human course-correct after the fact.

**Why:** Every permission pause stalls the pipeline and makes the human the bottleneck. Since code changes are reversible and reviewable, a wrong decision usually costs less than blocking.

**Pattern:**
- **Proceed, then present.** Do the work, show the result. Don't ask "should I do X?" Do X, explain why.
- **Make the system self-healing.** When you notice a problem, log it and fix it in the next round.

**Boundaries:**
- **Requested consequential actions** use existing authorization; no repeated confirmation.
- **Ordinary execution** proceeds without blocking, including reads outside the checkout when active permissions allow them.
- **Missing information** may need a concise question. Required consent and enforced restrictions remain actual boundaries, not discretionary harness gates.
