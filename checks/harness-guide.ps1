#Requires -Version 7.0
<#
.SYNOPSIS
    Checks the visual harness guide against the live source, so a change that
    makes the published page wrong fails here instead of going unnoticed.
.DESCRIPTION
    Reads guide/harness-guide.html and compares it with what the source says
    today:
    - Four conceptual overview cards; detailed source counts remain checked.
    - Every skill, leads-and-leaves and role-file count repeated in
      captions, aria-labels, SVG text and the Sources register matches the same
      source, and each Codex-runtime role is drawn with its role file's model
      and effort.
    - The two roles figures each name exactly the map's role keys. The Claude
      Code figure draws as Codex runtime exactly the roles the map runs on
      Codex, and each Claude-runtime card states the map's model (by its
      MODELS.md name) and effort; the Codex figure draws every role as Codex
      runtime with its role file's model, effort and non-openai provider. A
      forwarded role is drawn once as a Claude-runtime forwarder on its agent
      file's model. Every agent card is unfilled (class role), and the Codex
      figure comes first.
    - Every role card names the file it opens, that file is embedded as a
      template, and guide/scripts/embed-role-configs.mjs --check finds each
      template equal to its file.
    - The named diagram sections exist, with one figure each and two for Roles.
    - Every connector in every figure lands on an element edge, a junction or
      a label and points at its target, as
      skills/design/drawing/scripts/svg-connectors.mjs measures it.
    - The skills figure names every skill folder with a SKILL.md, except names
      the map's skills.exclude hides from Claude, and every method nested in one
      as <skill>/<method>, and no name that does not exist.
    - The skills figure heads each tree group once (data-group), roots each
      group's tree in the tree's lead (data-lead), draws each step pill as
      exactly three lines (step, what it does, an agent line that may be
      empty), and draws each skill and method once as a tree node written /name
      or skill/method, hung on an L connector; a skill named again sits only on
      a dashed reference branch.
    - Every role name drawn in any figure, singular or plural and inside longer
      labels, is blue agent text (class ag); blue text names only roles; every
      /name skill in a figure is monospace; and every mark the page key teaches
      is drawn in some figure.
    - Every repository path in the Sources register exists.
    - The maintenance figure states run-all's check counts, and the Inbox
      board, scripts and skills it names exist; the board groups notes as Open
      or Done by an empty outcome, as the figure draws.
    - The workspace guide seed exists, and the owner's workspace/AGENTS.md,
      when present, is a copy of it (line endings aside).
    - The stamp is a date, and the page has no em dash.
    It reads files and runs the tree command, the embed script's --check and
    the connector script; it writes nothing.
    skills/harness/library/references/harness-guide.md owns the refresh this
    check guards.
#>
[CmdletBinding()]
param([switch]$Quiet)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$guidePath = Join-Path $root 'guide\harness-guide.html'
$mapPath = Join-Path $root 'claude\claude-map.json'
$runAllPath = Join-Path $root 'checks\run-all.ps1'
$skillsRoot = Join-Path $root 'skills'
$treeScript = Join-Path $skillsRoot 'skills-list\scripts\list-skills.mjs'
$checks = 0
$failures = [Collections.Generic.List[string]]::new()
function Assert-True {
    param([bool]$Condition, [string]$Message)
    $script:checks++
    if ($Condition) {
        if (-not $Quiet) { Write-Host "  ok   $Message" }
    } else {
        $script:failures.Add($Message)
        Write-Host "  FAIL $Message"
    }
}

function Get-Section {
    param([string]$Html, [string]$Id)
    $m = [regex]::Match($Html, "(?s)<section[^>]*\bid=""$Id""[^>]*>.*?</section>")
    if ($m.Success) { $m.Value } else { '' }
}

function Format-Set {
    param([string[]]$Names)
    if (-not $Names -or $Names.Count -eq 0) { return '(none)' }
    ($Names | Sort-Object) -join ', '
}

Assert-True (Test-Path -LiteralPath $guidePath) 'guide/harness-guide.html exists'
if (-not (Test-Path -LiteralPath $guidePath)) {
    Write-Host "Harness-guide check FAILED: $($failures.Count) of $checks assertion(s)."
    exit 1
}
$html = [IO.File]::ReadAllText($guidePath)
$map = Get-Content -LiteralPath $mapPath -Raw | ConvertFrom-Json
$roleKeys = @($map.roles.PSObject.Properties.Name)
$codexRoles = @($map.roles.PSObject.Properties | Where-Object { $_.Value.PSObject.Properties.Name -contains 'runtime' -and $_.Value.runtime -eq 'codex' } | ForEach-Object Name)
$claudeRoles = @($roleKeys | Where-Object { $codexRoles -notcontains $_ })

# Counts come from detailed figures and source, not the conceptual overview cards.
$overview = [regex]::Match($html, '(?s)<ul class="figures"[^>]*>(.*?)</ul>').Groups[1].Value
Assert-True ($overview -ne '' -and [regex]::Matches($overview, '<li>').Count -eq 4) 'the page has four conceptual overview cards'

