import 'dotenv/config';
import { fetchHtml } from '../lib/htmlDetail';

async function main() {
  const html = await fetchHtml('https://www.tel-aviv.gov.il/Transparency/Pages/Bids.aspx');

  const markers = [
    '99234d34',
    'UpdateFilterCallback',
    'DoCallBack',
    'SearchResult',
    'ms-srch',
    'QueryText',
    'querytext',
    'Refinement',
    'מכרזים',
    'חיפוש',
    'filterText',
    '__CALLBACKID',
    '__CALLBACKPARAM',
  ];
  for (const m of markers) {
    const idx = html.indexOf(m);
    if (idx >= 0) {
      console.log(`\n=== ${m} at ${idx} ===`);
      console.log(html.slice(Math.max(0, idx - 300), idx + 800));
    }
  }

  // Extract web part HTML around search
  const wpIdx = html.indexOf('99234d34');
  if (wpIdx >= 0) {
    console.log('\n=== webpart region ===');
    console.log(html.slice(wpIdx - 2000, wpIdx + 5000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
