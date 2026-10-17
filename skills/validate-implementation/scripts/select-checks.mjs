#!/usr/bin/env node
// Select project-owned checks for a change, and assess the evidence recorded
// against them, including whether that evidence is still current for the input
// it covers. This file holds the method only: no tool name, no project path and
// no command of its own. Everything it runs comes from the project profile.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const STATUSES = ['pass', 'fail', 'skipped', 'unavailable', 'cancelled', 'not_run'];
const NON_PASSING = ['fail', 'skipped', 'unavailable', 'cancelled', 'not_run'];
const COMMANDS = ['select', 'assess', 'assess-review'];

// The five project-issued strings that decide whether evidence still applies.
// `candidate` is deliberately not one of them: it is a human/audit reference,
// and a bare new commit must not by itself expire a proof about unchanged
// content.
export const IDENTITY_FIELDS = ['project', 'contentIdentity', 'dependencyIdentity', 'environment', 'scope'];

const NATIVE_FAILED_OUTCOMES = ['failed', 'timeout', 'error', 'malformed', 'missing-cli'];
const NATIVE_SKIP_OUTCOMES = ['skipped', 'empty-coverage'];

// A product profile that matches every path is not a path surface; it is a
// snapshot or escalation rule wearing a glob, and it makes a docs-only change
// select a product check. The ladder belongs to the project's own runner.
const CATCH_ALL = ['*', '**', '**/*', '**/*.*'];

export function normalisePath(value) {
  return String(value).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/');
}

export function globToRegExp(glob) {
  const source = normalisePath(glob);
  let out = '^';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '*') {
      if (source[index + 1] === '*') {
        index += 1;
        if (source[index + 1] === '/') {
          index += 1;
          out += '(?:.*/)?';
        } else {
          out += '.*';
        }
      } else {
        out += '[^/]*';
      }
    } else if (char === '?') {
      out += '[^/]';
    } else {
      out += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(out + '$');
}

export function matchesAny(globs, path) {
  const candidate = normalisePath(path);
  return (globs || []).some((glob) => globToRegExp(glob).test(candidate));
}

