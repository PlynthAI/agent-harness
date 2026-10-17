#Requires -Version 7.0
<#
.SYNOPSIS
    The one route agents use to call codebase-memory-mcp.

.DESCRIPTION
    Runs the pinned binary that install.ps1 placed, against the owner-private
    cache install.ps1 prepared. CBM_CACHE_DIR is set for this process only.

      cbm.ps1 cli <tool> [--flag value ...]   one-shot tool call, then exit
      cbm.ps1 project <path>                  the project name the tool derives from a root path
      cbm.ps1 prune [-Apply]                  list (or, with -Apply, delete) indexes whose root no longer exists
      cbm.ps1 fresh [<root>] [-Refresh]       is the index of this worktree root present and current?

    `cli` adds --quiet unless an output option (--quiet, --progress, --verbose,
    --json) is given, so stdout carries only the result. There is no route to
    the MCP server, the daemon, config, install, update or uninstall: this
    wrapper starts nothing that outlives the call.

    `fresh <root>` binds the git worktree root to the project whose root_path
    it is and prints one line: state (fresh, stale or missing), project, root,
    indexed_at (UTC) and the reason. Stale means HEAD moved, or a file git
    lists (tracked or untracked, not ignored) was written, at or after
    indexed_at; a tracked or git-rm'd file that is gone counts by its folder's
    time, and a listed folder written since (an entry added or removed, such
    as a deleted untracked file) counts too. Exit 0
    fresh, 1 stale or missing, 2 usage. -Refresh runs index_repository for a
    stale or missing root and reports again; it never re-indexes a fresh one.
    Without a root it lists every indexed project the same way and exits 0; a
    root that is gone is root-missing (see prune), one on an absent volume is
    volume-unavailable, and one git cannot read is unchecked. One binary call
    for an indexed root, two for a missing one, plus two for a refresh; the
    listing makes one plus one per project whose root exists.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$version = (Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'VERSION')).Trim()
$exe = $null
$outputOptions = @('--quiet', '--progress', '--verbose', '--json')

function Show-Usage {
    Write-Host 'Usage:'
    Write-Host '  cbm.ps1 cli <tool> [--flag value ...]'
    Write-Host '  cbm.ps1 project <absolute-root-path>'
    Write-Host '  cbm.ps1 prune [-Apply]'
    Write-Host '  cbm.ps1 fresh [<absolute-worktree-root>] [-Refresh]'
}

function Exit-Usage {
    param([string]$Message)
    [Console]::Error.WriteLine($Message)
    Show-Usage
    exit 2
}

# The tool names a project after its root path: the drive letter and each path
# segment joined by '-', with the colon dropped and characters outside
# [A-Za-z0-9._-] replaced by '-'. list_projects stays the authority.
function Get-ProjectName {
    param([string]$Path)
    $full = [IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
    $segments = $full -replace ':', '' -split '[\\/]+' | Where-Object { $_ }
    return (($segments -join '-') -replace '[^A-Za-z0-9._-]', '-')
}

function Assert-Installed {
    if (-not $IsWindows -or -not $env:LOCALAPPDATA) {
        [Console]::Error.WriteLine('The starter pack installs the Windows release only.')
        exit 3
    }
    $script:exe = Join-Path $env:LOCALAPPDATA "Programs\codebase-memory-mcp\$version\codebase-memory-mcp.exe"
    $cacheDir = Join-Path $env:LOCALAPPDATA 'codebase-memory-mcp\cache'
    if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) {
        [Console]::Error.WriteLine("codebase-memory-mcp $version is not installed. Run install.ps1 beside this script once per machine.")
        exit 3
    }
    # Without the prepared cache the tool would create one with its watcher and
    # UI defaults switched on. install.ps1 writes the marker only after the
    # owner-only DACL and those settings are in place.
    $marker = Join-Path $cacheDir '.starter-ready'
    if (-not (Test-Path -LiteralPath $marker -PathType Leaf) -or (Get-Content -Raw -LiteralPath $marker).Trim() -ne $version) {
        [Console]::Error.WriteLine("The prepared cache $cacheDir is missing or incomplete for $version. Run install.ps1 beside this script.")
        exit 3
    }
    $env:CBM_CACHE_DIR = $cacheDir
}

