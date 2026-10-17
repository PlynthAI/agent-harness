#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the portable design router.

.DESCRIPTION
    Checks only what a machine can decide: the router and its two references
    exist, the frontmatter names the skill and carries a description, every
    relative link in the skill resolves to a real file inside the skill, the
    routing table carries a row for each capability the card requires, no file
    embeds a host path, and the router still names the skill.

    Deliberately NOT checked here: whether the prose means the right thing, or
    that a visual correction loads only relevant methods rather than the catalogue.
    Regex assertions cannot establish prose meaning: matching words may survive
    an inverted instruction or reject a harmless rewording. The routing text
    is verified by an independent reviewer.

    It runs no design task, installs nothing and contacts no upstream source.
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

$root = Split-Path $PSScriptRoot -Parent
$skillDir = Join-Path $root 'skills\design'
$skillPath = Join-Path $skillDir 'SKILL.md'
$routingPath = Join-Path $skillDir 'references\routing.md'
$upstreamPath = Join-Path $skillDir 'references\upstream.md'
$backtick = [char]96

Write-Host ''
Write-Host 'The router and its references'

Assert-True (Test-Path -LiteralPath $skillPath) 'the design skill exists'
Assert-True (Test-Path -LiteralPath $routingPath) 'the routing reference exists'
Assert-True (Test-Path -LiteralPath $upstreamPath) 'the upstream reference exists'

$skill = Get-Content -Raw -LiteralPath $skillPath
$routing = Get-Content -Raw -LiteralPath $routingPath
$upstream = Get-Content -Raw -LiteralPath $upstreamPath

# New work picks faces from the owner's list, never the system stack by default.
$fontsPath = Join-Path $skillDir 'references\fonts.md'
Assert-True (Test-Path -LiteralPath $fontsPath -PathType Leaf) 'the fonts reference exists'
Assert-True ((Test-Path -LiteralPath $fontsPath) -and (Get-Content -Raw -LiteralPath $fontsPath) -match '(?m)^Generated from .*npm run fonts:export') 'the fonts reference is marked generated, with its regenerate command'
Assert-True ($skill.Contains('](references/fonts.md)')) 'the router links the fonts reference'

# YAML allows a quoted scalar and a folded block, so both are accepted rather than
# failing a harmless edit.
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

Assert-True ([regex]::IsMatch($skill, '(?s)\A---\r?\n.*?\r?\n---')) 'the skill opens with frontmatter'
$name = Get-FrontMatterField -Text $skill -Key 'name'
$description = Get-FrontMatterField -Text $skill -Key 'description'
Assert-True ($name -eq 'design') "the frontmatter names the skill design (found '$name')"
Assert-True (-not [string]::IsNullOrWhiteSpace($description) -and $description.Length -ge 40) 'the frontmatter carries a description a session can select on'

Write-Host ''
Write-Host 'The routing table covers every required capability'

