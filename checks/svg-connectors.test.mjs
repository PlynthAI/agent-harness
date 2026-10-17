import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const checker = fileURLToPath(new URL('../skills/design/drawing/scripts/svg-connectors.mjs', import.meta.url));
const marker = (orient = 'auto') => `<defs><marker id="a" orient="${orient}"><path d="M1,1 L9,5 L1,9 Z"/></marker></defs>`;
const boxes = '<rect x="0" y="0" width="30" height="40"/><rect x="80" y="0" width="30" height="40"/>';
function run(t, body, flags = [], svgAttributes = 'aria-label="fixture"', wrap = (svg) => svg, fileName = 'drawing.svg') {
  const dir = mkdtempSync(join(tmpdir(), 'svg-connectors-cli-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, fileName);
  writeFileSync(file, wrap(`<svg ${svgAttributes}>${body}</svg>`));
  return spawnSync(process.execPath, [checker, file, '--json', ...flags], { encoding: 'utf8', timeout: 3000 });
}

test('connected arrows and reversed start markers are supported', (t) => {
  const r = run(t, marker('auto-start-reverse') + boxes + '<line x1="30" y1="20" x2="80" y2="20" marker-start="url(#a)" marker-end="url(#a)"/>');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).findings, []);
});

test('a sideways end marker and unreversed start marker are rejected', (t) => {
  for (const [orient, attributes] of [['90', 'marker-end="url(#a)"'], ['auto', 'marker-start="url(#a)"']]) {
    const r = run(t, marker(orient) + boxes + `<line x1="30" y1="20" x2="80" y2="20" ${attributes}/>`);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /head points away/);
  }
});

test('single-quoted SVG attributes cannot conceal floating endpoints', (t) => {
  const r = run(t, "<rect x='0' y='0' width='20' height='40'/><rect x='100' y='0' width='20' height='40'/><line x1='42' y1='20' x2='70' y2='20'/>");
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(JSON.parse(r.stdout).findings.length, 2);
});

test('an end outside a rounded corner is not hidden by its bounding box', (t) => {
  const r = run(t, '<rect x="-40" y="0" width="10" height="10"/><line x1="-30" y1="5" x2="1" y2="1"/><rect x="0" y="0" width="40" height="40" rx="12"/>');
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.ok(JSON.parse(r.stdout).findings.some((f) => f.endpoint.startsWith('end ') && f.distance > 2));
});

test('malformed closed path data returns a finding instead of hanging', (t) => {
  const r = run(t, '<path d="M 0 0 Z 10"/>');
  assert.equal(r.error, undefined, String(r.error));
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /path/);
});

test('a missing marker is reported rather than assigned a default direction', (t) => {
  const r = run(t, boxes + '<line x1="30" y1="20" x2="80" y2="20" marker-end="url(#missing)"/>');
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /missing marker/);
});

test('unsupported transformed geometry is explicit rather than silently measured', (t) => {
  const r = run(t, '<g transform="translate(50 0)"><rect x="0" y="0" width="30" height="40"/></g><line x1="30" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>');
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /transform/);
});

test('non-finite and negative geometry options are usage errors', (t) => {
  for (const flag of ['--tolerance=Infinity', '--gap=-1', '--em=0']) {
    const r = run(t, boxes, [flag]);
    assert.equal(r.status, 2, flag + ': ' + r.stdout + r.stderr);
  }
});

test('a connector may terminate at an explicitly drawn boundary junction', (t) => {
  const r = run(t, '<line x1="35" y1="0" x2="35" y2="40" class="wall"/><polyline points="35,40 35,60 70,60"/><rect x="70" y="50" width="20" height="20"/>');
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('arrowheads are not exempted as detail inside an icon-sized shape', (t) => {
  const r = run(t, marker('90') + '<rect x="0" y="0" width="24" height="24" fill="none"/><line x1="5" y1="12" x2="19" y2="12" marker-end="url(#a)"/>');
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(JSON.parse(r.stdout).figures[0].connectors, 1);
});


test('measured glyph widths accept real gaps while still rejecting crossings and floating ends', (t) => {
  const label = '<style>text{font:13.5px sans-serif;}</style><text x="52" y="313" data-glyph-width="104.838">understand/how</text>';
  const target = '<circle cx="505" cy="310" r="11"/>';
  for (const [start, status, reason] of [[162.838, 0, null], [150, 1, /crosses/], [170.838, 1, /start/]]) {
    const r = run(t, label + `<line x1="${start}" y1="310" x2="494" y2="310"/>` + target);
    assert.equal(r.status, status, r.stdout + r.stderr);
    const findings = JSON.parse(r.stdout).findings;
    if (status === 0) assert.deepEqual(findings, []);
    else assert.match(r.stdout, reason);
  }
  for (const width of ['NaN', '-1', '']) {
    const r = run(t, label.replace('104.838', width) + '<line x1="162.838" y1="310" x2="494" y2="310"/>' + target);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /invalid measured glyph width/);
  }
});


test('aria-hidden SVGs still check connectors while explicit legend samples stay valid', (t) => {
  const hidden = 'aria-hidden="true" aria-label="hidden fixture"';
  const broken = run(t, boxes + '<line x1="42" y1="20" x2="70" y2="20"/>', [], hidden);
  assert.equal(broken.status, 1, broken.stdout + broken.stderr);
  assert.equal(JSON.parse(broken.stdout).findings.length, 2);
  const sample = run(t, '<line x1="2" y1="10" x2="38" y2="10" class="sample"/>', [], hidden);
  assert.equal(sample.status, 0, sample.stdout + sample.stderr);
  assert.equal(JSON.parse(sample.stdout).figures.length, 1);
  assert.deepEqual(JSON.parse(sample.stdout).findings, []);
  const headed = run(t, marker('90') + boxes + '<line x1="30" y1="20" x2="80" y2="20" class="sample" marker-end="url(#a)"/>', [], hidden);
  assert.equal(headed.status, 1, headed.stdout + headed.stderr);
  assert.match(headed.stdout, /head points away/);
});


test('icon detail must lie inside the actual circular or rounded shape', (t) => {
  for (const shape of ['<circle cx="12" cy="12" r="12"/>', '<rect x="0" y="0" width="24" height="24" rx="12"/>']) {
    const outside = run(t, shape + '<line x1="1" y1="1" x2="3" y2="1"/>');
    assert.equal(outside.status, 1, outside.stdout + outside.stderr);
    const report = JSON.parse(outside.stdout);
    assert.equal(report.figures[0].connectors, 1);
    assert.equal(report.findings.length, 2);
    const inside = run(t, shape + '<line x1="5" y1="12" x2="19" y2="12"/>');
    assert.equal(inside.status, 0, inside.stdout + inside.stderr);
    assert.equal(JSON.parse(inside.stdout).figures[0].connectors, 0);
  }
  const rectangular = run(t, '<rect x="0" y="0" width="24" height="24"/><line x1="1" y1="1" x2="3" y2="1"/>');
  assert.equal(rectangular.status, 0, rectangular.stdout + rectangular.stderr);
  assert.equal(JSON.parse(rectangular.stdout).figures[0].connectors, 0);
});


test('coincident curve controls preserve the first nonzero start and end tangents', (t) => {
  for (const [d, head] of [
    ['M30,20 C80,0 80,20 80,20', 'marker-end'],
    ['M30,20 C30,20 30,40 80,20', 'marker-start'],
    ['M30,20 S30,40 80,20', 'marker-start'],
    ['M30,20 C45,10 40,40 60,40 S80,20 80,20', 'marker-end'],
  ]) {
    const r = run(t, marker('auto-start-reverse') + boxes + `<path d="${d}" ${head}="url(#a)"/>`);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /head points away/);
  }
  for (const [d, head] of [
    ['M30,20 C80,20 80,20 80,20', 'marker-end'],
    ['M30,20 C30,20 30,20 80,20', 'marker-start'],
    ['M30,20 C50,0 80,20 80,20', 'marker-end'],
    ['M30,20 S30,20 80,20', 'marker-start'],
    ['M30,20 Q80,20 80,20', 'marker-end'],
    ['M30,20 Q30,20 80,20', 'marker-start'],
  ]) {
    const r = run(t, marker('auto-start-reverse') + boxes + `<path d="${d}" ${head}="url(#a)"/>`);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).findings, []);
  }
});


