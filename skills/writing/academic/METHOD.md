---
name: academic
description: Write or review a paper, journal article, thesis chapter or literature review in architecture, the built environment and design research - argument, structure, citations and venue format. Routes to literature, genres, venue and revision references; citation mechanics are writing/citations.
---

# Academic writing

For architecture, the built environment, community-focused design, AEC, BIM and
AI in design. **Write** a manuscript through to submission, or **review** a fixed
draft (the owner's or an AI's) as a knowledgeable reviewer in the field would;
review mode starts in [revision](references/revision.md).

## Intake

Settle each item before drafting. Mark any you cannot settle as open; never guess.

| Item | Settle |
| --- | --- |
| Claim | The contribution in one or two sentences, and its kind: new knowledge, framework, method, design artefact, synthesis or critique |
| Genre | Position, theory, design research, empirical, review, conference paper or thesis chapter ([genres](references/genres.md)) |
| Venue | Journal, conference or thesis; cycle, track and stage; the current author guidelines ([venue](references/venue.md)) |
| AI policy | The venue's and institution's policy on AI use and disclosure, read at the source |
| Citation style | The one the venue or university names: Harvard (which variant), APA 7, Chicago (author-date or notes), Elsevier numeric. Never infer it from a neighbouring venue |
| Authors | Co-authors, who owns which section, who approves submission |
| Manuscript home | Markdown with Pandoc and a CSL file, LaTeX from the venue's official kit, Word, Google Docs or Overleaf |
| Records | Search log, evidence outline, compliance note and drafts go where [docs-workspace](../../docs-workspace/SKILL.md) routes them |

## Stance

- Trace every material claim to a source actually inspected. Read the primary
  source behind a summary, review or search result before citing it, and match
  its version, setting, population and scope to the claim.
- Separate observation, interpretation and uncertainty, and label speculation.
- Quote exactly, with a page or paragraph locator, where wording matters;
  otherwise paraphrase and cite.
- Where evidence is missing or conflicting, mark the gap in the text
  (`[GAP: what is missing]`) instead of smoothing it with confident prose.
- Cite only what the authors inspected for that claim. Tools, skills and
  services used in drafting are not sources and are never added as references.
- The venue's or institution's style wins over this method and writing's defaults.

## Never invent

Mark an item missing, unverified or not applicable rather than writing
plausible filler:

- studies, citations, DOIs, page numbers, quotations or attributed positions;
- case studies, projects, sites, clients, buildings and their data;
- interviews, workshop or survey results, participant counts, stakeholder or community quotes;
- model metrics, simulation results, BIM model statistics, accuracy figures;
- ethics approvals, consent, funding, conflicts, data availability, author
  contributions, acknowledgements and AI-use declarations.

## Flow

1. **Frame.** Run the intake and write the claim as one paragraph a reviewer could dispute.
2. **Literature.** [research](../../research/SKILL.md) retrieves and reads;
   [literature](references/literature.md) sets the protocol; the search log
   goes where docs-workspace routes it.
3. **Synthesis.** Themes, tensions and the gap the claim fills ([literature](references/literature.md)).
4. **Evidence outline.** Build this before any prose and keep it beside the draft:

   | Claim | Support | Source | Strength |
   | --- | --- | --- | --- |
   | One sentence | The finding, passage or data that carries it | Citation key and locator | supported / partial / speculative |

   Partial claims are hedged in the text; speculative ones are worded as
   propositions and stay out of the abstract and conclusions.
5. **Draft by genre** with [genres](references/genres.md) and writing's drafting stance. Write the abstract last.
6. **Citations.** Search, identifiers to BibTeX, validation and bibliography
   cleanup follow [citations](../citations/METHOD.md).
7. **Figures and diagrams.** Charts and analytical tables through
   [design/data-visualization](../../design/data-visualization/METHOD.md);
   diagrams and drawn figures through [design/drawing](../../design/drawing/METHOD.md).
   Every figure carries provenance ([genres](references/genres.md)).
8. **Self-review and cross-section audit** ([revision](references/revision.md), [genres](references/genres.md)).
9. **Co-author rounds** ([revision](references/revision.md)).
10. **Venue compliance** ([venue](references/venue.md)).
11. **Finish with [unslop](../unslop/METHOD.md)** under an academic guard: keep
    hedges, claim strength, terms of art and the venue's conventions. Unslop's
    rules on jargon and hedging do not override discipline usage.
12. **The human submits.** Prepare the package; never submit, sign a declaration
    or record an approval on an author's behalf.
13. **Respond to reviewers** with [revision](references/revision.md), then loop from step 5.

## Output route

| Manuscript home | Produce the formatted paper with |
| --- | --- |
| Markdown | `pandoc paper.md --citeproc --bibliography refs.bib --csl venue.csl -o paper.docx`, adding `--reference-doc venue.docx` for the venue's Word styles, or `-o paper.pdf --pdf-engine=xelatex` for a PDF |
| LaTeX | The venue's official kit, its class files unchanged, with the venue's `.bst` (BibTeX) or biblatex style (biber); build with `latexmk` |
| Word | A Word or docx skill when the session has one; otherwise Pandoc to `.docx` with the venue template as `--reference-doc`. Co-authors work in tracked changes |
| Google Docs or Overleaf | Edit in place through the available connector or the owner's hands; the reference manager's plug-in inserts citations |

Take the CSL file from the official CSL styles repository
(`citation-style-language/styles`, browsable at zotero.org/styles), matched to
the venue's exact name or the style it names. Run `pandoc --version` (and
`latexmk --version` for LaTeX) at the start and note the versions in the
compliance note. Install nothing; if a tool is missing, say so and hand over the
source with the build command.

## AI use and authorship

- Read the venue's AI-use policy at intake and record its URL and the date read
  in the compliance note.
- Write the disclosure in the venue's own words and place (methods,
  acknowledgements or a declaration field), naming the tool and purpose as the
  authors confirm them. AI is never an author; the human authors stay
  accountable for every claim.
- Use CRediT contributor roles where the venue asks for them, confirmed by each author.
- Name guidance bodies (ICMJE, COPE, the publisher) without a version or date
  unless the official page was read in this session.
