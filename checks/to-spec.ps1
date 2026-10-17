#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the shared to-spec method (SF-020).

.DESCRIPTION
    Reads skills/to-spec/SKILL.md and checks what a machine can decide: the
    frontmatter and its selectable description, the light budget, the
    workspace-first storage rule that names the resolved prds/specs route and
    refuses mandatory product-Git storage, the skip rule for routine work, the
    issue-carries-what and no-duplicate-issue rules, the remote-consumer rule
    refusing whole-workspace and versioned-platform requirements, the delegation
    of the ticket set to to-tickets and the plan to planner, the
    no-ratification / no-mandatory-interview boundary, the spec shape, the two
    shared templates the method points at, every link resolving inside the skills
    tree, and the portability rules (no host path, drive letter,
    model pin or package-manager invocation).

    Polarity is bound in each direction-bearing clause. The skip rule, the
    optional-tracking rule, the route-not-created rule, the no-ceremony rule, the
    no-duplicate rule and the remote-consumer refusal all put the negation inside
    the pattern or bind it to the thing it negates in the same clause, so a
    rewrite that keeps every keyword and flips the meaning fails. The skip rule
    and the delegation handovers are bound to the row or the list item that
    carries them rather than to the whole file. The storage, issue,
    remote-consumer and handoff sections each carry a section-level -notmatch
    guard against the sentence that would reverse them; the skip rule, the
    no-ceremony rule and the "carries why" half do not, and are bound by a
    clause- or item-scoped assertion instead. The refusal clauses avoid the
    single verb "need" and the "X or Y" shape, and their guards are deliberately
    not the same vocabulary as the assertion they protect: a guard built from
    the assertion's own words also matches that assertion's own clause and fires
    on sound prose.

    Deliberately NOT checked here: whether the prose means the right thing in
    general. A regex cannot tell "skip the specification for routine work" from
    its opposite, and no assertion below reads the meaning of a sentence. The
    assertions are section membership, clause polarity, template fields, block
    membership and preserved clauses, and every one of them has a recorded
    mutation that makes it fail. Two specific known limits are recorded rather
    than hidden: (1) the direction clauses are asserted over the flattened whole
    file, not over one paragraph, because their enforced vocabulary and phrasing
    is what keeps a reversal detectable - a reworded but still-correct clause can
    therefore miss; (2) a section whose first matching sentence already carries
    the refusal makes its own reversal guard unreachable, so the guard only bites
    once another sentence in that section states the negated claim. Meaning is
    verified by independent review, and the verdict line says so.

    This file runs a model for nothing, writes nothing, installs nothing and
    needs no network.
#>
# 2026-09-23: retire obsolete routing-wording assertions; independent review
# assesses scope/continuation and optional planning. Structural checks remain.
[CmdletBinding()]
param([switch]$Quiet)

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

function Get-FileText {
    param([string]$Path)
# A missing file returns '' rather than throwing, and a zero-byte file
# returns '' rather than $null: a null operand makes the -match family emit
# an empty array and abort the run before its verdict line.
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
    return [string](Get-Content -Raw -LiteralPath $Path)
}

function Get-SectionObjects {
    param([string]$Text)
    $sections = [System.Collections.Generic.List[object]]::new()
    foreach ($chunk in ([regex]::Split($Text, '(?m)^## ') | Select-Object -Skip 1)) {
        $parts = $chunk -split "\r?\n", 2
        $body = if ($parts.Count -gt 1) { $parts[1] } else { '' }
        $sections.Add([pscustomobject]@{ Heading = $parts[0].Trim(); Body = $body })
    }
    return ,$sections.ToArray()
}

function Get-DelimitedBlock {
    param([string]$Text, [string]$Name)
    $match = [regex]::Match($Text, "(?s)<$Name>(.*?)</$Name>")
    if ($match.Success) { return [string]$match.Groups[1].Value }
    return ''
}

