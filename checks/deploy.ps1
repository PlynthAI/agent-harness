#Requires -Version 7.0
<#
.SYNOPSIS
    Runs the harness deploy against a disposable source and Codex home.
.DESCRIPTION
    Exercises plan, apply, idempotence, update with backup, refusal to
    overwrite an edit made in the Codex home or content the deploy never wrote,
    -Force with backup, retirement that removes only emptied directories, and
    that unmapped operator files and anything behind a directory link are never
    written or removed. The one file installed outside the Codex home, Open
    Code Review's house rules, is checked against a fixture OCR home: add,
    identical, update with backup, an edit kept, retirement that keeps the OCR
    home, the operator's config and sessions untouched, any other outside
    target refused, and no Codex-home target reaching it through a colon.
    Nothing outside the fixture is touched.
#>
[CmdletBinding()]
param([switch]$Quiet)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$checks = 0
$failures = [System.Collections.Generic.List[string]]::new()
$linkType = if ($IsWindows) { 'Junction' } else { 'SymbolicLink' }
function Assert-True {
    param([bool]$Condition, [string]$Message)
    $script:checks++
    if (-not $Condition) { $script:failures.Add($Message); Write-Host "  FAIL $Message" }
    elseif (-not $Quiet) { Write-Host "  PASS $Message" }
}
function Invoke-Deploy {
    param([string[]]$Extra = @())
    $output = & pwsh -NoProfile -File $deploy -SourceRoot $src -CodexHome $codex -OcrHome $ocr @Extra 2>&1
    return [pscustomobject]@{ Exit = $LASTEXITCODE; Text = ($output | ForEach-Object { "$_" }) -join "`n" }
}
function Read-Text([string]$Path) {
    if (Test-Path -LiteralPath $Path) { return [IO.File]::ReadAllText($Path) -replace "`r`n", "`n" }
    return $null
}
function Get-Backups { return @(Get-ChildItem -LiteralPath "$codex/.harness-backup" -Directory -ErrorAction SilentlyContinue) }

$deploy = Join-Path $root 'config/deploy.ps1'
$fixtureRoot = Join-Path $root '.local/check-fixtures'
$fixture = Join-Path $fixtureRoot "harness-deploy-$([guid]::NewGuid().ToString('N'))"
$src = Join-Path $fixture 'source'
$codex = Join-Path $fixture 'codex'
$outside = Join-Path $fixture 'outside'
$ocr = Join-Path $fixture 'opencodereview'
function Test-OcrOperatorFiles {
    return (Read-Text "$ocr/config.json") -eq "operator config`n" -and (Read-Text "$ocr/sessions/s1.json") -eq "session`n"
}

