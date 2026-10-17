---
name: harness
description: Improve, maintain and package the harness. Use for retrospectives, refining a skill, tool or validation friction, changing the shared library, packaging a cloud environment, or updating a project's packages. Routes each to its nested method.
metadata:
  group: harness
  lead: true
---

# Harness

The harness exists to make agents effective with little supervision. Every
change here serves that: less friction, fewer wasted calls, clearer routes.
This entrypoint is a router. Pick the row that matches the request, read that
method, and follow it; read nothing else up front.

## Route by the request

| The request is | Route |
|---|---|
| a retrospective: what should change after a session, a run or a learning event | [retrospective](retrospective/METHOD.md) |
| this skill is giving me trouble, or improve skill X | [skill-refine](skill-refine/METHOD.md) |
| are agents using tools well, tool friction, wasted or failing calls | [tool-eval](tool-eval/METHOD.md) |
| how review, validation and CI are working, and their friction | [verify-eval](verify-eval/METHOD.md) |
| add, change, port, rename or retire a skill, role, principle or pattern | [library](library/METHOD.md) |
| set a project up as a cloud environment (Claude Code, Codex, Vercel Sandbox) | cloud-env |
| update a project's packages, dependencies or tools | [update-packages](update-packages/METHOD.md) |
| does a repository's instruction page help a fresh model find its way | [doc-bench](doc-bench/METHOD.md) |
| improve a measured product or domain outcome through repeated experiments | [hillclimb](../hillclimb/SKILL.md) |
| turn repeated jobs into executable workflows, or operate their runs | [automate-workflow](../automate-workflow/SKILL.md) |
| which skills a session can load, drawn as the group tree | [skills-list](../skills-list/SKILL.md) |
| local Codex storage growth or slowness | [keep-codex-fast](../keep-codex-fast/SKILL.md) |

A request that spans rows starts with the first row it matches; each method
hands off to the next where its work ends. A retrospective that finds a skill,
tool or validation problem continues in skill-refine, tool-eval or verify-eval
rather than repeating their work.

## What every route shares

- **Session evidence.** Retrospective, skill-refine, tool-eval and verify-eval
  read session logs through [session logs](references/session-logs.md). Digests
  are disposable scratch and can carry private chat text.
- **Confirm before fixing.** When the user flags friction, state the inferred
  problem with its evidence and confirm it before changing anything. A sweep
  the agent started reports its ranked candidates instead.
- **The durable bar.** A change answers a reproduced failure, a real external
  contract or an explicit decision, per the retrospective's
  [job](retrospective/references/job.md). Repetition ranks a candidate; it does
  not ground it.
- **The owner.** A shared skill, role or check changes through
  [library](library/METHOD.md) in the factory source. A project fact or
  standard stays in that project. Nothing becomes shared by being written down
  carefully.
- **Routers all the way down.** A skill's entrypoint routes; its nested methods
  carry the procedure; their references carry the detail. Add a method inside
  the right skill before adding a skill.

## Scripts and tests

The helpers live in [scripts/](scripts/) beside this file and their fixtures in
[tests/](tests/); each method names the ones it uses.