test('length units and non-finite geometry cannot silently bypass endpoints', (t) => {
  for (const x1 of ['42px', 'NaN', 'Infinity', '42%', '1e999']) {
    const r = run(t, boxes + `<line x1="${x1}" y1="20" x2="70px" y2="20"/>`);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.ok(JSON.parse(r.stdout).findings.length > 0);
  }
  const valid = run(t, boxes + '<line x1="30px" y1="20" x2="80px" y2="20"/>');
  assert.equal(valid.status, 0, valid.stdout + valid.stderr);
  for (const points of ['30,20 NaN,20', '30,20 80', '30,20 1e999,20']) {
    const r = run(t, boxes + `<polyline points="${points}"/>`);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.ok(JSON.parse(r.stdout).findings.length > 0);
  }
});


test('transparent inline and inherited paint cannot hide a floating end', (t) => {
  const source = '<rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/>';
  for (const target of [
    '<rect x="60" y="0" width="40" height="40" style="fill:none"/>',
    '<g fill="none"><rect x="60" y="0" width="40" height="40"/></g>',
    '<g style="fill:none"><rect x="60" y="0" width="40" height="40"/></g>',
    '<rect x="60" y="0" width="40" height="40" fill="transparent"/>',
    '<rect x="60" y="0" width="40" height="40" fill-opacity="0"/>',
    '<rect x="60" y="0" width="40" height="40" opacity="0.5"/>',
  ]) {
    const r = run(t, source + target);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.ok(JSON.parse(r.stdout).findings.length > 0);
  }
  const edge = run(t, source.replace('x2="70"', 'x2="60"') + '<rect x="60" y="0" width="40" height="40" fill="none"/>');
  assert.equal(edge.status, 0, edge.stdout + edge.stderr);
  const opaque = run(t, source + '<rect x="60" y="0" width="40" height="40"/>');
  assert.equal(opaque.status, 0, opaque.stdout + opaque.stderr);
});


test('CSS transforms masks and clips are explicitly unmeasured only when applicable', (t) => {
  const source = '<rect x="0" y="0" width="30" height="40"/>';
  const wire = '<line x1="30" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>';
  for (const [property, value] of [['transform', 'translate(50px,0)'], ['mask', 'url(#mask)'], ['clip-path', 'circle(10px)']]) {
    for (const body of [`<g style="${property}:${value}">${source}</g>${wire}`, `<style>.moved{${property}:${value}}</style><g class="moved">${source}</g>${wire}`]) {
      const r = run(t, body);
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /unsupported geometry/);
      assert.match(r.stdout, new RegExp(property));
    }
  }
  const unrelated = run(t, '<style>.html-panel{transform:translateY(4px);mask:url(#mask)}</style>' + source + wire);
  assert.equal(unrelated.status, 0, unrelated.stdout + unrelated.stderr);
  const none = run(t, '<g style="transform:none;clip-path:none">' + source + '</g>' + wire);
  assert.equal(none.status, 0, none.stdout + none.stderr);
});

test('rounded corner heads use the local outline normal', (t) => {
  const drawing = '<rect x="-40" y="0" width="10" height="10"/><line x1="-30" y1="3.055728" x2="4" y2="3.055728" marker-end="url(#a)"/><rect x="0" y="0" width="40" height="40" rx="12"/>';
  const inward = run(t, marker() + drawing);
  assert.equal(inward.status, 0, inward.stdout + inward.stderr);
  const away = run(t, marker('180') + drawing);
  assert.equal(away.status, 1, away.stdout + away.stderr);
  assert.match(away.stdout, /head points away/);
});

test('font scopes stay bound to their SVG while nested scopes are explicitly unmeasured', (t) => {
  const styles = '<style>.one .label{font:10px sans-serif}.two .label{font:20px sans-serif}</style>';
  for (const [scope, start] of [['one', 26], ['two', 46]]) {
    const drawing = `<text x="0" y="20" class="label">test</text><line x1="${start}" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>`;
    const r = run(t, styles + drawing, [], `class="${scope}" aria-label="${scope}"`);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  }
  const nested = run(t, styles + '<g class="one"><text x="0" y="20" class="label">test</text><line x1="26" y1="20" x2="80" y2="20"/></g><rect x="80" y="0" width="30" height="40"/>');
  assert.equal(nested.status, 1, nested.stdout + nested.stderr);
  assert.match(nested.stdout, /unmeasured scoped CSS/);
});

test('CSS marker declarations cannot receive a decorative exemption', (t) => {
  for (const style of ['style="marker-end:url(#a)"', 'class="headed"']) {
    const css = style.startsWith('class') ? '<style>.headed{marker-end:url(#a)}</style>' : '';
    const attributes = style.startsWith('class') ? 'class="sample headed"' : `class="sample" ${style}`;
    const r = run(t, css + marker('90') + boxes + `<line x1="30" y1="20" x2="80" y2="20" ${attributes}/>`);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /unmeasured CSS marker/);
    assert.equal(JSON.parse(r.stdout).figures[0].connectors, 1);
  }
  const noHead = run(t, '<line x1="2" y1="10" x2="38" y2="10" class="sample" style="marker-end:none"/>');
  assert.equal(noHead.status, 0, noHead.stdout + noHead.stderr);
});

test('repeated polyline endpoints preserve the nearest nonzero tangent', (t) => {
  for (const [points, heads] of [
    ['30,20 80,20 80,20', 'marker-end="url(#a)"'],
    ['30,20 30,20 80,20', 'marker-start="url(#a)"'],
    ['30,20 30,20 80,20 80,20', 'marker-start="url(#a)" marker-end="url(#a)"'],
  ]) {
    const r = run(t, marker('auto-start-reverse') + boxes + `<polyline points="${points}" ${heads}/>`);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  }
  const away = run(t, marker('90') + boxes + '<polyline points="30,20 80,20 80,20" marker-end="url(#a)"/>');
  assert.equal(away.status, 1, away.stdout + away.stderr);
  assert.match(away.stdout, /head points away/);
});

test('partial label occlusion does not hide visible wire crossings', (t) => {
  const source = '<rect x="0" y="0" width="30" height="40"/><line x1="30" y1="20" x2="180" y2="20"/><rect x="180" y="0" width="30" height="40"/>';
  const label = '<text x="50" y="24" data-glyph-width="100">label</text>';
  const partial = run(t, source + '<rect x="80" y="0" width="40" height="40"/>' + label);
  assert.equal(partial.status, 1, partial.stdout + partial.stderr);
  assert.match(partial.stdout, /crosses/);
  const full = run(t, source + '<rect x="45" y="10" width="110" height="30"/>' + label);
  assert.equal(full.status, 0, full.stdout + full.stderr);
});

test('explicit drawing commands after Z start an open subpath', (t) => {
  for (const d of ['M0,0 L30,0 L30,40 L0,40 Z L60,20', 'M0,0 L30,0 L30,40 L0,40 z l60,20']) {
    const r = run(t, `<path d="${d}" fill="none"/>`);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.equal(JSON.parse(r.stdout).figures[0].connectors, 1);
    assert.match(r.stdout, /end 60,20/);
  }
  const nextMove = run(t, '<path d="M0,0 L30,0 L30,40 L0,40 Z M30,20 L80,20" fill="none"/><rect x="80" y="0" width="30" height="40"/>');
  assert.equal(nextMove.status, 0, nextMove.stdout + nextMove.stderr);
});


