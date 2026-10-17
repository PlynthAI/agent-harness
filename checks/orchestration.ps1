#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the shared orchestration contract.

.DESCRIPTION
    Checks only what a machine can decide: the skill and its assignment reference
    exist, the reference is linked from the skill, the reference defines the six
    assignment fields and the return contract, and the router still names this
    skill. For the autonomy, long-runs and programme references it checks that
    each exists and is linked, the anchors a reader navigates by (the brief
    lines, the ledger verdicts, the section headings), that every local link in
    the skill resolves, and that no file carries a host path or an upstream
    product name or command. The team reference must exist, be linked and carry
    its six sections in order; the coordinate leaf must exist in group
    coordinate without the lead flag, be named and linked from the skill, and
    pass the same link and portability checks. One retired claim is guarded:
    orchestrate-work must not say the team lead (once main) is the coordinator; coordinate must
    carry a transport section with a Codex and a Claude entry.

    Deliberately NOT checked: whether the prose means the right thing. An earlier
    version of this file policed the wording and a reviewer showed eight of eleven
    mutations doing the opposite of what the assertions claimed, plus false failures
    on harmless rewordings. The reservation about prose belongs to review, not to a
    regex.

    For the codebase-memory starter pack it checks that the pins agree, the
    scripts parse, the wrapper names projects as the tool does and refuses
    every route that would leave a process or write agent configuration, and
    the installer refuses a mirror that is not the pinned archive. None of
    that needs the installed binary or the network.

    It does not run a delegation; that happens per assignment.
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
$skillPath = Join-Path $root 'skills\orchestrate-work\SKILL.md'
$assignmentPath = Join-Path $root 'skills\orchestrate-work\references\assignment.md'
$stalePath = Join-Path $root 'skills\orchestrate-work\references\handoff.md'

Assert-True (Test-Path -LiteralPath $skillPath) 'the orchestrate-work skill exists'
Assert-True (Test-Path -LiteralPath $assignmentPath) 'the assignment reference exists'
Assert-True (-not (Test-Path -LiteralPath $stalePath)) 'no reference named handoff remains, so the programme handoff keeps that word'
$skill = Get-Content -Raw -LiteralPath $skillPath
$assignment = Get-Content -Raw -LiteralPath $assignmentPath

Assert-True ($skill -match '(?is)\]\(references/assignment\.md\)') 'the skill links the assignment reference'
Assert-True ($skill -match '(?is)six fields') 'the skill says how many assignment fields there are'
Assert-True ($assignment -match '(?is)What the team lead sends') 'the reference defines what the team lead sends'
Assert-True ($assignment -match '(?is)What a child returns') 'the reference defines what a child returns'
Assert-True ($assignment -match '(?is)When there is no plan') 'the reference covers the no-plan case'

foreach ($field in @('Outcome', 'Owned paths', 'Context', 'Checks', 'Evidence destination', 'Constraints')) {
    Assert-True ($assignment -match ('(?im)^\|\s*' + [regex]::Escape($field) + '\s*\|')) "the reference defines the $field field"
}

$router = Get-Content -Raw -LiteralPath (Join-Path $root 'AGENTS.md')
Assert-True ($router -match '(?i)orchestrate-work') 'the router still names this skill'

# The coordination references carried from pstack's poteto-mode: presence,
# linkage and the structural anchors a reader navigates by, not their wording.
$skillDir = Join-Path $root 'skills\orchestrate-work'
$referenceText = @{}
foreach ($name in @('autonomy', 'long-runs', 'programme')) {
    $path = Join-Path $skillDir "references\$name.md"
    $exists = Test-Path -LiteralPath $path -PathType Leaf
    Assert-True $exists "the $name reference exists"
    $referenceText[$name] = $(if ($exists) { [string](Get-Content -Raw -LiteralPath $path) } else { '' })
    Assert-True ($skill -match ('\]\(references/' + [regex]::Escape($name) + '\.md\)')) "the skill links references/$name.md"
}

