import { describe, expect, it } from "bun:test";
import { ChecksUnavailable, WatcherQueryError } from "./github.ts";
import * as github from "./github.ts";
import { classifyPr, readSnapshot } from "./policy.ts";
import {
  fakeReader,
  failedCheck,
  passingCheck,
  pendingCheck,
} from "./fakes.test-helper.ts";
import type { Check, GitHubReader, MergeStateStatus } from "./types.ts";
import { parsePrNumber } from "./types.ts";
const context = { owner: "owner", repo: "repo", number: parsePrNumber(42) };
const oid = (letter: string) => letter.repeat(40);
const head = oid("a"),
  base = oid("b"),
  merge = oid("c");
function admissionReader(
  options: {
    mergeChecks?: readonly Check[];
    headChecks?: readonly Check[];
    mergeStateStatus?: MergeStateStatus;
    mergeable?: "MERGEABLE" | "UNKNOWN";
    identityChange?: string;
    parents?: readonly string[];
    noMerge?: boolean;
    failure?: string;
    repeatedCursor?: boolean;
    incomplete?: boolean;
    threads?: boolean;
    draft?: boolean;
    changesRequested?: boolean;
    mergeRecheck?: "appeared" | "denied" | "incomplete";
  } = {}
) {
  const reader = fakeReader({
    facts: {
      headRefOid: head,
      mergeStateStatus: options.mergeStateStatus ?? "CLEAN",
      mergeable: options.mergeable ?? "MERGEABLE",
      isDraft: options.draft ?? false,
      reviewDecision: options.changesRequested
        ? "CHANGES_REQUESTED"
        : "APPROVED",
    },
    fastPath: {
      kind: "checks",
      checks: options.headChecks ?? [passingCheck()],
    },
    commitRollups: [
      {
        oid: head,
        state: options.headChecks?.some((c) => c.kind === "failed")
          ? "FAILURE"
          : "SUCCESS",
      },
    ],
    threads: options.threads
      ? [
          {
            id: "finding",
            firstComment: null,
            isBugbot: false,
            bugbotReviewPasses: 0,
          },
        ]
      : [],
  });
  let reads = 0;
  const identity = async () => {
    reads++;
    if (options.failure === "identity")
      throw new ChecksUnavailable("API denied");
    const facts = await reader.pullRequest(context);
    const changed = reads > 1 ? options.identityChange : undefined;
    return {
      facts: {
        ...facts,
        headRefOid: changed === "head" ? oid("d") : head,
        baseRefName: changed === "ref" ? "other" : "main",
      },
      repositoryId: changed === "repo" ? "other" : "repo-id",
      headRepositoryId: changed === "head-repo" ? "other" : "head-repo-id",
      baseOid: changed === "base" ? oid("d") : base,
      merge: options.noMerge
        ? null
        : {
            oid: changed === "merge" ? oid("d") : merge,
            parents: changed === "parents" ? [oid("f"), head] : options.parents ?? [base, head],
          },
    };
  };
  let mergeReads = 0;
  const commitCheckRollupPage = async (
    _context: unknown,
    sha: string,
    after: string | null
  ) => {
    if (options.failure === "checks")
      throw new ChecksUnavailable("malformed checks");
    if (sha === merge && ++mergeReads > 1 && options.mergeRecheck) {
      if (options.mergeRecheck === "denied") throw new ChecksUnavailable("API denied");
      if (options.mergeRecheck === "incomplete") return { checks: [], totalCount: 1, endCursor: null };
      return { checks: [passingCheck("new merge context")], totalCount: 1, endCursor: null };
    }
    const checks =
      sha === merge
        ? (options.mergeChecks ?? [passingCheck("integration")])
        : (options.headChecks ?? [passingCheck()]);
    return {
      checks,
      totalCount: checks.length + (options.incomplete ? 1 : 0),
      endCursor: options.repeatedCursor ? "again" : null,
    };
  };
  return Object.assign(reader, {
    admissionIdentity: identity,
    commitCheckRollupPage,
  }) as GitHubReader;
}
const snapshot = (reader: GitHubReader, allowDraft = false) =>
  readSnapshot({ reader, context, pendingHistory: "omit", allowDraft });

