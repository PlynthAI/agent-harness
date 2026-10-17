# Weekly SEO/AEO programme

One run a week per site: reconcile the tracker, measure, do one allowed task,
report. A scheduled task starts it with a thin prompt naming this skill and
the project; the same run works when a person asks "what is next on SEO". The
run needs no handoff: everything it needs is in the repository, the tracker,
the recipe and the last run's receipts. It is modelled on ci's
[recurring review](../../ci/references/recurring-review.md).

## Before the run

- Load the project as the skill's first section says: tracker path, rules and
  banned claims, measurement sources, evidence route, approved spend, checks
  and owner-only actions.
- Fetch the default branch and read the tracker there, not on a stale local
  branch. Other agents may have pushed since the last run.
- Read the tracker's review log and the last run's receipts first. Verify what
  they said was delivered rather than rediscovering it, and do not repeat a
  rejected experiment unless its conditions changed.
- If last week's weekly PR is still open, do not open a competing edit of the
  same rows. Reconcile against it, and list it as waiting on the owner.

## 1. Reconcile

Bring the tracker into line with what actually happened.

- List PRs merged since the last review date and match each to its rows. A row
  whose PR merged moves on only as far as its evidence goes: merged is not
  live, and live is not indexed.
- For each row whose "Done when" names a live URL, read the URL: status code,
  canonical, robots directives, presence in the sitemap and the answer in raw
  HTML. Record what you read as a receipt when it changes a status.
- Move a status only when its evidence exists, and link that evidence in the
  row. A row marked done without evidence goes back to its last evidenced
  status with a note.
- Owner to-do items still open stay listed; do not mark them done from
  inference.
- Keep the tracker's history: append to the review log, do not rewrite earlier
  entries.

## 2. Measure

Read each measurement source the project names and save each reading as a
dated receipt in the project's evidence route.

- Use exact windows: the latest seven complete days with inclusive and
  exclusive boundaries and the time zone stated, plus the project's longer
  comparison window (commonly 28 days). Keep a dated baseline separate from the
  rolling view.
- Keep layers separate, as the guide's "Measurement dashboard and rollout
  checklist" section sets out: technical and indexing state, search
  performance, AI visibility, authority and business outcomes. A citation is
  not a recommendation, and third-party AI tracking is sampling, not ground
  truth.
- A source the run cannot read unattended is reported as not read, with the
  reason. Never sign in, accept terms or grant access on the owner's behalf;
  the missing access becomes an owner to-do item if it is not one already.
- Paid pulls stay within the spend the project approved. Record the units or
  cost used in the receipt, and stop before the allowance runs out.
- Compare each reading with the previous receipt and say what changed and by
  how much. Do not claim a trend from one reading or a change inside the
  source's reporting lag.

A receipt is short and self-contained; the
[tracker contract](tracker-contract.md#evidence-receipts) sets its fields.

## 3. Do one allowed task

Pick one task and finish it to a reviewable state.

- **Allowed:** a tracker row an agent may do alone under the project's rules
  (its "Who" column says so), not blocked or parked, whose inputs exist. Take
  the highest priority first, then the order the tracker gives. An owner-only
  step inside a row is drafted and handed over, never performed.
- **Branch:** a fresh branch from the freshly fetched default branch, named
  under the repository's convention.
- **Work:** content through the [authoring route](authoring.md), code through
  the project's own methods, each with the checks the recipe and the
  repository name. Browser-visible changes are proven in the running app.
- **Draft PR:** the task, the tracker reconciliation and any receipts kept in
  Git go in one draft PR. It states the problem, the change, the exact checks
  run and what remains. Never merge it, deploy it or mark it ready on the
  owner's behalf.
- When no task is allowed (everything waits on the owner or on evidence), open
  the PR with the reconciliation and receipts only, and say why no task ran.

A task that turns out larger than one run leaves a working, reviewable slice
and a precise next step in its row, not a half-finished change.

## 4. Report

Short and in plain language, for the owner to read in a minute:

- **What moved:** status changes, each with its evidence link.
- **Measurements:** the headline readings against the previous receipt, and
  every source not read, with the reason.
- **This week's task:** what was done and the draft PR link.
- **Waiting on the owner:** owner to-do items, rows ready for the owner and PRs
  to merge, each with the one action needed.
- **Next:** the task the next run will pick, and anything blocking it.

Add one line for the run to the tracker's review log. The report is the
record; do not keep a separate per-run ledger.

## Retain enough to resume

The tracker, its review log and the dated receipts are enough for the next run
to start cold. Findings that outlive one run, such as why a tactic was rejected
or why a measurement source is unreliable, go in one finding at the project's
findings route, updated as evidence changes. Delete nothing another run or a
tracker row still cites.
