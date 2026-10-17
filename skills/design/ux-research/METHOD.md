---
name: ux-research
description: Find the highest-signal problems users report about a named product - reviews, forums, support threads, issue trackers - and return a ranked findings brief with a source log. Use for "what are users complaining about in X"; other external fact-finding belongs to the research skill.
---

# UX research

A fast, source-grounded scan of what users of a named product say goes wrong. It
answers one question: which problems matter most, and how sure are we? The
retrieval discipline (read the source behind a result, match versions, record
access dates, reconcile conflicts) belongs to the shared `research` skill and is
followed as written there. This method adds where user pain is found and the
shape that makes it usable.

## Set the scope first

Restate four things before searching, and correct them with the owner if needed:

- the product, and the plan, platform or version when it matters;
- the audience segment whose experience counts;
- the time window, the last twelve months unless the request says otherwise;
- the surfaces in scope: onboarding, the core workflow, account and billing, docs
  and help, the API or developer experience, support.

## Search where users speak

Public sources come first: app store and review sites, forums and community
boards, Reddit, Hacker News, Stack Overflow, the product's public issue tracker
and discussions, social posts and video comments, and the product's status page
or changelog for reliability context. Fan-out matches the product: a channel
where it has no presence is not applicable, not a gap. A bounded scan can go to
the researcher role through `orchestrate-work`.

For a product the project owns, add the tracker and support records the
repository names as owners of that evidence, and keep that evidence marked as
internal. Personal connectors are not project evidence.

Keep a source log as you go: each channel searched, the query, the date, what it
yielded (strong, weak or none) and the threads relied on. Cite the thread, not
the person, and collect no personal details about posters.

## Cluster and rank

Group evidence by problem, not by source, and sort each problem into one of:
workflow or interface friction, onboarding, docs and help, account, billing,
permissions or setup, developer or API friction, reliability or performance, or a
feature request. Keep three distinctions visible: loud against frequent, friction
against a missing feature, and reliability against workflow.

Rank by severity, frequency signal, confidence and product leverage. Label what
was observed (with its link) apart from what is inferred. One vivid post is one
data point.

## Findings shape

Inline by default; saved through `docs-workspace` when the work is to be kept.

- **Read.** The story in three to five sentences.
- **Ranked problems.** For each: the problem, the user goal, the surface, what
  breaks, the evidence, severity, frequency signal, confidence and a suggested
  move.
- **Source log.** As kept above, with where signal was weak or access missing.
- **Next.** Which problems go to `brainstorm` to settle direction, which to
  `design/ideate` for concepts that answer them, which to `design/audit` on the
  live flow, and which need deeper research.

Adapted from the `research` skill of the Product Design plugin 0.1.56, renamed so
it is not confused with the shared research skill; source and licence are in the
[third-party notices](../../../THIRD_PARTY_NOTICES.md).
