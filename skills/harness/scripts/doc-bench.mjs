#!/usr/bin/env node
// Document bench: check a question key, render the exact prompt a runner is
// given, and score saved answers against the key. It never calls a model.
// The method is references/doc-bench.md.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const USAGE = `Usage:
  node doc-bench.mjs check <key.json>
  node doc-bench.mjs prompt <key.json> [--document <file>]...
  node doc-bench.mjs score <key.json> <answers-dir>

check   validates the key and prints its question counts.
prompt  prints the runner prompt: the documents (none for the no-document arm)
        and the questions, never the answers or the split.
score   reads <answers-dir>/<arm>/<run file> and prints the report as JSON.
Exit 0 ok, 1 a run file was unusable (report still printed), 2 bad input.`;

const FORMAT = 'harness.docbench.key.v1';
const KINDS = ['where', 'name', 'departure'];
const SPLITS = ['core', 'heldout'];
const MATCHES = ['exact', 'contains'];

class InputError extends Error {}

function fail(message) { throw new InputError(message); }

function nonEmptyStrings(value) {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string' && v.trim());
}

function loadKey(path) {
  let key;
  try { key = JSON.parse(readFileSync(path, 'utf8')); } catch (error) { fail(`cannot read key ${path}: ${error.message}`); }
  if (key?.format !== FORMAT) fail(`key format must be ${FORMAT}`);
  if (typeof key.subject !== 'string' || !key.subject.trim()) fail('key needs a subject');
  if (!/^[0-9a-f]{40}$/.test(key.commit ?? '')) fail('key commit must be the full 40-character pinned commit');
  if (!nonEmptyStrings(key.documents)) fail('key needs the documents under test');
  if (!Array.isArray(key.questions) || key.questions.length === 0) fail('key has no questions');
  const ids = new Set();
  for (const q of key.questions) {
    const label = q?.id ?? '(no id)';
    if (typeof q?.id !== 'string' || !/^[A-Za-z0-9._-]+$/.test(q.id)) fail(`question ${label}: id must be letters, digits, dot, dash or underscore`);
    if (ids.has(q.id)) fail(`duplicate id ${q.id}`);
    ids.add(q.id);
    if (!KINDS.includes(q.kind)) fail(`question ${q.id}: kind must be one of ${KINDS.join(', ')}`);
    if (!SPLITS.includes(q.split)) fail(`question ${q.id}: split must be one of ${SPLITS.join(', ')}`);
    if (typeof q.question !== 'string' || !q.question.trim()) fail(`question ${q.id}: question text is empty`);
    if (!MATCHES.includes(q.match)) fail(`question ${q.id}: match must be one of ${MATCHES.join(', ')}`);
    if (!nonEmptyStrings(q.accept)) fail(`question ${q.id}: accept needs at least one answer`);
    if (q.reject !== undefined) {
      if (q.match !== 'contains') fail(`question ${q.id}: reject applies only to contains questions`);
      if (!nonEmptyStrings(q.reject)) fail(`question ${q.id}: reject must list strings`);
    }
  }
  for (const kind of KINDS) {
    if (!key.questions.some((q) => q.kind === kind && q.split === 'core')) fail(`key needs at least one core question of kind ${kind}`);
  }
  if (!key.questions.some((q) => q.split === 'heldout')) fail('key needs held-out questions, the guard against a page tuned to its questions');
  return key;
}

function count(items, field, values) {
  return Object.fromEntries(values.map((v) => [v, items.filter((x) => x[field] === v).length]));
}

function check(keyPath) {
  const key = loadKey(keyPath);
  const { core, heldout } = count(key.questions, 'split', SPLITS);
  return { subject: key.subject, commit: key.commit,
    questions: { total: key.questions.length, core, heldout },
    byKind: count(key.questions, 'kind', KINDS) };
}

function prompt(keyPath, documents) {
  const key = loadKey(keyPath);
  const lines = [`You are answering questions about the ${key.subject} repository.`];
  if (documents.length === 0) {
    lines.push('You are given no document about it. Answer from what you already know, or say you do not know.');
  } else {
    lines.push('Answer only from the documents below. You cannot open files, search or run commands.');
    for (const path of documents) {
      let text;
      try { text = readFileSync(path, 'utf8'); } catch (error) { fail(`cannot read document ${path}: ${error.message}`); }
      const name = path.split(/[\\/]/).pop();
      lines.push('', `=== Document: ${name} ===`, text.trimEnd(), `=== End of ${name} ===`);
    }
  }
  lines.push('', '=== Questions ===');
  // Numbered, not by key id: an id can name its split or its answer.
  key.questions.forEach((q, i) => lines.push(`q${i + 1}: ${q.question}`));
  lines.push('', 'Give one short, exact answer per question: a path, a name or a short phrase.',
    'Name one answer only; do not list alternatives.',
    "If you cannot be sure, answer \"I don't know\". That is a valid answer.",
    'Set confidence to "high" only when you would act on the answer without checking; otherwise "low".',
    'Reply with only this JSON and nothing else:',
    '{"answers": [{"id": "q1", "answer": "<your answer>", "confidence": "high"}]}',
    'Include every question, q1 to q' + key.questions.length + ', once each.');
  return `${lines.join('\n')}\n`;
}

// Quoting, path separators, case and edge punctuation are not navigation errors.
function normalise(text) {
  let s = String(text).trim();
  for (let prior = ''; prior !== s;) {
    prior = s;
    s = s.replace(/^[`'"]+|[`'"]+$/g, '').replace(/[.]+$/, '').trim();
  }
  return s.replace(/\\/g, '/').replace(/\s+/g, ' ').replace(/^\.\//, '').replace(/\/+$/, '').toLowerCase();
}

