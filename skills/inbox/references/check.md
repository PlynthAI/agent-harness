# Brain check

```bash
node <shared-skills>/inbox/scripts/check-brain.mjs <brain root>
```

It needs Node and uv on `PATH`. The first run lets uv fetch PyYAML into its
cache; later runs are local. It reads the brain and writes nothing to it. Exit 0
means no errors, 1 prints each error by page, and 2 means the check could not
run (no folder, no uv, no PyYAML).

## What it checks

`scripts/check_okf.py` is an unmodified copy of the OKF 0.2 checker, pinned in
the root third-party notices. The wrapper runs it, with its quality pass, over a
temporary copy of the pages in scope, then adds the brain's own rules.

- **Scope.** Every `.md` file outside dot folders, except `AGENTS.md` and
  `README.md` anywhere, the root `Home/` folder, and any `Templates/` or
  `plans/` folder. Other files are never checked but are valid link targets.
  When the brain is a folder inside a larger Obsidian vault (the nearest folder
  above it holding `.obsidian/`), wikilinks resolve across that whole vault, as
  Obsidian resolves them, but only pages under the brain root are checked.
- **Errors.** OKF structure: valid front matter, a `type` on every concept, only
  the root `index.md` carrying `okf_version`, and `log.md` headings as
  `## YYYY-MM-DD`, newest first. A missing `description` (`[description]`). A
  source page without a nonempty `sources` list, or with an entry missing a
  nonempty resource string (`[sources]`). A concept page without a parent
  wikilink in its body, `area`, `project` or `related` (`[parent]`); code,
  comments and local heading links do not count. Both rules exempt `Inbox/`,
  `index.md`, `log.md` and pages with `type: home`, as well as files outside
  scope such as templates, `Home/` pages and `.base` files. A
  wikilink in the body or front matter that matches no file (`[wikilink]`):
  bare names match a file name anywhere, names with folders match the end of a
  path, `.md` is optional, case is ignored, and code and comments are skipped.
  Two concept pages with the same file name (`[duplicate-name]`); `index.md`
  and `log.md` are exempt.
- **Warnings.** Advisory and never failing: no `title`, `stale_after` passed or
  written without a time and offset, an unfilled `TODO`, a Markdown link target
  that does not exist, a machine path. Write `stale_after` as
  `2026-12-31T00:00:00Z` to keep it quiet.

## Fixing what it reports

- After a rename, search the brain for the old name and fix every link in the
  same change; Obsidian does not rewrite links an agent's rename breaks.
- A duplicate name: rename the newer page to something distinct and fix its
  links.
- A missing parent page: create it as a draft rather than removing the link.
