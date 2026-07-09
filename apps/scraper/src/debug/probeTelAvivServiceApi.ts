import 'dotenv/config';
import { fetchHtml } from '../lib/htmlDetail';

async function main() {
  const url = 'https://www.tel-aviv.gov.il/AuctionAndCareers/Pages/Service.aspx';
  const html = await fetchHtml(url);

  const patterns = [
    /https?:\/\/[^"'\s]+/gi,
    /\/_api\/[^"'\s]+/gi,
    /\/AuctionAndCareers\/[^"'\s]+\.(?:asmx|svc|ashx|json)[^"'\s]*/gi,
    /api[^"'\s]{0,80}/gi,
    /getRowTitle|ng-controller|angular|tab\.|dataSource|DataSource|ListId|RenderListDataAsStream/gi,
  ];

  for (const re of patterns) {
    const matches = [...new Set(html.match(re) ?? [])];
    if (matches.length) {
      console.log(`\n=== ${re.source.slice(0, 40)} (${matches.length}) ===`);
      console.log(matches.slice(0, 30).join('\n'));
    }
  }

  // Look for embedded JSON config
  const jsonBlocks = [...html.matchAll(/\{[^{}]{50,500}(?:ListId|listId|WebId|Publication|מכרז)[^{}]{0,500}\}/g)];
  console.log('\njson blocks:', jsonBlocks.length);
  for (const m of jsonBlocks.slice(0, 5)) console.log(m[0].slice(0, 500));

  const scriptSrc = [...html.matchAll(/<script[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
  const relevant = scriptSrc.filter((s) => /auction|tender|service|michraz|bid|tab/i.test(s));
  console.log('\nrelevant scripts:', relevant);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
