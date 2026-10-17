# Source to article

The project-neutral pipeline that turns a small set of authoritative sources
into source-linked canonical articles and channel derivatives, without becoming
an auto-blogger. The method lives here; the brand recipe supplies the project's
values for it (see [what the recipe supplies](#what-the-recipe-supplies)).

It feeds the [authoring route](authoring.md), which owns drafting, the unslop
pass and claim verification. Research and data articles also follow
[research articles](research-articles.md). The [reference guide](reference-guide.md)'s
"Research-to-article and social bundles" section is the standard for the
packet, the bundle and its renders.

## Outcome

```text
source discovered -> evidence packet frozen -> current status verified ->
editorial value assessed -> canonical article drafted -> derivatives produced ->
review passed -> separately approved release -> source status monitored
```

The canonical web article is the public source of truth. A social post,
newsletter, chart or carousel derives from the same evidence packet and links
back to the article. No derivative introduces a stronger claim, a newer status
or a product capability the article does not support.

Never:

- crawl the open web, generate keyword variants or publish on a quota;
- publish, deploy, notify a search engine, send a newsletter or post because a
  run created a draft;
- describe a source's status beyond what is proven, such as a recommendation as
  adopted policy, or modelled capacity as delivered outcomes; or
- recreate a chart by estimating values from its pixels.

## Keep the statements separate

Every record keeps four statements apart:

1. **Source fact:** what the publication, dataset, instrument or page says.
2. **Current status:** where the source or the thing it describes stands now,
   using the lifecycle values the recipe names. Record `unknown` rather than
   inferring a transition.
3. **Our interpretation:** what the evidence may mean for the defined reader,
   labelled as analysis rather than source authority.
4. **Product capability:** only behaviour verified against current production
   or an owner-approved product decision.

A source's lifecycle describes the outside world; it never replaces the
project's own content states. Authorship, claim verification, product-owner
confirmation, visual approval, publication, deployment, posting and webmaster
notification stay separate decisions under the recipe's authorship policy.

## Stages

| Stage | Action | Durable output | Stop when |
| --- | --- | --- | --- |
| 1. Register | Add or verify a publisher, canonical collection, jurisdiction, source type and expected cadence. | Source record or a proposed change to it. | Publisher authority or the canonical surface is unclear. |
| 2. Discover | Inspect feeds, APIs, sitemaps, official indexes and known document libraries. Use search only to find the primary source. | Candidate URL, discovery time and discovery path. | Only commentary or an inaccessible secondary source exists. |
| 3. Canonicalise | Strip tracking parameters, connect landing page and payload, deduplicate versions and record predecessors and successors. | One canonical source identity with its related files and pages. | Versions cannot be ordered confidently. |
| 4. Freeze evidence | Record retrieval time, checksum, page count, page-level claims, tables, figures, method, limitations and licence. | Immutable [evidence packet](#evidence-packet). | A material number has no inspectable source location. |
| 5. Verify status | Search later official instruments, announcements, guidance, corrections and version histories. | Current status with checked date and supporting source IDs. | Official sources contradict each other on the current state. A later state (adoption, commencement, implementation) that cannot be proven is recorded `unknown` and goes on to scoring, which can route it to `watch`. |
| 6. Score | Assess the candidate as [scoring and routing](#scoring-and-routing) sets out. | A route: `article`, `social-only`, `watch`, `archive` or `reject`. | The item adds nothing beyond summarising the source. |
| 7. Brief | Define one reader, one task, canonical intent, content type, evidence object, named author, change triggers and success measure. | A content brief ready for review. | Intent overlaps an existing page, or no suitable named author is available. |
| 8. Compose | Draft the canonical article first under [authoring](authoring.md), derive the visual specification and channel copy from its settled claims, then run the [unslop](../../writing/unslop/METHOD.md) pass. | Content bundle with shared evidence IDs. | A derivative adds an unsupported or stronger claim, or the polish changes an evidence-bound fact. |
| 9. Verify claims | Audit the exact polished wording under authoring's [verify the release claims](authoring.md#5-verify-the-release-claims). | A claim record with `verified`, `corrected`, `narrowed` or `blocked` for every consequential claim. | A material claim cannot be traced, repeated at the stated level, sanity-checked or explained. |
| 10. Review | Run factual, source, licence, product, editorial, search, accessibility and visual checks on the verified copy. | Findings, corrections and dispositions against the exact release copy. | Any P0 blocker or required owner gate remains open. |
| 11. Release | Publish or post only the exact approved artefacts (see [release record](#release-record)). | URL, commit or deployment, platform and posting receipts. | Approval is absent, stale or does not identify the exact artefact. |
| 12. Refresh | Recheck due items, changed sources, corrections, status transitions and article performance. | A refresh disposition, change note and truthful `dateModified` if revised. | The source is unchanged and no substantive update is needed. |

## Sources

### Register and priority

Start with a small register of high-value sources the recipe names, and expand
it only after the first runs produce useful, reviewable material. The recipe
fills each tier with its own publishers:

1. **Primary authority:** legislation, regulators, official policy and plans,
   and official datasets in the project's domain.
2. **Official research and statistics:** government research bodies and
   statistical agencies.
3. **Independent research:** peer-reviewed work, universities and established
   policy or industry bodies, used as analysis or corroboration, never as a
   substitute for an available primary source.
4. **Discovery signals:** newsletters, social posts and media coverage. These
   can open an investigation; they are not normally the cited authority.

### Retrieval order

For each source:

1. use the publisher's feed, API, sitemap, dataset service or document index;
2. retrieve the canonical official page and its linked file directly;
3. use web search to find a missing primary source or a later official status;
4. use the project's document tooling for page-aware text, table, figure and
   licence inspection;
5. use a controlled browser only for dynamic or difficult official pages; and
6. record an unavailable state rather than bypassing access controls or
   substituting unsourced text.

### Discovery signals are not evidence

Bookmarks, social posts, newsletters and practitioner threads can show which
questions are worth investigating. Popularity, engagement and author reputation
do not make a claim fit to publish or implement. Promote a signal into the
source register, a series ledger or a change proposal only after its primary
source, the project's current state and a measurable baseline have been
checked. Discovery, verification, experiment, drafting and release stay
separate decisions.

## Evidence packet

Each candidate gets one packet. The project's public source registry stays the
authority published content cites; detailed lifecycle, licensing, checksums and
page-level claims belong in the packet, not flattened into a registry field.
Field values such as jurisdiction, source type and lifecycle come from the
recipe.

```yaml
packet_id: stable-local-id
checked_at: ISO-8601 timestamp with offset
source:
  publisher: exact publisher name
  title: exact publication title
  canonical_url: tracking-free official landing page
  payload_url: official PDF, dataset or document URL
  publication_date: YYYY-MM-DD
  source_type: one of the recipe's source types
  jurisdiction: [the recipe's jurisdiction values]
  version: explicit version or checked-current position
  checksum: sha256 for every frozen file
status:
  lifecycle: one of the recipe's lifecycle values, or unknown
  checked_at: ISO-8601 timestamp with offset
  supporting_source_ids: []
claims:
  - evidence_id: claim-001
    statement: faithful claim in our words
    source_location: page, table, figure, clause or heading
    evidence_type: text | table | figure | dataset | provision
    denominator: explicit or not-applicable
    unit: explicit or not-applicable
    geography: area the figure covers, or not-applicable
    period: reference period or point in time, or not-applicable
    sample: sample, cohort or population, or not-applicable
    method: how the source produced the figure, or not-applicable
    assumptions: [stated assumptions, or empty]
    exclusions: [analytical exclusions, or empty]
    qualifier: modelled, estimated, observed, statutory or guidance
claim_verification:
  checked_at: ISO-8601 timestamp with offset
  release_copy_digest: sha256 of the exact polished bundle
  results:
    - evidence_id: claim-001
      disposition: verified | corrected | narrowed | blocked
      calculation: source transcription or named formula
      aggregation_weighting: explicit or not-applicable
      independent_check: second calculation, source comparison or boundary
      sanity_check: total, ordering, sample size, scale or outlier explanation
limitations: []
licence:
  code: exact licence or all-rights-reserved
  attribution: exact required wording
  exclusions: branding, third-party material, people or other exclusions
relationships:
  predecessors: []
  successors: []
  corrections: []
```

Keep printed page numbers separate from file page index when they differ. A
landing page and its PDF are related, not duplicates: the landing page usually
carries canonical identity and publication metadata, the PDF the page-level
evidence.

## Scoring and routing

Score each candidate 0 to 2 on: authority and source quality; defined reader
impact; distinct information or interpretation; the project's own evidence
advantage; visual or data potential; connection to a current product or method
truth; maintenance burden; and claim, licensing and professional risk.

The score is a triage aid, not publication authority. Record a reasoned route:

- **Article:** strong source, clear reader task, distinct analysis and a
  defensible evidence object.
- **Social-only:** one useful, bounded signal that does not justify a new
  canonical URL. Link an existing page only when it genuinely answers the next
  question; never manufacture a destination.
- **Watch:** a consequential source whose status is not yet settled.
- **Archive:** useful internal context with no current public angle.
- **Reject:** weak, duplicate, unverifiable, improperly licensed or outside the
  author's competence.

## Canonical article and derivatives

Choose the existing content type whose reader contract fits; the recipe names
them. A summary of someone else's report is not original research: a
source-led change analysis is usually an update or insight unless the project
performs and discloses its own analysis and how readers can check it. The
article's shape follows the reference guide's "Conclusion-first research
contract" and the recipe's article layout.

Define one primary visual claim before choosing a chart type. Beyond the
reference guide's bundle rules:

- every plotted value points to an evidence ID and a source table, figure,
  field or text statement;
- redraw the information in the project's own design system; never reuse a
  publisher's logo, excluded stock image or third-party artwork;
- lead with the finding, not the report title or an acronym, and add one
  sentence on how to read the visual when the encoding is not self-evident;
- use direct labels and at least one non-colour cue for the focal value; and
- the article figure, any index graphic and the social asset are separate
  compositions bound to the same evidence IDs.

Default to the smallest coordinated bundle the evidence supports: the canonical
article, one post per channel the recipe names, one feed visual and the
article's existing social image. Regenerate channel copy when the canonical
claim or status changes; a short post may drop detail, never a caveat the claim
needs to stay true.

## Release record

Release is an executor action, separate from discovery and drafting. An
approved release record names:

- the exact article commit and canonical URL;
- the exact image checksum and alt text;
- the exact channel copy;
- the destination platform and account;
- the approved publish or post time;
- whether deployment, search-engine notification, newsletter sending and each
  social post are authorised; and
- the approver and the approval time.

The executor stops if any artefact changed after approval. It never decides a
draft is ready, and never widens an approval from one channel to another.

## Refresh

When a registered trigger fires or a review date falls due, recheck the source
and record one disposition: `no-change`, `review-required`,
`correction-required` or `superseded/withdrawal-review`. `dateModified`
changes only with an approved substantive public revision.

## Content-series ledger

When one source corpus supports several distinct reader tasks, keep the
programme in a repository-backed series ledger rather than a chat transcript,
and do not draft every article at once. A series holds:

- a corpus record of official payload URLs, version, retrieval time, page
  counts and checksums, with large binaries kept out of Git and refetched and
  hash-checked before reuse;
- a ledger of the ordered article queue: canonical intent, reader, question,
  unique contribution, source locations, dependencies, evidence object, method
  boundary, visual concept, refresh triggers and next action;
- corpus-wide research notes, with working hypotheses labelled as such; and
- a per-item evidence packet, added only when that item's evidence work begins.

The ledger is planning authority, not public content or release authority.
Evidence, brief, article, visual, social, review and release states stay
separate, and advancing one never advances another. Series membership does not
authorise drafting: drafting acts only on an item whose brief state the recipe
marks approved for draft. An active series has one next or active item. An
article waiting on data stays in the ledger as dependency-blocked, with its
missing inputs named; never delete it for lack of data, and never unblock it by
estimating values from a rendered chart or map. Run the recipe's ledger check
after every change.

## Scheduled runs

A scheduled run is bounded: it receives an explicit source register or a list
of due records, never an open-ended crawl. Test a run's prompt by hand and
review its first runs before scheduling it. A run that may write works in an
isolated worktree so it cannot collide with unfinished local work, with the
narrowest network and file access that completes it. Four lanes cover the
pipeline; the recipe says which it has configured:

- **Source sweep:** inspect only the registered sources due, create or update
  packets for new or changed sources, verify status and score. No article,
  publication or post follows merely because a source is new. Start weekly;
  move a small, proven primary-authority subset to a daily check only when
  real change frequency justifies it.
- **Approved-candidate drafting:** process only ledger items approved for
  draft. Draft the article first, derive the visual specification and channel
  copy from its evidence IDs, run unslop once the structure is complete, then
  verify the exact polished claims. Keep everything in draft, run the project's
  content and documentation checks, and return the files, source coverage,
  P0 and P1 findings and remaining owner gates.
- **Refresh queue:** the [refresh](#refresh) step for due items.
- **Approved release:** acts only on an exact [release record](#release-record).

No lane publishes, deploys, pushes, merges, notifies a search engine, sends or
posts as a side effect.

## Golden fixture

Prove the pipeline end to end on one real source before relying on it. Record
the fixture's verified facts with their checked date, page locations, checksum
and licence. The run passes when it:

- keeps the landing page as canonical identity and the payload as page-level
  evidence;
- preserves disclaimers, modelling qualifiers, printed and file page numbers,
  method limits, checksum, licence and exclusions;
- distinguishes the source's finding from any later official position;
- connects only to current, approved product capabilities;
- produces an article, visual specification and short channel copy carrying
  the same bounded claim;
- leaves every output in draft until its owner gates pass, then advances only
  the explicitly approved channel; and
- creates refresh triggers for guidance, amendments, corrections and
  superseding evidence.

## What the recipe supplies

A recipe fills each slot with repository paths, or reports it as **not yet
migrated**; the shared steps still run without it.

- Source registry and priority list, with source types, jurisdictions and
  lifecycle values.
- Routes and content types.
- Series ledger location and its check command.
- Scheduled lanes configured.
- Golden fixture and its acceptance record.
- Voice guide.
- Claims reference and banned claims.
- Design authority and article layout.
- Authorship and review policy.
- Data layers and the opportunity register.
- Derivative and social skill, and the channels it serves.
- Release commands.
