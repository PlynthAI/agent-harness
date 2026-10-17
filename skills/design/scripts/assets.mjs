#!/usr/bin/env node
// Selective image-provider and credit port from Leonxlnx/taste-skill at a60a36dc.
// Locally maintained; source units and departures are in THIRD_PARTY_NOTICES.md.
import * as nodeFs from 'node:fs';
import { isAbsolute, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { isDeepStrictEqual } from 'node:util';

const UA = 'harness-design-assets/1.0';
const SOURCES = { openverse: { name: 'Openverse' }, commons: { name: 'Wikimedia Commons' }, aic: { name: 'Art Institute of Chicago' }, met: { name: 'The Metropolitan Museum of Art' } };
const LICENCES = ['cc0', 'pd', 'by', 'by-sa', 'by-nc', 'by-nd', 'by-nc-sa', 'by-nc-nd', 'other'];
const SAFE = ['cc0', 'pd', 'by', 'by-sa'];
const WEB_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
const PROVIDERS = { flickr: 'Flickr', wikimedia: 'Wikimedia Commons', met: 'The Metropolitan Museum of Art', nypl: 'New York Public Library', rawpixel: 'rawpixel', stocksnap: 'StockSnap', clevelandmuseum: 'Cleveland Museum of Art', brooklynmuseum: 'Brooklyn Museum', sciencemuseum: 'Science Museum Group', europeana: 'Europeana', geographorguk: 'Geograph Britain and Ireland', inaturalist: 'iNaturalist', wordpress: 'WordPress Photo Directory' };
const AIC_FIELDS = ['id', 'title', 'artist_title', 'artist_display', 'date_display', 'artwork_type_title', 'medium_display', 'is_public_domain', 'image_id', 'thumbnail'];
const AIC_HEADERS = { 'AIC-User-Agent': UA };
const imageHeaders = () => ({ 'User-Agent': UA, 'AIC-User-Agent': UA, Accept: 'image/*' });
const noQuery = (u) => (u ? String(u).split('?')[0] : u);
const shape = (w, h) => (!w || !h ? null : w / h >= 1.15 ? 'landscape' : w / h <= 0.87 ? 'portrait' : 'square');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function text(v) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}
function slug(s) {
  return String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .split('-').slice(0, 7).join('-').slice(0, 60).replace(/-+$/, '');
}
// The words of a query that carry meaning, and whether a record's own description holds them
// (all of them, or all but one of three or more). Used to keep the museum sources on the subject.
function queryWords(q) { return String(q).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w && !['the', 'a', 'an', 'of', 'in', 'on', 'at', 'and', 'or', 'for', 'with', 'from', 'to', 'by'].includes(w)); }
function onSubject(wanted, description) {
  if (!wanted.length) return true;
  const loose = (s) => String(s).toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/our\b/g, 'or'); // harbour = harbor
  const hay = loose(description);
  const hits = wanted.filter((w) => { const x = loose(w); return hay.includes(x) || (x.length > 4 && hay.includes(x.replace(/(es|s)$/, ''))); }).length;
  return hits >= (wanted.length >= 3 ? wanted.length - 1 : wanted.length);
}
async function mapLimit(items, n, fn) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) { const k = next++; out[k] = await fn(items[k], k); } }));
  return out;
}

