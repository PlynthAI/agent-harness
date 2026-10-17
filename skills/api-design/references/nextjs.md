# Next.js route handlers

Apply this when the owning repository is a Next.js application and the contract
is a route handler or an equivalent server endpoint in it. Read the nearest
`AGENTS.md` and the endpoint's accepted contract first; this file adds
framework-specific questions, not a placement rule.

Reuse the project's handlers, validation helpers, response types and data-access
adapters. Separate request parsing, a bounded read and response mapping where the
route already does; check the current callers before adopting a pattern, because
an example does not override the contract.

- Keep database credentials and private topology server-side. A product read uses
  the least-privilege identity the project defines, and a missing read credential
  must not silently fall back to a more privileged connection.
- Apply the route's authentication, entitlement and redaction rules independently
  of the database connection's identity.
- Select runtime, caching and response behaviour for the installed Next.js
  version and the deployment's limits.
- Reuse the project's existing authentication integration; do not add a second
  session or token mechanism to match an example.
- Keep the handler an adapter over the data owner, preserving supply
  compatibility and an explicit unavailable state.

Consult the official guidance for the installed version rather than this file
alone:

- [Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
  for route-handler responsibilities and runtime boundaries.
- [Authentication](https://nextjs.org/docs/app/guides/authentication) for the
  applicable session and data-access pattern.

Use the project's route-test conventions for changed behaviour. Browser evidence
belongs to a product-adoption claim, not to every response change.
