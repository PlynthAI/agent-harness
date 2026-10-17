#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the shared design leaves extracted by SF-037 to SF-043.

.DESCRIPTION
    Checks only what a machine can decide: every leaf the router routes to exists
    under skills/design/<leaf> with a name and a description a session can select
    on, every relative link in every leaf file resolves to a real file inside that
    leaf, every file shipped under a leaf's references directory is linked from
    its METHOD.md, each file
    clears a floor that a gutted stub cannot, no file embeds a host path, a
    known project artefact name or a package-manager invocation,
    and the router routes to that exact leaf
    name in its shared-leaf column exactly once.

    The leaf set is derived from the router rather than hard-coded, so a leaf
    added without routing fails here. The registry of non-leaf skills this check
    used to carry was retired by SF-034; discovery of every skill directory, and
    the contract each one must satisfy, now belongs to checks/skills-list.ps1,
    which derives the set from the filesystem instead of from a list.

    Deliberately NOT checked here: whether the prose means the right thing. A
    resume-record lesson is that regex assertions about prose meaning pass with
    the meaning inverted and fail on harmless rewordings. The word floors below
    prove a file is not a stub; they say nothing about its content. Method content
    is verified by an independent reviewer.

    It runs no design task, installs nothing and contacts no upstream source.
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

function Get-Body {
    param([string]$Text)
    return [regex]::Replace($Text, '(?s)\A---\r?\n.*?\r?\n---', '')
}

function Get-WordCount {
    param([string]$Text)
    return @($Text -split '\s+' | Where-Object { $_ -ne '' }).Count
}

