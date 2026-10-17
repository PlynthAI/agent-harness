# Incident & Postmortem Context

Not a separate source, a **cross-cutting angle**. Incidents often motivate defensive code ("we added this check after the X outage"), so if the target looks defensive (null checks, retry logic, timeout handling, rate limiting, feature flags), specifically hunt for incident history inside your own source:

- **Git**: commits with messages like "fix for incident", "add defensive check", "revert" followed by "re-apply with..." are strong signals. GitHub issues labeled `incident`, `bug` or `regression` around the ship date.
- **Workspace**: findings and artifacts recording the failure, its diagnosis or a postmortem, and plans whose task was the fix

Only when the repository names that tool as the owner of the evidence:

- **Notion**: search for postmortems mentioning the target file, feature, or error string
- **Linear**: look for tickets labeled `incident`, `sev-*`, `postmortem-action-item`, `reliability`
- **Slack**: search `#sev-*` and `#incident-*` channels around the dates the target code was added
- **Datadog**: `search_datadog_incidents` for formal incident records with timelines, dashboards and monitors created as postmortem action items
- **Sentry**: issues whose first-seen/last-seen window aligns with the target's PR ship date, stack traces through the target
- **Databricks**: product-analytics events that classify an error condition (client-reported failures, user-visible retry events, etc.) often spike during an incident window. A drop in that event count after the target PR ships is circumstantial support that the target code resolved the user-visible symptom, even when Datadog/Sentry signal is noisy.

If you find an incident link, fetch the full postmortem. Postmortems typically have an "Action Items" section that ties directly to code changes. When multiple sources corroborate (an issue named in a workspace finding, which links the target PR, and an error count that drops after the fix), the evidence is especially strong.

Worth spending time on when the code's defensive character makes an incident-driven origin plausible. Skip it for code that doesn't look defensive.
