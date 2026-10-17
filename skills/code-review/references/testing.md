# Reviewing tests and handling failures

Use this reference for new or affected tests and for a failure during
implementation or verification. Apply the repository's current coding standards
and [finding triage](finding-triage.md) to the accepted scope. Reviewers report;
implementation agents diagnose and repair within their assignment. Consulting
this procedure does not require launching a reviewer for each failure.

## Review the evidence a test provides

Ask of each new or affected test:

1. What required outcome or contract does it protect, and what realistic defect
   would violate that outcome? Include consequential interactions for the change,
   using the project's test standards rather than a complexity or coverage quota.
2. Does it exercise the production path at a useful public boundary? What does a
   double exclude from the evidence? A contracted external interaction can be the
   outcome; a private call or the test's own setup usually cannot.
3. Where does the expected result come from? A production call used as its own
   oracle or copied production logic can share the defect being tested. An
   independent reference, property or boundary contract can disagree with faulty
   production code. Similar syntax, a calculated expectation or a mock alone
   does not settle that question.
4. Is there evidence it catches the claimed regression and survives harmless
   refactoring? Use [TDD](../../tdd/SKILL.md) for authoring and red-first proof;
   a passing test written after implementation is not that proof.
5. What distinct coverage does it add or replace? If removing it would lose a
   required outcome, name the reliable test that will preserve that outcome.

Report a concrete defect with its governing requirement, failure condition and
smallest credible repair. Review directly affected tests without turning a
touched file into a demand to clean up unrelated test debt. Reuse matching check
evidence and name gaps instead of treating inspection as execution.

## Keep and classify the failure

Retain the first failing output, command, candidate and relevant environment or
fixture identity. Identify the requirement the test protects before changing
code, assertions or timing. A failure is evidence; its expected value does not
by itself establish the requirement.

| Classification | Evidence needed | Next action |
|---|---|---|
| Product defect | The production behavior violates the protected requirement | Repair the product; keep the test's valid contract |
| Test defect | The expectation, fixture, observation or synchronization is wrong for the requirement | Use the confirmed test-defect procedure below |
| Environment failure | A required service, dependency or execution condition is demonstrably unavailable or wrong | Correct it within authority or report the verification gap; retain valid coverage |
| Unknown | The evidence does not distinguish those causes | Use [diagnosing-bugs](../../diagnosing-bugs/SKILL.md) to discriminate before repair |

Intermittency alone does not establish a test defect. A race, shared-state leak
or ordering defect in the product can appear intermittent. Keep the failing
evidence until the cause is resolved; one later pass does not explain it away.

## Repair a confirmed test defect

When the test's design is wrong, prefer replacement at a useful boundary. When
one specific correction can make it reliable, allow at most one targeted test
repair supported by evidence of the cause. Verify that correction. If it remains
fragile, replace the test rather than starting another repair cycle.

Use TDD to author a reliable replacement for the same required behavior. Preserve
meaningful unique coverage, including behavior promised by an experiment and
required production, security, privacy or data-loss outcomes. Remove without
replacement only when the coverage is redundant, obsolete or meaningless;
identify the existing coverage or changed requirement that supports that choice.
Name deleted tests and the reason in the existing review or delivery record.

## Reproduce to learn, verify after correction

Do not rerun until green, weaken assertions, or blindly extend timeouts to hide a
failure. These are different from:

- Bounded diagnostic reproduction with a hypothesis, recorded failures and a
  stopping condition. Repetition can expose an intermittent product defect.
- Normal waits for a specified condition within the runner's supported behavior.
  If synchronization is the defect, correct the observation of that condition
  using the targeted repair above.
- Verification after a real product, test or environment correction, including
  the original failing scenario and affected checks.

Record the classified cause, correction, coverage preserved and verification
result through [validate-implementation](../../validate-implementation/SKILL.md).
If the cause or required evidence remains unresolved, report it as unfinished.
