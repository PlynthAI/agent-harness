#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the shared wayfinder method (SF-019).

.DESCRIPTION
    Reads skills/wayfinder/SKILL.md and its tracker-interface reference and checks
    what a machine can decide: the frontmatter, the light budget, the
    plan-don't-do default, refer-by-name, frame-first, the
    resolve-the-tracker-first rule with native relationships and one map store,
    the index-not-store rule, the map-decisions-not-implementation rule with
    ticket types (research, prototype, grilling, task) and HITL/AFK discipline,
    the fog-of-war and out-of-scope rules, the link-local-artifacts rule that
    refuses pasted execution plans, the atomic claim flow, the chart-a-map and
    work-one-frontier invocation with the one-ticket limit, the human-decision
    rule, the bypass rule for small clear work, the handoff to to-tickets,
    planner and to-spec without owning either, the router bullet and the
    run-all wiring, and the portability rules (no host path, drive letter,
    model pin or package-manager invocation).

    Polarity is bound in each direction-bearing clause: a refusal sentence cannot
    match the permission pattern, and the permission pattern cannot match a
    refusal, so the rule and its negation cannot both match the same sentence.

    Deliberately NOT checked here: whether the prose means the right thing. A
    regex cannot tell "record only what the person decided" from its opposite, and
    no assertion below reads the meaning of a sentence. This is structure, not
    semantics. Method content is verified by independent review, and the verdict
    line says so. Each assertion below has a recorded mutation that makes it fail;
    the mutation runner and its results live in the maintenance scratch area
    outside this repository.

    The run-all.ps1 wiring is asserted in one direction here: that this check is
    declared against its own file, watched for its own signature and present in
    the expected-check list. This file runs a model for nothing, writes nothing
    and installs nothing.
#>
# 2026-09-23: retire obsolete routing-wording assertions; independent review
# assesses scope/continuation and optional planning. Structural checks remain.
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
    # One guarded read for the whole check. A missing file returns '' rather than
    # throwing, and a zero-byte file returns '' rather than $null - a null operand
    # makes the -match family emit an empty array and abort the run before its
    # verdict line.
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
    return [string](Get-Content -Raw -LiteralPath $Path)
}

function Get-SectionObjects {
    param([string]$Text)
    $sections = [System.Collections.Generic.List[object]]::new()
    foreach ($chunk in ([regex]::Split($Text, '(?m)^## ') | Select-Object -Skip 1)) {
        $parts = $chunk -split "\r?\n", 2
        $body = if ($parts.Count -gt 1) { $parts[1] } else { '' }
        $sections.Add([pscustomobject]@{ Heading = $parts[0].Trim(); Body = $body })
    }
    # Emitted as an array: a function returning an empty List is enumerated to
    # nothing, so an empty document would arrive as $null and break .Count under
    # StrictMode.
    return ,$sections.ToArray()
}

function Find-Section {
    param($Sections, [string]$BodyPattern)
    foreach ($section in $Sections) { if ($section.Body -match $BodyPattern) { return $section } }
    return $null
}

# Sentences with their wrapped lines joined, so a clause cannot be satisfied by
# two of its words sitting in different sentences. Used where a rule has to bind
# two ideas together rather than merely mention both somewhere nearby.
function Get-Clauses {
    param([string]$Text)
    $clauses = [System.Collections.Generic.List[string]]::new()
    foreach ($paragraph in ($Text -split '(?:\r?\n){2,}')) {
        $joined = ((@($paragraph -split "\r?\n") | ForEach-Object { $_.Trim() }) -join ' ').Trim()
        foreach ($clause in ($joined -split '(?<=\.)\s+')) {
            if ($clause.Trim().Length -gt 0) { $clauses.Add($clause.Trim()) }
        }
    }
    return ,$clauses.ToArray()
}

# The first carrying unit - a clause for idea binding, a paragraph where a rule
# spans two sentences - that holds every pattern, or '' when none does.
function Find-Unit {
    param([string[]]$Units, [string[]]$MustMatch)
    foreach ($unit in $Units) {
        $matched = $true
        foreach ($pattern in $MustMatch) {
            if ($unit -notmatch $pattern) { $matched = $false; break }
        }
        if ($matched) { return [string]$unit }
    }
    return ''
}

