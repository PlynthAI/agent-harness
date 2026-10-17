# Reapplies local adaptations to a freshly copied upstream Impeccable 4.x skill
# (the Codex variant, `.agents/skills/impeccable/` in the release's
# universal.zip) so it matches the harness copy at skills/design/impeccable, a
# method nested under the design skill:
#
#   1. trims the command references nothing in the harness routes to, the
#      bundled Codex custom agents the harness does not register and the picker
#      metadata (agents/openai.yaml), which a nested method does not carry;
#   2. markdown prose writes the launcher path skill-relatively (`scripts/...`)
#      instead of upstream's project-relative `.agents/skills/impeccable/scripts/...`,
#      so a user-level install resolves;
#   3. the entry file SKILL.md becomes METHOD.md, so a recursive skill scan does
#      not list the method on its own, and prose naming SKILL.md follows it; the
#      frontmatter carries the harness description;
#   4. the generated `$impeccable ...` command becomes `design/impeccable ...`;
#   5. the source-form `/impeccable ...` command becomes `design/impeccable ...`,
#      guarded so a path or URL is never touched;
#   6. a provider-relative installed-skill path `<provider>/skills/impeccable`
#      becomes `<provider>/skills/design/impeccable`;
#   7. literal rewrites: METHOD.md's command table loses the trimmed rows and the
#      Pin and Doctor paragraphs, METHOD.md gains the harness section, live.md's
#      Codex escalation line keeps the active task's permissions, and the
#      launchers default telemetry, the update check and the live copy agent to
#      off/in-task.
#
# Not rewritten: the engine's own verbs and project storage (`impeccable detect`,
# `.impeccable/`), live markup attributes (`data-impeccable-*`) and the shipped
# subagent names (`impeccable_finish_reviewer`), which the engine and references
# use as identifiers. Only markdown carries command names; scripts,
# engine data and binaries are rewritten only by the literal launcher rules.
#
# Idempotent. Run it against a fresh upstream copy before comparing that copy
# with the harness copy during an upstream review. Run at its default root it
# rewrites nothing, because the harness copy already carries the adapted form.
# checks/port-adaptations.ps1 asserts that.
#
#   pwsh -File config/port-adaptations/impeccable-relative-script-paths.ps1 -Root <path-to-upstream-skill>
#
[CmdletBinding()]
param(
    [string]$Root = (Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'skills\design\impeccable')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Root -PathType Container)) {
    throw "Skill root not found: $Root"
}
$rootFull = (Resolve-Path -LiteralPath $Root).Path
$LF = [string][char]10
$CRLF = [string][char]13 + [char]10
$changed = 0
$relative = { param($full) $full.Substring($rootFull.Length).TrimStart('\', '/').Replace('\', '/') }
function Read-Normalised([string]$Path) { return [IO.File]::ReadAllText($Path).Replace($CRLF, $LF) }

# 1. Trim. Sub-command references the design router, the design leaves and the
# kept references never reach. Live's variant actions (bolder, quieter, distill,
# typeset, colorize, layout, adapt, animate, delight, overdrive), shape (linked
# from new-work and init) and the native platform references (linked from the
# kept references) stay.
$trimmed = @(
    'reference/craft.md', 'reference/extract.md', 'reference/audit.md', 'reference/audit.native.md',
    'reference/harden.md', 'reference/onboard.md', 'reference/clarify.md', 'reference/optimize.md',
    'reference/doctor.md'
)
foreach ($path in $trimmed) {
    $full = Join-Path $rootFull $path
    if (Test-Path -LiteralPath $full -PathType Leaf) {
        Remove-Item -LiteralPath $full
        $changed++
        Write-Output "${path}: trimmed"
    }
}
$agentsDir = Join-Path $rootFull 'agents'
foreach ($agent in @(Get-ChildItem -LiteralPath $agentsDir -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -eq '.toml' -or $_.Name -eq 'openai.yaml' })) {
    Remove-Item -LiteralPath $agent.FullName
    $changed++
    Write-Output ("{0}: trimmed" -f (& $relative $agent.FullName))
}
if ((Test-Path -LiteralPath $agentsDir -PathType Container) -and -not (Get-ChildItem -LiteralPath $agentsDir -Force)) {
    Remove-Item -LiteralPath $agentsDir
}

# 3. Entry file. A nested method carries METHOD.md, not SKILL.md.
$skillPath = Join-Path $rootFull 'METHOD.md'
$upstreamEntry = Join-Path $rootFull 'SKILL.md'
if (Test-Path -LiteralPath $upstreamEntry -PathType Leaf) {
    if (Test-Path -LiteralPath $skillPath) { throw 'Both SKILL.md and METHOD.md exist' }
    Move-Item -LiteralPath $upstreamEntry -Destination $skillPath
    $changed++
    Write-Output 'SKILL.md: renamed to METHOD.md'
}

# 7a. Literal rewrites against upstream text. Each rule is satisfied when its
# After text is present; a rule whose Before and After are both missing means
# upstream drifted and the rule needs review.
$harnessSection = @'
## Harness install

This is the shared harness's `design/impeccable` method: Impeccable 4.3.1 on engine 0.1.5, installed once per user at `~/.codex/skills/design/impeccable` and reached by Claude Code at `~/.claude/skills/design/impeccable`. `design/impeccable <command>` means this method's command, reached through the design skill. Where the text below conflicts with this section, this section wins.

- **Engine.** `scripts/impeccable` (`scripts/impeccable.cmd` on a Windows shell without `sh`) runs the pinned engine that the harness deploy places in `scripts/bin/`. The launcher defaults `IMPECCABLE_NO_TELEMETRY`, `IMPECCABLE_NO_UPDATE_CHECK` and `IMPECCABLE_LIVE_COPY_AGENT=chat`; leave them set, so live copy edits stay in the active task instead of a separate agent that bypasses approvals.
- **Nothing is installed into a project.** Never run `install`, `update`, `link`, `pin` or `unpin`, and ignore an `UPDATE_AVAILABLE` directive: the harness pins the version and owns upgrades. Never copy the skill or the engine into a repository.
- **Hooks.** Wire a project with [reference/adoption.md](reference/adoption.md), not `hooks on` or `hooks reset`, which manage manifests for a project-local skill. The other `hooks` actions (`status`, `off`, the `ignore-*` actions) work as documented. When engine output points at an `impeccable hooks` command, it means this skill's `hooks` route. `MANUAL_DETECTOR_REQUIRED` is expected from `context` with this user-level install, even when the hook is wired; run the one detector pass it asks for.
- **Live helper server.** Engine 0.1.5 accepts any origin that presents the helper's token (the 3.x origin check is gone and cannot be restored from here). Keep the helper on localhost, never forward, tunnel or expose its port, and stop it with `live-server stop` at closeout.
- **Design authority.** `context` loads the project's root `DESIGN.md` (Google DESIGN.md format; see the design skill's design-md-adoption reference) and `PRODUCT.md`. When the project's PROJECT.md names another directory for them, set `IMPECCABLE_CONTEXT_DIR=<that directory>` on every engine call.
- **Known detector gap.** The compiled engine (0.1.5 pinned; 0.1.9 checked on 2026-10-01 behaves the same) reads a `transition` value only when it sits on the declaration's line: a Prettier-formatted declaration whose value wraps onto following lines never raises `layout-transition`. The detector is upstream code, not harness source, so the gap closes only through an upstream fix and a pin bump. Until then, when a diff adds or reformats a wrapped `transition`, check its animated properties by eye (width, height, padding and margin are the ones the rule bans).
- **Commands not shipped here.** This install carries what the design skill routes to: new work, critique, polish, live with its variant actions, document, init, shape and hooks. When a reference or critique suggests another command, use the harness method instead: `audit` or `harden` → `design/review` and the `design/app-ui` polish reference; `clarify` → `writing`; `optimize` → the project's performance checks; `onboard` → `design/app-ui`; `extract` → `design/components`; `doctor` → report the drift. Mobile-web viewport, touch and browser behaviour route to `design/mobile-native`; native app frameworks (SwiftUI, Compose, React Native) use the project's own methods, since this library carries no native method.
- **Subagents.** The shipped Impeccable subagents (`impeccable_finish_reviewer`, `impeccable_documenter`, `impeccable_asset_producer`, `impeccable_manual_edit_applier`) are not registered. Where a reference says to spawn one, spawn a fresh, unforked subagent whose brief is the matching `reference/degraded/<role>.md`, skipping its inline-substitution preamble, with the input packet the reference lists. Run it inline only when no subagent is available.

