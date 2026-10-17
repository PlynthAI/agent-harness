# OCR subscription build

The operator route and current installation are recorded in the harness setup
guide's Native OCR section. The npm package remains the single CLI installation;
the slot adapter resolves its platform executable directly.

## Windows npm location and command consistency

Keep one maintained installation in `%APPDATA%\npm`, which is already on the
user PATH. A Windows Node version manager can otherwise default global npm
installs to its active runtime. Its PATH entry comes first, so an OCR install
there shadows the shared build after a Node switch or in a fresh agent shell.
The native slot resolves the shared package directly, exposing the mismatch.

Persist the ordinary npm global prefix in the user's existing configuration:

```powershell
npm config set prefix "$env:APPDATA\npm" --location=user
pwsh -NoProfile -File config/ocr/check-install.ps1
```

This uses npm's supported global prefix and leaves project-local dependencies
unchanged. Existing unrelated global packages stay in their current locations.
The check compares the effective npm prefix, the shell command, the adapter
target and their build versions without changing installations or user
configuration. It disables background updates for its version probes and records
the adapter executable's hash. The npm launcher can still clear a stale update
notification in its user state directory. It does not call a model or prove
provider connectivity or streaming compatibility. A PowerShell alias or function
shadowing `ocr` is reported instead of silently bypassed.

A failure names a shadowing command or inconsistent prefix. Before retiring a
duplicate, resolve its runtime to a concrete directory, inspect its ancestors
and package subtree for links, verify the package and shim ownership, and back
up that OCR package, its three shims and the user's npm configuration. Use a
user-only backup outside discoverable skill roots. Retire only that verified
installation with the ordinary npm command:

```text
npm uninstall --global --prefix <verified-concrete-runtime> --ignore-scripts --no-audit --no-fund @alibaba-group/open-code-review
```

Never pass an fnm multishell junction or its `current` link as the removal
target, and never delete a runtime or its other global packages. Compare those
packages and unrelated shim bytes before and after. Check fresh PowerShell and
cmd invocations and each installed Node line, for example:

```powershell
fnm exec --using 22 pwsh -NoProfile -File config/ocr/check-install.ps1
fnm exec --using 24 pwsh -NoProfile -File config/ocr/check-install.ps1
cmd /d /c ocr --version
```

Recovery restores the backed-up npm configuration and, if needed, only the
retired OCR package and shims to their verified concrete paths. Retain the
backup and before/after hashes in the maintenance proposal. Do not replace a
configuration or lockfile that has since acquired unrelated edits. An explicit
`--prefix`, environment override or new OCR install can still introduce another
copy; rerun this check after Node or OCR maintenance rather than hiding drift
with a wrapper or copying patched binaries into every runtime.

## Maintained patch

`ocr-v1.12.11-sol-streaming.patch` applies to Alibaba Open Code Review
v1.12.11, commit `a758d9cbfb689937c7857ad64b2dd66adb58c0c2`.
Upstream: https://github.com/alibaba/open-code-review/tree/v1.12.11
Licence: Apache-2.0, with the original notices in THIRD_PARTY_NOTICES.md.

This deliberately tracked patch adds boolean `extra_body.stream: true` support
for the Responses client. It preserves completed output items, encrypted
reasoning and tool replay, and treats failed or interrupted streams as failures.
Nonstreaming requests retain upstream behaviour. Raw HTTP capture must remain
disabled for prompt terminal return: the unchanged upstream diagnostic middleware
buffers a streaming body until EOF when that opt-in capture is enabled. It also prevents the npm
updater from automatically replacing a build whose version ends in
`+sol-streaming`; ordinary releases retain their updater behaviour.

The patch does not carry the older benchmark's completion-limit or session-log
changes. The stock per-response output ceiling remains 16,384. Subscription
servers can impose their own limits. Group deadlines and aggregate token
budgets are separate invocation settings owned by the operator.

## Rebuild and upgrade

Start from that exact upstream source in the reference-repository route. Verify
its pin, apply the patch, then run:

```text
git apply --check <harness>/config/ocr/ocr-v1.12.11-sol-streaming.patch
git apply <harness>/config/ocr/ocr-v1.12.11-sol-streaming.patch
node scripts/version.test.js
go test ./internal/llm
go vet ./internal/llm
go build -trimpath -ldflags "-X main.Version=v1.12.11+sol-streaming -X main.GitCommit=a758d9c -X main.BuildDate=<UTC timestamp>" -o <output> ./cmd/opencodereview
```

Use Go 1.25.5 as declared by upstream. The leading `v` and custom suffix in the
version are required for the npm updater to identify the protected build. Retain
source, patch, compiler and executable hashes beside the check outputs.

Before installation, compare the current platform executable and updater with
the expected originals and preserve them in a user-only backup. Install the
reviewed executable at the existing npm platform binary path, and install the
patched `scripts/update.js` in the parent npm package. Both ordinary `ocr` and
the native slot then resolve the same build. Keep the provider profile and
credentials outside versioned source. Verify a fresh invocation without model,
provider or executable overrides.

An explicit npm upgrade can still replace this build. Before upgrading, check
whether upstream now supports the required streaming contract. If it does,
verify the stock replacement and retire this patch; otherwise port it to the
new pinned release and repeat affected checks and review. Do not preserve an
obsolete version solely to keep this patch applying.

Recovery restores the backed-up executable, updater and only the operator
configuration changed by the installation. The earlier benchmark executable
is not the shared installation and must not become a permanent task-path override.
