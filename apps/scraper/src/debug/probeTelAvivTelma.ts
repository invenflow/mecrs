import 'dotenv/config';
import { fetchHtml } from '../lib/htmlDetail';
import { request } from 'undici';

async function main() {
  const html = await fetchHtml('https://www.tel-aviv.gov.il/AuctionAndCareers/Pages/Service.aspx');

  const listIds = [...new Set(html.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi) ?? [])];
  console.log('all guids count:', listIds.length);

  const telma = [...html.matchAll(/telmaclient[^"'\s]*/gi)].map((m) => m[0]);
  console.log('telma refs:', [...new Set(telma)]);

  const dataSourceBlocks = [...html.matchAll(/dataSource[^;]{0,2000}/gi)];
  for (const m of dataSourceBlocks.slice(0, 3)) console.log('dataSource:', m[0].slice(0, 1500));

  // Extract ng-init or controller config with list ids
  const blocks = html.split('ListId');
  for (let i = 1; i < Math.min(blocks.length, 15); i++) {
    const chunk = 'ListId' + blocks[i].slice(0, 200);
    if (chunk.includes('63229773') || chunk.includes('מכרז') || chunk.includes('Service')) {
      console.log('chunk:', chunk);
    }
  }

  // Try telmaclient API
  const bases = [
    'https://telmaclientprd.tel-aviv.gov.il/',
    'https://telmaclientprd.tel-aviv.gov.il/api',
    'https://telmaclientprd.tel-aviv.gov.il/api/tenders',
    'https://telmaclientprd.tel-aviv.gov.il/api/auctions',
    'https://telmaclientprd.tel-aviv.gov.il/api/michrazim',
  ];
  for (const b of bases) {
    try {
      const res = await request(b, { headers: { 'user-agent': 'InvenFlow-Michrazim/0.1' } });
      const body = await res.body.text();
      console.log('\n', b, res.statusCode, body.slice(0, 500));
    } catch (e) {
      console.log(b, 'err', e);
    }
  }

  // Try SharePoint RenderListDataAsStream for AuctionAndCareers list
  const LIST = '63229773-ffac-4d47-9bb9-fde6614cd663';
  const WEB = 'c572b9ed-c977-4a07-a430-6445afe1daba';
  const streamUrl = `https://www.tel-aviv.gov.il/AuctionAndCareers/_api/web/lists(guid'${LIST}')/RenderListDataAsStream`;
  const res = await request(streamUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json;odata=verbose',
      'content-type': 'application/json;odata=verbose',
      'user-agent': 'InvenFlow-Michrazim/0.1',
    },
    body: JSON.stringify({
      parameters: {
        ViewXml: `<View><Query><OrderBy><FieldRef Name='Modified' Ascending='FALSE'/></OrderBy></Query><RowLimit>50</RowLimit></View>`,
      },
    }),
  });
  const streamBody = await res.body.text();
  console.log('\nRenderListDataAsStream', res.statusCode, streamBody.slice(0, 3000));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
