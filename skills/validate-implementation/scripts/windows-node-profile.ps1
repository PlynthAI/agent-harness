# Optional PowerShell profile integration for an already installed fnm.
# Runtime installations stay read-only to the Codex sandbox. Only fnm's
# per-shell junctions live in the existing writable Codex working area.
if ($env:OS -ne 'Windows_NT') { return }
if (-not (Get-Command fnm -CommandType Application -ErrorAction SilentlyContinue)) {
    throw 'fnm is not installed. Install it before enabling this profile integration.'
}

$fnmPreviousXdgRuntime = $env:XDG_RUNTIME_DIR
try {
    $env:XDG_RUNTIME_DIR = Join-Path $env:USERPROFILE 'Documents\Codex\.runtime'
    $null = New-Item -ItemType Directory -Path $env:XDG_RUNTIME_DIR -Force
    # Outside a project fnm falls back to the default alias; with none, or one
    # pointing at nothing installed, it would ask to install. fnm list shows an
    # alias only beside an installed version, so its absence means unusable.
    # Install the harness Node line once and make it the default.
    $fnmInstalledVersions = @(& fnm list)
    if ($LASTEXITCODE -ne 0) { throw 'fnm could not list its installed Node versions.' }
    if (-not ($fnmInstalledVersions -match '^\*\s.*\bdefault\b')) {
        & fnm install 24
        if ($LASTEXITCODE -eq 0) { & fnm default 24 }
        if ($LASTEXITCODE -ne 0) {
            throw 'fnm has no usable default Node version. Run: fnm install 24; fnm default 24'
        }
    }
    $fnmProfileCommands = & fnm env --use-on-cd --shell powershell --version-file-strategy recursive
    if ($LASTEXITCODE -ne 0 -or -not $fnmProfileCommands) {
        throw 'fnm could not initialize this shell.'
    }
    $fnmProfileCommands | Out-String | Invoke-Expression
    if (-not (Get-Command Set-FnmOnLoad -CommandType Function -ErrorAction SilentlyContinue)) {
        throw 'fnm env no longer defines the Set-FnmOnLoad cd hook this profile integration replaces.'
    }
    # Replaces fnm's cd hook. Piped input keeps fnm's stdin off the terminal, so
    # a version it cannot resolve is an error instead of an interactive install
    # prompt that would swallow the next typed command. The declared version is
    # found the way fnm searches parent directories, only to name the install
    # command.
    function global:Set-FnmOnLoad {
        '' | & fnm use --silent-if-unchanged
        if ($LASTEXITCODE -eq 0) { return }
        $declaredVersion = $null
        $declaredIn = $null
        $searchDirectory = (Get-Location -PSProvider FileSystem).ProviderPath
        while ($searchDirectory -and -not $declaredVersion) {
            foreach ($versionFile in '.node-version', '.nvmrc') {
                $candidate = Join-Path $searchDirectory $versionFile
                if (-not $declaredVersion -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
                    $declaredVersion = ((Get-Content -LiteralPath $candidate -TotalCount 1) -as [string]).Trim()
                    $declaredIn = $candidate
                }
            }
            $packageFile = Join-Path $searchDirectory 'package.json'
            if (-not $declaredVersion -and (Test-Path -LiteralPath $packageFile -PathType Leaf)) {
                # fnm also resolves engines.node from package.json by default.
                try { $declaredVersion = [string](Get-Content -LiteralPath $packageFile -Raw | ConvertFrom-Json).engines.node } catch { }
                if ($declaredVersion) { $declaredIn = $packageFile }
            }
            $searchDirectory = Split-Path $searchDirectory -Parent
        }
        if (-not $declaredVersion) {
            throw 'fnm has no usable default Node version. Run: fnm install 24; fnm default 24'
        }
        if ((Split-Path $declaredIn -Leaf) -eq 'package.json') {
            # fnm takes no semver range as an argument; without one, fnm install
            # reads engines.node itself.
            throw "No installed Node matches engines.node '$declaredVersion' in $declaredIn. Run in $(Split-Path $declaredIn -Parent): fnm install"
        }
        throw "Node $declaredVersion, declared in $declaredIn, is not installed. Run: fnm install $declaredVersion"
    }
    Set-FnmOnLoad
} finally {
    if ($null -eq $fnmPreviousXdgRuntime) {
        Remove-Item Env:XDG_RUNTIME_DIR -ErrorAction SilentlyContinue
    } else {
        $env:XDG_RUNTIME_DIR = $fnmPreviousXdgRuntime
    }
    Remove-Variable fnmPreviousXdgRuntime, fnmInstalledVersions, fnmProfileCommands -ErrorAction SilentlyContinue
}
