---
name: why
description: Explain design rationale, regressions, postmortems and data-backed thresholds from project evidence. Use for "why this design" or "why we picked Y". Query applicable sources in parallel and preserve confidence levels; how handles runtime behaviour.
---

# Why

Investigate the motivation and intent behind code.

Companion to the [how](../how/METHOD.md) method. `how` answers what the code does and how it works. `why` answers what forces led to its shape.

Each spawn below names a shared role. Assign it through [orchestrate-work](../../orchestrate-work/SKILL.md); the role file owns the model. Investigators and the synthesizer write nothing.

## Operating Posture

Operate as a **careful, cautious, and precise investigator**. Be honest about what you know vs what you're inferring. Read `references/epistemics.md` for the full confidence framework and phrasing guide. The synthesizer must follow it.

## Step 1. Understand the Target and the Question

Parse what the user is asking. The **target** is usually a chunk of code, a pattern, a feature, or a named design decision. The **question** is usually a design rationale, a tradeoff, a motivating edge case, an external constraint, dead code, or a broad history sweep.

If the target is vague ("why do we do it this way?" with no clear referent), make your best guess from conversation context (open files, recent edits, cursor location, what was just discussed). State your interpretation briefly so the user can redirect if you're off, then proceed.

## Step 2. Establish the Code Anchor

Before spawning investigators, anchor the investigation in concrete code. You need:

- The relevant file path(s) and line range(s)
- The key symbols (function names, class names, constants)
- An initial commit list. The last few commits touching the target.
- PR numbers from merge commits (pattern `(#1234)` in the subject line)
- The project workspace root, resolved through [docs-workspace](../../docs-workspace/SKILL.md)

Build this inline.

```bash
# Blame target lines for last-touch commits
git blame -L <start>,<end> <file>

# Full file history, with patches, through renames
git log --follow -p -- <file>

# Last N commits touching the file, PR numbers visible
git log --oneline -20 -- <file>

# Extract PR numbers from a commit message
git log -1 --format=%B <commit>
```

Pull PR bodies and discussion via `gh` for any substantive commits:

```bash
gh pr view <number> --json title,body,author,createdAt,mergedAt,labels,closingIssuesReferences,comments,reviews
```

Capture this as seed context (file paths, symbols, commits, PR numbers, linked ticket IDs, workspace root). Pass it to the investigators.

## Step 3. Spawn Parallel Investigators (default posture)

**Default to the parallel investigation.**

### Sources, in order

The harness and the repository name the sources, never the connectors a session happens to expose. Give each source below that applies its own investigator:

1. **Source control.** Always. Git history, `gh` for PRs and review threads, code comments, tests, and GitHub issues when GitHub is the tracker, which is the default. Role: `explorer`. Playbook: `references/sources/code-archaeology.md`.
2. **The project workspace and repository documents.** Always. Goals, findings, plans and artifacts through docs-workspace's [discovery](../../docs-workspace/references/discovery.md) route, then the documents the repository's AGENTS.md and PROJECT.md point to: subject guides, decision records, GLOSSARY.md where it exists. Role: `researcher`. Playbook: `references/sources/workspace.md`.
3. **Another tracker**, only when the repository's guidance names one in place of GitHub issues. Role: `researcher`.
4. **An external store** (team chat, long-form documents, observability, error tracking, an analytics warehouse), only when the repository's AGENTS.md or PROJECT.md names it as the owner of that kind of evidence. One `researcher` per named store, with that store's tools in its assignment.

Personal connectors (mail, calendar, a personal drive, a todo app) are never evidence for a project question. Most questions need two or three investigators.

Launch them in a single message so they run concurrently. One source per investigator.

Each investigator gets:
1. The base prompt from `references/investigator-prompt.md`
2. Its source's playbook from the index in `references/source-playbook.md`
3. The cross-cutting `references/sources/incident-postmortem.md` **if the target code looks defensive** (null checks, retry logic, timeout handling, rate limiting, feature flags, egress guards, OOM handlers)
4. The code anchor from Step 2 (file paths, symbols, commit hashes, PR numbers, ticket IDs, workspace root)
5. The user's original question

### Not applicable is not a gap

A tracker or store the repository does not name is "Not applicable: the repository names no such source" in Sources Consulted. It needs no search and no justification.

Source control and the workspace are always searched. If one cannot be read (no workspace resolves, `gh` is unauthenticated), that is a gap for What We Don't Know. Skip a named source only when it is provably irrelevant to the target, and write the reason in Sources Consulted.

If the target is a single commit whose PR description already answers the question completely, you may answer inline after reading source control and the workspace yourself. Say so.

## Step 4. Synthesize

Spawn one synthesizer:

- role: `smart_worker`, with the tools the investigators used. Its quality check spot-verifies citations, which needs the same access.

The synthesizer gets:
1. The investigator findings, including null results and the sources that were not applicable or skipped
2. The code anchor from Step 2 (file paths, symbols, commit hashes, PR numbers, ticket IDs)
3. The user's original question
4. The epistemics framework from `references/epistemics.md`
5. The synthesizer prompt template from `references/synthesizer-prompt.md`

## Step 5. Present

Take the synthesizer's output and present it to the user. You may lightly edit for clarity or add context from the conversation, but **do not rewrite the confidence language**.

If the answer is worth keeping, the team lead records it as a finding at the workspace's findings route through [docs-workspace](../../docs-workspace/SKILL.md).

## Output Format

The output structure is the one in `references/synthesizer-prompt.md`: The Question, The Code in Question, What We Found, What We Can Reasonably Infer, Competing Hypotheses, What We Don't Know, Sources Consulted, Confidence Summary. Adapt as needed, but keep the confidence separation intact, and keep Sources Consulted as one line per source in the order above, including the ones that returned nothing or were not applicable.

After the Sources Consulted block, if the user's `why` question is a precursor to actually changing this code, convert the lineage findings into a Preserve / Change / Avoid / Risk constraint set suitable for planning the change.

## Common Failure Modes to Avoid

- **Recency bias**. Assuming the most recent commit is authoritative. The current shape is often the accretion of many earlier decisions. Trace back.

## Reference Files

- `references/epistemics.md`. Confidence tiers and phrasing guide. The synthesizer must follow it.
- `references/investigator-prompt.md`. Base prompt template for investigators.
- `references/source-playbook.md`. Index of the source playbooks and when each applies.
- `references/sources/*.md`. One playbook per source, plus cross-cutting `incident-postmortem.md`. Give an investigator the single file for its source.
- `references/synthesizer-prompt.md`. Prompt template for the synthesizer, including the output format.
