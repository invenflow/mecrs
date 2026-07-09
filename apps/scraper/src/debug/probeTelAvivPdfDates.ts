import { request } from 'undici';

async function main() {
  const url =
    'https://www.tel-aviv.gov.il/AuctionAndCareers/Documents/%D7%9E%D7%A1%D7%9E%D7%9B%D7%99%20%D7%9E%D7%9B%D7%A8%D7%96%20122.pdf';
  const res = await request(url, { headers: { 'user-agent': 'InvenFlow-Michrazim/0.1' } });
  const buf = Buffer.from(await res.body.arrayBuffer());
  const text = buf.toString('latin1');

  const patterns = [
    /תאריך פרסום[^\d]{0,20}(\d{1,2}\/\d{1,2}\/\d{4})/g,
    /מועד פרסום[^\d]{0,20}(\d{1,2}\/\d{1,2}\/\d{4})/g,
    /(\d{1,2}\/\d{1,2}\/2026)/g,
  ];
  for (const re of patterns) {
    const matches = [...text.matchAll(re)].map((m) => m[1] ?? m[0]);
    console.log(re.source, [...new Set(matches)].slice(0, 10));
  }

  const idx = text.indexOf('פרסום');
  if (idx >= 0) console.log('context:', text.slice(idx - 50, idx + 150));
}

main();