# Sentence units for the ownership guard: paragraphs with wrapped lines joined,
# split on the full stop, so a wrapped multi-word phrase in the source still
# matches a single-space pattern.
#
# The units are returned with the pipeline (`$units.ToArray()`, unrolled by the
# caller) rather than as a single nested array. `return ,$array` wraps the array
# in one outer element, so `@(Get-SentenceUnits ... | Where-Object ...)` yields a
# single item - the whole file - and every clause in it reads as defended by any
# later delegation. The guard then passes on the exact reversal it names. That
# shape is what shipped first here and the mutation caught it.
function Get-SentenceUnits {
    param([string]$Text)
    $units = [System.Collections.Generic.List[string]]::new()
    foreach ($paragraph in ($Text -split "(?:\r?\n){2,}")) {
        $joined = ((@($paragraph -split "\r?\n") | ForEach-Object { $_.Trim() }) -join ' ').Trim()
        foreach ($sentence in ($joined -split '(?<=\.)\s+')) {
            if ($sentence.Trim().Length -gt 0) { $units.Add($sentence.Trim()) }
        }
    }
    $units.ToArray()
}

# Bullet items in a section, each one a single logical item with its wrapped
# lines joined. Used where an assertion has to read one handover's own clause
# rather than a word anywhere in the section.
function Get-BulletItems {
    param([string]$Text)
    $items = [System.Collections.Generic.List[string]]::new()
    $current = $null
    foreach ($line in ($Text -split "\r?\n")) {
        if ($line -match '^\s*[-*]\s+(?<body>.*)$') {
            if ($null -ne $current) { $items.Add($current) }
            $current = $Matches['body'].Trim()
        }
        elseif ($null -ne $current -and $line -match '^\s+\S') {
            # A wrapped continuation of the item above, not a new item.
            $current = $current + ' ' + $line.Trim()
        }
        elseif ($null -ne $current) {
            $items.Add($current)
            $current = $null
        }
    }
    if ($null -ne $current) { $items.Add($current) }
    $items.ToArray()
}

$root = Split-Path $PSScriptRoot -Parent
$skillDir = Join-Path $root 'skills\to-spec'
$skillPath = Join-Path $skillDir 'SKILL.md'
$skill = Get-FileText -Path $skillPath

# The prose is hard-wrapped, so any multi-word phrase can straddle a line break
# ("workspace-first" / "storage"). Every phrase assertion reads this one
# flattened copy, so a rewrap cannot silently stop a phrase from matching while
# the sentence is still there, and no pattern needs its own \s+ escape hatches.
$skillFlat = [regex]::Replace($skill, '\s+', ' ')

Write-Host 'The method file'
Assert-True (Test-Path -LiteralPath $skillPath -PathType Leaf) 'the method carries a SKILL.md'
Assert-True ($skill -match '(?s)\A---\r?\n.*?\r?\n---') 'the skill opens with frontmatter'
$name = [regex]::Match($skill, '(?m)^name:\s*(.+?)\s*$').Groups[1].Value.Trim('"', "'")
$description = [regex]::Match($skill, '(?ms)^description:\s*(.+?)(?=\r?\n[a-z_]+:|\r?\n---)').Groups[1].Value
Assert-True ($name -eq 'to-spec') "the frontmatter keeps the to-spec invocation name (found '$name')"
Assert-True ($description.Trim().Length -ge 100) "the frontmatter carries a description a session can select on (found $($description.Trim().Length) characters)"
Assert-True ($description -match '(?i)spec(ification)?') 'the description names the specification it produces'
Assert-True ($description -match '(?i)prd') 'the description names the PRD as a possible durable document'
# The skill used to ship an agents/ directory pinning implicit invocation off.
# Skills carry their own frontmatter now, so the pin and the directory are gone.
Assert-True ($skill -notmatch '(?m)^disable-model-invocation\s*:') 'the model-invocation pin is gone from the frontmatter'
# The agents directory is a retired artefact, not a rule: the assertion is that
# the skill does not ship a frontmatter pin hiding behind a wrapper file.
$agentsDirText = if (Test-Path -LiteralPath (Join-Path $skillDir 'agents')) {
    [string](Get-ChildItem -LiteralPath (Join-Path $skillDir 'agents') -Recurse -File | ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName })
} else { '' }
Assert-True ($agentsDirText -notmatch '(?i)disable-model-invocation|allow_implicit_invocation\s*:\s*false') 'no implicit-invocation refusal hides in a wrapper file'
Assert-True ($skillFlat -match '(?is)(?:write one only when|only when)[^.]{0,80}durable') 'a specification is written only when the requirement is durable'
$bytes = if (Test-Path -LiteralPath $skillPath -PathType Leaf) { (Get-Item -LiteralPath $skillPath).Length } else { 0 }
# Context budget, not style: the skill is loaded whenever a durable requirement
# is drafted, so the ceiling is the shared light budget and a stub holding only
# the asserted phrases fails the floor below.
Assert-True ($bytes -le 8192) "the method stays light enough to load into a cycle (found $bytes bytes)"
Assert-True ($bytes -ge 4096) "the method carries real body text, not just the asserted phrases (found $bytes bytes)"
Assert-True ($skillFlat.Length -ge 5000) "the prose is real beside its markup (found $($skillFlat.Length) flattened characters)"

