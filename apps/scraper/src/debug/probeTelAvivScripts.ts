import 'dotenv/config';
import { fetchHtml } from '../lib/htmlDetail';

async function main() {
  const html = await fetchHtml('https://www.tel-aviv.gov.il/Transparency/Pages/Bids.aspx');

  const apiUrls = [
    ...new Set(
      [...html.matchAll(/["']([^"']*(?:_api|RenderListData|inplview|ListData|Search)[^"']*)["']/gi)].map(
        (m) => m[1],
      ),
    ),
  ];
  console.log('api url hints:', apiUrls.slice(0, 30));

  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .filter((s) => s.includes('Search') || s.includes('ListId') || s.includes('RenderList'));
  console.log('relevant scripts:', scripts.length);
  for (const s of scripts.slice(0, 2)) {
    console.log(s.slice(0, 2500));
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
