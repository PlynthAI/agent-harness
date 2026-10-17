#Requires -Version 7.0
<#
.SYNOPSIS
    Structural checks for the shared TDD test-authoring method (SF-023).

.DESCRIPTION
    Reads skills/tdd and checks only what a machine can decide: the method file
    and its worked examples exist, the method separates a behaviour test from a
    mirrored-internals test and shows an example of each, the seam rule, the
    refusals (implementation repeat, coverage quota, prose-only change, deleting
    an essential test for a simplification preference), the red-first exception
    path, the deferral of frontend and backend specifics to the repository, and
    the boundary that leaves check selection to validate-implementation and
    review to code-review. It also asserts the method is stack-neutral (no code
    fence, no runner invocation, no host path or model pin) and
    that the anchors the card says to keep still exist.

    Deliberately NOT checked here: whether the prose means the right thing. Most
    assertions read a named section, or a single bullet or sentence inside it,
    and assert that bullet or sentence rather than a bare token anywhere in the
    file. A few are whole-file anchor scans - the stack-neutrality checks and
    anchors such as GLOSSARY.md - and those confirm only that a phrase exists, not
    that the sentence around it is sensibly worded: text that inverts a rule while
    keeping its vocabulary can still pass. This is structure, not semantics.
    Meaning is verified by independent review, and the verdict line says so.


    It runs no test suite, opens no session, writes nothing and needs no network.
#>
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
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
    return [string](Get-Content -Raw -LiteralPath $Path)
}

# Split a markdown document into its '## ' sections so an assertion can read the
# section that owns a rule rather than matching a word anywhere in the file.
function Get-Sections {
    param([string]$Text)
    $sections = [System.Collections.Generic.List[object]]::new()
    foreach ($part in @([regex]::Split($Text, '(?m)^## ') | Select-Object -Skip 1)) {
        $lines = @($part -split "`r?`n")
        if ($lines.Count -eq 0) { continue }
        $sections.Add([pscustomobject]@{
                Heading = $lines[0].Trim()
                Body    = (@($lines | Select-Object -Skip 1) -join "`n")
            })
    }
    return , $sections
}

# Read a bullet as one item, joining its wrapped continuation lines, so a rule
# cannot be satisfied by the same word appearing in a neighbouring bullet.
function Get-Bullets {
    param([string]$Body)
    $items = [System.Collections.Generic.List[string]]::new()
    foreach ($line in @($Body -split "`r?`n")) {
        if ($line -match '^\s*[-*]\s+(?<text>\S.*)$') { $items.Add($Matches['text'].Trim()); continue }
        if ($items.Count -gt 0 -and $line -match '^\s{2,}(?<text>\S.*)$') {
            $items[$items.Count - 1] = $items[$items.Count - 1] + ' ' + $Matches['text'].Trim()
        }
    }
    return , $items
}

function Get-FirstSection {
    param($Sections, [string]$Pattern)
    return @($Sections | Where-Object { $_.Heading -match $Pattern } | Select-Object -First 1)
}

function Test-AnyBullet {
    param($Bullets, [string]$Pattern)
    foreach ($bullet in @($Bullets)) { if ($bullet -match $Pattern) { return $true } }
    return $false
}

function Get-FencedBlocks {
    param([string]$Text)
    $blocks = [System.Collections.Generic.List[string]]::new()
    foreach ($match in [regex]::Matches($Text, '(?ms)^```[^\r\n]*\r?\n(?<body>.*?)\r?\n```')) {
        $blocks.Add($match.Groups['body'].Value)
    }
    return , $blocks
}

$root = Split-Path $PSScriptRoot -Parent
$skillDir = Join-Path $root 'skills\tdd'
$skillPath = Join-Path $skillDir 'SKILL.md'
$testsPath = Join-Path $skillDir 'tests.md'
$mockingPath = Join-Path $skillDir 'mocking.md'
$skill = Get-FileText -Path $skillPath
$tests = Get-FileText -Path $testsPath
$mocking = Get-FileText -Path $mockingPath
$sections = Get-Sections -Text $skill

