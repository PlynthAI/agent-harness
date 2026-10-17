import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { run } from '../scripts/assets.mjs';

// Tiny genuine images generated once with Sharp 0.35.5; acquisition preserves their bytes.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWN4lmgBAAOwAYAm4w5QAAAAAElFTkSuQmCC', 'base64');
const jpeg = Buffer.from('/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCoAcqD/9k=', 'base64');
const gif = Buffer.from('R0lGODlhAQABAIAAAExpceZhOCH5BAUAAAAALAAAAAABAAEAAAICTAEAOw==', 'base64');
const webp = Buffer.from('UklGRjoAAABXRUJQVlA4IC4AAADwAQCdASoBAAEAAUAmJaACdLoB+AAF9AAA2m/82BXNc+/3/7Sz9Kx9Kx/CoAAA', 'base64');
const avif = Buffer.from('AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAACEAAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAApbWRhdBIACgc4AAaQENBpMhQZQmMEwAA0AACQQMkXgzxbUb+RAg==', 'base64');
const metadataJpeg = Buffer.from('/9j/4QDuRXhpZgAASUkqAAgAAAAIAA4BAgAPAAAAiAAAABIBAwABAAAAAQAAABoBBQABAAAAbgAAABsBBQABAAAAdgAAACgBAwABAAAAAgAAADsBAgAKAAAAfgAAABMCAwABAAAAAQAAAGmHBAABAAAAmAAAAAAAAAA4YwAA6AMAADhjAADoAwAAQW4gQXJ0aXN0AEEgY29sb3VyIHN0dWR5AAAGAACQBwAEAAAAMDIxMAGRBwAEAAAAAQIDAACgBwAEAAAAMDEwMAGgAwABAAAA//8AAAKgBAABAAAAAQAAAAOgBAABAAAAAQAAAAAAAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCoAcqD/9k=', 'base64');
const animatedGif = Buffer.from('R0lGODlhAgACAIAAAExpcf8AACH/C05FVFNDQVBFMi4wAwEAAAAh+QQFCgAAACwAAAAAAgACAAACAoxTACH5BAUUAAAALAAAAAACAAIAgExpcQAA/wICjFMAOw==', 'base64');
const animatedWebp = Buffer.from('UklGRsIAAABXRUJQVlA4WAoAAAACAAAAAQAAAQAAQU5JTQYAAAD/////AABBTk1GSAAAAAAAAAAAAAEAAAEAAGQAAAJWUDggMAAAANABAJ0BKgIAAgABQCYloAJ0ugH4AAOwAP7y63/82BXNc+/3/9Lg/S4P0uD/0pAAAEFOTUZGAAAAAAAAAAAAAQAAAQAAyAAAAFZQOCAuAAAAlAEAnQEqAgACAAAAJiWgAnS6AAOYAP77VeP/pcH/0uD/6XB/6XB/G7LOG6QAAA==', 'base64');
const ov = { id: 'checked-photo', title: 'Harbour & boats', creator: 'A Photographer', creator_url: 'https://example.org/creator', license: 'by', license_version: '4.0', license_url: 'https://creativecommons.org/licenses/by/4.0/', foreign_landing_url: 'https://example.org/photo', url: 'https://example.org/photo.png', width: 1600, height: 900, source: 'flickr' };
const commons = { pageid: 42, title: 'File:Harbour.png', imageinfo: [{ url: 'https://example.org/commons.png', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Harbour.png', mime: 'image/png', mediatype: 'BITMAP', width: 1600, height: 900, extmetadata: { ObjectName: { value: 'Harbour' }, Artist: { value: '<b>A &amp; B</b>' }, License: { value: 'cc-by-sa-4.0' }, LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' }, Restrictions: { value: 'trademarked' } } }] };
const aic = { id: 27992, title: 'Harbour painting', artist_title: 'An Artist', date_display: '1884', is_public_domain: true, image_id: 'image-id', thumbnail: { width: 2000, height: 1000, alt_text: 'A harbour' } };
const met = { objectID: 436535, title: 'Harbour print', artistDisplayName: 'A Printmaker', objectDate: '1890', isPublicDomain: true, primaryImage: 'https://example.org/met.jpg', objectURL: 'https://www.metmuseum.org/art/collection/search/436535' };