function Invoke-Tool {
    param([string[]]$Arguments)
    $prior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & $exe cli --quiet @Arguments 2>&1 | ForEach-Object { "$_" }
        [pscustomobject]@{ Exit = $LASTEXITCODE; Output = ($output -join "`n") }
    } finally { $ErrorActionPreference = $prior }
}

function Get-IndexedProjects {
    $projects = [System.Collections.Generic.List[object]]::new()
    $offset = 0
    do {
        $result = Invoke-Tool @('list_projects', '--format', 'json', '--limit', '200', '--offset', "$offset")
        if ($result.Exit -ne 0) { throw "list_projects failed: $($result.Output)" }
        $json = $result.Output.Substring($result.Output.IndexOf('{')) | ConvertFrom-Json
        foreach ($project in @($json.projects)) { $projects.Add($project) }
        $offset += [int]$json.returned
    } while ($json.has_more -and [int]$json.returned -gt 0)
    return $projects
}

# The tool records roots with forward slashes. Two roots are the same when they
# match after slash direction and, for a Windows drive path, case.
function ConvertTo-RootKey {
    param([string]$Path)
    $key = ($Path -replace '\\', '/').TrimEnd('/')
    if ($key -match '^[A-Za-z]:') { $key = $key.ToLowerInvariant() }
    return $key
}