function licenceLabel(it) {
  if (it.licenseName) return it.licenseName; // set where the plain code would mislead: museums, informal statements, unusual licences
  if (it.license === 'cc0') return 'CC0';
  if (it.license === 'pd') return 'public domain';
  if (it.license === 'other') return 'licence on the source page';
  return `CC ${it.license.toUpperCase()}${it.licenseVersion ? ' ' + it.licenseVersion : ''}`;
}
function licenceUrl(it) {
  if (it.licenseUrl) return publicUrl(String(it.licenseUrl).replace(/^http:/, 'https:'));
  if (it.license === 'cc0') return 'https://creativecommons.org/publicdomain/zero/1.0/';
  if (it.license === 'pd') return 'https://creativecommons.org/publicdomain/mark/1.0/';
  if (it.license.startsWith('by') && ['1.0', '2.0', '2.5', '3.0', '4.0'].includes(it.licenseVersion)) return `https://creativecommons.org/licenses/${it.license}/${it.licenseVersion}/`;
  return null;
}
const creditRequired = (it) => it.license !== 'cc0' && it.license !== 'pd';
function licenceNotes(it) {
  const n = [];
  if (/-sa$/.test(it.license)) n.push('Share-alike: an altered version (recoloured, combined with other pictures) must be shared under the same licence.');
  if (/-nc/.test(it.license)) n.push('Non-commercial only: not for a business, a shop or a client site.');
  if (/-nd$/.test(it.license)) n.push('No derivatives: show it whole and unaltered, no crops or treatments.');
  if (it.license === 'other') n.push('A licence outside the usual set: read the source page before using it.');
  return n;
}
function credit(it) {
  const by = it.creator && !/^(unknown|anonymous)\b/i.test(it.creator) ? ` by ${it.creator}` : '';
  const date = (it.source === 'aic' || it.source === 'met') && it.date ? `, ${it.date}` : '';
  return `"${it.title}"${by}${date}, ${licenceLabel(it)}, via ${it.via}`;
}
function base(source, id) {
  return { ref: `${source}:${id}`, source, media: 'image', via: SOURCES[source].name, title: '', creator: '', creatorUrl: null, date: null, kind: null, about: null, license: 'other', licenseVersion: null, licenseName: null, licenseUrl: null, page: null, image: null, original: null, smaller: null, width: null, height: null, imageWidth: null, imageHeight: null, bytes: null, alt: null, notes: [], hint: null };
}
async function searchOpenverse(q, opts, getJson) {
  const lic = opts.licences.filter((l) => l !== 'other').map((l) => (l === 'pd' ? 'pdm' : l));
  if (!lic.length) return { total: 0, items: [], note: 'Openverse filters by Creative Commons licences and marks only.' };
  const call = (large) => {
    const p = new URLSearchParams({ q, license: lic.join(','), page_size: '20' });
    if (opts.orientation) p.set('aspect_ratio', { landscape: 'wide', portrait: 'tall', square: 'square' }[opts.orientation]);
    if (large) p.set('size', 'large');
    return getJson(`https://api.openverse.org/v1/images/?${p}`, 30000);
  };
  // Its default order is led by 1024px Flickr files. Ask for the large ones first, and fill up from the rest only if needed.
  const first = await call(true);
  let rows = first.results || []; let total = first.result_count ?? null;
  if (rows.filter((r) => !r.width || r.width >= opts.minWidth).length < opts.limit + 2) {
    const rest = await call(false);
    if (rest) { total = rest.result_count ?? total; rows = [...rows, ...(rest.results || []).filter((r) => !rows.some((x) => x.id === r.id))]; }
  }
  const items = rows.map(fromOpenverse).filter((it) => it.image);
  await wikimediaSizes(items, opts.width, getJson);
  return { total, items };
}
function fromOpenverse(r) {
  const it = base('openverse', r.id);
  const via = r.source || r.provider;
  Object.assign(it, {
    via: PROVIDERS[via] || (String(via || '').startsWith('smithsonian') ? 'Smithsonian' : via ? String(via).replace(/_/g, ' ') : 'Openverse'),
    title: text(r.title).replace(/^File:/, '').replace(/\.(jpe?g|png|tiff?|gif|webp)$/i, '') || 'Untitled', creator: text(r.creator), creatorUrl: r.creator_url || null,
    license: r.license === 'pdm' ? 'pd' : String(r.license || 'other'), licenseVersion: r.license_version || null, licenseUrl: r.license_url || null,
    page: r.foreign_landing_url || r.detail_url, image: r.url, original: r.url,
    width: r.width || null, height: r.height || null, imageWidth: r.width || null, imageHeight: r.height || null,
  });
  if (!LICENCES.includes(it.license)) it.license = 'other';
  return it;
}
// Openverse points at Wikimedia originals, which can be 10 MB or a TIFF. Swap in a web-sized rendition.
async function wikimediaSizes(items, width, getJson) {
  const wm = items.filter((it) => /^https?:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[0-9a-f]\/[0-9a-f]{2}\//.test(it.original || ''));
  if (!wm.length) return;
  const title = (it) => { let n = noQuery(it.original).split('/').pop(); try { n = decodeURIComponent(n); } catch {} return 'File:' + n.replace(/_/g, ' '); };
  const j = await getJson(commonsApi({ titles: wm.map(title).join('|'), prop: 'imageinfo', iiprop: 'url|size|mime', iiurlwidth: String(width) }));
  if (!j?.query) return;
  const normal = new Map((j.query.normalized || []).map((n) => [n.from, n.to]));
  const info = new Map((j.query.pages || []).map((pg) => [pg.title, pg.imageinfo?.[0]]));
  for (const it of wm) { const t = title(it); const ii = info.get(normal.get(t) || t); if (ii) applyThumb(it, ii); }
}

// ---------- Wikimedia Commons ----------
function commonsApi(params) { return `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*', ...params })}`; }
function commonsInfo(width) {
  return { prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: String(width), iiextmetadatalanguage: 'en',
    iiextmetadatafilter: 'ObjectName|Artist|LicenseShortName|License|LicenseUrl|Restrictions|DateTimeOriginal|ImageDescription' };
}
async function searchCommons(q, opts, getJson) {
  let s = `${q} filetype:bitmap`;
  if (opts.minWidth > 1) s += ` filew:>${opts.minWidth - 1}`;
  const j = await getJson(commonsApi({ generator: 'search', gsrnamespace: '6', gsrsearch: s, gsrlimit: '30', ...commonsInfo(opts.width) }));
  if (j.error) throw new Error(j.error.info || 'the search failed');
  const pages = (j.query?.pages || []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return { total: null, items: pages.map(fromCommons).filter(Boolean) };
}
function fromCommons(pg) {
  const ii = pg?.imageinfo?.[0]; if (!ii) return null;
  const m = (k) => text(ii.extmetadata?.[k]?.value);
  const lic = commonsLicence(m('License'), m('LicenseShortName'));
  const it = base('commons', pg.pageid);
  Object.assign(it, {
    title: m('ObjectName').replace(/\s*\b(?:title|label) QS:.*$/s, '') || pg.title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, ''), creator: m('Artist'),
    date: m('DateTimeOriginal').replace(/\s*\bdate QS:.*$/s, '').replace(/^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}.*$/, '$1') || null, about: m('ImageDescription') || null,
    license: lic.code, licenseVersion: lic.version, licenseName: lic.name, licenseUrl: m('LicenseUrl') || null, page: ii.descriptionurl,
  });
  applyThumb(it, ii);
  if (lic.informal) it.notes.push('Not a formal licence: the archive that published it states it knows of no copyright restrictions.');
  if (it.about && it.about.toLowerCase().startsWith(it.title.toLowerCase()) && it.about.length < it.title.length + 12) it.about = null;
  const restrictions = m('Restrictions');
  if (restrictions) it.notes.push(`Restrictions named on the source page (${restrictions}): personality rights, a trademark or similar. Read it before use.`);
  if (/^pd-us/i.test(m('License'))) it.notes.push('Public domain in the United States; check the source page before using it elsewhere.');
  return it;
}
function commonsLicence(license, shortName) {
  const l = String(license || '').toLowerCase(); const s = String(shortName || '').toLowerCase();
  const version = (shortName.match(/\b(\d\.\d)\b/) || l.match(/(\d\.\d)/) || [])[1] || null;
  if (/^cc0|^cc-zero/.test(l) || /^cc0/.test(s)) return { code: 'cc0', version: '1.0' };
  if (/^pd|public domain/.test(l) || /public domain/.test(s)) return { code: 'pd', version: null };
  // Flickr Commons and similar archives: no formal licence, the institution states it knows of no copyright
  if (/^no (known copyright )?restrictions/.test(s)) return { code: 'pd', version: null, name: 'no known copyright restrictions', informal: true };
  const cc = l.match(/^cc-(by(?:-nc)?(?:-sa|-nd)?)(?:-|$)/) || s.match(/^cc (by(?:-nc)?(?:-sa|-nd)?)\b/);
  if (cc) return { code: cc[1], version };
  return { code: 'other', version: null, name: shortName || license || null };
}
// Commons serves thumbnails only at standard widths (1280, 1920, 3840...); the API picks the step.
function applyThumb(it, ii) {
  it.width = ii.width || it.width; it.height = ii.height || it.height; it.original = noQuery(ii.url) || it.original;
  const tw = Number(String(ii.thumburl || '').split('?')[0].match(/(\d+)px-[^/]*$/)?.[1]) || 0;
  if (ii.thumburl && tw && ii.width && (tw < ii.width || (ii.mime && !WEB_TYPES[ii.mime]))) {
    it.image = noQuery(ii.thumburl); it.imageWidth = Math.min(tw, ii.width); it.imageHeight = ii.height ? Math.round((ii.height * it.imageWidth) / ii.width) : null;
  } else { it.image = it.original; it.imageWidth = ii.width || null; it.imageHeight = ii.height || null; }
}