$programme = $referenceText['programme']
foreach ($line in @('GOAL', 'SCOPE', 'ACCEPTANCE', 'VERIFY', 'REPORT', 'STANDING')) {
    Assert-True ($programme -match ('(?m)^' + $line + '\s{2,}\S')) "the programme brief carries its $line line"
}
foreach ($verdict in @('live-ui-verified', 'unit-test-verified', 'type-check-only', 'verifier-blocked', 'verifier-failed')) {
    Assert-True ($programme -match ('(?<![\w-])' + [regex]::Escape($verdict) + '(?![\w-])')) "the programme ledger names the $verdict verdict"
}

$autonomy = $referenceText['autonomy']
# Approval semantics belong to the operator and prose review, not a fixed pause phrase.
foreach ($heading in @('Guard the Context Window', 'Never Block on the Human')) {
    Assert-True ($autonomy -match ('(?im)^#+\s*' + [regex]::Escape($heading) + '\s*$')) "the autonomy reference carries the $heading principle as a heading"
}

$longRuns = $referenceText['long-runs']
foreach ($heading in @('Autonomous run', 'Session pickup', 'Pause safely')) {
    Assert-True ($longRuns -match ('(?im)^#+\s*' + [regex]::Escape($heading) + '\s*$')) "the long-runs reference carries the $heading section"
}

# The team reference: present, linked, and carrying its six sections in order.
$teamPath = Join-Path $skillDir 'references\team.md'
$teamExists = Test-Path -LiteralPath $teamPath -PathType Leaf
Assert-True $teamExists 'the team reference exists'
Assert-True ($skill -match '\]\(references/team\.md\)') 'the skill links references/team.md'
$team = $(if ($teamExists) { [string](Get-Content -Raw -LiteralPath $teamPath) } else { '' })
$teamSections = @('The team', 'Admission', 'The lead owns to closure', 'Done and Integrated', 'Closeout', 'Recovery')
$teamHeadings = @([regex]::Matches($team, '(?m)^##\s+(.+?)\s*$') | ForEach-Object { $_.Groups[1].Value })
foreach ($heading in $teamSections) {
    Assert-True ($teamHeadings -ccontains $heading) "the team reference carries the $heading section"
}
# A legitimate added section must not fail this check: the six required sections
# have to appear in order, and any further section is permitted.
$teamCursor = 0
$teamInOrder = $true
foreach ($heading in $teamSections) {
    while ($teamCursor -lt $teamHeadings.Count -and $teamHeadings[$teamCursor] -cne $heading) { $teamCursor++ }
    if ($teamCursor -ge $teamHeadings.Count) { $teamInOrder = $false; break }
    $teamCursor++
}
Assert-True $teamInOrder 'the team reference carries those six sections in order, with any additional sections permitted'

# The coordinate leaf: a skill in group coordinate, not a lead, named and
# linked from this lead. Its links and portability are checked with the lead's
# files below.
$coordinateDir = Join-Path $root 'skills\coordinate'
$coordinatePath = Join-Path $coordinateDir 'SKILL.md'
$coordinateExists = Test-Path -LiteralPath $coordinatePath -PathType Leaf
Assert-True $coordinateExists 'the coordinate skill exists'
$coordinateText = $(if ($coordinateExists) { [string](Get-Content -Raw -LiteralPath $coordinatePath) } else { '' })
$coordinateFront = [regex]::Match($coordinateText, '(?s)^﻿?---\r?\n(.*?)\r?\n---').Groups[1].Value
Assert-True ($coordinateFront -match '(?m)^name:\s*coordinate\s*$') 'the coordinate skill is named coordinate in its frontmatter'
Assert-True ($coordinateFront -match '(?m)^\s+group:\s*coordinate\s*$') 'the coordinate skill declares group: coordinate'
Assert-True ($coordinateFront -ne '' -and $coordinateFront -notmatch '(?m)^\s+lead:\s*true\s*$') 'the coordinate skill is a leaf, without the lead flag'
Assert-True (Test-Path -LiteralPath (Join-Path $coordinateDir 'agents\openai.yaml') -PathType Leaf) 'the coordinate skill carries agents/openai.yaml'
$skillBody = [regex]::Replace($skill, '(?s)^﻿?---\r?\n.*?\r?\n---', '')
Assert-True ($skillBody -match '`coordinate`|\[coordinate\]') 'the lead names coordinate in its body'
Assert-True ($skill -match '\]\(\.\./coordinate/SKILL\.md\)') 'the lead links ../coordinate/SKILL.md'

