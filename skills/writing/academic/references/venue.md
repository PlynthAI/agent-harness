# Venue compliance

A venue's rules change between cycles and without notice. Every limit, style or
template named in a paper comes from the official page read this session.

## Resolve the target

Settle the exact venue, year or cycle, track (full paper, short paper, work in
progress, poster), stage (initial submission, revision, camera-ready) and
article type. Never combine rules from a similarly named venue, another track or
a past cycle, and never infer this year's template by changing the year in last
year's file name.

## Read the current guidelines

Open the official author guidelines, call for papers or thesis regulations
through [research](../../../research/SKILL.md). Last year's call, a template
file name, a blog post or memory is not evidence. If the page cannot be reached,
say so and leave the field open.

## Compliance note

Write this before formatting and keep it where
[docs-workspace](../../../docs-workspace/SKILL.md) routes the paper's records.
Update it at each stage.

```text
Venue:            <name>, <year or volume>, <track>, <article type>
Stage:            initial submission | revision | camera-ready
Source:           <official URL(s)>
Read:             <YYYY-MM-DD>
Length:           <word or page limit>; counts <what is included or excluded>
Abstract:         <limit>; structured headings <yes or no>
Keywords:         <number and source>
Citation style:   <named style>; file <CSL, .bst or biblatex style and its source>
Anonymisation:    <blind, double-blind or open>; how self-citation is handled
Figures:          <count, formats, resolution, colour, permissions>
Statements:       <data availability, funding, conflicts, ethics, CRediT>
AI policy:        <summary in the venue's words>; <URL>
Template:         <official kit URL and version>
Tools:            <pandoc --version, latexmk --version or Word version>
Submission:       <system>; deadline <date, time and time zone>
```

## Official kit first

- Download the template from the venue's official page. Architecture and
  design conferences commonly issue a Word template; journals may issue a
  LaTeX class, a Word template or accept any format at first submission. The
  guide says which.
- Keep its class files, Word styles, margins, fonts and spacing unchanged. If
  the paper is over length, cut words; never adjust the template to fit.
- Use the bibliography style the kit ships with or the guide names, through the
  output route in [METHOD.md](../METHOD.md).

## Blind-review leak check

Run this on every file submitted for anonymous review, including supplements.

| Where | Look for | Fix |
| --- | --- | --- |
| Text | "Our earlier work [X]", named studios, universities, cities that identify the authors | Third person, or the venue's anonymised citation form |
| Front and back matter | Acknowledgements, funding, grant and ethics approval numbers | Remove or replace with the venue's placeholder |
| Project names | Practice, client, project and site names that point to the authors | Generalise them until camera-ready |
| Figures | Title blocks, logos, watermarks, student names, team photographs | Crop, redact or replace |
| BIM and software screenshots | User names, file paths, project information panels, licence banners | Redact or recapture |
| File metadata | Word document properties, comments and tracked changes; PDF author and creator fields | Clear them, then check the exported file's properties |
| Links | Repositories, project websites, videos, shared drives that show an owner | Anonymous versions, or omit as the venue directs |

## Submission checklist

- [ ] Compliance note complete and read this cycle.
- [ ] Length, abstract and keyword limits met as the venue counts them.
- [ ] Official template used and unaltered.
- [ ] Citation style matches the named style; references validated through [citations](../../citations/METHOD.md).
- [ ] Figures meet format and resolution rules; permissions held.
- [ ] Required statements present and confirmed by the authors, AI disclosure in the venue's words.
- [ ] Blind-review leak check passed on every file.
- [ ] Cross-section audit passed ([genres](genres.md)).
- [ ] All authors approved the final text, author order and declarations.
- [ ] The submitting author has the portal preview open; the human submits.
