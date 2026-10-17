# Quality kit

The mechanical layer of the harness's principles, organised by language. The
tool-choice owner settles the project's accepted pack; adoption and verification
apply those selected tools through the project's existing guide, runner and CI.
The categories below describe available checks, not automatic additions or gates.
For selected blocking checks, new violations fail and existing baselines can only
shrink. A new project starts its selected checks with empty baselines.

This page is the kit's one home: the tools, their pinned commands, their config
and how each baseline shrinks. The order of adoption in an existing repository
and where debt is recorded are in orchestrate-work's
[repository adoption](../../orchestrate-work/references/repository-adoption.md).
How the gate sits in CI is in ci's [adoption](../../ci/references/adoption.md).
How a run is recorded for the reviewers is section 3 of
[the skill](../SKILL.md).

The harness carries the kit once. A repository holds only its own tool config
files, its baseline files and its facts: which folders are layers, which files
are entry points, which exceptions are deliberate.

Apply the rules the repository has adopted and shrink its existing baselines.
Ordinary validation does not add a new blanket CI gate, a cleanup quota or a
test-count target. Counts alone cannot show that a baseline improved: independent
review checks for a removed violation replaced by a new one under the same count
or suppression key, including changes the tool's baseline cannot distinguish.

## The kit

| Need | TypeScript | Python |
|---|---|---|
| Lint | ESLint, kept as the repository has it | Ruff, kept as the repository has it |
| Types | The TypeScript compiler, kept | pyrefly, kept, with its own baseline |
| Security | No tool in the kit; a known gap | Ruff's `S`, `PLE2502` and a `TID251` banned-import list; bandit dropped |
| Structural rules | ast-grep rules with `ast-grep test` fixtures | ast-grep rules with `ast-grep test` fixtures; Semgrep dropped |
| Baseline that only shrinks | ESLint bulk suppressions, plus the suppression count for inline comments | The suppression count |
| Layering and placement | dependency-cruiser | import-linter |
| Dead code | knip | vulture, blocking at 80% confidence |
| Conventions pages stay true | The binding paths check | The binding paths check |

## Rules for every tool

- **Pinned runner for new tools.** dependency-cruiser, knip, import-linter and
  vulture run through `pnpm dlx` or `uvx` at an exact version, so no dependency
  entry is added. A tool the repository already depends on (ESLint, TypeScript,
  Ruff, pyrefly) stays as it is. A version bump is its own change, because it
  can change what the baseline records.
- **Stale entries fail.** Every baseline here fails the run when an entry no
  longer matches, so the file always equals the tree and only shrinks. A
  baseline that grew shows in the diff, and the suppression count also rejects
  growth against the base branch.
- **Debt and departures are kept apart.** A deliberate exception is configured
  by name with its reason (a Ruff `per-file-ignores` entry, an ESLint override,
  an import-linter contract that allows it). An accidental one is a baseline
  entry tied to its debt issue. Where a baseline format takes a comment
  (`ignore_imports`, the vulture whitelist), the entry names its issue;
  otherwise the issue names the rule and area exactly as the baseline keys it.
- **Dead-code tools report candidates, not verdicts.** Framework entry points
  look unused, so each tool needs entry-point config, and a deletion still has
  to pass the tests.
- **No edit hooks.** The commit hook, the push rung and CI carry the checks, as
  in [check ladder](check-ladder.md).

Commands below were run on 2 October 2026, read-only, against a Next.js 16 app
(1,632 modules), a Next.js site (314 modules) and a FastAPI service (about
1,000 files). Anything not run is marked **to confirm at adoption**.

## TypeScript

### Lint baseline: ESLint bulk suppressions

Built into ESLint 9.24 and later. Run with the repository's own ESLint and its
lint command's paths:

```sh
pnpm exec eslint <lint paths> --suppress-all             # adoption: writes eslint-suppressions.json
pnpm exec eslint <lint paths> --suppress-rule <rule>     # turning on one stricter rule later
pnpm exec eslint <lint paths>                            # check
pnpm exec eslint <lint paths> --prune-suppressions       # after fixing: lowers the counts
```

- The file holds a count per file per rule. Exit 1 when a file has more
  violations than its count; exit 2 with "There are suppressions left that do
  not occur anymore" when it has fewer, until `--prune-suppressions` is run.
