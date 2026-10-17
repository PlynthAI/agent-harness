#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the planner skill and its references.

.DESCRIPTION
    Reads the planner entrypoint and its references and checks what a machine
    can decide: frontmatter with a matching name, a description and the plan
    group; the entrypoint routing to architecture, writing-plans, sketch-first,
    design-red-flags, plan-review, audit and the principles and patterns index;
    architecture keeping the fixed word list, the seam rules, the four
    dependency categories and the three strength ratings; plan review naming its
    role, its inputs and its limits, reached from the handoff and sketch first,
    and carrying its package review section; the planning toolkit linking
    wayfinder, to-spec and to-tickets with each link resolving;
    the audit linking its vocabulary, the adoption guide's debt section and
    to-tickets, carrying its verdicts and none of the upstream report or
    interview loop; sketch-first keeping
    its five phases, its two-candidate floor, its sketch discipline and its scrap
    tells, naming the harness routes and carrying no residue of the upstream
    runtime (arena, runners, model lists, interrogate, the todolist);
    design-red-flags keeping its four flags; the six cited principles present in
    the library with front matter, listed in its index and reached through the
    index only, with no copy left in planner; the design
    sketch sections present in writing-plans in the rationale's order, usage
    before shape; and every local Markdown link resolving. Method content is
    verified by review, not here.
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
$skillRoot = Join-Path $root 'skills\planner'
function Read-Text([string]$Relative) {
    $path = Join-Path $skillRoot $Relative
    if (Test-Path -LiteralPath $path -PathType Leaf) { [IO.File]::ReadAllText($path) } else { '' }
}
$skill = Read-Text 'SKILL.md'
$sketch = Read-Text 'references\sketch-first.md'
$flags = Read-Text 'references\design-red-flags.md'
$plans = Read-Text 'references\writing-plans.md'
$architecture = Read-Text 'references\architecture.md'
$review = Read-Text 'references\plan-review.md'
$audit = Read-Text 'references\audit.md'

# Frontmatter and group.
Assert-True ($skill -match '(?s)\A---\r?\n.*?\r?\n---') 'planner has frontmatter'
Assert-True ($skill -match '(?m)^name:\s*planner\s*$') 'frontmatter name matches the directory'
Assert-True ($skill -match '(?m)^description:\s*\S') 'planner has a description'
Assert-True ($skill -match '(?m)^metadata:\s*$\r?\n\s+group:\s*plan\s*$') 'planner declares the plan group'
Assert-True ($skill -match '(?m)^description:.*(design this|how should we build this|before code is written)') 'the description carries the design-before-code trigger'

# The entrypoint routes to every reference.
foreach ($ref in @('references/architecture.md', 'references/writing-plans.md', 'references/sketch-first.md', 'references/design-red-flags.md', 'references/plan-review.md', 'references/audit.md')) {
    Assert-True ($skill -match [regex]::Escape($ref)) "planner links $ref"
}
Assert-True ($skill -match 'at least two structurally distinct') 'the entrypoint states the two-shape floor'
Assert-True ($architecture -match 'sketch-first\.md') 'the architecture reference points implementation-bound design at sketch first'

# Architecture: the restored design vocabulary, one home for the audit and advice.
foreach ($term in @('Module', 'Interface', 'Implementation', 'Depth', 'Seam', 'Adapter', 'Leverage', 'Locality')) {
    Assert-True ($architecture -match ('(?m)^- \*\*' + $term + ':?\*\*')) "the vocabulary defines: $term"
}
Assert-True ($architecture -match 'Use these terms exactly') 'the vocabulary is a fixed word list'
Assert-True ($architecture -match 'The deletion test') 'architecture keeps the deletion test'
Assert-True ($architecture -match 'One adapter means a hypothetical seam; two adapters mean a real one') 'architecture keeps the two-adapter rule'
Assert-True ($architecture -match 'The interface is the test surface') 'architecture keeps the interface as the test surface'
$categories = @([regex]::Matches($architecture, '(?m)^\d\. \*\*(In-process|Local-substitutable|Remote but owned|True external):\*\*'))
Assert-True ($categories.Count -eq 4) "architecture names the four dependency categories (found $($categories.Count))"
foreach ($rating in @('`Strong`', '`Worth exploring`', '`Speculative`')) {
    Assert-True ($architecture -match [regex]::Escape($rating)) "the candidate card carries the strength rating $rating"
}

# Plan review: a fresh planner reviews a package or a risky saved plan once, approach first.
Assert-True ($review -match '`planner`') 'plan review names the role that runs it'
Assert-True ($review -match 'step\s+list in chat is not a plan') 'plan review runs on saved drafts only'
Assert-True ($review -match 'at most five entries whose `applies_to` includes\s+`plan`') 'plan review chooses at most five plan entries'
Assert-True ($review -match '`\(trial\)`') 'plan review marks findings from trial principles'
Assert-True ($review -match '"No\s+changes" is a valid') 'no changes is a valid result'
Assert-True ($review -match 'not\s+reviewed again') 'plan review is one round'
Assert-True ($review -match '(?m)^## Approach first\s*$') 'plan review asks whether the approach is right before refining'
Assert-True ($review -match 'reverse or reopen a decision the user made') 'a change to a user decision returns as a question'
Assert-True ($plans -match 'plan-review\.md') 'the handoff routes the saved plan to plan review'
Assert-True ($sketch -match 'plan-review\.md') 'sketch first defers a saved sketch to plan review'
Assert-True ($review -match '(?m)^## Package review\s*$') 'plan review carries the package review section'

