# Runtime forensics

pstack's runtime-forensics playbook, kept as written apart from the harness
owners it hands to.

**You own the diagnosis. Instrument the live process, don't theorize from source.** The deliverable is a cited diagnosis, not a fix.

1. Capture the live signal on the matching surface with the runtime tools
   [browser-verification](../../browser-verification/SKILL.md) selects: a CPU
   profile for a spinning process, a heap snapshot for a leak, a CDP trace for a
   visual glitch. A real artifact, not a guess. Keep it at the workspace's
   `artifacts` route through [docs-workspace](../../docs-workspace/SKILL.md),
   not in the code tree.
2. Reduce the artifact to the smoking gun: the function on the hot path, the
   retainer chain from the leaked object to a GC root, the loop firing without
   input. Hand a large artifact to an `explorer` through
   [orchestrate-work](../../orchestrate-work/SKILL.md) to parse, and keep the
   reduced finding in the main thread; the raw artifact is bulk the main context
   does not need.
3. Prove the mechanism before believing it. Inject instrumentation via CDP eval
   on the running process, or hotfix the live code without reloading, to confirm
   the hypothesis cheaply.
4. Map the finding back to source: file, symbol, the line that allocates or
   schedules.

**Reply:** the signal captured, the reduced finding, how you proved the
mechanism, the source location, artifact paths. No fix unless asked. Hand back to
[diagnosing-bugs](../../diagnosing-bugs/SKILL.md) once the cause is known.