# Exact row identity and an exact delivery token. An earlier version matched a
# token anywhere in any first cell, so deleting the motion or design review row
# still passed; the reviewer reproduced that with two mutations.
$expectedRows = @(
    'page or route composition, hierarchy, responsive layout, accessibility',
    'marketing pages, landing pages, editorial or campaign surfaces',
    'choosing, composing or adapting a component',
    'visual alternatives for a component or page',
    'visual directions, concepts or remixes for a screen, feature or product idea, generated as images before anything is built',
    'mobile-web viewport, keyboard, touch and browser behaviour',
    'charts, numeric tables, uncertainty, data-shaped visuals',
    'chat, streaming or composer surfaces',
    'interactive maps, layers, selection, drawing',
    'transitions, gestures, reveals, motion review',
    'type scale, wrapping, optical alignment',
    'palette, contrast, gamut',
    'whole-surface polish or a design critique',
    'an unfamiliar effect that needs a name',
    'a fixed interface diff under review',
    'an audit of a live product flow: onboarding, checkout, settings, a journey or any multi-step path',
    'what users complain about or report about a named product: reviews, forums, support threads, issue trackers',
    'a whole-site motion audit',
    'illustration, technical drawings, diagrams and generative artwork',
    'launch, product, demo, concept and explainer videos, motion graphics and social cuts',
    '3D models, scenes, materials and renders',
    'taste and aesthetic judgement: why a design works, or why it feels generic or derivative'
)
# The contract is a pairing of surface and leaf, not a set of leaf tokens. An
# earlier version asserted that each expected leaf appeared once in the
# shared-leaf column, which let two rows swap their cells and still pass: the
# design review lens would have routed from the chat row. The mapping is
# literal, so a new surface row has to be added here as well as to $expectedRows.
$expectedLeafByRow = [ordered]@{
    'page or route composition, hierarchy, responsive layout, accessibility' = 'app-ui'
    'marketing pages, landing pages, editorial or campaign surfaces'              = 'marketing'
    'choosing, composing or adapting a component'                                 = 'components'
    'visual alternatives for a component or page'                                 = 'prototype'
    'visual directions, concepts or remixes for a screen, feature or product idea, generated as images before anything is built' = 'ideate'
    'mobile-web viewport, keyboard, touch and browser behaviour'                   = 'mobile-native'
    'charts, numeric tables, uncertainty, data-shaped visuals'                    = 'data-visualization'
    'chat, streaming or composer surfaces'                                        = 'ai-chat-interface'
    'interactive maps, layers, selection, drawing'                                = 'map-gis-interface'
    'transitions, gestures, reveals, motion review'                               = 'motion'
    'type scale, wrapping, optical alignment'                                     = 'none planned'
    'palette, contrast, gamut'                                                    = 'colour'
    'whole-surface polish or a design critique'                                   = 'none planned'
    'an unfamiliar effect that needs a name'                                      = 'none planned'
    'a fixed interface diff under review'                                         = 'review'
    'an audit of a live product flow: onboarding, checkout, settings, a journey or any multi-step path' = 'audit'
    'what users complain about or report about a named product: reviews, forums, support threads, issue trackers' = 'ux-research'
    'a whole-site motion audit'                                                   = 'none planned'
    'illustration, technical drawings, diagrams and generative artwork'           = 'drawing'
    'launch, product, demo, concept and explainer videos, motion graphics and social cuts' = 'video'
    '3D models, scenes, materials and renders'                                    = 'none planned'
    'taste and aesthetic judgement: why a design works, or why it feels generic or derivative' = 'none planned'
}

$rows = Get-MarkdownTableRows -Text $routing
Assert-True ($rows.Count -ge ($expectedRows.Count + 1)) "the routing reference is a table with a header and $($expectedRows.Count) surface rows (found $($rows.Count) parsed rows)"
$header = @($rows[0])
Assert-True ($header.Count -eq 4) "the routing table has four columns: surface, method, shared leaf and fallback (found $($header.Count))"

$dataRows = @($rows | Select-Object -Skip 1)
$rowLabels = @($dataRows | ForEach-Object { $_[0] })
foreach ($label in $expectedRows) {
    Assert-True ($rowLabels -contains $label) "the routing table has a row for: $label"
}
Assert-True ($rowLabels.Count -eq $expectedRows.Count) "the routing table's surface rows are exactly the $($expectedRows.Count) expected ones (found $($rowLabels.Count))"