test('path markers retain their original boundary across closed and open parts', async (t) => {
  const continuation = '<path d="M-50,0 L-20,0 L-20,40 L-50,40 Z M0,0 L30,0 L30,40 L0,40 Z L0,-30" fill="none"';
  const target = '<rect x="-10" y="-60" width="20" height="30"/>';
  const open = boxes + '<path d="M30,20 L50,20 M50,20 L80,20" fill="none" marker-start="url(#a)" marker-end="url(#a)"/>';
  for (const [name, body, connectors, endpoints] of [
    ['closed first part has no start head on its continuation', marker() + continuation + ' marker-start="url(#a)"/>' + target, 1, []],
    ['closed last part has no end head on the preceding connector', marker('180') + boxes + '<path d="M30,20 L80,20 M150,0 L180,0 L180,40 L150,40 Z" fill="none" marker-end="url(#a)"/>', 1, []],
    ['last continuation still checks its actual end head', marker('180') + continuation + ' marker-end="url(#a)"/>' + target, 1, ['end 0,-30 (marker-end head points away from its target)']],
    ['all open parts accept correctly oriented outer heads', marker('auto-start-reverse') + open, 2, []],
    ['all open parts reject sideways outer heads', marker('90') + open, 2, ['start 30,20 (marker-start head points away from its target)', 'end 80,20 (marker-end head points away from its target)']],
  ]) await t.test(name, (t) => {
    const r = run(t, body);
    assert.equal(r.status, endpoints.length ? 1 : 0, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.equal(report.figures[0].connectors, connectors);
    assert.deepEqual(report.findings.map((f) => f.endpoint), endpoints);
  });
});


test('stylesheet opacity and unknown fill cannot provide opaque covers', (t) => {
  const drawing = '<rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/><rect x="60" y="0" width="40" height="40" class="cover"/>';
  for (const paint of ['opacity:0', 'fill:rgba(0,0,0,0)', 'fill:var(--missing)']) {
    const r = run(t, '<style>.cover{' + paint + '}</style>' + drawing);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /unmeasured paint/);
  }
  const tagPaint = run(t, '<style>rect{fill:none}</style>' + drawing);
  assert.equal(tagPaint.status, 1, tagPaint.stdout + tagPaint.stderr);
  assert.match(tagPaint.stdout, /unmeasured paint/);
  for (const css of ['.cover{fill:#123456}', ':root{--card:#fff}.cover{fill:var(--card)}']) {
    const r = run(t, '<style>' + css + '</style>' + drawing);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  }
});

test('complex applicable CSS cannot hide unsupported geometry or marker heads', (t) => {
  const drawing = '<g class="moved"><rect x="0" y="0" width="30" height="40" data-moved="yes"/></g><line x1="30" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>';
  for (const selector of ['.moved > rect', 'g.moved', '[data-moved]']) {
    const r = run(t, '<style>' + selector + '{transform:translate(50px,0)}</style>' + drawing);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /unsupported geometry/);
  }
  const headed = run(t, '<style>.sample.headed{marker-end:url(#a)}</style>' + marker('90') + boxes + '<line x1="30" y1="20" x2="80" y2="20" class="sample headed"/>');
  assert.equal(headed.status, 1, headed.stdout + headed.stderr);
  assert.match(headed.stdout, /unmeasured CSS marker/);
  assert.equal(JSON.parse(headed.stdout).figures[0].connectors, 1);
  const unrelated = run(t, '<style>.html-panel[data-open]{transform:translateY(4px)}</style>' + drawing);
  assert.equal(unrelated.status, 0, unrelated.stdout + unrelated.stderr);
});


test('HTML ancestor scopes report relevant SVG declarations without flagging sizing', (t) => {
  const wrap = (svg) => '<div class="figure">' + svg + '</div>';
  const wire = '<line x1="30" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>';
  const transformed = run(t, '<style>.figure .moved{transform:translate(50px,0)}</style><g class="moved"><rect x="0" y="0" width="30" height="40"/></g>' + wire, [], 'aria-label="external scope"', wrap);
  assert.equal(transformed.status, 1, transformed.stdout + transformed.stderr);
  assert.match(transformed.stdout, /unsupported geometry/);
  const font = run(t, '<style>.figure .label{font:20px sans-serif}</style><text x="0" y="20" class="label">test</text><line x1="32" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>', [], 'aria-label="external scope"', wrap);
  assert.equal(font.status, 1, font.stdout + font.stderr);
  assert.match(font.stdout, /unmeasured scoped CSS/);
  const paint = run(t, '<style>.figure .cover{fill:none}</style><rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/><rect x="60" y="0" width="40" height="40" class="cover"/>', [], 'aria-label="external scope"', wrap);
  assert.equal(paint.status, 1, paint.stdout + paint.stderr);
  assert.match(paint.stdout, /unmeasured paint/);
  const headed = run(t, '<style>.figure .headed{marker-end:url(#a)}</style>' + marker('90') + boxes + '<line x1="30" y1="20" x2="80" y2="20" class="sample headed"/>', [], 'aria-label="external scope"', wrap);
  assert.equal(headed.status, 1, headed.stdout + headed.stderr);
  assert.match(headed.stdout, /unmeasured CSS marker/);
  assert.equal(JSON.parse(headed.stdout).figures[0].connectors, 1);
  const sizing = run(t, '<style>.plot svg{display:block;width:100%;height:auto}.legend svg{display:block;width:40px;height:20px}</style>' + boxes + '<line x1="30" y1="20" x2="80" y2="20"/>', [], 'aria-label="external sizing"', (svg) => '<div class="plot legend">' + svg + '</div>');
  assert.equal(sizing.status, 0, sizing.stdout + sizing.stderr);
});

test('presentation hollow paint trims whitespace and folds keyword case', (t) => {
  const source = '<rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/>';
  for (const fill of ['none ', 'NONE', ' transparent ', 'TRANSPARENT']) {
    const shape = '<rect x="60" y="0" width="40" height="40" fill="' + fill + '"/>';
    const floating = run(t, source + shape);
    assert.equal(floating.status, 1, floating.stdout + floating.stderr);
    assert.ok(JSON.parse(floating.stdout).findings.some((f) => f.endpoint === 'end 70,20' && f.distance === 10));
    const edge = run(t, source.replace('x2="70"', 'x2="60"') + shape);
    assert.equal(edge.status, 0, edge.stdout + edge.stderr);
  }
  const opaque = run(t, source + '<rect x="60" y="0" width="40" height="40" fill=" #123456 "/>');
  assert.equal(opaque.status, 0, opaque.stdout + opaque.stderr);
});

test('inline and class paint share case and whitespace tolerant declarations', (t) => {
  const source = '<rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/>';
  for (const declaration of ['FILL:none', 'fill : none', 'fill:NONE']) {
    const inline = run(t, source + '<rect x="60" y="0" width="40" height="40" style="' + declaration + '"/>');
    assert.equal(inline.status, 1, inline.stdout + inline.stderr);
    assert.match(inline.stdout, /unmeasured paint/);
    const classFill = run(t, '<style>.cover{' + declaration + '}</style>' + source + '<rect x="60" y="0" width="40" height="40" class="cover"/>');
    assert.equal(classFill.status, 1, classFill.stdout + classFill.stderr);
    assert.match(classFill.stdout, /end 70,20/);
  }
  const opaque = run(t, '<style>.cover{FILL : #123456}</style>' + source + '<rect x="60" y="0" width="40" height="40" class="cover"/>');
  assert.equal(opaque.status, 0, opaque.stdout + opaque.stderr);
});


