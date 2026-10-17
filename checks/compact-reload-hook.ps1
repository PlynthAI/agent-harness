#Requires -Version 7.0
<#
.SYNOPSIS
    Exercises the compaction reload SessionStart hook and its registration in
    both runtimes, against disposable fixtures.
.DESCRIPTION
    Hook: hooks/compact-reload.ps1 runs with each SessionStart payload on stdin
    as the runtimes give it. A compact payload prints the reload reminder and
    nothing else; startup, resume, clear and fork payloads, empty or malformed
    stdin and a payload without a source print nothing. Every case exits 0
    with nothing on stderr, well inside its timeout. This is the hook Claude
    still registers.

    Codex: hooks/hooks.json, the file deploy installs as the Codex home's
    hooks.json, holds one SessionStart group whose matcher selects compact
    only and one command for every platform. Codex dispatches by matcher, so
    the command never sees a non-compact payload and does not parse stdin: it
    emits the reminder directly with the shell's echo builtin, because a
    nested PowerShell interpreter exceeded the 10 s SessionStart timeout under
    load (.local/proposals/session-start-hook-20261010). Run as written by
    each shell Codex may use for it (cmd, Windows PowerShell and pwsh on
    Windows, sh where Git's sh is present), it prints the same reminder. cmd
    may keep one pair of echo quotes around it, which the check tolerates.

    Claude: the adapter installs the same source script into a fixture Claude
    home and registers it in settings.json as a SessionStart group matching
    compact, beside the operator's own hook. The registered command, run as
    written, prints the reminder on compact and nothing on startup. A second
    sync changes nothing, and a map whose hook source leaves the harness
    checkout, by its path or through a link, is refused. Nothing outside the
    fixtures is touched.
#>
[CmdletBinding()]
param([switch]$Quiet)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$adapter = Join-Path $root 'claude'
$hook = Join-Path $root 'hooks\compact-reload.ps1'
$registration = Join-Path $root 'hooks\hooks.json'
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

# The requirement: the text each runtime adds to the model's context after a
# compaction.
$reminder = 'Context was just compacted. Skill and reference text loaded earlier may be gone or cut short, and the summary is not the instructions. Before the next step, re-open the skill and references the work in progress uses. Then re-read .state/state.md at the root of this checkout, if it exists, and the plan if the task has one, and continue from the recorded next action.'

# Runs a command with optional stdin and child-only environment changes. A hung child is
# killed as an owned process tree and reported as a timeout, so one case can
# fail without stalling the check.
function Invoke-Process {
    param([string]$File, [string[]]$Arguments = @(), [string]$RawArguments, [string]$Stdin, [string]$Directory, [hashtable]$Environment = @{}, [int]$TimeoutMs = 20000)
    $psi = [Diagnostics.ProcessStartInfo]::new($File)
    if ($PSBoundParameters.ContainsKey('RawArguments')) { $psi.Arguments = $RawArguments }
    else { foreach ($argument in $Arguments) { $psi.ArgumentList.Add($argument) } }
    $psi.UseShellExecute = $false
    $hasStdin = $PSBoundParameters.ContainsKey('Stdin')
    $psi.RedirectStandardInput = $hasStdin
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.WorkingDirectory = $Directory
    # A $null value removes the variable from the child's environment.
    foreach ($name in $Environment.Keys) {
        if ($null -eq $Environment[$name]) { [void]$psi.Environment.Remove($name) }
        else { $psi.Environment[$name] = $Environment[$name] }
    }
    $watch = [Diagnostics.Stopwatch]::StartNew()
    $process = [Diagnostics.Process]::Start($psi)
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    if ($hasStdin) {
        $process.StandardInput.Write($Stdin)
        $process.StandardInput.Close()
    }
    $remainingMs = [Math]::Max(0, $TimeoutMs - $watch.ElapsedMilliseconds)
    $timedOut = -not $process.WaitForExit([int]$remainingMs)
    $watch.Stop()
    $timedOut = $timedOut -or $watch.ElapsedMilliseconds -ge $TimeoutMs
    if ($timedOut -and -not $process.HasExited) {
        # Kill only the child this check started and its descendants.
        $process.Kill($true)
        $process.WaitForExit()
    }
    $stdout = if ($stdoutTask.Wait(5000)) { $stdoutTask.Result } else { '' }
    $stderr = if ($stderrTask.Wait(5000)) { $stderrTask.Result } else { '' }
    $result = [pscustomobject]@{ Exit = $process.ExitCode; Text = $stdout; Error = $stderr; Milliseconds = $watch.ElapsedMilliseconds; TimedOut = $timedOut }
    Write-Note "    [exit $($result.Exit), $($result.Milliseconds) ms$(if ($result.TimedOut) { ', timed out' })] $(if ($result.Text.Trim()) { $result.Text.Trim() } else { '(no output)' })$(if ($result.Error.Trim()) { " stderr: $($result.Error.Trim())" })"
    return $result
}
function New-Payload([string]$Source) {
    return [ordered]@{ session_id = 'fixture'; transcript_path = 'C:/fixture/transcript.jsonl'; cwd = 'C:/fixture'; hook_event_name = 'SessionStart'; source = $Source } | ConvertTo-Json -Compress
}
# The reminder text is the contract. A shell may keep its own quotes around a
# literal echo argument, so Codex alone permits one enclosing pair; no other
# difference is. Direct script and Claude output remain exact.
function Test-Reminder($Result, [switch]$AllowEchoQuotes) {
    $text = $Result.Text.TrimEnd("`r", "`n")
    if ($AllowEchoQuotes -and $text.Length -ge 2 -and $text.StartsWith('"') -and $text.EndsWith('"')) { $text = $text.Substring(1, $text.Length - 2) }
    return $Result.Exit -eq 0 -and -not $Result.TimedOut -and $Result.Milliseconds -lt 10000 -and -not $Result.Error -and $text -ceq $reminder
}
function Test-Silent($Result) { return $Result.Exit -eq 0 -and -not $Result.TimedOut -and -not $Result.Error -and -not $Result.Text }
function Read-Json([string]$Path) { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -AsHashtable }

$fixture = Join-Path ([IO.Path]::GetTempPath()) "compact-reload-$([guid]::NewGuid().ToString('N'))"
if (Test-Path -LiteralPath $fixture) { throw "Fixture root already exists: $fixture" }
$session = Join-Path $fixture 'session cwd'
$savedConfigDir = $env:CLAUDE_CONFIG_DIR

try {
    New-Item -ItemType Directory -Force -Path $session | Out-Null
    Assert-True (-not $reminder.Contains([char]0x2014)) 'the reminder has no em dash'

    # ---- Hook ---------------------------------------------------------------
    Assert-True (Test-Path -LiteralPath $hook -PathType Leaf) 'the hook script is in the shared hooks folder'
    $direct = @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', $hook)
    Write-Note '  case: compact'
    $result = Invoke-Process 'pwsh' $direct -Stdin (New-Payload 'compact') -Directory $session
    Assert-True (Test-Reminder $result) 'a compact payload prints the reminder and nothing else, exits 0, nothing on stderr'
    Assert-True ($result.Milliseconds -lt 5000) "and finishes well inside its 10 s timeout ($($result.Milliseconds) ms)"
    $cases = [ordered]@{
        'a startup payload'          = (New-Payload 'startup')
        'a resume payload'           = (New-Payload 'resume')
        'a clear payload'            = (New-Payload 'clear')
        'a fork payload'             = (New-Payload 'fork')
        'a payload with no source'   = '{"session_id":"fixture","hook_event_name":"SessionStart"}'
        'a source in another case'   = (New-Payload 'Compact')
        'empty stdin'                = ''
        'stdin that is not JSON'     = 'not json {'
        'a JSON array'               = '["compact"]'
    }
    foreach ($name in $cases.Keys) {
        Write-Note "  case: $name"
        $result = Invoke-Process 'pwsh' $direct -Stdin $cases[$name] -Directory $session
        Assert-True (Test-Silent $result) "$name prints nothing and exits 0"
    }

    # ---- Codex --------------------------------------------------------------
    # Codex dispatches a SessionStart hook by its matcher before the command
    # runs, so the compact-only promise is the matcher, not anything the
    # command reads. The registered command is a shell builtin that emits the
    # reminder directly; it must not start another interpreter, which exceeded
    # the 10 s SessionStart timeout under load
    # (.local/proposals/session-start-hook-20261010).
    Assert-True (Test-Path -LiteralPath $registration -PathType Leaf) 'the Codex registration is in the shared hooks folder'
    $codexHooks = Read-Json $registration
    $events = @($codexHooks['hooks'].Keys)
    $groups = @($codexHooks['hooks']['SessionStart'])
    Assert-True ($events -contains 'SessionStart' -and $groups.Count -eq 1) 'the Codex registration holds one SessionStart group beside other event hooks'
    $group = $groups[0]
    $matcher = "$($group['matcher'])"
    Assert-True ('compact' -cmatch $matcher) "its matcher '$matcher' selects compact"
    $otherSources = @('startup', 'resume', 'clear', 'precompact', 'compacted', 'Compact', 'compactx')
    Assert-True (-not @($otherSources | Where-Object { $_ -cmatch $matcher })) "its matcher '$matcher' skips every other source, so their dispatch never reaches the command"
    $handlers = @($group['hooks'])
    $handler = $handlers[0]
    Assert-True ($handlers.Count -eq 1 -and $handler['type'] -eq 'command' -and $handler['command'] -and -not $handler.Contains('commandWindows') -and $handler['timeout'] -is [long] -and $handler['timeout'] -le 10) 'one command handler, the same command on every platform, with a timeout of at most 10 s'
    $installMap = Get-Content -LiteralPath (Join-Path $root 'config\install-map.json') -Raw | ConvertFrom-Json
    $installs = @{}
    foreach ($mapping in $installMap.mappings) { if ($mapping.kind -eq 'file' -and -not $mapping.PSObject.Properties['home']) { $installs[$mapping.source] = $mapping.target } }
    Assert-True ($installs['hooks/hooks.json'] -eq 'hooks.json') 'the install map places the registration as the Codex home hooks.json'
    # The script entry stays: a Codex session loaded before this change may
    # still call the installed script until it reloads, and Claude installs
    # the same file.
    Assert-True ($installs['hooks/compact-reload.ps1'] -eq 'hooks/compact-reload.ps1') 'the install map still places the shared script in the Codex hooks folder for older loaded registrations'

    # The command no longer resolves a home or reads the script, so the check
    # runs it as written and looks only at what the user's context receives.
    $shells = [ordered]@{}
    if ($IsWindows) {
        $shells['cmd'] = @{ File = $env:ComSpec; Raw = "/d /s /c `"$($handler['command'])`"" }
        $shells['Windows PowerShell'] = @{ File = 'powershell.exe'; Arguments = @('-NoProfile', '-NonInteractive', '-Command', $handler['command']) }
    }
    $shells['pwsh'] = @{ File = 'pwsh'; Arguments = @('-NoProfile', '-NonInteractive', '-Command', $handler['command']) }
    $sh = if ($IsWindows) { @("$env:ProgramFiles\Git\bin\sh.exe") | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1 } else { '/bin/sh' }
    if ($sh) { $shells['sh'] = @{ File = $sh; Arguments = @('-c', $handler['command']) } }
    foreach ($name in $shells.Keys) {
        $shell = $shells[$name]
        Write-Note "  case: Codex command through $name, compact"
        # Echo does not consume stdin and can exit before a payload write.
        # Matcher coverage above owns dispatch; this checks output and timing.
        $result = if ($shell.ContainsKey('Raw')) { Invoke-Process $shell.File -RawArguments $shell.Raw -Directory $session -TimeoutMs 10000 }
        else { Invoke-Process $shell.File $shell.Arguments -Directory $session -TimeoutMs 10000 }
        Assert-True (Test-Reminder $result -AllowEchoQuotes) "the Codex command through $name prints the reminder on compact, inside the 10 s timeout"
    }

    # ---- Claude -------------------------------------------------------------
    $codexHome = Join-Path $fixture 'sync\codex'
    $claudeHome = Join-Path $fixture 'sync\claude'
    New-Item -ItemType Directory -Force -Path "$codexHome\agents", "$codexHome\skills", $claudeHome | Out-Null
    Copy-Item -Path (Join-Path $root 'agents\*.toml') -Destination "$codexHome\agents"
    $env:CLAUDE_CONFIG_DIR = $claudeHome
    $foreign = [ordered]@{ hooks = @([ordered]@{ type = 'command'; command = 'echo operator' }) }
    $settingsPath = Join-Path $claudeHome 'settings.json'
    Set-Content -LiteralPath $settingsPath -Value ([ordered]@{ hooks = [ordered]@{ SessionStart = @($foreign) } } | ConvertTo-Json -Depth 20) -Encoding utf8
    $installed = Join-Path $claudeHome 'hooks\compact-reload.ps1'
    function Invoke-Sync([string[]]$Extra = @()) {
        $output = & pwsh -NoProfile -File $sync -CodexHome $codexHome -ClaudeHome $claudeHome @Extra 2>&1
        return [pscustomobject]@{ Exit = $LASTEXITCODE; Text = ($output | ForEach-Object { "$_" }) -join "`n" }
    }

    $plan = Invoke-Sync
    Assert-True ($plan.Exit -eq 0 -and $plan.Text -match '(?m)add\s+settings\.json hooks\.SessionStart \(compact\) -> hooks\\compact-reload\.ps1$' -and $plan.Text -match '(?m)add\s+hooks\\compact-reload\.ps1$') 'the sync plan shows the hook script and a SessionStart entry matching compact'
    $apply = Invoke-Sync '-Apply'
    Assert-True ($apply.Exit -eq 0) 'apply completes'
    if ($apply.Exit -ne 0) { Write-Host $apply.Text }
    Assert-True ((Test-Path -LiteralPath $installed) -and ([IO.File]::ReadAllText($installed) -replace "`r`n", "`n") -ceq ([IO.File]::ReadAllText($hook) -replace "`r`n", "`n")) 'the installed Claude script is the shared source script'
    $written = Read-Json $settingsPath
    $sessionStart = @($written['hooks']['SessionStart'])
    $ours = $sessionStart | Where-Object { @($_['hooks'][0]['args'])[-1] -eq ($installed -replace '\\', '/') } | Select-Object -First 1
    Assert-True ($sessionStart[0]['hooks'][0]['command'] -eq 'echo operator') "the operator's own SessionStart hook is kept, first"
    Assert-True ($ours -and $ours['matcher'] -eq 'compact' -and @($ours['hooks']).Count -eq 1 -and $ours['hooks'][0]['command'] -eq 'pwsh' -and $ours['hooks'][0]['timeout'] -eq 10) 'the hook is its own SessionStart group matching compact, one pwsh handler, a 10 s timeout'
    if ($ours) {
        foreach ($source in 'compact', 'startup') {
            Write-Note "  case: the registered Claude command, $source"
            $result = Invoke-Process $ours['hooks'][0]['command'] ([string[]]@($ours['hooks'][0]['args'])) -Stdin (New-Payload $source) -Directory $session
            if ($source -eq 'compact') { Assert-True (Test-Reminder $result) 'the registered Claude command prints the reminder on compact' }
            else { Assert-True (Test-Silent $result) 'and nothing on startup' }
        }
    }
    $again = Invoke-Sync '-Apply'
    Assert-True ($again.Exit -eq 0 -and $again.Text -match 'Nothing to change') 'a second sync reports nothing to change'

    # A hook source outside the harness checkout the map sits in is refused.
    $mapCopy = Join-Path $fixture 'checkout\claude'
    New-Item -ItemType Directory -Force -Path $mapCopy, (Join-Path $fixture 'outside') | Out-Null
    Copy-Item -LiteralPath $hook -Destination (Join-Path $fixture 'outside\compact-reload.ps1')
    $map = Get-Content -LiteralPath (Join-Path $adapter 'claude-map.json') -Raw | ConvertFrom-Json
    Copy-Item -LiteralPath (Join-Path $adapter $map.instructions.source) -Destination $mapCopy
    Copy-Item -LiteralPath (Join-Path $adapter 'scripts') -Destination $mapCopy -Recurse
    $map.hooks = @([pscustomobject]@{ event = 'SessionStart'; matcher = 'compact'; script = 'hooks/compact-reload.ps1'; source = '../../outside/compact-reload.ps1'; timeout = 10 })
    $escapingMap = Join-Path $mapCopy 'claude-map.json'
    $map | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $escapingMap -Encoding utf8
    $before = [IO.File]::ReadAllText($settingsPath)
    $escape = Invoke-Sync '-MapPath', $escapingMap, '-Apply'
    Assert-True ($escape.Exit -ne 0 -and $escape.Text -match 'outside the harness checkout' -and [IO.File]::ReadAllText($settingsPath) -ceq $before) 'a hook source outside the harness checkout is refused before anything is written'

    # So is one whose path stays inside the checkout but passes through a
    # junction (a symbolic link where junctions are unavailable) leading out.
    $linkType = if ($IsWindows) { 'Junction' } else { 'SymbolicLink' }
    New-Item -ItemType $linkType -Path (Join-Path $fixture 'checkout\hooks') -Target (Join-Path $fixture 'outside') | Out-Null
    $map.hooks = @([pscustomobject]@{ event = 'SessionStart'; matcher = 'compact'; script = 'hooks/compact-reload.ps1'; source = '../hooks/compact-reload.ps1'; timeout = 10 })
    $map | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $escapingMap -Encoding utf8
    $linked = Invoke-Sync '-MapPath', $escapingMap, '-Apply'
    Assert-True ($linked.Exit -ne 0 -and $linked.Text -match 'outside the harness checkout' -and [IO.File]::ReadAllText($settingsPath) -ceq $before) 'a hook source reached through a link leading outside the harness checkout is refused before anything is written'
}
finally {
    $env:CLAUDE_CONFIG_DIR = $savedConfigDir
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}

if ($failures.Count -eq 0) {
    Write-Host "Compact-reload hook check passed: $checks assertion(s)."
} else {
    Write-Host "Compact-reload hook check FAILED: $($failures.Count) of $checks assertion(s)."
}
exit $(if ($failures.Count -eq 0) { 0 } else { 1 })
