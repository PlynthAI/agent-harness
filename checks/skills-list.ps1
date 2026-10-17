#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the shared skills-list method (SF-034).

.DESCRIPTION
    Reads skills/skills-list and checks what a machine can decide: the
    frontmatter, the sections, the light budget, the portability rules (no host
    path, model pin or package-manager invocation), every link
    resolving inside the skill, and the absence of a stored catalogue.

    Then it runs the discovery tool over this repository's own skills directory
    and asserts the two halves of the card's third acceptance criterion: the tool
    sees every skill directory that exists and no others, and it read frontmatter
    only rather than loading every body. Finally it asserts that the
    hand-maintained skill registry SF-034 retired has not come back.

    Deliberately NOT checked here: whether the prose means the right thing, and
    the content of the runtime's own skills list, which belongs to the machine
    rather than to this repository. Method content is verified by independent
    review. The check opens no session, writes nothing and needs no network.
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

function Get-FileText {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
    return [string](Get-Content -Raw -LiteralPath $Path)
}

$root = Split-Path $PSScriptRoot -Parent
$skillDir = Join-Path $root 'skills\skills-list'
$skillPath = Join-Path $skillDir 'SKILL.md'
$skill = Get-FileText -Path $skillPath
$router = Get-FileText -Path (Join-Path $root 'AGENTS.md')
$leaves = Get-FileText -Path (Join-Path $root 'checks\design-leaves.ps1')
$runAll = Get-FileText -Path (Join-Path $root 'checks\run-all.ps1')

Write-Host 'The method file'
Assert-True (Test-Path -LiteralPath $skillPath) 'the method carries a SKILL.md'
Assert-True ($skill -match '(?s)\A---\r?\n.*?\r?\n---') 'the skill opens with frontmatter'
$name = [regex]::Match($skill, '(?m)^name:\s*(.+?)\s*$').Groups[1].Value.Trim('"', "'")
$description = [regex]::Match($skill, '(?ms)^description:\s*(.+?)(?=\r?\n[a-z_]+:|\r?\n---)').Groups[1].Value
Assert-True ($name -eq 'skills-list') "the frontmatter names the skill (found '$name')"
Assert-True ($description.Length -ge 40) "the frontmatter carries a description a session can select on (found $($description.Length) characters)"
$bytes = if (Test-Path -LiteralPath $skillPath -PathType Leaf) { (Get-Item -LiteralPath $skillPath).Length } else { 0 }
Assert-True ($bytes -le 8192) "the method stays light (found $bytes bytes)"
Assert-True ($bytes -ge 2048) "the method carries real body text, not just the asserted phrases (found $bytes bytes)"
Assert-True ($skill -match '(?m)^## The cheapest answer is already in front of you\s*$') 'section 1 points at the session list first'
Assert-True ($skill -match '(?m)^## What it reports\s*$') 'section 2 lists the reported fields'
Assert-True ($skill -match '(?m)^## Which skill helps here\s*$') 'a section routes a request through the group tree'
Assert-True ($skill -match '(?m)^## Rules\s*$') 'section 3 carries the rules'
Assert-True ($skill -match '(?m)^## References\s*$') 'the method ends with a references section'
$sections = @([regex]::Split($skill, '(?m)^## ') | Select-Object -Skip 1 | Where-Object { $_ -notmatch '^References\b' })
$minSection = $(if ($sections.Count) { ($sections | ForEach-Object { $_.Length } | Measure-Object -Minimum).Minimum } else { 0 })
Assert-True ($sections.Count -ge 3 -and $minSection -ge 300) "every method section carries a real body (found $($sections.Count) sections, thinnest $minSection characters)"

Write-Host ''
Write-Host 'The tool and its coverage'
$scriptPath = Join-Path $skillDir 'scripts\list-skills.mjs'
$testPath = Join-Path $skillDir 'tests\list-skills.test.mjs'
$referencePath = Join-Path $skillDir 'references\roots.md'
$workflowsPath = Join-Path $skillDir 'references\workflows.md'
Assert-True (Test-Path -LiteralPath $scriptPath -PathType Leaf) 'the discovery tool ships with the method'
Assert-True (Test-Path -LiteralPath $testPath -PathType Leaf) 'the tool carries fixture coverage'
Assert-True (Test-Path -LiteralPath $referencePath -PathType Leaf) 'the roots reference ships with the method'
Assert-True (Test-Path -LiteralPath $workflowsPath -PathType Leaf) 'the workflows reference ships with the method'
foreach ($linked in @('scripts/list-skills.mjs', 'tests/list-skills.test.mjs', 'references/roots.md', 'references/workflows.md')) {
    Assert-True ($skill -match [regex]::Escape("($linked)")) "SKILL.md links $linked"
}
# No stored catalogue: the method's whole point is that the list is generated.
$stored = @(Get-ChildItem -LiteralPath $skillDir -Recurse -File |
        Where-Object { $_.Name -match '(?i)catalog|inventory' -or $_.Extension -in @('.json', '.csv', '.tsv') })