function Get-Paragraphs {
    param([string]$Text)
    $paragraphs = [System.Collections.Generic.List[string]]::new()
    foreach ($paragraph in ($Text -split '(?:\r?\n){2,}')) {
        $joined = ((@($paragraph -split "\r?\n") | ForEach-Object { $_.Trim() }) -join ' ').Trim()
        if ($joined.Length -gt 0) { $paragraphs.Add($joined) }
    }
    return ,$paragraphs.ToArray()
}

$root = Split-Path $PSScriptRoot -Parent
$skillDir = Join-Path $root 'skills\wayfinder'
$skillPath = Join-Path $skillDir 'SKILL.md'
$refDir = Join-Path $skillDir 'references'
$refPath = Join-Path $refDir 'tracker-interface.md'
$selfPath = Join-Path $PSScriptRoot 'wayfinder.ps1'
$skill = Get-FileText -Path $skillPath
$ref = Get-FileText -Path $refPath
$router = Get-FileText -Path (Join-Path $root 'AGENTS.md')
$runAll = Get-FileText -Path (Join-Path $root 'checks\run-all.ps1')
# The prose is hard-wrapped, so any multi-word phrase can straddle a line break.
# All whole-file and section assertions read flattened copies, so a rewrap cannot
# silently stop a phrase from matching while the sentence is still there.
$skillFlat = [regex]::Replace($skill, '\s+', ' ')

Write-Host 'The method file'
Assert-True (Test-Path -LiteralPath $skillPath) 'the method carries a SKILL.md'
Assert-True ($skill -match '(?s)\A---\r?\n.*?\r?\n---') 'the skill opens with frontmatter'
$name = [regex]::Match($skill, '(?m)^name:\s*(.+?)\s*$').Groups[1].Value.Trim('"', "'")
$description = [regex]::Match($skill, '(?ms)^description:\s*(.+?)(?=\r?\n[a-z_]+:|\r?\n---)').Groups[1].Value.Trim()
Assert-True ($name -eq 'wayfinder') "the frontmatter names the skill (found '$name')"
Assert-True ($description.Length -ge 40) "the frontmatter carries a description a session can select on (found $($description.Length) characters)"
Assert-True ($description -match '(?i)decision' -and $description -match '(?i)map') 'the description names the decision map the method returns'
Assert-True ($description -match '(?i)bypass|small clear work') 'the description says small clear work bypasses the map'
# Merged invocation reference embraced: the ceiling is deliberately generous
# for it, and still finite. A stub holding only the asserted phrases fails the
# floor below.
$bytes = if (Test-Path -LiteralPath $skillPath -PathType Leaf) { (Get-Item -LiteralPath $skillPath).Length } else { 0 }
Assert-True ($bytes -le 14336) "the method stays light enough to load into a cycle (found $bytes bytes)"
Assert-True ($bytes -ge 2048) "the method carries real body text, not just the asserted phrases (found $bytes bytes)"
$yamlPath = Join-Path $skillDir 'agents\openai.yaml'

# Section structure is measured on the prose, not on the rendered page: the
# tracker rule carries no fenced block, so no exclusion is needed. The minimum
# of 150 characters is a stub test, not a length target.
$sections = Get-SectionObjects -Text $skill
Assert-True ($sections.Count -ge 8) "the method keeps its working sections together (found $($sections.Count))"
$minSection = $(if ($sections.Count) { ($sections | ForEach-Object { $_.Body.Length } | Measure-Object -Minimum).Minimum } else { 0 })
Assert-True ($sections.Count -ge 8 -and $minSection -ge 150) "every section carries a real body rather than a heading and a stub (thinnest: $minSection characters)"