# The template block carries its own '## ' headings, so the section structure is
# measured on a copy with the delimited blocks removed.
$prose = [regex]::Replace($skill, '(?s)<spec-expectations>.*?</spec-expectations>', '')
$sections = Get-SectionObjects -Text $prose
Assert-True ($sections.Count -ge 5) "the method keeps its working sections together (found $($sections.Count))"
$minSection = $(if ($sections.Count) { ($sections | ForEach-Object { $_.Body.Length } | Measure-Object -Minimum).Minimum } else { 0 })
Assert-True ($sections.Count -ge 5 -and $minSection -ge 300) "every section carries a real body rather than a heading and a stub (thinnest: $minSection characters)"

Write-Host ''
Write-Host 'Routine work is skipped'
Assert-True ($skillFlat -match '(?is)most work needs no specification at all') 'the method says most work needs no specification'
# The refusal is bound to the thing it refuses. The bare nouns "mandatory" or
# "PRD" would survive their own reversal ("there is a mandatory PRD for a small
# fix"), so the clause itself has to carry the refusal.
Assert-True ($skillFlat -notmatch '(?is)(?:there is|requires?|needs?) a mandatory PRD') 'the small-fix rule is not reversed into a mandatory PRD'
Assert-True ($skillFlat -notmatch '(?is)PRD (?:is|stays) (?:always )?required') 'the small-fix rule is not reversed into an always-required PRD'
Assert-True ($skillFlat -match '(?is)skip the specification\b') 'the routine-work row says to skip the specification'
Assert-True ($skillFlat -notmatch '(?is)(?:do not|never|avoid) skip the specification') 'the skip rule is not denied'
# Should 1. The two assertions above match the row's phrases wherever they sit,
# so a conditional that keeps every keyword - "Skip the specification when no
# template is handy" - passed. The row is a table row in one section, so the
# skip is bound to the routine case inside that row and a proviso on the skip
# is refused outright.
$skipRow = [regex]::Match($skill, '(?m)^\|\s*Routine work[^\r\n]*\r?$').Value
Assert-True ($skipRow.Length -gt 0) 'the routine-work row is a table row of its own'
Assert-True ($skipRow -match '(?is)routine work[^|]*\|[^|]*skip the specification') 'the routine-work row puts the skip in the routine case'
Assert-True ($skipRow -notmatch '(?is)skip the specification\s+(?:when|whenever|unless|if|provided|providing|though|although|except)') 'the skip is not made conditional inside its own row'
Assert-True ($skipRow -notmatch '(?is)(?:not|isn''t|is not)\s+enough') 'the small local plan is not softened into "not enough"'
# Nit 3. "is enough" alone survives "is not enough on its own, though there is
# no mandatory PRD". The phrase is asserted as a positive claim over the row.
Assert-True ($skipRow -notmatch '(?is)enough\s+on\s+its\s+own\s*,?\s*(?:though|but|however)') 'the small local plan is not qualified as insufficient on its own'
Assert-True ($skillFlat -match '(?is)(?:write one only when|only when)[^.]{0,80}durable') 'a specification is written only when the requirement is durable'

Write-Host ''
Write-Host 'No ratification or revision ceremony'
Assert-True ($skillFlat -match '(?is)there is no ratification ceremony') 'the method refuses a ratification ceremony'
Assert-True ($skillFlat -match '(?is)ratification ceremony[^.]{0,80}no revision procedure') 'the refusal covers the revision procedure as well'
# A rewritten refusal that drops the negation ("there is a ratification
# ceremony") must still fail, so the clause is asserted with its negation bound.
Assert-True ($skillFlat -notmatch '(?is)(?:there is|requires?|mandates?)\s+(?:an?\s+)?(?:formal\s+)?(?:spec\s+)?ratification ceremony(?!\s*[.,;]?\s*(?:and|or|nor|,)\s*(?:there is\s+)?no)') 'the ratification refusal is not reversed into a ceremony'
Assert-True ($skillFlat -notmatch '(?is)(?:and|or)\s+no\s+revision procedure') 'the revision refusal is not restated as an "and no ..." clause'
Assert-True ($skillFlat -notmatch '(?is)\bthe\s+user-story\s+list\s+(?:is|stays|remains)\s+(?:required|mandatory)') 'the user-story list is not reversed into a required part'
Assert-True ($skillFlat -notmatch '(?is)\b(?:an|a)\s+interview\s+(?:is|becomes|stays|remains)\s+(?:required|mandatory)') 'an interview is not contradicted into a requirement'
Assert-True ($skillFlat -notmatch '(?is)(?:write|use|produce)\s+a\s+(?:LONG|long)[^.]{0,24}user[- ]stor') 'the long user-story list is not restored as the shape'

