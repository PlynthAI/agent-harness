#Requires -Version 7.0
<#
.SYNOPSIS
    Points Claude Code at the installed Codex harness on this host.

.DESCRIPTION
    Claude Code reads the same installed harness as Codex rather than a second
    copy. Driven by claude-map.json, this script:

      - keeps a marked block in the Claude home's CLAUDE.md equal to
        user-CLAUDE.md, which imports the installed Codex AGENTS.md and adds
        Claude runtime notes; the operator's own lines outside it are kept;
      - renders each mapped role from the installed Codex agents/<role>.toml into
        a Claude subagent file. A Claude-runtime role keeps the Codex name,
        description and developer_instructions and adds the operator's Claude
        model binding. A Codex-runtime role becomes a thin forwarder agent named
        by its map key that hands the assignment to that Codex role through
        scripts/codex-forward.mjs and the Codex CLI's `codex exec`, so the Codex role file
        keeps model, effort and instructions. The file of a role the map no
        longer lists is removed. A machine's own bindings live in an untracked
        claude-map.local.json beside the map, holding only roles; each replaces
        the map's binding for that role (a Claude reviewer where Codex is not
        installed, say);
      - copies each mapped script (scripts/<name>.mjs) into the Claude home's
        scripts folder, guarded like the role files;
      - links each installed Codex skill into the Claude skills directory (a
        junction on Windows, a symbolic link elsewhere), except the Codex-only names the map excludes, and removes a
        link it would have made (same name, pointing at that Codex skill) once
        the skill is retired or excluded. Other links into the Codex home are
        the operator's and are left alone;
      - links each whole folder the map names under folders (the principles
        and patterns library) from the Claude home to the installed Codex
        folder of the same name, so a skill's relative link to it resolves in
        both homes; a folder not yet deployed is reported and skipped, and a
        folder link this sync made is removed once the map drops it;
      - copies each mapped hook script from this folder, or from the source
        its entry names elsewhere in the checkout (a hook shared with Codex
        lives in the shared hooks folder), into the Claude home's hooks folder
        and registers it in the Claude home's settings.json under its event
        and matcher. Only the settings entry this sync recognises as
        its own (a handler naming that installed script) is added, replaced or
        removed; every other hook and setting is kept as it is. An entry the
        operator changed since the last sync wrote it is reported as a conflict.

    Run it after each approved Codex deployment. -Plan (the default) writes
    nothing. -Apply backs up every file it replaces or removes, settings.json
    included, under <claude home>\.harness-backup\<id> before writing; the id is
    the UTC time plus a random suffix. It never overwrites a real skill
    directory, a link that points somewhere else, or a role file, hook script or
    hook entry changed since the last sync wrote it; those are reported as
    conflicts. Nor does it link a skill or folder that resolves into the
    checkout this script runs from, even through a junction or a -CodexHome
    naming that checkout; each is reported as a conflict and left unlinked,
    and -Force does not override it. -Force replaces or removes conflicting role files, hook scripts
    and hook entries, still with a backup.

.EXAMPLE
    pwsh -NoProfile -File claude/sync-claude.ps1

.EXAMPLE
    pwsh -NoProfile -File claude/sync-claude.ps1 -Apply