Write-Host ''
Write-Host 'Frame first'
# The frame is five labelled bullets inside one section: the section is located
# by its heading and each label is asserted in the flattened section body, so a
# dropped label fails even though every other label keeps the section alive.
$frameSection = Find-Section -Sections $sections -BodyPattern '(?i)\bIntent:'
Assert-True ($null -ne $frameSection) 'one section carries the frame rule'
$frameBody = if ($frameSection) { [string]$frameSection.Body } else { '' }
$frameFlat = [regex]::Replace($frameBody, '\s+', ' ')
foreach ($part in @('Intent:', 'Scope:', 'Non-goals:', 'Acceptance criteria:', 'Destination:')) {
    Assert-True ($frameFlat -match [regex]::Escape($part)) "the frame names $part"
}
Assert-True ($frameFlat -match '(?is)\*\*Destination:\*\*[^*]{0,200}handoff the map must produce') 'the destination names the handoff the map must produce'
Assert-True ($frameFlat -match '(?is)naming the destination is the first act of charting') 'naming the destination is the first act of charting'

Write-Host ''
Write-Host 'The tracker carries the map, not a local duplicate'
$trackerSection = Find-Section -Sections $sections -BodyPattern '(?i)one map store|publishable'
Assert-True ($null -ne $trackerSection) 'one section resolves the tracker before creating anything'
$trackerBody = if ($trackerSection) { [string]$trackerSection.Body } else { '' }
$trackerFlat = [regex]::Replace($trackerBody, '\s+', ' ')
Assert-True ($trackerFlat -match '(?is)tracker is the one map store') 'the tracker is the one map store'
Assert-True ($trackerFlat -match '(?is)native\b[^.]{0,120}sub-issue') "the map links its children with the native sub-issue relationship"
Assert-True ($trackerFlat -match '(?is)native\b[^.]{0,60}blocking') "dependencies use the native blocking link"
Assert-True ($trackerFlat -notmatch '(?is)(do\s+not|don''t|never|avoid|instead\s+of)\b[^.]{0,120}native\b[^.]{0,60}sub-issue') 'the sub-issue preference is not denied'
Assert-True ($trackerFlat -match '(?is)no second\b[^.]{0,60}(tracker|board|ticket file)|never a second portfolio board') 'a second tracker, board or ticket file is refused'
Assert-True ($trackerFlat -notmatch '(?is)(second\s+(tracker|board)|parallel\s+ticket\s+file)[^.]{0,60}(permitted|allowed|encouraged|keeps things tidy|is fine)\b') 'a permitted second board does not pass beside the refusal'
Assert-True ($trackerBody -match 'references/tracker-interface\.md') 'the tracker rule points at its interface reference'
Assert-True (Test-Path -LiteralPath $refPath -PathType Leaf) 'the tracker interface reference exists'
$refFlat = [regex]::Replace($ref, '\s+', ' ')
# The reference is a second carrying site, not a comment beside the rule: each
# assertion below reads the body text, so a heading that survives a gutted body
# cannot satisfy it. Polarity halves are asserted separately, so a reversal
# that keeps one half still fails.
Assert-True ($refFlat -match '(?is)one issue carries the map') 'the reference names the one map issue'
Assert-True ($refFlat -match '(?is)no second board') 'the reference refuses a second board beside the map'
Assert-True ($refFlat -notmatch '(?is)(second\s+(tracker|board)|parallel\s+ticket\s+file)[^.]{0,60}(permitted|allowed|encouraged|keeps things tidy|is fine)\b') 'a permitted second board does not pass in the reference either'
Assert-True ($refFlat -match '(?is)never an implementation subtask') 'the reference refuses the subtask reading of a decision ticket'
Assert-True ($refFlat -match '(?is)never a build ticket') 'the reference refuses the build-ticket reading of a decision ticket'
Assert-True ($refFlat -match '(?is)branch must exist first|rechecked immediately before starting') 'the reference carries the atomic claim rule, not just its heading'
Assert-True ($refFlat -match '(?is)never pastes a whole execution plan') 'the reference refuses a pasted execution plan'
Assert-True ($refFlat -match '(?is)recorded as what the person decided') 'the reference records a human decision as decided, never simulated'