Write-Host ''
Write-Host 'Storage is workspace-first'
Assert-True ($skillFlat -match '(?is)resolve before writing') 'the method resolves before it writes'
Assert-True ($skillFlat -match '(?is)resolved\s+`?prds`?/`?specs`?\s+route') 'the durable document goes to the resolved prds/specs route'
Assert-True ($skillFlat -match '(?is)product-Git storage is not mandatory for accepted prose') 'product-Git storage is not mandatory for accepted prose'
Assert-True ($skillFlat -match '(?is)`prds`\s+holds\b') 'the prds route is named'
Assert-True ($skillFlat -match '(?is)`specs`\s+holds\b') 'the specs route is named'
Assert-True ($skillFlat -match '(?is)(?:do not|never)\s+guess\s+a\s+path') 'the path is resolved rather than guessed'
Assert-True ($skillFlat -match '(?is)never at a guessed path') 'the route is never created at a guessed path'

$storageSection = $null
foreach ($section in $sections) {
    if ($section.Body -match '(?i)product-Git storage') { $storageSection = $section; break }
}
Assert-True ($null -ne $storageSection) 'the workspace-first rule has its own section'
$storageFlat = if ($storageSection) { [regex]::Replace([string]$storageSection.Body, '\s+', ' ') } else { '' }
$storageHeading = if ($storageSection) { [string]$storageSection.Heading } else { '' }
# Section-level contradiction guards. Each reads the whole section, so a second
# sentence that reverses the rule fails even though the rule's own sentence is
# intact. The guard vocabulary is deliberately not the assertion vocabulary:
# "git ... required" also appears inside "product-Git storage is not mandatory",
# so a word-order-only guard fires on sound prose, and "always has to" /
# "opt-out" name the reversal without reusing the protected clause.
Assert-True ($storageFlat -notmatch '(?is)git[^.]{0,40}(?:is|becomes|stays|remains)\s+required') 'storage is not contradicted into a Git requirement'
Assert-True ($storageFlat -notmatch '(?is)\balways has to\b') 'storage is not contradicted by an "always has to" clause'
Assert-True ($storageFlat -notmatch '(?is)by default,? regardless') 'storage is not contradicted by a "by default, regardless" clause'
Assert-True ($storageFlat -notmatch '(?is)(?:the|an?)\s+opt-out\b') 'storage is not contradicted by an opt-out to a Git default'
Assert-True ($storageHeading -notmatch '(?i)git-first|git required') "the section heading does not assert Git-first storage (found '$storageHeading')"
Assert-True ($storageFlat -notmatch '(?is)\bdefault\s*:?\s*git\b') 'storage is not contradicted by a Git default'

