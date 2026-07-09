import 'dotenv/config';
import { fetchHtml } from '../lib/htmlDetail';
import * as cheerio from 'cheerio';
import { request } from 'undici';

async function probeSearch() {
  const url = 'https://www.tel-aviv.gov.il/Pages/Search.aspx?k=' + encodeURIComponent('מכרז');
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const items = $('.ms-srch-item, .srch-result, .search-result, .result-item').toArray();
  console.log('srch items:', items.length);

  const links = $('a[href]')
    .map((_i, el) => ({ href: String($(el).attr('href') ?? ''), text: $(el).text().trim() }))
    .get()
    .filter((l) => l.href.includes('MainItemPage') || l.href.includes('DispForm') || l.href.includes('Bids') || l.href.includes('Auction'));
  console.log('result links:', JSON.stringify(links.slice(0, 25), null, 2));

  const bodyText = $('body').text().replace(/\s+/g, ' ');
  const dateMatches = [...bodyText.matchAll(/(\d{1,2}[\/.]\d{1,2}[\/.]20\d{2})/g)].map((m) => m[1]);
  console.log('dates in search page:', [...new Set(dateMatches)].slice(0, 20));
}

async function probeCallback() {
  const pageUrl = 'https://www.tel-aviv.gov.il/Transparency/Pages/Bids.aspx';
  const html = await fetchHtml(pageUrl);
  const $ = cheerio.load(html);

  const viewState = String($('#__VIEWSTATE').attr('value') ?? '');
  const eventValidation = String($('#__EVENTVALIDATION').attr('value') ?? '');
  const viewStateGen = String($('#__VIEWSTATEGENERATOR').attr('value') ?? '');
  const callbackId = 'ctl00$ctl50$g_99234d34_991a_431c_bae8_26a88cffc963$ctl01';

  console.log('viewState len:', viewState.length);

  const body = new URLSearchParams({
    __EVENTTARGET: callbackId,
    __EVENTARGUMENT: '',
    __VIEWSTATE: viewState,
    __VIEWSTATEGENERATOR: viewStateGen,
    __EVENTVALIDATION: eventValidation,
    __CALLBACKID: callbackId,
    __CALLBACKPARAM: '',
  });

  const res = await request(pageUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)',
    },
    body: body.toString(),
  });
  const text = await res.body.text();
  console.log('callback status:', res.statusCode, 'len:', text.length);
  console.log('callback sample:', text.slice(0, 4000));

  const $r = cheerio.load(text);
  const links = $r('a[href]')
    .map((_i, el) => ({ href: String($r(el).attr('href') ?? ''), text: $r(el).text().trim() }))
    .get()
    .filter((l) => l.text || l.href.includes('pdf') || l.href.includes('DispForm') || l.href.includes('MainItem'));
  console.log('callback links:', JSON.stringify(links.slice(0, 20), null, 2));
}

async function main() {
  await probeSearch();
  console.log('\n--- callback ---\n');
  await probeCallback();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