test('native CSS namespace selectors report relevant uncertainty without crashing on benign rules', async (t) => {
  const drawing = boxes.replace('<rect', '<rect href="#source"') + '<line x1="30" y1="20" x2="80" y2="20"/>';
  for (const selector of ['[*|href]', '[|href]']) {
    for (const [declaration, status] of [['width:100%;height:auto', 0], ['transform:translate(50px,0)', 1]]) await t.test(selector + ' ' + declaration, (t) => {
      const r = run(t, '<style>' + selector + '{' + declaration + '}</style>' + drawing);
      assert.equal(r.status, status, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.equal(report.figures[0].connectors, 1);
      if (status) assert.match(r.stdout, /unsupported geometry|unmeasured CSS/);
      else assert.deepEqual(report.findings, []);
    });
  }
});

test('native CSS unknown functional selectors retain possible geometry and marker effects', async (t) => {
  const wire = '<line x1="30" y1="20" x2="80" y2="20" class="sample headed"/>';
  for (const [name, css, body, status, connectors, diagnostic] of [
    ['functional marker', ':where(.headed){marker-end:url(#a)}', marker('90') + boxes + wire, 1, 1, /unmeasured CSS marker/],
    ['functional transform', ':is(rect){transform:translate(50px,0)}', boxes + wire.replace('sample headed', 'headed'), 1, 1, /unsupported geometry|unmeasured CSS/],
    ['functional alternatives with spaces', ':is(rect, circle){transform:translate(50px,0)}', boxes + wire.replace('sample headed', 'headed'), 1, 1, /unsupported geometry|unmeasured CSS/],
    ['functional negation with spaces', ':not(circle, path){transform:translate(50px,0)}', boxes + wire.replace('sample headed', 'headed'), 1, 1, /unsupported geometry|unmeasured CSS/],
    ['functional marker alternatives with spaces', ':where(.headed, .unused){marker-end:url(#a)}', marker('90') + boxes + wire, 1, 1, /unmeasured CSS marker/],
    ['benign functional sizing', ':where(.headed){display:block;width:100%;height:auto}', boxes + wire, 0, 0, null],
    ['unrelated HTML transform', '.html-panel[data-open]{transform:translateY(4px)}', boxes + wire.replace('sample headed', 'headed'), 0, 1, null],
  ]) await t.test(name, (t) => {
    const r = run(t, '<style>' + css + '</style>' + body);
    assert.equal(r.status, status, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.equal(report.figures[0].connectors, connectors);
    if (diagnostic) assert.match(r.stdout, diagnostic);
    else assert.deepEqual(report.findings, []);
  });
});

test('native CSS token opacity includes only possible shape and ancestor overrides', async (t) => {
  const css = '<style>:root{--card:#fff}.cover{fill:var(--card)}</style>';
  const source = '<rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/>';
  const cover = '<rect x="60" y="0" width="40" height="40" class="cover"/>';
  for (const [name, target, wrap, status, rules = css] of [
    ['inline transparent override', cover.replace('/>', ' style="--card:none"/>'), (svg) => svg, 1],
    ['inherited transparent override', '<g style="--card:transparent">' + cover + '</g>', (svg) => svg, 1],
    ['HTML ancestor transparent override', cover, (svg) => '<div style="--card:none">' + svg + '</div>', 1],
    ['direct opaque root token', cover, (svg) => svg, 0],
    ['inline opaque override', cover.replace('/>', ' style="--card:#123456"/>'), (svg) => svg, 0],
    ['unrelated closed sibling override', cover, (svg) => '<div style="--card:none"><p>other</p></div>' + svg, 0],
    ['unrelated stylesheet token override', cover, (svg) => '<div class="other"><p>other</p></div>' + svg, 0, css + '<style>.other{--card:none}</style>'],
    ['custom property names remain case-sensitive', cover.replace('/>', ' style="--CARD:none"/>'), (svg) => svg, 0],
    ['differently cased definition leaves the token unresolved', cover, (svg) => svg, 1, '<style>:root{--CARD:#fff}.cover{fill:var(--card)}</style>'],
  ]) await t.test(name, (t) => {
    const r = run(t, rules + source + target, [], 'aria-label="token fixture"', wrap);
    assert.equal(r.status, status, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.equal(report.figures[0].connectors, 1);
    if (status) {
      assert.match(r.stdout, /unmeasured paint/);
      assert.ok(report.findings.some((f) => f.endpoint === 'end 70,20' && f.distance === 10));
    } else assert.deepEqual(report.findings, []);
  });
});

test('native CSS scoped fonts use each figure and actual ancestor relationships', async (t) => {
  const css = '<style>.one .label{font:10px sans-serif}.two .label{font:20px sans-serif}</style>';
  const drawing = (start) => '<text x="0" y="20" class="label">test</text><line x1="' + start + '" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>';
  for (const [name, body, wrap, figures, status] of [
    ['sibling SVG root scopes', css + drawing(26), (svg) => svg + '<svg class="two" aria-label="two">' + drawing(46) + '</svg>', 2, 0],
    ['closed sibling HTML scope', css + drawing(26), (svg) => '<div class="two"><p>other</p></div>' + svg, 1, 0],
    ['inner sibling scope has no label descendant', css + '<g class="two"><rect x="100" y="100" width="40" height="40"/></g>' + drawing(26), (svg) => svg, 1, 0],
    ['actual HTML ancestor scope remains unmeasured', css + drawing(26), (svg) => '<div class="two">' + svg + '</div>', 1, 1],
  ]) await t.test(name, (t) => {
    const r = run(t, body, [], 'class="one" aria-label="one"', wrap);
    assert.equal(r.status, status, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.equal(report.figures.length, figures);
    assert.ok(report.figures.every((figure) => figure.connectors === 1));
    if (status) assert.match(r.stdout, /unmeasured scoped CSS/);
    else assert.deepEqual(report.findings, []);
  });
});

test('native CSS inline comments cannot hide checked declarations', async (t) => {
  const source = '<rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/>';
  for (const [name, body, status, diagnostic] of [
    ['commented paint', source + '<rect x="60" y="0" width="40" height="40" style="/* cover */ fill:none"/>', 1, /unmeasured paint/],
    ['commented transform', '<g style="/* move */ transform:translate(50px,0)">' + boxes + '<line x1="30" y1="20" x2="80" y2="20"/></g>', 1, /unsupported geometry/],
    ['commented marker', marker('90') + boxes + '<line x1="30" y1="20" x2="80" y2="20" class="sample" style="/* head */ marker-end:url(#a)"/>', 1, /unmeasured CSS marker/],
    ['commented benign declarations', boxes + '<line x1="30" y1="20" x2="80" y2="20" style="/* benign */ transform:none;marker-end:none;width:100%"/>', 0, null],
  ]) await t.test(name, (t) => {
    const r = run(t, body);
    assert.equal(r.status, status, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.equal(report.figures[0].connectors, 1);
    if (diagnostic) assert.match(r.stdout, diagnostic);
    else assert.deepEqual(report.findings, []);
  });
});


test('native CSS structural context ignores comments and raw text without losing real figures', async (t) => {
  const css = '<style>.outer .moved{transform:translate(50px,0)}</style>';
  const drawing = '<g class="moved">' + boxes + '<line x1="30" y1="20" x2="80" y2="20"/></g>';
  for (const [name, note, closed, status] of [
    ['comment closing text', '<!-- example </div> -->', false, 1],
    ['script closing text', '<script>const example="</div>";</script>', false, 1],
    ['style closing text', '<style>.note::before{content:"</div>"}</style>', false, 1],
    ['textarea closing text', '<textarea>example </div></textarea>', false, 1],
    ['title closing text', '<title>example </div></title>', false, 1],
    ['comment fake unclosed SVG', '<!-- example <svg> -->', false, 1],
    ['script fake unclosed SVG', '<script>const example="<svg>";</script>', false, 1],
    ['comment complete fake SVG', '<!-- <svg><line x1="4" y1="3" x2="7" y2="3"/></svg> -->', false, 1],
    ['script complete fake SVG', '<script>const example="<svg><line/></svg>";</script>', false, 1],
    ['benign script keeps its enclosing scope', '<script>const example=1;</script>', false, 1],
    ['closed real sibling scope remains inactive', '<!-- example </div> -->', true, 0],
  ]) await t.test(name, (t) => {
    const wrap = (svg) => css + '<div class="outer">' + note + (closed ? '</div>' + svg : svg + '</div>');
    const r = run(t, drawing, [], 'aria-label="real figure"', wrap);
    assert.equal(r.status, status, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'real figure', connectors: 1 }]);
    if (status) assert.match(r.stdout, /unsupported geometry/);
    else assert.deepEqual(report.findings, []);
  });
  await t.test('comment padding does not widen a visible label', (t) => {
    const body = '<style>text{font:10px sans-serif}</style><text x="0" y="20">te<!-- note -->st</text><line x1="26" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>';
    const r = run(t, body);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    assert.deepEqual(report.findings, []);
  });
});

test('native CSS quoted attribute whitespace retains possible checked effects', async (t) => {
  const source = '<rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/>';
  const cover = '<rect x="60" y="0" width="40" height="40" class="cover" data-note="cover card"/>';
  await t.test('quoted transparent token override', (t) => {
  const token = run(t, '<style>:root{--card:#fff}.cover{fill:var(--card)}.cover[data-note="cover card"]{--card:none}</style>' + source + cover);
  assert.equal(token.status, 1, token.stdout + token.stderr);
  const report = JSON.parse(token.stdout);
  assert.equal(report.figures[0].connectors, 1);
  assert.match(token.stdout, /unmeasured paint/);
  assert.ok(report.findings.some((f) => f.endpoint === 'end 70,20' && f.distance === 10));
  });
  for (const [name, css, body, status, connectors, diagnostic] of [
    ['quoted marker effect', '.headed[data-note="wire sample"]{marker-end:url(#a)}', marker('90') + boxes + '<line x1="30" y1="20" x2="80" y2="20" class="sample headed" data-note="wire sample"/>', 1, 1, /unmeasured CSS marker/],
    ['quoted transform effect', '.moved[data-note="box group"]{transform:translate(50px,0)}', '<g class="moved" data-note="box group">' + boxes + '<line x1="30" y1="20" x2="80" y2="20"/></g>', 1, 1, /unsupported geometry/],
    ['quoted benign sizing', '.moved[data-note="box group"]{display:block;width:100%;height:auto}', '<g class="moved" data-note="box group">' + boxes + '<line x1="30" y1="20" x2="80" y2="20"/></g>', 0, 1, null],
    ['unrelated bare HTML attribute selector', '.html-panel[data-open]{transform:translateY(4px)}', boxes + '<line x1="30" y1="20" x2="80" y2="20"/>', 0, 1, null],
  ]) await t.test(name, (t) => {
    const r = run(t, '<style>' + css + '</style>' + body);
    assert.equal(r.status, status, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.equal(report.figures[0].connectors, connectors);
    if (diagnostic) assert.match(r.stdout, diagnostic);
    else assert.deepEqual(report.findings, []);
  });
});

test('native CSS quoted terminal targets stay bound to their required class', async (t) => {
  const wire = boxes + '<line x1="30" y1="20" x2="80" y2="20"/>';
  const source = '<rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/>';
  const cover = '<rect x="60" y="0" width="40" height="40" class="cover" data-open="true"/>';
  const sibling = (svg) => '<div class="html-panel" data-open="true">panel</div>' + svg;
  for (const quote of ['"', "'"]) {
    const target = (name) => `.${name}[data-open=${quote}true${quote}]`;
    await t.test('unrelated quoted transform ' + quote, (t) => {
      const r = run(t, '<style>' + target('html-panel') + '{transform:translateY(4px)}</style>' + wire, [], 'aria-label="fixture"', sibling);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
      assert.deepEqual(report.findings, []);
    });
    await t.test('unrelated quoted token ' + quote, (t) => {
      const r = run(t, '<style>:root{--card:#fff}.cover{fill:var(--card)}' + target('html-panel') + '{--card:none}</style>' + source + cover, [], 'aria-label="fixture"', sibling);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
      assert.deepEqual(report.findings, []);
    });
    for (const [name, css, body, diagnostic] of [
      ['relevant quoted transform', target('moved') + '{transform:translate(50px,0)}', '<g class="moved" data-open="true">' + wire + '</g>', /unsupported geometry/],
      ['relevant quoted marker', target('headed') + '{marker-end:url(#a)}', marker('90') + boxes + '<line x1="30" y1="20" x2="80" y2="20" class="sample headed" data-open="true"/>', /unmeasured CSS marker/],
      ['relevant quoted token', ':root{--card:#fff}.cover{fill:var(--card)}' + target('cover') + '{--card:none}', source + cover, /unmeasured paint/],
    ]) await t.test(name + ' ' + quote, (t) => {
      const r = run(t, '<style>' + css + '</style>' + body);
      assert.equal(r.status, 1, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
      assert.match(r.stdout, diagnostic);
      if (name.endsWith('token')) assert.ok(report.findings.some((f) => f.endpoint === 'end 70,20' && f.distance === 10));
    });
  }
});

test('native CSS quoted brackets preserve required targets and possible effects', async (t) => {
  const drawing = boxes + '<line x1="30" y1="20" x2="80" y2="20"/>';
  for (const quote of ['"', "'"]) for (const value of ['].missing', 'a] b', 'a]>b', 'a]+b', 'a]~b']) {
    const selectorAttribute = `data-note=${quote}${value}${quote}`;
    const htmlAttribute = `data-note=${quote}${value.replace(/>/g, '&gt;')}${quote}`;
    const body = `<g class="moved" ${htmlAttribute}>${drawing}</g>`;
    await t.test('matching quoted bracket ' + quote + value, (t) => {
      const r = run(t, `<style>.moved[${selectorAttribute}]{transform:translate(50px,0)}</style>` + body);
      assert.equal(r.status, 1, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
      assert.match(r.stdout, /unsupported geometry/);
    });
    await t.test('unrelated quoted bracket ' + quote + value, (t) => {
      const sibling = (svg) => `<div class="html-panel" ${htmlAttribute}>panel</div>` + svg;
      const r = run(t, `<style>.html-panel[${selectorAttribute}]{transform:translate(50px,0)}</style>` + body, [], 'aria-label="fixture"', sibling);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
      assert.deepEqual(report.findings, []);
    });
  }
});

function runHtml(t, body, wrap = (svg) => '<body>' + svg + '</body>', svgAttributes = 'aria-label="fixture"') {
  return run(t, body, [], svgAttributes, (svg) => '<!doctype html><html>' + wrap(svg) + '</html>', 'drawing.html');
}

test('native HTML quoted attribute contents never become structural elements', async (t) => {
  const drawing = boxes + '<line x1="30" y1="20" x2="80" y2="20"/>';
  for (const quote of ['"', "'"]) {
    const note = (fake) => `data-example=${quote}${fake.replace(/"/g, quote === '"' ? "'" : '"')}${quote}`;
    for (const [name, body, wrap, status, diagnostic] of [
      ['fake SVG root', drawing, (svg) => '<body><div ' + note('<svg></svg>') + '></div>' + svg + '</body>', 0, null],
      ['fake line', '<g ' + note('<line x1="4" y1="3" x2="7" y2="3"/>') + '>' + drawing + '</g>', undefined, 0, null],
      ['fake opaque cover', '<rect x="0" y="0" width="20" height="40"/><g ' + note('<rect x="60" y="0" width="40" height="40"/>') + '><line x1="20" y1="20" x2="70" y2="20"/></g>', undefined, 1, /end 70,20/],
      ['fake marker', marker() + '<g ' + note('<marker id="a" orient="90"></marker>') + '>' + boxes + '<line x1="30" y1="20" x2="80" y2="20" marker-end="url(#a)"/></g>', undefined, 0, null],
      ['fake stylesheet', '<g class="moved" ' + note('<style>.moved{transform:translate(50px,0)}</style>') + '>' + drawing + '</g>', undefined, 0, null],
      ['quoted greater-than label attribute', '<style>text{font:10px sans-serif}</style><text x="0" y="20" data-note=' + quote + 'a > b' + quote + '>test</text><line x1="26" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>', undefined, 0, null],
    ]) await t.test(name + ' ' + quote, (t) => {
      const r = runHtml(t, body, wrap);
      assert.equal(r.status, status, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
      if (diagnostic) assert.match(r.stdout, diagnostic);
      else assert.deepEqual(report.findings, []);
    });
  }
});

test('native HTML attributes and ancestor names retain possible token overrides', async (t) => {
  const source = '<rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/>';
  const cover = (extra = '') => '<rect x="60" y="0" width="40" height="40" class="cover" ' + extra + '/>';
  const token = '<style>:root{--card:#fff}.cover{fill:var(--card)}[data-clear]{--card:transparent}</style>';
  for (const [name, extra, status] of [
    ['bare attribute', 'data-clear ', 1],
    ['unquoted attribute', 'data-clear=on ', 1],
    ['uppercase HTML attribute', 'DATA-CLEAR="on" ', 1],
    ['quoted attribute control', 'data-clear="on" ', 1],
    ['missing attribute control', '', 0],
  ]) await t.test(name, (t) => {
    const r = runHtml(t, token + source + cover(extra));
    assert.equal(r.status, status, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    if (status) assert.ok(report.findings.some((f) => f.endpoint === 'end 70,20' && f.distance === 10));
    else assert.deepEqual(report.findings, []);
  });
  for (const [name, body] of [
    ['unquoted class', '<style>.cover{fill:none}</style>' + source + cover().replace('class="cover"', 'class=cover')],
    ['unquoted inline style', source + cover('style=fill:none ')],
  ]) await t.test(name, (t) => {
    const r = runHtml(t, body);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.ok(JSON.parse(r.stdout).findings.some((f) => f.endpoint === 'end 70,20' && f.distance === 10));
  });
  await t.test('unquoted geometry cannot conceal a floating start', (t) => {
    const r = runHtml(t, boxes + '<line x1=45 y1=20 x2=80 y2=20 />');
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.ok(JSON.parse(r.stdout).findings.some((f) => f.endpoint === 'start 45,20' && f.distance === 15));
  });
  const inherited = '<style>:root{--card:#fff}body{--card:transparent}.cover{fill:var(--card)}</style>' + source + cover();
  for (const name of ['BODY', 'body']) await t.test(name + ' ancestor', (t) => {
    const r = runHtml(t, inherited, (svg) => '<' + name + '>' + svg + '</' + name + '>');
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.ok(JSON.parse(r.stdout).findings.some((f) => f.endpoint === 'end 70,20' && f.distance === 10));
  });
  await t.test('uppercase HTML font type selector', (t) => {
    const r = runHtml(t, '<style>TEXT{font:10px sans-serif}</style><text x="0" y="20">test</text><line x1="26" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    assert.deepEqual(report.findings, []);
  });
  await t.test('uppercase HTML type selector', (t) => {
    const r = runHtml(t, inherited.replace('body{', 'BODY{'), (svg) => '<body>' + svg + '</body>');
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.ok(JSON.parse(r.stdout).findings.some((f) => f.endpoint === 'end 70,20' && f.distance === 10));
  });
  await t.test('uppercase HTML attribute selector', (t) => {
    const r = runHtml(t, token.replace('[data-clear]', '[DATA-CLEAR]') + source + cover('data-clear="on" '));
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.ok(JSON.parse(r.stdout).findings.some((f) => f.endpoint === 'end 70,20' && f.distance === 10));
  });
  await t.test('HTML class values retain case', (t) => {
    const r = runHtml(t, '<style>.cover{fill:none}</style>' + source + cover().replace('class="cover"', 'class="Cover"'));
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).findings, []);
  });
  await t.test('standalone SVG keeps XML selector names', (t) => {
    const r = run(t, token.replace('[data-clear]', '[DATA-CLEAR]') + source + cover('data-clear="on" '));
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).findings, []);
  });
  await t.test('standalone SVG keeps XML element case', (t) => {
    const r = run(t, inherited, [], 'aria-label="fixture"', (svg) => '<BODY>' + svg + '</BODY>');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).findings, []);
  });
  await t.test('standalone SVG requires quoted attributes', (t) => {
    const r = run(t, token + source + cover('data-clear=on '));
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /unmeasured markup|unsupported markup/);
  });
});

test('native HTML quoted selector spans stay opaque before punctuation checks', async (t) => {
  const source = '<rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/>';
  const cover = '<rect x="60" y="0" width="40" height="40" class="cover"/>';
  const drawing = '<g class="moved">' + boxes + '<line x1="30" y1="20" x2="80" y2="20"/></g>';
  for (const quote of ['"', "'"]) {
    const sibling = (svg) => '<body><div class="html-panel" data-note=' + quote + 'a &gt; b' + quote + '>panel</div>' + svg + '</body>';
    for (const [name, css, body] of [
      ['unrelated quoted transform', 'div[data-note=' + quote + 'a > b' + quote + ']{transform:translateX(1px)}', drawing],
      ['unrelated quoted token', ':root{--card:#fff}.cover{fill:var(--card)}.html-panel[data-note=' + quote + 'a > b' + quote + ']{--card:none}', source + cover],
      ['quoted selector-list comma', '.html-panel[data-note=' + quote + 'a,.moved' + quote + ']{transform:translateX(1px)}', drawing],
    ]) await t.test(name + ' ' + quote, (t) => {
      const r = runHtml(t, '<style>' + css + '</style>' + body, sibling);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
      assert.deepEqual(report.findings, []);
    });
  }
  await t.test('escaped quotes remain inside an unrelated selector value', (t) => {
    const r = runHtml(t, '<style>.html-panel[data-note="a\\\" > b"]{transform:translateX(1px)}</style>' + drawing);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).findings, []);
  });
});

