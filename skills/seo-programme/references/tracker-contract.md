# Tracker contract

Each project keeps exactly one SEO/AEO tracker: one Markdown file in the
repository that the weekly run reads and updates. It is the project's list of
work and its current state. Evidence, page content, publication status and
facts stay in their own files; the tracker links them.

## Naming the tracker

The repository names the tracker's path in `AGENTS.md` or `PROJECT.md`, beside
the other SEO/AEO pointers:

| Pointer | What it names |
| --- | --- |
| Tracker | The one tracker file |
| Recipe | The brand recipe in this skill (`recipes/<brand>/`) |
| Evidence route | Where dated receipts are saved, tracked in Git or in the workspace |
| Rules and banned claims | The file the tracker's Rules section links |
| Facts and claims | Company facts and the claims reference |
| Content authority | Where each page's publication status and author are recorded |
| Measurement sources | The measurement guide, or the list of sources and how each is read |
| Approved spend | Where the paid-data allowance is recorded |

A project with two trackers has none: migrate first (see the end of this
file), then point at the survivor.

## Sections

1. **Header:** status, owner, last reviewed date and the pointers above that
   the tracker itself uses.
2. **Rules:** links to the project's rules, banned claims and rejected tactics,
   with at most a one-line summary each. The rules live in their owning file.
3. **Owner to-do:** only what the owner can do.

   | Item | Unblocks | Notes |
   | --- | --- | --- |

4. **Measurement baseline:** the latest reading per source, each line linked to
   its receipt. The weekly run replaces a line when a newer receipt exists.
5. **Task register:** the table below, optionally split into subsections by
   phase or theme (for example "Now", "At launch", "Build", "Distribution").
   Every subsection uses the same columns.
6. **Watch lists (optional):** URL-level queues such as an indexing cohort,
   with the URL, the observed state, the date read and the next action.
7. **Review log:** one dated line per run or decision, appended, never
   rewritten.

   | Date | Review | Outcome |
   | --- | --- | --- |

## Task register columns

| Column | Content |
| --- | --- |
| ID | A stable prefix and number (`SEO-012`). Never renumbered or reused. |
| Priority | `P0`, `P1` or `P2`, as the authoring rubric uses them. |
| Task | One action in one sentence. |
| Who | `agent`, `owner`, or a split such as `agent drafts; owner submits`. Any step the project reserves for the owner names the owner. |
| Status | One value from the vocabulary below. |
| Done when | The observable acceptance: what must be true, where. |
| Evidence | Links to receipts, PRs and records that support the current status, plus the reason when blocked or parked. |

Keep rows short. Long history goes in the review log or a linked receipt.

## Statuses

| Status | Meaning | Moves when |
| --- | --- | --- |
| `todo` | Not started; may be picked up when its inputs exist | Work starts |
| `in progress` | Work has started; the row names the next step | The agent's part finishes, or a blocker appears |
| `ready for owner` | The agent's part is finished and the owner-only step is waiting | The owner acts, with a receipt of the result |
| `monitoring` | The change is live and needs a later reading to close | A dated reading meets "Done when" |
| `blocked` | Cannot proceed; the evidence column says on what | The blocker clears |
| `parked` | Deliberately deferred; the evidence column says why and when to revisit | The owner or evidence reopens it |
| `done` | "Done when" is met and the evidence is linked | Only reopened by new evidence, as a new row or with a review-log note |

A status changes only when its evidence exists. Merged is not live and live is
not indexed: each step has its own receipt.

## Evidence receipts

A receipt is one dated file per reading, named
`<YYYY-MM-DD>-<source>-<topic>.md`, in the project's evidence route. It
records:

- the source, property and report read, and the account type used, never a
  credential;
- the exact window with inclusive and exclusive boundaries, the time zone,
  filters and when it was read;
- the readings, with units, denominators and the coverage or sampling limits
  the source declares;
- small raw exports beside it when they carry the evidence (CSV, not
  screenshots of numbers), with no personal data;
- the cost or units used, for a paid source; and
- which tracker rows it supports or changes.

Receipts are never edited to change a reading; a correction is a new receipt
that names the one it supersedes. A receipt cited by a row or the review log is
kept.

## What the tracker does not hold

- **Page publication status and authorship:** the project's content authority
  record owns them; a row links to it.
- **Facts, claims, voice and banned claims:** their owning files.
- **Commands:** the repository's scripts and verification guide.
- **Secrets:** nowhere in the tracker, receipts or reports.

## Migrating an existing tracker

When a project has earlier trackers (an action ledger and a growth playbook,
say, or a workstream plan), fold them into one file without losing evidence:

- **Keep IDs.** Existing prefixes such as `SEO-` and `GRW-` stay as they are,
  so every receipt, PR and review-log line that cites them still resolves. Rows
  from two prefixes can share one register; new rows take the prefix the
  project chooses.
- **Map columns.** A "Completion evidence" column becomes Evidence, verbatim. A
  missing "Done when" is written for open rows only, from the action and its
  evidence; closed rows keep their evidence text as their record. A missing
  "Who" defaults to `agent` unless the row names an owner step.
- **Map statuses.** `queued` becomes `todo`; `active` becomes `in progress`;
  `complete` becomes `done`; `monitoring`, `blocked`, `ready for owner` and
  `parked` keep their names. Any other vocabulary maps by the "Moves when"
  column above, and the review log records the mapping once.
- **Carry the history.** The old review log moves across unchanged and dated.
  Baseline sections become the measurement baseline, with their receipt links
  kept. URL queues become watch lists.
- **Leave receipts where they are.** Do not move evidence files; if a move is
  unavoidable, update every link to it and run the repository's link check.
- **Link, do not absorb.** Content authority, publication status and named
  author rules stay in their owning records and the recipe; listing kits and
  company facts stay in the facts file. The tracker links each.
- **Retire the old files** in the same change: delete them, or reduce each to
  a one-line pointer where outside links must keep resolving, and update the
  `AGENTS.md` or `PROJECT.md` pointer.