Write-Host 'The method file'
Assert-True (Test-Path -LiteralPath $skillPath) 'the method carries a SKILL.md'
Assert-True ($skill -match '(?s)\A---\r?\n.*?\r?\n---') 'the skill opens with frontmatter'
$name = [regex]::Match($skill, '(?m)^name:\s*(.+?)\s*$').Groups[1].Value.Trim('"', "'")
$description = [regex]::Match($skill, '(?ms)^description:\s*(.+?)(?=\r?\n[a-z_]+:|\r?\n---)').Groups[1].Value
Assert-True ($name -eq 'tdd') "the frontmatter names the skill (found '$name')"
Assert-True ($description.Length -ge 40) "the frontmatter carries a description a session can select on (found $($description.Length) characters)"
$skillBytes = if (Test-Path -LiteralPath $skillPath -PathType Leaf) { (Get-Item -LiteralPath $skillPath).Length } else { 0 }
Assert-True ($skillBytes -ge 2048) "the method carries real body text, not just the asserted phrases (found $skillBytes bytes)"
# The ceiling is context budget, not style: this method is consulted on every
# red -> green cycle, so it has to stay small enough to load without crowding the
# work. It is deliberate headroom, not a target to grow. The floor above is the
# opposite guard - a stub that keeps the asserted phrases but drops the body must
# not pass.
Assert-True ($skillBytes -le 16384) "the method stays light enough to load into a cycle (found $skillBytes bytes)"
Assert-True ($sections.Count -ge 6) "the method is organised into real sections (found $($sections.Count))"
$bodySections = @($sections | Where-Object { $_.Heading -notmatch '(?i)^References\b' })
$minBody = $(if ($bodySections.Count) { ($bodySections | ForEach-Object { $_.Body.Length } | Measure-Object -Minimum).Minimum } else { 0 })
Assert-True ($bodySections.Count -ge 5 -and $minBody -ge 150) "every method section carries a real body (found $($bodySections.Count) sections, thinnest $minBody characters)"

Write-Host ''
Write-Host 'Behaviour against mirrored internals'
$goodTest = Get-FirstSection -Sections $sections -Pattern '(?i)^What a good test is\b'
Assert-True (@($goodTest).Count -eq 1) 'the method explains what a good test is'
if (@($goodTest).Count -eq 1) {
    $goodBullets = Get-Bullets -Body $goodTest[0].Body
    Assert-True ($goodTest[0].Body.Length -ge 300) "the good-test section carries real body text (found $($goodTest[0].Body.Length) characters)"
    Assert-True (Test-AnyBullet -Bullets $goodBullets -Pattern '(?i)behaviou?r test') 'the method names a behaviour test as its own shape'
    Assert-True (Test-AnyBullet -Bullets $goodBullets -Pattern '(?i)mirrored-internals test|mirror') 'the method names the mirrored-internals test that is not good'
}

Write-Host ''
Write-Host 'Seams'
$seamSection = Get-FirstSection -Sections $sections -Pattern '(?i)^Seams'
Assert-True (@($seamSection).Count -eq 1) 'the method keeps its seam section'
if (@($seamSection).Count -eq 1) {
    $seamBody = $seamSection[0].Body
    Assert-True ($seamBody.Length -ge 200) "the seam section carries real body text (found $($seamBody.Length) characters)"
    # Read the sentence, not the word: the seam rule lives in one sentence, so a
    # mention of "internals" elsewhere in the section cannot stand in for it.
    $seamSentences = @($seamBody -split '(?<=\.)\s+')
    Assert-True (@($seamSentences | Where-Object { $_ -match '(?i)\bseams?\b' -and $_ -match '(?i)internals' }).Count -ge 1) 'the seam rule keeps tests at seams and out of internals'
    # Test-level choice is a reviewed user/project preference. Requiring the old
    # smallest-boundary wording would reject valid E2E-first guidance.
}
# Architecture guidance is a shared planner reference; local links are checked below.

Write-Host ''
Write-Host 'Refusals'
$refusals = Get-FirstSection -Sections $sections -Pattern '(?i)^Refusals?\b'
Assert-True (@($refusals).Count -eq 1) 'the method states its refusals in their own section'
if (@($refusals).Count -eq 1) {
    $refusalBullets = Get-Bullets -Body $refusals[0].Body
    $refusalProse = @(($refusals[0].Body -split "`r?`n") | Where-Object { $_ -notmatch '^\s*(?:[-*]|\s)' -and $_.Trim().Length -gt 0 })
    Assert-True (@($refusalProse | Where-Object { $_ -match '(?i)\b(none|never|not|avoid|refuse|reject)\b' }).Count -ge 1) 'the refusals section frames the list as things to refuse, not a to-do list'
    Assert-True ($refusalBullets.Count -ge 3) "the refusals are a list, not a sentence (found $($refusalBullets.Count) items)"
    Assert-True (Test-AnyBullet -Bullets $refusalBullets -Pattern '(?i)coverage.{0,120}(quota|target|threshold|percentage)') 'a refusal item rejects a coverage quota'
    Assert-True (Test-AnyBullet -Bullets $refusalBullets -Pattern '(?i)prose') 'a refusal item rejects a test for a prose-only change'
    Assert-True (Test-AnyBullet -Bullets $refusalBullets -Pattern '(?i)(repeat|mirror|restate|tautolog)') 'a refusal item rejects a test that repeats the implementation'
    Assert-True (Test-AnyBullet -Bullets $refusalBullets -Pattern '(?i)(delet|remov).{0,200}simplif|simplif.{0,200}(delet|remov)') 'a refusal item protects an existing essential test from a simplification preference'
    Assert-True (Test-AnyBullet -Bullets $refusalBullets -Pattern '(?i)reversible') 'a refusal item keeps the reversible low-impact change rule'
}

