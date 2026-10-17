# Cross-cutting changes

A broad rename, type change or contract replacement may break many callers at
once. Do not force it into supposedly independent feature slices if they cannot
land and be checked independently.

Where temporary compatibility is practical, expand with the new form first,
move callers in verifiable batches, then remove the old form once no consumer
needs it. The last removal depends on those batches. Explain the compatibility
cost and how its removal will be verified.

An atomic change or an integration branch can be simpler when batches cannot
remain valid on their own. State where integration is checked rather than
claiming that every intermediate ticket is independently releasable. Choose the
smallest approach justified by the actual callers and project delivery rules.
