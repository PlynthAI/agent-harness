# Local check ladder

Read this when setting up or repairing a repository's commit hook, its push
rung or its CI parity table, or when a hosted CI run fails on a change that
passed local validation. The method is shared; each repository owns its tools,
commands, hook files, parity table and workflows.

The goal is a change whose hosted CI passes on its first run. Each rung catches
what it can cheaply, and a red CI on a locally validated change is evidence that
a lower rung missed something.

## The three rungs

| Rung | Runs where | May block | Must not | Budget |
|---|---|---|---|---|
| Commit | Git pre-commit hook, staged files only | A commit whose staged files break the repository's own lint, format or DESIGN.md rules, or leave stale skill stubs | Write to files or the index; need network, browser, server, build or whole-project analysis; enforce a rule CI lacks | About 15 s typical |
| Push | Delivery's push step, run by the agent; not a pre-push hook | Publishing for review until the cheap CI checks the branch's paths activate (lint, types, unit tests) have passed locally, and every other CI job is either covered by validation's existing evidence or named hosted-only | Rerun checks whose evidence still matches (the skill's reuse rule); start a build, a server or a browser only to push | A minute or two, no build |
| CI | Hosted workflows | Merge, where the check is required | Be trimmed to get green | As the project sets |

Two rules hold the commit rung:

- **Check-only.** Run the formatter during implementation, before review, so
  the reviewed candidate is the committed one. A hook that rewrites files
  changes content after review and races other agents in a shared checkout.
- **Never stricter than CI.** The hook runs the repository's own rules on fewer
  files. If the hook fails on something CI allows (warnings, say), change one of
  them so both agree.

Anything that needs whole-project types or unit tests belongs to the push rung.
So do the [quality kit](quality-kit.md)'s layering, dead-code and suppression
count tools, which read the whole project; its table says which rung runs each.
Time a task before adding it to the hook; a slow or irrelevant hook teaches
agents to bypass it. The full end-to-end suite is never a hook: validation runs
the specs for the changed journey.

The push rung is a step, not a hook, because a hook cannot reuse evidence and
cannot tell which checks the branch's paths activate. Delivery's
[commit and push](../../delivery/references/commit-and-push.md) runs it from the
parity table below.

Classify each parity row by its actual trigger and gate: branch admission,
scheduled qualification or production proof. A selector escalation is not a
new local gate unless the repository requires that execution before merge.
Keep semantic declarations such as ownership and database lifecycle explicit.
Derive inventory counts and hashes from current inputs; check the invariant
they represent directly instead of requiring another committed copy. Debt
ratchets and safety baselines still enforce the promises they protect.

