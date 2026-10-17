# Wiring a project to the harness Impeccable

The harness installs Impeccable once per user. The method lives at
`~/.codex/skills/design/impeccable`, which Claude Code reaches as
`~/.claude/skills/design/impeccable`. The pinned engine sits inside it at
`scripts/bin/<os>-<arch>/`, fetched and checksum-verified by the harness deploy.
A repository carries neither. It carries its own design context, its Impeccable
config and hook entries that call the harness install.

## What goes where

| Item | Lives in | Committed |
| --- | --- | --- |
| Skill, launcher and engine | the harness install | never copied into a repository |
| `DESIGN.md` and `PRODUCT.md` | the repository root, or the directory PROJECT.md names | yes |
| `.impeccable/config.json` | the repository | yes |
| `.impeccable/design.json`, the DESIGN.md sidecar that `document` writes | the repository | yes |
| `.impeccable/surfaces/` surface briefs and `.impeccable/live/config.json` | the repository | yes |
| `.impeccable/critique/ignore.md`, critique findings the team has set aside | the repository | yes |
| Hook entries in `.claude/settings.json` and `.codex/hooks.json` | the repository | yes |
| Per-developer and session state under `.impeccable/` | the repository | no, see the ignore block |

## The engine in a repository's CI

"Never per repository" means never a vendored or committed copy of the skill or
the engine: no checked-in Impeccable scripts folder, detector sources or platform
binaries. Remove such a copy when the repository adopts this recipe.

A repository whose CI runs the detector as part of `design:check` may pin the
npm package as a devDependency. That is the repository's own decision, and its
lockfile owns the version:

```bash
npm install --save-dev --save-exact impeccable@4.1.0
```

The check script then runs `npx impeccable detect --json <dirs>`. Package 4.1.0
resolves the same engine 0.1.5 as the harness through its platform
`optionalDependencies` and needs Node 22.18 or later. The harness install serves
the skill and the hooks; the devDependency serves CI. Keep the two versions in
step when either moves.

## `.impeccable/config.json`

Start from this and change it only through the engine:

```json
{
  "detector": {
    "ignoreRules": [],
    "ignoreFiles": [],
    "ignoreValues": []
  },
  "hook": {
    "enabled": true,
    "limits": { "maxFindings": 5, "maxChars": 8000 }
  }
}
```

- `detector` holds the shared ignores that the hook, `detect` and CI all read.
  Add them with `scripts/impeccable hooks ignore-value|ignore-file|ignore-rule`,
  following [hooks.md](hooks.md). An `ignoreValues` entry records `rule`,
  `value`, optional `files`, `createdAt` and a `reason` naming who decided and
  on what evidence.
- `detector.extensions` declares server-side template extensions the detector
  would otherwise skip, for example `[{ "ext": ".blade.php", "engine": "html" }]`.
  It is the one field edited by hand.
- `detector.designSystem.enabled` switches the rules that check against the
  project's DESIGN.md tokens.
- `hook` holds the hook runtime: `enabled`, optional `quiet`, `perEditRules:
  "all"` to run every rule on each edit instead of the immediate tier, `auditLog`
  for an NDJSON log, and `limits`.
- Per-developer choices, including hook consent, go in the gitignored
  `.impeccable/config.local.json`, which the engine writes.

## Ignore block

Add to the repository's `.gitignore`:

```gitignore
# Impeccable per-developer and session state
.impeccable/config.local.json
.impeccable/hook.cache.json
.impeccable/hook.pending.json
.impeccable/live/*
!.impeccable/live/config.json
.impeccable/critique/*
!.impeccable/critique/ignore.md
.impeccable/review/
.impeccable/build/
.impeccable/mocks/
```

## Claude Code hook

