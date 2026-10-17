# The principles and patterns library

`principles-and-patterns/` sits beside `skills/` and holds the named
judgements reviewing skills apply. They read it through one generated
[index](../../../../principles-and-patterns/index.md); the agent writing the
change does not load it. Deploy installs it beside the Codex skills and
`claude/sync-claude.ps1` links `~/.claude/principles-and-patterns` to that
copy, so a skill's link `../../principles-and-patterns/index.md` resolves in
the source and in both homes.

## Layout

The library holds `index.md` (generated, never edited by hand) and one page
per entry: `principles/<name>.md` for a principle, `patterns/<name>.md` for a
language, package or platform. Nothing else: no upstream copies, metadata,
templates, and never a file named `SKILL.md` or `AGENTS.md`. Every entry
stands alone; a reviewer reads the one page and needs no other file.

## Front matter

Quoted-string front matter on every entry:

- `type`: `principle` or `pattern`, matching its folder.
- `title`: the name the index shows.
- `description`: one sentence saying when to apply it. The index repeats it.
- `applies_to`: `plan`, `diff` or both.
- `dependency`: patterns only, the package names that trigger the entry.
- `source`: optional, the upstream URL at its pinned commit.
- `reviewed`: required with `source`, the `YYYY-MM-DD` date the page was last
  checked against it. The check warns, without failing, once it is over six
  months old; the index does not show it.
- `status: "trial"`: a principle still being evaluated. Promote it by removing
  the field; retire it by deleting the page.

## Adding or changing an entry

1. A distinct, reusable judgement earns a page; a single check belongs in the
   skill that owns it. Prefer refining an entry over adding a neighbour.
2. Write the rule first, then why or when it bites, with code only where the
   rule cannot be said without it. Leave to tools what a linter, type checker
   or compiler already reports, and say so.
3. Rebuild the index with `node skills/harness/scripts/library-index.mjs --write`.
   Without `--write` the command is the check: it fails on a file the layout
   does not allow, on incomplete front matter or on an index that differs from
   a fresh build.
4. Consumers link the index with the condition for reading it, never a single
   entry, so entries can be added, renamed or retired without touching a skill.

## Adapted upstream rules

A language or package page is ported from a named developer's hand-written
source, never written from a model's own knowledge. It keeps long-standing
rules only, leaving out any tied to one release, and is no firmer than its
source: an upstream preference stays a preference and keeps its exceptions.
Before the page ships, a fresh reviewer checks each rule against the source
lines.

The page is owned prose: the rules in our
words, never pasted paragraphs. `source` names the pinned commit, and
[third-party notices](../../../../THIRD_PARTY_NOTICES.md) records the source, pin
and licence as adapted material. The reference clones live in
`<reference-repos>`. To move to a newer pin:

1. Fetch the clone and read `git diff <old> <new> -- <package path>`.
2. Carry changed, added or removed rules into the entry, in our words.
3. Update `source` and the notice row, then set `reviewed` to today. A check
   that finds nothing to carry sets `reviewed` alone.

The stack scan, `node skills/harness/scripts/stack-scan.mjs <repository>`,
lists the pages that apply to a repository and the direct dependencies no page
covers; [repository adoption](../../../orchestrate-work/references/repository-adoption.md)
runs it.
