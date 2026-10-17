# Resolve the database route

Use the owning project's AGENTS.md pointers. Inspect only the references needed
for the current operation; an existing explicit route is already resolved.

| Needed | Project evidence | If missing |
| --- | --- | --- |
| Database/schema owner | migration history and project guidance | inspect the consumers and resolve conflicting ownership |
| Read connection | project-scoped CLI, MCP or plugin with restricted privileges | investigate supported access; do not invent credentials |
| Execution route | designated command, service or project procedure | the team lead resolves the gap before protected execution |
| Target and operation | environment/project identity and supported operation | determine the intended target; never rely on a default |
| Actual protection | database grants, credential scope and executor admission | distinguish configured intent from verified enforcement |
| Rehearsal/recovery | existing disposable target and operation-specific recovery | identify the coverage limit; never rehearse on production |
| Evidence destination | existing task workspace/artifacts route | use docs-workspace without creating a second tracking surface |

Read-only configuration is evidence to verify, not proof of every access path.
Disabling one write tool does not restrict arbitrary SQL, another connector or a
management API. A hook is not required merely to classify a connection as usable.
For a changed access control, use existing disposable fixtures to demonstrate a
legitimate read and a rejected mutation; do not probe destructive production
actions. Callable functions and security-definer privileges need consideration
when qualifying a database role. Record only credential names/locations, never
secret values or complete connection strings.