test('native HTML list closure and unsupported ancestry have explicit boundaries', async (t) => {
  const css = '<style>.outer .moved{transform:translateX(1px)}</style>';
  const drawing = css + '<g class="moved">' + boxes + '<line x1="30" y1="20" x2="80" y2="20"/></g>';
  for (const [name, wrap, status] of [
    ['omitted sibling list-item close', (svg) => '<body><ul><li class="outer">other<li>' + svg + '</li></ul></body>', 0],
    ['nested list preserves outer scope', (svg) => '<body><ul><li class="outer"><ul><li>one<li>' + svg + '</li></ul></li></ul></body>', 1],
  ]) await t.test(name, (t) => {
    const r = runHtml(t, drawing, wrap);
    assert.equal(r.status, status, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    if (status) assert.match(r.stdout, /unsupported geometry/);
    else assert.deepEqual(report.findings, []);
  });
  const covered = '<style>:root{--card:#fff}.cover{fill:var(--card)}</style><rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/><rect x="60" y="0" width="40" height="40" class="cover"/>';
  for (const context of ['table', 'select', 'template', 'p', 'foreignObject']) await t.test('unsupported ' + context + ' ancestry', (t) => {
    const body = context === 'foreignObject' ? '<foreignObject>' + covered + '</foreignObject>' : covered;
    const wrap = context === 'foreignObject' ? undefined : context === 'p' ? (svg) => '<body><p>other<div>' + svg + '</div></body>' : (svg) => '<body><' + context + '>' + svg + '</' + context + '></body>';
    const r = runHtml(t, body, wrap);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.ok(report.findings.some((f) => /unmeasured HTML context/.test(f.nearest)));
  });
  await t.test('mismatched closes cannot prove a cover opaque', (t) => {
    const r = runHtml(t, covered, (svg) => '<body><div><span></div>' + svg + '</body>');
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /unmeasured HTML context/);
  });
});

