import 'dotenv/config';
import { request } from 'undici';

const LIST_ID = '81e17809-311d-4bba-9bf1-2363bb9debcd';
const BASE = 'https://www.tel-aviv.gov.il/Transparency';

async function fetchJson(url: string) {
  let current = url;
  for (let i = 0; i < 5; i++) {
    const res = await request(current, {
      headers: {
        accept: 'application/json;odata=verbose',
        'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)',
      },
    });
    if (res.statusCode >= 300 && res.statusCode < 400) {
      const loc = res.headers.location;
      if (!loc) break;
      current = loc.startsWith('http') ? loc : `https://www.tel-aviv.gov.il${loc}`;
      continue;
    }
    const body = await res.body.text();
    console.log('status', res.statusCode, 'url', current, 'len', body.length);
    console.log(body.slice(0, 3000));
    return;
  }
}

async function main() {
  await fetchJson(
    `${BASE}/_api/web/lists(guid'${LIST_ID}')/items?$top=5&$orderby=Modified desc`,
  );
  await fetchJson(`${BASE}/_api/web/lists(guid'${LIST_ID}')`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
