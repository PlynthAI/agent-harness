# The profile contract

A profile is the project's own answer to "which checks exist, and what makes each
one relevant". It is deliberately small: it names commands and the paths that
activate them. It is not a copy of CI, and it is not portable between projects.

## Where it lives

Where a project keeps a profile, its `AGENTS.md` names the path. A common choice
is a JSON file beside the project's other agent configuration. Do not assume a
path: read the project's own guidance first.

An existing project runner, its documentation and selection registry can supply
the profile. Do not duplicate them in this format. The JSON shape below is only
for projects choosing the shared select-checks.mjs helper; ordinary project
references need no schema conversion. When no profile exists, use declared
guidance and package scripts and report checks that could not be identified.

## Shape

```jsonc
{
  "schemaVersion": 1,
  "project": "example",
  "profiles": [
    {
      "id": "docs",
      "kind": "non-product",
      "when": ["docs/**", "**/*.md"],
      "checks": ["links"]
    },
    {
      "id": "backend",
      "kind": "product",
      "when": ["src/**/*.py", "tests/**/*.py"],
      "checks": ["lint", "types", "unit"]
    },
    {
      "id": "frontend",
      "kind": "product",
      "when": ["app/**/*.tsx", "components/**/*.tsx"],
      "checks": ["eslint", "tsc", "browser"]
    }
  ],
  "checks": [
    { "id": "links",   "run": "<project command>", "required": true },
    { "id": "lint",    "run": "<project command>", "required": true },
    { "id": "types",   "run": "<project command>", "required": true },
    { "id": "unit",    "run": "<project command>", "required": true },
    { "id": "eslint",  "run": "<project command>", "required": true },
    { "id": "tsc",     "run": "<project command>", "required": true },
    { "id": "browser", "run": "<project command>", "required": false,
      "requires": ["dev-server"] }
  ]
}
```

| Field | Meaning |
|---|---|
| `schemaVersion` | must be `1` |
| `project` | the project's own identifier |
| `profiles[].id` | short name used in the evidence record |
| `profiles[].kind` | `product` or `non-product`; a non-product profile carries no product obligation |
| `profiles[].when` | globs over changed paths that activate this profile |
| `profiles[].checks` | ids of the checks this profile selects |
| `checks[].run` | the exact command the project owns |
| `checks[].required` | whether a missing or skipped check blocks qualification |
| `checks[].requires` | anything that must be available first, such as a dev server. Selection reports these as `prerequisites`, so a required check whose prerequisite is missing is reported rather than assumed to work |

Globs are matched over repository-relative paths with forward slashes. `*`
matches within one path segment, `**` matches across segments.

## What `when` may not be

`when` describes a **path surface**. It is not a place to encode a snapshot
(staged, committed, range or dirty), an escalation ladder (fast, affected, full),
or a risk level.

A product profile whose `when` matches every path is rejected, because it turns
every change into that profile's obligation: a docs-only change would select a
product check, which is the failure this contract exists to prevent. Where a
project has rungs like fast, affected and full, the **project's own runner**
chooses between them, using its own snapshot and risk predicates, and the profile
names only the check list each surface activates. The runner's own outcome
vocabulary - escalated, blocked, diagnostic - stays with the runner; this
contract's vocabulary is about what was selected and what happened to it.

## The four shapes it must describe

| Shape | What selection must produce |
|---|---|
| backend | the backend profile's checks, and nothing from another surface |
| frontend/browser | the frontend profile's checks, including a browser check when the change has a rendered surface |
| docs or harness-only | a non-product profile only; no product test runs |
| mixed | every activated product profile's checks, unioned, with the activated profiles named |

A path that matches no profile at all is reported as unmapped. An unmapped
production path is a gap in the profile to fix, not a green result.

## What the project owns

- The commands, their flags and their working directory.
- Which checks are required, and which are optional or advisory.
- The environment and fixtures a check needs.
- Where the raw output is stored.

## What this skill owns

- Selecting from the profile against the changed paths.
- Naming the profiles and checks it left out, and why.
- Recording one result per selected check, in the plain status vocabulary.
- Refusing to call a skipped, unavailable or cancelled check a pass.
- Deciding when earlier evidence is still valid to reuse.
