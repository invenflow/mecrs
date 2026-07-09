import 'dotenv/config';
import { createSupabaseAdminClient } from '../lib/supabaseAdmin';
import { buildBudgetkeyDescription } from '../lib/budgetkeyDescription';

const BUDGETKEY_SOURCES = new Set([
  'budgetkey',
  'budgetkey_muni',
  'budgetkey_mof',
  'budgetkey_mr_gov',
]);

async function main() {
  const supabase = createSupabaseAdminClient();
  const pageSize = 200;
  let from = 0;
  let updated = 0;
  let scanned = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('tenders')
      .select('id,source,title,description,raw_data')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      scanned += 1;
      if (!BUDGETKEY_SOURCES.has(row.source)) continue;
      const raw = (row.raw_data ?? {}) as Record<string, any>;
      if (!raw || typeof raw !== 'object') continue;

      const next = buildBudgetkeyDescription(raw, row.title);
      if (!next || next === row.description) continue;

      const { error: upErr } = await supabase
        .from('tenders')
        .update({ description: next, last_updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (upErr) throw upErr;
      updated += 1;
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(JSON.stringify({ action: 'backfill_descriptions', scanned, updated }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
