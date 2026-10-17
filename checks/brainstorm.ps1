#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the shared brainstorm and discovery method (SF-016).

.DESCRIPTION
    Reads skills/brainstorm/SKILL.md and its two references and checks what a
    machine can decide: the frontmatter, the light budget, the adaptive-depth
    rule, the evidence-before-questions list, the one-question-at-a-time clause
    with a recommended answer and its reasoning, the Resolved / Open / Blocked
    working structure, the four-part brief in order, the conditional decision
    record with no mandatory follow-on sequence, the rule that agreement is never
    simulated and the output is never labelled accepted, the three older
    invocation names routed here, the working examples for a small idea and for a
    question with no software in it, every link resolving inside the skills tree,
    and the portability rules (no host path, drive letter, product name, model pin
    or package-manager invocation) over the method, its references and this file.

    The human-decision rule and the no-mandatory-sequence refusal are asserted
    wherever the method carries them, not only in SKILL.md: brief.md is the file a
    session copies when producing the brief, so a scan reads both files for a
    sentence that permits the accepted label or promotes an unobjected option into
    a decision, and for a sentence that imposes a plan or a sequence. Polarity is
    bound in each clause - a refusal sentence cannot match the permission pattern,
    and the permission pattern cannot match a refusal - so the rule and its
    negation cannot both match the same sentence. The worked examples are asserted
    by content as well: each example section carries a minimum body, the
    non-software example names the subject it works, and each filled example shows
    all four brief parts. A heading alone is not a worked example.

    Deliberately NOT checked here: whether the prose means the right thing. A
    regex cannot tell "record only what the person decided" from its opposite, and
    no assertion below reads the meaning of a sentence. This is structure, not
    semantics. Method content is verified by independent review, and the verdict
    line says so. Each assertion below has a recorded mutation that makes it fail;
    the mutation runner and its results live in the maintenance scratch area
    outside this repository.

    One known overlap, recorded rather than hidden: the description-length
    assertion and the interview-phrase assertion both read the same sentence of
    the frontmatter description, so a mutation that deletes the interview clause
    also moves the length and the length assertion fires first. A stripped
    description is still caught, just not by the assertion that names it. The
    mutation runner records the same overlap as an expected gap.

    The run-all.ps1 wiring is asserted in one direction here: that this check is
    declared against its own file, watched for its own signature and present in
    the expected-check list. This file runs a model for nothing, writes nothing
    and installs nothing.
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

function Get-FileText {
    param([string]$Path)
    # A missing file returns '' rather than throwing, and a zero-byte file
    # returns '' rather than $null: a null operand makes the -match family emit
    # an empty array and abort the run before its verdict line.
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
    return [string](Get-Content -Raw -LiteralPath $Path)
}

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
    # Emitted as an array: a function returning an empty List is enumerated to
    # nothing, so an empty table would arrive as $null and crash the caller under
    # StrictMode instead of failing an assertion.
    return ,$rows.ToArray()
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

function Get-FirstParagraph {
    param([string]$Text, [string]$Pattern)
    foreach ($paragraph in ($Text -split "(?:\r?\n){2,}")) {
        if ($paragraph -match $Pattern) { return $paragraph }
    }
    return ''
}

function Get-FirstSentence {
    param([string]$Text, [string]$Pattern)
    foreach ($sentence in [regex]::Split($Text, '(?<=\.)\s+')) {
        if ($sentence -match $Pattern) { return $sentence }
    }
    return ''
}

function Find-Section {
    param($Sections, [string]$HeadingPattern, [string]$BodyPattern)
    foreach ($section in $Sections) {
        if ($HeadingPattern -and $section.Heading -match $HeadingPattern) { return $section }
        if ($BodyPattern -and $section.Body -match $BodyPattern) { return $section }
    }
    return $null
}

