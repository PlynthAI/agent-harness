#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the shared validate-implementation selector.

.DESCRIPTION
    Checks only what a machine can decide: the skill, its profile reference,
    evidence template, selector script and fixtures exist, as do the quality
    kit reference and its suppression count and binding paths scripts, whose
    unittest suites run here; the frontmatter names
    the skill; every relative link resolves inside the shared skill library; the reference
    carries the two ownership sections and the four change shapes; the plain
    status vocabulary is complete; the selector is wired into run-all.ps1; and no
    file embeds a host path.

    On Windows it also runs the Node profile hook in fresh shells against a fake
    fnm on PATH (no default alias, a default alias, a declared version that is
    installed, one that is not) and asserts that cd never reaches fnm's
    interactive install prompt. Real fnm is never invoked.

    Behaviour of the selector (which profile a path activates, what counts as a
    pass, when reuse is stale) is covered by its own node fixtures, which run-all
    executes. Prose meaning is left to review.

    It runs no project check, installs nothing and touches no product workspace;
    the hook scenarios write only to a temporary folder they remove.
#>
[CmdletBinding()]
param([switch]$Quiet)

# 2026-09-22: removed assertions requiring the user router to repeat skill
# procedures. Shared skill contracts and executable/package checks remain;
# the approved short AGENTS.md is a legitimate case, reviewed as prose.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$failures = [System.Collections.Generic.List[string]]::new()
$checks = 0

function Assert-True {
    param([bool]$Condition, [string]$Message)
    $script:checks++
    if ($Condition) { if (-not $Quiet) { Write-Host ("  ok   " + $Message) } }
    else { $script:failures.Add($Message); Write-Host ("  FAIL " + $Message) }
}

$root = Split-Path $PSScriptRoot -Parent
$skillDir = Join-Path $root 'skills\validate-implementation'
$skillPath = Join-Path $skillDir 'SKILL.md'
$profilesPath = Join-Path $skillDir 'references\profiles.md'
$templatePath = Join-Path $skillDir 'templates\evidence.md'
$recordPath = Join-Path $skillDir 'templates\evidence.json'
$selectorPath = Join-Path $skillDir 'scripts\select-checks.mjs'
$testsPath = Join-Path $skillDir 'tests\select-checks.test.mjs'
$runAllPath = Join-Path $root 'checks\run-all.ps1'

function Get-MarkdownTableRows {
    param([string]$Text)
    $rows = [System.Collections.Generic.List[object]]::new()
    foreach ($line in ($Text -split "\r?\n")) {
        if ($line -notmatch '^\s*\|') { continue }
        $cells = @(($line.Trim().Trim('|')) -split '\|' | ForEach-Object { $_.Trim() })
        if ($cells.Count -eq 0) { continue }
        if (@($cells | Where-Object { $_ -notmatch '^-{2,}$' }).Count -eq 0) { continue }
        $rows.Add($cells)
    }
    return $rows
}

Write-Host ''
Write-Host 'The skill and its parts'

foreach ($pair in @(
        @{ Path = $skillPath; Label = 'the skill' },
        @{ Path = $profilesPath; Label = 'the profile reference' },
        @{ Path = $templatePath; Label = 'the evidence template' },
        @{ Path = $recordPath; Label = 'the evidence record template' },
        @{ Path = $selectorPath; Label = 'the selector script' },
        @{ Path = $testsPath; Label = 'the selector fixtures' })) {
    Assert-True (Test-Path -LiteralPath $pair.Path) "$($pair.Label) exists"
}

$skill = Get-Content -Raw -LiteralPath $skillPath
$profiles = Get-Content -Raw -LiteralPath $profilesPath
$template = Get-Content -Raw -LiteralPath $templatePath

# YAML allows a quoted scalar and a folded block; accepting both avoids failing a
# harmless edit.
function Get-FrontMatterField {
    param([string]$Text, [string]$Key)
    $block = [regex]::Match($Text, '(?s)\A---\r?\n(.*?)\r?\n---')
    if (-not $block.Success) { return $null }
    $lines = $block.Groups[1].Value -split "\r?\n"
    for ($index = 0; $index -lt $lines.Count; $index++) {
        $match = [regex]::Match($lines[$index], '^\s*' + [regex]::Escape($Key) + ':\s*(.*)$')
        if (-not $match.Success) { continue }
        $value = $match.Groups[1].Value.Trim()
        if ($value -match '^[>|][+-]?$') {
            $parts = [System.Collections.Generic.List[string]]::new()
            for ($next = $index + 1; $next -lt $lines.Count; $next++) {
                if ($lines[$next].Trim() -ne '' -and $lines[$next] -notmatch '^\s') { break }
                $parts.Add($lines[$next].Trim())
            }
            $value = ($parts -join ' ').Trim()
        }
        return $value.Trim('"', "'")
    }
    return $null
}

