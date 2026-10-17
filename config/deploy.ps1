#Requires -Version 7.0
<#
.SYNOPSIS
    Deploys the harness source, as it stands, into the Codex home.

.DESCRIPTION
    The live installation is a copy of this folder, taken from the working tree
    so current edits reach every project without a commit. Copying rather than
    linking means nothing that deletes inside the Codex home can reach the
    source. Driven by install-map.json, it:

      - copies each mapped file whose content changed since this script last
        deployed it, and adds new ones;
      - retires a file the source no longer ships when the installed copy is
        still the one this script deployed;
      - reports, and leaves alone, an installed file that differs from both the
        source and the last deployment (an edit made in the Codex home, or
        content this script never deployed), unless -Force;
      - never writes through, into or under a junction or symbolic link, and
        never deletes a directory recursively: replaced or retired files move to
        <codex home>\.harness-backup\<id>, and only emptied directories are
        removed, one at a time;
      - leaves unmapped files alone, including the operator's router roles,
        extra files inside a skill and skills the map does not own;
      - installs AGENTS.md with the owner's private overlay, AGENTS.private.md,
        composed in when that file exists (config/compose-agents.mjs);
      - leaves Claude Code synchronization to claude/sync-claude.ps1, which is
        run separately when the operator is ready;
      - places each pinned engine binary the map lists (the Impeccable engine)
        inside its skill once, and only when that skill is shipped. The binary
        comes from the release channel, or from -EngineMirror, and is verified
        against the SHA-256 recorded in the map before it is moved into place.
        An engine already at the pinned hash is skipped; one this script placed
        is replaced when the pin moves; any other binary at the target is a
        conflict unless -Force.
      - installs one file outside the Codex home: Open Code Review's house
        rules, config/ocr/rule.json, to <OCR home>\rule.json. That is an
        allowlist of one map entry; any other target outside the Codex home is
        refused, and nothing else in the OCR home (the operator's config.json
        and sessions\) is read, written, retired or removed. Its backups and
        state live with the rest under the Codex home.

    Content is compared with line endings normalised, so a CRLF copy of an LF
    file is the same file. -Plan (the default) writes nothing in either home
    (it stages the composed AGENTS.md in the source's .local/). The deployed
    state is recorded in <codex home>\.harness-backup\deploy-state.json. Exit
    code 2 means the deployment ran but left conflicts to review.

.EXAMPLE
    pwsh -NoProfile -File config/deploy.ps1

.EXAMPLE
    pwsh -NoProfile -File config/deploy.ps1 -Apply

.EXAMPLE
    pwsh -NoProfile -File config/deploy.ps1 -Apply -EngineMirror D:\mirror
    Takes engine binaries from D:\mirror\<asset path> instead of the network.
#>
[CmdletBinding()]
param(
    [switch]$Apply,
    [switch]$Force,
    [string]$SourceRoot = (Split-Path $PSScriptRoot -Parent),
    [string]$CodexHome = (Join-Path $(if ($IsWindows -and $env:USERPROFILE) { $env:USERPROFILE } else { $env:HOME }) '.codex'),
    [string]$OcrHome = (Join-Path $(if ($IsWindows -and $env:USERPROFILE) { $env:USERPROFILE } else { $env:HOME }) '.opencodereview'),
    [string]$EngineMirror
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$pathComparison = if ($IsWindows) { [StringComparison]::OrdinalIgnoreCase } else { [StringComparison]::Ordinal }

function Get-FullPath([string]$Path) {
    $full = [IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($Path))
    if ($full -eq [IO.Path]::GetPathRoot($full)) { return $full }
    return [IO.Path]::TrimEndingDirectorySeparator($full)
}

function Test-WithinRoot([string]$Path, [string]$Root, [StringComparison]$Comparison = $pathComparison) {
    $separator = [IO.Path]::DirectorySeparatorChar
    $prefix = if ($Root.EndsWith($separator)) { $Root } else { $Root + $separator }
    return $Path.StartsWith($prefix, $Comparison)
}

function Get-MappedPath([string]$Root, [string]$Relative) {
    if ([IO.Path]::IsPathRooted($Relative)) { throw "Map path must be relative: $Relative" }
    if ($Relative.Contains(':')) { throw "Map path must not contain a colon: $Relative" }
    $full = Get-FullPath (Join-Path $Root $Relative)
    if (-not (Test-WithinRoot $full $Root)) { throw "Map path escapes $Root`: $Relative" }
    return $full
}

function Get-ContentHash([string]$Path) {
    $bytes = [IO.File]::ReadAllBytes($Path)
    if ([Array]::IndexOf($bytes, [byte]0) -lt 0) {
        $text = [Text.Encoding]::UTF8.GetString($bytes).Replace("`r`n", "`n")
        $bytes = [Text.Encoding]::UTF8.GetBytes($text)
    }
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
}

function Test-Matches([string]$Relative, [object]$Patterns) {
    $name = Split-Path $Relative -Leaf
    foreach ($pattern in @($Patterns)) {
        if ($name -like $pattern -or $Relative -like $pattern) { return $true }
    }
    return $false
}

function Get-FileSha([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Get-EnginePlatform {
    $os = if ($IsWindows) { 'windows' } elseif ($IsMacOS) { 'darwin' } elseif ($IsLinux) { 'linux' } else { $null }
    $arch = switch ([Runtime.InteropServices.RuntimeInformation]::OSArchitecture) {
        'X64' { 'x64' }
        'Arm64' { 'arm64' }
        default { $null }
    }
    if ($os -and $arch) { return "$os-$arch" }
    return $null
}

function Remove-EmptiedParents([string]$Path) {
    # Remove directories a retirement emptied, never a non-empty one.
    $parent = Split-Path $Path -Parent
    while ((Test-WithinRoot $parent $codex) -and
        -not (Get-Item -LiteralPath $parent -Force).LinkType -and
        -not (Get-ChildItem -LiteralPath $parent -Force | Select-Object -First 1)) {
        [IO.Directory]::Delete($parent, $false)
        $parent = Split-Path $parent -Parent
    }
}

function Get-LinkOnPath([string]$Path, [string]$Root = $codex) {
    # The first junction or symbolic link at or above $Path inside $Root.
    $current = $Path
    while ($current -and $current.Length -ge $Root.Length) {
        $item = Get-Item -LiteralPath $current -Force -ErrorAction SilentlyContinue
        if ($item -and $item.LinkType) { return $current }
        if ($current.Equals($Root, $pathComparison)) { break }
        $current = Split-Path $current -Parent
    }
    return $null
}

# The one map entry allowed outside the Codex home. Its state key holds a
# colon, which Get-MappedPath refuses in any Codex-home path, and its backup
# goes under .opencodereview.
$ocrEntry = @{ source = 'config/ocr/rule.json'; target = 'rule.json'; kind = 'file'; home = '%USERPROFILE%\.opencodereview' }
$ocrKey = 'opencodereview:rule.json'
function Get-Target([string]$Key) { if ($Key -eq $ocrKey) { return Join-Path $ocr $ocrEntry.target } return Join-Path $codex $Key }
function Get-TargetRoot([string]$Key) { if ($Key -eq $ocrKey) { return $ocr } return $codex }
function Get-BackupPath([string]$Key) { if ($Key -eq $ocrKey) { return Join-Path '.opencodereview' $ocrEntry.target } return $Key }
function Get-HomeName([string]$Key) { if ($Key -eq $ocrKey) { return 'the OCR home' } return 'the Codex home' }

$source = Get-FullPath $SourceRoot
$codex = Get-FullPath $CodexHome
$ocr = Get-FullPath $OcrHome
# Unix installations can also live on case-insensitive volumes.
foreach ($pair in @(@($source, $codex), @($source, $ocr), @($codex, $ocr))) {
    if ($pair[0].Equals($pair[1], [StringComparison]::OrdinalIgnoreCase) -or
        (Test-WithinRoot $pair[0] $pair[1] ([StringComparison]::OrdinalIgnoreCase)) -or
        (Test-WithinRoot $pair[1] $pair[0] ([StringComparison]::OrdinalIgnoreCase))) {
        throw "Source, Codex home and OCR home must be separate directories: $($pair[0]) and $($pair[1])"
    }
}
$mapPath = Join-Path $source 'config/install-map.json'
if (-not (Test-Path -LiteralPath $mapPath)) { throw "No install map at $mapPath; is $source the harness source?" }
if (-not (Test-Path -LiteralPath $codex -PathType Container)) { throw "Codex home $codex does not exist." }

$map = Get-Content -LiteralPath $mapPath -Raw | ConvertFrom-Json
$stateDir = Join-Path $codex '.harness-backup'
$statePath = Join-Path $stateDir 'deploy-state.json'
if ($link = Get-LinkOnPath $statePath) { throw "Deployment state sits under the link $link; refusing to write through it" }
$deployed = @{}
$deployedEngines = @{}
if (Test-Path -LiteralPath $statePath) {
    $savedState = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json -AsHashtable
    if ($savedState['files']) { $deployed = $savedState['files'] }
    if ($savedState['engines']) { $deployedEngines = $savedState['engines'] }
}
foreach ($key in @($deployed.Keys) + @($deployedEngines.Keys)) { if ($key -ne $ocrKey) { $null = Get-MappedPath $codex $key } }

# Every file the source ships, keyed by its path relative to the Codex home.
$shipped = [ordered]@{}
foreach ($mapping in $map.mappings) {
    if ($mapping.PSObject.Properties['home']) {
        foreach ($field in $ocrEntry.Keys) {
            $value = $mapping.PSObject.Properties[$field]
            if (-not $value -or $value.Value -isnot [string] -or $value.Value -ne $ocrEntry[$field]) {
                throw "Only $($ocrEntry.source) may install outside the Codex home, as $($ocrEntry.home)\$($ocrEntry.target); refusing a map entry whose $field is $(if ($value) { ConvertTo-Json -InputObject $value.Value -Compress } else { 'missing' })"
            }
        }
        $shipped[$ocrKey] = Get-MappedPath $source $mapping.source
        continue
    }
    $from = Get-MappedPath $source $mapping.source
    $targetRoot = Get-MappedPath $codex $mapping.target
    if ($mapping.kind -eq 'file') {
        $shipped[[IO.Path]::GetRelativePath($codex, $targetRoot)] = $from
        continue
    }
    if ($mapping.kind -ne 'dir') { throw "Unknown install-map kind: $($mapping.kind)" }
    $include = if ($mapping.PSObject.Properties['include']) { $mapping.include } else { @('*') }
    $exclude = if ($mapping.PSObject.Properties['exclude']) { $mapping.exclude } else { @() }
    foreach ($file in Get-ChildItem -LiteralPath $from -Recurse -File -Force) {
        $relative = [IO.Path]::GetRelativePath($from, $file.FullName)
        if (-not (Test-Matches $relative $include)) { continue }
        if (Test-Matches $relative $exclude) { continue }
        $target = Get-MappedPath $targetRoot $relative
        $shipped[[IO.Path]::GetRelativePath($codex, $target)] = $file.FullName
    }
}

# The installed AGENTS.md is the shared one with the owner's private overlay
# composed in (config/compose-agents.mjs); it is staged in the source's
# git-ignored .local/, beside the overlay, and outside both homes.
if ($shipped.Contains('AGENTS.md') -and (Test-Path -LiteralPath (Join-Path $source 'AGENTS.private.md'))) {
    $composed = Join-Path $source '.local/AGENTS.composed.md'
    & node (Join-Path $source 'config/compose-agents.mjs') $source $composed
    if ($LASTEXITCODE -ne 0) { throw "Composing AGENTS.md with AGENTS.private.md failed" }
    $shipped['AGENTS.md'] = $composed
}

$actions = [System.Collections.Generic.List[object]]::new()
$conflicts = [System.Collections.Generic.List[string]]::new()
$newState = @{}
$ocrNote = $null

foreach ($key in $shipped.Keys) {
    $from = $shipped[$key]
    $target = Get-Target $key
    $sourceHash = Get-ContentHash $from
    $link = Get-LinkOnPath $target (Get-TargetRoot $key)
    if ($link) {
        $conflicts.Add("$key sits under the link $link; nothing is written through a link")
        if ($deployed.ContainsKey($key)) { $newState[$key] = $deployed[$key] }
        continue
    }
    if (-not (Test-Path -LiteralPath $target)) {
        $actions.Add([pscustomobject]@{ Action = 'add'; Key = $key; Source = $from })
        $newState[$key] = $sourceHash
        continue
    }
    $installedHash = Get-ContentHash $target
    if ($installedHash -eq $sourceHash) {
        $newState[$key] = $sourceHash
        if ($key -eq $ocrKey) { $ocrNote = "$target up to date" }
        continue
    }
    $ours = $deployed.ContainsKey($key) -and $deployed[$key] -eq $installedHash
    if ($ours -or $Force) {
        $actions.Add([pscustomobject]@{ Action = 'update'; Key = $key; Source = $from })
        $newState[$key] = $sourceHash
    }
    else {
        $why = if ($deployed.ContainsKey($key)) { "was edited in $(Get-HomeName $key) since the last deployment" } else { 'differs from the source and was not deployed by this script' }
        $conflicts.Add("$key $why; left as installed (use -Force to replace it, with a backup)")
        if ($deployed.ContainsKey($key)) { $newState[$key] = $deployed[$key] }
    }
}

foreach ($key in @($deployed.Keys | Sort-Object)) {
    if ($shipped.Contains($key)) { continue }
    $target = Get-Target $key
    if (-not (Test-Path -LiteralPath $target)) { continue }
    $link = Get-LinkOnPath $target (Get-TargetRoot $key)
    if ($link) {
        $conflicts.Add("$key is retired but sits under the link $link; left alone")
        $newState[$key] = $deployed[$key]
        continue
    }
    if ((Get-ContentHash $target) -eq $deployed[$key] -or $Force) {
        $actions.Add([pscustomobject]@{ Action = 'retire'; Key = $key; Source = $null })
    }
    else {
        $conflicts.Add("$key is retired but was edited in $(Get-HomeName $key) since the last deployment; left as installed")
        $newState[$key] = $deployed[$key]
    }
}

# Pinned engine binaries, placed inside a skill this source ships.
$engineActions = [System.Collections.Generic.List[object]]::new()
$engineNotes = [System.Collections.Generic.List[string]]::new()
$newEngines = @{}
$platform = Get-EnginePlatform
foreach ($engine in @(if ($map.PSObject.Properties['engines']) { $map.engines })) {
    $skillSource = Get-MappedPath $source $engine.skill
    $skillTarget = Get-MappedPath $codex $engine.skill
    # The version file marks the shipped package; a nested method has no SKILL.md.
    $versionEntry = [IO.Path]::GetRelativePath($codex, (Get-MappedPath $skillTarget $engine.versionFile))
    if (-not $shipped.Contains($versionEntry)) { continue }
    $versionPath = Get-MappedPath $skillSource $engine.versionFile
    $skillVersion = if (Test-Path -LiteralPath $versionPath) { (Get-Content -LiteralPath $versionPath -Raw).Trim() } else { '' }
    if ($skillVersion -ne $engine.version) {
        throw "Engine $($engine.name) is pinned at $($engine.version) but $($engine.skill)/$($engine.versionFile) asks for '$skillVersion'"
    }
    $label = "$($engine.name) $($engine.version) $platform"
    if (-not $platform -or -not $engine.sha256.PSObject.Properties[$platform]) {
        $engineNotes.Add("engine $label has no pinned build; its launcher fetches one on first use")
        continue
    }
    $exe = if ($platform.StartsWith('windows-')) { '.exe' } else { '' }
    $expand = { param([string]$Text) $Text.Replace('{version}', $engine.version).Replace('{platform}', $platform).Replace('{exe}', $exe) }
    $target = Get-MappedPath $skillTarget (& $expand $engine.target)
    $key = [IO.Path]::GetRelativePath($codex, $target)
    $asset = & $expand $engine.asset
    $from = if ($EngineMirror) { Get-MappedPath (Get-FullPath $EngineMirror) $asset } else { "$($engine.base.TrimEnd('/'))/$asset" }
    $expected = $engine.sha256.$platform.ToUpperInvariant()
    $entry = [pscustomobject]@{ Action = 'add'; Key = $key; Source = $from; Sha = $expected; Label = $label }
    if ($link = Get-LinkOnPath $target) {
        $conflicts.Add("$key sits under the link $link; the engine is not written through a link")
        if ($deployedEngines.ContainsKey($key)) { $newEngines[$key] = $deployedEngines[$key] }
        continue
    }
    if (-not (Test-Path -LiteralPath $target)) {
        $engineActions.Add($entry)
        continue
    }
    $installed = Get-FileSha $target
    if ($installed -eq $expected) {
        $newEngines[$key] = $expected
        $engineNotes.Add("engine $label up to date")
        continue
    }
    if (($deployedEngines.ContainsKey($key) -and $deployedEngines[$key] -eq $installed) -or $Force) {
        $entry.Action = 'update'
        $engineActions.Add($entry)
    }
    else {
        $conflicts.Add("$key is not the pinned $label build and was not placed by this script; left as installed (use -Force to replace it, with a backup)")
        if ($deployedEngines.ContainsKey($key)) { $newEngines[$key] = $deployedEngines[$key] }
    }
}
foreach ($key in @($deployedEngines.Keys | Sort-Object)) {
    if ($newEngines.ContainsKey($key) -or ($engineActions | Where-Object Key -eq $key)) { continue }
    $target = Join-Path $codex $key
    if (-not (Test-Path -LiteralPath $target)) { continue }
    if ($link = Get-LinkOnPath $target) {
        $conflicts.Add("$key is retired but sits under the link $link; left alone")
        $newEngines[$key] = $deployedEngines[$key]
    }
    elseif ((Get-FileSha $target) -eq $deployedEngines[$key] -or $Force) {
        $engineActions.Add([pscustomobject]@{ Action = 'retire'; Key = $key; Source = $null; Sha = $null; Label = 'engine no longer shipped' })
    }
    else {
        $conflicts.Add("$key is retired but was changed since this script placed it; left as installed")
        $newEngines[$key] = $deployedEngines[$key]
    }
}

$revision = & git -C $source rev-parse --short=10 HEAD 2>$null
if ($LASTEXITCODE -eq 0 -and $revision) {
    $pending = @(& git -C $source status --porcelain 2>$null).Count
    if ($pending) { $revision = "$revision + $pending uncommitted change(s)" }
}
else { $revision = 'working tree' }

$mode = if ($Apply) { 'apply' } else { 'plan' }
Write-Host "Harness deploy ($mode) from $source ($revision) into $codex"
$counts = $actions | Group-Object Action | ForEach-Object { "$($_.Count) $($_.Name)" }
Write-Host ("  files: {0}" -f $(if ($counts) { $counts -join ', ' } else { 'up to date' }))
foreach ($entry in $actions) { Write-Host ("  {0,-7} {1}" -f $entry.Action, $entry.Key) }
if ($ocrNote) { Write-Host "  $ocrNote" }
foreach ($note in $engineNotes) { Write-Host "  $note" }
foreach ($entry in $engineActions) { Write-Host ("  engine {0,-7} {1} ({2})" -f $entry.Action, $entry.Key, $entry.Label) }
foreach ($conflict in $conflicts) { Write-Host "  CONFLICT $conflict" }

if (-not $Apply) {
    Write-Host 'Plan only; nothing written to either home. Re-run with -Apply to deploy.'
    exit 0
}

$backup = $null
foreach ($entry in $actions) {
    $target = Get-Target $entry.Key
    if ($entry.Action -in 'update', 'retire') {
        if (-not $backup) {
            $backup = Join-Path $stateDir ("{0}-{1}" -f [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'), [guid]::NewGuid().ToString('N').Substring(0, 8))
            if (Test-Path -LiteralPath $backup) { throw "Backup directory $backup already exists." }
        }
        $saved = Join-Path $backup (Get-BackupPath $entry.Key)
        New-Item -ItemType Directory -Force -Path (Split-Path $saved -Parent) | Out-Null
        Move-Item -LiteralPath $target -Destination $saved
    }
    if ($entry.Action -in 'add', 'update') {
        New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
        Copy-Item -LiteralPath $entry.Source -Destination $target
    }
    elseif ($entry.Key -ne $ocrKey) { Remove-EmptiedParents $target }
}

foreach ($entry in $engineActions) {
    $target = Join-Path $codex $entry.Key
    if ($entry.Action -in 'add', 'update') {
        # Fetch beside the deployment state, verify, and only then move into place.
        New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
        $partial = Join-Path $stateDir ("engine-{0}.part" -f [guid]::NewGuid().ToString('N'))
        try {
            if ($EngineMirror) { Copy-Item -LiteralPath $entry.Source -Destination $partial }
            else {
                $ProgressPreference = 'SilentlyContinue'
                Invoke-WebRequest -Uri $entry.Source -OutFile $partial -MaximumRetryCount 2
            }
            $got = Get-FileSha $partial
        }
        catch {
            $got = $null
            $refusal = "could not be fetched from $($entry.Source): $($_.Exception.Message)"
        }
        if ($got -and $got -ne $entry.Sha) { $refusal = "from $($entry.Source) has SHA-256 $got, not the pinned $($entry.Sha)" }
        if (-not $got -or $got -ne $entry.Sha) {
            # Found only while applying, so reported here rather than in the plan.
            if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial }
            $conflicts.Add("engine $($entry.Label) $refusal; nothing installed")
            Write-Host "  CONFLICT $($conflicts[-1])"
            if ($deployedEngines.ContainsKey($entry.Key)) { $newEngines[$entry.Key] = $deployedEngines[$entry.Key] }
            continue
        }
    }
    if ($entry.Action -in 'update', 'retire') {
        if (-not $backup) {
            $backup = Join-Path $stateDir ("{0}-{1}" -f [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'), [guid]::NewGuid().ToString('N').Substring(0, 8))
            if (Test-Path -LiteralPath $backup) { throw "Backup directory $backup already exists." }
        }
        $saved = Join-Path $backup $entry.Key
        New-Item -ItemType Directory -Force -Path (Split-Path $saved -Parent) | Out-Null
        Move-Item -LiteralPath $target -Destination $saved
    }
    if ($entry.Action -eq 'retire') {
        Remove-EmptiedParents $target
        continue
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
    Move-Item -LiteralPath $partial -Destination $target
    if (-not $IsWindows) { [IO.File]::SetUnixFileMode($target, [IO.UnixFileMode]'UserRead, UserWrite, UserExecute, GroupRead, GroupExecute, OtherRead, OtherExecute') }
    $newEngines[$entry.Key] = $entry.Sha
}

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
[ordered]@{ source = $source; revision = $revision; deployedAt = [DateTime]::UtcNow.ToString('o'); files = $newState; engines = $newEngines } |
    ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statePath -Encoding utf8NoBOM
if ($backup) { Write-Host "  backup: $backup" }
Write-Host "Deployed $revision."

if ($conflicts.Count) { exit 2 }
exit 0
