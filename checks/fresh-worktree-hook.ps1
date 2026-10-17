#Requires -Version 7.0
<#
.SYNOPSIS
    Exercises the fresh-worktree SessionStart hook and its deployment by the
    Claude adapter, against disposable fixtures.
.DESCRIPTION
    Hook: a bare origin whose default branch is 'trunk' moves three commits
    ahead of a clone's cached origin/HEAD. The hook runs, with the session's
    directory given on stdin as Claude gives it, in a clean CLI worktree under
    <checkout>\.claude\worktrees (fast-forwards), a dirty one and one with its
    own commits (both report and are left exactly as they were), a detached
    desktop-app worktree reached through a junctioned Claude worktrees folder
    (fast-forwards), a plain operator worktree and the main checkout (both
    silent), and a worktree whose origin cannot be fetched (one line, nothing
    touched).

    Sync: the adapter installs the hook script into a fixture Claude home and
    registers it in settings.json beside an operator's own SessionStart hook
    and settings, backs the file up, changes nothing on a second run, reports
    an operator-edited entry as a conflict until -Force, and removes its entry
    and script once the map drops them. Nothing outside the fixtures is touched.

    -FixtureRoot keeps the fixtures at that path for inspection instead of a
    temporary folder that is removed afterwards.
#>
[CmdletBinding()]
param([switch]$Quiet, [string]$FixtureRoot)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$adapter = Join-Path $root 'claude'
$hook = Join-Path $adapter 'hooks\session-start-fresh-worktree.ps1'
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
function Invoke-Git {
    # $args, not a declared parameter, so git flags such as -A never bind to one.
    $Directory = $args[0]
    $Arguments = @($args | Select-Object -Skip 1)
    $output = & git -C $Directory @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed in ${Directory}: $output" }
    return ($output | ForEach-Object { "$_" }) -join "`n"
}
function New-Commit([string]$Directory, [string]$Name) {
    Set-Content -LiteralPath (Join-Path $Directory "$Name.txt") -Value $Name
    Invoke-Git $Directory add -A | Out-Null
    Invoke-Git $Directory commit -q -m $Name | Out-Null
}
function Get-TreeState([string]$Directory) {
    return (Invoke-Git $Directory rev-parse HEAD) + "`n" + (Invoke-Git $Directory status --porcelain --untracked-files=all)
}
# Runs the hook as Claude does: session JSON on stdin, from another directory.
function Invoke-Hook([string]$SessionDirectory) {
    $payload = [ordered]@{ session_id = 'fixture'; cwd = $SessionDirectory; hook_event_name = 'SessionStart'; source = 'startup' } | ConvertTo-Json -Compress
    $timer = [Diagnostics.Stopwatch]::StartNew()
    Push-Location $fixture
    try { $output = $payload | & pwsh -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $hook 2>&1 }
    finally { Pop-Location }
    $timer.Stop()
    $result = [pscustomobject]@{ Exit = $LASTEXITCODE; Text = (($output | ForEach-Object { "$_" }) -join "`n").Trim(); Seconds = [math]::Round($timer.Elapsed.TotalSeconds, 2) }
    Write-Note "    [$($result.Seconds) s, exit $($result.Exit)] $(if ($result.Text) { $result.Text } else { '(no output)' })"
    return $result
}
function Invoke-Sync([string[]]$Extra = @()) {
    $output = & pwsh -NoProfile -File $sync -CodexHome $codexHome -ClaudeHome $claudeHome @Extra 2>&1
    return [pscustomobject]@{ Exit = $LASTEXITCODE; Text = ($output | ForEach-Object { "$_" }) -join "`n" }
}
function Read-Json([string]$Path) { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -AsHashtable }
# The map registers other SessionStart hooks too, so this hook's group is the
# one whose handler runs its installed copy, wherever it sits.
function Get-OwnGroup($Settings) {
    return $Settings['hooks']['SessionStart'] | Where-Object { @($_['hooks'][0]['args'])[-1] -eq ($installed -replace '\\', '/') } | Select-Object -First 1
}

$keep = [bool]$FixtureRoot
$fixture = if ($keep) { [IO.Path]::GetFullPath($FixtureRoot) } else { Join-Path ([IO.Path]::GetTempPath()) "fresh-worktree-$([guid]::NewGuid().ToString('N'))" }
if (Test-Path -LiteralPath $fixture) { throw "Fixture root already exists: $fixture" }
$savedConfigDir = $env:CLAUDE_CONFIG_DIR
$savedGit = @{}
foreach ($name in 'GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL') {
    $savedGit[$name] = [Environment]::GetEnvironmentVariable($name)
    [Environment]::SetEnvironmentVariable($name, $(if ($name -like '*EMAIL') { 'fixture@example.invalid' } else { 'Fixture' }))
}