Write-Host ''
Write-Host 'The issue carries what, the document carries why'
$issueSection = $null
foreach ($section in $sections) {
    if ($section.Body -match '(?i)issue carries the high-level') { $issueSection = $section; break }
}
Assert-True ($null -ne $issueSection) 'the issue-carries-what rule has its own section'
$issueFlat = if ($issueSection) { [regex]::Replace([string]$issueSection.Body, '\s+', ' ') } else { '' }
Assert-True ($issueFlat -match '(?is)issue\s+carries\s+the\s+high-level\s+intended\s+behaviour') 'the issue carries the high-level intended behaviour'
Assert-True ($issueFlat -match '(?is)high-level\s+intended\s+behaviour[^.]{0,120}acceptance') 'the issue carries the acceptance'
Assert-True ($issueFlat -match '(?is)acceptance\s+and\s+the\s+non-goals') 'the issue carries the non-goals'
Assert-True ($issueFlat -match '(?is)link the local context for local agents rather than copying it into the issue') 'local context is linked rather than copied into the issue'
# Nit 2. The split has two halves; only the issue half was asserted, so the
# document half could be reversed into "where the intent is duplicated".
Assert-True ($issueFlat -match '(?is)the durable document carries the fuller why') 'the durable document carries the fuller why'
Assert-True ($issueFlat -notmatch '(?is)durable document[^.]{0,60}(?:duplicat|repeats?|copies)') 'the document half of the split is not reversed into duplication'
Assert-True ($issueFlat -match '(?is)check first for an existing issue') 'the method checks for an existing issue first'
Assert-True ($issueFlat -match '(?is)(?:do not|never)\s+open\s+a\s+second\s+issue') 'no duplicate issue is opened'
Assert-True ($issueFlat -match '(?is)report what you found before publishing anything') 'what was found is reported before publishing'
Assert-True ($issueFlat -match '(?is)publishing to a tracker is optional here') 'publishing to a tracker is optional'
Assert-True ($issueFlat -match '(?is)does not\s+require\s+the\s+issue[^;]{0,120}ready-for-agent[^;]{0,40}label') 'the ready-for-agent label is not required by this skill'
# Guards: the rule must not be reversed into copying context or into a mandated
# duplicate issue. "opening a second issue" is the guard's vocabulary because the
# protected clause says "open a second issue".
Assert-True ($issueFlat -notmatch '(?is)(?:copy|paste|inline)\s+(?:the\s+)?(?:whole\s+)?(?:local\s+)?context\s+into\s+the\s+issue') 'the issue is not contradicted into a copy of the local context'
Assert-True ($issueFlat -notmatch '(?is)(?:may|can|should|must)\s+(?:re)?open\s+a\s+second\s+issue') 'the no-duplicate rule is not reversed into permission to open a second issue'
Assert-True ($issueFlat -notmatch '(?is)ready-for-agent[^.]{0,40}(?:is|becomes|is always)\s+required') 'the label is not contradicted into a requirement'
Assert-True ($issueFlat -notmatch '(?is)(?:publishing|filing)\s+(?:to\s+)?(?:the\s+)?tracker\s+is\s+(?:always\s+)?required') 'tracker publication is not contradicted into a requirement'
Assert-True ($issueFlat -notmatch '(?is)\bshall\s+always\s+carry\s+the\s+`?ready-for-agent') 'the label is not contradicted by a "shall always carry" clause'

Write-Host ''
Write-Host 'A remote consumer gets only task context'
$remoteSection = $null
foreach ($section in $sections) {
    if ($section.Body -match '(?i)remote reviewer') { $remoteSection = $section; break }
}
Assert-True ($null -ne $remoteSection) 'the remote-consumer rule has its own section'
$remoteFlat = if ($remoteSection) { [regex]::Replace([string]$remoteSection.Body, '\s+', ' ') } else { '' }
Assert-True ($remoteFlat -match '(?is)only the relevant part of the task') 'the remote consumer receives only the relevant part of the task'
# Nit 1. The assertion above accepted either named input, so widening the first
# one - "any form you like, or the issue or pull request body" - still passed on
# the second. The sentence names both inputs, so both are asserted in the one
# clause and a vague substitute for the first is refused.
Assert-True ($remoteFlat -match '(?is)its own prompt[^.]{0,80}issue or pull request body') 'the context travels in the input that consumer supports'
Assert-True ($remoteFlat -notmatch '(?is)(?:any|whatever|some)\s+(?:form|shape|way|format)[^.]{0,40}(?:prompt|body)') 'the supported input is not widened into an unspecified form'
Assert-True ($remoteFlat -match '(?is)attaching the whole workspace[^.]{0,80}is not required') 'attaching the whole workspace is refused'
Assert-True ($remoteFlat -match '(?is)requiring a versioned-document platform is not required') 'a versioned-document platform is refused'
Assert-True ($remoteFlat -match '(?is)neither is standing up a separate document home') 'a separate document home for a remote reader is refused'
# Guards: a reversal would require the whole workspace or the platform, or deny
# that a remote consumer is even possible. "requir(es|ed)" is the reversal verb
# the protected clause does not use in this section.
Assert-True ($remoteFlat -notmatch '(?is)requir(?:es|ed)\s+(?:the\s+)?(?:whole|entire)\s+workspace') 'the whole workspace is not contradicted into a requirement'
Assert-True ($remoteFlat -notmatch '(?is)requir(?:es|ed)\s+a\s+versioned-document platform') 'the versioned platform is not contradicted into a requirement'
Assert-True ($remoteFlat -notmatch '(?is)attaching\s+(?:the\s+)?(?:whole|entire)\s+workspace\s+is\s+(?:required|necessary)') 'attaching the whole workspace is not contradicted into necessary'

