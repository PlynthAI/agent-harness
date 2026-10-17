# <Business> brain

This Obsidian vault is the company brain for <Business>: one vault per business,
kept organised by agents and read by people. It sits outside source checkouts,
so its instructions are not auto-loaded; read this file before writing here.
People start at [[Home]]; agents start here, then [[index]], then search front
matter and links. The per-business folders, types and fields are declared in
the Extensions table below and nowhere else.

## Where records go

| Record | Home | Template |
|---|---|---|
| Chat drops, clips and hand-dropped files | `Inbox/` | inbox.md |
| Machine pulls (X exports, transcripts) until routed | `Inbox/.raw/<source>/` | None |
| An external source worth keeping | `Sources/<author or site> - <topic>.md` | source.md |
| Business meetings | `Company/Meetings/<YYYY-MM-DD> <title>.md`, or a work unit's own `Meetings/` | meeting.md |
| Business decisions | `Company/Decisions/` | decision.md |
| How we do things | `Company/SOPs/` | sop.md |
| Standards the work is held to | `Company/Standards/` (type `guide`) | None |
| Where each key and account lives | `Company/Access/` (type `guide`) | None |
| Copy and content drafts | `Marketing/` | content.md |
| Work units | The folder declared in Extensions | Declared in Extensions |
| A repository's goals, findings, PRDs, specs, ADRs, features and plans | `Workspaces/<repo>/`, routed by that workspace's AGENTS.md | That workspace's recipes, kept here in `Templates/` |
| Files that pages embed | `Attachments/` | None |
| Map and change history | `index.md`, `log.md` | None |

`Templates/` holds the one recipe set for this brain, including the workspace
recipes; it is the core Templates folder and is excluded from search and graph.
Agents copy a template and fill the placeholders themselves. DESIGN.md and
repository skills stay in their repository and are linked by URL, never copied.

## Front matter

Front matter is the page's card: an agent should be able to choose the right
page from it alone. Every concept page (anything outside AGENTS.md, README.md,
`Home/`, `Templates/`, `plans/` and dot folders) carries:

- `type`, lowercase: home, inbox, source, goal, finding, prd, spec, adr,
  feature, decision, meeting, sop, content, note, guide, plus any extension type.
- `title`: the human title.
- `description`: one or two sentences, what the page holds, then "Read when ...".

Optional fields, only when they carry something:

- `status`: draft, stable or deprecated; stable when absent. It is the one
  review field. An agent writes `draft` on every page it creates, and sets
  `draft` again when it changes a claim, decision or rule on an existing page
  (link and formatting fixes do not count). Only a person sets `stable`.
  [[Needs review.base]] lists the drafts.
- `sources`: a list of `- resource: <URL or repository path>` with optional
  `title`, `author` and `last_modified`. Required on source pages and for claims
  taken from outside.
- `related`, `area`, `project`: parent or sibling links as quoted wikilinks,
  such as `related: ["[[Page]]"]`. These are the graph's edges.
- `horizon`: goals only; now, next or later. Roadmap order, not progress; the
  route below says who sets it.
- `stale_after`: the date after which an outside fact must be rechecked,
  written with a time and zone (`2026-12-31T00:00:00Z`) so the check reads it.
- `generated`: `{by, at}`, set by agents only, never required.
- Business fields: `date`, `attendees`, `owner`, `decided_by`, `reviewed` (the
  SOP review date), `kind` on inbox notes (seed, feature, knowledge, task or
  question), `outcome` on handoff notes, plus any declared in Extensions.
- `tags`, `aliases`, `cssclasses`: never required. Tags only for a cross-cutting
  theme with no natural parent.

Not used: `confidence`, `explored`, `tldr`, `verified`, `reviewed_by`,
`date_created`, `date_modified`, or a project field restating this brain's
owner. The root `index.md` alone carries `okf_version`.

## Links, index and log

- Links are wikilinks. Every concept page has a `type` and at least one parent
  link, in the body or in `area`, `project` or `related`. No manual tagging.
- A bare wikilink resolves by file name, so it survives a folder move. Obsidian
  does not rewrite links when an agent renames a file: search for the old name
  and fix every link in the same change. Keep file names unique across the vault.
- Update `index.md` only for a new area, work unit or top-level page.
- Add one line under today's `## YYYY-MM-DD` heading in `log.md`, newest day
  first, for each change worth finding later.

## Inbox

Capture each item as one inbox note in `Inbox/`. Machine pulls wait in
`Inbox/.raw/` only until they are routed, then are released. Route by moving the
note to its home and retyping it, never by copying. Agents file drafts and manage the roadmap: a goal's `horizon` follows the
person's instruction (a drop that says "set up this task and implement it" is
`now`, and the inbox then leads straight to the plan, issue or implementation;
a drop with no instruction is `later`), and an agent may propose `next` or
`now` with its reason on the page. A person decides `stable`, changes to a
stable page's claims or to standards and SOPs, any spend, and any deletion
other than processed raw payloads. Anything personal or
unclear stays in `Inbox/` with a question under Route. The shared `inbox` skill
carries the full route and the check.

## Secrets, scratch and machine paths

- No secret enters this brain: no password, API key, token, recovery code or
  private key, in any page, property or attachment. A page in `Company/Access/`
  names where each key lives (password manager item, environment variable name,
  service console) and who holds it, never the value.
- No task scratch, retained artifacts, caches or bulky outputs live in a brain.
  A workspace in `Workspaces/` resolves its scratch and artifacts routes to the
  host scratch root (the registry's `scratchRoot`) outside the vault; the
  docs-workspace resolver reports that path.
- Concept pages carry no machine paths. Link a repository file by URL or by its
  repository-relative path.

## Check

Before reporting a brain edit done, run the `inbox` skill's check over the
brain and fix what it reports. A failing check never blocks writing a note.

## Extensions

Per-business folders, work units, types and fields are declared here, not in
the harness. Extra templates go in `Templates/`. A starter refresh preserves
this table and the folders it names.

| Extension | Value |
|---|---|
| Owner and audience | <who owns this brain and who reads it> |
| Org folder | `Company/` |
| Work-unit folder and naming | <folder and pattern, such as `Projects/<id - name>/` with `<id> Project.md`, `Meetings/`, `Notes/`; or none> |
| Extra types | <type: where it lives and its template; or none> |
| Business fields | <field: meaning, on which types; or none> |
| Other folders | <folder: purpose; or none> |
| Handoff notes | An inbox note with kind task written for a person to hand to another chat (the shared handoff skill). Its body may carry the machine paths and commands that chat needs. Its outcome field stays empty until the taking chat writes what is now true and the PR, commit or path that proves it. A note with a verified outcome is a processed payload: the handoff skill's cleanup may release it after filing anything durable as a finding. Delete this row to keep every note until a person clears it. |
