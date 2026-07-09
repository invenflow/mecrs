import { request } from 'undici';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const res = await request(
    'https://www.tel-aviv.gov.il/_CONTROLTEMPLATES/15/TlvSP2013PublicSite/TablesWP/tables.js?rev=8.12.7.1',
    { headers: { 'user-agent': 'InvenFlow-Michrazim/0.1' } },
  );
  const t = await res.body.text();
  const out = join(import.meta.dirname, 'tables.js');
  writeFileSync(out, t);

  const idx = t.indexOf('tab.getContent');
  console.log(t.slice(idx, idx + 6000));
}

main();
