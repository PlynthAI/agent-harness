# Skill mechanics in Codex

Apply [agent-instruction writing](agent-instructions.md) to the skill's prose.
Codex discloses a skill in stages: its name and description for selection, its
`SKILL.md` body when used, and supporting references when relevant. Give the
entrypoint a precise trigger; keep mode-specific detail behind a named link.

`SKILL.md` needs YAML frontmatter with `name` matching the folder and a concise
`description` saying what the skill does and when it applies. Automatic skill
selection is the default. Every skill's `agents/openai.yaml` holds only
`interface.display_name` and `interface.short_description`, which Codex shows
the person in its skill picker. Never add `default_prompt`, which edits the
person's message, or `policy`, whose `allow_implicit_invocation: false` hides
the skill from the model; the harness library check refuses both, along with
Claude Code's `disable-model-invocation: true`, which leaves a skill reachable
only as a slash command. Another skill or project guide may still point to an
ordinary reference file within any skill.

The upstream method's distinction between context load and human discovery
still applies: each discoverable name and description has an ongoing selection
cost, and each extra named skill gives the human another choice. When several
writing modes share an owner, one short router with mode-specific references
keeps both costs bounded. A reference is a plain Markdown file, with no
`SKILL.md` or invocation metadata. Give each link a condition so the agent
reads only the relevant mode.