$treeOutput = @(& node $treeScript --source filesystem --no-default-roots --root $skillsRoot --format tree 2>&1)
$treeExit = $LASTEXITCODE
$header = [regex]::Match(($treeOutput -join "`n"), '(\d+) group\(s\), (\d+) skill\(s\) from filesystem')
Assert-True ($treeExit -eq 0 -and $header.Success) 'the skill tree command runs and reports its counts'
$treeGroups = if ($header.Success) { [int]$header.Groups[1].Value } else { -1 }
$treeSkills = if ($header.Success) { [int]$header.Groups[2].Value } else { -1 }
$runAll = Get-Content -LiteralPath $runAllPath -Raw
$declaredBlock = [regex]::Match($runAll, '(?s)\$declaredChecks = @\((.*?)\n\)').Groups[1].Value
$nodeBlock = [regex]::Match($runAll, '(?s)\$nodeSuites = @\((.*?)\n\)').Groups[1].Value
$psRows = [regex]::Matches($declaredBlock, "@\{\s*Name\s*=").Count
$nodeRows = [regex]::Matches($nodeBlock, "@\{\s*Name\s*=").Count
Assert-True ($psRows -gt 0 -and $nodeRows -gt 0) "run-all declares $psRows PowerShell check(s) and $nodeRows Node suite(s)"
# Counts repeated in captions, aria-labels, SVG text and the Sources register
# drifted between sections before, so every printed repetition is read.
$skillMentions = @([regex]::Matches($html, '\b(\d+) (?:grouped )?skills\b') | ForEach-Object { [int]$_.Groups[1].Value })
$wrongSkills = @($skillMentions | Where-Object { $_ -ne $treeSkills } | Select-Object -Unique)
Assert-True ($skillMentions.Count -gt 0 -and $wrongSkills.Count -eq 0) "every skill count on the page equals the tree's $treeSkills ($($skillMentions.Count) found; wrong: $(Format-Set $wrongSkills))"
$fileMentions = @([regex]::Matches($html, '\b(\d+) (?:role|subagent|agent) files\b') | ForEach-Object { [int]$_.Groups[1].Value })
$wrongFiles = @($fileMentions | Where-Object { $_ -ne $roleKeys.Count } | Select-Object -Unique)
Assert-True ($fileMentions.Count -gt 0 -and $wrongFiles.Count -eq 0) "every role-file count on the page equals the map's $($roleKeys.Count) role(s) (wrong: $(Format-Set $wrongFiles))"

# The roles figures: one per runtime, each drawing every mapped role with the
# binding that runtime gives it, and each card opening its config file.
$roles = Get-Section $html 'roles'
function Get-RolesFigure {
    param([string]$Id)
    $m = [regex]::Match($roles, "(?s)<figure[^>]*\bid=""$Id""[^>]*>.*?</figure>")
    if ($m.Success) { $m.Value } else { '' }
}
# A card's heading is the role, blue, or a forwarder: the role in a blue tspan then "forwarder".
function Get-RoleCards {
    param([string]$Figure)
    @([regex]::Matches($Figure, '<rect [^>]*class="(bcl|bcx)(?: ro)?(?: role)?"/>\s*<text [^>]*class="h(?: ag)?">(?:<tspan class="ag">)?([a-z_]+)(?:</tspan>( forwarder))?</text>') | ForEach-Object {
            [pscustomobject]@{ Class = $_.Groups[1].Value; Role = $_.Groups[2].Value; Forwarder = $_.Groups[3].Success }
        })
}
function Get-DrawnBinding {
    param([string]$Figure, [string]$Role)
    $box = [regex]::Match($Figure, "class=""h(?: ag)?"">$([regex]::Escape($Role))</text>\s*<text [^>]*>([^<]+)</text>")
    if ($box.Success) { $box.Groups[1].Value } else { 'none' }
}
function Get-RoleFileBinding {
    param([string]$Role)
    $tomlPath = Join-Path $root "agents\$Role.toml"
    $toml = if (Test-Path -LiteralPath $tomlPath) { [IO.File]::ReadAllText($tomlPath) } else { '' }
    [pscustomobject]@{
        Model    = [regex]::Match($toml, '(?m)^model\s*=\s*"([^"]+)"').Groups[1].Value
        Effort   = [regex]::Match($toml, '(?m)^model_reasoning_effort\s*=\s*"([^"]+)"').Groups[1].Value
        Provider = [regex]::Match($toml, '(?m)^model_provider\s*=\s*"([^"]+)"').Groups[1].Value
    }
}
$claudeFig = Get-RolesFigure 'roles-claude'
$codexFig = Get-RolesFigure 'roles-codex'
Assert-True ($claudeFig -ne '' -and $codexFig -ne '') 'the roles section holds a Claude Code figure (roles-claude) and a Codex figure (roles-codex)'
$claudeLabel = [regex]::Match($claudeFig, '<svg [^>]*aria-label="([^"]+)"').Groups[1].Value
$codexLabel = [regex]::Match($codexFig, '<svg [^>]*aria-label="([^"]+)"').Groups[1].Value

