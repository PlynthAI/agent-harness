#Requires -Version 7.0
<#
.SYNOPSIS
    Runs the Claude Code adapter against a disposable fixture built from source.
.DESCRIPTION
    The fixture Codex home holds this repository's role files and skill
    entrypoints, so a role the reader cannot parse, a mapped role with no source
    file or a renamed role fails here rather than on the owner's host. It syncs
    a copy of the real map plus fixture-only writable and read-only forwarders,
    so both paths stay covered whichever forwarders the real map keeps. It also
    exercises plan, apply, idempotence, retirement of a stale link while the
    operator's differently named links into the Codex home survive, the link to
    each whole folder the map names (the principles and patterns library), so a
    skill's relative link to it resolves, its removal once the map drops it and
    the report of one the Codex home lacks, refusal to
    overwrite a real directory or an edited role, retirement of a role dropped
    from the map, one backup directory per apply, and preservation of the
    operator's own CLAUDE.md lines. Nothing outside the fixture is touched.
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
function Invoke-Sync {
    param([string[]]$Extra = @(), [string]$Map = $script:fixtureMapPath)
    $output = & pwsh -NoProfile -File $sourceSync -CodexHome $codex -ClaudeHome $claude -MapPath $Map @Extra 2>&1
    return [pscustomobject]@{ Exit = $LASTEXITCODE; Text = ($output | ForEach-Object { "$_" }) -join "`n" }
}
function Read-Text([string]$Path) {
    if (Test-Path -LiteralPath $Path) { return [IO.File]::ReadAllText($Path) -replace "`r`n", "`n" }
    return ''
}
function Read-State {
    return (Get-Content -LiteralPath "$claude\.harness-backup\state.json" -Raw | ConvertFrom-Json -AsHashtable)['files']
}
function Test-LinksTo([string]$Path, [string]$Target) {
    $item = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    return [bool]($item -and $item.LinkType -and
        [string]::Equals("$($item.LinkTarget)".TrimEnd('\'), $Target, [StringComparison]::OrdinalIgnoreCase))
}

$adapter = Join-Path $root 'claude'
$sync = Join-Path $adapter 'sync-claude.ps1'
$map = Get-Content -LiteralPath (Join-Path $adapter 'claude-map.json') -Raw | ConvertFrom-Json
# The production map's access distinction is checked before fixture bindings
# can hide a regression in the actual review routes.
Assert-True (-not [bool]($map.roles.fast_review.PSObject.Properties['runtime']) -and $map.roles.fast_review.model -eq 'haiku' -and
    -not [bool]($map.roles.fast_review.PSObject.Properties['write'])) 'the real map runs fast_review natively on Haiku without write access'
Assert-True ([bool]($map.roles.reviewer.PSObject.Properties['runtime'] -and $map.roles.reviewer.runtime -eq 'codex') -and
    [bool]($map.roles.reviewer.PSObject.Properties['write'] -and $map.roles.reviewer.write)) 'the real map keeps reviewer on writable Codex for its findings file'

# The fixture syncs a copy of the real map plus two fixture-only bindings: a
# writable forwarder whose key differs from its Codex role and a read-only one,
# so the --write, read-only and renamed-key paths stay exercised whatever
# forwarders the real map keeps.
$fixtureWriter = 'fixture-writer'
$map.roles | Add-Member -NotePropertyName $fixtureWriter -NotePropertyValue ([pscustomobject]@{ runtime = 'codex'; role = 'fast_worker'; write = $true })
$map.roles | Add-Member -NotePropertyName 'fixture-reader' -NotePropertyValue ([pscustomobject]@{ runtime = 'codex'; role = 'explorer' })
$roles = @($map.roles.PSObject.Properties)
# A Codex-runtime role renders a forwarder to the Codex role its `role` field
# names (default: the key); a Claude-runtime role renders the same-named role.
function Test-CodexRuntime($Property) { return [bool]($Property.Value.PSObject.Properties['runtime'] -and $Property.Value.runtime -eq 'codex') }
function Get-TomlName($Property) {
    if ($Property.Value.PSObject.Properties['role']) { return "$($Property.Value.role)" }
    return $Property.Name
}
function Test-Writable($Property) { return [bool]($Property.Value.PSObject.Properties['write'] -and $Property.Value.write) }
$claudeRoles = @($roles | Where-Object { -not (Test-CodexRuntime $_) })
$codexRoles = @($roles | Where-Object { Test-CodexRuntime $_ })
$fixture = Join-Path ([IO.Path]::GetTempPath()) "claude-adapter-$([guid]::NewGuid().ToString('N'))"
$codex = Join-Path $fixture 'codex'
$claude = Join-Path $fixture 'claude'
$operatorLine = 'Operator rule kept across syncs.'
$mapCopy = Join-Path $fixture 'map'
$fixtureMapPath = Join-Path $mapCopy 'claude-map.json'
# Every run uses a copy of the script in a fixture checkout beside the fixture
# homes. The sync refuses to link into the checkout it runs from, and the
# fixture itself may sit inside this repository (run-all points Temp under
# .local), so running the real script would put every fixture home inside it.
$source = Join-Path $fixture 'source'
$sourceSync = Join-Path $source 'claude\sync-claude.ps1'

try {
    New-Item -ItemType Directory -Force -Path "$codex\agents", "$codex\skills", "$claude\skills\local-only", $mapCopy, "$source\claude" | Out-Null
    Copy-Item -LiteralPath $sync -Destination "$source\claude"
    Copy-Item -LiteralPath (Join-Path $adapter $map.instructions.source) -Destination $mapCopy
    Copy-Item -LiteralPath (Join-Path $adapter 'hooks') -Destination $mapCopy -Recurse
    Copy-Item -LiteralPath (Join-Path $adapter 'scripts') -Destination $mapCopy -Recurse
    # A hook whose source lives elsewhere in the checkout (the shared hooks
    # folder) is copied to the same place relative to the fixture map.
    foreach ($hook in @($map.hooks | Where-Object { $_.PSObject.Properties['source'] })) {
        $hookCopy = [IO.Path]::GetFullPath((Join-Path $mapCopy $hook.source))
        New-Item -ItemType Directory -Force -Path (Split-Path $hookCopy -Parent) | Out-Null
        Copy-Item -LiteralPath (Join-Path $adapter $hook.source) -Destination $hookCopy
    }
    $map | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $fixtureMapPath -Encoding utf8
    Copy-Item -Path (Join-Path $root 'agents\*.toml') -Destination "$codex\agents"
    $sourceSkills = @(Get-ChildItem -LiteralPath (Join-Path $root 'skills') -Directory |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') })
    foreach ($skill in $sourceSkills) {
        New-Item -ItemType Directory -Path "$codex\skills\$($skill.Name)" | Out-Null
        Copy-Item -LiteralPath (Join-Path $skill.FullName 'SKILL.md') -Destination "$codex\skills\$($skill.Name)"
    }
    # A Codex-only skill, a retired skill still linked from Claude, a real
    # Claude directory sharing a shared skill's name, and an operator's own
    # CLAUDE.md.
    New-Item -ItemType Directory -Path "$codex\skills\codex-router", "$codex\skills\retired" | Out-Null
    Set-Content -LiteralPath "$codex\skills\codex-router\SKILL.md" -Value '---'
    New-Item -ItemType Junction -Path "$claude\skills\retired" -Target "$codex\skills\retired" | Out-Null
    $clash = $sourceSkills[0].Name
    New-Item -ItemType Directory -Path "$claude\skills\$clash" | Out-Null
    Set-Content -LiteralPath "$claude\skills\$clash\keep.txt" -Value 'operator file'
    Set-Content -LiteralPath "$claude\CLAUDE.md" -Value $operatorLine
    # The operator's own aliases into the Codex skills tree: one into a skill's
    # subfolder, one under another name for the retired skill. Neither is a
    # link this sync makes, so neither may be retired.
    $aliasSkill = $sourceSkills[-1].Name
    New-Item -ItemType Directory -Path "$codex\skills\$aliasSkill\references" | Out-Null
    $aliases = [ordered]@{
        'my-helper'     = "$codex\skills\$aliasSkill\references"
        'retired-alias' = "$codex\skills\retired"
    }
    foreach ($alias in $aliases.Keys) { New-Item -ItemType Junction -Path "$claude\skills\$alias" -Target $aliases[$alias] | Out-Null }
    # Every folder the map links whole (the principles and patterns library),
    # installed beside skills as deploy places it.
    $folders = @(if ($map.PSObject.Properties['folders']) { $map.folders })
    foreach ($folder in $folders) {
        New-Item -ItemType Directory -Path "$codex\$folder" | Out-Null
        Set-Content -LiteralPath "$codex\$folder\index.md" -Value "$folder index"
    }

    $noSource = @($roles | Where-Object { -not (Test-Path -LiteralPath (Join-Path $root "agents\$(Get-TomlName $_).toml")) } | ForEach-Object Name)
    Assert-True ($roles.Count -ge 4 -and $claudeRoles.Count -ge 2 -and $codexRoles.Count -ge 2 -and $noSource.Count -eq 0) "every mapped role has a source role file, and the fixture has two Claude-runtime roles and, with its fixture binding, two Codex-runtime roles to work with (missing: $($noSource -join ', '))"
    $plan = Invoke-Sync
    Assert-True ($plan.Exit -eq 0) 'plan mode completes against the source roles'
    Assert-True ((Read-Text "$claude\CLAUDE.md").Trim() -eq $operatorLine -and -not (Test-Path -LiteralPath "$claude\agents") -and
        -not @($folders | Where-Object { Test-Path -LiteralPath "$claude\$_" })) 'plan mode writes nothing'
    Assert-True ($folders -contains 'principles-and-patterns' -and -not @($folders | Where-Object { $plan.Text -notmatch "link\s+$([regex]::Escape($_))\b" })) 'the map links the principles and patterns library, and plan mode lists each folder link'
    Assert-True ($plan.Text -match 'instructionFiles') 'a missing AGENTS.md loading setting is reported'

    $apply = Invoke-Sync -Extra '-Apply'
    Assert-True ($apply.Exit -eq 0) 'apply completes'
    if ($apply.Exit -ne 0) { Write-Host $apply.Text }

    $instructions = Read-Text "$claude\CLAUDE.md"
    Assert-True ($instructions -match '\A<!-- claude-harness:begin[^\n]*\n@~/\.codex/AGENTS\.md\n') 'CLAUDE.md opens with the managed import of the installed Codex AGENTS.md'
    Assert-True ($instructions.Contains($operatorLine)) "the operator's own CLAUDE.md lines are kept"

    $badName = @(); $badModel = @(); $badBody = @()
    foreach ($property in $claudeRoles) {
        $role = $property.Name
        $text = Read-Text "$claude\agents\$role.md"
        $toml = Read-Text (Join-Path $root "agents\$role.toml")
        $firstInstruction = ([regex]::Match($toml, '(?ms)^developer_instructions\s*=\s*"""\n?\s*(\S[^\n]*)')).Groups[1].Value
        if ($text -notmatch "\A---\nname: $role\n") { $badName += $role }
        if ($text -notmatch "(?m)^model: $([regex]::Escape($property.Value.model))$") { $badModel += $role }
        if (-not $firstInstruction -or -not $text.Contains($firstInstruction)) { $badBody += $role }
    }
    Assert-True ($claudeRoles.Count -gt 0 -and $badName.Count -eq 0) "every Claude-runtime role renders with its Codex name (wrong: $($badName -join ', '))"
    Assert-True ($badModel.Count -eq 0) "every Claude-runtime role carries the operator's Claude model (wrong: $($badModel -join ', '))"
    Assert-True ($badBody.Count -eq 0) "every Claude-runtime role keeps its Codex instructions (wrong: $($badBody -join ', '))"

    # Codex-runtime roles render as forwarders: a cheap Bash-only Claude agent
    # that calls the installed forward script with the Codex role's name.
    $badForwarder = @(); $badCall = @(); $badBackground = @(); $badWrite = @(); $leakedBody = @()
    foreach ($property in $codexRoles) {
        $agent = $property.Name
        $tomlName = Get-TomlName $property
        $text = Read-Text "$claude\agents\$agent.md"
        $toml = Read-Text (Join-Path $root "agents\$tomlName.toml")
        $tomlModel = ([regex]::Match($toml, '(?m)^model\s*=\s*"([^"]*)"')).Groups[1].Value
        $firstInstruction = ([regex]::Match($toml, '(?ms)^developer_instructions\s*=\s*"""\n?\s*(\S[^\n]*)')).Groups[1].Value
        if ($text -notmatch "\A---\nname: $([regex]::Escape($agent))\n" -or $text -notmatch '(?m)^model: haiku$' -or $text -notmatch '(?m)^tools: Bash$' -or
            $text -notmatch "(?m)^description: ""Runs on the Codex side \($([regex]::Escape($tomlModel))\): ") { $badForwarder += $agent }
        if ($text -notmatch "node ""\`$HOME/\.claude/scripts/codex-forward\.mjs"" --role $([regex]::Escape($tomlName)) --cwd ") { $badCall += $agent }
        if ($text -notmatch '(?m)^background: true$' -or -not $text.Contains('`run_in_background: true` and `timeout: 4500000`')) { $badBackground += $agent }
        if (($text -match 'codex-forward\.mjs[^\n]*--write') -ne (Test-Writable $property)) { $badWrite += $agent }
        if ($firstInstruction -and $text.Contains($firstInstruction)) { $leakedBody += $agent }
    }
    Assert-True ($codexRoles.Count -gt 0 -and $badForwarder.Count -eq 0) "every Codex-runtime role renders as a haiku Bash forwarder named by its map key and describing the Codex model (wrong: $($badForwarder -join ', '))"
    Assert-True ($badCall.Count -eq 0) "every forwarder calls the installed forward script with its Codex role name (wrong: $($badCall -join ', '))"
    Assert-True ($badBackground.Count -eq 0) "every forwarder always runs as a background subagent and gives its call a 75-minute background limit, past the script's 60-minute ceiling (wrong: $($badBackground -join ', '))"
    Assert-True (@($codexRoles | Where-Object { Test-Writable $_ }).Count -gt 0 -and @($codexRoles | Where-Object { -not (Test-Writable $_) }).Count -gt 0 -and
        $badWrite.Count -eq 0) "a forwarder passes --write exactly when the map says so (wrong: $($badWrite -join ', '))"
    Assert-True ($leakedBody.Count -eq 0) "a forwarder leaves the Codex instructions to the Codex side (copied: $($leakedBody -join ', '))"
    $renamed = @($codexRoles | Where-Object { (Get-TomlName $_) -ne $_.Name })
    Assert-True ($renamed.Count -gt 0 -and -not @($renamed | Where-Object { -not (Test-Path -LiteralPath "$claude\agents\$($_.Name).md") })) 'a Codex-runtime role whose key differs from its Codex role renders under its key'
    $scriptSource = Read-Text (Join-Path $adapter 'scripts\codex-forward.mjs')
    Assert-True ($scriptSource -and (Read-Text "$claude\scripts\codex-forward.mjs") -ceq $scriptSource) 'the forward script is copied into the Claude home'
    Assert-True ((Read-State).ContainsKey('scripts\codex-forward.mjs')) 'and recorded as a file this sync owns'

    $expected = @($sourceSkills | Where-Object { $_.Name -ne $clash } | ForEach-Object { $_.Name } |
        Where-Object { $name = $_; -not @($map.skills.exclude | Where-Object { $name -like $_ }) })
    $wrong = @($expected | Where-Object {
        $item = Get-Item -LiteralPath "$claude\skills\$_" -Force -ErrorAction SilentlyContinue
        -not $item -or $item.LinkType -ne 'Junction' -or
            -not [string]::Equals("$($item.LinkTarget)".TrimEnd('\'), "$codex\skills\$_", [StringComparison]::OrdinalIgnoreCase)
    })
    Assert-True ($expected.Count -gt 0 -and $wrong.Count -eq 0) "every shared skill is linked to its own installed copy ($($expected.Count); missing or wrong: $($wrong -join ', '))"
    Assert-True (-not (Test-Path -LiteralPath "$claude\skills\codex-router")) 'Codex-only skills are not linked'
    Assert-True (Test-LinksTo "$claude\skills\goal-setter" "$codex\skills\goal-setter") 'goal-setter, which writes goals for either runtime, is linked'
    Assert-True (-not (Test-Path -LiteralPath "$claude\skills\retired")) 'a link to a retired skill is removed'
    Assert-True (Test-Path -LiteralPath "$codex\skills\retired") 'removing that link leaves its target'
    Assert-True (Test-Path -LiteralPath "$claude\skills\$clash\keep.txt") 'a real directory with a shared name is left untouched'
    Assert-True ($apply.Text -match "skills\\$([regex]::Escape($clash)) is a real directory") 'that clash is reported as a conflict'
    Assert-True (Test-Path -LiteralPath "$claude\skills\local-only") 'unrelated Claude skills are left alone'
    $lostAliases = @($aliases.Keys | Where-Object { -not (Test-LinksTo "$claude\skills\$_" $aliases[$_]) })
    Assert-True ($lostAliases.Count -eq 0) "differently named links into the Codex skills tree survive apply (lost: $($lostAliases -join ', '))"
    $misreported = @($aliases.Keys | Where-Object { $apply.Text -notmatch "foreign\s+skills\\$([regex]::Escape($_))\b" -or $apply.Text -match "unlink\s+skills\\$([regex]::Escape($_))\b" })
    Assert-True ($misreported.Count -eq 0) "they are reported as foreign links, not retired (misreported: $($misreported -join ', '))"
    Assert-True (@(Get-ChildItem -Path "$claude\.harness-backup\*\manifest.json").Count -eq 1) 'apply records a backup manifest'
    $unlinkedFolders = @($folders | Where-Object { -not (Test-LinksTo "$claude\$_" "$codex\$_") })
    Assert-True ($unlinkedFolders.Count -eq 0) "each mapped folder is a link to its installed Codex copy (wrong: $($unlinkedFolders -join ', '))"
    Assert-True ((Read-Text "$claude\skills\planner\..\..\principles-and-patterns\index.md").Trim() -eq 'principles-and-patterns index') 'a linked skill''s relative link to the library index resolves in the Claude home'

    # A folder the map names but the Codex home lacks is reported, never linked.
    $missingMap = Get-Content -LiteralPath $fixtureMapPath -Raw | ConvertFrom-Json
    $missingMap | Add-Member -Force -NotePropertyName folders -NotePropertyValue @($folders + 'not-installed')
    $missingMapPath = Join-Path $mapCopy 'claude-map-missing-folder.json'
    $missingMap | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $missingMapPath -Encoding utf8
    $missingPlan = Invoke-Sync -Map $missingMapPath
    Assert-True ($missingPlan.Exit -eq 0 -and $missingPlan.Text -match 'not-installed is not installed in the Codex home' -and
        $missingPlan.Text -notmatch 'link\s+not-installed') 'a mapped folder missing from the Codex home is reported and not linked'

    # The sync never links a home into the source checkout it runs from: not
    # when the Codex home override is that checkout, and not when a Codex-side
    # skill or folder is a junction into it. The script copy runs from the
    # fixture checkout, so no link ever points into the real one.
    $insideSkill = $sourceSkills[1].Name
    $outsideSkill = $sourceSkills[2].Name
    New-Item -ItemType Directory -Path "$source\agents", "$source\skills\$insideSkill" | Out-Null
    Copy-Item -Path (Join-Path $root 'agents\*.toml') -Destination "$source\agents"
    Copy-Item -LiteralPath (Join-Path $root "skills\$insideSkill\SKILL.md") -Destination "$source\skills\$insideSkill"
    $linkedCodex = Join-Path $fixture 'linked-codex'
    New-Item -ItemType Directory -Path "$linkedCodex\agents", "$linkedCodex\skills\$outsideSkill" | Out-Null
    Copy-Item -Path (Join-Path $root 'agents\*.toml') -Destination "$linkedCodex\agents"
    Copy-Item -LiteralPath (Join-Path $root "skills\$outsideSkill\SKILL.md") -Destination "$linkedCodex\skills\$outsideSkill"
    New-Item -ItemType Junction -Path "$linkedCodex\skills\$insideSkill" -Target "$source\skills\$insideSkill" | Out-Null
    foreach ($folder in $folders) {
        New-Item -ItemType Directory -Path "$source\$folder" | Out-Null
        Set-Content -LiteralPath "$source\$folder\index.md" -Value "$folder index"
        New-Item -ItemType Junction -Path "$linkedCodex\$folder" -Target "$source\$folder" | Out-Null
    }
    foreach ($case in @(
            [pscustomobject]@{ Label = 'the Codex home override is the source checkout'; Codex = $source; Claude = (Join-Path $fixture 'inside-claude') }
            [pscustomobject]@{ Label = 'a Codex-side skill or folder is a junction into the source checkout'; Codex = $linkedCodex; Claude = (Join-Path $fixture 'linked-claude') })) {
        New-Item -ItemType Directory -Path $case.Claude | Out-Null
        $output = & pwsh -NoProfile -File $sourceSync -CodexHome $case.Codex -ClaudeHome $case.Claude -MapPath $fixtureMapPath -Apply 2>&1
        $exit = $LASTEXITCODE
        $text =($output | ForEach-Object { "$_" }) -join "`n"
        $linkedInside = @(@($folders | ForEach-Object { "$($case.Claude)\$_" }) + "$($case.Claude)\skills\$insideSkill" |
            Where-Object { Test-Path -LiteralPath $_ })
        $unreported = @(@($folders) + "skills\$insideSkill" | Where-Object { $text -notmatch "(?m)(^|\s)$([regex]::Escape($_)) resolves into the source checkout" })
        Assert-True ($exit -eq 0 -and $linkedInside.Count -eq 0 -and $unreported.Count -eq 0) "when $($case.Label), no skill or folder is linked into it and each is reported as a conflict (linked: $($linkedInside -join ', '); unreported: $($unreported -join ', '))"
    }
    Assert-True (Test-LinksTo "$fixture\linked-claude\skills\$outsideSkill" "$linkedCodex\skills\$outsideSkill") 'a skill outside the source checkout is still linked beside those conflicts'

    $again = Invoke-Sync -Extra '-Apply'
    Assert-True ($again.Exit -eq 0 -and $again.Text -match 'Nothing to change') 'a second apply changes nothing'

    # The operator edits one role and adds a line to CLAUDE.md; then the Codex
    # side updates another role.
    $edited = $roles[0].Name
    $updated = @($claudeRoles | Where-Object Name -ne $edited)[0].Name
    Add-Content -LiteralPath "$claude\agents\$edited.md" -Value 'Operator addition.'
    Add-Content -LiteralPath "$claude\CLAUDE.md" -Value 'Operator rule added later.'
    $updatedToml = "$codex\agents\$updated.toml"
    $tomlText = [IO.File]::ReadAllText($updatedToml)
    $marker = [regex]::Match($tomlText, 'developer_instructions\s*=\s*"""\r?\n?')
    [IO.File]::WriteAllText($updatedToml, $tomlText.Insert($marker.Index + $marker.Length, "Upstream change.`n"))
    # The Codex side rebinds a Codex-runtime role's model; its forwarder follows.
    $rebound = $codexRoles[-1]
    $reboundToml = "$codex\agents\$(Get-TomlName $rebound).toml"
    [IO.File]::WriteAllText($reboundToml, ([IO.File]::ReadAllText($reboundToml) -replace '(?m)^model\s*=\s*"[^"]*"', 'model = "fixture-rebound-model"'))

    $third = Invoke-Sync -Extra '-Apply'
    Assert-True ($third.Exit -eq 0 -and $third.Text -match "agents\\$edited\.md differs from what the last sync wrote") 'an operator-edited role is reported as a conflict'
    Assert-True ((Read-Text "$claude\agents\$edited.md").Contains('Operator addition.')) 'and is left as the operator wrote it'
    Assert-True ((Read-Text "$claude\agents\$updated.md").Contains('Upstream change.')) 'an unedited role follows its updated Codex file'
    Assert-True ((Read-Text "$claude\agents\$($rebound.Name).md").Contains('Runs on the Codex side (fixture-rebound-model)')) 'a forwarder follows its Codex role''s model binding'
    $instructions = Read-Text "$claude\CLAUDE.md"
    Assert-True ($instructions.Contains('Operator rule added later.') -and [regex]::Matches($instructions, 'claude-harness:begin').Count -eq 1) 'CLAUDE.md keeps later operator lines and exactly one managed block'

    $forced = Invoke-Sync -Extra '-Apply', '-Force'
    Assert-True ($forced.Exit -eq 0 -and -not (Read-Text "$claude\agents\$edited.md").Contains('Operator addition.')) '-Force replaces the edited role'
    Assert-True (@(Get-ChildItem -Path "$claude\.harness-backup\*\agents\$edited.md").Count -ge 1) 'and keeps the edited version in a backup'

    # The map drops two roles, one of each runtime; the operator has edited the
    # Codex-runtime forwarder.
    $dropped = $claudeRoles[-1].Name
    $droppedEdited = $codexRoles[0].Name
    $droppedText = Read-Text "$claude\agents\$dropped.md"
    Add-Content -LiteralPath "$claude\agents\$droppedEdited.md" -Value 'Operator keeps this role.'
    $droppedMap = Get-Content -LiteralPath $fixtureMapPath -Raw | ConvertFrom-Json
    $droppedMap.roles.PSObject.Properties.Remove($dropped)
    $droppedMap.roles.PSObject.Properties.Remove($droppedEdited)
    $droppedMap.PSObject.Properties.Remove('folders')
    $droppedMapPath = Join-Path $mapCopy 'claude-map-dropped.json'
    $droppedMap | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $droppedMapPath -Encoding utf8
    $stateBefore = Read-Text "$claude\.harness-backup\state.json"

    $dropPlan = Invoke-Sync -Map $droppedMapPath
    Assert-True ($dropPlan.Exit -eq 0 -and $dropPlan.Text -match "remove\s+agents\\$dropped\.md" -and
        $dropPlan.Text -match "agents\\$droppedEdited\.md is no longer mapped") 'plan reports an unedited dropped role for removal and an edited one as a conflict'
    Assert-True ((Test-Path -LiteralPath "$claude\agents\$dropped.md") -and (Read-Text "$claude\.harness-backup\state.json") -ceq $stateBefore) 'and writes nothing'

    $dropApply = Invoke-Sync -Map $droppedMapPath -Extra '-Apply'
    Assert-True ($dropApply.Exit -eq 0 -and -not (Test-Path -LiteralPath "$claude\agents\$dropped.md")) 'apply removes an unedited role the map no longer lists'
    Assert-True (@(Get-ChildItem -Path "$claude\.harness-backup\*\agents\$dropped.md" | Where-Object { (Read-Text $_.FullName) -ceq $droppedText }).Count -eq 1) 'and keeps a backup of it'
    Assert-True ((Read-Text "$claude\agents\$droppedEdited.md").Contains('Operator keeps this role.') -and
        $dropApply.Text -match "agents\\$droppedEdited\.md is no longer mapped") 'an edited dropped role is kept and reported as a conflict'
    $stateFiles = Read-State
    Assert-True ($stateFiles.ContainsKey("agents\$droppedEdited.md") -and -not $stateFiles.ContainsKey("agents\$dropped.md")) 'state keeps the edited dropped role and forgets the removed one'
    $keptRoles = @($roles | Where-Object { $_.Name -notin $dropped, $droppedEdited } | Where-Object { -not (Test-Path -LiteralPath "$claude\agents\$($_.Name).md") } | ForEach-Object Name)
    Assert-True ($keptRoles.Count -eq 0) "roles still mapped are left in place (missing: $($keptRoles -join ', '))"
    $keptFolderLinks = @($folders | Where-Object { (Test-Path -LiteralPath "$claude\$_") -or $dropApply.Text -notmatch "unlink\s+$([regex]::Escape($_))\b" })
    Assert-True ($keptFolderLinks.Count -eq 0) "a folder link the map drops is removed (kept: $($keptFolderLinks -join ', '))"
    Assert-True (-not @($folders | Where-Object { (Read-Text "$codex\$_\index.md").Trim() -ne "$_ index" })) 'removing that link leaves the installed Codex folder'

    $dropForced = Invoke-Sync -Map $droppedMapPath -Extra '-Apply', '-Force'
    Assert-True ($dropForced.Exit -eq 0 -and -not (Test-Path -LiteralPath "$claude\agents\$droppedEdited.md") -and
        -not (Read-State).ContainsKey("agents\$droppedEdited.md")) '-Force removes the edited dropped role and forgets it'
    Assert-True (@(Get-ChildItem -Path "$claude\.harness-backup\*\agents\$droppedEdited.md" | Where-Object { (Read-Text $_.FullName).Contains('Operator keeps this role.') }).Count -eq 1) 'and keeps the edited version in a backup'

    # Every apply that changed something has its own backup directory; the id
    # carries a random suffix, so two applies in the same second cannot share one.
    $changed = @($apply, $third, $forced, $dropApply, $dropForced | Where-Object { $_.Text -match 'Applied \d+ change' }).Count
    $manifests = @(Get-ChildItem -Path "$claude\.harness-backup\*\manifest.json" | ForEach-Object {
        [pscustomobject]@{ Directory = $_.Directory.Name; Id = (Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json).id }
    })
    Assert-True ($changed -eq 5 -and $manifests.Count -eq $changed -and @($manifests.Id | Sort-Object -Unique).Count -eq $changed -and
        -not @($manifests | Where-Object { $_.Id -ne $_.Directory })) "each apply that changes something gets its own backup directory ($($manifests.Count) for $changed)"
    $plainIds = @($manifests | Where-Object { $_.Id -cnotmatch '^\d{8}T\d{6}Z-[0-9a-f]{8}$' } | ForEach-Object Id)
    Assert-True ($plainIds.Count -eq 0) "backup ids are the UTC time plus a random suffix (not: $($plainIds -join ', '))"
}
finally {
    # Remove links before the tree so no deletion ever follows one.
    $linkRoots = @("$claude\skills", $claude)
    foreach ($sandbox in 'inside-claude', 'linked-claude') { $linkRoots += "$fixture\$sandbox\skills", "$fixture\$sandbox" }
    $linkRoots += "$fixture\linked-codex\skills", "$fixture\linked-codex"
    foreach ($linkRoot in $linkRoots) {
        if (Test-Path -LiteralPath $linkRoot) {
            Get-ChildItem -LiteralPath $linkRoot -Force | Where-Object LinkType | ForEach-Object { [IO.Directory]::Delete($_.FullName) }
        }
    }
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}

if ($failures.Count -eq 0) {
    Write-Host "Claude-adapter check passed: $checks assertion(s)."
} else {
    Write-Host "Claude-adapter check FAILED: $($failures.Count) of $checks assertion(s)."
}
exit $(if ($failures.Count -eq 0) { 0 } else { 1 })
