import 'dotenv/config';
import { fetchHtml, guessDatesFromHtml } from '../lib/htmlDetail';

async function main() {
  const pdfUrl =
    'https://www.tel-aviv.gov.il/AuctionAndCareers/Documents/%D7%9E%D7%A1%D7%9E%D7%9B%D7%99%20%D7%9E%D7%9B%D7%A8%D7%96%20122.pdf';
  // try HTML wrapper page first
  const longUrl =
    'https://www.tel-aviv.gov.il/AuctionAndCareers/Documents/%D7%9E%D7%9B%D7%A8%D7%96%20%D7%A4%D7%95%D7%9E%D7%91%D7%99%20%D7%9E%D7%A1%D7%9B%D7%A8%20122.2026%20%D7%9C%D7%91%D7%99%D7%A6%D7%95%D7%A2%20%D7%A2%D7%91%D7%95%D7%93%D7%95%D7%AA%20%D7%A0%D7%99%D7%A7%D7%99%D7%95%D7%9F%20%D7%91%D7%9E%D7%95%D7%A1%D7%93%D7%95%D7%AA%20%D7%97%D7%99%D7%A0%D7%95%D7%9A.pdf';

  for (const url of [longUrl, pdfUrl]) {
    console.log('\n', url);
    try {
      const html = await fetchHtml(url);
      console.log('len', html.length, 'head', html.slice(0, 200));
      console.log('dates', guessDatesFromHtml(html));
    } catch (e) {
      console.log('err', e);
    }
  }
}

main();
