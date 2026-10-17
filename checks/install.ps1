#Requires -Version 7.0
<#
.SYNOPSIS
    Plans, applies and rolls back the shared Codex harness.

.DESCRIPTION
    Reads config/install-map.json and maps the maintained source in this
    repository onto a Codex home directory. Nothing is written unless -Apply is
    given together with an explicit -ApprovedBy name.

    Every apply copies the files it is about to replace into a timestamped
    backup and persists the manifest that names them before it writes the first
    installation file, so an interrupted apply is still discoverable and
    -Rollback can restore the previous state.

.EXAMPLE
    pwsh -File checks/install.ps1 -Plan

.EXAMPLE
    pwsh -File checks/install.ps1 -Apply -ApprovedBy "A. Operator"

.EXAMPLE
    pwsh -File checks/install.ps1 -Rollback -BackupId 20260917T081500Z
#>
[CmdletBinding(DefaultParameterSetName = 'Plan')]
param(
    [Parameter(ParameterSetName = 'Plan')]
    [switch]$Plan,

    [Parameter(ParameterSetName = 'Apply', Mandatory = $true)]
    [switch]$Apply,

    [Parameter(ParameterSetName = 'Apply', Mandatory = $true)]
    [string]$ApprovedBy,

    [Parameter(ParameterSetName = 'Apply')]
    [switch]$AllowDirty,

    [Parameter(ParameterSetName = 'Rollback', Mandatory = $true)]
    [switch]$Rollback,

    [Parameter(ParameterSetName = 'Rollback', Mandatory = $true)]
    [string]$BackupId,

    [Parameter(ParameterSetName = 'List', Mandatory = $true)]
    [switch]$ListBackups,

    [string]$TargetRoot,
    [string]$SourceRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-FileHashOrNull {
    param([string]$Path)
    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
    }
    return $null
}

function Test-AnyPattern {
    param([string]$RelativePath, [object]$Patterns)
    if (-not $Patterns) { return $false }
    foreach ($pattern in @($Patterns)) {
        if ($RelativePath -like $pattern) { return $true }
    }
    return $false
}

function Test-LineEndingsOnlyDifference {
    # Explains a hash difference; it never reclassifies a file as unchanged.
    # A task worktree checks the same source out with LF while the maintained
    # checkout and the installed copy can be CRLF, so a byte comparison alone
    # cannot tell "line endings" apart from "somebody edited the installed file".
    param([string]$Source, [string]$Target)
    try {
        $sourceItem = Get-Item -LiteralPath $Source
        $targetItem = Get-Item -LiteralPath $Target
        if ($sourceItem.Length -gt 1MB -or $targetItem.Length -gt 1MB) { return $false }
        $sourceBytes = [IO.File]::ReadAllBytes($Source)
        $targetBytes = [IO.File]::ReadAllBytes($Target)
    }
    catch { return $false }
    if ([Array]::IndexOf($sourceBytes, [byte]0) -ge 0) { return $false }
    if ([Array]::IndexOf($targetBytes, [byte]0) -ge 0) { return $false }
    $sourceText = ([Text.Encoding]::UTF8.GetString($sourceBytes)) -replace "`r`n", "`n"
    $targetText = ([Text.Encoding]::UTF8.GetString($targetBytes)) -replace "`r`n", "`n"
    return ($sourceText -ceq $targetText)
}

function Get-OptionalProperty {
    param([object]$Object, [string]$Name)
    if ($null -eq $Object) { return $null }
    if ($Object.PSObject.Properties.Name -contains $Name) { return $Object.$Name }
    return $null
}

