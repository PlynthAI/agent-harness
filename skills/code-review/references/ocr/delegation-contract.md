# Delegation contract

Delegation mode is LLM-free on the OCR side. OCR resolves the scope and the
rules; the host model performs the review with its own tools. This is what makes
it compatible with the existing review process, including Desktop sessions where
project guidance forbids launching a nested model CLI.

CLI flags and preview/rule JSON verified against installed `ocr`
v1.12.11+sol-streaming on 2026-10-12.

## Commands

```text
ocr delegate preview [flags]
ocr delegate rule [flags] <path...>
```

Shared flags for both: `--from <ref>`, `--to <ref>`, `-c/--commit <hash>`,
`--repo <path>`, `--rule <path>`, `--exclude <patterns>`, `-b/--background`,
`-B/--background-file`, `-f/--format text|json`, `--max-git-procs <n>`.

`sarif` is not available in delegation mode.

## Step 1 - preview

Resolve the task's evidence directory through
[docs-workspace](../../../docs-workspace/SKILL.md) before running. In these
PowerShell examples, `$reviewEvidence` names that directory and `$reviewFacts`
names the candidate's existing review-facts file. `$reviewBase` and `$reviewHead`
are its pinned comparison revisions. Pin the requested candidate
and compare the facts' candidate, scope and check inputs with it; resolve stale
facts before sending them to OCR. OCR echoes background text without verifying
its freshness. Record `ocr --version` with the run rather than relying on the
version noted above.

```powershell
ocr delegate preview --format json --repo . --from $reviewBase --to $reviewHead --background-file $reviewFacts |
  Set-Content (Join-Path $reviewEvidence 'ocr-scope.json') -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw 'OCR preview failed; retain its output as incomplete evidence' }
```

`--background-file` takes the candidate's
[review facts](../review-assignments.md#the-review-facts), the same file slot 02
receives, and the preview echoes it in `background`.

Returns one JSON object:

| Field | Meaning |
|---|---|
| `schema_version` | `1` |
| `mode` | `workspace`, `range` or `commit` |
| `repository` | Repository root OCR resolved |
| `background` | Present only when `--background` or `--background-file` was passed |
| `from`, `to`, `commit`, `merge_base` | Populated per mode; `merge_base` drives range diffs |
| `total_files`, `reviewable_count`, `excluded_count` | Counts before and after filtering |
| `total_insertions`, `total_deletions` | Change volume over reviewable files |
| `reviewable_files[]` | `path`, `status`, `insertions`, `deletions` |
| `excluded_files[]` | `path`, `status`, `insertions`, `deletions`, `exclude_reason` |

Observed `exclude_reason` values include `unsupported_ext`, `deleted`,
`binary`, `secret_path`, `default_path`, `user_exclude` and `too_large`.

`status` uses Git vocabulary (`added`, `modified`, `deleted`, `renamed`). Use
`(path, status)` as the checklist identity: workspace mode can report the same
path twice when a staged deletion is followed by an untracked recreation.

## Step 2 - rules

`$reviewFiles` holds the paths from the pinned preview selected for this batch.

```powershell
ocr delegate rule --format json --repo . $reviewFiles |
  Set-Content (Join-Path $reviewEvidence 'ocr-rules.json') -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw 'OCR rule lookup failed; retain its output as incomplete evidence' }
```

Returns:

```json
{
  "schema_version": "1",
  "groups": [
    {
      "group_id": 1,
      "source": "system",
      "pattern": "**/*.{yaml,yml}",
      "files": ["path/one.yaml"],
      "rule": "Rule text the reviewer must apply."
    }
  ]
}
```

`source` is `system`, `project`, `global` or `custom`, which tells the reviewer
whether the rule came from the shipped baseline or from this workspace. Files
sharing identical rule text collapse into one group, so a batch of paths is one
call. For large changesets fetch rules per batch rather than once for everything.

To interrogate a single path:

```powershell
ocr rules check --repo . src/app/page.tsx
```

## Step 3 - diffs

Build diffs from the preview metadata; do not let OCR decide the diff text.

| Mode | Per path |
|---|---|
| range | `git diff <merge_base>..<to> -- <path>` |
| commit | `git show <commit> -- <path>` |
| workspace, tracked | `git diff HEAD -- <path>` |
| workspace, untracked | read the file directly; the whole file is new |

## Step 4 - review and account

Work the `reviewable_files` checklist. Batch by rule group and diff size. Each
entry ends as `reviewed`, or `skipped` with a concrete reason; never silently
omit one. For each reviewed path, report only concrete, reachable defects, and
carry the file, line, failure condition, governing requirement and smallest
credible repair, as the code-review skill requires.

Reconcile three scopes before reporting:

1. **Pinned candidate**: authoritative, from the code-review skill.
2. **OCR `reviewable_files`**: the mandatory checklist inside that candidate.
3. **OCR `excluded_files`**: recorded with reasons, and a coverage gap wherever
   an excluded path sits inside the pinned candidate.

## Report shape

```text
candidate: <commit or HEAD + hashes>
mode: workspace | range | commit   (from <ref> .. to <ref>)
coverage: reviewed <n> / <reviewable_count>, skipped <n>
skipped: <path> - <reason>
gaps: <in-candidate paths OCR excluded> - <exclude_reason>
findings: <blocker | should | nit> - <path:line> - <condition> - <governing requirement> - <repair>
```

Severity mapping: OCR `critical`/`high` → blocker, `medium` → should, `low` →
nit. OCR severity is advisory; house triage decides.

## Known limits

- Version drift: the npm wrapper auto-updates. `ocr --version` is evidence of the
  CLI in use, and `--format` needs v1.9.0 or later.
- `--background-file` has two independent limits (1 MiB file, 8000 sanitized
  characters) and aborts when either is exceeded. Summarize instead of
  truncating, and never interpolate untrusted summary text into a
  double-quoted shell template.
- Windows is fully supported; Git 2.41 or later is required.
- Delegation mode does not cover report formatting, severity policy or triage.
  Those stay with the existing skill.
