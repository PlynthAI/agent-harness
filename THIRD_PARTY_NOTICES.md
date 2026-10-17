# Third-party notices

This file accompanies the shared harness when its adapted skills are copied to
the user-level installation. The notice text below replaces repeated licence
files inside individual skills. It does not grant rights to a project or asset
outside the harness.

The harness maintains these skills locally. The sources and revision anchors
below identify material adapted into them; they do not mean the local copies are
automatically synchronized with upstream.

| Source | Revision used or comparison anchor | Adapted material |
| --- | --- | --- |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9) | `a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9`; MIT, repository `LICENSE` (Copyright (c) 2026 Leonxlnx) | Selective, locally maintained subject-evidence and rendered-comparison methods, four image-provider adapters and credits in `design/scripts/assets.mjs`, and feasibility/summary adaptations in `design/scripts/compositions.mjs`. Exact units and local departures are recorded under the Taste MIT notice below. Existing project authority, browser/artifact routes and concern dispositions govern; no tracked whole package, upstream driver or site imagery is carried. The older `3c7017d` assessment remains historical in the design upstream reference. |
| [mattpocock/skills](https://github.com/mattpocock/skills) | `24fe0ef7737efae15c87225755e9f6f5965e4888`; package `1.3.1` where declared | brainstorm, code-review, delivery, diagnosing-bugs, domain-modeling, implement-spec, planner, research, tdd, to-spec, to-tickets, wayfinder, writing; also the logic part of design/prototype. On 2026-10-02 planner's `architecture` reference restored `codebase-design`'s fixed word list, its seam rules (the deletion test, the interface as the test surface, one adapter a hypothetical seam and two a real one) and the four dependency categories from `DEEPENING.md`, keeping the softer test-replacement rule; planner's `audit` reference carries the two read-only steps of `improve-codebase-architecture` (scoping by hot spots, the friction walk, and the candidate card with its strength rating), without the HTML report, the grilling loop or its glossary and ADR edits, and adds the binding, departure and debt sorting the upstream scan lacks. On 2026-10-05 the harness skill's retrospective reference carries `retro`'s 1.3 additions (the no-guardrail finding, a deterministic check for a mechanical violation, tool economy and information access as separate candidates) beside an opt-in multi-session reading of the harness's own, and domain-modeling's `CONTEXT.md` became `GLOSSARY.md` following upstream |
| [humanlayer show-me](https://github.com/humanlayer/humanlayer) | Reached through mattpocock/skills `pr/CREDITS.md` at `24fe0ef`, which adapts its list of summary visuals; Apache-2.0; revision unrecorded | The kinds of visual named in delivery's pr-writing reference (pseudocode, call tree, component tree, file tree, Mermaid); paraphrased, no text copied |
| [jakubkrehel/skills](https://github.com/jakubkrehel/skills) | `267330e1adfc66a718fb65fa6918c1f06d0a689e`; MIT, repository `LICENSE` (Copyright (c) 2026 Jakub Krehel) | design/colour, design/layout, and design/app-ui references |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | `85e8e2363b713506e1d5b6e07a0eb2da66be1bc3`; MIT, repository `LICENSE` (Copyright (c) 2026 Emil Kowalski) | design/mobile-native, design/motion references, design/sourcing, and the visual part of design/prototype |
| [bergside/typeui](https://github.com/bergside/typeui) | `2a977f1f6616ae8a5ea84a478ca35601c67f4322`; MIT, repository `LICENSE.md` (Copyright (c) 2026 Bergside LLC) | design/app-ui typography reference |
| [Cursor pstack](https://github.com/cursor/plugins/tree/main/pstack) | `ecc249f1e306fc64ddf83c7bed16cacf7c2239db`; compared identical to `adf3218ca2f5b9971eedc07a76bef22df7701539` on 2026-09-29 | validate-implementation setup and maintenance reference; the harness library authoring reference (the `authoring-a-skill` playbook); understand/how, understand/why and understand/teach carried with their references (nested as methods on 2026-10-03), the upstream model-config rule and explicit-only flag replaced by shared roles, and why's source model replaced by the harness's own source order on 2026-09-30; investigate (the `investigation` playbook with the `runtime-forensics` and `trace-forensics` playbooks as references); delivery's `babysit` and `worktree-cleanup` playbooks and the `bugbot-triage` rubric as references, with the `watch-pr` watcher (bun, `commander` 14.0.0 under MIT) as a script; the Origin, Autopilot and Cursor paths are removed, the cleanup's forced removal is replaced by the retirement reference's route, and the upstream `worktree-audit.sh` was replaced on 2026-10-06 by the locally owned `repo-inventory.mjs`, which keeps its bucket idea and reads Claude Code and Codex session roots for the transcript scan; hillclimb (the `hillclimb` playbook as a skill, its attempts assigned to the smart_worker role, with the `show-me-your-work` trail carried as its decision-log reference, template and `log.sh` helper under the playbook's own columns; the cross-model trail review and the Cursor transcript path are removed); planner's `sketch-first` reference (the `architect` skill with its `runner-prompt` discipline folded in, the arena replaced by planner writing at least two structurally distinct candidates itself, the `rationale-template` sections folded into the existing `writing-plans` reference, `interrogate` replaced by the reviewer role), `design-red-flags` copied whole, and the `exhaust-the-design-space`, `foundational-thinking`, `outcome-oriented-execution`, `redesign-from-first-principles`, `fix-root-causes` and `subtract-before-you-add` principles carried in the principles and patterns library's `principles/` with their descriptions rewritten as one-sentence front matter (moved out of planner on 2026-10-02), `subtract-before-you-add` gaining the `laziness-protocol` principle's prefer-deletion and question-the-threading rules at `adf3218`; the library's trial principles `type-system-discipline`, `boundary-discipline` and `model-the-domain` at `adf3218` on 2026-10-02 (the links to `typescript-best-practices` and `encode-lessons-in-structure` removed, parse-at-the-boundary left to `boundary-discipline`, which names its Alexis King and Gary Bernhardt sources and defines a system boundary, and domain names left to the domain-modeling skill); tdd's unobservant-test anti-pattern (the `test-behavior-not-implementation` principle's every-call-returns-nothing check and its constant-pin shape, at `adf3218`); orchestrate-work's programme, long-runs and autonomy references (the `orchestrate` playbook as the programme reference, with the `orch` CLI, cloud placement, Cursor dashboard and Graphite mechanics removed and the store moved to the project workspace; the `autonomous-run`, `session-pickup` and `pause-safely` playbooks as the long-runs reference; the poteto-mode Autonomy section, its classify-the-fork trigger and the `guard-the-context-window` and `never-block-on-the-human` principles as the autonomy reference) and the poteto-mode Subagents ownership paragraph and todo-list rule carried into the skill; recall (the `recall` skill, its sources reordered so the project workspace comes first and the shared record last, the Cursor transcript path replaced by the Claude Code and Codex session roots, the fast-model subagent fan-out assigned to the explorer role, the explicit-only flag and the unslop-written brief removed); validate-implementation's blast-radius reference (the `blast-radius` skill, the arena step replaced by the reviewer role and the caller list pointed at orchestrate-work's code-intelligence reference) and two sentences from the `prove-it-works` principle; writing/unslop (nested as a method on 2026-10-03; the `unslop` catalogue with its stable rule numbers as a reference, applied to deliverables only in place of the upstream "must always apply", the explicit-only flag removed and the em-dash rule restated to match the user-level AGENTS.md); writing's technical-writing reference (the `technical-writing` skill on 2026-09-30: its Diataxis, Google developer style, STE and Global English layers, rhythm rules and worked example, absorbing the earlier repository-docs mode; the explicit-only flag, tab indentation, the propose-a-diff-to-unslop step and the repo-specific PR rules removed, with PR bodies left to delivery's pr-writing); the principles and patterns library's `patterns/typescript.md` (the `typescript-best-practices` skill's `references/patterns.md` at `adf3218`, its examples kept and each rule restated as a review tell, the explicit-`any` case left to `@typescript-eslint/no-explicit-any`, and the skill's own `Real tests` and `Structured telemetry` rows not carried) |
| Codex system `skill-creator` | Installed with Codex under `skills/.system/skill-creator`; Apache-2.0; version unrecorded by the package | the harness library skill template and description guidance |
| [obra/superpowers writing-plans](https://github.com/obra/superpowers/tree/8ca22dba9a94f28898bbce59f2537ff4d87c747d/skills/writing-plans) | Operator-supplied plan template retains upstream wording; original revision unrecorded, official comparison anchor `8ca22dba9a94f28898bbce59f2537ff4d87c747d` | planner's writing-plans reference, adapted for this harness |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Skill version `4.3.1`, from release `skill-v4.3.1` (commit `cd12f8660e2dde57b9615c8a6b8ea674101f9cfc`) `universal.zip` (SHA-256 1DEEA4CDFB1608DF6D9E08EF359629E7CC866A22AB7C2195A835627B887F190B), its `.agents/skills/impeccable` Codex variant; engine `0.1.5` binaries from release `engine-v0.1.5`, not stored here but fetched by `config/deploy.ps1` against the per-platform SHA-256 recorded in `config/install-map.json`; Apache-2.0 | design/impeccable, trimmed to the commands the design skill routes to and adapted by `config/port-adaptations/impeccable-relative-script-paths.ps1` (entrypoint name, skill-relative launcher paths, harness install section, launcher defaults), checked by `checks/port-adaptations.ps1` |
| [modern-screenshot](https://github.com/qq15725/modern-screenshot) | Bundled by Impeccable 4.3.1; library version unrecorded; SHA-256 BB36665889124A0B6E15F16045265737449C3BDCF2712CDB08AF3CFA01563E2B | design/impeccable/scripts/modern-screenshot.umd.js; MIT |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Brought from the operator's frontend project `.codex/skills/shadcn` at `f1965096`; MIT | design/shadcn, renamed entrypoint; its frontmatter description was shortened locally on 2026-09-30, keeping the upstream trigger tokens |
| Owner's drawing-engine skill source | Working-tree source, manifest `0.1.0`; no source commit existed at port | design/drawing, consolidated from nine method entrypoints |
| OpenAI Product Design plugin (`product-design`, Codex `openai-curated-remote` catalogue) | Version `0.1.56` as installed on 2026-10-06; manifest `.codex-plugin/plugin.json` SHA-256 ae34a0f8e430014836a88f63ae7d8ac1ce3a28401122676e014c772ee523b77d, per-file hashes in the package's `integrity.json`; licence declared `Proprietary` in the manifest, with no LICENSE or NOTICE file in the package | Adapted from, on 2026-10-06: design/ideate (`ideate`: the brief, frame sizes, named directions on distinct axes, numbering by displayed order and the feedback loop; the per-runtime image route and the no-image-tool fallback are the harness's own), design/audit (`audit` with its `design-audit-framework` reference: the capture-then-judge step loop, evidence rules, flow-level questions and inline report; judgement categories left to design/review and design/impeccable, canvas layout rules not carried) and design/ux-research (`research`: scope restatement, source fan-out, clustering, ranking and the brief's shape, renamed so it is not confused with the shared research skill). Methods restated in harness words because the package is proprietary; no upstream file, prompt or passage carried, and Product Design's own router, user-context preflight and templates not used. Its other five skills overlap existing methods and are not carried |
| OKF-derived workspace starter | Earlier starter, original source revision unrecorded | `harness-docs-starter` under Apache-2.0 (its `LICENSE`); the legacy `skills/docs-workspace/assets/workspace` copy was retired on 2026-09-30 |
| Owner's OKF wiki template | `6bd8eee10b57f9889d3348acc98884180ceac9e5`, staged byte-for-byte on 2026-09-23; Apache-2.0 | inbox's `scripts/check_okf.py`, copied unmodified on 2026-09-30 (SHA-256 EEA916246AF8485131048D535CBAC421D69809AD8D08FCB1C4A364C1B7A1AFDF) and run behind the `check-brain.mjs` wrapper |
| [supabase/agent-skills](https://github.com/supabase/agent-skills) | Tag `v0.1.9`, commit `544bfc56c89afe2b87b20017a59b2c6e9502a1fb`; MIT, repository `LICENSE` (Copyright (c) 2026 Supabase) | Adapted from: the principles and patterns library's `patterns/postgres.md` (`supabase-postgres-best-practices`, its rules restated in harness words, server tuning and monitoring left out) and `patterns/supabase-security.md` (`supabase`'s security checklist, with the definer-function rules from `supabase-postgres-best-practices` folded in); no upstream file carried |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | Commit `063bee94c3f4df8453406c830b0a7df0f2860278`; MIT as declared in the repository README ("License / MIT") and in each package's `SKILL.md` frontmatter (`license: MIT`); no LICENSE file upstream at that commit, and no copyright holder named | Adapted from: the principles and patterns library's `patterns/react-performance.md` (`react-best-practices`, about twenty of its rules restated in harness words) and `patterns/react-composition.md` (`composition-patterns`, restated in harness words); no upstream file carried. `web-design-guidelines` not used |
| [pydantic/pydantic](https://github.com/pydantic/pydantic) | Commit `29933d1c8cfc882a7640f4d831b09381b39aa311`, path `.agents/skills/pydantic`; MIT, repository `LICENSE` (Copyright (c) 2017 to present Pydantic Services Inc. and individual contributors) | Adapted from: the principles and patterns library's `patterns/pydantic.md`, the package's rules restated in harness words with harness-written examples; no upstream file carried |
| [Python typing documentation](https://github.com/python/typing/tree/dc0a8a924c99c6d6ab70f5dc4708e8e4017386ae/docs) | Commit `dc0a8a924c99c6d6ab70f5dc4708e8e4017386ae`; Python Software Foundation licence (repository `LICENSE`) | Adapted from: the principles and patterns library's `patterns/python.md`, rebuilt on 2026-10-02 from `docs/reference/best_practices.rst`, `docs/guides/type_narrowing.rst` and `docs/guides/unreachable.rst`, their rules restated in harness words with harness-written examples; no upstream file carried. Summary of changes, as the PSF licence asks: guidance reworded as review rules, examples replaced, and the tutorial explanation left out |
| [fastapi/fastapi](https://github.com/fastapi/fastapi/tree/e6942531f53bc49b86ecf73f9500abd0e22eef0b/fastapi/.agents/skills/fastapi) | Commit `e6942531f53bc49b86ecf73f9500abd0e22eef0b`, path `fastapi/.agents/skills/fastapi`; MIT, repository `LICENSE` (Copyright (c) 2018 Sebastián Ramírez) | Adapted from: the principles and patterns library's `patterns/fastapi.md`, the skill's `SKILL.md` and references restated as review rules in harness words; CLI, OpenTelemetry and library-choice guidance not used; no upstream file carried |
| [K-Dense-AI/claude-scientific-skills](https://github.com/K-Dense-AI/claude-scientific-skills) | `154988403bb5a18e9d3c0ce4e6d5e2e4b184a298`; MIT, repository `LICENSE.md` (Copyright (c) 2025 K-Dense Inc.) | writing's citations method (the `citation-management` skill version 2.3 carried whole on 2026-10-03 as writing/citations with its scripts, references and assets; the front matter reshaped to a nested method, em dashes removed, the sibling-skill cross-references replaced by writing's academic method; the MIT licence text below) |
| [K-Dense-AI/claude-scientific-skills](https://github.com/K-Dense-AI/claude-scientific-skills) | `154988403bb5a18e9d3c0ce4e6d5e2e4b184a298`; MIT, repository `LICENSE.md` (Copyright (c) 2025 K-Dense Inc.) | Adapted from: writing's academic method (writing/academic, 2026-10-03), a selective port of the `scientific-writing`, `literature-review`, `peer-review` and `venue-templates` skills restated in harness words for architecture, built environment and design research: the no-fabrication list, evidence outline, cross-section audit, revision loop and AI-use disclosure from scientific-writing; the search log, screening counts, extraction and thematic synthesis from literature-review, with the five-pass search framing from `research-lookup`; the reviewer confidentiality rule, self-review list and comment shape from peer-review; the currency rule, compliance note, official kit first, blind-review leak check and rebuttal rules from venue-templates. No upstream file, script, template, claim registry or hash ledger carried, the upstream instruction to cite the vendor's own paper not carried, and no package tracking; the MIT licence text below |
| [alibaba/open-code-review](https://github.com/alibaba/open-code-review/tree/v1.12.11) | v1.12.11, commit `a758d9cbfb689937c7857ad64b2dd66adb58c0c2`; Apache-2.0, Copyright 2026 alibaba/open-code-review Contributors | Deliberately tracked local patch at `config/ocr/ocr-v1.12.11-sol-streaming.patch`: Responses streaming support and custom-build updater protection, with regression tests. The full source and built CLI stay outside this library; `config/ocr/README.md` owns rebuild and retirement. |
| [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp/releases/tag/v0.11.0) | Release `v0.11.0`, `codebase-memory-mcp-windows-amd64.zip` SHA-256 6eb6beaf261b19e419766e78baf93cbc3cf1c6338cff8fb7c0234859f96d1685 (arm64 pin in `assets.json`); MIT, Copyright (c) 2025 DeusData | Not stored here. orchestrate-work's harness-authored `scripts/codebase-memory/install.ps1` fetches the pinned release (or takes a local mirror), verifies it and installs the binary with the release's own `LICENSE` and `THIRD_PARTY_NOTICES.md` beside it, outside the Codex home; `cbm.ps1` calls it. The cache owner-only DACL follows the release's `install.ps1`; no upstream file is carried in this library |
| [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) | npm package `@playwright/cli` `0.1.22` (pinned in `config/install-map.json`); Apache-2.0, package `LICENSE` (Copyright (c) Microsoft Corporation) | browser-verification/playwright-cli (METHOD.md and references): the package's agent skill text (`skills/playwright-cli`, `SKILL.md` and its references) trimmed to the commands agents need, with test generation, video recording and pull-request attachment text left out and element attributes folded into METHOD.md, the entrypoint renamed to a nested method without `allowed-tools`, and the harness profile, headed and output rules added. The CLI itself is installed from npm, not stored here; the Apache License 2.0 text is reproduced under "Apache License 2.0" below |

The impeccable package (Copyright 2025 Paul Bakaus, Apache-2.0) ships an
upstream `NOTICE.md`, reproduced in full under "Apache License 2.0" below as
section 4(d) requires. It credits ehmo's `platform-design-skills` under MIT for
the `ios.md` and `android.md` references, whose notice is under "MIT notices".
The `keep-codex-fast` skill had an MIT notice with no named copyright holder;
its exact notice is preserved below. Sources are compared with the official
project again before an upstream refresh. The local adaptation and its current
behavior are reviewed in the skill itself and relevant checks.

## User-supplied deepen pass

`skills/prompt-refine/references/deepen.md` preserves the paragraph supplied by
the operator in the 2026-10-14 prompt-refine integration request, verbatim and
with the operator's explicit instruction to retain its wording. The operator
attributes it to an OpenAI staff member; the author's identity, publication and
revision were not supplied or independently verified. No upstream package or
licence terms are asserted. Workflow integration instructions are maintained
separately from that paragraph.

Prompt-refine's base method is restored from the operator's frontend project
source at commit `d31e4a3cb6de4d6a9cecc24337675e1893880bfd`,
`.codex/skills/prompt-refine/SKILL.md`, also present in another of the
operator's projects before its harness consolidation. The restored method is locally maintained owned prose.

## MIT notices

The following notices are retained in full from the skill packages. Repetition
of the MIT grant keeps each copyright statement attached to its original notice.

### Leonxlnx (Taste)

Retained from the repository `LICENSE` at
`a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9`. These terms apply to the borrowed
repository material. They grant no rights in third-party site screenshots or
imagery, whose own terms and required credits remain separate.

The source units below are relative to `skills/taste-skill/` at that pin. They
form a locally maintained selective port, not a tracked whole package.

| Borrowed unit | Local destination and departure |
| --- | --- |
| `SKILL.md:50-60,64-67,123-145` | Inventory, claim/proof and subject-derived idea passages into `design/references/workflow.md`, linked from `ideate/METHOD.md`. Inventory quotas and automatic section deletion are omitted; facts, supplied claims and assumptions remain distinct, with application and diagram ideas permitted. |
| `references/critique.md`; `evals/evals.json` `how_to_run` and `evals[].{id,name,prompt,expected_output,files}` | Rendered assessment and fresh baseline/candidate comparison into review evidence/calibration and `design/evals/taste-port.md`. Public-site-only cases, house-style bans, image/motion quotas, weighted scores and inspector caps are omitted. Existing rendering, concern dispositions and bounded repair govern. |
| `scripts/assets.mjs`: selected image-provider/licence constants, lines 36-52; `short`, `noQuery`, `shape`, `esc`, `text`, `slug`, `queryWords`, `onSubject`, `mapLimit`, lines 152-183; `dims`, lines 201-226; `licenceLabel`, `licenceUrl`, `creditRequired`, `licenceNotes`, `credit`, `base`, lines 268-298 | Normalized image metadata, dimensions and credit helpers in `design/scripts/assets.mjs`. Local raster MIME/signature checks, injected I/O and selected usage records replace upstream execution and inferred usage. |
| `assets.mjs`: `searchOpenverse`, `fromOpenverse`, `wikimediaSizes`, lines 322-363; `commonsApi`, `commonsInfo`, `searchCommons`, `fromCommons`, `commonsLicence`, `applyThumb`, lines 366-417; `searchAic`, `fromAic`, lines 420-451; `searchMet`, `fromMet`, lines 454-475 | The same helper's four still-image adapters. Art Institute acquisition requires positive public-domain metadata and returned IIIF configuration; Met enrichment is bounded to 40 records. Provider and enrichment errors remain visible. No video adapter or bulk acquisition is carried. |
| `assets.mjs`: selected normalized credit fields from `getOne`, lines 715-766; HTML credit projection from `printCredits`, lines 839-860 | The same helper's local acquisition and credit output. Metadata-only inspection and an explicit checked selection include a provider-conditions snapshot. An explicit working root, strict ledger validation, SHA256 no-op repeats, owner lock, same-directory staging, exclusive image publication, ledger rename and rollback replace upstream write orchestration. Credits escape the full title and include intended use, subject relationship and edits. |
| `scripts/draw.mjs`: `imageryMode:207`, `directionPool:217`, `dealHero:257`, `sectionPool:371`, `dealReferences:396`, `siteCard:404` | Feasibility comparisons and summary/source projection adapted into `design/scripts/compositions.mjs`. Explicit surface, asset, content and exclusion prerequisites with deterministic fit/ID ordering replace random dealing, assumed photography, score thresholds and widened pools. Current catalogue source status is separate from reference assessment and item qualification; selected full notes are hash-checked. No home history, whole resource pack or upstream runtime is carried. |

```text
MIT License

Copyright (c) 2026 Leonxlnx

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Every (compound engineering)

The harness retrospective adapts selected ce-compound methods, originally compared
at `6be0932b91dc369508da19e6e2bc753b4c038830`. The
[official licence](https://github.com/EveryInc/compound-engineering-plugin/blob/main/LICENSE)
was verified on 2026-09-28; the historical raw licence URL was unavailable.

```text
MIT License

Copyright (c) 2025 Every

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Matt Pocock

```text
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
### Jakub Krehel

```text
MIT License

Copyright (c) 2026 Jakub Krehel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
### Emil Kowalski

```text
MIT License

Copyright (c) 2026 Emil Kowalski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
### Bergside LLC

```text
Released under MIT License

Copyright (c) 2026 Bergside LLC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
### Lauren Tan

```text
MIT License

Copyright (c) 2026 Lauren Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
### Unattributed notice from keep-codex-fast

```text
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
### Jesse Vincent (obra/superpowers)

```text
MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### shadcn (shadcn/ui)

```text
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Supabase (supabase/agent-skills)

From the repository `LICENSE` at tag `v0.1.9`, verified on 2026-10-02.

```text
MIT License

Copyright (c) 2026 Supabase

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Pydantic (pydantic/pydantic)

From the repository `LICENSE` at commit `29933d1`, verified on 2026-10-02.

```text
The MIT License (MIT)

Copyright (c) 2017 to present Pydantic Services Inc. and individual contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Vercel (vercel-labs/agent-skills)

At commit `063bee9` the repository has no LICENSE file. Its README ends with
"License / MIT", and the adapted packages' `SKILL.md` files declare
`license: MIT` in their frontmatter; no copyright holder is named anywhere. The
standard MIT text follows without a copyright line, because upstream states
none. Take the upstream LICENSE file at the next re-pin if one is added.

```text
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### FastAPI (fastapi/fastapi)

From the repository `LICENSE` at commit `e694253`, verified on 2026-10-02.

```text
The MIT License (MIT)

Copyright (c) 2018 Sebastián Ramírez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### K-Dense (K-Dense-AI/claude-scientific-skills)

From the repository `LICENSE.md` at commit `1549884`, verified on 2026-10-03.

```text
MIT License

Copyright (c) 2025 K-Dense Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### DeusData (codebase-memory-mcp)

From the `LICENSE` in the v0.11.0 release archive, verified on 2026-10-04. The
binary's own third-party notices ship in the same archive and are installed
beside it.

```text
MIT License

Copyright (c) 2025 DeusData

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### modern-screenshot

Vendored by the Impeccable package. The bundled file identity is recorded above;
its library version is not asserted. This notice matches the [official licence](https://github.com/qq15725/modern-screenshot/blob/main/LICENSE), verified on 2026-09-28.

The MIT License (MIT)

Copyright (c) 2021-present wxm

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### ehmo platform-design-skills

Credited by the Impeccable package's `NOTICE.md` as the source of
design/impeccable's `reference/ios.md` and `reference/android.md`. Impeccable
does not record the revision it used; this notice matches the
[official licence](https://github.com/ehmo/platform-design-skills/blob/dc2be825d8b439caea78e9eaa8fb3ac23b0ff3e9/LICENSE)
at `dc2be825d8b439caea78e9eaa8fb3ac23b0ff3e9`, verified on 2026-10-10. The
licence names no copyright holder.

```text
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Apache License 2.0

The legacy OKF-derived workspace starter carried the following licence text, as
does the owner's OKF wiki template that inbox's `check_okf.py` comes from.
The impeccable package is also licensed under Apache-2.0
([LICENSE at skill-v4.3.1](https://github.com/pbakaus/impeccable/blob/cd12f8660e2dde57b9615c8a6b8ea674101f9cfc/LICENSE),
"Copyright 2025 Paul Bakaus"). Its `NOTICE.md` at tag `skill-v4.3.1` (commit
`cd12f8660e2dde57b9615c8a6b8ea674101f9cfc`), verified on 2026-10-10, reads in full:

```text
# Third-Party Notices

This project includes content derived from third-party work, used under the terms of its original license.

## Platform Design Skills

The `skill/reference/ios.md` and `skill/reference/android.md` platform reference files are distilled from ehmo's `platform-design-skills` (Apple Human Interface Guidelines and Material Design 3 rules), rewritten in Impeccable's voice.

**Original work:** https://github.com/ehmo/platform-design-skills
**Original license:** MIT
**Author:** ehmo
```

```text

                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

## Python Software Foundation License

### Python typing documentation (python/typing)

The PSF License Agreement from the repository `LICENSE` at commit `dc0a8a9`,
verified on 2026-10-02. That file also carries the BeOpen, CNRI and CWI
agreements for historical Python releases, which are not reproduced here. The
summary of changes the agreement asks for is in the source table above.

```text
PYTHON SOFTWARE FOUNDATION LICENSE VERSION 2
--------------------------------------------

1. This LICENSE AGREEMENT is between the Python Software Foundation
("PSF"), and the Individual or Organization ("Licensee") accessing and
otherwise using this software ("Python") in source or binary form and
its associated documentation.

2. Subject to the terms and conditions of this License Agreement, PSF hereby
grants Licensee a nonexclusive, royalty-free, world-wide license to reproduce,
analyze, test, perform and/or display publicly, prepare derivative works,
distribute, and otherwise use Python alone or in any derivative version,
provided, however, that PSF's License Agreement and PSF's notice of copyright,
i.e., "Copyright (c) 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010,
2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022 Python Software Foundation;
All Rights Reserved" are retained in Python alone or in any derivative version
prepared by Licensee.

3. In the event Licensee prepares a derivative work that is based on
or incorporates Python or any part thereof, and wants to make
the derivative work available to others as provided herein, then
Licensee hereby agrees to include in any such work a brief summary of
the changes made to Python.

4. PSF is making Python available to Licensee on an "AS IS"
basis.  PSF MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR
IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, PSF MAKES NO AND
DISCLAIMS ANY REPRESENTATION OR WARRANTY OF MERCHANTABILITY OR FITNESS
FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF PYTHON WILL NOT
INFRINGE ANY THIRD PARTY RIGHTS.

5. PSF SHALL NOT BE LIABLE TO LICENSEE OR ANY OTHER USERS OF PYTHON
FOR ANY INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OR LOSS AS
A RESULT OF MODIFYING, DISTRIBUTING, OR OTHERWISE USING PYTHON,
OR ANY DERIVATIVE THEREOF, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.

6. This License Agreement will automatically terminate upon a material
breach of its terms and conditions.

7. Nothing in this License Agreement shall be deemed to create any
relationship of agency, partnership, or joint venture between PSF and
Licensee.  This License Agreement does not grant permission to use PSF
trademarks or trade name in a trademark sense to endorse or promote
products or services of Licensee, or any third party.

8. By copying, installing or otherwise using Python, Licensee
agrees to be bound by the terms and conditions of this License
Agreement.
```
