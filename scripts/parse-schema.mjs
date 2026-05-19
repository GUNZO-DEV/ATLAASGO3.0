import { parse } from 'libpg-query';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

try {
  const result = await parse(sql);
  const stmts = Array.isArray(result) ? result : (result.stmts ?? Object.values(result));
  console.log(`✓ schema.sql parsed clean — ${stmts.length} top-level statements`);

  const summary = {};
  for (const s of stmts) {
    const stmt = s.stmt ?? s;
    const kind = Object.keys(stmt)[0];
    summary[kind] = (summary[kind] || 0) + 1;
  }
  console.log('Statement breakdown:');
  for (const [k, v] of Object.entries(summary).sort()) {
    console.log(`  ${k.padEnd(28)} ${v}`);
  }
} catch (e) {
  console.error('✗ parse error:', e.message);
  if (e.cursorpos != null) console.error('  at offset', e.cursorpos);
  process.exit(1);
}
