#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the hillclimb skill.

.DESCRIPTION
    Reads the entrypoint, its decision-log reference, the log template and the
    log helper and checks what a machine can decide: frontmatter with a matching
    name, a description and the harness group; the optional log's column list
    agreeing between the reference, the template header and the helper; no
    residue of the upstream runtime (its model default, its principle citations,
    its Cursor transcript path, its cross-model review); the harness routes named
    (how, docs-workspace, orchestrate-work, delivery, diagnosing-bugs and
    reasoning routes); the helper appending a well-formed row when bash is
    present; and every local Markdown link resolving. Method content is verified
    by review, not here.
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
$skillRoot = Join-Path $root 'skills\hillclimb'
function Read-Text([string]$Relative) {
    $path = Join-Path $skillRoot $Relative
    if (Test-Path -LiteralPath $path -PathType Leaf) { [IO.File]::ReadAllText($path) } else { '' }
}
$skill = Read-Text 'SKILL.md'
$reference = Read-Text 'references\decision-log.md'
$template = Read-Text 'assets\decision-log-template.tsv'
$helper = Read-Text 'scripts\log.sh'

foreach ($relative in @('SKILL.md', 'references\decision-log.md', 'assets\decision-log-template.tsv', 'scripts\log.sh')) {
    Assert-True (Test-Path -LiteralPath (Join-Path $skillRoot $relative) -PathType Leaf) "file present: $relative"
}

# Frontmatter and group.
Assert-True ($skill -match '(?s)\A---\r?\n.*?\r?\n---') 'hillclimb has frontmatter'
Assert-True ($skill -match '(?m)^name:\s*hillclimb\s*$') 'frontmatter name matches the directory'
Assert-True ($skill -match '(?m)^description:\s*\S') 'hillclimb has a description'
Assert-True ($skill -match '(?m)^metadata:\s*$\r?\n\s+group:\s*harness\s*$') 'hillclimb declares the harness group'
Assert-True ($skill -notmatch '(?m)^disable-model-invocation:') 'hillclimb is model-invocable'
Assert-True ($skill -match '(?m)^description:.*diagnosing-bugs') 'the description names the sibling that owns a one-off fix'

# Method quality is reviewed with realistic requests, not prose-wording assertions.
# Discovery metadata is an executable contract with the skill picker.
$metadataPath = Join-Path $skillRoot 'agents\openai.yaml'
Assert-True (Test-Path -LiteralPath $metadataPath -PathType Leaf) 'skill picker metadata exists'
$metadata = [IO.File]::ReadAllText($metadataPath)
Assert-True ($metadata -match '(?m)^interface:\s*$') 'picker metadata declares its interface'
Assert-True ($metadata -match '(?m)^\s+display_name:\s*"[^"\r\n]+"\s*$') 'picker display name is present'
$short = [regex]::Match($metadata, '(?m)^\s+short_description:\s*"([^"\r\n]+)"\s*$').Groups[1].Value
Assert-True ($short.Length -ge 25 -and $short.Length -le 64) 'picker description fits its supported bounds'
$description = [regex]::Match($skill, '(?m)^description:\s*(.+)$').Groups[1].Value.Trim().Trim('"')
Assert-True ($description.Length -le 300) 'discovery description stays within the shared limit'

# The log's columns agree across the entrypoint, the reference, the template and the helper.
$columns = @('id', 'hypothesis', 'change', 'before', 'after', 'delta', 'tests', 'verdict', 'note')
$header = ($columns -join "`t")
Assert-True ($template.TrimEnd("`r", "`n") -eq $header) 'the template header is exactly the nine hillclimb columns'
foreach ($column in $columns) {
    Assert-True ($reference -match ('(?m)^- \*\*' + [regex]::Escape($column) + '\.\*\*')) "the reference defines column $column"
}
Assert-True ($helper -match [regex]::Escape(($columns -join '\t'))) 'the helper writes the same header'
Assert-True ($helper -match '"\$#" -ne 10') 'the helper takes the log file plus nine cells'
Assert-True ($helper -match "=\*\|\+\*\|-\*\|@\*") 'the helper neutralises formula-leading cells'
Assert-True ($helper -match '>> "\$logfile"') 'the helper only appends'
Assert-True ($helper -notmatch '(?<!>)> "\$logfile"') 'the helper never truncates the log'
Assert-True ($helper -match 'set -euo pipefail') 'the helper runs strict'

