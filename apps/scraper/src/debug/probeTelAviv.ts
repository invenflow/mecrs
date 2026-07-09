import 'dotenv/config';
import { fetchHtml } from '../lib/htmlDetail';
import * as cheerio from 'cheerio';

async function main() {
  const listUrl = 'https://www.tel-aviv.gov.il/Transparency/Pages/Bids.aspx';
  const html = await fetchHtml(listUrl);
  console.log('html length:', html.length);

  const $ = cheerio.load(html);
  const links = $('a[href]')
    .map((_i, el) => ({ href: String($(el).attr('href') ?? ''), text: $(el).text().trim() }))
    .get()
    .filter((l) => l.href && (l.href.includes('Bid') || l.href.includes('bid') || l.text.includes('מכרז')));

  console.log('links sample:', JSON.stringify(links.slice(0, 20), null, 2));

  // Look for JSON/API hints
  const apiHints = ['_api', 'Search', 'odata', 'REST', 'ListData', 'GetItems'];
  for (const hint of apiHints) {
    if (html.includes(hint)) console.log('found hint:', hint);
  }

  // SharePoint list view
  const spView = html.match(/ListId["\s:=]+([a-f0-9-]{36})/i);
  const listId = spView?.[1];
  if (listId) console.log('ListId:', listId);

  if (listId) {
    const apiUrl = `https://www.tel-aviv.gov.il/_api/web/lists(guid'${listId}')/items?$top=50&$select=Id,Title,FileRef,Modified,Created,PublicationDate,SubmissionDeadline,Date_x0020_Published,Last_x0020_Date,EndDate,Deadline&$orderby=Modified desc`;
    try {
      const apiHtml = await fetchHtml(apiUrl);
      console.log('API response sample:', apiHtml.slice(0, 3000));
    } catch (e) {
      console.error('API failed:', e);
    }
  }

  const searchMatches = html.match(/https?:[^"']*Search[^"']*/gi) ?? [];
  console.log('search urls:', searchMatches.slice(0, 10));

  const fieldNames = [...new Set(html.match(/[A-Za-z0-9_]+_x0020_[A-Za-z0-9_]+/g) ?? [])].slice(0, 40);
  console.log('sp field names:', fieldNames);

  const renderList = html.match(/RenderListDataAsStream[^"']*/gi) ?? [];
  console.log('RenderListDataAsStream refs:', renderList.slice(0, 5));

  const viewXml = html.match(/ViewXml[^}]{0,200}/gi) ?? [];
  console.log('ViewXml refs:', viewXml.slice(0, 3));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
