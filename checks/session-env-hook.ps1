#Requires -Version 7.0
<#
.SYNOPSIS
    Exercises the session-env trim SessionStart hook and its deployment by the
    Claude adapter, against disposable fixtures.
.DESCRIPTION
    Hook: a fixture Claude home holds one session's session-env folder with a
    file of 28 repeats of the Codex plugin's three export lines (longer than
    Git Bash's -c limit), a sibling with no repeats, a CRLF file with repeats
    and a non-.sh file with repeats, beside another session's folder and a
    .sh file at the home's root. The hook runs with the session JSON on stdin
    as Claude gives it and CLAUDE_CONFIG_DIR set for its process only. It trims
    the two repeating .sh files to their distinct lines in order, with LF
    endings and no BOM, says so in one line and leaves everything else exactly
    as it was; a second run changes and prints nothing. An unknown session, a
    home with no session-env folder, empty or malformed stdin and session ids
    that name a path all exit 0, print nothing and touch nothing.

    Sync: the adapter installs the hook into a fixture Claude home and
    registers it in settings.json as a SessionStart group with no matcher,
    beside the fresh-worktree group and an operator's own hook. The registered
    command, run as written, trims a fixture session. A second sync changes
    nothing. Nothing outside the fixtures is touched.

    -FixtureRoot keeps the fixtures at that path for inspection instead of a
    temporary folder that is removed afterwards.