'@
$literalRules = @(
    @{
        Path = 'METHOD.md'
        Before = 'and `.agents/skills/impeccable/scripts` is the fallback only when the runtime reports no base directory.'
        After = 'and the harness install (`~/.codex/skills/design/impeccable`, reached by Claude Code as `~/.claude/skills/design/impeccable`) is the fallback only when the runtime reports no base directory.'
    }
    @{
        Path = 'METHOD.md'
        Pattern = '(?m)^\| `(craft|extract|audit|harden|onboard|clarify|optimize) [^\n]*\n'
        After = $null
    }
    @{
        Path = 'METHOD.md'
        Pattern = '(?m)^\*\*(Pin / Unpin|Doctor):\*\*[^\n]*\n(\n)?'
        After = $null
    }
    @{
        Path = 'METHOD.md'
        Pattern = '(?s)\A(---\n.*?\n---\n)\n(?!## Harness install)'
        Replacement = '$1' + $LF + $harnessSection.Replace($CRLF, $LF).Replace('$', '$$') + $LF
        After = '## Harness install'
    }
    @{
        Path = 'reference/live.md'
        Before = 'Codex: run live helper commands, the app dev server, and any dependency-installing setup with `sandbox_permissions: "require_escalated"` from the start; live mode depends on localhost and package-manager network access that the sandbox blocks.'
        After = 'Run live helpers, the app dev server and any dependency-installing setup with the active task''s existing permissions and model. If localhost, filesystem or package access needs more permission, the coordinating task uses its supported permission request for that action. Do not bypass approvals or start a separate agent. Apply and repair use the existing chat poll; if it disconnects, run `scripts/impeccable live-poll` again and retry Apply. Staged edits remain available.'
    }
    @{
        Path = 'scripts/impeccable'
        Before = ': "${IMPECCABLE_SELF:=$0}"' + $LF + 'export IMPECCABLE_SKILL_DIR IMPECCABLE_SELF' + $LF
        After = ': "${IMPECCABLE_SELF:=$0}"' + $LF + 'export IMPECCABLE_SKILL_DIR IMPECCABLE_SELF' + $LF +
            '# Harness defaults: no telemetry or update check, live copy edits in the active task.' + $LF +
            ': "${IMPECCABLE_NO_TELEMETRY:=1}" "${IMPECCABLE_NO_UPDATE_CHECK:=1}" "${IMPECCABLE_LIVE_COPY_AGENT:=chat}"' + $LF +
            'export IMPECCABLE_NO_TELEMETRY IMPECCABLE_NO_UPDATE_CHECK IMPECCABLE_LIVE_COPY_AGENT' + $LF
    }
    @{
        Path = 'scripts/impeccable.cmd'
        Before = 'if not defined IMPECCABLE_SELF set "IMPECCABLE_SELF=%~f0"' + $LF
        After = 'if not defined IMPECCABLE_SELF set "IMPECCABLE_SELF=%~f0"' + $LF +
            'rem Harness defaults: no telemetry or update check, live copy edits in the active task.' + $LF +
            'if not defined IMPECCABLE_NO_TELEMETRY set "IMPECCABLE_NO_TELEMETRY=1"' + $LF +
            'if not defined IMPECCABLE_NO_UPDATE_CHECK set "IMPECCABLE_NO_UPDATE_CHECK=1"' + $LF +
            'if not defined IMPECCABLE_LIVE_COPY_AGENT set "IMPECCABLE_LIVE_COPY_AGENT=chat"' + $LF
    }
)
foreach ($rule in $literalRules) {
    $path = Join-Path $rootFull $rule.Path
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Adaptation target missing: $($rule.Path)" }
    $raw = [IO.File]::ReadAllText($path)
    $hadCrlf = $raw.Contains($CRLF)
    $text = $raw.Replace($CRLF, $LF)
    $before = $text
    if ($rule.ContainsKey('Pattern')) {
        $replacement = if ($rule.ContainsKey('Replacement')) { $rule.Replacement } else { '' }
        $text = [regex]::Replace($text, $rule.Pattern, $replacement)
        if ($rule.After -and -not $text.Contains($rule.After)) { throw "Adaptation target drifted: $($rule.Path) ($($rule.After))" }
    }
    elseif (-not $text.Contains($rule.After)) {
        if (-not $text.Contains($rule.Before)) { throw "Adaptation target drifted: $($rule.Path)" }
        $text = $text.Replace($rule.Before, $rule.After)
    }
    if ($text -ne $before) {
        if ($hadCrlf) { $text = $text.Replace($LF, $CRLF) }
        [IO.File]::WriteAllText($path, $text)
        $changed++
        Write-Output "$($rule.Path): literal adaptation"
    }
}