Write-Host ''
Write-Host 'Hand off, do not absorb'
$handoffSection = $null
foreach ($section in $sections) {
    if ($section.Body -match '(?i)multi-slice breakdown') { $handoffSection = $section; break }
}
Assert-True ($null -ne $handoffSection) 'the delegation rule has its own section'
$handoffFlat = if ($handoffSection) { [regex]::Replace([string]$handoffSection.Body, '\s+', ' ') } else { '' }
Assert-True ($handoffFlat -match '(?is)multi-slice breakdown goes to\s+\[to-tickets\]') 'the multi-slice breakdown is delegated to to-tickets'
Assert-True ($handoffFlat -match '(?is)how-to-build plan goes to\s+\[planner\]') 'the how-to-build plan is delegated to planner'
Assert-True ($handoffFlat -match '(?is)keep this skill to the durable requirement') 'the skill keeps to the durable requirement'
# Should 2. The delegation assertions above stop at the link, so a bullet could
# be hollowed out after it - "goes to [to-tickets], whatever the tracker needs"
# - while still passing. The handovers are list items, so what each one hands
# over is asserted as that item's own clause rather than as a word anywhere in
# the section.
$ticketsItem = @(Get-BulletItems -Text $handoffSection.Body | Where-Object { $_ -match '(?i)\[to-tickets\]' })
Assert-True ($ticketsItem.Count -eq 1) "the to-tickets handover is one list item (found $($ticketsItem.Count))"
$ticketsClause = if ($ticketsItem.Count) { [regex]::Replace([string]$ticketsItem[0], '\s+', ' ') } else { '' }
Assert-True ($ticketsClause -match '(?is)\bthe ticket set\b') 'the to-tickets bullet hands over the ticket set'
Assert-True ($ticketsClause -match '(?is)\bthe blocked-by edges\b') 'the to-tickets bullet hands over the blocked-by edges'
Assert-True ($ticketsClause -notmatch '(?is)whatever the tracker needs') 'the to-tickets handover is not hollowed out into "whatever the tracker needs"'
$planItem = @(Get-BulletItems -Text $handoffSection.Body | Where-Object { $_ -match '(?i)\[planner\]' })
Assert-True ($planItem.Count -eq 1) "the planner handover is one list item (found $($planItem.Count))"
$planClause = if ($planItem.Count) { [regex]::Replace([string]$planItem[0], '\s+', ' ') } else { '' }
Assert-True ($planClause -match '(?is)\bthe how-to-build plan\b') 'the planner bullet hands over the how-to-build plan'
Assert-True ($planClause -notmatch '(?is)whatever (?:the )?planner needs') 'the planner handover is not hollowed out'
# Guards: absorbing either half back into this skill is the reversal. The
# vocabulary is the reversal's, not the protected clause's: "which owns the
# ticket set" is exactly how the clause delegates it, so a guard written on
# "owns the ticket set" fires on sound prose.
Assert-True ($handoffFlat -notmatch '(?is)\bticket set\s+(?:is|stays|remains)\s+(?:also\s+)?(?:owned|written|produced) here') 'the skill does not absorb the ticket set'
Assert-True ($handoffFlat -notmatch '(?is)(?:also\s+)?(?:writes?|owns?|drafts?)\s+the\s+how-to-build plan') 'the skill does not absorb the how-to-build plan'
Assert-True ($handoffFlat -notmatch '(?is)(?:also\s+)?(?:writes?|owns?|drafts?)\s+(?:the\s+)?multi-slice breakdown') 'the skill does not absorb the multi-slice breakdown'
Assert-True ($handoffFlat -notmatch '(?is)ticket set (?:is|stays|remains) (?:also )?(?:written|owned) here') 'the ticket set is not kept here'
# The four guards above all read a sentence that keeps the words "ticket set"
# or "how-to-build plan" next to a delegating or passive form - "does not absorb
# the ticket set", "the ticket set is not kept here". A blunter reversal drops
# the qualifier and claims the work outright - "It owns the ticket set" - and
# every one of them reads past it.
#
# The claim has to be read as a clause rather than as a phrase: the method
# legitimately says it does NOT own the ticket set and that to-tickets DOES, so
# a guard written on the verb and the noun alone fires on sound prose. This one
# takes each clause that claims a unit of work and refuses it unless the clause
# is a refusal or names the sibling that owns it.
$workClaimPatterns = @(
    '(?i)\b(?:owns?|writes?|drafts?|produces?|keeps?|maintains?)\b[^.]{0,30}\b(?:the\s+)?(?:ticket set|blocked-by edges|how-to-build plan|multi-slice breakdown)\b'
)
# This guard needs the paragraph breaks, so it reads a copy that joins wrapped
# lines inside a paragraph but keeps the blank line between them. The whole-file
# $skillFlat copy collapses those, which merges every sentence in the file into
# one unit and makes a bare claim look defended by a later delegation.
$skillParagraphs = ((@($skill -split "\r?\n") | ForEach-Object { $_.Trim() }) -join "`n")
$workClauses = @(Get-SentenceUnits -Text $skillParagraphs | Where-Object {
        $clause = $_
        $claims = $false
        foreach ($pattern in $workClaimPatterns) { if ($clause -match $pattern) { $claims = $true; break } }
        $claims
    })
