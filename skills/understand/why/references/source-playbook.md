# Source playbooks

The why method gives each source it searches one investigator, each reading the single playbook below for its source, in this order.

| Source | When | Playbook |
|---|---|---|
| Source control: git, `gh` for PRs, GitHub issues | Always | [`code-archaeology.md`](sources/code-archaeology.md) |
| Project workspace and repository documents | Always | [`workspace.md`](sources/workspace.md) |

## Vendor playbooks

These apply only when the repository's AGENTS.md or PROJECT.md names that tool as the owner of the evidence. A tool the session exposes but the repository does not name is not a source. Each is an example for one tool; adapt it for another tool of the same kind that the repository names.

| Kind | Playbook | Adapt for |
|---|---|---|
| Tracker in place of GitHub issues | [`linear.md`](sources/linear.md) | Jira, Plane, Shortcut |
| Long-form documents | [`notion.md`](sources/notion.md) | Confluence, Coda |
| Team chat | [`slack.md`](sources/slack.md) | Discord, Microsoft Teams, Mattermost |
| Infrastructure observability | [`datadog.md`](sources/datadog.md) | New Relic, Honeycomb, Grafana, Splunk |
| Error / exception tracking | [`sentry.md`](sources/sentry.md) | Rollbar, Bugsnag, Airbrake |
| Product analytics warehouse | [`databricks.md`](sources/databricks.md) | Snowflake, BigQuery, ClickHouse, dbt |

Cross-cutting:

- [`incident-postmortem.md`](sources/incident-postmortem.md). Add this if the target code looks defensive (null checks, retry, timeout, rate limit, feature flag, egress guard, OOM handler).
