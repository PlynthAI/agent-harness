#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the harness skill: its router and the library method.

.DESCRIPTION
    Checks the router names every nested method beside it, then the library
    method's runnable boundaries: skill metadata, three ownership classes,
    the central notice and source layout, absence of retired per-skill
    licence/provenance sidecars, and the principles and patterns library's
    reference, index check and its Node suite. Method quality is reviewed as
    prose.
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
$routerPath = Join-Path $skillsRoot 'harness\SKILL.md'
$skillPath = Join-Path $skillsRoot 'harness\library\METHOD.md'
$noticePath = Join-Path $root 'THIRD_PARTY_NOTICES.md'
$skill = if (Test-Path -LiteralPath $skillPath -PathType Leaf) { [IO.File]::ReadAllText($skillPath) } else { '' }
$notice = if (Test-Path -LiteralPath $noticePath -PathType Leaf) { [IO.File]::ReadAllText($noticePath) } else { '' }

# The router: a lead whose entrypoint names every nested method beside it, so
# no method is unreachable, and each method carries its own name.
$router = if (Test-Path -LiteralPath $routerPath -PathType Leaf) { [IO.File]::ReadAllText($routerPath) } else { '' }
Assert-True ($router -match '(?m)^name:\s*harness\s*$') 'the router name matches the directory'
Assert-True ($router -match '(?m)^metadata:\s*$\r?\n\s+group:\s*harness\s*$\r?\n\s+lead:\s*true\s*$') 'the router leads the harness group'
$methodDirs = @(Get-ChildItem -LiteralPath (Join-Path $skillsRoot 'harness') -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'METHOD.md') -PathType Leaf })
$unrouted = @($methodDirs | Where-Object { $router -notmatch ('\]\(' + [regex]::Escape($_.Name) + '/METHOD\.md\)') } | ForEach-Object Name)
Assert-True ($methodDirs.Count -ge 8 -and $unrouted.Count -eq 0) "the router links every nested method ($($methodDirs.Count) found; unrouted: $($unrouted -join ', '))"
$misnamed = @($methodDirs | Where-Object { [IO.File]::ReadAllText((Join-Path $_.FullName 'METHOD.md')) -notmatch ('(?m)^name:\s*' + [regex]::Escape($_.Name) + '\s*$') } | ForEach-Object Name)
Assert-True ($misnamed.Count -eq 0) "each method's name matches its folder (mismatched: $($misnamed -join ', '))"

Assert-True ($skill -match '(?s)\A---\r?\n.*?\r?\n---') 'the library method has frontmatter'
Assert-True ($skill -match '(?m)^description:\s*\S') 'the library method has a description'
Assert-True ((@([regex]::Matches($skill, '(?m)^##\s+\d+\.\s+')).Count) -ge 5) 'the maintenance method has its working sections'

$classNames = @('Owned prose', 'Upstream-managed package', 'Project-specific material')
foreach ($className in $classNames) {
    Assert-True ($skill -match ('(?m)^\|\s*' + [regex]::Escape($className) + '\s*\|')) "the class table distinguishes $className"
}
Assert-True ($skill -match '(?i)official source') 'borrowed methods are checked against an official source'
Assert-True ($skill -match '(?i)throwaway-copy') 'mechanical adaptations retain a disposable check'
Assert-True ($skill -match [regex]::Escape('../../THIRD_PARTY_NOTICES.md')) 'the skill links the central notice'
Assert-True ((Test-Path -LiteralPath $noticePath -PathType Leaf)) 'the central notice exists at the linked path'
Assert-True ($notice -match '(?m)^# Third-party notices\s*$') 'the central notice has a clear title'
Assert-True ($notice -match '(?m)^MIT License\s*$') 'the central notice retains MIT terms'
Assert-True ($notice -match '(?m)^\s*Apache License\s*$') 'the central notice retains Apache terms'
Assert-True ($notice -match '(?i)Copyright \(c\)') 'the central notice retains copyright statements'
Assert-True ($notice -match '(?i)[0-9a-f]{40}') 'the central notice records source revisions'

