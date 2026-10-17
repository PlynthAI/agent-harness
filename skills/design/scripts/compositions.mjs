#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const text = value => typeof value==='string' && value.trim().length>0;
const list = value => Array.isArray(value) && value.every(text) && new Set(value).size===value.length;
const reviews = new Set(['open','shortlisted','adopted','approved','passed','refused']);

function validate(index, query, sources) {
  if (!text(query?.task)) throw new Error('Query task must describe the work');
  if (!['marketing','app','diagram'].includes(query.surface)) throw new Error('Query surface must be marketing, app or diagram');
  for (const field of ['roles','have','contentNeeds']) if (!list(query[field])) throw new Error(`Query ${field} must be a list of distinct strings`);
  for (const field of ['sector','tone']) if (query[field]!==undefined && !text(query[field])) throw new Error(`Query ${field} must be a string`);
  if (!text(query.constraints?.authority)) throw new Error('Query constraints.authority must name the project authority');
  for (const field of ['keep','avoidIds']) if (!list(query.constraints[field])) throw new Error(`Query constraints.${field} must be a list`);
  if (query.limit!==undefined && (!Number.isInteger(query.limit) || query.limit<1 || query.limit>5)) throw new Error('Query limit must be an integer from 1 to 5');
  if (index?.schemaVersion!==1 || !Array.isArray(index.cards)) throw new Error('Malformed composition index: expected schemaVersion 1 and cards');
  const ids=new Set();
  for (const card of index.cards) {
    if (!text(card.id) || ids.has(card.id)) throw new Error(`Invalid or duplicate composition id: ${card.id}`);
    ids.add(card.id);
    if (!['marketing','app','diagram'].includes(card.surface)) throw new Error(`Malformed surface for ${card.id}`);
    for (const field of ['roles','requiredAssets','contentNeeds','sectors','tones']) if (!list(card[field])) throw new Error(`Malformed ${field} for ${card.id}`);
    if (!Array.isArray(card.sources) || !card.sources.length || card.sources.some(s=>!text(s?.sourceId))) throw new Error(`Malformed sources for ${card.id}`);
    if (!text(card.assessment?.kind) || !list(card.assessment.limitations)) throw new Error(`Malformed assessment for ${card.id}`);
  }
  if (!Array.isArray(sources?.positions) || !Array.isArray(sources.sources)) throw new Error('Malformed sources catalogue');
  const lanes=new Set(['in','try','gap','not']);
  const laneOf=new Map();
  for (const position of sources.positions) {
    if (!text(position?.id) || laneOf.has(position.id) || !lanes.has(position.lane)) throw new Error(`Malformed or duplicate catalogue position: ${position?.id}`);
    laneOf.set(position.id, position.lane);
  }
  const seen=new Set();
  for (const source of sources.sources) {
    if (!text(source.id) || seen.has(source.id) || !reviews.has(source.review?.status)) throw new Error(`Malformed or duplicate catalogue source: ${source.id}`);
    if (!laneOf.has(source.proposed_position)) throw new Error(`Malformed source position for ${source.id}: ${source.proposed_position}`);
    seen.add(source.id);
  }
}

