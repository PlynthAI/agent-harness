---
type: "principle"
title: "Redesign from first principles"
description: "Apply when a new requirement meets an existing design: redesign as if the requirement had been a founding assumption from day one, instead of bolting it on."
applies_to: ["plan", "diff"]
---
# Redesign from first principles

When integrating a change, don't bolt it onto the existing design. Redesign as if the requirement had been there from the start.

- Read all affected files and understand the current design
- Ask: "if we were writing this from scratch with this new requirement, what would we build?"
- Propagate the change through every reference: types, docs, examples, rationale sections
- Think about the whole redesign, then deliver it incrementally

This is the method for preserving option value when integrating changes into an existing design.
