import 'dotenv/config';
import { fetchHtml } from '../lib/htmlDetail';
import * as cheerio from 'cheerio';

async function main() {
  const listUrl = 'https://www.maccabi4u.co.il/bids/';
  const html = await fetchHtml(listUrl);
  console.log('html length:', html.length);

  const $ = cheerio.load(html);
  const links = $('a[href]')
    .map((_i, el) => ({ href: String($(el).attr('href') ?? ''), text: $(el).text().trim() }))
    .get()
    .filter((l) => l.href.includes('/bids/') && l.href !== '/bids/');

  console.log('bid links:', JSON.stringify(links.slice(0, 15), null, 2));

  for (const p of ['מכרז', 'bids', 'tender', 'פרסום', 'הגשה']) {
    const i = html.indexOf(p);
    console.log(`pattern ${p}:`, i);
    if (i >= 0) console.log(html.slice(i, i + 300));
  }

  const classes = [
    ...new Set([...html.matchAll(/class="([^"]*michraz[^"]*)"/gi)].map((m) => m[1])),
  ];
  console.log('michraz classes:', classes);

  const items = $('.michrazim-item').toArray();
  console.log('michrazim-item count:', items.length);
  for (const el of items.slice(0, 3)) {
    const $el = $(el);
    console.log('--- item ---');
    console.log($el.find('h3, h2, .title, .michrazim-item-title').first().text().trim());
    console.log($el.find('.michrazim-item-details').text().replace(/\s+/g, ' ').trim());
    console.log('pdf:', $el.find('a[href^="/media/"]').first().attr('href'));
  }

  const allHrefs = $('a[href]')
    .map((_i, el) => String($(el).attr('href') ?? ''))
    .get()
    .filter((h) => h.length > 5);
  console.log('unique href prefixes:', [...new Set(allHrefs.map((h) => h.split('/').slice(0, 4).join('/')))].slice(0, 30));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
