import { request } from 'undici';

async function main() {
  const res = await request(
    'https://www.tel-aviv.gov.il/_CONTROLTEMPLATES/15/TlvSP2013PublicSite/TablesWP/tables.js?rev=8.12.7.1',
    { headers: { 'user-agent': 'InvenFlow-Michrazim/0.1' } },
  );
  const t = await res.body.text();
  const idx = t.indexOf('GetTables');
  console.log(t.slice(idx - 500, idx + 2000));
}

main();
