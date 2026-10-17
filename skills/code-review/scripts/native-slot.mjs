#!/usr/bin/env node
// Slot 02 of the review pair: native Open Code Review (`ocr`) as a second,
// independent engine on one fixed candidate.
//
// The adapter owns three things: the argument array handed to the CLI, the raw
// output it keeps, and an honest reading of the run manifest. It forwards only
// explicit caller provider/model bindings; installed configuration owns defaults
// and effort. Requested bindings must match the run's execution evidence,
// and it never reads completion from the process exit code or from a
// zero-finding summary. A run that selected no items executed no review.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export const MANIFEST_SCHEMA = 'ocr.run-manifest/v1';
export const RECORD_SCHEMA = 'ocr.slot-02/v1';

const CLI_PACKAGE = '@alibaba-group/open-code-review';
const BINARY_FILENAME = process.platform === 'win32' ? 'opencodereview.exe' : 'opencodereview';
const IMMUTABLE_COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;

// The published platform packages, mirroring the CLI's own launcher. The
// installed package's optionalDependencies narrow this to the current build.
const PLATFORM_PACKAGES = {
  'darwin-arm64': '@alibaba-group/ocr-darwin-arm64',
  'darwin-x64': '@alibaba-group/ocr-darwin-x64',
  'linux-arm64': '@alibaba-group/ocr-linux-arm64',
  'linux-x64': '@alibaba-group/ocr-linux-x64',
  'win32-arm64': '@alibaba-group/ocr-win32-arm64',
  'win32-x64': '@alibaba-group/ocr-win32-x64',
};

export const OUTCOMES = [
  'complete',
  'partial',
  'failed',
  'empty-coverage',
  'candidate-mismatch',
  'malformed',
  'timeout',
  'error',
  'missing-cli',
  'skipped',
];

/**
 * Locate the real `ocr` executable without a shell. On Windows the npm global
 * install exposes `ocr.cmd`/`ocr.ps1` shims, and `spawnSync('ocr', ...)` with
 * `shell: false` cannot run a `.cmd` batch file (ENOENT). The supported route
 * is the same one the shim itself uses: the platform package's native binary,
 * or the package's Node launcher as a fallback, both spawned directly.
 *
 * `--ocr ocr` names the CLI by the same command name the default resolution
 * already looks for, so it falls through to that resolution instead of handing
 * `spawn` the unspawnable shim. Any other value is the caller's own command and
 * must name something spawnable without a shell.
 */
export function resolveOcrInvocation(explicit = null) {
  if (explicit && explicit !== 'ocr') return { command: explicit, argv: [], source: 'caller' };
  const packageDir = findCliPackageDir();
  if (packageDir) {
    const platformDir = findPlatformPackageDir(packageDir);
    if (platformDir) {
      const binary = join(platformDir, 'bin', BINARY_FILENAME);
      if (existsSync(binary)) return { command: binary, argv: [], source: 'platform-package' };
    }
    const packaged = join(packageDir, 'bin', BINARY_FILENAME);
    if (existsSync(packaged)) return { command: packaged, argv: [], source: 'package-bin' };
    const launcher = join(packageDir, 'bin', 'ocr.js');
    if (existsSync(launcher)) return { command: process.execPath, argv: [launcher], source: 'node-entry' };
  }
  return { command: 'ocr', argv: [], source: 'path' };
}

function nodeModuleRoots() {
  const roots = [];
  for (const entry of (process.env.NODE_PATH ?? '').split(delimiter)) {
    if (entry.trim()) roots.push(entry.trim());
  }
  if (process.env.APPDATA) roots.push(join(process.env.APPDATA, 'npm', 'node_modules'));
  if (process.env.ProgramFiles) roots.push(join(process.env.ProgramFiles, 'nodejs', 'node_modules'));
  roots.push('/usr/local/lib/node_modules', '/usr/lib/node_modules');
  if (process.env.HOME) roots.push(join(process.env.HOME, '.npm-global', 'lib', 'node_modules'));
  return roots;
}