# A dependency's own licence inside node_modules is not a skill sidecar; the
# central notice records the package instead.
$retiredSidecars = @(Get-ChildItem -LiteralPath $skillsRoot -Recurse -File | Where-Object { ($_.Name -eq 'PROVENANCE.md' -or $_.Name -eq 'LICENSE') -and $_.FullName -notmatch '\\node_modules\\' })
Assert-True ($retiredSidecars.Count -eq 0) "no skill carries a retired LICENSE/PROVENANCE sidecar (found $($retiredSidecars.Count))"
Assert-True (Test-Path -LiteralPath (Join-Path $root 'checks\install.ps1') -PathType Leaf) 'the source keeps its install helper'
Assert-True (Test-Path -LiteralPath (Join-Path $root 'config') -PathType Container) 'the source keeps its config directory'
Assert-True (Test-Path -LiteralPath (Join-Path $root 'ARCHITECTURE.md') -PathType Leaf) 'the source keeps its architecture guide'
Assert-True ($skill -match '\.local/proposals') 'review packets use the ignored proposal location'
Assert-True ($skill -match '(?i)installed copy') 'the method covers an installed reader'
Assert-True ($skill -match '(?i)rollback') 'the method names a recovery route'

# Adding a skill: the authoring reference, the template and the group vocabulary.
$authoringPath = Join-Path $skillsRoot 'harness\library\references\authoring-a-skill.md'
$templatePath = Join-Path $skillsRoot 'harness\library\assets\skill-template.md'
$authoring = if (Test-Path -LiteralPath $authoringPath -PathType Leaf) { [IO.File]::ReadAllText($authoringPath) } else { '' }
$template = if (Test-Path -LiteralPath $templatePath -PathType Leaf) { [IO.File]::ReadAllText($templatePath) } else { '' }
Assert-True ($skill -match [regex]::Escape('references/authoring-a-skill.md')) 'the entrypoint routes skill authoring to its reference'
Assert-True ($skill -match [regex]::Escape('assets/skill-template.md')) 'the entrypoint routes a new skill to the template'
Assert-True ($authoring.Length -gt 0) 'the authoring reference exists'
Assert-True ($template -match '(?s)\A---\r?\n.*?\r?\n---') 'the template has frontmatter'
Assert-True ($template -match '(?m)^name:\s*\S') 'the template has a name line'
Assert-True ($template -match '(?m)^description:\s*\S') 'the template has a description line'
Assert-True ($template -match '(?m)^metadata:\s*$\r?\n\s+group:\s*\S') 'the template declares metadata.group'
# Groups, leads and leaves come from the shared routing computation, which
# checks/discovery.ps1 also asserts on against an installed copy.
Import-Module (Join-Path $PSScriptRoot 'skill-routing.psm1') -Force
$routing = Get-SkillRouting -SkillsRoot $skillsRoot -RouterPath (Join-Path $root 'AGENTS.md')
$groups = @($routing.VocabularyGroups)
Assert-True ($groups.Count -ge 8) "the authoring reference defines the group vocabulary (found $($groups.Count))"
$missingLeads = @($routing.MissingVocabularyLeads)
Assert-True ($missingLeads.Count -eq 0) "every group lead is a skill on disk (missing: $($missingLeads -join ', '))"

# Every skill declares a group from that vocabulary, and each group's lead, and
# only it, carries the lead flag. The tree is drawn from these declarations.
$undeclared = @($routing.Undeclared)
$unknown = @($routing.UnknownGroups)
$leadMismatch = @($routing.LeadMismatch)
Assert-True ($undeclared.Count -eq 0) "every skill declares metadata.group (undeclared: $($undeclared -join ', '))"
Assert-True ($unknown.Count -eq 0) "every declared group is in the authoring vocabulary (unknown: $($unknown -join ', '))"
Assert-True ($leadMismatch.Count -eq 0) "each group's lead, and only it, carries lead: true (mismatched: $($leadMismatch -join ', '))"
$unnamedGroups = @($routing.UnnamedGroups)
$unnamedLeads = @($routing.UnnamedLeads)
Assert-True ($unnamedGroups.Count -eq 0) "AGENTS.md names every group (missing: $($unnamedGroups -join ', '))"
Assert-True ($unnamedLeads.Count -eq 0) "AGENTS.md names every group's lead beside it (missing: $($unnamedLeads -join ', '))"

# AGENTS.md promises that each group's lead routes to its leaves. A leaf the
# lead (its SKILL.md or a reference beside it) never names is unreachable from
# the router, which is how wayfinder, to-tickets and to-spec vanished from a
# drawn workflow. Codex also hides any skill whose agents/openai.yaml sets
# allow_implicit_invocation: false, which once removed implement, wayfinder and
# to-tickets from every Codex session's listing.
$unroutedLeaves = @($routing.UnroutedLeaves)
$hiddenFromCodex = @($routing.HiddenFromCodex)
Assert-True ($unroutedLeaves.Count -eq 0) "each group's lead names every leaf in its group (unrouted: $($unroutedLeaves -join ', '))"
Assert-True ($hiddenFromCodex.Count -eq 0) "no skill hides itself from Codex with allow_implicit_invocation: false (hidden: $($hiddenFromCodex -join ', '))"
# Claude Code's twin is disable-model-invocation: true, which left handoff
# usable only as a slash command the person had to type.
$hiddenFromClaude = @(Get-ChildItem -LiteralPath $skillsRoot -Filter SKILL.md -Recurse |
    Where-Object { (Get-Content -Raw $_.FullName) -match '(?m)^disable-model-invocation\s*:\s*true' } |
    ForEach-Object { $_.Directory.Name })
