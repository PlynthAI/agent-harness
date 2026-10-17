#Requires -Version 7.0
<#
.SYNOPSIS
    The skill tree's routing, computed once for the checks that assert on it.

.DESCRIPTION
    A module, not a check: run-all.ps1 runs only the checks it declares, and this
    file asserts nothing. checks/harness.ps1 and checks/discovery.ps1 import
    it so the groups, leads and leaves they assert on come from one computation.

    Get-SkillRouting reads a skills directory (the source tree or an installed
    copy) and the router beside it, and returns:

      * the group vocabulary and each group's lead, from the harness library's
        authoring reference (VocabularyGroups, LeadByGroup,
        MissingVocabularyLeads);
      * each skill's declared group and lead flag, and where they disagree with
        the vocabulary (Undeclared, UnknownGroups, LeadMismatch);
      * the groups and leads the router's skill tree draws (RouterLeadByGroup),
        whether the router names every vocabulary group and lead (UnnamedGroups,
        UnnamedLeads), and router leads that are not installed as that group's
        lead (MissingRouterLeads);
      * each group's leaves and any leaf its lead never names (LeavesByGroup,
        UnroutedLeaves);
      * every sibling skill a lead links from its SKILL.md or a reference beside
        it, and links whose skill is absent (LinksByLead, MissingLinkedSkills);
      * skills that hide themselves from Codex (HiddenFromCodex).
#>
Set-StrictMode -Version Latest

function Get-Frontmatter {
    param([string]$Path)
    [regex]::Match([IO.File]::ReadAllText($Path), '(?s)\A' + [char]0xFEFF + '?---\r?\n(.*?)\r?\n---').Groups[1].Value
}