function findCliPackageDir() {
  try {
    return dirname(require.resolve(`${CLI_PACKAGE}/package.json`));
  } catch {
    // Not resolvable from this file; fall through to the global module roots.
  }
  for (const root of nodeModuleRoots()) {
    const manifest = join(root, ...CLI_PACKAGE.split('/'), 'package.json');
    if (existsSync(manifest)) return dirname(manifest);
  }
  return null;
}

function findPlatformPackageDir(packageDir) {
  const key = `${process.platform}-${process.arch}`;
  let name = PLATFORM_PACKAGES[key] ?? null;
  try {
    const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
    for (const declared of Object.keys(manifest.optionalDependencies ?? {})) {
      if (declared.endsWith(`-${key}`)) name = declared;
    }
  } catch {
    // Keep the published map's name.
  }
  if (!name) return null;
  const nested = join(packageDir, 'node_modules', ...name.split('/'));
  if (existsSync(join(nested, 'package.json'))) return nested;
  const sibling = join(dirname(packageDir), ...name.split('/'));
  if (existsSync(join(sibling, 'package.json'))) return sibling;
  try {
    return dirname(require.resolve(`${name}/package.json`));
  } catch {
    return null;
  }
}

function candidateOf(candidate) {
  if (!candidate || typeof candidate !== 'object') throw new Error('a candidate is required');
  if (candidate.mode === 'commit') {
    if (!candidate.commit) throw new Error('commit mode needs --commit <sha>');
    if (!IMMUTABLE_COMMIT.test(candidate.commit)) {
      throw new Error(`'${candidate.commit}' is not a full immutable commit hash; resolve the ref before invoking so the run can be bound to what it actually reviewed`);
    }
    return { mode: 'commit', commit: candidate.commit };
  }
  if (candidate.mode === 'range') {
    if (!candidate.from || !candidate.to) throw new Error('range mode needs --from <sha> and --to <sha>');
    if (!IMMUTABLE_COMMIT.test(candidate.from) || !IMMUTABLE_COMMIT.test(candidate.to)) {
      throw new Error('range mode needs full immutable commit hashes for --from and --to; resolve the refs before invoking');
    }
    return { mode: 'range', from: candidate.from, to: candidate.to };
  }
  throw new Error("candidate mode must be 'commit' or 'range'");
}

function requestedIdentity(candidate) {
  return candidate.mode === 'commit' ? `commit ${candidate.commit}` : `range ${candidate.from}..${candidate.to}`;
}

function resolvedIdentity(input) {
  // Never label an echoed request as resolved; only resolved fields appear here.
  const head = typeof input.resolved_head === 'string' && input.resolved_head ? input.resolved_head : '(unresolved)';
  const base = typeof input.resolved_base === 'string' && input.resolved_base ? input.resolved_base : null;
  return base ? `${base}..${head}` : head;
}

function describeBound(value) {
  if (typeof value === 'string') return `'${value}'`;
  if (typeof value === 'number') return `${value}`;
  return String(value);
}

// A bound the caller named must reach the CLI or the spawn options. Refusing a
// malformed value is the point: `Number('30m')` is `NaN`, which is falsy, so an
// unchecked value silently drops the guard the caller asked for. Only
// documented numeric bounds are enforced; the adapter does not invent an upper
// bound the CLI does not document. The native timeout and token budget permit zero (unlimited).
function readPositiveNumber(value, flag) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`--${flag} must be a positive number; received ${describeBound(value)}`);
  }
  return value;
}

function readTimeoutMinutes(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`--timeout must be a nonnegative number; received ${describeBound(value)}`);
  }
  return value;
}

function readPositiveInteger(value, flag) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`--${flag} must be a positive whole number; received ${describeBound(value)}`);
  }
  return value;
}

function readTokenBudget(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`--max-tokens-budget must be a nonnegative whole number; received ${describeBound(value)}`);
  }
  return value;
}

// Go strings.TrimSpace uses Unicode White_Space: NEL trims, BOM remains significant.
function trimOcrWhitespace(value) {
  return value.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, '');
}

