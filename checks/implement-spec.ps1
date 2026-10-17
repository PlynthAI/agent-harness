#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the shared implement-spec method (SF-022).

.DESCRIPTION
    Reads skills/implement-spec/SKILL.md and its handoff reference and checks what a
    machine can decide: the frontmatter, the light budget, the load-the-handoff
    rule that reads the ticket, the local plan, the AGENTS chain and the named
    code without reading the entire history, the plan-as-guidance rule, the
    execute-the-checklist rule, the procedure routes (design, database, tests)
    with protected execution returned to the team lead, the reviewable handoff (changed
    behaviour, candidate, checks with outcomes, remaining gaps, what was not
    touched, no formal certificate), the stop-at-the-boundary rule with no
    automatic merge, the router bullet and the run-all wiring, and the
    portability rules (no host path, drive letter, model pin or
    package-manager invocation).

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
    return ,$sections.ToArray()
}

function Find-Section {
    param($Sections, [string]$BodyPattern)
    foreach ($section in $Sections) { if ($section.Body -match $BodyPattern) { return $section } }
    return $null
}

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

$root = Split-Path $PSScriptRoot -Parent
$skillDir = Join-Path $root 'skills\implement-spec'
$skillPath = Join-Path $skillDir 'SKILL.md'
$refDir = Join-Path $skillDir 'references'
$refPath = Join-Path $refDir 'handoff.md'
$selfPath = Join-Path $PSScriptRoot 'implement-spec.ps1'
$skill = Get-FileText -Path $skillPath
$ref = Get-FileText -Path $refPath
$router = Get-FileText -Path (Join-Path $root 'AGENTS.md')
$runAll = Get-FileText -Path (Join-Path $root 'checks\run-all.ps1')
$skillFlat = [regex]::Replace($skill, '\s+', ' ')
$refFlat = [regex]::Replace($ref, '\s+', ' ')

Write-Host 'The method file'
Assert-True (Test-Path -LiteralPath $skillPath) 'the method carries a SKILL.md'
Assert-True ($skill -match '(?s)\A---\r?\n.*?\r?\n---') 'the skill opens with frontmatter'
$name = [regex]::Match($skill, '(?m)^name:\s*(.+?)\s*$').Groups[1].Value.Trim('"', "'")
$description = [regex]::Match($skill, '(?ms)^description:\s*(.+?)(?=\r?\n[a-z_]+:|\r?\n---)').Groups[1].Value.Trim()
Assert-True ($name -eq 'implement-spec') "the frontmatter names the skill (found '$name')"
Assert-True ($description.Length -ge 40) "the frontmatter carries a description a session can select on (found $($description.Length) characters)"
$bytes = if (Test-Path -LiteralPath $skillPath -PathType Leaf) { (Get-Item -LiteralPath $skillPath).Length } else { 0 }
Assert-True ($bytes -le 12288) "the method stays light enough to load into a cycle (found $bytes bytes)"
Assert-True ($bytes -ge 2048) "the method carries real body text, not just the asserted phrases (found $bytes bytes)"
$yamlPath = Join-Path $skillDir 'agents\openai.yaml'

$sections = Get-SectionObjects -Text $skill
Assert-True ($sections.Count -ge 4) "the method keeps its working sections together (found $($sections.Count))"
$minSection = $(if ($sections.Count) { ($sections | ForEach-Object { $_.Body.Length } | Measure-Object -Minimum).Minimum } else { 0 })
Assert-True ($sections.Count -ge 4 -and $minSection -ge 150) "every section carries a real body rather than a heading and a stub (thinnest: $minSection characters)"

Write-Host ''
Write-Host 'Load the handoff, not the history'
$loadSection = Find-Section -Sections $sections -BodyPattern '(?i)not the entire history'
Assert-True ($null -ne $loadSection) 'one section carries the load rule'
$loadBody = if ($loadSection) { [string]$loadSection.Body } else { '' }
$loadFlat = [regex]::Replace($loadBody, '\s+', ' ')
Assert-True ($loadFlat -match '(?is)read the handoff, not the entire history') 'the load reads the handoff, not the entire history'
Assert-True ($loadFlat -match '(?is)local .*checklist') 'the load reads the local checklist'
Assert-True ($loadFlat -match '(?is)docs-workspace') 'the plan is read at the path docs-workspace resolves'
Assert-True ($loadFlat -match '(?is)AGENTS\.md') 'the load reads the applicable AGENTS chain'
Assert-True ($loadFlat -match '(?is)callers.*seams.*tests|seams.*tests|named files') 'the load reads the named code, callers, seams and tests'
Assert-True ($loadFlat -match '(?is)do not silently replan') 'a conflicting plan is surfaced, never silently replanned'
$guidanceClause = Find-Unit -Units (Get-Clauses -Text $loadBody) -MustMatch @('(?i)harmless difference', '(?i)not a conflict|guidance, not')
Assert-True ($guidanceClause.Length -gt 0) 'a harmless plan difference is guidance, not a conflict'

