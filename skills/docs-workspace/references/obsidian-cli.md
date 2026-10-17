# Obsidian CLI for brain setup and checks

Obsidian 1.12 and later ships an official command line, `obsidian`, that talks
to the running app. Use it for the parts of a brain that live in app state
rather than in Markdown: plugins, Home views (bases), templates, workspace
layout, theme and snippets, link health from the app's own index, and a
rendered screenshot as proof. Notes are still written with file tools: that
route works with the app closed, in both runtimes and for every agent, and is
what [inbox](../../inbox/SKILL.md) and the brain check use. The CLI is a setup
and verification tool, never the write path for content.

## Availability

- Run `obsidian version`. On Windows, `cmd /c obsidian version` resolves the
  `Obsidian.com` terminal redirector that a 1.12.7 or later installer places
  beside `Obsidian.exe`. If the output says "installer is out of date", the
  app was updated in place but the installer was not: `version` and `vaults`
  answer, most other commands fail, and the owner has to rerun the current
  installer from obsidian.md before setup work. The CLI is switched on in
  Settings, General, "Command line interface".
- The app must be running, and the first command launches it when it is not.
  A headless session (no desktop, or the app refused to start) records the
  command it would have run and leaves the step for a person or a later
  session; it does not fall back to editing `.obsidian/` state to fake it.
- The app works on one vault at a time. Name the vault first, before the
  command: `obsidian vault="Example Vault" plugins:enabled`. The name is the
  vault's folder name as Obsidian lists it under `vaults`.
- Arguments are `key=value` pairs and bare flags. `file=` resolves by name
  like a wikilink and `path=` is exact; most commands default to the active
  file when both are omitted, so name the file for anything that writes.
  Quote values that contain spaces; use `\n` for newlines in content. Ask for
  `format=json` whenever the output is parsed rather than read. `help
  <command>` prints a command's exact options; trust it over this table.
- No key or token is involved, unlike the retired local REST API server. Add
  nothing machine-specific to `.obsidian/`, and no plugin that stores keys in
  the vault, whichever route switches it on.

## Brain tasks and their commands

| Task | Command | Proof |
|---|---|---|
| Switch on the core Templates plugin at adoption (the shipped `.obsidian/` sets the folder) | `plugin:enable id=templates` | `plugins:enabled filter=core format=json` lists `templates` |
| A community plugin the brain's `AGENTS.md` names, and only those | `plugin:install id=<id> enable` | `plugins:enabled filter=community versions` |
| The Home views: Inbox, Needs review, Roadmap | `bases` lists the base files; `open path=Home/Inbox.base` then `base:views` lists its views; `base:query path=Home/Inbox.base view=<name> format=json` returns rows | A query that returns the seeded pages; an empty result on a seeded vault is a broken filter |
| A new base when a business declares one in its Extensions table | Write the `.base` file with file tools (it is YAML), then `reload`; `base:create` adds an item to an existing base, it does not create the base | `bases` lists it and `base:query` answers |
| Templates resolve | `templates` lists the recipe set; `template:read name=inbox resolve title="<title>"` shows the filled text | `create path="Inbox/<YYYY-MM-DD> <title>.md" template=inbox` fills `{{date}}` and `{{title}}` through the app; `template:insert` only writes into the active file |
| Link health after the brain check | `unresolved format=json`, `orphans`, `deadends` | Zero unresolved links on concept pages; orphans listed for a person to link or retire |
| Find an existing source page for a URL (inbox sort step) | `search query="<url>" format=json` | Same answer as the `sources` scan, from the app's index |
| A property on a page | `property:set path=<page> name=status value=draft` | `property:read path=<page> name=status` |
| Home renders as designed | `open file=Home` then `dev:screenshot path=<artifacts route>/home.png` | The screenshot in the task's artifacts route, named in the report |
| Anything else the app can do | `commands filter=<prefix>` lists command ids; `command id=<id>` runs one | The command's own effect, checked afterwards |
| Layout, theme and snippets for a business vault | `workspace:save name=<name>`, `theme:set name=<theme>`, `snippet:enable name=<file>` | `workspace`, `themes`, `snippets:enabled` |
| The app picks up a hand edit to `.obsidian/*.json` | `reload` | The next command reflects it |

## Boundaries

- `sync:*`, `publish:*` and `history:restore` change what other people see or
  roll a page back. On a shared vault (synced to a drive other people
  read) treat them as outward actions: only on request, reported by name.
- `delete`, `move` and `rename` through the CLI follow the same rules as the
  file tools: the inbox route moves a note to its home; nothing else in a brain
  is deleted as routine cleanup.
- Read a page with `read` when the app's rendering matters (embedded bases,
  resolved links); otherwise the Read tool is enough and needs no app.
- Record each setup command and its output in the task's artifacts route, so
  the adoption report can show the Templates plugin, the views and the
  screenshot rather than assert them.
