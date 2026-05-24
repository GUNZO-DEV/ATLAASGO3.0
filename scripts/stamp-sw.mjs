#!/usr/bin/env node
/**
 * stamp-sw.mjs — stamps the service worker cache version with a unique
 * build hash so every deploy busts the SW cache automatically.
 * Runs after `vite build`, before `wrangler pages deploy`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const swPath = resolve('dist', 'sw.js');
const sw = readFileSync(swPath, 'utf8');

// Hash based on the index.html content (changes every build due to asset hashes)
const indexHtml = readFileSync(resolve('dist', 'index.html'), 'utf8');
const buildHash = createHash('md5').update(indexHtml).digest('hex').slice(0, 8);

const stamped = sw.replace(
  /const CACHE = '[^']+'/,
  `const CACHE = 'atlaasgo-${buildHash}'`,
);

writeFileSync(swPath, stamped);
console.log(`[stamp-sw] Cache version: atlaasgo-${buildHash}`);