# Upstream residue is gone; the harness routes are named instead.
Assert-True (-not [regex]::IsMatch($skill, 'grok-|principle skill|Opening a PR|autonomous-run\.md|show-me-your-work|Cursor')) 'the entrypoint carries no upstream runtime wiring'
Assert-True (-not [regex]::IsMatch($reference, '\.cursor|agent-transcripts|Cross-model|different model family|unslop|encode-lessons')) 'the reference carries no upstream runtime wiring'
Assert-True ($skill -match [regex]::Escape('../understand/how/METHOD.md')) 'hillclimb links the how method'
foreach ($route in @('understand', 'validate-implementation', 'docs-workspace', 'orchestrate-work', 'delivery', 'diagnosing-bugs', 'implement-spec', 'brainstorm', 'planner')) {
    Assert-True ($skill -match [regex]::Escape("../$route/SKILL.md")) "hillclimb links $route"
}
Assert-True ($skill -match 'references/decision-log\.md') 'hillclimb routes the log to its reference'
Assert-True ($reference -match 'artifacts/<task>/decision\.tsv') 'the reference agrees on where the log lives'
Assert-True ($reference -match '~/\.claude/projects' -and $reference -match '~/\.codex/sessions') 'the audit reads this run''s transcript from the Claude Code or Codex roots'

# The helper appends a well-formed row when a POSIX bash that sees this
# filesystem is present. On Windows that is Git for Windows' bash, found beside
# git; the System32 `bash` is the WSL shim and cannot open a drive path.
$bashPath = $null
$git = Get-Command git -ErrorAction SilentlyContinue
if ($git) {
    $candidate = Join-Path (Split-Path (Split-Path $git.Source -Parent) -Parent) 'bin\bash.exe'
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { $bashPath = $candidate }
}
if (-not $bashPath -and -not $IsWindows) {
    $onPath = Get-Command bash -ErrorAction SilentlyContinue
    if ($onPath) { $bashPath = $onPath.Source }
}
if ($bashPath) {
    $bash = @{ Source = $bashPath }
    $scratch = Join-Path ([IO.Path]::GetTempPath()) ("hillclimb-check-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $scratch | Out-Null
    try {
        $log = Join-Path $scratch 'decision.tsv'
        $helperPath = (Join-Path $skillRoot 'scripts\log.sh') -replace '\\', '/'
        $logPath = $log -replace '\\', '/'
        & $bash.Source $helperPath $logPath '1' 'first paint waits on the scan' 'defer the scan, commit 3a9f1c2' '1840ms' '1210ms' '-34%' 'green' 'adopt' "tab`there" 2>&1 | Out-Null
        $first = $LASTEXITCODE
        & $bash.Source $helperPath $logPath '2' 'x' '=SUM(1)' '1' '1' '0' 'green' 'reject' '' 2>&1 | Out-Null
        $second = $LASTEXITCODE
        & $bash.Source $helperPath $logPath '3' 'too' 'few' 2>&1 | Out-Null
        $third = $LASTEXITCODE
        $lines = @([IO.File]::ReadAllLines($log))
        Assert-True ($first -eq 0 -and $second -eq 0) 'the helper exits 0 on a full row'
        Assert-True ($third -eq 1) 'the helper rejects a short row'
        Assert-True ($lines.Count -eq 3) "the helper wrote the header and two rows (found $($lines.Count))"
        Assert-True ($lines[0] -eq $header) 'the helper''s header matches the template'
        Assert-True (($lines[1] -split "`t").Count -eq 9) 'a row has nine cells'
        Assert-True ($lines[1] -match "`t'-34%`t") 'a leading minus is prefixed'
        Assert-True ($lines[1] -match 'tab here') 'a tab inside a cell becomes a space'
        Assert-True ($lines[2] -match "`t'=SUM\(1\)`t") 'a formula-leading cell is prefixed'
    } finally {
        Remove-Item -LiteralPath $scratch -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host '  skip bash not found; the helper''s behaviour is not exercised here'
}

# Every local Markdown link in the skill resolves.
$broken = [System.Collections.Generic.List[string]]::new()
foreach ($file in @(Get-ChildItem -LiteralPath $skillRoot -Recurse -Filter '*.md' -File)) {
    $text = [IO.File]::ReadAllText($file.FullName) -replace '(?ms)^\s*```[^\n]*\n.*?^\s*```\s*$', ''
    foreach ($match in [regex]::Matches($text, '\]\(([^)]+)\)')) {
        $href = $match.Groups[1].Value.Split('#')[0]
        if (-not $href -or $href -match '^[a-z][a-z0-9+.-]*:') { continue }
        if (-not (Test-Path -LiteralPath (Join-Path $file.DirectoryName $href))) { $broken.Add("$($file.Name): $href") }
    }
}
Assert-True ($broken.Count -eq 0) "every local link in hillclimb resolves (broken: $($broken -join ', '))"

if ($failures.Count -eq 0) { Write-Host ("Hillclimb check passed: $checks structural assertion(s). Method content is verified by review, not here.") }
else {
    Write-Host ("Hillclimb check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