$root = Split-Path $PSScriptRoot -Parent
$skillDir = Join-Path $root 'skills\brainstorm'
$skillPath = Join-Path $skillDir 'SKILL.md'
$selfPath = Join-Path $PSScriptRoot 'brainstorm.ps1'
$skill = Get-FileText -Path $skillPath
$router = Get-FileText -Path (Join-Path $root 'AGENTS.md')
$runAll = Get-FileText -Path (Join-Path $root 'checks\run-all.ps1')
$referenceNames = @('references\interview.md', 'references\brief.md')
$noteReference = Get-FileText -Path (Join-Path $skillDir 'references\interview.md')
$briefReference = Get-FileText -Path (Join-Path $skillDir 'references\brief.md')
$briefReferencePath = Join-Path $skillDir 'references\brief.md'

Write-Host 'The method file'
Assert-True (Test-Path -LiteralPath $skillPath) 'the method carries a SKILL.md'
Assert-True ($skill -match '(?s)\A---\r?\n.*?\r?\n---') 'the skill opens with frontmatter'
$name = [regex]::Match($skill, '(?m)^name:\s*(.+?)\s*$').Groups[1].Value.Trim('"', "'")
$description = [regex]::Match($skill, '(?ms)^description:\s*(.+?)(?=\r?\n[a-z_]+:|\r?\n---)').Groups[1].Value
Assert-True ($name -eq 'brainstorm') "the frontmatter names the skill (found '$name')"
Assert-True ($description.Trim().Length -ge 80) "the frontmatter carries a description a session can select on (found $($description.Trim().Length) characters)"
Assert-True ($description -match '(?i)question') 'the description names the one-question interview'
Assert-True ($description -match '(?i)brief') 'the description names the closing brief'
$bytes = if (Test-Path -LiteralPath $skillPath -PathType Leaf) { (Get-Item -LiteralPath $skillPath).Length } else { 0 }
Assert-True ($bytes -le 8192) "the method stays light (found $bytes bytes)"
# A stub holding only the asserted phrases would otherwise satisfy the rest, so
# the section count and a per-section body floor are asserted too.
Assert-True ($bytes -ge 2048) "the method carries real body text, not just the asserted phrases (found $bytes bytes)"

$sections = Get-SectionObjects -Text $skill
Assert-True ($sections.Count -ge 6) "the method keeps its working sections together (found $($sections.Count))"
$minSection = $(if ($sections.Count) { ($sections | ForEach-Object { $_.Body.Length } | Measure-Object -Minimum).Minimum } else { 0 })
Assert-True ($sections.Count -ge 6 -and $minSection -ge 180) "every section carries a real body rather than a heading and a stub (thinnest: $minSection characters)"

Write-Host ''
Write-Host 'Depth follows the question'
$depthSection = Find-Section -Sections $sections -HeadingPattern '(?i)depth'
Assert-True ($null -ne $depthSection) 'the method carries an adaptive-depth section'
$depthBody = if ($depthSection) { [string]$depthSection.Body } else { '' }
Assert-True ($depthBody -match '(?i)short\b') 'a small question is answered short'
Assert-True ($depthBody -match '(?i)(whole|full) method') 'a complicated question gets the whole method'
Assert-True ($depthBody -match '(?i)one (branch|question) at a time') 'the larger depth is worked one branch at a time'

Write-Host ''
Write-Host 'Evidence before questions'
$evidenceSection = Find-Section -Sections $sections -BodyPattern '(?i)AGENTS\.md'
Assert-True ($null -ne $evidenceSection) 'a section sends the reader to the project evidence first'
$evidenceBody = if ($evidenceSection) { [string]$evidenceSection.Body } else { '' }
Assert-True ($evidenceBody -match '(?i)GLOSSARY\.md') 'the evidence list names the project glossary'
Assert-True ($evidenceBody -match '(?i)\bADRs?\b|decision record') 'the evidence list names decision records'
Assert-True ($evidenceBody -match '(?i)\bcode\b') 'the evidence list names the code the question touches'
Assert-True ($evidenceBody -match '(?i)tracker') 'the evidence list names the tracker or issue state'
# Read as the sentence that carries the limit, so deleting the limit fails and a
# reworded sentence that keeps it still passes.
$askSentence = Get-FirstSentence -Text $evidenceBody -Pattern '(?i)\bcannot\b|\bcan not\b'
Assert-True ($askSentence -match '(?i)\bonly\b') 'the evidence rule asks only for what evidence cannot settle'
Assert-True ($evidenceBody -match '(?i)contradict') 'the evidence rule surfaces a contradiction rather than following one side quietly'

