# Issue and pull request intake

Use when assessing existing requests before creating or updating tickets. Read
the project's tracker configuration, labels, states and issue templates. Do not
create a universal state machine, setup dependency or separate rejection store.

Read the request and relevant prior discussion. An external PR also supplies
candidate code, not proof that the request is satisfied. Check existing behavior
and relevant callers before calling a request already implemented; a similar
symbol or feature name is insufficient. Reproduce a reported bug or run focused
checks when needed, and distinguish confirmed behavior from an unverified claim.

Consult relevant previous decisions. Distinguish a duplicate or delivered
feature from a rejected requirement. Record a durable rejection only where the
project keeps such decisions, with its reason and request links; a temporary
lack of capacity is a deferral, not a permanent rejection.

When assessing possible duplicates, search open and closed issues using relevant
error, feature and symptom terms. Matching symptoms alone do not establish the
same cause. Preserve useful new evidence on the owning issue when authorized;
if the relationship is uncertain, describe it as related rather than close it
as a duplicate.

Before treating a report as resolved by an earlier fix, verify whether that fix
is available in the affected release or deployed environment. A merged PR alone
does not establish availability. State any version or reproduction uncertainty;
ask only if the missing information changes the next action. Follow the project's
closure convention without presenting an unreleased fix as available.

Recommend the next action using the project's categories and states. Ask only
for missing information that materially changes it. Summarize verified facts,
remaining questions and the acceptance needed for implementation. For a PR,
state what remains to do on the existing diff rather than treating it as new
work. Use the main skill's ticket shape when a new or clarified ticket is useful;
link accepted requirements instead of declaring a new brief their replacement.

Apply labels, post comments, create tickets or close requests only within the
user's authorization. An explicit state-change request can be acted on directly
when the target and meaning are clear; do not repeatedly seek the same approval.
A request to assess or recommend alone does not authorize publishing or closing.
On resumption, read existing notes and answers so resolved questions stay resolved.