Merge into the committed `.claude/settings.json`. The guard makes the entry a
no-op on a machine without the harness install. Claude Code on Windows runs hook
commands through Git Bash, where `$HOME` is the user profile, but with the
Windows PATH, which on most machines lacks Git's `usr/bin`; the launcher then
dies at `dirname` with exit 1 and every hook run shows as failed. The
`PATH="/usr/bin:$PATH"` prefix restores the Git coreutils (it resolves inside
Git Bash whatever the install path) and is harmless on macOS and Linux.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "PATH=\"/usr/bin:$PATH\"; [ ! -f \"$HOME/.claude/skills/design/impeccable/scripts/impeccable\" ] || \"$HOME/.claude/skills/design/impeccable/scripts/impeccable\" hook",
            "timeout": 5,
            "statusMessage": "Checking UI changes"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "PATH=\"/usr/bin:$PATH\"; [ ! -f \"$HOME/.claude/skills/design/impeccable/scripts/impeccable\" ] || \"$HOME/.claude/skills/design/impeccable/scripts/impeccable\" hook",
            "timeout": 30,
            "statusMessage": "Design deep pass"
          }
        ]
      }
    ]
  }
}
```

## Codex hook

Merge into the committed `.codex/hooks.json`. Codex uses `commandWindows` on
Windows and asks the user to approve project hooks through `/hooks` the first
time.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|apply_patch",
        "hooks": [
          {
            "type": "command",
            "command": "[ ! -f \"${CODEX_HOME:-$HOME/.codex}/skills/design/impeccable/scripts/impeccable\" ] || \"${CODEX_HOME:-$HOME/.codex}/skills/design/impeccable/scripts/impeccable\" hook",
            "commandWindows": "powershell.exe -NoLogo -NoProfile -NonInteractive -OutputFormat Text -EncodedCommand JABFAHIAcgBvAHIAQQBjAHQAaQBvAG4AUAByAGUAZgBlAHIAZQBuAGMAZQA9ACcAUwB0AG8AcAAnADsAJABmAD0AJABuAHUAbABsADsAaQBmACgAJABlAG4AdgA6AEMATwBEAEUAWABfAEgATwBNAEUAKQB7ACQAYwA9ACQAZQBuAHYAOgBDAE8ARABFAFgAXwBIAE8ATQBFACsAJwBcAHMAawBpAGwAbABzAFwAZABlAHMAaQBnAG4AXABpAG0AcABlAGMAYwBhAGIAbABlAFwAcwBjAHIAaQBwAHQAcwBcAGkAbQBwAGUAYwBjAGEAYgBsAGUALgBjAG0AZAAnADsAaQBmACgAWwBJAE8ALgBGAGkAbABlAF0AOgA6AEUAeABpAHMAdABzACgAJABjACkAKQB7ACQAZgA9ACQAYwB9AH0AOwBpAGYAKAAtAG4AbwB0ACAAJABmACAALQBhAG4AZAAgACQAZQBuAHYAOgBVAFMARQBSAFAAUgBPAEYASQBMAEUAKQB7ACQAYwA9ACQAZQBuAHYAOgBVAFMARQBSAFAAUgBPAEYASQBMAEUAKwAnAFwALgBjAG8AZABlAHgAXABzAGsAaQBsAGwAcwBcAGQAZQBzAGkAZwBuAFwAaQBtAHAAZQBjAGMAYQBiAGwAZQBcAHMAYwByAGkAcAB0AHMAXABpAG0AcABlAGMAYwBhAGIAbABlAC4AYwBtAGQAJwA7AGkAZgAoAFsASQBPAC4ARgBpAGwAZQBdADoAOgBFAHgAaQBzAHQAcwAoACQAYwApACkAewAkAGYAPQAkAGMAfQB9ADsAaQBmACgALQBuAG8AdAAgACQAZgApAHsAZQB4AGkAdAAgADAAfQA7ACQAcwA9AFsARABpAGEAZwBuAG8AcwB0AGkAYwBzAC4AUAByAG8AYwBlAHMAcwBTAHQAYQByAHQASQBuAGYAbwBdADoAOgBuAGUAdwAoACkAOwAkAHMALgBGAGkAbABlAE4AYQBtAGUAPQAkAGUAbgB2ADoAQwBvAG0AUwBwAGUAYwA7ACQAcwAuAEEAcgBnAHUAbQBlAG4AdABzAD0AJwAvAGQAIAAvAGMAIABjAGEAbABsACAAIgAnACsAJABmACsAJwAiACAAaABvAG8AawAnADsAJABzAC4AVQBzAGUAUwBoAGUAbABsAEUAeABlAGMAdQB0AGUAPQAkAGYAYQBsAHMAZQA7ACQAcAA9AFsARABpAGEAZwBuAG8AcwB0AGkAYwBzAC4AUAByAG8AYwBlAHMAcwBdADoAOgBTAHQAYQByAHQAKAAkAHMAKQA7ACQAcAAuAFcAYQBpAHQARgBvAHIARQB4AGkAdAAoACkAOwBlAHgAaQB0ACAAJABwAC4ARQB4AGkAdABDAG8AZABlAA==",
            "timeout": 5,
            "statusMessage": "Checking UI changes"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "[ ! -f \"${CODEX_HOME:-$HOME/.codex}/skills/design/impeccable/scripts/impeccable\" ] || \"${CODEX_HOME:-$HOME/.codex}/skills/design/impeccable/scripts/impeccable\" hook",
            "commandWindows": "powershell.exe -NoLogo -NoProfile -NonInteractive -OutputFormat Text -EncodedCommand JABFAHIAcgBvAHIAQQBjAHQAaQBvAG4AUAByAGUAZgBlAHIAZQBuAGMAZQA9ACcAUwB0AG8AcAAnADsAJABmAD0AJABuAHUAbABsADsAaQBmACgAJABlAG4AdgA6AEMATwBEAEUAWABfAEgATwBNAEUAKQB7ACQAYwA9ACQAZQBuAHYAOgBDAE8ARABFAFgAXwBIAE8ATQBFACsAJwBcAHMAawBpAGwAbABzAFwAZABlAHMAaQBnAG4AXABpAG0AcABlAGMAYwBhAGIAbABlAFwAcwBjAHIAaQBwAHQAcwBcAGkAbQBwAGUAYwBjAGEAYgBsAGUALgBjAG0AZAAnADsAaQBmACgAWwBJAE8ALgBGAGkAbABlAF0AOgA6AEUAeABpAHMAdABzACgAJABjACkAKQB7ACQAZgA9ACQAYwB9AH0AOwBpAGYAKAAtAG4AbwB0ACAAJABmACAALQBhAG4AZAAgACQAZQBuAHYAOgBVAFMARQBSAFAAUgBPAEYASQBMAEUAKQB7ACQAYwA9ACQAZQBuAHYAOgBVAFMARQBSAFAAUgBPAEYASQBMAEUAKwAnAFwALgBjAG8AZABlAHgAXABzAGsAaQBsAGwAcwBcAGQAZQBzAGkAZwBuAFwAaQBtAHAAZQBjAGMAYQBiAGwAZQBcAHMAYwByAGkAcAB0AHMAXABpAG0AcABlAGMAYwBhAGIAbABlAC4AYwBtAGQAJwA7AGkAZgAoAFsASQBPAC4ARgBpAGwAZQBdADoAOgBFAHgAaQBzAHQAcwAoACQAYwApACkAewAkAGYAPQAkAGMAfQB9ADsAaQBmACgALQBuAG8AdAAgACQAZgApAHsAZQB4AGkAdAAgADAAfQA7ACQAcwA9AFsARABpAGEAZwBuAG8AcwB0AGkAYwBzAC4AUAByAG8AYwBlAHMAcwBTAHQAYQByAHQASQBuAGYAbwBdADoAOgBuAGUAdwAoACkAOwAkAHMALgBGAGkAbABlAE4AYQBtAGUAPQAkAGUAbgB2ADoAQwBvAG0AUwBwAGUAYwA7ACQAcwAuAEEAcgBnAHUAbQBlAG4AdABzAD0AJwAvAGQAIAAvAGMAIABjAGEAbABsACAAIgAnACsAJABmACsAJwAiACAAaABvAG8AawAnADsAJABzAC4AVQBzAGUAUwBoAGUAbABsAEUAeABlAGMAdQB0AGUAPQAkAGYAYQBsAHMAZQA7ACQAcAA9AFsARABpAGEAZwBuAG8AcwB0AGkAYwBzAC4AUAByAG8AYwBlAHMAcwBdADoAOgBTAHQAYQByAHQAKAAkAHMAKQA7ACQAcAAuAFcAYQBpAHQARgBvAHIARQB4AGkAdAAoACkAOwBlAHgAaQB0ACAAJABwAC4ARQB4AGkAdABDAG8AZABlAA==",
            "timeout": 30,
            "statusMessage": "Design deep pass"
          }
        ]
      }
    ]
  }
}
```

