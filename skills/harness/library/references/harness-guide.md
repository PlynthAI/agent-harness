# Refreshing the harness guide

"How the Harness Works" is the visual explainer of this harness: thirteen figures
and four conceptual overview cards, each checked against the files it describes. It is
published once, at a fixed address, and refreshed in place. It is this
harness's instance of teach's [building an explainer](../../../understand/teach/references/explainer.md);
this page holds only what is specific to it.

| | |
|---|---|
| Published page | The Kitchen site's How it works page, `/explore/how-it-works/`, the overview page after the Harness section's Contents, which `site/src/pages/explore/how-it-works/index.astro` builds from the source (`site/DESIGN.md`, "Guide source and site adaptation"). `/harness/` redirects there. The earlier artifact is no longer refreshed (the owner's decision, 17 October 2026) |
| Source | `guide/harness-guide.html` in this repository |
| Codex-side page | "Harness in Codex", an artifact in the owner's artifact list, no longer linked from the source; the guide's own roles figures already show Codex |
| Tooling page | `guide/tooling-coverage.html`, "Tooling across the project repos", owned by the tooling-coverage workstream; linked from the guide's footer by that relative path for local reading; the site drops that footer item, so the page stays local. Its links into `workspace/findings/` are private and resolve only on this host |
| Drift check | `checks/harness-guide.ps1`, run by `checks/run-all.ps1` |
| Reached from | `harness-docs/index.md`, the home page of the harness vault |

The source is versioned but never deployed: it stays out of
`config/install-map.json`. It starts at `<meta charset>` with no doctype,
`<html>` or `<body>`, because the artifact service wraps the page in its own.

## Publishing

The website is the published page: a committed source change reaches
`/explore/how-it-works/` on the site's next build, and the site's own deploy publishes it.
Check the changed figures on `/explore/how-it-works/` in the site's dev server
(`pnpm run dev:up` in `site/`) and run the site's `pnpm run check` before the
change lands. Do not republish the artifact. The footer's list of visual
explainers holds the separate pages of harness work (the tooling map today, the
templates page once delivered), not pages that restate what the guide's
figures show. Where one of the Harness section's overview pages (Roles, Skills by
stage, How work is tracked, Project documents, Principles and benefits) owns a
topic, the guide's section keeps only a figure that page does not show, with a
one or two sentence lead that links to it; a section that would only repeat the
page shrinks to that lead. Review is such a section: How work is tracked draws
the review rounds, so the guide links there instead of drawing them.

## What each figure is checked against

Keep this table and the page's Sources section in step: a file added to one is
added to the other.

