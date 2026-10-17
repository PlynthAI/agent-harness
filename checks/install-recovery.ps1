#Requires -Version 7.0
<#
.SYNOPSIS
    Isolated recovery check for the harness installer.

.DESCRIPTION
    Installs into throwaway targets and models what the installer promises when
    an apply is interrupted part way through:

      * a target with a path-type conflict fails during the apply, after earlier
        files have already been written;
      * the interrupted release is still discoverable with -ListBackups and
        -Rollback restores the file that was overwritten, removes the files that
        were added, and leaves unrelated content and the conflicting path
        exactly as the owner had them;
      * a clean apply verifies against the source and rolls back both a replaced
        file and the added files;
      * -Plan writes nothing, and does not create the target directory.

    Every fixture is disposable and lives under one sandbox directory, which is
    removed at the end. Cleanup validates that an absolute path resolves inside
    that sandbox before removing it, so a mistyped path cannot delete anything
    else. -Keep leaves the sandbox in place for inspection.

    -InstallerPath points the fixtures at another revision's install.ps1, which
    is how the pre-repair failure was reproduced; the surrounding config map is
    read from the checkout beside the check.

    Coverage limits. Rollback restores files, not directory timestamps: a
    release that created directories can leave empty ones behind, and that is
    not asserted here. Default-home checks override the child environment with
    a disposable HOME or USERPROFILE; no fixture uses the live Codex home.
#>
[CmdletBinding()]
param(
    [string]$SandboxRoot,
    [string]$InstallerPath,
    [switch]$Keep,
    [switch]$Quiet
)

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

function Get-Property {
    param([object]$Object, [string]$Name)
    if ($null -eq $Object) { return $null }
    if ($Object.PSObject.Properties.Name -contains $Name) { return $Object.$Name }
    return $null
}

$harnessRoot = Split-Path $PSScriptRoot -Parent
$installer = if ($InstallerPath) { (Resolve-Path -LiteralPath $InstallerPath).Path } else { Join-Path $PSScriptRoot 'install.ps1' }
if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) { throw "install.ps1 not found: $installer" }
$verifier = Join-Path $PSScriptRoot 'verify.ps1'
if (-not (Test-Path -LiteralPath $verifier -PathType Leaf)) { throw "verify.ps1 not found: $verifier" }

# Everything this check writes lives under one sandbox, and the sandbox is
# refused if it already exists, so a run cannot overwrite earlier work.
$createdSandbox = -not $SandboxRoot
$sandbox = if ($SandboxRoot) {
    [IO.Path]::GetFullPath($SandboxRoot)
}
else {
    Join-Path ([IO.Path]::GetTempPath()) ("harness-install-recovery-" + [Guid]::NewGuid().ToString('N').Substring(0, 8))
}
if (Test-Path -LiteralPath $sandbox) { throw "Refusing to run: $sandbox already exists. Remove it or choose another -SandboxRoot." }

$ownedRoot = [IO.Path]::GetFullPath($sandbox).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
New-Item -ItemType Directory -Force -Path $ownedRoot | Out-Null

function Remove-OwnedTree {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $full = [IO.Path]::GetFullPath($Path)
    $comparison = if ($IsWindows) { [StringComparison]::OrdinalIgnoreCase } else { [StringComparison]::Ordinal }
    $insideOwned = $full.Equals($ownedRoot, $comparison) -or
        $full.StartsWith($ownedRoot + [IO.Path]::DirectorySeparatorChar, $comparison)
    if (-not $insideOwned) {
        throw "Refusing to remove ${full}: it is not inside the owned sandbox $ownedRoot."
    }
    Remove-Item -LiteralPath $full -Recurse -Force
}

# A failed child command prints to stderr; merging the streams while the
# preference is Continue captures that text without turning it into a
# terminating error in this check.
function Invoke-PwshFile {
    param([string]$ScriptPath, [string[]]$Arguments)
    $saved = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $exit = -1
    try {
        $lines = & pwsh -NoProfile -ExecutionPolicy Bypass -File $ScriptPath @Arguments 2>&1
        $exit = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $saved
    }
    [pscustomobject]@{ Exit = $exit; Text = ($lines | Out-String) }
}

function Invoke-Installer {
    param([string[]]$Arguments)
    Invoke-PwshFile -ScriptPath $script:installer -Arguments $Arguments
}