export function validateProfile(profile) {
  const errors = [];
  if (!profile || typeof profile !== 'object') return { ok: false, errors: ['profile is not an object'] };
  if (profile.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (typeof profile.project !== 'string' || profile.project.trim() === '') errors.push('project is required');
  if (!Array.isArray(profile.checks) || profile.checks.length === 0) errors.push('checks must be a non-empty array');
  if (!Array.isArray(profile.profiles) || profile.profiles.length === 0) errors.push('profiles must be a non-empty array');

  const checkIds = new Set();
  for (const check of profile.checks || []) {
    if (!check || typeof check.id !== 'string' || check.id.trim() === '') { errors.push('every check needs an id'); continue; }
    if (checkIds.has(check.id)) errors.push(`duplicate check id: ${check.id}`);
    checkIds.add(check.id);
    if (typeof check.run !== 'string' || check.run.trim() === '') errors.push(`check ${check.id} needs a run command`);
    if (typeof check.required !== 'boolean') errors.push(`check ${check.id} needs required true or false`);
    if (check.requires !== undefined && (!Array.isArray(check.requires) || check.requires.some((value) => typeof value !== 'string' || value.trim() === ''))) {
      errors.push(`check ${check.id} requires must be an array of non-empty strings`);
    }
  }

  const profileIds = new Set();
  for (const entry of profile.profiles || []) {
    if (!entry || typeof entry.id !== 'string' || entry.id.trim() === '') { errors.push('every profile needs an id'); continue; }
    if (profileIds.has(entry.id)) errors.push(`duplicate profile id: ${entry.id}`);
    profileIds.add(entry.id);
    if (entry.kind !== 'product' && entry.kind !== 'non-product') errors.push(`profile ${entry.id} kind must be product or non-product`);
    if (!Array.isArray(entry.when) || entry.when.length === 0) errors.push(`profile ${entry.id} needs at least one when glob`);
    if (!Array.isArray(entry.checks)) errors.push(`profile ${entry.id} needs a checks array`);
    if (entry.kind === 'product' && Array.isArray(entry.when) && entry.when.some((glob) => CATCH_ALL.includes(String(glob).trim()))) {
      errors.push(`product profile ${entry.id} matches every path; when must name a path surface, and the snapshot and escalation ladder belong to the project's runner`);
    }
    for (const id of entry.checks || []) {
      if (!checkIds.has(id)) errors.push(`profile ${entry.id} names unknown check ${id}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function selectChecks(profile, changedPaths) {
  const validation = validateProfile(profile);
  if (!validation.ok) return { ok: false, errors: validation.errors };

  const paths = (changedPaths || []).map(normalisePath).filter((value) => value !== '');
  const byId = new Map(profile.checks.map((check) => [check.id, check]));
  const activated = [];
  const selectedIds = new Set();
  const covered = new Set();

  for (const entry of profile.profiles) {
    const hits = paths.filter((path) => matchesAny(entry.when, path));
    if (hits.length === 0) continue;
    activated.push({ id: entry.id, kind: entry.kind, checks: [...entry.checks], paths: hits });
    for (const path of hits) covered.add(path);
    for (const id of entry.checks) selectedIds.add(id);
  }

  const selectedChecks = [...selectedIds].map((id) => byId.get(id));
  return {
    ok: true,
    project: profile.project,
    changedPaths: paths,
    activatedProfiles: activated.map((entry) => entry.id),
    productProfiles: activated.filter((entry) => entry.kind === 'product').map((entry) => entry.id),
    nonProductProfiles: activated.filter((entry) => entry.kind === 'non-product').map((entry) => entry.id),
    selectedChecks,
    requiredChecks: selectedChecks.filter((check) => check.required).map((check) => check.id),
    optionalChecks: selectedChecks.filter((check) => !check.required).map((check) => check.id),
    prerequisites: [...new Set(selectedChecks.flatMap((check) => check.requires || []))],
    unmappedPaths: paths.filter((path) => !covered.has(path)),
  };
}

function identityValue(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

// The one comparison both the validation assessor and the review-evidence
// assessor use. It compares what a record says it ran against with a current
// snapshot the caller obtained independently; it never reads the record's own
// reuse claim as current truth, and a missing or incomplete identity is
// "unknown" rather than a pass.
export function compareIdentity(recorded, current) {
  const changedFields = [];
  if (!current || typeof current !== 'object') {
    return {
      ok: false,
      status: 'unknown',
      reasons: ['no current identity was supplied, so freshness is unknown and the evidence cannot qualify'],
      changedFields,
      scope: identityValue(recorded && recorded.scope),
    };
  }
  if (!recorded || typeof recorded !== 'object') {
    return {
      ok: false,
      status: 'unknown',
      reasons: ['the record carries no identity object, so what it ran against cannot be established'],
      changedFields,
      scope: identityValue(current.scope),
    };
  }
  const scope = identityValue(recorded.scope) ?? identityValue(current.scope) ?? null;
  const incomplete = [];
  for (const field of IDENTITY_FIELDS) {
    if (!identityValue(recorded[field])) incomplete.push(`recorded ${field}`);
    if (!identityValue(current[field])) incomplete.push(`current ${field}`);
  }
  if (incomplete.length > 0) {
    return {
      ok: false,
      status: 'unknown',
      reasons: [`identity is incomplete (${incomplete.join(', ')}); freshness cannot be established`],
      changedFields,
      scope,
    };
  }
  for (const field of IDENTITY_FIELDS) {
    if (identityValue(recorded[field]) !== identityValue(current[field])) changedFields.push(field);
  }
  if (changedFields.length > 0) {
    const detail = changedFields
      .map((field) => `${field} changed from '${identityValue(recorded[field])}' to '${identityValue(current[field])}'`)
      .join('; ');
    return {
      ok: false,
      status: 'stale',
      reasons: [`reused evidence is stale for scope '${scope}': ${detail}`],
      changedFields,
      scope,
    };
  }
  return { ok: true, status: 'current', reasons: [], changedFields, scope };
}

export function assessEvidence(selection, record, current = null) {
  const failures = [];
  const notes = [];
  if (!record || typeof record !== 'object') {
    return {
      ok: false,
      failures: ['no evidence record'],
      notes,
      identity: null,
      freshness: { ok: false, status: 'unknown', reasons: ['no evidence record'], changedFields: [], scope: null },
    };
  }

  const byId = new Map((record.checks || []).map((entry) => [entry.id, entry]));
  for (const check of selection.selectedChecks) {
    const entry = byId.get(check.id);
    if (!entry) { failures.push(`no result recorded for ${check.id}`); continue; }
    if (!STATUSES.includes(entry.status)) { failures.push(`${check.id} has unknown status ${entry.status}`); continue; }
    if (entry.status === 'pass') continue;
    if (NON_PASSING.includes(entry.status)) {
      const message = `${check.id} is ${entry.status}, which is not a pass`;
      if (check.required) failures.push(message); else notes.push(`${message} (optional)`);
    }
  }

  if (!record.candidate) failures.push('the record does not name the candidate it ran against');
  if (selection.unmappedPaths.length > 0) {
    failures.push(`${selection.unmappedPaths.length} changed path(s) matched no profile: ${selection.unmappedPaths.join(', ')}`);
  }
  if (selection.prerequisites.length > 0) {
    notes.push(`confirm these prerequisites before treating a run as complete: ${selection.prerequisites.join(', ')}`);
  }

  // Freshness is a separate question from result status. The record's identity
  // is compared with a current snapshot the caller obtained independently; the
  // old self-comparison against the record's own reuse claim is gone, because a
  // record that agrees with itself says nothing about whether it is still true.
  //
  // The recorded identity is copied back out as `identity` so that a later
  // consumer can recompare it against *its* current snapshot. The supplied
  // `current` is never written back over the recorded identity: a saved
  // assessment must keep saying what it actually ran against.
  const identity = record.identity && typeof record.identity === 'object' ? { ...record.identity } : null;
  const freshness = compareIdentity(identity, current);
  if (record.reuse && typeof record.reuse === 'object' && IDENTITY_FIELDS.some((field) => record.reuse[field] !== undefined)) {
    notes.push('the record still carries identity fields inside reuse; reuse is a pointer only and is not read as freshness truth - compare against the current identity instead');
  }
  return { ok: failures.length === 0 && freshness.ok, failures, notes, identity, freshness };
}

function unresolvedBlockers(record) {
  const blockers = [];
  const consider = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string') { if (value.trim() !== '') blockers.push(value.trim()); return; }
    if (typeof value !== 'object') return;
    const severity = typeof value.severity === 'string' ? value.severity.toLowerCase() : '';
    const resolved = value.resolved === true || value.status === 'resolved';
    if (severity === 'blocker' && !resolved) {
      blockers.push(String(value.summary || value.title || value.file || 'unresolved blocker'));
    }
  };
  if (Array.isArray(record.blockers)) record.blockers.forEach(consider);
  if (Array.isArray(record.findings)) record.findings.forEach(consider);
  return blockers;
}

// A bare SF-047 normalized record is readable evidence about a run, but it
// carries no binding to a captured identity or a triaged result. It stays a
// diagnostic and cannot qualify for reuse on its own.
function looksLikeNormalizedRecord(value) {
  if (!value || typeof value !== 'object') return false;
  return typeof value.outcome === 'string'
    || typeof value.schema_version === 'string'
    || (value.candidate !== null && typeof value.candidate === 'object');
}

// Slot 01 is the in-harness reviewer. Its record carries the identity it read,
// whether the pass completed, and any unresolved confirmed blocker. Nothing
// here runs a reviewer; it only reads what one recorded.
function classifyReviewerSlot(slot01, current) {
  const base = { status: 'missing', candidate: null, blockers: [], reasons: [] };
  if (!slot01 || typeof slot01 !== 'object') {
    return { ...base, reasons: ['no independent reviewer record was supplied'] };
  }
  const info = { status: 'incomplete', candidate: identityValue(slot01.candidate), blockers: unresolvedBlockers(slot01), reasons: [] };
  const comparison = compareIdentity(slot01.identity, current);
  if (!comparison.ok) {
    return { ...info, status: comparison.status === 'stale' ? 'stale' : 'incomplete', identityScope: comparison.scope, reasons: comparison.reasons };
  }
  if (!info.candidate) {
    return { ...info, identityScope: comparison.scope, reasons: ['the reviewer record names no candidate, so its provenance is incomplete'] };
  }
  if (slot01.complete !== true) {
    return { ...info, identityScope: comparison.scope, reasons: ['the reviewer has not recorded a completed pass'] };
  }
  if (!Array.isArray(slot01.blockers)) {
    return { ...info, identityScope: comparison.scope, reasons: ['the reviewer record carries no explicit blockers triage'] };
  }
  if (info.blockers.length > 0) {
    return {
      ...info,
      status: 'blocked',
      identityScope: comparison.scope,
      reasons: [`${info.blockers.length} unresolved confirmed blocker(s) remain: ${info.blockers.slice(0, 3).join('; ')}`],
    };
  }
  return { ...info, status: 'reusable', identityScope: comparison.scope, reasons: ['the independent reviewer completed on this identity with no unresolved confirmed blocker'] };
}

// Slot 02 consumes SF-047's normalized native record through a thin envelope:
// { recordPath, recordSha256, reviewedCandidate, identity, blockers }. The
// referenced bytes are read once, hashed and parsed as the same bytes, so a
// different run - even at the same head - cannot inherit another run's identity
// or triage. The normalized fields - outcome, complete, candidate.match,
// coverage, raw - are then read without re-parsing OCR output or imposing a
// schema on slot 01.
function classifyNativeSlot(slot02, current) {
  const base = {
    recordPath: null,
    recordSha256: null,
    outcome: null,
    coverage: null,
    raw: null,
    candidate: null,
    reviewedCandidate: null,
    identityEvidence: null,
    excluded: [],
    blockers: [],
    reasons: [],
  };
  if (!slot02 || typeof slot02 !== 'object') {
    return { ...base, status: 'missing', reasons: ['no slot-02 envelope was supplied'] };
  }
  if (typeof slot02.recordPath !== 'string' || slot02.recordPath.trim() === '') {
    if (looksLikeNormalizedRecord(slot02)) {
      return {
        ...base,
        gapKind: 'unbound',
        status: 'incomplete',
        reasons: ['the slot-02 input is a bare normalized record with no binding envelope, so it is a readable diagnostic and cannot qualify as a completed native pass'],
      };
    }
    return { ...base, status: 'missing', reasons: ['the slot-02 envelope carries no recordPath, so no native record can be read'] };
  }

  const recordPath = slot02.recordPath;
  let bytes;
  try {
    bytes = readFileSync(recordPath);
  } catch (error) {
    return { ...base, recordPath, status: 'failed', reasons: [`the referenced native record at ${recordPath} could not be read: ${error.message}`] };
  }
  const recordSha256 = createHash('sha256').update(bytes).digest('hex');
  const declaredSha = identityValue(slot02.recordSha256);
  if (!declaredSha) {
    return { ...base, recordPath, recordSha256, status: 'failed', reasons: ['the slot-02 envelope carries no recordSha256, so the referenced bytes are not bound to a run'] };
  }
  if (declaredSha.toLowerCase() !== recordSha256) {
    return {
      ...base,
      recordPath,
      recordSha256,
      status: 'failed',
      reasons: [`the referenced bytes hash to ${recordSha256}, which does not match the envelope's recordSha256 '${declaredSha}'; the record was substituted, so it cannot qualify even at the same head`],
    };
  }
  let record;
  try {
    record = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    return { ...base, recordPath, recordSha256, status: 'failed', reasons: [`the referenced native record is not valid JSON: ${error.message}`] };
  }
  if (!record || typeof record !== 'object') {
    return { ...base, recordPath, recordSha256, status: 'failed', reasons: ['the referenced native record is not a JSON object'] };
  }

  const outcome = identityValue(record.outcome);
  const coverage = record.coverage && typeof record.coverage === 'object' ? record.coverage : null;
  const raw = record.raw && typeof record.raw === 'object' ? record.raw : null;
  const candidate = record.candidate && typeof record.candidate === 'object' ? record.candidate : null;
  const resolved = candidate ? identityValue(candidate.resolved) : null;
  const requested = candidate ? identityValue(candidate.requested) : null;
  const reviewedCandidate = identityValue(slot02.reviewedCandidate);
  const excluded = coverage && coverage.excluded && Array.isArray(coverage.excluded.files) ? coverage.excluded.files : [];
  const info = {
    ...base,
    recordPath,
    recordSha256,
    outcome,
    coverage,
    raw,
    candidate: resolved ?? requested,
    reviewedCandidate,
    identityEvidence: candidate ? (identityValue(candidate.evidence) ?? null) : null,
    excluded,
    reasons: Array.isArray(record.reasons) ? record.reasons.slice() : [],
  };

  // Bind the envelope to the exact candidate the native run resolved. A
  // requested-name fallback cannot qualify, and the envelope may not simply
  // echo a different name than the record resolved.
  if (!reviewedCandidate) {
    return { ...info, status: 'stale', reasons: [...info.reasons, 'the envelope names no reviewedCandidate, so the native result cannot be bound to the candidate it reviewed'] };
  }
  if (!candidate || candidate.match !== true || !resolved || resolved !== reviewedCandidate) {
    return {
      ...info,
      status: 'stale',
      reasons: [...info.reasons, `the envelope's reviewedCandidate '${reviewedCandidate}' does not match the candidate the native record resolved (${resolved ?? 'none'}); a requested-name fallback cannot qualify`],
    };
  }
  if (!outcome) {
    return { ...info, status: 'failed', reasons: [...info.reasons, 'the slot-02 record carries no outcome, so it cannot be read as a completed native pass'] };
  }
  if (outcome === 'candidate-mismatch') {
    return { ...info, status: 'stale', reasons: [...info.reasons, 'the native run reports that its request did not resolve to the reviewed candidate, so it cannot be reused here'] };
  }
  if (NATIVE_SKIP_OUTCOMES.includes(outcome)) {
    const named = excluded.slice(0, 3).map((file) => (file && file.path ? file.path : '(unnamed)')).join(', ');
    return {
      ...info,
      status: 'skipped',
      reasons: [
        ...info.reasons,
        outcome === 'empty-coverage'
          ? 'the native run selected no items, so it executed no review'
          : 'the native run was skipped by policy rather than completed',
        ...(excluded.length > 0 ? [`the excluded scope names ${coverage.excluded.count ?? excluded.length} path(s), for example ${named}`] : []),
      ],
    };
  }
  if (NATIVE_FAILED_OUTCOMES.includes(outcome)) {
    return { ...info, status: 'failed', reasons: info.reasons.length > 0 ? info.reasons : [`the native run reported '${outcome}'`] };
  }

  // Compare the envelope's captured identity with the current input
  // unconditionally. A missing captured identity is unknown, not fresh.
  const comparison = compareIdentity(slot02.identity, current);
  if (!comparison.ok) {
    return { ...info, status: comparison.status === 'stale' ? 'stale' : 'incomplete', identityScope: comparison.scope, reasons: [...info.reasons, ...comparison.reasons] };
  }
  if (record.complete !== true) {
    return { ...info, status: 'incomplete', identityScope: comparison.scope, reasons: info.reasons.length > 0 ? info.reasons : [`the native run reported '${outcome}' without completion`] };
  }
  // Missing triage is incomplete rather than a pass: a completed run whose
  // findings were never triaged has not established that nothing blocks reuse.
  if (!Array.isArray(slot02.blockers)) {
    return { ...info, status: 'incomplete', identityScope: comparison.scope, reasons: [...info.reasons, 'the slot-02 envelope carries no explicit blockers triage, so a completed native pass cannot be treated as reusable'] };
  }
  const blockers = unresolvedBlockers(slot02);
  if (blockers.length > 0) {
    return {
      ...info,
      status: 'blocked',
      identityScope: comparison.scope,
      blockers,
      reasons: [...info.reasons, `${blockers.length} unresolved confirmed native blocker(s) remain: ${blockers.slice(0, 3).join('; ')}`],
    };
  }
  return { ...info, status: 'reusable', identityScope: comparison.scope, reasons: info.reasons.length > 0 ? info.reasons : ['the native engine completed on the reviewed candidate for the current identity'] };
}

// A saved validation assessment is a claim about the identity it ran against.
// Its own `ok`/`freshness` flags were computed against that identity, so they
// are never enough on their own: the recorded identity is recompared with the
// current snapshot here, and qualification needs both the recorded result and
// that fresh comparison to hold. A missing recorded identity is unknown, which
// cannot qualify.
function classifyValidation(validation, current) {
  if (!validation || typeof validation !== 'object') {
    return { status: 'missing', ok: false, scope: null, failures: [], identity: null, reasons: ['no validation assessment was supplied'] };
  }
  const freshness = validation.freshness && typeof validation.freshness === 'object' ? validation.freshness : null;
  const failures = Array.isArray(validation.failures) ? validation.failures : [];
  const identity = validation.identity && typeof validation.identity === 'object' ? validation.identity : null;
  const comparison = compareIdentity(identity, current);
  const freshnessOk = freshness ? freshness.ok === true : false;
  const reasons = [...failures];
  if (!freshness) reasons.push('the validation assessment carries no freshness result, so it cannot qualify for the current identity');
  else if (!freshnessOk) reasons.push(...(Array.isArray(freshness.reasons) ? freshness.reasons : []));
  if (!comparison.ok) reasons.push(...comparison.reasons);
  const ok = validation.ok === true && freshnessOk && failures.length === 0 && comparison.ok;
  if (!ok && reasons.length === 0) reasons.push('the validation assessment is not qualified for the current identity');
  return {
    status: comparison.ok ? (identityValue(freshness && freshness.status) ?? 'unknown') : comparison.status,
    ok,
    scope: identityValue(comparison.scope) ?? (freshness ? identityValue(freshness.scope) : null),
    failures,
    identity,
    reasons,
  };
}

// Assess the selected independent reviews against current inputs. One review is
// enough by default; project policy selects additional specialist coverage.
// Every supplied record remains required coverage. This does not execute or
// authenticate a reviewer, waive a gate, or decide publication authority.
export function assessReviewEvidence({ current = null, validation = null, reviews = [], requiredReviews = 1, slot01 = null, slot02 = null } = {}) {
  const failures = [];
  const coverageGaps = [];
  const staleScopes = [];
  const reusableSlots = [];

  const validationResult = classifyValidation(validation, current);
  if (!validationResult.ok) {
    failures.push(`the validation assessment is not qualified for the current identity: ${validationResult.reasons.join('; ') || 'no reason given'}`);
  }
  if (validationResult.status !== 'current') {
    staleScopes.push({ slot: 'validation', scope: validationResult.scope, reason: validationResult.reasons.join('; ') || `validation identity is ${validationResult.status}` });
  }

  if (!Number.isInteger(requiredReviews) || requiredReviews < 1) {
    failures.push('requiredReviews must be a positive integer selected by project policy');
  }
  if (!Array.isArray(reviews)) {
    failures.push('reviews must be an array of selected review records');
    reviews = [];
  }
  const records = {};
  if (slot01 !== null) records['01'] = slot01;
  if (slot02 !== null) records['02'] = slot02;
  for (const record of reviews) {
    let number = 1;
    while (String(number).padStart(2, '0') in records) number += 1;
    records[String(number).padStart(2, '0')] = record;
  }
  const slots = {};
  const proofs = new Set();
  for (const [slot, record] of Object.entries(records)) {
    const native = (slot === '02' && slot02 !== null) || (record && (record.recordPath !== undefined || looksLikeNormalizedRecord(record)));
    const result = native ? classifyNativeSlot(record, current) : classifyReviewerSlot(record, current);
    const proof = native ? result.recordSha256 : JSON.stringify(record, (_key, value) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
        : value);
    if (result.status === 'reusable' && proofs.has(proof)) {
      slots[slot] = { ...result, status: 'failed', reasons: ['duplicate review evidence cannot count as another independent review'] };
    } else {
      slots[slot] = result;
      if (result.status === 'reusable') proofs.add(proof);
    }
  }
  for (const [slot, result] of Object.entries(slots)) {
    const scope = identityValue(result.identityScope) ?? identityValue(current && current.scope);
    if (result.status === 'reusable') { reusableSlots.push(slot); continue; }
    const reason = result.reasons.join('; ');
    if (result.status === 'stale') { staleScopes.push({ slot, scope, reason }); continue; }
    if (result.status === 'skipped') { coverageGaps.push({ slot, kind: 'skipped', scope, reason, excluded: result.excluded ?? [] }); continue; }
    if (result.status === 'incomplete' && result.recordPath !== undefined) { coverageGaps.push({ slot, kind: result.gapKind ?? 'partial', scope, reason }); continue; }
    if (result.status === 'blocked') { failures.push(`slot ${slot} has unresolved confirmed blockers: ${reason}`); continue; }
    if (result.status === 'failed') { failures.push(`slot ${slot} failed: ${reason}`); continue; }
    if (result.status === 'incomplete') { failures.push(`slot ${slot} is incomplete: ${reason}`); continue; }
    failures.push(`slot ${slot} has no usable record: ${reason || 'missing'}`);
  }

  if (reusableSlots.length < requiredReviews && Object.keys(slots).length < requiredReviews) {
    coverageGaps.push({ slot: 'reviews', kind: 'missing', scope: identityValue(current && current.scope), reason: `${requiredReviews} independent reviews are required, but only ${Object.keys(slots).length} record(s) were supplied` });
  }
  const ok = failures.length === 0 && validationResult.ok && reusableSlots.length >= requiredReviews && reusableSlots.length === Object.keys(slots).length;
  return {
    ok,
    current: current ? { project: identityValue(current.project), scope: identityValue(current.scope) } : null,
    validation: validationResult,
    slots,
    reusableSlots,
    requiredReviews,
    staleScopes,
    failures,
    coverageGaps,
  };
}
function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseArgs(argv) {
  const args = { changed: [], reviews: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--changed') { args.changed.push(argv[index + 1]); index += 1; }
    else if (token === '--changed-file') { args.changedFile = argv[index + 1]; index += 1; }
    else if (token === '--profile') { args.profile = argv[index + 1]; index += 1; }
    else if (token === '--record') { args.record = argv[index + 1]; index += 1; }
    else if (token === '--current') { args.current = argv[index + 1]; index += 1; }
    else if (token === '--validation') { args.validation = argv[index + 1]; index += 1; }
    else if (token === '--review') { args.reviews.push(argv[index + 1]); index += 1; }
    else if (token === '--required-reviews') { args.requiredReviews = Number(argv[index + 1]); index += 1; }
    else if (token === '--slot01') { args.slot01 = argv[index + 1]; index += 1; }
    else if (token === '--slot02') { args.slot02 = argv[index + 1]; index += 1; }
    else if (!args.command) { args.command = token; }
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.command && !COMMANDS.includes(args.command)) {
    process.stderr.write(`unknown command '${args.command}'; expected ${COMMANDS.join(' or ')}\n`);
    return 2;
  }
  if (args.command === 'assess-review') {
    const assessment = assessReviewEvidence({
      current: args.current ? readJson(args.current) : null,
      validation: args.validation ? readJson(args.validation) : null,
      reviews: args.reviews.map(readJson),
      requiredReviews: args.requiredReviews ?? 1,
      slot01: args.slot01 ? readJson(args.slot01) : null,
      slot02: args.slot02 ? readJson(args.slot02) : null,
    });
    process.stdout.write(JSON.stringify(assessment, null, 2) + '\n');
    return assessment.ok ? 0 : 1;
  }
  if (!args.profile) {
    process.stderr.write('usage: select-checks.mjs <select|assess> --profile <file> --changed <path>... [--current <identity.json>]\n');
    process.stderr.write('       select-checks.mjs assess-review --current <identity.json> --validation <assessment.json> --review <record.json>... [--required-reviews <count>]\n');
    return 2;
  }
  const profile = readJson(args.profile);
  const changed = args.changedFile
    ? readFileSync(args.changedFile, 'utf8').split(/\r?\n/).filter((line) => line.trim() !== '')
    : args.changed;

  const selection = selectChecks(profile, changed);
  if (!selection.ok) {
    process.stdout.write(JSON.stringify(selection, null, 2) + '\n');
    return 2;
  }
  if (args.command === 'assess') {
    if (!args.record) { process.stderr.write('assess needs --record <file>\n'); return 2; }
    const assessment = assessEvidence(selection, readJson(args.record), args.current ? readJson(args.current) : null);
    process.stdout.write(JSON.stringify({ selection, assessment }, null, 2) + '\n');
    return assessment.ok ? 0 : 1;
  }
  process.stdout.write(JSON.stringify(selection, null, 2) + '\n');
  return selection.unmappedPaths.length > 0 ? 3 : 0;
}

// Compare real paths: Node runs a linked script from its real file, so through a
// junction or symlink the invoked path differs and main() would silently not run.
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
