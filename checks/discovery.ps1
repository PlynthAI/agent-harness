#Requires -Version 7.0
<#
.SYNOPSIS
    Isolated discovery check for the shared harness router.

.DESCRIPTION
    Builds a throwaway fixture, installs the harness into it, and models the
    documented AGENTS.md discovery rule:

      * global scope - CODEX_HOME: AGENTS.override.md if present, otherwise
        AGENTS.md; only the first non-empty file at that level;
      * project scope - from the project root (the Git root) DOWN to the working
        directory, checking AGENTS.override.md then AGENTS.md in each directory
        and including at most one file per directory;
      * merge order - concatenated root first, working directory last, so files
        closer to the working directory appear later and override earlier ones;
      * empty files are skipped, and a router above the project root is not read.

    It then checks that the approved user instructions and shared notice arrive
    unchanged, alongside the complete skill set. Personal environment guidance
    in the user-level file is intentional; reusable skills remain portable.

    Application-level activation is NOT proven here - that needs a fresh task in
    the app against an installed target.
#>
[CmdletBinding()]
param(
    [string]$TargetRoot,
    [switch]$Keep,
    [switch]$Quiet
)

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
    if ($Condition) {
        if (-not $Quiet) { Write-Host ("  ok   " + $Message) }
    }
    else {
        $script:failures.Add($Message)
        Write-Host ("  FAIL " + $Message)
    }
}

$installer = Join-Path $PSScriptRoot 'install.ps1'
if (-not (Test-Path -LiteralPath $installer)) { throw "install.ps1 not found beside this check: $installer" }

# Everything this check writes lives under one subdirectory of the sandbox, so
# even -TargetRoot pointed at a real directory cannot overwrite an existing file.
$sandbox = if ($TargetRoot) { (Resolve-Path -LiteralPath $TargetRoot).Path } else { Join-Path ([IO.Path]::GetTempPath()) ("harness-discovery-" + [Guid]::NewGuid().ToString('N').Substring(0, 8)) }
$fixture = Join-Path $sandbox 'harness-discovery-fixture'
if (Test-Path -LiteralPath $fixture) { throw "Refusing to run: $fixture already exists. Remove it or choose another -TargetRoot." }