test('native HTML amendment retains first attributes and rejects duplicate XML keys', async (t) => {
  const source = '<rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/>';
  const cover = (attrs) => '<rect y="0" width="40" height="40" ' + attrs + '/>';
  for (const [name, attrs, css, status] of [
    ['repeated fill', 'x="60" fill="none" fill="#fff"', '', 1],
    ['case-folded fill', 'x="60" fill="none" FILL="#fff"', '', 1],
    ['repeated inline style', 'x="60" style="fill:none" style=""', '', 1],
    ['case-folded inline style', 'x="60" style="fill:none" STYLE=""', '', 1],
    ['repeated class', 'x="60" class="cover" class="solid"', '<style>.cover{fill:none}</style>', 1],
    ['repeated geometry', 'x="80" x="60"', '', 1],
    ['first opaque fill control', 'x="60" fill="#fff" fill="none"', '', 0],
    ['first empty style control', 'x="60" style="" style="fill:none"', '', 0],
  ]) await t.test(name, (t) => {
    const r = runHtml(t, css + source + cover(attrs));
    assert.equal(r.status, status, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    if (status) assert.ok(report.findings.some((f) => f.endpoint === 'end 70,20' && f.distance === 10), r.stdout);
    else assert.deepEqual(report.findings, []);
  });
  for (const [name, attrs] of [
    ['duplicate XML paint', 'x="60" fill="none" fill="#fff"'],
    ['duplicate XML metadata', 'x="60" data-note="one" data-note="two"'],
  ]) await t.test(name, (t) => {
    const r = run(t, source + cover(attrs));
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    assert.ok(report.findings.some((f) => /duplicate XML attribute/.test(f.nearest)), r.stdout);
  });
  await t.test('XML attribute keys differing in case remain distinct', (t) => {
    const r = run(t, source + cover('x="60" fill="#fff" FILL="none" data-note="one" DATA-NOTE="two"'));
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).findings, []);
  });
});