function Write-Manifest {
    # Serialize beside the manifest and rename it into place, so a reader never
    # observes a half-written file. The manifest is the commit point: once it
    # exists, every before-image it names is already in the backup directory.
    param([string]$Path, [object]$Data)
    $temporary = "$Path.tmp"
    $Data | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $temporary -Encoding utf8
    Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Format-QuotedLiteral {
    # A single-quoted PowerShell literal, safe to paste back into a shell. A
    # path holding a quote is doubled rather than dropped, so the recovered
    # command cannot silently name a different directory than the one used.
    param([string]$Text)
    return "'" + ($Text -replace "'", "''") + "'"
}

function Get-MappedFiles {
    param([string]$Root, [object]$Map)

    $results = [System.Collections.Generic.List[object]]::new()
    foreach ($mapping in $Map.mappings) {
        # The one entry with its own home installs outside the Codex home, and
        # config/deploy.ps1 owns it.
        if ($mapping.PSObject.Properties['home']) { continue }
        $sourcePath = Join-Path $Root ($mapping.source -replace '/', [IO.Path]::DirectorySeparatorChar)
        if (-not (Test-Path -LiteralPath $sourcePath)) {
            throw "Mapped source is missing: $($mapping.source)"
        }

        if ($mapping.kind -eq 'file') {
            $results.Add([pscustomobject]@{
                Relative = $mapping.target
                Source   = $sourcePath
            })
            continue
        }

        $include = Get-OptionalProperty -Object $mapping -Name 'include'
        $exclude = Get-OptionalProperty -Object $mapping -Name 'exclude'
        $sourceDir = (Resolve-Path -LiteralPath $sourcePath).Path
        foreach ($file in Get-ChildItem -LiteralPath $sourceDir -Recurse -File -Force) {
            $relative = $file.FullName.Substring($sourceDir.Length).TrimStart('\', '/')
            if ($relative -like '.git\*' -or $relative -like '.git/*') { continue }
            if ($include -and -not (Test-AnyPattern -RelativePath $relative -Patterns $include)) { continue }
            if (Test-AnyPattern -RelativePath $relative -Patterns $exclude) { continue }

            $targetRelative = ($mapping.target.TrimEnd('/') + '/' + ($relative -replace '\\', '/'))
            $results.Add([pscustomobject]@{
                Relative = $targetRelative
                Source   = $file.FullName
            })
        }
    }
    return $results
}

function Resolve-ConfiguredTarget {
    param([string]$Explicit, [object]$Map)
    if ($Explicit) { return $Explicit }
    $userHome = if ($IsWindows -and $env:USERPROFILE) { $env:USERPROFILE } else { $env:HOME }
    return Join-Path $userHome $Map.defaultTarget
}

$mapPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'config/install-map.json'
if (-not (Test-Path -LiteralPath $mapPath)) { throw "Install map not found: $mapPath" }
$map = Get-Content -Raw -LiteralPath $mapPath | ConvertFrom-Json

$resolvedSource = if ($SourceRoot) { (Resolve-Path -LiteralPath $SourceRoot).Path } else { (Split-Path $PSScriptRoot -Parent) }
$resolvedTarget = Resolve-ConfiguredTarget -Explicit $TargetRoot -Map $map
$resolvedTarget = [IO.Path]::GetFullPath($resolvedTarget)
$backupRoot = Join-Path $resolvedTarget '.harness-backup'

Write-Host "Source: $resolvedSource"
Write-Host "Target: $resolvedTarget"

if ($ListBackups) {
    if (-not (Test-Path -LiteralPath $backupRoot)) {
        Write-Host 'No backups recorded for this target.'
        return
    }
    foreach ($dir in Get-ChildItem -LiteralPath $backupRoot -Directory | Sort-Object Name) {
        $manifest = Join-Path $dir.FullName 'manifest.json'
        if (Test-Path -LiteralPath $manifest) {
            $data = Get-Content -Raw -LiteralPath $manifest | ConvertFrom-Json
            Write-Host ("{0}  files={1}  approvedBy={2}" -f $dir.Name, $data.files.Count, $data.approvedBy)
        }
        else {
            Write-Host ("{0}  (no manifest)" -f $dir.Name)
        }
    }
    return
}

if ($Rollback) {
    $restoreRoot = Join-Path $backupRoot $BackupId
    $manifestPath = Join-Path $restoreRoot 'manifest.json'
    if (-not (Test-Path -LiteralPath $manifestPath)) { throw "Backup not found: $BackupId" }
    $data = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
    $phase = Get-OptionalProperty -Object $data -Name 'phase'
    if ($phase -and $phase -ne 'complete') {
        Write-Host "This release did not finish applying (phase: $phase); restoring the files it recorded."
    }

    $restored = 0
    $removed = 0
    foreach ($entry in ($data.files | Sort-Object { $_.relative.Length } -Descending)) {
        $targetFile = Join-Path $resolvedTarget ($entry.relative -replace '/', [IO.Path]::DirectorySeparatorChar)
        if ($entry.beforeExisted) {
            $backupFile = Join-Path (Join-Path $restoreRoot 'files') ($entry.relative -replace '/', [IO.Path]::DirectorySeparatorChar)
            if (-not (Test-Path -LiteralPath $backupFile)) { throw "Backup payload missing for $($entry.relative)" }
            $parent = Split-Path $targetFile -Parent
            if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
            Copy-Item -LiteralPath $backupFile -Destination $targetFile -Force
            $restored++
        }
        elseif (Test-Path -LiteralPath $targetFile) {
            Remove-Item -LiteralPath $targetFile -Force
            $removed++
        }
    }
    Write-Host "Rollback $BackupId complete. Restored: $restored  Removed: $removed"
    return
}

$mapped = Get-MappedFiles -Root $resolvedSource -Map $map

# As config/deploy.ps1 does: AGENTS.md installs with the owner's private
# overlay composed in (config/compose-agents.mjs), staged in the source's
# git-ignored .local/ beside the overlay.
$agentsEntry = $mapped | Where-Object Relative -eq 'AGENTS.md'
if ($agentsEntry -and (Test-Path -LiteralPath (Join-Path $resolvedSource 'AGENTS.private.md'))) {
    $composed = Join-Path $resolvedSource '.local/AGENTS.composed.md'
    & node (Join-Path $resolvedSource 'config/compose-agents.mjs') $resolvedSource $composed
    if ($LASTEXITCODE -ne 0) { throw 'Composing AGENTS.md with AGENTS.private.md failed' }
    $agentsEntry.Source = $composed
}

$added = 0
$modified = 0
$unchanged = 0
$lineEndingOnly = 0
$planItems = [System.Collections.Generic.List[object]]::new()

foreach ($entry in $mapped) {
    $targetFile = Join-Path $resolvedTarget ($entry.Relative -replace '/', [IO.Path]::DirectorySeparatorChar)
    $sourceHash = Get-FileHashOrNull -Path $entry.Source
    $targetHash = Get-FileHashOrNull -Path $targetFile

    $action = 'unchanged'
    $eolOnly = $false
    if (-not $targetHash) { $action = 'add'; $added++ }
    elseif ($sourceHash -ne $targetHash) {
        $action = 'modify'
        $modified++
        $eolOnly = Test-LineEndingsOnlyDifference -Source $entry.Source -Target $targetFile
        if ($eolOnly) { $lineEndingOnly++ }
    }
    else { $unchanged++ }

    $planItems.Add([pscustomobject]@{
        Relative     = $entry.Relative
        Source       = $entry.Source
        Target       = $targetFile
        Action       = $action
        LineEndingsOnly = $eolOnly
        SourceHash   = $sourceHash
        TargetHash   = $targetHash
        BeforeExists = [bool]$targetHash
    })
}

if ($Plan -or -not $Apply) {
    $planItems | Where-Object { $_.Action -ne 'unchanged' } | Sort-Object Relative |
        ForEach-Object {
            $suffix = if ($_.LineEndingsOnly) { '  (line endings only)' } else { '' }
            Write-Host ("{0,-7} {1}{2}" -f $_.Action.ToUpper(), $_.Relative, $suffix)
        }
    Write-Host ''
    Write-Host "Plan: $added add, $modified modify, $unchanged unchanged. Nothing was written."
    if ($lineEndingOnly -gt 0) {
        Write-Host ("Note: {0} of the modifications differ only in line endings (CRLF vs LF); content is identical." -f $lineEndingOnly)
    }
    return
}

if (-not $ApprovedBy.Trim()) {
    throw 'Apply requires a non-empty -ApprovedBy name.'
}

$dirty = & git -C $resolvedSource status --porcelain 2>$null
if ($dirty -and -not $AllowDirty) {
    throw "Source repository has uncommitted changes. Commit the release, or pass -AllowDirty for a throwaway test target."
}

$releaseId = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$backupDir = Join-Path $backupRoot $releaseId
$payloadDir = Join-Path $backupDir 'files'
$manifestPath = Join-Path $backupDir 'manifest.json'
New-Item -ItemType Directory -Force -Path $payloadDir | Out-Null

$changes = @($planItems | Where-Object { $_.Action -ne 'unchanged' })

# Prepare, record, then mutate. Every before-image and the manifest that names
# them are on disk before the first installation target file is touched, so an
# apply that dies part way through still leaves a usable record beside it.
$records = [System.Collections.Generic.List[object]]::new()
foreach ($item in $changes) {
    if ($item.BeforeExists) {
        $backupFile = Join-Path $payloadDir ($item.Relative -replace '/', [IO.Path]::DirectorySeparatorChar)
        $backupParent = Split-Path $backupFile -Parent
        if (-not (Test-Path -LiteralPath $backupParent)) { New-Item -ItemType Directory -Force -Path $backupParent | Out-Null }
        Copy-Item -LiteralPath $item.Target -Destination $backupFile -Force
    }
    $records.Add([pscustomobject]@{
        relative        = $item.Relative
        action          = $item.Action
        lineEndingsOnly = [bool]$item.LineEndingsOnly
        beforeExisted   = $item.BeforeExists
        beforeHash      = $item.TargetHash
        afterHash       = $item.SourceHash
    })
}

$head = (& git -C $resolvedSource rev-parse HEAD 2>$null)
$manifest = [pscustomobject]@{
    backupId   = $releaseId
    sourceRoot = $resolvedSource
    sourceHead = if ($head) { $head.Trim() } else { $null }
    targetRoot = $resolvedTarget
    approvedBy = $ApprovedBy
    phase      = 'prepared'
    preparedAt = [DateTime]::UtcNow.ToString('o')
    appliedAt  = $null
    files      = $records
}

Write-Manifest -Path $manifestPath -Data $manifest

$written = 0
try {
    foreach ($item in $changes) {
        $targetParent = Split-Path $item.Target -Parent
        if (-not (Test-Path -LiteralPath $targetParent)) { New-Item -ItemType Directory -Force -Path $targetParent | Out-Null }
        Copy-Item -LiteralPath $item.Source -Destination $item.Target -Force
        $written++
    }
}
catch {
    Write-Host "Apply failed after $written file(s) were written."
    Write-Host "The pre-apply backup and manifest are saved: $manifestPath"
    # The target is named explicitly: a bare -Rollback without it would resolve
    # to the default target, which is the live Codex home.
    Write-Host ("Recover with: pwsh -File {0} -Rollback -BackupId {1} -TargetRoot {2}" -f `
            (Format-QuotedLiteral -Text $PSCommandPath), $releaseId, (Format-QuotedLiteral -Text $resolvedTarget))
    throw
}

$manifest.phase = 'complete'
$manifest.appliedAt = [DateTime]::UtcNow.ToString('o')
Write-Manifest -Path $manifestPath -Data $manifest

Write-Host "Applied $written file(s). Backup id: $releaseId"
Write-Host "Manifest: $manifestPath"