$codexHome = Join-Path $fixture '.codex'
$repoRoot = Join-Path $fixture 'proj'
$nested = Join-Path $repoRoot 'sub'
foreach ($dir in @($codexHome, $nested)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
New-Item -ItemType Directory -Force -Path (Join-Path $repoRoot '.git') | Out-Null
# A distractor above the project root: discovery must not read it.
Set-Content -LiteralPath (Join-Path $fixture 'AGENTS.md') -Value "# distractor above the project root`n" -Encoding utf8

Write-Host "Sandbox: $fixture"
Write-Host ''
Write-Host 'Install into the isolated target'

$installOutput = & pwsh -NoProfile -File $installer -Apply -ApprovedBy 'isolated discovery check' -TargetRoot $codexHome -AllowDirty 2>&1
Assert-True ($LASTEXITCODE -eq 0) 'the installer applies into the isolated target'
$userLevel = Join-Path $codexHome 'AGENTS.md'
Assert-True (Test-Path -LiteralPath $userLevel) 'the isolated target receives a global AGENTS.md'
if (-not $Quiet) { $installOutput | Select-Object -Last 1 | ForEach-Object { Write-Host ("       " + $_) } }

<#
    The documented rule, as one function: given a working directory and a project
    root, walk the project root down to the working directory, take the first
    non-empty of AGENTS.override.md then AGENTS.md in each directory, and put the
    global-scope file first.
#>
function Get-InstructionChain {
    param([string]$WorkingDirectory, [string]$ProjectRoot, [string]$CodexHome, [string]$AboveRoot)

    $chain = [System.Collections.Generic.List[string]]::new()
    foreach ($candidate in @((Join-Path $CodexHome 'AGENTS.override.md'), (Join-Path $CodexHome 'AGENTS.md'))) {
        if ((Test-Path -LiteralPath $candidate -PathType Leaf) -and (Get-Item -LiteralPath $candidate).Length -gt 0) {
            $chain.Add($candidate)
            break
        }
    }

    $levels = [System.Collections.Generic.List[string]]::new()
    $cursor = $WorkingDirectory
    while ($cursor) {
        $levels.Insert(0, $cursor)
        if ($cursor -eq $ProjectRoot) { break }
        $parent = Split-Path $cursor -Parent
        if (-not $parent -or $parent -eq $cursor) { break }
        $cursor = $parent
    }

    foreach ($level in $levels) {
        foreach ($candidate in @((Join-Path $level 'AGENTS.override.md'), (Join-Path $level 'AGENTS.md'))) {
            if ((Test-Path -LiteralPath $candidate -PathType Leaf) -and (Get-Item -LiteralPath $candidate).Length -gt 0) {
                $chain.Add($candidate)
                break
            }
        }
    }
    return $chain
}

function Write-Text {
    param([string]$Path, [string]$Content)
    Set-Content -LiteralPath $Path -Value $Content -NoNewline -Encoding utf8
}

Write-Host ''
Write-Host 'Discovery: global scope plus project root down to the working directory'

Write-Text (Join-Path $repoRoot 'AGENTS.md') "# proj`n`nProject rules.`n"
Write-Text (Join-Path $nested 'AGENTS.md') "# proj/sub`n`nNested rules for this subtree.`n"

$chain = Get-InstructionChain -WorkingDirectory $nested -ProjectRoot $repoRoot -CodexHome $codexHome -AboveRoot $fixture
if (-not $Quiet) { $chain | ForEach-Object { Write-Host ("       " + $_) } }

Assert-True ($chain.Count -eq 3) 'global plus two project levels load'
Assert-True ($chain[0] -eq $userLevel) 'the global file is merged first'
Assert-True ($chain[1] -eq (Join-Path $repoRoot 'AGENTS.md')) 'the project root is merged next'
Assert-True ($chain[2] -eq (Join-Path $nested 'AGENTS.md')) 'the working directory is merged last, so it wins'
Assert-True ($chain -notcontains (Join-Path $fixture 'AGENTS.md')) 'a router above the project root is never read'

Write-Host ''
Write-Host 'Discovery: AGENTS.override.md, empty files and at most one file per directory'

Write-Text (Join-Path $nested 'AGENTS.override.md') "# proj/sub override`n`ntakes precedence over the sibling AGENTS.md`n"
$overridden = Get-InstructionChain -WorkingDirectory $nested -ProjectRoot $repoRoot -CodexHome $codexHome -AboveRoot $fixture
Assert-True ($overridden.Count -eq 3) 'an override at one level does not add a fourth file'
Assert-True ($overridden[2] -eq (Join-Path $nested 'AGENTS.override.md')) 'AGENTS.override.md wins over AGENTS.md in the same directory'
Assert-True ($overridden -notcontains (Join-Path $nested 'AGENTS.md')) 'only one file per directory is included'

Set-Content -LiteralPath (Join-Path $nested 'AGENTS.override.md') -Value '' -NoNewline -Encoding utf8
Set-Content -LiteralPath (Join-Path $nested 'AGENTS.md') -Value '' -NoNewline -Encoding utf8
$emptied = Get-InstructionChain -WorkingDirectory $nested -ProjectRoot $repoRoot -CodexHome $codexHome -AboveRoot $fixture
Assert-True ($emptied.Count -eq 2) 'an empty file is skipped rather than included'

Write-Text (Join-Path $codexHome 'AGENTS.override.md') "# global override`n`nreplaces the global AGENTS.md`n"
$globalOverridden = Get-InstructionChain -WorkingDirectory $nested -ProjectRoot $repoRoot -CodexHome $codexHome -AboveRoot $fixture
Assert-True ($globalOverridden[0] -eq (Join-Path $codexHome 'AGENTS.override.md')) 'a global AGENTS.override.md replaces the global AGENTS.md'
Assert-True ($globalOverridden -notcontains $userLevel) 'the global AGENTS.md is not read as well'
Remove-Item -LiteralPath (Join-Path $codexHome 'AGENTS.override.md') -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host 'The installed router is usable and honest'

$router = Get-Content -Raw -LiteralPath $userLevel
# The approved global router is the user's entry point, not the skill catalogue. The
# source-versus-install checks below cover every copied skill independently.
# The router's claims are only half of it, and the other half gives the derived
# guard something external to compare against: source against install. Every
# skill directory the factory ships must arrive in the target, and nothing else
# may appear. Nothing here names a skill either.
$sourceSkills = @(Get-ChildItem -LiteralPath (Join-Path (Split-Path $PSScriptRoot -Parent) 'skills') -Directory | Select-Object -ExpandProperty Name | Sort-Object)
$installedSkills = @(Get-ChildItem -LiteralPath (Join-Path $codexHome 'skills') -Directory | Select-Object -ExpandProperty Name | Sort-Object)
$notInstalled = @($sourceSkills | Where-Object { $installedSkills -notcontains $_ })
$unexpectedSkills = @($installedSkills | Where-Object { $sourceSkills -notcontains $_ })
Assert-True ($notInstalled.Count -eq 0) "every factory skill is installed beside the router (not installed: $($notInstalled -join ', '))"
Assert-True ($unexpectedSkills.Count -eq 0) "the target carries no skill the factory does not ship (unexpected: $($unexpectedSkills -join ', '))"
Assert-True (Test-Path -LiteralPath (Join-Path $codexHome 'skills\docs-workspace\references\workspace-agents.md')) 'a new project can reach the reviewed workspace template'
# Skills reach the principles and patterns library by the same relative link in
# source and install, so the library must land beside the skills folder.
$installedPlanner = Join-Path $codexHome 'skills\planner'
Assert-True (Test-Path -LiteralPath ([IO.Path]::GetFullPath((Join-Path $installedPlanner '..\..\principles-and-patterns\index.md'))) -PathType Leaf) 'an installed skill''s link to the principles and patterns index resolves'

# Required workflows are protected by reachability, not by a size quota: a
# smaller library is neither a failure nor proof of routing. Every group the
# installed router draws must reach its named lead, installed and declaring
# itself that group's lead, and every skill a lead links (from its SKILL.md or a
# reference beside it) must be installed. checks/harness.ps1 asserts the
# other direction from the same computation: every leaf is named by its lead.
Import-Module (Join-Path $PSScriptRoot 'skill-routing.psm1') -Force
$installedSkillsRoot = Join-Path $codexHome 'skills'
$routing = Get-SkillRouting -SkillsRoot $installedSkillsRoot -RouterPath $userLevel
Assert-True ($routing.RouterLeadByGroup.Count -gt 0) "the installed router draws its groups and leads (found $($routing.RouterLeadByGroup.Count))"
Assert-True (@($routing.MissingRouterLeads).Count -eq 0) "every group the router names reaches its named lead, installed as that group's lead (missing: $(@($routing.MissingRouterLeads) -join ', '))"
Assert-True (@($routing.MissingLinkedSkills).Count -eq 0) "every skill a lead links is installed (missing: $(@($routing.MissingLinkedSkills) -join ', '))"

# The reachability assertions must be able to fail. Take one router-named lead
# and one skill another lead links out of the throwaway install, and the
# computation must name exactly those two.
$removedLead = $routing.RouterLeadByGroup.Values | Sort-Object | Select-Object -First 1
$removedLeaf = $routing.LinksByLead.Keys | Where-Object { $_ -ne $removedLead } | Sort-Object | ForEach-Object { $routing.LinksByLead[$_] } |
    Where-Object { $_ -ne $removedLead -and @($routing.RouterLeadByGroup.Values) -notcontains $_ } | Sort-Object -Unique | Select-Object -First 1
$parked = Join-Path $fixture 'parked-skills'
New-Item -ItemType Directory -Force -Path $parked | Out-Null
$moved = [System.Collections.Generic.List[string]]::new()
try {
    foreach ($name in @($removedLead, $removedLeaf) | Where-Object { $_ }) {
        Move-Item -LiteralPath (Join-Path $installedSkillsRoot $name) -Destination (Join-Path $parked $name)
        $moved.Add($name)
    }
    $broken = Get-SkillRouting -SkillsRoot $installedSkillsRoot -RouterPath $userLevel
    Assert-True ($removedLead -and @($broken.MissingRouterLeads) -contains $removedLead -and @($broken.MissingRouterLeads).Count -eq 1) "with lead '$removedLead' removed, reachability names it (named: $(@($broken.MissingRouterLeads) -join ', '))"
    # A lead may link another lead, so a link to the removed lead is expected too.
    $linkedTo = @($broken.MissingLinkedSkills | ForEach-Object { ($_ -split ' -> ')[-1] } | Sort-Object -Unique)
    Assert-True ($removedLeaf -and $linkedTo -contains $removedLeaf -and @($linkedTo | Where-Object { $_ -ne $removedLeaf -and $_ -ne $removedLead }).Count -eq 0) "with linked skill '$removedLeaf' removed, reachability names it (named: $(@($broken.MissingLinkedSkills) -join ', '))"
}
finally {
    foreach ($name in $moved) { Move-Item -LiteralPath (Join-Path $parked $name) -Destination (Join-Path $installedSkillsRoot $name) }
}

# The approved personal entry includes host facts. Verify installation fidelity
# instead of rejecting those explicitly requested instructions.
$sourceRoot = Split-Path $PSScriptRoot -Parent
$composedAgents = Join-Path $sourceRoot '.local/AGENTS.composed.md'
& node (Join-Path $sourceRoot 'config/compose-agents.mjs') $sourceRoot $composedAgents
Assert-True ($LASTEXITCODE -eq 0 -and (Get-FileHash -LiteralPath $userLevel).Hash -eq (Get-FileHash -LiteralPath $composedAgents).Hash) 'the installed global instructions match the approved source with its private overlay'
Assert-True ((Get-FileHash -LiteralPath (Join-Path $codexHome 'THIRD_PARTY_NOTICES.md')).Hash -eq (Get-FileHash -LiteralPath (Join-Path $sourceRoot 'THIRD_PARTY_NOTICES.md')).Hash) 'the installed central notice matches the source'

Write-Host ''
Write-Host 'The router stays a router'

# It is loaded into every session, so its size is a real budget rather than a
# style preference. The cap guards against the router turning into a handbook.
# The operator relaxed it to 280 lines and 16 KiB on 2 October 2026. When it is
# reached, shorten wording; never remove an instruction to fit.
#
# Whether the router's prose means the right thing is NOT checked here. An earlier
# version of this section asserted on wording, and the reviewer showed those
# assertions passing with the meaning inverted and failing on harmless rewordings.
$routerLines = @(Get-Content -LiteralPath $userLevel).Count
$routerBytes = (Get-Item -LiteralPath $userLevel).Length
Assert-True ($routerLines -le 280) "the always-loaded router stays under 280 lines (it is $routerLines)"
Assert-True ($routerBytes -le 16384) "the always-loaded router stays under 16 KiB (it is $routerBytes bytes)"

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host ("Discovery check passed: $checks assertion(s). Application-level activation is still unproven; it needs a fresh task in the app against an installed target.")
}
else {
    Write-Host ("Discovery check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}

if (-not $Keep) {
    Remove-Item -LiteralPath $fixture -Recurse -Force -ErrorAction SilentlyContinue
}
if (-not $TargetRoot -and -not $Keep) {
    Remove-Item -LiteralPath $sandbox -Recurse -Force -ErrorAction SilentlyContinue
}

exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
