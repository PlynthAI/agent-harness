#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the code-review skill and its references.

.DESCRIPTION
    Reads the code-review entrypoint and its references and checks what a
    machine can decide: frontmatter with a matching name, a description and the
    verify group; the five references present and linked from the entrypoint,
    slice review among them; the entrypoint naming `fast_review` for the slice
    review and `reviewer` for delivery candidates, with both roles declared in
    agents/ and the fast_review brief pointing at the slice-review reference;
    candidate review and assignments naming reviewer roles; slice review reaching
    the review facts;
    `explorer` named for review nowhere in the skill's method pages; every local
    Markdown link resolving; no host path embedded; this check
    wired into run-all; and an assertion floor. Method content is verified by
    review, not here.
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
$skillRoot = Join-Path $root 'skills\code-review'
function Read-Text([string]$Path) {
    if (Test-Path -LiteralPath $Path -PathType Leaf) { [IO.File]::ReadAllText($Path) } else { '' }
}
$skillPath = Join-Path $skillRoot 'SKILL.md'
$skill = Read-Text $skillPath
$references = @('codex-review-instructions.md', 'evidence-reuse.md', 'push-review.md', 'review-assignments.md', 'slice-review.md')
$slice = Read-Text (Join-Path $skillRoot 'references\slice-review.md')
$push = Read-Text (Join-Path $skillRoot 'references\push-review.md')
$assignments = Read-Text (Join-Path $skillRoot 'references\review-assignments.md')

# Frontmatter and group.
Assert-True (Test-Path -LiteralPath $skillPath -PathType Leaf) 'code-review has a SKILL.md'
Assert-True ($skill -match '(?s)\A---\r?\n.*?\r?\n---') 'code-review has frontmatter'
Assert-True ($skill -match '(?m)^name:\s*code-review\s*$') 'frontmatter name matches the directory'
Assert-True ($skill -match '(?m)^description:\s*\S') 'code-review has a description'
Assert-True ($skill -match '(?m)^metadata:\s*$\r?\n\s+group:\s*verify\s*$') 'code-review declares the verify group'

# The five references exist and the entrypoint links each one.
foreach ($ref in $references) {
    Assert-True (Test-Path -LiteralPath (Join-Path $skillRoot "references\$ref") -PathType Leaf) "reference exists: $ref"
    Assert-True ($skill -match [regex]::Escape("](references/$ref")) "the entrypoint links references/$ref"
}

# Supported independent reviewer roles are declared and their routes resolve.
Assert-True ($skill -match '`fast_review`') 'the entrypoint names fast_review'
Assert-True ($skill -match '`reviewer`') 'the entrypoint names reviewer'
foreach ($role in @('fast_review', 'reviewer')) {
    $rolePath = Join-Path $root "agents\$role.toml"
    Assert-True ((Read-Text $rolePath) -match "(?m)^name\s*=\s*`"$role`"\s*$") "the $role role is declared in agents/"
}
Assert-True ((Read-Text (Join-Path $root 'agents\fast_review.toml')) -match 'slice-review') 'the fast_review brief points at the slice-review reference'
Assert-True ($slice -match '`fast_review`') 'slice review names fast_review'
Assert-True ($slice -match [regex]::Escape('](review-assignments.md#the-review-facts)')) 'slice review reaches the review facts'
Assert-True ($assignments -match '(?m)^## The review facts\s*$') 'the review facts heading slice review links exists'

# Role references stay wired; review meaning and proportional selection need review.
Assert-True ($push -match '`reviewer`') 'candidate review names reviewer'
Assert-True ($assignments -match '`reviewer`') 'review assignments name reviewer'
# Explorer carries no review assignment in the skill or any of its references.
Assert-True ($skill -notmatch '(?i)\bexplorer\b') 'SKILL.md names explorer for no review'
foreach ($ref in $references) {
    Assert-True ((Read-Text (Join-Path $skillRoot "references\$ref")) -notmatch '(?i)\bexplorer\b') "$ref names explorer for no review"
}

# Every local Markdown link in code-review resolves.
$broken = [System.Collections.Generic.List[string]]::new()
foreach ($file in @(Get-ChildItem -LiteralPath $skillRoot -Recurse -Filter '*.md' -File)) {
    $fileBroken = [System.Collections.Generic.List[string]]::new()
    $text = [IO.File]::ReadAllText($file.FullName) -replace '(?ms)^\s*```[^\n]*\n.*?^\s*```\s*$', ''
    foreach ($match in [regex]::Matches($text, '\]\(([^)]+)\)')) {
        $href = $match.Groups[1].Value.Split('#')[0]
        if (-not $href -or $href -match '^[a-z][a-z0-9+.-]*:') { continue }
        if (-not (Test-Path -LiteralPath (Join-Path $file.DirectoryName $href))) { $broken.Add("$($file.Name): $href"); $fileBroken.Add($href) }
    }
    Assert-True ($fileBroken.Count -eq 0) "local links resolve in $($file.Name) (broken: $($fileBroken -join ', '))"
}
Assert-True ($broken.Count -eq 0) "every local link in code-review resolves (broken: $($broken -join ', '))"

# Portability: no host path in shipped guidance.
$hostPath = '(?i)(\b[A-Z]:[\\/]|\\\\[A-Za-z0-9._-]+\\|file:///)'
$hostHits = [System.Collections.Generic.List[string]]::new()
foreach ($file in @(Get-ChildItem -LiteralPath $skillRoot -Recurse -File | Where-Object { $_.Extension -in '.md', '.mjs', '.js', '.json', '.yaml' })) {
    $text = [IO.File]::ReadAllText($file.FullName)
    $relative = $file.FullName.Substring($skillRoot.Length).TrimStart('\')
    if ($file.Extension -eq '.md' -and $relative -notlike 'tests\*' -and $text -match $hostPath) { $hostHits.Add($relative) }
}
Assert-True ($hostHits.Count -eq 0) "no host path is embedded in code-review guidance (found: $($hostHits -join ', '))"
$selfText = (@(Get-Content -LiteralPath $PSCommandPath | Where-Object { $_ -notmatch '\$hostPath\b' }) -join "`n")
Assert-True ($selfText -notmatch $hostPath) 'this check embeds no host path outside its own pattern'

# The suite runs it.
$runAll = Read-Text (Join-Path $root 'checks\run-all.ps1')
Assert-True ($runAll -match "(?im)^\s*@\{\s*Name\s*=\s*'code-review'\s*;\s*File\s*=\s*'code-review\.ps1'") 'run-all.ps1 invokes this check'
$expectedBlock = [regex]::Match($runAll, '(?s)\$expectedChecks = @\((.*?)\n\)').Groups[1].Value
Assert-True ($expectedBlock -match "'code-review'") 'run-all.ps1 expects this check'

# The floor. A copy gutted to its verdict line would otherwise report a pass on
# no evidence. The floor remains a minimum while file-level link checks grow.
$floor = 44
if ($checks -lt $floor) {
    $script:failures.Add("the check reported $checks assertion(s); its floor is $floor")
    Write-Host ("  FAIL the check reported $checks assertion(s); its floor is $floor - a gutted copy is not evidence")
}

Write-Host ''
if ($failures.Count -eq 0) { Write-Host ("Code-review check passed: $checks structural assertion(s). Method content is verified by review, not here.") }
else {
    Write-Host ("Code-review check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
