# Write a PR body

Adapted from Matt Pocock's `pr` method. Show the change before explaining it.
Every PR includes one small visual diagram: pseudocode, a diff sketch,
responsibility tree, call/data-flow tree or Mermaid diagram. Pick the smallest
form that makes the actual behavior or ownership clear. For a one-line fix, a two-line before/after
flow is enough; for a broad change, show only the affected boundaries. The
visual represents verified implementation, not an imagined architecture.

Once the pull request exists and [review-status.mjs](../scripts/review-status.mjs)
`post` has exited 0 on its head, arm auto-merge with the project's merge method
(`gh pr merge <number> --auto --squash`, or `--merge` / `--rebase` where the
project says so). The forge then merges it once its required checks, the
`harness/review` and `harness/ocr` statuses among them, are green, its threads
are resolved and it is mergeable; nobody waits on a person. If it is armed,
disarm it (`gh pr merge <number> --disable-auto`) before pushing a new head.
Skip the arming where the project requires a bot review of the current head
(babysit arms it after [pr-review.mjs](../scripts/pr-review.mjs) passes) or
where the forge has no required checks, where `--auto` would merge before CI
reports: there the `merge` step merges once `review-status.mjs read` exits 0
and CI is green on the head. Say which in the reply.

Use the project's domain language. State the accepted requirement, intentional
scope and material limits in the PR body so a hosted reviewer can understand
the change without access to local workspace files. Link an accessible
issue/spec/plan where useful; keep private raw review reports in the workspace.
Where the repository has a PR template, the body fills every section it asks
for, in its headings, and the sample below only shapes the content; the merge
gate counts an unfilled template as unmet. Keep prose short. Give the finished body a last pass through
[unslop](../../writing/unslop/METHOD.md).

````markdown
## Summary

<What changed, the accepted requirement and why, in one or two sentences.>

```text
before: <old path or result> -> <observed limitation>
after:  <new path or result> -> <intended behavior>
```

## Evidence

- Before: <observed failure, prior run, screenshot, or "not measured">
- After: <actual command/result, browser proof, screenshot, or remaining gap>
- Review: <fixed-candidate review record and any coverage limits>

## Merge danger

- Door: <reversible / hard to reverse, with a short reason>
- Blast radius: <affected behavior and consumers, such as layout shift, downstream consumers or mobile>
- Recovery: <rollback or mitigation when relevant>
````

Fill `Blast radius:` from
[blast radius](../../validate-implementation/references/blast-radius.md) when
the consumers are not obvious: the one safety fact and how far it was proved.

For a UI change, a shallow component tree or screenshot pair may communicate
more than a call graph. For a migration or state change, include the irreversible
boundary and readback. For a docs edit, show the changed route or file tree.
Use Mermaid when relationships or sequence matter; a text sketch is easier for
small diffs. Show logic as pseudocode. When the change is mostly new, or the
reader needs a copyable target, show the whole block rather than a diff sketch.
Place each visual next to the text it supports and keep only the elements that
text needs. Do not paste a large decorative diagram or claim a failing test,
runtime proof, screenshot or rollback that was not observed.

Prefer a screenshot or recording when the change is visual; otherwise use
execution evidence such as a command and its output. For a test, show the exact
test that failed before and passes after, as pseudocode when the real test is
long. The `before` item can say "not measured" when no baseline was captured. The
`after` item names the checks actually run and their practical limits. Keep
accepted non-goals and intentional tradeoffs visible when needed to judge a
review comment. A diagram and green CI do not replace a requirement or prove
production behavior.
