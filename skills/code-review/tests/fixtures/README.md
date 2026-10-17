# Slot-02 fixtures

These files are inputs to `tests/native-slot.test.mjs`. They carry no
credentials and no model traces: only the run manifest, the summary counts and
the coverage lists the adapter reads.

## Real captures

Copied byte-for-byte from actual `ocr` v1.12.7 runs recorded on 2026-09-20. They
are the integration evidence for the completed, the partial and the failed
shapes, and none was re-run to produce them.

| File | Source run | Shape |
| --- | --- | --- |
| `run-complete.json` | `discovery-native-ocr.json` | `complete`, 2 of 2 selected items completed, 0 findings |
| `run-partial.json` | `installer-native-ocr-retry.json` | `partial` with exit 0, 1 of 3 completed, 2 failed on `budget` |
| `run-failed.json` | `installer-native-ocr.json` | first installer attempt, `failed` with 3 of 3 failed on `budget` |
| `run-range-failed.json` | `astra-planner-native-ocr.json` | a `range` run, `failed` with 2 of 2 failed on `budget`; `requested_from` is the `resolved_base` it diffed from |

`run-partial.json` and `run-failed.json` are the reason coverage comes from
`manifest.coverage`: both report `summary.files_reviewed` equal to the number of
*selected* items, including the failed ones.

`run-range-failed.json` is the one real range manifest in this set: it carries
`input.mode: "range"` with `requested_from`, `resolved_base`, `resolved_head` and
`exact_range`, and every selected item failed, so the coverage is a `failed`
execution rather than a review. It is the real counterpart to
`run-range.json`, which models the same shape synthetically.

## Synthetic fixtures

Written for this adapter, marked here so no one mistakes them for captured
evidence. They carry placeholder ids (`0000...`, `1111...`, `2222...`) and no
real run produced them.

| File | Purpose |
| --- | --- |
| `run-empty.json` | a run that selected no items while reporting `complete` and a zero-finding summary: the case that must not read as a completed slot |
| `run-waived.json` | a mixed scope: one selected item completed, one waived rather than reviewed |
| `run-range.json` | a `range` manifest whose `resolved_base` is the merge base, not the branch endpoint the caller named |
| `scope-excluded.json` | the `ocr delegate preview` shape, used to name the excluded paths behind an empty selection |

### Why the range fixture exists

A range review is diffed from the range's **merge base**, not from the branch
endpoint a caller may name. The LLM-free delegation preview shows the split
directly: `ocr delegate preview --format json --repo <repo> --from b853afd --to
1debd26` reports `from: b853afd`, `to: 1debd26` and a different
`merge_base`. `run-range.json` models the manifest that a merge-base range would
produce - `resolved_base` is the merge base, `exact_range` is
`<merge-base>..<head>` - so the adapter is tested against the base it actually
diffed rather than against the endpoint that was requested.
