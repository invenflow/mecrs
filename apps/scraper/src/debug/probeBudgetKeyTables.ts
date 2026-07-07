import { request } from 'undici';

const candidates = [
  'tenders',
  'tenders_data',
  'tender_data',
  'tender',
  'tender_items',
  'procurement_tenders',
  'mof_tenders',
  'tenders_mr_gov',
  'tenders__mr_gov',
  'budgetkey_tenders',
];

async function exists(table: string) {
  const sql = `SELECT 1 FROM ${table} LIMIT 1`;
  const url = `https://next.obudget.org/api/query?query=${encodeURIComponent(sql)}`;
  const res = await request(url);
  const txt = await res.body.text();
  return res.statusCode === 200 && !txt.includes('UndefinedTable');
}

async function main() {
  for (const t of candidates) {
    const ok = await exists(t);
    console.log(t, ok ? 'OK' : 'NO');
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