#>
[CmdletBinding()]
param([switch]$Quiet, [string]$FixtureRoot)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$adapter = Join-Path $root 'claude'
$hook = Join-Path $adapter 'hooks\session-env-trim.ps1'
$sync = Join-Path $adapter 'sync-claude.ps1'
$checks = 0
$failures = [Collections.Generic.List[string]]::new()
function Assert-True {
    param([bool]$Condition, [string]$Message)
    $script:checks++
    if (-not $Condition) { $script:failures.Add($Message); Write-Host "  FAIL $Message" }
    elseif (-not $Quiet) { Write-Host "  PASS $Message" }
}
function Write-Note([string]$Text) { if (-not $Quiet) { Write-Host $Text } }
$utf8 = [Text.UTF8Encoding]::new($false)
function Write-Fixture([string]$Path, [string]$Text) {
    New-Item -ItemType Directory -Force -Path (Split-Path $Path -Parent) | Out-Null
    [IO.File]::WriteAllText($Path, $Text, $utf8)
    # An old timestamp makes any rewrite visible, even one with the same bytes.
    [IO.File]::SetLastWriteTimeUtc($Path, [datetime]::new(2020, 1, 1, 0, 0, 0, [DateTimeKind]::Utc))
}
function Get-Bytes([string]$Path) { return [Convert]::ToHexString([IO.File]::ReadAllBytes($Path)) }
function Get-Expected([string]$Text) { return [Convert]::ToHexString($utf8.GetBytes($Text)) }
# Every file under a folder with its bytes and write time, so "touched nothing"
# means no file was added, removed, changed or rewritten.
function Get-TreeState([string]$Directory) {
    if (-not (Test-Path -LiteralPath $Directory)) { return '(absent)' }
    return (@(Get-ChildItem -LiteralPath $Directory -Recurse -Force | Sort-Object FullName | ForEach-Object {
        $relative = [IO.Path]::GetRelativePath($Directory, $_.FullName)
        if ($_.PSIsContainer) { "$relative\" } else { "$relative $($_.LastWriteTimeUtc.Ticks) $((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)" }
    })) -join "`n"
}
# Runs a hook as Claude does: stdin written and closed, CLAUDE_CONFIG_DIR set
# for the hook's process only, from another directory.
function Invoke-Hook {
    param([string]$Stdin, [string]$ClaudeHome, [string]$Command = 'pwsh', [string[]]$Arguments = @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', $hook))
    $psi = [Diagnostics.ProcessStartInfo]::new($Command)
    foreach ($argument in $Arguments) { $psi.ArgumentList.Add($argument) }
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.WorkingDirectory = $fixture
    $psi.Environment['CLAUDE_CONFIG_DIR'] = $ClaudeHome
    $process = [Diagnostics.Process]::Start($psi)
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.StandardInput.Write($Stdin)
    $process.StandardInput.Close()
    $stdout = $process.StandardOutput.ReadToEnd()
    $process.WaitForExit()
    $result = [pscustomobject]@{ Exit = $process.ExitCode; Text = $stdout; Error = $stderrTask.Result }
    Write-Note "    [exit $($result.Exit)] $(if ($result.Text.Trim()) { $result.Text.Trim() } else { '(no output)' })$(if ($result.Error.Trim()) { " stderr: $($result.Error.Trim())" })"
    return $result
}
function New-Payload([string]$SessionId, [string]$Source = 'resume') {
    return [ordered]@{ session_id = $SessionId; transcript_path = 'C:/fixture/transcript.jsonl'; cwd = 'C:/fixture'; hook_event_name = 'SessionStart'; source = $Source } | ConvertTo-Json -Compress
}
function Invoke-Sync([string[]]$Extra = @()) {
    $output = & pwsh -NoProfile -File $sync -CodexHome $codexHome -ClaudeHome $syncHome @Extra 2>&1
    return [pscustomobject]@{ Exit = $LASTEXITCODE; Text = ($output | ForEach-Object { "$_" }) -join "`n" }
}
function Read-Json([string]$Path) { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -AsHashtable }
function Get-GroupFor($Settings, [string]$Script) {
    return $Settings['hooks']['SessionStart'] | Where-Object { @($_['hooks'][0]['args'])[-1] -eq ($Script -replace '\\', '/') } | Select-Object -First 1
}

$keep = [bool]$FixtureRoot
$fixture = if ($keep) { [IO.Path]::GetFullPath($FixtureRoot) } else { Join-Path ([IO.Path]::GetTempPath()) "session-env-$([guid]::NewGuid().ToString('N'))" }
if (Test-Path -LiteralPath $fixture) { throw "Fixture root already exists: $fixture" }
$savedConfigDir = $env:CLAUDE_CONFIG_DIR

try {
    # ---- Hook ---------------------------------------------------------------
    $claudeHome = Join-Path $fixture 'claude-home'
    $sessionId = '3f1c2b7a-9d4e-4a61-8c2f-0b5e6d7a8c91'
    $otherId = '7a2d9e41-0c3b-4f58-9e1a-2c4b6d8f0a13'
    $sessionDir = Join-Path $claudeHome "session-env\$sessionId"
    $otherDir = Join-Path $claudeHome "session-env\$otherId"
    New-Item -ItemType Directory -Force -Path $fixture | Out-Null
    # The checker's own process never points at the operator's Claude home
    # either; the hook's process gets the fixture through its own environment.
    $env:CLAUDE_CONFIG_DIR = $claudeHome

    $exports = @(
        "export CODEX_COMPANION_SESSION_ID='$sessionId'"
        "export CODEX_COMPANION_TRANSCRIPT_PATH='C:\Homes\fixture\.claude\projects\F---fixture-workspace-checkout\$sessionId.jsonl'"
        "export CLAUDE_PLUGIN_DATA='C:\Homes\fixture\.claude\plugins\data\codex-openai-codex'"
    )
    $repeated = (@(1..28 | ForEach-Object { $exports }) -join "`n") + "`n"
    $hook0 = Join-Path $sessionDir 'sessionstart-hook-0.sh'
    $hook1 = Join-Path $sessionDir 'sessionstart-hook-1.sh'
    $hook2 = Join-Path $sessionDir 'sessionstart-hook-2.sh'
    $notes = Join-Path $sessionDir 'notes.txt'
    $distinct = "export FIXTURE_ONE='1'`n`nexport FIXTURE_TWO='2'`n"
    Write-Fixture $hook0 $repeated
    Write-Fixture $hook1 $distinct
    Write-Fixture $hook2 ((@(1..5 | ForEach-Object { "export CRLF_A='a'"; "export CRLF_B='b'" }) -join "`r`n") + "`r`n")
    Write-Fixture $notes "same`nsame`nsame`n"
    Write-Fixture (Join-Path $otherDir 'sessionstart-hook-0.sh') $repeated
    Write-Fixture (Join-Path $claudeHome 'root-level.sh') $repeated
    Assert-True ($repeated.Length -gt 8190) "the repeated file is longer than Git Bash's -c limit ($($repeated.Length) characters)"
    $sessionHook1 = Get-TreeState $hook1
    $sessionNotes = Get-TreeState $notes
    $otherBefore = Get-TreeState $otherDir
    $rootBefore = Get-TreeState (Join-Path $claudeHome 'root-level.sh')

    Write-Note '  case: a resumed session with repeated lines'
    $result = Invoke-Hook (New-Payload $sessionId) $claudeHome
    $lines = @($result.Text -split "`r?`n" | Where-Object { $_ -ne '' })
    Assert-True ($result.Exit -eq 0 -and -not $result.Error) 'the hook exits 0 with nothing on stderr'
    Assert-True ($lines.Count -eq 1 -and $lines[0] -ceq 'Trimmed repeated session environment lines: sessionstart-hook-0.sh 84 -> 3 lines; sessionstart-hook-2.sh 10 -> 2 lines') 'and prints exactly one line naming each trimmed file and its line counts'
    Assert-True ((Get-Bytes $hook0) -ceq (Get-Expected (($exports -join "`n") + "`n"))) 'the 28 repeats become the three export lines, in their original order, LF endings, no BOM'
    Assert-True ((Get-Bytes $hook2) -ceq (Get-Expected "export CRLF_A='a'`nexport CRLF_B='b'`n")) 'a file of CRLF repeats is trimmed the same way, to LF'
    Assert-True ((Get-TreeState $hook1) -ceq $sessionHook1) 'a sibling with no repeats is left byte-identical and unwritten, blank line included'
    Assert-True ((Get-TreeState $notes) -ceq $sessionNotes) 'a file that is not .sh is left alone even when it repeats'
    Assert-True ((Get-TreeState $otherDir) -ceq $otherBefore) "another session's folder is untouched"

    Write-Note '  case: the same session starts again'
    $settled = Get-TreeState $claudeHome
    $result = Invoke-Hook (New-Payload $sessionId 'compact') $claudeHome
    Assert-True ($result.Exit -eq 0 -and -not $result.Text -and -not $result.Error) 'a second run exits 0 and prints nothing'
    Assert-True ((Get-TreeState $claudeHome) -ceq $settled) 'and changes nothing'

    $cases = @(
        @{ Name = 'an unknown session id'; Stdin = (New-Payload 'b1e2c3d4-0000-4000-8000-000000000000'); Home = $claudeHome }
        @{ Name = 'a home with no session-env folder'; Stdin = (New-Payload $sessionId 'startup'); Home = (Join-Path $fixture 'bare-home') }
        @{ Name = 'empty stdin'; Stdin = ''; Home = $claudeHome }
        @{ Name = 'stdin that is not JSON'; Stdin = 'not json {'; Home = $claudeHome }
        @{ Name = 'a session id that climbs to another session'; Stdin = (New-Payload "..\$otherId"); Home = $claudeHome }
        @{ Name = 'a session id of dots, naming the session-env parent'; Stdin = (New-Payload '..'); Home = $claudeHome }
        @{ Name = 'an absolute path as session id'; Stdin = (New-Payload $otherDir); Home = $claudeHome }
    )
    New-Item -ItemType Directory -Force -Path (Join-Path $fixture 'bare-home') | Out-Null
    foreach ($case in $cases) {
        Write-Note "  case: $($case.Name)"
        $before = Get-TreeState $fixture
        $result = Invoke-Hook $case.Stdin $case.Home
        Assert-True ($result.Exit -eq 0 -and -not $result.Text -and -not $result.Error -and (Get-TreeState $fixture) -ceq $before) "$($case.Name) exits 0, prints nothing and touches nothing"
    }
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $fixture 'bare-home\session-env'))) 'the hook never creates a session-env folder'
    Assert-True ((Get-TreeState $otherDir) -ceq $otherBefore -and (Get-TreeState (Join-Path $claudeHome 'root-level.sh')) -ceq $rootBefore) 'after every case, the other session and the files beside session-env are as they were'

    # ---- Sync ---------------------------------------------------------------
    $codexHome = Join-Path $fixture 'sync\codex'
    $syncHome = Join-Path $fixture 'sync\claude'
    New-Item -ItemType Directory -Force -Path "$codexHome\agents", "$codexHome\skills", $syncHome | Out-Null
    Copy-Item -Path (Join-Path $root 'agents\*.toml') -Destination "$codexHome\agents"
    $foreign = [ordered]@{ hooks = @([ordered]@{ type = 'command'; command = 'echo operator' }) }
    $settings = [ordered]@{ model = 'opus'; hooks = [ordered]@{ SessionStart = @($foreign) } }
    $settingsPath = Join-Path $syncHome 'settings.json'
    Set-Content -LiteralPath $settingsPath -Value ($settings | ConvertTo-Json -Depth 20) -Encoding utf8
    $installed = Join-Path $syncHome 'hooks\session-env-trim.ps1'
    $freshInstalled = Join-Path $syncHome 'hooks\session-start-fresh-worktree.ps1'

    $plan = Invoke-Sync
    Assert-True ($plan.Exit -eq 0 -and $plan.Text -match '(?m)add\s+settings\.json hooks\.SessionStart -> hooks\\session-env-trim\.ps1$' -and $plan.Text -match 'add\s+hooks\\session-env-trim\.ps1') 'plan shows the trim hook script and a settings entry with no matcher'

    $apply = Invoke-Sync '-Apply'
    Assert-True ($apply.Exit -eq 0) 'apply completes'
    if ($apply.Exit -ne 0) { Write-Host $apply.Text }
    Assert-True ((Test-Path -LiteralPath $installed) -and ([IO.File]::ReadAllText($installed) -replace "`r`n", "`n") -ceq ([IO.File]::ReadAllText($hook) -replace "`r`n", "`n")) 'the installed script in the fixture hooks folder is the source script'
    $written = Read-Json $settingsPath
    $sessionStart = @($written['hooks']['SessionStart'])
    $ours = Get-GroupFor $written $installed
    $fresh = Get-GroupFor $written $freshInstalled
    $mappedSessionStart = @((Get-Content -LiteralPath (Join-Path $adapter 'claude-map.json') -Raw | ConvertFrom-Json).hooks | Where-Object event -eq 'SessionStart').Count
    Assert-True ($sessionStart.Count -eq 1 + $mappedSessionStart -and $sessionStart[0]['hooks'][0]['command'] -eq 'echo operator') "the operator's own SessionStart hook is kept, first, beside the mapped groups"
    Assert-True ($fresh -and $fresh['matcher'] -eq 'startup') 'the fresh-worktree group keeps its startup matcher'
    Assert-True ($ours -and -not $ours.Contains('matcher') -and @($ours['hooks']).Count -eq 1 -and $ours['hooks'][0]['command'] -eq 'pwsh' -and $ours['hooks'][0]['timeout'] -eq 10) 'the trim hook is its own SessionStart group with no matcher key, one pwsh handler and a 10 s timeout'

    Write-Note '  case: the registered command, run as written'
    $registered = Join-Path $syncHome "session-env\$sessionId"
    Write-Fixture (Join-Path $registered 'sessionstart-hook-0.sh') $repeated
    $result = Invoke-Hook (New-Payload $sessionId 'startup') $syncHome $ours['hooks'][0]['command'] ([string[]]@($ours['hooks'][0]['args']))
    Assert-True ($result.Exit -eq 0 -and (Get-Bytes (Join-Path $registered 'sessionstart-hook-0.sh')) -ceq (Get-Expected (($exports -join "`n") + "`n"))) 'and trims a session in that Claude home'

    $again = Invoke-Sync '-Apply'
    Assert-True ($again.Exit -eq 0 -and $again.Text -match 'Nothing to change') 'a second sync reports nothing to change'
}
finally {
    $env:CLAUDE_CONFIG_DIR = $savedConfigDir
    if (-not $keep -and (Test-Path -LiteralPath $fixture)) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}

if ($failures.Count -eq 0) {
    Write-Host "Session-env hook check passed: $checks assertion(s)."
} else {
    Write-Host "Session-env hook check FAILED: $($failures.Count) of $checks assertion(s)."
}
exit $(if ($failures.Count -eq 0) { 0 } else { 1 })
