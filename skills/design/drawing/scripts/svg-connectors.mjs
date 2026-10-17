#!/usr/bin/env node
// HTML/SVG connector check; writes nothing.
// Limits and marker art: ../references/svg.md.
import { readFileSync } from 'node:fs';
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const files = argv.filter((a) => !a.startsWith('--'));
const asJson = argv.includes('--json');
const TOL = Number(opt('tolerance', 2));
const GAP = Number(opt('gap', 6));
const EM = Number(opt('em', 0.62));
const EM_SANS = Number(opt('em-sans', 0.5));
const SKIP = new Set(opt('skip-class', 'sep,wall,sample,bracket').split(',').filter(Boolean));
if (files.length !== 1 || [TOL, GAP, EM, EM_SANS].some((v) => !Number.isFinite(v)) || TOL < 0 || GAP < 0 || EM <= 0 || EM_SANS <= 0) {
  console.error('usage: svg-connectors.mjs <file.html|file.svg> [--json] [--tolerance=2] [--gap=6] [--em=0.62] [--em-sans=0.5] [--skip-class=sep,wall,sample,bracket]');
  process.exit(2);
}
let source;
try { source = readFileSync(files[0], 'utf8'); } catch (e) { console.error(`cannot read ${files[0]}: ${e.message}`); process.exit(2); }
const html = !/\.svg$/i.test(files[0]);
const caseName = (name) => html ? name.replace(/[A-Z]/g, (c) => c.toLowerCase()) : name;
const markupIssues = [];
const decode = (s) => s.replace(/&(?:lt|gt|quot|apos|amp);|&#(?:x[0-9a-f]+|\d+);/gi, (entity) => {
  if (entity[1] !== '#') return { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' }[entity.slice(1, -1).toLowerCase()];
  const n = entity[2].toLowerCase() === 'x' ? parseInt(entity.slice(3), 16) : parseInt(entity.slice(2), 10);
  if (n > 0 && n <= 0x10ffff) return String.fromCodePoint(n);
  markupIssues.push('unsupported markup character reference'); return '\ufffd';
});
const attr = (attrs, name) => attrs[caseName(name)] ?? null;
const scalar = (v) => /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?(?:px)?$/i.test(v.trim()) ? Number(v.trim().replace(/px$/i, '')) : NaN;
const num = (tag, name) => scalar(attr(tag, name) ?? '0');
const classes = (tag) => (attr(tag, 'class') ?? '').split(/\s+/).filter(Boolean);
const nodes = []; const ancestry = [];
const tokens = /<!--[\s\S]*?(?:-->|$)|<![^>]*>|<\?[\s\S]*?\?>|<(\/?)([\w:-]+)\b((?:"[^"]*"|'[^']*'|[^"'<>])*)>/g;
let cursor = 0; let uncertain = false;
const closeAt = (i) => { ancestry.length = i; };
const textAt = (end) => {
  const text = ancestry.findLast((node) => node.name === 'text');
  const gap = source.slice(cursor, end);
  if (text) text.text += gap;
  if (/<\/?[a-z]/i.test(gap)) { markupIssues.push('unmeasured markup syntax'); uncertain = true; }
};
for (let token; (token = tokens.exec(source));) {
  textAt(token.index); cursor = tokens.lastIndex;
  if (!token[2]) {
    if (token[0].startsWith('<!--') && !token[0].endsWith('-->')) markupIssues.push('unmeasured markup comment');
    continue;
  }
  const name = caseName(token[2]); const raw = token[3];
  if (token[1]) {
    const i = ancestry.findLastIndex((node) => node.name === name);
    if (i < 0 || i !== ancestry.length - 1 && !(html && /^(ul|ol)$/.test(name) && ancestry.slice(i + 1).every((node) => node.name === 'li'))) {
      uncertain = true; markupIssues.push(html ? 'unmeasured HTML context: mismatched close' : 'unmeasured markup close');
    }
    if (i >= 0) closeAt(i);
    continue;
  }
  if (html && name === 'li') {
    const list = ancestry.findLastIndex((node) => /^(ul|ol)$/.test(node.name));
    const item = ancestry.findLastIndex((node, i) => i > list && node.name === 'li');
    if (item > list) closeAt(item);
  }
  // HTML in-body starts that close p; this tree repair stays unmeasured.
  if (html && /^(address|article|aside|blockquote|center|details|dialog|dir|div|dl|fieldset|figcaption|figure|footer|header|hgroup|main|menu|nav|ol|p|search|section|summary|ul|h[1-6]|pre|listing|form|li|dd|dt|plaintext|table|hr|xmp)$/.test(name)) {
    for (const parent of ancestry) if (parent.name === 'p' || /^(dt|dd)$/.test(parent.name) && /^(dt|dd)$/.test(name)) parent.uncertain = true;
  }
  const attrs = Object.create(null); let consumed = 0;
  for (const value of raw.matchAll(/\s+([^\s="'<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    if (raw.slice(consumed, value.index).trim() || !html && value[2] === undefined && value[3] === undefined) {
      markupIssues.push('unmeasured markup attribute'); uncertain = true;
    }
    const key = caseName(value[1]);
    if (key in attrs) {
      if (!html) { markupIssues.push('unmeasured duplicate XML attribute'); uncertain = true; }
    } else attrs[key] = decode(value[2] ?? value[3] ?? value[4] ?? '');
    consumed = value.index + value[0].length;
  }
  const rest = raw.slice(consumed).trim();
  if (rest && rest !== '/') { markupIssues.push('unmeasured markup attribute'); uncertain = true; }
  const selfClosing = rest === '/' && (!html || /^(svg|math)$/.test(name) || ancestry.some((parent) => /^(svg|math)$/.test(parent.name)));
  const node = { name, attrs, at: token.index, text: '', ancestors: ancestry.slice(),
    uncertain: uncertain || ancestry.some((parent) => parent.uncertain) || html && /^(table|select|template|foreignobject|annotation-xml)$/.test(name) };
  nodes.push(node);
  if (!selfClosing && /^(script|style|textarea|title)$/.test(name)) {
    const ending = new RegExp('</' + name + '\\s*>', html ? 'gi' : 'g');
    ending.lastIndex = cursor;
    const end = ending.exec(source);
    if (!end) { markupIssues.push('unmeasured markup raw text'); uncertain = true; cursor = tokens.lastIndex = source.length; }
    else { node.text = source.slice(cursor, end.index); cursor = tokens.lastIndex = ending.lastIndex; }
  } else if (!selfClosing && !(html && /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(name))) ancestry.push(node);
}
textAt(source.length);
if (ancestry.length) markupIssues.push(html ? 'unmeasured HTML context: unclosed element' : 'unmeasured markup nesting');
for (const node of nodes) if (node.name === 'text') node.text = decode(node.text);
// Bounded CSS keeps quoted spans opaque; no value matching or cascade engine.
const quoted = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;
const uncomment = (style) => style.replace(new RegExp(quoted.source + '|/\\*[\\s\\S]*?\\*/', 'g'), (token) => token.startsWith('/*') ? '' : token);
const quotes = (s) => s.replace(quoted, '');
const css = uncomment(nodes.filter((node) => node.name === 'style').map((node) => node.text).join('\n'));
const declarations = (style) => {
  style = uncomment(style);
  const parts = []; let start = 0; let depth = 0;
  for (const m of style.matchAll(new RegExp(quoted.source + '|[()\\[\\];]', 'g'))) {
    if (m[0] === '(' || m[0] === '[') depth++;
    if (m[0] === ')' || m[0] === ']') depth && depth--;
    if (m[0] === ';' && !depth) { parts.push(style.slice(start, m.index)); start = m.index + 1; }
  }
  parts.push(style.slice(start));
  return parts.flatMap((part) => {
    const m = part.match(/^\s*([\w-]+)\s*:\s*([\s\S]+)$/);
    return m ? [[m[1].startsWith('--') ? m[1] : m[1].toLowerCase(), m[2].trim()]] : [];
  });
};
const cssRule = new RegExp('((?:' + quoted.source + '|[^{}"\'])+)\\{((?:' + quoted.source + '|[^{}"\'])*)\\}', 'g');
const cssRules = [...css.matchAll(cssRule)].flatMap(([, selectors, body]) => quotes(selectors).split(/,(?![^()]*\))/).map((selector) => ({ selector: selector.trim(), style: declarations(body) })));
const matches = ({ name, attrs }, token) => {
  const property = token.match(/^\[([\w-]+)/)?.[1];
  return token.startsWith('.') ? classes(attrs).includes(token.slice(1)) : token.startsWith('#') ? attr(attrs, 'id') === token.slice(1) : token.startsWith('[') ? !property || attr(attrs, property) !== null : name === caseName(token);
};
const simpleSelector = /^(\.[\w-]+\s+)?([\w-]+|\.[\w-]+)$/;
const targetsFor = (selector, candidates) => {
  const simple = selector.match(simpleSelector);
  if (simple) return candidates.filter((node) => matches(node, simple[2]) && (!simple[1] || node.ancestors.some((parent) => classes(parent.attrs).includes(simple[1].trim().slice(1)))));
  if (selector.includes('(') || /[|\\]|\[[^\]]*[\s>+~]/.test(selector)) return candidates;
  const last = selector.split(/[\s>+~]+/).at(-1);
  const prefix = last.match(/^(?:[\w*-]+)?(?:[.#][\w-]+|\[[\w-]+[^\]]*\])*/)?.[0] ?? '';
  const required = prefix.match(/(?:^[\w-]+|[.#][\w-]+|\[[^\]]+\])/g) ?? [];
  return required.length ? candidates.filter((node) => required.every((token) => matches(node, token))) : candidates;
};
const hasFont = (style) => style.some(([p]) => /^font(?:-size|-family)?$/.test(p));
const simplePaint = (v) => /^(?:#[0-9a-f]{3}|#[0-9a-f]{6}|black|white|none|transparent)$/i.test(v.trim());
const knownPaint = (v, node) => {
  if (simplePaint(v)) return true;
  const token = v.trim().match(/^var\((--[\w-]+)\)$/)?.[1];
  const context = [node, ...node.ancestors];
  const values = token ? [
    ...cssRules.filter((rule) => targetsFor(rule.selector, context).length).flatMap((rule) => rule.style),
    ...context.flatMap(({ attrs }) => declarations(attr(attrs, 'style') ?? '')),
  ].filter(([property]) => property === token).map(([, value]) => value) : [];
  return values.length > 0 && values.every((value) => simplePaint(value) && !/^(none|transparent)$/i.test(value.trim()));
};
const markers = {};
for (const { name, attrs } of nodes) if (name === 'marker') markers[attr(attrs, 'id')] = attr(attrs, 'orient') ?? '0';
// Geometry.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const unit = (v) => { const l = len(v); return l ? [v[0] / l, v[1] / l] : [0, 0]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
function segDist(p, a, b) {
  const ab = sub(b, a); const l2 = dot(ab, ab);
  const t = l2 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2)) : 0;
  return len(sub(p, [a[0] + t * ab[0], a[1] + t * ab[1]]));
}
function roundDist(p, b, r) { // distance to a rounded rect's outline
  const hx = (b.x1 - b.x0) / 2 - r; const hy = (b.y1 - b.y0) / 2 - r;
  const qx = Math.abs(p[0] - (b.x0 + b.x1) / 2) - hx; const qy = Math.abs(p[1] - (b.y0 + b.y1) / 2) - hy;
  return Math.abs(len([Math.max(qx, 0), Math.max(qy, 0)]) + Math.min(Math.max(qx, qy), 0) - r);
}
const inBox = (p, b) => p[0] > b.x0 && p[0] < b.x1 && p[1] > b.y0 && p[1] < b.y1;
const boxDist = (p, b) => len([Math.max(b.x0 - p[0], 0, p[0] - b.x1), Math.max(b.y0 - p[1], 0, p[1] - b.y1)]);
const boxSegs = (b) => { const c = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]]; return c.map((p, i) => [p, c[(i + 1) % 4]]); };
function segsCross(a, b, p, q) { // proper interior crossing; shared ends and T-joins pass
  const r = sub(b, a); const s = sub(q, p); const w = sub(p, a); const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return false;
  const t = (w[0] * s[1] - w[1] * s[0]) / den; const u = (w[0] * r[1] - w[1] * r[0]) / den;
  const et = 1 / len(r); const eu = 1 / len(s);
  return t > et && t < 1 - et && u > eu && u < 1 - eu;
}
function segHitsBox(a, b, box) { // Liang-Barsky clip against the open box
  let t0 = 0; let t1 = 1; const d = sub(b, a);
  for (const [p, q] of [[-d[0], a[0] - box.x0], [d[0], box.x1 - a[0]], [-d[1], a[1] - box.y0], [d[1], box.y1 - a[1]]]) {
    if (p === 0) { if (q <= 0) return false; continue; }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    if (t0 >= t1) return false;
  }
  return true;
}
// Path data to subpaths: sampled points plus the true tangent at each end.
function parsePath(d) {
  const toks = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const subs = []; let cur = null; let x = 0; let y = 0; let sx = 0; let sy = 0; let cmd = null; let i = 0; let ctrl = null;
  const n = () => { const t = toks[i++]; if (t === undefined || !Number.isFinite(Number(t))) throw new Error('malformed path data'); return Number(t); };
  const add = (pts, startDir, endDir) => {
    if (!cur.startDir && len(startDir)) cur.startDir = startDir;
    if (len(endDir)) cur.endDir = endDir;
    cur.pts.push(...pts);
  };
  while (i < toks.length) {
    if (/^[a-zA-Z]$/.test(toks[i])) cmd = toks[i++];
    if (!cmd) throw new Error('malformed path data');
    const rel = cmd === cmd.toLowerCase(); const C = cmd.toUpperCase();
    const ox = rel ? x : 0; const oy = rel ? y : 0;
    const p0 = [x, y];
    if (C === 'M') {
      x = n() + ox; y = n() + oy; sx = x; sy = y;
      cur = { pts: [[x, y]], startDir: null, endDir: null, closed: false }; subs.push(cur);
      cmd = rel ? 'l' : 'L'; ctrl = null; continue;
    }
    if (!cur) throw new Error(`path data does not start with M: ${d.slice(0, 30)}`);
    if (cur.closed && C !== 'Z') {
      cur = { pts: [[x, y]], startDir: null, endDir: null, closed: false }; subs.push(cur);
    }
    if (C === 'L') { x = n() + ox; y = n() + oy; add([[x, y]], sub([x, y], p0), sub([x, y], p0)); ctrl = null; } else if (C === 'H') { x = n() + ox; add([[x, y]], sub([x, y], p0), sub([x, y], p0)); ctrl = null; } else if (C === 'V') { y = n() + oy; add([[x, y]], sub([x, y], p0), sub([x, y], p0)); ctrl = null; } else if (C === 'C' || C === 'S' || C === 'Q') {
      let c1; let c2;
      if (C === 'S') c1 = ctrl ? [2 * x - ctrl[0], 2 * y - ctrl[1]] : [x, y]; else c1 = [n() + ox, n() + oy];
      if (C !== 'Q') c2 = [n() + ox, n() + oy];
      const e = [n() + ox, n() + oy];
      const pts = [];
      for (let k = 1; k <= 12; k++) {
        const t = k / 12; const u = 1 - t;
        pts.push(C === 'Q'
          ? [u * u * p0[0] + 2 * u * t * c1[0] + t * t * e[0], u * u * p0[1] + 2 * u * t * c1[1] + t * t * e[1]]
          : [0, 1].map((j) => u ** 3 * p0[j] + 3 * u * u * t * c1[j] + 3 * u * t * t * c2[j] + t ** 3 * e[j]));
      }
      // Coincident controls fall through to the next control, then the opposite endpoint.
      const startDir = (C === 'Q' ? [c1, e] : [c1, c2, e]).map((p) => sub(p, p0)).find((v) => len(v)) ?? [0, 0];
      const endDir = (C === 'Q' ? [c1, p0] : [c2, c1, p0]).map((p) => sub(e, p)).find((v) => len(v)) ?? [0, 0];
      add(pts, startDir, endDir);
      ctrl = C === 'Q' ? null : c2; [x, y] = e;
    } else if (C === 'Z') { add([[sx, sy]], sub([sx, sy], p0), sub([sx, sy], p0)); cur.closed = true; x = sx; y = sy; ctrl = null; cmd = null; } else throw new Error(`unsupported path command ${cmd}`);
  }
  return subs;
}
const short = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const fmt = (p) => `${+p[0].toFixed(1)},${+p[1].toFixed(1)}`;
const findings = markupIssues.map((detail) => ({ figure: 'markup', element: '-', endpoint: '-', nearest: detail, distance: null })); const counts = [];
for (const root of nodes.filter((node) => node.name === 'svg')) {
  const svgTag = root.attrs;
  const figure = short(attr(svgTag, 'aria-label') ?? attr(svgTag, 'id') ?? 'unlabelled svg', 60);
  const unmeasured = (element, detail) => findings.push({ figure, element, endpoint: '-', nearest: detail, distance: null });
  const tags = [root, ...nodes.filter((node) => node.ancestors.includes(root) && !node.ancestors.some((parent) => /^(defs|marker)$/.test(parent.name)))];
  const elements = (name) => tags.filter((node) => node.name === name);
  for (const { name, attrs } of tags) for (const property of ['transform', 'mask', 'clip-path']) {
    const value = attr(attrs, property);
    if (value !== null) unmeasured(name + ' ' + property, 'unsupported geometry; measure in the renderer');
  }
  let badGeometry = false;
  for (const { name, attrs: tag } of tags.filter((node) => /^(rect|circle|line|text|polyline)$/.test(node.name))) {
    const bad = (detail) => { badGeometry = true; unmeasured(name, `unsupported or non-finite geometry: ${detail}`); };
    for (const property of ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r']) {
      const value = attr(tag, property);
      if (value !== null && (!Number.isFinite(scalar(value)) || (/^(width|height|rx|ry|r)$/.test(property) && scalar(value) < 0))) bad(`${property}="${value}"`);
    }
    if (name === 'polyline') {
      const points = (attr(tag, 'points') ?? '').trim().split(/[\s,]+/);
      if (points.length < 4 || points.length % 2 || points.some((v) => !v || !Number.isFinite(Number(v)))) bad('polyline points');
    }
  }
  if (badGeometry) { counts.push({ figure, connectors: 0 }); continue; }
  const shapes = []; const texts = []; const connectors = []; const junctions = [];
  const sizes = { text: 12 }; const sans = {}; const hollow = new Set(); const scoped = new Set();
  const cssMarkerTags = new Set(); let unknownPaint = markupIssues.length > 0 || tags.some((node) => node.uncertain); let inheritedMarkers = false;
  if (tags.some((node) => node.uncertain)) unmeasured('markup', 'unmeasured HTML context; inspect ancestry in the renderer');
  const inspectStyle = (node, style, classPaint = false) => {
    for (const [property, value] of style) {
      const paintTarget = /^(svg|g|rect|circle|path)$/.test(node.name);
      if (/^(transform|mask|mask-image|clip-path)$/.test(property) && value.trim() !== 'none') unmeasured(property, 'unsupported geometry from possible CSS; measure in the renderer');
      if (property.startsWith('marker') && value.trim() !== 'none') {
        unmeasured(property, 'unmeasured CSS marker; possible effect; use presentation attributes or the renderer');
        if (/^(svg|g)$/.test(node.name)) inheritedMarkers = true; else cssMarkerTags.add(node.attrs);
      }
      if (paintTarget && /^(fill|fill-opacity|opacity)$/.test(property) && !(classPaint && property === 'fill' && !/^(svg|g)$/.test(node.name) && knownPaint(value, node))) {
        unknownPaint = true; unmeasured(property, 'unmeasured paint style; opaque cover is not assumed');
      }
    }
  };
  for (const node of tags) {
    inspectStyle(node, declarations(attr(node.attrs, 'style') ?? ''));
    const fill = attr(node.attrs, 'fill');
    if (/^(rect|circle|path)$/.test(node.name) && fill !== null && !knownPaint(fill, node)) {
      unknownPaint = true; unmeasured('fill', 'unmeasured paint value; opaque cover is not assumed');
    }
    if (/^(svg|g)$/.test(node.name) && ['fill', 'fill-opacity', 'opacity'].some((p) => attr(node.attrs, p) !== null)
      || /^(rect|circle|path)$/.test(node.name) && ['fill-opacity', 'opacity'].some((p) => attr(node.attrs, p) !== null)) {
      unknownPaint = true; unmeasured(node.name, 'unmeasured inherited paint or opacity; opaque cover is not assumed');
    }
  }
  for (const rule of cssRules) {
    if (!rule.style.some(([p]) => /^(font(?:-size|-family)?|fill(?:-opacity)?|opacity|transform|mask(?:-image)?|clip-path|marker.*)$/.test(p))) continue;
    const targets = targetsFor(rule.selector, tags);
    if (!targets.length) continue;
    const m = rule.selector.match(simpleSelector);
    if (!m || m[1] && !classes(svgTag).includes(m[1].trim().slice(1))) {
      if (hasFont(rule.style)) unmeasured(rule.selector, 'unmeasured scoped CSS selector; measure in the renderer');
      for (const node of targets) inspectStyle(node, rule.style);
      continue;
    }
    const key = m[2].startsWith('.') ? m[2].slice(1) : caseName(m[2]);
    const font = {}; const important = {};
    const priority = (field, value) => {
      const high = /!\s*important$/i.test(value);
      if (important[field] && !high) unmeasured(rule.selector, 'unmeasured font priority; measure in the renderer');
      important[field] ||= high;
    };
    for (const [p, v] of rule.style) {
      if (p === 'font' || p === 'font-size') {
        priority('size', v);
        const size = v.match(p === 'font-size' ? /^(\d+(?:\.\d+)?)px(?:\s*!important)?$/i : /^(?:[1-9]00\s+)?(\d+(?:\.\d+)?)px(?:\/\S+)?\s+/i);
        if (!size || !Number.isFinite(Number(size[1]))) unmeasured(rule.selector, 'unmeasured font size; measure in the renderer');
        font.size = size;
      }
      if (p === 'font' || p === 'font-family') {
        priority('family', v); font.family = v;
      }
    }
    const px = font.size;
    const family = quotes(font.family ?? '').match(/(sans|mono)/);
    if (!family && (font.family ?? '').match(quoted)) unmeasured(rule.selector, 'unmeasured quoted font family; measure in the renderer');
    if (rule.style.some(([p, v]) => p === 'fill' && ['none', 'transparent'].includes(v.toLowerCase()))) hollow.add(key);
    for (const node of targets) inspectStyle(node, rule.style, m[2].startsWith('.'));
    if (!px && !family || !m[1] && scoped.has(key)) continue;
    if (px) sizes[key] = Number(px[1]);
    if (family) sans[key] = family[1] === 'sans';
    if (m[1]) scoped.add(key);
  }
  const hasHeads = (tag) => inheritedMarkers || cssMarkerTags.has(tag) || attr(tag, 'marker-start') || attr(tag, 'marker-end');
  const opaque = (t) => !unknownPaint && !['none', 'transparent'].includes((attr(t, 'fill') ?? '').trim().toLowerCase()) && !classes(t).some((c) => hollow.has(c));
  for (const m of elements('rect')) {
    const t = m.attrs; const b = { x0: num(t, 'x'), y0: num(t, 'y') }; b.x1 = b.x0 + num(t, 'width'); b.y1 = b.y0 + num(t, 'height');
    const r = Math.min(num(t, 'rx') || num(t, 'ry'), (b.x1 - b.x0) / 2, (b.y1 - b.y0) / 2);
    shapes.push({ name: `rect ${b.x0},${b.y0} ${b.x1 - b.x0}x${b.y1 - b.y0}`, box: b, r, segs: boxSegs(b), centre: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], at: m.at, opaque: opaque(t) });
  }
  for (const m of elements('circle')) {
    const t = m.attrs; const c = [num(t, 'cx'), num(t, 'cy'), num(t, 'r')];
    shapes.push({ name: `circle ${c[0]},${c[1]} r${c[2]}`, circle: c, box: { x0: c[0] - c[2], y0: c[1] - c[2], x1: c[0] + c[2], y1: c[1] + c[2] }, at: m.at, opaque: opaque(t) });
  }
  for (const m of elements('text')) {
    const t = m.attrs; const content = m.text; const cls = classes(t);
    const fs = cls.reduce((s, c) => sizes[c] ?? s, sizes.text);
    const isSans = cls.reduce((s, c) => sans[c] ?? s, sans.text ?? false);
    const measured = attr(t, 'data-glyph-width');
    const w = measured === null ? content.length * (isSans ? EM_SANS : EM) * fs : Number(measured);
    if (measured !== null && (!measured.trim() || !Number.isFinite(w) || w < 0)) {
      unmeasured(`text "${short(content, 28)}"`, 'invalid measured glyph width');
      continue;
    }
    const x = num(t, 'x'); const y = num(t, 'y');
    const anchor = attr(t, 'text-anchor');
    const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    const box = { x0, x1: x0 + w, y0: y - 0.72 * fs, y1: y + 0.22 * fs };
    texts.push({ name: `text "${short(content, 28)}"`, box, segs: boxSegs(box), centre: [x0 + w / 2, y - 0.25 * fs], at: m.at });
  }
  const strokes = [];
  const push = (m, label, subs) => {
    const boundary = !hasHeads(m.attrs) && classes(m.attrs).some((c) => SKIP.has(c));
    const el = { tag: m.attrs, label, at: m.at, parts: subs, subs: [] };
    for (const s of subs) {
      const segs = s.pts.slice(1).map((p, k) => [s.pts[k], p]);
      if (s.closed) {
        const cx = s.pts.reduce((a, p) => a + p[0], 0) / s.pts.length; const cy = s.pts.reduce((a, p) => a + p[1], 0) / s.pts.length;
        shapes.push({ name: `closed ${label}`, segs, centre: [cx, cy], at: m.at, opaque: opaque(m.attrs) });
      } else el.subs.push({ ...s, part: s, el, label, segs, at: m.at });
    }
    if (boundary) junctions.push(...el.subs); else if (el.subs.length) strokes.push(el);
  };
  for (const m of elements('line')) {
    const t = m.attrs; const a = [num(t, 'x1'), num(t, 'y1')]; const b = [num(t, 'x2'), num(t, 'y2')];
    push(m, `line ${fmt(a)} ${fmt(b)}`, [{ pts: [a, b], startDir: sub(b, a), endDir: sub(b, a), closed: false }]);
  }
  for (const m of elements('polyline')) {
    const v = (attr(m.attrs, 'points') ?? '').trim().split(/[\s,]+/).map(Number); const pts = [];
    for (let k = 0; k + 1 < v.length; k += 2) pts.push([v[k], v[k + 1]]);
    if (pts.length > 1) push(m, `polyline "${short(attr(m.attrs, 'points'), 40)}"`, [{ pts, startDir: pts.slice(1).map((p) => sub(p, pts[0])).find((v) => len(v)) ?? [0, 0], endDir: pts.slice(0, -1).reverse().map((p) => sub(pts.at(-1), p)).find((v) => len(v)) ?? [0, 0], closed: false }]);
  }
  for (const m of elements('path')) {
    const d = attr(m.attrs, 'd') ?? '';
    try { push(m, `path "${short(d, 40)}"`, parsePath(d)); } catch (e) { unmeasured(`path "${short(d, 40)}"`, e.message); }
  }
  const painted = (s, p) => {
    if (!s.box || !inBox(p, s.box)) return false;
    if (s.circle) return len(sub(p, s.circle)) < s.circle[2];
    if (!s.r) return true;
    const b = s.box; const q = [Math.max(Math.abs(p[0] - s.centre[0]) - (b.x1 - b.x0) / 2 + s.r, 0), Math.max(Math.abs(p[1] - s.centre[1]) - (b.y1 - b.y0) / 2 + s.r, 0)];
    return len(q) < s.r;
  };
  // Strokes wholly inside a small shape are that icon's detail, not connectors.
  const icon = (s) => shapes.some((sh) => sh.box && sh.box.x1 - sh.box.x0 <= 24 && sh.box.y1 - sh.box.y0 <= 24 && s.pts.every((p) => painted(sh, p)));
  for (const el of strokes) for (const s of el.subs) if (hasHeads(el.tag) || !icon(s)) connectors.push(s);
  const shapeDist = (p, s) => (s.circle ? Math.abs(len(sub(p, s.circle)) - s.circle[2])
    : s.r !== undefined ? roundDist(p, s.box, s.r) : Math.min(...s.segs.map(([a, b]) => segDist(p, a, b))));
  const covers = (s, p, after) => s.opaque && s.at > after && painted(s, p);
  // Every candidate p could land on; anything within the tolerance ranks shapes, then texts, then connectors.
  const candidates = (p, self) => {
    const out = [];
    for (const s of shapes) out.push({ el: s, kind: 0, d: covers(s, p, self.at) ? 0 : shapeDist(p, s) });
    for (const t of texts) out.push({ el: t, kind: 1, d: Math.max(0, boxDist(p, t.box) - GAP) });
    for (const c of [...connectors, ...junctions]) if (c !== self) out.push({ el: c, kind: 2, d: Math.min(...c.segs.map(([a, b]) => segDist(p, a, b))) });
    const rank = (x) => (x.d <= TOL ? x.kind * 1e6 + x.d : 3e6 + x.d);
    return out.sort((a, b) => rank(a) - rank(b));
  };
  // Does a head at p, pointing along h, point into the element it lands on?
  const nearestSeg = (p, segs) => segs.reduce((m, s) => (segDist(p, ...s) < segDist(p, ...m) ? s : m));
  const pointsInto = (p, h, { el, kind }) => {
    if (el.circle) return dot(h, unit(sub(el.circle, p))) >= 0.5;
    if (el.r) {
      const b = el.box; const centre = [Math.max(b.x0 + el.r, Math.min(p[0], b.x1 - el.r)), Math.max(b.y0 + el.r, Math.min(p[1], b.y1 - el.r))];
      if (len(sub(centre, p))) return dot(h, unit(sub(centre, p))) >= 0.5;
    }
    const [a, b] = nearestSeg(p, el.segs);
    if (kind === 2) return Math.abs(dot(h, unit(sub(b, a)))) <= 0.87;
    let nrm = unit([a[1] - b[1], b[0] - a[0]]);
    if (dot(nrm, sub(el.centre, a)) < 0) nrm = [-nrm[0], -nrm[1]];
    return dot(h, nrm) >= 0.5;
  };
  const head = (tag, which, dir) => {
    const id = (attr(tag, which) ?? '').match(/url\(#([^)]+)\)/)?.[1];
    if (!id) return null;
    if (!(id in markers)) return { missing: id };
    const orient = markers[id];
    if (orient === 'auto') return unit(dir);
    if (orient === 'auto-start-reverse') return which === 'marker-start' ? unit([-dir[0], -dir[1]]) : unit(dir);
    const a = (Number(orient) * Math.PI) / 180; return [Math.cos(a), Math.sin(a)];
  };
  counts.push({ figure, connectors: connectors.length });
  for (const c of connectors) {
    for (const [end, p, dir] of [['start', c.pts[0], c.startDir ?? [0, 0]], ['end', c.pts.at(-1), c.endDir ?? [0, 0]]]) {
      const [best] = candidates(p, c);
      const report = (problem, d) => findings.push({ figure, element: c.label, endpoint: `${end} ${fmt(p)}${problem}`, nearest: best ? best.el.name ?? best.el.label : 'nothing', distance: d });
      if (!best || best.d > TOL) { report('', best ? +best.d.toFixed(1) : null); continue; }
      // SVG draws marker-start at a path's first vertex and marker-end at its last.
      const which = end === 'start' ? 'marker-start' : 'marker-end';
      const outer = end === 'start' ? c.el.parts[0] === c.part : c.el.parts.at(-1) === c.part;
      const h = outer ? head(c.el.tag, which, dir) : null;
      if (h?.missing) report(` (missing marker #${h.missing})`, +best.d.toFixed(1));
      else if (h && !pointsInto(p, h, best)) report(` (${which} head points away from its target)`, +best.d.toFixed(1));
    }
    for (const t of texts) {
      const corners = [[t.box.x0, t.box.y0], [t.box.x1, t.box.y0], [t.box.x1, t.box.y1], [t.box.x0, t.box.y1]];
      const hidden = shapes.some((s) => s.at < t.at && corners.every((p) => covers(s, p, c.at)));
      const hit = !hidden && c.segs.find(([a, b]) => segHitsBox(a, b, t.box));
      if (hit) findings.push({ figure, element: c.label, endpoint: `crosses at ${fmt(hit[0])}-${fmt(hit[1])}`, nearest: t.name, distance: 0 });
    }
  }
  // Connectors crossing each other: reroute, or mark a crossing no route avoids with data-crossing.
  const free = connectors.filter((c) => attr(c.el.tag, 'data-crossing') == null);
  free.forEach((c, i) => free.slice(i + 1).forEach((o) => {
    const hit = o.el !== c.el && c.segs.find(([a, b]) => o.segs.some(([p, q]) => segsCross(a, b, p, q)));
    if (hit) findings.push({ figure, element: c.label, endpoint: `crosses a connector at ${fmt(hit[0])}-${fmt(hit[1])}`, nearest: o.label, distance: 0 });
  }));
}
if (asJson) console.log(JSON.stringify({ file: files[0], figures: counts, findings }, null, 2));
else if (findings.length) {
  for (const f of findings) console.log(`${f.figure} | ${f.element} | ${f.endpoint} | ${f.nearest} | ${f.distance ?? '-'}`);
  console.log(`svg-connectors: ${findings.length} finding(s) in ${files[0]}`);
} else console.log(`svg-connectors: clean, ${counts.reduce((n, f) => n + f.connectors, 0)} connectors in ${counts.length} figures in ${files[0]}`);
process.exit(findings.length ? 1 : 0);