# Every row must actually deliver a method and a fallback, and every shared leaf
# must still be named somewhere in the table.
foreach ($row in $dataRows) {
    $empty = @($row | Where-Object { [string]::IsNullOrWhiteSpace($_) })
    Assert-True ($empty.Count -eq 0) "row '$($row[0])' has a value in all $($row.Count) columns"
}
# The leaf has to be delivered by its own row, not merely mentioned somewhere in
# the table and not merely present in the column. Asserting the bare token let the
# design review row stop routing its leaf - the method cell still read "the
# project's own design review lens" - while this check and the leaves check both
# passed. Same lesson as RESUME section 6: a token match is not a row.
Assert-True ($expectedLeafByRow.Count -eq $expectedRows.Count) "the expected row-to-leaf mapping covers the $($expectedRows.Count) surface rows (found $($expectedLeafByRow.Count))"
# A routed leaf is a link to the nested method it names: [design/x](../x/METHOD.md).
foreach ($row in $dataRows) {
    $label = $row[0]
    $cell = $row[2].Trim($backtick).Trim()
    $link = [regex]::Match($cell, '^\[design/([a-z0-9-]+)\]\(\.\./([a-z0-9-]+)/METHOD\.md\)$')
    if ($link.Success) {
        Assert-True ($link.Groups[1].Value -eq $link.Groups[2].Value) "row '$label' links the method it names ($cell)"
        Assert-True (Test-Path -LiteralPath (Join-Path $skillDir "$($link.Groups[2].Value)\METHOD.md") -PathType Leaf) "row '$label' links a method that ships beside the router"
        $cell = $link.Groups[1].Value
    }
    Assert-True ($expectedLeafByRow.Contains($label)) "the row-to-leaf mapping knows the surface row: $label"
    if ($expectedLeafByRow.Contains($label)) {
        $wanted = $expectedLeafByRow[$label]
        Assert-True ($cell -eq $wanted) "row '$label' delivers '$wanted' in its shared-leaf column (found '$cell')"
    }
}

Write-Host ''
Write-Host 'The upstream record still has content'

# Existence alone let a body blanked to its title pass; the reviewer reproduced it.
$upstreamRows = Get-MarkdownTableRows -Text $upstream
Assert-True ($upstreamRows.Count -ge 13) "the upstream reference lists the sources in a table (found $($upstreamRows.Count) lines)"
$upstreamData = @($upstreamRows | Select-Object -Skip 1)
foreach ($row in $upstreamData) {
    $empty = @($row | Where-Object { [string]::IsNullOrWhiteSpace($_) })
    Assert-True ($empty.Count -eq 0) "upstream row '$($row[1])' has a value in all $($row.Count) columns"
}
foreach ($method in @('better-ui', 'better-typography', 'better-colors', 'typeui-fundamentals', 'emil-design-eng', 'review-animations', 'improve-animations', 'animation-vocabulary', 'apple-design', 'web-motion', 'design-taste-frontend', 'imagegen-frontend-web')) {
    Assert-True ($upstream -match [regex]::Escape($method)) "the upstream record still lists $method"
}

Write-Host ''
Write-Host 'Every relative link resolves inside the skill'

# The router's own files. Each nested method is checked by its own check, and the
# starters are checked below.
$skillFiles = @(@(Get-Item -LiteralPath $skillPath) + @(Get-ChildItem -LiteralPath (Join-Path $skillDir 'references') -Recurse -File -Filter '*.md'))
$noticePath = [IO.Path]::GetFullPath((Join-Path $root 'THIRD_PARTY_NOTICES.md'))
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
        $resolved = Join-Path (Split-Path $file.FullName -Parent) $target
        $resolvedFull = [IO.Path]::GetFullPath($resolved)
        $inside = $resolvedFull.StartsWith(([IO.Path]::GetFullPath($skillDir).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase) -or
            $resolvedFull.Equals($noticePath, [StringComparison]::OrdinalIgnoreCase)
        Assert-True $inside "$relative : link '$target' stays inside the skill"
        Assert-True (Test-Path -LiteralPath $resolvedFull) "$relative : link '$target' resolves to a real file"
    }
}
# Without this, deleting every link would make the section above pass vacuously.
Assert-True ($relativeLinkCount -ge 2) "the skill links its references rather than naming them (found $relativeLinkCount relative link(s))"

Write-Host ''
Write-Host 'The shared prose stays portable'