// ---------- Art Institute of Chicago ----------
async function searchAic(q, opts, getJson) {
  const wanted = queryWords(q);
  const run = (match) => getJson(`https://api.artic.edu/api/v1/artworks/search?params=${encodeURIComponent(JSON.stringify({
    query: { bool: {
      // the long description field is left out on purpose: it matches almost anything
      must: [{ multi_match: { query: wanted.join(' ') || q, type: 'cross_fields', fields: ['title^3', 'subject_titles^2', 'term_titles^2', 'classification_titles', 'medium_display', 'artist_title', 'place_of_origin', 'date_display'], ...match } }],
      filter: [{ term: { is_public_domain: true } }, { exists: { field: 'image_id' } }],
    } },
    fields: AIC_FIELDS, limit: 30,
  }))}`, 20000, AIC_HEADERS);
  // every word must match; with three words or more, one may be missing. Looser than that returns noise.
  let j = await run({ operator: 'and' });
  if (!(j.data || []).length && wanted.length >= 3) j = await run({ operator: 'or', minimum_should_match: wanted.length - 1 });
  const iiif = j.config?.iiif_url;
  return { total: j.pagination?.total ?? null, items: (j.data || []).map((d) => fromAic(d, iiif, opts.width)).filter(Boolean) };
}
function fromAic(d, iiif, width) {
  if (!d?.image_id || d.is_public_domain !== true) return null;
  if (!httpUrl(iiif)) throw new Error('Art Institute metadata is missing config.iiif_url');
  const it = base('aic', d.id);
  const W = d.thumbnail?.width || null; const H = d.thumbnail?.height || null;
  const cap = W ? Math.min(W, 3000) : 3000; const w = Math.min(width, cap);
  Object.assign(it, {
    title: text(d.title) || 'Untitled', creator: text(d.artist_title) || text(String(d.artist_display || '').split('\n')[0]),
    date: text(d.date_display) || null, kind: [d.artwork_type_title, d.medium_display].filter(Boolean).map(text).join(', ') || null,
    license: 'cc0', licenseVersion: '1.0', licenseName: 'public domain (CC0)', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    page: `https://www.artic.edu/artworks/${d.id}`, image: `${iiif}/${d.image_id}/full/${w},/0/default.jpg`, original: `${iiif}/${d.image_id}/full/${cap},/0/default.jpg`,
    width: W && H ? cap : null, height: W && H ? Math.round((H * cap) / W) : null, imageWidth: W && H ? w : null, imageHeight: W && H ? Math.round((H * w) / W) : null,
    alt: text(d.thumbnail?.alt_text) || null,
  });
  return it;
}

// ---------- The Met ----------
async function searchMet(q, opts, getJson) {
  const s = await getJson(`https://collectionapi.metmuseum.org/public/collection/v1.1/search?${new URLSearchParams({ q, hasImages: 'true', limit: String(Math.min(40, opts.limit * 4 + 8)), offset: '0' })}`);
  const ids = (s.objectIDs || []).slice(0, Math.min(40, opts.limit * 4 + 8));
  const objects = await mapLimit(ids, 8, (id) => getJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`, 15000));
  // The museum's search reads every field of a record, so much of what it returns is off the subject.
  // Keep the objects whose own name, material, maker, place or tags carry the words of the query.
  const wanted = queryWords(q);
  const about = (x) => [x.title, x.objectName, x.medium, x.classification, x.culture, x.period, x.artistDisplayName, x.department, x.city, x.country, x.region, x.objectDate, ...(x.tags || []).map((t) => t.term)].filter(Boolean).join(' ');
  return { total: s.total ?? null, items: objects.filter((x) => x && onSubject(wanted, about(x))).map(fromMet).filter(Boolean) };
}
function fromMet(x) {
  if (!x || !x.isPublicDomain || !x.primaryImage) return null;
  const it = base('met', x.objectID);
  const fix = (u) => (u ? encodeURI(u).replace(/%25([0-9a-f]{2})/gi, '%$1') : null);
  Object.assign(it, {
    title: text(x.title) || text(x.objectName) || 'Untitled', creator: text(x.artistDisplayName) || (x.culture ? `${text(x.culture)} maker` : ''),
    date: text(x.objectDate) || null, kind: [x.objectName || x.classification, x.medium].filter(Boolean).map(text).join(', ') || null,
    license: 'cc0', licenseVersion: '1.0', licenseName: 'public domain (CC0)', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    page: x.objectURL || `https://www.metmuseum.org/art/collection/search/${x.objectID}`,
    image: fix(x.primaryImage), original: fix(x.primaryImage), smaller: x.primaryImageSmall && x.primaryImageSmall !== x.primaryImage ? fix(x.primaryImageSmall) : null,
  });
  return it;
}

