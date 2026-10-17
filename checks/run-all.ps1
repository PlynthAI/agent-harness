#Requires -Version 7.0
<#
.SYNOPSIS
    Runs every factory check in order and reports one summary.

.DESCRIPTION
    Runs the declared standalone PowerShell checks and executable Node suites.
    The consolidated skill-surface suite checks discovery, links, metadata and
    migrated assets. Prose meaning is assessed by independent review rather than
    fixed wording, heading order or document-size assertions.
#>
[CmdletBinding()]
param([switch]$Quiet)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sourceRoot = Split-Path $PSScriptRoot -Parent
$results = [System.Collections.Generic.List[object]]::new()

# The agents check routes against the router catalog when it can read one, and
# says so when it cannot. Resolve the same path here so its assertion floor can
# match what the environment actually allows.
$catalogPath = if ($env:CODEX_HOME) { Join-Path $env:CODEX_HOME 'codex-router/merged-models.json' }
else { Join-Path $(if ($IsWindows -and $env:USERPROFILE) { $env:USERPROFILE } else { $env:HOME }) '.codex/codex-router/merged-models.json' }
$catalogAvailable = $false
if (Test-Path -LiteralPath $catalogPath) {
    try {
        $catalogAvailable = [bool](Get-Content -LiteralPath $catalogPath -Raw | ConvertFrom-Json).models
    } catch {
        # Match agents.ps1: file existence does not prove the catalog is readable.
        $catalogAvailable = $false
    }
}

function Add-Result {
    param([string]$Name, [int]$ExitCode)
    $results.Add([pscustomobject]@{ Check = $Name; Exit = $ExitCode })
}

function Invoke-DeclaredCheck {
    param([hashtable]$Check)
    if (-not $Quiet) { Write-Host ''; Write-Host "==== $($Check.Name) ====" }
    $scriptArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot $Check.File))
    if ($Quiet) { $scriptArgs += '-Quiet' }
    $output = & pwsh @scriptArgs 2>&1
    $output | ForEach-Object { Write-Host $_ }
    $exit = $LASTEXITCODE
    # Every check reports its own assertion count on success; the floor is the
    # number it carries today. Growth is allowed, shrinkage is not.
    $reported = -1
    $summary = @($output | Where-Object { $_ -match 'check passed:\s*(\d+)' } | Select-Object -Last 1)
    if ($summary.Count -gt 0 -and $summary[0] -match 'check passed:\s*(\d+)') { $reported = [int]$Matches[1] }
    # The signature names the check that actually ran, so wiring a name to the
    # wrong file fails here instead of quietly reporting another check's pass.
    $signatureLine = @($output | Where-Object { $_ -match [regex]::Escape([string]$Check.Signature) })
    if ($exit -eq 0 -and $signatureLine.Count -eq 0) {
        Write-Host ("  FAIL $($Check.Name) did not report its own signature ('$($Check.Signature)'); wrong file wired?")
        $exit = 1
    }
    # A floor that depends on what the environment can see is declared as such
    # rather than lowered for everyone: the agents check asserts less without a
    # readable router catalog, and that is honest rather than a regression.
    $floor = $Check.MinAssertions
    if ($Check.ContainsKey('MinAssertionsNoCatalog') -and -not $script:catalogAvailable) { $floor = $Check.MinAssertionsNoCatalog }
    if ($exit -eq 0 -and $reported -lt $floor) {
        Write-Host ("  FAIL $($Check.Name) reported $reported assertion(s); its declared floor is $floor. A check that asserts nothing is not evidence.")
        $exit = 1
    }
    Add-Result -Name $Check.Name -ExitCode $exit
}

function Invoke-NodeSuite {
    param([string]$Name, [string]$RelativeTest, [string]$Signature, [int]$MinTests = 0)
    if (-not $Quiet) { Write-Host ''; Write-Host "==== $Name ====" }
    $output = & node --test (Join-Path $sourceRoot $RelativeTest) 2>&1
    $output | ForEach-Object { Write-Host $_ }
    $exit = $LASTEXITCODE
    # A suite that runs no tests exits 0. Treat that, and any drop below the
    # declared floor, as a failure: an empty or gutted fixture file must not read
    # as passing evidence, and a suite wired to the wrong file must not either.
    $passed = 0
    # The summary marker is one character in UTF-8 but several under a legacy
    # console code page, so match any leading symbol run.
    $line = @($output | Where-Object { $_ -match '^\s*\S*\s*pass (\d+)\s*$' } | Select-Object -Last 1)
    if ($line.Count -gt 0 -and $line[0] -match 'pass (\d+)') { $passed = [int]$Matches[1] }
    if ($exit -eq 0 -and $passed -lt [Math]::Max(1, $MinTests)) {
        Write-Host "  FAIL $Name reported $passed test(s); its declared floor is $([Math]::Max(1, $MinTests)). A suite with no test cases exits 0 and is not evidence."
        $exit = 1
    }
    # The named test proves which suite ran; a floor alone cannot, because a
    # larger suite wired into a smaller slot clears it.
    $signatureLine = @($output | Where-Object { $_ -match [regex]::Escape($Signature) })
    if ($exit -eq 0 -and $Signature -and $signatureLine.Count -eq 0) {
        Write-Host ("  FAIL $Name did not report its own test ('$Signature'); wrong suite wired?")
        $exit = 1
    }
    Add-Result -Name $Name -ExitCode $exit
}

