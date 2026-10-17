import { spawn } from "node:child_process";
import type * as T from "./types.ts";
import { nonEmpty, parsePrNumber } from "./types.ts";
export const REVIEW_THREADS_QUERY = `
query ReviewThreads($owner: String!, $repo: String!, $pr: Int!, $after: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $after) {
        totalCount pageInfo { hasNextPage endCursor }
        nodes {
          id isResolved
          comments(first: 10) { nodes { body createdAt path line author { login } } }
        }
      }
    }
  }
}`;
export const PR_COMMIT_STATUS_QUERY =
  "\nquery PrCommitStatuses($owner: String!, $repo: String!, $pr: Int!) {\n  repository(owner: $owner, name: $repo) {\n    pullRequest(number: $pr) {\n      commits(last: 50) {\n        nodes {\n          commit {\n            oid\n            statusCheckRollup {\n              state\n            }\n          }\n        }\n      }\n    }\n  }\n}\n";
export const PR_ADMISSION_QUERY = `
query PrAdmission($owner: String!, $repo: String!, $pr: Int!, $ref: String!) {
  repository(owner: $owner, name: $repo) {
    id nameWithOwner
    ref(qualifiedName: $ref) { name target { __typename oid } }
    pullRequest(number: $pr) {
      number headRefOid headRefName baseRefName headRepository { id }
      mergeable mergeStateStatus reviewDecision state mergedAt isDraft
      potentialMergeCommit {
        oid parents(first: 3) { nodes { oid } pageInfo { hasNextPage } }
      }
    }
  }
}`;
export const COMMIT_CHECK_ROLLUP_QUERY = `
query CommitChecks($owner: String!, $repo: String!, $oid: GitObjectID!, $after: String) {
  repository(owner: $owner, name: $repo) {
    nameWithOwner
    object(oid: $oid) {
      __typename ... on Commit {
        oid statusCheckRollup {
          contexts(first: 100, after: $after) {
            totalCount pageInfo { hasNextPage endCursor }
            nodes {
              __typename
              ... on CheckRun {
                id name status conclusion detailsUrl
                checkSuite { commit { oid } app { id databaseId slug } creator { id login } }
              }
              ... on StatusContext {
                id context state targetUrl description commit { oid } creator { ... on Node { id } login }
              }
            }
          }
        }
      }
    }
  }
}`;

interface CommandResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}
export class WatcherQueryError extends Error {
  readonly failure: T.QueryFailure;
  constructor(failure: T.QueryFailure) {
    super(failure.detail);
    this.name = "WatcherQueryError";
    this.failure = failure;
  }
}
export class ChecksUnavailable extends WatcherQueryError {
  constructor(detail: string) {
    super({ kind: "checks-unavailable", retryable: true, detail });
    this.name = "ChecksUnavailable";
  }
}
const firstLine = (value: string): string =>
  value.trim().split(/\r?\n/, 1)[0]?.slice(0, 240) ?? "";
