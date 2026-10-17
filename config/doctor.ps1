#Requires -Version 7.0
<#
.SYNOPSIS
    Read-only check that this machine matches the harness's desired tool state.

.DESCRIPTION
    Prints one line per row, `ok|FAIL <check> <expected> <found>`, and exits 0
    only when every row passes. It installs nothing and leaves the harness and
    settings untouched; the OCR row's launcher may clear its own stale update
    notice.

    Rows: each `tools` entry in install-map.json resolves under the npm global
    prefix at its pinned version; Playwright MCP is not installed globally; the
    Claude settings carry no stale Playwright or Serena permission and enable no
    Playwright, Serena or Pyright plugin; the Claude plugin cache holds none of
    those three; typescript-lsp is enabled; the codebase-memory binary named by
    the skill's VERSION file is installed; and Open Code Review passes its own
    install check.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$claudeHome = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.claude'
$failed = 0

function Write-Row([bool]$Pass, [string]$Check, [string]$Expected, [string]$Found) {
    if (-not $Pass) { $script:failed++ }
    '{0} {1} | expected {2} | found {3}' -f ($Pass ? 'ok' : 'FAIL'), $Check, $Expected, $Found
}

function Get-FirstLine([scriptblock]$Run) {
    try { return [string](@(& $Run 2>&1) | Select-Object -First 1) } catch { return "error: $($_.Exception.Message)" }
}

$npmPrefix = Get-FirstLine { npm config get prefix }
$map = Get-Content -Raw (Join-Path $root 'config/install-map.json') | ConvertFrom-Json

# Tools: the command resolves inside the npm global prefix and prints the pinned version.
foreach ($tool in $map.tools) {
    $all = @(Get-Command $tool.command -All -CommandType Application, ExternalScript -ErrorAction SilentlyContinue)
    $command = $all | Select-Object -First 1
    $dirs = @($all | ForEach-Object { Split-Path -Parent $_.Source } | Select-Object -Unique)
    $where = $dirs.Count ? ($dirs -join '; ') : 'not found'
    Write-Row ($dirs.Count -eq 1 -and ($dirs[0] -ieq $npmPrefix)) "$($tool.command) location" $npmPrefix $where
    $version = if ($command) { ((Get-FirstLine { & $command.Source --version }).Trim() -split '\s+')[-1] } else { 'not found' }
    Write-Row ($version -ceq $tool.version) "$($tool.command) version" $tool.version $version
}

# Playwright MCP stays uninstalled.
try {
    $global = (@(npm ls -g --depth=0 --json 2>$null) -join "`n") | ConvertFrom-Json
    if ($null -eq $global.dependencies) { throw 'no dependency list in its output' }
    $mcp =@($global.dependencies.PSObject.Properties.Name | Where-Object { $_ -eq '@playwright/mcp' })
    Write-Row ($mcp.Count -eq 0) '@playwright/mcp global install' 'absent' ($mcp.Count -eq 0 ? 'absent' : 'installed')
} catch {
    Write-Row $false '@playwright/mcp global install' 'absent' "npm ls failed: $($_.Exception.Message)"
}

# Claude settings: no stale permissions, no retired plugins enabled, typescript-lsp on.
$settingsPath = Join-Path $claudeHome 'settings.json'
$settings = (Test-Path $settingsPath) ? (Get-Content -Raw $settingsPath | ConvertFrom-Json) : $null
$stalePrefixes = 'mcp__plugin_playwright_playwright__', 'mcp__playwright__', 'mcp__plugin_serena_serena__', 'mcp__serena__'
$stale = @()
foreach ($list in 'allow', 'ask', 'deny') {
    $stale += @($settings.permissions.$list | Where-Object { $entry = $_; $entry -and ($stalePrefixes | Where-Object { $entry.StartsWith($_) }) })
}
Write-Row ($null -ne $settings -and $stale.Count -eq 0) 'settings stale permissions' 'none' ($stale.Count -eq 0 ? 'none' : ($stale -join ', '))

$enabled = @{}
if ($settings.enabledPlugins) { foreach ($p in $settings.enabledPlugins.PSObject.Properties) { $enabled[$p.Name] = [bool]$p.Value } }
$retired = @($enabled.Keys | Where-Object { $name = $_; $enabled[$name] -and ('playwright@', 'serena@', 'pyright-lsp@' | Where-Object { $name.StartsWith($_) }) })
Write-Row ($retired.Count -eq 0) 'settings retired plugins enabled' 'none' ($retired.Count -eq 0 ? 'none' : ($retired -join ', '))
$ts = @($enabled.Keys | Where-Object { $_.StartsWith('typescript-lsp@') -and $enabled[$_] })
Write-Row ($ts.Count -gt 0) 'typescript-lsp enabled' 'enabled' ($ts.Count -gt 0 ? ($ts -join ', ') : 'not enabled')

# Plugin cache: no folder for the retired plugins under any marketplace.
$cacheRoot = Join-Path $claudeHome 'plugins/cache'
$cached = @()
if (Test-Path $cacheRoot) {
    $cached = @(Get-ChildItem $cacheRoot -Directory | ForEach-Object { Get-ChildItem $_.FullName -Directory } |
        Where-Object { $_.Name -in 'playwright', 'serena', 'pyright-lsp' } | ForEach-Object { "$($_.Parent.Name)/$($_.Name)" })
}
Write-Row ($cached.Count -eq 0) 'plugin cache retired plugins' 'none' ($cached.Count -eq 0 ? 'none' : ($cached -join ', '))

# codebase-memory: the version comes from the skill, never from this script.
$cbmVersion = (Get-Content -Raw (Join-Path $root 'skills/orchestrate-work/scripts/codebase-memory/VERSION')).Trim()
$cbmExe = Join-Path $env:LOCALAPPDATA "Programs/codebase-memory-mcp/$cbmVersion/codebase-memory-mcp.exe"
Write-Row (Test-Path $cbmExe) 'codebase-memory binary' $cbmExe ((Test-Path $cbmExe) ? 'present' : 'missing')

# Open Code Review: its own install check owns the details.
try {
    $ocr = (@(& (Join-Path $PSScriptRoot 'ocr/check-install.ps1') 2>&1) -join "`n") | ConvertFrom-Json
    $codes = @($ocr.issues | ForEach-Object { $_.code })
    Write-Row ($ocr.status -eq 'pass') 'ocr install check' 'pass' ($ocr.status -eq 'pass' ? 'pass' : "$($ocr.status): $($codes -join ', ')")
} catch {
    Write-Row $false 'ocr install check' 'pass' "unreadable: $($_.Exception.Message)"
}

exit ($failed -eq 0 ? 0 : 1)
