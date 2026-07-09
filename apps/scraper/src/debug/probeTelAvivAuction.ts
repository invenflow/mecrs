import 'dotenv/config';
import { fetchHtml } from '../lib/htmlDetail';
import * as cheerio from 'cheerio';

const PAGES = [
  'https://www.tel-aviv.gov.il/AuctionAndCareers/Pages/Service.aspx',
  'https://www.tel-aviv.gov.il/AuctionAndCareers/Pages/Suppliers.aspx',
  'https://www.tel-aviv.gov.il/AuctionAndCareers/Pages/AuctionAndCareers.aspx',
];

async function probe(url: string) {
  console.log('\n===', url);
  const html = await fetchHtml(url);
  console.log('len', html.length);

  const $ = cheerio.load(html);
  const links = $('a[href]')
    .map((_i, el) => ({ href: String($(el).attr('href') ?? ''), text: $(el).text().trim() }))
    .get()
    .filter((l) => l.text.length > 5 && !l.href.includes('javascript'));

  const tenderish = links.filter(
    (l) =>
      l.text.includes('מכרז') ||
      l.href.includes('DispForm') ||
      l.href.includes('MainItemPage') ||
      l.href.includes('.pdf') ||
      l.href.includes('ItemId'),
  );
  console.log('tenderish links:', JSON.stringify(tenderish.slice(0, 20), null, 2));

  const dates = [...$('body').text().matchAll(/(\d{1,2}[\/.]\d{1,2}[\/.]20\d{2})/g)].map((m) => m[1]);
  console.log('dates:', [...new Set(dates)].slice(0, 15));

  const tables = $('table tr').toArray();
  console.log('table rows:', tables.length);
  for (const tr of tables.slice(0, 5)) {
    console.log('row:', $(tr).text().replace(/\s+/g, ' ').trim().slice(0, 200));
  }

  const listId = html.match(/listId["\s:]*["{]*([a-f0-9-]{36})/i)?.[1];
  console.log('listId:', listId);
}

async function main() {
  for (const p of PAGES) await probe(p);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