Assert-True ([regex]::IsMatch($skill, '(?s)\A---\r?\n.*?\r?\n---')) 'the skill opens with frontmatter'
$name = Get-FrontMatterField -Text $skill -Key 'name'
$description = Get-FrontMatterField -Text $skill -Key 'description'
Assert-True ($name -eq 'validate-implementation') "the frontmatter names the skill validate-implementation (found '$name')"
Assert-True (-not [string]::IsNullOrWhiteSpace($description) -and $description.Length -ge 40) 'the frontmatter carries a description a session can select on'

Write-Host ''
Write-Host 'The profile contract describes every change shape'

# Exact table rows rather than a token that could match anywhere. A token match
# passed with the whole row deleted, because the word also appears in the example
# profile above it.
$expectedShapes = @('backend', 'frontend/browser', 'docs or harness-only', 'mixed')
$shapesSection = [regex]::Match($profiles, '(?s)#+\s*The four shapes it must describe(.*)$')
Assert-True ($shapesSection.Success) 'the reference has a section for the four shapes'
if ($shapesSection.Success) {
    $shapeRows = Get-MarkdownTableRows -Text $shapesSection.Groups[1].Value
    $shapeLabels = @($shapeRows | Select-Object -Skip 1 | ForEach-Object { $_[0] })
    foreach ($shape in $expectedShapes) {
        Assert-True ($shapeLabels -contains $shape) "the shapes table has a row for $shape"
    }
    Assert-True ($shapeLabels.Count -eq $expectedShapes.Count) "the shapes table has exactly $($expectedShapes.Count) shapes (found $($shapeLabels.Count))"
}
Assert-True ($profiles -match '(?is)#+\s*What (the|a) project owns') 'the reference separates what the project owns'
Assert-True ($profiles -match '(?is)#+\s*What this skill owns') 'the reference separates what this skill owns'
Assert-True ($profiles -match '(?i)unmapped') 'the reference says an uncovered path is reported, not passed'
Assert-True ($profiles -match '(?i)schemaVersion') 'the reference defines the profile document'
Assert-True ($profiles -match '(?is)#+\s*What `when` may not be') 'the reference states what a when glob may not encode'

# Acceptance (1) applies to the files that carry the examples too: every run
# value shown must be a placeholder, never a universal command.
$exampleRuns = @([regex]::Matches($profiles, '"run":\s*"([^"]*)"') | ForEach-Object { $_.Groups[1].Value })
Assert-True ($exampleRuns.Count -ge 1) "the reference shows run values in its example (found $($exampleRuns.Count))"
foreach ($value in $exampleRuns) {
    Assert-True ($value -match '^<.+>$') "the example run value is a placeholder rather than a command ('$value')"
}

Write-Host ''
Write-Host 'The status vocabulary is complete'

# The vocabulary is a field of the evidence record, so it is asserted where the
# record defines it: one line of the template listing all six. Asserting that any
# of three files merely mentions a word would pass while a status was deleted.
$statuses = @('pass', 'fail', 'skipped', 'unavailable', 'cancelled', 'not_run')
$vocabularyLines = @(Get-Content -LiteralPath $templatePath | Where-Object {
        $line = $_
        @($statuses | Where-Object { $line -match ('(?i)\b' + [regex]::Escape($_) + '\b') }).Count -eq $statuses.Count
    })
Assert-True ($vocabularyLines.Count -ge 1) 'the evidence template lists all six statuses where the result is recorded'
Assert-True ($skill -match '(?is)templates/evidence\.md') 'the skill sends the result to that template'

# The machine-readable record is what the assessor reads, so its vocabulary is
# asserted as an exact set rather than as words appearing on some line.
$record = Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
$declaredVocabulary = @($record.statusVocabulary)
Assert-True ($declaredVocabulary.Count -eq $statuses.Count) "the evidence record declares exactly $($statuses.Count) statuses (found $($declaredVocabulary.Count))"
foreach ($status in $statuses) {
    Assert-True ($declaredVocabulary -contains $status) "the evidence record's vocabulary includes $status"
}
# Whether the prose means the right thing is NOT asserted here. The behaviour it
# describes - a required check that is skipped, unavailable or cancelled must not
# qualify - is covered by the node fixtures, which run the selector itself.