## Windows interpreter boundary

Codex selects `commandWindows` on Windows but executes it through the chat's
shell. It does not imply `cmd.exe`. Bare `if exist` commands fail at parsing
in PowerShell before reaching the launcher. The recipe explicitly starts
Windows PowerShell with an encoded command, so the outer shell cannot change
quotes or expand variables. This selects an interpreter; it changes no execution
policy or hook trust. The decoded command is:

```powershell
$ErrorActionPreference='Stop';$f=$null;if($env:CODEX_HOME){$c=$env:CODEX_HOME+'\skills\design\impeccable\scripts\impeccable.cmd';if([IO.File]::Exists($c)){$f=$c}};if(-not $f -and $env:USERPROFILE){$c=$env:USERPROFILE+'\.codex\skills\design\impeccable\scripts\impeccable.cmd';if([IO.File]::Exists($c)){$f=$c}};if(-not $f){exit 0};$s=[Diagnostics.ProcessStartInfo]::new();$s.FileName=$env:ComSpec;$s.Arguments='/d /c call "'+$f+'" hook';$s.UseShellExecute=$false;$p=[Diagnostics.Process]::Start($s);$p.WaitForExit();exit $p.ExitCode
```

The command selects CODEX_HOME first, then USERPROFILE, and starts the existing
launcher with inherited stdin, stdout and stderr. It uses .NET file checks to
avoid module-autoload progress output. Missing installations exit quietly with
zero; execution failures remain failures. An outer PowerShell normalizes native
nonzero exits to 1, while cmd retains the engine's code.

