@~/.codex/AGENTS.md

# Claude Code runtime notes

The import above is the shared harness policy, the same installed file Codex
reads. Apply it here with these Claude Code equivalents:

- Roles: eight subagents in `~/.claude/agents`, generated from the Codex role
  files; delegate to them with the Agent tool under AGENTS.md's role names.
  smart_worker (Opus, high), fast_worker, explorer and researcher (Sonnet 5.5,
  high), planner (Opus, xhigh), tester and fast_review (Haiku, xhigh;
  fast_review read-only) run Claude models. reviewer, unless the checkout's
  claude/claude-map.local.json binds it to Claude, is a thin forwarder: it
  runs the Codex role's OpenAI model headlessly through `codex exec`, which
  keeps an exec session for traces but adds no app thread, and returns its
  reply verbatim. It may write only its own findings file in `.state/` of the
  checkout it reviews.
- Routing: AGENTS.md and the role descriptions route work, and each role does
  the same job here as in Codex; only its model differs. The team lead keeps small
  non-code work itself (prose, tickets, recall, a brain drop) rather than delegating it.
  Each forwarded turn is one-way and cannot ask for approvals, so give it a
  complete, bounded assignment naming its working directory; a reviewer's
  question is answered by a follow-up forward with `--resume <thread id>`,
  which continues the same Codex session. Email, calendar
  and computer use with OpenAI models happen in the Codex app itself, since
  Claude connectors do not pass through. The built-in Explore and Plan agents
  skip CLAUDE.md and AGENTS.md; prefer explorer and planner when harness or
  project guidance matters.
- Shared skills in `~/.claude/skills` link to the installed Codex copies. Change
  a skill in the harness source and run `config/deploy.ps1 -Apply`, then
  `claude/sync-claude.ps1 -Apply` after every deploy (it is idempotent and
  reports "Nothing to change"; the Claude-side roles embed their role text, so
  any role edit needs it); never edit through those links.
  The shared code-review skill replaces the bundled `/code-review`.
- Repositories keep AGENTS.md as their shared instruction file, and Claude loads
  it alongside any CLAUDE.md. Add a repository CLAUDE.md only for genuinely
  Claude-specific additions. Claude discovers repository skills only under
  `.claude/skills`, not `.codex/skills` or `.agents/skills`.
- Browser: "the visible Codex browser" means the built-in browser pane here, or
  Claude in Chrome when the user asks for their own browser. Use the project's
  runner for automated tests.
- Artifacts: for a deliverable the person will see, the harness verification
  rule (both themes, phone width and states, then fix and republish) overrides
  the Artifact quickstart's advice to look once and publish.
- Files outside the working directory (a workspace or brain page, an inbox
  note, anything on another drive): the desktop app resolves a file link
  against the working directory, and its Files pane opens only that directory
  and granted folders, so a brain-relative path such as
  `Workspaces/<repo>/goals/x.md` shows "Couldn't find this file". Before
  linking one, grant its root with `request_directory` (the brain root for
  brain pages), then link it by absolute path.
- skills-list: the session's own skill listing is authoritative; its script
  scans Codex roots only.
- File edits whose content contains backslashes (regexes, Windows paths, escape
  sequences, code with string escapes) go through Edit or Write. Do not carry
  that content inside a string literal in heredoc Python or sed. When a script is
  the right tool, Write it to a scratch `.py` file and run it, keeping file
  content in raw strings or reading it from a file.
- codex-router is Codex-only. goal-setter drafts the `/goal` line the user
  sends. The reviewer forwarder runs the Codex CLI directly with the model
  and effort its Codex role file binds. The Codex plugin (user scope,
  `openai-codex` marketplace) stays for these commands. Only when the user asks,
  `/codex:rescue <task>` or the `codex:codex-rescue` subagent hands a bounded
  task to Codex; `/codex:review` and `/codex:adversarial-review` review the
  current diff; `/codex:status`, `/codex:result` and `/codex:cancel` manage
  plugin runs, and `/codex:rescue --resume`
  continues the last one. Keep its stop-time review gate off (`/codex:setup`
  shows it); the harness reviewer role owns review.
- Connectors: claude.ai connectors are configured once in the desktop app.
  Enabling one mid-session with `set_session_connector_enabled` also changes
  the default for new sessions, so do not toggle connectors for a single task;
  if a needed connector is off, say so and let the user decide.