# 2026-09-22: floors for affected prose checks reflect deliberate removal of
# duplicated global-router wording requirements and superseded maintenance
# restrictions. No executable fixture was removed; see the consolidation packet.
# Each check is declared once: its name, its file, and the assertion count it must
# still report. Without the floor a check gutted to `exit 0` - or wired to the
# wrong file - still reports "All N checks passed" while covering nothing, which
# is the same failure class as a node suite that runs no tests.
$declaredChecks = @(
    @{ Name = 'agents';                  File = 'agents.ps1';                  Signature = 'Agent role check passed';                  MinAssertions = 103; MinAssertionsNoCatalog = 79 }
    @{ Name = 'discovery';               File = 'discovery.ps1';               Signature = 'Discovery check passed';                   MinAssertions = 21 }
    @{ Name = 'install-recovery';        File = 'install-recovery.ps1';        Signature = 'Install-recovery check passed';            MinAssertions = 45 }
    @{ Name = 'orchestration';           File = 'orchestration.ps1';           Signature = 'Orchestration check passed';               MinAssertions = 49 }  # fixed assertions only: the per-link and per-file portability assertions vary with content and are not counted in the floor
    @{ Name = 'design-router';           File = 'design-router.ps1';           Signature = 'Design-router check passed';               MinAssertions = 129 }
    @{ Name = 'design-leaves';           File = 'design-leaves.ps1';           Signature = 'Design-leaves check passed';               MinAssertions = 516 }
    @{ Name = 'port-adaptations';        File = 'port-adaptations.ps1';        Signature = 'Port-adaptations check passed';            MinAssertions = 146 }
    @{ Name = 'validate-implementation'; File = 'validate-implementation.ps1'; Signature = 'Validate-implementation check passed';     MinAssertions = 110 }
    @{ Name = 'delivery';                File = 'delivery.ps1';                Signature = 'Delivery check passed';                    MinAssertions = 274 }
    @{ Name = 'browser-verification';    File = 'browser-verification.ps1';    Signature = 'Browser-verification check passed';         MinAssertions = 32 }
    @{ Name = 'skills-list';             File = 'skills-list.ps1';             Signature = 'Skills-list check passed';                  MinAssertions = 165 }
    @{ Name = 'tdd';                     File = 'tdd.ps1';                     Signature = 'Tdd check passed';                          MinAssertions = 85 }
    @{ Name = 'harness';                 File = 'harness.ps1';                 Signature = 'Harness check passed';                      MinAssertions = 64 }
    @{ Name = 'plan-template';           File = 'plan-template.ps1';           Signature = 'Plan-template check passed';                MinAssertions = 11 }
    @{ Name = 'brainstorm';              File = 'brainstorm.ps1';              Signature = 'Brainstorm check passed';                   MinAssertions = 112 }
    @{ Name = 'to-spec';                 File = 'to-spec.ps1';                 Signature = 'To-spec check passed';                      MinAssertions = 140 }
    @{ Name = 'wayfinder';               File = 'wayfinder.ps1';               Signature = 'Wayfinder check passed';                    MinAssertions = 141 }
    @{ Name = 'implement-spec';          File = 'implement-spec.ps1';          Signature = 'Implement-spec check passed';               MinAssertions = 103 }
    @{ Name = 'claude-adapter';          File = 'claude-adapter.ps1';          Signature = 'Claude-adapter check passed';               MinAssertions = 46 }
    @{ Name = 'fresh-worktree-hook';     File = 'fresh-worktree-hook.ps1';     Signature = 'Fresh-worktree hook check passed';          MinAssertions = 30 }
    @{ Name = 'session-env-hook';        File = 'session-env-hook.ps1';        Signature = 'Session-env hook check passed';             MinAssertions = 27 }
    @{ Name = 'compact-reload-hook';     File = 'compact-reload-hook.ps1';     Signature = 'Compact-reload hook check passed';          MinAssertions = 31 }  # the per-shell Codex assertions vary with the shells present (cmd and Windows PowerShell on Windows, sh where installed) and are not all counted in the floor
    @{ Name = 'deploy';                File = 'deploy.ps1';                  Signature = 'Deploy check passed';                       MinAssertions = 77 }
    @{ Name = 'understand';             File = 'understand.ps1';             Signature = 'Understand check passed';                    MinAssertions = 40 }
    @{ Name = 'hillclimb';               File = 'hillclimb.ps1';               Signature = 'Hillclimb check passed';                    MinAssertions = 40 }
    @{ Name = 'planner';                 File = 'planner.ps1';                 Signature = 'Planner check passed';                      MinAssertions = 122 }
    @{ Name = 'harness-guide';           File = 'harness-guide.ps1';           Signature = 'Harness-guide check passed';                MinAssertions = 49 }  # fixed assertions only: the one assertion per Sources path and the per-role binding assertions in the two roles figures vary and are not counted in the floor
    @{ Name = 'code-review';             File = 'code-review.ps1';             Signature = 'Code-review check passed';                  MinAssertions = 44 }
)

