# Authoring a page

Create people-first, answer-first content that is valuable enough to rank,
clear enough to retrieve, substantiated enough to cite and distinctive enough
to recommend. SEO and AEO are one evidence-led publishing discipline, not two
systems.

This route layers on [writing](../../writing/SKILL.md): writing settles the
deliverable, the style authority and the drafting stance for articles, and this
route adds the search, evidence and release layer. It never replaces writing's
article guidance.

## Load authority before acting

- The project's `AGENTS.md` and nearer instructions for the files in scope, and
  the brand recipe's authoring parts for this kind of page (research order,
  layout rules, release commands, authorship policy).
- The page's current metadata, content source and the project's content
  authority record for its publication status.
- The [reference guide](reference-guide.md) sections the steps below name.
- Current primary sources and repository evidence outrank the guide when a
  factual detail has changed. Use [research](../../research/SKILL.md) when a
  consequential or time-sensitive claim cannot be proven locally.

## Choose the mode

- **Brief:** define the reader, task, canonical intent, evidence, author,
  currency and success measure before drafting.
- **Author:** create or rewrite a page and its metadata from verified sources.
- **Audit:** assess an existing page without presuming it needs more words.
- **Release check:** verify rendered HTML, discovery, schema, accessibility,
  crawler policy and publication state. Never publish as a side effect.

State the mode and the files or URLs in scope.

## 1. Prove the page deserves to exist

- Name one real reader and one primary task or question.
- Search the site's existing content for intent overlap and cannibalisation.
- Define what this page uniquely contributes: primary evidence, expert
  interpretation, a worked example, a product specimen, research or a change
  analysis.
- Reject keyword permutations, generic summaries, orphan pages and pages that
  would not be useful without search traffic.
- For research and data articles, define the contribution before drafting. A
  source recap is not original research: the planned analysis must establish
  at least one useful result, relationship, boundary or decision implication
  the source does not state. [Research articles](research-articles.md) sets
  the order of these gates; the recipe adds its house rules.
- For an article built from a report, plan, dataset or monitored source, run
  the [source-to-article](source-to-article.md) pipeline: it registers,
  freezes, verifies status, scores and briefs before this route drafts.

## 2. Build the evidence packet

- Prefer legislation, regulators, official datasets and vendor documentation;
  use secondary sources only when they add necessary analysis.
- Record jurisdiction, effective date or data vintage, checked date, scope,
  assumptions, exclusions and limitations.
- Keep official fact, our interpretation, product behaviour, worked example and
  research finding separate.
- Verify product claims against the code or a product-owner decision. Never
  infer deployed capability from a mock-up, roadmap, type or dormant code.
- Never invent experience, tests, statistics, quotations, author competence,
  customer outcomes or source currency.

