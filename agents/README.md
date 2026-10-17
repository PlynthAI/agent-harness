# Agent roles

The team lead is the chat's own agent: it uses the session's selected model and
owns scope, integration and delivery. The coordinator (the chief of staff) runs
coordinate; each project chat's team lead runs orchestrate-work and leads one team
of up to six descendants.
The harness does not impose a team lead default. Role TOML files own the swappable
model bindings; the current operator snapshot is in `MODELS.md`
in the harness source. That snapshot is not an installed configuration file.

- fast_worker: clear, bounded implementation and straightforward repairs.
- smart_worker: anything a user sees, complex implementation, investigation
  and difficult repairs; it can be selected directly.
- planner: the architect and advisor, bound to the strongest model. The team
  lead hands it the brief that brainstorm settled with the user, and it writes
  the map, spec, tickets or plan, returning any decision it cannot settle as one
  batch of questions. The team lead also turns to it when a decision is
  uncertain, a design question is open or work is stuck, and a fresh planner
  reviews a multi-ticket package or a risky saved plan. The team lead decides and
  does all delegation, and the planner's advice is not approval. Architecture, advice, planning and plan review are one
  role; there is no separate advisor or architect role.
- researcher: bounded evidence gathering and web research.
- reviewer: accountable independent review of the integrated candidate, or a
  bounded specialist scope needing deeper judgment.
- fast_review: independent review of a bounded slice or fixed candidate;
  an early pre-commit pass is optional. It inspects only.
- explorer: code-path tracing and audit verdict checks.
- tester: selected check execution.

Adding or changing a role follows the harness library's
[authoring a role](../skills/harness/library/references/authoring-a-role.md) reference.

The worker names describe assignment intent, not measured model speed or quality.
Use the role TOML files for current model/provider/effort bindings and `MODELS.md`
for the dated operator snapshot. Either worker can provide an alternate route
when appropriate; do not repeatedly retry a failed provider or bypass a denial.

Keep small tasks together. Assign independent work with clear scope, owned paths,
relevant context and checks. The concurrency limit is a ceiling, not a target.
Use code-review for independent review of another author's candidate. Roles use
the runtime's available tools and permissions; an assignment limits actions, not
credentials or OS access. Built-in and project agents may also be available.
