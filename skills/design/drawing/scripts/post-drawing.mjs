#!/usr/bin/env node
// Stateless reminder. It reads the tool payload and its own requirements only.
import { readFileSync } from 'node:fs';

const requirements = () => readFileSync(new URL('../references/post-drawing.md', import.meta.url), 'utf8').trim();
if (process.argv[2] === '--complete') {
  process.stdout.write(requirements() + '\n');
  process.exit(0);
}

let payload;
try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
if (payload?.hook_event_name !== 'PostToolUse' || payload.tool_response?.isError === true || payload.tool_response?.success === false) process.exit(0);

const text = value => typeof value === 'string' ? value : '';
const svg = value => /<svg(?:\s|\/?>)/i.test(text(value))
  || /<(?:path|circle|ellipse|rect|line|polyline|polygon|g|text|tspan|use)(?:\s|\/?>)/.test(text(value));
const drawingEdit = (file, changed) => /\.svg$/i.test(text(file)) || (/\.(?:html?|astro|[jt]sx|vue|svelte)$/i.test(text(file)) && svg(changed));
const input = payload.tool_input;
let relevant = false;
if (payload.tool_name === 'Write' || payload.tool_name === 'Edit') {
  relevant = drawingEdit(input?.file_path, [input?.content, input?.old_string, input?.new_string].map(text).join('\n'));
} else if (payload.tool_name === 'apply_patch') {
  const patch = text(input) || text(input?.patch) || text(input?.command);
  let file = '';
  let changed = '';
  for (const line of patch.split(/\r?\n/)) {
    if (file && line.startsWith('*** Move to: ')) {
      relevant ||= drawingEdit(file, changed);
      file = line.slice('*** Move to: '.length);
    } else if (line.startsWith('*** ')) {
      relevant ||= drawingEdit(file, changed);
      file = /^\*\*\* (?:Add|Update) File: (.+)$/.exec(line)?.[1] ?? '';
      changed = '';
    } else if (/^[+-]/.test(line)) changed += line.slice(1) + '\n';
  }
  relevant ||= drawingEdit(file, changed);
} else if (/^mcp__drawing_tools__(?:get_render|check|snapshot)$/.test(payload.tool_name)) {
  const response = payload.tool_response;
  let result = response?.structuredContent;
  if (!result && Array.isArray(response?.content)) {
    try { result = JSON.parse(response.content.find(block => block?.type === 'text')?.text); } catch { /* Unconfirmed results stay quiet. */ }
  }
  if (typeof input?.jobId === 'string' && input.jobId && result?.jobId === input.jobId) {
    if (payload.tool_name.endsWith('__get_render')) relevant = result.state === 'done';
    if (payload.tool_name.endsWith('__check')) relevant = ['findings', 'checks', 'unchecked'].every(key => Array.isArray(result[key]));
    if (payload.tool_name.endsWith('__snapshot')) relevant = ['still', 'sheet'].includes(result.kind) && result.image?.mimeType === 'image/png' && ['width', 'height', 'bytes'].every(key => Number.isFinite(result.image[key]) && result.image[key] > 0);
  }
}
if (!relevant) process.exit(0);
let additionalContext;
try { additionalContext = requirements(); } catch (error) {
  console.error(`Post-drawing requirements unavailable: ${error.message}`);
  process.exit(1);
}
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext } }));