- Only rules set to `"error"` are suppressed; `"warn"` rules are not.
- Fixing one old violation and adding a new one of the same rule in the same
  file leaves the count unchanged, so the new one passes. Review covers that.
- Linting only some files (the commit hook's staged files) honours the file and
  reports nothing stale for files it did not lint.
- `--suppressions-location <file>` must name an existing file, or ESLint exits 2.
- Turn on a framework's current ESLint config before `--suppress-all`, since an
  outdated config pinned behind its framework changes the rule set the
  baseline records.

Inline `eslint-disable` comments bypass that file. Make stale ones fail and
count the rest:

```js
// eslint.config.mjs: ESLint's default is "warn", which does not fail the run
{ linterOptions: { reportUnusedDisableDirectives: "error" } }
```

and add the [suppression count](#baseline-the-suppression-count), which counts
`eslint-disable` comments by rule and `@ts-ignore`, `@ts-expect-error` and
`@ts-nocheck` comments. A hand-written guard against new `any` or `@ts-ignore`
is replaced by typescript-eslint's `no-explicit-any` and `ban-ts-comment`
inside ESLint and its baseline (how a framework preset sets those two rules is
**to confirm at adoption**).

### Layering: dependency-cruiser

```sh
pnpm --package=dependency-cruiser@18.5.0 --package=typescript@<the repository's typescript version> dlx depcruise <source folders> --config .dependency-cruiser.cjs --ignore-known .dependency-cruiser-known-violations.json
```

- `typescript` must be in the runner. Without it the run exits 0 having read
  2 modules, with only a `missing-typescript-transpiler` warning. TypeScript 7
  is not supported yet, by the tool's own message.
- Put the source folders before the options: `--baseline` and `--ignore-known`
  take an optional file name and would swallow a folder written after them.
- Run time: 4 to 14 seconds.

Config, as run (the layer rule is an example; real rules come from the
repository's architecture page):

```js
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "lib-not-to-components",
      comment: "Shared lib code does not import UI components.",
      severity: "error",
      from: { path: "^(app/)?lib/" },
      to: { path: "^(app/)?components/" },
    },
  ],
  options: {
    doNotFollow: { path: ["node_modules"] },
    exclude: { path: ["^\\.next/", "node_modules", "^storybook-static/"] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
```

`no-circular` as written counts cycles through type-only imports. On a Next.js
app (9 October) it reported 52 cycles, 51 of them type-only and harmless at
runtime; `to: { circular: true, viaOnly: { dependencyTypesNot: ["type-only"] } }`
left the one runtime cycle. Adopt the tool only when an architecture page
declares a boundary the tree could break; with no declared rule it found
nothing worth a gate.

Anchor every `exclude` pattern: an unanchored `artifacts` also excluded every
`ui-artifacts` path and hid 31 violations. `tsConfig` lets the `@/` alias
resolve. `depcruise --init` writes a fuller starter config.

Baseline, with the same runner prefix:

```sh
depcruise <source folders> --config .dependency-cruiser.cjs --baseline .dependency-cruiser-known-violations.json                            # adoption
depcruise <source folders> --config .dependency-cruiser.cjs --ignore-known .dependency-cruiser-known-violations.json                       # CI: new violations fail (exit 1)
depcruise <source folders> --config .dependency-cruiser.cjs --baseline .dependency-cruiser-known-violations.json --baseline-mode shrink-only  # CI: drop fixed entries, never add
git diff --exit-code -- .dependency-cruiser-known-violations.json                                                                           # CI: fail if anything was dropped
```

A stale entry alone only warns ("1 stale known violations in the baseline")
and exits 0, which is why CI regenerates in shrink-only mode and fails on a
changed file. Shrink-only rewrites an unchanged baseline byte for byte, so the
diff is empty when nothing was fixed. The author commits the shrunk file.

### Dead code: knip

```sh
pnpm dlx knip@6.40.0 --reporter compact --no-progress
```

Exit 1 on any issue. It reads `knip.json` at the repository root (or
`--config <file>`). Its Next.js plugin turns on when `next` is a dependency and
treats the App Router's special files, `middleware`, `proxy`,
`instrumentation` and `next.config` as entry points, so a Next.js app needs no
entry config for the framework; its Astro plugin does the same for an Astro
site. Run time: 11 to 15 seconds on an existing app, 4 to 5 seconds on a new
project.

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "ignore": ["docs/**", ".design-sync/**", "videos/**"],
  "entry": ["scripts/check-*.mjs"],
  "ignoreIssues": { "app/components/editorial/**": ["exports"] }
}
```

- `ignore` drops folders that are not application code (96 unused files fell
  to 24 on the site); `entry` adds files run by CI or tests that no import or
  package script reaches (24 fell to 16).
- Components used by name inside MDX without an import look unused; give them
  `ignoreIssues` or a `@public` tag.
- knip has no baseline file. `ignoreIssues` maps a file pattern to issue types,
  which is coarse, so dead code is deleted before the gate is turned on and
  `ignoreIssues` holds only what is accepted after that.
- A devDependency loaded by name from a config file (a framework's ESLint
  config through `FlatCompat`) may be reported unused; check before removing.
- The Playwright plugin executes every `playwright*.config.*` it finds. A
  config that throws without a live server makes knip exit 2; name the
  configs it may load with `"playwright": { "config": ["playwright.config.ts"] }`.
- A new project seeds the gate on day one. The harness templates' configs are
  three lines: `"ignoreExportsUsedInFile": true`, an `ignoreIssues` exports
  entry for the generated UI library folder (`components/ui/**`), and in the
  web app `"ignore": ["lib/utils.ts"]` for the alias file the UI generator
  writes. On an existing repository knip is audit input until its dead code is
  deleted: on a Next.js app 7 of 12 sampled findings were false positives by
  intent.

## Python

### Lint and security: Ruff

Add to the repository's existing Ruff config; leave preview off, since preview
also widens stable rules (S311):

```toml
[tool.ruff.lint]
extend-select = ["S", "PLE2502", "TID251", "RUF100", "PGH003", "PGH004"]
ignore = ["S101"]

[tool.ruff.lint.flake8-tidy-imports.banned-api]
# bandit 1.9.4's import blacklists (B401, B402, B411, B412, B413, B415), exact qualnames
"telnetlib".msg = "B401: cleartext; use SSH"
"ftplib".msg = "B402: cleartext; use SFTP or FTPS"
"xmlrpc".msg = "B411: XML attacks; use defusedxml.xmlrpc"
"wsgiref.handlers.CGIHandler".msg = "B412: httpoxy"
"twisted.web.twcgi.CGIScript".msg = "B412: httpoxy"
"twisted.web.twcgi.CGIDirectory".msg = "B412: httpoxy"
"Crypto.Cipher".msg = "B413: pyCrypto is unmaintained; use pyca/cryptography"
# ...and the same line for Crypto.Hash, .IO, .Protocol, .PublicKey, .Random, .Signature, .Util
"pyghmi".msg = "B415: IPMI is cleartext"

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S", "TID251"]
"scripts/**" = ["S", "TID251"]
```

- `S` replaces bandit: on the FastAPI service it matched 245 of bandit's 255
  findings, and on 9 October 22 of the 23 that bandit would block on, in 0.4
  seconds against 44.6. A clean tree does not prove the rest, so every bandit
  check that can block was also probed on a bad file: the stable `S` rules
  cover all but two kinds. `PLE2502` covers B613 (bidirectional control
  characters) in strings, comments and docstrings. The import blacklists have
  only preview `S4xx` rules, so the `TID251` table above covers every static
  import form; take the exact names from bandit's blacklist for the version
  being replaced. A dynamic import of a banned name (`__import__("telnetlib")`,
  `importlib.import_module("ftplib")`) needs one ast-grep rule, which lands in
  the same change that removes bandit.
- The two bandit checks with no Ruff rule, B614 (`torch.load`) and B615 (a
  Hugging Face download without a pinned revision), are an accepted gap,
  covered by one line in the repository's review rules where the repository
  uses them.
- `RUF100` fails a `noqa` that no longer suppresses anything; `PGH004` fails a
  `noqa` that names no rule; `PGH003` fails a `type: ignore` that names no
  code.
- The `per-file-ignores` scope above matches bandit's usual scope; each entry is
  a departure and carries its reason in the repository's config.

Existing violations, at adoption and whenever a rule is turned on:

```sh
ruff check --add-noqa      # writes "# noqa: <code>" on each current violation
```

then record them with the suppression count. CI runs `ruff check` on the whole
tree, not only changed files.

### Baseline: the suppression count

Ruff has no baseline feature (its issue 1149 is open), so the baseline is a
count of inline suppression comments by area and rule, which only goes down.
It also counts `# type: ignore[...]`, `# pyrefly: ignore[...]` and file-level
`# ruff: noqa`, and for TypeScript `eslint-disable` comments by rule and the
`@ts-` directives. Keys read `<top-level folder>: <kind> <rule>`, for example
`scripts: noqa E402`, which is also the grain of a debt issue.

The harness's one source is
[suppression_count.py](../scripts/suppression_count.py) (standard library,
Python 3.9 or later). Adoption copies it into the repository's CI scripts,
because CI cannot reach the harness; a refresh replaces the copy.

```sh
python scripts/ci/suppression_count.py write --exclude 'sandbox/*'   # adoption: writes .suppression-baseline.json
python scripts/ci/suppression_count.py check --base origin/main      # CI and push rung
python scripts/ci/suppression_count.py shrink                        # after fixing: lowers counts, never adds
```

- `check` fails on a count above the baseline (it lists each file and line for
  that key) and on a count below it (run `shrink` and commit). With `--base` it
  also fails when the committed baseline is above the base branch's, so it can
  only go down. A ref that does not resolve is an error (exit 2), so CI must
  fetch the base branch; a base with no baseline file is the first adoption and
  passes.
- `--exclude` globs are stored in the baseline, so `check` and `shrink` keep the
  scope `write` set.
- Only real comments count, never text inside a string, and each rule of a
  block `eslint-disable` that runs over several lines counts. Python is read
  with `tokenize`; a file that does not tokenize is read line by line and named
  in a NOTE line. The JavaScript and TypeScript scanner skips strings and
  template literals but not regular expression literals or JSX text: a quote
  character there hides directives later on that line (a backtick, up to the
  next backtick), a `//` or `/*` inside
  a regular expression reads as a comment, and comments inside a template's
  `${...}` are not seen.
- A deliberate new suppression is a departure: configure it by name with its
  reason rather than add an inline comment.
- On the FastAPI service: 2,058 suppressions under 132 keys, in 4 seconds.

Type errors keep the repository's existing type-check baseline.

### Layering: import-linter

```sh
uvx --from import-linter==2.15 lint-imports --no-cache
```

Run from the repository root; it finds the root package without `PYTHONPATH`.
In `pyproject.toml` the contracts use the TOML schema below; the INI form
(`[importlinter:contract:...]`) belongs in `setup.cfg` or `.importlinter` and
is rejected inside `pyproject.toml`.
`--no-cache` stops it writing `.import_linter_cache` into the repository.
`--config <file>` reads contracts from another file. About 2 seconds for 1,003
files.

```toml
[tool.importlinter]
root_packages = ["src"]

[[tool.importlinter.contracts]]
name = "Lower packages do not import the api package"
type = "forbidden"
source_modules = ["src.database", "src.services"]
forbidden_modules = ["src.api"]
ignore_imports = [
    # debt: <issue link>
    "src.services.legacy -> src.api.routes",
]

[[tool.importlinter.contracts]]
name = "api is the top layer"
type = "layers"
layers = ["src.api", "src.agents", "src.models"]
```

`ignore_imports` is the baseline: `importer -> imported`, wildcards allowed. An
entry that no longer matches fails the run ("No matches for ignored import
..."), so the list only shrinks. Contract types also include `independence` and
`acyclic_siblings` (documented, not run). Real contracts come from the
repository's architecture page or the audit, not from these examples.

### Dead code: vulture

```toml
[tool.vulture]
paths = ["src"]
min_confidence = 80
ignore_decorators = ["@router.*", "@app.*", "@flow", "@task", "@*.task", "@field_validator", "@model_validator", "@pytest.fixture"]
ignore_names = ["model_config", "lifespan"]
```

```sh
uvx vulture==2.16 --config pyproject.toml                                 # check: exit 3 when it finds dead code
uvx vulture==2.16 src vulture_whitelist.py --config pyproject.toml        # check with the whitelist
uvx vulture==2.16 --config pyproject.toml --make-whitelist > vulture_whitelist.py
```

- Block only at 80% confidence and above: 29 candidates on the FastAPI service
  (unreachable code, impossible conditions, unused `__exit__` arguments)
  against 3,118 at the default 60%, which are mostly data-model fields and enum
  members read by name. The 60% list is audit input, not a gate.
- The whitelist matches names, not places, and does not cover unreachable code
  or impossible conditions (5 of the 29 stayed), so those are fixed first.
- An `--exclude` pattern without a wildcard matches anywhere in the path
  (`docs` is `*docs*`); anchor it.
- The decorators and names above suit a FastAPI, Prefect and Pydantic service;
  list the repository's own. About 17 seconds for 1,000 files.

## Both languages: structural rules with ast-grep

A precisely defined code pattern that lint cannot express (a domain
invariant, a banned call shape) is an ast-grep rule with fixtures, run from
`sgconfig.yml` at the repository root. The CLI is the harness's pinned global
(version in `config/install-map.json`, under `tools`). A repository pins
`@ast-grep/cli` (or the `ast-grep-cli` Python package) at that same version only
when it has rules its checks run; with no rules there is no rules rung, no
`sgconfig.yml` and no pin. The local check and CI run these two commands.

```sh
ast-grep test --skip-snapshot-tests      # every rule's valid and invalid fixtures
ast-grep scan                            # the tree; exit 1 on an error-severity match
```

- A rule matches syntax nodes, so comments, docstrings and prompt strings no
  longer match the way a whole-file regex did. Test that change in the
  fixtures.
- Rust regex has no lookaround: write `(?!x)` as a `not: { regex: ... }` rule.
- Five Semgrep rules on a Python service ported this way on 9 October with
  25 fixture cases passing.
- A new rule follows the goal's qualification before it gates anything.

## Both languages: the binding paths check

[binding_paths.py](../scripts/binding_paths.py) (standard library) fails with
the page, line and path for each path that `ARCHITECTURE.md` or
`CODING_STANDARDS.md` binds to in a "Where it lives" or "Bound to" column and
that no longer exists, so a move or rename cannot leave a page stale. A
backticked token there is a path when it contains `/` or ends in a file
extension; commands, URLs and symbols are ignored, a glob passes when it
matches, and prose and departure lines are not read. Adoption copies it beside
the suppression count.

```sh
python scripts/ci/binding_paths.py      # CI and push rung, from the repository root
```

## Where each tool runs

Apply these placements only to tools selected by the project's accepted pack.
The project's guide owns any audit-only use or deferred adoption.

| Tool | Commit hook | Push rung | CI |
|---|---|---|---|
| ESLint with its suppressions file | Staged files | Parity row | Blocking |
| Ruff | Staged files | Parity row | Blocking, whole tree |
| Types | No | Parity row | Blocking, as today |
| dependency-cruiser, knip | No: whole project | Parity row | Blocking |
| import-linter, vulture, suppression count | No: whole project | Parity row | Blocking |
| ast-grep rules | No: whole project | Parity row | Blocking (`ast-grep test`, then `ast-grep scan`) |
| Binding paths check | No: whole project | Parity row | Blocking |

The whole-project tools take seconds and need no build, so they are cheap push
rung checks. dependency-cruiser's `--affected` mode for a narrower hook was not
tried.

## Advised against

| Option | Why not |
|---|---|
| ESLint's import plugin rules for layering | Found the same violations but took linting from 59 to 622 seconds |
| eslint-plugin-boundaries | Needs a dependency entry loaded by the ESLint config; cycle checks not documented |
| Sheriff | Built around `index.ts` barrel files; last release September 2025 |
| tach | Existing violations are inline comments or unchecked modules, not one list that fails when stale |
| Skylos | Writes a folder into the scanned project and duplicates Ruff's security job |
| Ruff preview mode | Changes stable rules as well as adding new ones |
| bandit beside Ruff | Two tools doing one job; Ruff's `S`, `PLE2502` and `TID251` cover it apart from B614, B615 and dynamic imports (one ast-grep rule) |
| Semgrep beside ast-grep | A second structural-rule engine; simple pattern rules port to ast-grep with their fixtures, and rules without `languages:` never validated |
| A hand-written linter | Established tools are the scaffold; the suppression count is a count of comments, not a linter |

TypeScript source security has no tool in the kit; a dependency audit is the
only cover today.