Assert-True ($hiddenFromClaude.Count -eq 0) "no skill hides itself from Claude with disable-model-invocation: true (hidden: $($hiddenFromClaude -join ', '))"

# Codex shows agents/openai.yaml to the person in its skill picker; the model
# reads SKILL.md. Every skill carries one holding only the picker's name and
# one-line description, so no default_prompt edits the person's message and no
# policy changes what the model is offered.
$interfaceExceptions = @{ 'keep-codex-fast' = 'carried whole; its own CI workflow asserts interface.default_prompt' }
$missingInterface = [System.Collections.Generic.List[string]]::new()
$strayInterface = [System.Collections.Generic.List[string]]::new()
$extraFields = [System.Collections.Generic.List[string]]::new()
$badValues = [System.Collections.Generic.List[string]]::new()
$badLength = [System.Collections.Generic.List[string]]::new()
foreach ($dir in @(Get-ChildItem -LiteralPath $skillsRoot -Directory | Sort-Object Name)) {
    if (-not (Test-Path -LiteralPath (Join-Path $dir.FullName 'SKILL.md') -PathType Leaf)) { continue }
    if (Test-Path -LiteralPath (Join-Path $dir.FullName 'agents\openai.yml')) { $strayInterface.Add($dir.Name) }
    $interfacePath = Join-Path $dir.FullName 'agents\openai.yaml'
    if (-not (Test-Path -LiteralPath $interfacePath -PathType Leaf)) { $missingInterface.Add($dir.Name); continue }
    $fields = [System.Collections.Generic.List[string]]::new()
    $parent = ''
    foreach ($line in @([IO.File]::ReadAllLines($interfacePath) | Where-Object { $_.Trim() -and $_ -notmatch '^\s*#' })) {
        $key = [regex]::Match($line, '^(\s*)([A-Za-z_]+):')
        if (-not $key.Success) { $fields.Add($line.Trim()); continue }
        if ($key.Groups[1].Length -eq 0) { $parent = $key.Groups[2].Value; $fields.Add($parent) }
        else { $fields.Add("$parent.$($key.Groups[2].Value)") }
    }
    $extra = @($fields | Where-Object { $_ -notin @('interface', 'interface.display_name', 'interface.short_description') })
    if (-not $interfaceExceptions.ContainsKey($dir.Name) -and ($extra.Count -gt 0 -or $fields.Count -ne 3)) { $extraFields.Add("$($dir.Name): $(($fields | Where-Object { $_ -ne 'interface' }) -join ', ')") }
    $text = [IO.File]::ReadAllText($interfacePath)
    $display = [regex]::Match($text, '(?m)^\s+display_name:\s*"([^"]*)"\s*$')
    $short = [regex]::Match($text, '(?m)^\s+short_description:\s*"([^"]*)"\s*$')
    if (-not ($display.Success -and $display.Groups[1].Value.Trim() -and $short.Success -and $short.Groups[1].Value.Trim())) { $badValues.Add($dir.Name); continue }
    $length = $short.Groups[1].Value.Length
    if ($length -lt 25 -or $length -gt 64) { $badLength.Add("$($dir.Name) ($length)") }
}
Assert-True ($missingInterface.Count -eq 0) "every top-level skill carries agents/openai.yaml (missing: $($missingInterface -join ', '))"
Assert-True ($strayInterface.Count -eq 0) "no skill carries a stray agents/openai.yml (found: $($strayInterface -join ', '))"
Assert-True ($extraFields.Count -eq 0) "each interface holds only display_name and short_description, except $(@($interfaceExceptions.GetEnumerator() | ForEach-Object { "$($_.Key) ($($_.Value))" }) -join ', ') (found: $($extraFields -join '; '))"
Assert-True ($badValues.Count -eq 0) "display_name and short_description are quoted non-empty strings (bad: $($badValues -join ', '))"
Assert-True ($badLength.Count -eq 0) "each short_description is 25 to 64 characters (outside: $($badLength -join ', '))"
# Codex discovers skills recursively (codex-rs/ext/skills loader, depth 6), so a
# SKILL.md or picker file below a top-level skill would list a nested method as
# its own skill. Nested methods are <name>/METHOD.md.
$nestedEntries = @(Get-ChildItem -LiteralPath $skillsRoot -Directory | ForEach-Object {
        Get-ChildItem -LiteralPath $_.FullName -Directory | ForEach-Object {
            Get-ChildItem -LiteralPath $_.FullName -Recurse -File -Include 'SKILL.md', 'openai.yaml' -ErrorAction SilentlyContinue
        }
    } | Where-Object { $_.FullName -notmatch '\\node_modules\\' } | ForEach-Object { $_.FullName.Substring($skillsRoot.Length + 1) } |
    Where-Object { $_ -notmatch '^[^\\]+\\agents\\openai\.yaml$' })
