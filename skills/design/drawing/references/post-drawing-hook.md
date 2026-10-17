# Post-drawing hook

The harness owns the requirements in [post-drawing.md](post-drawing.md) and the
stateless [command](../scripts/post-drawing.mjs) that emits them. The Drawing
Tools plugin and Impeccable engine retain their own checks.

Codex's `PostToolUse` registration is in the harness's `hooks/hooks.json`.
The callback emits a nonblocking reminder after recognized SVG edits and
completed Drawing Tools operations. Starting an asynchronous render is not
completion. The script neither judges an image nor records a visual pass.

| Recognized event | Evidence used by the callback |
| --- | --- |
| `Write`, `Edit`, `apply_patch` | A `.svg` target, or a changed SVG root, shape, group, text or use element in a supported page/component file |
| Drawing Tools `get_render` | The requested job's response has `state: "done"` |
| Drawing Tools `check`, `snapshot` | A successful response for the requested job with the tool's expected result fields |

Failed or unconfirmed renders, unrelated edits and read-only tool calls stay
quiet. Repeated completed observations can repeat the reminder; the hook keeps
no session state or completion ledger.

Shell render commands, including the Drawing Tools CLI, use explicit completion.
Native Codex shell callbacks provide raw command output without a structured
exit code. The reminder does not infer successful completion from that text.
After a successful shell render or generator such as `node build.mjs`, or an
inline revision the callback cannot recognize, such as label-only or attribute-only
edits without a recognized element tag, call the script with
`--complete` as the drawing method requires.
This prints the same requirements directly and also works without an automatic
hook. Its use depends on the agent following the method.

## Installation and proof

The normal harness copy map carries the script and reference under `skills/`
and the registration as the Codex home's `hooks.json`. Preserve unrelated
operator hooks during reconciliation. Installing these files does not approve
the hook or prove that the current chat loaded it.

Review and trust the exact new entry through Codex's hook controls, then use a
fresh consumer to exercise a drawing edit and a completed MCP render. Inspect the
actual hook event, result and model-visible requirements. Keep that runtime
evidence separate from stdin fixtures, shell tests and byte comparison. Other
runtimes use the explicit completion command until their own registration is
implemented and verified.

The supported event and trust contracts are documented in
[Codex hooks](https://learn.chatgpt.com/docs/hooks). The host's current release
and actual callback evidence determine runtime coverage.
