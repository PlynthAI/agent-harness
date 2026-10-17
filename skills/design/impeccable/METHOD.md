---
name: impeccable
description: Design, critique, polish or live-iterate frontend interfaces with the Impeccable engine, including visual craft, UX, accessibility, responsive behavior, the design detector and its edit hook. Not for non-UI work.
metadata:
  version: 4.3.1
---

## Harness install

This is the shared harness's `design/impeccable` method: Impeccable 4.3.1 on engine 0.1.5, installed once per user at `~/.codex/skills/design/impeccable` and reached by Claude Code at `~/.claude/skills/design/impeccable`. `design/impeccable <command>` means this method's command, reached through the design skill. Where the text below conflicts with this section, this section wins.

- **Engine.** `scripts/impeccable` (`scripts/impeccable.cmd` on a Windows shell without `sh`) runs the pinned engine that the harness deploy places in `scripts/bin/`. The launcher defaults `IMPECCABLE_NO_TELEMETRY`, `IMPECCABLE_NO_UPDATE_CHECK` and `IMPECCABLE_LIVE_COPY_AGENT=chat`; leave them set, so live copy edits stay in the active task instead of a separate agent that bypasses approvals.
- **Nothing is installed into a project.** Never run `install`, `update`, `link`, `pin` or `unpin`, and ignore an `UPDATE_AVAILABLE` directive: the harness pins the version and owns upgrades. Never copy the skill or the engine into a repository.
- **Hooks.** Wire a project with [reference/adoption.md](reference/adoption.md), not `hooks on` or `hooks reset`, which manage manifests for a project-local skill. The other `hooks` actions (`status`, `off`, the `ignore-*` actions) work as documented. When engine output points at an `impeccable hooks` command, it means this skill's `hooks` route. `MANUAL_DETECTOR_REQUIRED` is expected from `context` with this user-level install, even when the hook is wired; run the one detector pass it asks for.
- **Live helper server.** Engine 0.1.5 accepts any origin that presents the helper's token (the 3.x origin check is gone and cannot be restored from here). Keep the helper on localhost, never forward, tunnel or expose its port, and stop it with `live-server stop` at closeout.
- **Design authority.** `context` loads the project's root `DESIGN.md` (Google DESIGN.md format; see the design skill's design-md-adoption reference) and `PRODUCT.md`. When the project's PROJECT.md names another directory for them, set `IMPECCABLE_CONTEXT_DIR=<that directory>` on every engine call.
- **Known detector gap.** The compiled engine (0.1.5 pinned; 0.1.9 checked on 2026-10-01 behaves the same) reads a `transition` value only when it sits on the declaration's line: a Prettier-formatted declaration whose value wraps onto following lines never raises `layout-transition`. The detector is upstream code, not harness source, so the gap closes only through an upstream fix and a pin bump. Until then, when a diff adds or reformats a wrapped `transition`, check its animated properties by eye (width, height, padding and margin are the ones the rule bans).
- **Commands not shipped here.** This install carries what the design skill routes to: new work, critique, polish, live with its variant actions, document, init, shape and hooks. When a reference or critique suggests another command, use the harness method instead: `audit` or `harden` → `design/review` and the `design/app-ui` polish reference; `clarify` → `writing`; `optimize` → the project's performance checks; `onboard` → `design/app-ui`; `extract` → `design/components`; `doctor` → report the drift. Mobile-web viewport, touch and browser behaviour route to `design/mobile-native`; native app frameworks (SwiftUI, Compose, React Native) use the project's own methods, since this library carries no native method.
- **Subagents.** The shipped Impeccable subagents (`impeccable_finish_reviewer`, `impeccable_documenter`, `impeccable_asset_producer`, `impeccable_manual_edit_applier`) are not registered. Where a reference says to spawn one, spawn a fresh, unforked subagent whose brief is the matching `reference/degraded/<role>.md`, skipping its inline-substitution preamble, with the input packet the reference lists. Run it inline only when no subagent is available.