# Claude Code: one box per mapped role, Codex boxes for Codex-runtime roles only.
$allBoxes = @(Get-RoleCards $claudeFig)
$boxes = @($allBoxes | Where-Object { -not $_.Forwarder })
$drawnClaude = @($boxes | Where-Object { $_.Class -ceq 'bcl' } | ForEach-Object Role)
$drawnCodex = @($boxes | Where-Object { $_.Class -ceq 'bcx' } | ForEach-Object Role)
$drawnAll = @($drawnClaude + $drawnCodex)
$missingRoles = @($roleKeys | Where-Object { $drawnAll -notcontains $_ })
$extraRoles = @($drawnAll | Where-Object { $roleKeys -notcontains $_ })
Assert-True ($missingRoles.Count -eq 0) "Claude Code roles figure draws every mapped role (missing: $(Format-Set $missingRoles))"
Assert-True ($extraRoles.Count -eq 0 -and $drawnAll.Count -eq $roleKeys.Count) "Claude Code roles figure draws no unmapped or repeated role (extra: $(Format-Set $extraRoles))"
Assert-True ((Format-Set $drawnCodex) -eq (Format-Set $codexRoles)) "Claude Code roles figure draws as Codex runtime exactly the map's Codex roles ($(Format-Set $codexRoles))"
Assert-True ((Format-Set $drawnClaude) -eq (Format-Set $claudeRoles)) 'Claude Code roles figure draws every other role as Claude runtime'
# Each Claude-runtime box states the map's model, by the name MODELS.md gives it, and its effort.
$modelsText = [IO.File]::ReadAllText((Join-Path $root 'MODELS.md'))
foreach ($role in $claudeRoles) {
    $binding = $map.roles.$role
    $effort = if ($binding.PSObject.Properties.Name -contains 'effort') { $binding.effort } else { '' }
    $row = [regex]::Match($modelsText, "(?m)^\| $([regex]::Escape($role)) \| Claude \| ``([^``]+)`` \(([^)]+)\) \|")
    $display = if ($row.Success -and $row.Groups[1].Value -eq $binding.model) { $row.Groups[2].Value -replace ' alias$', '' } else { '' }
    $expected = if ($effort) { "$display · $effort" } else { $display }
    $drawn = Get-DrawnBinding $claudeFig $role
    Assert-True ($display -ne '' -and $drawn -eq $expected) "Claude Code roles figure states $role as the map's $($binding.model)$(if ($effort) { " $effort" }) (drawn: $drawn)"
}
# Each Codex-runtime box states its role file's model and effort, in the box and the aria-label.
foreach ($role in $codexRoles) {
    $b = Get-RoleFileBinding $role
    $drawn = Get-DrawnBinding $claudeFig $role
    Assert-True ($b.Model -ne '' -and $drawn -eq "$($b.Model) · $($b.Effort)") "Claude Code roles figure states $role as its role file's $($b.Model) · $($b.Effort) (drawn: $drawn)"
    Assert-True ($b.Model -ne '' -and $claudeLabel.Contains("$role on $($b.Model) $($b.Effort)")) "Claude Code roles figure aria-label states $role on $($b.Model) $($b.Effort)"
    # Its forwarder runs on Claude: one Claude-runtime card stating the generated agent file's model.
    $fwd = @($allBoxes | Where-Object { $_.Forwarder -and $_.Role -ceq $role })
    $fwdModel = [regex]::Match($html, "<template id=""cfg-claude-$([regex]::Escape($role))""[^>]*>---\r?\n(?:[^\r\n]*\r?\n)*?model: (\S+)").Groups[1].Value
    $fwdRow = [regex]::Match($modelsText, "(?m)^\| [a-z_]+ \| Claude \| ``$([regex]::Escape($fwdModel))`` \(([^)]+)\) \|")
    $fwdDrawn = [regex]::Match($claudeFig, "<tspan class=""ag"">$([regex]::Escape($role))</tspan> forwarder</text>\s*<text [^>]*>([^<]+)</text>").Groups[1].Value
    Assert-True ($fwd.Count -eq 1 -and $fwd[0].Class -ceq 'bcl' -and $fwdRow.Success -and $fwdDrawn.StartsWith($fwdRow.Groups[1].Value)) "Claude Code roles figure draws $role's forwarder once as Claude runtime on its agent file's $fwdModel (drawn: $fwdDrawn)"
}

# Codex: every mapped role as a Codex subagent, with its role file's model and
# effort, and its provider where that is not openai.
$cBoxes = @(Get-RoleCards $codexFig)
$cDrawn = @($cBoxes | ForEach-Object Role)
$cClaude = @($cBoxes | Where-Object { $_.Class -ceq 'bcl' -or $_.Forwarder } | ForEach-Object Role)
Assert-True ((Format-Set $cDrawn) -eq (Format-Set $roleKeys) -and $cDrawn.Count -eq $roleKeys.Count) "Codex roles figure draws every mapped role once (drawn: $(Format-Set $cDrawn))"
Assert-True ($cBoxes.Count -gt 0 -and $cClaude.Count -eq 0) "Codex roles figure draws every role as Codex runtime (Claude runtime: $(Format-Set $cClaude))"
# An agent card is never filled: every card rect in either roles figure carries role.
$cardRects = @([regex]::Matches(($claudeFig + $codexFig), '<g class="cfg"[^>]*>\s*<rect [^>]*class="([^"]+)"/>') | ForEach-Object { $_.Groups[1].Value })
$filled = @($cardRects | Where-Object { @($_ -split ' ') -cnotcontains 'role' })
Assert-True ($cardRects.Count -gt 0 -and $filled.Count -eq 0) "every agent card in the roles figures is drawn unfilled, class role ($($cardRects.Count) cards; filled: $($filled.Count))"
# Codex is drawn first, Claude Code second.
Assert-True ($roles.IndexOf('id="roles-codex"') -ge 0 -and $roles.IndexOf('id="roles-codex"') -lt $roles.IndexOf('id="roles-claude"')) 'the roles section draws the Codex figure before the Claude Code figure'
foreach ($role in $roleKeys) {
    $b = Get-RoleFileBinding $role
    $drawn = Get-DrawnBinding $codexFig $role
    Assert-True ($b.Model -ne '' -and $drawn -eq "$($b.Model) · $($b.Effort)") "Codex roles figure states $role as its role file's $($b.Model) · $($b.Effort) (drawn: $drawn)"
    Assert-True ($b.Model -ne '' -and $codexLabel.Contains("$role on $($b.Model) $($b.Effort)")) "Codex roles figure aria-label states $role on $($b.Model) $($b.Effort)"
    if ($b.Provider -and $b.Provider -ne 'openai') {
        $card = [regex]::Match($codexFig, "(?s)<g class=""cfg""[^>]*\bdata-cfg=""cfg-codex-$([regex]::Escape($role))""[^>]*>(.*?)</g>").Groups[1].Value
        Assert-True ($card.Contains("via $($b.Provider)") -and $codexLabel.Contains("via $($b.Provider)")) "Codex roles figure names $role's provider, $($b.Provider), on its card and in the aria-label"
    }
}