# The chief-of-staff model (7 October 2026): the team lead (named main until
# 8 October 2026) of a chat running orchestrate-work orchestrates the work it was handed, so the retired
# opening claim must not return; coordinate carries a transport section with a
# heading or table row per runtime.
Assert-True ($skill -notmatch '(?i)\b(Main|team lead) is the coordinator') 'orchestrate-work does not say the team lead (or main) is the coordinator'
$transportSection = [regex]::Match($coordinateText, '(?ims)^##\s+[^\r\n]*transport[^\r\n]*$(.*?)(?=^##\s|\z)').Groups[1].Value
Assert-True ($transportSection -ne '') 'the coordinate skill has a transport section'
$runtimeEntries = @{}
foreach ($runtime in @('Codex', 'Claude')) {
    $row = [regex]::Match($transportSection, '(?im)^\|\s*' + $runtime + '\b[^\r\n]*$')
    $sub = [regex]::Match($transportSection, '(?ims)^###\s+' + $runtime + '\b.*?(?=^###?\s|\z)')
    $runtimeEntries[$runtime] = $(if ($row.Success) { $row.Value } elseif ($sub.Success) { $sub.Value } else { '' })
    Assert-True ($runtimeEntries[$runtime] -ne '') "the coordinate transport section has a heading or table row for $runtime"
}