Write-Host ''
Write-Host 'Anti-patterns and the loop'
$antiPatterns = Get-FirstSection -Sections $sections -Pattern '(?i)^Anti-patterns?\b'
Assert-True (@($antiPatterns).Count -eq 1) 'the method keeps its anti-patterns section'
if (@($antiPatterns).Count -eq 1) {
    $antiBullets = Get-Bullets -Body $antiPatterns[0].Body
    Assert-True ($antiBullets.Count -ge 3) "the anti-patterns are a list (found $($antiBullets.Count) items)"
    Assert-True (Test-AnyBullet -Bullets $antiBullets -Pattern '(?i)tautolog') 'the tautological-test guidance is still an anti-pattern'
    Assert-True (Test-AnyBullet -Bullets $antiBullets -Pattern '(?i)implementation-coupled') 'the implementation-coupled anti-pattern survives'
    Assert-True ($antiPatterns[0].Body -match '(?i)vertical\s+slices') 'the vertical-slice rule survives'
    Assert-True ($antiPatterns[0].Body -match '(?i)tracer\s+bullet') 'the tracer-bullet rule survives'
}
$loop = Get-FirstSection -Sections $sections -Pattern '(?i)^Rules of the loop\b'
Assert-True (@($loop).Count -eq 1) 'the method keeps its rules of the loop'
if (@($loop).Count -eq 1) {
    $loopBullets = Get-Bullets -Body $loop[0].Body
    Assert-True ($loopBullets.Count -ge 3) "the loop rules are a list (found $($loopBullets.Count) items)"
    Assert-True (Test-AnyBullet -Bullets $loopBullets -Pattern '(?i)red before green') 'red before green is still a loop rule'
    Assert-True (Test-AnyBullet -Bullets $loopBullets -Pattern '(?i)failing regression') 'a bug prefers a failing regression first'
    Assert-True (Test-AnyBullet -Bullets $loopBullets -Pattern '(?i)red-first.{0,400}(unavailable|not feasible|exception)|(unavailable|not feasible|exception).{0,400}red-first') 'the loop carries the honest exception path when red-first proof is unavailable'
}
Assert-True ($skill -match '(?i)GLOSSARY\.md') 'the method still tells the reader to read GLOSSARY.md'

Write-Host ''
Write-Host 'The repository owns the specifics'
$specifics = Get-FirstSection -Sections $sections -Pattern '(?i)^The repository owns the specifics\b'
Assert-True (@($specifics).Count -eq 1) 'the method defers the specifics in their own section'
if (@($specifics).Count -eq 1) {
    $specificsBody = $specifics[0].Body
    Assert-True ($specificsBody.Length -ge 200) "the specifics section carries real body text (found $($specificsBody.Length) characters)"
    Assert-True ($specificsBody -match '(?i)repositor') 'the specifics section points at the repository'
    Assert-True ($specificsBody -match '(?i)frontend|front-end') 'the specifics section covers the frontend side'
    Assert-True ($specificsBody -match '(?i)backend|back-end') 'the specifics section covers the backend side'
    # One sentence must carry both: the deferral sentence names the repository's
    # own conventions, and a later mention of "conventions" cannot stand in.
    $specificsSentences = @($specificsBody -split '(?<=\.)\s+')
    Assert-True (@($specificsSentences | Where-Object { $_ -match '(?i)repositor' -and $_ -match '(?i)convention' }).Count -ge 1) "the specifics section names the repository's own testing conventions"
    Assert-True ($specificsBody -match '(?i)optional') 'technology references are offered as optional'
}

Write-Host ''
Write-Host 'Boundary with validation and review'
$boundary = Get-FirstSection -Sections $sections -Pattern '(?i)^What this skill does not do\b'
Assert-True (@($boundary).Count -eq 1) 'the method states what it does not do'
if (@($boundary).Count -eq 1) {
    Assert-True ($boundary[0].Body.Length -ge 120) "the boundary section carries real body text (found $($boundary[0].Body.Length) characters)"
    Assert-True ($boundary[0].Body -match 'validate-implementation') 'check selection is delegated to validate-implementation'
    Assert-True ($boundary[0].Body -match 'code-review') 'review is delegated to code-review'
}
Assert-True ($skill -match 'validate-implementation') 'the method names validate-implementation as the check selector'
Assert-True ($skill -match 'code-review') 'the method names code-review as the reviewer'