To regenerate the argument after editing the decoded command, assign its text to
`$script` and run
`[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))`.
Update both event entries and run `node --test checks/impeccable-wiring.test.mjs`.
Set `IMPECCABLE_TEST_ENGINE` to an already installed pinned binary to include
real-engine checks; that check never downloads a binary. Source:
[Codex 0.159.2 hook shell selection](https://github.com/openai/codex/blob/rust-v0.159.2/codex-rs/core/src/session/mod.rs#L4968).

Changed commands need renewed approval in Codex's hook controls. Approve the
specific reviewed entries; do not broaden project trust. Shell checks and engine
checks do not replace fresh PostToolUse and Stop results in Hook stats.

## Design authority outside the root

The root `DESIGN.md` is the standard; the design skill's design-md-adoption
reference moves a nested one there. While a project's PROJECT.md still names
another directory, name it at the start of each hook command, for example
`export IMPECCABLE_CONTEXT_DIR=docs/design; ` at the start of `command`, and
set `$env:IMPECCABLE_CONTEXT_DIR='docs\design';` at the start of the decoded
Windows command before regenerating its encoded argument.
Drop the prefix when the file moves to the root.

## Proof

1. The hook fires: edit a UI file with a known finding, such as gradient text,
   and the next turn shows an `[impeccable@1]` reminder.
2. `scripts/impeccable hooks status` in the repository reports the hook enabled
   and the shared config path.
3. `git ls-files` lists no Impeccable scripts, detector sources or binaries.
4. When CI runs the detector, `design:check` passes with the pinned
   devDependency.