The guide's "Evidence, citations and programmatic-content guardrails" section
lists what a packet records; [source-to-article](source-to-article.md#evidence-packet)
holds the full packet schema for a source-led article.

## 3. Draft answer-first

- Align the title, H1, opening answer, URL intent, description and evidence.
- Put the useful answer in the first substantive paragraph.
- In a series or source-led article, the first two sentences name the policy,
  plan, programme or research object, its responsible authority, what it does
  and the geography, period and decision context where needed. Never open on an
  appendix, table, figure or derived metric that assumes the reader knows the
  series.
- Open the body with one bounded headline takeaway, not a scope note, status
  summary or review boilerplate.
- Write research conclusion-first: answer, context, evidence, interpretation,
  implications, then verification. Design it for the 30-second, three-minute
  and technical reader (the guide's "Conclusion-first research contract").
- Apply the standalone story contract, `scope -> finding -> consequence`, to
  every research title, description, standfirst, chart heading and channel
  derivative. Test the title and supporting sentence away from the article, and
  reject free-floating references ("the gap", "this state") unless the same
  reader layer names the thing.
- Use claim-led H2 and H3 headings. A reader who scans only the headline,
  standfirst, findings, headings and captions should follow the argument. Keep
  most paragraphs to two to four sentences with one job each.
- Once the organisation is established as author or analyst, prefer "we" and
  "our"; do not repeat the brand name for keyword reinforcement.
- Use tables only for real relationships or comparisons, and lists only when
  sequence or grouping matters.
- Keep critical conclusions in HTML text or a table, never only in an image,
  animation, chart, map, PDF, accordion or hover state.
- Answer before selling: a guide must stay useful if every call to action
  disappears.
- Avoid vague superlatives ("best", "leading", "most accurate"), arbitrary word
  counts, keyword density and artificial FAQ variants.

## 4. Polish with unslop

- Settle the evidence and section order first; polish does not rescue a weak
  claim, missing evidence or unresolved structure.
- Run [unslop](../../writing/unslop/METHOD.md) over the title, standfirst, headings,
  body, captions, metadata and channel copy.
- Preserve quoted text, official source and dataset titles, evidence IDs,
  numbers, units, dates, place names, legal terms and source-defined wording.
  Never make a claim stronger, broader or more certain to make it read better.

## 5. Verify the release claims

Verify the exact polished prose, not an earlier draft.

- Build a claim audit for every consequential statement in the article,
  metadata, captions, charts, maps and channel derivatives. Link each to an
  evidence ID with a disposition: `verified`, `corrected`, `narrowed` or
  `blocked`.
- For each quantitative claim, state the measure, unit, geography, period,
  cohort, denominator, aggregation, weighting, rounding and source vintage.
  Distinguish a total or weighted rate from an unweighted median or mean across
  local rates.
- Recalculate derived values from frozen inputs with a second implementation
  where the evidence permits. A matching checksum proves identity; it does not
  replace a second calculation.
- Run at least one order-of-magnitude or aggregate sanity check, and explain an
  extreme value from its numerator and denominator before calling it an
  outlier.
- When the packet lacks the rows to repeat a calculation, record that boundary
  and narrow the public wording to what the retained evidence supports.
- Stop on a material mismatch, ambiguous denominator, unsupported precision or
  unexplained outlier. Correct the packet and every derivative before the page
  goes to the release decision.

## 6. Add original evidence and boundaries

- Include at least one defensible first-party evidence object suited to the
  page: worked example, decision tree, annotated specimen, benchmark, method
  table, map explanation, dataset or change analysis. Label fictional or
  assumed examples beside the example.
- Keep denominators, units, sample sizes, periods and known confounders with
  quantitative statements, and put each limitation beside the result it
  qualifies.
- Keep editorial process out of public copy: no rejected queries, unused
  datasets or internal assessments. Record them in the internal packet.
- Do not let "what it cannot establish" end the research. Test whether current
  data, a joined dataset or a useful new source can answer it; analyse it when
  scope allows, otherwise record the exact missing data and the decision it
  would unlock. Publish only the genuine residual limitation.
- For regulated topics, narrow the page to the author's evidenced scope, state
  where project-specific professional judgement begins and keep source, claim,
  product and release decisions separately inspectable. Whether a reviewer is
  required is the recipe's policy, not this route's.
- Structure each principal finding as claim, evidence, interpretation,
  consequence and material qualification, and separate observation, inference
  and recommendation.
- Use evidence verbs precisely: `verify` a published value, `recalculate` from
  an exposed formula and inputs, `reproduce` only when data, transformations and
  method are all available.
- Put the full method after the conclusion. Name the upstream publisher and
  dataset before the tool or database that processed it, and never relabel
  official data as your own.
- Every visual answers a defined analytical question with a claim-led title, a
  scope-and-unit subtitle, descriptive alt text, a source note and the material
  qualification. Use a map only when location changes the interpretation, with
  an accessible value table from the same frozen packet.
- A brand connection is optional, specific and earned: name a concrete
  capability only after the evidence has established value.

## 7. Connect the entity and topic graph

- Link the page from a meaningful indexable hub before publication.
- Link up to its hub, across to the next useful question and into the relevant
  product or methodology page with descriptive anchors.
- Link the visible author to a stable profile page when that profile is
  approved and indexable.
- Never create hidden, orphaned or mass-generated ranking pages; a sitemap does
  not replace contextual discovery.

The guide's "Information architecture, URLs and internal linking" section
holds the URL and link rules.

## 8. Align metadata and schema

- Require a unique title and factual description, one H1, a clean canonical
  URL, truthful dates, a representative social image and descriptive alt text.
- For research, the title carries the topic and strongest verified finding; the
  description names the comparison and its reader payoff and adds information
  beyond the title. Block release when the pair fails
  `scope -> finding -> consequence` on its own.
- A hub or index description is a reader promise: what the article compares or
  tests and what the reader will learn, never a generic abstract.
- Mark up only visible, verified facts with stable entity IDs; keep Article,
  Person or ProfilePage, BreadcrumbList and organisation references consistent.
  Schema is semantic and rich-result support, not an AI citation lever.
- Keep draft and preview routes `noindex` and out of the sitemap, feeds,
  IndexNow and static generation.

The guide's "Metadata, schema and author/entity markup" section holds the
standard and an entity-graph example.

## Audit rubric

Score every page on six dimensions. Report evidence and an exact correction for
each failure; do not reward volume.

1. **Intent and distinct value:** one recognisable task, no overlap, useful
   without search traffic.
2. **Answer and retrieval clarity:** answer-first opening, descriptive
   headings, retrievable sections, semantic HTML.
3. **Evidence and currency:** consequential claims sourced nearby; dates,
   jurisdiction, assumptions and limitations explicit.
4. **Original authority:** meaningful first-party evidence, expert reasoning,
   product specimen or reproducible method.
5. **Entity and discovery:** truthful author and product identity, contextual
   internal links, canonical hub path.
6. **Publication integrity:** unique metadata, matching schema, accessible
   rendered page, correct draft, discovery and crawler state, truthful
   freshness.

Classify findings:

- **P0 blocker:** false or unsupported claim, wrong jurisdiction or date,
  missing author authority, thin or duplicate intent, accidental indexing,
  broken canonical or discovery, inaccessible core answer, or a schema and
  content mismatch.
- **P1 improvement:** weak direct answer, vague heading, distant evidence,
  missing internal context, unclear limitation or unhelpful metadata.
- **P2 polish:** wording economy, scanability or optional presentation gains.

Prefer removing or narrowing weak material over padding it. Never change a
draft, product-owner or publication status because the prose improved.

## Release check

Run the release commands the recipe names, against the repository's own
definitions. Then confirm:

- raw HTML contains the critical answer, metadata and matching JSON-LD;
- one H1 and a coherent heading order;
- no overflow or hidden core content at desktop, tablet and phone widths;
- keyboard and accessibility-tree roles, names and states are correct;
- public pages return `200`, and drafts and preview routes stay excluded;
- sitemap, feeds, IndexNow and revalidation match publication state;
- robots, CDN or WAF rules and the approved crawler policy agree;
- the recipe's authorship, product-owner and release gates are each satisfied
  on their own;
- channel derivatives carry the same evidence IDs and caveats and stay in draft
  until separately approved; and
- deployment, webmaster submission, publication and outreach have explicit
  authority before any external change.

The guide's "Publishing checklist" is the long form, and its "Crawler
governance and agent-friendly UX" section covers the crawler and accessibility
rows.

## Final author test

Recommend publication only when every answer is yes:

1. Does the page solve a real problem better than existing material?
2. Does it contain evidence, expertise or information genuinely ours?
3. Can a retrieved section be understood without invented context?
4. Can a reader verify every important factual claim?
5. Are the author, entity and applicable date unmistakable?
6. Would we still publish it without rankings or AI citations?

End with a page-by-page verdict, the remaining owner and external gates, and
the exact validation evidence, keeping local proof, browser proof, deployed
proof and post-publication measurement distinct.
