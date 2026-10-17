# Literature protocol

[research](../../../research/SKILL.md) retrieves and reads; this file sets what
is searched, how it is logged and how it becomes synthesis. Identifiers and
validation follow [citations](../../citations/METHOD.md); the log, exports and
extraction table go where [docs-workspace](../../../docs-workspace/SKILL.md) routes them.

## Question and criteria

- Write the review question in one sentence. Design research rarely fits an
  intervention frame (PICO); use concept, context and, where relevant, population
  (PCC) instead, and keep PICO for questions that compare interventions.
- Name the review type: narrative, integrative, critical, scoping or systematic.
  The type sets how much of the protocol below the venue will expect to see.
- Fix the criteria before searching. A later change is logged with its reason.

| Criterion | Settle |
| --- | --- |
| Period | Start and end years, and why |
| Language | English only, or which others |
| Publication types | Journal, conference, book, thesis, grey literature |
| Setting | Region, building or project type, scale (building, precinct, city) |
| Method | Empirical, design research, review, theory; any to exclude |

## Five passes

Run each pass and log it. A literature section built from one pass reads as partial.

| Pass | Finds | Use |
| --- | --- | --- |
| Recent primary studies | Work from roughly the last five years | Current state; what reviewers will expect to see cited |
| Reviews and surveys | Existing syntheses | A map and seed list; read their primary sources before citing a claim |
| Seminal work | The concepts the field keeps citing | Backward citation chaining from the reviews and recent studies |
| Methods | Sources for the approach this paper uses | Justify the method in the field's own terms |
| Contradictory or null | Counter-evidence, failed projects, critiques | The counter-position the argument must answer |

## Where to search

| Source | Covers | Note |
| --- | --- | --- |
| Scopus | Broad; AEC journals and many proceedings | Good exports and counts |
| Web of Science | Core journals | Forward and backward citation chaining |
| Avery Index to Architectural Periodicals | Architecture and design periodicals | Finds work the general indexes miss |
| CumInCAD | CAADRIA, eCAADe, ACADIA, SIGraDi and related computational design proceedings | The record for computational design and BIM conference work |
| ACM Digital Library, IEEE Xplore | AI, HCI and computing in design | For AI in architecture and human-centred tools |
| Google Scholar | Wide recall, theses, books | Not reproducible; log as supplementary and record how many results were screened |
| OpenAlex | Open metadata with an API | Through [citations](../../citations/METHOD.md) |
| Grey literature | RIBA, AIA, UK and Australian government and local authority reports, industry bodies and standards (for example buildingSMART and ISO 19650 for BIM) | Label it as grey literature and appraise it like any source |
| Theses and books | Institutional repositories, ProQuest Dissertations, library catalogues | Theses often hold the design-research detail papers omit |

## Search log

Build each string from two to four concepts: synonyms joined with OR inside a
concept, concepts joined with AND, truncation where the database supports it.
Field tags differ between databases, so adapt the string for each and log
every version.

| Date | Database (interface) | String | Fields | Filters | Results | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | Scopus (Elsevier) | The exact string run | Title, abstract, keywords | Years, language, document type | n | Export file name |

One row per run, reruns, citation chaining and hand-found sources included.
Save each export (RIS or BibTeX) beside the log and import it into the reference manager.

## Screening

Screen in passes and keep the count at every step.

| Stage | Count | Notes |
| --- | --- | --- |
| Records identified, per database | n | From the search log |
| Duplicates removed | n | By DOI, then title and year |
| Screened on title and abstract | n | |
| Excluded at title and abstract | n | |
| Full texts sought / not retrieved | n / n | Name what could not be obtained |
| Full texts assessed | n | |
| Excluded at full text, with reasons | n | One reason per exclusion |
| Included, plus added by chaining | n + n | |

A systematic review for a venue that expects it reports these counts as a
PRISMA 2020 flow diagram from the official template, keeping records, reports
and studies distinct. Otherwise this table is enough. A review that calls
itself systematic has a second screener, or a second check on a sample, and
says so.

## Extraction

Extract from the full text, never from the abstract alone.

| Key | Type | Setting | Method | Findings or argument | Concepts | Limitations | Relevance | Quality |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Citation key | Empirical, design project, review, theory, grey | Country, building type, scale | As reported | In the source's terms | Themes it feeds | As the authors state and as you see them | To this paper's claim | Appraisal note |

Appraise with a tool that fits the source, such as CASP for qualitative studies
or MMAT for mixed methods, and keep its judgement rather than a single score.

## Synthesis and gap

- Organise by theme or concept, not source by source. Within each theme compare
  and contrast, say where sources agree and disagree, and name the strongest
  evidence.
- Use a narrative order where the development of an idea is the point.
- A concept matrix (sources against themes) shows coverage and thin areas.
- Say how much rests on single cases, practice reports or grey literature.
- State the gap: what is not known, why it matters and how this paper addresses
  it. Name its kind (empirical, methodological, theoretical, contextual such as
  community settings or the Global South, or between research and practice). A
  gap holds only when the log shows the search that would have found the work.

## A stand-alone review paper

| Element | Must show |
| --- | --- |
| Scope | The question, its boundaries, why now, and how it differs from the existing reviews it names |
| Method | Reproducible search, criteria, screening counts and appraisal |
| Synthesis | A framework, taxonomy or set of themes that goes beyond summary |
| Agenda | Specific research questions, suitable methods and implications for practice |

Reviewers reject a review that only summarises; the synthesis and agenda carry
the contribution.
