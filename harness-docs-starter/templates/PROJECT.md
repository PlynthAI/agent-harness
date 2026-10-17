# <project>

<Purpose, owned product/repository boundary and material exclusions.>

This is the repository's map of durable project facts and their owners. Read
only the subjects relevant to the task. Shared skills own reusable workflows;
this map supplies project requirements, commands and reference paths. Existing
authority documents keep ownership: link to them rather than copying their prose.
Delete unused rows and sections; a missing subject does not require a new document.

## Project map

| Subject | Authority or verified facts | When to read |
|---|---|---|
| Product and domain | <requirements, GLOSSARY.md and scope owner> | <relevant work> |
| Architecture and boundaries | <architecture and consequential decisions> | <relevant work> |
| Coding standards | <existing standards owner or CODING_STANDARDS.md; omit for non-code projects> | <implementation or review affected by these judgments> |
| Contracts and data | <API/schema contracts, fixtures and database guidance> | <relevant work> |
| Design | <design authority, components and assets; the shared design-system map, this project's library profile, the design tools it pins and its asset namespace> | <relevant work> |
| Development and checks | <setup, commands, check selection and required checks> | <relevant work> |
| Runtime verification | <existing verification/testing guide and feature map> | <launch, exercise, inspect and clean up the relevant feature> |
| Operations and delivery | <environments, runbooks, safeguards and delivery requirements> | <relevant work> |
| Tracker | <issue/project tracker and ownership> | <scope or current status> |
| Working documents | <external workspace entry and its AGENTS.md> | <goals, findings, task records and evidence> |

Group references by subject, even when several shared skills use them. Do not
create one adapter or guide per skill. A short fact or command without an existing
owner may live here; larger subject references retain one editable home. Assemble
this map from existing documents and useful facts in local skill references,
checking them against current requirements before retiring superseded entrypoints.

## Commands and project requirements

<Only useful facts not already owned by a linked document: exact commands with
working directory and prerequisites, contract requirements, or project safeguards.
Link existing check/runbook owners instead of restating their procedures.>

## Ownership and related sources

<Relevant repositories and their boundaries; for a fork, upstream and intentional
departures. Link distinct project-only domain procedures when they exist.>

## Environment

<What a machine needs to run this project, by pointer, never by copy: the
runtime and package-manager pins (`packageManager`, `engines`, `.node-version`,
`.python-version`, `mise.toml`), `.env.example` for every variable with
required/optional, secret/plain and where the value comes from, the setup script
(`scripts/setup-env.sh`) and services, update automation (Dependabot or none),
and the cloud environments set up for it with the date last proven. Regenerate
the facts with the harness's env-scan.mjs; omit what does not apply.>

## Authorized external processing (when relevant)

<Link the existing operations owner or record established user authorization here:
source material and exclusions; named providers/endpoints and permitted processing;
the agreed usage allowance, currency/time scope where applicable, and its source.
Distinguish metered API spend from an existing subscription or free/local work.
Do not invent an allowance or claim that this template grants authorization.
Within established scope, runs and resumptions do not need renewed approval.
Revisit material changes to data, destination, purpose or usage scope; follow
enforced permission boundaries. Omit this section when it adds nothing.>

## Workspace routing

<Name the external workspace or its existing resolver route, and link its AGENTS.md.
The workspace's README.md maps goals, findings, tasks and retained legacy references
and points back here for durable project facts. Do not create a second workspace
project.md. Keep host-specific checkout mappings in the existing workspace/registry
owner. Repository AGENTS.md retains meaningful local instructions extending global
guidance and points here for context and routes.>
