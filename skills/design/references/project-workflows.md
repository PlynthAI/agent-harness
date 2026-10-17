# Shared methods and project workflows

Shared design skills own reusable procedures across projects. Keep project
tokens, content rules, commands and assets at their existing owners, referenced
by the project AGENTS.md. Retain a local skill only for a distinct domain
procedure; project branding alone does not justify another entrypoint.

A shared skill may carry per-brand recipes, templates and references when a
brand's version of the shared workflow differs in its steps: its order and
gates, layout rules, which checks make up a release, or its authorship and
review policy. The recipe lives inside the shared skill, the project names the
recipe it uses, and the shared core hard-codes no brand's policy. Live state,
trackers, facts, claims, command definitions and secrets stay in the
repository: a recipe points at them by repository path and names which project
commands make up a check, and the repository wins when they differ.

## Two scopes working together

The shared harness supplies reusable methods, source lookup and general review
guidance. A repository supplies its own skills, instructions, tokens, component
owners, input contracts and validation commands. Project skills can call shared
methods for a bounded part of their work and keep their project-specific steps.

Use the current session's skill list to find the actual source path. The
`skills-list` method distinguishes runtime discovery from a filesystem scan.
Current Codex documentation describes user and repository `.agents/skills`
roots; some installations also discover `.codex/skills`. Preserve a working
layout and verify discovery on the target host before changing it. A source
folder's presence alone does not prove it was offered to the session.

Two skills with the same name are not combined into a new procedure. Project
instructions should name the intended source path when ambiguity exists. Renaming a duplicate does not fix overlapping ownership. Extract its reusable
method into the existing shared skill and its project facts into ordinary
references, then retire the redundant entrypoint. Distinct domain skills have
distinct triggers; do not depend on an assumed automatic override. A project skill may have the same local name
in different repositories without making both copies a shared implementation.

## Explicit stages, flexible methods

The stages are required and the methods are chosen. The project AGENTS.md points to shared design, selected implementation guidance,
applicable validation and independent review. It names project requirements,
not another skill that duplicates the shared routing procedure. Inside a stage, the project and the real change decide the method,
the tool and the depth. A skill invocation is an entry rather than a finished
slice: the slice ends when it is implemented, verified by the project's own
checks and reviewed on the fixed candidate.

## What belongs beyond DESIGN.md

Keep information at its existing owner. The following are responsibilities, not
a required list of new files. One small project may cover several in an existing
guide; a script or template remains executable source, not prose to transcribe.

`DESIGN.md` itself stays pure format. Pointers to a library profile, drawing
theme, component index, Figma file or token file, and motion or shadow values,
live at the owners below, never in its front matter or body.

| Owner | What agents need there |
|---|---|
| Project AGENTS.md | Which shared method applies, project reference paths, and any distinct domain procedure. Keep it a map. |
| Root DESIGN.md | Colour, type, spacing, shape and component tokens in the Google DESIGN.md format, with prose for identity, hierarchy and interaction intent. Checked with `designmd lint`. Reference its tokens instead of copying them into every skill. |
| PROJECT.md design row | The pointers the format has no place for: the design library profile, any drawing theme, the component index, Figma files and token source files. |
| Design library `DESIGN_SYSTEM.md` | The cross-project map: each project's authority, profile, drawing theme and asset namespace. |
| Impeccable sidecar (`.impeccable/design.json`) | Motion, shadow and breakpoint values and component code, which the format has no top-level key for. Prose descriptions may stay in DESIGN.md. |
| COMPONENTS.md or existing component index | Local reusable owners, compatible foundation, preferred external sources and relevant dependencies. Point at actual configuration. |
| Optional distinct domain skill | A procedure not already owned by a shared method; ordinary project facts and commands alone belong in references. |
| Evidence or editorial reference | Claim/source relationships, units, geography, uncertainty, source freshness and what must not change when adapting content. |
| Channel or workflow reference | Article versus social output, export sizes/formats, captions, brand assets, packaging, and relevant review or publication steps. |
| Scripts, templates and examples | The working renderer, validation, fixtures and a representative accepted result. Preserve these when they carry behavior a generic method cannot replace. |

Project naming and file layout remain the project's choice. Glossaries do not
need to absorb workflow instructions, and ordinary workflow conventions do not
need architectural decision records.

## Preserve useful local detail

For a social-data workflow, keep its editorial/evidence contract, channel
composition, brand assets, campaign tooling and checks together. A shared method
may provide chart or component choices; it must not discard the project's claim
qualifications, source footer or export requirements.

For editorial maps, keep the geography-release references, join rules, map
patterns, accessible-value representation, renderer and validation at their
owners. Interactive product-map controls and an article evidence map can share
design principles without using the same workflow or runtime.

For public content, retain the source/claim checks, voice rules, publication
owners and release commands in the repository. A shared authoring method may
carry the brand's authoring guide as a recipe, as the opening section allows;
otherwise the guide stays with the project. Prose polish is a bounded pass: preserve
facts, quotations, official terms and caveats, then check the final claims. It
does not grant publication authority or replace the content workflow.

A shared renderer should accept the agreed input files without requiring a
database connection. Project-owned acquisition may produce those inputs using
the project's own tools. The harness's goals, findings, plans and state remain
ordinary Markdown; no storage service is introduced by this separation.

## Extract only a demonstrated shared part

Preserve working project skills while comparing the reusable parts; this is
temporary preservation for the audit, not the desired deployed topology. Compare
different local copies before choosing a source; matching names do not prove
matching behavior. Record the source revision and intentional adaptations when
porting, preserving required notices.

When extraction is useful, the shared method owns reusable reasoning or tooling;
project references keep the project-specific details. Retain a local skill
only where it still owns a distinct domain procedure after extraction.
Avoid two independently maintained copies of the shared part. Verify the same
representative result through the local workflow before replacing any working
implementation. File-based inputs, output formats, evidence relationships and
meaningful checks must survive the extraction.

An already working local workflow that owns a distinct domain procedure may
stay entirely local; a workflow whose parts duplicate a shared procedure is
consolidated once those generic parts are extracted. A future project can
start with shared methods and add only the local decisions its task needs. Do
not manufacture a collection of empty profile files before there is a use for
them.