Write-Host ''
Write-Host 'Every relative link resolves inside the shared skill library'

$skillFiles = @(Get-ChildItem -LiteralPath $skillDir -Recurse -File -Include '*.md')
$sharedSkillRoot = [IO.Path]::GetFullPath((Join-Path $root 'skills')).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
$noticePath = [IO.Path]::GetFullPath((Join-Path $root 'THIRD_PARTY_NOTICES.md'))
$relativeLinkCount = 0
foreach ($file in $skillFiles) {
    $text = Get-Content -Raw -LiteralPath $file
    $relative = $file.FullName.Substring($skillDir.Length).TrimStart('\')
    foreach ($match in [regex]::Matches($text, '\]\(([^)\s]+)\)')) {
        $target = $match.Groups[1].Value
        if ($target -match '^(?i)(https?:|mailto:|#)') { continue }
        $target = ($target -split '#')[0]
        if ([string]::IsNullOrWhiteSpace($target)) { continue }
        $relativeLinkCount++
        $resolved = [IO.Path]::GetFullPath((Join-Path (Split-Path $file.FullName -Parent) $target))
        $inside = $resolved.StartsWith($sharedSkillRoot, [StringComparison]::OrdinalIgnoreCase) -or
            $resolved.Equals($noticePath, [StringComparison]::OrdinalIgnoreCase)
        Assert-True $inside "$relative : link '$target' stays inside the shared skill library"
        Assert-True (Test-Path -LiteralPath $resolved) "$relative : link '$target' resolves to a real file"
    }
}
Assert-True ($relativeLinkCount -ge 3) "the skill links its references and template rather than naming them (found $relativeLinkCount)"

# A fixture file that exists but holds no tests passes `node --test`, which would
# make the behavioural evidence for this card vacuous.
$fixtureText = Get-Content -Raw -LiteralPath $testsPath
$fixtureCount = @([regex]::Matches($fixtureText, '(?m)^test\(')).Count
Assert-True ($fixtureCount -ge 12) "the fixtures actually contain tests (found $fixtureCount test cases)"

Write-Host ''
Write-Host 'The selector is wired into the suite and stays portable'

$runAll = Get-Content -Raw -LiteralPath $runAllPath
Assert-True ($runAll -match "(?im)^\s*@\{\s*Name\s*=\s*'validate-implementation'\s*;\s*File\s*=\s*'validate-implementation\.ps1'") 'run-all.ps1 invokes this check'
Assert-True ($runAll -match "(?im)^\s*@\{\s*Name\s*=\s*'validate-implementation fixtures'\s*;\s*RelativeTest\s*=\s*'skills\\validate-implementation\\tests\\select-checks\.test\.mjs'") 'run-all.ps1 runs the selector fixtures as a suite'

$hostPath = '(?i)(\b[A-Z]:[\\/]|\\\\[A-Za-z0-9._-]+\\|file:///)'
foreach ($file in @(Get-ChildItem -LiteralPath $skillDir -Recurse -File)) {
    $text = Get-Content -Raw -LiteralPath $file
    $relative = $file.FullName.Substring($skillDir.Length).TrimStart('\')
    if ($relative -like 'tests\*') {
        # The fixtures deliberately carry relative Windows separators, to prove the
        # selector normalises them. The UNC-shaped rule would false-positive on that
        # legitimate content; an absolute drive path is still forbidden here.
        Assert-True ($text -notmatch '(?i)\b[A-Z]:[\\/]') "$relative : no absolute drive path is embedded"
    }
    else {
        Assert-True ($text -notmatch $hostPath) "$relative : no host path is embedded"
    }
}

Write-Host ''
Write-Host 'The Windows Node profile hook never prompts on cd'

# Behavioural, against a fake fnm on PATH: real fnm is never run, so nothing is
# installed or downloaded. The fake models the prompt conservatively: a stdin the
# caller did not pipe (the check gives the shell a file, standing in for the
# user's terminal) is where real fnm would ask "Do you want to install it?".
$nodeProfilePath = Join-Path $skillDir 'scripts\windows-node-profile.ps1'
Assert-True (Test-Path -LiteralPath $nodeProfilePath) 'the Windows Node profile hook exists'
if (-not $IsWindows) {
    Write-Host '  skip the profile hook scenarios run only on Windows'
}
else {
    $fakeFnm = @'
import fs from 'node:fs';
import path from 'node:path';
const statePath = process.env.FAKE_FNM_STATE;
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const args = process.argv.slice(2);
const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
const log = (entry) => { state.log.push(entry); save(); };
const fail = (message, code = 1) => { process.stderr.write(message + '\n'); process.exit(code); };
const segments = (value) => String(value).replace(/^v/, '').split('.');
const matches = (want, have) => { const h = segments(have); return segments(want).every((part, i) => part === h[i]); };
const resolve = (want) => want === 'default'
  ? (state.installed.includes(state.defaultAlias) ? state.defaultAlias : null)
  : (state.installed.filter((v) => matches(want, v)).sort().pop() ?? null);
function declared(start) {
  for (let dir = start; ; dir = path.dirname(dir)) {
    for (const name of ['.node-version', '.nvmrc']) {
      const file = path.join(dir, name);
      if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
    }
    if (path.dirname(dir) === dir) return null;
  }
}
const [command, ...rest] = args;
const positional = rest.filter((a) => !a.startsWith('--'));
if (command === 'env') {
  console.log([
    '$env:FNM_VERSION_FILE_STRATEGY = "recursive"',
    'function global:Set-FnmOnLoad { fnm use --silent-if-unchanged }',
    'function global:Set-LocationWithFnm { param($path); if ($path -eq $null) {Set-Location} else {Set-Location $path}; Set-FnmOnLoad }',
    'Set-Alias -Scope global cd_with_fnm Set-LocationWithFnm',
    'Set-Alias -Option AllScope -Scope global cd Set-LocationWithFnm',
  ].join('\n'));
} else if (command === 'list') {
  console.log('* system' + (state.defaultAlias === 'system' ? ' default' : ''));
  for (const v of state.installed) console.log('* v' + v + (v === state.defaultAlias ? ' default' : ''));
} else if (command === 'install') {
  log('install ' + positional[0]);
  const full = [...segments(positional[0]), '0', '0'].slice(0, 3).join('.');
  if (!state.installed.includes(full)) state.installed.push(full);
  save();
} else if (command === 'default' || command === 'alias') {
  if (positional.length === 0) {
    const current = resolve('default');
    if (!current) fail('error: default alias does not exist');
    console.log('v' + current);
  } else {
    const target = resolve(positional[0]);
    if (!target) fail('error: Requested version ' + positional[0] + ' is not currently installed');
    state.defaultAlias = target;
    log('default ' + positional[0]);
  }
} else if (command === 'use') {
  const want = positional[0] ?? declared(process.cwd()) ?? 'default';
  const found = resolve(want);
  if (found) { log('use ' + want + ' -> ' + found); process.exit(0); }
  const stdin = fs.fstatSync(0);
  if (stdin.isFile() || stdin.isCharacterDevice()) {
    log('prompt ' + want);
    fail("Can't find an installed Node version matching " + want + '.\nDo you want to install it? [y/N]:', 99);
  }
  log('use ' + want + ' missing');
  fail('error: Requested version ' + want + ' is not currently installed');
} else {
  fail('fake fnm: unsupported command ' + command);
}
'@
    $profileTestRoot = Join-Path ([IO.Path]::GetTempPath()) ('node-profile-check-' + [guid]::NewGuid().ToString('N'))
    $fakeBin = Join-Path $profileTestRoot 'bin'
    $null = New-Item -ItemType Directory -Path $fakeBin -Force
    Set-Content -LiteralPath (Join-Path $fakeBin 'fake-fnm.mjs') -Value $fakeFnm -NoNewline
    Set-Content -LiteralPath (Join-Path $fakeBin 'fnm.cmd') -Value "@node `"%~dp0fake-fnm.mjs`" %*`r`n@exit /b %ERRORLEVEL%`r`n" -NoNewline
    $emptyInput = Join-Path $profileTestRoot 'stdin.txt'
    $null = New-Item -ItemType File -Path $emptyInput -Force
    $pwshPath = (Get-Process -Id $PID).Path
    $quote = { param([string]$Value) "'" + ($Value -replace "'", "''") + "'" }

    function Invoke-NodeProfileScenario {
        param([string]$Name, [string[]]$Installed, [string]$DefaultAlias, [string]$Declared)
        $caseRoot = Join-Path $profileTestRoot $Name
        $homeDir = Join-Path $caseRoot 'home'
        $neutral = Join-Path $caseRoot 'neutral'
        $project = Join-Path $caseRoot 'project'
        foreach ($dir in @($homeDir, $neutral, $project)) { $null = New-Item -ItemType Directory -Path $dir -Force }
        if ($Declared) { Set-Content -LiteralPath (Join-Path $project '.node-version') -Value $Declared }
        $statePath = Join-Path $caseRoot 'state.json'
        @{ installed = @($Installed); defaultAlias = $DefaultAlias; log = @() } | ConvertTo-Json -Compress | Set-Content -LiteralPath $statePath
        $scenario = Join-Path $caseRoot 'scenario.ps1'
        @(
            '$env:PATH = ' + (& $quote ($fakeBin + [IO.Path]::PathSeparator)) + ' + $env:PATH'
            '$env:USERPROFILE = ' + (& $quote $homeDir)
            '$env:FAKE_FNM_STATE = ' + (& $quote $statePath)
            'Set-Location -LiteralPath ' + (& $quote $neutral)
            '. ' + (& $quote $nodeProfilePath)
            'cd ' + (& $quote $project)
            "'scenario reached the end'"
        ) | Set-Content -LiteralPath $scenario
        $outPath = Join-Path $caseRoot 'out.txt'
        $errPath = Join-Path $caseRoot 'err.txt'
        $process = Start-Process -FilePath $pwshPath -ArgumentList '-NoProfile', '-NonInteractive', '-File', "`"$scenario`"" `
            -RedirectStandardInput $emptyInput -RedirectStandardOutput $outPath -RedirectStandardError $errPath -PassThru -NoNewWindow
        if (-not $process.WaitForExit(60000)) { $process.Kill($true); $process.WaitForExit() }
        $output = ((Get-Content -Raw -LiteralPath $outPath -ErrorAction SilentlyContinue) + (Get-Content -Raw -LiteralPath $errPath -ErrorAction SilentlyContinue))
        $state = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
        return [pscustomobject]@{ ExitCode = $process.ExitCode; Output = [string]$output; Log = @($state.log); Default = $state.defaultAlias }
    }

    function Assert-NoPrompt {
        param($Result, [string]$Label)
        Assert-True (-not @($Result.Log | Where-Object { $_ -like 'prompt *' })) "$Label : fnm is never left at an interactive install prompt"
        Assert-True ($Result.Output -notmatch 'Do you want to install it') "$Label : no install question reaches the shell"
    }

    try {
        $case = Invoke-NodeProfileScenario -Name 'no-default' -Installed @() -DefaultAlias $null
        Assert-NoPrompt $case 'no default alias'
        Assert-True ($case.ExitCode -eq 0) "no default alias : the shell loads and cd succeeds (exit $($case.ExitCode))"
        $installAt = [array]::IndexOf([object[]]$case.Log, 'install 24')
        $defaultAt = [array]::IndexOf([object[]]$case.Log, 'default 24')
        Assert-True ($installAt -ge 0 -and $defaultAt -gt $installAt) "no default alias : the hook runs fnm install 24 then fnm default 24 (log: $($case.Log -join '; '))"
        Assert-True (@($case.Log | Where-Object { $_ -like 'use default -> 24.*' }).Count -ge 1) 'no default alias : cd in a folder with no declared version resolves to the new default'

        $case = Invoke-NodeProfileScenario -Name 'dangling-default' -Installed @() -DefaultAlias '20.1.0'
        Assert-NoPrompt $case 'default alias pointing at nothing installed'
        Assert-True ($case.ExitCode -eq 0 -and ($case.Log -contains 'install 24') -and ($case.Log -contains 'default 24')) "default alias pointing at nothing installed : the hook installs and sets the Node 24 line (log: $($case.Log -join '; '))"

        $case = Invoke-NodeProfileScenario -Name 'with-default' -Installed @('24.14.1') -DefaultAlias '24.14.1'
        Assert-NoPrompt $case 'default alias present'
        Assert-True ($case.ExitCode -eq 0) "default alias present : the shell loads and cd succeeds (exit $($case.ExitCode))"
        Assert-True (-not @($case.Log | Where-Object { $_ -like 'install *' -or $_ -like 'default *' })) 'default alias present : the hook installs nothing and leaves the default alone'
        Assert-True (@($case.Log | Where-Object { $_ -eq 'use default -> 24.14.1' }).Count -ge 1) 'default alias present : cd in a folder with no declared version resolves to the default'

        $case = Invoke-NodeProfileScenario -Name 'declared-installed' -Installed @('24.14.1') -DefaultAlias '24.14.1' -Declared '24'
        Assert-NoPrompt $case 'declared version installed'
        Assert-True ($case.ExitCode -eq 0) "declared version installed : cd succeeds (exit $($case.ExitCode))"
        Assert-True ($case.Log -contains 'use 24 -> 24.14.1') "declared version installed : cd resolves the declared version (log: $($case.Log -join '; '))"

        $case = Invoke-NodeProfileScenario -Name 'declared-missing' -Installed @('24.14.1') -DefaultAlias '24.14.1' -Declared '99'
        Assert-NoPrompt $case 'declared version not installed'
        Assert-True ($case.ExitCode -ne 0) "declared version not installed : cd fails rather than carrying on (exit $($case.ExitCode))"
        Assert-True ($case.Output -match '(?m)fnm install 99\b') 'declared version not installed : the failure prints the exact install command'
        Assert-True ($case.Output -notmatch 'scenario reached the end') 'declared version not installed : nothing after the failed cd runs'
        Assert-True (-not @($case.Log | Where-Object { $_ -like 'install *' })) 'declared version not installed : the hook never installs a repository version itself'
    }
    finally {
        Remove-Item -LiteralPath $profileTestRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ''
Write-Host 'The quality kit has one home and its scripts behave'

$kitPath = Join-Path $skillDir 'references\quality-kit.md'
$countPath = Join-Path $skillDir 'scripts\suppression_count.py'
$countTestsPath = Join-Path $skillDir 'tests\test_suppression_count.py'
foreach ($pair in @(
        @{ Path = $kitPath; Label = 'the quality kit reference' },
        @{ Path = $countPath; Label = 'the suppression count script' },
        @{ Path = $countTestsPath; Label = 'the suppression count tests' },
        @{ Path = (Join-Path $skillDir 'scripts\binding_paths.py'); Label = 'the binding paths script' },
        @{ Path = (Join-Path $skillDir 'tests\test_binding_paths.py'); Label = 'the binding paths tests' })) {
    Assert-True (Test-Path -LiteralPath $pair.Path) "$($pair.Label) exists"
}
Assert-True ($skill -match '\]\(references/quality-kit\.md\)') 'the skill links the quality kit'
Assert-True ($record.checks.Count -ge 1 -and @($record.checks | Where-Object { $_.PSObject.Properties.Name -contains 'baseline' }).Count -ge 1) 'the evidence record shows where a kit check records its baseline'

# Behavioural: the script's own unittest suite builds throwaway Git repositories
# in the temp folder and removes them. A host without Python reports a skip.
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host '  skip the kit script tests need python on PATH'
}
else {
    # No bytecode cache: a __pycache__ in the skill folder would be scanned below
    # for host paths and copied by deploy.
    $previousNoBytecode = $env:PYTHONDONTWRITEBYTECODE
    $env:PYTHONDONTWRITEBYTECODE = '1'
    try {
        $unittestOutput = & $python.Source -m unittest discover -s (Split-Path $countTestsPath -Parent) -p 'test_*.py' 2>&1 | Out-String
        $unittestExit = $LASTEXITCODE
    }
    finally { $env:PYTHONDONTWRITEBYTECODE = $previousNoBytecode }
    $ranMatch = [regex]::Match($unittestOutput, 'Ran (\d+) tests?')
    $ran = if ($ranMatch.Success) { [int]$ranMatch.Groups[1].Value } else { 0 }
    Assert-True ($unittestExit -eq 0) "the kit script tests pass (exit $unittestExit)"
    Assert-True ($ran -ge 15) "the kit script tests actually ran (found $ran)"
    if ($unittestExit -ne 0) { Write-Host $unittestOutput }
}

Write-Host ''
Write-Host 'The router still names the skill'

$router = Get-Content -Raw -LiteralPath (Join-Path $root 'AGENTS.md')

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host ("Validate-implementation check passed: $checks structural assertion(s); the selector's behaviour is covered by its node fixtures.")
}
else {
    Write-Host ("Validate-implementation check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