function Get-LeafRelative {
    param([string]$LeafDir, [string]$Path)
    return $Path.Substring($LeafDir.Length).TrimStart('\', '/')
}

function Get-MarkdownTableRows {
    param([string]$Text)
    $rows = [System.Collections.Generic.List[object]]::new()
    foreach ($line in ($Text -split "\r?\n")) {
        if ($line -notmatch '^\s*\|') { continue }
        $cells = @(($line.Trim().Trim('|')) -split '\|' | ForEach-Object { $_.Trim() })
        if ($cells.Count -eq 0) { continue }
        if (@($cells | Where-Object { $_ -notmatch '^-{2,}$' }).Count -eq 0) { continue }
        $rows.Add($cells)
    }
    return $rows
}

$root = Split-Path $PSScriptRoot -Parent
$skillsRoot = Join-Path $root 'skills'
$routingPath = Join-Path $skillsRoot 'design\references\routing.md'
$backtick = [char]96

# There is deliberately no "pending leaf" escape hatch. Until SF-043 a list existed
# of routed leaves allowed to be missing from disk, and the SF-043 review showed
# what that costs: a leaf deleted from disk and named in that list made this check
# report fewer assertions and still exit 0, leaving run-all's assertion count as
# the only guard. A routed leaf now has to be present. Adding a router row and a
# skill directory is one deliberate act, and checks/design-router.ps1 already
# refuses a row the leaf set does not deliver.

Write-Host ''
Write-Host 'The router names the leaves, and each is routed exactly once'

Assert-True (Test-Path -LiteralPath $routingPath) 'the design router routing reference exists'
$routing = Get-Content -Raw -LiteralPath $routingPath
$routingRows = Get-MarkdownTableRows -Text $routing
Assert-True ($routingRows.Count -ge 2) 'the routing reference carries a table'

# A routed cell is a link, [design/x](../x/METHOD.md); the leaf is x.
$routedCells = @($routingRows | Select-Object -Skip 1 | ForEach-Object {
        $cell = $_[2].Trim($backtick).Trim()
        $link = [regex]::Match($cell, '^\[design/([a-z0-9-]+)\]\(')
        if ($link.Success) { $link.Groups[1].Value } else { $cell }
    })
$leafSet = @($routedCells | Where-Object { $_ -ne 'none planned' } | Sort-Object -Unique)
Assert-True (@($routedCells | Where-Object { $_ -eq 'none planned' }).Count -ge 1) "the routing table marks surfaces with no planned leaf as 'none planned'"
Assert-True ($leafSet.Count -ge 6) "the routing table routes to at least six shared leaves (found $($leafSet.Count))"
foreach ($leafName in $leafSet) {
    $hits = @($routedCells | Where-Object { $_ -eq $leafName }).Count
    Assert-True ($hits -eq 1) "the router routes exactly one surface row to the $leafName leaf (found $hits)"
}

$designRoot = Join-Path $skillsRoot 'design'
# The router owns skills/design/references; a leaf method may link those files.
$sharedReferencesRoot = [IO.Path]::GetFullPath((Join-Path $designRoot 'references')).TrimEnd('\') + '\'
$presentLeaves = @($leafSet | Where-Object { Test-Path -LiteralPath (Join-Path $designRoot $_) -PathType Container })
foreach ($leafName in $leafSet) {
    Assert-True ($presentLeaves -contains $leafName) "$leafName : a routed leaf is present in skills/design/ rather than only promised by the table"
}

Write-Host ''
Write-Host 'Each leaf is selectable, portable, real and light'

$hostPath = '(?i)(\b[A-Z]:[\\/]|(?<!\\)(?:\\\\[A-Za-z0-9._-]+\\(?!\\)|\\\\\\\\[A-Za-z0-9._-]+\\\\(?!\\))|file:///|(^|[\s(])/(home|Users|mnt|opt|srv)/)'
# Controls distinguish portable regex syntax from raw and source-encoded paths.
$hostPathControls = @(
    @{ Text = '[\\s\\S]'; HostPath = $false; Name = 'escaped regex character classes' }
    @{ Text = '|/\\*[\\s\\S]*?\\*/'; HostPath = $false; Name = 'escaped comment regex' }
    @{ Text = '\\server\share\file.svg'; HostPath = $true; Name = 'raw UNC path' }
    @{ Text = '\\\\server\\share\\file.svg'; HostPath = $true; Name = 'encoded UNC path' }
    @{ Text = 'C:\home\example\file.svg'; HostPath = $true; Name = 'Windows drive path' }
    @{ Text = '/home/example/file.svg'; HostPath = $true; Name = 'Unix home path' }
    @{ Text = 'references/example.svg'; HostPath = $false; Name = 'portable relative path' }
)
foreach ($control in $hostPathControls) {
    Assert-True ([regex]::IsMatch($control.Text, $hostPath) -eq $control.HostPath) "host-path detector: $($control.Name)"
}
$projectTokens = '(?i)(chartkit|chart kit|chartshell|chartcontainer|compositionboard|splitbar|deltabarlist|barlist|indexedoverlay|sourcetrustpill|artifactworkspace|typeset|chatpanel|canvasassistantthread|aichatinput|airesponsecard|useaisuggestions|recharts|shadcn|storybook|echarts|maplibre|deck\.gl|quality:local|validate:docs|socio\.ts|bar-track|domain-)'
$packageInvocation = '(?i)\b(npm|pnpm|yarn|npx|uv|pip|poetry)\s+(run|exec|test|install|sync|add|build)\b'

foreach ($leafName in $presentLeaves) {
    $leafDir = (Resolve-Path -LiteralPath (Join-Path $designRoot $leafName)).Path
    $leafRoot = $leafDir.TrimEnd('\') + '\'
    $skillPath = Join-Path $leafDir 'METHOD.md'

    Assert-True (Test-Path -LiteralPath $skillPath) "the $leafName leaf carries a METHOD.md"
    if (-not (Test-Path -LiteralPath $skillPath)) { continue }

    $skill = Get-Content -Raw -LiteralPath $skillPath
    Assert-True ([regex]::IsMatch($skill, '(?s)\A---\r?\n.*?\r?\n---')) "$leafName : the skill opens with frontmatter"
    $name = Get-FrontMatterField -Text $skill -Key 'name'
    $description = Get-FrontMatterField -Text $skill -Key 'description'
    Assert-True ($name -eq $leafName) "$leafName : the frontmatter names the skill (found '$name')"
    Assert-True (-not [string]::IsNullOrWhiteSpace($description) -and $description.Length -ge 40) "$leafName : the frontmatter carries a description a session can select on"

    # Floors. A stub that keeps the frontmatter and one link used to pass every
    # assertion here; the reviewer reproduced that twice.
    $body = Get-Body -Text $skill
    $bodyWords = Get-WordCount -Text $body
    $headings = @([regex]::Matches($body, '(?m)^##\s+\S')).Count
    Assert-True ($bodyWords -ge 150) "$leafName : METHOD.md carries a method rather than a stub (found $bodyWords words, floor 150)"
    Assert-True ($headings -ge 2) "$leafName : METHOD.md carries at least two sections (found $headings)"

    # Link checks cover the shipped references. File count and byte size cannot
    # distinguish a useful method with executable checks from a vendored package.
    $files = @(Get-ChildItem -LiteralPath $leafDir -Recurse -File)

    # Relative links resolve inside the leaf, or to a permitted shared target:
    # the root notice or the router-owned design references.
    # Containment uses a trailing separator; a raw prefix admitted siblings.
    $noticePath = [IO.Path]::GetFullPath((Join-Path $root 'THIRD_PARTY_NOTICES.md'))
    $linkedTargets = [System.Collections.Generic.List[string]]::new()
    $linkCount = 0
    foreach ($file in ($files | Where-Object { $_.Extension -eq '.md' })) {
        $text = Get-Content -Raw -LiteralPath $file
        foreach ($match in [regex]::Matches($text, '\]\(([^)\s]+)\)')) {
            $target = $match.Groups[1].Value
            if ($target -match '^(?i)(https?:|mailto:|#)') { continue }
            $target = ($target -split '#')[0]
            if ([string]::IsNullOrWhiteSpace($target)) { continue }
            $linkCount++
            $fileDir = Split-Path $file.FullName -Parent
            $resolvedFull = [IO.Path]::GetFullPath((Join-Path $fileDir ($target -replace '/', '\')))
            $inside = $resolvedFull.StartsWith($leafRoot, [StringComparison]::OrdinalIgnoreCase) -or
                $resolvedFull.StartsWith($sharedReferencesRoot, [StringComparison]::OrdinalIgnoreCase) -or
                $resolvedFull.Equals($noticePath, [StringComparison]::OrdinalIgnoreCase)
            Assert-True $inside "$leafName : $(Get-LeafRelative -LeafDir $leafDir -Path $file.FullName) link '$target' stays inside the leaf or a shared design reference"
            Assert-True (Test-Path -LiteralPath $resolvedFull -PathType Leaf) "$leafName : link '$target' resolves to a real file"
            if ($file.Name -eq 'METHOD.md') { $linkedTargets.Add($target) }
        }
    }
    $referenceDir = Join-Path $leafDir 'references'
    if (Test-Path -LiteralPath $referenceDir) {
        # Without this, deleting every link would make the link section pass
        # vacuously for any leaf that ships references.
        Assert-True ($linkCount -ge 1) "$leafName : the leaf links at least one reference (found $linkCount link(s))"
        foreach ($file in (Get-ChildItem -LiteralPath $referenceDir -Recurse -File)) {
            $relative = 'references/' + $file.FullName.Substring($referenceDir.Length).TrimStart('\', '/').Replace('\', '/')
            Assert-True ($linkedTargets -contains $relative) "$leafName : METHOD.md links its $relative reference"
        }
    }

    foreach ($file in $files) {
        $text = Get-Content -Raw -LiteralPath $file
        $relative = Get-LeafRelative -LeafDir $leafDir -Path $file.FullName
        Assert-True ($text -notmatch $hostPath) "$leafName : $relative embeds no host path"
        Assert-True ($text -notmatch $projectTokens) "$leafName : $relative embeds no project artefact name"
        Assert-True ($text -notmatch $packageInvocation) "$leafName : $relative embeds no package-manager invocation"

        if ($file.Extension -eq '.md' -and $file.Name -ne 'METHOD.md') {
            $fileWords = Get-WordCount -Text (Get-Body -Text $text)
            Assert-True ($fileWords -ge 60) "$leafName : $relative carries content rather than a title (found $fileWords words, floor 60)"
        }

    }
}

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host ("Design-leaves check passed: $checks structural assertion(s) across $($presentLeaves.Count) leaf(s). Method content is verified by review, not here.")
}
else {
    Write-Host ("Design-leaves check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