Write-Host ''
Write-Host 'One question at a time'
$interviewSection = Find-Section -Sections $sections -HeadingPattern '(?i)one question'
Assert-True ($null -ne $interviewSection) 'the method carries the one-question-at-a-time section'
$interviewBody = if ($interviewSection) { [string]$interviewSection.Body } else { '' }
Assert-True ($interviewBody -match '(?i)exactly one question') 'each turn asks exactly one question'
Assert-True ($interviewBody -match '(?i)highest[- ]risk') 'the highest-risk unresolved branch is worked first'
Assert-True ($interviewBody -match '(?i)recommend') 'each question carries a recommended answer'
Assert-True ($interviewBody -match '(?i)\bwhy\b') 'the recommendation carries its reasoning'
Assert-True ($interviewBody -match '(?i)vague') 'a vague answer is pushed once'
Assert-True ($interviewBody -match '(?i)stop when') 'the interview stops once the important branches are resolved'

Write-Host ''
Write-Host 'The running structure'
# Located by the one word that appears in no other section, so a rename of the
# heading is not a false failure and the other sections cannot be mistaken for
# this one by the word "resolved" appearing in ordinary prose.
$trackingSection = Find-Section -Sections $sections -BodyPattern '(?i)\bBlocked\b'
Assert-True ($null -ne $trackingSection) 'the method keeps a running structure'
$trackingBody = if ($trackingSection) { [string]$trackingSection.Body } else { '' }
Assert-True ($trackingBody -match '(?i)\bResolved\b') 'the structure carries what is resolved'
Assert-True ($trackingBody -match '(?i)\bOpen\b') 'the structure carries what is open'
Assert-True ($trackingBody -match '(?i)\bBlocked\b') 'the structure carries what is blocked'
Assert-True ($trackingBody -match '(?i)conversation') 'the structure stays in the conversation rather than a maintained file'

Write-Host ''
Write-Host 'The brief it closes with'
$briefSection = Find-Section -Sections $sections -BodyPattern '(?i)\bOutcome\b'
Assert-True ($null -ne $briefSection) 'one section carries the closing brief'
$expectedParts = @('Outcome', 'Decisions', 'Unresolved questions', 'Non-goals')
# The header row is not a part. Selecting by label in file order means a deleted
# row shrinks the count and a renamed row changes both the count and the label.
$briefRows = [System.Collections.Generic.List[object]]::new()
if ($briefSection) {
    foreach ($row in (Get-MarkdownTableRows -Text $briefSection.Body)) {
        if ($expectedParts -contains [string]$row[0]) { $briefRows.Add($row) }
    }
}
Assert-True ($briefRows.Count -eq 4) "the brief carries exactly four parts (found $($briefRows.Count))"
for ($i = 0; $i -lt $expectedParts.Count; $i++) {
    $actual = if ($briefRows.Count -gt $i) { [string]$briefRows[$i][0] } else { '<missing>' }
    Assert-True ($actual -eq $expectedParts[$i]) "part $($i + 1) of the brief is '$($expectedParts[$i])' (found '$actual')"
}
# The row name alone is not the brief: a row whose heading survives while its
# cell is emptied would otherwise pass. The cell text is what a reader follows,
# so each one has to carry a real description.
foreach ($row in $briefRows) {
    $cell = if (@($row).Count -gt 1) { [string]$row[1] } else { '' }
    Assert-True ($cell.Length -ge 25) "the '$($row[0])' part carries a real description, not an empty cell (found $($cell.Length) characters)"
}