function run(argv: readonly [string, ...string[]]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}
function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new WatcherQueryError({
      kind: "json-parse",
      retryable: true,
      detail: `${label}: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
async function runJson(argv: readonly [string, ...string[]]): Promise<unknown> {
  const result = await run(argv);
  if (result.code !== 0)
    throw new WatcherQueryError({
      kind: "command-exit",
      retryable: true,
      code: result.code,
      detail:
        firstLine(result.stderr) || `${argv.join(" ")} exited ${result.code}`,
    });
  return parseJson(result.stdout, argv.join(" "));
}
function raw(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function missing(path: string, value?: unknown): never {
  throw new WatcherQueryError({
    kind: "missing-key",
    retryable: true,
    detail:
      value === undefined
        ? `missing ${path}`
        : `invalid ${path}: ${raw(value)}`,
    ...(value === undefined ? {} : { rawValue: raw(value) }),
  });
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function record(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) missing(path, value);
  return value;
}
function list(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) missing(path, value);
  return value;
}
function at(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const key of path) {
    const object = record(current, path.join("."));
    if (!(key in object)) missing(path.join("."));
    current = object[key];
  }
  return current;
}
function string(value: unknown, path: string): string {
  if (typeof value !== "string") missing(path, value);
  return value;
}
const optionalString = (value: unknown, path: string): string | null =>
  value === null ? null : string(value, path);
function enumValue<const V extends readonly string[]>(
  value: unknown,
  values: V,
  path: string
): V[number] {
  if (typeof value === "string")
    for (const candidate of values) if (candidate === value) return candidate;
  return missing(path, value);
}
const nullableEnum = <const V extends readonly string[]>(
  value: unknown,
  values: V,
  path: string
): V[number] | null => (value === null ? null : enumValue(value, values, path));
const MERGE_STATES = [
  "BEHIND",
  "BLOCKED",
  "CLEAN",
  "CONFLICTING",
  "DIRTY",
  "DRAFT",
  "HAS_HOOKS",
  "UNKNOWN",
  "UNSTABLE",
] as const satisfies readonly T.MergeStateStatus[];
const ROLLUP_STATES = [
  "ERROR",
  "EXPECTED",
  "FAILURE",
  "PENDING",
  "SUCCESS",
] as const;
const REVIEW_DECISIONS = [
  "APPROVED",
  "CHANGES_REQUESTED",
  "REVIEW_REQUIRED",
] as const;
// `gh pr view` reports no review decision as "", not null. Only this field does
// it, so the normalization stays here rather than in nullableEnum, where it
// would stop a genuinely unexpected rollup state from failing closed.
const reviewDecision = (value: unknown): T.ReviewDecision =>
  nullableEnum(
    value === "" ? null : value,
    REVIEW_DECISIONS,
    "pull request.reviewDecision"
  );
function parseRemote(value: string): T.Repository | null {
  let normalized = value.trim();
  if (normalized.startsWith("git@github.com:"))
    normalized = `https://github.com/${normalized.slice(15)}`;
  if (normalized.startsWith("ssh://git@github.com/"))
    normalized = `https://github.com/${normalized.slice(21)}`;
  try {
    const url = new URL(normalized);
    const parts = url.pathname
      .replace(/\.git$/, "")
      .split("/")
      .filter(Boolean);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      parts.length !== 2
    )
      return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}
function parsePrUrl(value: string): T.PrContext {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      parts.length !== 4 ||
      parts[2] !== "pull"
    )
      throw new Error("not a canonical GitHub pull URL");
    return {
      owner: parts[0],
      repo: parts[1],
      number: parsePrNumber(Number(parts[3])),
    };
  } catch (error) {
    throw new WatcherQueryError({
      kind: "invalid-context-url",
      retryable: false,
      rawValue: value,
      detail: `could not infer owner/repo from PR URL: ${value} (${error instanceof Error ? error.message : String(error)})`,
    });
  }
}
function checkDetails(value: Record<string, unknown>, nameKey: string) {
  return {
    name: string(value[nameKey], nameKey),
    description: typeof value.description === "string" ? value.description : "",
    link:
      typeof value.link === "string"
        ? value.link
        : typeof value.detailsUrl === "string"
          ? value.detailsUrl
          : "",
    workflow: typeof value.workflow === "string" ? value.workflow : "",
  };
}
// The owner-approval gate is excluded from pending everywhere, so the rule has
// one home. Classifying it as pending on either read path makes the watcher
// wait on a human, which is the behaviour #172004 removed from the Python.
function pendingOrGate(
  details: {
    readonly name: string;
    readonly description: string;
    readonly link: string;
    readonly workflow: string;
  },
  reportedState: string
): T.Check {
  return details.name === "Code Review Gate"
    ? {
        ...details,
        kind: "code-review-gate",
        name: "Code Review Gate",
        reportedState,
      }
    : { ...details, kind: "pending", reportedState };
}
export function mapRollupNode(value: unknown): T.Check | null {
  const object = record(value, "rollup node");
  const typename = object.__typename;
  if (typename !== "CheckRun" && typename !== "StatusContext") return null;
  const details = checkDetails(
    object,
    typename === "CheckRun" ? "name" : "context"
  );
  const link =
    typeof object.targetUrl === "string" ? object.targetUrl : details.link;
  if (typename === "CheckRun") {
    const status =
      typeof object.status === "string" ? object.status.toUpperCase() : "";
    const conclusion =
      typeof object.conclusion === "string"
        ? object.conclusion.toUpperCase()
        : "";
    if (status !== "COMPLETED")
      return pendingOrGate({ ...details, link }, "PENDING");
    if (conclusion === "SUCCESS")
      return { ...details, link, kind: "passed", reportedState: "SUCCESS" };
    if (conclusion === "NEUTRAL" || conclusion === "SKIPPED")
      return { ...details, link, kind: "skipped", reportedState: conclusion };
    return {
      ...details,
      link,
      kind: "failed",
      reportedState: conclusion === "ACTION_REQUIRED" ? conclusion : "FAILURE",
    };
  }
  const state =
    typeof object.state === "string" ? object.state.toUpperCase() : "";
  if (state === "PENDING" || state === "EXPECTED")
    return pendingOrGate({ ...details, link }, "PENDING");
  return state === "SUCCESS"
    ? { ...details, link, kind: "passed", reportedState: state }
    : { ...details, link, kind: "failed", reportedState: state || "FAILURE" };
}
function parseComment(value: unknown): T.ReviewComment {
  const object = record(value, "review comment");
  const author =
    object.author === null
      ? null
      : record(object.author, "review comment.author");
  return {
    authorLogin:
      author === null
        ? null
        : optionalString(author.login, "review comment.author.login"),
    body: string(object.body, "review comment.body"),
    path: optionalString(object.path, "review comment.path"),
    line:
      object.line === null
        ? null
        : Number.isInteger(object.line)
          ? Number(object.line)
          : missing("review comment.line", object.line),
    createdAt: string(object.createdAt, "review comment.createdAt"),
  };
}
function isBugbot(comment: T.ReviewComment | null): boolean {
  if (comment === null) return false;
  const author = (comment.authorLogin ?? "").toLowerCase();
  const body = comment.body.toLowerCase();
  return (
    author.includes("bugbot") ||
    (author === "cursor" &&
      [
        "bugbot",
        "cursor_automation_id",
        "agentic security review",
        "description start",
        "severity",
      ].some((token) => body.includes(token)))
  );
}
function passKey(comment: T.ReviewComment | null): string | null {
  if (comment === null) return null;
  for (const pattern of [
    /RUN_ID:\s*([a-zA-Z0-9_.:-]+)/,
    /CURSOR_AUTOMATION_ID:\s*([a-zA-Z0-9_.:-]+)/,
  ]) {
    const match = pattern.exec(comment.body);
    if (match?.[1]) return match[1];
  }
  return null;
}
export function parseReviewThreadPage(value: unknown): {
  readonly nodes: readonly unknown[];
  readonly endCursor: string | null;
  readonly totalCount: number;
} {
  const response = record(value, "GraphQL response");
  if (response.errors !== undefined) missing("GraphQL errors", response.errors);
  const threads = record(
    at(response, ["data", "repository", "pullRequest", "reviewThreads"]),
    "reviewThreads"
  );
  if (
    !Number.isSafeInteger(threads.totalCount) ||
    Number(threads.totalCount) < 0
  )
    missing("reviewThreads.totalCount", threads.totalCount);
  const page = record(threads.pageInfo, "reviewThreads.pageInfo");
  if (typeof page.hasNextPage !== "boolean")
    missing("reviewThreads.hasNextPage", page.hasNextPage);
  const cursor = optionalString(page.endCursor, "reviewThreads.endCursor");
  if (page.hasNextPage && (cursor === null || !cursor.trim()))
    missing("reviewThreads continuation cursor", cursor);
  return {
    nodes: list(threads.nodes, "reviewThreads.nodes"),
    endCursor: page.hasNextPage ? cursor : null,
    totalCount: Number(threads.totalCount),
  };
}
export function parseReviewThreads(value: unknown): readonly T.ReviewThread[] {
  const nodes = list(
    at(value, ["data", "repository", "pullRequest", "reviewThreads", "nodes"]),
    "reviewThreads.nodes"
  );
  const threads: {
    readonly id: string;
    readonly firstComment: T.ReviewComment | null;
    readonly resolved: boolean;
  }[] = [];
  for (const node of nodes) {
    const thread = record(node, "review thread");
    if (typeof thread.isResolved !== "boolean")
      missing("review thread.isResolved", thread.isResolved);
    const comments = list(
      at(thread, ["comments", "nodes"]),
      "review thread.comments.nodes"
    );
    threads.push({
      id: string(thread.id, "review thread.id"),
      firstComment: comments.length === 0 ? null : parseComment(comments[0]),
      resolved: thread.isResolved,
    });
  }
  const keys = new Set<string>();
  let keyless = false;
  for (const thread of threads) {
    if (!isBugbot(thread.firstComment)) continue;
    const key = passKey(thread.firstComment);
    if (key === null) keyless = true;
    else keys.add(key);
  }
  const passes = keys.size > 0 ? keys.size : keyless ? 1 : 0;
  return threads
    .filter((thread) => !thread.resolved)
    .map(({ id, firstComment }) => ({
      id,
      firstComment,
      isBugbot: isBugbot(firstComment),
      bugbotReviewPasses: passes,
    }));
}
export function parsePullRequest(
  value: unknown,
  context: T.PrContext
): T.PullRequestFacts {
  const object = record(value, "pull request");
  if (typeof object.isDraft !== "boolean")
    missing("pull request.isDraft", object.isDraft);
  return {
    context,
    mergeable: enumValue(
      object.mergeable,
      ["MERGEABLE", "CONFLICTING", "UNKNOWN"] as const,
      "pull request.mergeable"
    ),
    mergeStateStatus: enumValue(
      object.mergeStateStatus,
      MERGE_STATES,
      "pull request.mergeStateStatus"
    ),
    reviewDecision: reviewDecision(object.reviewDecision),
    headRefOid: optionalString(object.headRefOid, "pull request.headRefOid"),
    headRefName: string(object.headRefName, "pull request.headRefName"),
    baseRefName: string(object.baseRefName, "pull request.baseRefName"),
    state: enumValue(
      object.state,
      ["OPEN", "CLOSED", "MERGED"] as const,
      "pull request.state"
    ),
    mergedAt: optionalString(object.mergedAt, "pull request.mergedAt"),
    isDraft: object.isDraft,
  };
}
function graphqlArgs(
  query: string,
  context: T.PrContext
): [string, ...string[]] {
  return [
    "gh",
    "api",
    "graphql",
    "-f",
    `query=${query}`,
    "-f",
    `owner=${context.owner}`,
    "-f",
    `repo=${context.repo}`,
    "-F",
    `pr=${context.number}`,
  ];
}