| Figure (section id) | Checked against |
|---|---|
| Overview cards | `ARCHITECTURE.md`, `skills/coordinate/SKILL.md`, `skills/docs-workspace/references/plan-and-state.md`, `skills/orchestrate-work/SKILL.md`, `skills/code-review/SKILL.md` |
| One conversation across several teams (`scaling`) | `ARCHITECTURE.md`, `skills/coordinate/SKILL.md`, `skills/orchestrate-work/SKILL.md`, `skills/orchestrate-work/references/team.md`, `skills/docs-workspace/references/plan-and-state.md` |
| Who does what in Codex (`roles-codex`) | `agents/*.toml`, `agents/README.md`, `MODELS.md` (Codex team lead, Harness roles), `config/install-map.json`, `AGENTS.md` section 05, `skills/orchestrate-work/references/team.md`; the cards' config panels embed `agents/*.toml` through `guide/scripts/embed-role-configs.mjs` |
| Who does what in Claude Code (`roles-claude`) | `MODELS.md`, `claude/claude-map.json`, `claude/README.md`, `claude/user-CLAUDE.md`, `claude/sync-claude.ps1`, `claude/scripts/codex-forward.mjs`, `agents/fast_review.toml`, `agents/reviewer.toml`, `AGENTS.md` section 05, `skills/orchestrate-work/references/team.md`; the cards' config panels embed `~/.claude/agents/*.md`, `agents/fast_review.toml` and `agents/reviewer.toml` through `guide/scripts/embed-role-configs.mjs` |
| One source, two runtimes (`install`) | `config/install-map.json`, `config/deploy.ps1`, `config/ocr/rule.json`, `claude/claude-map.json`, `claude/sync-claude.ps1`, `claude/README.md`, `claude/hooks/`, `hooks/compact-reload.ps1` and `hooks/hooks.json`, `checks/compact-reload-hook.ps1`, `skills/design/drawing/references/post-drawing.md`, `skills/design/drawing/references/post-drawing-hook.md`, `skills/design/drawing/scripts/post-drawing.mjs`, `checks/post-drawing.test.mjs` |
| From request to reviewed work (`journey`) | `ARCHITECTURE.md`, `agents/planner.toml`, the `SKILL.md` of each skill on the path, `skills/coordinate/SKILL.md`, `skills/code-review/references/slice-review.md`, `skills/delivery/references/pr-writing.md`, `skills/validate-implementation/references/profiles.md`, `skills/validate-implementation/references/setup-and-maintenance.md`, `skills/harness/library/METHOD.md` |
| A typical delivery (`skills`) | The skill tree, the stage table in `AGENTS.md` (05), `skills/skills-list/references/workflows.md`, `skills/validate-implementation/references/profiles.md`, `skills/validate-implementation/references/setup-and-maintenance.md`, `skills/harness/library/METHOD.md`, `skills/planner/SKILL.md` and its architecture, sketch-first, design-red-flags, writing-plans, plan-review and audit references, `skills/validate-implementation/references/blast-radius.md`, `skills/code-review/references/slice-review.md`, `skills/code-review/references/push-review.md`, `skills/design/review/METHOD.md`, `skills/prompt-refine/SKILL.md`, `skills/prompt-refine/references/deepen.md` |
| Checks before commit, push and merge (`gates`) | `skills/validate-implementation/references/check-ladder.md`, `skills/delivery/references/commit-and-push.md`, `skills/delivery/SKILL.md` (merge gate), `skills/delivery/scripts/review-status.mjs`, `skills/code-review/SKILL.md` and `references/push-review.md`, `skills/design/impeccable/reference/hooks.md`, `skills/skills-list/scripts/claude-skill-stubs.mjs`, `PROJECT.md` commands; each drawn repository's hooks, workflows, `AGENTS.md` and branch rules (`gh api`), named in Sources by repository only, because `checks/harness-guide.ps1` resolves every Sources path inside this repository |
| The tools agents use (`tools`) | `harness-setup-guide.md` (One route per operation and environment, its connector map, Stdio MCP servers are project-scoped or off), `skills/orchestrate-work/references/code-intelligence.md`, `skills/orchestrate-work/scripts/codebase-memory/cbm.ps1` and `install.ps1`, `harness-docs/verification-toolkit.md`, `skills/validate-implementation/references/development-runtime.md`, `skills/browser-verification/SKILL.md` and `playwright-cli/METHOD.md`, `config/install-map.json` (`tools`), `skills/code-review/SKILL.md`, `skills/code-review/references/ocr/native-mode.md` and `project-rules.md`, `config/ocr/rule.json`, `skills/delivery/SKILL.md` (merge gate), `skills/design/drawing/METHOD.md` and `references/post-drawing.md`, `skills/design/impeccable/METHOD.md` and `reference/hooks.md` |
| Principles and patterns (`library`) | `THIRD_PARTY_NOTICES.md`, `principles-and-patterns/principles/*.md`, `principles-and-patterns/index.md` and each entry's front matter, `skills/harness/library/references/principles-and-patterns.md`, `skills/planner/SKILL.md`, `skills/planner/references/plan-review.md`, `skills/code-review/references/push-review.md` |
| Where project knowledge and task progress live (`documents`) | `harness-docs/workspace.md`, `harness-docs-starter/README.md`, `PROJECT.md` workspace routing, the workspace guide seed `workspace-seed/AGENTS.md` and the Inbox section of `harness-docs/index.md`, `harness-docs-starter/brain/` (`Home/Inbox.base`, `Templates/inbox.md`), `skills/docs-workspace/SKILL.md`, `registry.json` and `references/plan-and-state.md`, `harness-docs-starter/templates/state.md`, `skills/orchestrate-work/SKILL.md` and `references/long-runs.md`, `agents/reviewer.toml` (findings file), `skills/delivery/references/worktree-retirement.md` (`.state/`), `skills/handoff/SKILL.md`, `skills/inbox/references/check.md`, the resolver's output |
| Bringing a repository in (`adoption`) | `skills/orchestrate-work/references/repository-adoption.md`, `skills/harness/scripts/stack-scan.mjs`, `skills/validate-implementation/references/quality-kit.md`, `skills/planner/references/audit.md`, `skills/docs-workspace/references/docs-audit.md`, `harness-setup-guide.md` |
| Changing the harness (`maintenance`) | The Inbox section of the workspace guide seed `workspace-seed/AGENTS.md` and of `harness-docs/index.md`, the board `workspace-seed/Harness inbox.base`, `skills/handoff/SKILL.md`, `skills/inbox/SKILL.md` (its log step), `skills/harness/SKILL.md`, `skills/harness/library/METHOD.md`, `checks/run-all.ps1`, `checks/post-drawing.test.mjs`, `config/deploy.ps1`, `claude/sync-claude.ps1`, `README.md` and `claude/README.md` (sync after every deploy), `claude/user-CLAUDE.md`, `PROJECT.md`, `skills/skills-list/SKILL.md`, this reference |
| Human sources behind the harness (`credits`) | `THIRD_PARTY_NOTICES.md`, `skills/design/references/upstream.md`, `skills/harness/retrospective/references/sources.md`, principle and pattern source anchors; the visible credits supplement retained notices |