# 3. Frontmatter.
$skill = Read-Normalised $skillPath
$frontmatter = [regex]::Match($skill, '(?s)\A---\n(.*?)\n---\n')
if (-not $frontmatter.Success) { throw 'METHOD.md has no frontmatter' }
$version = [regex]::Match($frontmatter.Groups[1].Value, '(?m)^\s+version:\s*(\S+)\s*$')
if (-not $version.Success) { throw 'METHOD.md frontmatter carries no metadata version' }
$wantFrontmatter = @(
    '---'
    'name: impeccable'
    'description: Design, critique, polish or live-iterate frontend interfaces with the Impeccable engine, including visual craft, UX, accessibility, responsive behavior, the design detector and its edit hook. Not for non-UI work.'
    'metadata:'
    "  version: $($version.Groups[1].Value)"
    '---'
    ''
) -join $LF
if (-not $skill.StartsWith($wantFrontmatter)) {
    $skill = $wantFrontmatter + $skill.Substring($frontmatter.Length)
    [IO.File]::WriteAllText($skillPath, $skill)
    $changed++
    Write-Output 'METHOD.md: frontmatter'
}

# 2, 3, 4, 5 and 6. Paths, the entry file's name and command names, in the prose.
# Scripts and data are left alone: in them `/impeccable` is a path.
$needle = '.agents/skills/impeccable/scripts/'
$entryPattern = '(?<![\w./-])SKILL\.md(?![\w-])'
$invocationPattern = '\$impeccable(?![A-Za-z0-9_-])'
$slashPattern = '(?<![A-Za-z0-9_./}])/impeccable(?![A-Za-z0-9_-])'
$providerPattern = '(?<![\w.-])((?:\.agents|\.claude|\.codex|\.cursor|\.github)/skills)/impeccable(?![A-Za-z0-9_-])'
$scanned = 0
foreach ($file in @(Get-ChildItem -LiteralPath $rootFull -Recurse -File)) {
    $rel = & $relative $file.FullName
    if ($file.Extension -ne '.md') { continue }
    $scanned++
    $raw = [IO.File]::ReadAllText($file.FullName)
    $text = $raw
    $count = 0
    if ($text.Contains($needle)) {
        $count += ([regex]::Matches($text, [regex]::Escape($needle))).Count
        $text = $text.Replace($needle, 'scripts/')
    }
    foreach ($rewrite in @(
            @($entryPattern, 'METHOD.md'),
            @($invocationPattern, 'design/impeccable'),
            @($slashPattern, 'design/impeccable'),
            @($providerPattern, '$1/design/impeccable'))) {
        $hits = ([regex]::Matches($text, $rewrite[0])).Count
        if ($hits) {
            $text = [regex]::Replace($text, $rewrite[0], $rewrite[1])
            $count += $hits
        }
    }
    if ($count -eq 0) { continue }
    [IO.File]::WriteAllText($file.FullName, $text)
    $changed += $count
    Write-Output ("{0}: {1} occurrence(s)" -f $rel, $count)
}

Write-Output ("scanned {0} prose file(s); total rewritten: {1}" -f $scanned, $changed)
