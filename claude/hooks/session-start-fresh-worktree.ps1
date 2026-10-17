#Requires -Version 7.0
<#
.SYNOPSIS
    SessionStart hook: brings a new Claude-made worktree up to date with origin.

.DESCRIPTION
    Claude creates a worktree from the cached origin/HEAD and fetches only when
    the repository has not been fetched for 24 hours, so a new session can start
    hours behind the default branch. This hook runs at session start and, only
    in a linked worktree under a Claude worktree root (the Claude home's
    worktrees folder, following its link, or <main checkout>\.claude\worktrees):

      - fetches the default branch from origin (origin/HEAD, else main), with a
        short timeout; a failed fetch is reported in one line and nothing else
        happens;
      - fast-forwards when the tree is clean (untracked files included) and the
        checkout has no commits of its own;
      - otherwise reports how far behind it is, touching nothing.

    It never resets, stashes, checks out or touches a dirty tree, and exits 0 in
    every case so a session never fails to start because of it. Anything it
    prints goes into Claude's context, one line at most.

    Deployed by claude/sync-claude.ps1 to <claude home>\hooks and registered
    there as a SessionStart hook for new sessions.
#>
[CmdletBinding()]
param([int]$FetchTimeoutSeconds = 5)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-NormalPath([string]$Path) {
    return [IO.Path]::GetFullPath($Path.Replace('/', '\')).TrimEnd('\')
}

function Test-UnderRoot([string]$Path, [string]$Root) {
    return (Get-NormalPath $Path).StartsWith((Get-NormalPath $Root) + '\', [StringComparison]::OrdinalIgnoreCase)
}

# Runs git in the session's directory without a console prompt. A timed-out
# call is killed with its whole process tree; a negative timeout waits.
function Invoke-Git([string[]]$Arguments, [int]$TimeoutMs = 5000) {
    $info = [Diagnostics.ProcessStartInfo]::new('git')
    foreach ($argument in @('-C', $script:directory) + $Arguments) { $info.ArgumentList.Add($argument) }
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.Environment['GIT_TERMINAL_PROMPT'] = '0'
    $info.Environment['GCM_INTERACTIVE'] = 'never'
    $process = [Diagnostics.Process]::Start($info)
    $process.StandardInput.Close()
    $out = $process.StandardOutput.ReadToEndAsync()
    $err = $process.StandardError.ReadToEndAsync()
    if (-not $process.WaitForExit($TimeoutMs)) {
        try { $process.Kill($true) } catch { }
        return [pscustomobject]@{ Ok = $false; Out = ''; Err = 'timed out' }
    }
    $process.WaitForExit()
    return [pscustomobject]@{ Ok = ($process.ExitCode -eq 0); Out = $out.Result.Trim(); Err = $err.Result.Trim() }
}

function Format-Commits([int]$Count) {
    return "$Count commit$(if ($Count -ne 1) { 's' })"
}

$recognised = $false
try {
    $hookInput = $null
    if ([Console]::IsInputRedirected) {
        # Claude writes the session JSON as UTF-8, whatever the console code page.
        $raw = [IO.StreamReader]::new([Console]::OpenStandardInput(), [Text.UTF8Encoding]::new($false)).ReadToEnd()
        if ($raw.Trim()) { try { $hookInput = $raw | ConvertFrom-Json } catch { } }
    }
    # The session's directory comes from the input; the hook's own working
    # directory, which Claude also sets to it, is the fallback.
    $script:directory = if ($hookInput -and $hookInput.PSObject.Properties['cwd'] -and $hookInput.cwd -and
        (Test-Path -LiteralPath "$($hookInput.cwd)" -PathType Container)) { "$($hookInput.cwd)" }
    else { (Get-Location).ProviderPath }

    # A linked worktree has its own git dir beside the shared common dir.
    $paths = Invoke-Git @('rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir', '--show-toplevel')
    if (-not $paths.Ok) { exit 0 }
    $gitDir, $commonDir, $topLevel = @($paths.Out -split "`r?`n")
    if (-not $topLevel -or (Get-NormalPath $gitDir) -ieq (Get-NormalPath $commonDir)) { exit 0 }

    # Only a worktree under a Claude worktree root is Claude's: the desktop
    # app's under the Claude home (whose worktrees folder may be a junction to
    # another drive) and the CLI's under the main checkout. A worktree the
    # operator made elsewhere is theirs.
    $claudeHome = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME '.claude' }
    $roots = [Collections.Generic.List[string]]::new()
    $roots.Add((Join-Path $claudeHome 'worktrees'))
    $link = Get-Item -LiteralPath $roots[0] -Force -ErrorAction SilentlyContinue
    if ($link -and $link.LinkTarget) {
        $target = "$($link.LinkTarget)"
        if (-not [IO.Path]::IsPathRooted($target)) { $target = Join-Path (Split-Path -Parent $link.FullName) $target }
        $roots.Add($target)
    }
    if ((Split-Path -Leaf $commonDir) -ieq '.git') { $roots.Add((Join-Path (Split-Path -Parent $commonDir) '.claude\worktrees')) }
    if (-not @($roots | Where-Object { (Test-UnderRoot $topLevel $_) -or (Test-UnderRoot $script:directory $_) })) { exit 0 }

    if (-not (Invoke-Git @('remote', 'get-url', 'origin')).Ok) { exit 0 }
    $recognised = $true

    $head = Invoke-Git @('symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD')
    $default = if ($head.Ok -and $head.Out -like 'origin/?*') { $head.Out.Substring(7) } else { 'main' }
    $upstream = "refs/remotes/origin/$default"

    $fetch = Invoke-Git @('fetch', '--quiet', '--no-tags', '--no-recurse-submodules', '--no-auto-maintenance', 'origin', $default) ($FetchTimeoutSeconds * 1000)
    if (-not $fetch.Ok -or -not (Invoke-Git @('rev-parse', '--verify', '--quiet', "$upstream^{commit}")).Ok) {
        Write-Output "could not fetch origin, working from the last fetched $default"
        exit 0
    }

    $behind = Invoke-Git @('rev-list', '--count', "HEAD..$upstream")
    $ahead = Invoke-Git @('rev-list', '--count', "$upstream..HEAD")
    if (-not $behind.Ok -or -not $ahead.Ok -or [int]$behind.Out -eq 0) { exit 0 }
    $behindCount = [int]$behind.Out

    $branchRef = Invoke-Git @('symbolic-ref', '--quiet', '--short', 'HEAD')
    $branch = if ($branchRef.Ok -and $branchRef.Out) { $branchRef.Out } else { 'detached HEAD' }

    # Clean means nothing staged, changed or untracked. A status that fails or
    # times out counts as dirty, so the tree is left alone.
    $status = Invoke-Git @('--no-optional-locks', 'status', '--porcelain', '--untracked-files=normal')
    $clean = $status.Ok -and -not $status.Out
    if ($clean -and [int]$ahead.Out -eq 0) {
        # A fast-forward is never killed part way; the hook's own timeout bounds it.
        $merge = Invoke-Git @('merge', '--ff-only', '--quiet', $upstream) -TimeoutMs -1
        if ($merge.Ok) {
            $short = (Invoke-Git @('rev-parse', '--short', 'HEAD')).Out
            Write-Output "Fast-forwarded $branch by $(Format-Commits $behindCount) to origin/$default ($short)."
            exit 0
        }
    }
    Write-Output "$branch is $(Format-Commits $behindCount) behind origin/$default; sync before starting (the desktop app's sync_with_base_branch tool, or merge origin/$default)"
    exit 0
}
catch {
    if ($recognised) { Write-Output "could not check this worktree against origin: $($_.Exception.Message)" }
    exit 0
}
