#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the shared agent role files.

.DESCRIPTION
    Reads every agents/*.toml and checks the things a machine can actually decide:
    the file parses into the expected flat keys, name matches the file, the model
    resolves in the merged model catalog and the effort is in that model's real
    ladder, the provider is one of the known ids (the router, or the built-in
    openai provider), the instructions are substantive, the README declares the
    role and MODELS.md matches its model and effort, the role set is exactly the expected
    one, and no retired role lingers as a file or as a README bullet.

    Deliberately NOT checked here: whether a brief's prose means the right thing.
    A regex cannot tell "you may read the database" from "you must not read the
    database", and pretending otherwise produced both false passes and false
    failures. Brief content is verified by independent review, not by this file.
    That limit is recorded in the SF-012 and SF-014 handoffs.

    It does not start a model. Live resolution is confirmed by using the role.
#>
[CmdletBinding()]
param(
    [string]$RouterCatalog,
    [switch]$Quiet
)

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

function Get-TomlString {
    param([string]$Text, [string]$Key)
    $match = [regex]::Match($Text, "(?m)^\s*" + [regex]::Escape($Key) + "\s*=\s*(?:`"([^`"]*)`"|'([^']*)')")
    if ($match.Success) { return $(if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }) }
    return $null
}

$agentsDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'agents'
if (-not (Test-Path -LiteralPath $agentsDir)) { throw "agents directory not found: $agentsDir" }

$expectedRoles = @('explorer', 'planner', 'researcher', 'reviewer', 'tester', 'fast_worker', 'smart_worker', 'fast_review')

# 'codex-router' relays external models through the local router, so it must
# resolve in the router catalog. 'openai' is the built-in provider id the config
# reference documents, and the default when model_provider is absent, so a role
# may bind it natively; the merged catalog is still what decides its ladder.
$routerProvider = 'codex-router'
$nativeProviders = @('openai')
$knownProviders = @($routerProvider) + $nativeProviders

$catalogPath = if ($RouterCatalog) { $RouterCatalog }
elseif ($env:CODEX_HOME) { Join-Path $env:CODEX_HOME 'codex-router/merged-models.json' }
else { Join-Path $(if ($IsWindows -and $env:USERPROFILE) { $env:USERPROFILE } else { $env:HOME }) '.codex/codex-router/merged-models.json' }
$catalog = $null
if (Test-Path -LiteralPath $catalogPath) {
    try { $catalog = (Get-Content -Raw -LiteralPath $catalogPath | ConvertFrom-Json).models } catch { $catalog = $null }
}
if (-not $Quiet) {
    if ($catalog) { Write-Host "Router catalog: $catalogPath ($($catalog.Count) models)" }
    else { Write-Host "Router catalog: not readable at $catalogPath - routing assertions skipped" }
}

$roleFiles = Get-ChildItem -LiteralPath $agentsDir -Filter '*.toml' -File | Sort-Object Name
$readme = Get-Content -Raw -LiteralPath (Join-Path $agentsDir 'README.md')
$modelSnapshot = Get-Content -Raw -LiteralPath (Join-Path (Split-Path $agentsDir -Parent) 'MODELS.md')

Write-Host ''
Write-Host 'Role files'
foreach ($file in $roleFiles) {
    $text = Get-Content -Raw -LiteralPath $file.FullName
    $stem = [IO.Path]::GetFileNameWithoutExtension($file.Name)
    $name = Get-TomlString -Text $text -Key 'name'
    $description = Get-TomlString -Text $text -Key 'description'
    $model = Get-TomlString -Text $text -Key 'model'
    $provider = Get-TomlString -Text $text -Key 'model_provider'
    $effort = Get-TomlString -Text $text -Key 'model_reasoning_effort'
    $instructions = [regex]::Match($text, '(?s)developer_instructions\s*=\s*"{3}(.+?)"{3}')

    Write-Host ("  {0,-16} {1,-44} {2}" -f $stem, ($(if ($model) { $model } else { '<none>' })), ($(if ($effort) { $effort } else { '<none>' })))

    Assert-True ($name -eq $stem) "$stem : name matches the file name (house convention, not a loader requirement)"
    Assert-True (-not [string]::IsNullOrWhiteSpace($description)) "$stem : has a description"
    Assert-True (-not [string]::IsNullOrWhiteSpace($model)) "$stem : declares a model"
    Assert-True ($knownProviders -contains $provider) "$stem : declares a known provider id ($($knownProviders -join ', '))"
    Assert-True (-not [string]::IsNullOrWhiteSpace($effort)) "$stem : declares a reasoning effort"
    Assert-True ($instructions.Success -and $instructions.Groups[1].Value.Trim().Length -ge 80) "$stem : developer_instructions are present and substantive"
    Assert-True ([regex]::IsMatch($readme, "(?m)^-\s*" + [regex]::Escape($stem) + "\s*:")) "$stem : the agents README declares this role"

    if ($model) {
        $row = [regex]::Match($modelSnapshot, '(?im)^\|\s*' + [regex]::Escape($stem) + '\s*\|([^\r\n]+)').Groups[1].Value
        $cells = @($row.Split('|') | ForEach-Object { $_.Trim().Trim([char]96) })
        Assert-True ($cells.Count -ge 3 -and $cells[0] -ceq $model -and $cells[2] -ceq $effort) "$stem : MODELS.md matches the role file model and effort"
    }
    else {
        Assert-True $false "$stem : a model is required before its snapshot can be checked"
    }

    if ($catalog) {
        $entry = $catalog | Where-Object { $_.slug -eq $model } | Select-Object -First 1
        if ($provider -eq $routerProvider) {
            Assert-True ($null -ne $entry) "$stem : model '$model' exists in the router catalog"
        }
        else {
            Assert-True ($null -ne $entry) "$stem : natively bound model '$model' is listed in the merged model catalog"
        }
        if ($entry) {
            $levels = @($entry.supported_reasoning_levels | ForEach-Object { $_.effort })
            Assert-True ($levels.Count -gt 0) "$stem : the catalog publishes a reasoning ladder for '$model'"
            Assert-True ($levels -contains $effort) "$stem : effort '$effort' is accepted by '$model' (allows $($levels -join '|'))"
        }
    }
}

Write-Host ''
Write-Host 'Role-set invariants'

$actualRoles = @($roleFiles | ForEach-Object { [IO.Path]::GetFileNameWithoutExtension($_.Name) })
$missing = @($expectedRoles | Where-Object { $actualRoles -notcontains $_ })
$unexpected = @($actualRoles | Where-Object { $expectedRoles -notcontains $_ })
Assert-True ($missing.Count -eq 0) ("every declared shared role has a file (missing: " + ($(if ($missing.Count) { $missing -join ', ' } else { 'none' })) + ")")
Assert-True ($unexpected.Count -eq 0) ("no undeclared role file is present (unexpected: " + ($(if ($unexpected.Count) { $unexpected -join ', ' } else { 'none' })) + ")")
Assert-True (@($roleFiles | Where-Object { $_.Name -like 'router-model-*' }).Count -eq 0) 'no generated router-model file is committed here'
Assert-True (-not (Test-Path -LiteralPath (Join-Path $agentsDir 'advisor.toml'))) 'no separate advisor role: advice and draft review are one role'
Assert-True ($readme -match '(?i)advisor') 'the README records the one-role decision'
Assert-True ($readme -match '(?i)one\s+role|single\s+role') 'the README says advice and draft review are one role'

$smartWorker = Get-TomlString -Text (Get-Content -Raw -LiteralPath (Join-Path $agentsDir 'smart_worker.toml')) -Key 'model'
Assert-True (-not [string]::IsNullOrWhiteSpace($smartWorker)) 'smart_worker declares a model binding'

foreach ($retired in @('worker', 'worker_fallback', 'mechanical_worker', 'coordinator')) {
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $agentsDir "$retired.toml"))) "$retired : no such role file exists"
    Assert-True ($readme -notmatch "(?m)^-\s*" + [regex]::Escape($retired) + "\s*:") "$retired : the README does not offer it as a role"
}

Write-Host ''
if ($failures.Count -eq 0) {
    $routing = if ($catalog) { 'Allowed provider ids, and each model catalog listing with its reasoning ladder, were checked; runtime routing was not verified.' } else { 'Allowed provider ids were checked; model catalog listings and reasoning ladders were NOT checked - no catalog was readable. Runtime routing was not verified.' }
    Write-Host ("Agent role check passed: $checks structural assertion(s) across $($roleFiles.Count) role file(s). $routing Brief content is verified by review, not here.")
}
else {
    Write-Host ("Agent role check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