This skill gives you the tools and permission to create design that earns to be called out-of-distribution craft: Whereas before, your design work would have been safe, timid and measured, you now approach every design task as an award-winning design director with impeccable understanding for what makes exceptional design work: production-grade code, peak creativity, a clear POV, deep understanding of the needs of the client and users, and exceptional craft.

Core principles:
- Go all out. No hedging, no shortcuts. The deliverable must be complete (except assets the user must provide).
- Dream big and bold. Distinct, beautiful, outstanding and highly inspiring work.
- Verify in bounded passes, not a loop, and the ceiling covers the whole cycle: screenshots, defect scans, micro-edits, and rebuilds alike. Build fully, inspect once with a batched round (desktop and mobile together on the web; the shipped device classes on a native platform), fix everything it shows in one batch, confirm with at most one more round, and stop polishing. Open-ended self-QA burns the user's money doing worse what the finish handoffs do better.

## Setup

1. Run `<skill-base-dir>/scripts/impeccable context` once per session, where `<skill-base-dir>` is the directory that contains this METHOD.md (the skill folder, not a plugin root two levels above it); keep cwd at the user's project. That base directory resolves every `scripts/impeccable <verb>` command in this skill and its references, and the harness install (`~/.codex/skills/design/impeccable`, reached by Claude Code as `~/.claude/skills/design/impeccable`) is the fallback only when the runtime reports no base directory. On a Windows shell without `sh`, call `scripts/impeccable.cmd` instead. The launcher runs a self-contained binary that ships next to it or is downloaded once on first run; no Node or other runtime is required. Pass a named source file or route as `--target <path>`. It loads PRODUCT.md, DESIGN.md, the matching surface brief, and native-platform guidance when applicable; follow its directives and do not rerun it.
2. Load the request's playbook: its Commands-table reference for an explicit/implied sub-command, or [reference/new-work.md](reference/new-work.md) for a new surface or replacement visual world. Inspect target and incumbent visual truth before editing. When the app cannot run, start with committed visual-regression goldens or screenshot fixtures; verify target and freshness against current tokens, CSS, components, or assets, resolve conflicts, and compare theme/variant captures.
3. After resolving analysis and direction, read [reference/craft-floor.md](reference/craft-floor.md) immediately before any UI edit, including small refinements. It carries the quality floor, the absolute bans, and the reflexes no detector catches. Do not load it for planning-only work.

**Launcher unavailable:** On refusal or failure, send a separate message **before the next tool call**: “Context loading did not run; I’ll read the existing project context directly.” Then read existing PRODUCT.md and DESIGN.md without inventing missing context, follow applicable steps 2–3, and continue through permitted tools. This applies to planning and editing; launcher failure alone does not block either.

## How to design

- **The brief wins.** Honor pinned aesthetics, eras, materials, fonts, and palettes even when they conflict with a saturated-pattern warning. Redirecting a clear brief toward your taste is failure.
- **Refinement preserves; redesign replaces.** Refinement keeps the incumbent identity, behavior, copy, and everything outside scope. Ask before replacing factual copy or adding claims. Redesign keeps product truth, content, function, native affordances, and constraints, but treats the old look as evidence and anti-reference; choose a replacement world in new-work and replace DESIGN.md. Never split the difference into polish on the discarded look.
- **Visual authority is evidence, not a filename.** Missing DESIGN.md alone does not make a project greenfield; new-work decides whether to preserve, expand, or replace the incumbent world.

## Modes

The mode names what the visitor's success looks like on this surface.

- **Persuade:** the visitor decides and acts; design is the product. Landing pages, marketing, campaigns, pricing. Earn attention and action. Ship real imagery when the brief needs it; follow the committed world, not category habit.
- **Operate:** the visitor completes a task. App UI, dashboards, editors, admin, settings, tools. Scanability, consistency, native expectations, and the real usage scene outrank expression. Brand lives in precise details.
- **Read:** the visitor understands something. Docs, articles, guides, help, changelogs. Structure for comprehension, then make the reading experience worth staying in.
- **Experience:** the visitor is inside the work itself. Portfolios, galleries, showcases. Let the artifact lead from the first viewport; the interface recedes.

