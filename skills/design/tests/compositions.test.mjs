import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { shortlist } from '../scripts/compositions.mjs';

const card = (id, overrides = {}) => ({
  type: 'Composition Reference', id, title: id, description: 'A composition observation', surface: 'marketing',
  sectors: ['culture'], tones: ['editorial'], roles: ['hero'], requiredAssets: [], contentNeeds: ['short-statement'], tags: ['type'],
  sources: [{ id: 'direction', sourceId: 'taste-skill', resource: 'https://example.org/source', title: 'Source', source_kind: 'upstream-record', access_note: 'Reference observation' }],
  preview: { path: `knowledge/taste/compositions/previews/${id}.svg`, creator: 'Library', provenance: 'Local schematic', usageRestrictions: 'No site image rights' },
  assessment: { kind: 'reference-observation', evidence: 'https://example.org/source', limitations: ['Not project qualification'] },
  path: `knowledge/taste/compositions/${id}.md`, contentHash: 'a'.repeat(64), ...overrides,
});
const query = (overrides = {}) => ({ task: 'An exhibition homepage', surface: 'marketing', sector: 'culture', tone: 'editorial', roles: ['hero'], have: [], contentNeeds: ['short-statement'], constraints: { authority: 'DESIGN.md', keep: ['typography', 'palette'], avoidIds: [] }, ...overrides });
const sources = { positions: [{id:'selective-reference',lane:'gap'}, {id:'hold',lane:'not'}], sources: [{id:'taste-skill',name:'Taste',proposed_position:'selective-reference',review:{status:'open'}}] };

test('shortlist excludes infeasible photographs and app grammar while retaining stable attributed references', () => {
  const index = {schemaVersion:1,cards:[card('z-name'),card('photo-led',{requiredAssets:['photos']}),card('a-name'),card('app-screen',{surface:'app'})]};
  const result = shortlist(index, query(), sources);
  assert.deepEqual(result.matches.map(m=>m.id), ['a-name','z-name']);
  assert.deepEqual(result.query.constraints.keep, ['typography','palette']);
  assert.equal(result.matches[0].sources[0].sourceId,'taste-skill');
  assert.equal(result.matches[0].sourceStatus[0].review.status,'open');
  assert.equal(result.matches[0].assessment.kind,'reference-observation');
  assert.ok(result.unmatchedReasons.some(r=>r.id==='photo-led' && r.reasons.some(x=>x.includes('photos'))));
  assert.ok(result.unmatchedReasons.some(r=>r.id==='app-screen'));
  assert.deepEqual(shortlist(index,query(),sources),result);
});

test('the public helper bounds results and diagnoses invalid input without widening feasibility', () => {
  const index={schemaVersion:1,cards:['e','c','a','d','b'].map(id=>card(id))};
  assert.deepEqual(shortlist(index,query(),sources).matches.map(m=>m.id),['a','b','c']);
  assert.equal(shortlist(index,query({limit:5}),sources).matches.length,5);
  for (const limit of [0,6,'3',2.5]) assert.throws(()=>shortlist(index,query({limit}),sources),/limit/i);
  assert.throws(()=>shortlist(index,query({surface:'poster'}),sources),/surface/i);
  assert.throws(()=>shortlist(index,query({have:'photos'}),sources),/have/i);
  assert.throws(()=>shortlist(index,query({constraints:{keep:[],avoidIds:[]}}),sources),/authority/i);
  assert.throws(()=>shortlist({schemaVersion:1,cards:[card('a'),card('a')]},query(),sources),/duplicate/i);
});

