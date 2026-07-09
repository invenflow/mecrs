import 'dotenv/config';
import { request } from 'undici';

async function main() {
  const res = await request('https://www.tel-aviv.gov.il/_vti_bin/TlvSP2013PublicSite/TlvList.svc/GetTables', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'InvenFlow-Michrazim/0.1' },
    body: JSON.stringify({
      dataSource: {
        Fields: null,
        ItemdIds: [],
        ListContentTypes: ['מסמך', 'תיקיה'],
        ListId: '63229773-ffac-4d47-9bb9-fde6614cd663',
        SiteId: '24aa409e-01ed-482e-b0ed-1956972addb1',
        ViewId: '699c03e2-e570-404c-9cd9-bb041e986d41',
        WebId: 'c572b9ed-c977-4a07-a430-6445afe1daba',
      },
      rowPaging: 100,
      filters: [],
      isDigitel: false,
    }),
  });
  const json = JSON.parse(await res.body.text());
  console.log(JSON.stringify(json.items[0], null, 2).slice(0, 3000));
}

main();
