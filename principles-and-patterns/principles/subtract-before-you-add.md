---
type: "principle"
title: "Subtract before you add"
description: "Apply when sequencing an addition, refactor or rewrite: remove dead code, redundant guards and stubs first, prefer deletion and the smallest change, then build on the simpler base."
applies_to: ["plan", "diff"]
---
# Subtract before you add

When evolving a system, remove complexity first, then build.

**Why:** Adding to a complex system compounds complexity. Removing first leaves less code, reveals the essential structure, and usually makes the next design obvious. Default to subtraction.

Make simplification a continual investment. Leave the design slightly simpler and more capable behind the same or smaller surface than you found it.

**The pattern:**
- Sequence removal before construction
- Prefer deletion: when asked to refactor or improve, look for removals before additions, and make the smallest change that solves the problem
- Cut before you polish (get to the minimum before investing in quality)
- Design for observed usage, not speculative edge cases
- No speculative validators, parsers, or guards beyond what the spec demands
- Question the threading: if a task asks you to pass a new signal through types, schemas, pipelines or similar layers, stop and look for a more direct path
- Simplify prompts (remove redundant instructions, excessive templates)
- When a reference has no novel content, delete it rather than leaving a stub
