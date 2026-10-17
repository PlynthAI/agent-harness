# Plan: <task title>

Use a saved plan when it helps execution or handoff; a small clear task can stay
in the conversation. Delete unused sections and replace placeholders. Follow
the project's document route and keep task records out of code commits.

## Outcome and scope

<What will be true when finished, the boundary, and any material exclusions.
Link the requirement, spec or ticket this plan implements instead of copying it,
and copy any binding value it fixes - version floor, name, limit, copy - exactly.>

## Approach

<How to reach the outcome. Name the files or modules that change and what each
owns, the interfaces later work relies on (names, parameters, results), and the
meaningful dependencies that set the order. Say when a value or contract comes
from the requirements rather than a local choice.>

## Execution checklist

Keep one checklist for this task. Add phases only when they help order the work.
Update items in place as work advances; attach the check result or evidence link
to each completed item. Recording a decision or deferral does not complete the
implementation. The project tracker still owns deliverables and dependencies.

Each item is one action with a checkable result: the exact file, symbol or value
it touches, and, for a check, the command and the output that means it passed.
Fold setup, scaffolding and documentation into the item whose deliverable needs
them; split only where one item could be rejected while its neighbour passes.

### <Phase, if useful>

- [ ] <Bounded step, the path or symbol it changes, and its acceptance check.>
- [ ] <Next step and its acceptance check.>

## Risks and decisions

<Only material uncertainties, accepted decisions or constraints needed to carry
out the work. Record a blocker beside the affected checklist item.

Name the inputs or failure modes the requirements imply but no item covers, most
likely first, and add each one's check to the item that owns the code. Delete
this note once each is covered.>

## Links

<Only useful requirement, evidence or related record links not already above.>