function Get-SkillRouting {
    param(
        [Parameter(Mandatory)][string]$SkillsRoot,
        [Parameter(Mandatory)][string]$RouterPath
    )

    $authoringPath = Join-Path $SkillsRoot 'harness\library\references\authoring-a-skill.md'
    $authoring = if (Test-Path -LiteralPath $authoringPath -PathType Leaf) { [IO.File]::ReadAllText($authoringPath) } else { '' }
    $router = if (Test-Path -LiteralPath $RouterPath -PathType Leaf) { [IO.File]::ReadAllText($RouterPath) } else { '' }

    # The vocabulary: one table row per group, naming its lead.
    $groupTable = [regex]::Matches($authoring, '(?m)^\|\s*([a-z]+)\s*\|\s*([a-z-]+)\s*\|')
    $vocabularyGroups = @($groupTable | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -ne 'Group' })
    $leadByGroup = [ordered]@{}
    foreach ($row in $groupTable) { if ($row.Groups[1].Value -ne 'Group') { $leadByGroup[$row.Groups[1].Value] = $row.Groups[2].Value } }
    $missingVocabularyLeads = @($leadByGroup.Values | Where-Object { -not (Test-Path -LiteralPath (Join-Path $SkillsRoot ($_ + '\SKILL.md')) -PathType Leaf) })

    # Every skill declares a group from the vocabulary, and each group's lead, and
    # only it, carries the lead flag. Codex also hides any skill whose
    # agents/openai.yaml sets allow_implicit_invocation: false.
    $declared = @{}
    $undeclared = [System.Collections.Generic.List[string]]::new()
    $unknown = [System.Collections.Generic.List[string]]::new()
    $leadMismatch = [System.Collections.Generic.List[string]]::new()
    $leavesByGroup = @{}
    $hiddenFromCodex = [System.Collections.Generic.List[string]]::new()
    $skillDirs = if (Test-Path -LiteralPath $SkillsRoot -PathType Container) { @(Get-ChildItem -LiteralPath $SkillsRoot -Directory | Sort-Object Name) } else { @() }
    foreach ($dir in $skillDirs) {
        $entry = Join-Path $dir.FullName 'SKILL.md'
        if (-not (Test-Path -LiteralPath $entry -PathType Leaf)) { continue }
        $frontmatter = Get-Frontmatter $entry
        $groupMatch = [regex]::Match($frontmatter, '(?m)^\s+group:\s*"?([a-z-]+)"?\s*$')
        $isLead = $frontmatter -match '(?m)^\s+lead:\s*true\s*$'
        if (-not $groupMatch.Success) { $undeclared.Add($dir.Name); continue }
        $policyPath = Join-Path $dir.FullName 'agents\openai.yaml'
        if ((Test-Path -LiteralPath $policyPath -PathType Leaf) -and ([IO.File]::ReadAllText($policyPath) -match '(?m)^\s*allow_implicit_invocation:\s*false\s*$')) { $hiddenFromCodex.Add($dir.Name) }
        $group = $groupMatch.Groups[1].Value
        $declared[$dir.Name] = [pscustomobject]@{ Group = $group; IsLead = $isLead }
        if (-not $leadByGroup.Contains($group)) { $unknown.Add("$($dir.Name) -> $group"); continue }
        $shouldLead = ($leadByGroup[$group] -eq $dir.Name)
        if ($isLead -ne $shouldLead) { $leadMismatch.Add("$($dir.Name) (lead: $isLead, expected $shouldLead)") }
        if (-not $shouldLead) {
            if (-not $leavesByGroup.ContainsKey($group)) { $leavesByGroup[$group] = [System.Collections.Generic.List[string]]::new() }
            $leavesByGroup[$group].Add($dir.Name)
        }
    }

    # The router names every group, with its lead beside it.
    $unnamedGroups = @($leadByGroup.Keys | Where-Object { $router -notmatch ('(?m)^\s*' + [regex]::Escape($_) + '\s') } | Sort-Object)
    $unnamedLeads = @($leadByGroup.Keys | Where-Object { $router -notmatch ('(?m)^\s*' + [regex]::Escape($_) + '\s+' + [regex]::Escape($leadByGroup[$_]) + '\s') } | ForEach-Object { $leadByGroup[$_] } | Sort-Object)

    # The router's skill tree is the fenced block whose every line is a group, its
    # lead and a gloss, apart from section labels ending in a colon. Each lead it
    # draws must be installed as that group's lead.
    $routerLeadByGroup = [ordered]@{}
    foreach ($block in [regex]::Matches($router, '(?ms)^[ \t]*```[^\n]*\n(.*?)^[ \t]*```')) {
        $lines = @($block.Groups[1].Value -split '\r?\n' | Where-Object { $_.Trim() -and $_ -notmatch ':\s*$' })
        $rows = @($lines | ForEach-Object { [regex]::Match($_, '^\s*([a-z]+)\s+([a-z][a-z0-9-]*)\s+\S') } | Where-Object { $_.Success })
        if ($lines.Count -eq 0 -or $rows.Count -ne $lines.Count) { continue }
        foreach ($row in $rows) { $routerLeadByGroup[$row.Groups[1].Value] = $row.Groups[2].Value }
    }
    $missingRouterLeads = @($routerLeadByGroup.Keys | Where-Object {
            $lead = $routerLeadByGroup[$_]
            -not ($declared.ContainsKey($lead) -and $declared[$lead].Group -eq $_ -and $declared[$lead].IsLead)
        } | ForEach-Object { $routerLeadByGroup[$_] } | Sort-Object)

    # A lead's text is its SKILL.md and the references beside it. A leaf the lead
    # never names is unreachable from the router, which is how wayfinder,
    # to-tickets and to-spec vanished from a drawn workflow. A link from that text
    # to a sibling skill's SKILL.md names a skill the lead routes to, which must
    # exist.
    $unroutedLeaves = [System.Collections.Generic.List[string]]::new()
    $linksByLead = [ordered]@{}
    $missingLinkedSkills = [System.Collections.Generic.List[string]]::new()
    $skillsRootFull = [IO.Path]::GetFullPath($SkillsRoot).TrimEnd('\', '/')
    $leads = @(@($leadByGroup.Values) + @($routerLeadByGroup.Values) | Sort-Object -Unique)
    foreach ($lead in $leads) {
        $leadDir = Join-Path $SkillsRoot $lead
        $entry = Join-Path $leadDir 'SKILL.md'
        if (-not (Test-Path -LiteralPath $entry -PathType Leaf)) { continue }
        $files = @(Get-Item -LiteralPath $entry)
        $referenceDir = Join-Path $leadDir 'references'
        if (Test-Path -LiteralPath $referenceDir -PathType Container) { $files += @(Get-ChildItem -LiteralPath $referenceDir -Filter '*.md' -File) }
        $leadText = ''
        $linked = [System.Collections.Generic.List[string]]::new()
        foreach ($file in $files) {
            $text = [IO.File]::ReadAllText($file.FullName)
            $leadText += "`n" + $text
            foreach ($link in [regex]::Matches($text, '\]\(<?((?:\.\./)+)([a-z0-9][a-z0-9-]*)/SKILL\.md(?:#[^)>]*)?>?\)')) {
                $target = [IO.Path]::GetFullPath((Join-Path $file.DirectoryName ($link.Groups[1].Value + $link.Groups[2].Value)))
                if ((Split-Path $target -Parent).TrimEnd('\', '/') -ne $skillsRootFull) { continue }
                $name = $link.Groups[2].Value
                if ($name -ne $lead -and -not $linked.Contains($name)) { $linked.Add($name) }
            }
        }
        $linksByLead[$lead] = @($linked | Sort-Object)
        foreach ($name in $linksByLead[$lead]) {
            if (-not (Test-Path -LiteralPath (Join-Path $SkillsRoot ($name + '\SKILL.md')) -PathType Leaf)) { $missingLinkedSkills.Add("$lead -> $name") }
        }
        foreach ($group in @($leadByGroup.Keys | Where-Object { $leadByGroup[$_] -eq $lead })) {
            if (-not $leavesByGroup.ContainsKey($group)) { continue }
            foreach ($leaf in $leavesByGroup[$group]) {
                if ($leadText -notmatch ('(?<![a-z-])' + [regex]::Escape($leaf) + '(?![a-z-])')) { $unroutedLeaves.Add("$group/$leaf") }
            }
        }
    }

    [pscustomobject]@{
        VocabularyGroups       = $vocabularyGroups
        LeadByGroup            = $leadByGroup
        MissingVocabularyLeads = $missingVocabularyLeads
        Undeclared             = @($undeclared)
        UnknownGroups          = @($unknown)
        LeadMismatch           = @($leadMismatch)
        UnnamedGroups          = $unnamedGroups
        UnnamedLeads           = $unnamedLeads
        RouterLeadByGroup      = $routerLeadByGroup
        MissingRouterLeads     = $missingRouterLeads
        LeavesByGroup          = $leavesByGroup
        UnroutedLeaves         = @($unroutedLeaves)
        LinksByLead            = $linksByLead
        MissingLinkedSkills    = @($missingLinkedSkills)
        HiddenFromCodex        = @($hiddenFromCodex)
    }
}

Export-ModuleMember -Function Get-SkillRouting
