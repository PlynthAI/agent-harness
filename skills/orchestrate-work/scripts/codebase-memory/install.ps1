#Requires -Version 7.0
<#
.SYNOPSIS
    Installs the pinned codebase-memory-mcp release once per machine.

.DESCRIPTION
    Places the release named by VERSION and pinned by assets.json under
    %LOCALAPPDATA%\Programs\codebase-memory-mcp\<version>\ and prepares the
    owner-private index cache %LOCALAPPDATA%\codebase-memory-mcp\cache with the
    file watcher, auto-watch and the HTTP UI switched off.

    The archive is verified against the pinned SHA-256 before anything is
    extracted, whether it was downloaded or supplied with -Mirror. Only the
    binary and its two licence files are installed; the vendor installer in
    the archive is never placed or run, and neither is the binary's own
    `install` or `update` command, so no agent configuration, PATH entry or
    resident process is created.

    Re-running is safe: a current install reports "Nothing to do".

.PARAMETER Mirror
    A local copy of the release zip. It is verified exactly like a download;
    no network access happens when it is given.
#>
[CmdletBinding()]
param([string]$Mirror)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $IsWindows) { throw 'This starter pack installs the Windows release only.' }

$version = (Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'VERSION')).Trim()
$pins = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'assets.json') | ConvertFrom-Json
$arch = if ([Runtime.InteropServices.RuntimeInformation]::OSArchitecture -eq 'Arm64') { 'arm64' } else { 'amd64' }
$asset = $pins.assets.PSObject.Properties["windows-$arch"]
if (-not $asset) { throw "No pinned asset for windows-$arch in assets.json." }
$asset = $asset.Value

$programsDir = Join-Path $env:LOCALAPPDATA "Programs\codebase-memory-mcp\$version"
$cacheDir = Join-Path $env:LOCALAPPDATA 'codebase-memory-mcp\cache'
$binName = 'codebase-memory-mcp.exe'
$exe = Join-Path $programsDir $binName
$watchKeys = @('watcher_enabled', 'auto_watch', 'ui_enabled')

# Every binary call below uses this cache, so the default cache under the user
# profile is never created. Process scope only; nothing persists.
$env:CBM_CACHE_DIR = $cacheDir

$actions = [System.Collections.Generic.List[string]]::new()

function Invoke-Binary {
    param([string]$Path, [string[]]$Arguments)
    $prior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $global:LASTEXITCODE = 1
        $output = & $Path @Arguments 2>&1 | ForEach-Object { "$_" }
        [pscustomobject]@{ Exit = $LASTEXITCODE; Output = @($output) }
    } finally { $ErrorActionPreference = $prior }
}

function Test-BinaryVersion {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    $result = Invoke-Binary $Path @('--version')
    $expected = "codebase-memory-mcp $version"
    return ($result.Exit -eq 0 -and @($result.Output | Where-Object { $_.Trim() -eq $expected }).Count -eq 1)
}

function Assert-PinnedArchive {
    param([string]$Path)
    $actual = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $asset.sha256) {
        throw "SHA-256 mismatch for ${Path}: expected $($asset.sha256), got $actual. Nothing was installed."
    }
    Write-Host "Verified $($asset.name) SHA-256 $actual"
}

function Get-CurrentUserSid { [Security.Principal.WindowsIdentity]::GetCurrent().User }

# The binary refuses a cache whose DACL grants mutation rights to anyone but
# the owner. This is the vendor installer's pattern: a protected DACL with one
# owner FullControl rule and nothing inherited.
function Set-OwnerOnlyAcl {
    param([string]$Path)
    $owner = Get-CurrentUserSid
    $acl = [System.Security.AccessControl.DirectorySecurity]::new()
    $acl.SetAccessRuleProtection($true, $false)
    $acl.SetOwner($owner)
    $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new(
            $owner, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
    Set-Acl -LiteralPath $Path -AclObject $acl
}

function Test-OwnerOnlyAcl {
    param([string]$Path)
    $owner = (Get-CurrentUserSid).Value
    $acl = Get-Acl -LiteralPath $Path
    if (-not $acl.AreAccessRulesProtected) { return $false }
    $rules = @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
    $foreign = @($rules | Where-Object { $_.IdentityReference.Value -ne $owner -or $_.AccessControlType -ne 'Allow' })
    return ($rules.Count -gt 0 -and $foreign.Count -eq 0)
}

function Assert-ArchiveEntries {
    param([string]$Path)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $names = @($zip.Entries | ForEach-Object { $_.FullName })
        $expected = @($pins.archiveEntries)
        $unexpected = @($names | Where-Object { $expected -cnotcontains $_ })
        $missing = @($expected | Where-Object { $names -cnotcontains $_ })
        if ($unexpected.Count -or $missing.Count -or $names.Count -ne $expected.Count) {
            throw "Archive does not match the pinned entry list (unexpected: $($unexpected -join ', '); missing: $($missing -join ', '))."
        }
    } finally { $zip.Dispose() }
}

