---
name: wayfinder
description: "Turn a large, ambiguous effort into a shared tracker map of decision tickets, then resolve one frontier decision at a time until normal ticketing can begin. Small clear work bypasses the map."
metadata:
  group: plan
---

# Wayfinder

Use Wayfinder when the destination is clear enough to name but the route still
contains decisions that cannot fit safely in one implementation session. A
loose idea too big for one session, wrapped in fog: the way from here to the
destination isn't visible yet. Wayfinding finds that way; it does not charge
at the destination. Map the uncertainty; do not turn the map into a build plan.

## Plan, don't do

Wayfinder is planning by default: each ticket resolves a decision, and the map
is done when the way is clear, with nothing left to decide before someone goes
and does the thing. The pull to just do the work is usually the signal the edge
of the map is reached and it is time to hand off. Produce decisions, not
deliverables.

## Refer by name

Every map and ticket is an issue, so it has a name: its title. In everything a
human reads (narration, the map's Decisions-so-far), refer to it by that name,
never by a bare id, number, or slug. A wall of issue numbers is illegible;
names read at a glance. The id and URL don't vanish; a name wraps its link, but
they ride inside the name, never stand in for it.

## Frame first

Before creating or working a map, restate:

- **Intent:** the outcome and why it matters.
- **Scope:** what this effort includes.
- **Non-goals:** what it deliberately excludes.
- **Acceptance criteria:** observable conditions for reaching the destination.
- **Destination:** the spec, decision, ticket set, or other handoff the map must produce.

Update this frame when evidence changes it. Naming the destination is the first
act of charting: it fixes the scope, so it is settled first.

## Resolve the tracker first

A map lives in the configured tracker, not beside it. Resolve the publishable
issue tracker and its triage vocabulary from the applicable `AGENTS.md` and
repository guidance before creating anything.

Prefer the platform's own structure and the project's existing views. Attach
the map to its children with the native sub-issue relationship when the
tracker has one. Express each dependency with the native blocking link. Keep
using the views the project already reads. The tracker is the one map store:
do not stand up a second tracker, mirror board or parallel ticket file beside
it. The [tracker interface](references/tracker-interface.md) names the shapes
this section relies on.

Where no publishable tracker is configured, keep the map as a single index
file under the workspace artifacts route and say so; still exactly one map,
never a second portfolio board.

## The map is an index, not a store

The map lists the decisions made and points at the tickets that hold their
detail. A decision lives in exactly one place, its ticket, so the map never
restates it, only gists it and links. Keep the map as a short index with one
section per part: intent (outcome and why), scope (included boundary),
non-goals (explicit exclusions), acceptance criteria (observable completion
conditions), destination (the handoff this map must reach), notes (standing
skills and preferences every session consults), decisions so far (one line per
closed decision ticket, linked), not yet specified (in-scope uncertainty not
yet sharp enough to ticket), and out of scope (questions deliberately beyond
this destination). Chart fills the notes; work-through reads them.

## Map decisions, not implementation

Create one map issue in the configured tracker. Its child tickets answer
decision questions; they are not implementation subtasks. A decision ticket
asks what should be true rather than what to build. Never use
a decision ticket as a build ticket.

Use the tracker documentation for labels, child relationships, blocking edges,
and templates.

Create a ticket only when its question is precise enough for one focused
session. Keep unresolved downstream uncertainty under **Not yet specified**
until an earlier decision makes it concrete. Use native blocking relationships
where available.

## Ticket types

Each ticket carries a `wayfinder:<type>` label, one of `research`,
`prototype`, `grilling`, `task`. Every ticket is either **HITL** (human in
the loop, worked with a human who speaks for themselves) or **AFK**, driven
by the agent alone. A HITL ticket only resolves through that live exchange;
never stand in for the human's side of it. A grilling agent that answers its
own questions has broken this.

- **Research** (AFK): reading documentation, third-party APIs, or local
  resources like knowledge bases to surface a fact a decision waits on. Use
  when knowledge outside the current working directory is required.
- **Prototype** (HITL): raise the fidelity of the discussion by making a
  cheap, rough, concrete artifact to react to (an outline, a rough take, a
  stub, or UI/logic code). Link the prototype as an asset. Use when "how
  should it look" or "how should it behave" is the key question.
- **Grilling** (HITL): conversation. The default case. Sharpen the question a
  round at a time.
- **Task** (HITL or AFK): manual work that must happen before a decision can
  be made: nothing to decide, prototype, or research, but the discussion is
  blocked until it is done. This is the one type that does rather than
  decides, and it earns its place by unblocking a decision, not by delivering
  the destination. Resolved when the work is done; the answer records what was
  done and any resulting facts later tickets depend on. Assets created while
  resolving any ticket are linked from the issue, not pasted in.

## Fog of war

The map is deliberately incomplete: don't chart what can't yet be seen. Beyond
the live tickets lies the fog of war: the dim view of decisions and
investigations that can be told are coming but can't yet be pinned down,
because they hang on questions still open. Resolving a ticket clears the fog
ahead of it, graduating whatever is now specifiable into fresh tickets, one at
a time, until the way to the destination is clear and no tickets remain.

The map's **Not yet specified** section is where that dim view is written down:
the suspected question, the area to revisit later. Write as loosely or as fully
as the view allows; it doubles as a signpost for collaborators reading where
the effort is headed.

**Fog or ticket?** The test is whether the question can be stated precisely
now, not whether it can be answered now.

- **Ticket when** the question is already sharp, even if it is blocked and
  action can't be taken on it yet.
- **Not yet specified when** it can't yet be phrased that sharply. Don't
  pre-slice the fog into ticket-sized pieces: it is coarser than a ticket, and
  one patch may graduate into several tickets, or none, once the frontier
  reaches it.

**Not yet specified** excludes what is already decided (Decisions so far),
what is already a live ticket, and what is out of scope.

## Out of scope

Work beyond the destination is out of scope: it isn't fog, and it doesn't
belong in **Not yet specified**. It gets its own **Out of scope** section on
the map: work consciously ruled out of this effort. Scope, not sharpness,
lands it here.

Out-of-scope work never graduates (the frontier stops at the destination), so
it returns only if the destination is redrawn, and then as a fresh effort, not
a resumption.

Ruling something out of scope is a scoping act, not a step on the route. When
a ticket that already exists turns out to sit past the destination (mis-scoped
in while charting, or exposed by a resolution), close it and leave one line in
the **Out of scope** section: the gist plus why it is out of scope, linking
the closed ticket. It stays out of **Decisions so far**, which records the
route actually walked; a scope boundary isn't a step on it.

## Link local artifacts, do not paste them

Resolve before writing; do not guess a path. Run the
[workspace resolution](../docs-workspace/references/resolution.md) resolver. Read the
routes in [docs-workspace](../docs-workspace/SKILL.md). Then link the related
research, plan or finding from the ticket. Never paste a whole execution plan
into a ticket. The ticket links the plan. The plan lives at the path the
workspace resolves. A detailed local plan linked from a ticket is not a second
portfolio board.

## Claim safely

Claim before any work so concurrent sessions skip the ticket. Follow the tracker's documented atomic claim flow, as the [tracker interface](references/tracker-interface.md) describes it. Do not assume that assignment alone is concurrency-safe. If the repository claims issues by creating an issue branch before assigning, create that branch successfully first; only then assign the issue. If no atomic claim mechanism is documented, recheck the frontier immediately before starting and record the claim in the tracker.

## Chart a map

1. Name the destination first: it fixes the scope, so it is settled before anything else. Read the available context and restate the frame with it.
2. Map the frontier breadth-first: fan out across the whole space surfacing open decisions and first takeable steps. If this surfaces no fog and the way to the destination is already clear, return to the team lead with the clear route; a clear route needs no map. The team lead continues any remaining authorized work, or ends with the result for a chart-only request.
3. Create the map, then create the tickets now specifiable and wire blocking edges in a second pass: issues need ids before they can reference each other, and the wiring sorts them into frontier and blocked.
4. Dispatch frontier research in parallel: one subagent per research ticket, recording each ticket's findings on that ticket for the decision it serves.
5. Stop when the map is usable; charting is one session's work and hand-resolves nothing. (When the route is already clear, the bypass below owns the skip; nothing here repeats its rule.)

## Work one frontier decision

1. Load the map at low resolution, not every ticket body, and restate its frame.
2. Choose one open, unblocked, unclaimed decision ticket, or the named one if given. Take the first frontier ticket in order by default.
3. Claim it through the tracker's documented atomic mechanism.
4. Resolve the question with the smallest useful evidence or human decision. Zoom as needed: fetch full bodies of related or closed tickets on demand, and load the skills the map's notes name. Use available tools directly; do not depend on undeclared skills or clients.
5. Record the resolution as a resolution comment, close the issue, and append a context pointer to the map's Decisions-so-far. Before recording, check whether the answer places this ticket beyond the destination: if so, close it as out of scope and keep it out of Decisions so far.
6. Graduate the fog the answer made specifiable into fresh tickets (create-then-wire), clearing each graduated patch from **Not yet specified** so it lives only as its new ticket. Rule out-of-scope discoveries out rather than resolving them on the route. Update or delete map tickets the decision invalidated.

Never resolve more than one ticket per session, with the exception of research tickets.

A human decision stays human: record what the person decided, never a
simulated agreement. Resolve at most one non-research decision per session.
When no decisions or fog remain, hand the destination to the appropriate spec,
ticketing, or planning workflow.

## Bypass and handoff

Clear work bypasses the map. When the route is already clear, skip Wayfinder;
the team lead can implement a bounded accepted request directly or hand off to
[to-tickets](../to-tickets/SKILL.md) or
[planner](../planner/SKILL.md) directly. Never force a planning stage the
work does not need.

When the destination is a durable requirement, write it with
[to-spec](../to-spec/SKILL.md); when it is a ticket set, slice it with
[to-tickets](../to-tickets/SKILL.md); when it is a build plan, plan it with
[planner](../planner/SKILL.md). Wayfinder maps the uncertainty and stops;
it does not own the ticket set and it does not own the how-to-build plan.

## References

- `references/tracker-interface.md` - the map issue, the decision ticket, the
  native relationships, the atomic claim flow, and the link-not-paste rule.
- [workspace resolution](../docs-workspace/references/resolution.md) - resolves the
  project, its workspace root and its document routes; never invent a path.
- [docs-workspace](../docs-workspace/SKILL.md) - where a document goes and the
  templates for the prose case.
- [to-tickets](../to-tickets/SKILL.md) - the ticket set and the blocked-by edges.
- [planner](../planner/SKILL.md) - the local how-to-build plan.
- [to-spec](../to-spec/SKILL.md) - the durable requirement, when the
  destination needs one.