try {
    New-Item -ItemType Directory -Force -Path "$src/config", "$src/claude", "$src/agents", "$src/skills/alpha/references", "$src/skills/alpha/__pycache__", "$src/skills/beta", $codex, "$outside/gamma" | Out-Null
    Copy-Item -LiteralPath (Join-Path $root 'config/install-map.json') -Destination "$src/config"
    Set-Content -LiteralPath "$src/AGENTS.md" -Value 'policy v1'
    Set-Content -LiteralPath "$src/THIRD_PARTY_NOTICES.md" -Value 'notice v1'
    Set-Content -LiteralPath "$src/claude/sync-claude.ps1" -Value "Set-Content -LiteralPath '$fixture/claude-was-run' -Value ran"
    Set-Content -LiteralPath "$src/agents/tester.toml" -Value 'name = "tester"'
    Set-Content -LiteralPath "$src/agents/router-model-x.toml" -Value 'router'
    Set-Content -LiteralPath "$src/skills/alpha/SKILL.md" -Value 'alpha v1'
    Set-Content -LiteralPath "$src/skills/alpha/references/one.md" -Value 'one'
    Set-Content -LiteralPath "$src/skills/alpha/__pycache__/x.pyc" -Value 'cache'
    Set-Content -LiteralPath "$src/skills/beta/SKILL.md" -Value 'beta v1'
    Set-Content -LiteralPath "$src/skills/beta/extra.md" -Value 'beta extra'
    # The principles and patterns library ships beside skills.
    New-Item -ItemType Directory -Force -Path "$src/principles-and-patterns/principles" | Out-Null
    Set-Content -LiteralPath "$src/principles-and-patterns/index.md" -Value 'library index'
    Set-Content -LiteralPath "$src/principles-and-patterns/principles/one.md" -Value 'principle one'
    # The shared hooks folder: the compaction hook and its Codex registration
    # are installed; the optional learning-queue module and the tests are not.
    New-Item -ItemType Directory -Force -Path "$src/hooks/tests" | Out-Null
    Set-Content -LiteralPath "$src/hooks/compact-reload.ps1" -Value 'hook v1'
    Set-Content -LiteralPath "$src/hooks/hooks.json" -Value 'registration v1'
    Set-Content -LiteralPath "$src/hooks/learning-queue.mjs" -Value 'optional module'
    Set-Content -LiteralPath "$src/hooks/tests/learning-queue.test.mjs" -Value 'tests'
    # Open Code Review's house rules install into its own home, which also
    # holds the operator's config and sessions.
    New-Item -ItemType Directory -Force -Path "$src/config/ocr", "$ocr/sessions" | Out-Null
    Set-Content -LiteralPath "$src/config/ocr/rule.json" -Value 'rules v1'
    Set-Content -LiteralPath "$ocr/config.json" -Value 'operator config'
    Set-Content -LiteralPath "$ocr/sessions/s1.json" -Value 'session'
    # The operator's own router role and skill, and a skill reached through a
    # junction whose target lies outside the Codex home.
    New-Item -ItemType Directory -Force -Path "$codex/agents", "$codex/skills/operator-own" | Out-Null
    Set-Content -LiteralPath "$codex/agents/router-model-x.toml" -Value 'operator router'
    Set-Content -LiteralPath "$codex/skills/operator-own/SKILL.md" -Value 'mine'
    Set-Content -LiteralPath "$outside/gamma/SKILL.md" -Value 'outside gamma'
    New-Item -ItemType Directory -Path "$src/skills/gamma" | Out-Null
    Set-Content -LiteralPath "$src/skills/gamma/SKILL.md" -Value 'gamma from source'
    New-Item -ItemType $linkType -Path "$codex/skills/gamma" -Target "$outside/gamma" | Out-Null

    # Exercise the real defaults without USERPROFILE, using an isolated HOME.
    $nativeHome = Join-Path $fixture 'native-home'
    $nativeCodex = Join-Path $nativeHome '.codex'
    $nativeOcr = Join-Path $nativeHome '.opencodereview'
    New-Item -ItemType Directory -Force -Path $nativeCodex | Out-Null
    $previousUserProfile = $env:USERPROFILE
    $previousNativeHome = $env:HOME
    try {
        $env:USERPROFILE = $null
        $env:HOME = $nativeHome
        $nativePlan = (& pwsh -NoProfile -File $deploy -SourceRoot $src 2>&1 | ForEach-Object { "$_" }) -join "`n"
        Assert-True ($LASTEXITCODE -eq 0 -and $nativePlan.Contains("into $nativeCodex")) 'without USERPROFILE the default plan uses HOME/.codex'
        Assert-True (-not (Test-Path -LiteralPath (Join-Path $nativeCodex 'AGENTS.md')) -and -not (Test-Path -LiteralPath $nativeOcr)) 'the default plan writes nothing into either home'
        $nativeApply = (& pwsh -NoProfile -File $deploy -SourceRoot $src -Apply 2>&1 | ForEach-Object { "$_" }) -join "`n"
        Assert-True ($LASTEXITCODE -eq 0 -and (Read-Text (Join-Path $nativeCodex 'AGENTS.md')) -eq "policy v1`n" -and (Read-Text (Join-Path $nativeOcr 'rule.json')) -eq "rules v1`n") 'without USERPROFILE apply installs into HOME/.codex and HOME/.opencodereview'
    }
    finally {
        $env:USERPROFILE = $previousUserProfile
        $env:HOME = $previousNativeHome
    }

    $plan = Invoke-Deploy
    Assert-True ($plan.Exit -eq 0) 'plan exits 0'
    Assert-True ($null -eq (Read-Text "$codex/AGENTS.md")) 'plan writes nothing'
    Assert-True (-not (Test-Path -LiteralPath "$codex/.harness-backup")) 'plan records no state'
    Assert-True ($plan.Text -match 'add\s+opencodereview:rule\.json' -and -not (Test-Path -LiteralPath "$ocr/rule.json")) 'plan lists the house rule file and writes nothing'
    Assert-True ($plan.Text -match '(?m)add\s+hooks\.json$' -and $plan.Text -match '(?m)add\s+hooks[\\/]compact-reload\.ps1$') 'plan lists the Codex hook registration and the compaction hook script'

    $first = Invoke-Deploy @('-Apply')
    Assert-True ($first.Exit -eq 2) 'apply with a directory link conflict exits 2'
    Assert-True ((Read-Text "$codex/AGENTS.md") -eq "policy v1`n") 'AGENTS.md is deployed'
    Assert-True ((Read-Text "$codex/THIRD_PARTY_NOTICES.md") -eq "notice v1`n") 'central notices are deployed'
    Assert-True (-not (Test-Path -LiteralPath "$fixture/claude-was-run")) 'Codex deployment leaves Claude synchronization separate'
    Assert-True ((Read-Text "$codex/agents/tester.toml") -eq "name = `"tester`"`n") 'a role is deployed'
    Assert-True ((Read-Text "$codex/agents/router-model-x.toml") -eq "operator router`n") 'the operator router role is not overwritten'
    Assert-True ((Read-Text "$codex/skills/alpha/references/one.md") -eq "one`n") 'nested skill files are deployed'
    Assert-True (-not (Test-Path -LiteralPath "$codex/skills/alpha/__pycache__")) 'excluded cache files are not deployed'
    Assert-True ((Read-Text "$codex/principles-and-patterns/index.md") -eq "library index`n" -and (Read-Text "$codex/principles-and-patterns/principles/one.md") -eq "principle one`n") 'the principles and patterns library is deployed beside skills'
    Assert-True ((Read-Text "$codex/hooks.json") -eq "registration v1`n") 'the hook registration is deployed as the Codex home hooks.json'
    Assert-True ((Read-Text "$codex/hooks/compact-reload.ps1") -eq "hook v1`n") 'the compaction hook script is deployed into the Codex hooks folder'
    Assert-True ((@(Get-ChildItem -LiteralPath "$codex/hooks" -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object Name) -join ',') -eq 'compact-reload.ps1') 'the optional hook module, the hook tests and the source registration are not deployed into the hooks folder'
    Assert-True ((Read-Text "$outside/gamma/SKILL.md") -eq "outside gamma`n") 'nothing is written through a directory link'
    Assert-True ($first.Text -match 'skills[\\/]gamma[\\/]SKILL\.md sits under the link') 'the directory link is reported'
    Assert-True ((Read-Text "$codex/skills/operator-own/SKILL.md") -eq "mine`n") 'an unmapped operator skill is untouched'
    Assert-True (@(Get-Backups).Count -eq 0) 'a first apply that only adds makes no backup'
    Assert-True ((Read-Text "$ocr/rule.json") -eq "rules v1`n") 'the house rule file is added to the Open Code Review home'
    Assert-True (-not (Test-Path -LiteralPath "$codex/rule.json")) 'the house rule file is not also placed in the Codex home'
    Assert-True (Test-OcrOperatorFiles) 'adding the house rule file leaves the OCR config and sessions alone'

    [IO.Directory]::Delete("$codex/skills/gamma")
    Assert-True ((Read-Text "$outside/gamma/SKILL.md") -eq "outside gamma`n") 'removing the directory link leaves its target'
    $again = Invoke-Deploy @('-Apply')
    Assert-True ($again.Exit -eq 0) 'apply without conflicts exits 0'
    $idle = Invoke-Deploy @('-Apply')
    Assert-True ($idle.Text -match 'files: up to date') 'a repeated apply changes nothing'
    Assert-True ($idle.Text -match 'rule\.json up to date') 'an identical house rule file is reported up to date, with no action'

    Set-Content -LiteralPath "$src/skills/alpha/SKILL.md" -Value 'alpha v2'
    Set-Content -LiteralPath "$src/skills/alpha/new.md" -Value 'new'
    $update = Invoke-Deploy @('-Apply')
    Assert-True ((Read-Text "$codex/skills/alpha/SKILL.md") -eq "alpha v2`n") 'a source edit is deployed'
    Assert-True ((Read-Text "$codex/skills/alpha/new.md") -eq "new`n") 'a new source file is deployed'
    $backups = @(Get-Backups)
    Assert-True ($backups.Count -eq 1) 'an update makes one backup'
    Assert-True ((Read-Text "$($backups[0].FullName)/skills/alpha/SKILL.md") -eq "alpha v1`n") 'the backup holds the replaced copy'

    Set-Content -LiteralPath "$src/config/ocr/rule.json" -Value 'rules v2'
    $ruleUpdate = Invoke-Deploy @('-Apply')
    Assert-True ($ruleUpdate.Exit -eq 0 -and (Read-Text "$ocr/rule.json") -eq "rules v2`n") 'a house rule edit in the source is deployed'
    Assert-True (@(@(Get-Backups) | Where-Object { (Read-Text "$($_.FullName)/.opencodereview/rule.json") -eq "rules v1`n" }).Count -eq 1) 'the replaced house rule file is kept in a backup under the Codex home'
    Assert-True (Test-OcrOperatorFiles) 'updating the house rule file leaves the OCR config and sessions alone'

    [IO.File]::WriteAllText("$codex/skills/alpha/SKILL.md", "alpha v2`r`n")
    $crlf = Invoke-Deploy
    Assert-True ($crlf.Text -match 'files: up to date' -and $crlf.Text -notmatch 'CONFLICT') 'line endings alone are not a change'

    Set-Content -LiteralPath "$codex/skills/alpha/SKILL.md" -Value 'edited in codex home'
    Set-Content -LiteralPath "$src/skills/alpha/SKILL.md" -Value 'alpha v3'
    Set-Content -LiteralPath "$ocr/rule.json" -Value 'edited in place'
    Set-Content -LiteralPath "$src/config/ocr/rule.json" -Value 'rules v3'
    $edited = Invoke-Deploy @('-Apply')
    Assert-True ($edited.Exit -eq 2) 'an edit in the Codex home exits 2'
    Assert-True ((Read-Text "$codex/skills/alpha/SKILL.md") -eq "edited in codex home`n") 'an edit in the Codex home is kept'
    Assert-True ((Read-Text "$ocr/rule.json") -eq "edited in place`n" -and $edited.Text -match 'CONFLICT opencodereview:rule\.json was edited in the OCR home') 'a house rule file edited in place is kept and reported in the OCR home'
    $forced = Invoke-Deploy @('-Apply', '-Force')
    Assert-True ((Read-Text "$codex/skills/alpha/SKILL.md") -eq "alpha v3`n") '-Force replaces the edit'
    Assert-True (@(@(Get-Backups) | Where-Object { (Read-Text "$($_.FullName)/skills/alpha/SKILL.md") -eq "edited in codex home`n" }).Count -eq 1) '-Force keeps the edit in a backup'

    Set-Content -LiteralPath "$codex/skills/alpha/stranger.md" -Value 'never deployed'
    Set-Content -LiteralPath "$src/skills/alpha/stranger.md" -Value 'source version'
    $stranger = Invoke-Deploy @('-Apply')
    Assert-True ((Read-Text "$codex/skills/alpha/stranger.md") -eq "never deployed`n") 'content the deploy never wrote is kept'
    Assert-True ($stranger.Text -match 'not deployed by this script') 'content the deploy never wrote is reported'
    [IO.File]::Delete("$src/skills/alpha/stranger.md")

    Set-Content -LiteralPath "$codex/skills/beta/operator-note.md" -Value 'note'
    [IO.File]::Delete("$src/skills/beta/extra.md")
    [IO.File]::Delete("$src/skills/alpha/references/one.md")
    [IO.Directory]::Delete("$src/skills/alpha/references")
    $retire = Invoke-Deploy @('-Apply')
    Assert-True ($retire.Text -match 'retire\s+skills[\\/]beta[\\/]extra\.md') 'a dropped file is retired'
    Assert-True (-not (Test-Path -LiteralPath "$codex/skills/beta/extra.md")) 'a retired file leaves the Codex home'
    Assert-True ((Read-Text "$codex/skills/beta/operator-note.md") -eq "note`n") 'an operator file beside it survives'
    Assert-True (-not (Test-Path -LiteralPath "$codex/skills/alpha/references")) 'an emptied directory is removed'
    Assert-True (@(@(Get-Backups) | Where-Object { (Read-Text "$($_.FullName)/skills/beta/extra.md") -eq "beta extra`n" }).Count -eq 1) 'a retired file is kept in a backup'

    # A retired skill later replaced by a directory link must not be followed.
    Set-Content -LiteralPath "$outside/gamma/keep.md" -Value 'keep'
    [IO.File]::Delete("$src/skills/gamma/SKILL.md")
    [IO.Directory]::Delete("$src/skills/gamma")
    [IO.File]::Delete("$codex/skills/gamma/SKILL.md")
    [IO.Directory]::Delete("$codex/skills/gamma")
    New-Item -ItemType $linkType -Path "$codex/skills/gamma" -Target "$outside/gamma" | Out-Null
    $linked = Invoke-Deploy @('-Apply', '-Force')
    Assert-True ((Read-Text "$outside/gamma/SKILL.md") -eq "outside gamma`n" -and (Read-Text "$outside/gamma/keep.md") -eq "keep`n") 'retirement never reaches through a directory link, even with -Force'
    Assert-True ($linked.Text -match 'retired but sits under the link') 'a retirement under a directory link is reported'

    Assert-True ((Read-Text "$ocr/rule.json") -eq "rules v3`n") '-Force replaces a house rule file edited in place'
    Assert-True ((Test-OcrOperatorFiles) -and (Test-Path -LiteralPath "$ocr/sessions" -PathType Container)) 'the OCR config and sessions survive every apply'

    $overlapText = (& pwsh -NoProfile -File $deploy -SourceRoot $src -CodexHome $src -OcrHome $ocr -Apply 2>&1 | ForEach-Object { "$_" }) -join "`n"
    Assert-True ($LASTEXITCODE -ne 0 -and $overlapText -match 'must be separate directories') 'source and install target cannot overlap'

    # Root separation is conservative even on Unix volumes that ignore case.
    # Case variants are passed as arguments, never created as a second directory.
    $sourceSentinel = Read-Text (Join-Path $src 'AGENTS.md')
    $stateSentinel = Read-Text (Join-Path $codex '.harness-backup/deploy-state.json')
    $ruleSentinel = Read-Text (Join-Path $ocr 'rule.json')
    foreach ($case in @(
            @{ Source = $src; Codex = (Join-Path $fixture 'SOURCE'); Ocr = $ocr; Label = 'source and Codex roots equal after case folding' },
            @{ Source = $src; Codex = (Join-Path $fixture 'SOURCE/nested'); Ocr = $ocr; Label = 'Codex nested under a case variant of the source' },
            @{ Source = (Join-Path $fixture 'SOURCE/nested'); Codex = $src; Ocr = $ocr; Label = 'source nested under a case variant of the Codex home' },
            @{ Source = $src; Codex = $codex; Ocr = (Join-Path $fixture 'SOURCE'); Label = 'source and OCR roots equal after case folding' },
            @{ Source = $src; Codex = $codex; Ocr = (Join-Path $fixture 'SOURCE/nested'); Label = 'OCR nested under a case variant of the source' },
            @{ Source = (Join-Path $fixture 'SOURCE/nested'); Codex = $codex; Ocr = $src; Label = 'source nested under a case variant of the OCR home' },
            @{ Source = $src; Codex = $codex; Ocr = (Join-Path $fixture 'CODEX'); Label = 'Codex and OCR roots equal after case folding' },
            @{ Source = $src; Codex = $codex; Ocr = (Join-Path $fixture 'CODEX/nested'); Label = 'OCR nested under a case variant of the Codex home' },
            @{ Source = $src; Codex = (Join-Path $fixture 'CODEX/nested'); Ocr = $codex; Label = 'Codex nested under a case variant of the OCR home' })) {
        $caseText = (& pwsh -NoProfile -File $deploy -SourceRoot $case.Source -CodexHome $case.Codex -OcrHome $case.Ocr -Apply 2>&1 | ForEach-Object { "$_" }) -join "`n"
        Assert-True ($LASTEXITCODE -ne 0 -and $caseText -match 'must be separate directories') "$($case.Label) is refused"
        Assert-True ((Read-Text (Join-Path $src 'AGENTS.md')) -eq $sourceSentinel -and
            (Read-Text (Join-Path $codex '.harness-backup/deploy-state.json')) -eq $stateSentinel -and
            (Read-Text (Join-Path $ocr 'rule.json')) -eq $ruleSentinel -and
            -not (Test-Path -LiteralPath (Join-Path $src '.harness-backup')) -and
            -not (Test-Path -LiteralPath (Join-Path $src 'nested')) -and
            -not (Test-Path -LiteralPath (Join-Path $codex 'nested'))) "$($case.Label) leaves source, rules and deployment state unchanged"
    }

    $siblingCodex = Join-Path $fixture 'source-sibling'
    $siblingOcr = Join-Path $fixture 'source-sibling-ocr'
    New-Item -ItemType Directory -Path $siblingCodex | Out-Null
    $siblingText = (& pwsh -NoProfile -File $deploy -SourceRoot $src -CodexHome $siblingCodex -OcrHome $siblingOcr -Apply 2>&1 | ForEach-Object { "$_" }) -join "`n"
    Assert-True ($LASTEXITCODE -eq 0 -and (Read-Text (Join-Path $siblingCodex 'AGENTS.md')) -eq "policy v1`n") 'similarly prefixed nonnested source and home directories can deploy'
    Assert-True ((Read-Text (Join-Path $src 'AGENTS.md')) -eq $sourceSentinel -and
        (Read-Text (Join-Path $codex '.harness-backup/deploy-state.json')) -eq $stateSentinel) 'deploying to separate siblings leaves the source and earlier deployment state unchanged'

    $mapFile = "$src/config/install-map.json"
    $mapOriginal = [IO.File]::ReadAllText($mapFile)
    $unsafeMap = $mapOriginal | ConvertFrom-Json
    $unsafeMap.mappings[0].target = '../outside/escaped.md'
    $unsafeMap | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $mapFile
    $unsafe = Invoke-Deploy @('-Apply')
    Assert-True ($unsafe.Exit -ne 0 -and $unsafe.Text -match 'Map path escapes') 'a mapped target cannot escape the Codex home'
    Assert-True (-not (Test-Path -LiteralPath "$outside/escaped.md")) 'rejected map writes nothing outside the Codex home'
    [IO.File]::WriteAllText($mapFile, $mapOriginal)

    if (-not $IsWindows) {
        $caseEscape = $mapOriginal | ConvertFrom-Json
        $caseEscape.mappings[0].target = '../Codex/escaped.md'
        $caseEscape | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $mapFile
        $caseRefused = Invoke-Deploy @('-Apply')
        Assert-True ($caseRefused.Exit -ne 0 -and $caseRefused.Text -match 'Map path escapes' -and -not (Test-Path -LiteralPath (Join-Path $fixture 'Codex/escaped.md'))) 'a Unix mapped target cannot escape into a sibling differing only in case'
        [IO.File]::WriteAllText($mapFile, $mapOriginal)
    }

    # The OCR home is an allowlist of one entry: another home, or another file
    # into the OCR home, is refused before anything is written.
    $ruleIndex = [array]::FindIndex([object[]]($mapOriginal | ConvertFrom-Json).mappings, [Predicate[object]] { param($m) $m.PSObject.Properties['home'] })
    Assert-True ($ruleIndex -ge 0) 'the install map carries the house rule entry'
    foreach ($case in @(
            @{ Field = 'home'; Value = '%USERPROFILE%\.elsewhere'; Label = 'a map entry naming another home is refused' },
            @{ Field = 'home'; Value = @('%USERPROFILE%\.opencodereview'); Label = 'a home given as a list is refused' },
            @{ Field = 'source'; Value = 'AGENTS.md'; Label = 'another source into the OCR home is refused' },
            @{ Field = 'kind'; Value = 'dir'; Label = 'another kind into the OCR home is refused' },
            @{ Field = 'target'; Value = 'config.json'; Label = 'another file into the OCR home is refused' })) {
        $outsideMap = $mapOriginal | ConvertFrom-Json
        $outsideMap.mappings[$ruleIndex].($case.Field) = $case.Value
        $outsideMap | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $mapFile
        Set-Content -LiteralPath "$src/config/ocr/rule.json" -Value 'rules v4'
        $refused = Invoke-Deploy @('-Apply', '-Force')
        Assert-True ($refused.Exit -ne 0 -and $refused.Text -match 'may install outside the Codex home') $case.Label
        Assert-True ((Read-Text "$ocr/rule.json") -eq "rules v3`n" -and (Test-OcrOperatorFiles)) "$($case.Label), and nothing is written"
        [IO.File]::WriteAllText($mapFile, $mapOriginal)
    }

    # A Codex-home entry cannot reach the house rule file through its state key.
    $colonMap = $mapOriginal | ConvertFrom-Json
    $colonMap.mappings += [pscustomobject]@{ source = 'AGENTS.md'; target = 'opencodereview:rule.json'; kind = 'file' }
    $colonMap | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $mapFile
    $colon = Invoke-Deploy @('-Apply', '-Force')
    Assert-True ($colon.Exit -ne 0 -and $colon.Text -match 'must not contain a colon') 'a Codex-home map target holding a colon is refused'
    Assert-True ((Read-Text "$ocr/rule.json") -eq "rules v3`n" -and (Test-OcrOperatorFiles) -and -not (Test-Path -LiteralPath "$codex/opencodereview")) 'a refused colon target writes nothing'
    [IO.File]::WriteAllText($mapFile, $mapOriginal)

    # A hand-placed house rule file identical to the source is left alone.
    $codexFresh = Join-Path $fixture 'codex-fresh'
    $ocrFresh = Join-Path $fixture 'opencodereview-fresh'
    New-Item -ItemType Directory -Force -Path $codexFresh, $ocrFresh | Out-Null
    Copy-Item -LiteralPath "$src/config/ocr/rule.json" -Destination "$ocrFresh/rule.json"
    # An operator's own user-level hooks.json, written before the harness
    # shipped one, is reported and kept rather than replaced.
    Set-Content -LiteralPath "$codexFresh/hooks.json" -Value 'operator hooks'
    $freshText = (& pwsh -NoProfile -File $deploy -SourceRoot $src -CodexHome $codexFresh -OcrHome $ocrFresh 2>&1 | ForEach-Object { "$_" }) -join "`n"
    Assert-True ($freshText -match 'rule\.json up to date' -and $freshText -notmatch 'opencodereview:rule\.json') 'a hand-placed identical house rule file plans no action'
    Assert-True ($freshText -match 'CONFLICT hooks\.json differs from the source and was not deployed by this script') "an operator's own hooks.json is reported as a conflict"

    # Dropping the entry retires the house rule file into the backup and keeps
    # the OCR home, even when the rule file was the only thing in it.
    $null = & pwsh -NoProfile -File $deploy -SourceRoot $src -CodexHome $codexFresh -OcrHome $ocrFresh -Apply 2>&1
    Assert-True ((Read-Text "$codexFresh/hooks.json") -eq "operator hooks`n" -and (Read-Text "$codexFresh/hooks/compact-reload.ps1") -eq "hook v1`n") "an apply keeps the operator's hooks.json as it was and still installs the hook script"
    $retireMap = $mapOriginal | ConvertFrom-Json
    $retireMap.mappings = @($retireMap.mappings | Where-Object { -not $_.PSObject.Properties['home'] })
    $retireMap | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $mapFile
    $ruleRetire = Invoke-Deploy @('-Apply')
    $null = & pwsh -NoProfile -File $deploy -SourceRoot $src -CodexHome $codexFresh -OcrHome $ocrFresh -Apply 2>&1
    [IO.File]::WriteAllText($mapFile, $mapOriginal)
    # The earlier junction fixture still reports a conflict, so the exit code is not asserted here.
    Assert-True ($ruleRetire.Text -match 'retire\s+opencodereview:rule\.json' -and -not (Test-Path -LiteralPath "$ocr/rule.json")) 'a dropped house rule entry retires the unedited copy'
    Assert-True (@(@(Get-Backups) | Where-Object { (Read-Text "$($_.FullName)/.opencodereview/rule.json") -eq "rules v3`n" }).Count -eq 1) 'the retired house rule file is kept in a backup under the Codex home'
    Assert-True ((Test-OcrOperatorFiles) -and (Test-Path -LiteralPath "$ocr/sessions" -PathType Container)) 'retiring the house rule file leaves the OCR config and sessions alone'
    Assert-True (-not (Test-Path -LiteralPath "$ocrFresh/rule.json") -and (Test-Path -LiteralPath $ocrFresh -PathType Container)) 'retiring the only file in the OCR home keeps the folder'

    $stateDir = "$codex/.harness-backup"
    [IO.Directory]::Move($stateDir, "$fixture/saved-backup")
    New-Item -ItemType Directory -Path "$outside/state" | Out-Null
    New-Item -ItemType $linkType -Path $stateDir -Target "$outside/state" | Out-Null
    $linkedState = Invoke-Deploy @('-Apply', '-Force')
    Assert-True ($linkedState.Exit -ne 0 -and $linkedState.Text -match 'Deployment state sits under the link') 'deployment state never follows a directory link'
    Assert-True (-not (Get-ChildItem -LiteralPath "$outside/state" -Force | Select-Object -First 1)) 'linked state target is untouched'
}
finally {
    $resolvedFixture = [IO.Path]::GetFullPath($fixture)
    $resolvedRoot = [IO.Path]::TrimEndingDirectorySeparator([IO.Path]::GetFullPath($fixtureRoot))
    $comparison = if ($IsWindows) { [StringComparison]::OrdinalIgnoreCase } else { [StringComparison]::Ordinal }
    if (-not $resolvedFixture.StartsWith($resolvedRoot + [IO.Path]::DirectorySeparatorChar, $comparison)) { throw "Fixture escaped $fixtureRoot" }
    foreach ($item in @(Get-ChildItem -LiteralPath $fixture -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue)) {
        [IO.Directory]::Delete($item.FullName)
    }
    if (Test-Path -LiteralPath $fixture) { [IO.Directory]::Delete($fixture, $true) }
}

Write-Host ''
if ($failures.Count) {
    Write-Host "Deploy check failed: $($failures.Count) of $checks assertion(s)."
    exit 1
}
Write-Host "Deploy check passed: $checks assertion(s)."
exit 0