Choose the mode from the requested surface, not the product, and persist it only in that surface brief. A tool's landing page is still Persuade; a fashion house's documentation is still Read; a docs index is Read, not Persuade. See [new-work.md](reference/new-work.md) for new surfaces and [operate.md](reference/operate.md) for deeper Operate/Read guidance.

## Commands

| Command | Category | Description | Reference |
|---|---|---|---|
| `shape [feature]` | Build | Plan UX/UI before writing code | [reference/shape.md](reference/shape.md) |
| `init` | Build | Capture durable product context in PRODUCT.md | [reference/init.md](reference/init.md) |
| `document` | Build | Generate DESIGN.md from existing project code | [reference/document.md](reference/document.md) |
| `critique [target]` | Evaluate | UX design review with heuristic scoring | [reference/critique.md](reference/critique.md) |
| `polish [target]` | Refine | Final quality pass before shipping | [reference/polish.md](reference/polish.md) |
| `bolder [target]` | Refine | Amplify safe or bland designs | [reference/bolder.md](reference/bolder.md) |
| `quieter [target]` | Refine | Tone down aggressive or overstimulating designs | [reference/quieter.md](reference/quieter.md) |
| `distill [target]` | Refine | Strip to essence, remove complexity | [reference/distill.md](reference/distill.md) |
| `animate [target]` | Enhance | Add purposeful animations and motion | [reference/animate.md](reference/animate.md) |
| `colorize [target]` | Enhance | Add strategic color to monochromatic UIs | [reference/colorize.md](reference/colorize.md) |
| `typeset [target]` | Enhance | Improve typography hierarchy and fonts | [reference/typeset.md](reference/typeset.md) |
| `layout [target]` | Enhance | Fix spacing, rhythm, and visual hierarchy | [reference/layout.md](reference/layout.md) |
| `delight [target]` | Enhance | Add personality and memorable touches | [reference/delight.md](reference/delight.md) |
| `overdrive [target]` | Enhance | Push past conventional limits | [reference/overdrive.md](reference/overdrive.md) |
| `adapt [target]` | Fix | Adapt for different devices and screen sizes | [reference/adapt.md](reference/adapt.md) · native: [reference/adapt.native.md](reference/adapt.native.md) |
| `live` | Iterate | Visual variant mode: pick elements in the browser, generate alternatives | [reference/live.md](reference/live.md) |

Routing:

- **No argument:** read [routing.md](reference/routing.md) and present its context-aware menu; never auto-run a command.
- **Explicit or clearly implied request to run a command:** load its reference (native variant on native platforms) and follow it. Ask once if two commands fit.
- **Workflow or command-selection question:** read [Workflow questions](reference/routing.md#workflow-questions).
- **Otherwise:** treat the request as general design work. Missing PRODUCT.md routes a new surface or replacement world through init, then new-work; a narrow refinement of existing code proceeds on the incumbent implementation as `impeccable context` directs, offering init afterward rather than blocking on it.
- `teach` aliases `init`. `craft` is a deprecated alias for ordinary new-work and adds nothing. `shape` owns task discovery, then enters new-work only for visual-world and surface-concept decisions.

After init writes PRODUCT.md, resume without rerunning `impeccable context`; init loads the native platform reference itself when the platform it recorded is `ios`, `android`, or `adaptive`.

**Hooks:** `design/impeccable hooks <on|off|status|ignore-rule|ignore-file|ignore-value|reset>` manages the design detector hook for this project (auto-runs the detector after UI file edits and surfaces findings). Load [reference/hooks.md](reference/hooks.md) when the user invokes it with any argument.

**Never repair drift as a side effect of a design task.** A `CONTEXT_STALE` finding is reported, not acted on, unless the user asks. The one exception is a finding marked `auto`, which the next write to that file performs anyway.