# A drive letter, a UNC share or a file URL is a host path in some spelling.
$hostPath = '(?i)(\b[A-Z]:[\\/]|\\\\[A-Za-z0-9._-]+\\|file:///)'
foreach ($file in $skillFiles) {
    $text = Get-Content -Raw -LiteralPath $file
    $relative = $file.FullName.Substring($skillDir.Length).TrimStart('\')
    Assert-True ($text -notmatch $hostPath) "$relative : no host path is embedded"
}

Write-Host ''
Write-Host 'The DESIGN.md starter keeps the Google format structure'

# The design skill names the root DESIGN.md in the Google format as the authority
# and the adoption route seeds from this template. Only the structure the linter
# parses is asserted here; the placeholder prose is reviewed, not matched.
$designTemplatePath = Join-Path $root 'harness-docs-starter\templates\design.md'
Assert-True (Test-Path -LiteralPath $designTemplatePath) 'the DESIGN.md starter template exists'
if (Test-Path -LiteralPath $designTemplatePath) {
    $designTemplate = Get-Content -Raw -LiteralPath $designTemplatePath
    $templateFront = [regex]::Match($designTemplate, '(?s)\A---\r?\n(.*?)\r?\n---\r?\n')
    Assert-True $templateFront.Success 'the template opens with front matter on its first line, where the linter looks for it'
    $frontText = if ($templateFront.Success) { $templateFront.Groups[1].Value } else { '' }
    Assert-True ($frontText -match '\Aversion: alpha\r?\n') 'the template front matter starts with version: alpha'
    Assert-True ($frontText -match '(?m)^colors:\r?\n(?:[ \t]+.*\r?\n)*?[ \t]+primary:') 'the template defines a primary colour, without which the linter always warns'
    $body = if ($templateFront.Success) { $designTemplate.Substring($templateFront.Length) } else { $designTemplate }
    $sections = @([regex]::Matches($body, '(?m)^## (.+?)\s*$') | ForEach-Object { $_.Groups[1].Value })
    $expectedSections = @('Overview', 'Colors', 'Typography', 'Layout', 'Elevation & Depth', 'Shapes', 'Components', "Do's and Don'ts")
    Assert-True (($sections -join '|') -eq ($expectedSections -join '|')) "the template body has exactly the eight spec sections in order (found: $($sections -join ', '))"
    # The linter merges fenced yaml blocks in the body into the tokens.
    Assert-True ($body -notmatch '(?m)^\s*(```|~~~)\s*ya?ml\b') 'the template body carries no fenced yaml block for the linter to merge'
}

Write-Host ''
Write-Host 'Every starter is a named DESIGN.md with a row in the starters README'

$startersDir = Join-Path $skillDir 'starters'
$startersReadme = Join-Path $startersDir 'README.md'
Assert-True (Test-Path -LiteralPath $startersReadme -PathType Leaf) 'the starters README exists'
Assert-True ($skill.Contains('](starters/README.md)')) 'the router links the starters README'
# A list, so a single row is not unrolled into its cells.
$starterRows = [System.Collections.Generic.List[object]]::new()
if (Test-Path -LiteralPath $startersReadme) {
    $readmeRows = Get-MarkdownTableRows -Text (Get-Content -Raw -LiteralPath $startersReadme)
    for ($index = 1; $index -lt $readmeRows.Count; $index++) { $starterRows.Add($readmeRows[$index]) }
}
$starters = @(Get-ChildItem -LiteralPath $startersDir -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'DESIGN.md') -PathType Leaf })
Assert-True ($starters.Count -ge 1) "the starters folder carries at least one starter (found $($starters.Count))"
foreach ($starter in $starters) {
    $starterText = Get-Content -Raw -LiteralPath (Join-Path $starter.FullName 'DESIGN.md')
    $starterName = Get-FrontMatterField -Text $starterText -Key 'name'
    Assert-True (-not [string]::IsNullOrWhiteSpace($starterName)) "starter $($starter.Name) carries name: front matter (found '$starterName')"
    $rowLink = "]($($starter.Name)/DESIGN.md)"
    $hits = 0
    foreach ($row in $starterRows) {
        if ($row[0].EndsWith($rowLink) -and $row.Count -ge 4 -and @($row | Where-Object { [string]::IsNullOrWhiteSpace($_) }).Count -eq 0) { $hits++ }
    }
    Assert-True ($hits -eq 1) "starter $($starter.Name) has one complete row in the starters README (found $hits)"
}
Assert-True ($starterRows.Count -eq $starters.Count) "the starters README lists exactly the starters on disk ($($starterRows.Count) row(s), $($starters.Count) starter(s))"

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host ("Design-router check passed: $checks structural assertion(s). Routing prose and selective method loading are verified by review, not here.")
}
else {
    Write-Host ("Design-router check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