const ABSTAIN = new Set(['', "i don't know", 'i don’t know', 'i do not know', 'unknown']);

function judge(q, entry) {
  const answer = normalise(entry.answer);
  if (ABSTAIN.has(answer)) return 'abstained';
  const accepted = q.accept.map(normalise);
  const right = q.match === 'exact'
    ? accepted.includes(answer)
    : accepted.some((a) => answer.includes(a)) && !(q.reject ?? []).map(normalise).some((r) => answer.includes(r));
  if (right) return 'correct';
  return entry.confidence === 'high' ? 'confidentWrong' : 'unsureWrong';
}

const OUTCOMES = ['correct', 'confidentWrong', 'unsureWrong', 'abstained'];
const round = (n) => Math.round(n * 1000) / 1000;

function tally(results, questions, runs) {
  const subset = results.filter((r) => questions.includes(r.q));
  return { score: runs ? round(subset.filter((r) => r.outcome === 'correct').length / (questions.length * runs)) : null,
    confidentWrong: subset.filter((r) => r.outcome === 'confidentWrong').length };
}

// A run is the runner's raw reply. Text around one JSON object (a sentence, a
// code fence) is tolerated; a reply that does not answer every question exactly
// once, each with a text answer and a high or low confidence, is unusable,
// because scoring it would count a format failure as a navigation failure.
// "I don't know" is an answer like any other here: it still needs both fields.
function readRun(file, key) {
  const text = readFileSync(file, 'utf8');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  let parsed;
  try { parsed = JSON.parse(text.slice(start, end + 1)); } catch { parsed = null; }
  if (start < 0 || !Array.isArray(parsed?.answers)) return { reason: 'no JSON object with an answers list' };
  const byNumber = new Map();
  for (const a of parsed.answers) {
    const id = String(a?.id ?? '').trim().toLowerCase();
    if (byNumber.has(id)) return { reason: `more than one answer for ${id}` };
    byNumber.set(id, a);
  }
  const entries = [];
  for (let i = 1; i <= key.questions.length; i += 1) {
    const entry = byNumber.get(`q${i}`);
    if (!entry) return { reason: `no answer for q${i}` };
    if (typeof entry.answer !== 'string') return { reason: `q${i}: answer must be text` };
    const confidence = typeof entry.confidence === 'string' ? entry.confidence.trim().toLowerCase() : '';
    if (!['high', 'low'].includes(confidence)) return { reason: `q${i}: confidence must be high or low` };
    entries.push({ answer: entry.answer, confidence });
  }
  return { entries };
}