try {
    # ---- Hook ---------------------------------------------------------------
    $origin = Join-Path $fixture 'origin.git'
    $upstream = Join-Path $fixture 'upstream'
    $checkout = Join-Path $fixture 'checkout'
    $claudeHome = Join-Path $fixture 'claude-home'
    $desktopStore = Join-Path $fixture 'desktop-worktrees'
    New-Item -ItemType Directory -Force -Path $fixture, $claudeHome, $desktopStore | Out-Null
    $env:CLAUDE_CONFIG_DIR = $claudeHome
    # The desktop app's worktrees folder is a junction to another drive on this host.
    New-Item -ItemType Junction -Path (Join-Path $claudeHome 'worktrees') -Target $desktopStore | Out-Null

    & git init -q --bare -b trunk $origin
    & git clone -q $origin $upstream 2>&1 | Out-Null
    Invoke-Git $upstream symbolic-ref HEAD refs/heads/trunk | Out-Null
    New-Commit $upstream 'base'
    Invoke-Git $upstream push -q origin trunk | Out-Null
    & git clone -q $origin $checkout 2>&1 | Out-Null
    Assert-True ((Invoke-Git $checkout symbolic-ref refs/remotes/origin/HEAD) -eq 'refs/remotes/origin/trunk') 'the fixture clone caches origin/HEAD as trunk'

    $cli = Join-Path $checkout '.claude\worktrees'
    $clean = Join-Path $cli 'clean'
    $dirty = Join-Path $cli 'dirty'
    $own = Join-Path $cli 'own-commits'
    $offline = Join-Path $cli 'offline'
    $desktop = Join-Path $desktopStore 'checkout\kind-fixture'
    $plain = Join-Path $fixture 'operator-worktree'
    foreach ($pair in @(@($clean, 'worktree-clean'), @($dirty, 'worktree-dirty'), @($own, 'worktree-own'), @($offline, 'worktree-offline'), @($plain, 'operator'))) {
        Invoke-Git $checkout worktree add -q -b $pair[1] $pair[0] origin/trunk | Out-Null
    }
    Invoke-Git $checkout worktree add -q --detach $desktop origin/trunk | Out-Null

    # Origin moves on; the clone's cached origin/trunk does not.
    foreach ($n in 1..3) { New-Commit $upstream "ahead-$n" }
    Invoke-Git $upstream push -q origin trunk | Out-Null
    $tip = Invoke-Git $upstream rev-parse HEAD
    $stale = Invoke-Git $checkout rev-parse origin/trunk
    Assert-True ($stale -ne $tip) 'the worktrees start three commits behind origin'

    Set-Content -LiteralPath (Join-Path $dirty 'base.txt') -Value 'operator edit'
    Set-Content -LiteralPath (Join-Path $dirty 'notes.txt') -Value 'untracked'
    New-Commit $own 'own-work'

    Write-Note '  case: clean CLI worktree'
    $result = Invoke-Hook $clean
    Assert-True ($result.Exit -eq 0 -and $result.Text -match '^Fast-forwarded worktree-clean by 3 commits to origin/trunk \([0-9a-f]+\)\.$') 'a clean worktree with no commits of its own is fast-forwarded and says so in one line'
    Assert-True ((Invoke-Git $clean rev-parse HEAD) -eq $tip -and -not (Invoke-Git $clean status --porcelain)) 'and now sits at origin/trunk with a clean tree'

    Write-Note '  case: dirty CLI worktree'
    $before = Get-TreeState $dirty
    Write-Note "    before: $($before -replace "`n", ' | ')"
    $result = Invoke-Hook $dirty
    $after = Get-TreeState $dirty
    Write-Note "    after:  $($after -replace "`n", ' | ')"
    Assert-True ($result.Exit -eq 0 -and $result.Text -ceq "worktree-dirty is 3 commits behind origin/trunk; sync before starting (the desktop app's sync_with_base_branch tool, or merge origin/trunk)") 'a dirty worktree is reported as behind'
    Assert-True ($after -ceq $before) 'and its HEAD, changes and untracked files are exactly as they were'

    Write-Note '  case: CLI worktree with its own commits'
    $before = Get-TreeState $own
    $result = Invoke-Hook $own
    Assert-True ($result.Exit -eq 0 -and $result.Text -match '^worktree-own is 3 commits behind origin/trunk; sync before starting') 'a worktree with its own commits is reported as behind'
    Assert-True ((Get-TreeState $own) -ceq $before) 'and is not merged'

    Write-Note '  case: detached desktop worktree, entered through the junctioned Claude worktrees folder'
    $result = Invoke-Hook (Join-Path $claudeHome 'worktrees\checkout\kind-fixture')
    Assert-True ($result.Exit -eq 0 -and $result.Text -match '^Fast-forwarded detached HEAD by 3 commits to origin/trunk') 'a clean detached desktop worktree is fast-forwarded'
    Assert-True ((Invoke-Git $desktop rev-parse HEAD) -eq $tip) 'and now sits at origin/trunk'

    Write-Note '  case: operator worktree outside the Claude roots'
    $before = Get-TreeState $plain
    $result = Invoke-Hook $plain
    Assert-True ($result.Exit -eq 0 -and -not $result.Text -and (Get-TreeState $plain) -ceq $before) 'a worktree the operator made elsewhere is left alone, silently'

    Write-Note '  case: main checkout (not a linked worktree)'
    $result = Invoke-Hook $checkout
    Assert-True ($result.Exit -eq 0 -and -not $result.Text) 'the main checkout is left alone, silently'
    Assert-True ($result.Seconds -lt 2) "and the hook returns quickly there ($($result.Seconds) s including PowerShell start-up)"

    Write-Note '  case: origin cannot be fetched'
    Invoke-Git $checkout remote set-url origin (Join-Path $fixture 'missing.git') | Out-Null
    $before = Get-TreeState $offline
    $result = Invoke-Hook $offline
    Assert-True ($result.Exit -eq 0 -and $result.Text -ceq 'could not fetch origin, working from the last fetched trunk') 'a failed fetch is reported in one line'
    Assert-True ((Get-TreeState $offline) -ceq $before) 'and nothing is touched'
    Invoke-Git $checkout remote set-url origin $origin | Out-Null

    # ---- Sync ---------------------------------------------------------------
    $codexHome = Join-Path $fixture 'sync\codex'
    $claudeHome = Join-Path $fixture 'sync\claude'
    New-Item -ItemType Directory -Force -Path "$codexHome\agents", "$codexHome\skills", $claudeHome | Out-Null
    Copy-Item -Path (Join-Path $root 'agents\*.toml') -Destination "$codexHome\agents"
    $foreign = [ordered]@{ hooks = @([ordered]@{ type = 'command'; command = 'echo operator' }) }
    $settings = [ordered]@{
        model = 'opus'
        permissions = [ordered]@{ allow = @('Read') }
        hooks = [ordered]@{ SessionStart = @($foreign); Stop = @([ordered]@{ hooks = @([ordered]@{ type = 'command'; command = 'echo stop' }) }) }
    }
    $settingsPath = Join-Path $claudeHome 'settings.json'
    Set-Content -LiteralPath $settingsPath -Value ($settings | ConvertTo-Json -Depth 20) -Encoding utf8
    $original = [IO.File]::ReadAllText($settingsPath)
    $installed = Join-Path $claudeHome 'hooks\session-start-fresh-worktree.ps1'

    $plan = Invoke-Sync
    Assert-True ($plan.Exit -eq 0 -and $plan.Text -match 'add\s+settings\.json hooks\.SessionStart \(startup\) -> hooks\\session-start-fresh-worktree\.ps1' -and $plan.Text -match 'add\s+hooks\\session-start-fresh-worktree\.ps1') 'plan shows the hook script and its settings entry'
    Assert-True ([IO.File]::ReadAllText($settingsPath) -ceq $original -and -not (Test-Path -LiteralPath $installed)) 'plan writes nothing'

    $apply = Invoke-Sync '-Apply'
    Assert-True ($apply.Exit -eq 0) 'apply completes'
    if ($apply.Exit -ne 0) { Write-Host $apply.Text }
    $written = Read-Json $settingsPath
    $sessionStart = @($written['hooks']['SessionStart'])
    $mappedSessionStart = @((Get-Content -LiteralPath (Join-Path $adapter 'claude-map.json') -Raw | ConvertFrom-Json).hooks | Where-Object event -eq 'SessionStart').Count
    $ours = Get-OwnGroup $written
    Assert-True ($sessionStart.Count -eq 1 + $mappedSessionStart -and $sessionStart[0]['hooks'][0]['command'] -eq 'echo operator') "the operator's own SessionStart hook is kept, first"
    Assert-True ($written['model'] -eq 'opus' -and @($written['permissions']['allow']) -contains 'Read' -and $written['hooks']['Stop'][0]['hooks'][0]['command'] -eq 'echo stop') 'every other setting and hook is kept'
    Assert-True ($ours -and $ours['matcher'] -eq 'startup' -and $ours['hooks'][0]['command'] -eq 'pwsh' -and $ours['hooks'][0]['timeout'] -eq 15 -and
        @($ours['hooks'][0]['args'])[-1] -eq ($installed -replace '\\', '/')) 'the new entry runs the installed script for new sessions'
    Assert-True (([IO.File]::ReadAllText($installed) -replace "`r`n", "`n") -ceq ([IO.File]::ReadAllText($hook) -replace "`r`n", "`n")) 'the installed script is the source script'
    $backups = @(Get-ChildItem -Path "$claudeHome\.harness-backup\*\settings.json")
    Assert-True ($backups.Count -eq 1 -and [IO.File]::ReadAllText($backups[0].FullName) -ceq $original) 'the settings file it replaced is backed up'

    $again = Invoke-Sync '-Apply'
    Assert-True ($again.Exit -eq 0 -and $again.Text -match 'Nothing to change') 'a second apply changes nothing'

    $edited = Read-Json $settingsPath
    (Get-OwnGroup $edited)['hooks'][0]['timeout'] = 99
    Set-Content -LiteralPath $settingsPath -Value ($edited | ConvertTo-Json -Depth 20) -Encoding utf8
    $conflict = Invoke-Sync '-Apply'
    Assert-True ($conflict.Exit -eq 0 -and $conflict.Text -match 'entry for hooks\\session-start-fresh-worktree\.ps1 differs from what the last sync wrote') 'an entry the operator edited is reported as a conflict'
    Assert-True ((Get-OwnGroup (Read-Json $settingsPath))['hooks'][0]['timeout'] -eq 99) 'and left as they wrote it'
    $forced = Invoke-Sync '-Apply', '-Force'
    Assert-True ($forced.Exit -eq 0 -and (Get-OwnGroup (Read-Json $settingsPath))['hooks'][0]['timeout'] -eq 15) '-Force replaces it'
    Assert-True (@(Get-ChildItem -Path "$claudeHome\.harness-backup\*\settings.json" | Where-Object { $group = Get-OwnGroup (Read-Json $_.FullName); $group -and $group['hooks'][0]['timeout'] -eq 99 }).Count -eq 1) 'and keeps the edited settings in a backup'

    $mapCopy = Join-Path $fixture 'sync\map'
    New-Item -ItemType Directory -Path $mapCopy | Out-Null
    $map = Get-Content -LiteralPath (Join-Path $adapter 'claude-map.json') -Raw | ConvertFrom-Json
    Copy-Item -LiteralPath (Join-Path $adapter $map.instructions.source) -Destination $mapCopy
    Copy-Item -LiteralPath (Join-Path $adapter 'scripts') -Destination $mapCopy -Recurse
    $map.PSObject.Properties.Remove('hooks')
    $mapPath = Join-Path $mapCopy 'claude-map.json'
    $map | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $mapPath -Encoding utf8
    $drop = Invoke-Sync '-MapPath', $mapPath, '-Apply'
    $afterDrop = Read-Json $settingsPath
    Assert-True ($drop.Exit -eq 0 -and @($afterDrop['hooks']['SessionStart']).Count -eq 1 -and $afterDrop['hooks']['SessionStart'][0]['hooks'][0]['command'] -eq 'echo operator') 'dropping the hook from the map removes only its own entry'
    Assert-True (-not (Test-Path -LiteralPath $installed) -and -not (Read-Json "$claudeHome\.harness-backup\state.json")['hooks'].Count) 'and its installed script, and forgets both'
}
finally {
    $env:CLAUDE_CONFIG_DIR = $savedConfigDir
    foreach ($name in $savedGit.Keys) { [Environment]::SetEnvironmentVariable($name, $savedGit[$name]) }
    if (-not $keep -and (Test-Path -LiteralPath $fixture)) {
        # Remove the junction entry before the tree so no deletion follows it.
        $junction = Join-Path $fixture 'claude-home\worktrees'
        if (Test-Path -LiteralPath $junction) { [IO.Directory]::Delete($junction) }
        Remove-Item -LiteralPath $fixture -Recurse -Force
    }
}

if ($failures.Count -eq 0) {
    Write-Host "Fresh-worktree hook check passed: $checks assertion(s)."
} else {
    Write-Host "Fresh-worktree hook check FAILED: $($failures.Count) of $checks assertion(s)."
}
exit $(if ($failures.Count -eq 0) { 0 } else { 1 })