const USAGE = `Image sourcing:
  assets.mjs "<query>" [--source openverse,commons,aic,met] [--json] [--no-check]
  assets.mjs --inspect <provider:id> --json
  assets.mjs --get <provider:id> --selection <selection.json> --to <absolute-working-dir>
  assets.mjs --credits --to <absolute-working-dir>
Search options: --license safe|pd|all|<codes>, --limit 1-20, --width 200-4000,
--min-width 0-20000, --orientation landscape|portrait|square.
Inspect before selecting. Read the project's asset guide and README before acquiring.`;

function options(argv) {
  const flags = new Set(['json', 'no-check', 'credits', 'help']);
  const valued = new Set(['source', 'license', 'limit', 'width', 'min-width', 'orientation', 'inspect', 'get', 'selection', 'to', 'name']);
  const args = {}, query = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { query.push(arg); continue; }
    const key = arg.slice(2);
    if (flags.has(key)) args[key] = true;
    else if (valued.has(key) && argv[i + 1] && !argv[i + 1].startsWith('--')) args[key] = argv[++i];
    else throw new Error(`Unknown option or missing value: ${arg}`);
  }
  const number = (key, value, min, max) => {
    const n = Number(args[key] ?? value);
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`--${key} must be an integer from ${min} to ${max}`);
    return n;
  };
  const aliases = { museums: ['aic', 'met'], wikimedia: ['commons'], artic: ['aic'] };
  const sources = [...new Set(String(args.source ?? 'all').split(',').flatMap(s => s === 'all' ? Object.keys(SOURCES) : aliases[s] || [s]))];
  if (sources.some(s => !SOURCES[s])) throw new Error('Sources are openverse, commons, aic and met');
  const value = args.license ?? 'safe';
  const licences = value === 'safe' ? SAFE : value === 'pd' ? ['cc0', 'pd'] : value === 'all' ? LICENCES : value.split(',').map(s => s === 'pdm' ? 'pd' : s);
  if (licences.some(s => !LICENCES.includes(s))) throw new Error('Unknown licence filter');
  if (args.orientation && !['landscape', 'portrait', 'square'].includes(args.orientation)) throw new Error('Unknown orientation');
  return { ...args, query: query.join(' '), sources, licences, limit: number('limit', 5, 1, 20), width: number('width', 1920, 200, 4000), minWidth: number('min-width', 1000, 0, 20000), check: !args['no-check'] };
}
function termsFor(it) {
  const providerConditions = [...it.notes, ...licenceNotes(it)];
  return { sourceUrl: publicUrl(it.page), licenseUrl: licenceUrl(it), conditions: [...providerConditions], providerConditions, requiredCredit: creditRequired(it) ? credit(it) : '' };
}
function metadata(it) {
  const urls = Object.fromEntries(['page', 'creatorUrl', 'image', 'original', 'smaller'].map(key => [key, publicUrl(it[key])]));
  return { ...it, ...urls, orientation: shape(it.imageWidth, it.imageHeight), licenseCode: it.license, license: licenceLabel(it), licenseUrl: licenceUrl(it), creditRequired: creditRequired(it), credit: credit(it), notes: [...it.notes, ...licenceNotes(it)], terms: termsFor(it) };
}