function scoreArm(key, files) {
  const results = [];
  const invalid = [];
  let runs = 0;
  for (const file of files) {
    const read = readRun(file, key);
    if (read.reason) { invalid.push({ file: file.split(/[\\/]/).pop(), reason: read.reason }); continue; }
    runs += 1;
    key.questions.forEach((q, i) => results.push({ q, outcome: judge(q, read.entries[i]) }));
  }
  const counts = Object.fromEntries(OUTCOMES.map((o) => [o, results.filter((r) => r.outcome === o).length]));
  const of = (field, value) => key.questions.filter((q) => q[field] === value);
  const correctRuns = (q) => results.filter((r) => r.q === q && r.outcome === 'correct').length;
  // Right in more than a quarter and fewer than three quarters of the runs
  // (two or three of five): the arm's score is not settled for that question.
  const unstable = runs ? key.questions.filter((q) => correctRuns(q) > runs / 4 && correctRuns(q) < (3 * runs) / 4).map((q) => q.id) : [];
  return {
    runs,
    invalid,
    unstable,
    addRuns: unstable.length > 3,
    alwaysCorrect: runs ? key.questions.filter((q) => correctRuns(q) === runs).map((q) => q.id) : [],
    score: runs ? round(counts.correct / (key.questions.length * runs)) : null,
    confidentWrong: counts.confidentWrong,
    unsureWrong: counts.unsureWrong,
    abstained: counts.abstained,
    byKind: Object.fromEntries(KINDS.map((k) => [k, tally(results, of('kind', k), runs)])),
    bySplit: Object.fromEntries(SPLITS.map((s) => [s, tally(results, of('split', s), runs)])),
    questions: Object.fromEntries(key.questions.map((q) => [q.id,
      Object.fromEntries(OUTCOMES.map((o) => [o, results.filter((r) => r.q === q && r.outcome === o).length]))])),
  };
}

function score(keyPath, answersDir) {
  const key = loadKey(keyPath);
  let arms;
  try { arms = readdirSync(answersDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort(); } catch (error) { fail(`cannot read answers ${answersDir}: ${error.message}`); }
  if (arms.length === 0) fail(`no arm folders in ${answersDir}`);
  const report = { subject: key.subject, commit: key.commit,
    keySha256: createHash('sha256').update(readFileSync(keyPath)).digest('hex'),
    knownWithoutDocument: null, arms: {} };
  for (const arm of arms) {
    const dir = join(answersDir, arm);
    const files = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => join(dir, d.name)).sort();
    report.arms[arm] = scoreArm(key, files);
  }
  // Right in every run with no document: lines that teach these are deletion candidates.
  if (report.arms.none) report.knownWithoutDocument = report.arms.none.alwaysCorrect;
  return report;
}

function main() {
  let parsed;
  try {
    parsed = parseArgs({ args: process.argv.slice(2), allowPositionals: true,
      options: { document: { type: 'string', multiple: true }, help: { type: 'boolean', short: 'h' } } });
  } catch (error) {
    process.stderr.write(`[doc-bench] ${error.message}\n${USAGE}\n`);
    return 2;
  }
  const [command, ...rest] = parsed.positionals;
  if (parsed.values.help || !command || command === 'help') {
    process.stdout.write(`${USAGE}\n`);
    return parsed.values.help || command === 'help' ? 0 : 2;
  }
  try {
    if (command === 'check' && rest.length === 1) {
      process.stdout.write(`${JSON.stringify(check(rest[0]), null, 2)}\n`);
      return 0;
    }
    if (command === 'prompt' && rest.length === 1) {
      process.stdout.write(prompt(rest[0], parsed.values.document ?? []));
      return 0;
    }
    if (command === 'score' && rest.length === 2) {
      const report = score(rest[0], rest[1]);
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return Object.values(report.arms).some((arm) => arm.invalid.length > 0) ? 1 : 0;
    }
    fail(`unknown command or wrong arguments: ${parsed.positionals.join(' ')}`);
  } catch (error) {
    if (!(error instanceof InputError)) throw error;
    process.stderr.write(`[doc-bench] ${error.message}\n`);
    return 2;
  }
}

process.exitCode = main();