function readBinding(value, flag) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !trimOcrWhitespace(value)) {
    throw new Error(`--${flag} must be a nonempty string; received ${describeBound(value)}`);
  }
  return value;
}

function normalizeBinding({ provider = null, model = null } = {}) {
  return { provider: readBinding(provider, 'provider'), model: readBinding(model, 'model') };
}

/**
 * Validate every caller-supplied bound in one place, so the CLI and a
 * programmatic caller are held to the same contract before anything is spawned.
 * `deadline` and `timeout` are minutes and may be fractional; the token budget
 * and the worker count are counts.
 */
function normalizeBounds({ timeoutMinutes = null, maxTokensBudget = null, concurrency = null, deadlineMinutes = null } = {}) {
  return {
    timeoutMinutes: readTimeoutMinutes(timeoutMinutes),
    maxTokensBudget: readTokenBudget(maxTokensBudget),
    concurrency: readPositiveInteger(concurrency, 'concurrency'),
    deadlineMinutes: readPositiveNumber(deadlineMinutes, 'deadline'),
  };
}

/**
 * Bind the requested candidate to what the run actually resolved. Only the
 * resolved fields count as proof: an echo of the request in `requested_*` is
 * never treated as evidence that the ref was resolved, so it can neither
 * establish a match nor excuse a conflicting resolved hash.
 */
function candidateMatches(candidate, input) {
  const head = typeof input.resolved_head === 'string' && input.resolved_head ? input.resolved_head : null;
  if (!head) return false;
  if (candidate.mode === 'commit') {
    return input.mode === 'commit' && head === candidate.commit;
  }
  const base = typeof input.resolved_base === 'string' && input.resolved_base ? input.resolved_base : null;
  return input.mode === 'range' && head === candidate.to && base === candidate.from;
}

/**
 * The supported CLI invocation, as an argument array. Every value is one
 * element and nothing is interpolated into a shell command, so a path or a
 * context string with spaces or quotes reaches the CLI intact.
 *
 * Provider/model overrides are forwarded only when explicitly supplied by the
 * caller. The adapter sets no defaults or effort, preserving operator choices.
 */
export function buildReviewArgs({
  candidate,
  context,
  contextFile,
  repo,
  outputPath,
  timeoutMinutes,
  maxTokensBudget,
  concurrency,
  provider,
  model,
} = {}) {
  const requested = candidateOf(candidate);
  if (!outputPath) throw new Error('an output path is required');
  const bounds = normalizeBounds({ timeoutMinutes, maxTokensBudget, concurrency });
  const binding = normalizeBinding({ provider, model });
  const args = ['review', '--audience', 'agent', '--format', 'json', '--output', outputPath];
  if (requested.mode === 'commit') args.push('--commit', requested.commit);
  else args.push('--from', requested.from, '--to', requested.to);
  if (repo) args.push('--repo', repo);
  if (contextFile) args.push('--background-file', contextFile);
  else if (context) args.push('--background', context);
  if (bounds.timeoutMinutes !== null) args.push('--timeout', String(bounds.timeoutMinutes));
  if (bounds.maxTokensBudget !== null) args.push('--max-tokens-budget', String(bounds.maxTokensBudget));
  if (bounds.concurrency !== null) args.push('--concurrency', String(bounds.concurrency));
  if (binding.provider !== null) args.push('--provider', binding.provider);
  if (binding.model !== null) args.push('--model', binding.model);
  return args;
}

function itemKey(item) {
  if (!item || typeof item !== 'object') return null;
  return item.item_id ?? item.path ?? null;
}