Write-Host ''
Write-Host 'Plan, don''t do, and refer by name'
$planSection = Find-Section -Sections $sections -BodyPattern '(?i)planning by default'
Assert-True ($null -ne $planSection) 'one section carries the planning default'
$planFlat = if ($planSection) { [regex]::Replace([string]$planSection.Body, '\s+', ' ') } else { '' }
Assert-True ($planFlat -match '(?is)planning by default') 'wayfinder plans by default rather than doing'
Assert-True ($planFlat -match '(?is)produce decisions, not deliverables') 'the map produces decisions, not deliverables'
$referSection = Find-Section -Sections $sections -BodyPattern '(?i)by that name|never by a bare id'
Assert-True ($null -ne $referSection) 'one section carries the refer-by-name rule'
$referFlat = if ($referSection) { [regex]::Replace([string]$referSection.Body, '\s+', ' ') } else { '' }
Assert-True ($referFlat -match '(?is)refer to it by that name') 'maps and tickets are referred to by name'
Assert-True ($referFlat -match '(?is)never by a bare id, number, or slug') 'a bare id, number or slug never stands in for the name'
Assert-True ($referFlat -match '(?is)a name wraps its link') 'the id and URL ride inside the name'

Write-Host ''
Write-Host 'Map decisions, not implementation'
$mapSection = Find-Section -Sections $sections -BodyPattern '(?i)decision questions'
Assert-True ($null -ne $mapSection) 'one section carries the map rule'
$mapBody = if ($mapSection) { [string]$mapSection.Body } else { '' }
$mapFlat = [regex]::Replace($mapBody, '\s+', ' ')
$decisionClause = Find-Unit -Units (Get-Clauses -Text $mapBody) -MustMatch @('(?i)\bdecision\b', '(?i)\bwhat should be true\b', '(?i)\bwhat to build\b')
Assert-True ($decisionClause.Length -gt 0) 'a decision ticket asks what should be true, not what to build'
Assert-True ($mapFlat -match '(?is)never use\b[^.]{0,80}decision ticket\b[^.]{0,80}build ticket') 'a decision ticket is never used as a build ticket'
Assert-True ($mapFlat -match '(?is)keep unresolved downstream uncertainty under\b[^.]{0,80}not yet specified') 'unresolved uncertainty stays under Not yet specified'
Assert-True ($skillFlat -match '(?is)move discoveries beyond the destination to\b|rule out-of-scope discoveries out rather than resolving') 'discoveries beyond the destination move Out of scope'

Write-Host ''
Write-Host 'The map is an index, not a store'
# Located by heading: the rule phrase lives in the heading itself, so a body
# search cannot find it. The body assertions below still read the section body.
$indexSection = $null
foreach ($section in $sections) { if ($section.Heading -match '(?i)index, not a store') { $indexSection = $section } }
Assert-True ($null -ne $indexSection) 'one section carries the index rule'
$indexFlat = if ($indexSection) { [regex]::Replace([string]$indexSection.Body, '\s+', ' ') } else { '' }
Assert-True ($indexFlat -match '(?is)decision lives in exactly one place') 'a decision lives in exactly one place, its ticket'
Assert-True ($indexFlat -match '(?is)map never restates it, only gists it and links') 'the map gists and links, never restates'

Write-Host ''
Write-Host 'Ticket types'
# Located by heading: 'ticket types' names the section, not its body.
$typeSection = $null
foreach ($section in $sections) { if ($section.Heading -match '(?i)ticket types') { $typeSection = $section } }
Assert-True ($null -ne $typeSection) 'one section carries the ticket types'
$typeFlat = if ($typeSection) { [regex]::Replace([string]$typeSection.Body, '\s+', ' ') } else { '' }
Assert-True ($typeFlat -match '(?is)wayfinder:<type>') 'each ticket carries a wayfinder type label'
Assert-True ($typeFlat -match '(?is)`research`.*`prototype`.*`grilling`.*`task`') 'the four types are research, prototype, grilling and task'
Assert-True ($typeFlat -match '(?is)never stand in for the human''s side') 'no agent stands in for the human side of a HITL ticket'
Assert-True ($typeFlat -match '(?is)earns its place by unblocking a decision, not by delivering the destination') 'a task earns its place by unblocking a decision'
Assert-True ($typeFlat -match '(?is)linked from the issue, not pasted in') 'ticket assets are linked, not pasted'

