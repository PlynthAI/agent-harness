#Requires -Version 7.0
<#
.SYNOPSIS
    SessionStart hook: keeps the session's environment script short enough for
    Git Bash on Windows.

.DESCRIPTION
    Claude Code builds every Bash tool call as one `bash -c` string that inlines
    the session environment script: the concatenation of every
    <claude home>\session-env\<session id>\*.sh file that SessionStart hooks
    wrote through CLAUDE_ENV_FILE. On Windows, Git Bash silently truncates a
    `-c` string past about 8,190 characters, after which every Bash call fails
    with "syntax error: unexpected end of file" or "unexpected EOF while
    looking for matching", whatever the command.

    Hooks that append on every SessionStart event (startup, resume, compact)
    without checking what is already there grow that script by a few hundred
    bytes per event; the Codex plugin's session-lifecycle hook writes three
    export lines each time. A session resumed and compacted a few dozen times
    crosses the limit.

    This hook runs on every SessionStart event and rewrites each file in the
    session's session-env folder to its distinct non-blank lines, first
    occurrence kept, order preserved. It writes nothing when nothing repeats,
    never creates the folder, touches no other session, and exits 0 in every
    case. Order among SessionStart hooks is not guaranteed, so a file can hold
    at most one repeat of a hook's lines after this runs: bounded, not zero.

    Deployed by claude/sync-claude.ps1 to <claude home>\hooks and registered
    there as a SessionStart hook for every source.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
    $raw = [Console]::In.ReadToEnd()
    $sessionId = $null
    if ($raw -and $raw.Trim()) {
        $payload = $raw | ConvertFrom-Json -AsHashtable
        if ($payload -is [Collections.IDictionary] -and $payload.Contains('session_id')) { $sessionId = [string]$payload['session_id'] }
    }
    if (-not $sessionId -or $sessionId -notmatch '^[A-Za-z0-9][A-Za-z0-9_.-]*$') { exit 0 }

    $claudeHome = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME '.claude' }
    $folder = Join-Path (Join-Path $claudeHome 'session-env') $sessionId
    if (-not (Test-Path -LiteralPath $folder -PathType Container)) { exit 0 }

    $trimmed = [Collections.Generic.List[string]]::new()
    foreach ($file in Get-ChildItem -LiteralPath $folder -File -Filter '*.sh') {
        $text = [IO.File]::ReadAllText($file.FullName)
        if (-not $text) { continue }
        $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
        $kept = [Collections.Generic.List[string]]::new()
        $total = 0
        foreach ($line in $text -split "`r?`n") {
            if ($line.Trim() -eq '') { continue }
            $total++
            if ($seen.Add($line)) { $kept.Add($line) }
        }
        if ($kept.Count -eq $total) { continue }
        [IO.File]::WriteAllText($file.FullName, (($kept -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
        $trimmed.Add("$($file.Name) $total -> $($kept.Count) lines")
    }
    if ($trimmed.Count) { Write-Output "Trimmed repeated session environment lines: $($trimmed -join '; ')" }
} catch {
    # A hook failure must never stop a session from starting.
}
exit 0
