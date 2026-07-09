import 'dotenv/config';
import { request } from 'undici';

async function search(querytext: string) {
  const url = new URL('https://www.tel-aviv.gov.il/_api/search/query');
  url.searchParams.set('querytext', querytext);
  url.searchParams.set('rowlimit', '50');

  const res = await request(url, {
    headers: {
      accept: 'application/json;odata=verbose',
      'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)',
    },
  });
  const body = await res.body.text();
  console.log('query', querytext, 'status', res.statusCode, 'len', body.length);
  console.log(body.slice(0, 4000));
}

async function main() {
  await search("'מכרז'");
  await search("'Path:https://www.tel-aviv.gov.il/Transparency* מכרז'");
  await search("'Path:https://www.tel-aviv.gov.il/AuctionAndCareers*'");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
