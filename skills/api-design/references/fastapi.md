# FastAPI routes

Apply this when the owning repository is a FastAPI service and the contract is a
route it serves. Read the project's own API guidance, then the route, its callers
and its tests; this file adds framework-specific questions, not a placement rule.

Reuse the existing dependencies, authentication, exception handling and typed
models where they fit. Declare request validation and a concrete response model
for an ordinary JSON route; a streaming, binary or file response needs its actual
media type, safe output and failure behaviour specified instead. A response model
does not replace object- or field-level authorisation.

- Preserve accepted namespaces and consumer expectations.
- Keep operational or administrative access separate from product access through
  the owning dependency.
- Reuse the project's existing job or orchestration path for long work rather
  than adding another HTTP job framework.
- Keep the generated OpenAPI accurate for the affected operations, including
  authentication, responses and relevant examples, and match the version the
  installed integration emits.

Consult the official guidance against the installed versions rather than this
file alone:

- [Response models](https://fastapi.tiangolo.com/tutorial/response-model/) for
  validation, serialisation and output filtering.
- [Handling errors](https://fastapi.tiangolo.com/tutorial/handling-errors/) for
  compatible exceptions and handlers that do not expose internal diagnostics.
- [Security](https://fastapi.tiangolo.com/tutorial/security/) for the applicable
  authentication integration.
- [OpenAPI specification](https://spec.openapis.org/oas/latest.html) for a
  published schema.

Reuse the project's schema or consumer checks where they cover the change; a new
snapshot is not required for every route edit.