# Every card names the file it opens, and that file is embedded as a template
# that embed-role-configs.mjs keeps equal to the file.
$claudeCfg = @([regex]::Matches($claudeFig, '\bdata-cfg="(cfg-[a-z]+-[a-z_]+)"') | ForEach-Object { $_.Groups[1].Value })
$codexCfg = @([regex]::Matches($codexFig, '\bdata-cfg="(cfg-[a-z]+-[a-z_]+)"') | ForEach-Object { $_.Groups[1].Value })
$wantClaudeCfg = @(@($roleKeys | ForEach-Object { "cfg-claude-$_" }) + @($codexRoles | ForEach-Object { "cfg-codex-$_" }))
$wantCodexCfg = @($roleKeys | ForEach-Object { "cfg-codex-$_" })
Assert-True ((Format-Set $claudeCfg) -eq (Format-Set $wantClaudeCfg) -and $claudeCfg.Count -eq $wantClaudeCfg.Count) "Claude Code roles figure opens each role's ~/.claude/agents file and each Codex-runtime role's role file, once (opens: $(Format-Set $claudeCfg))"
Assert-True ((Format-Set $codexCfg) -eq (Format-Set $wantCodexCfg) -and $codexCfg.Count -eq $wantCodexCfg.Count) "Codex roles figure opens each role's agents file once (opens: $(Format-Set $codexCfg))"
$cards = @([regex]::Matches($roles, '(?s)<g class="cfg"[^>]*\bdata-cfg="cfg-(claude|codex)-([a-z_]+)"[^>]*>(.*?)</g>'))
$unlabelled = @($cards | Where-Object {
        $file = if ($_.Groups[1].Value -eq 'claude') { "$($_.Groups[2].Value).md" } else { "$($_.Groups[2].Value).toml" }
        $_.Groups[3].Value -notmatch "class=""f""[^>]*>$([regex]::Escape($file))</text>"
    } | ForEach-Object { "cfg-$($_.Groups[1].Value)-$($_.Groups[2].Value)" })
Assert-True ($cards.Count -gt 0 -and $cards.Count -eq ($claudeCfg.Count + $codexCfg.Count) -and $unlabelled.Count -eq 0) "every role card shows the name of the file it opens (unlabelled: $(Format-Set $unlabelled))"
$templates = @([regex]::Matches($html, '<template id="(cfg-[a-z]+-[a-z_]+)"') | ForEach-Object { $_.Groups[1].Value })
$noTemplate = @(@($claudeCfg + $codexCfg) | Select-Object -Unique | Where-Object { $templates -notcontains $_ })
Assert-True ($templates.Count -gt 0 -and $noTemplate.Count -eq 0) "every file a card opens is embedded as a template (missing: $(Format-Set $noTemplate))"
$embedScript = Join-Path $root 'guide\scripts\embed-role-configs.mjs'
$embedExit = 1
$embedOutput = @('guide/scripts/embed-role-configs.mjs is missing')
if (Test-Path -LiteralPath $embedScript) {
    $embedOutput = @(& node $embedScript --check 2>&1)
    $embedExit = $LASTEXITCODE
}
Assert-True ($embedExit -eq 0) "the embedded config files equal their role files (embed-role-configs.mjs --check: $(@($embedOutput)[-1]))"

# Exercise freshness and duplicate rejection through the embed script's public CLI.
$embedSuite = Join-Path $root 'checks\embed-role-configs.test.mjs'
$embedSuiteOutput = @(& node --test $embedSuite 2>&1)
$embedSuiteExit = $LASTEXITCODE
Assert-True ($embedSuiteExit -eq 0) "embedded config CLI regression checks pass (embed-role-configs.test.mjs)"
if ($embedSuiteExit -ne 0) { $embedSuiteOutput | ForEach-Object { Write-Host "       $_" } }

# A retired forwarder name, not the cfg-codex-<role> template ids that contain it.
foreach ($retired in 'codex-fast_worker', 'codex-smart_worker') {
    Assert-True ($html -notmatch "(?<!cfg-)\b$([regex]::Escape($retired))\b") "the page does not name the retired $retired"
}

# Skill names in the skills figure.
$folders = @(Get-ChildItem -LiteralPath $skillsRoot -Directory -Force | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') } | ForEach-Object Name)
$excludePatterns = @($map.skills.exclude)
$required = @($folders | Where-Object { $name = $_; -not ($excludePatterns | Where-Object { $name -like $_ }) })
Assert-True ($required.Count -gt 0) "$($required.Count) skill folder(s) are shown to Claude and must appear"
# A method nested in a shown skill, <skill>/<method>/METHOD.md, is drawn as <skill>/<method>.
$methods = @(foreach ($skill in $required) {
        Get-ChildItem -LiteralPath (Join-Path $skillsRoot $skill) -Directory -Force |
            Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'METHOD.md') } | ForEach-Object { "$skill/$($_.Name)" }
    })
$required = @($required + $methods)
$folders = @($folders + $methods)

