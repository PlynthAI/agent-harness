---
name: seo-programme
description: "Author, audit or release-check a site page for search and AI answers, or run a site's weekly SEO/AEO programme: reconcile its tracker, measure, do one allowed task, report. Use for SEO, AEO, metadata, schema, indexing and site articles. Prose with no search goal stays with writing."
metadata:
  group: records
---

# SEO programme

One evidence-led method for pages that should rank, be retrieved and be cited,
and one weekly run that keeps a site's search work moving without a handoff.
The method lives here. Each repository keeps its live state, and a brand recipe
inside this skill carries the parts of the workflow that differ by brand.

## Load the project first

1. Read the repository's `AGENTS.md` and `PROJECT.md`. They name the project's
   one tracker, its rules and banned claims, company facts, claims reference,
   measurement sources, evidence route, checks and owner-only actions. When one
   of these is not named, report the gap; never substitute a guessed path.
2. Load the brand recipe the repository names from `recipes/`. A project with
   no recipe runs the shared core alone and reports its brand steps as not yet
   migrated.
3. When sources disagree, current primary sources win on a changed fact, then
   the repository's own facts and rules, then the recipe, then this skill and
   its reference guide.

**What stays in the repository:** live state, the tracker, facts, claims,
commands and secrets. A recipe points at them by the paths the repository
names and says which repository commands make up a check; it never copies
them. The ownership rule is design's
[project workflows](../design/references/project-workflows.md).

## Choose the route

| Request | Read |
| --- | --- |
| Brief, draft, rewrite, audit or release-check a page | [Authoring](references/authoring.md) |
| Research or data article | [Research articles](references/research-articles.md), then authoring |
| Turn a report, plan, dataset or monitored source into an article and derivatives, or set up its scheduled runs | [Source to article](references/source-to-article.md), then authoring |
| The weekly run, or "what is next on SEO" for a site | [Weekly programme](references/weekly-programme.md) |
| Set up, read or migrate a project's tracker | [Tracker contract](references/tracker-contract.md) |

The [reference guide](references/reference-guide.md) is the detailed standard
both routes cite: page templates, URLs and links, metadata and schema, crawler
policy, evidence and programmatic-content gates, measurement and the publishing
checklist. Read the section a step names, not the whole guide.

## Standing rules

- Owner-only actions stay with the owner: creating accounts, signing in,
  accepting terms, pressing submit and merging. Agents draft everything else
  and hand it over finished.
- Publication, deployment, outreach and search-engine submissions happen only
  where the project's rules grant them. A passing check is not that grant.
- Paid data (rank tracking, keyword volumes, backlink APIs) is used only within
  the spend the project has approved, and each pull records what it cost.
- Never print, log or commit secrets, tokens or decrypted environment values.
  A receipt names the property and account type it read, never a credential.
- No link schemes: paid links, link exchanges, give-to-earn networks or bulk
  directory submissions. No scaled or thin pages, and no page that exists only
  to catch a query variant.
- Authorship and review follow the recipe's stated policy. The core adds no
  reviewer role or gate, and removes none the recipe names.

## Hand on

- Drafting and voice belong to [writing](../writing/SKILL.md); authoring
  layers its search and evidence rules on writing's article row.
- [unslop](../writing/unslop/METHOD.md) is the finishing pass on every page, before
  claim verification.
- Page composition goes through [design](../design/SKILL.md) under the
  project's design authority; the rendered page is proven with
  [browser-verification](../browser-verification/SKILL.md).
- Receipts and findings go where [docs-workspace](../docs-workspace/SKILL.md)
  routes them, unless the repository names a tracked evidence route.
- The weekly draft PR uses [delivery](../delivery/SKILL.md)'s commit and PR
  steps only; merging stays with the owner.
- A claim that needs current outside sources goes to
  [research](../research/SKILL.md).

## References

- [references/authoring.md](references/authoring.md): the page workflow, audit
  rubric, release check and final author test.
- [references/research-articles.md](references/research-articles.md): the order
  and gates for research and data articles.
- [references/source-to-article.md](references/source-to-article.md): the
  pipeline from source to canonical article and derivatives, the series ledger,
  scheduled runs and the slots a recipe fills.
- [references/weekly-programme.md](references/weekly-programme.md): reconcile,
  measure, one task, report.
- [references/tracker-contract.md](references/tracker-contract.md): the one
  tracker each project keeps, and how older trackers migrate into it.
- [references/reference-guide.md](references/reference-guide.md): the detailed
  SEO/AEO standard.
- `recipes/<site>/recipe.md`: one brand recipe per site, with any layout file
  it names beside it (`recipes/<site>/article-layout.md`).
