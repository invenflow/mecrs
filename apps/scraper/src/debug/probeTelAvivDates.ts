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
  const res = await request('https://www.tel-aviv.gov.il/_vti_bin/TlvSP2013PublicSite/TlvList.svc/GetTables', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'InvenFlow-Michrazim/0.1' },
    body: JSON.stringify(tablesClient),
  });
  const json = JSON.parse(await res.body.text());

  for (const item of json.items ?? []) {
    const fields = Object.fromEntries((item.Fields ?? []).map((f: { InternalName: string; Value: string }) => [f.InternalName, f.Value]));
    console.log('\n---', fields.TenderID, fields.LinkFilename?.slice(0, 80));
    for (const [k, v] of Object.entries(fields)) {
      const sv = String(v ?? '');
      if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(sv) || /פרסום|תאריך|מועד/i.test(k)) {
        console.log(k, sv.slice(0, 120));
      }
    }
  }

  // Also try archive view
  const archive = { ...tablesClient, dataSource: { ...tablesClient.dataSource, ViewId: '3d5ca532-6896-4101-afc3-98199d58e9de' } };
  const res2 = await request('https://www.tel-aviv.gov.il/_vti_bin/TlvSP2013PublicSite/TlvList.svc/GetTables', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'InvenFlow-Michrazim/0.1' },
    body: JSON.stringify(archive),
  });
  const json2 = JSON.parse(await res2.body.text());
  console.log('\narchive items:', json2.items?.length ?? 0);
}

main();
