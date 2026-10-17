---
name: doc-bench
description: Measure whether a repository's instruction page helps a fresh model find where things live, their exact names and the repository's departures. A scored bench, not a review.
---

# Document bench

A metric for one question: does a repository's instruction page help a fresh
model find its way? A model with no tools answers a fixed set of questions from
the page alone, and a script scores the answers against a key. It measures
navigation (where things live, exact names, where the repository departs from
the pattern a model expects), not code quality. It is kept separate from the
code-review benchmark, which scores review findings on real pull requests.

The method follows a bench reported in an X thread replying to Dex Horthy's post
on specs and code: seventeen questions, five runs each, where a short page of
names, bindings and departures beat both no page and much longer pages. No text
from it is carried here.

## Arms

A bench compares the same questions under up to three arms, each an answers
folder of that name:

| Arm | The runner is given |
|---|---|
| `none` | No document |
| `current` | The page or pages under test, at the key's pinned commit |
| `proposed` | An edited draft of those pages |

The scorer treats `none` specially; the other names are free, so two drafts can
be `proposed-a` and `proposed-b`.

## The key

One JSON file holds the questions, their answers and their split. The runner
never sees it; the scorer renders the prompt from it.

```json
{
  "format": "harness.docbench.key.v1",
  "subject": "harness",
  "commit": "<full 40-character commit>",
  "documents": ["PROJECT.md", "ARCHITECTURE.md"],
  "questions": [
    { "id": "where-01", "kind": "where", "split": "core",
      "question": "Which folder holds the shared role definitions?",
      "match": "exact", "accept": ["agents"] },
    { "id": "departure-01", "kind": "departure", "split": "core",
      "question": "Where does this repository keep X?",
      "match": "contains", "accept": ["Y"], "reject": ["the pattern's usual place"] }
  ]
}
```

- **Three kinds, about fifteen core questions:** five `where` (a path), five
  `name` (an exact file, command, identifier or setting) and five `departure`
  (a place the repository breaks the usual pattern, asked so the pattern's
  answer is wrong). Then five `heldout` questions across the kinds.
- **Answers come from the code at `commit`,** checked there, never from the page
  under test. An agent that does not write or edit the page writes the core
  questions (an explorer suits); a different agent writes the held-out ones.
- **The held-out split is the only guard against a page tuned to its
  questions.** Whoever edits the page gets the core questions and their results,
  never the key, the prompts or the held-out questions.
- **Every answer is short and exact.** `exact` accepts any listed spelling;
  list each real alternative. `contains` accepts an answer that includes a
  listed phrase and none of the `reject` phrases; put the pattern's default
  answer in `reject`, so a hedge naming both scores wrong.
- **Matching forgives form, not substance:** surrounding quotes and backticks,
  backslashes, letter case, a leading `./`, a trailing slash or full stop.
- The prompt numbers questions `q1` to `qn` in key order, so an id can be
  descriptive. Reordering or editing the key makes a new key: rescore every arm
  with it. A report records the key's SHA-256; compare only reports that share
  it.
- When the code moves, re-check each answer at a new pinned commit and update
  `commit` with it.

`check` validates a key: the pin, unique ids, each kind present in the core
split, held-out questions present, and the match fields.

## Where it is kept

Resolve the subject repository's routes with
[docs-workspace](../../docs-workspace/SKILL.md); the bench lives with the
subject, not with the harness. In that project's `artifacts` route:

```text
doc-bench/<page-set>/
  README.md               purpose, writer, model, release condition
  key.json                durable: the questions and answers
  <yyyy-mm-dd>/
    prompts/<arm>.txt     evidence: the exact text each arm was given
    answers/<arm>/<n>.txt evidence: one raw runner reply per run
    report.json           the scorer's output
```

`<page-set>` names the pages under test, such as `project-and-architecture`. The
prompts carry the page text, so they record exactly what was tested. The result
goes into a finding in the subject's `findings` route: scores per arm and kind,
confident wrong answers, the page lines changed and why, linking the dated
folder. Release the prompts and raw answers once that finding holds its numbers
and no comparison against them is pending; the key, README and reports stay.

## Running a bench

A bench sends the pages and questions to a model provider and spends the
operator's usage. Run one only under the operator's authorization naming the
provider and model, and record the first run's actual usage before any repeat
schedule.

`<bench>` below is `node <skills>/harness/scripts/doc-bench.mjs`.

1. Pin the commit and extract the current pages at it, for example
   `git -C <repo> show <commit>:ARCHITECTURE.md > <temp>/ARCHITECTURE.md`.
   Then `<bench> check key.json`.
2. Render one prompt per arm, each document passed with `--document`:
   `<bench> prompt key.json --document <temp>/ARCHITECTURE.md > prompts/current.txt`.
   The `none` prompt takes no `--document`.
3. Run each prompt five times, all questions in one call per run, with the same
   model and settings for every arm. The runner is the Claude CLI in print mode
   with every tool off, started from an empty folder outside any Git work tree
   so no project instructions load:
   `claude -p --tools "" --no-session-persistence --model <model> < prompts/current.txt > answers/current/1.txt`.
   No harness role can serve: every role has file tools and loads the user
   policy.
4. Score: `<bench> score key.json <date>/answers > <date>/report.json`.
   Exit 1 means a reply was unusable (a missing or repeated answer, an answer
   that is not text, no JSON, or a confidence that is missing or not high or
   low, even on "I don't know"); it is listed under `invalid` and left out of
   the score.
   Run that reply again rather than editing it.
5. An arm reporting `addRuns` has more than three questions right on only some
   runs (two or three of five); give it five more runs and score again.

**The user policy leaks.** Without `--bare`, the CLI still loads the user-level
`CLAUDE.md`, which imports the shared `AGENTS.md`; `--bare` skips it but signs in
only with an API key, not the subscription. For an application repository this
barely matters. For the harness itself the policy is harness content, so its
`none` arm is not empty: choose questions the user-level instructions do not
answer, or authorize `--bare` runs with an API key.

## Reading the report

- `score` is the share of answers right across all valid runs, and
  `confidentWrong` counts wrong answers given with high confidence. Report the
  two separately, overall and per kind and split. "I don't know" counts as
  neither.
- **A page passes** when it scores above `none` on every kind with no confident
  wrong answer on a departure.
- **`knownWithoutDocument`** lists questions `none` got right on every run. Lines
  that only teach those facts are deletion candidates; keep any reason they
  carry.
- **A confident wrong answer on a departure** marks a departure stated too
  flatly for the model's prior to yield. Restate it with the pattern named:
  "The pattern would put X here; this repository keeps it in Y because Z."
- **A held-out score well below the core score** means the page was tuned to its
  questions.
- **Noise.** With fifteen questions one answer is worth about 0.07. Five runs
  show whether a page beats no page and which questions fail; they cannot rank
  two drafts a question or two apart. Treat an arm difference under about 0.15
  as noise unless the same questions move in every run, and compare arms
  question by question on the same key.
- Answers come from the page alone; an agent with tools can still search, so a
  low score is a pointer, not proof the page fails in real work. Results hold
  for the model family that ran them, and confidence is self-reported.

The score can serve as [hillclimb](../../hillclimb/SKILL.md)'s metric while a
page is edited, with the held-out split as the check it never optimizes.

## Subjects

The first subject is the harness's own `PROJECT.md` and `ARCHITECTURE.md` at a
pinned commit. They are not rewritten; they change only where the bench shows a
misreading. The second is a web application's front end, because the harness is a prose
repository and cannot calibrate the bench for application code.