#>
[CmdletBinding()]
param(
    [switch]$Apply,
    [switch]$Force,
    [string]$MapPath = (Join-Path $PSScriptRoot 'claude-map.json'),
    [string]$CodexHome,
    [string]$ClaudeHome
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Windows and macOS volumes ignore case by default; Linux does not.
$pathComparison = if ($IsLinux) { [StringComparison]::Ordinal } else { [StringComparison]::OrdinalIgnoreCase }
$separator = [IO.Path]::DirectorySeparatorChar
$linkType = if ($IsWindows) { 'Junction' } else { 'SymbolicLink' }

function Get-FullPath([string]$Path) {
    $Path = [Environment]::ExpandEnvironmentVariables($Path)
    if ($Path -eq '~' -or $Path -match '^~[\\/]') { $Path = [Environment]::GetFolderPath('UserProfile') + $Path.Substring(1) }
    return [IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
}

# Map and state paths are written with backslashes; this joins one under a root
# in the platform's own form.
function Join-Relative([string]$Root, [string]$Relative) {
    return Join-Path $Root ($Relative -replace '\\', $separator)
}

# Removes the link only, never its target: a junction goes as an empty
# directory, a symbolic link (even one whose target is gone) as a file.
function Remove-Link([string]$Path) {
    if ($IsWindows) { [IO.Directory]::Delete($Path) } else { [IO.File]::Delete($Path) }
}

function Test-SamePath([string]$A, [string]$B) {
    return [string]::Equals((Get-FullPath $A), (Get-FullPath $B), $pathComparison)
}

function Test-UnderPath([string]$Path, [string]$Root) {
    $full = Get-FullPath $Path
    $base = Get-FullPath $Root
    return [string]::Equals($full, $base, $pathComparison) -or $full.StartsWith($base + $separator, $pathComparison)
}

function Get-LinkTargetPath([IO.FileSystemInfo]$Item) {
    # A symbolic link may hold a target relative to its own folder.
    $target = "$($Item.LinkTarget)"
    if (-not $target) { return $null }
    if (-not [IO.Path]::IsPathRooted($target)) { $target = Join-Path (Split-Path -Parent $Item.FullName) $target }
    return Get-FullPath $target
}

# The path a link would really reach: every junction or symbolic link along
# it, at any level, is followed to its target. A part that does not exist ends
# the walk, since nothing below it can redirect.
function Resolve-RealPath([string]$Path) {
    $full = Get-FullPath $Path
    for ($hop = 0; $hop -lt 64; $hop++) {
        $root = [IO.Path]::GetPathRoot($full)
        $parts = @($full.Substring($root.Length).Split([char[]]'\/', [StringSplitOptions]::RemoveEmptyEntries))
        $current = $root
        $redirected = $false
        for ($i = 0; $i -lt $parts.Count; $i++) {
            $current = Join-Path $current $parts[$i]
            $item = Get-Item -LiteralPath $current -Force -ErrorAction SilentlyContinue
            if (-not $item) { return $full }
            if ($item.LinkType -notin 'Junction', 'SymbolicLink') { continue }
            $target = Get-LinkTargetPath $item
            if (-not $target) { return $full }
            $rest = @($parts | Select-Object -Skip ($i + 1))
            $full = if ($rest.Count) { Get-FullPath (Join-Path $target ($rest -join $separator)) } else { $target }
            $redirected = $true
            break
        }
        if (-not $redirected) { return $full }
    }
    throw "Too many links to resolve: $Path"
}

function Test-Excluded([string]$Name, [object]$Patterns) {
    foreach ($pattern in @($Patterns)) {
        if ($Name -like $pattern) { return $true }
    }
    return $false
}

function Read-RoleToml([string]$Path) {
    # The shared role files use only single-line basic strings and one
    # multi-line basic string; fail loudly on anything this reader cannot parse.
    $text = [IO.File]::ReadAllText($Path) -replace "`r`n", "`n"
    $role = @{}
    foreach ($key in 'name', 'description') {
        $match = [regex]::Match($text, "(?m)^$key\s*=\s*""((?:[^""\\]|\\.)*)""\s*$")
        if (-not $match.Success) { throw "$Path has no single-line $key" }
        $role[$key] = [regex]::Unescape($match.Groups[1].Value)
    }
    # The model binding is read when present; a Codex-runtime role needs it.
    $match = [regex]::Match($text, '(?m)^model\s*=\s*"((?:[^"\\]|\\.)*)"\s*$')
    $role.model = if ($match.Success) { [regex]::Unescape($match.Groups[1].Value) } else { $null }
    $match = [regex]::Match($text, '(?ms)^developer_instructions\s*=\s*"""\n?(.*?)"""')
    if (-not $match.Success) { throw "$Path has no developer_instructions block" }
    $role.instructions = $match.Groups[1].Value.TrimEnd()
    if ($role.instructions.Contains('\')) { throw "$Path uses TOML escapes in developer_instructions, which this reader does not decode" }
    return $role
}

function Format-YamlString([string]$Value) {
    return '"' + ($Value -replace '\\', '\\' -replace '"', '\"') + '"'
}

function Format-RoleMarkdown([hashtable]$Role, [object]$Binding) {
    $lines = @(
        '---'
        "name: $($Role.name)"
        "description: $(Format-YamlString $Role.description)"
        "model: $($Binding.model)"
    )
    if ($Binding.PSObject.Properties['effort']) { $lines += "effort: $($Binding.effort)" }
    $lines += '---'
    $lines += ''
    $lines += $Role.instructions
    return ($lines -join "`n") + "`n"
}

# A Codex-runtime role is a forwarder: a small Claude agent, always run as a
# background subagent so its background call survives the end of its turn,
# that makes one background Bash call to codex-forward.mjs, which runs the Codex role through `codex exec`
# and prints Codex's final message. The Codex role file stays the only source
# of the model, effort and instructions; only its description is shown here.
$forwarderBody = @'
You are a thin forwarder. The Codex harness role `{{ROLE}}` does this work in a headless Codex run (`codex exec`); you only hand the assignment over and bring its reply back.

Forwarding rules:

1. Make one Bash call with `run_in_background: true` and `timeout: 4500000` (75 minutes). A Codex review can outlast Claude Code's ten-minute foreground limit and its 30-minute default for background commands; the script stops a runaway run itself at 60 minutes. In it, write the assignment you received, complete and verbatim, to a new temporary file with the quoted heredoc below, then run the forward script on that file. Keep every line of the command at the start of its line, with no indentation, so the heredoc closes.
2. The call's result names the background task's output file; remember that path. Then end your turn with no text at all. The task's completion notice resumes you. Do no other work in between: no reading, searching, planning, summarising, polling or follow-up of your own.
3. When the completion notice arrives, make one more Bash call that prints that output file with `cat`, and nothing else.
4. Return that output exactly as it is, including the `codex-forward: Codex thread <id>` line. If the notice reports a non-zero exit code, return the output followed by that exit code. A reply without that line is an incomplete forward, never your own review. If launching, completion or reading the output fails, return the failure, background task id and output-file path available to you so the lead can recover the result. Never replace a failed forward with your own findings.

- `<working directory>` is the directory the assignment names as the place to work; when it names none, use your current working directory (`$PWD`).
- Keep the flags exactly as shown. The script takes the model, effort and instructions from the Codex role file. {{WRITE_RULE}} If the Codex sandbox cannot write the requested report or send a callback, its final reply is the handback; return it intact for the lead to persist.
- To continue a review, the assignment names the Codex thread id (from the earlier `codex-forward: Codex thread <id>` line) and carries the follow-up, such as the answer to the reviewer's question. Then add `--resume "<thread id>"` at the end of the `node` line, quoted, where the value is only the UUID from that line, and keep the same `--role`; the script sends the follow-up into that same Codex session, which keeps its earlier context.

The command:

```bash
f="$(mktemp "${TMPDIR:-/tmp}/codex-assignment.XXXXXX")" || exit 1
cat > "$f" <<'CODEX_ASSIGNMENT_EOF'
<the assignment, verbatim>
CODEX_ASSIGNMENT_EOF
node "$HOME/.claude/scripts/codex-forward.mjs" --role {{ROLE}} --cwd "<working directory>" --prompt-file "$f"{{WRITE_FLAG}}
status=$?; rm -f "$f"; exit $status
```
'@

function Format-ForwarderMarkdown([string]$Name, [hashtable]$Role, [bool]$Write) {
    if (-not $Role.model) { throw "Codex role '$($Role.name)' has no single-line model, which its forwarder description names" }
    $writeRule = if ($Write) { 'This role runs with write access, so the call carries `--write`; its role instructions say what it may write.' }
    else { 'This role runs read-only; never add `--write`.' }
    $writeFlag = if ($Write) { ' --write' } else { '' }
    $body = ($forwarderBody -replace "`r`n", "`n").Replace('{{ROLE}}', $Role.name).Replace('{{WRITE_FLAG}}', $writeFlag).Replace('{{WRITE_RULE}}', $writeRule)
    $lines = @(
        '---'
        "name: $Name"
        "description: $(Format-YamlString "Runs on the Codex side ($($Role.model)): $($Role.description)")"
        'model: haiku'
        'tools: Bash'
        'background: true'
        '---'
        ''
        $body.TrimEnd()
    )
    return ($lines -join "`n") + "`n"
}

function Get-Hash([string]$Text) {
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($Text)))
}

function Get-TextOrNull([string]$Path) {
    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        return [IO.File]::ReadAllText($Path) -replace "`r`n", "`n"
    }
    return $null
}

# Claude ignores key order in settings.json, so a hook entry is compared with
# its keys sorted: a reformatted but equal entry is still the one this wrote.
function ConvertTo-Canonical($Value) {
    if ($Value -is [Collections.IDictionary]) {
        $sorted = [ordered]@{}
        foreach ($key in @($Value.Keys | Sort-Object)) { $sorted[$key] = ConvertTo-Canonical $Value[$key] }
        return $sorted
    }
    if ($Value -is [Collections.IList]) { return , @($Value | ForEach-Object { ConvertTo-Canonical $_ }) }
    return $Value
}

function Get-EntryKey($Group) {
    return ConvertTo-Canonical $Group | ConvertTo-Json -Depth 20 -Compress
}

# A handler is this sync's when its command or an argument names the installed
# script, whichever Claude home or slash style the path was written with.
function Test-OwnHandler($Handler, [string]$Relative) {
    if ($Handler -isnot [Collections.IDictionary]) { return $false }
    $needle = '/' + ($Relative -replace '\\', '/')
    foreach ($text in @($Handler['command']) + @($Handler['args'] ?? @())) {
        if ("$text".Replace('\', '/').IndexOf($needle, [StringComparison]::OrdinalIgnoreCase) -ge 0) { return $true }
    }
    return $false
}

$map = Get-Content -LiteralPath $MapPath -Raw | ConvertFrom-Json
$localMapPath = Join-Path (Split-Path -Parent (Get-FullPath $MapPath)) 'claude-map.local.json'
if (Test-Path -LiteralPath $localMapPath) {
    $localMap = Get-Content -LiteralPath $localMapPath -Raw | ConvertFrom-Json
    foreach ($key in $localMap.PSObject.Properties.Name) {
        if ($key -ne 'roles') { throw "claude-map.local.json may set only roles, not '$key'" }
    }
    foreach ($property in @(if ($localMap.PSObject.Properties['roles']) { $localMap.roles.PSObject.Properties })) {
        if (-not $map.roles.PSObject.Properties[$property.Name]) { throw "claude-map.local.json binds '$($property.Name)', which claude-map.json does not map" }
        $map.roles.($property.Name) = $property.Value
    }
    Write-Host "Local role bindings: $localMapPath"
}
$mapRoot = Split-Path -Parent (Get-FullPath $MapPath)
$codex = if ($CodexHome) { Get-FullPath $CodexHome } else { Get-FullPath $map.codexHome }
$claude = if ($ClaudeHome) { Get-FullPath $ClaudeHome } else { Get-FullPath $map.claudeHome }
$codexSkills = Join-Path $codex 'skills'
$claudeSkills = Join-Path $claude 'skills'
# The harness checkout this script runs from. Sync never links a home into it,
# even when -CodexHome names it or a Codex-side folder is a link into it.
$sourceRoot = Resolve-RealPath (Split-Path -Parent $PSScriptRoot)
function Test-InSource([string]$Path) { return Test-UnderPath (Resolve-RealPath $Path) $sourceRoot }

foreach ($required in $codex, $claude, $codexSkills, (Join-Path $codex 'agents')) {
    if (-not (Test-Path -LiteralPath $required -PathType Container)) { throw "Missing directory: $required" }
}

Write-Host "Codex home:  $codex"
Write-Host "Claude home: $claude"
Write-Host "Mode:        $(if ($Apply) { 'apply' } else { 'plan (no changes)' })"

$statePath = Join-Relative $claude '.harness-backup\state.json'
$stateJson = @{}
if (Test-Path -LiteralPath $statePath) { $stateJson = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json -AsHashtable }
$state = $stateJson['files'] ?? @{}
$hookState = $stateJson['hooks'] ?? @{}
$blockStart = '<!-- claude-harness:begin (managed by sync-claude.ps1; edit outside this block) -->'
$blockEnd = '<!-- claude-harness:end -->'

$files = [Collections.Generic.List[object]]::new()
$links = [Collections.Generic.List[object]]::new()
$conflicts = [Collections.Generic.List[string]]::new()

# CLAUDE.md is the operator's file: the adapter owns only its marked block.
# A file that is still exactly an earlier adapter copy is taken over whole.
$instructionSource = Join-Path $mapRoot $map.instructions.source
$instructionText = ([IO.File]::ReadAllText($instructionSource) -replace "`r`n", "`n").TrimEnd()
$block = "$blockStart`n$instructionText`n$blockEnd`n"
$currentInstructions = Get-TextOrNull (Join-Path $claude $map.instructions.target)
$instructionContent = if ($null -eq $currentInstructions -or $currentInstructions.TrimEnd() -ceq $instructionText) { $block }
elseif ($currentInstructions.Contains($blockStart) -and $currentInstructions.Contains($blockEnd)) {
    $pattern = [regex]::Escape($blockStart) + '[\s\S]*?' + [regex]::Escape($blockEnd) + "`n?"
    [regex]::Replace($currentInstructions, $pattern, { param($m) $block }, 1)
}
else { $block + "`n" + $currentInstructions }
$files.Add([pscustomobject]@{ Relative = $map.instructions.target; Content = $instructionContent; Guarded = $false })
# A map key is the Claude agent name. A Claude-runtime role renders the Codex
# role of the same name; a Codex-runtime role renders a forwarder to the Codex
# role its `role` field names, defaulting to the key.
$codexRuntimeRoles = [Collections.Generic.List[string]]::new()
foreach ($property in $map.roles.PSObject.Properties) {
    $binding = $property.Value
    $has = { param($key) [bool]$binding.PSObject.Properties[$key] }
    if ($property.Name -notmatch '^[A-Za-z0-9_-]+$') { throw "Role key '$($property.Name)' is not a plain agent name" }
    $runtime = if (& $has 'runtime') { "$($binding.runtime)" } else { 'claude' }
    if ($runtime -notin 'claude', 'codex') { throw "Role '$($property.Name)' has runtime '$runtime'; use 'claude' or 'codex'" }
    if ($runtime -eq 'codex') {
        foreach ($key in 'model', 'effort') {
            if (& $has $key) { throw "Codex-runtime role '$($property.Name)' sets $key; the Codex role file owns it" }
        }
        if ((& $has 'write') -and $binding.write -isnot [bool]) { throw "Codex-runtime role '$($property.Name)' has a non-boolean write" }
        $tomlName = if (& $has 'role') { "$($binding.role)" } else { $property.Name }
        if ($tomlName -notmatch '^[A-Za-z0-9_-]+$') { throw "Role '$($property.Name)' names Codex role '$tomlName', which is not a plain role name" }
        $codexRuntimeRoles.Add($property.Name)
    }
    else {
        foreach ($key in 'role', 'write') {
            if (& $has $key) { throw "Claude-runtime role '$($property.Name)' sets $key, which only a Codex-runtime role takes" }
        }
        $tomlName = $property.Name
    }
    $toml = Join-Relative $codex "agents\$tomlName.toml"
    if (-not (Test-Path -LiteralPath $toml)) { throw "Mapped role has no installed Codex file: $toml" }
    $role = Read-RoleToml $toml
    if ($role.name -ne $tomlName) { throw "$toml declares name '$($role.name)', expected '$tomlName'" }
    $content = if ($runtime -eq 'codex') { Format-ForwarderMarkdown $property.Name $role ((& $has 'write') -and $binding.write) }
    else { Format-RoleMarkdown $role $binding }
    $files.Add([pscustomobject]@{
        Relative = "agents\$($property.Name).md"
        Content  = $content
        Guarded  = $true
    })
}
# Scripts are installed copies like the hook scripts; forwarder agents call the
# installed codex-forward.mjs, so a map with Codex-runtime roles must carry it.
$scriptSpecs = @(if ($map.PSObject.Properties['scripts']) { $map.scripts })
foreach ($script in $scriptSpecs) {
    $relative = "$script" -replace '/', '\'
    if ($relative -notmatch '^scripts\\[^\\/]+\.mjs$') { throw "A mapped script must be scripts/<name>.mjs, not '$script'" }
    $source = Join-Relative $mapRoot $relative
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Mapped script has no source file: $source" }
    $files.Add([pscustomobject]@{
        Relative = $relative
        Content  = ([IO.File]::ReadAllText($source) -replace "`r`n", "`n")
        Guarded  = $true
    })
}
if ($codexRuntimeRoles.Count -and -not @($files | Where-Object Relative -eq 'scripts\codex-forward.mjs')) {
    throw "Codex-runtime roles ($($codexRuntimeRoles -join ', ')) need scripts/codex-forward.mjs under the map's scripts"
}
# Hook scripts are installed copies, like the roles: the settings entry points
# into the Claude home, never back into this source folder.
$hookSpecs = @(if ($map.PSObject.Properties['hooks']) { $map.hooks })
foreach ($hook in $hookSpecs) {
    $relative = $hook.script -replace '/', '\'
    if ($relative -notmatch '^hooks\\[^\\/]+\.ps1$') { throw "A mapped hook script must be hooks/<name>.ps1, not '$($hook.script)'" }
    # A hook shared with Codex keeps its one source in the checkout's shared
    # hooks folder; `source` names it relative to this map, inside the checkout.
    # Containment is judged on real paths, so a junction or symbolic link inside
    # the checkout cannot lead the source out of it.
    $source = if ($hook.PSObject.Properties['source']) { Get-FullPath (Join-Path $mapRoot $hook.source) } else { Join-Relative $mapRoot $relative }
    $realSource = Resolve-RealPath $source
    if ($realSource -notmatch '\.ps1$' -or -not (Test-UnderPath $realSource (Resolve-RealPath (Split-Path -Parent $mapRoot)))) { throw "Mapped hook source '$($hook.source)' resolves to $realSource, which is outside the harness checkout or not a .ps1 file" }
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Mapped hook has no source script: $source" }
    $files.Add([pscustomobject]@{
        Relative = $relative
        Content  = ([IO.File]::ReadAllText($source) -replace "`r`n", "`n")
        Guarded  = $true
    })
}
foreach ($file in $files) {
    $current = Get-TextOrNull (Join-Relative $claude $file.Relative)
    $action = if ($null -eq $current) { 'add' } elseif ($current -ceq $file.Content) { 'unchanged' } else { 'replace' }
    # A role file the operator changed after the last sync, or one this adapter
    # never wrote, is theirs until they say otherwise.
    if ($action -eq 'replace' -and $file.Guarded -and -not $Force -and $state[$file.Relative] -ne (Get-Hash $current)) {
        $action = 'conflict'
        $conflicts.Add("$($file.Relative) differs from what the last sync wrote; review it, then re-run with -Force to replace it")
    }
    $file | Add-Member Action $action
}

# A role file or hook script an earlier sync wrote that the map no longer lists
# is removed while it is still exactly what that sync wrote; an edited one is
# the operator's until they say otherwise, and its recorded hash is kept so
# -Force can still retire it later.
$retired = [Collections.Generic.List[object]]::new()
$mapped = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($file in $files) { [void]$mapped.Add($file.Relative) }
foreach ($relative in @($state.Keys | Sort-Object)) {
    if ($relative -notmatch '^(agents\\[^\\/]+\.md|hooks\\[^\\/]+\.ps1|scripts\\[^\\/]+\.mjs)$' -or $mapped.Contains($relative)) { continue }
    $current = Get-TextOrNull (Join-Relative $claude $relative)
    if ($null -eq $current) { continue }   # already gone; its record is dropped
    $action = 'remove'
    if (-not $Force -and $state[$relative] -ne (Get-Hash $current)) {
        $action = 'conflict'
        $conflicts.Add("$relative is no longer mapped but differs from what the last sync wrote; review it, then re-run with -Force to remove it")
    }
    $retired.Add([pscustomobject]@{ Relative = $relative; Action = $action })
}

# Skills are links to the installed Codex copies, never copies of their own.
$wanted = @{}
foreach ($dir in Get-ChildItem -LiteralPath $codexSkills -Directory) {
    if (Test-Excluded $dir.Name $map.skills.exclude) { continue }
    if (-not (Test-Path -LiteralPath (Join-Path $dir.FullName 'SKILL.md'))) { continue }
    $wanted[$dir.Name] = $dir.FullName
}
foreach ($name in ($wanted.Keys | Sort-Object)) {
    $link = Join-Path $claudeSkills $name
    if (Test-InSource $wanted[$name]) {
        $conflicts.Add("skills\$name resolves into the source checkout at $(Resolve-RealPath $wanted[$name]); a home is never linked into it, so it was not linked")
        continue
    }
    $item = Get-Item -LiteralPath $link -Force -ErrorAction SilentlyContinue
    if (-not $item) { $links.Add([pscustomobject]@{ Name = $name; Action = 'link'; Path = $link; Target = $wanted[$name] }); continue }
    if (-not $item.LinkType) { $conflicts.Add("skills\$name is a real directory; the installed Codex skill was not linked"); continue }
    $target = Get-LinkTargetPath $item
    if ($target -and (Test-SamePath $target $wanted[$name])) { $links.Add([pscustomobject]@{ Name = $name; Action = 'unchanged'; Path = $link; Target = $wanted[$name] }); continue }
    $conflicts.Add("skills\$name links to $($item.LinkTarget), not the installed Codex skill")
}
if (Test-Path -LiteralPath $claudeSkills) {
    foreach ($item in Get-ChildItem -LiteralPath $claudeSkills -Force | Where-Object LinkType -in 'Junction', 'SymbolicLink') {
        if ($wanted.ContainsKey($item.Name)) { continue }
        $target = Get-LinkTargetPath $item
        if (-not $target) { continue }
        # Only a link this sync would have made is retired: named after a Codex
        # skill and pointing at that skill. Any other link into the Codex home
        # is the operator's own alias and is reported, never removed.
        if (Test-SamePath $target (Join-Path $codexSkills $item.Name)) {
            $links.Add([pscustomobject]@{ Name = $item.Name; Action = 'unlink'; Path = $item.FullName; Target = $target })
        }
        elseif (Test-UnderPath $target $codex) {
            $links.Add([pscustomobject]@{ Name = $item.Name; Action = 'foreign'; Path = $item.FullName; Target = $target })
        }
    }
}
$linkChanges = @($links | Where-Object Action -in 'link', 'unlink')

# Whole folders installed beside skills (the principles and patterns library)
# are linked into the Claude home under the same name, so a skill's relative
# link such as ../../principles-and-patterns/index.md resolves there as it does
# in the Codex home. A folder link an earlier sync made is removed once the map
# drops it, while it still points at that Codex folder.
$folderNames = @(if ($map.PSObject.Properties['folders']) { $map.folders })
$folderLinks = [Collections.Generic.List[object]]::new()
foreach ($name in $folderNames) {
    if ("$name" -notmatch '^[A-Za-z0-9][A-Za-z0-9_.-]*$' -or "$name" -in 'skills', 'agents', 'hooks', 'scripts') { throw "Mapped folder '$name' is not a plain folder name beside skills" }
    $target = Join-Path $codex $name
    $link = Join-Path $claude $name
    if (-not (Test-Path -LiteralPath $target -PathType Container)) {
        $conflicts.Add("$name is not installed in the Codex home; deploy it, then sync again")
        continue
    }
    if (Test-InSource $target) {
        $conflicts.Add("$name resolves into the source checkout at $(Resolve-RealPath $target); a home is never linked into it, so it was not linked")
        continue
    }
    $item =Get-Item -LiteralPath $link -Force -ErrorAction SilentlyContinue
    if (-not $item) { $folderLinks.Add([pscustomobject]@{ Name = $name; Action = 'link'; Path = $link; Target = $target }); continue }
    if (-not $item.LinkType) { $conflicts.Add("$name is a real directory in the Claude home; the installed Codex folder was not linked"); continue }
    $current = Get-LinkTargetPath $item
    if ($current -and (Test-SamePath $current $target)) { $folderLinks.Add([pscustomobject]@{ Name = $name; Action = 'unchanged'; Path = $link; Target = $target }); continue }
    $conflicts.Add("$name links to $($item.LinkTarget), not the installed Codex folder")
}
foreach ($name in @($stateJson['folders'] ?? @())) {
    if ($folderNames -contains $name -or "$name" -notmatch '^[A-Za-z0-9][A-Za-z0-9_.-]*$') { continue }
    $item = Get-Item -LiteralPath (Join-Path $claude $name) -Force -ErrorAction SilentlyContinue
    if (-not $item -or -not $item.LinkType) { continue }
    $current = Get-LinkTargetPath $item
    if ($current -and (Test-SamePath $current (Join-Path $codex $name))) {
        $folderLinks.Add([pscustomobject]@{ Name = $name; Action = 'unlink'; Path = $item.FullName; Target = $current })
    }
}
$folderChanges = @($folderLinks | Where-Object Action -in 'link', 'unlink')

# settings.json belongs to the operator and to Claude itself. This sync owns
# only the hook entries it registers: one matcher group per mapped script,
# holding a single handler that runs the installed copy. It adds its entry
# beside any other hooks at that event, replaces it only while it is still
# what the last sync wrote, and removes it once the map drops the script.
$settingsPath = Join-Path $claude 'settings.json'
$settingsText = Get-TextOrNull $settingsPath
$settingsJson = if ($settingsText -and $settingsText.Trim()) { $settingsText | ConvertFrom-Json -AsHashtable } else { [ordered]@{} }
$hookEntries = [Collections.Generic.List[object]]::new()
foreach ($hook in $hookSpecs) {
    $relative = $hook.script -replace '/', '\'
    $handler = [ordered]@{
        type    = 'command'
        command = 'pwsh'
        args    = @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', ((Join-Relative $claude $relative) -replace '\\', '/'))
    }
    if ($hook.PSObject.Properties['timeout']) { $handler.timeout = $hook.timeout }
    $group = [ordered]@{}
    if ($hook.PSObject.Properties['matcher']) { $group.matcher = $hook.matcher }
    $group.hooks = @($handler)
    $hookEntries.Add([pscustomobject]@{ Key = "$($hook.event)|$relative"; Event = $hook.event; Relative = $relative; Group = $group })
}
foreach ($key in @($hookState.Keys | Sort-Object)) {
    if (@($hookEntries | Where-Object Key -eq $key)) { continue }
    $event, $relative = $key -split '\|', 2
    $hookEntries.Add([pscustomobject]@{ Key = $key; Event = $event; Relative = $relative; Group = $null })
}
$eventMap = $settingsJson['hooks']
foreach ($entry in $hookEntries) {
    $groups = @(if ($eventMap -is [Collections.IDictionary] -and $eventMap.Contains($entry.Event)) { $eventMap[$entry.Event] })
    $own = @(for ($i = 0; $i -lt $groups.Count; $i++) {
        $handlers = @(if ($groups[$i] -is [Collections.IDictionary]) { $groups[$i]['hooks'] })
        if (@($handlers | Where-Object { Test-OwnHandler $_ $entry.Relative })) {
            [pscustomobject]@{ Index = $i; Alone = ($handlers.Count -eq 1); Group = $groups[$i] }
        }
    })
    $action = $null
    $index = -1
    if ($own.Count -eq 0) { $action = if ($entry.Group) { 'add' } else { 'gone' } }
    elseif ($own.Count -gt 1 -or -not $own[0].Alone) {
        $action = 'conflict'
        $conflicts.Add("settings.json hooks.$($entry.Event) runs $($entry.Relative) more than once or beside other handlers in one group; merge it by hand")
    }
    else {
        $index = $own[0].Index
        $current = Get-EntryKey $own[0].Group
        $ours = $Force -or ($hookState[$entry.Key] -eq (Get-Hash $current))
        if ($entry.Group -and $current -ceq (Get-EntryKey $entry.Group)) { $action = 'unchanged' }
        elseif ($ours) { $action = if ($entry.Group) { 'replace' } else { 'remove' } }
        else {
            $action = 'conflict'
            $conflicts.Add("settings.json hooks.$($entry.Event) entry for $($entry.Relative) differs from what the last sync wrote; review it, then re-run with -Force to $(if ($entry.Group) { 'replace' } else { 'remove' }) it")
        }
    }
    $entry | Add-Member Action $action
    $entry | Add-Member Index $index
}
$hookChanges = @($hookEntries | Where-Object Action -in 'add', 'replace', 'remove')
$settingsWrite = $null
if ($hookChanges.Count) {
    if ($settingsJson['hooks'] -isnot [Collections.IDictionary]) { $settingsJson['hooks'] = [ordered]@{} }
    foreach ($event in @($hookChanges.Event | Sort-Object -Unique)) {
        $groups = [Collections.Generic.List[object]]::new()
        if ($settingsJson['hooks'].Contains($event)) { foreach ($group in @($settingsJson['hooks'][$event])) { $groups.Add($group) } }
        $dropped = [Collections.Generic.HashSet[int]]::new()
        # New entries go last, so the indexes found above still hold.
        foreach ($entry in $hookChanges | Where-Object Event -eq $event) {
            switch ($entry.Action) {
                'add'     { $groups.Add($entry.Group) }
                'replace' { $groups[$entry.Index] = $entry.Group }
                'remove'  { [void]$dropped.Add($entry.Index) }
            }
        }
        $kept = @(for ($i = 0; $i -lt $groups.Count; $i++) { if (-not $dropped.Contains($i)) { $groups[$i] } })
        if ($kept.Count) { $settingsJson['hooks'][$event] = $kept } else { $settingsJson['hooks'].Remove($event) }
    }
    if ($settingsJson['hooks'].Count -eq 0) { $settingsJson.Remove('hooks') }
    $settingsWrite = [pscustomobject]@{
        Relative = 'settings.json'
        Action   = if ($null -eq $settingsText) { 'add' } else { 'replace' }
        Content  = (($settingsJson | ConvertTo-Json -Depth 100) -replace "`r`n", "`n") + "`n"
    }
}

foreach ($file in $files | Where-Object Action -ne 'conflict') { Write-Host ("  {0,-9} {1}" -f $file.Action, $file.Relative) }
foreach ($entry in $hookEntries | Where-Object Action -in 'add', 'replace', 'remove', 'unchanged') {
    $matcher = if ($entry.Group -and $entry.Group.Contains('matcher')) { " ($($entry.Group.matcher))" } else { '' }
    Write-Host ("  {0,-9} settings.json hooks.{1}{2} -> {3}" -f $entry.Action, $entry.Event, $matcher, $entry.Relative)
    if ($entry.Action -in 'add', 'replace') { Write-Host "            $($entry.Group | ConvertTo-Json -Depth 10 -Compress)" }
}
foreach ($file in $retired | Where-Object Action -eq 'remove') { Write-Host ("  {0,-9} {1}" -f $file.Action, $file.Relative) }
$counts = $links | Group-Object Action | ForEach-Object { "$($_.Count) $($_.Name)" }
Write-Host "  skills:   $($counts -join ', ')"
foreach ($entry in $linkChanges) { Write-Host ("  {0,-9} skills\{1}" -f $entry.Action, $entry.Name) }
foreach ($entry in $links | Where-Object Action -eq 'foreign') {
    Write-Host ("  {0,-9} skills\{1} -> {2} (not a link this sync makes; left alone)" -f $entry.Action, $entry.Name, $entry.Target)
}
foreach ($entry in $folderLinks) { Write-Host ("  {0,-9} {1} -> {2}" -f $entry.Action, $entry.Name, $entry.Target) }
foreach ($conflict in $conflicts) { Write-Warning $conflict }

$instructionFiles = $settingsJson['pluginConfigs']?['agents-md@builtin']?['options']?['instructionFiles']
if ($instructionFiles -ne 'claude-md-and-agents-md') {
    Write-Warning "settings.json should set pluginConfigs.agents-md@builtin.options.instructionFiles to 'claude-md-and-agents-md' so repository AGENTS.md files load alongside any CLAUDE.md (currently: $(if ($instructionFiles) { $instructionFiles } else { 'default' }))."
}

$writes = @($files | Where-Object { $_.Action -in 'add', 'replace' })
$removals = @($retired | Where-Object Action -eq 'remove')
$pending = $writes + $removals + $linkChanges + $folderChanges + @($hookChanges)

# Record what this adapter owns now, so a later operator edit is recognisable.
# A retired role, hook script or hook entry kept as a conflict stays recorded;
# a removed one is forgotten.
function Save-State {
    $record = [ordered]@{}
    foreach ($file in $files) {
        $record[$file.Relative] = if ($file.Action -eq 'conflict') { $state[$file.Relative] } else { Get-Hash $file.Content }
    }
    foreach ($file in $retired | Where-Object Action -eq 'conflict') { $record[$file.Relative] = $state[$file.Relative] }
    $hookRecord = [ordered]@{}
    foreach ($entry in $hookEntries) {
        if ($entry.Action -eq 'conflict') {
            if ($hookState.Contains($entry.Key)) { $hookRecord[$entry.Key] = $hookState[$entry.Key] }
        }
        elseif ($entry.Group) { $hookRecord[$entry.Key] = Get-Hash (Get-EntryKey $entry.Group) }
    }
    # Folder links this sync made and keeps, so a later map that drops one can
    # retire it without touching a same-named link the operator made.
    $folderRecord = @($folderLinks | Where-Object Action -in 'link', 'unchanged' | ForEach-Object Name | Sort-Object)
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $statePath) | Out-Null
    [ordered]@{ files = $record; hooks = $hookRecord; folders = $folderRecord } | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8
}
if (-not $Apply) {
    Write-Host "$($pending.Count) change(s) planned. Re-run with -Apply to make them."
    return
}
if ($pending.Count -eq 0) {
    Save-State
    Write-Host 'Nothing to change.'
    return
}

# Each apply gets its own backup directory: the time alone repeats when two
# applies land in the same second, so a random suffix follows it, and an
# existing directory is never reused.
$now = (Get-Date).ToUniversalTime()
$backupId = $now.ToString('yyyyMMddTHHmmssZ') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$backupRoot = Join-Path $claude '.harness-backup'
$backup = Join-Path $backupRoot $backupId
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
if (Test-Path -LiteralPath $backup) { throw "Backup directory already exists: $backup" }
New-Item -ItemType Directory -Path $backup | Out-Null
$manifest = [ordered]@{ id = $backupId; created = $now.ToString('o'); codexHome = $codex; claudeHome = $claude; files = @(); links = @(); hooks = @() }
$settingsFiles = @(if ($settingsWrite) { $settingsWrite })
foreach ($file in @($files | Where-Object Action -eq 'replace') + $removals + @($settingsFiles | Where-Object Action -eq 'replace')) {
    $destination = Join-Relative $backup $file.Relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    Copy-Item -LiteralPath (Join-Relative $claude $file.Relative) -Destination $destination
}
foreach ($file in $writes + $removals + $settingsFiles) {
    $manifest.files += [ordered]@{ path = $file.Relative; action = $file.Action }
}
foreach ($entry in $linkChanges) {
    $manifest.links += [ordered]@{ name = $entry.Name; action = $entry.Action; target = $entry.Target }
}
foreach ($entry in $folderChanges) {
    $manifest.links += [ordered]@{ name = $entry.Name; action = $entry.Action; target = $entry.Target; folder = $true }
}
foreach ($entry in $hookChanges) {
    $manifest.hooks += [ordered]@{ event = $entry.Event; script = $entry.Relative; action = $entry.Action }
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $backup 'manifest.json') -Encoding utf8

foreach ($file in $writes) {
    $destination = Join-Relative $claude $file.Relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    [IO.File]::WriteAllText($destination, $file.Content, [Text.UTF8Encoding]::new($false))
}
foreach ($file in $removals) { [IO.File]::Delete((Join-Relative $claude $file.Relative)) }
New-Item -ItemType Directory -Force -Path $claudeSkills | Out-Null
foreach ($entry in $links) {
    switch ($entry.Action) {
        'link'   { New-Item -ItemType $linkType -Path $entry.Path -Target $entry.Target | Out-Null }
        'unlink' { Remove-Link $entry.Path }
    }
}
foreach ($entry in $folderChanges) {
    switch ($entry.Action) {
        'link'   { New-Item -ItemType $linkType -Path $entry.Path -Target $entry.Target | Out-Null }
        'unlink' { Remove-Link $entry.Path }
    }
}
# The scripts are in place before the settings entry that runs them. The new
# settings file replaces the old one in a single move, so Claude never reads a
# half-written file.
if ($settingsWrite) {
    $temporary = "$settingsPath.harness-$backupId.tmp"
    [IO.File]::WriteAllText($temporary, $settingsWrite.Content, [Text.UTF8Encoding]::new($false))
    [IO.File]::Move($temporary, $settingsPath, $true)
}
Save-State
Write-Host "Applied $($pending.Count) change(s). Backup and manifest: $backup"
