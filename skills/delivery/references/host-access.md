# Git and GitHub host access

Reuse the operator's existing connection across repositories and worktrees.
Authentication, filesystem access and Git ownership trust are different checks.
A new checkout does not need a new login. Use this reference when access fails;
it is not a prerequisite for every command.

## Credential-backed operations

On Windows, a sandbox command may run as a different account from the desktop
owner. Its vault cannot necessarily read the owner's GitHub CLI or Git Credential
Manager login. An invalid-token report from that context is not proof that the
host token expired. Confirm the execution identity and compare a noninteractive
read-only check through the runtime's supported host execution request.

Check the active permission mode first. In Full access, run authorized
credential-backed commands normally, without `sandbox_permissions` or an
escalation request. Under `approval_policy = "never"`, diagnose any remaining
access error and report a blocker rather than asking for approval.

For an authorized Git/GitHub task in a sandbox with that known account boundary,
use a host-execution request only when the runtime exposes and permits it
(`require_escalated` in interactive Codex shell tooling). Carry the repository, intended operation and existing user
authorization in the request. Do not first make the user run `gh auth login`,
reinstall a credential helper or provision a token in each worktree. Approval is
still enforced by the runtime; guidance cannot grant it or guarantee no prompt.
An actual approval denial must be reported and resolved, not retried by another
route. Ordinary authentication/ACL failures may use supported permission requests.

For diagnosis, set `GH_PROMPT_DISABLED=1`, `GIT_TERMINAL_PROMPT=0` and
`GCM_INTERACTIVE=never` for that process. Use `gh api user --jq .login` to test
the existing CLI login and `git -C <checkout> ls-remote origin HEAD` to test the
actual Git remote. Test both: API access, HTTPS Git and SSH Git can use different
credentials. Do not print tokens, credential-helper payloads or authorization
headers. Keep valid helper configuration; an override is not itself a defect.

If the host login works, continue through that supported route. An already
connected GitHub tool is also an ordinary option for supported API operations,
but not a workaround for an enforced denial. If host authentication also fails,
inspect the effective helper and token-source precedence without revealing
values. Only a genuinely missing, revoked or insufficient host connection needs
operator authentication or access changes. Do not rotate/logout a working login
or copy its secret to plaintext, repository files, shared caches or sandbox users.

## Worktree ownership and child processes

`dubious ownership` / `safe.directory` is a local Git trust error, not a login
failure. Resolve the intended checkout and verify its registered repository and
owner before adding a trust exception. A direct Git command can use
`git -c safe.directory=<exact-resolved-checkout> -C <checkout> ...`.
Never use `safe.directory=*` as routine repair.

The `-c` option does not fix a separate Git process started later by a validator.
Use the tool's existing exact-checkout trust support or, when authorized and
appropriate, run the affected operation through supported execution as the
checkout owner. Do not assume direct Git success proves child-process access.
Preserve existing Git configuration and project guard contracts; do not clear
injected settings to get around a guard. Report a failing Git lookup as an access
error rather than claiming its requested file or revision does not exist.

This recovery stays in the shared delivery method. Record host-specific facts in
the current task's evidence, not copied credentials or another per-project skill.

## Primary references

- [Codex Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox)
- [GCM credential stores](https://github.com/git-ecosystem/git-credential-manager/blob/main/docs/credstores.md)
- [Git safe.directory](https://git-scm.com/docs/git-config#Documentation/git-config.txt-safedirectory)
- [GitHub CLI authentication status](https://cli.github.com/manual/gh_auth_status)