function Expand-InstalledFiles {
    param([string]$Archive, [string]$Destination)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    $zip = [System.IO.Compression.ZipFile]::OpenRead($Archive)
    try {
        foreach ($name in @($pins.installedFiles)) {
            $entry = $zip.GetEntry($name)
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $Destination $name), $true)
        }
    } finally { $zip.Dispose() }
}

# A recursive delete through a junction or symlink empties its target, so the
# directory and every ancestor must be ordinary folders.
function Remove-OwnedDirectory {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $current = Get-Item -LiteralPath $Path -Force
    while ($current) {
        if ($current.Attributes -band [IO.FileAttributes]::ReparsePoint) {
            throw "Refusing to delete $Path through a link at $($current.FullName)"
        }
        $current = $current.Parent
    }
    Remove-Item -LiteralPath $Path -Recurse -Force
}

Write-Host "codebase-memory-mcp $version (windows-$arch)"
Write-Host "  binary: $exe"
Write-Host "  cache:  $cacheDir"

# 1. A supplied mirror is verified first, even when nothing needs installing,
#    so a wrong file is always reported.
$mirrorPath = $null
if ($Mirror) {
    $mirrorPath = (Resolve-Path -LiteralPath $Mirror).Path
    Assert-PinnedArchive $mirrorPath
}

# 2. Binary.
$installedFilesPresent = @($pins.installedFiles | Where-Object { -not (Test-Path -LiteralPath (Join-Path $programsDir $_) -PathType Leaf) }).Count -eq 0
if (-not ($installedFilesPresent -and (Test-BinaryVersion $exe))) {
    $parent = Split-Path $programsDir -Parent
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    $staging = Join-Path $parent ".staging-$version-$([guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Path $staging | Out-Null
    try {
        $archive = $mirrorPath
        if (-not $archive) {
            $archive = Join-Path $staging $asset.name
            $url = "https://github.com/$($pins.repository)/releases/download/v$version/$($asset.name)"
            Write-Host "Downloading $url"
            Invoke-WebRequest -Uri $url -OutFile $archive -UseBasicParsing
            Assert-PinnedArchive $archive
        }
        Assert-ArchiveEntries $archive
        $candidateDir = Join-Path $staging 'out'
        Expand-InstalledFiles $archive $candidateDir
        if (-not (Test-BinaryVersion (Join-Path $candidateDir $binName))) {
            throw "The extracted binary did not report version $version."
        }
        # A version directory that failed the check above is an incomplete
        # earlier attempt of this script; replace it.
        Remove-OwnedDirectory $programsDir
        Move-Item -LiteralPath $candidateDir -Destination $programsDir
    } finally {
        Remove-OwnedDirectory $staging
    }
    if (-not (Test-BinaryVersion $exe)) { throw "Installed binary at $exe did not report version $version." }
    $actions.Add("installed $version to $programsDir")
}

# 3. Owner-private cache.
if (-not (Test-Path -LiteralPath $cacheDir -PathType Container)) {
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    Set-OwnerOnlyAcl $cacheDir
    $actions.Add("created owner-only cache $cacheDir")
} elseif (-not (Test-OwnerOnlyAcl $cacheDir)) {
    Set-OwnerOnlyAcl $cacheDir
    $actions.Add("reset cache DACL to owner-only")
}
if (-not (Test-OwnerOnlyAcl $cacheDir)) { throw "The cache DACL is not owner-only after hardening: $cacheDir" }

# 4. No watcher, no auto-watch, no HTTP UI. Settings persist in the cache.
foreach ($key in $watchKeys) {
    $current = Invoke-Binary $exe @('config', 'get', $key)
    if ($current.Exit -ne 0) { throw "config get $key failed: $($current.Output -join ' ')" }
    if (($current.Output | Select-Object -Last 1).Trim() -ne 'false') {
        $set = Invoke-Binary $exe @('config', 'set', $key, 'false')
        if ($set.Exit -ne 0) { throw "config set $key false failed: $($set.Output -join ' ')" }
        $actions.Add("set $key false")
    }
}

# 5. The marker cbm.ps1 requires: written only after every step above passed.
$marker = Join-Path $cacheDir '.starter-ready'
if (-not (Test-Path -LiteralPath $marker -PathType Leaf) -or (Get-Content -Raw -LiteralPath $marker).Trim() -ne $version) {
    Set-Content -LiteralPath $marker -Value $version -NoNewline
    $actions.Add("marked the cache ready for $version")
}

if ($actions.Count -eq 0) {
    Write-Host 'Nothing to do: the pinned binary, the owner-only cache and its settings are current.'
} else {
    $actions | ForEach-Object { Write-Host "  done: $_" }
    Write-Host "Installed. Use cbm.ps1 beside this script for every call."
}