Write-Host ''
Write-Host 'Fog of war and out of scope'
# Located by heading: 'fog of war' names the section, not its body.
$fogSection = $null
foreach ($section in $sections) { if ($section.Heading -match '(?i)fog of war') { $fogSection = $section } }
Assert-True ($null -ne $fogSection) 'one section carries the fog rule'
$fogFlat = if ($fogSection) { [regex]::Replace([string]$fogSection.Body, '\s+', ' ') } else { '' }
Assert-True ($fogFlat -match '(?is)whether the question can be stated precisely now') 'the fog-or-ticket test is statability, not answerability'
Assert-True ($fogFlat -match '(?is)don''t pre-slice the fog into ticket-sized pieces') 'the fog is not pre-sliced into tickets'
Assert-True ($fogFlat -match '(?is)excludes what is already decided') 'the fog excludes the decided, the live and the out-of-scope'
# Located by heading: the never-graduates rule lives under 'Out of scope'.
$oosSection = $null
foreach ($section in $sections) { if ($section.Heading -match '(?i)out of scope') { $oosSection = $section } }
Assert-True ($null -ne $oosSection) 'one section carries the out-of-scope rule'
$oosFlat = if ($oosSection) { [regex]::Replace([string]$oosSection.Body, '\s+', ' ') } else { '' }
Assert-True ($oosFlat -match '(?is)never graduates') 'out-of-scope work never graduates'
Assert-True ($oosFlat -match '(?is)fresh effort, not a') 'a redrawn destination starts a fresh effort'
Assert-True ($oosFlat -match '(?is)close it and leave one line') 'a mis-scoped ticket is closed with one out-of-scope line'
Assert-True ($oosFlat -match '(?is)stays out of .*decisions so far') 'a scope boundary stays out of Decisions so far'

Write-Host ''
Write-Host 'Link local artifacts, do not paste them'
$linkSection = Find-Section -Sections $sections -BodyPattern '(?i)never paste'
Assert-True ($null -ne $linkSection) 'one section carries the link-not-paste rule'
$linkBody = if ($linkSection) { [string]$linkSection.Body } else { '' }
$linkFlat = [regex]::Replace($linkBody, '\s+', ' ')
Assert-True ($linkFlat -match '(?is)workspace resolution') 'local artifacts resolve through the workspace route rather than a guessed path'
Assert-True ($linkFlat -match '(?is)never paste a whole execution plan into a ticket') 'a whole execution plan is never pasted into a ticket'
Assert-True ($linkFlat -match '(?is)not a second portfolio board') 'a linked plan is not a second portfolio board'
Assert-True ($linkFlat -notmatch '(?is)(paste|copy)\b[^.]{0,60}(the whole|entire)\b[^.]{0,40}(plan|execution plan)\b[^.]{0,40}(into|in)\b[^.]{0,20}(the|a)\b[^.]{0,20}ticket') 'no sentence permits pasting the plan into the ticket'

Write-Host ''
Write-Host 'Claim safely and work the frontier'
$claimSection = Find-Section -Sections $sections -BodyPattern '(?i)concurrency-safe|atomic claim'
Assert-True ($null -ne $claimSection) 'one section carries the claim rule'
$claimBody = if ($claimSection) { [string]$claimSection.Body } else { '' }
$claimFlat = [regex]::Replace($claimBody, '\s+', ' ')
Assert-True ($claimFlat -match '(?is)atomic') 'the claim follows the atomic flow'
Assert-True ($claimFlat -match '(?is)recheck the frontier immediately before starting') 'an undocumented tracker still rechecks the frontier before starting'
$frontierClause = Find-Unit -Units (Get-Clauses -Text $skill) -MustMatch @('(?i)at most one non-research decision', '(?i)per session')
Assert-True ($frontierClause.Length -gt 0) 'at most one non-research decision resolves per session'
$humanClause = Find-Unit -Units (Get-Clauses -Text $skill) -MustMatch @('(?i)record what the person decided', '(?i)never a')
Assert-True ($humanClause.Length -gt 0) 'a human decision is recorded, never simulated'
Assert-True ($skillFlat -notmatch '(?is)unobjected option[^.]{0,60}decision') 'silence is never promoted into a decision'

