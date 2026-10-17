# GitHub ticket convention

Load when publishing a sliced spec to GitHub. A project's own documented
convention takes precedence; this is the default where none exists.

## Shape

- One existing portfolio Project holds the work; do not create a board per spec.
- One parent issue per spec. Reuse an existing parent that owns the same scope.
- The parent's first line links the spec:
  `Spec: workspace/specs/<slug>.md (<revision>)`.
- One native sub-issue per ticket. Each child links its section:
  `Spec section: <heading>`.
- Native blocked-by relationships for real prerequisites only. They are the
  one record of blockers; keep no mirror ledger.
- The Project's status field carries an `Integrated` option between
  In Progress and Done.
- Two views: a portfolio view showing parents only, and an execution view
  grouped by Parent issue.

## Integrated and Done

- **Integrated:** the ticket's candidate is merged into the integration branch,
  with its checks and review evidence recorded.
- **Done:** the ticket's own Done statement holds and the change has landed on
  the default branch, or is deployed when the ticket says so.

Dependents unlock on Integrated evidence, not on issue closure.

## Publish order

Publish the parent, then the children (blocking tickets first), then the
blocked-by relationships, then the Project field values. Read back each
relationship before moving on.

Current gh sets relationships directly:

```sh
gh issue create --title "<ticket>" --body-file <body> --parent <parent>
gh issue create --title "<ticket>" --body-file <body> --parent <parent> --blocked-by <n>,<m>
gh issue edit <parent> --add-sub-issue <n>,<m>
gh issue edit <n> --add-blocked-by <m>
```

Confirm with `gh issue create --help` and `gh issue edit --help` before
relying on these flags; an older gh lacks them, and then the GraphQL mutations
`addSubIssue` and `addBlockedBy` set the same relationships through
`gh api graphql`.

## Readback

Read each relationship back through `gh api`; a successful create is not
evidence that the link exists.

REST:

```sh
gh api --paginate repos/<owner>/<repo>/issues/<parent>/sub_issues --jq '.[].number'
gh api --paginate repos/<owner>/<repo>/issues/<n>/dependencies/blocked_by --jq '.[].number'
```

GraphQL, for parent, children and blockers in one query:

```sh
gh api graphql -f owner=<owner> -f repo=<repo> -F n=<n> -f query='
  query($owner: String!, $repo: String!, $n: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $n) {
        parent { number }
        subIssues(first: 50) { nodes { number } }
        blockedBy(first: 50) { nodes { number } }
      }
    }
  }'
```

Report any relationship that does not read back as unresolved.

## Project owner's write

Adding the `Integrated` status option, creating the portfolio and execution
views, and changing other Project fields are writes to the Project itself. The
Project's owner applies them, once per Project; ticket publication only sets
field values that already exist.