$skillsSection = Get-Section $html 'skills'
# The figure's own legend draws sample marks, not skills.
$skillsFigure = [regex]::Replace($skillsSection, '(?s)<g data-legend[^>]*>.*?</g>', '')
# Every straight segment of a figure's paths and lines, with whether it is dashed.
function Get-Segments {
    param([string]$Svg)
    $segs = [Collections.Generic.List[object]]::new()
    foreach ($m in [regex]::Matches($Svg, '<(?<tag>path|line) (?<a>[^>]*)/>')) {
        $a = $m.Groups['a'].Value
        $dash = @([regex]::Match($a, 'class="([^"]*)"').Groups[1].Value -split ' ') -ccontains 'dash'
        if ($m.Groups['tag'].Value -eq 'line') {
            $v = @('x1', 'y1', 'x2', 'y2' | ForEach-Object { [double][regex]::Match($a, "\b$_=""([-\d.]+)""").Groups[1].Value })
            $segs.Add([pscustomobject]@{ X1 = $v[0]; Y1 = $v[1]; X2 = $v[2]; Y2 = $v[3]; Dash = $dash })
            continue
        }
        $x = 0.0; $y = 0.0
        foreach ($c in [regex]::Matches([regex]::Match($a, '\bd="([^"]*)"').Groups[1].Value, '([MLHV])([^A-Za-z]*)')) {
            $n = @([regex]::Matches($c.Groups[2].Value, '-?[\d.]+') | ForEach-Object { [double]$_.Value })
            switch -CaseSensitive ($c.Groups[1].Value) {
                'M' { $x = $n[0]; $y = $n[1] }
                'L' { $segs.Add([pscustomobject]@{ X1 = $x; Y1 = $y; X2 = $n[0]; Y2 = $n[1]; Dash = $dash }); $x = $n[0]; $y = $n[1] }
                'H' { $segs.Add([pscustomobject]@{ X1 = $x; Y1 = $y; X2 = $n[0]; Y2 = $y; Dash = $dash }); $x = $n[0] }
                'V' { $segs.Add([pscustomobject]@{ X1 = $x; Y1 = $y; X2 = $x; Y2 = $n[0]; Dash = $dash }); $y = $n[0] }
            }
        }
    }
    , $segs
}
# A skill is drawn one way: a monospace tree node, text with no class, written /name
# for a skill and skill/method for a method. data-lead marks a tree's root;
# data-skill marks a skill named again outside its tree, allowed only on a dashed
# reference branch.
$segments = Get-Segments $skillsFigure
$nodes = @([regex]::Matches($skillsFigure, '<text (?<a>[^>]*)>(?<n>[^<]+)</text>') | Where-Object { $_.Groups['a'].Value -notmatch '\bclass=' } | ForEach-Object {
        $a = $_.Groups['a'].Value
        $x = [double][regex]::Match($a, '\bx="([\d.]+)"').Groups[1].Value
        $y = [double][regex]::Match($a, '\by="([\d.]+)"').Groups[1].Value
        # Every node hangs from its parent on an L: a tick ending just before the text, on its baseline row;
        # or, in a horizontal tree inside a box, a short drop from a rail ending just above the text's start.
        $tick = $segments | Where-Object { $_.Y1 -eq $_.Y2 -and $_.Y1 -ge $y - 6 -and $_.Y1 -le $y - 2 -and [math]::Max($_.X1, $_.X2) -ge $x - 8 -and [math]::Max($_.X1, $_.X2) -le $x - 2 } | Select-Object -First 1
        $drop = $segments | Where-Object { $_.X1 -eq $_.X2 -and [math]::Abs($_.X1 - $x) -le 2 -and [math]::Max($_.Y1, $_.Y2) -ge $y - 16 -and [math]::Max($_.Y1, $_.Y2) -le $y - 10 -and [math]::Abs($_.Y1 - $_.Y2) -le 10 } | Select-Object -First 1
        $dashedRef = $false
        if ($tick) {
            $x0 = [math]::Min($tick.X1, $tick.X2)
            $trunk = @($segments | Where-Object { $_.X1 -eq $_.X2 -and [math]::Abs($_.X1 - $x0) -le 0.5 -and [math]::Min($_.Y1, $_.Y2) -le $tick.Y1 -and [math]::Max($_.Y1, $_.Y2) -ge $tick.Y1 })
            $dashedRef = @($trunk | Where-Object Dash).Count -gt 0 -and @($trunk | Where-Object { -not $_.Dash }).Count -eq 0
        } elseif ($drop) {
            $dashedRef = $drop.Dash
        }
        [pscustomobject]@{ Label = $_.Groups['n'].Value; Name = $_.Groups['n'].Value.TrimStart('/'); Hung = [bool]($tick -or $drop); DashedRef = $dashedRef; Repeat = $a -match '\bdata-skill=' }
    })
$treeNodes = @($nodes | Where-Object { -not ($_.Repeat -and $_.DashedRef) } | ForEach-Object Name)
$skillNames = [Collections.Generic.HashSet[string]]::new()
foreach ($n in $nodes) { [void]$skillNames.Add($n.Name) }
$skillsMissing = @($required | Where-Object { -not $skillNames.Contains($_) })
$skillsUnknown = @($skillNames | Where-Object { $folders -cnotcontains $_ })
Assert-True ($skillsMissing.Count -eq 0) "skills figure names every skill shown to Claude (missing: $(Format-Set $skillsMissing))"
Assert-True ($skillsUnknown.Count -eq 0) "skills figure names no skill that does not exist (unknown: $(Format-Set $skillsUnknown))"
$wrongForm = @($nodes | Where-Object { ($_.Name.Contains('/') -and $_.Label.StartsWith('/')) -or (-not $_.Name.Contains('/') -and -not $_.Label.StartsWith('/')) } | ForEach-Object Label)
Assert-True ($wrongForm.Count -eq 0) "skills figure writes each skill /name and each method skill/method (wrong: $(Format-Set $wrongForm))"
$unhung = @($nodes | Where-Object { -not $_.Hung } | ForEach-Object Label)
Assert-True ($nodes.Count -gt 0 -and $unhung.Count -eq 0) "every skill in the skills figure hangs from its pill, band, box or parent skill on an L connector (unhung: $(Format-Set $unhung))"
$repeatsOffBranch = @($nodes | Where-Object { $_.Repeat -and -not $_.DashedRef } | ForEach-Object Label)
Assert-True ($repeatsOffBranch.Count -eq 0) "a skill named again in the skills figure hangs on a dashed reference branch (not dashed: $(Format-Set $repeatsOffBranch))"

