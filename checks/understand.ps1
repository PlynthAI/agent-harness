#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the investigate group: investigate, how, why, teach and
    recall.

.DESCRIPTION
    Reads the two skills, three nested methods and their references and checks what a machine
    can decide: frontmatter with a matching name, a description and the
    investigate group on skills; the lead routing to every method; no residue of the upstream
    runtime (its model-config rule, its subagent type, its MCP directory, its
    explicit-only flag); every prompt template and source playbook the methods
    cite present on disk, including why's workspace playbook and its link to
    docs-workspace; and every local Markdown link resolving. Method
    content is verified by review, not here.
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
$skillsRoot = Join-Path $root 'skills'
$names = @('understand', 'how', 'why', 'teach', 'recall')
$methods = @('how', 'why', 'teach')
$texts = @{}
foreach ($name in $names) {
    $relativePath = if ($name -in $methods) { "understand\$name\METHOD.md" } else { "$name\SKILL.md" }
    $path = Join-Path $skillsRoot $relativePath
    $text = if (Test-Path -LiteralPath $path -PathType Leaf) { [IO.File]::ReadAllText($path) } else { '' }
    $texts[$name] = $text
    Assert-True ($text -match '(?s)\A---\r?\n.*?\r?\n---') "$name has frontmatter"
    Assert-True ($text -match ('(?m)^name:\s*' + [regex]::Escape($name) + '\s*$')) "$name frontmatter name matches its directory"
    Assert-True ($text -match '(?m)^description:\s*\S') "$name has a description"
    if ($name -in $methods) {
        Assert-True (-not (Test-Path -LiteralPath (Join-Path $skillsRoot "$name\SKILL.md"))) "$name has no retired standalone entrypoint"
        Assert-True (-not (Test-Path -LiteralPath (Join-Path $skillsRoot "understand\$name\agents\openai.yaml"))) "$name has no nested invocation metadata"
    } else {
        Assert-True ($text -match '(?m)^metadata:\s*$\r?\n\s+group:\s*investigate\s*$') "$name declares the investigate group"
        Assert-True ($text -notmatch '(?m)^disable-model-invocation:') "$name is model-invocable"
    }
}

# The lead routes to every leaf and both forensics references.
$lead = $texts['understand']
foreach ($leaf in @('how', 'why', 'teach', 'recall', 'research', 'diagnosing-bugs')) {
    $route = if ($leaf -in $methods) { "$leaf/METHOD.md" } else { "../$leaf/SKILL.md" }
    Assert-True ($lead -match [regex]::Escape($route)) "understand routes to $leaf"
}
foreach ($ref in @('runtime-forensics.md', 'trace-forensics.md')) {
    Assert-True ($lead -match [regex]::Escape("references/$ref")) "understand links $ref"
    Assert-True (Test-Path -LiteralPath (Join-Path $skillsRoot "understand\references\$ref") -PathType Leaf) "understand carries $ref"
}

# The upstream runtime's wiring is gone; the harness roles are named instead.
foreach ($name in @('how', 'why', 'recall')) {
    $text = $texts[$name]
    # Case-sensitive: "cursor location" is ordinary prose, "Cursor" is the upstream host.
    Assert-True (-not [regex]::IsMatch($text, 'pstack-models|generalPurpose|subagent_type|mcps/|Cursor|\.cursor/')) "$name carries no upstream runtime wiring"
    Assert-True ($text -match '\.\./orchestrate-work/SKILL\.md') "$name assigns roles through orchestrate-work"
}
Assert-True ($texts['how'] -match 'role: `explorer`') 'how explores with the explorer role'
Assert-True ($texts['how'] -match 'role: `smart_worker`') 'how explains with the smart_worker role'
Assert-True ($texts['why'] -match '`researcher`') 'why investigates the workspace and named stores with the researcher role'
# why reaches the project workspace through docs-workspace, not through the session's connectors.
Assert-True ($texts['why'] -match '\]\(\.\./\.\./docs-workspace/(SKILL\.md|references/discovery\.md)\)') 'why links docs-workspace for the project workspace'

# Every prompt template and source playbook the methods cite is on disk.
foreach ($ref in @('how\references\explorer-prompt.md', 'how\references\explainer-prompt.md',
        'why\references\epistemics.md', 'why\references\investigator-prompt.md', 'why\references\synthesizer-prompt.md',
        'why\references\source-playbook.md', 'why\references\sources\incident-postmortem.md',
        'why\references\sources\workspace.md')) {
    Assert-True (Test-Path -LiteralPath (Join-Path $skillsRoot "understand\$ref") -PathType Leaf) "reference present: $ref"
}
$sources = @(Get-ChildItem -LiteralPath (Join-Path $skillsRoot 'understand\why\references\sources') -Filter '*.md' -File)
Assert-True ($sources.Count -ge 7) "why carries its source and vendor playbooks (found $($sources.Count))"

# Every local Markdown link in the skills and their nested methods resolves.
$linkFiles = @()
foreach ($name in @('understand', 'recall')) { $linkFiles += @(Get-ChildItem -LiteralPath (Join-Path $skillsRoot $name) -Recurse -Filter '*.md' -File) }
$broken = [System.Collections.Generic.List[string]]::new()
foreach ($file in $linkFiles) {
    $text = [IO.File]::ReadAllText($file.FullName) -replace '(?ms)^\s*```[^\n]*\n.*?^\s*```\s*$', ''
    foreach ($match in [regex]::Matches($text, '\]\(([^)]+)\)')) {
        $href = $match.Groups[1].Value.Split('#')[0]
        if (-not $href -or $href -match '^[a-z][a-z0-9+.-]*:') { continue }
        if (-not (Test-Path -LiteralPath (Join-Path $file.DirectoryName $href))) { $broken.Add("$($file.Name): $href") }
    }
}
Assert-True ($broken.Count -eq 0) "every local link in the understand group resolves (broken: $($broken -join ', '))"

if ($failures.Count -eq 0) { Write-Host ("Understand check passed: $checks structural assertion(s). Method content is verified by review, not here.") }
else {
    Write-Host ("Understand check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
