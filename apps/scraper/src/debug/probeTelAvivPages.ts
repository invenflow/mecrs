import 'dotenv/config';
import { fetchHtml } from '../lib/htmlDetail';
import * as cheerio from 'cheerio';

async function probe(url: string) {
  console.log('\n===', url);
  const html = await fetchHtml(url);
  console.log('len', html.length);
  const $ = cheerio.load(html);
  const links = $('a[href]')
    .map((_i, el) => ({ href: String($(el).attr('href') ?? ''), text: $(el).text().trim() }))
    .get()
    .filter((l) => l.text.includes('מכרז') || l.href.toLowerCase().includes('bid') || l.href.includes('מכרז'));
  console.log('tender links:', links.slice(0, 15));

  const dates = [...html.matchAll(/(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/g)].map((m) => m[1]).slice(0, 10);
  console.log('date samples:', dates);
}

async function main() {
  await probe('https://www.tel-aviv.gov.il/Pages/Search.aspx?k=' + encodeURIComponent('מכרז'));
  await probe('https://www.tel-aviv.gov.il/AuctionAndCareers/Pages/AuctionAndCareers.aspx');
  await probe('https://www.tel-aviv.gov.il/Residents/MunicipalTenders/Pages/Tenders.aspx');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
