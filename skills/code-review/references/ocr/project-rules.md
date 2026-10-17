# Project rules

Rules decide which rule text governs each file. They are the reason a review
reflects house standards instead of a generic checklist.

Verified against `ocr` v1.12.4 on 2026-09-16.

## Layers

For each path, the first matching pattern wins, walking layers top down:

| Priority | Source | Path |
|---|---|---|
| 1 | `--rule <file>` | Caller-supplied, highest precedence |
| 2 | Project config | `<repoDir>/.opencodereview/rule.json` |
| 3 | Global config | `~/.opencodereview/rule.json` |
| 4 | System | Ships inside the binary, always present |

A missing file in a layer is skipped silently, so a repository with no rule file
simply falls through. That is why the global layer alone already covers every
repository, including projects created later.

Only the system layer can merge. A match in a higher layer replaces every
lower user layer for that path: a project entry for `src/api/**/*.ts` takes the
global house entry away from those files, whatever its `merge_system_rule`
says. Rechecked with `ocr delegate rule` on v1.12.9 on 2026-10-02.

## File format

```json
{
  "include": ["src/**/*.{ts,tsx}"],
  "exclude": ["**/*.test.ts", "**/generated/**"],
  "rules": [
    {
      "path": "**/*",
      "rule": "No hardcoded credentials.",
      "merge_system_rule": true
    }
  ]
}
```

- `include` — optional. Patterns that bypass built-in default excludes such as
  test-path patterns. It is not a whitelist: non-matching paths still go through
  the other gates.
- `exclude` — optional. Paths OCR must not review. Highest precedence of the
  user filters.
- `rules` — optional. Evaluated in declaration order; the first matching `path`
  wins. Put specific patterns above broad ones. On v1.12.9 (checked 2026-10-02)
  a file with `rules` absent, `[]` or `null` still applies its `include` and
  `exclude` and adds no rule, so every file keeps the global entry.
- `merge_system_rule` — optional, per entry. Without it, a matching user rule
  **replaces** the built-in system rule for that file. Set it to `true` whenever
  the goal is to add to the baseline rather than replace it.

That last point is the easiest way to lose coverage by accident: a broad rule
without `merge_system_rule` silently discards the shipped language rules.

Globs use `bmatcuk/doublestar`: `*`, `**`, `{a,b}`, `?`, `[abc]`. Matching is
case-insensitive because paths are lowercased first. Confirm a decision with:

```powershell
ocr rules check --repo . src/app/page.tsx
```

## Filter gates

Applied in order, before review:

1. `binary` — excluded.
2. `secret_path` — built-in secret-path protection, evaluated before user rules
   and not overridable. `.env.example`, `.env.sample` and `.env.template` remain
   reviewable.
3. `user_exclude` — your `exclude` patterns.
4. `user_include` — your `include` patterns bypass the default-path and
   unsupported-extension gates (on v1.12.9 a matching test file and a matching
   Markdown file both became reviewable).
5. `unsupported_ext` — extension not in the reviewable set, for example
   Markdown.
6. `default_path` — built-in test-file excludes.
7. `too_large` — changed bytes exceed the gate.
8. `deleted` — new path is `/dev/null`.

## The house rules

The house rules live once, at user level: `~/.opencodereview/rule.json` holds
one `**/*` entry that merges the system rules and carries the invariants true
in any language (no hardcoded credentials; destructive operations guarded,
targeted and reversible). With OCR's shipped language rules it reaches every
repository with no repository file. The harness carries it at
`config/ocr/rule.json` and `config/deploy.ps1` installs it there; edit the
source, never the installed copy.

The shared file also includes Python, JavaScript/TypeScript and Go test patterns,
Markdown/MDX, PowerShell modules (`.psm1`) and JSON/YAML fixtures or testdata.
These close observed gaps in contract tests, operational specifications and
production guardrails. Only changed files are added to diff review, not the
whole repository. Generated files, dependency trees, snapshots and recorded
outputs remain excluded; binary, secret-path and size gates still apply.
The exact patterns are in the shared file, not copied into every repository.

In OCR 1.12.11, coverage uses the highest-priority file with any nonempty
`include` or `exclude`: custom, then project, then global. The filters do not
merge across layers. Within that selected file, an exclusion wins over an
include. A project file with only one exclusion therefore also replaces the
global includes. This differs from rule-text resolution above; verify the
installed version's preview rather than assuming an additive override.

## A repository's rules

A repository writes no `rules` path entries: one would take the house entry
away from its files (see Layers). Its own requirements live in its
`ARCHITECTURE.md` and `CODING_STANDARDS.md` and reach the selected reviewers
through the [review facts](../review-assignments.md#the-review-facts), which
carry the accepted requirement and the departures on those pages that the diff
touches.

A repository file holds coverage only, at `.opencodereview/rule.json`, which OCR
resolves from the repository root; it is plain configuration, safe to commit:

```json
{
  "include": ["contracts/**/*.txt"],
  "exclude": ["docs/api-generated/**"]
}
```

Prefer the shared defaults and no repository coverage file. If a project
requires its own filter, explicitly carry the desired shared includes and
excludes into that file before adding its exceptions. The abbreviated example
above replaces the shared filter; it is not an additive overlay. Such a project
owns reconciliation when global defaults change. `exclude` is for
generated, vendored or recorded-output paths only. Record each pattern's reason
in the adoption record. Check the
result on a recent merged range with
`ocr delegate preview --format json --from <base> --to <head>`; it calls no
model.

At adoption, look for an existing `.opencodereview/rule.json`. With none there
is nothing to seed unless the preview demonstrates a project-specific gap.
Reconcile old test/doc exclusions against the accepted coverage; never erase
local exclusions without checking what they protect. With `rules` entries, move each real requirement into the
conventions pages, drop any a tool or the house entry already covers, and
remove the entries; `ocr rules check --repo . <path>` then reports
`Source: Global` for each former rule path.
