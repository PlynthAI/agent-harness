# Codex review instructions

**Status: draft, not adopted.** Nothing here has been entered in Codex and no
setting was read or changed. The owner enters the wording themselves once the open
checks below are settled. Validating it on a real review is held, because that
calls a model.

Codex has an app-wide field at Settings, Code Review, Preferences, "Review
instructions". This page records what its documentation establishes, the
draft, and what is still unverified.

## What the field reaches

Read on 2 October 2026 from the Codex
[code review](https://learn.chatgpt.com/docs/code-review) and
[GitHub](https://learn.chatgpt.com/docs/third-party/github) pages (the
developers.openai.com Codex pages now redirect there) and from `openai/codex`
at commit `a20fe6335f960a350483d0079db2ec281c68202c`.

| Review entrypoint | Gets the field? | Evidence |
|---|---|---|
| A review started with **Review with Codex** in the app's Code Review surface | Yes | Documented: the instructions apply to reviews started that way, across repositories |
| GitHub automatic reviews | No, by the documentation's account | Documented as separate from reviews started in the pull request's chat |
| GitHub `@codex review` comment | Not documented | The GitHub page names only AGENTS.md `## Code Review Rules` sections (root and nested, per changed file) and the comment's own text |
| CLI `/review`, IDE `/review`, the app's own `/review` | Not documented | Their documentation offers separate per-run custom review instructions and never mentions the field |
| `codex exec review` | No, in the open-source CLI | Its review request carries only a target and display hint (`codex-rs/protocol/src/protocol.rs`); custom text is a per-run argument (`codex-rs/exec/src/cli.rs`); the config schema has no review-instructions key |
| The harness `reviewer` role, `fast_review`, OCR delegate or native adapter, any chat or subagent | No | None of them reads a Codex app preference; they take this skill's assignments |

How it combines with other guidance:

- **Repository AGENTS.md.** The CLI's built-in review rubric
  (`codex-rs/prompts/templates/review/rubric.md`) ranks `AGENTS.override.md`
  over `AGENTS.md`, lets more specific guidance win, and puts the user's
  instructions on review scope or style first. Its order against the app field
  is not documented.
- **Skills.** The code review page says to use installed skills and connected
  sources for a team's review guidelines. Which skills an app review loads is
  not documented.
- **`review_model`** in `config.toml` chooses the review model only.

GitHub reviews, read on 9 October 2026 from the GitHub page:

- Codex applies the root and the more specific AGENTS.md `## Code Review Rules`
  covering each changed file. The page does not say whether automatic reviews
  read them as well as `@codex review`.
- It flags only P0 and P1 issues. No thoroughness, depth or severity setting is
  documented; `@codex review for <focus>` adds a one-off focus, and
  `@codex security review` is a separate, deeper security pass.
- A repository adds that section only once it has production-ready features
  ([adoption recipe](../../../harness-docs-starter/templates/repository-agents.md));
  agents settle every finding with [finding triage](finding-triage.md) either way.

Not verified: whether the field reaches `@codex review` or the app's `/review`;
its order against AGENTS.md and skills; any length limit (none is documented);
where it is stored (no CLI key exists, so probably the ChatGPT account); and
the field's current contents.

## What belongs in it

The field reaches only app-started reviews, so nothing the harness relies on
can live there. It is a short floor that keeps an app review consistent with
this skill's independent review. It carries no principles: the accountable
harness reviewer selects relevant library entries as part of its standards coverage. Repository
contracts stay in each repository's pages and `AGENTS.md`, and provider and
model settings stay in operator configuration.

## Draft

> Review for correctness. Report only concrete defects this change introduces
> or makes reachable, each with its file and line, the failure condition, the
> evidence and the requirement it breaks, and the smallest credible repair.
>
> Take requirements from the pull request, its linked issue and the
> repository's own guidance: AGENTS.md and any architecture or
> coding-standards pages. A departure those pages state is intended. Existing
> debt is a finding only where this change extends it or newly depends on it.
>
> Leave what lint, type checks and tests report to those tools, and say which
> checks you could not see. End with what you did not review and why. No
> findings is a valid result; leave out style preferences and speculative
> hardening.

## Open checks before adoption

1. On one representative app review, after the wording is entered, confirm the
   review follows it (held: calls a model).
2. Find out whether `@codex review` and the app's `/review` receive the field.
3. Find out how the field ranks against AGENTS.md and loaded skills when they
   disagree.
4. Read the field's current contents before replacing them.
