/**
 * Static cross-check: does the orders INSERT in src/lib/orders.ts include
 * every required column from supabase/schema.sql? Are there typos?
 */
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const client = readFileSync(new URL('../src/lib/orders.ts', import.meta.url), 'utf8');

// Pull column names from `create table if not exists public.orders ( ... )`.
const tableMatch = schema.match(/create table if not exists public\.orders\s*\(([\s\S]+?)\);/);
if (!tableMatch) throw new Error('Could not find orders DDL');

const SCHEMA_COLS = new Map();
const HAS_DEFAULT = new Set();
const NULLABLE = new Set();
for (const raw of tableMatch[1].split('\n')) {
  const line = raw.trim().replace(/,$/, '');
  if (!line || /^constraint\b/i.test(line)) continue;
  const colMatch = line.match(/^([a-z_][a-z0-9_]*)\s+([a-z_0-9()\.]+)/i);
  if (!colMatch) continue;
  const [, name] = colMatch;
  SCHEMA_COLS.set(name, line);
  if (/\bdefault\b/i.test(line)) HAS_DEFAULT.add(name);
  if (!/\bnot null\b/i.test(line)) NULLABLE.add(name);
}

// Locate `.insert({ ... })` and walk its content with brace tracking, so we
// only capture top-level keys, not keys inside nested objects like
// `driver_payload: { headerLandmark, coords }`.
const insertStart = client.indexOf('.insert({');
if (insertStart < 0) throw new Error('Could not locate .insert({ in orders.ts');
let i = insertStart + '.insert('.length;
let depth = 0;
const buf = [];
for (; i < client.length; i++) {
  const c = client[i];
  if (c === '{') depth++;
  buf.push(c);
  if (c === '}') {
    depth--;
    if (depth === 0) break;
  }
}
const payload = buf.join('');

// Now extract keys at depth == 1 only.
depth = 0;
let lineStart = true;
const topLevelKeys = new Set();
let cursor = 1; // skip opening {
while (cursor < payload.length - 1) {
  const c = payload[cursor];
  if (c === '{') depth++;
  else if (c === '}') depth--;
  else if (lineStart && depth === 0) {
    const slice = payload.slice(cursor);
    const m = slice.match(/^\s*([a-z_][a-z0-9_]*)\s*:/);
    if (m) topLevelKeys.add(m[1]);
  }
  lineStart = c === '\n' || c === ',';
  cursor++;
}

console.log('schema columns:', SCHEMA_COLS.size);
console.log('insert top-level keys:', [...topLevelKeys].join(', '));
console.log('');

let issues = 0;
const required = [...SCHEMA_COLS.keys()].filter(
  (c) => !NULLABLE.has(c) && !HAS_DEFAULT.has(c),
);
for (const col of required) {
  if (!topLevelKeys.has(col)) {
    console.log(`✗ schema requires '${col}' but INSERT payload doesn't include it`);
    issues++;
  }
}
for (const k of topLevelKeys) {
  if (!SCHEMA_COLS.has(k)) {
    console.log(`✗ INSERT sends '${k}' but no such column in schema`);
    issues++;
  }
}

if (issues === 0) {
  console.log('✓ INSERT payload matches schema');
  console.log('  required (NOT NULL, no default):', required.join(', '));
  const optionalSent = [...topLevelKeys].filter((k) => NULLABLE.has(k) || HAS_DEFAULT.has(k));
  if (optionalSent.length) console.log('  optional sent:', optionalSent.join(', '));
} else {
  process.exit(1);
}