async function inspect(ref, opts, getJson) {
  const match = String(ref).match(/^(openverse|commons|aic|met):([a-zA-Z0-9-]+)$/);
  if (!match) throw new Error('A ref is openverse:<id>, commons:<id>, aic:<id> or met:<id>');
  const [, source, id] = match;
  let item;
  if (source === 'openverse') {
    item = fromOpenverse(await getJson(`https://api.openverse.org/v1/images/${encodeURIComponent(id)}/`));
    await wikimediaSizes([item], opts.width, getJson);
  } else if (source === 'commons') {
    const data = await getJson(commonsApi({ pageids: id, ...commonsInfo(opts.width), iiprop: 'url|size|mime|mediatype|extmetadata' }));
    const page = data.query?.pages?.[0];
    if (page?.imageinfo?.[0]?.mediatype === 'VIDEO') throw new Error('Unsupported media: this helper acquires still images');
    item = fromCommons(page);
  } else if (source === 'aic') {
    const data = await getJson(`https://api.artic.edu/api/v1/artworks/${id}?fields=${AIC_FIELDS.join(',')}`, 20000, AIC_HEADERS);
    item = fromAic(data.data, data.config?.iiif_url, opts.width);
  } else item = fromMet(await getJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`));
  if (!item?.image || item.ref !== ref) throw new Error(`${source}: no usable selected image or public-domain record`);
  return item;
}

function dims(b) {
  if (!b || b.length < 26) return {};
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.toString('ascii', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' && b.length >= 30) {
    const f = b.toString('ascii', 12, 16);
    if (f === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (f === 'VP8L') { const bits = b.readUInt32LE(21); return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >>> 14) & 0x3fff) }; }
    if (f === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0x01 || (m >= 0xd0 && m <= 0xd8)) { i += 2; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return {};
}
function readCredits(to, fs) {
  const path = join(to, 'credits.json');
  let stat;
  try { stat = fs.lstatSync(path); }
  catch (error) { if (error.code === 'ENOENT') return []; throw new Error(`Cannot read credits.json: ${error.message}`); }
  try {
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('must be a regular file');
    const list = JSON.parse(fs.readFileSync(path, 'utf8'));
    if (!Array.isArray(list)) throw new Error('must be an array');
    const files = new Set(), refs = new Set();
    for (const entry of list) {
      if (!entry || ['file', 'ref', 'title', 'license', 'licenseCode', 'credit', 'via', 'saved', 'intendedUse', 'subjectRelationship', 'sha256'].some(key => typeof entry[key] !== 'string' || !entry[key]) || basename(entry.file) !== entry.file || /[\\/:]/.test(entry.file) || entry.media !== 'image') throw new Error('invalid image entry');
      if (!httpUrl(entry.page) || !httpUrl(entry.licenseUrl) || !httpUrl(entry.image) || (entry.creatorUrl !== null && !httpUrl(entry.creatorUrl)) || !Number.isInteger(entry.bytes) || entry.bytes < 1 || !/^[a-f0-9]{64}$/.test(entry.sha256) || typeof entry.creditRequired !== 'boolean' || !Array.isArray(entry.notes) || entry.notes.some(note => typeof note !== 'string')) throw new Error('invalid credit metadata');
      validateSelection(entry, entry.ref);
      if (files.has(entry.file) || refs.has(entry.ref)) throw new Error('duplicate image entry');
      files.add(entry.file); refs.add(entry.ref);
    }
    return list;
  } catch (error) { throw new Error(`Invalid credits.json: ${error.message}; preserve it for owner recovery`); }
}

const credentialParameter = key => /^(?:access[_-]?token|token|api[_-]?key|auth|authorization|password|secret|signature|sig|x-amz-.+|x-goog-.+)$/i.test(key);
function privateUrlIn(value, requestUrls, memo) {
  const input = value.replace(/[\t\r\n]/g, '');
  if (requestUrls.some(url => input.includes(url.replace(/[\t\r\n]/g, '')))) return true;
  for (const match of input.matchAll(/https?:\/\//gi)) {
    const candidate = input.slice(match.index).match(/^[^\s"<>]+/)[0];
    if (sanitizeUrl(candidate, requestUrls, memo)?.changed) return true;
  }
  return false;
}
function sanitizeParameters(parameters, requestUrls, memo) {
  const retained = new URLSearchParams();
  let changed = false;
  for (const [key, value] of parameters) {
    if (credentialParameter(key)) { changed = true; continue; }
    if (privateUrlIn(key, requestUrls, memo)) throw new Error('Private URL in an ambiguous parameter name');
    const nested = sanitizeUrl(value, requestUrls, memo);
    if (!nested && privateUrlIn(value, requestUrls, memo)) throw new Error('Private URL in an ambiguous component');
    retained.append(key, nested?.value ?? value);
    changed ||= nested?.changed ?? false;
  }
  return { changed, value: retained.toString() };
}
function sanitizeUrl(value, requestUrls = [], memo = new Map()) {
  if (memo.has(value)) return memo.get(value);
  let url;
  try { url = new URL(value); }
  catch (error) {
    if (error.code !== 'ERR_INVALID_URL') throw error;
    memo.set(value, null); return null;
  }
  if (!['https:', 'http:'].includes(url.protocol)) { memo.set(value, null); return null; }
  let pathname = url.pathname;
  try { pathname = decodeURIComponent(pathname); }
  catch (error) { if (!(error instanceof URIError)) throw error; }
  if (privateUrlIn(pathname, requestUrls, memo)) throw new Error('Private URL in an ambiguous path');
  let changed = Boolean(url.username || url.password);
  if (changed) { url.username = ''; url.password = ''; }
  const query = sanitizeParameters(url.searchParams, requestUrls, memo);
  if (query.changed) { url.search = query.value; changed = true; }
  const fragmentValue = url.hash.slice(1), nestedFragment = sanitizeUrl(fragmentValue, requestUrls, memo);
  if (nestedFragment) {
    if (nestedFragment.changed) { url.hash = nestedFragment.value; changed = true; }
  } else {
    const fragment = sanitizeParameters(new URLSearchParams(fragmentValue), requestUrls, memo);
    if (fragment.changed) { url.hash = fragment.value; changed = true; }
  }
  const result = { value: changed ? url.href : String(value), changed };
  memo.set(value, result);
  return result;
}
function publicUrl(value) {
  try { return sanitizeUrl(value)?.value ?? null; }
  catch { return null; }
}
function httpUrl(value) { return typeof value === 'string' && publicUrl(value) === value; }
function publicMessage(message, requestUrls = []) {
  const input = String(message), spans = [];
  const recorded = [...requestUrls].sort((left, right) => right.length - left.length), memo = new Map();
  const offsets = new Set([...input.matchAll(/https?:\/\//gi)].map(match => match.index));
  for (const url of recorded) {
    for (let offset = input.indexOf(url); offset !== -1; offset = input.indexOf(url, offset + 1)) offsets.add(offset);
  }
  const starts = [...offsets].sort((left, right) => left - right);
  // Exact requests protect raw delimiters; diagnostic suffixes stop at token boundaries.
  for (const [index, start] of starts.entries()) {
    if (start < (spans.at(-1)?.end ?? 0)) continue;
    const known = recorded.find(url => input.startsWith(url, start));
    const minimum = start + (known?.length ?? 0);
    const next = starts.slice(index + 1).find(offset => offset >= minimum) ?? input.length;
    let end = minimum;
    while (end < next && !/[\s"<>]/.test(input[end])) {
      // A wrapper quote closes before diagnostic punctuation plus whitespace, end or another URL.
      if (input[start - 1] === "'" && input[end] === "'" && /^[.,;:!?)}\]]*(?:\s|$)/.test(input.slice(end + 1, next))) break;
      end++;
    }
    if (end === next && next < input.length) {
      while (end > minimum && /[.,;:!?)}\]]/.test(input[end - 1])) end--;
    }
    spans.push({ start, end });
  }
  let output = '', cursor = 0;
  for (const { start, end } of spans) {
    let visible;
    try { visible = sanitizeUrl(input.slice(start, end), recorded, memo)?.value; } catch {}
    output += input.slice(cursor, start) + (visible || '(invalid URL)');
    cursor = end;
  }
  return output + input.slice(cursor);
}
function destination(value, fs) {
  if (!value || !isAbsolute(value)) throw new Error('--to must be an absolute existing project working directory');
  const to = fs.realpathSync(value);
  if (!fs.statSync(to).isDirectory()) throw new Error('--to must be a directory');
  return to;
}
function readSelection(opts, fs) {
  if (!opts.selection) throw new Error('--get requires --selection with inspected terms');
  const selected = JSON.parse(fs.readFileSync(opts.selection, 'utf8'));
  return validateSelection(selected, opts.get);
}
function validateSelection(selected, ref) {
  if (!selected || selected.ref !== ref) throw new Error('Selection ref does not match --get');
  for (const key of ['intendedUse', 'subjectRelationship']) {
    if (typeof selected[key] !== 'string' || !selected[key].trim()) throw new Error(`Selection needs ${key}`);
  }
  const terms = selected.terms;
  if (!terms || !httpUrl(terms.sourceUrl) || !httpUrl(terms.licenseUrl) || !Number.isFinite(Date.parse(terms.checkedAt)) || !Array.isArray(terms.conditions) || terms.conditions.some(x => typeof x !== 'string') || !Array.isArray(terms.providerConditions) || terms.providerConditions.some(x => typeof x !== 'string') || typeof terms.requiredCredit !== 'string') throw new Error('Selection needs checked terms: sourceUrl, licenseUrl, checkedAt, conditions, providerConditions and requiredCredit');
  if (!Array.isArray(selected.edits) || selected.edits.some(x => typeof x !== 'string')) throw new Error('Selection edits must be an array');
  return selected;
}
function checkTerms(item, selection) {
  if (item.license === 'other' || !httpUrl(publicUrl(item.page)) || !httpUrl(licenceUrl(item))) throw new Error('Selected image has unknown rights or missing source/licence terms');
  if (!httpUrl(publicUrl(item.image))) throw new Error('Selected image has no safe public image URL');
  const current = termsFor(item), selected = selection.terms;
  if (current.sourceUrl !== selected.sourceUrl || current.licenseUrl !== selected.licenseUrl || current.requiredCredit !== selected.requiredCredit || JSON.stringify(current.providerConditions) !== JSON.stringify(selected.providerConditions)) throw new Error('Source terms changed since selection; inspect and check them again');
  if (current.providerConditions.some(condition => !selected.conditions.includes(condition))) throw new Error('Checked conditions must include every provider condition');
}

function imageDetails(buffer, mime) {
  const signature = mime === 'image/png' ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : mime === 'image/jpeg' ? buffer[0] === 255 && buffer[1] === 216
      : mime === 'image/gif' ? /^GIF8[79]a$/.test(buffer.toString('ascii', 0, 6))
        : mime === 'image/webp' ? buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
          : mime === 'image/avif' ? buffer.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(buffer.toString('ascii', 8, 32)) : false;
  if (!signature) throw new Error(`Image bytes do not match supported MIME ${mime || '(missing)'}`);
  const dimensions = dims(buffer);
  if (mime !== 'image/avif' && (!dimensions.w || !dimensions.h)) throw new Error('Image dimensions are missing or invalid');
  return dimensions;
}

// The GIF decoder tolerates missing blocks, including truncated later frames.
// Check container boundaries here; Sharp still owns pixel and LZW validation.
function completeGif(buffer) {
  let offset = 0, images = 0;
  const skip = length => {
    if (offset + length > buffer.length) throw new Error('Incomplete GIF image container');
    offset += length;
  };
  const byte = () => { skip(1); return buffer[offset - 1]; };
  const table = packed => { if (packed & 0x80) skip(3 * 2 ** ((packed & 7) + 1)); };
  const blocks = () => { for (let size = byte(); size; size = byte()) skip(size); };
  skip(13); table(buffer[10]);
  while (offset < buffer.length) {
    const marker = byte();
    if (marker === 0x3b && images) return;
    if (marker === 0x21) { skip(1); blocks(); }
    else if (marker === 0x2c) {
      skip(9); table(buffer[offset - 1]); skip(1); blocks(); images++;
    } else throw new Error('Invalid GIF image container');
  }
  throw new Error('Incomplete GIF image container');
}

async function completeImageDetails(buffer, mime) {
  imageDetails(buffer, mime);
  if (mime === 'image/gif') completeGif(buffer);
  let sharp;
  try { ({ default: sharp } = await import('sharp')); }
  catch { throw new Error('Image decoder unavailable; follow imagery.md setup before acquisition'); }
  try {
    const decoder = sharp(buffer, { animated: true, failOn: 'error' });
    const details = await decoder.metadata();
    await decoder.stats();
    if (!details.width || !details.height) throw new Error('Missing image dimensions');
    return { w: details.width, h: details.pageHeight || details.height };
  } catch (error) { throw new Error(`Image decode failed: ${error.message}`); }
}

async function probe(url, request, requestUrls) {
  try {
    const response = await request(url, { headers: { ...imageHeaders(url), Range: 'bytes=0-131071' }, signal: AbortSignal.timeout(15000) });
    const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!response.ok || !WEB_TYPES[mime]) {
      await response.body?.cancel();
      return { ok: false, why: !response.ok ? `HTTP ${response.status}` : `Unsupported image MIME ${mime || '(missing)'}` };
    }
    const reader = response.body.getReader(), chunks = [];
    let bytes = 0;
    try {
      while (bytes < 131072) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = value.subarray(0, 131072 - bytes);
        chunks.push(chunk); bytes += chunk.length;
      }
    } finally { await reader.cancel(); }
    return { ok: true, type: mime, ...imageDetails(Buffer.concat(chunks), mime) };
  } catch (error) { return { ok: false, why: publicMessage(error.message, requestUrls) }; }
}

async function acquire(opts, getJson, request, fs) {
  const to = destination(opts.to, fs);
  const selection = readSelection(opts, fs);
  const path = join(to, '.taste-assets.lock');
  let fd;
  try { fd = fs.openSync(path, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Working directory busy: ${path}; directory owner must verify the writer stopped and recover its named files before removing the lock`);
    throw error;
  }
  const lock = { id: randomUUID(), pid: process.pid, host: hostname(), started: new Date().toISOString(), directory: to, ref: opts.get, files: [], target: null, recovery: false };
  try { fs.writeFileSync(fd, JSON.stringify(lock, null, 2) + '\n'); }
  catch (error) { throw new Error(`Lock initialization interrupted at ${path}; owner recovery required: ${error.message}`); }
  finally { fs.closeSync(fd); }
  try { return await getOne(opts, getJson, request, fs, to, selection, lock); }
  finally {
    if (lock.recovery) throw new Error(`Acquisition interrupted; owner recovery required at ${path} for the lock's named files`);
    assertOwner(to, lock, fs);
    fs.unlinkSync(path);
  }
}