# Every local link in the skill and the coordinate leaf resolves. Fenced examples are illustrative, not
# navigational, so they are stripped first, as the skill-surface suite does.
$hostPath = '(\b[A-Z]:\\|/home/|/Users/|/tmp/)'
$upstreamMachinery = '(?i)(\bcursor\b|\bpoteto\b|(^|[\s`(])gt\s|(^|[\s`(])orch\s)'
$skillsRoot = Join-Path $root 'skills'
$checkedFiles = @(Get-ChildItem -LiteralPath $skillDir -Recurse -File -Filter '*.md')
if ($coordinateExists) { $checkedFiles += @(Get-ChildItem -LiteralPath $coordinateDir -Recurse -File -Filter '*.md') }
foreach ($file in $checkedFiles) {
    $text = [string](Get-Content -Raw -LiteralPath $file.FullName)
    $relative = $file.FullName.Substring($skillsRoot.Length + 1) -replace '\\', '/'
    $prose = [regex]::Replace($text, '(?ms)^\s*```[^\n]*\n.*?^\s*```\s*$', '')
    foreach ($match in [regex]::Matches($prose, '\]\(([^)\s]+)\)')) {
        $target = ($match.Groups[1].Value -split '#')[0]
        if ([string]::IsNullOrWhiteSpace($target) -or $target -match '^(?i)[a-z][a-z0-9+.-]*:') { continue }
        $resolved = [IO.Path]::GetFullPath((Join-Path $file.DirectoryName ($target -replace '/', '\')))
        Assert-True (Test-Path -LiteralPath $resolved -PathType Leaf) "$relative link '$target' resolves to a real file"
    }
    Assert-True ($text -cnotmatch $hostPath) "$relative embeds no host path"
    Assert-True ($text -notmatch $upstreamMachinery) "$relative names no upstream product or command"
}

# The codebase-memory starter pack: pins that agree, scripts that parse, and
# the behaviour that needs no installed binary. The wrapper's project naming
# matches names the tool itself assigned; the wrapper refuses every route that
# could leave a process or write agent configuration; the installer refuses a
# mirror that is not the pinned archive before it touches anything. `fresh`
# refuses a root it cannot bind, and against the installed binary (skipped
# visibly without it) a temporary repository walks every freshness state.
$packDir = Join-Path $skillDir 'scripts\codebase-memory'
foreach ($name in @('install.ps1', 'cbm.ps1', 'VERSION', 'assets.json')) {
    Assert-True (Test-Path -LiteralPath (Join-Path $packDir $name) -PathType Leaf) "the starter pack ships $name"
}
$packVersion = (Get-Content -Raw -LiteralPath (Join-Path $packDir 'VERSION')).Trim()
Assert-True ($packVersion -match '^\d+\.\d+\.\d+$') 'the starter pack VERSION is a plain release number'
$pins = Get-Content -Raw -LiteralPath (Join-Path $packDir 'assets.json') | ConvertFrom-Json
$pinnedAssets = @($pins.assets.PSObject.Properties)
Assert-True ($pinnedAssets.Count -gt 0 -and @($pinnedAssets | Where-Object { $_.Value.sha256 -notmatch '^[0-9a-f]{64}$' -or -not $_.Value.name }).Count -eq 0) 'every pinned asset has a name and a SHA-256'
Assert-True ($null -ne $pins.assets.PSObject.Properties['windows-amd64']) 'the windows-amd64 asset is pinned'
Assert-True (@($pins.installedFiles | Where-Object { $pins.archiveEntries -cnotcontains $_ }).Count -eq 0) 'every installed file is an archive entry'
Assert-True ($pins.installedFiles -contains 'LICENSE' -and $pins.installedFiles -notcontains 'install.ps1') 'the licence is installed and the vendor installer is not'
foreach ($script in @('install.ps1', 'cbm.ps1')) {
    $parseErrors = $null
    [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $packDir $script), [ref]$null, [ref]$parseErrors) | Out-Null
    Assert-True (@($parseErrors).Count -eq 0) "$script parses"
}
$wrapper = Join-Path $packDir 'cbm.ps1'
# Roots shaped like those the tool indexed on 2026-10-04, named as it named them.
$namedByTool = @{
    'C:\Example.co\Code Repo\example-app'               = 'C-Example.co-Code-Repo-example-app'
    'D:\Example.co\worktrees\example-app-graph-trial'   = 'D-Example.co-worktrees-example-app-graph-trial'
}
if ($IsWindows) {
    foreach ($root in $namedByTool.Keys) {
        $derived = (& pwsh -NoProfile -File $wrapper project $root 2>&1 | Out-String).Trim()
        Assert-True ($LASTEXITCODE -eq 0 -and $derived -ceq $namedByTool[$root]) "the wrapper names $root as the tool does"
    }
}
foreach ($refused in @('daemon', 'install', 'update', 'uninstall', 'config', '')) {
    $wrapperArgs = @(if ($refused) { $refused })
    & pwsh -NoProfile -File $wrapper @wrapperArgs *> $null
    Assert-True ($LASTEXITCODE -eq 2) "the wrapper refuses '$refused' with exit 2"
}
$fakeDir = Join-Path ([IO.Path]::GetTempPath()) ('cbm-mirror-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fakeDir | Out-Null
try {
    $fakeFile = Join-Path $fakeDir 'codebase-memory-mcp.exe'
    Set-Content -LiteralPath $fakeFile -Value 'not the release'
    $fakeZip = Join-Path $fakeDir 'fake.zip'
    Compress-Archive -LiteralPath $fakeFile -DestinationPath $fakeZip
    $installOutput = & pwsh -NoProfile -File (Join-Path $packDir 'install.ps1') -Mirror $fakeZip 2>&1 | Out-String
    Assert-True ($LASTEXITCODE -ne 0) 'the installer fails on a mirror that is not the pinned archive'
    if ($IsWindows) {
        Assert-True ($installOutput -match 'SHA-256 mismatch') 'the installer names the hash mismatch'
    }
} finally {
    Remove-Item -LiteralPath $fakeDir -Recurse -Force
}

# fresh. The usage errors need only git. The walk needs the binary, and each of
# its calls costs about 12 s, so it is kept to six: missing then fresh in one
# -Refresh run (4 calls), a commit, an edit and two deletions read as stale
# (1), then the temporary index is deleted (1). The listing with no root reuses
# the same measurement and is proved by use, not here.
function Invoke-Wrapper {
    param([string[]]$WrapperArgs)
    $lines = @(& pwsh -NoProfile -File $wrapper @WrapperArgs 2>&1 | ForEach-Object { "$_" })
    [pscustomobject]@{ Exit = $LASTEXITCODE; Lines = $lines; Text = ($lines -join "`n") }
}
$freshRepo = Join-Path ([IO.Path]::GetTempPath()) ('cbm-fresh-' + [guid]::NewGuid().ToString('N'))
$freshProject = $null
New-Item -ItemType Directory -Path $freshRepo | Out-Null
try {
    & git -C $freshRepo init -q
    & git -C $freshRepo config user.email 'check@example.invalid'
    & git -C $freshRepo config user.name 'orchestration check'
    New-Item -ItemType Directory -Path (Join-Path $freshRepo 'sub') | Out-Null
    Set-Content -LiteralPath (Join-Path $freshRepo 'tracked.py') -Value 'def tracked(): return 1'
    Set-Content -LiteralPath (Join-Path $freshRepo 'sub\inner.py') -Value 'inner = 1'
    New-Item -ItemType Directory -Path (Join-Path $freshRepo 'other') | Out-Null
    Set-Content -LiteralPath (Join-Path $freshRepo 'other\keep.py') -Value 'keep = 1'
    & git -C $freshRepo add -A 2>$null
    & git -C $freshRepo -c commit.gpgsign=false commit -qm 'first'
    # Untracked but indexed: deleting it later leaves no git record at all.
    Set-Content -LiteralPath (Join-Path $freshRepo 'other\loose.py') -Value 'loose = 1'

    $usageCases = [ordered]@{
        'fresh -Refresh with no root'           = @('fresh', '-Refresh')
        'fresh on a file'                       = @('fresh', $wrapper)
        'fresh on a path that does not exist'   = @('fresh', (Join-Path $freshRepo 'absent'))
        'fresh on a folder inside a worktree'   = @('fresh', (Join-Path $freshRepo 'sub'))
    }
    foreach ($case in $usageCases.GetEnumerator()) {
        $run = Invoke-Wrapper $case.Value
        Assert-True ($run.Exit -eq 2) "the wrapper refuses $($case.Key) with exit 2"
        if ($case.Key -like '*inside a worktree') {
            Assert-True ($run.Text -match [regex]::Escape("pass $freshRepo")) 'the refusal names the worktree root to pass instead'
        }
    }

    $run = Invoke-Wrapper @('fresh', $freshRepo, '-Refresh')
    if ($run.Exit -eq 3) {
        Write-Host "  skip fresh against the installed binary: codebase-memory-mcp $packVersion is not installed"
    } else {
        $last = $run.Lines[-1]
        # The name the tool reports wins; the derived name still lets cleanup
        # release an index if the run failed after indexing.
        $freshProject = (Invoke-Wrapper @('project', $freshRepo)).Lines[0]
        if ($last -match '^fresh  (\S+)  ') { $freshProject = $Matches[1] }
        Assert-True ($run.Lines[0] -like 'missing  *') 'fresh reports an unindexed worktree as missing'
        Assert-True ($run.Exit -eq 0 -and $last -like "fresh  *  $freshRepo  indexed *") 'fresh -Refresh indexes a missing worktree and reports it fresh'

        & git -C $freshRepo -c commit.gpgsign=false commit -q --allow-empty -m 'second'
        Add-Content -LiteralPath (Join-Path $freshRepo 'tracked.py') -Value '# edited'
        Remove-Item -LiteralPath (Join-Path $freshRepo 'other\loose.py')
        & git -C $freshRepo rm -q 'sub/inner.py'
        $run = Invoke-Wrapper @('fresh', $freshRepo)
        Assert-True ($run.Exit -eq 1 -and $run.Lines[0] -like 'stale  *') 'a commit, an edit and deletions after indexing make the worktree stale'
        Assert-True ($run.Lines[0] -match 'HEAD moved at \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ') 'the commit is reported as HEAD moving'
        Assert-True ($run.Lines[0] -match '2 files changed since, newest sub/inner\.py') 'the edit and the staged deletion are counted, and the deletion is named'
        Assert-True ($run.Lines[0] -match 'folder other changed since \(an entry was added or removed\)') 'a deleted untracked file is seen through its folder'
        Assert-True ($run.Lines.Count -eq 2 -and $run.Lines[1] -match ('fresh "' + [regex]::Escape($freshRepo) + '" -Refresh')) 'a stale result prints the exact refresh command'
    }
} finally {
    if ($freshProject) {
        $run = Invoke-Wrapper @('cli', 'delete_project', '--project', $freshProject)
        Assert-True ($run.Exit -eq 0) 'the temporary index is deleted'
    }
    Remove-Item -LiteralPath $freshRepo -Recurse -Force
}

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host ("Orchestration check passed: $checks structural assertion(s). Contract prose is verified by review, not here.")
}
else {
    Write-Host ("Orchestration check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