describe("forge admission candidate", () => {
  it("uses a green current merge despite a deliberately red head", async () => {
    const row = await snapshot(
      admissionReader({ headChecks: [failedCheck("head gate")] })
    );
    expect(classifyPr(row)).toMatchObject({ kind: "ready" });
    expect(row).toMatchObject({
      ci: {
        candidate: {
          kind: "test-merge",
          oid: merge,
          baseOid: base,
          headOid: head,
        },
      },
    });
  });
  it("blocks a red merge even when the head is green", async () => {
    expect(
      classifyPr(
        await snapshot(admissionReader({ mergeChecks: [failedCheck()] }))
      )
    ).toMatchObject({ kind: "blocker" });
  });
  it("waits for pending merge checks while the forge is blocked by pending CI", async () => {
    const reader = admissionReader({
      mergeChecks: [pendingCheck()],
      mergeStateStatus: "BLOCKED",
    });
    const row = await readSnapshot({
      reader,
      context,
      pendingHistory: "include",
      allowDraft: false,
    });
    expect(classifyPr(row)).toMatchObject({ kind: "waiting" });
  });
  // The forge admits a mergeable pull request whose required checks are green
  // even when mergeStateStatus reports non-passing non-required statuses:
  // HAS_HOOKS and the UNSTABLE "mergeable with non-passing status" state. The
  // old CLEAN-only rule falsely refused the live PR964 candidate.
  for (const mergeStateStatus of ["CLEAN", "HAS_HOOKS", "UNSTABLE"] as const) {
    it(`admits a mergeable candidate with green required checks when forge is ${mergeStateStatus}`, async () => {
      const row = await snapshot(admissionReader({ mergeStateStatus }));
      expect(classifyPr(row)).toMatchObject({ kind: "ready" });
      expect(row).toMatchObject({
        ci: { github: { mergeStateStatus } },
      });
    });
  }
  it("does not treat forge UNSTABLE as an unconditional pass", async () => {
    expect(
      classifyPr(
        await snapshot(
          admissionReader({
            mergeStateStatus: "UNSTABLE",
            mergeChecks: [failedCheck()],
          })
        )
      )
    ).toMatchObject({ kind: "blocker" });
    const pending = await readSnapshot({
      reader: admissionReader({
        mergeStateStatus: "UNSTABLE",
        mergeChecks: [pendingCheck()],
      }),
      context,
      pendingHistory: "include",
      allowDraft: false,
    });
    expect(classifyPr(pending)).toMatchObject({ kind: "waiting" });
  });
  for (const mergeStateStatus of [
    "BLOCKED",
    "UNKNOWN",
    "BEHIND",
    "DIRTY",
    "DRAFT",
  ] as const) {
    it(`never trusts green merge checks when forge is ${mergeStateStatus}`, async () => {
      expect(
        classifyPr(await snapshot(admissionReader({ mergeStateStatus })))
      ).toMatchObject({ kind: "blocker" });
    });
  }
  it("never trusts unknown mergeability", async () => {
    expect(
      classifyPr(await snapshot(admissionReader({ mergeable: "UNKNOWN" })))
    ).toMatchObject({ kind: "blocker" });
  });
  for (const parents of [
    [oid("e"), head],
    [base, oid("e")],
    [head, base],
    [base, head, oid("e")],
  ]) {
    it(`rejects wrong synthetic parents ${parents.join(",")}`, async () => {
      await expect(
        snapshot(admissionReader({ parents }))
      ).rejects.toBeInstanceOf(ChecksUnavailable);
    });
  }
  for (const identityChange of ["head", "base", "ref", "merge", "repo"]) {
    it(`rejects ${identityChange} movement during the read`, async () => {
      await expect(
        snapshot(admissionReader({ identityChange }))
      ).rejects.toBeInstanceOf(ChecksUnavailable);
    });
  }
  for (const failure of ["identity", "checks"]) {
    it(`does not fall back to the head on ${failure} failure`, async () => {
      await expect(
        snapshot(admissionReader({ failure }))
      ).rejects.toBeInstanceOf(ChecksUnavailable);
    });
  }
  it("does not qualify without an authenticated current test merge", async () => {
    await expect(
      snapshot(admissionReader({ noMerge: true }))
    ).rejects.toBeInstanceOf(ChecksUnavailable);
  });
  it("rejects incomplete and repeated context pagination", async () => {
    await expect(
      snapshot(admissionReader({ incomplete: true }))
    ).rejects.toBeInstanceOf(ChecksUnavailable);
    await expect(
      snapshot(admissionReader({ repeatedCursor: true }))
    ).rejects.toBeInstanceOf(ChecksUnavailable);
  });
  it("uses head checks only after the current merge has zero contexts", async () => {
    const row = await snapshot(admissionReader({ mergeChecks: [] }));
    expect(classifyPr(row)).toMatchObject({ kind: "ready" });
    expect(row).toMatchObject({
      ci: { candidate: { kind: "head", oid: head } },
    });
  });
  it("uses current head checks when the stable empty merge has a stale first parent", async () => {
    const row = await snapshot(admissionReader({ mergeChecks: [], parents: [oid("e"), head] }));
    expect(classifyPr(row)).toMatchObject({ kind: "ready" });
    expect(row).toMatchObject({
      ci: { candidate: { kind: "head", oid: head, headOid: head, baseOid: base } },
    });
  });
  for (const mergeRecheck of ["appeared", "denied", "incomplete"] as const) {
    it(`refuses stale-merge head selection when final merge contexts are ${mergeRecheck}`, async () => {
      await expect(snapshot(admissionReader({ mergeChecks: [], parents: [oid("e"), head], mergeRecheck }))).rejects.toBeInstanceOf(ChecksUnavailable);
    });
  }
  for (const publishedCheck of [failedCheck(), pendingCheck()]) {
    it(`refuses head selection when a ${publishedCheck.kind} merge context is published during the final identity read`, async () => {
      const reader = admissionReader({ mergeChecks: [], parents: [oid("e"), head] });
      const readIdentity = reader.admissionIdentity.bind(reader);
      const readChecks = reader.commitCheckRollupPage.bind(reader);
      let identityReads = 0;
      let published = false;
      reader.admissionIdentity = async (...args) => {
        const identity = await readIdentity(...args);
        if (++identityReads === 2) published = true;
        return identity;
      };
      reader.commitCheckRollupPage = async (...args) =>
        args[1] === merge && published
          ? { checks: [publishedCheck], totalCount: 1, endCursor: null }
          : readChecks(...args);
      await expect(snapshot(reader)).rejects.toBeInstanceOf(ChecksUnavailable);
    });
  }
  for (const identityChange of ["head", "base", "ref", "merge", "repo", "head-repo", "parents"]) {
    it(`refuses stale-merge head selection after ${identityChange} identity movement`, async () => {
      await expect(snapshot(admissionReader({ mergeChecks: [], parents: [oid("e"), head], identityChange }))).rejects.toBeInstanceOf(ChecksUnavailable);
    });
  }
  for (const mergeChecks of [[passingCheck()], [failedCheck()], [pendingCheck()]]) {
    it(`refuses a stale merge with a ${mergeChecks[0]!.kind} context`, async () => {
      await expect(snapshot(admissionReader({ mergeChecks, parents: [oid("e"), head] }))).rejects.toBeInstanceOf(ChecksUnavailable);
    });
  }
  it("cannot use empty merge contexts to waive malformed parents or empty head checks", async () => {
    for (const parents of [[base], [base, oid("e")], [head, base], [base, head, oid("e")]])
      await expect(snapshot(admissionReader({ mergeChecks: [], parents }))).rejects.toBeInstanceOf(ChecksUnavailable);
    await expect(snapshot(admissionReader({ mergeChecks: [], parents: [oid("e"), head], headChecks: [] }))).rejects.toBeInstanceOf(ChecksUnavailable);
  });
  for (const options of [
    { mergeStateStatus: "BLOCKED" }, { mergeStateStatus: "BEHIND" },
    { mergeStateStatus: "UNKNOWN" }, { mergeStateStatus: "DRAFT" },
    { mergeable: "UNKNOWN" }, { draft: true }, { threads: true }, { changesRequested: true },
  ] as const) {
    it(`never gains stale-merge head readiness for ${JSON.stringify(options)}`, async () => {
      expect(classifyPr(await snapshot(admissionReader({ mergeChecks: [], parents: [oid("e"), head], ...options })))).toMatchObject({ kind: "blocker" });
    });
  }
  it("keeps same-name check and commit status separate when either fails", async () => {
    expect(
      classifyPr(
        await snapshot(
          admissionReader({
            mergeChecks: [passingCheck("same"), failedCheck("same")],
          })
        )
      )
    ).toMatchObject({ kind: "blocker" });
  });
  it("preserves thread, draft and changes-requested blocks", async () => {
    for (const options of [
      { threads: true },
      { draft: true },
      { changesRequested: true },
    ])
      expect(
        classifyPr(await snapshot(admissionReader(options)))
      ).toMatchObject({ kind: "blocker" });
  });
  it("synthetic readiness cannot use allow-draft to waive forge refusal", async () => {
    expect(
      classifyPr(
        await snapshot(
          admissionReader({ draft: true, mergeStateStatus: "BLOCKED" }),
          true
        ),
        true
      )
    ).toMatchObject({ kind: "blocker" });
  });
});

