---
type: guide
title: "<Project> feature map"
description: "Index of the important user journeys and how to drive each one. Read when <verifying a user-facing change>."
status: draft
related: []
---
# <Project> feature map

This is a user-path navigation aid for verification, not a second spec or a
claim that current behaviour is correct. Keep it at the project's existing docs
owner and link it from the verification guide. Start with up to 3–5 important
journeys that actually exist; a small project may have fewer. Add pages only
when an index row cannot carry a useful drive recipe.

| Journey | User entrypoint | Accepted requirement | Drive route | Observed proof / known gap | Detail |
|---|---|---|---|---|---|
| <name> | <where the user begins> | <issue/spec/decision link> | <existing test or command> | <outcome to check, or unverified> | <optional page> |

For a scoped change, inspect affected entries. A full-map clean claim requires
source and live coverage of every entry. Record unreachable prerequisites and
untested entries explicitly. Update this map when a user-facing route changes;
investigate product regressions before editing an accepted expectation.