export class GhGitHubReader implements T.GitHubReader {
  async originRepo(): Promise<T.Repository | null> {
    const result = await run(["git", "remote", "get-url", "origin"]);
    return result.code === 0 ? parseRemote(result.stdout) : null;
  }
  async currentPr(pr: T.PrNumber | null): Promise<T.PrContext> {
    const argv: [string, ...string[]] = ["gh", "pr", "view"];
    if (pr !== null) argv.push(String(pr));
    argv.push("--json", "number,url");
    const object = record(await runJson(argv), "current PR");
    const parsed = parsePrUrl(string(object.url, "current PR.url"));
    return {
      ...parsed,
      number: pr ?? parsePrNumber(object.number, "current PR.number"),
    };
  }
  async pullRequest(context: T.PrContext): Promise<T.PullRequestFacts> {
    return parsePullRequest(
      await runJson([
        "gh",
        "pr",
        "view",
        String(context.number),
        "--repo",
        `${context.owner}/${context.repo}`,
        "--json",
        "mergeable,mergeStateStatus,reviewDecision,headRefOid,headRefName,baseRefName,state,mergedAt,isDraft",
      ]),
      context
    );
  }
  async openPullRequests(
    repository: T.Repository
  ): Promise<readonly T.OpenPullRequest[]> {
    const value = await runJson([
      "gh",
      "pr",
      "list",
      "--repo",
      `${repository.owner}/${repository.repo}`,
      "--state",
      "open",
      "--limit",
      "300",
      "--json",
      "number,headRefName,baseRefName",
    ]);
    return list(value, "open PRs").map((item, index) => {
      const object = record(item, `open PRs[${index}]`);
      return {
        number: parsePrNumber(object.number, `open PRs[${index}].number`),
        headRefName: string(
          object.headRefName,
          `open PRs[${index}].headRefName`
        ),
        baseRefName: string(
          object.baseRefName,
          `open PRs[${index}].baseRefName`
        ),
      };
    });
  }
  async admissionIdentity(
    context: T.PrContext,
    baseRefName: string
  ): Promise<T.AdmissionIdentity> {
    const argv = graphqlArgs(PR_ADMISSION_QUERY, context);
    argv.push("-f", `ref=refs/heads/${baseRefName}`);
    return parseAdmissionIdentity(await runJson(argv), context, baseRefName);
  }
  async commitCheckRollupPage(
    context: T.PrContext,
    oid: string,
    after: string | null
  ): Promise<T.CommitChecksPage> {
    const argv: [string, ...string[]] = [
      "gh",
      "api",
      "graphql",
      "-f",
      `query=${COMMIT_CHECK_ROLLUP_QUERY}`,
      "-f",
      `owner=${context.owner}`,
      "-f",
      `repo=${context.repo}`,
      "-f",
      `oid=${oid}`,
    ];
    if (after !== null) argv.push("-f", `after=${after}`);
    return parseCommitChecksPage(await runJson(argv), context, oid);
  }
  async reviewThreads(
    context: T.PrContext
  ): Promise<readonly T.ReviewThread[]> {
    const nodes: unknown[] = [];
    const cursors = new Set<string>();
    let after: string | null = null;
    let total: number | null = null;
    do {
      const argv = graphqlArgs(REVIEW_THREADS_QUERY, context);
      if (after !== null) argv.push("-f", `after=${after}`);
      const page = parseReviewThreadPage(await runJson(argv));
      if (total !== null && total !== page.totalCount)
        throw new ChecksUnavailable("thread count moved during pagination");
      total = page.totalCount;
      nodes.push(...page.nodes);
      after = page.endCursor;
      if (after !== null) {
        if (cursors.has(after) || nodes.length >= total)
          throw new ChecksUnavailable(
            "incomplete or repeated thread pagination"
          );
        cursors.add(after);
      }
    } while (after !== null);
    if (nodes.length !== total)
      throw new ChecksUnavailable("incomplete review threads");
    const ids = nodes.map((node) => nonBlank(at(node, ["id"]), "thread.id"));
    if (new Set(ids).size !== ids.length)
      throw new ChecksUnavailable(
        "duplicate thread identity during pagination"
      );
    return parseReviewThreads({
      data: { repository: { pullRequest: { reviewThreads: { nodes } } } },
    });
  }
  async commitRollups(
    context: T.PrContext
  ): Promise<readonly T.CommitRollup[]> {
    const value = await runJson(graphqlArgs(PR_COMMIT_STATUS_QUERY, context));
    const commits = list(
      at(value, ["data", "repository", "pullRequest", "commits", "nodes"]),
      "commits.nodes"
    );
    return commits.map((item, index) => {
      const commit = record(at(item, ["commit"]), `commits[${index}].commit`);
      const rollup = commit.statusCheckRollup;
      return {
        oid: string(commit.oid, `commits[${index}].oid`),
        state:
          rollup === null
            ? null
            : nullableEnum(
                at(rollup, ["state"]),
                ROLLUP_STATES,
                `commits[${index}].statusCheckRollup.state`
              ),
      };
    });
  }
}