// Coverage is read from the manifest, never from `summary.files_reviewed`:
// the observed runs count selected items there, including the ones the
// manifest records as failed.
function readCoverage(manifest) {
  const raw = manifest && typeof manifest === 'object' ? manifest.coverage : null;
  // `selected` is the checklist; without a readable one there is no coverage to
  // report, and an absent list must not read as an empty review.
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.selected)) return null;
  const list = (name) => (Array.isArray(raw[name]) ? raw[name] : []);
  const selected = raw.selected;
  const completed = list('completed');
  const reused = list('reused');
  const failed = list('failed');
  const waived = list('waived');
  // A waiver is a decision not to review an item. It stays visible in the
  // record, but it is not reviewed coverage, so it never completes a slot.
  const reviewed = new Set([...completed, ...reused].map(itemKey).filter(Boolean));
  const unreviewed = [];
  for (const item of selected) {
    const key = itemKey(item);
    if (!key || !reviewed.has(key)) unreviewed.push(item && item.path ? item.path : key ?? '(unidentified item)');
  }
  return {
    counts: {
      selected: selected.length,
      completed: completed.length,
      reused: reused.length,
      reviewed: completed.length + reused.length,
      failed: failed.length,
      waived: waived.length,
      unreviewed: unreviewed.length,
    },
    unreviewed,
    waivedPaths: waived.map((item) => (item?.path ?? itemKey(item) ?? '(unidentified item)')),
    failedItems: failed.map((item) => ({
      path: item?.path ?? null,
      classification: item?.classification ?? null,
      reason: item?.reason ?? null,
    })),
  };
}

function readExcluded(scope) {
  const files = scope && typeof scope === 'object' && Array.isArray(scope.excluded_files) ? scope.excluded_files : null;
  if (!files) return { available: false, count: null, files: [] };
  return {
    available: true,
    count: typeof scope.excluded_count === 'number' ? scope.excluded_count : files.length,
    files: files.map((file) => ({ path: file?.path ?? null, reason: file?.exclude_reason ?? file?.reason ?? null })),
  };
}

/**
 * Read one run's outcome from its manifest: terminal state, coverage over the
 * selected items, and the candidate the run actually resolved. The exit code is
 * supporting evidence only - it can surface a contradiction, it can never
 * establish completion.
 */