$nodeSuites = @(
    @{ Name = 'post-drawing fixtures'; RelativeTest = 'checks\post-drawing.test.mjs'; Signature = 'a successful direct SVG edit adds the consuming-surface requirements without blocking'; MinTests = $(if ($IsWindows) { 13 } else { 12 }) }
    @{ Name = 'full-access fixtures'; RelativeTest = 'checks\full-access.test.mjs'; Signature = 'dry-run reports setting changes without writing or exposing unrelated configuration'; MinTests = 22 }
    @{ Name = 'skill-surface fixtures'; RelativeTest = 'checks\skill-surface.test.mjs'; Signature = 'retired skill entrypoints are absent from discovery'; MinTests = 6 }
    @{ Name = 'public copy'; RelativeTest = 'checks\public-copy.test.mjs'; Signature = 'the public copy of the working tree carries no denied string'; MinTests = 5 }
    @{ Name = 'harness fixtures'; RelativeTest = 'skills\harness\tests\optimiser-job.test.mjs'; Signature = 'the published record is the job input, read at its stable key'; MinTests = 21 }
    @{ Name = 'nightly-review fixtures'; RelativeTest = 'skills\harness\tests\skillopt-review.test.mjs'; Signature = 'an incident split across train and holdout is rejected as a leak'; MinTests = 12 }
    @{ Name = 'doc-bench fixtures'; RelativeTest = 'skills\harness\tests\doc-bench.test.mjs'; Signature = 'an unusable run is reported and left out rather than scored as wrong'; MinTests = 9 }
    @{ Name = 'session-digest fixtures'; RelativeTest = 'skills\harness\tests\session-digest.test.mjs'; Signature = 'a token pasted into a chat appears in no digest or aggregate'; MinTests = 17 }
    @{ Name = 'env-scan fixtures'; RelativeTest = 'skills\harness\tests\env-scan.test.mjs'; Signature = 'variables are reconciled between the example file and the code, by name only'; MinTests = 5 }
    @{ Name = 'learning-queue fixtures'; RelativeTest = 'hooks\tests\learning-queue.test.mjs'; Signature = 'a verified transition publishes the canonical record for its identity'; MinTests = 35 }
    @{ Name = 'cloud-install fixtures'; RelativeTest = 'checks\cloud-install.test.mjs'; Signature = 'a repeated install keeps one harness refresh hook'; MinTests = 3 }
    @{ Name = 'task-state fixtures'; RelativeTest = 'skills\docs-workspace\tests\task-state.test.mjs'; Signature = 'a read reports the recorded Markdown state and writes nothing'; MinTests = 18 }
    @{ Name = 'open-code-review fixtures'; RelativeTest = 'skills\code-review\tests\native-slot.test.mjs'; Signature = 'exit 0 with a partial manifest is not a completed review'; MinTests = 23 }
    @{ Name = 'workspace-resolution fixtures';    RelativeTest = 'skills\docs-workspace\tests\resolve-workspace.test.mjs'; Signature = 'two worktrees and a nested working directory resolve the same workspace'; MinTests = 19 }
    @{ Name = 'docs-workspace fixtures';          RelativeTest = 'skills\docs-workspace\tests\docs-workspace.test.mjs';          Signature = "the routed vocabulary is exactly the resolver's route vocabulary";        MinTests = 9 }
    @{ Name = 'brain-check fixtures';             RelativeTest = 'skills\inbox\tests\check-brain.test.mjs';                      Signature = 'a concept page with no description fails the check';                      MinTests = 9 }
    @{ Name = 'validate-implementation fixtures'; RelativeTest = 'skills\validate-implementation\tests\select-checks.test.mjs';  Signature = 'the profile contract rejects what it cannot select from';                MinTests = 18 }
    @{ Name = 'delivery fixtures';                RelativeTest = 'skills\delivery\tests\delivery-state.test.mjs';                Signature = 'commit is a local act and implies nothing downstream';                   MinTests = 21 }
    @{ Name = 'skills-list fixtures';             RelativeTest = 'skills\skills-list\tests\list-skills.test.mjs';                Signature = 'the runtime block is parsed into roots and skills with resolved paths';   MinTests = 36 }
    @{ Name = 'mcp-parity fixtures';              RelativeTest = 'checks\mcp-parity.test.mjs';                                   Signature = 'a token literal in either runtime file is a finding';                   MinTests = 12 }
    @{ Name = 'claude-skill-stubs fixtures';      RelativeTest = 'skills\skills-list\tests\claude-skill-stubs.test.mjs';         Signature = 'write creates a stub per source skill with the source frontmatter verbatim'; MinTests = 10 }
    @{ Name = 'mutation-runner fixtures';         RelativeTest = 'skills\hillclimb\tests\mutation-runner.test.mjs';              Signature = 'a run scores the gate and the held-out set apart and leaves the checkout as it found it'; MinTests = 12 }
    @{ Name = 'impeccable wiring fixtures'; RelativeTest = 'checks\impeccable-wiring.test.mjs'; Signature = 'the documented Claude hooks reach the harness install through HOME'; MinTests = $(if ($IsWindows) { 5 } else { 4 }) }
    @{ Name = 'environment preflight fixtures'; RelativeTest = 'checks\environment-preflight.test.mjs'; Signature = 'reports the actual executable, identity and version without exposing process environment'; MinTests = $(if ($IsWindows) { 9 } else { 7 }) }
    @{ Name = 'codex-forward fixtures';           RelativeTest = 'checks\codex-forward.test.mjs';                              Signature = 'the prompt is the role instructions, then the runtime note, then the assignment'; MinTests = 20 }  # 20 tests
    @{ Name = 'project-template fixtures';        RelativeTest = 'checks\templates.test.mjs';                                  Signature = 'the copier replaces the project name and leaves no placeholder'; MinTests = 37 }  # 1 + 10 per template (2) + 16; the 2 design-library tests skip on a host without the library and are not counted
)