function authenticatedRepository(
  value: unknown,
  context: T.PrContext
): Record<string, unknown> {
  const response = record(value, "GraphQL response");
  if (response.errors !== undefined) missing("GraphQL errors", response.errors);
  const repository = record(at(response, ["data", "repository"]), "repository");
  if (
    string(
      repository.nameWithOwner,
      "repository.nameWithOwner"
    ).toLowerCase() !== `${context.owner}/${context.repo}`.toLowerCase()
  )
    missing("repository identity", repository.nameWithOwner);
  return repository;
}
function nonBlank(value: unknown, path: string): string {
  const result = string(value, path);
  if (!result.trim()) missing(path, value);
  return result;
}
function commitOid(value: unknown, path: string): string {
  const oid = nonBlank(value, path);
  if (!/^[0-9a-f]{40}$/.test(oid)) missing(path, value);
  return oid;
}
export function parseAdmissionIdentity(
  value: unknown,
  context: T.PrContext,
  baseRefName: string
): T.AdmissionIdentity {
  const repository = authenticatedRepository(value, context);
  const pr = record(repository.pullRequest, "pull request");
  if (pr.number !== context.number) missing("pull request.number", pr.number);
  const facts = parsePullRequest(pr, context);
  commitOid(facts.headRefOid, "pull request.headRefOid");
  if (facts.baseRefName !== baseRefName)
    throw new ChecksUnavailable(
      "pull request target moved during identity capture"
    );
  const ref = record(repository.ref, "target ref");
  if (ref.name !== baseRefName) missing("target ref.name", ref.name);
  const target = record(ref.target, "target ref.target");
  if (target.__typename !== "Commit")
    missing("target ref commit", target.__typename);
  let merge: T.AdmissionIdentity["merge"] = null;
  if (pr.potentialMergeCommit !== null) {
    const candidate = record(pr.potentialMergeCommit, "potentialMergeCommit");
    const parents = record(candidate.parents, "potentialMergeCommit.parents");
    if (at(parents, ["pageInfo", "hasNextPage"]) !== false)
      missing("complete merge parents");
    merge = {
      oid: commitOid(candidate.oid, "merge oid"),
      parents: list(parents.nodes, "merge parents").map((p) =>
        commitOid(at(p, ["oid"]), "parent oid")
      ),
    };
  }
  return {
    facts,
    repositoryId: nonBlank(repository.id, "repository.id"),
    headRepositoryId: nonBlank(
      at(pr, ["headRepository", "id"]),
      "headRepository.id"
    ),
    baseOid: commitOid(target.oid, "target ref.oid"),
    merge,
  };
}
export function parseCommitChecksPage(
  value: unknown,
  context: T.PrContext,
  oid: string
): T.CommitChecksPage {
  const repository = authenticatedRepository(value, context);
  const commit = record(repository.object, "commit");
  if (commit.__typename !== "Commit" || commit.oid !== oid)
    missing("fixed commit identity", commit);
  if (commit.statusCheckRollup === null)
    return { checks: [], endCursor: null, totalCount: 0 };
  const contexts = record(
    at(commit, ["statusCheckRollup", "contexts"]),
    "contexts"
  );
  if (
    !Number.isSafeInteger(contexts.totalCount) ||
    Number(contexts.totalCount) < 0
  )
    missing("contexts.totalCount", contexts.totalCount);
  const checks = list(contexts.nodes, "contexts.nodes").map((node) => {
    const object = record(node, "context");
    const type = enumValue(
      object.__typename,
      ["CheckRun", "StatusContext"] as const,
      "context type"
    );
    const check = mapRollupNode(object);
    if (check === null) missing("context type", type);
    const suite =
      type === "CheckRun" ? record(object.checkSuite, "checkSuite") : null;
    const commitOid = at(suite ?? object, ["commit", "oid"]);
    if (commitOid !== oid) missing("context commit identity", commitOid);
    const appObject =
      suite === null || suite.app === null
        ? null
        : record(suite.app, "checkSuite.app");
    if (
      appObject !== null &&
      (!Number.isSafeInteger(appObject.databaseId) ||
        Number(appObject.databaseId) <= 0)
    )
      missing("app.databaseId", appObject.databaseId);
    const creatorValue = (suite ?? object).creator;
    const creatorObject =
      creatorValue === null ? null : record(creatorValue, "context creator");
    const provenance: T.CheckProvenance = {
      type,
      id: nonBlank(object.id, "context.id"),
      commitOid: oid,
      app:
        appObject === null
          ? null
          : {
              id: nonBlank(appObject.id, "app.id"),
              databaseId: Number(appObject.databaseId),
              slug: nonBlank(appObject.slug, "app.slug"),
            },
      creator:
        creatorObject === null
          ? null
          : {
              id: nonBlank(creatorObject.id, "creator.id"),
              login: nonBlank(creatorObject.login, "creator.login"),
            },
    };
    if (provenance.app === null && provenance.creator === null)
      missing("context publisher identity");
    return check.kind === "code-review-gate"
      ? { ...check, provenance, kind: "pending" as const }
      : { ...check, provenance };
  });
  const page = record(contexts.pageInfo, "contexts.pageInfo");
  if (typeof page.hasNextPage !== "boolean")
    missing("hasNextPage", page.hasNextPage);
  const cursor = optionalString(page.endCursor, "endCursor");
  if (page.hasNextPage && (cursor === null || !cursor.trim()))
    missing("continuation cursor", cursor);
  return {
    checks,
    totalCount: Number(contexts.totalCount),
    endCursor: page.hasNextPage ? cursor : null,
  };
}
export function validateAdmissionIdentity(identity: T.AdmissionIdentity): void {
  const merge = identity.merge;
  if (merge === null)
    throw new ChecksUnavailable(
      "current test merge is unavailable; cannot select head checks"
    );
  if (
    merge.parents.length !== 2 ||
    merge.parents[1] !== identity.facts.headRefOid
  )
    throw new ChecksUnavailable(
      "test merge must have exactly two parents with the current PR head second"
    );
}
export function assertSameAdmission(
  before: T.AdmissionIdentity,
  after: T.AdmissionIdentity
): void {
  validateAdmissionIdentity(after);
  if (
    before.repositoryId !== after.repositoryId ||
    before.headRepositoryId !== after.headRepositoryId ||
    before.baseOid !== after.baseOid ||
    before.facts.headRefOid !== after.facts.headRefOid ||
    before.facts.headRefName !== after.facts.headRefName ||
    before.facts.baseRefName !== after.facts.baseRefName ||
    before.facts.state !== after.facts.state ||
    before.merge?.oid !== after.merge?.oid ||
    before.merge?.parents.some((parent, index) => parent !== after.merge?.parents[index])
  )
    throw new ChecksUnavailable(
      "PR, target or test merge identity moved while reading checks; re-read the candidate"
    );
}
async function completeCommitChecks(
  reader: T.GitHubReader,
  context: T.PrContext,
  oid: string
): Promise<readonly T.Check[]> {
  const checks: T.Check[] = [];
  const cursors = new Set<string>();
  let after: string | null = null;
  let total: number | null = null;
  do {
    const page = await reader.commitCheckRollupPage(context, oid, after);
    if (total !== null && total !== page.totalCount)
      throw new ChecksUnavailable(
        "check context count moved during pagination"
      );
    total = page.totalCount;
    checks.push(...page.checks);
    after = page.endCursor;
    if (after !== null) {
      if (cursors.has(after) || checks.length >= total)
        throw new ChecksUnavailable(
          "incomplete or repeated context pagination"
        );
      cursors.add(after);
    }
  } while (after !== null);
  if (checks.length !== total)
    throw new ChecksUnavailable("incomplete fixed-commit contexts");
  const ids = checks.flatMap((c) => (c.provenance ? [c.provenance.id] : []));
  if (new Set(ids).size !== ids.length)
    throw new ChecksUnavailable("duplicate context identity during pagination");
  return checks;
}
export async function confirmHeadChecksSelection(
  reader: T.GitHubReader,
  context: T.PrContext,
  identity: T.AdmissionIdentity
): Promise<void> {
  if (identity.merge === null || (await completeCommitChecks(reader, context, identity.merge.oid)).length > 0)
    throw new ChecksUnavailable("test merge contexts appeared while reading head checks; re-read the candidate");
}
export async function resolveChecks(
  reader: T.GitHubReader,
  context: T.PrContext,
  identity: T.AdmissionIdentity
): Promise<T.CheckRead> {
  validateAdmissionIdentity(identity);
  if (identity.merge === null || identity.facts.headRefOid === null)
    throw new ChecksUnavailable("missing candidate");
  const mergeChecks = await completeCommitChecks(
    reader,
    context,
    identity.merge.oid
  );
  if (mergeChecks.length > 0 && identity.merge.parents[0] !== identity.baseOid)
    throw new ChecksUnavailable("selected test merge does not match the actual target tip");
  const headChecks = await completeCommitChecks(
    reader,
    context,
    identity.facts.headRefOid
  );
  const kind = mergeChecks.length ? "test-merge" : "head";
  // The historical head-only human gate exemption cannot qualify a test merge.
  const selected =
    kind === "head"
      ? headChecks.map((c) =>
          c.kind === "pending" && c.name === "Code Review Gate"
            ? {
                ...c,
                kind: "code-review-gate" as const,
                name: "Code Review Gate" as const,
              }
            : c
        )
      : mergeChecks.map((c) =>
          c.kind === "code-review-gate" ? { ...c, kind: "pending" as const } : c
        );
  const checks = nonEmpty(selected);
  if (checks === null)
    throw new ChecksUnavailable(
      "current test merge and head both have zero contexts"
    );
  return {
    source: "graphql-commit",
    checks,
    headChecks,
    candidate: {
      kind,
      oid:
        kind === "test-merge" ? identity.merge.oid : identity.facts.headRefOid,
      headOid: identity.facts.headRefOid,
      baseOid: identity.baseOid,
    },
  };
}
export async function resolveContext(args: {
  readonly reader: T.GitHubReader;
  readonly owner: string | null;
  readonly repo: string | null;
  readonly pr: T.PrNumber | null;
}): Promise<T.PrContext> {
  if (args.pr !== null && args.owner !== null && args.repo !== null)
    return { owner: args.owner, repo: args.repo, number: args.pr };
  if (args.pr !== null) {
    const origin = await args.reader.originRepo();
    if (origin !== null)
      return {
        owner: args.owner ?? origin.owner,
        repo: args.repo ?? origin.repo,
        number: args.pr,
      };
  }
  const inferred = await args.reader.currentPr(args.pr);
  return {
    owner: args.owner ?? inferred.owner,
    repo: args.repo ?? inferred.repo,
    number: args.pr ?? inferred.number,
  };
}
export function orderStack(
  context: T.PrContext,
  open: readonly T.OpenPullRequest[]
): T.NonEmpty<T.PrContext> {
  const byNumber = new Map(open.map((pr) => [pr.number, pr]));
  const byHead = new Map(open.map((pr) => [pr.headRefName, pr]));
  const children = new Map<string, T.OpenPullRequest[]>();
  for (const pr of open)
    children.set(pr.baseRefName, [...(children.get(pr.baseRefName) ?? []), pr]);
  for (const values of children.values())
    values.sort((a, b) => a.number - b.number);
  const start = byNumber.get(context.number);
  if (start === undefined) return [context];
  const down: T.OpenPullRequest[] = [];
  let current = start;
  while (byHead.has(current.baseRefName)) {
    const parent = byHead.get(current.baseRefName);
    if (parent === undefined) break;
    down.push(parent);
    current = parent;
  }
  const seen = new Set<T.PrNumber>([
    ...down.map((pr) => pr.number),
    start.number,
  ]);
  const up: T.OpenPullRequest[] = [];
  const visit = (parent: T.OpenPullRequest): void => {
    for (const child of children.get(parent.headRefName) ?? []) {
      if (seen.has(child.number)) continue;
      seen.add(child.number);
      up.push(child);
      visit(child);
    }
  };
  visit(start);
  return (
    nonEmpty(
      [...down.reverse(), start, ...up].map((pr) => ({
        ...context,
        number: pr.number,
      }))
    ) ?? [context]
  );
}
export async function discoverStack(
  reader: T.GitHubReader,
  context: T.PrContext
): Promise<T.NonEmpty<T.PrContext>> {
  return orderStack(context, await reader.openPullRequests(context));
}