export function classifyNativeRun({
  candidate,
  request = {},
  result = null,
  exitCode = null,
  timedOut = false,
  spawnError = null,
  stderr = '',
  scope = null,
  raw = {},
  skipReason = null,
  ocrInvocation = null,
} = {}) {
  const requested = candidateOf(candidate);
  const binding = normalizeBinding(request);
  const reasons = [];
  const notes = [];

  const manifest = result && typeof result === 'object' && result.manifest && typeof result.manifest === 'object' ? result.manifest : null;
  const input = (manifest && manifest.input) || {};
  const execution = (manifest && manifest.execution) || {};
  const summary = result && typeof result === 'object' && result.summary && typeof result.summary === 'object' ? result.summary : null;
  const coverage = readCoverage(manifest);
  const excluded = readExcluded(scope);
  const resolvedHead = typeof input.resolved_head === 'string' && input.resolved_head ? input.resolved_head : null;
  const resolvedBase = typeof input.resolved_base === 'string' && input.resolved_base ? input.resolved_base : null;
  const requestedEcho = typeof input.requested_head === 'string' && input.requested_head ? input.requested_head : null;
  const requestedFromEcho = typeof input.requested_from === 'string' && input.requested_from ? input.requested_from : null;
  const identityEvidence = resolvedHead ? 'resolved' : (requestedEcho ? 'requested-echo-only' : 'none');
  const matched = Boolean(manifest) && candidateMatches(requested, input);
  const exitCodeKnown = typeof exitCode === 'number';
  const bindingErrors = [];
  for (const field of ['provider', 'model']) {
    if (binding[field] === null) continue;
    // OCR trims overrides with Go strings.TrimSpace, then removes only the
    // model's final [digitsm] token suffix before writing manifest.execution.
    let expected = trimOcrWhitespace(binding[field]);
    if (field === 'model') expected = expected.replace(/\[\d+m\]$/, '');
    if (typeof execution[field] !== 'string' || !execution[field] || execution[field] !== expected) {
      const actual = typeof execution[field] === 'string' && execution[field] ? `'${execution[field]}'` : '(missing)';
      bindingErrors.push(`requested ${field} '${binding[field]}' resolves to '${expected}' but manifest.execution.${field} is ${actual}`);
    }
  }

  let outcome;
  if (skipReason) {
    outcome = 'skipped';
    reasons.push(String(skipReason));
  } else if (spawnError) {
    outcome = spawnError.code === 'ENOENT' ? 'missing-cli' : 'error';
    reasons.push(spawnError.code === 'ENOENT'
      ? 'the ocr command was not found; install it or point --ocr at an executable that can be spawned without a shell (the npm .cmd/.ps1 shim cannot)'
      : `the run could not start: ${spawnError.message}`);
  } else if (timedOut) {
    outcome = 'timeout';
    reasons.push('the run did not finish inside the adapter deadline');
  } else if (!manifest) {
    // A CLI that fails and a CLI that returns unreadable output are different
    // evidence, and both are reported instead of being read as a review.
    const exitedNonZero = exitCodeKnown && exitCode !== 0;
    outcome = exitedNonZero ? 'error' : 'malformed';
    reasons.push(result === null ? 'no run manifest came back' : 'the result carried no run manifest');
    reasons.push(exitedNonZero ? `the CLI exited ${exitCode} without a run manifest` : 'the output was missing or not JSON');
    if (/unknown flag:[\s]*--output/i.test(stderr)) {
      reasons.push('this ocr build predates --output; upgrade, or run without it and read the JSON result from stdout');
    }
  } else if (manifest.schema_version !== MANIFEST_SCHEMA) {
    outcome = 'malformed';
    reasons.push(`unrecognized manifest schema '${manifest.schema_version ?? '(missing)'}'; expected ${MANIFEST_SCHEMA}`);
  } else if (!resolvedHead) {
    // An echo of the request is not proof that a ref was resolved, so the run
    // stays incomplete and names exactly which evidence is missing.
    outcome = 'malformed';
    reasons.push('the manifest carries no resolved commit, so the run cannot be bound to what it actually reviewed');
    reasons.push(requestedEcho
      ? `only the echoed request (${requestedEcho}) is present; an echo is not evidence of resolution`
      : 'neither a resolved nor a requested commit is present');
  } else if (!matched) {
    outcome = 'candidate-mismatch';
    reasons.push(`the run resolved ${resolvedIdentity(input)} but ${requestedIdentity(requested)} was requested`);
    if (requested.mode === 'range' && resolvedHead === requested.to && resolvedBase && resolvedBase !== requested.from) {
      // A range is diffed from its merge base, not from the branch endpoint the
      // caller may have named. Say which base the run actually used instead of
      // equating the requested endpoint with the diff base.
      reasons.push(`a range is diffed from its merge base: the run used ${resolvedBase} as the diff base while ${requested.from} was requested; resolve the merge base and pass that as --from`);
    }
  } else if (bindingErrors.length > 0) {
    outcome = 'error';
    reasons.push(...bindingErrors);
  } else if (!coverage) {
    outcome = 'malformed';
    reasons.push('the manifest carried no readable coverage checklists, so the reviewed items cannot be established');
  } else if (coverage.counts.selected === 0) {
    outcome = 'empty-coverage';
    reasons.push('the run selected no items, so no review was executed; this is a stated skip, not a completed slot');
    if (excluded.files.length > 0) {
      const named = excluded.files.slice(0, 3).map((file) => file.path ?? '(unnamed)').join(', ');
      reasons.push(`the scope excluded ${excluded.count} path(s), for example ${named}`);
    }
  } else if (manifest.terminal_state === 'skipped') {
    outcome = 'skipped';
    reasons.push('the run reported terminal state skipped, so no review was executed');
  } else if (coverage.counts.failed === coverage.counts.selected && coverage.counts.reviewed === 0) {
    outcome = 'failed';
    reasons.push(`all ${coverage.counts.selected} selected item(s) failed`);
  } else if (coverage.counts.reviewed === 0 && coverage.counts.waived === coverage.counts.selected) {
    outcome = 'skipped';
    reasons.push(`every selected item was waived (${coverage.waivedPaths.join(', ')}), so no review was executed`);
  } else if (coverage.counts.reviewed < coverage.counts.selected) {
    outcome = 'partial';
    reasons.push(`${coverage.counts.reviewed} of ${coverage.counts.selected} selected item(s) were reviewed: ${coverage.counts.failed} failed, ${coverage.counts.waived} waived, ${coverage.counts.unreviewed} unreviewed`);
  } else if (manifest.terminal_state === 'complete') {
    if (exitCodeKnown && exitCode !== 0) {
      outcome = 'error';
      reasons.push(`the manifest reports complete coverage but the process exited ${exitCode}; the run is not trusted as a completed review`);
    } else {
      outcome = 'complete';
      reasons.push(`all ${coverage.counts.selected} selected item(s) are covered under terminal state 'complete'`);
    }
  } else if (manifest.terminal_state === 'partial') {
    outcome = 'partial';
    reasons.push("the run reported terminal state 'partial'");
  } else {
    outcome = 'error';
    reasons.push(`terminal state '${manifest.terminal_state ?? '(missing)'}' is not a completed review`);
  }

  if (coverage && coverage.counts.failed > 0) {
    const named = coverage.failedItems
      .map((item) => `${item.path ?? '(unnamed)'}${item.classification ? ` (${item.classification})` : ''}`)
      .join(', ');
    if (named) reasons.push(`failed items: ${named}`);
  }
  if (coverage && summary && Number.isInteger(summary.files_reviewed) && summary.files_reviewed !== coverage.counts.completed) {
    notes.push(`summary.files_reviewed (${summary.files_reviewed}) counts selected items the manifest does not record as completed; manifest coverage.completed is ${coverage.counts.completed}`);
  }
  if (coverage && coverage.counts.waived > 0) {
    notes.push(`${coverage.counts.waived} selected item(s) were waived rather than reviewed (${coverage.waivedPaths.join(', ')}); a waiver is a coverage limit, not a review`);
  }

  return {
    schema_version: RECORD_SCHEMA,
    engine: 'native-open-code-review',
    outcome,
    complete: outcome === 'complete',
    reasons,
    notes,
    requested: {
      mode: requested.mode,
      commit: requested.commit ?? null,
      from: requested.from ?? null,
      to: requested.to ?? null,
      context: Boolean(request.context || request.contextFile),
      context_file: request.contextFile ?? null,
      repo: request.repo ?? null,
      timeout_minutes: request.timeoutMinutes ?? null,
      max_tokens_budget: request.maxTokensBudget ?? null,
      concurrency: request.concurrency ?? null,
      provider: binding.provider,
      model: binding.model,
      // The adapter-side deadline is recorded so a bounded run stays
      // distinguishable from one that ran without a guard at all.
      deadline_minutes: request.deadlineMinutes ?? null,
    },
    candidate: {
      requested: requestedIdentity(requested),
      // Only a resolved value is reported as resolved; the echoed request is
      // kept separately so nothing reads it as resolution.
      resolved: resolvedHead ? (resolvedBase ? `${resolvedBase}..${resolvedHead}` : resolvedHead) : null,
      resolved_head: resolvedHead,
      resolved_base: resolvedBase,
      requested_echo: requestedEcho,
      requested_from_echo: requestedFromEcho,
      evidence: identityEvidence,
      exact_range: input.exact_range ?? null,
      mode: input.mode ?? null,
      match: matched,
    },
    coverage: {
      selected: coverage ? coverage.counts.selected : null,
      completed: coverage ? coverage.counts.completed : null,
      reused: coverage ? coverage.counts.reused : null,
      reviewed: coverage ? coverage.counts.reviewed : null,
      failed: coverage ? coverage.counts.failed : null,
      waived: coverage ? coverage.counts.waived : null,
      unreviewed: coverage ? coverage.unreviewed : null,
      failed_items: coverage ? coverage.failedItems : null,
      waived_items: coverage ? coverage.waivedPaths : null,
      excluded,
    },
    ocr: {
      invocation: ocrInvocation,
      version: execution.ocr_version ?? null,
      provider: execution.provider ?? null,
      model: execution.model ?? null,
      configured_concurrency: execution.configured_concurrency ?? null,
      terminal_state: manifest ? manifest.terminal_state ?? null : null,
      exit_code: exitCodeKnown ? exitCode : null,
      timed_out: Boolean(timedOut),
    },
    findings: {
      count: Array.isArray(result?.comments)
        ? result.comments.length
        : (typeof result?.summary?.comments === 'number' ? result.summary.comments : null),
    },
    // Token spend as the run reported it; a missing figure stays null.
    usage: Object.fromEntries(['total_tokens', 'input_tokens', 'output_tokens', 'cache_read_tokens']
      .map((field) => [field, typeof summary?.[field] === 'number' ? summary[field] : null])),
    raw,
  };
}

