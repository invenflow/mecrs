import { request } from 'undici';

async function count(viewId: string, paging: number) {
  const body = {
    dataSource: {
      ListId: '63229773-ffac-4d47-9bb9-fde6614cd663',
      SiteId: '24aa409e-01ed-482e-b0ed-1956972addb1',
      ViewId: viewId,
      WebId: 'c572b9ed-c977-4a07-a430-6445afe1daba',
      ItemdIds: [],
      ListContentTypes: ['מסמך', 'תיקיה'],
      Fields: null,
    },
    rowPaging: paging,
    filters: [],
  };
  const r = await request('https://www.tel-aviv.gov.il/_vti_bin/TlvSP2013PublicSite/TlvList.svc/GetTables', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = JSON.parse(await r.body.text());
  const y2026 = (j.items ?? []).filter((i: { Fields: { InternalName: string; Value: string }[] }) =>
    String(i.Fields?.find((f) => f.InternalName === 'TenderID')?.Value ?? '').includes('/2026'),
  );
  console.log('view', viewId.slice(0, 8), 'total', j.items?.length ?? 0, '2026', y2026.length);
}

async function main() {
  await count('699c03e2-e570-404c-9cd9-bb041e986d41', 100);
  await count('3d5ca532-6896-4101-afc3-98199d58e9de', 500);
}

main();
