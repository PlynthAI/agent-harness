---
name: api-design
description: Design or review an HTTP contract - the request, response, status and error semantics, access rules and compatibility - when a task adds an endpoint or changes a public API shape. Use in the repository that owns the contract.
metadata:
  group: plan
---

# API design

An API has an owner and a contract. The owner is the repository the project says
answers for that surface, which is not always the backend, and the contract is
what its consumers already rely on. Establish both before proposing a shape. A
design or review request stays advisory; an implementation request carries the
in-scope change and its checks with it.

## 1. Find the owner before the shape

Read the nearest `AGENTS.md` chain and the project's own API, ownership and
data-contract guidance. Those documents decide placement. A default such as
"the backend serves product reads" is a guess, not a rule.

- Identify what already answers for the data: an existing endpoint, a shared
  read model, a database function, an ingestion owner.
- A new consumer requirement alone does not move ownership, and it does not
  require a matching endpoint in another runtime.
- Where ownership is unrecorded or contested, report that as the finding and
  name the document that should decide it rather than choosing for the project.
- Design in the owning repository, under its own conventions and checks.

## 2. Start from the consumer and the existing path

Read the callers, the current endpoint, the helpers it reuses and the tests that
cover it. Distinguish an existing contract from an implementation defect before
changing either. Reuse the project's route, authentication and response
conventions when they fit; a different existing convention is not by itself a
defect, and a new namespace or envelope needs a concrete reason.

## 3. Make the contract explicit

Pin every decision a consumer can observe. A table is a convenient shape for
this; the decisions are the requirement, and a project may record them in its
own form instead.

| Decision | What to pin down |
|---|---|
| Inputs | accepted fields, types, defaults, validation, and what a rejected request carries |
| Outputs | fields, shapes, and the empty, null and unavailable states a consumer must distinguish |
| Status and errors | the status for each outcome, the error shape, and what is safe to disclose |
| Access | who may call it, what identifies them, and what an unauthorised or forbidden call returns |
| Limits | payload, query and batch bounds; ordering and pagination for collections; rate or cost limits |
| Compatibility | what existing consumers observe, and the rollout and removal conditions for a change |

Bound queries, payloads and batches where the surface exposes them, and define
retry and idempotency behaviour for a mutation or job a caller may repeat. Keep
unavailable distinct from empty, and keep a value's source visible where the
consumer relies on it.

## 4. Guard the boundary

Enforce access where the data or action actually lives, against trusted identity
rather than a caller-supplied claim. Validate accepted fields and filter returned
fields for the caller; a typed model is not authorisation. Keep secrets,
credentials and internal diagnostics out of responses, and reuse the project's
existing controls for file and URL handling, caching and cost.

## 5. Change a public shape deliberately

Before altering a shape callers depend on, inspect the affected clients and the
test doubles, fixtures and mocks that stand in for it - a stale double hides the
break and reports a green run. Name the callers, then state the compatibility
story: add or version rather than mutate in place, keep the old behaviour while
its consumers migrate, and say when it is removed.

## 6. Verify and report

Choose the project's own checks for the changed contract and the failure paths a
consumer can reach. Use its endpoint tests, and its schema or OpenAPI check where
it publishes that contract; there is no universal authentication, pagination or
snapshot matrix to add. Verify a changed executable example against its real
prerequisites or mark it as a placeholder, and complete the owning repository's
required checks.

Report the decision or implemented change, the conventions reused, the
compatibility impact, the checks actually run and what remains uncertain. Scale
the shape to the task; a full API specification is not required.

## References

Load a technology reference only when the owning repository is that stack, and
never carry one stack's conventions into another.

- [references/nextjs.md](references/nextjs.md) - a Next.js application owning the route.
- [references/fastapi.md](references/fastapi.md) - a FastAPI service owning the route.
- HTTP semantics: [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) for
  method, status and header questions; [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html)
  for a problem-details error format; [OWASP API Security](https://owasp.org/API-Security/)
  for an applicable security boundary.
