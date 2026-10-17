import type {
  Check,
  CommitRollup,
  GitHubReader,
  OpenPullRequest,
  PrContext,
  PullRequestFacts,
  Repository,
  ReviewThread,
  RollupPage,
} from "./types.ts";
import { parsePrNumber } from "./types.ts";

export interface FakeReaderOptions {
  readonly facts?: Partial<Omit<PullRequestFacts, "context">>;
  readonly fastPath?:
    | { readonly kind: "checks"; readonly checks: readonly Check[] }
    | {
        readonly kind: "unusable";
        readonly exitCode: number;
        readonly stderr: string;
      };
  readonly rollupPages?: readonly RollupPage[];
  readonly threads?: readonly ReviewThread[];
  readonly commitRollups?: readonly CommitRollup[];
  readonly openPullRequests?: readonly OpenPullRequest[];
  readonly origin?: Repository | null;
  readonly current?: PrContext;
}

export function passingCheck(name = "ci"): Check {
  return {
    kind: "passed",
    name,
    reportedState: "SUCCESS",
    description: "",
    link: "",
    workflow: "",
  };
}

export function pendingCheck(name = "ci"): Check {
  return {
    kind: "pending",
    name,
    reportedState: "PENDING",
    description: "",
    link: "",
    workflow: "",
  };
}

export function failedCheck(name = "ci"): Check {
  return {
    kind: "failed",
    name,
    reportedState: "FAILURE",
    description: "",
    link: "",
    workflow: "",
  };
}

export function fakeReader(
  options: FakeReaderOptions = {}
): GitHubReader & { readonly calls: readonly string[] } {
  const calls: string[] = [];
  const context = options.current ?? {
    owner: "owner",
    repo: "repo",
    number: parsePrNumber(1),
  };
  const defaults: PullRequestFacts = {
    context,
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    reviewDecision: "APPROVED",
    headRefOid: "head",
    headRefName: "feature",
    baseRefName: "main",
    state: "OPEN",
    mergedAt: null,
    isDraft: false,
  };
  let page = 0;
  return {
    calls,
    async originRepo() {
      calls.push("originRepo");
      return options.origin === undefined
        ? { owner: "owner", repo: "repo" }
        : options.origin;
    },
    async currentPr(pr) {
      calls.push("currentPr");
      return { ...context, number: pr ?? context.number };
    },
    async pullRequest(requested) {
      calls.push("pullRequest");
      return { ...defaults, ...options.facts, context: requested };
    },
    async openPullRequests() {
      calls.push("openPullRequests");
      return options.openPullRequests ?? [];
    },
    async admissionIdentity(requested) {
      calls.push("admissionIdentity");
      const facts = { ...defaults, ...options.facts, context: requested };
      return {
        facts,
        repositoryId: "repository",
        headRepositoryId: "repository",
        baseOid: "base",
        merge: { oid: "merge", parents: ["base", facts.headRefOid ?? "head"] },
      };
    },
    async commitCheckRollupPage(_requested, oid, after) {
      calls.push(`commitCheckRollupPage:${oid}:${after ?? "null"}`);
      if (oid === "merge")
        return { checks: [], totalCount: 0, endCursor: null };
      const fast = options.fastPath ?? {
        kind: "checks",
        checks: [passingCheck()],
      };
      if (fast.kind === "checks" && fast.checks.length)
        return {
          checks: fast.checks,
          totalCount: fast.checks.length,
          endCursor: null,
        };
      const result = options.rollupPages?.[page++] ?? {
        checks: [],
        endCursor: null,
      };
      return {
        ...result,
        totalCount:
          options.rollupPages?.reduce((n, p) => n + p.checks.length, 0) ?? 0,
      };
    },
    async reviewThreads() {
      calls.push("reviewThreads");
      return options.threads ?? [];
    },
    async commitRollups() {
      calls.push("commitRollups");
      return options.commitRollups ?? [{ oid: "head", state: "SUCCESS" }];
    },
  };
}
