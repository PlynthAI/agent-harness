---
name: prototype
description: Prototype a design question in a throwaway surface and hand the answer on. Use to compare distinct visual directions before committing, or to feel out a state model, API shape or edge case by pressing buttons. Not for implementing an accepted design, and not a stage every change passes through.
---

# Design prototype

One throwaway surface that answers one design question. The question picks the
mode, and the mode picks a reference; everything else here is what both modes
share.

## Pick the mode

- **"What should this look like?"** - the user is choosing between visual
  directions for a page, a screen or one piece of UI, and wants to judge real
  variants rather than mockups. Read [references/visual.md](references/visual.md).
- **"Does this logic or state model feel right?"** - the user wants to press
  buttons and watch state change: a state machine, a reducer, an API shape, a data
  model, or a case that only looks wrong once it is pushed through. Read
  [references/logic.md](references/logic.md).

Load the reference the question in front of you needs, and only that one to
start. The two modes produce different artifacts at different craft bars. If the
user explicitly needs both - a state experiment and visual alternatives - that is
two bounded phases: settle one question with its reference loaded, then take the
other and load that one. Do not open both at once, and do not quietly drop half of
what was asked.

When the question is genuinely ambiguous and the user is not reachable, take the
mode that matches the surrounding code - a backend module, a schema or a service
is logic; a page or a component is visual - say which you chose, and continue.

## What both modes share

1. **Throwaway, and visibly marked as such.** Put the prototype close to where it
   will actually be used so its context is obvious, name it so a casual reader can
   see it is not production, and follow the project's own routing convention for a
   throwaway route rather than inventing a top-level structure.
2. **Trivial to run.** One command from the project's own task runner for
   something that lives in a project, or one file the user opens directly for a
   shareable demo. Either way, no thinking required to start it, and a generated
   local file is checked over a loopback HTTP address rather than trusted from
   disk.
3. **Isolated from production.** No production code changes during exploration, no
   live data mutations, and no wiring the prototype into a real data path. Read
   what the question needs. Persistence is usually the thing being *checked*
   rather than something the prototype should depend on, so a question about
   persistence gets a scratch store or a local file that names itself as a
   prototype.
4. **The project outranks this method.** Its own stack, tokens, conventions,
   routing, auth and checks decide. A prototype stays inside whatever isolation,
   data and access rules the project already has.
5. **Verification is proportional and honest.** Run what the artifact actually
   needs - the mode's reference says what that is - and never claim a browser,
   device or check result you did not collect. A blanket "no tests, skip the
   polish" reading does not override a project's checks, its auth, or the
   validation a change already carries; a throwaway exploration is simply cheaper
   to verify than a shipped change.
6. **Hand it on.** A run returns a candidate, not a finished task. Record the
   question, the verdict and what was checked where the project keeps its task
   state, and leave the prototype itself wherever the project's own retention
   rules put such artifacts. The answer, and whatever the run produced, then go
   through the project's normal validation and review.
7. **Stay inside the request's authority.** A prototype run grants no new Git,
   production or cleanup authority of its own.

## References

- [references/visual.md](references/visual.md) - visual directions: named axes,
  where the variants live, the fixed picker, and promoting a winner.
- [references/logic.md](references/logic.md) - logic and state: one shareable
  demo, a portable logic module, free play and resettable guided scenarios.
- [PICKER.md](PICKER.md) - the picker spec, copied verbatim from its source.
- [Third-party notices](../../../THIRD_PARTY_NOTICES.md) - both source pins and licences.