# A clause is defended when it refuses the claim (a negation governing the verb)
# or when it names the sibling that owns the work. A bare "not" anywhere in the
# clause is too weak - "It owns the ticket set, which is not a problem" would
# read as defended - so the refusal has to sit on the verb itself.
$workClaimRefusal = '(?i)\b(?:does not|do not|doesn''t|don''t|never|no longer)\s+(?:own|write|draft|produce|keep|maintain|absorb)\w*|\b(?:not|never)\s+(?:owned|written|drafted|produced|kept|maintained|absorbed)\b'
$workClaimDefended = @($workClauses | Where-Object {
        $_ -match $workClaimRefusal -or $_ -match '(?i)\b(?:to-tickets|planner)\b'
    })
$workClaimBare = @($workClauses | Where-Object { $workClaimDefended -notcontains $_ })
Assert-True ($workClaimBare.Count -eq 0) "every claim on the ticket set or the plan is a refusal or names the sibling that owns it (found $($workClaimBare.Count) bare claim(s))"
if ($workClaimBare.Count -gt 0) {
    foreach ($bare in $workClaimBare) { Write-Host ("       bare claim: " + $bare) }
}
Assert-True ($handoffFlat -notmatch '(?is)plan (?:is|stays|remains) (?:also )?(?:written|owned) here') 'the plan is not kept here'
Assert-True ($handoffFlat -match '(?is)\[to-tickets\]\(\.\./to-tickets/SKILL\.md\)') 'to-tickets is linked'
Assert-True ($handoffFlat -match '(?is)\[planner\]\(\.\./planner/SKILL\.md\)') 'planner is linked'

Write-Host ''
Write-Host 'The spec shape'
$expectations = Get-DelimitedBlock -Text $skill -Name 'spec-expectations'
Assert-True ($expectations.Length -ge 300) "the spec shape is carried (found $($expectations.Length) characters)"
Assert-True ($expectations -match '(?i)\*\*Problem:\*\*') 'the shape carries the problem'
Assert-True ($expectations -match '(?i)\*\*Intended behaviour:\*\*') 'the shape carries the intended behaviour'
Assert-True ($expectations -match '(?i)\*\*Acceptance:\*\*') 'the shape carries the acceptance'
Assert-True ($expectations -match '(?i)\*\*Non-goals:\*\*') 'the shape carries the non-goals'
Assert-True ($expectations -match '(?i)\*\*Local links:\*\*') 'the shape carries the local links'
$skillExpectationsFlat = [regex]::Replace($skill, '\s+', ' ')
Assert-True ($skillExpectationsFlat -match '(?is)(?:concise synthesis|Do not restate everything known)') 'the shape is a synthesis rather than a transcript'
Assert-True ($skillExpectationsFlat -notmatch '(?is)(?:^|\s)(?:##|###|\*\*)Testing Decisions') 'the shape drops the testing-decisions section'
Assert-True ($skillExpectationsFlat -notmatch '(?is)(?:^|\s)(?:##|###|\*\*)Implementation Decisions') 'the shape drops the implementation-decisions section'

