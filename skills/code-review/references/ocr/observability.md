# Inspect a native OCR run

Use this when inspecting findings, diagnosing progress or checking telemetry.
The viewer and collector serve every repository in the same OCR home. Host
addresses, ownership and recovery commands belong to the harness setup guide's
Native OCR section. Opening the viewer is optional for an ordinary completed
review.

## Find the matching session

Start with the run's `slot-02.json`. Its `raw.result` points to the native JSON
result, which carries `session_id`, optional `trace_id`, and reported timing and
tokens. The slot record itself carries candidate identity, actual provider and
model, coverage and raw file paths. Token usage lives in the slot record's
`usage`, copied from the native result's `summary`.

```text
ocr session list --repo <checkout> --json
ocr session show <session-id> --repo <checkout> --json
```

Match the checkout, session ID, candidate and run time. The list supplies
`file_path`; `session show` supplies it under `summary.file_path`. A repository
name or the newest session alone cannot identify a run when reviews overlap.

Reuse a viewer only after checking its executable, process identity, OCR home
and listening address. If none exists, start one in an owned terminal:

```text
ocr viewer --addr 127.0.0.1:5483 --open never
```

Open the reported URL in the Codex browser. Select the matching checkout and
session, then check the displayed commit, model and coverage. Keep the resulting
detail URL in the existing review record. To construct that URL, use
`<viewer-url>/r/<encoded-repo-folder>/<session-id>`, where the repository folder
is the basename of the parent folder of `file_path`; URL-encode both path segments.

## Diagnose activity and failure

For a running review, inspect the matching session JSONL and the owning
process. Project only event type, timestamp, item path, duration and error or
success status when reporting activity. The JSONL contains prompts, source
excerpts and tool results; avoid dumping whole records into chat.

`llm_request`, `llm_response` and `tool_call` show work. Investigate `llm_error`,
failed tool calls and `review_item_failed` promptly. Individual tool errors can
recover; the terminal manifest determines the resulting coverage. Session
writes are buffered between checkpoints, and the adapter writes its captured
stdout and stderr after the child exits. Neither file silence nor a quiet
model request proves failure.

The viewer can label a live session **aborted** until `session_end` arrives.
Treat that label as an unfinished session, then inspect process and event
evidence. Use the terminal manifest and slot outcome to decide completion,
including failed, waived and excluded paths. Viewer availability, exit zero
and comment counts do not establish a complete review.

## Verify telemetry for that run

Inspect the collector's exact identity, mounts, logs and listening endpoint
using the host guide. A running container or an open port proves readiness,
not a successful export. Read fresh trace records matching the result's
`trace_id` and run time; check repository and model attributes when present.
Search the current file and its rotations without printing entire batches:

```text
rg -l --fixed-strings <trace-id> <resolved-trace-files>
```

Record the matching spans and their timestamps in the existing evidence. If
the result has no trace ID, or files have rotated away, mark correlation
unavailable. Current settings and unrelated fresh metrics cannot prove that
an earlier run exported traces. A telemetry shutdown warning is an
observability failure; assess review completion separately from its manifest.

Keep raw HTTP capture and content telemetry off. `OCR_RAW_LOGGING=1` captures
request and response bodies; it also buffers subscription streams until EOF
in the current build. Session history already supports finding inspection.

## Keep a useful receipt and release owned services

Add the session ID, viewer link, trace correlation when available, reported
elapsed time and tokens to the task's existing review record. Retain actual
provider, model, candidate, coverage gaps and owner adjudication. Token totals
are reported usage, not cost, and can omit auxiliary calls. Record missing
evidence as unknown; judge quality from confirmed and rejected findings and
duplicates, rather than the number of comments.

For a viewer you start, retain the supervising session or PID and start time,
executable, URL, logs, owner and stop command. Stop it through that supervisor
when done, unless explicitly retained for a named owner. Preserve a reused
viewer or shared collector. Recover the existing service using its recorded
configuration and mounts; a connection refusal does not justify changing the
provider, disabling telemetry or creating another collector.

Commands and record fields checked against installed v1.12.11+sol-streaming
and its pinned source on 2026-10-04. The host guide records installation and
service details separately.