Write-Host ''
Write-Host 'Chart and work the map'
# Located by heading: the chart steps live under 'Chart a map'.
$chartSection = $null
foreach ($section in $sections) { if ($section.Heading -match '(?i)chart a map') { $chartSection = $section } }
Assert-True ($null -ne $chartSection) 'one section carries the chart rule'
$chartFlat = if ($chartSection) { [regex]::Replace([string]$chartSection.Body, '\s+', ' ') } else { '' }
Assert-True ($chartFlat -match '(?is)name the destination first|destination.*settled (first|before anything)') 'charting names the destination first'
Assert-True ($chartFlat -match '(?is)breadth-first') 'the frontier is mapped breadth-first'
Assert-True ($chartFlat -match '(?is)second pass.*ids before they can reference|wiring sorts them') 'tickets are created before blocking is wired'
Assert-True ($chartFlat -match '(?is)research.*parallel|recording each ticket''s findings on that ticket') 'research tickets dispatch in parallel with findings recorded on the ticket'
Assert-True ($chartFlat -match '(?is)charting is one session''s work; it hand-resolves nothing|hand-resolves nothing') 'charting resolves nothing by hand'
# Located by heading alongside the chart rule: the work steps live under
# 'Work one frontier decision'.
$workSection = $null
foreach ($section in $sections) { if ($section.Heading -match '(?i)work one frontier') { $workSection = $section } }
Assert-True ($null -ne $workSection) 'one section carries the work-through rule'
$workFlat = if ($workSection) { [regex]::Replace([string]$workSection.Body, '\s+', ' ') } else { '' }
Assert-True ($workFlat -match '(?is)take the first frontier ticket in order') 'an unnamed ticket defaults to the first frontier ticket'
Assert-True ($workFlat -match '(?is)zoom as needed') 'related tickets are zoomed on demand'
Assert-True ($workFlat -match '(?is)resolution comment.*close.*context pointer|append a context pointer') 'resolution is a comment, a close and a context pointer'
Assert-True ($workFlat -match '(?is)clearing each graduated patch') 'a graduated fog patch is cleared from Not yet specified'
Assert-True ($workFlat -match '(?is)update or delete (those|map) tickets') 'invalidated map tickets are updated or deleted'
Assert-True ($skillFlat -match '(?is)never resolve more than one ticket per session') 'at most one ticket resolves per session'

Write-Host ''
Write-Host 'Bypass and handoff'
# The bypass lives in its own section alongside the handoff links, so the
# section is located by the rule itself: a section that loses the rule also
# loses its location, and the assertion fails rather than reading a neighbour.
# The guard is deliberately the handoff the rule names, so a rewrite that keeps
# the link but drops the skip still fails.
$bypassFlat = ''
foreach ($section in $sections) {
    $flat = [regex]::Replace([string]$section.Body, '\s+', ' ')
    if ($flat -match '(?is)skip Wayfinder') { $bypassFlat = $flat }
}
Assert-True ($bypassFlat.Length -gt 0) 'one section carries the bypass rule'
Assert-True ($bypassFlat -match '(?is)route is already clear[^.]{0,80}skip Wayfinder[^.]{0,90}to-tickets') 'clear work skips Wayfinder for to-tickets or planner'
Assert-True ($skillFlat -match '(?is)never force a planning stage[^.]{0,60}does not need') 'no planning stage is forced on work that does not need it'
Assert-True ($skillFlat -match '(?is)\[to-tickets\]\(../to-tickets/SKILL\.md\)') 'the handoff links the ticket set it does not own'
Assert-True ($skillFlat -match '(?is)\[planner\]\(../planner/SKILL\.md\)') 'the handoff links the plan it does not own'
Assert-True ($skillFlat -match '(?is)\[to-spec\]\(../to-spec/SKILL\.md\)') 'the handoff links the durable requirement it does not own'
Assert-True ($skillFlat -match '(?is)does not own the ticket set|it does not own the ticket set') 'wayfinder does not own the ticket set'
Assert-True ($skillFlat -match '(?is)does not own.*how-to-build plan') 'wayfinder does not own the how-to-build plan'

