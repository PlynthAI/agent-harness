#Requires -Version 7.0
<#
.SYNOPSIS
    Verifies that an installed Codex harness matches this source.

.DESCRIPTION
    Fails with a non-zero exit code when any mapped file is missing from the
    target or differs from the maintained source.

.EXAMPLE
    pwsh -File checks/verify.ps1
#>
[CmdletBinding()]
param(
    [string]$TargetRoot,
    [string]$SourceRoot,
    [switch]$Quiet
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$installScript = Join-Path $PSScriptRoot 'install.ps1'
$arguments = @('-File', $installScript, '-Plan')
if ($TargetRoot) { $arguments += @('-TargetRoot', $TargetRoot) }
if ($SourceRoot) { $arguments += @('-SourceRoot', $SourceRoot) }

$output = & pwsh @arguments 2>&1
$text = ($output | Out-String)
if (-not $Quiet) { Write-Host $text.TrimEnd() }

$summary = ($text -split "`n" | Where-Object { $_ -match '^Plan:' } | Select-Object -Last 1)
if (-not $summary) {
    Write-Error 'Could not read the install plan summary.'
    exit 2
}

if ($summary -match '^Plan:\s+0 add,\s+0 modify,') {
    if (-not $Quiet) { Write-Host 'OK: installed harness matches the maintained source.' }
    exit 0
}

Write-Host 'DRIFT: installed harness does not match the maintained source.'
exit 1
