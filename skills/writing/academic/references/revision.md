# Review and revision

Two modes. Review mode assesses a fixed draft and changes nothing. Revision mode
improves the draft with co-authors and answers reviewers.

## Review mode

Critique a fixed draft, the owner's, a co-author's or an AI's, as a
knowledgeable reviewer in architecture, the built environment and design
research would.

**Confidentiality.** A manuscript under review for a journal or conference is
confidential. A hosted assistant is external processing, so read the venue's
reviewer policy on AI tools before any of it is pasted in; many forbid it. If
the policy forbids it or is unclear, stop and say so; the human can use the
headings below as a checklist. A co-author's unpublished draft needs that
co-author's agreement.

1. Read the whole draft once. Write a neutral two-sentence summary of its claim
   and approach that the authors would recognise.
2. Read the venue's aims, scope and review form when known, and review against them.
3. Record findings under the headings below, each with a location and evidence
   from the draft. Write "not reported" for absent material; never invent a problem.
4. Rate each finding: **major** (a central claim fails without the fix),
   **minor** (weakens the paper) or **note** (style, typo, formatting).
5. Close with strengths, the main concerns and what would change the
   assessment. Give an accept or reject recommendation only when asked; the
   decision belongs to the editor.

| Heading | Ask |
| --- | --- |
| Contribution and originality | Is the contribution stated early, new against cited and uncited work, and significant to the field? |
| Argument and claim support | Is each claim matched to evidence of the same strength? Do conclusions reach beyond one case or setting? |
| Literature coverage and currency | Are the seminal, recent and counter-position works there, including the field's own venues (CumInCAD, Avery-indexed journals)? |
| Method fit for design research | Is the approach named (into, through or for design) and justified? Is the designer-researcher role addressed? For community work, are participation and consent described? For AI and BIM work, are data, tool versions and validation reported? |
| Evidence and figures | Do drawings, models and photographs carry provenance, appear in the text and show what is claimed? Are renders presented as proposals? |
| Structure and venue fit | Does the paper follow its genre's spine, the venue's scope and length, and does the abstract match the body? |
| Citations and references | Does every citation match the list, in one consistent style, with primary sources behind key claims ([citations](../../citations/METHOD.md))? |
| Writing | Are terms defined and consistent, and do hedges match the evidence? |

Return findings as a table:

| # | Section | Finding | Severity | Evidence | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| 1 | 3.2 | What is wrong | major / minor / note | Quote or location that shows it | The smallest change that resolves it |

Ask for new work only when a central claim needs it; narrowing the claim,
clarifying or naming a limitation is often enough.

## Revision mode

### Self-review before co-authors

- [ ] The cross-section audit in [genres](genres.md) passes.
- [ ] Every claim in the evidence outline is still supported at its stated strength.
- [ ] Each `[GAP]` marker is resolved or stated as a limitation.
- [ ] Citations validated; limits in the compliance note met.
- [ ] Unslop has run under the academic guard.

### Co-author rounds

- Record who owns each section. The owner decides the wording of that section.
- Edit in suggestion mode (Google Docs), tracked changes (Word), Overleaf's
  track changes or history, or a branch and diff for Markdown and LaTeX.
- Never silently change a co-author's claim, data, citation or hedge. Propose
  the change as a suggestion with a comment that says why.
- Answer comments rather than deleting them; the commenter or section owner
  resolves the thread.
- Keep one current master, named `<short-title>_v<NN>_<YYYY-MM-DD>_<initials>`
  or tagged in version control. Never two live copies.
- Before submission, every author approves the final text, author order,
  declarations and AI disclosure, and the approval is recorded. Never record
  approval on an author's behalf.

### The reference library

A reference manager (Zotero or similar) owns the library. The `.bib` or CSL
JSON file is exported from it, with stable citation keys, and regenerated after
every change. Fix a reference in the manager and export again; never keep a
second hand-edited copy.

### Responding to journal reviewers

1. Copy every comment verbatim into the response and number it (R1.1, R1.2, R2.1).
2. Classify each: agree and change, partly agree, disagree with reasons, or out of scope.
3. Update the evidence outline before the prose when a claim changes.
4. Revise, marking changes as the venue asks (tracked changes or highlighting).
5. Write the letter; co-authors approve it with the revision.

```text
Dear Editor,

Thank you for the reviews. The main changes are:
- <change 1>
- <change 2>

Reviewer 1
R1.1 Comment: "<verbatim>"
Response: <answer to the point>
Change: <what changed>, section <x>, page <y>, lines <z> | No change, because <reason>
```

Thank once, not per comment. Answer the point made. Disagree with evidence and
courtesy. Give a location for every change, quote short new text, and never
claim a change that was not made.

### Conference rebuttal

Check the rules first: whether a rebuttal exists, its length, anonymity, and
whether new results or links are allowed. Correct factual misreadings first,
then concerns shared by several reviewers. Answer each reviewer by their
identifier, commit to specific camera-ready changes, add no claim the paper
does not support, and stay inside the limit.