# The expectation is written out here rather than derived from the tables above:
# a declaration deleted from a table would otherwise remove both the invocation
# and the expectation, and the run would report "All N checks passed" while
# covering less. Editing this list is deliberate.
$expectedChecks = @(
    'agents', 'discovery', 'install-recovery', 'orchestration', 'design-router',
    'design-leaves', 'port-adaptations', 'validate-implementation', 'delivery',
    'browser-verification', 'skills-list',
    'tdd', 'harness', 'plan-template', 'brainstorm',
    'to-spec', 'wayfinder', 'implement-spec', 'claude-adapter', 'fresh-worktree-hook', 'session-env-hook', 'compact-reload-hook', 'deploy', 'understand', 'hillclimb', 'planner', 'harness-guide', 'code-review',
    'skill-surface fixtures', 'workspace-resolution fixtures', 'docs-workspace fixtures', 'brain-check fixtures',
    'validate-implementation fixtures', 'delivery fixtures',
    'skills-list fixtures', 'claude-skill-stubs fixtures', 'mutation-runner fixtures', 'task-state fixtures', 'open-code-review fixtures',
    'learning-queue fixtures', 'harness fixtures',
    'session-digest fixtures', 'env-scan fixtures', 'cloud-install fixtures',
    'full-access fixtures', 'nightly-review fixtures', 'doc-bench fixtures', 'impeccable wiring fixtures', 'environment preflight fixtures', 'codex-forward fixtures', 'mcp-parity fixtures',
    'project-template fixtures', 'post-drawing fixtures', 'public copy'
)
# The public copy (config/publish-public.mjs) leaves out these checks' subjects.
# Each runs wherever its subject exists and is named as not in this copy where
# it does not, so a missing subject is never a silent pass.
$sourceOnly = [ordered]@{ 'harness-guide' = 'guide'; 'cloud-install fixtures' = 'claude/cloud'; 'public copy' = 'config/public-mirror.json' }
$notInCopy = @($sourceOnly.Keys | Where-Object { -not (Test-Path -LiteralPath (Join-Path $sourceRoot $sourceOnly[$_])) })
$declaredChecks = @($declaredChecks | Where-Object { $notInCopy -notcontains $_.Name })
$nodeSuites = @($nodeSuites | Where-Object { $notInCopy -notcontains $_.Name })
$expectedChecks = @($expectedChecks | Where-Object { $notInCopy -notcontains $_ })