What each skill and method can do (its steps, and the supporting material it
loads as needed) is not drawn here. It lives in `site/src/lib/capabilities.ts`
and shows on the site's Skills by stage page, whose build fails when that file
and the skills on disk name different sets. When a skill changes what it does
or loads, refresh its entry there.

## When to refresh

- A file in the table above changes in a way the figure shows.
- A role binding changes: model, effort, runtime, or a role added or removed.
- A hook is added, removed or changes what it runs for.
- A skill is added, retired, renamed or moves group.
- A check is added or removed.
- A drawn repository changes a hook, a workflow, its branch rules or its push
  step, or a shared gate (the stub check, the Impeccable hook, push review)
  changes where it runs.
- `checks/harness-guide.ps1` fails.

## Procedure

1. Re-derive the numbers from the source, from the repository root:

   ```powershell
   node skills/skills-list/scripts/list-skills.mjs --source filesystem --no-default-roots --root skills --format tree
   (Select-String checks/run-all.ps1 -Pattern "File = '").Count          # PowerShell checks
   (Select-String checks/run-all.ps1 -Pattern "RelativeTest = '").Count  # Node suites
   (Get-Content claude/claude-map.json -Raw | ConvertFrom-Json).roles
   ```

   The tree's header gives groups and skills; leaves are skills minus groups.
   The map's `roles` gives the agent-file count and which roles run on Codex.
   Models and efforts come from the Claude Code roles table in `MODELS.md`
   for the Claude Code figure and from `agents/*.toml` for the Codex figure.