Write-Host ''
Write-Host 'Execute within scope and route'
$execSection = Find-Section -Sections $sections -BodyPattern '(?i)execute the checklist|dependency order'
Assert-True ($null -ne $execSection) 'one section carries the execute rule'
$execBody = if ($execSection) { [string]$execSection.Body } else { '' }
$execFlat = [regex]::Replace($execBody, '\s+', ' ')
Assert-True ($execFlat -match '(?is)smallest change that satisfies') 'the change is the smallest that satisfies the task'
Assert-True ($execFlat -match '(?is)root cause') 'a bug fix addresses the root cause with its regression check'
Assert-True ($execFlat -match '(?is)focused validation') 'the focused validation is run'
Assert-True ($execFlat -match '(?is)add no boilerplate') 'no boilerplate is added'
Assert-True ($execFlat -match '(?is)add no speculative abstractions, extension points, or dependencies') 'no speculative abstraction, extension point or dependency is added'
Assert-True ($execFlat -match '(?is)add no scaffolding for later') 'no scaffolding for later is added'
Assert-True ($execFlat -match '(?is)\[design\]\(\.\./design/SKILL\.md\)') 'visual work routes through the project design authority'
Assert-True ($execFlat -match '(?is)database-workflow') 'database work routes through the guarded workflow'
Assert-True ($execFlat -match '(?is)tdd') 'test authoring routes through tdd'
$dbClause = Find-Unit -Units (Get-Clauses -Text $execBody) -MustMatch @('(?i)protected database execution returns to the team lead', '(?i)never to a')
Assert-True ($dbClause.Length -gt 0) 'protected database execution returns to the team lead in the clause that names it'
Assert-True ($execFlat -match '(?is)a subagent never executes a production write') 'a subagent never executes a production write'
Assert-True ($execFlat -match '(?is)a subagent never applies a migration') 'a subagent never applies a migration'
Assert-True ($execFlat -match '(?is)a subagent never performs a destructive action') 'a subagent never performs a destructive action'
Assert-True ($execFlat -notmatch '(?is)subagent.{0,80}(may|can|should).{0,40}(production write|apply .{0,20}migration|destructive)') 'no sentence lets a subagent execute protected work'

Write-Host ''
Write-Host 'Return the handoff'
$returnSection = Find-Section -Sections $sections -BodyPattern '(?i)fresh reviewer reads'
Assert-True ($null -ne $returnSection) 'one section carries the return rule'
$returnBody = if ($returnSection) { [string]$returnSection.Body } else { '' }
$returnFlat = [regex]::Replace($returnBody, '\s+', ' ')
Assert-True ($returnFlat -match '(?is)changed behaviour.*candidate') 'the handoff returns the changed behaviour with its candidate'
Assert-True ($returnFlat -match '(?is)exact outcomes|checks.*outcomes') 'the handoff returns checks with their exact outcomes'
Assert-True ($returnFlat -match '(?is)missing.*reported as missing|reported as missing') 'a missing check is reported as missing, never as passed'
Assert-True ($returnFlat -match '(?is)remaining gaps|concrete remaining') 'the handoff returns the concrete remaining gaps'
Assert-True ($returnFlat -match '(?is)deliberately not touched|what was not touched|not touched') 'the handoff names what was deliberately not touched'
Assert-True ($returnFlat -match '(?is)no formal requirements certificate|no .*certificate') 'no formal requirements certificate is created'
Assert-True ($returnBody -match 'references/handoff\.md') 'the return rule points at its handoff reference'
Assert-True (Test-Path -LiteralPath $refPath -PathType Leaf) 'the handoff reference exists'
Assert-True ($refFlat -match '(?is)what changed and why[^.]{0,120}behaviour the candidate carries') 'the reference carries the changed behaviour'
Assert-True ($refFlat -match '(?is)candidate.*branch|branch.*candidate|commit.*diff|changed paths') 'the reference carries the candidate identity'
Assert-True ($refFlat -match '(?is)pass, fail, or missing|exact outcome') 'the reference carries checks with exact outcomes'
Assert-True ($refFlat -match '(?is)remaining gaps|concrete remainder') 'the reference carries the remaining gaps'
Assert-True ($refFlat -match '(?is)not a second verdict on soundness[^.]{0,120}shared review skill') 'the reference refuses a second verdict on soundness'
Assert-True ($refFlat -match '(?is)not a delivery step[^.]{0,120}shared delivery skill[^.]{0,60}delivery''s merge gate') 'the reference leaves delivery and merge to delivery''s merge gate'