Write-Host ''
Write-Host 'A decision record only when it is durable'
$adrSection = Find-Section -Sections $sections -BodyPattern '(?i)\bADR\b'
Assert-True ($null -ne $adrSection) 'a section carries the decision-record route'
$adrBody = if ($adrSection) { [string]$adrSection.Body } else { '' }
Assert-True ($adrBody -match '(?i)only when') 'the record is offered only when the decision is durable'
Assert-True ($adrBody -match '(?i)docs-workspace') 'the route resolves through the documents skill rather than a fixed path'
Assert-True ($adrBody -match '(?i)\]\(\.\./docs-workspace/SKILL\.md\)') 'the route links the portable document routing skill'
$adrSentence = Get-FirstSentence -Text $adrBody -Pattern '(?i)\bNo ADR\b'
Assert-True ($adrSentence -match '(?i)\brequired\b') 'the section says no decision record, plan or sequence is required'
Assert-True ($adrSentence -match '(?i)follow[- ]on') 'the section refuses to impose a follow-on sequence'
# The refusal is asserted in the reference too, because brief.md is the file a
# session copies. Polarity is bound in the clause: the sentence has to carry the
# refusal word next to the artifact, and the permission pattern is checked
# separately, so the rule and its negation cannot both match the same sentence.
$briefSequenceSentence = Get-FirstSentence -Text $briefReference -Pattern '(?i)not\s+a\s+plan'
Assert-True ($briefSequenceSentence -match '(?i)(not|does\s+not|doesn''t|no)\b[^.\r\n]{0,40}\brequire') 'the brief reference says the brief does not require a plan'
$mandatorySequence = '(?i)\b(always|must|shall|required|require|mandatory|next\s+step)\b[^.\r\n]{0,60}\b(plan|ADR|sequence)\b'
$sequenceSentences = [System.Collections.Generic.List[string]]::new()
foreach ($sentence in ([regex]::Split($skill, '(?<=\.)\s+') + [regex]::Split($briefReference, '(?<=\.)\s+'))) { $sequenceSentences.Add($sentence) }
$imposed = [System.Collections.Generic.List[string]]::new()
foreach ($sentence in $sequenceSentences) {
    if ($sentence -notmatch $mandatorySequence) { continue }
    # The refusal itself names the artifacts; only a sentence that imposes them
    # without a refusing word is a permission.
    if ($sentence -match '(?i)\bno\b[^.\r\n]{0,40}\b(required|mandatory)\b') { continue }
    if ($sentence -match '(?i)\bnot\s+required\b') { continue }
    $imposed.Add($sentence)
}
Assert-True ($imposed.Count -eq 0) "neither the method nor its brief reference imposes a follow-on sequence (found: $(@($imposed | ForEach-Object { $_.Trim() }) -join ' / '))"

Write-Host ''
Write-Host 'Human decisions stay human'
$humanSection = Find-Section -Sections $sections -BodyPattern '(?i)simulate'
Assert-True ($null -ne $humanSection) 'a section carries the human-decision rule'
$humanBody = if ($humanSection) { [string]$humanSection.Body } else { '' }
Assert-True ($humanBody -match '(?i)(never|do not|does not)\s+simulate') 'the rule refuses to simulate agreement'
Assert-True ($humanBody -match '(?i)records? what the person decided') 'the rule records only what the person decided'
Assert-True ($humanBody -match '(?i)Unresolved questions') 'everything the person has not decided stays unresolved'
Assert-True ($humanBody -match '(?i)never\s+labelled\s+accepted') 'the output is never labelled accepted'