# Planning toolkit: the entrypoint links each toolkit skill and the link resolves.
foreach ($tool in @('wayfinder', 'to-spec', 'to-tickets')) {
    $href = "../$tool/SKILL.md"
    Assert-True ($skill -match [regex]::Escape("]($href)") -and (Test-Path -LiteralPath (Join-Path $skillRoot $href) -PathType Leaf)) "the planning toolkit links $href and it resolves"
}

# The audit: read-only, scoped, three states plus unsettled, tickets from strong candidates.
Assert-True ($audit -match 'architecture\.md') 'the audit uses the architecture vocabulary'
Assert-True ($audit -match [regex]::Escape('../../orchestrate-work/references/repository-adoption.md#quality-kit-and-existing-debt')) 'the audit links the adoption guide for cleanup and debt'
Assert-True ($audit -match [regex]::Escape('../../to-tickets/SKILL.md')) 'the audit files tickets through to-tickets'
Assert-True ($audit -match 'open pull requests') 'the audit judges heat from open pull requests as well as history'
foreach ($verdict in @('Binding', 'Departure', 'Debt', 'Known trap', 'Unsettled', 'Intent question')) {
    Assert-True ($audit -match ('(?m)^\| ' + $verdict + ' \|')) "the audit sorts into: $verdict"
}
Assert-True ($audit -match 'Only candidates rated `Strong`') 'only strong candidates become tickets'
Assert-True ($audit -match '`explorer`') 'the audit names the role that checks its verdicts'
Assert-True (-not [regex]::IsMatch($audit, 'HTML|Tailwind|Mermaid|grill|CONTEXT\.md|GLOSSARY\.md')) 'the audit carries no upstream report or interview loop'
$adoption = Join-Path $root 'skills\orchestrate-work\references\repository-adoption.md'
$adoptionText = if (Test-Path -LiteralPath $adoption) { [IO.File]::ReadAllText($adoption) } else { '' }
Assert-True ($adoptionText -match '(?m)^## Quality kit and existing debt\s*$') 'the adoption guide section the audit links exists'

# Sketch first: five phases in order, the floor, the discipline, the tells.
$phases = @([regex]::Matches($sketch, '(?m)^## Phase ([A-E]): (.+?)\s*$') | ForEach-Object { $_.Groups[2].Value })
Assert-True ($phases.Count -eq 5) "sketch first keeps five phases (found $($phases.Count))"
Assert-True (($phases -join '|') -match '^Ground.*\|Sketch\|Agree.*\|Implement.*\|Scrap.*$') 'the phases run Ground, Sketch, Agree, Implement, Scrap'
Assert-True ($sketch -match 'at least two structurally distinct candidates') 'phase B requires two structurally distinct candidates'
Assert-True ($sketch -match 'Whole-shape alternatives, not point fixes') 'candidates are whole shapes'
Assert-True ($sketch -match '(?m)^### The sketch discipline') 'the runner discipline is carried as the sketch discipline'
Assert-True ($sketch -match "Caller's usage first") 'the discipline starts from the caller''s usage'
Assert-True ($sketch -match 'interface depth') 'candidates are compared on interface depth'
Assert-True ($sketch -match 'Synthesis decision') 'the choice is recorded as the synthesis decision'
Assert-True ($sketch -match 'Default: proceed directly to implementation') 'the checkpoint is opt-in'
Assert-True ($sketch -match 'Deviations from the sketch are signal') 'deviations are surfaced, not absorbed'
$tells = @([regex]::Matches($sketch, '(?m)^- (The same shape of workaround|Multiple unrelated edge cases|Types that need escape hatches|The "we need a lock" reflex|Callers having to know|Two or more independent Phase D deviations)'))
Assert-True ($tells.Count -eq 6) "the scrap tells are all present (found $($tells.Count))"
Assert-True ($sketch -match '(?m)^\d\. Return to Phase B') 'a scrap returns to phase B'

# Harness routes named; upstream runtime wiring absent.
foreach ($route in @('understand/how/METHOD.md', 'understand/why/METHOD.md', 'orchestrate-work/SKILL.md', 'implement-spec/SKILL.md')) {
    Assert-True ($sketch -match [regex]::Escape("../../$route")) "sketch first links $route"
}
Assert-True ($sketch -match 'design-red-flags\.md') 'sketch first screens against the red flags'
Assert-True ($sketch -match 'writing-plans\.md') 'sketch first shapes the rationale through writing a plan'
Assert-True ($sketch -match '`reviewer`') 'adversarial pressure goes to the reviewer role'
Assert-True (-not [regex]::IsMatch($sketch, 'arena|runner|pstack-models|claude-opus|gpt-|grok-|interrogate|todolist|principle skill|Cursor')) 'sketch first carries no upstream runtime wiring'
Assert-True (-not [regex]::IsMatch($plans, 'arena|runner')) 'writing a plan carries no upstream runtime wiring'