Assert-True ($stored.Count -eq 0) "the skill stores no catalogue file (found: $(@($stored | ForEach-Object { $_.Name }) -join ', '))"

Write-Host ''
Write-Host 'Links resolve inside the skills library'
# The workflows reference links sibling skills, so a link may leave this skill
# but never the shared skills directory.
$skillRoot = (Resolve-Path -LiteralPath (Join-Path $root 'skills')).Path.TrimEnd('\') + '\'
$linkCount = 0
foreach ($file in (Get-ChildItem -LiteralPath $skillDir -Recurse -File | Where-Object { $_.Extension -eq '.md' })) {
    $text = Get-FileText -Path $file.FullName
    foreach ($match in [regex]::Matches($text, '\]\(([^)\s]+)\)')) {
        $target = $match.Groups[1].Value
        if ($target -match '^(?i)(https?:|mailto:|#)') { continue }
        $target = ($target -split '#')[0]
        if ([string]::IsNullOrWhiteSpace($target)) { continue }
        $linkCount++
        $resolvedFull = [IO.Path]::GetFullPath((Join-Path (Split-Path $file.FullName -Parent) ($target -replace '/', '\')))
        Assert-True ($resolvedFull.StartsWith($skillRoot, [StringComparison]::OrdinalIgnoreCase)) "link '$target' stays inside the skills library"
        Assert-True (Test-Path -LiteralPath $resolvedFull -PathType Leaf) "link '$target' resolves to a real file"
    }
}
Assert-True ($linkCount -ge 3) "the method links its tool, its tests and its reference (found $linkCount link(s))"

Write-Host ''
Write-Host 'Portability'
$hostPath = '(?i)(\b[A-Z]:[\\/]|\\\\[A-Za-z0-9._-]+\\|file:///|(^|[\s(])/(home|Users|mnt|opt|srv)/)'
$packageInvocation = '(?i)\b(npm|pnpm|yarn|npx|uv|pip|poetry)\s+(run|exec|test|install|sync|add|build)\b'
foreach ($file in @($skillPath, $referencePath, $workflowsPath)) {
    $text = Get-FileText -Path $file
    $relative = [IO.Path]::GetFileName($file)
    Assert-True ($text -notmatch $hostPath) "$relative embeds no host path"
    Assert-True ($text -notmatch $packageInvocation) "$relative embeds no package-manager invocation"
    Assert-True ($text -notmatch '(?m)^\s*model(_provider)?\s*[=:]') "$relative pins no model or provider"
}

Write-Host ''
Write-Host 'The catalogue is discovered, not stored'
$harnessSkills = Join-Path $root 'skills'
$node = Get-Command node -ErrorAction SilentlyContinue
Assert-True ($null -ne $node) 'node is available to run the discovery tool'
$discovery = $null
$rawAnswer = ''
if ($null -ne $node) {
    $rawAnswer = & node $scriptPath --source filesystem --no-default-roots --root $harnessSkills --format json 2>&1 | Out-String
    $exit = $LASTEXITCODE
    Assert-True ($exit -eq 0) "the discovery tool answers for this repository's skills directory (exit $exit)"
    if ($exit -eq 0) {
        try { $discovery = $rawAnswer | ConvertFrom-Json } catch { $discovery = $null }
    }
}
Assert-True ($null -ne $discovery) 'the discovery tool returns parseable JSON'
if ($null -ne $discovery) {
    $onDisk = @(Get-ChildItem -LiteralPath $harnessSkills -Directory | Select-Object -ExpandProperty Name | Sort-Object)
    $reported = @($discovery.skills | ForEach-Object { $_.directory } | Sort-Object -Unique)
    $notReported = @($onDisk | Where-Object { $reported -notcontains $_ })
    $invented = @($reported | Where-Object { $onDisk -notcontains $_ })
    Assert-True ($notReported.Count -eq 0) "every skill directory is discovered (missed: $($notReported -join ', '))"
    Assert-True ($invented.Count -eq 0) "the tool invents no skill that is not on disk (invented: $($invented -join ', '))"
    # A directory added without a selectable description would otherwise be
    # discovered and unusable, which is the failure the retired registry caught.
    $undescribed = @($discovery.skills | Where-Object { [string]::IsNullOrWhiteSpace($_.description) } | ForEach-Object { $_.directory })
    Assert-True ($undescribed.Count -eq 0) "every discovered skill carries a description to select on (missing: $($undescribed -join ', '))"
    $misnamed = @($discovery.skills | Where-Object { $_.name -ne $_.directory } | ForEach-Object { "$($_.directory) -> $($_.name)" })
    Assert-True ($misnamed.Count -eq 0) "every skill's frontmatter name matches its directory (mismatched: $($misnamed -join ', '))"
    $dupes = @($discovery.duplicates | ForEach-Object { $_.name })
    Assert-True ($dupes.Count -eq 0) "the shared catalogue carries no duplicate name (duplicated: $($dupes -join ', '))"
    # Bodies are not loaded: the answer must be far smaller than the sum of the
    # SKILL.md files it describes.
    $totalBytes = (Get-ChildItem -LiteralPath $harnessSkills -Recurse -File -Filter 'SKILL.md' | Measure-Object -Property Length -Sum).Sum
    $answerBytes = ([string]$rawAnswer).Length
    Assert-True ($answerBytes -gt 0 -and $answerBytes -lt ($totalBytes / 2)) "the catalogue was read from frontmatter, not from every body (answer $answerBytes bytes against $totalBytes bytes of skill files)"
    foreach ($field in @('surface', 'roots', 'skills', 'duplicates', 'aliases', 'on_disk_not_listed', 'listed_not_on_disk')) {
        Assert-True (@($discovery.PSObject.Properties.Name) -contains $field) "the answer reports '$field'"
    }
}

Write-Host ''
Write-Host 'The group tree is drawn from frontmatter'
$authoring = Get-FileText -Path (Join-Path $root 'skills\harness\library\references\authoring-a-skill.md')
$groupRows = @([regex]::Matches($authoring, '(?m)^\|\s*([a-z]+)\s*\|\s*([a-z-]+)\s*\|'))
Assert-True ($groupRows.Count -ge 8) "the authoring reference supplies the group vocabulary (found $($groupRows.Count) group(s))"
$treeLines = @()
if ($null -ne $node) {
    $previousEncoding = [Console]::OutputEncoding
    try {
        [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
        $treeLines = @(& node $scriptPath --format tree --source filesystem --no-default-roots --root $harnessSkills 2>&1 | ForEach-Object { [string]$_ })
        $treeExit = $LASTEXITCODE
    }
    finally { [Console]::OutputEncoding = $previousEncoding }
    Assert-True ($treeExit -eq 0) "the tree format answers for this repository's skills directory (exit $treeExit)"
}
$firstLine = if ($treeLines.Count) { $treeLines[0] } else { '' }
Assert-True ($firstLine -match '^\d+ group\(s\), \d+ skill\(s\) from filesystem') "the tree opens with its group and skill counts (found '$firstLine')"
$dash = [string][char]0x2500
$missingHeads = @($groupRows | ForEach-Object {
        $head = '^' + [regex]::Escape($_.Groups[1].Value) + ' ' + $dash + ' ' + [regex]::Escape($_.Groups[2].Value) + ':'
        if (-not @($treeLines | Where-Object { $_ -match $head }).Count) { "$($_.Groups[1].Value) $dash $($_.Groups[2].Value)" }
    })
Assert-True ($missingHeads.Count -eq 0) "the tree heads every group with its lead (missing: $($missingHeads -join ', '))"
$ungrouped = @($treeLines | Where-Object { $_ -match '^ungrouped\b' })
Assert-True ($ungrouped.Count -eq 0) "the tree leaves no skill ungrouped (found $($ungrouped.Count) line(s))"

Write-Host ''
Write-Host 'The hand-maintained registry stays retired'
Assert-True ($leaves -notmatch [regex]::Escape('$otherSkillNames')) 'the design-leaves registry array is gone'
$bullet = [regex]::Match($router, "(?m)^-\s+``skills-list``(?<body>[^\r\n]*(?:\r?\n[ \t]+\S[^\r\n]*)*)").Groups['body'].Value
Assert-True ($runAll -match "(?im)^\s*@\{\s*Name\s*=\s*'skills-list'\s*;\s*File\s*=\s*'skills-list\.ps1'") 'run-all declares this check'
$expectedBlock = [regex]::Match($runAll, '(?s)\$expectedChecks\s*=\s*@\((?<body>.*?)\r?\n\)').Groups['body'].Value
Assert-True ($expectedBlock -match "'skills-list'") 'the expected-check list carries this check'
Assert-True ($runAll -match 'skills\\skills-list\\tests\\list-skills\.test\.mjs') 'the tool fixture suite is wired into run-all'

Write-Host ''
if ($failures.Count -eq 0) { Write-Host ("Skills-list check passed: $checks structural assertion(s). Method content is verified by review, not here.") }
else {
    Write-Host ("Skills-list check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