test('native HTML amendment supports XML and SVG self-closing elements and HTML ancestry', async (t) => {
  const drawing = boxes + '<line x1="30" y1="20" x2="80" y2="20"/>';
  for (const htmlInput of [false, true]) for (const tag of ['title', 'style']) {
    for (const [name, element] of [
      ['self-closing', '<' + tag + '/>'],
      ['explicit close control', '<' + tag + '></' + tag + '>'],
    ]) await t.test((htmlInput ? 'HTML SVG ' : 'XML ') + tag + ' ' + name, (t) => {
      const r = (htmlInput ? runHtml : run)(t, element + drawing);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
      assert.deepEqual(report.findings, []);
    });
  }
  const covered = '<style>:root{--card:#fff}.cover{fill:var(--card)}.clear{--card:transparent}</style><rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/><rect x="60" y="0" width="40" height="40" class="cover"/>';
  for (const attrs of ['class="clear"', 'class=clear ']) await t.test('HTML wrapper slash retains ' + attrs, (t) => {
    const r = runHtml(t, covered, (svg) => '<body><div ' + attrs + '/>' + svg + '</body>');
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    assert.ok(report.findings.some((f) => f.endpoint === 'end 70,20' && f.distance === 10), r.stdout);
  });
  for (const [name, wrap] of [
    ['HTML wrapper with explicit close', (svg) => '<body><div/>' + svg + '</div></body>'],
    ['HTML void element control', (svg) => '<body><br/>' + svg + '</body>'],
  ]) await t.test(name, (t) => {
    const r = runHtml(t, drawing, wrap);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).findings, []);
  });
});

