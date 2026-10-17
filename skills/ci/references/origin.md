# Origin and implementation scope

This is harness-owned material developed from the owner-supplied CI optimization kit
prepared on 22 September 2026 and the subsequent two repository audits. It is not an
upstream-managed third-party package or a new collection service.

The original proposed-v1 METRICS.md is preserved byte-for-byte, SHA256:
67b9866ef024a42b30f35d7499f4bf0786cc04b76443b5b08dfa759ada05957a

Its measurement definitions remain the comparison contract. Its statements describing
the original bootstrap collector (including lack of resume) are historical implementation
notes. Current collector behavior and added quality fields are documented in
[GitHub collection](github-collection.md); these do not change validation authority.

The skill adds recurring evidence/decision continuity, cheap role-based inspection,
project-owned storage and proportionate handoff to existing review/delivery. The
collector develops the original standard-library implementation with attempt coverage
and resumable collection. Repository profiles, private reports and workstation paths
are intentionally not distributed with the skill.

The package needs no application database, agent-registration service, strict OKF
checker or new required CI job. Shared skill source is the maintained owner; installed
copies are deliberately reconciled. Update reusable code here, not in per-project forks.

Metric source keys:
- S2: https://docs.github.com/en/rest/actions/workflow-jobs
- S3: https://docs.github.com/en/rest/actions/workflow-runs
- S4: https://docs.github.com/en/billing/reference/actions-runner-pricing

Verify current provider pricing and account billing separately; historical reference
rates are not shipped as authoritative prices.