# Design red flags: the four flags, copied whole.
foreach ($flag in @('Shallow module', 'Information leakage', 'Temporal decomposition', 'Pass-through method')) {
    Assert-True ($flags -match ('(?m)^## ' + [regex]::Escape($flag) + '\s*$')) "design red flags names: $flag"
}

# Principles: the six sketch first cites live in the principles and patterns
# library, reached through its index only; planner keeps no copy or stub.
$library = Join-Path $root 'principles-and-patterns'
$index = if (Test-Path -LiteralPath (Join-Path $library 'index.md')) { [IO.File]::ReadAllText((Join-Path $library 'index.md')) } else { '' }
$principles = [ordered]@{
    'exhaust-the-design-space' = 'exhaust the design space'
    'foundational-thinking' = 'foundational thinking'
    'outcome-oriented-execution' = 'outcome-oriented execution'
    'redesign-from-first-principles' = 'redesign from first principles'
    'fix-root-causes' = 'fix root causes'
    'subtract-before-you-add' = 'subtract before you add'
}
foreach ($name in $principles.Keys) {
    $path = Join-Path $library "principles\$name.md"
    $text = if (Test-Path -LiteralPath $path) { [IO.File]::ReadAllText($path) } else { '' }
    Assert-True ($text.Length -gt 0) "principle present in the library: $name"
    Assert-True ($text -match '(?s)\A---\r?\ntype: "principle"\r?\n.*?\r?\n---' -and $text -notmatch '(?m)^\*Apply ') "principle $name carries its apply-when as front matter, not an italic line"
    Assert-True ($index -match [regex]::Escape("](principles/$name.md)")) "the library index lists $name"
    Assert-True ($sketch -match [regex]::Escape("[$($principles[$name])](../../../principles-and-patterns/index.md)")) "sketch first names $name through the library index"
}
Assert-True ($skill -match [regex]::Escape('](../../principles-and-patterns/index.md)')) 'planner links the principles and patterns index'
Assert-True (-not (Test-Path -LiteralPath (Join-Path $skillRoot 'references\principles'))) 'planner keeps no principles folder or stub'
Assert-True (-not [regex]::IsMatch($skill + $sketch + $architecture + $review + $audit + $plans + $flags, '\]\([^)]*principles-and-patterns/(?!index\.md)')) 'planner links the library index only, never a single entry'
Assert-True ($review -match [regex]::Escape('](../../../principles-and-patterns/index.md)') -and $audit -match [regex]::Escape('](../../../principles-and-patterns/index.md)')) 'plan review and the audit reach the library through its index'

# Writing a plan: the design sketch sections in the rationale's order.
Assert-True ($plans -match '(?m)^## Design sketch') 'writing a plan carries the design sketch section'
$sections = @('Problem', "Usage \(caller's view\)", 'Shape', 'Synthesis decision', 'Tradeoffs accepted', 'Alternatives considered', 'Open questions and risks', 'Next implementation step')
$positions = @()
foreach ($section in $sections) {
    $match = [regex]::Match($plans, '(?m)^- \*\*' + $section + ':\*\*')
    Assert-True $match.Success "the design sketch defines: $section"
    $positions += $match.Index
}
$ordered = $true
for ($i = 1; $i -lt $positions.Count; $i++) { if ($positions[$i] -le $positions[$i - 1]) { $ordered = $false } }
Assert-True $ordered 'the design sketch sections keep the rationale''s order, usage before shape'
Assert-True ($plans -match 'write this first, before the type sketch') 'usage is written before the types'
Assert-True ($plans -match 'sketch-first\.md') 'writing a plan links sketch first'

# Every local Markdown link in planner resolves.
$broken = [System.Collections.Generic.List[string]]::new()
foreach ($file in @(Get-ChildItem -LiteralPath $skillRoot -Recurse -Filter '*.md' -File)) {
    $text = [IO.File]::ReadAllText($file.FullName) -replace '(?ms)^\s*```[^\n]*\n.*?^\s*```\s*$', ''
    foreach ($match in [regex]::Matches($text, '\]\(([^)]+)\)')) {
        $href = $match.Groups[1].Value.Split('#')[0]
        if (-not $href -or $href -match '^[a-z][a-z0-9+.-]*:') { continue }
        if (-not (Test-Path -LiteralPath (Join-Path $file.DirectoryName $href))) { $broken.Add("$($file.Name): $href") }
    }
}
Assert-True ($broken.Count -eq 0) "every local link in planner resolves (broken: $($broken -join ', '))"

if ($failures.Count -eq 0) { Write-Host ("Planner check passed: $checks structural assertion(s). Method content is verified by review, not here.") }
else {
    Write-Host ("Planner check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