test('an unresolved source position is a malformed catalogue, never a silent qualification', () => {
  const index={schemaVersion:1,cards:[card('a-name')]};
  const source=lane=>({positions:[{id:'reference',lane}],sources:[{id:'taste-skill',name:'Taste',proposed_position:'reference',review:{status:'open'}}]});
  const unresolved={positions:[{id:'selective-reference',lane:'gap'}],sources:[{id:'taste-skill',name:'Taste',proposed_position:'hold',review:{status:'open'}}]};
  assert.throws(()=>shortlist(index,query(),unresolved),/position/i);
  assert.throws(()=>shortlist(index,query(),unresolved),/taste-skill/);
  for (const lane of ['in','try','gap']) assert.deepEqual(shortlist(index,query(),source(lane)).matches.map(m=>m.id),['a-name']);
  assert.deepEqual(shortlist(index,query(),source('not')).matches,[]);
});

test('CLI lookup joins current holds, reads selected notes progressively and preserves every prior byte', t => {
  const root=mkdtempSync(path.join(tmpdir(),'composition-lookup-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const previews=path.join(root,'knowledge/taste/compositions/previews');
  mkdirSync(previews,{recursive:true}); mkdirSync(path.join(root,'catalogue'));
  const cards=['a-name','z-name'].map(id=>{
    const note=`# ${id}\n\nSource: https://example.org/source\n`;
    const summary=card(id,{contentHash:createHash('sha256').update(note).digest('hex')});
    writeFileSync(path.join(root,summary.path),note);
    writeFileSync(path.join(root,summary.preview.path),'<svg xmlns="http://www.w3.org/2000/svg"/>');
    return summary;
  });
  const indexPath=path.join(root,'catalogue/compositions.json');
  const sourcePath=path.join(root,'catalogue/sources.json');
  writeFileSync(indexPath,JSON.stringify({schemaVersion:1,cards}));
  writeFileSync(sourcePath,JSON.stringify(sources));
  const brief=path.join(root,'brief.json'); writeFileSync(brief,JSON.stringify(query()));
  const cli=fileURLToPath(new URL('../scripts/compositions.mjs',import.meta.url));
  const invoke=(...args)=>spawnSync(process.execPath,[cli,'--library',root,...args],{encoding:'utf8',env:{...process.env,CODEX_HOME:path.join(root,'fake-home')}});
  const bytes=dir=>Object.fromEntries(readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?Object.entries(bytes(path.join(dir,e.name))).map(([k,v])=>[`${e.name}/${k}`,v]):[[e.name,readFileSync(path.join(dir,e.name)).toString('base64')]]));
  const before=bytes(root);
  let result=invoke('--brief',brief);
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).matches.map(m=>m.id),['a-name','z-name']);
  assert.deepEqual(bytes(root),before);
  writeFileSync(sourcePath,JSON.stringify({...sources,sources:[{...sources.sources[0],proposed_position:'hold'}]}));
  result=invoke('--brief',brief);
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).matches.length,0);
  const malformed={positions:[{id:'selective-reference',lane:'gap'}],sources:[{id:'taste-skill',name:'Taste',proposed_position:'hold',review:{status:'open'}}]};
  writeFileSync(sourcePath,JSON.stringify(malformed));
  const beforeMalformed=bytes(root);
  result=invoke('--brief',brief);
  assert.equal(result.status,2);
  assert.match(result.stderr,/position/i);
  assert.deepEqual(bytes(root),beforeMalformed);
  writeFileSync(sourcePath,JSON.stringify(sources));
  writeFileSync(path.join(root,cards[1].path),'Changed without regenerating the index');
  result=invoke('--brief',brief);
  assert.equal(result.status,2);
  assert.match(result.stderr,/stale.*z-name|z-name.*stale/i);
  result=invoke('--show','a-name');
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/# a-name/);
  assert.match(result.stdout,/https:\/\/example.org\/source/);
  assert.equal(invoke('--show','absent').status,2);
  cards[0].path='../originals.md';
  writeFileSync(indexPath,JSON.stringify({schemaVersion:1,cards}));
  result=invoke('--show','a-name');
  assert.equal(result.status,2);
  assert.match(result.stderr,/path|escaped/i);
});