# The rule is asserted wherever the method carries it, not only in SKILL.md. The
# file a session copies when producing the brief is where the answer actually
# lives, so a copy that drifts there would otherwise leave every assertion above
# passing. The polarity is bound in the clause: the sentence that carries the
# rule must also carry its refusal, and no sentence anywhere in the family may
# permit the thing the rule forbids.
Write-Host ''
Write-Host 'The human-decision rule wherever it is carried'
# Read as one line of the refusal list, not as a whole sentence: the list is
# where the rule lives, and the two halves sit on the same line there.
$approvalLine = [regex]::Match($briefReference, '(?im)^\s*-\s+[^\r\n]*\bnot\s+an\s+approval\b[^\r\n]*$').Value
$refuseAccepted = '(?i)never\s+(label|labelled|labeled)\s+(it\s+)?accepted'
Assert-True ($approvalLine -match $refuseAccepted) 'the brief reference refuses the accepted label in the line that calls it not an approval'
Assert-True ($briefReference -match '(?i)records? only what the person decided') 'the brief reference records only what the person decided'
# Sentences, not the whole file: a sentence is the unit a reader follows, and a
# permission written anywhere in the reference is still a permission.
#
# A refusal has to GOVERN its sentence. Reading a refusal word and a permission
# word separately is not enough: "Never label it accepted or approved, once the
# person is happy with it" carries both, so a rule that discarded any sentence
# holding a refusal word would wave it through. A sentence therefore counts as a
# refusal only while nothing authorises the label after the refusal phrase. The
# permission marker is the conditional or authorising word that would qualify
# the refusal, and it is read only in the tail that follows the label phrase,
# which is where such a qualification attaches.
# The windows allow a line break: the reference wraps "labelled" and "accepted"
# across a newline, and a pattern that forbade one would have missed the rule it
# is meant to read.
$acceptedLabel = '(?i)\b(label|mark|call|record|treat|labels|marks|calls|records|treats|labelled|labeled|accepted)\b[^.]{0,40}?\baccepted\b'
$acceptedRefusal = '(?i)\b(never|not|no|does\s?n''t|do\s+not|must\s+not|isn''t|without)\b[^.]{0,50}?\baccepted\b'
$permissionMarker = '(?i)\b(once|when|after|if|unless|provided|as\s+soon\s+as|either|instead|may|can|should|is\s+allowed|is\s+fine|is\s+acceptable)\b'
$decidedByAbsence = '(?i)\bno\s?bodies\b|\b(nobody|no\s?one|none)\s+(objected|dissents?|disagrees?)\b|\buncontested\b|\bunobjected\b' + '|' + '(?i)\b(is|becomes?|counts?\s+as|recorded\s+as)\s+the\s+decision\b'
foreach ($entry in @{ $skillPath = 'SKILL.md'; $briefReferencePath = 'brief.md' }.GetEnumerator()) {
    $sentences = [System.Collections.Generic.List[string]]::new()
    foreach ($sentence in [regex]::Split((Get-FileText -Path $entry.Key), '(?<=\.)\s+')) {
        if ($sentence.Trim().Length -gt 0) { $sentences.Add($sentence) }
    }
    $permissions = [System.Collections.Generic.List[string]]::new()
    $absences = [System.Collections.Generic.List[string]]::new()
    foreach ($sentence in $sentences) {
        if ($sentence -match $acceptedLabel) {
            # The refusal holds only while it is not qualified by a permission
            # marker after the label phrase. Either way the sentence fires once.
            $tail = $sentence.Substring([regex]::Match($sentence, $acceptedLabel).Index)
            $refusalGoverns = ($sentence -match $acceptedRefusal) -and ($tail -notmatch $permissionMarker)
            if (-not $refusalGoverns) { $permissions.Add($sentence) }
        }
        if ($sentence -match $decidedByAbsence) { $absences.Add($sentence) }
    }
    Assert-True ($permissions.Count -eq 0) "$($entry.Value) never asks for the output to be labelled accepted (found: $(@($permissions | ForEach-Object { $_.Trim() }) -join ' / '))"
    Assert-True ($absences.Count -eq 0) "$($entry.Value) never promotes an unobjected option into a decision (found: $(@($absences | ForEach-Object { $_.Trim() }) -join ' / '))"
}

Write-Host ''
Write-Host 'The older names route here'
$routingSection = Find-Section -Sections $sections -BodyPattern '(?i)p-brainstorm'
Assert-True ($null -ne $routingSection) 'a section routes the older invocation names here'
$routingBody = if ($routingSection) { [string]$routingSection.Body } else { '' }
foreach ($oldName in @('p-brainstorm', 'grill-me', 'grill-with-docs')) {
    Assert-True ($routingBody -match [regex]::Escape($oldName)) "the older name '$oldName' is routed to this method"
}
Assert-True ($routingBody -match '(?i)\b(lands?|routes?)\b') 'the section says the older names land here rather than elsewhere'

