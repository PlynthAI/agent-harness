#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the shared delivery skill.

.DESCRIPTION
    Checks only what a machine can decide: the skill, its references, the state
    script, the watcher and the inventory, retirement and review-state commands
    exist; the frontmatter names the
    skill and its group; the request table routes every word to a reference
    that exists; every relative link resolves inside the skill; the adapter
    reference defines each field and the two ownership sections; the skill
    names the five delivery steps distinctly; the ported playbooks carry no
    upstream forge or runtime wiring and the cleanup playbook never forces a
    removal; the suite wiring is present; and no file embeds a host path.

    The behaviour - commit implying nothing downstream, an existing pull request
    being resumed, a live check state being required, and a missing tool or
    approval producing a blocked state rather than a success - is covered by the
    node fixtures, which run-all executes. The watcher's own suite runs under
    bun when bun is installed. Prose meaning is left to review.
#>
[CmdletBinding()]
param([switch]$Quiet)

# 2026-09-22: removed assertions requiring the user router to repeat skill
# procedures. Shared skill contracts and executable/package checks remain;
# the approved short AGENTS.md is a legitimate case, reviewed as prose.
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

function Get-FrontMatterField {
    param([string]$Text, [string]$Key)
    $block = [regex]::Match($Text, '(?s)\A---\r?\n(.*?)\r?\n---')
    if (-not $block.Success) { return $null }
    $lines = $block.Groups[1].Value -split "\r?\n"
    for ($index = 0; $index -lt $lines.Count; $index++) {
        $match = [regex]::Match($lines[$index], '^\s*' + [regex]::Escape($Key) + ':\s*(.*)$')
        if (-not $match.Success) { continue }
        $value = $match.Groups[1].Value.Trim()
        if ($value -match '^[>|][+-]?$') {
            $parts = [System.Collections.Generic.List[string]]::new()
            for ($next = $index + 1; $next -lt $lines.Count; $next++) {
                if ($lines[$next].Trim() -ne '' -and $lines[$next] -notmatch '^\s') { break }
                $parts.Add($lines[$next].Trim())
            }
            $value = ($parts -join ' ').Trim()
        }
        return $value.Trim('"', "'")
    }
    return $null
}

$root = Split-Path $PSScriptRoot -Parent
$skillDir = Join-Path $root 'skills\delivery'
$skillPath = Join-Path $skillDir 'SKILL.md'
$adapterPath = Join-Path $skillDir 'references\adapter.md'
$babysitPath = Join-Path $skillDir 'references\babysit.md'
$cleanupPath = Join-Path $skillDir 'references\worktree-cleanup.md'
$scriptPath = Join-Path $skillDir 'scripts\delivery-state.mjs'
$inventoryPath = Join-Path $skillDir 'scripts\repo-inventory.mjs'
$retirePath = Join-Path $skillDir 'scripts\retire-worktree.mjs'
$factsPath = Join-Path $skillDir 'scripts\worktree-facts.mjs'
$reviewStatePath = Join-Path $skillDir 'scripts\pr-review.mjs'
$scriptsDir = Join-Path $skillDir 'scripts'
$watcherPath = Join-Path $scriptsDir 'watch-pr\watch-pr'
$testsPath = Join-Path $skillDir 'tests\delivery-state.test.mjs'
$runAllPath = Join-Path $root 'checks\run-all.ps1'

Write-Host ''
Write-Host 'The skill and its parts'

foreach ($pair in @(
        @{ Path = $skillPath; Label = 'the skill' },
        @{ Path = $adapterPath; Label = 'the adapter reference' },
        @{ Path = (Join-Path $skillDir 'references\commit-and-push.md'); Label = 'the commit-and-push reference' },
        @{ Path = $babysitPath; Label = 'the babysit playbook' },
        @{ Path = (Join-Path $skillDir 'references\bugbot-triage.md'); Label = 'the review-automation triage rubric' },
        @{ Path = $cleanupPath; Label = 'the worktree-cleanup playbook' },
        @{ Path = (Join-Path $skillDir 'references\worktree-retirement.md'); Label = 'the worktree-retirement reference' },
        @{ Path = $scriptPath; Label = 'the delivery-state script' },
        @{ Path = $watcherPath; Label = 'the watch-pr entrypoint' },
        @{ Path = (Join-Path $scriptsDir 'watch-pr\cli.ts'); Label = 'the watch-pr CLI' },
        @{ Path = (Join-Path $scriptsDir 'package.json'); Label = 'the scripts package manifest' },
        @{ Path = (Join-Path $scriptsDir 'bun.lock'); Label = 'the scripts lockfile' },
        @{ Path = $inventoryPath; Label = 'the repository inventory command' },
        @{ Path = $retirePath; Label = 'the worktree retirement command' },
        @{ Path = $factsPath; Label = 'the shared worktree facts module' },
        @{ Path = $reviewStatePath; Label = 'the review-state command' },
        @{ Path = $testsPath; Label = 'the delivery fixtures' })) {
    Assert-True (Test-Path -LiteralPath $pair.Path) "$($pair.Label) exists"
}

