---
name: unslop
description: Finish existing prose by removing AI tells while preserving meaning, facts and voice. Use for "unslop this", "make this read less like AI", "tighten the prose" or a final deliverable pass. Drafting stays with writing; chat replies are excluded.
---

# Unslop

The last pass on a written deliverable: find the patterns that make text read as
machine-written and rewrite them, keeping the meaning, the facts and the
project's voice. Apply it to the existing text for an editing request, or after
a new draft is right.

## What it applies to

Documents, repository docs, emails, app copy, PR bodies, commit messages and
articles. Not chat replies and not code; the "Talking to me" section of the
user-level AGENTS.md already covers chat. The project's own voice or style
guide wins where it and the catalogue disagree.

For academic or research prose, preserve hedges, claim strength, terms of art,
citations and venue conventions. The catalogue never overrides discipline usage.

## The pass

1. Scan the text against the [catalogue](references/catalogue.md).
2. Rewrite each hit. Keep the meaning, the claims, the real names of symbols,
   files and commands, and any quoted material exactly as they were.
3. When a rule makes a sentence worse, fix the sentence another way or leave it.
   The rules serve the reader.
4. When reporting what changed, cite rules by number ("cut 7 and 23"). The
   numbers are stable ids; a retired rule leaves a gap and is never reused.

## Hand on

Return the revised text to the caller: [writing](../SKILL.md) for a
drafted or revised deliverable, delivery's [PR writing](../../delivery/references/pr-writing.md)
for a PR body, or the article workflow that requested the pass.

## References

- [references/catalogue.md](references/catalogue.md) - the numbered patterns
  and their fixes.