function ConvertTo-NativePath {
    param([string]$Path)
    if ($Path -notmatch '^[A-Za-z]:') { return $Path }
    $native = $Path -replace '/', '\'
    if ($native.Length -gt 3) { $native = $native.TrimEnd('\') }
    return $native
}

function Format-Utc {
    param([datetime]$Time)
    return $Time.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
}

# Git output is read as UTF-8 through a pipe, so the console code page neither
# garbles paths nor gets changed for the caller.
function Invoke-Git {
    param([string]$Root, [string[]]$Arguments)
    $info = [Diagnostics.ProcessStartInfo]::new('git')
    foreach ($argument in @('-C', $Root, '-c', 'core.quotepath=off') + $Arguments) { $info.ArgumentList.Add($argument) }
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = [Text.UTF8Encoding]::new($false)
    $process = [Diagnostics.Process]::Start($info)
    $errors = $process.StandardError.ReadToEndAsync()
    $output = $process.StandardOutput.ReadToEnd()
    $process.WaitForExit()
    [pscustomobject]@{ Exit = $process.ExitCode; Output = $output; Errors = $errors.Result }
}

# index_status for one project, or $null when the tool has no such project.
function Get-IndexStatus {
    param([string]$Name)
    $result = Invoke-Tool @('index_status', '--project', $Name, '--format', 'json')
    $start = $result.Output.IndexOf('{')
    if ($start -lt 0) { throw "index_status $Name failed: $($result.Output)" }
    $json = $result.Output.Substring($start) | ConvertFrom-Json
    if ($json.PSObject.Properties['error']) {
        if ("$($json.error)" -match 'not found') { return $null }
        throw "index_status $Name failed: $($json.error)"
    }
    if ($result.Exit -ne 0) { throw "index_status $Name failed: $($result.Output)" }
    return $json
}

# The project whose root_path is this root. The derived name answers in one
# call when the tool named the root that way; otherwise list_projects decides.
function Find-ProjectStatus {
    param([string]$Root)
    $key = ConvertTo-RootKey $Root
    $status = Get-IndexStatus (Get-ProjectName $Root)
    if ($status -and (ConvertTo-RootKey $status.root_path) -eq $key) { return $status }
    $project = @(Get-IndexedProjects | Where-Object { (ConvertTo-RootKey $_.root_path) -eq $key }) | Select-Object -First 1
    if (-not $project) { return $null }
    return Get-IndexStatus $project.name
}

# Why the worktree differs from an index taken at $Since, or $null when git
# cannot read it. indexed_at has whole seconds, so a change in that same second
# counts as after it.
function Get-ChangeReasons {
    param([string]$Root, [datetime]$Since)
    $reasons = [System.Collections.Generic.List[string]]::new()
    # The newest HEAD reflog entry covers commit, checkout, pull, rebase and reset.
    $reflog = Invoke-Git $Root @('reflog', '-1', '--date=unix', '--format=%gd', 'HEAD')
    if ($reflog.Exit -eq 0 -and $reflog.Output -match '@\{(\d+)\}') {
        $moved = [DateTimeOffset]::FromUnixTimeSeconds([long]$Matches[1]).UtcDateTime
        if ($moved -ge $Since) { $reasons.Add("HEAD moved at $(Format-Utc $moved)") }
    }
    # Tracked files gone from disk stay in --cached; a staged deletion (git rm)
    # leaves the index, so only the diff against HEAD still names it.
    $listed = Invoke-Git $Root @('ls-files', '--cached', '--others', '--exclude-standard', '-z')
    if ($listed.Exit -ne 0) { return $null }
    $removed = Invoke-Git $Root @('diff', '--cached', '--name-only', '-z', '--diff-filter=D')
    $paths = $listed.Output.Split([char]0) + $(if ($removed.Exit -eq 0) { $removed.Output.Split([char]0) })
    $seen = [System.Collections.Generic.HashSet[string]]::new()
    $folders = [System.Collections.Generic.HashSet[string]]::new()
    $explained = [System.Collections.Generic.HashSet[string]]::new()
    $changed = 0
    $newest = $null
    $newestTime = [datetime]::MinValue
    foreach ($relative in $paths) {
        if (-not $relative -or -not $seen.Add($relative)) { continue }
        $cut = $relative.LastIndexOf('/')
        $folder = if ($cut -lt 0) { '' } else { $relative.Substring(0, $cut) }
        $time = [IO.File]::GetLastWriteTimeUtc([IO.Path]::Combine($Root, $relative))
        if ($time.Year -eq 1601) {
            # A missing file reports 1601. Deleting it touched the nearest
            # folder that still exists.
            while ($folder -and -not [IO.Directory]::Exists([IO.Path]::Combine($Root, $folder))) {
                $cut = $folder.LastIndexOf('/')
                $folder = if ($cut -lt 0) { '' } else { $folder.Substring(0, $cut) }
            }
            $time = [IO.Directory]::GetLastWriteTimeUtc([IO.Path]::Combine($Root, $folder))
        } else {
            [void]$folders.Add($folder)
        }
        if ($time -lt $Since) { continue }
        [void]$explained.Add($folder)
        $changed++
        if ($time -gt $newestTime) { $newestTime = $time; $newest = $relative }
    }
    if ($changed -gt 0) { $reasons.Add("$changed file$(if ($changed -ne 1) { 's' }) changed since, newest $newest") }

    # A deleted untracked file leaves no git record, but adding or removing an
    # entry updates its folder. Folders already explained by a file are skipped.
    $folderCount = 0
    $newestFolder = $null
    $newestTime = [datetime]::MinValue
    foreach ($folder in $folders) {
        if ($explained.Contains($folder)) { continue }
        $time = [IO.Directory]::GetLastWriteTimeUtc([IO.Path]::Combine($Root, $folder))
        if ($time -lt $Since) { continue }
        $folderCount++
        if ($time -gt $newestTime) { $newestTime = $time; $newestFolder = $(if ($folder) { $folder } else { '.' }) }
    }
    if ($folderCount -eq 1) { $reasons.Add("folder $newestFolder changed since (an entry was added or removed)") }
    elseif ($folderCount -gt 1) { $reasons.Add("$folderCount folders changed since (an entry was added or removed), newest $newestFolder") }
    return , $reasons
}

function Measure-Freshness {
    param([string]$Root, [string]$Name, $Status)
    $report = [pscustomobject]@{ State = 'missing'; Name = $Name; Root = $Root; Indexed = 'never'; Reason = 'no index has this root' }
    if (-not $Status) { return $report }
    $report.Name = $Status.project
    if (-not $Status.PSObject.Properties['indexed_at']) {
        $report.State = 'stale'; $report.Reason = "status $($Status.status), no indexed_at"
        return $report
    }
    # ConvertFrom-Json reads the tool's ISO 8601 'Z' value as a UTC DateTime.
    $indexedAt = ([datetime]$Status.indexed_at).ToUniversalTime()
    $report.Indexed = Format-Utc $indexedAt
    $reasons = Get-ChangeReasons $Root $indexedAt
    if ($null -eq $reasons) {
        $report.State = 'unchecked'; $report.Reason = 'root is not a git worktree'
    } elseif ($Status.status -ne 'ready') {
        $report.State = 'stale'; $report.Reason = (@("status $($Status.status)") + $reasons) -join '; '
    } elseif ($reasons.Count -gt 0) {
        $report.State = 'stale'; $report.Reason = $reasons -join '; '
    } else {
        $report.State = 'fresh'; $report.Reason = 'unchanged since'
    }
    return $report
}

function Format-Freshness {
    param($Report)
    return "$($Report.State)  $($Report.Name)  $($Report.Root)  indexed $($Report.Indexed)  $($Report.Reason)"
}

$command = if ($args.Count -gt 0) { [string]$args[0] } else { '' }
$rest = @(if ($args.Count -gt 1) { $args[1..($args.Count - 1)] | ForEach-Object { [string]$_ } })

switch ($command) {
    'cli' {
        if ($rest.Count -eq 0) { Show-Usage; exit 2 }
        Assert-Installed
        $cliArgs = $rest
        if (@($rest | Where-Object { $outputOptions -contains $_ }).Count -eq 0) { $cliArgs = @('--quiet') + $rest }
        & $exe cli @cliArgs
        exit $LASTEXITCODE
    }
    'project' {
        if ($rest.Count -ne 1) { Show-Usage; exit 2 }
        Write-Output (Get-ProjectName $rest[0])
        exit 0
    }
    'prune' {
        $apply = $rest -contains '-Apply'
        if (@($rest | Where-Object { $_ -ne '-Apply' }).Count -gt 0) { Show-Usage; exit 2 }
        Assert-Installed
        # A root on a disconnected drive or share is unavailable, not retired:
        # only a missing path on an available volume counts as stale.
        $stale = [System.Collections.Generic.List[object]]::new()
        foreach ($project in Get-IndexedProjects) {
            if (Test-Path -LiteralPath $project.root_path) { continue }
            $volume = [IO.Path]::GetPathRoot($project.root_path)
            if (-not $volume -or -not (Test-Path -LiteralPath $volume)) {
                Write-Output "skipped  $($project.name)  ($($project.root_path): volume unavailable)"
                continue
            }
            $stale.Add($project)
        }
        if ($stale.Count -eq 0) { Write-Output 'No stale indexes.'; exit 0 }
        foreach ($project in $stale) {
            if ($apply) {
                # Recheck just before deleting: the volume may have returned.
                if (Test-Path -LiteralPath $project.root_path) {
                    Write-Output "kept     $($project.name)  ($($project.root_path) is present again)"
                    continue
                }
                $result = Invoke-Tool @('delete_project', '--project', $project.name)
                if ($result.Exit -ne 0) { throw "delete_project $($project.name) failed: $($result.Output)" }
                Write-Output "deleted  $($project.name)  ($($project.root_path))"
            } else {
                Write-Output "stale    $($project.name)  ($($project.root_path))"
            }
        }
        if (-not $apply) { Write-Output "Dry run: $($stale.Count) stale index(es). Re-run with -Apply to delete them." }
        exit 0
    }
    'fresh' {
        $refresh = $rest -contains '-Refresh'
        $roots = @($rest | Where-Object { $_ -ne '-Refresh' })
        if ($roots.Count -gt 1) { Exit-Usage 'fresh takes at most one worktree root.' }
        if ($roots.Count -eq 0) {
            if ($refresh) { Exit-Usage 'fresh -Refresh needs the worktree root to refresh.' }
            Assert-Installed
            foreach ($project in Get-IndexedProjects) {
                $projectRoot = ConvertTo-NativePath $project.root_path
                if (Test-Path -LiteralPath $projectRoot) {
                    Write-Output (Format-Freshness (Measure-Freshness $projectRoot $project.name (Get-IndexStatus $project.name)))
                    continue
                }
                # As prune decides: a missing root on an available volume is retired.
                $volume = [IO.Path]::GetPathRoot($projectRoot)
                $state, $reason = if (-not $volume -or -not (Test-Path -LiteralPath $volume)) { 'volume-unavailable', 'volume unavailable; prune keeps it' } else { 'root-missing', 'root no longer exists; run prune' }
                Write-Output "$state  $($project.name)  $projectRoot  indexed unread  $reason"
            }
            exit 0
        }

        # Resolved against the caller's location, which a .NET path API ignores.
        $root = ConvertTo-NativePath $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($roots[0])
        if (-not (Test-Path -LiteralPath $root -PathType Container)) { Exit-Usage "fresh needs an existing directory: $root" }
        $toplevel = Invoke-Git $root @('rev-parse', '--show-toplevel')
        if ($toplevel.Exit -ne 0) { Exit-Usage "$root is not inside a git worktree." }
        $toplevel = ConvertTo-NativePath $toplevel.Output.Trim()
        if ((ConvertTo-RootKey $toplevel) -ne (ConvertTo-RootKey $root)) { Exit-Usage "$root is not a worktree root; pass $toplevel instead." }
        Assert-Installed

        $status = Find-ProjectStatus $root
        $report = Measure-Freshness $root (Get-ProjectName $root) $status
        Write-Output (Format-Freshness $report)
        if ($report.State -eq 'fresh') {
            if ($refresh) { Write-Output 'Already fresh; not re-indexed.' }
            exit 0
        }
        if (-not $refresh) {
            Write-Output "Refresh: pwsh -NoProfile -File `"$PSCommandPath`" fresh `"$root`" -Refresh"
            exit 1
        }
        # Re-index under the root the tool already knows, so its name is kept.
        $repoPath = if ($status) { ConvertTo-NativePath $status.root_path } else { $root }
        $result = Invoke-Tool @('index_repository', '--repo-path', $repoPath)
        $start = $result.Output.IndexOf('{')
        $indexed = if ($start -ge 0) { $result.Output.Substring($start) | ConvertFrom-Json } else { $null }
        if ($result.Exit -ne 0 -or -not $indexed -or $indexed.PSObject.Properties['error']) {
            [Console]::Error.WriteLine("index_repository failed for ${repoPath}: $($result.Output)")
            exit 1
        }
        $status = Get-IndexStatus $(if ($indexed.PSObject.Properties['project']) { $indexed.project } else { Get-ProjectName $root })
        if (-not $status -or (ConvertTo-RootKey $status.root_path) -ne (ConvertTo-RootKey $root)) { $status = Find-ProjectStatus $root }
        $report = Measure-Freshness $root (Get-ProjectName $root) $status
        Write-Output (Format-Freshness $report)
        exit $(if ($report.State -eq 'fresh') { 0 } else { 1 })
    }
    { $_ -in @('', 'help', '-h', '--help') } { Show-Usage; exit $(if ($command) { 0 } else { 2 }) }
    default {
        [Console]::Error.WriteLine("Unsupported subcommand '$command'. This wrapper runs one-shot tool calls only; there is no daemon, MCP server, config, install, update or uninstall route.")
        Show-Usage
        exit 2
    }
}