// Selective adaptation of Taste draw.mjs feasibility pools and source-card projection.
// See the harness root third-party notice for the source pin and local departures.
export function shortlist(index, query, sources) {
  validate(index, query, sources);
  const positions = new Map(sources.positions.map(p=>[p.id,p.lane]));
  const catalogue = new Map(sources.sources.map(s=>[s.id,s]));
  const matches = [], unmatchedReasons = [];
  for (const card of index.cards) {
    const reasons = [];
    const status = [...new Set(card.sources.map(s=>s.sourceId))].map(id=>{
      const source = catalogue.get(id);
      if (!source) throw new Error(`Missing catalogue source: ${id}`);
      return { sourceId: id, review: source.review, proposedPosition: source.proposed_position, lane: positions.get(source.proposed_position), itemQualification: 'not-established' };
    });
    if (card.surface !== query.surface) reasons.push(`Surface ${card.surface} does not match ${query.surface}`);
    for (const asset of card.requiredAssets) if (!query.have.includes(asset)) reasons.push(`Missing asset: ${asset}`);
    for (const content of card.contentNeeds) if (!query.contentNeeds.includes(content)) reasons.push(`Missing content: ${content}`);
    if (query.constraints.avoidIds.includes(card.id)) reasons.push('Excluded by project constraints');
    if (status.some(s=>s.lane==='not' || ['passed','refused'].includes(s.review.status))) reasons.push('Source held or declined by its catalogue owner');
    if (reasons.length) { unmatchedReasons.push({id:card.id,reasons}); continue; }
    const fitReasons = [`Surface: ${query.surface}`, ...card.roles.filter(r=>query.roles.includes(r)).map(r=>`Role: ${r}`),
      ...(card.sectors.includes(query.sector)?[`Sector: ${query.sector}`]:[]), ...(card.tones.includes(query.tone)?[`Tone: ${query.tone}`]:[]),
      ...card.contentNeeds.map(c=>`Available content: ${c}`)];
    matches.push({ id:card.id, title:card.title, path:card.path, preview:card.preview, sources:card.sources, sourceStatus:status, assessment:card.assessment,
      fitReasons, prerequisites:{assets:card.requiredAssets,content:card.contentNeeds}, limitations:card.assessment.limitations });
  }
  matches.sort((a,b)=>b.fitReasons.length-a.fitReasons.length || (a.id<b.id?-1:a.id>b.id?1:0));
  unmatchedReasons.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  return {query,indexHash:hash(JSON.stringify(index)),matches:matches.slice(0,query.limit??3),unmatchedReasons};
}

function ownedFile(root, relative, prefix, extension) {
  if (typeof relative!=='string' || !relative.startsWith(prefix) || /[\\:%?#]/.test(relative) || relative.split('/').some(p=>!p || p==='.' || p==='..') || !relative.endsWith(extension)) throw new Error(`Invalid or escaped reference path: ${relative}`);
  const file=path.resolve(root,relative);
  let resolved;
  try { resolved=realpathSync(file); }
  catch { throw new Error(`Missing reference; composition index is stale: ${relative}`); }
  const rel=path.relative(root,resolved);
  if (path.isAbsolute(rel) || rel==='..' || rel.startsWith(`..${path.sep}`) || !statSync(resolved).isFile()) throw new Error(`Escaped reference path: ${relative}`);
  return file;
}

function readCard(root, card) {
  const file=ownedFile(root,card.path,'knowledge/taste/compositions/','.md');
  const raw=readFileSync(file);
  if (!/^[a-f0-9]{64}$/.test(card.contentHash) || hash(raw)!==card.contentHash) throw new Error(`Composition index is stale for ${card.id}; regenerate it in the library`);
  ownedFile(root,card.preview?.path,'knowledge/taste/compositions/previews/','.svg');
  return raw.toString('utf8');
}

export function run(argv, {stdout=console.log, stderr=console.error}={}) {
  try {
    const args={};
    for (let i=0;i<argv.length;i+=2) {
      if (!['--library','--brief','--show'].includes(argv[i]) || args[argv[i]]!==undefined || !argv[i+1] || argv[i+1].startsWith('--')) throw new Error('Usage: compositions.mjs --library <resolved-root> --brief <query.json> | --show <card-id>');
      args[argv[i]]=argv[i+1];
    }
    if (!args['--library'] || Boolean(args['--brief'])===Boolean(args['--show'])) throw new Error('Supply --library and exactly one of --brief or --show');
    let root;
    try { root=realpathSync(path.resolve(args['--library'])); }
    catch { throw new Error(`Missing design library: ${args['--library']}; continue with the project authority`); }
    const index=JSON.parse(readFileSync(path.join(root,'catalogue/compositions.json'),'utf8'));
    const sources=JSON.parse(readFileSync(path.join(root,'catalogue/sources.json'),'utf8'));
    const query=args['--brief'] ? JSON.parse(readFileSync(args['--brief'],'utf8')) : {task:'Read selected reference',surface:'marketing',roles:[],have:[],contentNeeds:[],constraints:{authority:'Explicit reference retrieval',keep:[],avoidIds:[]}};
    validate(index,query,sources);
    if (args['--show']) {
      const card=index.cards.find(c=>c.id===args['--show']);
      if (!card) throw new Error(`Unknown composition id: ${args['--show']}`);
      stdout(readCard(root,card));
    } else {
      for (const card of index.cards) readCard(root,card);
      stdout(JSON.stringify(shortlist(index,query,sources),null,2));
    }
    return 0;
  } catch (error) { stderr(error.message); return 2; }
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) process.exitCode=run(process.argv.slice(2));
