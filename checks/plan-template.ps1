#Requires -Version 7.0
<#
.SYNOPSIS
    Checks plan/checkpoint template structure and compatibility with its reader.
.DESCRIPTION
    Meaning and proportionality are reviewed by a person or independent agent.
    These checks cover files, Markdown shape and the real task-state parser;
    they do not prescribe section counts, prose wording or document length.
#>
[CmdletBinding()]
param([switch]$Quiet)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$checks = 0
$failures = [System.Collections.Generic.List[string]]::new()
function Assert-True {
    param([bool]$Condition, [string]$Message)
    $script:checks++
    if (-not $Condition) { $script:failures.Add($Message); Write-Host "  FAIL $Message" }
    elseif (-not $Quiet) { Write-Host "  PASS $Message" }
}

$documents = @{}
foreach ($relative in @('templates/plan.md', 'templates/state.md', 'references/plan-and-state.md')) {
    $base = if ($relative.StartsWith("templates/")) { "harness-docs-starter" } else { "skills/docs-workspace" }
    $path = Join-Path $root "$base/$relative"
    $exists = Test-Path -LiteralPath $path -PathType Leaf
    Assert-True $exists "$relative exists at its linked path"
    $text = if ($exists) { Get-Content -LiteralPath $path -Raw } else { '' }
    $documents[$relative] = $text
    Assert-True (@([regex]::Matches($text, '(?m)^# .+')).Count -eq 1) "$relative has one document title"
    $headings = @([regex]::Matches($text, '(?m)^## (.+)\r?$') | ForEach-Object { $_.Groups[1].Value.Trim() })
    Assert-True ($headings.Count -gt 0 -and @($headings | Select-Object -Unique).Count -eq $headings.Count) "$relative has named, non-duplicate sections"
}
Assert-True ($documents['templates/plan.md'] -match '(?m)^- \[ \] .+') 'the plan provides an execution checklist item'

# Exercise the actual template through the production parser. Filling every
# placeholder with a sentinel also proves warnings/preamble are not swallowed
# into the two display fields. Reader edge cases live in task-state.test.mjs.
$readerProbe = @'
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = process.argv[2];
const { parseStateMarkdown } = await import(pathToFileURL(resolve(root, 'skills/docs-workspace/scripts/task-state.mjs')));
const template = readFileSync(resolve(root, 'harness-docs-starter/templates/state.md'), 'utf8');
const parsed = parseStateMarkdown(template.replace(/<[^>]+>/g, 'fixture'));
assert.equal(parsed.headings.status, true);
assert.equal(parsed.headings.next_action, true);
assert.equal(parsed.fields.status, 'fixture');
assert.equal(parsed.fields.next_action, 'fixture');
'@
$probeOutput = $readerProbe | & node --input-type=module - $root 2>&1
$probeExit = $LASTEXITCODE
Assert-True ($probeExit -eq 0) 'the filled checkpoint exposes exactly its status and next action through the task-state reader'
if ($probeExit -ne 0) { $probeOutput | ForEach-Object { Write-Host $_ } }

if ($failures.Count -eq 0) {
    Write-Host "Plan-template check passed: $checks structural assertion(s). Template content is verified by review, not here."
} else {
    Write-Host "Plan-template check FAILED: $($failures.Count) of $checks assertion(s)."
}
exit $(if ($failures.Count -eq 0) { 0 } else { 1 })