Write-Host ''
Write-Host 'The templates are the shared ones'
$templates = @(
    @{ File = 'harness-docs-starter\templates\prd.md'; Need = @('Problem', 'Value', 'Scope', 'Behaviour') }
    @{ File = 'harness-docs-starter\templates\spec.md'; Need = @('Purpose', 'Contract', 'Constraints') }
)
foreach ($template in $templates) {
    $templatePath = Join-Path $root $template.File
    Assert-True (Test-Path -LiteralPath $templatePath -PathType Leaf) "the shared template $($template.File) still exists"
    $text = Get-FileText -Path $templatePath
    $missing = @($template.Need | Where-Object { $text -notmatch ('(?m)^##\s+' + [regex]::Escape($_) + '\s*$') })
    Assert-True ($missing.Count -eq 0) "the shared template $($template.File) still carries its sections (missing: $($missing -join ', '))"
}
# Recipe paths are supplied by the workspace; the source shapes above are
# checked independently of installed-skill links.
Assert-True ($skillFlat -notmatch '(?is)(?:create|add|introduce|write)\s+(?:a|an|its own|another)\s+(?:second|new|additional)?\s*(?:PRD|spec)\s+template') 'the method does not ask for a second PRD or spec template'

Write-Host ''
Write-Host 'Links resolve'
$skillsRoot = [IO.Path]::GetFullPath((Join-Path $root 'skills')).TrimEnd('\') + '\'
$linkCount = 0
foreach ($match in [regex]::Matches($skill, '\]\(([^)\s]+)\)')) {
    $target = $match.Groups[1].Value
    if ($target -match '^(?i)(https?:|mailto:|#)') { continue }
    $target = ($target -split '#')[0]
    if ([string]::IsNullOrWhiteSpace($target)) { continue }
    $linkCount++
    $resolvedFull = [IO.Path]::GetFullPath((Join-Path $skillDir ($target -replace '/', '\')))
    Assert-True ($resolvedFull.StartsWith($skillsRoot, [StringComparison]::OrdinalIgnoreCase)) "link '$target' stays inside the shared skills tree"
    Assert-True (Test-Path -LiteralPath $resolvedFull -PathType Leaf) "link '$target' resolves to a real file"
}
Assert-True ($linkCount -ge 6) "the method links its route, planner, ticket and template owners (found $linkCount link(s))"

Write-Host ''
Write-Host 'Portability'
$hostPath = '(?i)(\b[A-Z]:[\\/]|\\\\[A-Za-z0-9._-]+\\|file:///|(^|[\s(])/(home|Users|mnt|opt|srv)/)'
$packageInvocation = '(?i)\b(npm|pnpm|yarn|npx|uv|pip|poetry)\s+(run|exec|test|install|sync|add|build)\b'
Assert-True ($skill -notmatch $hostPath) 'SKILL.md embeds no host path or drive letter'
Assert-True ($skill -notmatch $packageInvocation) 'SKILL.md embeds no package-manager invocation'
Assert-True ($skill -notmatch '(?m)^\s*model(_provider)?\s*[=:]') 'SKILL.md pins no model or provider'

Write-Host ''
Write-Host 'The run-all wiring'
$selfPath = Join-Path $PSScriptRoot 'to-spec.ps1'
$runAll = Get-FileText -Path (Join-Path $root 'checks\run-all.ps1')
Assert-True ($runAll -match "(?im)^\s*@\{\s*Name\s*=\s*'to-spec'\s*;\s*File\s*=\s*'to-spec\.ps1'") 'run-all declares this check against its own file'
Assert-True ($runAll -match [regex]::Escape("'To-spec check passed'")) "run-all watches for this check's own signature"
$expectedBlock = [regex]::Match($runAll, '(?s)\$expectedChecks\s*=\s*@\((?<body>.*?)\r?\n\)').Groups['body'].Value
Assert-True ($expectedBlock -match "'to-spec'") 'the expected-check list carries this check'

# The floor. A copy gutted to its verdict line would otherwise report a pass on
# no evidence. Kept equal to the count this file reports today.
$floor = 140
$reported = $checks
if ($reported -lt $floor) {
    $script:failures.Add("the check reported $reported assertion(s); its floor is $floor")
    Write-Host ("  FAIL the check reported $reported assertion(s); its floor is $floor - a gutted copy is not evidence")
}

Write-Host ''
if ($failures.Count -eq 0) { Write-Host ("To-spec check passed: $checks structural assertion(s). Prose meaning is verified by review, not here.") }
else {
    Write-Host ("To-spec check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