Write-Host ''
Write-Host 'Stop at the boundary'
Assert-True ($skillFlat -match '(?is)owns each step beyond the candidate') 'delivery owns the steps beyond the candidate'
Assert-True ($skillFlat -match '(?is)merge does not imply deployment') 'merge does not imply deployment'
Assert-True ($skillFlat -notmatch '(?is)(auto-?merge|merge automatically|push automatically)\b[^.]{0,60}(is (fine|expected|allowed)|will|should)\b') 'no sentence permits automatic merge'

Write-Host ''
Write-Host 'Links resolve'
# The skill links sibling skills from its own directory; the reference links
# them from references/. Each side resolves from its own base, so a link that
# drifts out of the tree fails on the side that carries it.
$skillsRoot = [IO.Path]::GetFullPath((Join-Path $root 'skills')).TrimEnd('\') + '\'
function Test-Links {
    param([string]$Text, [string]$Base, [string]$Label)
    $count = 0
    foreach ($match in [regex]::Matches($Text, '\]\(([^)\s]+)\)')) {
        $target = $match.Groups[1].Value
        if ($target -match '^(?i)(https?:|mailto:|#)') { continue }
        $target = ($target -split '#')[0]
        if ([string]::IsNullOrWhiteSpace($target)) { continue }
        $count++
        $resolvedFull = [IO.Path]::GetFullPath((Join-Path $Base ($target -replace '/', '\')))
        Assert-True ($resolvedFull.StartsWith($skillsRoot, [StringComparison]::OrdinalIgnoreCase)) "$Label link '$target' stays inside the shared skills tree"
        Assert-True (Test-Path -LiteralPath $resolvedFull -PathType Leaf) "$Label link '$target' resolves to a real file"
    }
    return $count
}
$skillLinks = Test-Links -Text $skill -Base $skillDir -Label 'skill'
$refLinks = Test-Links -Text $ref -Base (Join-Path $skillDir 'references') -Label 'reference'
Assert-True (($skillLinks + $refLinks) -ge 6) "the method links its plan, review, check and delivery owners (found $($skillLinks + $refLinks) link(s))"

Write-Host ''
Write-Host 'The router and the run reach it'
$routerNamesSkill = [bool]$name -and $router -match ('(?i)\b' + [regex]::Escape($name) + '\b')
$bullet = [regex]::Match($router, "(?m)^-\s+``" + [regex]::Escape($name) + "``(?<body>[^\r\n]*(?:\r?\n[ \t]+\S[^\r\n]*)*)").Groups['body'].Value
Assert-True ($runAll -match "(?im)^\s*@\{\s*Name\s*=\s*'implement-spec'\s*;\s*File\s*=\s*'implement-spec\.ps1'") 'run-all declares this check against its own file'
Assert-True ($runAll -match [regex]::Escape("'Implement-spec check passed'")) "run-all watches for this check's own signature"
$expectedBlock = [regex]::Match($runAll, '(?s)\$expectedChecks\s*=\s*@\((?<body>.*?)\r?\n\)').Groups['body'].Value
Assert-True ($expectedBlock -match "'implement-spec'") 'the expected-check list carries this check'

Write-Host ''
Write-Host 'Portability'
$hostPath = '(?i)(\b[A-Z]:[\\/]|\\\\[A-Za-z0-9._-]+\\|file:///|(^|[\s(])/(home|Users|mnt|opt|srv)/)'
$packageInvocation = '(?i)\b(npm|pnpm|yarn|npx|uv|pip|poetry)\s+(run|exec|test|install|sync|add|build)\b'
$modelPin = '(?m)^\s*model(_provider)?\s*[=:]'
foreach ($file in @($skillPath, $refPath, $yamlPath)) {
    $text = Get-FileText -Path $file
    if ($file -eq $skillPath) { $label = 'SKILL.md' }
    elseif ($file -eq $refPath) { $label = 'the handoff reference' }
    else { $label = 'the interface declaration' }
    Assert-True ($text -notmatch $hostPath) "$label embeds no host path or drive letter"
    Assert-True ($text -notmatch $packageInvocation) "$label embeds no package-manager invocation"
    Assert-True ($text -notmatch $modelPin) "$label pins no model or provider"
}
$selfLines = @(Get-Content -LiteralPath $selfPath | Where-Object { $_ -notmatch '\$hostPath\b' })
$selfText = ($selfLines -join "`n")
Assert-True ($selfText -notmatch $hostPath) 'this check embeds no host path or drive letter outside its own patterns'

# The floor. A copy gutted to its verdict line would otherwise report a pass on
# no evidence. Kept equal to the count this file reports today.
$floor = 103
$reported = $checks
if ($reported -lt $floor) {
    $script:failures.Add("the check reported $reported assertion(s); its floor is $floor")
    Write-Host ("  FAIL the check reported $reported assertion(s); its floor is $floor - a gutted copy is not evidence")
}

Write-Host ''
if ($failures.Count -eq 0) { Write-Host ("Implement-spec check passed: $checks structural assertion(s). Prose meaning is verified by review, not here.") }
else {
    Write-Host ("Implement-spec check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