# Groups follow the tree: the skills figure heads every group once with the
# tree's lead, and each stage pill names the role that runs it. Skills drawn
# under the wrong lead and a group split across rows passed review before this ran.
$treeLead = @{}
foreach ($line in $treeOutput) {
    # The tree's box-drawing glyphs depend on the console encoding, so match any non-space run.
    $g = [regex]::Match([string]$line, '^([a-z0-9-]+) \S+ ([a-z0-9/-]+):')
    if ($g.Success) { $treeLead[$g.Groups[1].Value] = $g.Groups[2].Value }
}
# Agent role names: the role files, the generic name the figures use for either
# worker, and the two team roles, the team lead and the coordinator above it.
$roleNames = @(@(Get-ChildItem (Join-Path $root 'agents') -Filter *.toml | ForEach-Object BaseName) + 'worker' + 'team lead' + 'coordinator')
# A role name as a word, singular or plural, not part of a path, file or longer name.
$roleWord = '(?i)(?<![\w/.-])(?:' + (($roleNames | Sort-Object Length -Descending | ForEach-Object { [regex]::Escape($_) }) -join '|') + ')s?(?![\w/.-])'
# Partner slots: the hero tile, and each scaling label name the
# same partner roles as the team rule in orchestrate-work's team reference.
$teamRule = Get-Content -Raw -LiteralPath (Join-Path $skillsRoot 'orchestrate-work\references\team.md')
function Get-PartnerSet([string]$Text) { (@([regex]::Matches([regex]::Replace($Text, '<[^>]+>', ''), '\b[a-z_]+\b') | ForEach-Object Value | Where-Object { $roleNames -ccontains $_ } | Sort-Object -Unique) -join ', ') }
$ruleSet = Get-PartnerSet ([regex]::Match($teamRule, '(?s)lead fills it when that worker needs (.*?), and releases').Groups[1].Value)
$scalingSection = Get-Section $html 'scaling'
$partnerTexts = @([regex]::Match($html, 'partner slot for (.*?) when it needs one').Groups[1].Value) + @([regex]::Matches($scalingSection, '>P: (.*?)</text>') | ForEach-Object { $_.Groups[1].Value })
$wrongPartners = @($partnerTexts | Where-Object { (Get-PartnerSet $_) -cne $ruleSet })
Assert-True ($ruleSet -and $partnerTexts.Count -eq 4 -and $wrongPartners.Count -eq 0) "the hero tile and scaling labels name the team rule's partner roles ($ruleSet; $($wrongPartners.Count) of $($partnerTexts.Count) differ)"
# The skills figure: every tree group is headed once (data-group on the head) and
# its tree's root is the tree's lead (data-lead), the only root for that group.
$headGroups = @([regex]::Matches($skillsFigure, '<text [^>]*class="h(?: ag)?"[^>]*\bdata-group="([a-z]+)"') | ForEach-Object { $_.Groups[1].Value })
Assert-True ($headGroups.Count -eq $treeGroups -and (Format-Set $headGroups) -ceq (Format-Set @($treeLead.Keys))) "skills figure heads each tree group once ($($headGroups -join ', '))"
$roots = @([regex]::Matches($skillsFigure, '<text [^>]*\bdata-lead="([a-z]+)"[^>]*>/?([^<]+)</text>') | ForEach-Object { [pscustomobject]@{ Group = $_.Groups[1].Value; Lead = $_.Groups[2].Value } })
$wrongLeads = @($roots | Where-Object { $treeLead[$_.Group] -cne $_.Lead } | ForEach-Object { "$($_.Group): $($_.Lead)" })
$rootGroups = @($roots.Group)
Assert-True ($roots.Count -gt 0 -and $wrongLeads.Count -eq 0 -and (Format-Set $rootGroups) -ceq (Format-Set $headGroups) -and $rootGroups.Count -eq $headGroups.Count) "each group's tree in the skills figure has one root, the tree's lead (wrong: $(Format-Set $wrongLeads))"
# Each step pill holds exactly three lines: the step (data-group), what it does, and
# the agent line, blue, naming real roles or left empty where no agent leads.
$pillRects = @([regex]::Matches($skillsFigure, '<rect x="(?<x>[\d.]+)" y="(?<y>[\d.]+)" width="(?<w>[\d.]+)" height="(?<h>[\d.]+)"[^>]*class="pill"/>'))
$textAt = @([regex]::Matches($skillsFigure, '<text x="(?<x>[\d.]+)" y="(?<y>[\d.]+)"') | ForEach-Object { [pscustomobject]@{ X = [double]$_.Groups['x'].Value; Y = [double]$_.Groups['y'].Value } })
$wrongLines = @($pillRects | Where-Object {
        $rx = [double]$_.Groups['x'].Value; $ry = [double]$_.Groups['y'].Value; $rw = [double]$_.Groups['w'].Value; $rh = [double]$_.Groups['h'].Value
        @($textAt | Where-Object { $_.X -ge $rx -and $_.X -le $rx + $rw -and $_.Y -ge $ry -and $_.Y -le $ry + $rh }).Count -ne 3
    } | ForEach-Object { "pill at x $($_.Groups['x'].Value)" })
Assert-True ($pillRects.Count -gt 0 -and $wrongLines.Count -eq 0) "each step pill in the skills figure draws exactly three text lines (wrong: $(Format-Set $wrongLines))"
$pills = @([regex]::Matches($skillsFigure, '<rect [^>]*class="pill"/>\s*<text [^>]*class="h"[^>]*\bdata-group="(?<g>[a-z]+)"[^>]*>[^<]+</text>\s*<text [^>]*class="s"[^>]*>[^<]+</text>\s*<text [^>]*class="l ag"[^>]*>(?<agent>[^<]*)</text>') | ForEach-Object {
        [pscustomobject]@{ Group = $_.Groups['g'].Value; Agent = $_.Groups['agent'].Value }
    })
Assert-True ($pills.Count -gt 0 -and $pills.Count -eq $pillRects.Count) "each step pill in the skills figure reads step, what it does, then its blue agent line ($($pills.Count) of $($pillRects.Count) pills)"
$unknownAgents = @($pills | Where-Object { $_.Agent } | ForEach-Object { $_.Agent -split ', | or | and ' } | Where-Object { $roleNames -cnotcontains $_ })
Assert-True ($unknownAgents.Count -eq 0) "each pill's agent line names real roles (unknown: $(Format-Set $unknownAgents))"
$repeated = @($treeNodes | Group-Object -CaseSensitive | Where-Object Count -gt 1 | ForEach-Object Name)
Assert-True ($treeNodes.Count -gt 0 -and $repeated.Count -eq 0) "skills figure draws each skill and method once; a lens or shared method is a dashed link, not a second leaf (repeated: $(Format-Set $repeated))"

