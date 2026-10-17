# Workspace starter source

The maintained starter and document recipes live in the source harness's root
`harness-docs-starter/` folder. Its README.md distinguishes repository `PROJECT.md`
adoption from external workspace adoption, including the owner brief and
preservation rules. Consult
that guide when adoption is in scope; normal document writing does not need the
harness checkout.

The installable `skills/` tree supplies methods and resolution. A workspace's
AGENTS.md points to its local `templates/` folder, seeded in full from
`harness-docs-starter/templates/` during adoption along with the working folders:
`goals/`, `findings/`, `prds/`, `specs/`, `adrs/`, `features/` and `plans/`, plus
`.artifacts/` and `.task-scratch/` when the registry sets no host scratch root.
With a scratch root, artifacts and scratch live under it instead, so the
workspace needs neither. A brain (a business's Obsidian vault) comes from the
starter's `brain/` folder; its `Workspaces/<repo>/` holds the workspace.
Recipes are optional to use; if one is absent, write plain Markdown using the
project's conventions. Preserve project adaptations during deliberate template
refreshes; no background synchronization is required. Do not resolve these
workspace paths relative to the installed skill.

The installed skill carries no template or starter copy. Edit recipes only in
`harness-docs-starter/`.

Repository instructions name the external root and tell agents to read its
AGENTS.md. Worktrees share that root. Follow project routes and preserve the
existing authoritative homes of repository documents.

`harness-docs-starter/templates/PROJECT.md` is populated at the repository root. It maps
durable facts and subject authorities for selective reading; it is not a shared
workflow copy or one adapter per skill. Repository AGENTS.md may retain meaningful
local instructions that extend global guidance. The external workspace's README.md
maps goals, findings, tasks and legacy references and links repository PROJECT.md
for facts. Do not create a second project map. Existing workspace project.md files
remain readable until adoption reconciles their useful navigation into README.md
and updates consumers before retiring the duplicate.

See [adoption routing](adoption.md) for the handoff to the source guide.