The push rung is not a local CI. This machine cannot run a full CI mirror:
several agents pushing from several worktrees at once means several builds and
dev servers in parallel, which has stalled it before. So the rung runs only the
cheap checks (lint, types, unit tests), and only those validation has not
already proved for matching relevant inputs. A build, a smoke run or any browser check
is never started just to push: if validation ran one for the change, that
evidence is reused; if not, the parity table names it hosted-only and CI runs
it. A red CI on one of those is an ordinary ladder miss, recorded as below.
Never start a build or browser run while another candidate's is running on the
machine (the development-runtime reference's reuse check applies).

## Node repositories: husky plus lint-staged

Use husky 9 with lint-staged 17 as devDependencies, installed by a root
`prepare: husky` script so `npm ci` or `pnpm install` sets it up in each clone.

```sh
# .husky/pre-commit
lint-staged --no-stash --fail-on-changes --max-arg-length 7000
```

```js
// lint-staged.config.mjs: check-only, the repository's own rules
export default {
  "*": "prettier --check --ignore-unknown",
  "*.{ts,tsx,js,jsx,mjs,cjs}": "eslint --no-warn-ignored",
  "DESIGN.md": "designmd lint",
};
```

- `--no-stash` is required. On failure, lint-staged's default backup path runs
  `git reset --hard HEAD`, which discards tracked edits another agent made in
  the same checkout during the run. With `--no-stash` it still hides unstaged
  hunks so tasks see staged content, and restores them even when a task fails.
- `--fail-on-changes` catches a task that was misconfigured as a fixer.
- `prettier --check --ignore-unknown` on `*` fails an unformatted staged file
  unchanged; agents format while implementing. List `pnpm-lock.yaml` in
  `.prettierignore`, since Prettier would requote pnpm's YAML and refuse every
  dependency commit.
- Type-aware ESLint rules that read generated types (Astro's `astro:content`,
  for example) fail in a fresh clone until the generator runs. Run it as a
  function task before ESLint (`[() => "astro sync", "eslint --no-warn-ignored"]`),
  the way the lint script does, provided it writes only ignored output.
- `--no-warn-ignored` stops ESLint failing a commit over a staged file its
  config ignores. The Biome equivalent is `biome lint --no-errors-on-unmatched`
  (and `biome format --no-errors-on-unmatched` for the files it formats), since
  Biome otherwise errors when every staged file falls under its ignore rules.
- A key without a slash matches a basename at any depth, so `DESIGN.md` would
  also run on `docs/DESIGN.md`. Anchor root-only files with a leading `./`
  (`"./DESIGN.md"`, `"./{biome.json,package.json}"`) and keep source keys
  scoped to the folders the linter covers (`"{scripts,tests}/**/*.{js,mjs,ts}"`).
- `designmd lint` exits 0 on warnings, and a dangling token reference is only
  a warning, so "lint clean" means no warnings either. Where the check script
  must enforce that, read `--format=json` and fail on a non-empty warnings
  list; the CLI (0.4.0) has no strict flag.
- Add `.husky/* text eol=lf` to `.gitattributes`.
- Never run `husky --version` or `npx husky --version`. Husky 9 has no version
  flag: any argument is an install directory, so it creates `--version/_` and
  points the repository's shared `core.hooksPath` at it, for every worktree.
  Use `npm ls husky` to see the version.
- Make formatters and linters devDependencies. A hook that downloads a package
  at run time (`npx -y`) needs the network and drifts.

Lefthook was rejected: it hides partially staged files with a patch and stash
shared by every linked worktree, so concurrent commits in several worktrees
destroy each other's unstaged changes (lefthook issue #1529, open). Its install
also runs as a dependency `postinstall`, which pnpm 10 skips unless allowlisted.

## Repositories that keep their own hooks

A repository that already tracks its hooks under `core.hooksPath` keeps them.
The usual case is a Python repository whose hooks snapshot the index for
concurrent agents, bind merge identity or pass through Git LFS; husky would
overwrite its `core.hooksPath`. Add the staged checks to its existing fast
profile instead. A repository with no linter or formatter gets no hook until it
has one; its push rung is its check script.

## Checks that need the harness

- **Stub `--check`** runs only where the harness is installed: at the commit
  rung when `.codex/skills/**` or `.claude/skills/**` is staged, and at the push
  rung when the branch touches them. The config resolves
  `${CODEX_HOME:-~/.codex}/skills/skills-list/scripts/claude-skill-stubs.mjs`;
  when it is absent the step prints "unavailable" and passes. Record it as
  `unavailable`, never as `pass`. The repository's check script uses the same
  skip, so it stays green in CI.
- **CI does not run it.** Fetching the harness in CI would tie every
  repository's CI to the harness and a token, for a check whose failure only
  hides a repository skill from Claude.
- **`designmd lint`** is an ordinary npm package, not a harness dependency, so
  it runs in the hook and in CI.

## Windows and worktrees

- Git runs hooks with its own `sh` whatever the calling shell, so hook files
  stay POSIX and call tools directly (husky puts `node_modules/.bin` on PATH).
  With `core.autocrlf=true`, a CRLF hook can fail; the `.gitattributes` line
  above prevents it.
- Node must be on PATH for Git's shell. GUI Git clients may need
  `~/.config/husky/init.sh`. Husky reports exit 127 when a command is missing.
- lint-staged's own chunking is not enough on Windows: cmd.exe caps a command
  line at 8191 characters and the `.CMD` shims add their own paths, so a large
  first commit fails with "The command line is too long". Keep
  `--max-arg-length 7000` on the hook line.
- Husky writes `core.hooksPath` into the shared repository config, so one
  install switches every linked worktree to the new hook and turns off any old
  `.git/hooks/pre-commit` for all of them. A worktree without installed
  dependencies, or on a branch from before the hook, runs no pre-commit; CI
  still gates it.

## CI parity table

The project's verification guide carries one row per CI job. The push rung
reads it: for each row whose trigger paths the branch touches, run the local
command when the row is a push-rung check and validation has not already run
it, or name the hosted-only reason.

| CI job | Trigger paths | Local command | Hosted-only reason |
|---|---|---|---|
| `<workflow>: <job>` | `<path filters, or all>` | `<exact command and working directory, for lint, types and unit tests only>` | `<empty, or why it does not run at push: build, smoke or browser run (validation evidence reused, else CI), trusted base, secret, hosted service>` |

- A workflow change updates the table in the same change.
- The best parity calls the same runner locally and in CI, with a CI profile.
- Build, smoke and browser jobs get a hosted-only reason ("push rung: reuse
  validation evidence or leave to CI"), never a local command in this table.
- The local aggregate (a `preflight` script) should cover every row that has a
  local command. A row missing from it is a known miss, not an unknown one.

## When CI misses

Classify the red run first (delivery's
[babysit](../../delivery/references/babysit.md), step 7). Infrastructure and a
stale base are not ladder misses. Establish the cause of an intermittent test
failure using code-review's [testing guidance](../../code-review/references/testing.md).
A failure in the diff's own code on a head whose local validation passed is a
ladder miss.

After the fix, record the miss once. Until the learning-event producer is
deployed on this host, write a finding at `findings/ci-green/<topic>.md` in the
project workspace (docs-workspace's `findings` route). It carries:

- project, the CI run URL, the red head and the CI job;
- the local evidence record that passed;
- the miss in one line, for example
  `not-selected: <workflow> <job> (<command>)`;
- the skills to repair: validate-implementation, plus code-review for a review
  miss.

Then run the harness retrospective on it. Once the producer is
deployed, record one `failed-task-finding` event with the same fields instead
(identity: project, run, red head, kind); see
[learning events](../../delivery/references/learning-events.md).

| Miss | Example | Repair owner |
|---|---|---|
| Not selected | A CI job the local aggregate never runs | The project's parity table, or this skill's selection |
| Selected, unavailable locally | A comparator that needs the trusted base | Mark it hosted-only in the parity table |
| Passed locally, failed in CI | CI on an older runtime than the local pin; local-only files the check read | Environment pin or ignore rules |
| No check exists | A defect only a reviewer could see | code-review |

the harness retrospective repairs the owner in the last column: the profile, the check
selection or the review skill, never only the symptom.

## Bypassing a hook

Do not bypass a repository hook (`--no-verify`, `HUSKY=0`). Fix the finding, or
report it when the hook itself is wrong, and repair the hook. A bypass that goes
red in CI is a ladder miss like any other.