Write-Host ''
Write-Host 'Links resolve'
$skillsRoot = [IO.Path]::GetFullPath((Join-Path $root 'skills')).TrimEnd('\') + '\'
$linkCount = 0
foreach ($match in [regex]::Matches(($skill + "`n" + $ref), '\]\(([^)\s]+)\)')) {
    $target = $match.Groups[1].Value
    if ($target -match '^(?i)(https?:|mailto:|#)') { continue }
    $target = ($target -split '#')[0]
    if ([string]::IsNullOrWhiteSpace($target)) { continue }
    $linkCount++
    $linkBase = if ($match.Value -and $ref.Contains($match.Value)) { (Join-Path $skillDir 'references') } else { $skillDir }
    $resolvedFull = [IO.Path]::GetFullPath((Join-Path $linkBase ($target -replace '/', '\')))
    Assert-True ($resolvedFull.StartsWith($skillsRoot, [StringComparison]::OrdinalIgnoreCase)) "link '$target' stays inside the shared skills tree"
    Assert-True (Test-Path -LiteralPath $resolvedFull -PathType Leaf) "link '$target' resolves to a real file"
}
Assert-True ($linkCount -ge 6) "the method links its route, planner, ticket and template owners (found $linkCount link(s))"

Write-Host ''
Write-Host 'The router and the run reach it'
$routerNamesSkill = [bool]$name -and $router -match ('(?i)\b' + [regex]::Escape($name) + '\b')
$bullet = [regex]::Match($router, "(?m)^-\s+``" + [regex]::Escape($name) + "``(?<body>[^\r\n]*(?:\r?\n[ \t]+\S[^\r\n]*)*)").Groups['body'].Value
Assert-True ($runAll -match "(?im)^\s*@\{\s*Name\s*=\s*'wayfinder'\s*;\s*File\s*=\s*'wayfinder\.ps1'") 'run-all declares this check against its own file'
Assert-True ($runAll -match [regex]::Escape("'Wayfinder check passed'")) "run-all watches for this check's own signature"
$expectedBlock = [regex]::Match($runAll, '(?s)\$expectedChecks\s*=\s*@\((?<body>.*?)\r?\n\)').Groups['body'].Value
Assert-True ($expectedBlock -match "'wayfinder'") 'the expected-check list carries this check'

Write-Host ''
Write-Host 'Portability'
# The scan reads the artefact, never this file: this check necessarily contains
# the forbidden spellings inside its own patterns and messages, so scanning
# itself would report the pattern's own text rather than the artefact.
$hostPath = '(?i)(\b[A-Z]:[\\/]|\\\\[A-Za-z0-9._-]+\\|file:///|(^|[\s(])/(home|Users|mnt|opt|srv)/)'
$packageInvocation = '(?i)\b(npm|pnpm|yarn|npx|uv|pip|poetry)\s+(run|exec|test|install|sync|add|build)\b'
$modelPin = '(?m)^\s*model(_provider)?\s*[=:]'
foreach ($file in @($skillPath, $refPath, $yamlPath)) {
    $text = Get-FileText -Path $file
    if ($file -eq $skillPath) { $label = 'SKILL.md' }
    elseif ($file -eq $refPath) { $label = 'the tracker interface' }
    else { $label = 'the interface declaration' }
    Assert-True ($text -notmatch $hostPath) "$label embeds no host path or drive letter"
    Assert-True ($text -notmatch $packageInvocation) "$label embeds no package-manager invocation"
    Assert-True ($text -notmatch $modelPin) "$label pins no model or provider"
}
# This file's own portability is read line by line with the pattern definitions
# and their messages stripped, so a host path added to the
# check's prose still fails without the scan matching itself.
$selfLines = @(Get-Content -LiteralPath $selfPath | Where-Object { $_ -notmatch '\$hostPath\b' })
$selfText = ($selfLines -join "`n")
Assert-True ($selfText -notmatch $hostPath) 'this check embeds no host path or drive letter outside its own patterns'

# The floor. A copy gutted to its verdict line would otherwise report a pass on
# no evidence. Kept equal to the count this file reports today.
$floor = 141
$reported = $checks
if ($reported -lt $floor) {
    $script:failures.Add("the check reported $reported assertion(s); its floor is $floor")
    Write-Host ("  FAIL the check reported $reported assertion(s); its floor is $floor - a gutted copy is not evidence")
}

Write-Host ''
if ($failures.Count -eq 0) { Write-Host ("Wayfinder check passed: $checks structural assertion(s). Prose meaning is verified by review, not here.") }
else {
    Write-Host ("Wayfinder check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