Assert-True ($nestedEntries.Count -eq 0) "no SKILL.md or agents/openai.yaml sits below a top-level skill (found: $($nestedEntries -join ', '))"
# Adding a role: the authoring reference and a template carrying the keys the
# Claude sync reads.
$roleAuthoringPath = Join-Path $skillsRoot 'harness\library\references\authoring-a-role.md'
$roleTemplatePath = Join-Path $skillsRoot 'harness\library\assets\role-template.toml'
$roleTemplate = if (Test-Path -LiteralPath $roleTemplatePath -PathType Leaf) { [IO.File]::ReadAllText($roleTemplatePath) } else { '' }
Assert-True (Test-Path -LiteralPath $roleAuthoringPath -PathType Leaf) 'the role authoring reference exists'
Assert-True ($skill -match [regex]::Escape('references/authoring-a-role.md')) 'the entrypoint routes role authoring to its reference'
Assert-True ($skill -match [regex]::Escape('assets/role-template.toml')) 'the entrypoint routes a new role to the template'
Assert-True ($roleTemplate.Length -gt 0) 'the role template exists'
foreach ($key in @('name', 'description')) {
    Assert-True ($roleTemplate -match ('(?m)^' + $key + '\s*=\s*"\S')) "the role template carries a $key key"
}
Assert-True ($roleTemplate -match '(?ms)^developer_instructions\s*=\s*"""\r?\n.*?"""') 'the role template carries a developer_instructions block'

# The principles and patterns library: the library method owns its guidance and its
# index check, which fails on an incomplete entry or an index that differs from
# a fresh build. The check's behaviour is pinned by its own Node suite.
$libraryGuidePath = Join-Path $skillsRoot 'harness\library\references\principles-and-patterns.md'
$libraryScript = Join-Path $skillsRoot 'harness\scripts\library-index.mjs'
$libraryTests = @('library-index', 'stack-scan') | ForEach-Object { Join-Path $skillsRoot "harness\tests\$_.test.mjs" }
Assert-True ($skill -match [regex]::Escape('references/principles-and-patterns.md')) 'the entrypoint routes library entries to their reference'
Assert-True (Test-Path -LiteralPath $libraryGuidePath -PathType Leaf) 'the library reference exists'
$libraryOutput = @(& node $libraryScript 2>&1)
Assert-True ($LASTEXITCODE -eq 0 -and ($libraryOutput -join "`n") -match 'Library check passed') "the principles and patterns library passes its index check ($(@($libraryOutput | Where-Object { "$_" -match '^(ERROR|WARNING|Library check|Cannot)' }) -join '; '))"
$suiteOutput = @(& node --test @libraryTests 2>&1)
Assert-True ($LASTEXITCODE -eq 0) "the library index and stack scan suites pass ($(@($suiteOutput | Where-Object { "$_" -match '^. (tests|pass|fail) ' }) -join '; '))"

foreach ($file in @($routerPath, $authoringPath, $templatePath, $skillPath, $roleAuthoringPath, $roleTemplatePath, $libraryGuidePath)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
    $text = [IO.File]::ReadAllText($file) -replace '(?ms)^\s*```[^\n]*\n.*?^\s*```\s*$', ''
    $broken = @([regex]::Matches($text, '\]\(([^)]+)\)') | ForEach-Object { $_.Groups[1].Value.Split('#')[0] } |
        Where-Object { $_ -and $_ -notmatch '^[a-z][a-z0-9+.-]*:' -and $_ -notmatch 'references/mode\.md' -and -not (Test-Path -LiteralPath (Join-Path (Split-Path $file -Parent) $_)) })
    Assert-True ($broken.Count -eq 0) "$(Split-Path $file -Leaf) links resolve (broken: $($broken -join ', '))"
}

if ($failures.Count -eq 0) { Write-Host ("Harness check passed: $checks structural assertion(s). Method content is verified by review, not here.") }
else {
    Write-Host ("Harness check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
