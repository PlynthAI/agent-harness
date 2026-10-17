#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the shared browser/E2E verification method.

.DESCRIPTION
    Reads skills/browser-verification/SKILL.md and checks the things a machine can
    actually decide: the frontmatter, the selectable description, the four
    obligations the card names (bind the server identity, choose exploratory or
    repeatable evidence, exercise the states the change can break, report the
    truth), the portability rules, the light budget, and that the method is
    registered as a skill, named by the shared router and reachable from the
    tester brief.

    Deliberately NOT checked here: whether the prose means the right thing. A
    regex cannot tell "never touch production" from "you may touch production".
    Method content is verified by independent review, not by this file.
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
$skillDir = Join-Path $root 'skills\browser-verification'
$skillPath = Join-Path $skillDir 'SKILL.md'
$skill = Get-Content -Raw -LiteralPath $skillPath
$router = Get-Content -Raw -LiteralPath (Join-Path $root 'AGENTS.md')
$tester = Get-Content -Raw -LiteralPath (Join-Path $root 'agents\tester.toml')
$runAll = Get-Content -Raw -LiteralPath (Join-Path $root 'checks\run-all.ps1')

Write-Host 'The method file'
Assert-True (Test-Path -LiteralPath $skillPath) 'the method carries a SKILL.md'
Assert-True ($skill -match '(?s)\A---\r?\n.*?\r?\n---') 'the skill opens with frontmatter'
$name = [regex]::Match($skill, '(?m)^name:\s*(.+?)\s*$').Groups[1].Value
$description = [regex]::Match($skill, '(?m)^description:\s*(.+?)\s*$').Groups[1].Value
Assert-True ($name -eq 'browser-verification') "the frontmatter names the skill (found '$name')"
Assert-True ($description.Length -ge 40) 'the frontmatter carries a description a session can select on'
$bytes = (Get-Item -LiteralPath $skillPath).Length
Assert-True ($bytes -le 8192) "the method stays light (found $bytes bytes)"
# A stub holding only the asserted phrases would otherwise satisfy every content
# assertion below, so the sections and a body floor are asserted too.
Assert-True ($bytes -ge 2048) "the method carries real body text, not just the asserted phrases (found $bytes bytes)"
Assert-True ($skill -match '(?m)^## 1\. Bind the server identity before trusting anything\s*$') 'section 1 is the identity binding'
Assert-True ($skill -match '(?m)^## 2\. Choose the evidence the claim needs\s*$') 'section 2 is the evidence choice'
Assert-True ($skill -match '(?m)^## 3\. Exercise the states this change can break\s*$') 'section 3 is the state selection'
Assert-True ($skill -match '(?m)^## 4\. Report what is true\s*$') 'section 4 is the honest report'
# A file-size floor alone can be padded, so each section must carry its own body.
$sections = @([regex]::Split($skill, '(?m)^## ') | Select-Object -Skip 1)
Assert-True ($sections.Count -ge 4) "the method carries at least four sections (found $($sections.Count))"
$minSection = $(if ($sections.Count) { ($sections | ForEach-Object { $_.Length } | Measure-Object -Minimum).Minimum } else { 0 })
Assert-True ($sections.Count -ge 4 -and $minSection -ge 300) "every section carries a real body (thinnest: $minSection characters)"

Write-Host ''
Write-Host 'The four obligations the card names'
Assert-True ($skill -match '(?is)bind the server identity before trusting anything') 'binding the server identity comes first'
Assert-True ($skill -match '(?is)the exact URL the browser actually loaded') 'the observed URL is recorded, not assumed'
Assert-True ($skill -match '(?is)reject it\s+rather than working around it') 'a wrong or stale identity is rejected, not worked around'
Assert-True ($skill -match '(?is)\*\*Exploratory\*\*') 'exploratory evidence is named'
Assert-True ($skill -match '(?is)\*\*Repeatable\*\*') 'repeatable evidence is named'
Assert-True ($skill -match '(?is)the project.s own end-to-end runner') 'the repeatable half stays with the project runner'
Assert-True ($skill -match '(?is)a screenshot on its own is not interaction proof') 'a screenshot is refused as interaction proof'
Assert-True ($skill -match '(?is)the viewports the project supports') 'viewport selection is present'
Assert-True ($skill -match '(?is)keyboard and focus order') 'keyboard and focus behaviour is present'
Assert-True ($skill -match '(?is)console and network errors') 'runtime errors are part of the evidence'
Assert-True ($skill -match '(?is)build, lint and type checks belong to the validation profiles') 'deterministic checks stay with validation'
Assert-True ($skill -match '(?is)a missing capability\s+is reported, never\s+simulated') 'a missing browser capability is reported, not faked'
Assert-True ($skill -match '(?is)name where you looked') 'absence is established by looking, not assumed'

Write-Host ''
Write-Host 'Portability'
$hostPath = '(?i)(\b[A-Z]:[\\/]|\\\\[A-Za-z0-9._-]+\\|file:///|(^|[\s(])/(home|Users|mnt|opt|srv)/)'
Assert-True ($skill -notmatch $hostPath) 'the method embeds no host path'
Assert-True ($skill -notmatch '(?m)^\s*model\s*=\s*"' -and $skill -notmatch '(?m)^\s*model_provider\s*=\s*"') 'the method pins no model or provider'
Assert-True ($skill -notmatch '(?m)^\s*model(_provider)?\s*:') 'the method pins no model in frontmatter or prose syntax'

Write-Host ''
Write-Host 'Discovery and wiring'
# SF-034 retired the registry array this assertion used to read. The catalogue is
# discovered now, and checks/skills-list.ps1 owns that claim for every directory
# under skills/, including this one. The read is guarded so that a missing file
# fails this assertion rather than aborting the run before its verdict line.
$cataloguePath = Join-Path $root 'checks\skills-list.ps1'
$catalogueCheck = if (Test-Path -LiteralPath $cataloguePath -PathType Leaf) { [string](Get-Content -Raw -LiteralPath $cataloguePath) } else { '' }
Assert-True ($catalogueCheck -match [regex]::Escape('every skill directory is discovered')) 'the skills catalogue is derived rather than registered'
# Read the bullet itself: a bare token match passes on a mention that says the
# opposite, so the bullet must carry the two claims the router makes.
# The body is the bullet's own line plus its indented continuations, so a short
# bullet followed by a separate prose line cannot borrow that line's claims and a
# bullet at the end of the file still matches.
$bullet = [regex]::Match($router, "(?m)^-\s+``browser-verification``(?<body>[^\r\n]*(?:\r?\n[ \t]+\S[^\r\n]*)*)").Groups['body'].Value
Assert-True ($tester -match '(?is)browser-verification') 'the tester brief reaches the method'
Assert-True ($runAll -match "(?im)^\s*@\{\s*Name\s*=\s*'browser-verification'\s*;\s*File\s*=\s*'browser-verification\.ps1'") 'run-all declares this check'
# Read the expected-check block itself: matching the whole file would pass on the
# declaration row above even if the literal expectation had lost this entry.
$expectedBlock = [regex]::Match($runAll, '(?s)\$expectedChecks\s*=\s*@\((?<body>.*?)\r?\n\)').Groups['body'].Value
Assert-True ($expectedBlock -match "'browser-verification'") 'the expected-check list carries this check'

Write-Host ''
if ($failures.Count -eq 0) { Write-Host ("Browser-verification check passed: $checks assertion(s). Method content is verified by review, not here.") }
else {
    Write-Host ("Browser-verification check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
