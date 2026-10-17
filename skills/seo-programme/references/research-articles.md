# Research articles

The order and gates for research and data articles, including articles that
analyse a policy, plan, programme, report, monitor or public dataset. Run it
before drafting, and again when a draft has a weak introduction, only repeats
its sources, or treats an unanswered question as the end of the analysis. It
adds to the [authoring route](authoring.md) and, for a source-led article, the
[source-to-article pipeline](source-to-article.md); it replaces no step in
either. The recipe adds its house rules and names its data layers, opportunity
register and derivative skill.

## Required order

1. Establish the subject context.
2. Define what the research will add.
3. Scan the project's relevant data and analytical layers.
4. Decide whether missing data should be acquired, joined or handed to the
   opportunity register.
5. Freeze the evidence and perform the analysis.
6. Draft the canonical article.
7. Create social and other channel derivatives from the approved claims.

Do not draft a source summary and then look for an angle of our own. The
question, the data and the contribution decide the article.

## 1. Subject context

Record a short internal context card before outlining: the policy, plan,
programme, report or dataset; the responsible authority and upstream publisher;
what it governs, measures or changes; the geography and period; and the
practical decision it affects.

The title, standfirst and first two sentences must make sense to a reader who
has not seen the series (authoring's [draft answer-first](authoring.md#3-draft-answer-first)).
Keep the context short enough that the headline result still lands in the first
substantive paragraph.

## 2. Research contribution

Complete these internally:

```text
The source establishes ...
Our analysis will establish ...
This matters because ...
A reader can use the result to ...
```

If the second line only paraphrases the first, the article has not earned
publication. Add a defensible calculation, join, comparison, spatial pattern,
time comparison, normalisation, classification test, outlier explanation or
decision implication, or stop.

The public article keeps apart what the upstream source states, what we
calculated or inferred, what changes for the reader's decision, and what
remains unknown.

## 3. Data scan

Search the approved data and analytical layers the recipe names that bear on
the question. For each plausible input, record the upstream publisher and
dataset; grain, geography, vintage, coverage and key definitions; our storage,
join, calculation or mapping role; the distinct value it could add; approval and
reproducibility status; and the evidence ID or retained query receipt.

Use our data only when it sharpens the answer; never add a loosely related
metric for decoration or implied authority. Official sources stay authoritative
for their facts. If no suitable dataset exists, record why internally; the
article proceeds only if its independent contribution is still strong and the
owner accepts the missing enrichment.

## 4. Limitations become research decisions

For each material "cannot establish", ask in order:

1. Can our existing data answer or narrow it?
2. Can another available dataset, joined to ours, answer it?
3. Is there an external dataset worth acquiring because readers or product
   users would keep benefiting from it?
4. If none, what exact evidence would be required?

Analyse it now when current evidence and scope allow. Otherwise publish only the
precise residual limitation, and never promise that the product can answer it
unless the capability and coverage are verified.

## 5. Data-opportunity handoff

When the research exposes data that would improve recurring analysis, record an
opportunity for the data owner: the user question it unlocks; candidate
dataset, publisher, canonical URL, licence and access; grain, fields,
geography, coverage, vintage and cadence; likely join keys and the datasets it
would combine with; product and research uses; quality, privacy or provenance
constraints; the evidence IDs and the gap that exposed the need; and owner,
priority and status where the repository defines them. Use the opportunity
register the recipe names. Never mark a source approved, ingested or available
until its owner confirms it.

## 6. Public claim contract

Before release:

- the title names the topic and the strongest verified finding;
- the description says what was compared or analysed, why it matters and the
  decision context, adding information beyond the title;
- the pair passes `scope -> finding -> consequence` on its own, with every
  reference ("the gap", "this state") named in the same layer;
- the standfirst names the source, plan or programme it analyses;
- the title, description, opening takeaway, chart claims and social claims each
  resolve to evidence IDs;
- no public copy carries process notes: rejected queries, unused datasets or
  internal assessments stay in the packet; and
- the article establishes something useful beyond the upstream source.

The recipe adds its house rules to this list. Block the publication
recommendation when any item fails. Report a rule the repository tooling does
not automate as a manual release gate rather than passing it silently.

## 7. Article and social authority stay separate

Draft the canonical article and settle its evidence before any channel copy.
Derivatives use the same evidence IDs, caveats and canonical backlink, through
the derivative skill the recipe names. Creating channel copy or a visual leaves
each asset in draft; it neither approves the article nor authorises posting.