function temporary(t) {
  const root = fs.mkdtempSync(join(tmpdir(), 'taste-assets-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function snapshot(root) {
  return Object.fromEntries(fs.readdirSync(root).sort().map(name => [name, fs.readFileSync(join(root, name)).toString('base64')]));
}
function fixtureFetch(record = ov, calls = []) {
  return async (url) => {
    calls.push(String(url));
    const u = new URL(url);
    if (u.hostname === 'api.openverse.org') return Response.json(u.pathname.endsWith('/images/') ? { result_count: 1, results: [record] } : record);
    if (u.hostname === 'commons.wikimedia.org') return Response.json({ query: { pages: [commons] } });
    if (u.hostname === 'api.artic.edu') return Response.json({ data: u.pathname.endsWith('/search') ? [aic] : aic, config: { iiif_url: 'https://www.artic.edu/iiif/2' }, pagination: { total: 1 } });
    if (u.hostname === 'collectionapi.metmuseum.org') return Response.json(u.pathname.endsWith('/search') ? { total: 1, objectIDs: [met.objectID] } : met);
    return new Response(png, { headers: { 'content-type': 'image/png' } });
  };
}
async function invoke(argv, options = {}) {
  let output = '', error = '';
  const code = await run(argv, { fetch: fixtureFetch(), stdout: text => { output += text; }, stderr: text => { error += text; }, ...options });
  return { code, output, error, json: () => JSON.parse(output) };
}
function checkedSelection(overrides = {}) {
  return { ref: 'openverse:checked-photo', intendedUse: 'Historical harbour reference in a project study', subjectRelationship: 'Reference photograph, not our project or client', terms: { sourceUrl: 'https://example.org/photo', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', checkedAt: '2026-10-14T00:00:00.000Z', conditions: [], providerConditions: [], requiredCredit: '"Harbour & boats" by A Photographer, CC BY 4.0, via Flickr' }, edits: ['No edits'], ...overrides };
}
function selectionFile(root, selection = checkedSelection()) {
  const path = join(root, 'selection.json');
  fs.writeFileSync(path, JSON.stringify(selection));
  return path;
}
const getArgs = (root, selection, extra = []) => ['--get', 'openverse:checked-photo', '--selection', selection, '--to', root, ...extra];

test('provider URL credentials stay transient while public output and saved credits retain safe links', async t => {
  const root = temporary(t);
  const record = { ...ov, foreign_landing_url: 'https://user:password@example.org/photo?token=source-secret&view=public', creator_url: 'https://example.org/creator?api_key=creator-secret', url: 'https://example.org/photo.png?access_token=image-secret&width=1600' };
  const calls = [];
  const inspection = await invoke(['--inspect', ov.id ? `openverse:${ov.id}` : '', '--json'], { fetch: fixtureFetch(record, calls) });
  assert.equal(inspection.code, 0, inspection.error);
  assert.doesNotMatch(inspection.output, /password|source-secret|creator-secret|image-secret/);
  const item = inspection.json();
  assert.equal(item.page, 'https://example.org/photo?view=public');
  assert.equal(item.creatorUrl, 'https://example.org/creator');
  assert.equal(item.image, 'https://example.org/photo.png?width=1600');
  const selection = selectionFile(root, checkedSelection({ terms: { ...item.terms, checkedAt: '2026-10-14T00:00:00Z' } }));
  const acquired = await invoke(getArgs(root, selection), { fetch: fixtureFetch(record, calls) });
  assert.equal(acquired.code, 0, acquired.error);
  assert.ok(calls.includes(record.url), 'the actual image request retains its transient access token');
  assert.doesNotMatch(acquired.output + fs.readFileSync(join(root, 'credits.json'), 'utf8'), /password|source-secret|creator-secret|image-secret/);
  const before = snapshot(root);
  const repeated = await invoke(getArgs(root, selection), { fetch: fixtureFetch(record) });
  assert.equal(repeated.code, 0, repeated.error);
  assert.equal(repeated.json().status, 'unchanged');
  assert.deepEqual(snapshot(root), before);
  fs.writeFileSync(selection, JSON.stringify(checkedSelection({ terms: { ...checkedSelection().terms, sourceUrl: record.foreign_landing_url } })));
  const unsafeBefore = snapshot(root);
  const unsafeSelection = await invoke(getArgs(root, selection));
  assert.notEqual(unsafeSelection.code, 0);
  assert.deepEqual(snapshot(root), unsafeBefore);
});

test('URL credentials in fragments and echoed request errors cannot escape through CLI metadata, probes or ledgers', async t => {
  const root = temporary(t);
  const record = { ...ov,
    foreign_landing_url: 'https://source-user:source-password@example.org/photo?token=source-secret#section-2',
    creator_url: 'https://example.org/creator#access_token=creator-fragment&view=profile',
    license_url: 'https://licence-user:licence-password@creativecommons.org/licenses/by/4.0/?api_key=licence-secret#licence-note',
    url: 'https://image-user:image-password@example.org/photo.png?access_token=image-secret#access_token=image-fragment&view=full',
  };
  const privateValues = /source-user|source-password|source-secret|creator-fragment|licence-user|licence-password|licence-secret|image-user|image-password|image-secret|image-fragment/;
  const inspected = await invoke(['--inspect', 'openverse:checked-photo', '--json'], { fetch: fixtureFetch(record) });
  assert.equal(inspected.code, 0, inspected.error);
  assert.doesNotMatch(inspected.output, privateValues);
  assert.equal(inspected.json().page, 'https://example.org/photo#section-2');
  assert.equal(inspected.json().creatorUrl, 'https://example.org/creator#view=profile');
  assert.equal(inspected.json().licenseUrl, 'https://creativecommons.org/licenses/by/4.0/#licence-note');
  const selection = selectionFile(root, checkedSelection({ terms: { ...inspected.json().terms, checkedAt: '2026-10-14T00:00:00Z' } }));
  const baseFetch = fixtureFetch(record);
  const failedFetch = async (url, options) => {
    if (url === record.url) throw new TypeError(`Request cannot be constructed from a URL with credentials: ${url}`);
    return baseFetch(url, options);
  };
  const before = snapshot(root);
  const searched = await invoke(['harbour', '--source', 'openverse', '--json', '--to', root], { fetch: failedFetch });
  assert.equal(searched.code, 0, searched.error);
  assert.equal(searched.json().sources[0].items[0].probe.ok, false);
  assert.match(searched.json().sources[0].items[0].probe.why, /URL with credentials/);
  assert.doesNotMatch(searched.output, privateValues);
  const failed = await invoke(getArgs(root, selection), { fetch: failedFetch });
  assert.notEqual(failed.code, 0);
  assert.doesNotMatch(failed.output + failed.error, privateValues);
  assert.deepEqual(snapshot(root), before);
  const acquired = await invoke(getArgs(root, selection), { fetch: baseFetch });
  assert.equal(acquired.code, 0, acquired.error);
  const ledgerPath = join(root, 'credits.json'), savedLedger = fs.readFileSync(ledgerPath, 'utf8');
  assert.doesNotMatch(savedLedger + acquired.output, privateValues);
  for (const field of ['page', 'creatorUrl', 'licenseUrl', 'image']) {
    const entries = JSON.parse(savedLedger);
    entries[0][field] = record.url;
    fs.writeFileSync(ledgerPath, JSON.stringify(entries));
    const heldBytes = snapshot(root), calls = [];
    for (const args of [['--credits', '--to', root], getArgs(root, selection)]) {
      const held = await invoke(args, { fetch: fixtureFetch(record, calls) });
      assert.notEqual(held.code, 0, field);
      assert.match(held.error, /Invalid credits/);
      assert.doesNotMatch(held.output + held.error, privateValues);
      assert.deepEqual(snapshot(root), heldBytes);
    }
    assert.equal(calls.length, 0, 'a private ledger holds before provider access');
  }
});

test('opaque URL inspection preserves long safe paths with bounded parsing amplification', async t => {
  const NativeURL = globalThis.URL, parsingBudget = 100000, work = [];
  const inspectWithBudget = async record => {
    let constructions = 0;
    globalThis.URL = class extends NativeURL {
      constructor(...args) {
        if (++constructions > parsingBudget) throw new Error('URL parsing work budget exceeded');
        super(...args);
      }
    };
    try {
      const result = await invoke(['--inspect', 'openverse:checked-photo', '--json'], { fetch: fixtureFetch(record) });
      return { result, constructions };
    } finally { globalThis.URL = NativeURL; }
  };
  for (const repetitions of [12, 25]) {
    const url = 'https://example.org/proxy/' + 'https://a.example/'.repeat(repetitions);
    const { result, constructions } = await inspectWithBudget({ ...ov, url });
    t.diagnostic(JSON.stringify({ repetitions, constructions, parsingBudget }));
    assert.equal(result.code, 0, result.error);
    assert.equal(result.json().image, url, 'safe opaque path must not be rejected to avoid work');
    assert.equal(result.json().original, url);
    assert.ok(constructions <= parsingBudget, 'short public URLs have a generous finite parsing budget');
    work.push(constructions);
  }
  // This allowance permits polynomial alternatives while exposing suffix recursion's exponential growth.
  assert.ok(work[1] <= work[0] * 32 + 5000, 'doubling path size must not amplify parsing exponentially');
  const root = temporary(t), before = snapshot(root), calls = [];
  const safe = 'https://example.org/proxy/' + 'https://a.example/'.repeat(25);
  const searched = await invoke(['harbour', '--source', 'openverse', '--json', '--min-width', '0', '--to', root], { fetch: fixtureFetch({ ...ov, url: safe }, calls) });
  assert.equal(searched.code, 0, searched.error);
  assert.equal(searched.json().sources[0].items[0].image, safe);
  assert.ok(calls.includes(safe), 'transport receives the complete original opaque path');
  const privatePath = 'https://example.org/proxy/' + 'https://a.example/'.repeat(24) + 'https://proxy-user:proxy-pass@a.example/?token=proxy-secret';
  const refused = await invoke(['--inspect', 'openverse:checked-photo', '--json'], { fetch: fixtureFetch({ ...ov, url: privatePath }) });
  assert.equal(refused.code, 0, refused.error);
  assert.equal(refused.json().image, null);
  assert.equal(refused.json().original, null);
  assert.doesNotMatch(refused.output + refused.error, /proxy-user|proxy-pass|proxy-secret/);
  assert.deepEqual(snapshot(root), before);
});

test('structured descendant credentials stay transient across public metadata, diagnostics and saved terms', async t => {
  const grandchild = 'https://grand-user:grand-pass@grand.example/asset?signature=grand-secret&size=large#view=detail&token=grand-fragment';
  const safeGrandchild = 'https://grand.example/asset?size=large#view=detail';
  const child = 'https://child-user:child-pass@child.example/image?next=' + encodeURIComponent(grandchild) + '&tag=one&tag=&tag=two#next=' + encodeURIComponent(grandchild) + '&view=photo&empty=&auth=child-fragment';
  const safeChild = 'https://child.example/image?next=' + encodeURIComponent(safeGrandchild) + '&tag=one&tag=&tag=two#next=' + encodeURIComponent(safeGrandchild) + '&view=photo&empty=';
  const record = { ...ov,
    foreign_landing_url: 'https://example.org/photo?tag=first&next=' + encodeURIComponent(child) + '&tag=&tag=last&empty=#chapter-2',
    url: 'https://example.org/photo.png?next=' + encodeURIComponent(child) + '&width=1600#photo',
    creator_url: 'https://example.org/creator#view=profile&next=' + encodeURIComponent(child) + '&view=&view=detail&empty=',
    license_url: 'https://creativecommons.org/licenses/by/4.0/#' + child,
  };
  const safe = {
    page: 'https://example.org/photo?tag=first&next=' + encodeURIComponent(safeChild) + '&tag=&tag=last&empty=#chapter-2',
    image: 'https://example.org/photo.png?next=' + encodeURIComponent(safeChild) + '&width=1600#photo',
    creatorUrl: 'https://example.org/creator#view=profile&next=' + encodeURIComponent(safeChild) + '&view=&view=detail&empty=',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/#' + safeChild,
  };
  const secrets = /grand-user|grand-pass|grand-secret|grand-fragment|child-user|child-pass|child-fragment/;
  await t.test('inspection, checked search, acquisition, repeats and credits agree on sanitized terms', async subtest => {
    const root = temporary(subtest), calls = [];
    fs.writeFileSync(join(root, 'original.png'), png);
    const before = snapshot(root);
    const inspected = await invoke(['--inspect', 'openverse:checked-photo', '--json', '--to', root], { fetch: fixtureFetch(record, calls) });
    assert.equal(inspected.code, 0, inspected.error);
    assert.doesNotMatch(inspected.output + inspected.error, secrets);
    const item = inspected.json();
    for (const [field, url] of Object.entries(safe)) assert.equal(item[field], url, field);
    assert.equal(item.original, safe.image);
    assert.equal(item.terms.sourceUrl, safe.page);
    assert.equal(item.terms.licenseUrl, safe.licenseUrl);
    assert.deepEqual([...new URL(item.page).searchParams], [['tag', 'first'], ['next', safeChild], ['tag', ''], ['tag', 'last'], ['empty', '']]);
    assert.deepEqual([...new URLSearchParams(new URL(item.creatorUrl).hash.slice(1))], [['view', 'profile'], ['next', safeChild], ['view', ''], ['view', 'detail'], ['empty', '']]);
    const nested = new URL(new URL(item.page).searchParams.get('next'));
    assert.equal(nested.searchParams.get('next'), safeGrandchild);
    assert.equal(new URLSearchParams(nested.hash.slice(1)).get('next'), safeGrandchild);
    assert.equal(new URL(item.licenseUrl).hash.slice(1), safeChild);
    const searched = await invoke(['harbour', '--source', 'openverse', '--json', '--min-width', '0', '--to', root], { fetch: fixtureFetch(record, calls) });
    assert.equal(searched.code, 0, searched.error);
    const found = searched.json().sources[0].items[0];
    assert.equal(found.probe.ok, true);
    for (const [field, url] of Object.entries(safe)) assert.equal(found[field], url, field);
    assert.deepEqual(found.terms, item.terms);
    assert.doesNotMatch(searched.output + searched.error, secrets);
    assert.deepEqual(snapshot(root), before, 'metadata and probes leave prior bytes untouched');
    const selection = selectionFile(root, checkedSelection({ terms: { ...item.terms, checkedAt: '2026-10-14T00:00:00Z' } }));
    const acquired = await invoke(getArgs(root, selection), { fetch: fixtureFetch(record, calls) });
    assert.equal(acquired.code, 0, acquired.error);
    assert.ok(calls.includes(record.url), 'original nested private image URL reaches transport');
    const entry = acquired.json().credit;
    for (const [field, url] of Object.entries(safe)) assert.equal(entry[field], url, field);
    assert.equal(entry.terms.sourceUrl, safe.page);
    assert.equal(entry.terms.licenseUrl, safe.licenseUrl);
    assert.equal(entry.terms.requiredCredit, entry.credit);
    assert.deepEqual(fs.readFileSync(join(root, entry.file)), png);
    assert.deepEqual(fs.readFileSync(join(root, 'original.png')), png);
    const ledgerPath = join(root, 'credits.json'), savedLedger = fs.readFileSync(ledgerPath, 'utf8');
    assert.doesNotMatch(acquired.output + acquired.error + savedLedger, secrets);
    const saved = snapshot(root), repeatedCalls = [];
    const repeated = await invoke(getArgs(root, selection), { fetch: fixtureFetch(record, repeatedCalls) });
    assert.equal(repeated.code, 0, repeated.error);
    assert.equal(repeated.json().status, 'unchanged');
    assert.equal(repeated.json().credit.page, safe.page);
    assert.doesNotMatch(repeated.output + repeated.error, secrets);
    assert.ok(!repeatedCalls.includes(record.url), 'matching repeat avoids another image download');
    const credits = await invoke(['--credits', '--to', root], { fetch: async () => { throw new Error('credits must not access a provider'); } });
    assert.equal(credits.code, 0, credits.error);
    assert.ok(credits.output.includes(safe.page.replace(/&/g, '&amp;')));
    assert.ok(credits.output.includes(safe.licenseUrl.replace(/&/g, '&amp;')));
    assert.doesNotMatch(credits.output + credits.error + fs.readFileSync(ledgerPath, 'utf8'), secrets);
    assert.deepEqual(snapshot(root), saved);
    for (const field of ['page', 'creatorUrl', 'licenseUrl', 'image', 'terms.sourceUrl', 'terms.licenseUrl']) {
      const entries = JSON.parse(savedLedger);
      if (field.startsWith('terms.')) entries[0].terms[field.slice(6)] = record.foreign_landing_url;
      else entries[0][field] = record.foreign_landing_url;
      fs.writeFileSync(ledgerPath, JSON.stringify(entries));
      const heldBytes = snapshot(root), heldCalls = [];
      for (const args of [['--credits', '--to', root], getArgs(root, selection)]) {
        const held = await invoke(args, { fetch: fixtureFetch(record, heldCalls) });
        assert.equal(held.code, 2, field);
        assert.match(held.error, /Invalid credits/);
        assert.doesNotMatch(held.output + held.error, secrets);
        assert.deepEqual(snapshot(root), heldBytes, field);
      }
      assert.equal(heldCalls.length, 0, field + ' rejects before provider access');
    }
    fs.writeFileSync(ledgerPath, savedLedger);
    for (const field of ['sourceUrl', 'licenseUrl']) {
      selectionFile(root, checkedSelection({ terms: { ...entry.terms, [field]: record.creator_url } }));
      const heldBytes = snapshot(root), heldCalls = [];
      const held = await invoke(getArgs(root, selection), { fetch: fixtureFetch(record, heldCalls) });
      assert.equal(held.code, 2, field);
      assert.match(held.error, /Selection needs checked terms/);
      assert.doesNotMatch(held.output + held.error, secrets);
      assert.equal(heldCalls.length, 0, 'unsafe selection rejects before provider access');
      assert.deepEqual(snapshot(root), heldBytes);
    }
  });
  for (const registration of ['child then parent', 'parent then child', 'parent alone']) await t.test(registration, async subtest => {
    const root = temporary(subtest);
    fs.writeFileSync(join(root, 'original.png'), png);
    fs.writeFileSync(join(root, 'credits.json'), 'prior ledger bytes\n');
    const before = snapshot(root), calls = [];
    const child = 'https://diagnostic-user:diagnostic-pass@b.org/b';
    const parent = registration === 'parent alone'
      ? 'https://example.org/a?next=' + encodeURIComponent(child) + '&width=1600#photo'
      : 'https://parent-user:parent-pass@example.org/a?next=' + child + '&width=1600#photo';
    const safeParent = 'https://example.org/a?next=https%3A%2F%2Fb.org%2Fb&width=1600#photo';
    const urls = registration === 'child then parent' ? [child, parent] : registration === 'parent then child' ? [parent, child] : [parent];
    const message = 'Failed "' + parent + '" then <' + parent + '>; retry after checking its source.';
    const records = urls.map((url, index) => ({ ...ov, id: 'nested-diagnostic-' + index, url }));
    const request = async url => {
      calls.push(String(url));
      const host = new URL(url).hostname;
      if (host === 'api.openverse.org') return Response.json({ result_count: records.length, results: records });
      if (host === 'api.artic.edu') return Response.json({ error: { info: message } });
      return new Response(png, { headers: { 'content-type': 'image/png' } });
    };
    const result = await invoke(['harbour', '--source', 'openverse,aic', '--json', '--min-width', '0', '--to', root], { fetch: request });
    assert.equal(result.code, 1);
    assert.equal(result.json().sources.at(-1).error, 'Failed "' + safeParent + '" then <' + safeParent + '>; retry after checking its source.');
    assert.doesNotMatch(result.output + result.error, /diagnostic-user|diagnostic-pass|parent-user|parent-pass/);
    assert.deepEqual(calls.filter(url => urls.includes(url)), urls);
    assert.deepEqual(snapshot(root), before);
  });
  await t.test('ordinary public values keep their exact spelling and encoding', async () => {
    const unchanged = 'https://example.org/a?q=l\'atelier&space=%20&marker=~&next=https%3A%2F%2Fpublic.example%2Fb%3Fview%3Ddetail#chapter%20one';
    const inspected = await invoke(['--inspect', 'openverse:checked-photo', '--json'], { fetch: fixtureFetch({ ...ov, url: unchanged, creator_url: unchanged, foreign_landing_url: unchanged, license_url: unchanged }) });
    assert.equal(inspected.code, 0, inspected.error);
    for (const field of ['image', 'original', 'creatorUrl', 'page', 'licenseUrl']) assert.equal(inspected.json()[field], unchanged, field);
    assert.equal(inspected.json().terms.sourceUrl, unchanged);
    assert.equal(inspected.json().terms.licenseUrl, unchanged);
  });
});

test('raw fragment descendants sanitize in order while ambiguous descendant failures refuse the whole URL', async t => {
  const root = temporary(t), selection = selectionFile(root);
  const raw = 'https://example.org/photo.png#next=https://fragment-user:fragment-pass@child.example/image?token=fragment-secret&view=photo&empty=&next=https://other-user:other-pass@other.example/item&tag=&tag=last';
  const safe = 'https://example.org/photo.png#next=https%3A%2F%2Fchild.example%2Fimage&view=photo&empty=&next=https%3A%2F%2Fother.example%2Fitem&tag=&tag=last';
  const inspected = await invoke(['--inspect', 'openverse:checked-photo', '--json'], { fetch: fixtureFetch({ ...ov, url: raw, creator_url: raw }) });
  assert.equal(inspected.code, 0, inspected.error);
  assert.equal(inspected.json().image, safe);
  assert.equal(inspected.json().creatorUrl, safe);
  assert.deepEqual([...new URLSearchParams(new URL(inspected.json().image).hash.slice(1))], [['next', 'https://child.example/image'], ['view', 'photo'], ['empty', ''], ['next', 'https://other.example/item'], ['tag', ''], ['tag', 'last']]);
  assert.doesNotMatch(inspected.output + inspected.error, /fragment-user|fragment-pass|fragment-secret|other-user|other-pass/);
  const ambiguous = 'Read https://opaque-user:opaque-pass@b.org/b for detail';
  const nested = 'https://child.example/image?note=' + encodeURIComponent(ambiguous);
  for (const url of ['https://example.org/photo.png#' + ambiguous, 'https://example.org/photo.png?next=' + encodeURIComponent(nested)]) {
    const record = { ...ov, url }, calls = [];
    const refused = await invoke(['--inspect', 'openverse:checked-photo', '--json'], { fetch: fixtureFetch(record) });
    assert.equal(refused.code, 0, refused.error);
    assert.equal(refused.json().image, null, 'an unsafe descendant cannot fall back to its original value');
    assert.doesNotMatch(refused.output + refused.error, /opaque-user|opaque-pass/);
    const before = snapshot(root);
    const held = await invoke(getArgs(root, selection), { fetch: fixtureFetch(record, calls) });
    assert.equal(held.code, 2);
    assert.match(held.error, /safe public image URL/);
    assert.ok(!calls.includes(url));
    assert.deepEqual(snapshot(root), before);
  }
  const publicFragment = 'https://example.org/photo.png#Read https://b.org/b for detail';
  const unchanged = await invoke(['--inspect', 'openverse:checked-photo', '--json'], { fetch: fixtureFetch({ ...ov, url: publicFragment }) });
  assert.equal(unchanged.json().image, publicFragment);
});

test('ambiguous embedded private URLs are refused while safe opaque URL values remain unchanged', async t => {
  const privateChild = 'https://opaque-user:opaque-pass@b.org/b';
  const safeChild = 'https://b.org/b';
  const scenarios = [
    { name: 'compound query value', url: 'https://example.org/photo.png?note=' + encodeURIComponent('See ' + privateChild + ' for detail'), safe: 'https://example.org/photo.png?note=' + encodeURIComponent('See ' + safeChild + ' for detail') },
    { name: 'embedded path', url: 'https://example.org/proxy/' + encodeURIComponent(privateChild), safe: 'https://example.org/proxy/' + encodeURIComponent(safeChild) },
    { name: 'compound fragment parameter', url: 'https://example.org/photo.png#note=' + encodeURIComponent('See ' + privateChild + ' for detail'), safe: 'https://example.org/photo.png#note=' + encodeURIComponent('See ' + safeChild + ' for detail') },
    { name: 'opaque query parameter name', url: 'https://example.org/photo.png?' + encodeURIComponent(privateChild) + '=detail&width=1600', safe: 'https://example.org/photo.png?' + encodeURIComponent(safeChild) + '=detail&width=1600' },
    { name: 'encoded fragment identifier', url: 'https://example.org/photo.png#' + encodeURIComponent(privateChild), safe: 'https://example.org/photo.png#' + encodeURIComponent(safeChild) },
  ];
  for (const scenario of scenarios) await t.test(scenario.name, async subtest => {
    const root = temporary(subtest), selected = selectionFile(root), calls = [];
    const prior = await invoke(getArgs(root, selected), { fetch: fixtureFetch() });
    assert.equal(prior.code, 0, prior.error);
    const entries = JSON.parse(fs.readFileSync(join(root, 'credits.json'), 'utf8'));
    entries[0].ref = 'openverse:prior-photo';
    fs.writeFileSync(join(root, 'credits.json'), JSON.stringify(entries));
    const before = snapshot(root);
    const record = { ...ov, url: scenario.url };
    const held = await invoke(getArgs(root, selected, ['--name', 'private-descendant']), { fetch: fixtureFetch(record, calls) });
    assert.equal(held.code, 2, scenario.name);
    assert.match(held.error, /safe public image URL/);
    assert.doesNotMatch(held.output + held.error, /opaque-user|opaque-pass/);
    assert.ok(!calls.includes(record.url), 'refused image URL stops before image access');
    assert.deepEqual(snapshot(root), before, 'prior asset and ledger bytes remain');
    const inspected = await invoke(['--inspect', 'openverse:checked-photo', '--json'], { fetch: fixtureFetch({ ...record, foreign_landing_url: scenario.url, creator_url: scenario.url, license_url: scenario.url }) });
    assert.equal(inspected.code, 0, inspected.error);
    for (const field of ['page', 'image', 'original', 'creatorUrl', 'licenseUrl']) assert.equal(inspected.json()[field], null, field);
    assert.equal(inspected.json().terms.sourceUrl, null);
    assert.equal(inspected.json().terms.licenseUrl, null);
    assert.doesNotMatch(inspected.output + inspected.error, /opaque-user|opaque-pass/);
    const safe = await invoke(['--inspect', 'openverse:checked-photo', '--json'], { fetch: fixtureFetch({ ...ov, url: scenario.safe, foreign_landing_url: scenario.safe, creator_url: scenario.safe, license_url: scenario.safe }) });
    assert.equal(safe.code, 0, safe.error);
    for (const field of ['page', 'image', 'original', 'creatorUrl', 'licenseUrl']) assert.equal(safe.json()[field], scenario.safe, field);
  });
});

test('native Request failures keep uppercase and mixed-case credential URLs out of public diagnostics', async t => {
  for (const scheme of ['HTTPS', 'HtTpS']) for (const mode of ['search', 'acquire']) await t.test(`${scheme} ${mode}`, async subtest => {
    const root = temporary(subtest), selection = selectionFile(root);
    fs.writeFileSync(join(root, 'original.txt'), 'kept original');
    const before = snapshot(root);
    const record = { ...ov, url: `${scheme}://case-user:case-password@example.org/photo.png?access_token=case-token&width=1600#photo` };
    const baseFetch = fixtureFetch(record);
    const request = async (url, options) => url === record.url ? new Request(url) : baseFetch(url, options);
    const result = await invoke(mode === 'search' ? ['harbour', '--source', 'openverse', '--json', '--to', root] : getArgs(root, selection), { fetch: request });
    const diagnostic = mode === 'search' ? result.json().sources[0].items[0].probe.why : result.error;
    assert.equal(result.code, mode === 'search' ? 0 : 2);
    if (mode === 'search') assert.equal(result.json().sources[0].items[0].probe.ok, false);
    assert.match(diagnostic, /URL that includes credentials/);
    assert.doesNotMatch(result.output + result.error, /case-user|case-password|case-token/);
    assert.match(diagnostic, /https:\/\/example.org\/photo\.png\?width=1600#photo/);
    assert.deepEqual(snapshot(root), before);
  });
});

test('native Request failures redact complete credential URLs and keep ordinary parts', async t => {
  const scenarios = [
    { name: 'apostrophe inside the token value', url: "https://user:pass@example.org/a?access_token=abc'def", visible: /https:\/\/example\.org\/a(?![\w'-])/, secret: /user|pass|abc|def/ },
    { name: 'apostrophe before the token query', url: "https://user:pass@example.org/a'?access_token=abc", visible: /https:\/\/example\.org\/a'/, secret: /user|pass|abc/ },
    { name: 'ordinary apostrophe param beside a token', url: "https://user:pass@example.org/photo.png?q=l'atelier&access_token=abc&width=1600#photo", visible: /https:\/\/example\.org\/photo\.png\?q=l(%27|')atelier&width=1600#photo/, secret: /user|pass|abc/ },
    { name: 'raw double quote in the path', url: 'https://user:pass@example.org/a"?access_token=head-tail&width=1600#photo', visible: /https:\/\/example\.org\/a%22\?width=1600#photo/, secret: /user|pass|head-tail/ },
    { name: 'raw opening angle bracket in the path', url: 'https://user:pass@example.org/a<?access_token=head-tail&width=1600#photo', visible: /https:\/\/example\.org\/a%3C\?width=1600#photo/, secret: /user|pass|head-tail/ },
    { name: 'raw closing angle bracket in the path', url: 'https://user:pass@example.org/a>?access_token=head-tail&width=1600#photo', visible: /https:\/\/example\.org\/a%3E\?width=1600#photo/, secret: /user|pass|head-tail/ },
    { name: 'raw space inside the token', url: 'https://user:pass@example.org/a?access_token=token-head token-tail&width=1600#photo', visible: /https:\/\/example\.org\/a\?width=1600#photo/, secret: /user|pass|token-head|token-tail/ },
  ];
  for (const scenario of scenarios) await t.test(scenario.name, async subtest => {
    const record = { ...ov, url: scenario.url };
    const baseFetch = fixtureFetch(record);
    const request = async (url, options) => url === record.url ? new Request(url) : baseFetch(url, options);
    for (const mode of ['search', 'acquire']) {
      const root = temporary(subtest), selection = selectionFile(root);
      fs.writeFileSync(join(root, 'original.txt'), 'kept original');
      const before = snapshot(root);
      const result = await invoke(mode === 'search' ? ['harbour', '--source', 'openverse', '--json', '--to', root] : getArgs(root, selection), { fetch: request });
      const diagnostic = mode === 'search' ? result.json().sources[0].items[0].probe.why : result.error;
      assert.equal(result.code, mode === 'search' ? 0 : 2, `${scenario.name} ${mode}`);
      if (mode === 'search') assert.equal(result.json().sources[0].items[0].probe.ok, false, scenario.name);
      assert.match(diagnostic, /URL that includes credentials/, scenario.name);
      assert.doesNotMatch(result.output + result.error, scenario.secret, scenario.name);
      assert.match(diagnostic, scenario.visible, scenario.name);
      assert.deepEqual(snapshot(root), before, scenario.name);
    }
  });
});

test('raw WHATWG request echoes and overlapping private children keep credentials out of complete diagnostics', async t => {
  for (const [name, scheme] of [['tab', 'https:\t//'], ['CR', 'ht\rtps://'], ['LF', 'https:\n//']]) {
    for (const failure of ['request', 'body']) await t.test(name + ' ' + failure, async subtest => {
      const root = temporary(subtest), selection = selectionFile(root), imageCalls = [];
      fs.writeFileSync(join(root, 'original.png'), png);
      fs.writeFileSync(join(root, 'credits.json'), '[]\n');
      const before = snapshot(root);
      const record = { ...ov, url: scheme + 'normalized-user:normalized-pass@example.org/a"?access_token=normalized-head normalized-tail&width=1600#photo' };
      const serialized = new URL(record.url).href;
      const diagnostic = 'Image failed at "' + record.url + '" then <' + serialized + '>; retry "' + record.url + '" after checking its source.';
      const safe = 'https://example.org/a%22?width=1600#photo';
      const expected = 'Image failed at "' + safe + '" then <' + safe + '>; retry "' + safe + '" after checking its source.';
      const baseFetch = fixtureFetch(record);
      const request = async (url, options) => {
        if (url !== record.url) return baseFetch(url, options);
        imageCalls.push({ url, options });
        if (failure === 'request') throw new Error(diagnostic);
        return new Response(new ReadableStream({ start(controller) { controller.error(new Error(diagnostic)); } }), { headers: { 'content-type': 'image/png' } });
      };
      for (const mode of ['search', 'acquire']) {
        const args = mode === 'search' ? ['harbour', '--source', 'openverse', '--json', '--min-width', '0', '--to', root] : getArgs(root, selection);
        const result = await invoke(args, { fetch: request });
        assert.equal(result.code, mode === 'search' ? 0 : 2);
        if (mode === 'search') {
          assert.equal(result.json().sources[0].items[0].probe.ok, false);
          assert.equal(result.json().sources[0].items[0].probe.why, expected);
        } else assert.equal(result.error, 'assets: ' + expected + '\n');
        assert.doesNotMatch(result.output + result.error, /normalized-user|normalized-pass|normalized-head|normalized-tail/);
        assert.deepEqual(snapshot(root), before);
      }
      assert.deepEqual(imageCalls.map(call => call.url), [record.url, record.url], 'transport receives the original raw string in both modes');
      assert.equal(imageCalls[0].options.headers.Range, 'bytes=0-131071');
      assert.equal(imageCalls[1].options.headers.Range, undefined);
      assert.ok(imageCalls.every(call => call.options.signal instanceof AbortSignal));
    });
  }
  await t.test('adjacent raw recorded schemes keep wrapper quotes and context', async subtest => {
    const root = temporary(subtest), before = snapshot(root);
    const first = 'https:\t//raw-first:raw-first-pass@a.org/a?token=first-secret&width=1600';
    const second = 'ht\rtps://raw-second:raw-second-pass@b.org/b';
    const urls = [first, second], records = urls.map((url, index) => ({ ...ov, id: 'raw-adjacent-' + index, url }));
    const request = async url => {
      const host = new URL(url).hostname;
      if (host === 'api.openverse.org') return Response.json({ result_count: records.length, results: records });
      if (host === 'api.artic.edu') return Response.json({ error: { info: "Rejected '" + first + "'," + second + ";'" + second + "'," + first + ' after checking source' } });
      return new Response(png, { headers: { 'content-type': 'image/png' } });
    };
    const result = await invoke(['harbour', '--source', 'openverse,aic', '--json', '--min-width', '0', '--to', root], { fetch: request });
    assert.equal(result.code, 1);
    assert.equal(result.json().sources.at(-1).error, "Rejected 'https://a.org/a?width=1600',https://b.org/b;'https://b.org/b',https://a.org/a?width=1600 after checking source");
    assert.doesNotMatch(result.output + result.error, /raw-first|raw-second|first-secret/);
    assert.deepEqual(snapshot(root), before);
  });
  for (const order of ['child first', 'parent first']) await t.test(order + ' opaque diagnostic', async subtest => {
    const root = temporary(subtest), calls = [];
    fs.writeFileSync(join(root, 'original.png'), png);
    fs.writeFileSync(join(root, 'credits.json'), 'prior ledger bytes\n');
    const before = snapshot(root);
    const child = 'https:\t//overlap-user:overlap pass@b.org/a"?token=overlap-secret';
    const parent = 'https://parent-user:parent-pass@example.org/a?note=prefix ' + child + ' suffix&width=1600#photo';
    const urls = order === 'child first' ? [child, parent] : [parent, child];
    const records = urls.map((url, index) => ({ ...ov, id: 'opaque-diagnostic-' + index, url }));
    const diagnostic = 'Rejected "' + parent + '" then <' + child + '>; retry "' + parent + '" after checking source.';
    const request = async url => {
      calls.push(String(url));
      const host = new URL(url).hostname;
      if (host === 'api.openverse.org') return Response.json({ result_count: records.length, results: records });
      if (host === 'api.artic.edu') return Response.json({ error: { info: diagnostic } });
      return new Response(png, { headers: { 'content-type': 'image/png' } });
    };
    const result = await invoke(['harbour', '--source', 'openverse,aic', '--json', '--to', root], { fetch: request });
    assert.equal(result.code, 1);
    assert.deepEqual(result.json().sources[0].items, [], 'probe dimensions exclude these tiny records from metadata output');
    assert.equal(result.json().sources.at(-1).error, 'Rejected "(invalid URL)" then <https://b.org/a%22>; retry "(invalid URL)" after checking source.');
    assert.doesNotMatch(result.output + result.error, /overlap-user|overlap pass|overlap-secret|parent-user|parent-pass/);
    assert.deepEqual(calls.filter(url => urls.includes(url)), urls);
    assert.deepEqual(snapshot(root), before);
  });
});

test('request and body failures redact repeated raw and serialized URLs without losing diagnostic context', async t => {
  const record = { ...ov, url: 'https://diag-user:diag-pass@example.org/a"?access_token=token-head token-tail&width=1600#photo' };
  const serialized = new URL(record.url).href;
  const diagnostic = `Image failed at "${record.url}" then <${serialized}>; retry "${record.url}" after checking its source.`;
  for (const failure of ['request', 'body']) await t.test(failure, async subtest => {
    const root = temporary(subtest), selection = selectionFile(root), before = snapshot(root);
    const baseFetch = fixtureFetch(record);
    const request = async (url, options) => {
      if (url !== record.url) return baseFetch(url, options);
      if (failure === 'request') throw new Error(diagnostic);
      return new Response(new ReadableStream({ start(controller) { controller.error(new Error(diagnostic)); } }), { headers: { 'content-type': 'image/png' } });
    };
    for (const args of [['harbour', '--source', 'openverse', '--json', '--to', root], getArgs(root, selection)]) {
      const result = await invoke(args, { fetch: request });
      const message = args[0] === 'harbour' ? result.json().sources[0].items[0].probe.why : result.error;
      assert.match(message, /Image failed at "https:\/\/example.org\/a%22\?width=1600#photo" then <https:\/\/example.org\/a%22\?width=1600#photo>;/);
      assert.match(message, /retry "https:\/\/example.org\/a%22\?width=1600#photo" after checking its source/);
      assert.doesNotMatch(result.output + result.error, /diag-user|diag-pass|token-head|token-tail/);
      assert.deepEqual(snapshot(root), before);
    }
  });
});

test('provider errors preserve quoted public URLs and redact longer URLs after related image requests', async t => {
  const scenarios = [
    { name: 'single-quoted upstream URL', earlierRequest: false, quoted: true },
    { name: 'longer URL after a related request', earlierRequest: true, quoted: true },
    { name: 'ordinary apostrophe inside a quoted longer URL', earlierRequest: true, quoted: true, apostrophe: true },
    { name: 'ordinary apostrophe inside an unquoted longer URL', earlierRequest: true, quoted: false, apostrophe: true },
  ];
  for (const { name, earlierRequest, quoted, apostrophe } of scenarios) await t.test(name, async subtest => {
    const root = temporary(subtest), before = snapshot(root);
    const record = { ...ov, url: 'https://example.org/a?token=prefix-secret' };
    const baseFetch = fixtureFetch(record);
    const errorUrl = earlierRequest ? `${record.url}${apostrophe ? "&q=l'atelier" : ''}&auth=other-secret&width=1600` : 'https://user:password@example.org/a?access_token=token-secret&width=1600';
    const quote = quoted ? "'" : '';
    const request = async (url, options) => new URL(url).hostname === 'api.artic.edu'
      ? Response.json({ error: { info: `Upstream rejected ${quote}${errorUrl}${quote} while checking source` } })
      : baseFetch(url, options);
    const result = await invoke(['harbour', '--source', earlierRequest ? 'openverse,aic' : 'aic', '--json', '--min-width', '0', '--to', root], { fetch: request });
    assert.equal(result.code, 1);
    const expectedUrl = apostrophe ? 'https://example.org/a?q=l%27atelier&width=1600' : 'https://example.org/a?width=1600';
    assert.equal(result.json().sources.at(-1).error, `Upstream rejected ${quote}${expectedUrl}${quote} while checking source`);
    assert.doesNotMatch(result.output + result.error, /user|password|prefix-secret|other-secret|token-secret/);
    assert.deepEqual(snapshot(root), before);
  });
});

test('provider diagnostics keep adjacent URL spans and external quotes separate from request URLs', async t => {
  const first = 'https://example.org/a?token=prefix-secret&width=1600';
  const second = 'https://other-user:other-pass@b.org/b';
  const safeFirst = 'https://example.org/a?width=1600';
  const scenarios = [
    { name: 'two recorded URLs separated by a comma', urls: [first, second], message: `Rejected ${first},${second}`, expected: `Rejected ${safeFirst},https://b.org/b` },
    { name: 'recorded URLs in reverse order', urls: [first, second], message: `Rejected ${second},${first}`, expected: `Rejected https://b.org/b,${safeFirst}` },
    { name: 'repeated adjacent recorded URLs', urls: [first, second], message: `Rejected ${first},${second};${first},${second}`, expected: `Rejected ${safeFirst},https://b.org/b;${safeFirst},https://b.org/b` },
    { name: 'an adjacent unrecorded credential URL', urls: [first], message: `Rejected ${first},${second}`, expected: `Rejected ${safeFirst},https://b.org/b` },
    { name: 'a closing quote and comma before context', urls: [first], message: `Rejected '${first}', retry`, expected: `Rejected '${safeFirst}', retry` },
    { name: 'a longer quoted URL with a private suffix and public fragment', urls: [first], message: `Rejected '${first}&auth=other-secret#photo', retry`, expected: `Rejected '${safeFirst}#photo', retry` },
    { name: 'an internal apostrophe before auth and a closing wrapper', urls: [first], message: `Rejected '${first}&q=l'atelier&auth=other-secret#photo'), retry`, expected: `Rejected '${safeFirst}&q=l%27atelier#photo'), retry` },
    { name: 'an internal apostrophe in an unquoted longer URL', urls: [first], message: `Rejected ${first}&q=l'atelier&auth=other-secret#photo while checking source`, expected: `Rejected ${safeFirst}&q=l%27atelier#photo while checking source` },
    { name: 'a closing quote before another URL', urls: [first, second], message: `Rejected '${first}',${second}`, expected: `Rejected '${safeFirst}',https://b.org/b` },
    { name: 'a recorded URL ending in an apostrophe', urls: [`${first}'`], message: `Rejected '${first}'', retry`, expected: `Rejected '${safeFirst}%27', retry` },
    { name: 'a recorded URL ending in a comma', urls: [`${first},`], message: `Rejected '${first},', retry`, expected: `Rejected '${safeFirst}%2C', retry` },
  ];
  for (const scenario of scenarios) await t.test(scenario.name, async subtest => {
    const root = temporary(subtest), calls = [];
    fs.writeFileSync(join(root, 'original.png'), png);
    fs.writeFileSync(join(root, 'credits.json'), 'prior credit ledger bytes\n');
    const before = snapshot(root);
    const records = scenario.urls.map((url, index) => ({ ...ov, id: `diagnostic-${index}`, url }));
    const request = async url => {
      calls.push(String(url));
      const host = new URL(url).hostname;
      if (host === 'api.openverse.org') return Response.json({ result_count: records.length, results: records });
      if (host === 'api.artic.edu') return Response.json({ error: { info: scenario.message } });
      return new Response(png, { headers: { 'content-type': 'image/png' } });
    };
    const result = await invoke(['harbour', '--source', 'openverse,aic', '--json', '--min-width', '0', '--to', root], { fetch: request });
    assert.equal(result.code, 1);
    assert.equal(result.json().sources.at(-1).error, scenario.expected);
    assert.doesNotMatch(result.output + result.error, /prefix-secret|other-user|other-pass|other-secret/);
    assert.deepEqual(calls.filter(url => scenario.urls.includes(url)), scenario.urls);
    assert.deepEqual(snapshot(root), before);
  });
});
test('checked search resolves Met dimensions before orientation, width and result-limit filtering', async t => {
  const root = temporary(t), before = snapshot(root), calls = [];
  const second = { ...met, objectID: 436536, primaryImage: 'https://example.org/met-second.jpg' };
  const landscapeHeader = Buffer.from(png.subarray(0, 26));
  landscapeHeader.writeUInt32BE(1600, 16); landscapeHeader.writeUInt32BE(900, 20);
  const baseFetch = fixtureFetch(ov, calls);
  const request = async (url, options) => {
    if (url.includes('collection/v1.1/search')) return Response.json({ total: 2, objectIDs: [met.objectID, second.objectID] });
    if (url.endsWith(`/objects/${second.objectID}`)) return Response.json(second);
    if (url === met.primaryImage || url === second.primaryImage) return new Response(url === met.primaryImage ? png.subarray(0, 26) : landscapeHeader, { status: 206, headers: { 'content-type': 'image/png' } });
    return baseFetch(url, options);
  };
  const result = await invoke(['harbour', '--source', 'met', '--orientation', 'landscape', '--limit', '1', '--json', '--to', root], { fetch: request });
  assert.equal(result.code, 0, result.error);
  assert.deepEqual(result.json().sources[0].items.map(item => item.ref), ['met:436536']);
  assert.equal(result.json().sources[0].items[0].imageWidth, 1600);
  assert.equal(result.json().sources[0].items[0].imageHeight, 900);
  const undersized = await invoke(['harbour', '--source', 'met', '--min-width', '2', '--json', '--to', root]);
  assert.equal(undersized.code, 0, undersized.error);
  assert.deepEqual(undersized.json().sources[0].items, []);
  const metadataOnly = await invoke(['harbour', '--source', 'met', '--orientation', 'landscape', '--no-check', '--json', '--to', root]);
  assert.equal(metadataOnly.code, 0, metadataOnly.error);
  assert.equal(metadataOnly.json().sources[0].items[0].imageWidth, null);
  assert.equal(metadataOnly.json().sources[0].items[0].imageHeight, null);
  assert.equal(metadataOnly.json().sources[0].items[0].orientation, null);
  assert.deepEqual(snapshot(root), before);
});

test('missing Openverse licence versions remain unknown and cannot authorize an acquisition', async t => {
  const root = temporary(t), selection = selectionFile(root), before = snapshot(root), calls = [];
  const missing = { ...ov, license_version: null, license_url: null };
  const inspected = await invoke(['--inspect', 'openverse:checked-photo', '--json'], { fetch: fixtureFetch(missing) });
  assert.equal(inspected.code, 0, inspected.error);
  assert.equal(inspected.json().licenseUrl, null);
  assert.equal(inspected.json().terms.licenseUrl, null);
  const denied = await invoke(getArgs(root, selection), { fetch: fixtureFetch(missing, calls) });
  assert.notEqual(denied.code, 0);
  assert.match(denied.error, /unknown rights|missing.*terms/);
  assert.ok(!calls.includes(missing.url));
  assert.deepEqual(snapshot(root), before);
  for (const record of [{ ...ov, license_version: '3.0', license_url: null }, { ...ov, license_version: null }]) {
    const known = await invoke(['--inspect', 'openverse:checked-photo', '--json'], { fetch: fixtureFetch(record) });
    assert.equal(known.code, 0, known.error);
    assert.equal(known.json().licenseUrl, record.license_url || 'https://creativecommons.org/licenses/by/3.0/');
  }
});

test('checked credit compares the entire creator and title and saves their full attribution', async t => {
  for (const field of ['creator', 'title']) {
    const root = temporary(t);
    const record = { ...ov, [field]: 'A detailed attribution '.repeat(6) + 'first contributor' };
    const inspected = await invoke(['--inspect', 'openverse:checked-photo', '--json'], { fetch: fixtureFetch(record) });
    assert.equal(inspected.code, 0, inspected.error);
    const selection = selectionFile(root, checkedSelection({ terms: { ...inspected.json().terms, checkedAt: '2026-10-14T00:00:00Z' } }));
    const before = snapshot(root), calls = [];
    const changed = await invoke(getArgs(root, selection), { fetch: fixtureFetch({ ...record, [field]: 'A detailed attribution '.repeat(6) + 'second contributor' }, calls) });
    assert.notEqual(changed.code, 0, `${field} changed beyond the display cutoff`);
    assert.match(changed.error, /terms changed/i);
    assert.ok(!calls.includes(record.url));
    assert.deepEqual(snapshot(root), before);
    const expectedCredit = `"${record.title}" by ${record.creator}, CC BY 4.0, via Flickr`;
    assert.equal(inspected.json().terms.requiredCredit, expectedCredit);
    const acquired = await invoke(getArgs(root, selection), { fetch: fixtureFetch(record) });
    assert.equal(acquired.code, 0, acquired.error);
    assert.equal(acquired.json().credit.credit, expectedCredit);
    const credits = await invoke(['--credits', '--to', root]);
    assert.match(credits.output, /first contributor/);
  }
});

test('bounded searches normalize the four providers without writing to the supplied directory', async t => {
  const root = temporary(t);
  fs.writeFileSync(join(root, 'original.txt'), 'owned original');
  const before = snapshot(root), calls = [];
  const result = await invoke(['harbour', '--source', 'openverse,commons,aic,met', '--json', '--no-check', '--min-width', '0', '--to', root], { fetch: fixtureFetch(ov, calls) });
  assert.equal(result.code, 0, result.error);
  const found = result.json().sources.flatMap(source => source.items);
  assert.deepEqual(found.map(item => item.ref), ['openverse:checked-photo', 'commons:42', 'aic:27992', 'met:436535']);
  assert.equal(found[0].creator, 'A Photographer');
  assert.equal(found[1].creator, 'A & B');
  assert.match(found[1].notes.join(' '), /trademarked/);
  assert.equal(found[2].licenseCode, 'cc0');
  assert.equal(found[3].licenseUrl, 'https://creativecommons.org/publicdomain/zero/1.0/');
  assert.ok(calls.every(url => !url.startsWith('https://example.org/')), 'search requests only metadata with --no-check');
  assert.deepEqual(snapshot(root), before);
});

test('inspection refreshes selected metadata and checked-term inputs without downloading or writing', async t => {
  const root = temporary(t), before = snapshot(root), calls = [];
  for (const ref of ['openverse:checked-photo', 'commons:42', 'aic:27992', 'met:436535']) {
    const result = await invoke(['--inspect', ref, '--json', '--to', root], { fetch: fixtureFetch(ov, calls) });
    assert.equal(result.code, 0, result.error);
    const item = result.json();
    assert.equal(item.ref, ref);
    assert.equal(item.terms.sourceUrl, item.page);
    assert.equal(item.terms.licenseUrl, item.licenseUrl);
    assert.equal(item.terms.requiredCredit, item.creditRequired ? item.credit : '');
  }
  assert.ok(calls.every(url => !url.startsWith('https://example.org/')), 'inspection defaults to metadata only');
  assert.deepEqual(snapshot(root), before);
  const invalid = await invoke(['--inspect', 'archive:1', '--json']);
  assert.notEqual(invalid.code, 0);
  assert.match(invalid.error, /ref/);
});

test('one checked acquisition pairs a relative image file with complete credit and use metadata', async t => {
  const root = temporary(t), selection = selectionFile(root);
  const result = await invoke(getArgs(root, selection));
  assert.equal(result.code, 0, result.error);
  assert.deepEqual(fs.readFileSync(join(root, 'harbour-boats.png')), png);
  const [entry] = JSON.parse(fs.readFileSync(join(root, 'credits.json'), 'utf8'));
  assert.equal(entry.file, 'harbour-boats.png');
  assert.equal(entry.ref, 'openverse:checked-photo');
  assert.equal(entry.licenseCode, 'by');
  assert.equal(entry.licenseUrl, checkedSelection().terms.licenseUrl);
  assert.equal(entry.creditRequired, true);
  assert.equal(entry.credit, checkedSelection().terms.requiredCredit);
  assert.equal(entry.intendedUse, checkedSelection().intendedUse);
  assert.equal(entry.subjectRelationship, checkedSelection().subjectRelationship);
  assert.deepEqual(entry.terms, checkedSelection().terms);
  assert.deepEqual(entry.edits, ['No edits']);
  assert.equal(entry.bytes, png.length);
  assert.equal(entry.width, 1);
  assert.match(entry.saved, /^\d{4}-\d\d-\d\dT/);
  assert.equal(result.json().directory, fs.realpathSync(root));
  assert.deepEqual(fs.readdirSync(root).sort(), ['credits.json', 'harbour-boats.png', 'selection.json']);
});

test('unchecked, changed or unknown terms and a relative destination fail before any asset write', async t => {
  const cases = [
    { name: 'missing use', selection: checkedSelection({ intendedUse: '' }), diagnostic: /intendedUse/ },
    { name: 'missing subject relationship', selection: checkedSelection({ subjectRelationship: '' }), diagnostic: /subjectRelationship/ },
    { name: 'wrong selected ref', selection: checkedSelection({ ref: 'openverse:another' }), diagnostic: /ref/ },
    { name: 'missing checked terms', selection: checkedSelection({ terms: undefined }), diagnostic: /terms/ },
    { name: 'changed credit', selection: checkedSelection(), record: { ...ov, creator: 'Different Author' }, diagnostic: /changed/ },
    { name: 'changed licence', selection: checkedSelection(), record: { ...ov, license: 'by-sa', license_url: 'https://creativecommons.org/licenses/by-sa/4.0/' }, diagnostic: /changed/ },
    { name: 'unknown rights', selection: checkedSelection(), record: { ...ov, license: null, license_url: null }, diagnostic: /rights/ },
    { name: 'relative destination', selection: checkedSelection(), relative: true, diagnostic: /absolute/ },
  ];
  for (const scenario of cases) {
    const root = temporary(t), selection = selectionFile(root, scenario.selection), calls = [];
    const before = snapshot(root);
    const result = await invoke(getArgs(scenario.relative ? '.' : root, selection), { fetch: fixtureFetch(scenario.record ?? ov, calls) });
    assert.notEqual(result.code, 0, scenario.name);
    assert.match(result.error, scenario.diagnostic, scenario.name);
    assert.deepEqual(snapshot(root), before, scenario.name);
    assert.ok(!calls.includes(ov.url), 'no image download before checks');
  }
});

test('a malformed or non-array ledger is preserved and stops acquisition before download', async t => {
  for (const ledger of ['{}', '{broken', '[{"file":"../original.png","ref":"openverse:checked-photo"}]']) {
    const root = temporary(t), selection = selectionFile(root), calls = [];
    fs.writeFileSync(join(root, 'credits.json'), ledger);
    fs.writeFileSync(join(root, 'original.txt'), 'project original');
    const before = snapshot(root);
    const result = await invoke(getArgs(root, selection), { fetch: fixtureFetch(ov, calls) });
    assert.notEqual(result.code, 0);
    assert.match(result.error, /credits/);
    assert.deepEqual(snapshot(root), before);
    assert.equal(calls.length, 0, 'ledger validation precedes network reads');
  }
});

test('wrong image MIME or payload and provider failures preserve prior bytes', async t => {
  for (const failure of ['wrong MIME', 'false image MIME', 'empty image', 'provider failure']) {
    const root = temporary(t), selection = selectionFile(root);
    fs.writeFileSync(join(root, 'original.txt'), 'unchanged');
    fs.writeFileSync(join(root, 'credits.json'), '[]\n');
    const before = snapshot(root), baseFetch = fixtureFetch();
    const request = async (url, options) => {
      if (failure === 'provider failure') return new Response('unavailable', { status: 503 });
      if (url === ov.url) return new Response(failure === 'empty image' ? '' : 'this is not a photograph'.repeat(5), { headers: { 'content-type': failure === 'wrong MIME' ? 'text/html' : 'image/png' } });
      return baseFetch(url, options);
    };
    const result = await invoke(getArgs(root, selection), { fetch: request });
    assert.notEqual(result.code, 0, failure);
    assert.match(result.error, /image|HTTP 503/i);
    assert.deepEqual(snapshot(root), before, failure);
  }
});

test('acquisition rejects truncated supported images before publishing any bytes', async t => {
  const cases = [
    ['png', png.subarray(0, 26)], ['jpeg', jpeg.subarray(0, jpeg.length - 4)],
    ['gif', gif.subarray(0, gif.length - 10)], ['webp', webp.subarray(0, 32)], ['avif', avif.subarray(0, 32)],
    ['gif', animatedGif.subarray(0, 72)], ['gif', Buffer.concat([animatedGif.subarray(0, 72), Buffer.from([0x3b])])],
    ['webp', animatedWebp.subarray(0, animatedWebp.length - 1)],
  ];
  for (const [format, buffer] of cases) await t.test(`${format} truncated at ${buffer.length} bytes`, async subtest => {
    const root = temporary(subtest), selection = selectionFile(root), baseFetch = fixtureFetch();
    fs.writeFileSync(join(root, 'original.txt'), 'kept original');
    fs.writeFileSync(join(root, 'credits.json'), '[]\n');
    const before = snapshot(root);
    const result = await invoke(getArgs(root, selection), { fetch: async (url, options) => url === ov.url ? new Response(buffer, { headers: { 'content-type': `image/${format}` } }) : baseFetch(url, options) });
    assert.notEqual(result.code, 0, 'a valid header does not establish a complete image');
    assert.match(result.error, /image|decode|truncat|corrupt/i);
    assert.deepEqual(snapshot(root), before);
  });
});

test('complete still and animated supported images save original bytes and canvas dimensions', async t => {
  for (const [format, buffer, size] of [['png', png, 1], ['jpeg', jpeg, 1], ['jpeg', metadataJpeg, 1], ['gif', gif, 1], ['webp', webp, 1], ['avif', avif, 1], ['gif', animatedGif, 2], ['webp', animatedWebp, 2]]) {
    const root = temporary(t), selection = selectionFile(root), baseFetch = fixtureFetch();
    const result = await invoke(getArgs(root, selection), { fetch: async (url, options) => url === ov.url ? new Response(buffer, { headers: { 'content-type': `image/${format}` } }) : baseFetch(url, options) });
    assert.equal(result.code, 0, result.error);
    const entry = result.json().credit;
    assert.equal(entry.width, size);
    assert.equal(entry.height, size);
    assert.equal(entry.bytes, buffer.length);
    assert.deepEqual(fs.readFileSync(join(root, entry.file)), buffer);
  }
});

test('an unconfigured helper permits metadata reads but holds acquisition without changing prior bytes', async t => {
  const root = temporary(t), script = join(root, 'assets.mjs');
  fs.copyFileSync(new URL('../scripts/assets.mjs', import.meta.url), script);
  const isolated = await import(pathToFileURL(script).href);
  const selection = selectionFile(root), before = snapshot(root);
  let output = '', error = '';
  const options = { fetch: fixtureFetch(), stdout: value => { output += value; }, stderr: value => { error += value; } };
  assert.equal(await isolated.run(['--inspect', 'openverse:checked-photo', '--json'], options), 0, error);
  output = ''; error = '';
  assert.notEqual(await isolated.run(getArgs(root, selection), options), 0);
  assert.match(error, /decoder.*setup|setup.*decoder/i);
  assert.deepEqual(snapshot(root), before);
});

test('matching repeats are write-free no-ops while conflicting selections, names and bytes stay untouched', async t => {
  const root = temporary(t), selection = selectionFile(root);
  assert.equal((await invoke(getArgs(root, selection))).code, 0);
  let before = snapshot(root), calls = [];
  const repeated = await invoke(getArgs(root, selection), { fetch: fixtureFetch(ov, calls) });
  assert.equal(repeated.code, 0, repeated.error);
  assert.equal(repeated.json().status, 'unchanged');
  assert.deepEqual(snapshot(root), before);
  assert.ok(!calls.includes(ov.url), 'no second image download');
  const selected = checkedSelection();
  selected.terms = Object.fromEntries(Object.entries(selected.terms).reverse());
  fs.writeFileSync(selection, JSON.stringify(selected));
  before = snapshot(root);
  const reordered = await invoke(getArgs(root, selection));
  assert.equal(reordered.code, 0, reordered.error);
  assert.equal(reordered.json().status, 'unchanged');
  assert.deepEqual(snapshot(root), before);
  const renamed = await invoke(getArgs(root, selection, ['--name', 'different']));
  assert.notEqual(renamed.code, 0);
  assert.deepEqual(snapshot(root), before);
  fs.writeFileSync(selection, JSON.stringify(checkedSelection({ intendedUse: 'Different use' })));
  before = snapshot(root);
  const changed = await invoke(getArgs(root, selection));
  assert.notEqual(changed.code, 0);
  assert.match(changed.error, /conflict/i);
  assert.deepEqual(snapshot(root), before);
  fs.writeFileSync(selection, JSON.stringify(checkedSelection()));
  fs.writeFileSync(join(root, 'harbour-boats.png'), Buffer.alloc(png.length));
  before = snapshot(root);
  const damaged = await invoke(getArgs(root, selection));
  assert.notEqual(damaged.code, 0);
  assert.match(damaged.error, /metadata|bytes|conflict/i);
  assert.deepEqual(snapshot(root), before);

  const collisionRoot = temporary(t), collisionSelection = selectionFile(collisionRoot);
  fs.writeFileSync(join(collisionRoot, 'harbour-boats.png'), 'original artwork');
  before = snapshot(collisionRoot);
  const collision = await invoke(getArgs(collisionRoot, collisionSelection));
  assert.notEqual(collision.code, 0);
  assert.match(collision.error, /conflict/i);
  assert.deepEqual(snapshot(collisionRoot), before);
});

test('a matching ledger cannot make a previously truncated image a successful repeat', async t => {
  const root = temporary(t), selection = selectionFile(root);
  const acquired = await invoke(getArgs(root, selection));
  assert.equal(acquired.code, 0, acquired.error);
  const ledgerPath = join(root, 'credits.json'), entries = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const truncated = png.subarray(0, 26);
  fs.writeFileSync(join(root, entries[0].file), truncated);
  entries[0].bytes = truncated.length;
  entries[0].sha256 = createHash('sha256').update(truncated).digest('hex');
  fs.writeFileSync(ledgerPath, JSON.stringify(entries));
  const before = snapshot(root), calls = [];
  const repeated = await invoke(getArgs(root, selection), { fetch: fixtureFetch(ov, calls) });
  assert.notEqual(repeated.code, 0);
  assert.match(repeated.error, /image.*recovery|recovery.*image/i);
  assert.ok(!calls.includes(ov.url), 'the invalid prior image is held without another download');
  assert.deepEqual(snapshot(root), before);
});

test('failed image, ledger and commit writes preserve prior bytes and clean only new files', async t => {
  for (const failure of ['image write', 'ledger write', 'image publish', 'ledger commit']) {
    const root = temporary(t), selection = selectionFile(root);
    fs.writeFileSync(join(root, 'credits.json'), '[]\n');
    fs.writeFileSync(join(root, 'original.txt'), 'kept original');
    const before = snapshot(root);
    const failingFs = { ...fs,
      writeFileSync(path, data, options) {
        if ((failure === 'image write' && Buffer.isBuffer(data)) || (failure === 'ledger write' && typeof data === 'string' && data.startsWith('[\n'))) {
          fs.writeFileSync(path, data.slice(0, 12), options);
          throw new Error(`injected ${failure}`);
        }
        return fs.writeFileSync(path, data, options);
      },
      linkSync(from, to) { if (failure === 'image publish') throw new Error('injected image publish'); return fs.linkSync(from, to); },
      renameSync(from, to) { if (failure === 'ledger commit') throw new Error('injected ledger commit'); return fs.renameSync(from, to); },
    };
    const result = await invoke(getArgs(root, selection), { fs: failingFs });
    assert.notEqual(result.code, 0, failure);
    assert.match(result.error, /injected/);
    assert.deepEqual(snapshot(root), before, failure);
  }
});

test('two acquisitions serialize ledger ownership and the busy invocation writes nothing', async t => {
  const root = temporary(t), selection = selectionFile(root);
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const starting = new Promise(resolve => { entered = resolve; });
  const baseFetch = fixtureFetch();
  const first = invoke(getArgs(root, selection), { fetch: async (...args) => { entered(); await gate; return baseFetch(...args); } });
  await starting;
  const lockPath = join(root, '.taste-assets.lock');
  assert.ok(fs.existsSync(lockPath), 'lock exists before provider metadata or ledger commit');
  const owner = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  assert.equal(owner.pid, process.pid);
  assert.equal(owner.directory, fs.realpathSync(root));
  assert.ok(owner.id && owner.started && owner.host);
  const before = snapshot(root), calls = [];
  const second = await invoke(getArgs(root, selection), { fetch: fixtureFetch(ov, calls) });
  assert.notEqual(second.code, 0);
  assert.match(second.error, /busy.*owner.*recover/i);
  assert.deepEqual(snapshot(root), before);
  assert.equal(calls.length, 0);
  release();
  const completed = await first;
  assert.equal(completed.code, 0, completed.error);
  assert.equal(JSON.parse(fs.readFileSync(join(root, 'credits.json'), 'utf8')).length, 1);
  assert.ok(!fs.existsSync(lockPath));
});

test('an old or interrupted lock remains an owner recovery hold with no automatic takeover', async t => {
  const root = temporary(t), selection = selectionFile(root), calls = [];
  fs.writeFileSync(join(root, '.taste-assets.lock'), JSON.stringify({ id: 'interrupted-writer', pid: 999999, started: '2000-01-01T00:00:00Z', files: ['.taste-assets-old.image.tmp'] }));
  fs.writeFileSync(join(root, '.taste-assets-old.image.tmp'), 'partial bytes');
  const before = snapshot(root);
  const result = await invoke(getArgs(root, selection), { fetch: fixtureFetch(ov, calls) });
  assert.notEqual(result.code, 0);
  assert.match(result.error, /busy.*owner.*recover/i);
  assert.deepEqual(snapshot(root), before);
  assert.equal(calls.length, 0);
});

test('search probes only bounded image headers and reports unusable images without any writes', async t => {
  const root = temporary(t), before = snapshot(root), baseFetch = fixtureFetch();
  let probeOptions;
  const result = await invoke(['harbour', '--source', 'openverse', '--json', '--to', root], { fetch: async (url, options) => {
    if (url === ov.url) { probeOptions = options; return new Response('<html>error</html>', { headers: { 'content-type': 'text/html' } }); }
    return baseFetch(url, options);
  } });
  assert.equal(result.code, 0, result.error);
  assert.ok(probeOptions, 'default search checks selected candidates');
  assert.equal(probeOptions.headers.Range, 'bytes=0-131071');
  assert.equal(result.json().sources[0].items[0].probe.ok, false);
  assert.match(result.json().sources[0].items[0].probe.why, /MIME/);
  assert.deepEqual(snapshot(root), before);
});

test('plain-text checked search reports failed probes and their reason', async t => {
  const root = temporary(t), before = snapshot(root), baseFetch = fixtureFetch();
  for (const failure of ['404', 'wrong MIME']) {
    const result = await invoke(['harbour', '--source', 'openverse', '--to', root], { fetch: async (url, options) => {
      if (url === ov.url) return new Response('<html>error</html>', { status: failure === '404' ? 404 : 200, headers: { 'content-type': 'text/html' } });
      return baseFetch(url, options);
    } });
    assert.equal(result.code, 0, result.error);
    assert.match(result.output, /check failed/i);
    assert.match(result.output, failure === '404' ? /HTTP 404/ : /Unsupported image MIME text\/html/);
  }
  const unchecked = await invoke(['harbour', '--source', 'openverse', '--no-check', '--to', root]);
  assert.match(unchecked.output, /check not requested/i);
  assert.deepEqual(snapshot(root), before);
});

test('credits print escaped source and licence links plus truthful use and edit notes without writing', async t => {
  const root = temporary(t);
  const record = { ...ov, title: 'Harbour <script>alert(1)</script> & boats', creator: 'Artist "Name" & Partner' };
  const selected = checkedSelection({ terms: { ...checkedSelection().terms, requiredCredit: '"Harbour & boats" by Artist "Name" & Partner, CC BY 4.0, via Flickr' } });
  const selection = selectionFile(root, selected);
  assert.equal((await invoke(getArgs(root, selection), { fetch: fixtureFetch(record) })).code, 0);
  const before = snapshot(root);
  const result = await invoke(['--credits', '--to', root], { fetch: async () => { throw new Error('Credits must not access a provider'); } });
  assert.equal(result.code, 0, result.error);
  assert.match(result.output, /href="https:\/\/example.org\/photo"/);
  assert.match(result.output, /href="https:\/\/creativecommons.org\/licenses\/by\/4.0\/"/);
  assert.match(result.output, /Artist &quot;Name&quot; &amp; Partner/);
  assert.ok(!result.output.includes('<script>'));
  assert.match(result.output, /Reference photograph, not our project or client/);
  assert.match(result.output, /No edits/);
  assert.deepEqual(snapshot(root), before);
});

test('human-checked extra conditions are retained while changed provider conditions require reinspection', async t => {
  const root = temporary(t), selection = selectionFile(root, checkedSelection({ terms: { ...checkedSelection().terms, conditions: ['Do not imply endorsement, checked on the source page'] } }));
  const acquired = await invoke(getArgs(root, selection));
  assert.equal(acquired.code, 0, acquired.error);
  assert.deepEqual(acquired.json().credit.terms.conditions, ['Do not imply endorsement, checked on the source page']);
  assert.deepEqual(acquired.json().credit.terms.providerConditions, []);
  const commonsInspection = (await invoke(['--inspect', 'commons:42', '--json'])).json();
  assert.deepEqual(commonsInspection.terms.providerConditions, [
    'Restrictions named on the source page (trademarked): personality rights, a trademark or similar. Read it before use.',
    'Share-alike: an altered version (recoloured, combined with other pictures) must be shared under the same licence.',
  ]);
  const otherRoot = temporary(t);
  const otherSelection = selectionFile(otherRoot, checkedSelection({ ref: 'commons:42', terms: { ...commonsInspection.terms, checkedAt: '2026-10-14T00:00:00Z', providerConditions: [], conditions: ['Do not imply endorsement'] } }));
  const before = snapshot(otherRoot);
  const changed = await invoke(['--get', 'commons:42', '--selection', otherSelection, '--to', otherRoot]);
  assert.notEqual(changed.code, 0);
  assert.match(changed.error, /changed|provider conditions/i);
  assert.deepEqual(snapshot(otherRoot), before);
});

test('a replaced lock is never overwritten or removed by the former owner', async t => {
  const root = temporary(t), selection = selectionFile(root);
  const replacement = '{"id":"different-owner","files":[],"directory":"held"}\n';
  const baseFetch = fixtureFetch();
  const result = await invoke(getArgs(root, selection), { fetch: async (...args) => {
    fs.writeFileSync(join(root, '.taste-assets.lock'), replacement);
    return baseFetch(...args);
  } });
  assert.notEqual(result.code, 0);
  assert.match(result.error, /ownership.*recovery/i);
  assert.equal(fs.readFileSync(join(root, '.taste-assets.lock'), 'utf8'), replacement);
  assert.ok(!fs.existsSync(join(root, 'credits.json')));
  assert.ok(!fs.existsSync(join(root, 'harbour-boats.png')));
});

test('a structurally corrupt existing credit stops reads and acquisitions instead of printing or extending it', async t => {
  const root = temporary(t), selection = selectionFile(root);
  assert.equal((await invoke(getArgs(root, selection))).code, 0);
  const ledgerPath = join(root, 'credits.json');
  const list = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  list[0].title = { invalid: 'metadata' };
  fs.writeFileSync(ledgerPath, JSON.stringify(list));
  const before = snapshot(root);
  for (const args of [getArgs(root, selection), ['--credits', '--to', root]]) {
    const result = await invoke(args);
    assert.notEqual(result.code, 0);
    assert.match(result.error, /Invalid credits/);
    assert.deepEqual(snapshot(root), before);
  }
});

test('a dangling ledger link is a conflict, never an absent ledger to replace', async t => {
  const root = temporary(t), selection = selectionFile(root), path = join(root, 'credits.json');
  const target = join(root, 'missing-ledger');
  fs.symlinkSync(target, path, 'file');
  const result = await invoke(getArgs(root, selection));
  assert.notEqual(result.code, 0);
  assert.match(result.error, /Invalid credits/);
  assert.equal(fs.readlinkSync(path), target);
  assert.deepEqual(fs.readdirSync(root).sort(), ['credits.json', 'selection.json']);
});
