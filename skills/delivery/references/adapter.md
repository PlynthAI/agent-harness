# The delivery adapter

A small record the project owns, so a session does not infer the route from a
remembered command. Project guidance names where it lives; do not assume a path.

The record is optional helper input. Where a project's ordinary guidance already
states its branch rules, checks, review requirement, merge method and deployment
route in prose, that guidance is what a session reads and no adapter file is
required.

## Shape

```jsonc
{
  "schemaVersion": 1,
  "project": "example",
  "host": "github",
  "remote": { "identity": "owner/repository" },
  "branchRules": {
    "base": "main",
    "naming": "short free text, for example 'type/scope-summary'",
    "draftByDefault": true
  },
  "checks": {
    "source": "the pull request's own required checks",
    "required": true
  },
  "review": {
    "required": true,
    "source": "where the project records its review requirement"
  },
  "merge": {
    "method": "squash"
  },
  "deployment": {
    "route": "the pipeline or command that deploys",
    "production": {
      "boundary": "what counts as production for this project",
      "authority": "who or what must authorise production"
    }
  }
}
```

| Field | Meaning |
|---|---|
| `host` | which pull-request host this project uses; the default is `github`. The method asks the session for that host's own command-line tool, so a project on another host names it here rather than the method guessing |
| `remote.identity` | the remote this project delivers from, as `owner/repository`. A session sitting on a fork reports that instead of delivering from the wrong remote |
| `base` | the branch a pull request targets |
| `checks.source` | where the required checks for the current head are read from |
| `checks.required` | whether a merge needs them to pass |
| `review.required` | whether an independent review is a merge precondition |
| `merge.method` | how the forge merges, for example `squash` |
| `deployment.route` | how a deployment happens here |
| `production.boundary` | what this project calls production |
| `production.authority` | the separate authority production needs |

A project may omit a section it does not have. Omitting deployment means this
project does not deploy from a session, not that a session may deploy freely.

## What the project owns

- The branch rules, the merge method and the deployment route.
- Which checks are required, and where their current state is read.
- Who or what authorises a production action. A merge has no separate
  authority: it proceeds once the merge gate holds on the head (review clean,
  required checks green, the forge reporting it mergeable).

## What this skill owns

- Keeping the five steps distinct, and completing the steps the request authorizes.
- Resuming an existing pull request instead of opening a second one.
- Reading the required checks for the current head rather than from a document.
- Reporting a missing tool, approval or live state as a concrete blocked result.
- Leaving issues, boards and local plans where they belong.

## Reading the live state

The adapter says where to look; it is not evidence of what is there now. Read the
current head, the current required checks and the current pull-request state at
the moment of acting, and record what you read.

The optional `delivery-state.mjs` helper can reuse a review from another head
when `snapshot.review` is approved and complete, carries explicit empty
`blockers` and an `identity` matching the independently obtained current
`snapshot.identity`. These are validation's five input fields: project, scoped
content, dependencies, environment and scope. The caller reads authentic project
evidence and supplies the current inputs separately; this helper does not
authenticate GitHub or grant a hosted-review exception. Missing or changed
identity cannot reuse a different head. Current required checks still gate merge,
and a merge also needs `snapshot.pullRequest.mergeable` read as `true` from the
forge; the helper takes no merge approval.