$wiredChecks = @($declaredChecks | ForEach-Object { $_.Name }) + @($nodeSuites | ForEach-Object { $_.Name })
$unexpectedDeclarations = @($wiredChecks | Where-Object { $expectedChecks -notcontains $_ })
$undeclaredExpectations = @($expectedChecks | Where-Object { $wiredChecks -notcontains $_ })
$declarationProblems = $unexpectedDeclarations.Count + $undeclaredExpectations.Count

# Fixtures need a writable disposable root outside any runtime-owned worktree
# ancestor: a root under the checkout (for example .local/checks inside a
# `.codex-worktrees` checkout) makes the runtime classifier read every fixture
# as codex-app. Use the ordinary OS temp path with a task prefix; the unique
# directory is removed below. These process-scoped values reach children only
# and are restored even on failure.
$checkScratchParent = [IO.Path]::TrimEndingDirectorySeparator([IO.Path]::GetFullPath([IO.Path]::GetTempPath()))
$checkScratchRoot = Join-Path $checkScratchParent ('harness-checks-' + [guid]::NewGuid().ToString('N'))
$priorTemp = $env:TEMP
$priorTmp = $env:TMP
$priorTmpdir = $env:TMPDIR
New-Item -ItemType Directory -Path $checkScratchRoot -Force | Out-Null
try {
    $env:TEMP = $checkScratchRoot
    $env:TMP = $checkScratchRoot
    $env:TMPDIR = $checkScratchRoot
    foreach ($check in $declaredChecks) { Invoke-DeclaredCheck -Check $check }
    foreach ($suite in $nodeSuites) { Invoke-NodeSuite -Name $suite.Name -RelativeTest $suite.RelativeTest -Signature $suite.Signature -MinTests $suite.MinTests }
} finally {
    $env:TEMP = $priorTemp
    $env:TMP = $priorTmp
    $env:TMPDIR = $priorTmpdir
    $resolvedScratch = [IO.Path]::GetFullPath($checkScratchRoot)
    if (-not $resolvedScratch.StartsWith($checkScratchParent + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Refusing cleanup outside the task-owned check root.'
    }
    if (Test-Path -LiteralPath $resolvedScratch) {
        Remove-Item -LiteralPath $resolvedScratch -Recurse -Force
    }
}

$ranNames = @($results | ForEach-Object { $_.Check })
$missingChecks = @($expectedChecks | Where-Object { $ranNames -notcontains $_ })

Write-Host ''
Write-Host '==== summary ===='
foreach ($result in $results) {
    $verdict = if ($result.Exit -eq 0) { 'pass' } else { "FAIL (exit $($result.Exit))" }
    Write-Host ("  {0,-32} {1}" -f $result.Check, $verdict)
}
if ($notInCopy.Count -gt 0) {
    Write-Host ("  not in this copy: " + ($notInCopy -join ', '))
}
if ($missingChecks.Count -gt 0) {
    Write-Host ("  FAIL a declared check did not run: " + ($missingChecks -join ', '))
}
if ($undeclaredExpectations.Count -gt 0) {
    Write-Host ("  FAIL an expected check has no declaration: " + ($undeclaredExpectations -join ', '))
}
if ($unexpectedDeclarations.Count -gt 0) {
    Write-Host ("  FAIL a declared check is not in the expected set: " + ($unexpectedDeclarations -join ', '))
}
$failed = @($results | Where-Object { $_.Exit -ne 0 }).Count
Write-Host ''
if ($failed -eq 0 -and $missingChecks.Count -eq 0 -and $declarationProblems -eq 0) {
    Write-Host "All $($results.Count) checks passed."
    exit 0
}
if ($failed -gt 0) { Write-Host "$failed of $($results.Count) checks failed." }
if ($missingChecks.Count -gt 0) { Write-Host "$($missingChecks.Count) of $($expectedChecks.Count) declared checks did not run." }
if ($declarationProblems -gt 0) { Write-Host "$declarationProblems declaration problem(s): the expected set and the wiring disagree." }
exit ($failed + $missingChecks.Count + $declarationProblems)