test('native HTML amendment protects CSS quotes before rule boundaries', async (t) => {
  const drawing = boxes + '<line x1="30" y1="20" x2="80" y2="20"/>';
  for (const quote of ['"', "'"]) {
    for (const value of ['}', '{', '}{']) await t.test('unrelated quoted braces ' + quote + value, (t) => {
      const r = runHtml(t, '<style>div[data-note=' + quote + value + quote + ']{transform:translateX(1px)}</style>' + drawing);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
      assert.deepEqual(report.findings, []);
    });
    await t.test('quoted declaration retains later relevant transform ' + quote, (t) => {
      const r = runHtml(t, '<style>svg{content:' + quote + '}' + quote + ';transform:translateX(1px)}</style>' + drawing);
      assert.equal(r.status, 1, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
      assert.ok(report.findings.some((f) => /unsupported geometry from possible CSS/.test(f.nearest)), r.stdout);
    });
    await t.test('quoted declaration retains later measured font ' + quote, (t) => {
      const r = runHtml(t, '<style>text{content:' + quote + '{' + quote + ';font:10px sans-serif}</style><text x="0" y="20">test</text><line x1="26" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>');
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.deepEqual(JSON.parse(r.stdout).findings, []);
    });
    await t.test('escaped quote and brace remain in unrelated selector ' + quote, (t) => {
      const value = 'a\\' + quote + '}';
      const r = runHtml(t, '<style>div[data-note=' + quote + value + quote + ']{transform:translateX(1px)}</style>' + drawing);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.deepEqual(JSON.parse(r.stdout).findings, []);
    });
  }
});

test('native HTML amendment marks paragraph closure boundaries while allowing phrasing content', async (t) => {
  const covered = '<style>:root{--card:#fff}.cover{fill:var(--card)}</style><rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/><rect x="60" y="0" width="40" height="40" class="cover"/>';
  const paragraphClosingStarts = [
    'address', 'article', 'aside', 'blockquote', 'center', 'details', 'dialog', 'dir', 'div', 'dl',
    'fieldset', 'figcaption', 'figure', 'footer', 'header', 'hgroup', 'main', 'menu', 'nav', 'ol',
    'p', 'search', 'section', 'summary', 'ul', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'pre', 'listing', 'form', 'li', 'dd', 'dt', 'plaintext', 'table', 'hr', 'xmp',
  ];
  for (const tag of paragraphClosingStarts) await t.test('unmeasured paragraph close at ' + tag, (t) => {
    const r = runHtml(t, covered, (svg) => '<body><p><' + tag + '>' + svg + (tag === 'hr' ? '' : '</' + tag + '>') + '</p></body>');
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.ok(report.findings.some((f) => /unmeasured HTML context/.test(f.nearest)), r.stdout);
  });
  for (const tag of ['span', 'em', 'strong', 'a', 'code', 'br', 'img', '']) await t.test('valid phrasing control ' + (tag || 'direct SVG'), (t) => {
    const voidElement = tag === 'br' || tag === 'img';
    const r = runHtml(t, covered, (svg) => '<body><p>' + (tag ? '<' + tag + '>' : '') + svg + (tag && !voidElement ? '</' + tag + '>' : '') + '</p></body>');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    assert.deepEqual(report.findings, []);
  });
});

test('native CSS quoted strings share actual declaration and font measurement', async (t) => {
  const crossing = boxes + '<text x="45" y="25">test</text><line x1="30" y1="20" x2="80" y2="20"/>';
  const clear = '<text x="0" y="20">test</text><line x1="26" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>';
  const covered = '<rect x="0" y="0" width="20" height="40"/><line x1="20" y1="20" x2="70" y2="20"/><rect x="60" y="0" width="40" height="40" class="cover"/>';
  for (const quote of ['"', "'"]) {
    for (const [name, css, body, status, diagnostic] of [
      ['unused fake font', 'text{--note:' + quote + '};font:1px sans-serif' + quote + ';font:10px sans-serif}', crossing, 1, /text "test"/],
      ['unused fake font longhands', 'text{--note:' + quote + '};font-size:1px;font-family:monospace' + quote + ';font-size:10px;font-family:sans-serif}', crossing, 1, /text "test"/],
      ['unused fake paint', '.cover{--note:' + quote + '};fill:none' + quote + ';fill:#fff}', covered, 0, null],
      ['quoted font name keeps generic shorthand fallback', 'text{font:10px ' + quote + 'Mono; font:1px monospace' + quote + ', sans-serif}', clear, 0, null],
      ['quoted font name cannot override actual longhand size', 'text{font-family:' + quote + 'fake; font:1px monospace' + quote + ', sans-serif;font-size:10px}', crossing, 1, /text "test"/],
      ['sole quoted longhand family is explicitly unmeasured', 'text{font-size:10px;font-family:' + quote + 'Arial' + quote + '}', clear, 1, /unmeasured quoted font family/],
      ['sole quoted shorthand family is explicitly unmeasured', 'text{font:10px ' + quote + 'Arial' + quote + '}', clear, 1, /unmeasured quoted font family/],
    ]) await t.test(name + ' ' + quote, (t) => {
      const r = runHtml(t, '<style>' + css + '</style>' + body);
      assert.equal(r.status, status, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
      if (diagnostic) assert.ok(report.findings.some((f) => diagnostic.test(f.nearest)), r.stdout);
      else assert.deepEqual(report.findings, []);
    });
    const entity = quote === '"' ? '&quot;' : '&apos;';
    for (const [name, tail, status] of [
      ['unused inline transform string', '', 0],
      ['actual inline transform control', ';transform:translateX(1px)', 1],
    ]) await t.test(name + ' ' + quote, (t) => {
      const style = '--note:' + entity + '};transform:translateX(1px)' + entity + tail;
      const r = runHtml(t, boxes + '<line x1="30" y1="20" x2="80" y2="20" style="' + style + '"/>');
      assert.equal(r.status, status, r.stdout + r.stderr);
      const report = JSON.parse(r.stdout);
      assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
      if (status) assert.ok(report.findings.some((f) => /unsupported geometry/.test(f.nearest)), r.stdout);
      else assert.deepEqual(report.findings, []);
    });
  }
  for (const [name, css, body, status] of [
    ['plain shorthand control', 'font:10px sans-serif', crossing, 1],
    ['quoted family with generic fallback control', 'font-size:10px;font-family:"Arial",sans-serif', clear, 0],
    ['later shorthand supplies actual size', 'font-size:1px;font:10px sans-serif', crossing, 1],
    ['later longhand supplies actual size', 'font:1px sans-serif;font-size:10px', crossing, 1],
  ]) await t.test(name, (t) => {
    const r = runHtml(t, '<style>text{' + css + '}</style>' + body);
    assert.equal(r.status, status, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    if (status) assert.ok(report.findings.some((f) => f.nearest === 'text "test"'), r.stdout);
    else assert.deepEqual(report.findings, []);
  });
});

test('native CSS quoted comment spans keep actual declarations', async (t) => {
  const crossing = boxes + '<text x="45" y="25">test</text><line x1="30" y1="20" x2="80" y2="20"/>';
  for (const quote of ['"', "'"]) await t.test('unused quoted comment tokens ' + quote, (t) => {
    const css = 'text{font:1px sans-serif;--open:' + quote + '/*' + quote + ';font:10px sans-serif;--close:' + quote + '*/' + quote + '}';
    const r = runHtml(t, '<style>' + css + '</style>' + crossing);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    assert.ok(report.findings.some((f) => f.nearest === 'text "test"'), r.stdout);
  });
});

test('native CSS present unmeasurable font sizes report uncertainty', async (t) => {
  const crossing = boxes + '<text x="45" y="40">test</text><line x1="30" y1="20" x2="80" y2="20"/>';
  for (const [name, declaration] of [
    ['later double-quoted size', 'font-size:"1px"'],
    ['later single-quoted size', "font-size:'1px'"],
    ['unsupported unit', 'font-size:1em'],
    ['calc px substring', 'font-size:calc(30px)'],
    ['var fallback px substring', 'font-size:var(--size, 30px)'],
    ['shorthand calc px substring', 'font:calc(30px) sans-serif'],
    ['shorthand var px substring', 'font:var(--size, 30px) sans-serif'],
    ['quoted shorthand size', 'font:"30px" sans-serif'],
  ]) await t.test(name, (t) => {
    const r = runHtml(t, '<style>text{font-size:30px;' + declaration + ';font-family:sans-serif}</style>' + crossing);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    assert.ok(report.findings.some((f) => /unmeasured font size/.test(f.nearest)), r.stdout);
  });
  await t.test('weighted shorthand and line height remain measured', (t) => {
    const body = '<style>text{font:400 10px/1.2 "Arial",sans-serif}</style><text x="0" y="20">test</text><line x1="26" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>';
    const r = runHtml(t, body);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).findings, []);
  });
  await t.test('supported important size remains measured', (t) => {
    const r = runHtml(t, '<style>text{font-size:30px !important;font-family:sans-serif}</style>' + crossing);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.ok(report.findings.some((f) => f.nearest === 'text "test"'), r.stdout);
    assert.ok(report.findings.every((f) => !/unmeasured font size/.test(f.nearest)), r.stdout);
  });
});

test('native CSS nested values cannot supply fake declarations', async (t) => {
  const crossing = boxes + '<text x="45" y="25">test</text><line x1="30" y1="20" x2="80" y2="20"/>';
  for (const [name, value] of [
    ['function semicolon', 'func(;font:1px monospace)'],
    ['nested function semicolon', 'func(inner(;font:1px monospace))'],
    ['bracket semicolon', '[;font:1px monospace]'],
    ['quoted closer inside function', 'func(")";font:1px monospace)'],
  ]) await t.test(name, (t) => {
    const r = runHtml(t, '<style>text{font:10px sans-serif;--note:' + value + '}</style>' + crossing);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    assert.ok(report.findings.some((f) => f.nearest === 'text "test"'), r.stdout);
    assert.ok(report.findings.every((f) => !/unmeasured/.test(f.nearest)), r.stdout);
  });
  await t.test('unused function-valued custom property stays inactive', (t) => {
    const r = runHtml(t, '<style>text{font:10px sans-serif;--note:func(;font:1px monospace)}</style><text x="0" y="20">test</text><line x1="26" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).findings, []);
  });
  for (const [name, tail, status] of [
    ['unused nested inline transform', '', 0],
    ['real inline transform after nested value', ';transform:translateX(1px)', 1],
  ]) await t.test(name, (t) => {
    const r = runHtml(t, boxes + '<line x1="30" y1="20" x2="80" y2="20" style="--note:func(;transform:translateX(1px))' + tail + '"/>');
    assert.equal(r.status, status, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    if (status) assert.ok(report.findings.some((f) => /unsupported geometry/.test(f.nearest)), r.stdout);
    else assert.deepEqual(report.findings, []);
  });
});

test('native CSS stray closers retain later declarations', async (t) => {
  for (const closer of [')', ']']) await t.test('stray ' + closer + ' before inline transform', (t) => {
    const r = runHtml(t, boxes + '<line x1="30" y1="20" x2="80" y2="20" style="--note:' + closer + ';transform:translateX(1px)"/>');
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    assert.ok(report.findings.some((f) => /unsupported geometry from possible CSS/.test(f.nearest)), r.stdout);
  });
});

test('native CSS font priority conflicts report uncertainty', async (t) => {
  const crossing = boxes + '<text x="45" y="40">test</text><line x1="30" y1="20" x2="80" y2="20"/>';
  const clear = '<text x="0" y="20">test</text><line x1="26" y1="20" x2="80" y2="20"/><rect x="80" y="0" width="30" height="40"/>';
  for (const [name, css] of [
    ['important size before ordinary size', 'font-size:30px !important;font-size:1px;font-family:sans-serif'],
    ['important shorthand before ordinary size', 'font:30px sans-serif !important;font-size:1px'],
    ['important size before ordinary shorthand', 'font-size:30px !important;font:1px monospace'],
    ['important family before ordinary family', 'font-size:30px;font-family:monospace !important;font-family:sans-serif'],
    ['important shorthand before ordinary family', 'font:30px monospace !important;font-family:sans-serif'],
    ['important family before ordinary shorthand', 'font-family:monospace !important;font:1px sans-serif'],
  ]) await t.test(name, (t) => {
    const r = runHtml(t, '<style>text{' + css + '}</style>' + crossing);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    assert.ok(report.findings.some((f) => /unmeasured font priority/.test(f.nearest)), r.stdout);
  });
  for (const [name, css, body, status] of [
    ['later ordinary size remains effective', 'font-size:30px;font-size:1px;font-family:sans-serif', crossing, 0],
    ['later important size remains effective', 'font-size:1px;font-size:30px !important;font-family:sans-serif', crossing, 1],
    ['later equally important size remains effective', 'font-size:30px !important;font-size:1px !important;font-family:sans-serif', crossing, 0],
    ['single important size and separate family stay measured', 'font-size:10px !important;font-family:sans-serif', clear, 0],
    ['single important family and separate size stay measured', 'font-family:sans-serif !important;font-size:10px', clear, 0],
    ['later important family stays measured', 'font-family:monospace;font-family:sans-serif !important;font-size:10px', clear, 0],
  ]) await t.test(name, (t) => {
    const r = runHtml(t, '<style>text{' + css + '}</style>' + body);
    assert.equal(r.status, status, r.stdout + r.stderr);
    const report = JSON.parse(r.stdout);
    assert.deepEqual(report.figures, [{ figure: 'fixture', connectors: 1 }]);
    assert.ok(report.findings.every((f) => !/unmeasured/.test(f.nearest)), r.stdout);
    if (status) assert.ok(report.findings.some((f) => f.nearest === 'text "test"'), r.stdout);
    else assert.deepEqual(report.findings, []);
  });
});
