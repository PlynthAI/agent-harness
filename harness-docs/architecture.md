---
type: Reference
title: Architecture
description: What the harness is, and which surface owns each part of it.
---
# Architecture

The harness gives agents what they need to turn a requirement into working,
reviewed software with minimal human supervision. Success is less supervision and
more reliable delivery, not more agents, tools, instructions or approval stages.

[ARCHITECTURE.md](../ARCHITECTURE.md) owns that north star, the ownership table,
the good/bad change table and the maintenance rule. Read it before proposing
harness behaviour changes; this page only orients a reader to it.

## Surfaces

| Surface | Owner |
|---|---|
| Working preferences, delegation, workflow pointers | [AGENTS.md](../AGENTS.md) |
| Reusable methods | [skills/](../skills/) - one entrypoint per method, details in references |
| Specialist roles and model bindings | [agents/](../agents/) and [MODELS.md](../MODELS.md) |
| Local requirements and pointers, per project | that project's AGENTS.md and PROJECT.md |
| Working documents, goals, findings and evidence | the project's declared external workspace |
| Executable feedback | the project's own checks and CI |

## Consequences

The harness is a versioned folder, not a service. Deployment is a deliberate
reviewed copy, so the source and authorized installed copies are separate states
and are reported separately. Project requirements plug into the environment
rather than being baked into every role and skill, which is why project facts
belong in ordinary project documents.