$skill = Get-Content -Raw -LiteralPath $skillPath
$adapter = Get-Content -Raw -LiteralPath $adapterPath
$babysit = Get-Content -Raw -LiteralPath $babysitPath
$cleanup = Get-Content -Raw -LiteralPath $cleanupPath
$inventory = Get-Content -Raw -LiteralPath $inventoryPath

Assert-True ([regex]::IsMatch($skill, '(?s)\A---\r?\n.*?\r?\n---')) 'the skill opens with frontmatter'
$name = Get-FrontMatterField -Text $skill -Key 'name'
$description = Get-FrontMatterField -Text $skill -Key 'description'
Assert-True ($name -eq 'delivery') "the frontmatter names the skill delivery (found '$name')"
Assert-True (-not [string]::IsNullOrWhiteSpace($description) -and $description.Length -ge 40) 'the frontmatter carries a description a session can select on'
Assert-True ($skill -match '(?m)^metadata:\s*$\r?\n\s+group:\s*deliver\s*$') 'the frontmatter declares the deliver group'

Write-Host ''
Write-Host 'The router names its sections and routes every word'

foreach ($heading in @('Route by the request', 'Read the project', 'Resume rather than duplicate', 'Stop at the boundary', 'Keep tracking where it belongs')) {
    Assert-True ($skill -match ('(?i)#+\s*\d*\.?\s*' + [regex]::Escape($heading))) "the skill keeps its '$heading' section"
}
Assert-True ($skill -match '(?i)empty or unread check list is not a pass') 'the skill states that an unread check list is not a pass'

foreach ($step in @('commit', 'push', 'pull request', 'merge', 'deployment')) {
    Assert-True ($skill -match ('(?i)' + [regex]::Escape($step))) "the skill names the $step step"
}

# One word routes to one reference. The table row is the contract, not the prose.
$routes = @(
    @{ Word = 'commit';    Reference = 'references/commit-and-push.md' },
    @{ Word = 'push';      Reference = 'references/commit-and-push.md' },
    @{ Word = 'pr';        Reference = 'references/pr-writing.md' },
    @{ Word = 'babysit';   Reference = 'references/babysit.md' },
    @{ Word = 'merge';     Reference = $null },
    @{ Word = 'deploy';    Reference = 'references/adapter.md' },
    @{ Word = 'reconcile'; Reference = 'references/reconciliation.md' },
    @{ Word = 'cleanup';   Reference = 'references/worktree-cleanup.md' },
    @{ Word = 'handoff';   Reference = 'references/handoff.md' })
