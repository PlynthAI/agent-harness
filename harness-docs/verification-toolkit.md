# Verification toolkit candidates

Status: optional shared catalogue, 2026-09-27. This catalogue does not install tools or make them required checks. Project manifests and verified project commands remain authoritative. Select the smallest set that answers the project's actual questions; additional coverage is useful, overlapping engines and unused dependencies are not.

For a missing project verification route, use the shared
[validation setup method](../skills/validate-implementation/references/setup-and-maintenance.md)
and its [starter recipe](../harness-docs-starter/templates/verification.md).
This catalogue helps choose a tool only after an actual coverage gap is known.

This is portable guidance. Host-specific project inventories belong in the harness project's resolved workspace, not a universal list of repositories shipped to other hosts. This assessment's dated inventory is `findings/upstream-verification/project-stacks.md` relative to that workspace; use PROJECT.md and docs-workspace to locate it.

## Choose by application layer

| Layer / stack | Start with | Add for a demonstrated gap | Proof to establish during adoption |
|---|---|---|---|
| TypeScript / React / Next.js / web | Existing TypeScript check, ESLint and formatter; existing unit runner | Typed ESLint where useful; React Doctor for React-specific diagnostics; Vitest only if a unit runner is missing | A legitimate example passes, a representative defect is detected, and affected checks have measured local runtime |
| Browser / website | Visible Codex browser for exploration; existing Playwright test runner for repeatability | Playwright traces, axe accessibility integration, browser performance traces | Actual action and outcome on the correct candidate; keyboard/focus checks; narrow/wide layouts where relevant; no-console-error alone is insufficient |
| Python services / ingestion | Existing pytest suite, Ruff lint/format, the project's configured type checker | Profile Pyright, Pyrefly or ty against the actual code if type feedback is inadequate; choose one principal checker | Real entrypoint with representative disposable configuration; observable data/file effects and useful failure diagnostics |
| HTTP / database-backed services | Existing HTTP integration tests and project database workflow; isolated test database where already supported | Contract/property tests or a small repeatable test-data seed command when missing | Request, response and independent readback; cleanup bound to the test resources; no production writes implied |
| Node CLI / harness scripts | Existing Node test runner or installed runner, lint/format scripts | PTY/command transcript tests for interactive CLIs | Exit status, stdout/stderr and actual filesystem/network effects; verify what dry-run really skips |
| PowerShell / Windows helpers | Existing focused tests; PSScriptAnalyzer when it answers an actual lint gap | Pester for a missing PowerShell test harness | Supported shell/version, success and error cases, no visible helper windows, owned-process cleanup |
| Electron / desktop web | Existing app automation and browser instrumentation | CDP/performance tools when supported by the runtime | Correct app instance/profile, UI actions plus effects, trace when investigating performance; no parallel control of a shared instance |
| Mobile / React Native | Existing framework tests and emulator/simulator workflow | Maestro or native platform UI tests when a real mobile project requires them | Navigation, input, lifecycle and device-specific behaviour on a qualified platform; Windows is not an iOS simulator host |
| C/C++ / Rust / Go / .NET or other future stack | The repository's native compiler, formatter and test runner | Runtime profiler/sanitizer/contract tool selected for a concrete failure | Compile/type diagnostics plus behaviour at the public entrypoint; establish platform availability before promising coverage |
| Documentation / research / creative projects | Existing format build, links, source/citation and output inspection | A document parser or rendered-output check only for the produced format | Facts/source support and readable final output; no software build or PR ritual for ordinary prose |

## Development runtime: reuse before wrapping

For the operational method, use [development runtime](../skills/validate-implementation/references/development-runtime.md):
it covers Portless reuse, app versus proxy logs, bounded log reads and owned
process cleanup. For tracing and impact queries across agent roles, use
[code intelligence](../skills/orchestrate-work/references/code-intelligence.md).
Projects supply concrete setup/version, commands and paths in ordinary guides.

Use the project's existing dev/health/test/cleanup commands. Add a thin helper only when agents repeatedly lack a reliable way to launch, identify, drive or inspect the app. Do not implement every hypothetical command listed in a blog post.

For a new helper, prefer subcommands with useful `--help`, meaningful exit codes, stable machine-readable output and concrete recovery errors. Commands with destructive effects need a real preview/dry-run where feasible; test that preview does not perform the destructive action. Keep the helper small and owned with the project code.

The minimum useful runtime contract is: launch command, readiness/identity check, one feature action and observable result, evidence destination, and cleanup of exactly the resources started by that run. Auth and seed-data guidance names supported test routes without embedding credentials. Record checkout/build, URL, environment and state identity; a reachable port is not proof of the right candidate.

[Portless](https://github.com/vercel-labs/portless) supplies named local URLs and worktree-aware naming. It does not by itself prove candidate identity, isolate databases, seed auth or retire all processes. Verify the installed version and the project's wrapper before changing setup: current upstream is pre-1.0 and its default HTTPS/trust behaviour can differ from older installations. Do not run trust/certificate or global setup changes merely to fill this catalogue.

## Adoption selection

1. Inspect the installed project scripts and existing checks. Reuse working commands and lockfile versions.
2. Identify an uncovered requirement: types, lint, real UI behaviour, contract, accessibility, performance or reproducibility.
3. Choose a candidate above using current official docs and compatibility with the actual stack. Prefer existing lint rules before custom structural analysis. Do not build a general AST engine.
4. If installation is in scope, use the project's package manager and lockfile, adding only selected development dependencies. Avoid routine `latest` installs and global dependency changes.
5. Prove the capability on one representative feature and a relevant failure case. Measure elapsed/cold/warm cost and false positives where comparing tools; speed claims from vendor pages are not this project's measurements.
6. Record the command and capability in the project's one verification guide, `docs/VERIFICATION.md`. Reuse evidence and run selected checks for each completed slice; do not execute the entire catalogue.

No package installs or tool benchmarks were run for this document. Availability, licensing and platform support must be rechecked for the chosen version at adoption; local/free options do not imply optional hosted services are free.

## Official sources inspected

- [typescript-eslint typed linting](https://typescript-eslint.io/getting-started/typed-linting/): type-aware checks and their additional cost.
- [Prettier pre-commit integrations](https://prettier.io/docs/precommit): use the existing project integration; no new global hook is required.
- [Vitest](https://vitest.dev/guide/), [React Doctor](https://github.com/millionco/react-doctor).
- [Playwright trace viewer](https://playwright.dev/docs/trace-viewer-intro), [accessibility testing](https://playwright.dev/docs/accessibility-testing): automated scans cover only part of accessibility.
- [Chrome performance tools](https://developer.chrome.com/docs/devtools/performance).
- [Ruff](https://docs.astral.sh/ruff/), [pytest](https://docs.pytest.org/en/stable/), [Pyrefly](https://pyrefly.org/en/docs/), [ty](https://github.com/astral-sh/ty). Alternative type checkers are evaluation choices, not a recommendation to replace a working project checker.
- [PSScriptAnalyzer](https://learn.microsoft.com/en-us/powershell/utility-modules/psscriptanalyzer/overview?view=ps-modules), [Pester](https://pester.dev/docs/quick-start).
- [Maestro](https://docs.maestro.dev/), [Android testing](https://developer.android.com/studio/test), [XCTest](https://developer.apple.com/documentation/xctest).
- [Pstack verification setup](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/SKILL.md): inspiration for a proved project capability rather than a list of installed tools.