# Blue text means an agent role, and only that, in every figure. Each role word in a
# text's or tspan's own words, singular or plural, is inside class ag, unless it is
# a skill or a file label; each blue text or tspan names a role or is an empty agent
# line. Role labels left black, plurals and blue legend labels passed review before.
$figures = [regex]::Replace($html, '(?s)<nav class="key".*?</nav>', '')
$svgs = @([regex]::Matches($figures, '(?s)<svg class="d"[^>]*>.*?</svg>') | ForEach-Object Value)
function Get-Classes { param([string]$Attrs) @([regex]::Match($Attrs, 'class="([^"]*)"').Groups[1].Value -split ' ') }
function Get-Plain { param([string]$Markup) [Net.WebUtility]::HtmlDecode([regex]::Replace($Markup, '<[^>]+>', '')) }
$unmarked = [Collections.Generic.List[string]]::new()
$wrongBlue = [Collections.Generic.List[string]]::new()
foreach ($svg in $svgs) {
    foreach ($m in [regex]::Matches($svg, '(?s)<text(?<a>[^>]*)>(?<b>.*?)</text>')) {
        $a = $m.Groups['a'].Value; $body = $m.Groups['b'].Value; $cls = Get-Classes $a
        if ($cls -ccontains 'ag') {
            $plain = Get-Plain $body
            if ($plain.Trim() -and $plain -notmatch $roleWord) { $wrongBlue.Add($plain) }
            continue
        }
        if ($a -match '\bdata-(?:skill|lead)=' -or $cls -ccontains 'f' -or $cls -ccontains 'sk') { continue }
        $own = Get-Plain ([regex]::Replace($body, '(?s)<tspan[^>]*>.*?</tspan>', ' '))
        if ($own -match $roleWord) { $unmarked.Add($own.Trim()) }
        foreach ($t in [regex]::Matches($body, '<tspan(?<a>[^>]*)>(?<t>[^<]*)</tspan>')) {
            $tc = Get-Classes $t.Groups['a'].Value
            $tt = [Net.WebUtility]::HtmlDecode($t.Groups['t'].Value)
            if ($tc -ccontains 'ag') { if ($tt -notmatch $roleWord) { $wrongBlue.Add($tt) } }
            elseif ($tc -cnotcontains 'sk' -and $tt -match $roleWord) { $unmarked.Add($tt) }
        }
    }
}
Assert-True ($svgs.Count -gt 0 -and $unmarked.Count -eq 0) "every role name drawn in a figure, singular or plural, is blue agent text, class ag ($($svgs.Count) figures; unmarked: $(Format-Set $unmarked))"
Assert-True ($wrongBlue.Count -eq 0) "blue text in a figure names an agent role and nothing else (not a role: $(Format-Set $wrongBlue))"
# A skill is written /name in monospace wherever a figure names one that way.
$sansSkills = @(foreach ($svg in $svgs) {
        foreach ($m in [regex]::Matches($svg, '<(?:text|tspan)(?<a>[^>]*)>/(?<n>[a-z0-9-]+)</(?:text|tspan)>')) {
            $c = Get-Classes $m.Groups['a'].Value
            if ($folders -ccontains $m.Groups['n'].Value -and ($c | Where-Object { $_ }) -and $c -cnotcontains 'sk') { "/$($m.Groups['n'].Value)" }
        }
    })
Assert-True ($sansSkills.Count -eq 0) "every /name skill in a figure is monospace: tree text with no class, or class sk (sans: $(Format-Set $sansSkills))"
# The page key teaches each mark once; every mark it teaches is used by a figure.
$keyBlock = [regex]::Match($html, '(?s)<nav class="key".*?</nav>').Value
$keyClasses = @([regex]::Matches($keyBlock, '<(?:rect|line|path|text) [^>]*class="([^"]+)"') | ForEach-Object { (@($_.Groups[1].Value -split ' ' | Where-Object { $_ -ne 'sample' }) | Sort-Object) -join ' ' } | Select-Object -Unique)
$figureClassSets = @([regex]::Matches(($svgs -join "`n"), '<(?:rect|line|path|text|tspan) [^>]*class="([^"]+)"') | ForEach-Object { , @($_.Groups[1].Value -split ' ') })
$unusedKey = @($keyClasses | Where-Object { $want = @($_ -split ' '); -not ($figureClassSets | Where-Object { $have = $_; @($want | Where-Object { $have -notcontains $_ }).Count -eq 0 } | Select-Object -First 1) })
Assert-True ($keyClasses.Count -gt 0 -and $unusedKey.Count -eq 0) "every mark the page key teaches is drawn in a figure (unused: $(Format-Set $unusedKey))"