# A release that was never recorded has no id to roll back. Reporting that as a
# failed call keeps the assertions below readable, and avoids handing pwsh an
# unbindable argument for a mandatory parameter.
function Invoke-Rollback {
    param([string]$Target, [string]$BackupId)
    if (-not $BackupId) {
        return [pscustomobject]@{ Exit = 1; Text = 'no release was recorded for this target' }
    }
    Invoke-Installer -Arguments @('-Rollback', '-BackupId', $BackupId, '-TargetRoot', $Target, '-SourceRoot', $harnessRoot)
}

function Get-Records {
    param([object]$Manifest)
    @(Get-Property -Object $Manifest -Name 'files' | Where-Object { $null -ne $_ })
}

function Invoke-Install {
    param([string]$Action, [string]$Target, [switch]$AllowDirty)
    $arguments = @($Action, '-TargetRoot', $Target, '-SourceRoot', $harnessRoot)
    if ($Action -eq '-Apply') { $arguments += @('-ApprovedBy', 'isolated install-recovery check') }
    if ($AllowDirty) { $arguments += '-AllowDirty' }
    Invoke-Installer -Arguments $arguments
}

# The files a target holds, ignoring the backup tree the installer owns.
function Get-TargetFiles {
    param([string]$Target)
    if (-not (Test-Path -LiteralPath $Target)) { return @() }
    @(Get-ChildItem -LiteralPath $Target -Recurse -File -Force |
        ForEach-Object { $_.FullName.Substring($Target.Length).TrimStart('\', '/') } |
        Where-Object { -not $_.StartsWith('.harness-backup', [StringComparison]::OrdinalIgnoreCase) } |
        Sort-Object)
}

function Get-OnlyManifest {
    param([string]$Target)
    $backupRoot = Join-Path $Target '.harness-backup'
    if (-not (Test-Path -LiteralPath $backupRoot -PathType Container)) { return $null }
    $releases = @(Get-ChildItem -LiteralPath $backupRoot -Directory)
    if ($releases.Count -ne 1) { return $null }
    $path = Join-Path $releases[0].FullName 'manifest.json'
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $null }
    [pscustomobject]@{
        Id   = $releases[0].Name
        Path = $path
        Data = (Get-Content -Raw -LiteralPath $path | ConvertFrom-Json)
    }
}

Write-Host "Sandbox: $ownedRoot"
Write-Host "Installer: $installer"

Write-Host ''
Write-Host 'An interrupted apply stays recoverable'

# The target is seeded the way a real one looks: one file the release replaces,
# one path the release needs as a directory but the owner holds as a file, and
# one unrelated file. The install map reaches AGENTS.md, then agents\, then
# fails on skills\, so the failure lands after the first write succeeded.
$interruptedTarget = Join-Path $ownedRoot 'interrupted/target'
New-Item -ItemType Directory -Force -Path (Join-Path $interruptedTarget 'notes') | Out-Null
Set-Content -LiteralPath (Join-Path $interruptedTarget 'AGENTS.md') -Value "# local edit`n`nThe owner's own user-level instructions.`n" -Encoding utf8
Set-Content -LiteralPath (Join-Path $interruptedTarget 'skills') -Value "@echo off`nrem not a skills directory`n" -Encoding utf8
Set-Content -LiteralPath (Join-Path $interruptedTarget 'notes/personal.txt') -Value "keep me`n" -Encoding utf8
# The comparisons below are byte-for-byte against the target as the owner left
# it, so read each seed back rather than trusting the literal that wrote it.
$localAgents = [IO.File]::ReadAllText((Join-Path $interruptedTarget 'AGENTS.md'))
$conflictingSkills = [IO.File]::ReadAllText((Join-Path $interruptedTarget 'skills'))
$personalContent = [IO.File]::ReadAllText((Join-Path $interruptedTarget 'notes/personal.txt'))
$interruptedBefore = Get-TargetFiles -Target $interruptedTarget

$failed = Invoke-Install -Action '-Apply' -Target $interruptedTarget -AllowDirty
Assert-True ($failed.Exit -ne 0) 'the path-type conflict makes the apply fail'

$failureReport = [regex]::Match($failed.Text, 'Apply failed after (\d+) file\(s\) were written')
Assert-True $failureReport.Success 'the installer reports that the apply stopped part way through'
Assert-True ($failureReport.Success -and [int]$failureReport.Groups[1].Value -ge 1) 'at least one target file was already written when the failure happened'

$interruptedRelease = Get-OnlyManifest -Target $interruptedTarget
Assert-True ($null -ne $interruptedRelease) 'the interrupted apply left exactly one release directory with a manifest'

$interruptedManifest = if ($interruptedRelease) { $interruptedRelease.Data } else { $null }
$interruptedId = if ($interruptedRelease) { $interruptedRelease.Id } else { '' }
$interruptedRecords = @(Get-Records -Manifest $interruptedManifest)
Assert-True ($interruptedRecords.Count -ge 1) "the manifest records the files the release touched (found $($interruptedRecords.Count))"
Assert-True (@($interruptedRecords | Where-Object { $_.beforeExisted }).Count -ge 1) 'the manifest records a before-image for the file it replaced'
Assert-True (@($interruptedRecords | Where-Object { $_.action -eq 'add' }).Count -ge 1) 'the manifest records the files the release was adding'
Assert-True ((Get-Property -Object $interruptedManifest -Name 'phase') -eq 'prepared') 'the interrupted release is recorded as prepared, not complete'

$overwritten = [IO.File]::ReadAllText((Join-Path $interruptedTarget 'AGENTS.md'))
Assert-True ($overwritten -cne $localAgents) 'the failure happened after the earlier file had already been overwritten'
$releaseAgentsPath = Join-Path $ownedRoot 'release-AGENTS.md'
& node (Join-Path $harnessRoot 'config/compose-agents.mjs') $harnessRoot $releaseAgentsPath
$releaseAgents = [IO.File]::ReadAllText($releaseAgentsPath)
Assert-True ($overwritten -ceq $releaseAgents) 'the earlier write replaced the owner file with the release copy before the failure'

# The recovery hint must not be a bare -Rollback command: against a custom
# target that would silently resolve to the default target, the live install.
$hint = [regex]::Match($failed.Text, '(?m)^Recover with: (?<command>.+)$')
Assert-True ($hint.Success) 'the failure prints a recovery hint'
$hintCommand = if ($hint.Success) { $hint.Groups['command'].Value.ToLowerInvariant() } else { '' }
Assert-True ($hintCommand.Contains($interruptedTarget.ToLowerInvariant())) "the recovery hint names the target it belongs to ($interruptedTarget)"
Assert-True ($hintCommand.Contains($installer.ToLowerInvariant())) 'the recovery hint names the installer path it was run from'

$listed = Invoke-Install -Action '-ListBackups' -Target $interruptedTarget
Assert-True ($listed.Exit -eq 0) '-ListBackups succeeds against the interrupted target'
Assert-True ($interruptedId -and $listed.Text -match [regex]::Escape($interruptedId)) "the interrupted release is listed ($interruptedId)"
Assert-True ($listed.Text -notmatch '\(no manifest\)') 'the interrupted release is listed with its manifest, not as a manifest-less directory'

$recovered = Invoke-Rollback -Target $interruptedTarget -BackupId $interruptedId
Assert-True ($recovered.Exit -eq 0) '-Rollback accepts the interrupted release'
Assert-True ($recovered.Text -match '(?i)did not finish applying') 'rollback says the release it is restoring never finished'

$restoredAgents = [IO.File]::ReadAllText((Join-Path $interruptedTarget 'AGENTS.md'))
Assert-True ($restoredAgents -ceq $localAgents) 'rollback restores the file the interrupted apply had overwritten'
$preservedSkills = [IO.File]::ReadAllText((Join-Path $interruptedTarget 'skills'))
Assert-True ($preservedSkills -ceq $conflictingSkills) 'the conflicting path is left exactly as the owner had it'
Assert-True ([IO.File]::ReadAllText((Join-Path $interruptedTarget 'notes/personal.txt')) -ceq $personalContent) 'unrelated content survives the apply and the rollback'

$interruptedAdds = @($interruptedRecords | Where-Object { $_.action -eq 'add' })
$leftBehind = @($interruptedAdds | Where-Object { Test-Path -LiteralPath (Join-Path $interruptedTarget $_.relative) })
Assert-True ($leftBehind.Count -eq 0) "rollback removed every added file the release had recorded (left behind: $($leftBehind -join ', '))"

$interruptedAfter = Get-TargetFiles -Target $interruptedTarget
$interruptedDifference = @(Compare-Object -ReferenceObject $interruptedBefore -DifferenceObject $interruptedAfter)
Assert-True ($interruptedDifference.Count -eq 0) "the target holds exactly the files it held before the failed apply (differs by: $(($interruptedDifference | ForEach-Object { $_.InputObject }) -join ', '))"

Write-Host ''
Write-Host 'A completed apply still verifies and rolls back'

$cleanTarget = Join-Path $ownedRoot 'clean/target'
New-Item -ItemType Directory -Force -Path (Join-Path $cleanTarget 'notes') | Out-Null
Set-Content -LiteralPath (Join-Path $cleanTarget 'AGENTS.md') -Value "# previous release`n" -Encoding utf8
Set-Content -LiteralPath (Join-Path $cleanTarget 'notes/personal.txt') -Value "unrelated`n" -Encoding utf8
$previousRelease = [IO.File]::ReadAllText((Join-Path $cleanTarget 'AGENTS.md'))
$cleanPersonal = [IO.File]::ReadAllText((Join-Path $cleanTarget 'notes/personal.txt'))
# Existing operator controls must survive an ordinary harness copy unchanged.
New-Item -ItemType Directory -Path (Join-Path $cleanTarget 'rules') -Force | Out-Null
Set-Content -LiteralPath (Join-Path $cleanTarget 'rules/default.rules') -Value '# operator approvals' -Encoding utf8
Set-Content -LiteralPath (Join-Path $cleanTarget 'hooks.json') -Value '{"hooks":{}}' -Encoding utf8
$operatorRules = [IO.File]::ReadAllText((Join-Path $cleanTarget 'rules/default.rules'))
$operatorHooks = [IO.File]::ReadAllText((Join-Path $cleanTarget 'hooks.json'))

$applied = Invoke-Install -Action '-Apply' -Target $cleanTarget -AllowDirty
Assert-True ($applied.Exit -eq 0) 'a clean target applies successfully'
$appliedCount = [regex]::Match($applied.Text, 'Applied (\d+) file\(s\)')
Assert-True ($appliedCount.Success -and [int]$appliedCount.Groups[1].Value -ge 1) 'the completed apply reports the files it wrote'

$cleanRelease = Get-OnlyManifest -Target $cleanTarget
Assert-True ($null -ne $cleanRelease) 'the completed apply left a manifest'
$cleanManifest = if ($cleanRelease) { $cleanRelease.Data } else { $null }
$cleanId = if ($cleanRelease) { $cleanRelease.Id } else { '' }
Assert-True ((Get-Property -Object $cleanManifest -Name 'phase') -eq 'complete') 'the completed release is recorded as complete'

$verified = Invoke-PwshFile -ScriptPath $verifier -Arguments @('-TargetRoot', $cleanTarget, '-SourceRoot', $harnessRoot, '-Quiet')
Assert-True ($verified.Exit -eq 0) 'the installed copy verifies against the source'
Assert-True (Test-Path -LiteralPath (Join-Path $cleanTarget 'AGENTS.md') -PathType Leaf) 'the installed copy carries the installed instruction file'

Assert-True ([IO.File]::ReadAllText((Join-Path $cleanTarget 'rules/default.rules')) -ceq $operatorRules) 'default copy preserves operator approvals'
# The harness owns the user-level Codex hook registration: an approved release
# replaces hooks.json like any mapped file, keeping the previous copy in its
# backup, and installs the hook script it names but no optional hook module.
Assert-True ([IO.File]::ReadAllText((Join-Path $cleanTarget 'hooks.json')) -ceq [IO.File]::ReadAllText((Join-Path $harnessRoot 'hooks/hooks.json'))) 'default copy installs the harness hook registration as hooks.json'
$hooksBackup = Join-Path $cleanTarget ".harness-backup/$cleanId/files/hooks.json"
Assert-True ((Test-Path -LiteralPath $hooksBackup) -and [IO.File]::ReadAllText($hooksBackup) -ceq $operatorHooks) 'the hooks.json it replaced is kept in the release backup'
$installedHooks = @(Get-ChildItem -LiteralPath (Join-Path $cleanTarget 'hooks') -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object Name)
Assert-True ($installedHooks.Count -eq 1 -and $installedHooks[0] -eq 'compact-reload.ps1') "default copy installs the compaction hook script and no optional hook module or test (found: $($installedHooks -join ', '))"
$cleanRecords = @(Get-Records -Manifest $cleanManifest)
$cleanAdds = @($cleanRecords | Where-Object { $_.action -eq 'add' })
$cleanRollback = Invoke-Rollback -Target $cleanTarget -BackupId $cleanId
Assert-True ($cleanRollback.Exit -eq 0) 'a completed release rolls back'
Assert-True ([IO.File]::ReadAllText((Join-Path $cleanTarget 'AGENTS.md')) -ceq $previousRelease) 'rollback restores the replaced file'
$cleanLeftBehind = @($cleanAdds | Where-Object { Test-Path -LiteralPath (Join-Path $cleanTarget $_.relative) })
Assert-True ($cleanAdds.Count -ge 1 -and $cleanLeftBehind.Count -eq 0) "rollback removed the added files (left behind: $($cleanLeftBehind -join ', '))"
Assert-True ([IO.File]::ReadAllText((Join-Path $cleanTarget 'notes/personal.txt')) -ceq $cleanPersonal) 'rollback leaves unrelated content alone'
Assert-True ([IO.File]::ReadAllText((Join-Path $cleanTarget 'rules/default.rules')) -ceq $operatorRules) 'rollback preserves operator approvals'
Assert-True ([IO.File]::ReadAllText((Join-Path $cleanTarget 'hooks.json')) -ceq $operatorHooks) 'rollback restores the operator hook registrations'

Write-Host ''
Write-Host 'Plan still changes nothing'

$emptyTarget = Join-Path $ownedRoot 'plan/empty-target'
New-Item -ItemType Directory -Force -Path $emptyTarget | Out-Null
$planExisting = Invoke-Install -Action '-Plan' -Target $emptyTarget
Assert-True ($planExisting.Exit -eq 0) '-Plan succeeds against an existing empty target'
Assert-True ($planExisting.Text -match '(?m)^ADD\s+AGENTS\.md') 'the plan reports the work it would do, so the emptiness below is meaningful'
# The map entry with its own home belongs to config/deploy.ps1; this installer
# must not land it in the Codex home.
Assert-True ($planExisting.Text -notmatch '(?m)^ADD\s+rule\.json') 'the plan leaves out the map entry that installs outside the Codex home'
$planEntries = @(Get-ChildItem -LiteralPath $emptyTarget -Force)
Assert-True ($planEntries.Count -eq 0) "the plan created nothing in the target (found: $(($planEntries | ForEach-Object { $_.Name }) -join ', '))"

$absentTarget = Join-Path $ownedRoot 'plan/absent-target'
$planAbsent = Invoke-Install -Action '-Plan' -Target $absentTarget
Assert-True ($planAbsent.Exit -eq 0) '-Plan succeeds against a target that does not exist'
Assert-True (-not (Test-Path -LiteralPath $absentTarget)) 'the plan did not create the target directory'

Write-Host ''
Write-Host 'Default targets use the native home'
$nativeHome = Join-Path $ownedRoot 'native-home'
$nativeTarget = Join-Path $nativeHome '.codex'
$previousUserProfile = $env:USERPROFILE
$previousNativeHome = $env:HOME
try {
    $env:USERPROFILE = $null
    $env:HOME = $nativeHome
    $nativePlan = Invoke-Installer -Arguments @('-Plan', '-SourceRoot', $harnessRoot)
    Assert-True ($nativePlan.Exit -eq 0 -and $nativePlan.Text.Contains("Target: $nativeTarget")) 'without USERPROFILE the default install target is HOME/.codex'
    Assert-True (-not (Test-Path -LiteralPath $nativeHome)) 'planning the default target creates no home or installation directory'
    if ($IsWindows) {
        $windowsHome = Join-Path $ownedRoot 'windows-home'
        $env:USERPROFILE = $windowsHome
        $windowsPlan = Invoke-Installer -Arguments @('-Plan', '-SourceRoot', $harnessRoot)
        Assert-True ($windowsPlan.Exit -eq 0 -and $windowsPlan.Text.Contains("Target: $(Join-Path $windowsHome '.codex')")) 'the Windows default keeps USERPROFILE precedence over HOME'
    }
}
finally {
    $env:USERPROFILE = $previousUserProfile
    $env:HOME = $previousNativeHome
}

if ($Keep) {
    Write-Host ''
    Write-Host "Kept sandbox: $ownedRoot"
}
else {
    if ($createdSandbox) { Remove-OwnedTree -Path $ownedRoot }
    else {
        foreach ($scenario in @('interrupted', 'clean', 'plan')) { Remove-OwnedTree -Path (Join-Path $ownedRoot $scenario) }
    }
}

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host ("Install-recovery check passed: $checks assertion(s).")
}
else {
    Write-Host ("Install-recovery check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}

exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
