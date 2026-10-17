# Deepen pass

## Supplied text

The following paragraph is the user's supplied wording, preserved verbatim.
Its source context is recorded in the [central notices](../../../THIRD_PARTY_NOTICES.md).

> I want a deeper version of this task, not a bigger one. Before rewriting it: (1) say what a top professional in this field would do here that I'm not asking for; (2) name the rawest material they would start from instead of what has already been digested for me; (3) name the specific methods and tools they would use; (4) say what, other than you or me, would show the result is right. Then rewrite my prompt to ask for exactly that.

## Calling workflow

The supplied text above stays unchanged. These integration instructions sit
outside it and determine how each workflow uses it:

- Prompt-refine applies the full pass, returning the four observations and a
  rewritten prompt.
- Brainstorm uses the four questions to deepen the existing task as its direction
  becomes clear, then continues the discussion and task brief. A consequential
  unresolved choice returns to the discussion.
- Writing uses the four questions to deepen the current assignment, then
  continues its draft or revision within the authorised writing scope.

Brainstorm and Writing produce a rewritten prompt only when the user asks for
one; that request routes to [prompt-refine](../SKILL.md). The pass itself does
not authorise execution, new deliverables or external actions. Carry forward the
calling workflow's settled choices and constraints, and keep missing inputs or
unverified tool access explicit.