# The Sources register: every repository path it cites exists.
$register = [regex]::Match($html, '(?s)<dl class="register">(.*?)</dl>').Groups[1].Value
Assert-True ($register -ne '') 'the page has a Sources register'
$registerText = [regex]::Replace($register, '<[^>]+>', ' ')
$paths = [Collections.Generic.List[string]]::new()
foreach ($token in ($registerText -split '[\s,;()]+')) {
    $t = $token.Trim().TrimEnd('.')
    if (-not $t) { continue }
    if ($t.StartsWith('~') -or $t -match '^[A-Za-z]:' -or $t.StartsWith('-')) { continue }
    if ($t -match '^[A-Za-z0-9_.-]+(/[A-Za-z0-9_.*-]+)+/?$' -or ($t -cmatch '^[A-Z][A-Z_]+\.md$' -and $t -notin 'SKILL.md', 'METHOD.md')) {
        $paths.Add($t)
    }
}
Assert-True ($paths.Count -gt 0) "the Sources register cites $($paths.Count) repository path(s)"
foreach ($p in ($paths | Select-Object -Unique)) {
    $full = Join-Path $root ($p.TrimEnd('/') -replace '/', '\')
    $exists = if ($p.Contains('*')) { @(Get-ChildItem -Path $full -ErrorAction SilentlyContinue).Count -gt 0 } else { Test-Path -Path $full }
    Assert-True $exists "Sources path exists: $p"
}

# The maintenance figure: the counts it states, and the board, scripts and
# skills it names.
$maint = Get-Section $html 'maintenance'
Assert-True ($maint -ne '') 'the page has a maintenance section'
$maintCounts = [regex]::Match($maint, 'run all (\d+) checks:</text>\s*<text [^>]*>(\d+) PowerShell, (\d+) Node</text>')
Assert-True ($maintCounts.Success -and [int]$maintCounts.Groups[1].Value -eq ($psRows + $nodeRows) -and [int]$maintCounts.Groups[2].Value -eq $psRows -and [int]$maintCounts.Groups[3].Value -eq $nodeRows) "maintenance figure states run-all's $($psRows + $nodeRows) checks, $psRows PowerShell and $nodeRows Node"
$boardPath = Join-Path $root 'workspace-seed\Harness inbox.base'
$boardExists = Test-Path -LiteralPath $boardPath
Assert-True ($maint.Contains('Harness inbox.base') -and $boardExists) 'the Inbox board the maintenance figure names ships in workspace-seed/Harness inbox.base'
$board = if ($boardExists) { [IO.File]::ReadAllText($boardPath) } else { '' }
Assert-True ($board.Contains('file.inFolder("workspace/Inbox")') -and $board.Contains('note.outcome.isEmpty()') -and $board.Contains('"Open"') -and $board.Contains('"Done"')) 'the board reads workspace/Inbox and groups notes as Open or Done by an empty outcome, as the figure draws'
# The workspace guide ships as a tracked seed; the owner's ignored copy must not
# drift from it. A fresh copy has no workspace/ folder, which passes.
$seedPath = Join-Path $root 'workspace-seed\AGENTS.md'
$liveGuidePath = Join-Path $root 'workspace\AGENTS.md'
$seedExists = Test-Path -LiteralPath $seedPath -PathType Leaf
$liveGuideMatches = (-not (Test-Path -LiteralPath $liveGuidePath)) -or ($seedExists -and (([IO.File]::ReadAllText($liveGuidePath) -replace "`r`n", "`n") -ceq ([IO.File]::ReadAllText($seedPath) -replace "`r`n", "`n")))
Assert-True ($seedExists -and $liveGuideMatches) 'the workspace guide seed workspace-seed/AGENTS.md exists, and workspace/AGENTS.md, when present, is a copy of it'
$maintScripts = @([regex]::Matches($maint, '\b(?:checks|config|claude)/[A-Za-z0-9_.-]+\.ps1\b') | ForEach-Object Value | Select-Object -Unique)
$missingScripts = @($maintScripts | Where-Object { -not (Test-Path -LiteralPath (Join-Path $root ($_ -replace '/', '\'))) })
Assert-True ($maintScripts.Count -ge 3 -and $missingScripts.Count -eq 0) "every script the maintenance figure names exists ($($maintScripts.Count) named; missing: $(Format-Set $missingScripts))"
$maintSkills = @('handoff', 'harness', 'skills-list')
$missingSkills = @($maintSkills | Where-Object { $maint -cnotmatch "(?<![\w-])/$([regex]::Escape($_))(?![\w-])" -or $folders -cnotcontains $_ })
Assert-True ($missingSkills.Count -eq 0) "the maintenance figure names the skills its steps rest on, and each exists (missing: $(Format-Set $missingSkills))"

# Lines and arrows connect: every connector in every figure lands on an element
# edge, a junction or a label, every arrowhead points at its target, and no
# connector crosses a label. Floating tree ticks and heads turned the wrong way
# passed review before this ran.
$connectorScript = Join-Path $root 'skills\design\drawing\scripts\svg-connectors.mjs'
$connectorExit = 1
$connectorOutput = @('skills/design/drawing/scripts/svg-connectors.mjs is missing')
if (Test-Path -LiteralPath $connectorScript) {
    $connectorOutput = @(& node $connectorScript $guidePath 2>&1)
    $connectorExit = $LASTEXITCODE
}
Assert-True ($connectorExit -eq 0) "every connector in the figures lands and points at its target (svg-connectors.mjs: $(@($connectorOutput)[-1]))"
if ($connectorExit -ne 0) { $connectorOutput | Select-Object -SkipLast 1 | ForEach-Object { Write-Host "       $_" } }

# Exercise the connector check through its public CLI, including supported
# starts/ends and malformed or unmeasured geometry that must never pass silently.
$connectorSuite = Join-Path $root 'checks\svg-connectors.test.mjs'
$connectorSuiteOutput = @(& node --test $connectorSuite 2>&1)
$connectorSuiteExit = $LASTEXITCODE
Assert-True ($connectorSuiteExit -eq 0) "connector CLI regression checks pass (svg-connectors.test.mjs)"
if ($connectorSuiteExit -ne 0) { $connectorSuiteOutput | ForEach-Object { Write-Host "       $_" } }

# Every named diagram section exists; Roles contributes one figure per runtime and Tools two.
$figureSections = @('install', 'roles', 'scaling', 'skills', 'journey', 'gates', 'tools', 'library', 'documents', 'adoption', 'maintenance')
$missingFigureSections = @($figureSections | Where-Object { (Get-Section $html $_) -notmatch '<figure\b' })
$figureCount = [regex]::Matches($html, '<figure\b').Count
Assert-True ($missingFigureSections.Count -eq 0 -and $figureCount -eq ($figureSections.Count + 2)) "the named diagram sections contain all $figureCount figures, with two runtime role figures and two tools figures (missing: $(Format-Set $missingFigureSections))"

# Stamp and punctuation.
$stamp = [regex]::Match($html, '<p class="stamp">Source, as of ([^<]+)<code>')
$stampDate = [datetime]::MinValue
$parsed = $stamp.Success -and [datetime]::TryParseExact($stamp.Groups[1].Value.Trim(), 'd MMMM yyyy', [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None, [ref]$stampDate)
Assert-True $parsed "the stamp is a date ($(if ($stamp.Success) { $stamp.Groups[1].Value.Trim() } else { 'none' }))"
Assert-True (-not $html.Contains([string][char]0x2014) -and $html -notmatch '(?i)&(?:mdash|#8212|#x2014);') 'the page has no em dash, literal or as an entity'

if ($failures.Count -eq 0) {
    Write-Host "Harness-guide check passed: $checks assertion(s)."
} else {
    Write-Host "Harness-guide check FAILED: $($failures.Count) of $checks assertion(s)."
}
exit $(if ($failures.Count -eq 0) { 0 } else { 1 })
