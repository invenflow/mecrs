import 'dotenv/config';
import { request } from 'undici';

async function fetchTables(viewId: string) {
  const body = {
    dataSource: {
      Fields: null,
      ItemdIds: [],
      ListContentTypes: ['מסמך', 'תיקיה'],
      ListId: '63229773-ffac-4d47-9bb9-fde6614cd663',
      SiteId: '24aa409e-01ed-482e-b0ed-1956972addb1',
      ViewId: viewId,
      WebId: 'c572b9ed-c977-4a07-a430-6445afe1daba',
    },
    dataSrcFullUrl: null,
    showTitle: true,
    title: 'ארכיון מכרזים',
    filters: [],
    isDigitel: false,
    isTitleOgen: false,
    itemPageUrl: null,
    maxColToShow: 4,
    rowPaging: 5,
    titleOgen: 'ארכיון מכרזים',
  };
  const res = await request('https://www.tel-aviv.gov.il/_vti_bin/TlvSP2013PublicSite/TlvList.svc/GetTables', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'InvenFlow-Michrazim/0.1' },
    body: JSON.stringify(body),
  });
  return JSON.parse(await res.body.text());
}

async function main() {
  const json = await fetchTables('3d5ca532-6896-4101-afc3-98199d58e9de');
  const item = json.items?.[0];
  console.log('archive first item fields with values:');
  for (const f of item?.Fields ?? []) {
    const v = String(f.Value ?? '').trim();
    if (v) console.log(f.InternalName, v.slice(0, 150));
  }
}

main();
