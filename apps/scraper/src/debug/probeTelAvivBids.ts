import 'dotenv/config';
import { fetchHtml } from '../lib/htmlDetail';
import * as cheerio from 'cheerio';

async function main() {
  const html = await fetchHtml('https://www.tel-aviv.gov.il/Transparency/Pages/Bids.aspx');
  const $ = cheerio.load(html);

  // Search component / web part config
  const scripts = $('script').toArray().map((el) => $(el).html() ?? '');
  for (const s of scripts) {
    if (s.includes('querytext') || s.includes('QueryTemplate') || s.includes('Bids') || s.includes('מכרז')) {
      if (s.length < 8000) console.log('--- script ---\n', s);
      else console.log('--- long script snippet ---\n', s.slice(0, 4000));
    }
  }

  // inplview hidden fields
  $('input[type="hidden"]').each((_i, el) => {
    const id = $(el).attr('id') ?? '';
    const name = $(el).attr('name') ?? '';
    const val = String($(el).attr('value') ?? '');
    if (id.includes('inplview') || name.includes('inplview') || val.includes('ListId') || val.includes('מכרז')) {
      console.log('hidden', id || name, val.slice(0, 500));
    }
  });

  // wpq list containers
  $('[id^="WebPart"]').each((_i, el) => {
    const id = $(el).attr('id');
    const text = $(el).text().replace(/\s+/g, ' ').trim().slice(0, 200);
    if (text.includes('מכרז') || text.includes('חיפוש')) {
      console.log('webpart', id, text);
    }
  });

  // Main content area
  const main = $('.ms-rtestate-field, .article-content, #ctl00_PlaceHolderMain, .main-content').text().replace(/\s+/g, ' ').trim();
  console.log('main text:', main.slice(0, 1000));

  // Try osssearchresults
  const searchUrl =
    'https://www.tel-aviv.gov.il/Transparency/_layouts/15/osssearchresults.aspx?k=' +
    encodeURIComponent('מכרז') +
    '&u=https://www.tel-aviv.gov.il/Transparency';
  console.log('\nTrying', searchUrl);
  try {
    const searchHtml = await fetchHtml(searchUrl);
    const $s = cheerio.load(searchHtml);
    const results = $s('.ms-srch-item, .ms-srch-result, .srch-result, a[href*="DispForm"], a[href*="MainItemPage"]')
      .map((_i, el) => ({ tag: el.tagName, text: $s(el).text().trim().slice(0, 120), href: $s(el).attr('href') }))
      .get()
      .slice(0, 20);
    console.log('search results:', JSON.stringify(results, null, 2));
  } catch (e) {
    console.error('search failed', e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