Write-Host ''
Write-Host 'Stack neutrality'
Assert-True ($skill -notmatch '(?m)^```') 'the method carries no fenced code sample, so no stack is assumed'
Assert-True ($skill -notmatch '(?i)\b(npm|pnpm|yarn|npx)\s+(run|exec|test|install)\b') 'the method invokes no package manager'
Assert-True ($skill -notmatch '(?i)(\b[A-Z]:[\\/]|\\\\[A-Za-z0-9._-]+\\|file:///)') 'the method embeds no host path'
Assert-True ($skill -notmatch '(?m)^\s*model(_provider)?\s*[=:]') 'the method pins no model or provider'

Write-Host ''
Write-Host 'Worked examples'
Assert-True (Test-Path -LiteralPath $testsPath) 'the worked examples ship with the method'
$testsBytes = if (Test-Path -LiteralPath $testsPath -PathType Leaf) { (Get-Item -LiteralPath $testsPath).Length } else { 0 }
Assert-True ($testsBytes -ge 1500) "the worked examples carry real text (found $testsBytes bytes)"
$goodMarkers = @([regex]::Matches($tests, '//\s*GOOD:')).Count
$badMarkers = @([regex]::Matches($tests, '//\s*BAD:')).Count
Assert-True ($goodMarkers -ge 2) "the examples show more than one test worth keeping (found $goodMarkers GOOD blocks)"
Assert-True ($badMarkers -ge 2) "the examples show more than one shape to reject (found $badMarkers BAD blocks)"
$testSections = Get-Sections -Text $tests
$pairedSections = @($testSections | Where-Object { $_.Body -match '//\s*GOOD:' -and $_.Body -match '//\s*BAD:' })
Assert-True ($pairedSections.Count -ge 2) "the examples pair a good test with the bad shape beside it (found $($pairedSections.Count) paired sections)"
Assert-True (@($testSections | Where-Object { $_.Heading -match '(?i)behaviou?r' -and $_.Heading -match '(?i)internals' }).Count -eq 1) 'a worked example names the behaviour-against-mirrored-internals distinction'
$fences = Get-FencedBlocks -Text $tests
$mirrored = @($fences | Where-Object { $_ -match '//\s*BAD:' -and $_ -match '(?i)toHaveBeenCalled' -and $_ -match '(?i)(mock|spy)' })
Assert-True ($mirrored.Count -ge 1) 'a rejected example shows a test mirroring internals'
$tautology = @($fences | Where-Object { $_ -match '//\s*BAD:' -and $_ -match 'reduce\(' })
Assert-True ($tautology.Count -ge 1) 'a rejected example shows the expected value recomputed from the implementation'
$independent = @($fences | Where-Object { $_ -match '//\s*GOOD:' -and $_ -match 'toBe\(15\)' })
Assert-True ($independent.Count -ge 1) 'the tautology pair shows the independent literal that replaces it'
Assert-True (@($testSections | Where-Object { $_.Heading -match '(?i)tautolog' }).Count -ge 1) 'the tautological example is a named worked example of its own'

Write-Host ''
Write-Host 'References'
Assert-True (Test-Path -LiteralPath $mockingPath) 'the mocking reference ships with the method'
$mockingBytes = if (Test-Path -LiteralPath $mockingPath -PathType Leaf) { (Get-Item -LiteralPath $mockingPath).Length } else { 0 }
Assert-True ($mockingBytes -ge 800) "the mocking reference carries real text (found $mockingBytes bytes)"
# A whole-file anchor scan: it confirms the phrase survives, and it does not
# detect a rule inverted while keeping its vocabulary. That limit is stated in
# the file header rather than papered over, and is why meaning is reviewed.
Assert-True ($mocking -match '(?i)system boundaries') 'the mocking reference still draws the boundary at system boundaries'
foreach ($linked in @('tests.md', 'mocking.md')) {
    Assert-True ($skill -match [regex]::Escape("($linked)")) "SKILL.md links $linked"
}
$skillRoot = (Resolve-Path -LiteralPath (Join-Path $root 'skills')).Path.TrimEnd('\') + '\'
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
        Assert-True ($resolvedFull.StartsWith($skillRoot, [StringComparison]::OrdinalIgnoreCase)) "link '$target' stays inside the shared skill library"
        Assert-True (Test-Path -LiteralPath $resolvedFull -PathType Leaf) "link '$target' resolves to a real file"
    }
}
Assert-True ($linkCount -ge 3) "the method and its examples link their references (found $linkCount link(s))"

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host ("Tdd check passed: $checks structural assertion(s). Method content is verified by review, not here.")
}
else {
    Write-Host ("Tdd check FAILED: $($failures.Count) of $checks assertion(s).")
    $failures | ForEach-Object { Write-Host ("  - " + $_) }
}
exit ($(if ($failures.Count -eq 0) { 0 } else { 1 }))