function readJsonFile(path) {
  if (!path) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function parseJsonText(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Invoke the installed CLI on one fixed candidate and return the slot-02
 * record. `spawn` is injectable so the invocation and classification can be
 * exercised without spending a native run.
 */
export function runNativeSlot({
  candidate,
  repo = null,
  context = null,
  contextFile = null,
  outDir,
  scopePath = null,
  timeoutMinutes = null,
  maxTokensBudget = null,
  concurrency = null,
  provider = null,
  model = null,
  deadlineMinutes = null,
  skipReason = null,
  ocrCommand = null,
  spawn = spawnSync,
} = {}) {
  if (!outDir) throw new Error('an output directory is required');
  const requested = candidateOf(candidate);
  // A malformed bound is refused here, before the output directory is created
  // and before anything is spawned, so the CLI and a programmatic caller cannot
  // silently lose a guard they named.
  const bounds = normalizeBounds({ timeoutMinutes, maxTokensBudget, concurrency, deadlineMinutes });
  const binding = normalizeBinding({ provider, model });
  mkdirSync(outDir, { recursive: true });
  // Every run owns its own output files. A reused directory therefore cannot
  // feed a previous run's result into a fresh classification, and the earlier
  // evidence stays where it is.
  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const resultPath = join(outDir, `native-result-${runId}.json`);
  const stdoutPath = join(outDir, `ocr-${runId}.stdout.txt`);
  const stderrPath = join(outDir, `ocr-${runId}.stderr.txt`);
  const recordPath = join(outDir, 'slot-02.json');
  const runRecordPath = join(outDir, `slot-02-${runId}.json`);
  const request = {
    context,
    contextFile,
    repo,
    timeoutMinutes: bounds.timeoutMinutes,
    maxTokensBudget: bounds.maxTokensBudget,
    concurrency: bounds.concurrency,
    deadlineMinutes: bounds.deadlineMinutes,
    provider: binding.provider,
    model: binding.model,
  };
  const writeRecord = (record) => {
    const body = `${JSON.stringify(record, null, 2)}\n`;
    writeFileSync(runRecordPath, body, 'utf8');
    writeFileSync(recordPath, body, 'utf8');
    return record;
  };

  if (skipReason) {
    return writeRecord(classifyNativeRun({
      candidate: requested,
      request,
      skipReason,
      raw: { result: null, stdout: null, stderr: null, record: recordPath, run_record: runRecordPath },
    }));
  }

  const args = buildReviewArgs({
    candidate: requested,
    context,
    contextFile,
    repo,
    outputPath: resultPath,
    timeoutMinutes: bounds.timeoutMinutes,
    maxTokensBudget: bounds.maxTokensBudget,
    concurrency: bounds.concurrency,
    provider: binding.provider,
    model: binding.model,
  });
  const invocation = resolveOcrInvocation(ocrCommand);
  const spawnOptions = { encoding: 'utf8', shell: false, windowsHide: true };
  if (bounds.deadlineMinutes !== null) {
    spawnOptions.timeout = bounds.deadlineMinutes * 60000;
    spawnOptions.killSignal = 'SIGTERM';
  }

  const child = spawn(invocation.command, [...invocation.argv, ...args], spawnOptions) ?? {};
  const stdout = typeof child.stdout === 'string' ? child.stdout : '';
  const stderr = typeof child.stderr === 'string' ? child.stderr : '';
  const exitCode = typeof child.status === 'number' ? child.status : null;
  let timedOut = false;
  let spawnError = null;
  if (child.error) {
    if (child.error.code === 'ETIMEDOUT') timedOut = true;
    else spawnError = child.error;
  }

  writeFileSync(stdoutPath, stdout, 'utf8');
  writeFileSync(stderrPath, stderr, 'utf8');

  // The CLI writes its JSON result to --output; stdout is the fallback for a
  // build that writes the same object to stdout instead.
  const result = readJsonFile(resultPath) ?? parseJsonText(stdout);
  const record = classifyNativeRun({
    candidate: requested,
    request,
    result,
    exitCode,
    timedOut,
    spawnError,
    stderr,
    scope: readJsonFile(scopePath),
    // `raw.result` is published as a path only when the CLI actually wrote one;
    // a consumer resolving it must not land on a dangling path.
    raw: {
      result: existsSync(resultPath) ? resultPath : null,
      stdout: stdoutPath,
      stderr: stderrPath,
      record: recordPath,
      run_record: runRecordPath,
    },
    ocrInvocation: { source: invocation.source, command: invocation.command, argv_prefix: invocation.argv },
  });
  return writeRecord(record);
}

const USAGE = [
  'usage: native-slot.mjs --out <dir> (--commit <sha> | --from <sha> --to <sha>)',
  '       [--repo <path>] [--context "<text>" | --context-file <path>] [--scope <delegate-preview.json>]',
  '       [--timeout <minutes>] [--max-tokens-budget <n>] [--concurrency <n>] [--deadline <minutes>]',
  '       [--provider <id>] [--model <id>]',
  '       [--ocr <command>] [--skip "<reason>"]',
  '       --commit/--from/--to take full immutable commit hashes; resolve a ref before invoking.',
  '       --timeout takes nonnegative minutes; zero disables it. --deadline must be positive.',
  '       --max-tokens-budget takes a nonnegative whole number; zero or omission is unlimited.',
].join('\n');

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const take = () => {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${token}`);
      index += 1;
      return value;
    };
    if (token === '--out') parsed.outDir = take();
    else if (token === '--commit') parsed.commit = take();
    else if (token === '--from') parsed.from = take();
    else if (token === '--to') parsed.to = take();
    else if (token === '--repo') parsed.repo = take();
    else if (token === '--context') parsed.context = take();
    else if (token === '--context-file') parsed.contextFile = take();
    else if (token === '--scope') parsed.scopePath = take();
    else if (token === '--timeout') {
      const value = take();
      if (!value.trim()) throw new Error('--timeout must be a nonnegative number; received an empty value');
      parsed.timeoutMinutes = Number(value);
    }
    else if (token === '--max-tokens-budget') {
      const value = take();
      // Number('') and Number(whitespace) are zero, but unlimited usage must be
      // explicitly requested or left at the CLI default, never a malformed value.
      if (!value.trim()) throw new Error('--max-tokens-budget must be a nonnegative whole number; received an empty value');
      parsed.maxTokensBudget = Number(value);
    }
    else if (token === '--concurrency') parsed.concurrency = Number(take());
    else if (token === '--provider') parsed.provider = take();
    else if (token === '--model') parsed.model = take();
    else if (token === '--deadline') parsed.deadlineMinutes = Number(take());
    else if (token === '--ocr') parsed.ocrCommand = take();
    else if (token === '--skip') parsed.skipReason = take();
    else throw new Error(`unknown argument '${token}'`);
  }
  return parsed;
}

function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n${USAGE}\n`);
    return 2;
  }
  if (!args.outDir || (!args.commit && !(args.from && args.to))) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  const candidate = args.commit ? { mode: 'commit', commit: args.commit } : { mode: 'range', from: args.from, to: args.to };
  let record;
  try {
    record = runNativeSlot({ ...args, candidate });
  } catch (error) {
    process.stderr.write(`${error.message}\n${USAGE}\n`);
    return 2;
  }
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
  // A convenience gate mirroring `complete`; it is never derived from OCR's exit code.
  return record.complete ? 0 : 1;
}

// Compare real paths: Node runs a linked script from its real file, so through a
// junction or symlink the invoked path differs and main() would silently not run.
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