Write-Host ''
Write-Host 'Questions with no software in them'
$noCodeParagraph = Get-FirstParagraph -Text $skill -Pattern '(?i)no code in it|no software in it'
Assert-True ($noCodeParagraph.Length -gt 0) 'the method says it covers a question with no software in it'
Assert-True ($noCodeParagraph -match '(?i)\bevent\b') 'the non-software coverage carries a concrete example'
# A heading is not a worked example. Each example section has to carry a real
# body, and the non-software part has to name what it is an example of - the
# subject it works, not only the label on its heading.
$noteSections = Get-SectionObjects -Text $noteReference
$briefSections = Get-SectionObjects -Text $briefReference
$nonSoftwareSection = Find-Section -Sections $noteSections -HeadingPattern '(?i)non-software'
Assert-True ($null -ne $nonSoftwareSection) 'the interview reference carries a non-software example section'
$nonSoftwareBody = if ($nonSoftwareSection) { [string]$nonSoftwareSection.Body } else { '' }
Assert-True ($nonSoftwareBody.Trim().Length -ge 250) "the non-software example carries a worked body rather than a paraphrase (found $($nonSoftwareBody.Trim().Length) characters)"
Assert-True ($nonSoftwareBody -match '(?i)\b(event|venue|studio|supplier|guest|budget|contract)\b') 'the non-software example names the subject it works through'
$softwareSection = Find-Section -Sections $briefSections -HeadingPattern '(?i)software idea'
Assert-True ($null -ne $softwareSection) 'the brief reference carries a small-software example section'
$softwareBody = if ($softwareSection) { [string]$softwareSection.Body } else { '' }
Assert-True ($softwareBody.Trim().Length -ge 200) "the small-software example carries a worked body rather than a paraphrase (found $($softwareBody.Trim().Length) characters)"
$noCodeSection = Find-Section -Sections $briefSections -HeadingPattern '(?i)no code in it'
Assert-True ($null -ne $noCodeSection) 'the brief reference carries a non-software example section'
$noCodeBody = if ($noCodeSection) { [string]$noCodeSection.Body } else { '' }
Assert-True ($noCodeBody.Trim().Length -ge 200) "the brief reference's non-software example carries a worked body rather than a paraphrase (found $($noCodeBody.Trim().Length) characters)"
Assert-True ($noCodeBody -match '(?i)\b(dinner|event|venue|studio|guest|budget|invitation)\b') 'the brief reference''s non-software example names the subject it works through'
# A worked example is a filled answer, not a shape: each one still shows the four
# parts it is an example of.
# The fence is built from its character code so this file carries no markdown
# fence of its own.
$fence = [string]([char]96) * 3
foreach ($example in @(@{ Name = 'small software idea'; Body = $softwareBody }, @{ Name = 'brief non-software example'; Body = $noCodeBody })) {
    $coded = @(($example.Body -split ([regex]::Escape($fence))) | Where-Object { $_ -match 'Outcome:' })
    $filled = @($coded | Where-Object { $_ -match '(?im)^\s*Non-goals:' -and $_ -match '(?im)^\s*Decisions:' })
    Assert-True ($filled.Count -ge 1) "the $($example.Name) fills in all four brief parts rather than showing the shape"
}