const parseIdentity = (value: unknown) =>
  (Reflect.get(github, "parseAdmissionIdentity") as Function)(
    value,
    context,
    "main"
  );
const parsePage = (value: unknown) =>
  (Reflect.get(github, "parseCommitChecksPage") as Function)(
    value,
    context,
    merge
  );
function identityResponse() {
  return {
    data: {
      repository: {
        id: "repo-id",
        nameWithOwner: "owner/repo",
        ref: { name: "main", target: { __typename: "Commit", oid: base } },
        pullRequest: {
          number: 42,
          headRefOid: head,
          headRefName: "feature",
          baseRefName: "main",
          headRepository: { id: "head-repo-id" },
          state: "OPEN",
          isDraft: false,
          mergedAt: null,
          mergeable: "MERGEABLE",
          mergeStateStatus: "CLEAN",
          reviewDecision: "APPROVED",
          potentialMergeCommit: {
            oid: merge,
            parents: {
              nodes: [{ oid: base }, { oid: head }],
              pageInfo: { hasNextPage: false },
            },
          },
        },
      },
    },
  };
}
function checkNode() {
  return {
    __typename: "CheckRun",
    id: "check-id",
    name: "same",
    status: "COMPLETED",
    conclusion: "SUCCESS",
    detailsUrl: "url",
    checkSuite: {
      commit: { oid: merge },
      app: { id: "app-id", databaseId: 17, slug: "forge" },
      creator: null,
    },
  };
}
function statusNode() {
  return {
    __typename: "StatusContext",
    id: "status-id",
    context: "same",
    state: "FAILURE",
    targetUrl: "url",
    commit: { oid: merge },
    creator: { id: "actor-id", login: "publisher" },
  };
}
function pageResponse() {
  return {
    data: {
      repository: {
        nameWithOwner: "owner/repo",
        object: {
          __typename: "Commit",
          oid: merge,
          statusCheckRollup: {
            contexts: {
              totalCount: 2,
              nodes: [checkNode(), statusNode()],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      },
    },
  };
}
describe("authenticated fixed-commit response parsing", () => {
  it("reads the actual ref tip instead of historical PR baseRefOid", () => {
    const response = identityResponse();
    Object.assign(response.data.repository.pullRequest, {
      baseRefOid: oid("e"),
    });
    expect(parseIdentity(response)).toMatchObject({
      baseOid: base,
      merge: { oid: merge, parents: [base, head] },
    });
  });
  it("retains type, node, commit and app or creator identity without deduping names", () => {
    const result = parsePage(pageResponse());
    expect(result.checks).toHaveLength(2);
    expect(result.checks[0]).toMatchObject({
      provenance: {
        type: "CheckRun",
        id: "check-id",
        commitOid: merge,
        app: { id: "app-id", databaseId: 17, slug: "forge" },
      },
    });
    expect(result.checks[1]).toMatchObject({
      kind: "failed",
      provenance: {
        type: "StatusContext",
        id: "status-id",
        creator: { id: "actor-id", login: "publisher" },
      },
    });
  });
  for (const mutate of [
    (v: any) => {
      v.errors = [{ message: "denied" }];
    },
    (v: any) => {
      v.data.repository.nameWithOwner = "wrong/repo";
    },
    (v: any) => {
      v.data.repository.object.oid = head;
    },
    (v: any) => {
      v.data.repository.object.statusCheckRollup.contexts.pageInfo = {
        hasNextPage: true,
        endCursor: null,
      };
    },
    (v: any) => {
      v.data.repository.object.statusCheckRollup.contexts.nodes[0].checkSuite.commit.oid =
        head;
    },
    (v: any) => {
      v.data.repository.object.statusCheckRollup.contexts.nodes[0] = {
        __typename: "FutureNode",
      };
    },
    (v: any) => {
      v.data.repository.object.statusCheckRollup.contexts.totalCount =
        undefined;
    },
  ]) {
    it("rejects denied, wrong-SHA or incomplete context responses", () => {
      const value = pageResponse();
      mutate(value);
      expect(() => parsePage(value)).toThrow(WatcherQueryError);
    });
  }
  it("does not exempt synthetic pending Code Review Gate by name", () => {
    const value = pageResponse();
    Object.assign(
      value.data.repository.object.statusCheckRollup.contexts.nodes[0],
      { name: "Code Review Gate", status: "IN_PROGRESS", conclusion: null }
    );
    expect(parsePage(value).checks[0]).toMatchObject({ kind: "pending" });
  });
});

describe("complete thread evidence", () => {
  const parse = (value: unknown) =>
    (Reflect.get(github, "parseReviewThreadPage") as Function)(value);
  const response = () => ({
    data: {
      repository: {
        pullRequest: {
          reviewThreads: {
            totalCount: 101,
            nodes: [],
            pageInfo: { hasNextPage: true, endCursor: "next" },
          },
        },
      },
    },
  });
  it("keeps the next cursor rather than declaring the first hundred complete", () => {
    expect(parse(response())).toMatchObject({
      totalCount: 101,
      endCursor: "next",
    });
  });
  it("rejects a truncated thread page without a continuation cursor", () => {
    const value = response();
    Object.assign(value.data.repository.pullRequest.reviewThreads.pageInfo, {
      endCursor: null,
    });
    expect(() => parse(value)).toThrow(WatcherQueryError);
  });
  it("rejects missing pagination or denied thread data", () => {
    const value = response();
    Reflect.deleteProperty(
      value.data.repository.pullRequest.reviewThreads,
      "pageInfo"
    );
    expect(() => parse(value)).toThrow(WatcherQueryError);
    expect(() =>
      parse({ ...response(), errors: [{ message: "denied" }] })
    ).toThrow(WatcherQueryError);
  });
});