2. Edit only what changed. Leads and captions are one or two sentences each: the
   drawing labels its participants and relationships, and the caption supplies
   only the consequence or limit it cannot show. Never explain the marks (blue
   arrows, pills, dashes) in a caption or note; the page key does that, and a
   figure that needs it explained is redrawn. No connector crosses another where
   a route avoids it. Keep all figures at one rendered coordinate scale so
   shared text classes have the same screen size; extend geometry rather than
   shrinking type. Re-measure changed glyph labels and attached guides in the
   running page.

   Keep the visual language: the colour tokens, the
   box classes (`bcl` Claude runtime, `bcx` Codex runtime with a grey fill
   for installed files and steps, `role` an agent card, always unfilled
   whatever its runtime border, `ro` dashed read-only, `bac` accent, `pill` a
   group lead card or, in A typical delivery, a step), `sk` for a skill
   named inside sans text and the label insets. When a figure grows, extend
   its `viewBox` and separators instead of shrinking type. Update each SVG's
   `aria-label` and the figure's caption with it. No em dashes.

   The page key ("How to read the figures") is the authority: every figure
   obeys each entry, and a new page-wide mark gets an entry there. Blue text
   means an agent role and nothing else: every role name in every figure
   carries `ag`, inside a longer label as `<tspan class="ag">`; a label on a
   blue line stays neutral, the line carries the blue. Blue lines, arrows and
   borders are explained in each figure. In A typical delivery, a pill is a
   step and reads exactly three lines: the step (`h`, `data-group`), about
   three words on what it does (`s`), and the leading agent (`l ag`, generic
   names such as worker and reviewer), with an empty `l ag` text when no
   agent leads it. A skill is written `/name` in monospace everywhere (tree
   text with no class, `sk` inside sans text, `<code>` in prose) and a nested
   method by its path without a slash (`design/review`). Each pill, band or
   box is a tree's root: the lead skill (`data-lead`) hangs from it on an L
   connector, a vertical then a short tick, and every other skill hangs from
   its parent the same way; references and review hang on dashed branches.
   A skill named again outside its tree carries `data-skill` and sits only on
   a dashed reference branch. Bands and on-demand boxes follow the same
   order: name, what it does, agent, then the tree. Inside an on-demand box the tree
   runs across, not down: the lead hangs from the header on an L, its leaves
   sit in a row and nested methods in a second row, each dropping from a
   short rail, so the box stays only as tall as its rows. The page calls the
   session you talk to the team lead, never main, and the coordinator chat
   the coordinator; the Codex roles figure comes before the Claude Code one.
3. After any role file or sync change, run
   `node guide/scripts/embed-role-configs.mjs --apply`, so each role card's
   Instructions and Raw config views show the file as it now stands (`--check` reports a stale copy, and
   an absent `~/.claude/agents` file as unverifiable without failing).
4. Run `node skills/design/drawing/scripts/svg-connectors.mjs guide/harness-guide.html`
   and repair gaps, wrong-facing heads or lines crossing labels; then check the
   actual connectors and glyph edges in the browser. Update the stamp date and
   the Sources section: re-date each row whose
   files were re-checked and add any file a figure now rests on.
5. Check the page in the browser pane at desktop width and at the mobile
   preset, each in light and dark. The pane renders a local file light
   whatever `colorScheme` is asked for, so switch the page itself: set
   `data-theme="dark"` on the root element with the javascript tool, then
   remove it. Look for overlapping or clipped labels, and open a role card in
   each roles figure by hover, keyboard focus and a mobile tap. Figures scrolling
   sideways on a phone is expected.
   Inspect both panel views: all instruction text stays readable, Raw config is
   complete, metadata is separate, and focus/hover/tap, Escape/Close and focus
   return work. The desktop panel is about 460px wide and 420px high at most.

6. Run `pwsh -NoProfile -File checks/harness-guide.ps1`, publish to the fixed
   URL as above, and record nothing else: the source and its Sources section
   are the record.

## What this is not

- Not a redesign step. Layout, palette and type change only when the owner asks.
- Not a place for project facts. The page describes the harness; a project's
  commands, paths and decisions stay in that project. The quality-gates figure
  shows per-repository gate wiring only to illustrate how the shared gates are
  applied.