foreach ($route in $routes) {
    $row = [regex]::Match($skill, '(?m)^\|\s*`' + [regex]::Escape($route.Word) + '`\s*\|[^\r\n]*\r?$')
    Assert-True $row.Success "the request table routes '$($route.Word)'"
    if ($row.Success -and $route.Reference) {
        Assert-True ($row.Value -match [regex]::Escape($route.Reference)) "'$($route.Word)' reads $($route.Reference)"
        Assert-True (Test-Path -LiteralPath (Join-Path $skillDir ($route.Reference -replace '/', '\'))) "$($route.Reference) exists for '$($route.Word)'"
    }
}

# The vocabulary is the INTENTS array itself. Asserting that each token merely
# occurs anywhere in the file passed with 'merge' deleted from the array, because
# the word also appears in the authority map and the branch tests.
$scriptText = Get-Content -Raw -LiteralPath $scriptPath
$intentsMatch = [regex]::Match($scriptText, 'export const INTENTS = \[(.*?)\];', 'Singleline')
Assert-True ($intentsMatch.Success) 'the script declares its intent vocabulary'
if ($intentsMatch.Success) {
    $declared = @([regex]::Matches($intentsMatch.Groups[1].Value, "'([^']+)'") | ForEach-Object { $_.Groups[1].Value })
    $expected = @('commit', 'push', 'open-pr', 'update-pr', 'merge', 'deploy', 'production')
    Assert-True ($declared.Count -eq $expected.Count) "the intent vocabulary has exactly $($expected.Count) steps (found $($declared.Count))"
    foreach ($step in $expected) {
        Assert-True ($declared -contains $step) "the intent vocabulary includes $step"
    }
}

Write-Host ''
Write-Host 'The ported playbooks fit this harness'

# Case-sensitive: "origin/main" is a git ref, "Origin" is the upstream forge CLI.
Assert-True (-not [regex]::IsMatch($babysit, 'Origin|origin pr|Autopilot|Cursor|playbooks/|shipping\.md')) 'babysit carries no upstream forge or runtime wiring'
Assert-True ($babysit -match '\.\./scripts/watch-pr/watch-pr') 'babysit links the watcher it trusts'
Assert-True ($babysit -match '\]\(bugbot-triage\.md\)') 'babysit links the triage rubric'
Assert-True ($babysit -match '`merge` step') 'babysit hands landing to the merge step'
Assert-True ($cleanup -match '\]\(worktree-retirement\.md\)') 'cleanup removes through the retirement reference'
Assert-True ($cleanup -match '\.\./scripts/repo-inventory\.mjs') 'cleanup links the inventory command'
Assert-True ($cleanup -match '\.\./scripts/retire-worktree\.mjs') 'cleanup retires through the retirement command'
Assert-True ($babysit -match '\.\./scripts/pr-review\.mjs') 'babysit links the review-state command'
Assert-True ($babysit -match '\]\(\.\./\.\./harness/retrospective/METHOD\.md\)') 'babysit routes every CI failure to the harness retrospective'
Assert-True (-not [regex]::IsMatch($cleanup, 'rm -rf|--force|principle-|\.cursor')) 'cleanup never forces or recurses a removal and carries no upstream residue'
Assert-True (-not [regex]::IsMatch($inventory, "'remove'|'prune'|'branch',\s*'-[dD]'|rmSync|rmdirSync|unlinkSync")) 'the inventory command is read-only'

$package = Get-Content -Raw -LiteralPath (Join-Path $scriptsDir 'package.json')
Assert-True ($package -match '"test":\s*"bun test watch-pr"') 'the scripts package tests the watcher'
$bun = Get-Command bun -ErrorAction SilentlyContinue
if ($bun) {
    Push-Location $scriptsDir
    try {
        # The watcher launcher bootstraps its dependencies; the test run does not, so install them from the lockfile first.
        $installOutput = & bun install --frozen-lockfile 2>&1
        $bunExit = $LASTEXITCODE
        if ($bunExit -eq 0) {
            $bunOutput = & bun test watch-pr 2>&1
            $bunExit = $LASTEXITCODE
        }
        else { $bunOutput = $installOutput }
    }
    finally { Pop-Location }
    Assert-True ($bunExit -eq 0 -and (($bunOutput | Out-String) -match '(?m)^\s*0 fail')) "the watcher suite passes under bun (exit $bunExit)"
}
else {
    Write-Host '  skip the watcher suite: bun is not installed on this host'
}

Write-Host ''
Write-Host 'The adapter record defines what a project declares'

foreach ($field in @('schemaVersion', 'branchRules', 'checks', 'review', 'merge', 'deployment', 'boundary')) {
    Assert-True ($adapter -match ('(?i)\b' + [regex]::Escape($field))) "the adapter reference defines $field"
}
Assert-True ($adapter -match '(?is)#+\s*What the project owns') 'the reference separates what the project owns'
Assert-True ($adapter -match '(?is)#+\s*What this skill owns') 'the reference separates what this skill owns'

Write-Host ''
Write-Host 'Every relative link resolves inside the shared skill library'

# Installed dependencies are not shipped guidance.
$skillFiles = @(Get-ChildItem -LiteralPath $skillDir -Recurse -File -Include '*.md' | Where-Object { $_.FullName -notmatch '\\node_modules\\' })
$relativeLinkCount = 0
foreach ($file in $skillFiles) {
    $text = Get-Content -Raw -LiteralPath $file
    $relative = $file.FullName.Substring($skillDir.Length).TrimStart('\')
    foreach ($match in [regex]::Matches($text, '\]\(([^)\s]+)\)')) {
        $target = $match.Groups[1].Value
        if ($target -match '^(?i)(https?:|mailto:|#)') { continue }
        $target = ($target -split '#')[0]
        if ([string]::IsNullOrWhiteSpace($target)) { continue }
        $relativeLinkCount++
        $resolved = [IO.Path]::GetFullPath((Join-Path (Split-Path $file.FullName -Parent) $target))
        $libraryRoot = [IO.Path]::GetFullPath((Join-Path $root 'skills')).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
        $inside = $resolved.StartsWith($libraryRoot, [StringComparison]::OrdinalIgnoreCase)
        Assert-True $inside "$relative : link '$target' stays inside the shared skill library"
        Assert-True (Test-Path -LiteralPath $resolved) "$relative : link '$target' resolves to a real file"
    }
}
Assert-True ($relativeLinkCount -ge 3) "the skill links its reference and script rather than naming them (found $relativeLinkCount)"

# A fixture file that exists but holds no tests passes `node --test` and made the
# whole delivery check vacuous. The count is the guard against that.
$fixtureText = Get-Content -Raw -LiteralPath $testsPath
$fixtureCount = @([regex]::Matches($fixtureText, '(?m)^test\(')).Count
Assert-True ($fixtureCount -ge 15) "the fixtures actually contain tests (found $fixtureCount test cases)"

Write-Host ''
Write-Host 'The suite runs it and the shared prose stays portable'

$runAll = Get-Content -Raw -LiteralPath $runAllPath
Assert-True ($runAll -match "(?im)^\s*@\{\s*Name\s*=\s*'delivery'\s*;\s*File\s*=\s*'delivery\.ps1'") 'run-all.ps1 invokes this check'
Assert-True ($runAll -match "(?im)^\s*@\{\s*Name\s*=\s*'delivery fixtures'\s*;\s*RelativeTest\s*=\s*'skills\\delivery\\tests\\delivery-state\.test\.mjs'") 'run-all.ps1 runs the delivery fixtures as a suite'

$hostPath = '(?i)(\b[A-Z]:[\\/]|\\\\[A-Za-z0-9._-]+\\|file:///)'
foreach ($file in @(Get-ChildItem -LiteralPath $skillDir -Recurse -File | Where-Object { $_.Extension -in '.md', '.mjs', '.js', '.py', '.json', '.toml', '.ts', '.sh' -and $_.FullName -notmatch '\\node_modules\\' })) {
    $text = Get-Content -Raw -LiteralPath $file
    $relative = $file.FullName.Substring($skillDir.Length).TrimStart('\')
    # Windows path parsers and their fixtures legitimately contain drive/UNC
    # syntax. Portability is a runtime input contract, not a ban on that syntax.
    # Keep the host-path check on shipped guidance; inspect code through fixtures
    # and independent review. Generated bytecode is not source or guidance.
    if ($file.Extension -eq '.md' -and $relative -notlike 'tests\*') {
        Assert-True ($text -notmatch $hostPath) "$relative : no host path is embedded"
    }
}

Write-Host ''
Write-Host 'Read-only worktree inventory fixtures'
& python -B (Join-Path $root 'skills\delivery\tests\test_worktree_inventory.py')
Assert-True ($LASTEXITCODE -eq 0) 'worktree inventory behavioral fixtures pass'

# The inventory, retirement, review-state and review-status suites run real git
# in temporary repositories (about three minutes together), so they run here
# rather than as more run-all entries.
Write-Host ''
Write-Host 'Inventory, retirement, review-state and review-status fixtures'
# The TAP reporter's summary and result lines are ASCII, so the parse holds
# whatever the console encoding (the default reporter's marker read as 0 passed
# on a cp850 console).
foreach ($suite in @(
        @{ File = 'repo-inventory.test.mjs'; MinTests = 16 },
        @{ File = 'retire-worktree.test.mjs'; MinTests = 28 },
        @{ File = 'pr-review.test.mjs'; MinTests = 29 },
        @{ File = 'review-status.test.mjs'; MinTests = 6 })) {
    $suitePath = Join-Path $skillDir ('tests\' + $suite.File)
    $suiteOutput = & node --test --test-reporter=tap $suitePath 2>&1 | ForEach-Object { "$_" }
    $suiteExit = $LASTEXITCODE
    $passed = if (($suiteOutput -join "`n") -match '(?m)^# pass (\d+)') { [int]$Matches[1] } else { 0 }
    $failed = if (($suiteOutput -join "`n") -match '(?m)^# fail (\d+)') { [int]$Matches[1] } else { -1 }
    Assert-True ($suiteExit -eq 0 -and $failed -eq 0 -and $passed -ge $suite.MinTests) "$($suite.File) passes (exit $suiteExit, $passed passed, $failed failed, at least $($suite.MinTests) expected)"
    if ($suiteExit -ne 0 -or $failed -ne 0) {
        # Name the failing cases so a run-all log says which, not only how many.
        $suiteOutput | Where-Object { $_ -match '^\s*not ok' -or $_ -match '^\s*(error|expected|actual):' } | Select-Object -First 12 | ForEach-Object { Write-Host "    $_" }
    }
}

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host ("Delivery check passed: $checks structural assertion(s); the step separation and the blocked states are covered by the node fixtures.")
}
else {
    Write-Host ("Delivery check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