function assertOwner(to, lock, fs) {
  const path = join(to, '.taste-assets.lock');
  let current;
  try { current = JSON.parse(fs.readFileSync(path, 'utf8')); } catch { throw new Error(`Lock ownership cannot be verified at ${path}; owner recovery required`); }
  if (current.id !== lock.id) throw new Error(`Lock ownership changed at ${path}; owner recovery required`);
}

async function getOne(opts, getJson, request, fs, to, selection, lock) {
  const credits = readCredits(to, fs);
  const item = await inspect(opts.get, opts, getJson);
  checkTerms(item, selection);
  assertOwner(to, lock, fs);
  const stem = slug(opts.name || item.title) || item.source + '-' + slug(opts.get);
  const prior = credits.find(entry => entry.ref === item.ref);
  if (prior) {
    const path = join(to, prior.file);
    const matchingSelection = prior.intendedUse === selection.intendedUse && prior.subjectRelationship === selection.subjectRelationship && isDeepStrictEqual(prior.terms, selection.terms) && isDeepStrictEqual(prior.edits, selection.edits);
    const priorBytes = fs.existsSync(path) && fs.lstatSync(path).isFile() && !fs.lstatSync(path).isSymbolicLink() && fs.statSync(path).size === prior.bytes ? fs.readFileSync(path) : null;
    const matchingFile = priorBytes?.length === prior.bytes && createHash('sha256').update(priorBytes).digest('hex') === prior.sha256;
    if (!matchingSelection || !matchingFile || !prior.file.startsWith(stem + '.') || prior.image !== publicUrl(item.image)) throw new Error(`Selection or file metadata conflict for ${prior.file}; preserve existing bytes`);
    try { await completeImageDetails(priorBytes, Object.keys(WEB_TYPES).find(mime => prior.file.endsWith('.' + WEB_TYPES[mime]))); }
    catch (error) { throw new Error(`Existing image needs owner recovery: ${error.message}; preserve existing bytes`); }
    return { status: 'unchanged', directory: to, path, credit: prior };
  }
  const response = await request(item.image, { headers: imageHeaders(item.image), signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error(`Image download failed (HTTP ${response.status})`);
  const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const ext = WEB_TYPES[mime];
  if (!ext) throw new Error(`Unsupported image MIME ${mime || '(missing)'}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const d = await completeImageDetails(buffer, mime);
  const file = `${stem}.${ext}`;
  if (fs.existsSync(join(to, file)) || credits.some(entry => entry.file === file)) throw new Error(`Filename conflict: ${file}; choose an unused --name`);
  const dimensions = { width: d.w || item.imageWidth, height: d.h || item.imageHeight };
  const entry = { file, media: 'image', ref: item.ref, title: item.title, creator: item.creator || null, creatorUrl: publicUrl(item.creatorUrl), date: item.date, license: licenceLabel(item), licenseCode: item.license, licenseUrl: licenceUrl(item), creditRequired: creditRequired(item), page: publicUrl(item.page), via: item.via, image: publicUrl(item.image), ...dimensions, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'), credit: credit(item), notes: [...item.notes, ...licenceNotes(item)], saved: new Date().toISOString(), intendedUse: selection.intendedUse, subjectRelationship: selection.subjectRelationship, terms: selection.terms, edits: selection.edits };
  const id = lock.id, created = [];
  const imageTemp = join(to, `.taste-assets-${id}.image.tmp`), ledgerTemp = join(to, `.taste-assets-${id}.ledger.tmp`);
  const target = join(to, file);
  lock.files = [basename(imageTemp), basename(ledgerTemp)];
  lock.target = file;
  assertOwner(to, lock, fs);
  try { fs.writeFileSync(join(to, '.taste-assets.lock'), JSON.stringify(lock, null, 2) + '\n'); }
  catch (error) { lock.recovery = true; throw new Error(`Lock update interrupted: ${error.message}`); }
  let published = false, committed = false;
  const stage = (path, data) => {
    const fd = fs.openSync(path, 'wx');
    created.push(path);
    try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  };
  try {
    stage(imageTemp, buffer);
    stage(ledgerTemp, JSON.stringify([...credits, entry], null, 2) + '\n');
    // Exclusive publication cannot replace an existing asset. The ledger rename
    // is the commit point; earlier failures remove only this new image.
    fs.linkSync(imageTemp, target);
    published = true;
    fs.renameSync(ledgerTemp, join(to, 'credits.json'));
    committed = true;
  } finally {
    try {
      if (published && !committed) fs.unlinkSync(target);
      for (const path of created) if (fs.existsSync(path)) fs.unlinkSync(path);
    } catch (error) { lock.recovery = true; throw new Error(`Acquisition interrupted during cleanup: ${error.message}`); }
  }
  return { status: 'saved', directory: to, path: join(to, file), credit: entry };
}

function printCredits(opts, fs, stdout) {
  const to = destination(opts.to, fs), list = readCredits(to, fs);
  if (!list.length) { stdout(`No images recorded in ${join(to, 'credits.json')}\n`); return 0; }
  for (const entry of list) {
    if (!fs.existsSync(join(to, entry.file))) throw new Error(`Recorded image is missing: ${join(to, entry.file)}; reconcile credits before using them`);
  }
  const html = entry => {
    const by = entry.creator && !/^(unknown|anonymous)\b/i.test(entry.creator) ? ` by ${esc(entry.creator)}` : '';
    const date = /^(aic|met):/.test(entry.ref) && entry.date ? `, ${esc(entry.date)}` : '';
    return `<a href="${esc(entry.page)}">“${esc(entry.title)}”</a>${by}${date}, <a href="${esc(entry.licenseUrl)}">${esc(entry.license)}</a>, via ${esc(entry.via)}`;
  };
  stdout(`Credits from ${join(to, 'credits.json')}. Include only images used in the work.\n<p class="credits">Pictures: ${list.map(html).join('; ')}.</p>\n`);
  for (const entry of list) stdout(`${entry.file}: ${entry.credit}\nUse: ${entry.intendedUse}\nSubject: ${entry.subjectRelationship}\nEdits: ${entry.edits.join('; ') || 'None recorded'}\n`);
  return 0;
}

export async function run(argv, { fetch: fetchRequest = globalThis.fetch, stdout = text => process.stdout.write(text), stderr = text => process.stderr.write(text), fs = nodeFs } = {}) {
  const requestUrls = new Set();
  try {
    const opts = options(argv);
    if (opts.help) { stdout(`${USAGE}\n`); return 0; }
    if (opts.credits) return printCredits(opts, fs, stdout);
    const request = (url, init) => {
      const variants = [String(url)];
      try { variants.push(new URL(url).href); } catch {}
      for (const variant of variants) {
        const publicValue = publicUrl(variant);
        if (variant && variant !== publicValue) requestUrls.add(variant);
      }
      return fetchRequest(url, init);
    };
    const getJson = async (url, ms = 20000, headers = {}) => {
      const response = await request(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(ms) });
      if (!response.ok) throw new Error(`HTTP ${response.status} at ${new URL(url).hostname}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.info || data.error.message || 'Provider returned an error');
      return data;
    };
    if (opts.inspect) {
      const item = metadata(await inspect(opts.inspect, opts, getJson));
      stdout(`${opts.json ? JSON.stringify(item, null, 2) : `${item.ref}: ${item.credit}\n${item.page}\n${item.licenseUrl}\n${item.notes.join('\n')}`}\n`);
      return 0;
    }
    if (opts.get) {
      const result = await acquire(opts, getJson, request, fs);
      stdout(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }
    if (!opts.query) throw new Error('Supply a search query or operation');
    const adapters = { openverse: searchOpenverse, commons: searchCommons, aic: searchAic, met: searchMet };
    let failed = false;
    const sources = [];
    for (const source of opts.sources) {
      try {
        const result = await adapters[source](opts.query, opts, getJson);
        const candidates = result.items.filter(it => opts.licences.includes(it.license));
        if (opts.check) await mapLimit(candidates, 8, async item => {
          item.probe = await probe(item.image, request, requestUrls);
          if (item.probe.ok) {
            item.imageWidth = item.probe.w || item.imageWidth;
            item.imageHeight = item.probe.h || item.imageHeight;
          }
        });
        const items = candidates.filter(it => (!it.imageWidth || it.imageWidth >= opts.minWidth) && (!opts.orientation || !shape(it.imageWidth, it.imageHeight) || shape(it.imageWidth, it.imageHeight) === opts.orientation)).slice(0, opts.limit).map(metadata);
        sources.push({ source, total: result.total, items });
      } catch (error) { failed = true; sources.push({ source, items: [], error: publicMessage(error.message, requestUrls) }); }
    }
    const checkLabel = it => !it.probe ? 'not requested; dimensions from provider metadata' : it.probe.ok ? `passed (${it.probe.type}, ${it.imageWidth ?? '?'} × ${it.imageHeight ?? '?'})` : `failed: ${it.probe.why}`;
    stdout(`${opts.json ? JSON.stringify({ query: opts.query, sources }, null, 2) : sources.map(s => s.error ? `${s.source}: ${s.error}` : s.items.map(it => `${it.ref}: ${it.credit}\n  source ${it.page}\n  image ${it.image}\n  check ${checkLabel(it)}`).join('\n')).join('\n')}\n`);
    return failed ? 1 : 0;
  } catch (error) { stderr(`assets: ${publicMessage(error.message, requestUrls)}\n`); return 2; }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await run(process.argv.slice(2));
