import 'dotenv/config';
import { request } from 'undici';

const tablesClient = {
  dataSource: {
    Fields: null,
    ItemdIds: [],
    ListContentTypes: ['מסמך', 'תיקיה'],
    ListId: '63229773-ffac-4d47-9bb9-fde6614cd663',
    SiteId: '24aa409e-01ed-482e-b0ed-1956972addb1',
    ViewId: '699c03e2-e570-404c-9cd9-bb041e986d41',
    WebId: 'c572b9ed-c977-4a07-a430-6445afe1daba',
  },
  dataSrcFullUrl: null,
  showTitle: true,
  title: 'רשימת מכרזים',
  filters: [],
  isDigitel: false,
  isTitleOgen: false,
  itemPageUrl: null,
  maxColToShow: 4,
  rowPaging: 100,
  titleOgen: 'רשימת מכרזים',
};

async function main() {
  const url = 'https://www.tel-aviv.gov.il/_vti_bin/TlvSP2013PublicSite/TlvList.svc/GetTables';
  const res = await request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)',
    },
    body: JSON.stringify(tablesClient),
  });
  const body = await res.body.text();
  console.log('status', res.statusCode, 'len', body.length);
  const json = JSON.parse(body);
  console.log('items count:', json.items?.length ?? 0);
  if (json.items?.[0]) {
    console.log('first item keys:', Object.keys(json.items[0]));
    console.log('first item fields:', json.items[0].Fields?.map((f: { InternalName: string; Value: string }) => ({
      name: f.InternalName,
      value: String(f.Value ?? '').slice(0, 120),
    })));
  }

  // Find publication date field names
  const fieldNames = new Set<string>();
  for (const item of json.items ?? []) {
    for (const f of item.Fields ?? []) fieldNames.add(f.InternalName);
  }
  console.log('all field names:', [...fieldNames].sort());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
