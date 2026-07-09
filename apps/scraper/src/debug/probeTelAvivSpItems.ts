import { request } from 'undici';

async function fetchWithRedirect(url: string) {
  let current = url;
  for (let i = 0; i < 5; i++) {
    const res = await request(current, {
      headers: {
        accept: 'application/json;odata=verbose',
        'user-agent': 'InvenFlow-Michrazim/0.1',
      },
    });
    if (res.statusCode >= 300 && res.statusCode < 400) {
      const loc = res.headers.location;
      if (!loc) break;
      current = String(loc).startsWith('http') ? String(loc) : `https://www.tel-aviv.gov.il${loc}`;
      continue;
    }
    const body = await res.body.text();
    console.log(current, res.statusCode, body.slice(0, 2000));
    return;
  }
}

async function main() {
  const LIST = '63229773-ffac-4d47-9bb9-fde6614cd663';
  await fetchWithRedirect(
    `https://www.tel-aviv.gov.il/AuctionAndCareers/_api/web/lists(guid'${LIST}')/items?$top=3&$select=Id,Title,Created,Modified,FileLeafRef&$orderby=Modified desc`,
  );
}

main();
