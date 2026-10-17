<#
.SYNOPSIS
    SessionStart hook for Claude Code: after a context compaction, tells the
    agent to reload what the compaction dropped.

.DESCRIPTION
    After a compaction, Claude Code re-attaches invoked skill bodies only up to
    a token budget, reference files read earlier survive only as a summary, and
    Codex documents no skill carry-over at all. AGENTS.md is reloaded in both.
    This hook prints one reminder, which Claude Code adds to the model's
    context: plain stdout from a SessionStart hook that exits 0.

    It prints only when the SessionStart payload on stdin has source
    "compact"; startup, resume, clear and fork print nothing. Any error,
    including empty or malformed stdin, exits 0 silently so a session start is
    never broken. It is written for Windows PowerShell as well as pwsh, so a
    different interpreter cannot break it either.

    New Codex registrations no longer run this script. The hooks/hooks.json registration emits
    the same reminder directly with the shell's echo builtin, because a nested
    PowerShell interpreter exceeded Codex's 10 s SessionStart timeout under
    load (see .local/proposals/session-start-hook-20261010). Codex dispatches
    on the ^compact$ matcher, so that command prints only after a compaction
    and never reads a payload. That echo argument is a literal: it must stay
    free of shell metacharacters (& | < > ^ % !) and inner quotes, which a
    shell would expand or split. Claude still calls this script, and the JSON
    source guard below keeps the compact-only promise there.

    The source stays in the shared hooks folder. config/deploy.ps1 retains
    <codex home>\hooks\compact-reload.ps1 for older loaded registrations.
    claude/sync-claude.ps1 copies it to <claude home>\hooks\compact-reload.ps1
    and registers it in settings.json under matcher compact, beside the
    operator's own hooks.
#>
param()

$ErrorActionPreference = 'Stop'
try {
    $payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
    if ($payload -isnot [array] -and $payload.source -ceq 'compact') {
        [Console]::Out.Write('Context was just compacted. Skill and reference text loaded earlier may be gone or cut short, and the summary is not the instructions. Before the next step, re-open the skill and references the work in progress uses. Then re-read .state/state.md at the root of this checkout, if it exists, and the plan if the task has one, and continue from the recorded next action.' + "`n")
    }
} catch {
    # A hook failure must never stop a session from starting.
}
exit 0
