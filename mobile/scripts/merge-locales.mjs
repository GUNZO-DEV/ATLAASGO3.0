// Merge per-namespace translation partials (written by the i18n-rollout agents)
// into locales/{en,fr,ar}.json. Each partial is locales/_partials/<ns>.json with
// shape { en: {key:val}, fr: {...}, ar: {...} }. Deep-merges per namespace so
// existing keys (tabs, common, account base) are preserved. Idempotent.
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = join(mobileRoot, 'locales');
const partialsDir = join(localesDir, '_partials');
const LANGS = ['en', 'fr', 'ar'];

const base = {};
for (const l of LANGS) base[l] = JSON.parse(readFileSync(join(localesDir, `${l}.json`), 'utf8'));

let nsCount = 0;
let keyCount = 0;
const skipped = [];
for (const fn of readdirSync(partialsDir).sort()) {
  if (!fn.endsWith('.json')) continue;
  const ns = fn.replace(/\.json$/, '');
  let part;
  try {
    part = JSON.parse(readFileSync(join(partialsDir, fn), 'utf8'));
  } catch (e) {
    skipped.push(`${fn} (invalid JSON: ${e.message})`);
    continue;
  }
  nsCount++;
  keyCount += Object.keys(part.en || {}).length;
  for (const l of LANGS) base[l][ns] = { ...(base[l][ns] || {}), ...(part[l] || {}) };
}

for (const l of LANGS) writeFileSync(join(localesDir, `${l}.json`), JSON.stringify(base[l], null, 2) + '\n');

console.log(`Merged ${nsCount} namespaces, ${keyCount} keys → en/fr/ar.json`);
if (skipped.length) console.log(`SKIPPED: ${skipped.join('; ')}`);
