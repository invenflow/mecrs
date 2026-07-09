import 'dotenv/config';
import { fetchHtml } from '../lib/htmlDetail';

async function main() {
  const html = await fetchHtml('https://www.tel-aviv.gov.il/Transparency/Pages/Bids.aspx');
  const listId = '81e17809-311d-4bba-9bf1-2363bb9debcd';
  const idx = html.indexOf(listId);
  console.log('listId index:', idx);
  if (idx >= 0) console.log(html.slice(Math.max(0, idx - 500), idx + 1500));

  const patterns = ['RenderListDataAsStream', 'GetListItems', 'inplview', 'ListView', 'wpq', 'CSR', 'SearchQuery', 'querytext', 'BidsList', 'מכרז'];
  for (const p of patterns) {
    const count = (html.match(new RegExp(p, 'gi')) ?? []).length;
    if (count) console.log(p, count);
  }

  const ajax = [...html.matchAll(/\/_layouts\/15\/[^"']+\.aspx[^"']*/gi)].map((m) => m[0]);
  console.log('layout aspx urls:', [...new Set(ajax)].slice(0, 20));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
