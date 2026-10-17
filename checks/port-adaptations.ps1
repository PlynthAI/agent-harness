#Requires -Version 7.0
<#
.SYNOPSIS
    Regression check for the recorded port adaptations and the pinned engine fetch.

.DESCRIPTION
    A ported third-party package whose content needed mechanical changes ships
    the script that reapplies them, so an upstream comparison is repeatable.
    design/impeccable is Impeccable 4.x (the release's Codex variant) trimmed
    and adapted by config/port-adaptations/impeccable-relative-script-paths.ps1.

    The check proves, without network access:

      * the shipped skill is a fixed point of the adaptation: a copy of it
        rewrites nothing and stays byte-identical;
      * the adaptation turns an upstream-form tree back into exactly the shipped
        tree. The fixture is rebuilt from the shipped copy by undoing every
        recorded departure (trimmed files, table rows and paragraphs, the harness
        section, the literal rewrites, the entry file's name, the frontmatter,
        the interface metadata and the prose rewrites), so an extra rewrite or a swallowed one fails as
        a byte difference, and the reported count must equal the undone count;
      * forms that merely resemble an invocation (URLs, engine storage, markup
        attributes, subagent names) are never rewritten;
      * upstream drift under a literal rule stops the adaptation instead of
        passing silently;
      * the shipped skill keeps the package identity, routes and wiring recipe
        the harness relies on;
      * config/deploy.ps1 places the pinned engine inside the installed skill
        only when that skill ships, verifies the recorded SHA-256 before
        anything is moved into place, skips an engine already at the pin,
        refuses an unknown binary, replaces its own binary when the pin moves
        and retires it with the skill. A local mirror stands in for the release
        channel, and the pin for this platform is replaced by the mirror
        file's hash in a copy of the real map.

    Deliberately NOT checked here: whether the adaptation is the right one, or
    whether the ported package is otherwise faithful. Those are the upstream
    review's and the independent reviewer's job.
#>
[CmdletBinding()]
param([switch]$Quiet)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$failures = [System.Collections.Generic.List[string]]::new()
$checks = 0

function Assert-True {
    param([bool]$Condition, [string]$Message)
    $script:checks++
    if ($Condition) { if (-not $Quiet) { Write-Host ("  ok   " + $Message) } }
    else { $script:failures.Add($Message); Write-Host ("  FAIL " + $Message) }
}

$root = Split-Path $PSScriptRoot -Parent
$scriptPath = Join-Path $root 'config\port-adaptations\impeccable-relative-script-paths.ps1'
$deployPath = Join-Path $root 'config\deploy.ps1'
$mapPath = Join-Path $root 'config\install-map.json'
$sourceSkill = Join-Path $root 'skills\design\impeccable'
$noticePath = Join-Path $root 'THIRD_PARTY_NOTICES.md'
$LF = [string][char]10
$CRLF = [string][char]13 + [char]10
$needle = '.agents/skills/impeccable/scripts/'

function Read-Text([string]$Path) { return [IO.File]::ReadAllText($Path) }
function Write-Text([string]$Path, [string]$Text) { [IO.File]::WriteAllText($Path, $Text) }

# Relative path -> SHA-256 for every file under a root, excluding named paths.
function Get-TreeHashes {
    param([string]$Root, [string[]]$Skip = @())
    $hashes = @{}
    foreach ($file in @(Get-ChildItem -LiteralPath $Root -Recurse -File -Force)) {
        $relative = [IO.Path]::GetRelativePath($Root, $file.FullName).Replace('\', '/')
        if ($Skip -contains $relative) { continue }
        $hashes[$relative] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    }
    return $hashes
}

function Compare-Trees {
    param([hashtable]$Expected, [hashtable]$Actual)
    $differences = [System.Collections.Generic.List[string]]::new()
    foreach ($key in $Expected.Keys) {
        if (-not $Actual.ContainsKey($key)) { $differences.Add("missing $key") }
        elseif ($Actual[$key] -ne $Expected[$key]) { $differences.Add("differs $key") }
    }
    foreach ($key in $Actual.Keys) { if (-not $Expected.ContainsKey($key)) { $differences.Add("extra $key") } }
    return @($differences | Sort-Object)
}

function Invoke-Adaptation([string]$Root) {
    $output = & pwsh -NoProfile -ExecutionPolicy Bypass -File $scriptPath -Root $Root 2>&1
    $reported = -1
    $line = @($output | Where-Object { "$_" -match 'total rewritten:\s*(\d+)' } | Select-Object -Last 1)
    if ($line.Count -gt 0 -and "$($line[0])" -match 'total rewritten:\s*(\d+)') { $reported = [int]$Matches[1] }
    return [pscustomobject]@{ Exit = $LASTEXITCODE; Reported = $reported; Text = ($output -join $LF) }
}

$noticeText = if (Test-Path -LiteralPath $noticePath -PathType Leaf) { Read-Text $noticePath } else { '' }
$map = Get-Content -LiteralPath $mapPath -Raw | ConvertFrom-Json
$engine = @($map.engines | Where-Object { $_.name -eq 'impeccable' }) | Select-Object -First 1

Write-Host ''
Write-Host 'The recorded adaptation exists beside the skill it adapts'

Assert-True (Test-Path -LiteralPath $scriptPath -PathType Leaf) 'the impeccable adaptation script exists'
Assert-True (Test-Path -LiteralPath (Join-Path $sourceSkill 'METHOD.md') -PathType Leaf) 'the ported impeccable method is present'
Assert-True ($noticeText -match '(?i)pbakaus/impeccable') 'the central notice retains the impeccable source anchor'
Assert-True ($null -ne $engine) 'the install map pins the impeccable engine'

if ($failures.Count -gt 0) {
    Write-Host ''
    Write-Host ("Port-adaptations check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
    exit 1
}

$shippedHashes = Get-TreeHashes -Root $sourceSkill
$sandbox = Join-Path ([IO.Path]::GetTempPath()) ("harness-port-adaptations-" + [Guid]::NewGuid().ToString('N').Substring(0, 8))

try {
    Write-Host ''
    Write-Host 'The shipped skill is a fixed point of the adaptation'

    $fixed = Join-Path $sandbox 'fixed'
    New-Item -ItemType Directory -Force -Path $fixed | Out-Null
    Copy-Item -Path (Join-Path $sourceSkill '*') -Destination $fixed -Recurse -Force
    $run = Invoke-Adaptation $fixed
    Assert-True ($run.Exit -eq 0) "the adaptation runs against a copy of the shipped skill (exit $($run.Exit))"
    Assert-True ($run.Reported -eq 0) "the shipped skill needs no rewrite (reported $($run.Reported))"
    $drift = @(Compare-Trees -Expected $shippedHashes -Actual (Get-TreeHashes -Root $fixed))
    Assert-True ($drift.Count -eq 0) "the copy stays byte-identical to the shipped skill ($($drift -join ', '))"

    Write-Host ''
    Write-Host 'The adaptation turns the upstream form back into exactly the shipped skill'

    $fixture = Join-Path $sandbox 'upstream'
    New-Item -ItemType Directory -Force -Path $fixture | Out-Null
    Copy-Item -Path (Join-Path $sourceSkill '*') -Destination $fixture -Recurse -Force
    $undone = 0

    # Entry file name, harness section, fallback sentence and frontmatter.
    $skillFixture = Join-Path $fixture 'SKILL.md'
    Move-Item -LiteralPath (Join-Path $fixture 'METHOD.md') -Destination $skillFixture
    $undone++
    $skill = Read-Text $skillFixture
    Assert-True (-not $skill.Contains($CRLF)) 'METHOD.md is stored with LF line endings, as the literal rules expect'
    $section = [regex]::Match($skill, '(?s)\A(---\n.*?\n---\n)\n(## Harness install\n\n[^\n]*\n\n(?:- [^\n]*\n)+)\n')
    Assert-True $section.Success 'the harness section sits directly after the frontmatter'
    if ($section.Success) {
        $skill = $section.Groups[1].Value + $LF + $skill.Substring($section.Length)
        $undone++
    }
    $fallbackBefore = 'and `.agents/skills/impeccable/scripts` is the fallback only when the runtime reports no base directory.'
    $fallbackAfter = 'and the harness install (`~/.codex/skills/design/impeccable`, reached by Claude Code as `~/.claude/skills/design/impeccable`) is the fallback only when the runtime reports no base directory.'
    Assert-True ($skill.Contains($fallbackAfter)) 'METHOD.md names the harness install as the launcher fallback'
    $skill = $skill.Replace($fallbackAfter, $fallbackBefore)
    $undone++
    $frontmatter = [regex]::Match($skill, '(?s)\A---\n.*?\n---\n')
    $version = [regex]::Match($frontmatter.Value, '(?m)^  version:\s*(\S+)\s*$').Groups[1].Value
    $skill = "---${LF}name: impeccable${LF}description: Use when the user wants to design, critique or polish a frontend interface. Not for backend-only or non-UI tasks.${LF}metadata:${LF}  version: $version${LF}---${LF}" + $skill.Substring($frontmatter.Length)
    $undone++
    Write-Text $skillFixture $skill

    # live.md keeps the active task's permissions instead of escalating.
    $liveFixture = Join-Path $fixture 'reference\live.md'
    $liveBefore = 'Codex: run live helper commands, the app dev server, and any dependency-installing setup with `sandbox_permissions: "require_escalated"` from the start; live mode depends on localhost and package-manager network access that the sandbox blocks.'
    $live = Read-Text $liveFixture
    $liveAfter = [regex]::Match($live, '(?m)^Run live helpers, the app dev server and any dependency-installing setup with the active task''s existing permissions[^\n]*').Value
    Assert-True ([bool]$liveAfter) 'live.md keeps live helpers within the active task''s permissions'
    Assert-True ($live -notmatch 'require_escalated') 'live.md no longer asks Codex to escalate from the start'
    Write-Text $liveFixture $live.Replace($liveAfter, $liveBefore)
    $undone++

    # Launcher defaults.
    foreach ($launcher in @(
            @{ Path = 'scripts\impeccable'; Lines = @(
                    '# Harness defaults: no telemetry or update check, live copy edits in the active task.'
                    ': "${IMPECCABLE_NO_TELEMETRY:=1}" "${IMPECCABLE_NO_UPDATE_CHECK:=1}" "${IMPECCABLE_LIVE_COPY_AGENT:=chat}"'
                    'export IMPECCABLE_NO_TELEMETRY IMPECCABLE_NO_UPDATE_CHECK IMPECCABLE_LIVE_COPY_AGENT') }
            @{ Path = 'scripts\impeccable.cmd'; Lines = @(
                    'rem Harness defaults: no telemetry or update check, live copy edits in the active task.'
                    'if not defined IMPECCABLE_NO_TELEMETRY set "IMPECCABLE_NO_TELEMETRY=1"'
                    'if not defined IMPECCABLE_NO_UPDATE_CHECK set "IMPECCABLE_NO_UPDATE_CHECK=1"'
                    'if not defined IMPECCABLE_LIVE_COPY_AGENT set "IMPECCABLE_LIVE_COPY_AGENT=chat"') })) {
        $launcherPath = Join-Path $fixture $launcher.Path
        $raw = Read-Text $launcherPath
        $block = ($launcher.Lines -join $LF) + $LF
        $text = $raw.Replace($CRLF, $LF)
        Assert-True ($text.Contains($block)) "$($launcher.Path) carries the harness defaults"
        $text = $text.Replace($block, '')
        if ($raw.Contains($CRLF)) { $text = $text.Replace($LF, $CRLF) }
        Write-Text $launcherPath $text
        $undone++
    }

    # Interface metadata, as upstream ships it; a nested method carries none.
    New-Item -ItemType Directory -Force -Path (Join-Path $fixture 'agents') | Out-Null
    Write-Text (Join-Path $fixture 'agents\openai.yaml') ("interface:${LF}  display_name: Impeccable${LF}  short_description: Use when the user wants to design or polish a frontend.${LF}  default_prompt: Use Impeccable to redesign, critique, audit, or polish this frontend.${LF}")
    $undone++

    # Prose: the rewrites in the reverse of the order the adaptation applies them.
    $proseUndone = 0
    # Upstream's Codex variant writes the invocation as `$impeccable`, so both
    # forward rules undo to that form.
    $reverse = @(
        , @('(?<![\w.-])((?:\.agents|\.claude|\.codex|\.cursor|\.github)/skills)/design/impeccable(?![A-Za-z0-9_-])', '$1/impeccable')
        , @('(?<![\w./-])design/impeccable(?![A-Za-z0-9_-])', '$$impeccable')
        , @('(?<![\w./-])METHOD\.md(?![\w-])', 'SKILL.md')
        , @('scripts/', $needle)
    )
    foreach ($file in @(Get-ChildItem -LiteralPath $fixture -Recurse -File -Filter '*.md')) {
        $text = Read-Text $file.FullName
        $before = $text
        foreach ($rule in $reverse) {
            if ($rule[0] -eq 'scripts/') {
                $proseUndone += ([regex]::Matches($text, [regex]::Escape('scripts/'))).Count
                $text = $text.Replace('scripts/', $rule[1])
                continue
            }
            $proseUndone += ([regex]::Matches($text, $rule[0])).Count
            $text = [regex]::Replace($text, $rule[0], $rule[1])
        }
        if ($text -cne $before) { Write-Text $file.FullName $text }
    }
    Assert-True ($proseUndone -gt 100) "the prose carries the adapted forms to undo (found $proseUndone)"
    $undone += $proseUndone

    # Upstream content the trim removes, added after the prose so it is not counted twice.
    $skill = Read-Text $skillFixture
    $rows = (@('craft [feature]', 'extract [target]', 'audit [target]', 'harden [target]', 'onboard [target]', 'clarify [target]', 'optimize [target]') |
            ForEach-Object { '| `' + $_ + '` | Build | Upstream sub-command | [reference/x.md](reference/x.md) |' + $LF }) -join ''
    $firstRow = [regex]::Match($skill, '(?m)^\| `')
    Assert-True $firstRow.Success 'SKILL.md keeps a command table'
    $skill = $skill.Insert($firstRow.Index, $rows)
    $undone++
    $paragraphs = '**Pin / Unpin:** `' + $needle + 'impeccable pin <pin|unpin> <command>` creates or removes a standalone `$<command>` shortcut.' + $LF + $LF +
        '**Doctor:** `$impeccable doctor` reports and repairs drift between this project''s Impeccable artifacts and what this version reads.' + $LF + $LF
    $setup = [regex]::Match($skill, '(?m)^## Setup$')
    Assert-True $setup.Success 'SKILL.md keeps its Setup heading'
    $skill = $skill.Insert($setup.Index, $paragraphs)
    $undone++
    Write-Text $skillFixture $skill
    $trimmedFiles = @('craft', 'extract', 'audit', 'audit.native', 'harden', 'onboard', 'clarify', 'optimize', 'doctor') | ForEach-Object { "reference/$_.md" }
    foreach ($relative in $trimmedFiles) {
        Write-Text (Join-Path $fixture $relative) ("Run ``$" + "impeccable $relative`` via ``" + $needle + "impeccable``." + $LF)
        $undone++
    }
    foreach ($agent in @('impeccable_finish_reviewer', 'impeccable_documenter')) {
        Write-Text (Join-Path $fixture "agents\$agent.toml") ("name = `"$agent`"" + $LF)
        $undone++
    }

    # Forms that only resemble an invocation. The sentinel must survive byte for byte.
    $sentinelName = 'reference/zz-guard-sentinel.md'
    $sentinel = @(
        'Docs: https://impeccable.style/impeccable and https://example.com/impeccable/start'
        'Engine storage: `.impeccable/config.json` and `.impeccable/live/config.json`'
        'Markup: `data-impeccable-variant` and a `{base}/impeccable` template path'
        'Subagent: `impeccable_finish_reviewer`; variable: `$impeccable_home`; flag: `/impeccable-extra`'
        'Package: `node_modules/impeccable/` and `npx impeccable detect`'
    ) -join $LF
    $sentinel += $LF
    Write-Text (Join-Path $fixture $sentinelName) $sentinel
    $sentinelHash = (Get-FileHash -LiteralPath (Join-Path $fixture $sentinelName) -Algorithm SHA256).Hash

    $expectedCount = $undone
    $first = Invoke-Adaptation $fixture
    Assert-True ($first.Exit -eq 0) "the adaptation runs against the upstream-form fixture (exit $($first.Exit))"
    Assert-True ($first.Reported -eq $expectedCount) "the adaptation rewrites exactly the $expectedCount departure(s) undone in the fixture (reported $($first.Reported))"
    $afterHashes = Get-TreeHashes -Root $fixture -Skip @($sentinelName)
    $difference = @(Compare-Trees -Expected $shippedHashes -Actual $afterHashes)
    Assert-True ($difference.Count -eq 0) "the adapted fixture is byte-identical to the shipped skill ($($difference -join ', '))"
    Assert-True ((Get-FileHash -LiteralPath (Join-Path $fixture $sentinelName) -Algorithm SHA256).Hash -eq $sentinelHash) 'URLs, engine storage, markup, subagent names and binary paths are left untouched'
    foreach ($relative in $trimmedFiles) {
        Assert-True (-not (Test-Path -LiteralPath (Join-Path $fixture $relative))) "the trim removes $relative"
    }
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $fixture 'agents'))) 'the trim removes the bundled Codex custom agents and the picker metadata'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $fixture 'SKILL.md'))) 'the entry file is renamed, so a recursive skill scan does not list the method'

    $second = Invoke-Adaptation $fixture
    Assert-True ($second.Exit -eq 0 -and $second.Reported -eq 0) "a second run is idempotent (reported $($second.Reported))"
    $again = @(Compare-Trees -Expected $afterHashes -Actual (Get-TreeHashes -Root $fixture -Skip @($sentinelName)))
    Assert-True ($again.Count -eq 0) 'a second run changes no byte'

    Write-Host ''
    Write-Host 'Upstream drift under a literal rule stops the adaptation'

    $drifted = Join-Path $sandbox 'drifted'
    New-Item -ItemType Directory -Force -Path $drifted | Out-Null
    Copy-Item -Path (Join-Path $sourceSkill '*') -Destination $drifted -Recurse -Force
    $driftedLive = Join-Path $drifted 'reference\live.md'
    Write-Text $driftedLive ((Read-Text $driftedLive).Replace($liveAfter, 'Codex: upstream reworded this prerequisite.'))
    $stopped = Invoke-Adaptation $drifted
    Assert-True ($stopped.Exit -ne 0) 'a literal rule whose upstream text moved fails the run'
    Assert-True ($stopped.Text -match 'drifted: reference/live\.md') 'the failure names the drifted file'
}
finally {
    if (Test-Path -LiteralPath $sandbox) { Remove-Item -LiteralPath $sandbox -Recurse -Force -ErrorAction SilentlyContinue }
}

Write-Host ''
Write-Host 'The shipped skill keeps its identity, routes and wiring recipe'

$skillText = Read-Text (Join-Path $sourceSkill 'METHOD.md')
$shippedFrontmatter = [regex]::Match($skillText, '(?s)\A---\n(.*?)\n---\n').Groups[1].Value
Assert-True ($shippedFrontmatter -match '(?m)^name: impeccable$') 'the frontmatter names the method'
Assert-True (-not (Test-Path -LiteralPath (Join-Path $sourceSkill 'SKILL.md'))) 'the nested method ships no SKILL.md'
$shippedVersion = [regex]::Match($shippedFrontmatter, '(?m)^  version: (\S+)$').Groups[1].Value
Assert-True ($shippedVersion -match '^4\.\d+\.\d+$') "the skill is on the Impeccable 4.x line (version $shippedVersion)"
Assert-True ($noticeText.Contains("Skill version ``$shippedVersion``")) 'the central notice records the shipped skill version'
$engineVersion = (Read-Text (Join-Path $sourceSkill 'scripts\VERSION')).Trim()
Assert-True ($engineVersion -eq $engine.version) "scripts/VERSION asks for the engine the install map pins ($engineVersion, pinned $($engine.version))"
Assert-True ($noticeText.Contains("engine ``$engineVersion``")) 'the central notice records the pinned engine version'
Assert-True ($engine.skill -eq 'skills/design/impeccable' -and $engine.target -like 'scripts/bin/{platform}/*') 'the engine lands inside the installed skill, where the launcher looks for its sibling binary'
foreach ($platform in @('windows-x64', 'darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64')) {
    $pin = if ($engine.sha256.PSObject.Properties[$platform]) { [string]$engine.sha256.$platform } else { '' }
    Assert-True ($pin -match '^[0-9a-f]{64}$') "the install map pins a SHA-256 for $platform"
}
$screenshotHash = (Get-FileHash -LiteralPath (Join-Path $sourceSkill 'scripts\modern-screenshot.umd.js') -Algorithm SHA256).Hash
Assert-True ($noticeText.Contains($screenshotHash)) 'the central notice records the bundled modern-screenshot file by its actual hash'
Assert-True ($noticeText.Contains('Bundled by Impeccable 4.')) 'the modern-screenshot row names the Impeccable release that bundles it'

$harnessSection = [regex]::Match($skillText, '(?s)## Harness install\n.*?\n\n(?=[^-\n])').Value
Assert-True ($harnessSection -match [regex]::Escape('[reference/adoption.md](reference/adoption.md)')) 'the harness section routes repository wiring to the adoption reference'
Assert-True ($harnessSection -match 'Never run `install`, `update`, `link`, `pin` or `unpin`') 'the harness section forbids installing into a project'
Assert-True ($harnessSection -match 'IMPECCABLE_CONTEXT_DIR') 'the harness section explains a design authority outside the root'
Assert-True ($harnessSection -match 'reference/degraded/<role>\.md') 'the harness section briefs unregistered subagents from the degraded references'
foreach ($route in @('audit', 'harden', 'clarify', 'optimize', 'onboard', 'extract', 'doctor')) {
    Assert-True ($harnessSection -match ('`' + $route + '`')) "the harness section routes the trimmed '$route' command to a harness method"
}

foreach ($relative in @('craft', 'extract', 'audit', 'audit.native', 'harden', 'onboard', 'clarify', 'optimize', 'doctor')) {
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $sourceSkill "reference\$relative.md"))) "the trimmed reference $relative.md is not shipped"
}
Assert-True (-not (Test-Path -LiteralPath (Join-Path $sourceSkill 'agents'))) 'no bundled Codex custom agent or picker metadata is shipped'
Assert-True (-not (Test-Path -LiteralPath (Join-Path $sourceSkill 'scripts\bin'))) 'no engine binary is stored in the source'
Assert-True (@(Get-ChildItem -LiteralPath $sourceSkill -Recurse -File -Include '*.mjs', '*.exe').Count -eq 0) 'no 3.x helper module or binary remains in the source'

# The references the design router, the design leaves and live mode reach.
foreach ($relative in @('reference/new-work.md', 'reference/critique.md', 'reference/polish.md', 'reference/live.md', 'reference/document.md',
        'reference/hooks.md', 'reference/adoption.md', 'reference/craft-floor.md', 'reference/shape.md', 'reference/init.md',
        'reference/bolder.md', 'reference/quieter.md', 'reference/distill.md', 'reference/typeset.md', 'reference/colorize.md',
        'reference/layout.md', 'reference/adapt.md', 'reference/animate.md', 'reference/delight.md', 'reference/overdrive.md',
        'scripts/impeccable', 'scripts/impeccable.cmd', 'scripts/command-metadata.json')) {
    Assert-True (Test-Path -LiteralPath (Join-Path $sourceSkill $relative) -PathType Leaf) "the routed file $relative is shipped"
}

$brokenLinks = [System.Collections.Generic.List[string]]::new()
$staleForms = [System.Collections.Generic.List[string]]::new()
foreach ($file in @(Get-ChildItem -LiteralPath $sourceSkill -Recurse -File -Include '*.md')) {
    $text = Read-Text $file.FullName
    $relativeFile = [IO.Path]::GetRelativePath($sourceSkill, $file.FullName).Replace('\', '/')
    foreach ($link in [regex]::Matches($text, '\]\(([^)\s#]+)(?:#[^)]*)?\)')) {
        $target = $link.Groups[1].Value
        if ($target -match '^[a-z][a-z0-9+.-]*:') { continue }
        if (-not (Test-Path -LiteralPath (Join-Path $file.DirectoryName $target))) { $brokenLinks.Add("$relativeFile -> $target") }
    }
    if ($text.Contains('.agents/skills/impeccable') -or $text -match '\$impeccable(?![A-Za-z0-9_-])' -or
        $text -match '(?<![A-Za-z0-9_./}])/impeccable(?![A-Za-z0-9_-])') { $staleForms.Add($relativeFile) }
}
Assert-True ($brokenLinks.Count -eq 0) "every relative link in the skill resolves ($($brokenLinks -join ', '))"
Assert-True ($staleForms.Count -eq 0) "no prose still invokes the upstream entrypoint or project-relative path ($($staleForms -join ', '))"

foreach ($launcher in @('scripts\impeccable', 'scripts\impeccable.cmd')) {
    $launcherText = Read-Text (Join-Path $sourceSkill $launcher)
    foreach ($default in @('IMPECCABLE_NO_TELEMETRY', 'IMPECCABLE_NO_UPDATE_CHECK', 'IMPECCABLE_LIVE_COPY_AGENT')) {
        Assert-True ($launcherText -match [regex]::Escape($default)) "$launcher defaults $default"
    }
}

# The wiring recipe a repository applies.
$adoption = Read-Text (Join-Path $sourceSkill 'reference\adoption.md')
$jsonBlocks = @([regex]::Matches($adoption, '(?s)```json\n(.*?)\n```') | ForEach-Object { $_.Groups[1].Value })
Assert-True ($jsonBlocks.Count -eq 3) "the adoption reference carries the config and both hook manifests ($($jsonBlocks.Count) JSON block(s))"
$parsed = @($jsonBlocks | ForEach-Object { try { $_ | ConvertFrom-Json -Depth 12 } catch { $null } })
Assert-True (@($parsed | Where-Object { $null -eq $_ }).Count -eq 0) 'every JSON block in the adoption reference parses'
if ($parsed.Count -eq 3 -and @($parsed | Where-Object { $null -eq $_ }).Count -eq 0) {
    Assert-True ($null -ne $parsed[0].detector -and $parsed[0].hook.enabled -eq $true) 'the config starter carries the shared detector ignores and an enabled hook'
    $claudeHooks = @($parsed[1].hooks.PostToolUse) + @($parsed[1].hooks.Stop) | ForEach-Object { $_.hooks } | ForEach-Object { $_ }
    $codexHooks = @($parsed[2].hooks.PostToolUse) + @($parsed[2].hooks.Stop) | ForEach-Object { $_.hooks } | ForEach-Object { $_ }
    Assert-True (@($claudeHooks | Where-Object { $_.command -match [regex]::Escape('$HOME/.claude/skills/design/impeccable/scripts/impeccable') -and $_.command -match ' hook$' }).Count -eq 2) 'both Claude hooks call the harness launcher under the user home'
    Assert-True (@($codexHooks | Where-Object { $_.command -match [regex]::Escape('${CODEX_HOME:-$HOME/.codex}/skills/design/impeccable/scripts/impeccable') }).Count -eq 2) 'both Codex hooks call the harness launcher under the Codex home'
    # Each commandWindows starts Windows PowerShell with -EncodedCommand (base64 of UTF-16LE); assert on the decoded script.
    $windowsScripts = @($codexHooks | ForEach-Object {
            if ("$($_.commandWindows)" -match '^powershell\.exe .*-EncodedCommand (\S+)$') {
                try { [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($Matches[1])) } catch { '' }
            } else { '' }
        })
    $launcherSuffix = '\skills\design\impeccable\scripts\impeccable.cmd'''
    Assert-True (@($windowsScripts | Where-Object { $_.Contains($launcherSuffix) -and $_.Contains('''/d /c call "''+$f+''" hook''') }).Count -eq 2) 'both Codex hooks carry a Windows command'
    Assert-True (@($windowsScripts | Where-Object {
                $codexHome = $_.IndexOf('if($env:CODEX_HOME){$c=$env:CODEX_HOME+''' + $launcherSuffix)
                $userHome = $_.IndexOf('if(-not $f -and $env:USERPROFILE){$c=$env:USERPROFILE+''\.codex' + $launcherSuffix)
                $codexHome -ge 0 -and $userHome -gt $codexHome
            }).Count -eq 2) 'both Windows commands try CODEX_HOME before the default Codex home'
    Assert-True ($parsed[2].hooks.PostToolUse[0].matcher -match 'apply_patch') 'the Codex edit hook matches apply_patch'
}
Assert-True ($adoption -match 'never a vendored or committed copy') 'the adoption reference rules out a per-repository copy of the skill or engine'
Assert-True ($adoption -match 'npm install --save-dev --save-exact impeccable@') 'the adoption reference allows a pinned devDependency for CI'
Assert-True ($adoption -match '(?m)^\.impeccable/config\.local\.json$') 'the adoption reference ignores per-developer state'

Write-Host ''
Write-Host 'A nested method keeps the package identity it was ported from'

$shadcnSkillPath = Join-Path $root 'skills\design\shadcn\METHOD.md'
Assert-True (Test-Path -LiteralPath $shadcnSkillPath -PathType Leaf) 'design/shadcn keeps its METHOD.md'
if (Test-Path -LiteralPath $shadcnSkillPath -PathType Leaf) {
    $shadcnSkill = Get-Content -Raw -LiteralPath $shadcnSkillPath
    Assert-True ($shadcnSkill -match '(?m)^name:\s*shadcn\s*$') 'design/shadcn carries the upstream name'
    Assert-True ($shadcnSkill -match '(?m)^user-invocable:\s*false\s*$') 'design/shadcn keeps the upstream invocation flag'
    $shadcnCommands = @(
        'npx shadcn@latest info --json',
        'pnpm dlx shadcn@latest',
        'bunx --bun shadcn@latest'
    )
    foreach ($command in $shadcnCommands) {
        Assert-True ($shadcnSkill -match [regex]::Escape($command)) "design/shadcn still carries the upstream CLI command '$command'"
    }
}
Assert-True ($noticeText -match [regex]::Escape('.codex/skills/shadcn')) 'the central notice retains the shadcn source path'

Write-Host ''
Write-Host 'The deploy places the pinned engine once, verified, and only with its skill'

$platform = if ($IsWindows) { 'windows' } elseif ($IsMacOS) { 'darwin' } elseif ($IsLinux) { 'linux' } else { $null }
$arch = switch ([Runtime.InteropServices.RuntimeInformation]::OSArchitecture) { 'X64' { 'x64' } 'Arm64' { 'arm64' } default { $null } }
$platform = if ($platform -and $arch) { "$platform-$arch" } else { $null }
Assert-True ($null -ne $platform -and $null -ne $engine.sha256.PSObject.Properties[$platform]) "this machine's platform has a pinned engine build ($platform)"

$deploySandbox = Join-Path ([IO.Path]::GetTempPath()) ("harness-engine-fetch-" + [Guid]::NewGuid().ToString('N').Substring(0, 8))
try {
    $exe = if ($platform -like 'windows-*') { '.exe' } else { '' }
    $asset = $engine.asset.Replace('{version}', $engine.version).Replace('{platform}', $platform).Replace('{exe}', $exe)
    $targetRelative = $engine.target.Replace('{version}', $engine.version).Replace('{platform}', $platform).Replace('{exe}', $exe)
    $src = Join-Path $deploySandbox 'source'
    $mirror = Join-Path $deploySandbox 'mirror'
    $codex = Join-Path $deploySandbox 'codex'
    $ocrHome = Join-Path $deploySandbox 'opencodereview'
    $engineTarget = [IO.Path]::GetFullPath((Join-Path (Join-Path $codex $engine.skill) $targetRelative))
    $mirrorFile = Join-Path $mirror $asset
    $fixtureSkill = Join-Path $src 'skills/design/impeccable'
    $fixtureVersion = Join-Path $fixtureSkill 'scripts/VERSION'
    $fixtureMapPath = Join-Path $src 'config/install-map.json'
    foreach ($dir in @((Split-Path $fixtureMapPath -Parent), (Split-Path $fixtureVersion -Parent), (Join-Path $src 'skills/other'), (Split-Path $mirrorFile -Parent), $codex)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    Write-Text (Join-Path $src 'skills/design/SKILL.md') ("---${LF}name: design${LF}---${LF}")
    Write-Text (Join-Path $fixtureSkill 'METHOD.md') ("---${LF}name: impeccable${LF}---${LF}")
    Write-Text $fixtureVersion ($engine.version + $LF)
    Write-Text (Join-Path $src 'skills/other/SKILL.md') ("---${LF}name: other${LF}---${LF}")

    # A copy of the real map, narrowed to the skills mapping, pinned to a mirror file.
    function Set-FixturePin([string]$Content) {
        [IO.File]::WriteAllBytes($mirrorFile, [Text.Encoding]::UTF8.GetBytes($Content + [char]0))
        $fixtureMap = Get-Content -LiteralPath $mapPath -Raw | ConvertFrom-Json
        $fixtureMap.mappings = @($fixtureMap.mappings | Where-Object { $_.source -eq 'skills' })
        $pinned = @($fixtureMap.engines | Where-Object { $_.name -eq 'impeccable' })[0]
        $pinned.sha256.$platform = (Get-FileHash -LiteralPath $mirrorFile -Algorithm SHA256).Hash.ToLowerInvariant()
        Set-Content -LiteralPath $fixtureMapPath -Value ($fixtureMap | ConvertTo-Json -Depth 8) -Encoding utf8NoBOM
        return (Get-FileHash -LiteralPath $mirrorFile -Algorithm SHA256).Hash
    }
    function Invoke-Deploy([string[]]$Extra) {
        $output = & pwsh -NoProfile -File $deployPath -SourceRoot $src -CodexHome $codex -OcrHome $ocrHome -EngineMirror $mirror @Extra 2>&1
        return [pscustomobject]@{ Exit = $LASTEXITCODE; Text = ($output -join $LF) }
    }
    function Get-EngineState {
        $statePath = Join-Path $codex '.harness-backup\deploy-state.json'
        if (-not (Test-Path -LiteralPath $statePath)) { return @{} }
        $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json -AsHashtable
        if ($state['engines']) { return $state['engines'] } else { return @{} }
    }
    $engineKey = [IO.Path]::GetRelativePath($codex, $engineTarget)

    $pinA = Set-FixturePin 'fake engine A'
    $plan = Invoke-Deploy @()
    Assert-True ($plan.Exit -eq 0 -and $plan.Text -match 'engine add\s+\S*impeccable') "the plan lists the engine as an add (exit $($plan.Exit))"
    Assert-True (-not (Test-Path -LiteralPath $engineTarget) -and -not (Test-Path -LiteralPath (Join-Path $codex '.harness-backup'))) 'the plan writes nothing'

    $apply = Invoke-Deploy @('-Apply')
    Assert-True ($apply.Exit -eq 0) "the apply places the engine (exit $($apply.Exit))"
    Assert-True ((Test-Path -LiteralPath $engineTarget) -and (Get-FileHash -LiteralPath $engineTarget -Algorithm SHA256).Hash -eq $pinA) 'the placed engine is the pinned build, at the launcher''s sibling path'
    Assert-True ((Get-EngineState)[$engineKey] -eq $pinA) 'the deployment state records the placed engine'
    Assert-True (@(Get-ChildItem -LiteralPath (Join-Path $codex '.harness-backup') -Filter '*.part').Count -eq 0) 'no partial download is left behind'

    $repeat = Invoke-Deploy @('-Apply')
    Assert-True ($repeat.Exit -eq 0 -and $repeat.Text -match 'up to date' -and $repeat.Text -notmatch 'engine (add|update)') 'an engine already at the pin is skipped'

    $pinB = Set-FixturePin 'fake engine B'
    $moved = Invoke-Deploy @('-Apply')
    Assert-True ($moved.Exit -eq 0 -and $moved.Text -match 'engine update') 'a moved pin replaces the engine this script placed'
    Assert-True ((Get-FileHash -LiteralPath $engineTarget -Algorithm SHA256).Hash -eq $pinB) 'the replacement is the newly pinned build'
    $backedUp = @(Get-ChildItem -LiteralPath (Join-Path $codex '.harness-backup') -Recurse -File | Where-Object { $_.Name -eq (Split-Path $engineTarget -Leaf) })
    Assert-True ($backedUp.Count -eq 1 -and (Get-FileHash -LiteralPath $backedUp[0].FullName -Algorithm SHA256).Hash -eq $pinA) 'the replaced engine is kept in the backup'

    # A mirror whose file does not match the pin installs nothing.
    [IO.File]::WriteAllText($mirrorFile, 'tampered')
    Set-Content -LiteralPath $fixtureMapPath -Value ((Get-Content -LiteralPath $fixtureMapPath -Raw).Replace($pinB.ToLowerInvariant(), ('0' * 64))) -Encoding utf8NoBOM
    $tampered = Invoke-Deploy @('-Apply')
    Assert-True ($tampered.Exit -eq 2) "a download that fails verification is a conflict (exit $($tampered.Exit))"
    Assert-True ($tampered.Text -match 'CONFLICT engine .*not the pinned') 'the conflict names the checksum mismatch'
    Assert-True ((Get-FileHash -LiteralPath $engineTarget -Algorithm SHA256).Hash -eq $pinB) 'the installed engine is untouched by a refused download'
    Assert-True (@(Get-ChildItem -LiteralPath (Join-Path $codex '.harness-backup') -Filter '*.part').Count -eq 0) 'the refused download is removed'
    Assert-True ((Get-EngineState)[$engineKey] -eq $pinB) 'the state keeps the engine that is still installed'

    # A binary this script did not place is left alone unless forced.
    $pinC = Set-FixturePin 'fake engine C'
    [IO.File]::WriteAllText($engineTarget, 'operator build')
    $foreign = Invoke-Deploy @('-Apply')
    Assert-True ($foreign.Exit -eq 2 -and $foreign.Text -match 'was not placed by this script') 'an unknown binary at the engine path is a conflict'
    Assert-True ((Read-Text $engineTarget) -eq 'operator build') 'the unknown binary is left as installed'
    $forced = Invoke-Deploy @('-Apply', '-Force')
    Assert-True ($forced.Exit -eq 0 -and (Get-FileHash -LiteralPath $engineTarget -Algorithm SHA256).Hash -eq $pinC) '-Force replaces it with the pinned build'

    # A VERSION that disagrees with the pin stops the deploy before anything is written.
    Write-Text $fixtureVersion ('0.0.0' + $LF)
    $mismatch = Invoke-Deploy @()
    Assert-True ($mismatch.Exit -ne 0 -and $mismatch.Text -match 'is pinned at') 'a skill asking for another engine version stops the deploy'
    Write-Text $fixtureVersion ($engine.version + $LF)

    # Retiring the method retires its engine.
    Remove-Item -LiteralPath $fixtureSkill -Recurse -Force
    $retire = Invoke-Deploy @('-Apply')
    Assert-True ($retire.Exit -eq 0 -and $retire.Text -match 'engine retire') "a retired skill retires its engine (exit $($retire.Exit))"
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $codex $engine.skill))) 'the emptied skill directory is removed'
    Assert-True ((Get-EngineState).Count -eq 0) 'the state no longer records the engine'

    # A source without the skill never fetches.
    $fresh = Join-Path $deploySandbox 'fresh'
    New-Item -ItemType Directory -Force -Path $fresh | Out-Null
    Remove-Item -LiteralPath $mirror -Recurse -Force
    $none = & pwsh -NoProfile -File $deployPath -SourceRoot $src -CodexHome $fresh -EngineMirror $mirror -Apply 2>&1
    Assert-True ($LASTEXITCODE -eq 0 -and ($none -join $LF) -notmatch 'engine (add|update|retire)|CONFLICT') 'a source that does not ship the skill fetches no engine'

    Assert-True (@(Get-ChildItem -LiteralPath $src -Recurse -File | Where-Object { $_.FullName -match '[\\/]bin[\\/]' }).Count -eq 0) 'the engine is never written into the source'
}
finally {
    if (Test-Path -LiteralPath $deploySandbox) { Remove-Item -LiteralPath $deploySandbox -Recurse -Force -ErrorAction SilentlyContinue }
}

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host ("Port-adaptations check passed: $checks structural assertion(s). Whether the adaptation is the right one is verified by review, not here.")
}
else {
    Write-Host ("Port-adaptations check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
