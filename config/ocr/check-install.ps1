# Diagnose the npm CLI selected by Windows and the native slot without changing
# installations or config. The launcher may clear its stale update notification.
# Version probes disable background updates and never call a model.
[CmdletBinding()]
param(
    [string]$Prefix,
    [string]$AdapterPath
)

$ErrorActionPreference = 'Stop'
$issues = @()
$report = [ordered]@{ status = 'fail'; expected_prefix = $Prefix; npm_prefix = $null; shell = $null; adapter = $null; issues = @() }
$failureCode = 'check-unavailable'
$previousNoUpdate = $env:OCR_NO_UPDATE
try {
    if ($env:OS -ne 'Windows_NT') { throw 'This check diagnoses Windows npm shims.' }
    if (-not $Prefix) { $Prefix = Join-Path $env:APPDATA 'npm' }
    if (-not $AdapterPath) { $AdapterPath = Join-Path $PSScriptRoot '../../skills/code-review/scripts/native-slot.mjs' }
    $report.expected_prefix = $Prefix
    $env:OCR_NO_UPDATE = '1'
    $nodeCommand = Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1
    $npmCommand = Get-Command npm -CommandType Application, ExternalScript -ErrorAction Stop | Select-Object -First 1
    $ocrCommand = Get-Command ocr -ErrorAction Stop | Select-Object -First 1
    if ($ocrCommand.CommandType -notin @('Application', 'ExternalScript')) {
        $report.shell = [ordered]@{ command = $ocrCommand.Name; command_type = [string]$ocrCommand.CommandType }
        $failureCode = 'shell-command-shadowed'
        throw "PowerShell resolves 'ocr' to $($ocrCommand.CommandType), which shadows the installed CLI."
    }
    $LASTEXITCODE = 0
    $npmPrefixOutput = @(& $npmCommand.Path config get prefix)
    if ($LASTEXITCODE -ne 0 -or $npmPrefixOutput.Count -ne 1) { throw 'npm did not report one global prefix.' }
    $npmPrefix = [string]$npmPrefixOutput[0]
    $LASTEXITCODE = 0
    $shellOutput = @(& $ocrCommand.Path --version)
    if ($LASTEXITCODE -ne 0 -or $shellOutput.Count -eq 0) { throw 'The shell OCR version probe failed.' }
    $shellVersion = ([string]$shellOutput[0]).Trim()
    $probe = @'
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
const [adapter, prefix, npmPrefix, shellCommand] = process.argv.slice(2);
const { resolveOcrInvocation } = await import(pathToFileURL(adapter).href);
const invocation = resolveOcrInvocation();
const entry = invocation.argv[0] ?? invocation.command;
const version = spawnSync(invocation.command, [...invocation.argv, '--version'], { encoding: 'utf8', shell: false, windowsHide: true });
if (version.status !== 0 || !version.stdout?.trim()) throw new Error('The adapter OCR version probe failed.');
const expected = realpathSync(prefix);
const nativeEntry = realpathSync(entry);
const withinPrefix = relative(expected, nativeEntry);
console.log(JSON.stringify({ expected_prefix: expected, npm_prefix: realpathSync(npmPrefix),
  shell_prefix: realpathSync(dirname(shellCommand)),
  adapter_inside_prefix: withinPrefix !== '..' && !withinPrefix.startsWith('..\\') && !isAbsolute(withinPrefix),
  adapter: { command: invocation.command, argv: invocation.argv, entry: nativeEntry, source: invocation.source,
    version: version.stdout.trim().split(/\r?\n/)[0], sha256: createHash('sha256').update(readFileSync(nativeEntry)).digest('hex') } }));
'@
    $probeOutput = @(& $nodeCommand.Path --input-type=module -e $probe 'ocr-install-probe' $AdapterPath $Prefix $npmPrefix $ocrCommand.Path)
    if ($LASTEXITCODE -ne 0 -or $probeOutput.Count -ne 1) { throw 'The native slot installation probe failed.' }
    $native = $probeOutput[0] | ConvertFrom-Json
    $report.expected_prefix = $native.expected_prefix
    $report.npm_prefix = $native.npm_prefix
    $report.shell = [ordered]@{ command = $ocrCommand.Path; version = $shellVersion }
    $report.adapter = $native.adapter
    if ($native.npm_prefix -ine $native.expected_prefix) {
        $issues += [ordered]@{ code = 'npm-prefix-mismatch'; message = 'Global npm installs would go outside the maintained prefix.' }
    }
    if ($native.shell_prefix -ine $native.expected_prefix) {
        $issues += [ordered]@{ code = 'shell-prefix-mismatch'; message = 'An OCR command outside the maintained prefix shadows the shared installation.' }
    }
    if (-not $native.adapter_inside_prefix) {
        $issues += [ordered]@{ code = 'adapter-prefix-mismatch'; message = 'The native slot resolves OCR outside the maintained prefix.' }
    }
    if ($shellVersion -cne $native.adapter.version) {
        $issues += [ordered]@{ code = 'version-mismatch'; message = 'The shell command and native slot report different OCR builds.' }
    }
} catch {
    $issues += [ordered]@{ code = $failureCode; message = $_.Exception.Message }
} finally {
    if ($null -eq $previousNoUpdate) {
        Remove-Item Env:OCR_NO_UPDATE -ErrorAction SilentlyContinue
    } else {
        $env:OCR_NO_UPDATE = $previousNoUpdate
    }
}
$report.issues = @($issues)
if ($issues.Count -eq 0) { $report.status = 'pass' }
$report | ConvertTo-Json -Depth 6
if ($issues.Count -ne 0) { exit 1 }
exit 0
