import { request } from 'undici';

async function main() {
  const res = await request(
    'https://www.tel-aviv.gov.il/_CONTROLTEMPLATES/15/TlvSP2013PublicSite/TablesWP/tables.js?rev=8.12.7.1',
    { headers: { 'user-agent': 'InvenFlow-Michrazim/0.1' } },
  );
  const t = await res.body.text();
  console.log('len', t.length);

  const keywords = ['api', 'ashx', 'asmx', 'GetList', 'RenderList', '_layouts', 'ListId', 'ViewId', 'dataSource', 'fetch', '$http', 'ajax'];
  for (const kw of keywords) {
    const idx = t.indexOf(kw);
    if (idx >= 0) console.log(`\n=== ${kw} at ${idx} ===\n`, t.slice(Math.max(0, idx - 100), idx + 400));
  }

  const urls = [...new Set(t.match(/\/[^'"\s]{5,120}/g) ?? [])].filter((u) =>
    /api|ashx|asmx|GetList|RenderList|inplview|Tables/i.test(u),
  );
  console.log('\nurls:', urls.slice(0, 40));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