Write-Host ''
Write-Host 'The references stay small'
foreach ($relative in $referenceNames) {
    $referencePath = Join-Path $skillDir $relative
    Assert-True (Test-Path -LiteralPath $referencePath -PathType Leaf) "the method ships $relative"
    Assert-True ($skill -match [regex]::Escape($relative.Replace('\', '/'))) "SKILL.md links $relative"
    Assert-True ((Get-FileText -Path $referencePath).Length -ge 400) "$relative carries real content rather than a stub"
}
$materialBytes = (Get-ChildItem -LiteralPath $skillDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
Assert-True ($materialBytes -le 16384) "the whole skill family stays small (found $materialBytes bytes)"

Write-Host ''
Write-Host 'Links resolve'
$skillsRoot = [IO.Path]::GetFullPath((Join-Path $root 'skills')).TrimEnd('\') + '\'
$linkCount = 0
foreach ($file in (Get-ChildItem -LiteralPath $skillDir -Recurse -File | Where-Object { $_.Extension -eq '.md' })) {
    $text = Get-FileText -Path $file.FullName
    foreach ($match in [regex]::Matches($text, '\]\(([^)\s]+)\)')) {
        $target = $match.Groups[1].Value
        if ($target -match '^(?i)(https?:|mailto:|#)') { continue }
        $target = ($target -split '#')[0]
        if ([string]::IsNullOrWhiteSpace($target)) { continue }
        $linkCount++
        $resolvedFull = [IO.Path]::GetFullPath((Join-Path (Split-Path $file.FullName -Parent) ($target -replace '/', '\')))
        Assert-True ($resolvedFull.StartsWith($skillsRoot, [StringComparison]::OrdinalIgnoreCase)) "link '$target' stays inside the shared skills tree"
        Assert-True (Test-Path -LiteralPath $resolvedFull -PathType Leaf) "link '$target' resolves to a real file"
    }
}
Assert-True ($linkCount -ge 3) "the method links its decision route and both references (found $linkCount link(s))"

Write-Host ''
Write-Host 'Portability'
# Assembled from pieces so this file does not match its own scan: a pattern
# written whole would contain the spellings it looks for.
$hostPath = '(?i)(' + '\b[A-Z]:[\\/]' + '|' + '\\\\[A-Za-z0-9._-]+\\' + '|' + 'file:' + '///' + '|' + '(^|[\s(])/(home|Users|mnt|opt|srv)/' + ')'
# Assembled from pieces so this file does not itself carry the product names it
# scans for, while the assembled pattern still matches them in the prose.
$productName = '(?i)\b(p' + 'lynth|up' + 'lift|d' + 'cp)\b'
$packageInvocation = '(?i)\b(npm|pnpm|yarn|npx|uv|pip|poetry)\s+(run|exec|test|install|sync|add|build)\b'
$modelPin = '(?m)^\s*model(_provider)?\s*[=:]'
$portableFiles = @($skillPath, $selfPath) + @($referenceNames | ForEach-Object { Join-Path $skillDir $_ })
foreach ($file in $portableFiles) {
    $text = Get-FileText -Path $file
    $label = if ($file -eq $skillPath) { 'SKILL.md' } elseif ($file -eq $selfPath) { 'this check' } else { Split-Path $file -Leaf }
    Assert-True ($text -notmatch $hostPath) "$label embeds no host path or drive letter"
    Assert-True ($text -notmatch $productName) "$label embeds no product name"
    Assert-True ($text -notmatch $packageInvocation) "$label embeds no package-manager invocation"
    Assert-True ($text -notmatch $modelPin) "$label pins no model or provider"
}

Write-Host ''
Write-Host 'The router and the run reach it'
$routerNamesSkill = [bool]$name -and $router -match ('(?i)\b' + [regex]::Escape($name) + '\b')
$bullet = [regex]::Match($router, "(?m)^-\s+``" + [regex]::Escape($name) + "``(?<body>[^\r\n]*(?:\r?\n[ \t]+\S[^\r\n]*)*)").Groups['body'].Value
Assert-True ($runAll -match "(?im)^\s*@\{\s*Name\s*=\s*'brainstorm'\s*;\s*File\s*=\s*'brainstorm\.ps1'") 'run-all declares this check against its own file'
Assert-True ($runAll -match [regex]::Escape("'Brainstorm check passed'")) "run-all watches for this check's own signature"
$expectedBlock = [regex]::Match($runAll, '(?s)\$expectedChecks\s*=\s*@\((?<body>.*?)\r?\n\)').Groups['body'].Value
Assert-True ($expectedBlock -match "'brainstorm'") 'the expected-check list carries this check'

# The floor. A copy gutted to its verdict line would otherwise report a pass on no
# evidence, and run-all's own floor is declared beside the wiring. Kept equal to
# the count this file reports today.
$floor = 112
if ($checks -lt $floor) {
    $script:failures.Add("the check reported $checks assertion(s); its floor is $floor")
    Write-Host ("  FAIL the check reported $checks assertion(s); its floor is $floor - a gutted copy is not evidence")
}

Write-Host ''
if ($failures.Count -eq 0) { Write-Host ("Brainstorm check passed: $checks structural assertion(s). Method content is verified by review, not here.") }
else {
    Write-Host ("Brainstorm check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
